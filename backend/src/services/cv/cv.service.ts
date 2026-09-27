import path from 'path';
import { parsePdfBuffer, ParsedPdf } from './pdfParser.js';
import { OversizedFileError } from './cv.errors.js';

export interface ExtractedCv {
  text: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
}

export interface CvServiceOptions {
  maxFileSizeMb?: number;
}

export class CvService {
  private readonly maxFileSizeBytes: number;

  constructor(options: CvServiceOptions = {}) {
    const maxMb = options.maxFileSizeMb ?? 10;
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  /**
   * Validates and extracts text from an in-memory CV PDF buffer.
   * Completely stateless, never writes to persistent disk, and sanitizes logs.
   */
  async extractCvText(buffer: Buffer, originalFileName = 'resume.pdf'): Promise<ExtractedCv> {
    const startTime = Date.now();
    const sanitizedFileName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    if (buffer.length > this.maxFileSizeBytes) {
      const maxMb = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      throw new OversizedFileError(maxMb);
    }

    const parsed: ParsedPdf = await parsePdfBuffer(buffer);
    const durationMs = Date.now() - startTime;

    // Structured logging without sensitive CV data or PII
    console.info(
      JSON.stringify({
        event: 'cv_extracted',
        fileName: sanitizedFileName,
        fileSizeBytes: buffer.length,
        pageCount: parsed.pageCount,
        textLength: parsed.text.length,
        durationMs,
      })
    );

    return {
      text: parsed.text,
      fileName: sanitizedFileName,
      fileSize: buffer.length,
      pageCount: parsed.pageCount,
    };
  }
}

export const cvService = new CvService();
