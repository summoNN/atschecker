import { describe, expect, it, vi } from 'vitest';
import {
  GeminiResponseParsingError,
  GeminiService,
  type GeminiClientLike,
} from '../src/services/gemini/index.js';
import type { JobRequirements } from '../src/services/jobs/types.js';
import type { StructuredCV } from '../src/services/ats/types.js';

function jobWithRequirement(name: string, evidence: string): JobRequirements {
  return {
    jobTitle: 'Backend Engineer',
    requiredSkills: [{ name, importance: 'REQUIRED', evidence }],
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
}

function clientReturning(text: string): {
  client: GeminiClientLike;
  generateContent: ReturnType<typeof vi.fn>;
} {
  const generateContent = vi.fn().mockResolvedValue({ text });
  return {
    generateContent,
    client: { models: { generateContent } },
  };
}

describe('Gemini semantic matching layer', () => {
  it('returns evidence-backed semantic matches without an ATS score', async () => {
    const { client, generateContent } = clientReturning(
      JSON.stringify({
        matches: [
          {
            requirement: 'Spring Boot experience',
            status: 'MATCHED',
            evidence: 'Developed REST APIs using Spring Boot.',
            confidence: 0.98,
          },
        ],
      })
    );
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 1 }, client);
    const cv: StructuredCV = { rawText: 'Developed REST APIs using Spring Boot.' };

    const result = await service.matchSemantically(
      cv,
      jobWithRequirement('Spring Boot experience', 'Spring Boot experience required')
    );

    expect(result.matches[0]).toEqual({
      requirement: 'Spring Boot experience',
      status: 'MATCHED',
      evidence: 'Developed REST APIs using Spring Boot.',
      confidence: 0.98,
    });
    expect(result).not.toHaveProperty('atsScore');
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][0].config.temperature).toBe(0);
    expect(generateContent.mock.calls[0][0].config.systemInstruction).toContain('NOT an ATS scoring task');
  });

  it('preserves UNKNOWN when related evidence cannot verify the requirement', async () => {
    const { client } = clientReturning(
      JSON.stringify({
        matches: [
          {
            requirement: '5 years of Spring Boot experience',
            status: 'UNKNOWN',
            evidence: '',
            confidence: 0.2,
          },
        ],
      })
    );
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 1 }, client);

    const result = await service.matchSemantically(
      { rawText: 'Backend developer.' },
      jobWithRequirement(
        '5 years of Spring Boot experience',
        '5 years of Spring Boot experience required'
      )
    );

    expect(result.matches[0].status).toBe('UNKNOWN');
    expect(result.matches[0].evidence).toBe('');
  });

  it('rejects evidence that is not present in the supplied CV', async () => {
    const { client } = clientReturning(
      JSON.stringify({
        matches: [
          {
            requirement: 'Spring Boot experience',
            status: 'MATCHED',
            evidence: 'Built five years of Spring Boot systems.',
            confidence: 0.95,
          },
        ],
      })
    );
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 1 }, client);

    await expect(
      service.matchSemantically(
        { rawText: 'Backend developer.' },
        jobWithRequirement('Spring Boot experience', 'Spring Boot required')
      )
    ).rejects.toThrow(GeminiResponseParsingError);
  });

  it('rejects MATCHED results without evidence', async () => {
    const { client } = clientReturning(
      JSON.stringify({
        matches: [
          {
            requirement: 'Spring Boot experience',
            status: 'MATCHED',
            evidence: '',
            confidence: 1,
          },
        ],
      })
    );
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 1 }, client);

    await expect(
      service.semanticMatch(
        { rawText: 'Backend developer.' },
        jobWithRequirement('Spring Boot experience', 'Spring Boot required')
      )
    ).rejects.toThrow(GeminiResponseParsingError);
  });

  it('rejects invalid structured output without retrying a non-retryable response error', async () => {
    const { client, generateContent } = clientReturning(
      JSON.stringify({ matches: [{ requirement: 'Spring Boot experience', status: 'MATCHED' }] })
    );
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 3, retryDelayMs: 0 }, client);

    await expect(
      service.matchSemantically(
        { rawText: 'Developed REST APIs using Spring Boot.' },
        jobWithRequirement('Spring Boot experience', 'Spring Boot required')
      )
    ).rejects.toThrow(GeminiResponseParsingError);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries transient Gemini failures and then validates the semantic response', async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          matches: [
            {
              requirement: 'Spring Boot experience',
              status: 'PARTIAL',
              evidence: 'Spring Boot',
              confidence: 0.65,
            },
          ],
        }),
      });
    const client: GeminiClientLike = { models: { generateContent } };
    const service = new GeminiService({ apiKey: 'test-key', maxRetries: 2, retryDelayMs: 0 }, client);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const result = await service.matchSemantically(
        { rawText: 'Spring Boot' },
        jobWithRequirement('Spring Boot experience', 'Spring Boot required')
      );

      expect(result.matches[0].status).toBe('PARTIAL');
      expect(generateContent).toHaveBeenCalledTimes(2);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
