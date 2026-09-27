import { analyzeCV, ApiError } from '../../services/analysisService';

const backendResponse = {
  status: 'success',
  data: {
    analysisMode: 'deterministic' as const,
    fileName: 'resume.pdf',
    fileSize: 100,
    pageCount: 1,
    extractedTextLength: 50,
    jobDescriptionLength: 40,
    jobTitle: 'Software Engineer',
    company: 'Test Corp',
    overallScore: 75,
    scoreBreakdown: {
      requiredSkills: 80,
      keywords: 70,
      experience: 75,
      education: 100,
      certifications: 0,
      preferredSkills: 50,
    },
    requirements: [],
    matchedKeywords: [{ term: 'React', category: 'technical', importance: 'high', found: true }],
    missingKeywords: [{ term: 'Docker', category: 'tool', importance: 'high', found: false }],
    matchedSkills: ['React'],
    missingSkills: ['Docker'],
    strengths: ['React evidence'],
    gaps: ['Docker (missing)'],
    atsWarnings: [],
    recommendations: [],
    explanation: 'Compatibility score based on the supplied evidence.',
  },
};

describe('Analysis API service', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify(backendResponse)),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads CV and job description as multipart form data', async () => {
    const result = await analyzeCV('file:///test/resume.pdf', 'resume.pdf', {
      title: 'Software Engineer',
      company: 'Test Corp',
      description: 'Looking for a React developer.',
    });

    expect(result.fileName).toBe('resume.pdf');
    expect(result.score).toBe(75);
    expect(result.matchedKeywords[0].term).toBe('React');
    expect(result.missingKeywords[0].term).toBe('Docker');
    expect(result.detectedSkills[0].name).toBe('React');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/analyze'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
  });

  it('surfaces backend HTTP errors for the UI', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 413,
      text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'File too large' })),
    }) as unknown as typeof fetch;

    await expect(
      analyzeCV('file:///test/resume.pdf', 'resume.pdf', {
        title: '',
        company: '',
        description: 'Description',
      })
    ).rejects.toMatchObject({ code: 'HTTP', status: 413 } as Partial<ApiError>);
  });
});
