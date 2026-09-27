import { RequirementImportance } from '../jobs/types.js';

export type MatchStatus = 'MATCHED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';

export interface RequirementMatchResult {
  name: string;
  importance: RequirementImportance;
  status: MatchStatus;
  score: number; // 1.0 = MATCHED, 0.5 = PARTIAL, 0.0 = MISSING / UNKNOWN
  evidence?: string;
  notes?: string;
}

export interface CategoryMatchResult {
  category: string;
  score: number; // 0 to 100 percentage
  totalCount: number;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  unknownCount: number;
  items: RequirementMatchResult[];
}

export interface ScoreWeights {
  requiredSkills: number;
  requiredKeywords: number;
  experience: number;
  education: number;
  certifications: number;
  preferredSkills: number;
  preferredKeywords?: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  requiredSkills: 30,
  requiredKeywords: 20,
  experience: 20,
  education: 15,
  certifications: 5,
  preferredSkills: 10,
  preferredKeywords: 0,
};

export interface StructuredCV {
  rawText: string;
  skills?: string[];
  technologies?: string[];
  totalYearsOfExperience?: number;
  experienceHistory?: Array<{
    title?: string;
    company?: string;
    years?: number;
    description?: string;
    technologies?: string[];
  }>;
  education?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

export interface AtsMatchReport {
  overallScore: number; // 0 to 100
  requiredSkillsMatch: number; // 0 to 100
  preferredSkillsMatch: number; // 0 to 100
  requiredKeywordMatch: number; // 0 to 100
  preferredKeywordMatch: number; // 0 to 100
  experienceMatch: number; // 0 to 100
  educationMatch: number; // 0 to 100
  certificationMatch: number; // 0 to 100
  categories: Record<string, CategoryMatchResult>;
  summary: {
    totalRequirements: number;
    totalMatched: number;
    totalPartial: number;
    totalMissing: number;
    totalUnknown: number;
  };
}
