import { describe, expect, it, vi } from 'vitest';
import { AnalysisPipeline } from '../src/services/analysis/index.js';
import { GeminiRateLimitError, GeminiTimeoutError } from '../src/services/gemini/index.js';
import type { JobRequirements } from '../src/services/jobs/types.js';

const REQUIREMENTS: JobRequirements = {
  jobTitle: 'Backend Developer',
  requiredSkills: [{ name: 'TypeScript', importance: 'REQUIRED', evidence: 'TypeScript required' }],
  preferredSkills: [],
  requiredTechnologies: [],
  preferredTechnologies: [],
  requiredExperience: [],
  educationRequirements: [],
  certifications: [],
  languages: [],
  responsibilities: [],
  softSkills: [],
  importantKeywords: [],
};

describe('final ATS analysis pipeline fallback', () => {
  it.each([
    ['timeout', new GeminiTimeoutError(10)],
    ['rate limit', new GeminiRateLimitError()],
    ['server error', new Error('500 server error')],
    ['network error', new Error('network unavailable')],
    ['invalid JSON', new Error('invalid JSON')],
    ['schema validation', new Error('schema validation failed')],
    ['missing API key', new Error('GEMINI_API_KEY is not configured')],
  ])('returns deterministic analysis when Gemini has a %s failure', async (_name, error) => {
    const pipeline = new AnalysisPipeline({
      normalizeJobDescription: vi.fn().mockResolvedValue(REQUIREMENTS),
      matchSemantically: vi.fn().mockRejectedValue(error),
    });

    const result = await pipeline.analyze({
      cvText: 'TypeScript backend developer.',
      fileName: 'resume.pdf',
      fileSize: 100,
      pageCount: 1,
      jobDescription: 'TypeScript required.',
    });

    expect(result.analysisMode).toBe('deterministic');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.scoreBreakdown).toBeDefined();
    expect(result.requirements).toHaveLength(1);
    expect(result.atsWarnings.some((warning) => warning.includes('deterministic'))).toBe(true);
    expect(result).not.toHaveProperty('semanticScore');
  });
});
