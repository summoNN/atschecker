import { z } from 'zod';
import type { JobRequirements } from '../jobs/types.js';
import type { StructuredCV } from '../ats/types.js';

export interface GeminiAnalyzeInput {
  cvText: string;
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}

export const keywordItemSchema = z.object({
  term: z.string().min(1),
  category: z.string().default('technical'),
});

export const missingKeywordItemSchema = z.object({
  term: z.string().min(1),
  category: z.string().default('technical'),
  importance: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const recommendationItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z
    .enum(['critical', 'important', 'nice_to_have', 'high', 'medium', 'low'])
    .transform((val) => {
      if (val === 'high') return 'critical';
      if (val === 'medium') return 'important';
      if (val === 'low') return 'nice_to_have';
      return val;
    })
    .default('important'),
});

export const atsAnalysisSchema = z.object({
  atsScore: z.number().min(0).max(100),
  keywordMatch: z.number().min(0).max(100),
  skillsMatch: z.number().min(0).max(100),
  requirementsMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  educationMatch: z.number().min(0).max(100),
  matchedKeywords: z.array(keywordItemSchema),
  missingKeywords: z.array(missingKeywordItemSchema),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  atsWarnings: z.array(z.string()),
  recommendations: z.array(recommendationItemSchema),
  explanation: z.string().min(1),
});

export type AtsAnalysisResult = z.infer<typeof atsAnalysisSchema>;

export interface GeminiServiceOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export const semanticMatchStatusSchema = z.enum([
  'MATCHED',
  'PARTIAL',
  'MISSING',
  'UNKNOWN',
]);

export const semanticRequirementMatchSchema = z.object({
  requirement: z.string().min(1),
  status: semanticMatchStatusSchema,
  // Empty evidence is allowed only for MISSING and UNKNOWN, enforced after
  // schema validation because the rule depends on status.
  evidence: z.string(),
  // Confidence is a probability-like value from 0 to 1.
  confidence: z.number().min(0).max(1),
});

export const semanticMatchingResultSchema = z.object({
  matches: z.array(semanticRequirementMatchSchema),
});

export type SemanticMatchStatus = z.infer<typeof semanticMatchStatusSchema>;
export type SemanticRequirementMatch = z.infer<typeof semanticRequirementMatchSchema>;
export type SemanticMatchingResult = z.infer<typeof semanticMatchingResultSchema>;

export interface SemanticMatchingInput {
  cv: StructuredCV;
  requirements: JobRequirements;
}
