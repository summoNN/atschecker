import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeminiService,
  GeminiConfigError,
  GeminiResponseParsingError,
  GeminiTimeoutError,
  GeminiApiError,
  GeminiClientLike,
} from '../src/services/gemini/index.js';

const VALID_ANALYSIS_JSON = JSON.stringify({
  atsScore: 82,
  keywordMatch: 78,
  skillsMatch: 85,
  requirementsMatch: 80,
  experienceMatch: 88,
  educationMatch: 90,
  matchedKeywords: [
    { term: 'TypeScript', category: 'technical' },
    { term: 'Fastify', category: 'framework' },
  ],
  missingKeywords: [
    { term: 'Docker', category: 'devops', importance: 'high' },
  ],
  matchedSkills: ['TypeScript', 'Node.js', 'Fastify'],
  missingSkills: ['Kubernetes'],
  strengths: ['Strong backend background', 'Experience with Node.js ecosystem'],
  weaknesses: ['Lacks production Kubernetes experience'],
  atsWarnings: ['Ensure date formats are standard MM/YYYY'],
  recommendations: [
    {
      title: 'Highlight Containerization',
      description: 'Add Docker experience to project descriptions',
      priority: 'high',
    },
  ],
  explanation: 'Strong candidate profile with 82% compatibility score for backend role.',
});

describe('GeminiService (Unit Tests with Mocked Client)', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  let mockClient: GeminiClientLike;

  beforeEach(() => {
    mockGenerateContent = vi.fn();
    mockClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  });

  it('throws GeminiConfigError when API key is missing and no client is provided', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      expect(() => new GeminiService({ apiKey: '' })).toThrow(GeminiConfigError);
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('successfully analyzes CV and returns validated structured response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: VALID_ANALYSIS_JSON,
    });

    const service = new GeminiService({ apiKey: 'test-key' }, mockClient);
    const result = await service.analyzeWithGemini({
      cvText: 'Experienced TypeScript and Fastify developer.',
      jobDescription: 'Seeking Senior Backend Engineer with TypeScript, Fastify, Docker.',
      jobTitle: 'Senior Backend Engineer',
    });

    expect(result.atsScore).toBe(82);
    expect(result.keywordMatch).toBe(78);
    expect(result.matchedKeywords).toHaveLength(2);
    expect(result.missingKeywords[0].term).toBe('Docker');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('handles markdown code block wrappers around JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: `\`\`\`json\n${VALID_ANALYSIS_JSON}\n\`\`\``,
    });

    const service = new GeminiService({ apiKey: 'test-key' }, mockClient);
    const result = await service.analyzeWithGemini({
      cvText: 'TypeScript engineer.',
      jobDescription: 'Need TypeScript engineer.',
    });

    expect(result.atsScore).toBe(82);
  });

  it('throws GeminiResponseParsingError on invalid JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'This is not JSON text',
    });

    const service = new GeminiService(
      { apiKey: 'test-key', maxRetries: 1 },
      mockClient
    );

    await expect(
      service.analyzeWithGemini({
        cvText: 'CV text',
        jobDescription: 'JD text',
      })
    ).rejects.toThrow(GeminiResponseParsingError);
  });

  it('throws GeminiResponseParsingError when required schema fields are missing', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ atsScore: 50 }), // missing all other required fields
    });

    const service = new GeminiService(
      { apiKey: 'test-key', maxRetries: 1 },
      mockClient
    );

    await expect(
      service.analyzeWithGemini({
        cvText: 'CV text',
        jobDescription: 'JD text',
      })
    ).rejects.toThrow(GeminiResponseParsingError);
  });

  it('times out and throws GeminiTimeoutError when API call exceeds timeoutMs', async () => {
    // Hangs longer than timeoutMs
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    const service = new GeminiService(
      { apiKey: 'test-key', timeoutMs: 50, maxRetries: 1 },
      mockClient
    );

    await expect(
      service.analyzeWithGemini({
        cvText: 'CV text',
        jobDescription: 'JD text',
      })
    ).rejects.toThrow(GeminiTimeoutError);
  });

  it('retries on transient errors and succeeds on subsequent attempt', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        text: VALID_ANALYSIS_JSON,
      });

    const service = new GeminiService(
      { apiKey: 'test-key', maxRetries: 2, retryDelayMs: 10 },
      mockClient
    );

    const result = await service.analyzeWithGemini({
      cvText: 'CV text',
      jobDescription: 'JD text',
    });

    expect(result.atsScore).toBe(82);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 401 Unauthorized errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('API key not valid. Please pass a valid API key. (401)')
    );

    const service = new GeminiService(
      { apiKey: 'test-key', maxRetries: 3, retryDelayMs: 10 },
      mockClient
    );

    await expect(
      service.analyzeWithGemini({
        cvText: 'CV text',
        jobDescription: 'JD text',
      })
    ).rejects.toThrow(GeminiApiError);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
