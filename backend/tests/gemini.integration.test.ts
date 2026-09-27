import { describe, expect, it } from 'vitest';
import { matchSemantically } from '../src/services/gemini/index.js';

const provider = process.env.AI_PROVIDER ?? 'gemini';
const apiKey = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
const enabled = process.env.RUN_GEMINI_TESTS === 'true' && Boolean(apiKey);

describe.skipIf(!enabled)('Optional real AI provider integration', () => {
  it('returns semantic matches from the configured provider', async () => {
    const result = await matchSemantically(
      { rawText: 'Developed REST APIs using Spring Boot.' },
      {
        jobTitle: 'Backend Developer',
        requiredSkills: [{ name: 'Spring Boot', importance: 'REQUIRED', evidence: 'Spring Boot required' }],
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
      }
    );

    expect(result.matches).toHaveLength(1);
    expect(['MATCHED', 'PARTIAL', 'UNKNOWN', 'MISSING']).toContain(result.matches[0].status);
  }, 60000);
});
