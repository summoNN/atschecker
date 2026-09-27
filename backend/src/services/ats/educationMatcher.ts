import { RequirementItem } from '../jobs/types.js';
import { CategoryMatchResult, RequirementMatchResult, StructuredCV } from './types.js';
import { matchKeywordInText, normalizeText } from './keywordMatcher.js';
import { toCategoryResult } from './skillMatcher.js';

interface DegreeRank {
  rank: number;
  label: string;
}

const DEGREE_RANKS: Array<{ regex: RegExp; rank: number; label: string }> = [
  { regex: /\b(ph\.?d|doctorate|doctoral)\b/i, rank: 4, label: 'Doctorate' },
  { regex: /\b(master'?s?|m\.?s\.?|m\.?a\.?|m\.?sc\.?|mba)\b/i, rank: 3, label: "Master's" },
  { regex: /\b(bachelor'?s?|b\.?s\.?|b\.?a\.?|b\.?sc\.?|b\.?eng\.?|undergraduate)\b/i, rank: 2, label: "Bachelor's" },
  { regex: /\b(associate'?s?|diploma|a\.?s\.?|a\.?a\.?)\b/i, rank: 1, label: 'Associate' },
];

const KNOWN_FIELDS = [
  'computer science',
  'software engineering',
  'information technology',
  'computer engineering',
  'data science',
  'electrical engineering',
  'mathematics',
  'physics',
  'business administration',
  'marketing',
  'communications',
  'finance',
  'accounting',
];

function getDegreeRank(text: string): DegreeRank | null {
  for (const degree of DEGREE_RANKS) {
    if (degree.regex.test(text)) return { rank: degree.rank, label: degree.label };
  }
  return null;
}

function findField(text: string): string | null {
  return KNOWN_FIELDS.find((field) => matchKeywordInText(field, text).matched) ?? null;
}

export function matchEducation(
  requirements: RequirementItem[],
  cv: StructuredCV
): CategoryMatchResult {
  if (!requirements?.length) return toCategoryResult('education', []);

  const structuredEducation = (cv.education ?? [])
    .map((education) => `${education.degree ?? ''} ${education.field ?? ''} ${education.institution ?? ''}`)
    .join(' ');
  const cvText = normalizeText(`${cv.rawText ?? ''} ${structuredEducation}`);
  const candidateDegree = getDegreeRank(cvText);
  const candidateField = findField(cvText);
  const hasEducationEvidence = Boolean(structuredEducation.trim()) || /education\s*:|graduat(?:ed|ion)|university\s+of|college\s+of/i.test(cvText);
  const items: RequirementMatchResult[] = [];

  for (const requirement of requirements) {
    const requirementText = `${requirement.name} ${requirement.evidence}`;
    const requiredDegree = getDegreeRank(requirementText);
    const requiredField = findField(requirementText);

    if (!candidateDegree) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: hasEducationEvidence ? 'UNKNOWN' : 'MISSING',
        score: 0,
        notes: hasEducationEvidence
          ? 'Education is mentioned, but the degree level cannot be verified'
          : 'No education credentials found in the CV',
      });
      continue;
    }

    if (!requiredDegree) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'MATCHED',
        score: 1,
        evidence: `Candidate holds ${candidateDegree.label}`,
      });
      continue;
    }

    if (candidateDegree.rank < requiredDegree.rank) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'PARTIAL',
        score: 0.5,
        evidence: `Candidate holds ${candidateDegree.label}; ${requiredDegree.label} is requested`,
      });
      continue;
    }

    if (requiredField && !candidateField) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'UNKNOWN',
        score: 0,
        notes: `Degree level is sufficient, but the requested field '${requiredField}' cannot be verified`,
      });
      continue;
    }

    if (requiredField && candidateField !== requiredField) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'PARTIAL',
        score: 0.5,
        evidence: `Candidate studied ${candidateField}; ${requiredField} is requested`,
      });
      continue;
    }

    items.push({
      name: requirement.name,
      importance: requirement.importance,
      status: 'MATCHED',
      score: 1,
      evidence: `Candidate holds ${candidateDegree.label}, meeting the requirement`,
    });
  }

  return toCategoryResult('education', items);
}
