import {
  AtsMatchReport,
  RequirementMatchResult,
  StructuredCV,
  evaluateAtsMatch,
} from '../ats/index.js';
import {
  JobRequirements,
  RequirementImportance,
  normalizeJobDescription,
} from '../jobs/index.js';
import type { GeminiServiceOptions } from '../gemini/types.js';
import {
  matchSemantically,
  SemanticMatchingResult,
} from '../gemini/index.js';
import type { ExtractedCv } from '../cv/cv.service.js';

export type AnalysisMode = 'hybrid' | 'deterministic';

export interface AnalysisPipelineInput {
  cvText: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}

export interface AnalysisRequirement {
  requirement: string;
  status: 'MATCHED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
  evidence: string;
  confidence: number;
  category?: string;
}

export interface FinalAnalysis {
  analysisMode: AnalysisMode;
  fileName: string;
  fileSize: number;
  pageCount: number;
  extractedTextLength: number;
  jobDescriptionLength: number;
  jobTitle: string;
  company: string;
  overallScore: number;
  scoreBreakdown: {
    requiredSkills: number;
    keywords: number;
    experience: number;
    education: number;
    certifications: number;
    preferredSkills: number;
  };
  requirements: AnalysisRequirement[];
  matchedKeywords: Array<{ term: string; category: string; importance: string; found: boolean }>;
  missingKeywords: Array<{ term: string; category: string; importance: string; found: boolean }>;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  atsWarnings: string[];
  recommendations: Array<{
    id: string;
    type: 'add_keyword' | 'improve_formatting' | 'add_section' | 'quantify_achievement';
    priority: 'critical' | 'important' | 'nice_to_have';
    title: string;
    description: string;
  }>;
  explanation: string;
}

interface AnalysisPipelineDependencies {
  normalizeJobDescription?: typeof normalizeJobDescription;
  matchSemantically?: (
    cv: StructuredCV,
    requirements: JobRequirements,
    options?: GeminiServiceOptions
  ) => Promise<SemanticMatchingResult>;
  geminiOptions?: GeminiServiceOptions;
}

const KNOWN_TERMS = [
  'JavaScript', 'TypeScript', 'Java', 'Python', 'Go', 'C++', 'C#', 'PHP', 'Ruby',
  'React', 'React Native', 'Vue', 'Angular', 'Node.js', 'Spring Boot', 'Django',
  'Fastify', 'Express', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL',
  'REST API', 'Microservices', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'Terraform', 'Kafka', 'Git', 'CI/CD', 'SQL', 'HTML', 'CSS', 'Agile',
  'communication', 'leadership', 'problem solving', 'testing', 'system design',
];

