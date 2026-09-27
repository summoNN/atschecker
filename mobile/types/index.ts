// ATS Checker - Core Types

export interface ATSAnalysis {
  id: string;
  fileName: string;
  jobTitle: string;
  company: string;
  score: number;
  matchedKeywords: Keyword[];
  missingKeywords: Keyword[];
  detectedSkills: Skill[];
  recommendations: Recommendation[];
  createdAt: string;
  analysisMode?: 'hybrid' | 'deterministic';
  scoreBreakdown?: {
    requiredSkills: number;
    keywords: number;
    experience: number;
    education: number;
    certifications: number;
    preferredSkills: number;
  };
  requirements?: AnalysisRequirement[];
  strengths?: string[];
  gaps?: string[];
  atsWarnings?: string[];
  explanation?: string;
}

export interface AnalysisRequirement {
  requirement: string;
  status: 'MATCHED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
  evidence: string;
  confidence: number;
  category?: string;
}

export interface Keyword {
  term: string;
  category: KeywordCategory;
  importance: 'high' | 'medium' | 'low';
  found: boolean;
}

export type KeywordCategory =
  | 'technical'
  | 'soft_skill'
  | 'certification'
  | 'education'
  | 'experience'
  | 'tool'
  | 'industry';

export interface Skill {
  name: string;
  category: SkillCategory;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export type SkillCategory =
  | 'programming'
  | 'framework'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'design'
  | 'management'
  | 'communication'
  | 'other';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'critical' | 'important' | 'nice_to_have';
  title: string;
  description: string;
}

export type RecommendationType =
  | 'add_keyword'
  | 'improve_formatting'
  | 'add_section'
  | 'quantify_achievement'
  | 'remove_content'
  | 'reorder_content';

export interface AnalysisHistoryItem {
  id: string;
  fileName: string;
  jobTitle: string;
  company: string;
  score: number;
  createdAt: string;
}

export interface JobDescriptionInput {
  title: string;
  company: string;
  description: string;
}
