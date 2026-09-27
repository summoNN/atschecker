import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

// Minimal valid PDF with text stream
const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 72 712 Td (Alex Mercer Senior Developer) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n320\n%%EOF'
);

function createMultipartPayload(
  fields: Record<string, string>,
  files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }>
): { buffer: Buffer; headers: Record<string, string> } {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    chunks.push(file.data);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const buffer = Buffer.concat(chunks);
  return {
    buffer,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(buffer.length),
    },
  };
}

describe('POST /api/analyze (CV Upload & Extraction)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('successfully processes valid PDF with job description', async () => {
    const payload = createMultipartPayload(
      { jobDescription: 'Seeking Senior Full Stack Developer with TypeScript.' },
      [
        {
          fieldname: 'cv',
          filename: 'resume.pdf',
          contentType: 'application/pdf',
          data: VALID_PDF_BUFFER,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
    expect(body.data.fileName).toBe('resume.pdf');
    expect(body.data.pageCount).toBe(1);
    expect(body.data.extractedTextLength).toBeGreaterThan(0);
    expect(body.data.jobDescriptionLength).toBeGreaterThan(0);
    expect(body.data.analysisMode).toBe('deterministic');
    expect(typeof body.data.overallScore).toBe('number');
    expect(body.data.scoreBreakdown).toBeDefined();
    expect(body.data.requirements).toBeDefined();
    expect(body.data.matchedKeywords).toBeDefined();
    expect(body.data.missingKeywords).toBeDefined();
    expect(body.data.recommendations).toBeDefined();
    expect(body.data.explanation).toEqual(expect.any(String));
  });

  it('rejects non-PDF files disguised with .pdf extension (magic bytes check)', async () => {
    const fakePdfBuffer = Buffer.from('This is a plain text file, not a real PDF document.');
    const payload = createMultipartPayload(
      { jobDescription: 'Backend Engineer' },
      [
        {
          fieldname: 'cv',
          filename: 'fake.pdf',
          contentType: 'application/pdf',
          data: fakePdfBuffer,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('InvalidPdfError');
    expect(body.message).toContain('not a valid PDF document');
  });

  it('rejects empty (0-byte) CV file', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const payload = createMultipartPayload(
      { jobDescription: 'Backend Engineer' },
      [
        {
          fieldname: 'cv',
          filename: 'empty.pdf',
          contentType: 'application/pdf',
          data: emptyBuffer,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('EmptyFileError');
  });

  it('rejects upload when CV file is missing', async () => {
    const payload = createMultipartPayload(
      { jobDescription: 'Backend Engineer' },
      []
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('MissingCvFileError');
  });

  it('rejects upload when job description is missing', async () => {
    const payload = createMultipartPayload(
      {},
      [
        {
          fieldname: 'cv',
          filename: 'resume.pdf',
          contentType: 'application/pdf',
          data: VALID_PDF_BUFFER,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('InvalidJobDescriptionError');
  });

  it('rejects upload when job description is empty or whitespace-only', async () => {
    const payload = createMultipartPayload(
      { jobDescription: '    \n\t   ' },
      [
        {
          fieldname: 'cv',
          filename: 'resume.pdf',
          contentType: 'application/pdf',
          data: VALID_PDF_BUFFER,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('InvalidJobDescriptionError');
  });

  it('rejects oversized files exceeding size limit', async () => {
    // 11MB buffer (limit is 10MB)
    const elevenMb = 11 * 1024 * 1024;
    const oversizedBuffer = Buffer.alloc(elevenMb);
    Buffer.from('%PDF-1.4\n').copy(oversizedBuffer); // Valid magic bytes but oversized

    const payload = createMultipartPayload(
      { jobDescription: 'Job description text' },
      [
        {
          fieldname: 'cv',
          filename: 'huge.pdf',
          contentType: 'application/pdf',
          data: oversizedBuffer,
        },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: payload.headers,
      payload: payload.buffer,
    });

    expect(response.statusCode).toBe(413);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('OversizedFileError');
  });

  it('rejects malformed non-multipart requests with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ cv: 'bad', jobDescription: 'text' }),
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('MalformedRequestError');
  });
});