const DEGREE_PATTERN = /(?:ph\.?d|doctorate|master'?s?|mba|bachelor'?s?|b\.?s\.?|b\.?a\.?|associate'?s?)(?:[^.\n]{0,80})/i;
const EXPERIENCE_PATTERN = /(?:minimum\s+|at\s+least\s+)?\d+\+?\s+(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z+#. -]+)?/gi;

export class AnalysisPipeline {
  private readonly normalize: typeof normalizeJobDescription;
  private readonly semantic: NonNullable<AnalysisPipelineDependencies['matchSemantically']>;
  private readonly geminiOptions?: GeminiServiceOptions;

  constructor(dependencies: AnalysisPipelineDependencies = {}) {
    this.normalize = dependencies.normalizeJobDescription ?? normalizeJobDescription;
    this.semantic = dependencies.matchSemantically ?? matchSemantically;
    this.geminiOptions = dependencies.geminiOptions;
  }

  async analyze(input: AnalysisPipelineInput): Promise<FinalAnalysis> {
    const cv: StructuredCV = { rawText: input.cvText };
    let requirements: JobRequirements;
    let usedFallbackRequirements = false;

    try {
      requirements = await this.normalize({
        jobDescription: input.jobDescription,
        fallbackJobTitle: input.jobTitle,
      });
    } catch (error: unknown) {
      usedFallbackRequirements = true;
      requirements = buildFallbackRequirements(input.jobDescription, input.jobTitle);
      console.warn(
        JSON.stringify({
          event: 'analysis_jd_normalization_fallback',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      );
    }

    const deterministic = evaluateAtsMatch(cv, requirements);
    let semanticResult: SemanticMatchingResult | null = null;
    let semanticFailure: Error | null = null;

    try {
      semanticResult = await this.semantic(cv, requirements, this.geminiOptions);
    } catch (error: unknown) {
      semanticFailure = error instanceof Error ? error : new Error(String(error));
      console.warn(
        JSON.stringify({
          event: 'analysis_semantic_fallback',
          errorName: semanticFailure.name,
        })
      );
    }

    return buildFinalAnalysis(
      input,
      requirements,
      deterministic,
      semanticResult,
      usedFallbackRequirements,
      semanticFailure
    );
  }
}

export const analysisPipeline = new AnalysisPipeline();

function buildFinalAnalysis(
  input: AnalysisPipelineInput,
  requirements: JobRequirements,
  deterministic: AtsMatchReport,
  semantic: SemanticMatchingResult | null,
  usedFallbackRequirements: boolean,
  semanticFailure: Error | null
): FinalAnalysis {
  const categories = deterministic.categories;
  const skillCategories = [categories.requiredSkills, categories.preferredSkills];
  const keywordCategories = [categories.requiredKeywords, categories.preferredKeywords];
  const allItems = Object.values(categories).flatMap((category) => category.items);
  const semanticByName = new Map(
    semantic?.matches.map((match) => [normalizeValue(match.requirement), match]) ?? []
  );

  const requirementsOutput = allItems.map((item) => {
    const semanticMatch = semanticByName.get(normalizeValue(item.name));
    return semanticMatch
      ? { ...semanticMatch }
      : deterministicRequirement(item);
  });

  const matchedKeywords = keywordCategories.flatMap((category) =>
    category.items
      .filter((item) => item.status === 'MATCHED' || item.status === 'PARTIAL')
      .map((item) => keywordOutput(item, true))
  );
  const missingKeywords = keywordCategories.flatMap((category) =>
    category.items
      .filter((item) => item.status === 'MISSING')
      .map((item) => keywordOutput(item, false))
  );
  const matchedSkills = skillCategories.flatMap((category) =>
    category.items
      .filter((item) => item.status === 'MATCHED' || item.status === 'PARTIAL')
      .map((item) => item.name)
  );
  const missingSkills = skillCategories.flatMap((category) =>
    category.items.filter((item) => item.status === 'MISSING').map((item) => item.name)
  );

  const strengths = allItems
    .filter((item) => item.status === 'MATCHED' && item.evidence)
    .slice(0, 8)
    .map((item) => `${item.name}: ${item.evidence}`);
  const gaps = allItems
    .filter((item) => item.status === 'MISSING' || item.status === 'PARTIAL' || item.status === 'UNKNOWN')
    .slice(0, 12)
    .map((item) => `${item.name} (${item.status.toLowerCase()})`);

  const atsWarnings: string[] = [];
  if (usedFallbackRequirements) atsWarnings.push('Job-description normalization was unavailable; local requirement extraction was used.');
  if (semanticFailure) atsWarnings.push('Semantic matching was unavailable; deterministic results are shown.');
  if (!input.cvText.trim()) atsWarnings.push('The CV text was empty or could not be extracted.');

  const recommendations = buildRecommendations(missingKeywords, missingSkills, gaps);
  const analysisMode: AnalysisMode = semantic ? 'hybrid' : 'deterministic';
  const explanation = buildExplanation(input.cvText, input.jobDescription, deterministic, analysisMode, semanticFailure);

  return {
    analysisMode,
    fileName: input.fileName,
    fileSize: input.fileSize,
    pageCount: input.pageCount,
    extractedTextLength: input.cvText.length,
    jobDescriptionLength: input.jobDescription.trim().length,
    jobTitle: requirements.jobTitle || input.jobTitle || 'Target role',
    company: input.company ?? '',
    overallScore: deterministic.overallScore,
    scoreBreakdown: {
      requiredSkills: deterministic.requiredSkillsMatch,
      keywords: deterministic.requiredKeywordMatch,
      experience: deterministic.experienceMatch,
      education: deterministic.educationMatch,
      certifications: deterministic.certificationMatch,
      preferredSkills: deterministic.preferredSkillsMatch,
    },
    requirements: requirementsOutput,
    matchedKeywords,
    missingKeywords,
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)],
    strengths,
    gaps,
    atsWarnings,
    recommendations,
    explanation,
  };
}

function deterministicRequirement(item: RequirementMatchResult): AnalysisRequirement {
  return {
    requirement: item.name,
    status: item.status,
    evidence: item.evidence ?? '',
    confidence: item.status === 'MATCHED' ? 1 : item.status === 'PARTIAL' ? 0.6 : item.status === 'UNKNOWN' ? 0.25 : 0.9,
  };
}

function keywordOutput(item: RequirementMatchResult, found: boolean) {
  return {
    term: item.name,
    category: 'technical',
    importance: item.importance === 'REQUIRED' ? 'high' : item.importance === 'PREFERRED' ? 'medium' : 'low',
    found,
  };
}

function buildRecommendations(
  missingKeywords: FinalAnalysis['missingKeywords'],
  missingSkills: string[],
  gaps: string[]
): FinalAnalysis['recommendations'] {
  const recommendations: FinalAnalysis['recommendations'] = [];
  const missingTerms = [...missingKeywords.map((item) => item.term), ...missingSkills];

  if (missingTerms.length) {
    recommendations.push({
      id: 'recommendation-missing-requirements',
      type: 'add_keyword',
      priority: 'critical',
      title: 'Address missing requirements',
      description: `If supported by your background, make relevant evidence visible for: ${missingTerms.slice(0, 6).join(', ')}.`,
    });
  }
  if (gaps.some((gap) => gap.includes('experience') || gap.includes('years'))) {
    recommendations.push({
      id: 'recommendation-quantify-experience',
      type: 'quantify_achievement',
      priority: 'important',
      title: 'Clarify relevant experience',
      description: 'Add role-specific dates, duration, and concrete CV evidence where available.',
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      id: 'recommendation-evidence',
      type: 'quantify_achievement',
      priority: 'nice_to_have',
      title: 'Strengthen evidence',
      description: 'Keep relevant skills tied to concrete responsibilities or outcomes in the CV.',
    });
  }
  return recommendations;
}

function buildExplanation(
  cvText: string,
  jobDescription: string,
  report: AtsMatchReport,
  mode: AnalysisMode,
  semanticFailure: Error | null
): string {
  const cvEvidence = cvText.trim() ? 'CV evidence was available.' : 'No CV text was available.';
  const jobEvidence = jobDescription.trim() ? 'The supplied job description provided the comparison requirements.' : 'No job description evidence was available.';
  const semanticNote = mode === 'hybrid'
    ? 'Semantic evidence was added for requirement interpretation.'
    : semanticFailure
      ? 'Semantic interpretation was unavailable, so this result uses deterministic matching only.'
      : 'This result uses deterministic matching only.';
  return `Compatibility score: ${report.overallScore}/100. ${cvEvidence} ${jobEvidence} ${semanticNote} The score reflects only evidence found in the supplied CV and requirements extracted from the supplied job description.`;
}

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function sentenceFor(text: string, term: string): string {
  const sentences = text.split(/(?<=[.!?])\s+|\r?\n/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.find((sentence) => sentence.toLowerCase().includes(term.toLowerCase())) ?? term;
}

function importanceFor(text: string, term: string): RequirementImportance {
  const sentence = sentenceFor(text, term).toLowerCase();
  if (/\b(preferred|preferable|bonus|plus|nice to have|advantageous)\b/.test(sentence)) return 'PREFERRED';
  return 'REQUIRED';
}

export function buildFallbackRequirements(jobDescription: string, fallbackJobTitle?: string): JobRequirements {
  const text = jobDescription.trim();
  const recognizedTerms = KNOWN_TERMS.filter((term) =>
    new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9])`, 'i').test(text)
  );
  const technologyItems = recognizedTerms.map((term) => ({
    name: term,
    importance: importanceFor(text, term),
    evidence: sentenceFor(text, term),
  }));
  const experienceItems = [...text.matchAll(EXPERIENCE_PATTERN)].map((match) => ({
    name: match[0].trim(),
    importance: 'REQUIRED' as const,
    evidence: sentenceFor(text, match[0]),
  }));
  const degreeMatch = text.match(DEGREE_PATTERN);
  const keywords = ['microservices', 'architecture', 'scalability', 'testing', 'communication']
    .filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(text))
    .map((term) => ({
      name: term,
      importance: importanceFor(text, term),
      evidence: sentenceFor(text, term),
    }));
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

  return {
    jobTitle: fallbackJobTitle?.trim() || (firstLine && firstLine.length < 100 ? firstLine : 'Target role'),
    requiredSkills: [],
    preferredSkills: [],
    requiredTechnologies: technologyItems,
    preferredTechnologies: [],
    requiredExperience: experienceItems,
    educationRequirements: degreeMatch
      ? [{ name: degreeMatch[0].trim(), importance: 'REQUIRED', evidence: sentenceFor(text, degreeMatch[0]) }]
      : [],
    certifications: [],
    languages: [],
    responsibilities: [],
    softSkills: [],
    importantKeywords: keywords,
  };
}

export async function analyzeExtractedCv(
  extracted: ExtractedCv,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): Promise<FinalAnalysis> {
  return analysisPipeline.analyze({
    cvText: extracted.text,
    fileName: extracted.fileName,
    fileSize: extracted.fileSize,
    pageCount: extracted.pageCount,
    jobDescription,
    jobTitle,
    company,
  });
}
