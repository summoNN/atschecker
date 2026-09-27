import { z } from 'zod';

export const requirementImportanceSchema = z.enum([
  'REQUIRED',
  'PREFERRED',
  'INFORMATIONAL',
]);

export type RequirementImportance = z.infer<typeof requirementImportanceSchema>;

export const requirementItemSchema = z.object({
  name: z.string().min(1),
  importance: requirementImportanceSchema,
  evidence: z.string().min(1),
});

export type RequirementItem = z.infer<typeof requirementItemSchema>;

export const jobRequirementsSchema = z.object({
  jobTitle: z.string().min(1),
  requiredSkills: z.array(requirementItemSchema).default([]),
  preferredSkills: z.array(requirementItemSchema).default([]),
  requiredTechnologies: z.array(requirementItemSchema).default([]),
  preferredTechnologies: z.array(requirementItemSchema).default([]),
  requiredExperience: z.array(requirementItemSchema).default([]),
  educationRequirements: z.array(requirementItemSchema).default([]),
  certifications: z.array(requirementItemSchema).default([]),
  languages: z.array(requirementItemSchema).default([]),
  responsibilities: z.array(requirementItemSchema).default([]),
  softSkills: z.array(requirementItemSchema).default([]),
  importantKeywords: z.array(requirementItemSchema).default([]),
});

export type JobRequirements = z.infer<typeof jobRequirementsSchema>;

export interface NormalizeJdInput {
  jobDescription: string;
  fallbackJobTitle?: string;
}

export interface JdServiceOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}
