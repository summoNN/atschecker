import { describe, it, expect } from 'vitest';
import {
  CvService,
  isValidPdfBuffer,
  parsePdfBuffer,
  EmptyFileError,
  InvalidPdfError,
  OversizedFileError,
} from '../src/services/cv/index.js';

const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 72 712 Td (Alex Mercer Senior Developer) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n320\n%%EOF'
);

describe('CV Service & PDF Parser Unit Tests', () => {
  describe('isValidPdfBuffer', () => {
    it('returns true for buffer starting with %PDF-', () => {
      expect(isValidPdfBuffer(VALID_PDF_BUFFER)).toBe(true);
    });

    it('returns false for plain text buffer', () => {
      expect(isValidPdfBuffer(Buffer.from('hello world'))).toBe(false);
    });

    it('returns false for empty or small buffer', () => {
      expect(isValidPdfBuffer(Buffer.alloc(0))).toBe(false);
      expect(isValidPdfBuffer(Buffer.from('%PD'))).toBe(false);
    });
  });

  describe('parsePdfBuffer', () => {
    it('extracts text and page count from valid PDF', async () => {
      const result = await parsePdfBuffer(VALID_PDF_BUFFER);
      expect(result.text).toContain('Alex Mercer Senior Developer');
      expect(result.pageCount).toBe(1);
    });

    it('throws EmptyFileError on empty buffer', async () => {
      await expect(parsePdfBuffer(Buffer.alloc(0))).rejects.toThrow(EmptyFileError);
    });

    it('throws InvalidPdfError on non-PDF buffer', async () => {
      await expect(parsePdfBuffer(Buffer.from('not a pdf'))).rejects.toThrow(InvalidPdfError);
    });
  });

  describe('CvService', () => {
    it('extracts CV and returns metadata', async () => {
      const service = new CvService({ maxFileSizeMb: 5 });
      const result = await service.extractCvText(VALID_PDF_BUFFER, 'my-cv.pdf');

      expect(result.fileName).toBe('my-cv.pdf');
      expect(result.fileSize).toBe(VALID_PDF_BUFFER.length);
      expect(result.pageCount).toBe(1);
      expect(result.text).toContain('Alex Mercer');
    });

    it('throws OversizedFileError when buffer exceeds limit', async () => {
      // 1MB limit for test
      const service = new CvService({ maxFileSizeMb: 1 });
      const twoMbBuffer = Buffer.alloc(2 * 1024 * 1024);

      await expect(service.extractCvText(twoMbBuffer)).rejects.toThrow(OversizedFileError);
    });
  });
});
