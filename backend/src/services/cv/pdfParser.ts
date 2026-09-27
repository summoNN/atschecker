import { PDFParse } from 'pdf-parse';
import {
  EmptyFileError,
  InvalidPdfError,
  UnextractablePdfError,
} from './cv.errors.js';

export interface ParsedPdf {
  text: string;
  pageCount: number;
}

// Magic bytes for PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

/**
 * Validates that the buffer contains a legitimate PDF header.
 * Inspects binary magic bytes instead of relying on client-supplied MIME type.
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < PDF_MAGIC_BYTES.length) {
    return false;
  }
  return buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

/**
 * Low-level PDF parser that parses PDF buffers completely in memory
 * and guarantees cleanup of underlying parser resources.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdf> {
  if (!buffer || buffer.length === 0) {
    throw new EmptyFileError();
  }

  if (!isValidPdfBuffer(buffer)) {
    throw new InvalidPdfError();
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const rawText = result.text ?? '';
    const cleanText = rawText.replace(/\r\n/g, '\n').split('\0').join('').trim();

    if (cleanText.length === 0) {
      throw new UnextractablePdfError();
    }

    return {
      text: cleanText,
      pageCount: result.total ?? result.pages?.length ?? 1,
    };
  } catch (error: unknown) {
    if (
      error instanceof EmptyFileError ||
      error instanceof InvalidPdfError ||
      error instanceof UnextractablePdfError
    ) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new InvalidPdfError(`Failed to parse PDF document: ${message}`);
  } finally {
    try {
      await parser.destroy();
    } catch {
      // Ignore destroy errors during cleanup
    }
  }
}
