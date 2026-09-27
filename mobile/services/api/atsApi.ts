import type { ATSAnalysis, JobDescriptionInput, Keyword, Skill } from '../../types';
import { Platform } from 'react-native';
import { requestJson } from './apiClient';

export interface BackendAnalysis {
  analysisMode: 'hybrid' | 'deterministic';
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
  requirements: {
    requirement: string;
    status: 'MATCHED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
    evidence: string;
    confidence: number;
    category?: string;
  }[];
  matchedKeywords: { term: string; category: string; importance: string; found: boolean }[];
  missingKeywords: { term: string; category: string; importance: string; found: boolean }[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  atsWarnings: string[];
  recommendations: ATSAnalysis['recommendations'];
  explanation: string;
}

interface AnalyzeResponse {
  status: string;
  data: BackendAnalysis;
}

export async function analyzeCV(
  fileUri: string,
  fileName: string,
  jobDescription: JobDescriptionInput,
  webFile?: Blob
): Promise<ATSAnalysis> {
  const formData = new FormData();
  const uploadName = fileName || 'resume.pdf';

  if (Platform.OS === 'web') {
    // Browsers require a real Blob/File. Appending the React Native
    // `{ uri, name, type }` shape serializes it as `[object Object]`.
    const browserFile: Blob = webFile ?? (await fetch(fileUri).then((response) => response.blob()));
    formData.append('cv', browserFile, uploadName);
  } else {
    formData.append('cv', {
      uri: fileUri,
      name: uploadName,
      type: 'application/pdf',
    } as unknown as Blob);
  }
  formData.append('jobDescription', jobDescription.description);
  if (jobDescription.title.trim()) formData.append('jobTitle', jobDescription.title.trim());
  if (jobDescription.company.trim()) formData.append('company', jobDescription.company.trim());

  const response = await requestJson<AnalyzeResponse>('/api/analyze', {
    method: 'POST',
    body: formData,
  });

  return mapBackendAnalysis(response.data, fileName, jobDescription);
}

function mapBackendAnalysis(
  analysis: BackendAnalysis,
  fallbackFileName: string,
  input: JobDescriptionInput
): ATSAnalysis {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    fileName: analysis.fileName || fallbackFileName,
    jobTitle: analysis.jobTitle || input.title || 'Target role',
    company: analysis.company || input.company || '',
    score: analysis.overallScore,
    matchedKeywords: analysis.matchedKeywords.map(mapKeyword),
    missingKeywords: analysis.missingKeywords.map(mapKeyword),
    detectedSkills: analysis.matchedSkills.map((name) => mapSkill(name)),
    recommendations: analysis.recommendations,
    createdAt: new Date().toISOString(),
    analysisMode: analysis.analysisMode,
    scoreBreakdown: analysis.scoreBreakdown,
    requirements: analysis.requirements,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    atsWarnings: analysis.atsWarnings,
    explanation: analysis.explanation,
  };
}

function mapKeyword(keyword: BackendAnalysis['matchedKeywords'][number]): Keyword {
  return {
    term: keyword.term,
    category: mapKeywordCategory(keyword.category),
    importance: keyword.importance === 'high' || keyword.importance === 'low' ? keyword.importance : 'medium',
    found: keyword.found,
  };
}

function mapKeywordCategory(category: string): Keyword['category'] {
  if (['technical', 'soft_skill', 'certification', 'education', 'experience', 'tool', 'industry'].includes(category)) {
    return category as Keyword['category'];
  }
  return 'technical';
}

function mapSkill(name: string): Skill {
  return { name, category: 'other' };
}
