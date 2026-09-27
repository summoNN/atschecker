import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { AnalyzeController } from '../src/controllers/analyze.controller.js';
import { CvService } from '../src/services/cv/index.js';
import { AnalysisPipeline } from '../src/services/analysis/index.js';
import type { JobRequirements } from '../src/services/jobs/types.js';

const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 72 712 Td (Alex Mercer Senior Developer) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n320\n%%EOF'
);

function createMultipartPayload(): { buffer: Buffer; headers: Record<string, string> } {
  const boundary = '----ATSCheckerBoundary';
  const buffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jobDescription"\r\n\r\nSenior Developer required.\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="jobTitle"\r\n\r\nSenior Developer\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="cv"; filename="resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    VALID_PDF_BUFFER,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    buffer,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(buffer.length),
    },
  };
}

describe('POST /api/analyze hybrid pipeline', () => {
  it('returns the final response shape with mocked Gemini semantics', async () => {
    const requirements: JobRequirements = {
      jobTitle: 'Senior Developer',
      requiredSkills: [{ name: 'Senior Developer', importance: 'REQUIRED', evidence: 'Senior Developer required' }],
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
    const pipeline = new AnalysisPipeline({
      normalizeJobDescription: vi.fn().mockResolvedValue(requirements),
      matchSemantically: vi.fn().mockResolvedValue({
        matches: [{
          requirement: 'Senior Developer',
          status: 'MATCHED',
          evidence: 'Alex Mercer Senior Developer',
          confidence: 0.94,
        }],
      }),
    });
    const app = await buildApp(
      { logger: false },
      { analyzeController: new AnalyzeController(new CvService(), pipeline) }
    );
    await app.ready();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/analyze',
        headers: createMultipartPayload().headers,
        payload: createMultipartPayload().buffer,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.analysisMode).toBe('hybrid');
      expect(typeof body.data.overallScore).toBe('number');
      expect(body.data.scoreBreakdown).toBeDefined();
      expect(body.data.requirements).toHaveLength(1);
      expect(body.data.matchedKeywords).toBeDefined();
      expect(body.data.missingKeywords).toBeDefined();
      expect(body.data.recommendations).toBeDefined();
      expect(body.data.explanation).toEqual(expect.any(String));
    } finally {
      await app.close();
    }
  });
});
