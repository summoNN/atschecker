import { FastifyReply, FastifyRequest } from 'fastify';
import {
  cvService,
  CvService,
  CvError,
  EmptyFileError,
  InvalidJobDescriptionError,
  MalformedRequestError,
  MissingCvFileError,
  OversizedFileError,
} from '../services/cv/index.js';
import { analysisPipeline, AnalysisPipeline, AnalysisPipelineInput } from '../services/analysis/index.js';

export interface AnalysisRunner {
  analyze(input: AnalysisPipelineInput): ReturnType<AnalysisPipeline['analyze']>;
}

export class AnalyzeController {
  private readonly cvService: CvService;
  private readonly analysisRunner: AnalysisRunner;

  constructor(
    service: CvService = cvService,
    analysisRunner: AnalysisRunner = analysisPipeline
  ) {
    this.cvService = service;
    this.analysisRunner = analysisRunner;
  }

  handleAnalyze = async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    if (!request.isMultipart()) {
      throw new MalformedRequestError('Request must be multipart/form-data');
    }

    let cvBuffer: Buffer | null = null;
    let cvFileName = 'resume.pdf';
    let jobDescription = '';
    let jobTitle = '';
    let company = '';
    let cvFieldFound = false;

    try {
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'cv') {
            cvFieldFound = true;
            cvFileName = part.filename || 'resume.pdf';
            cvBuffer = await part.toBuffer();

            if (part.file.truncated) {
              throw new OversizedFileError();
            }
          } else {
            // Drain unexpected file streams to prevent memory leaks
            await part.toBuffer();
          }
        } else {
          // field
          if (part.fieldname === 'jobDescription') {
            jobDescription = typeof part.value === 'string' ? part.value : String(part.value ?? '');
          } else if (part.fieldname === 'jobTitle') {
            jobTitle = typeof part.value === 'string' ? part.value : String(part.value ?? '');
          } else if (part.fieldname === 'company') {
            company = typeof part.value === 'string' ? part.value : String(part.value ?? '');
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof CvError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      const isOversized =
        (typeof err === 'object' && err !== null && 'code' in err && (err.code === 'FST_REQ_FILE_TOO_LARGE' || err.code === 'FST_FILES_LIMIT')) ||
        (typeof err === 'object' && err !== null && 'statusCode' in err && err.statusCode === 413) ||
        message.toLowerCase().includes('too large') ||
        message.includes('FST_REQ_FILE_TOO_LARGE');

      if (isOversized) {
        throw new OversizedFileError();
      }

      throw new MalformedRequestError(`Failed to parse multipart request: ${message}`);
    }

    if (!cvFieldFound || !cvBuffer) {
      throw new MissingCvFileError();
    }

    if (cvBuffer.length === 0) {
      throw new EmptyFileError();
    }

    const trimmedJd = jobDescription.trim();
    if (trimmedJd.length === 0) {
      throw new InvalidJobDescriptionError('jobDescription must be a non-empty string');
    }

    // Delegate extraction exclusively to the CV service
    const extracted = await this.cvService.extractCvText(cvBuffer, cvFileName);
    const analysis = await this.analysisRunner.analyze({
      cvText: extracted.text,
      fileName: extracted.fileName,
      fileSize: extracted.fileSize,
      pageCount: extracted.pageCount,
      jobDescription: trimmedJd,
      jobTitle: jobTitle.trim() || undefined,
      company: company.trim() || undefined,
    });

    const durationMs = Date.now() - startTime;
    console.info(
      JSON.stringify({
        event: 'analyze_request_success',
        fileName: extracted.fileName,
        fileSize: extracted.fileSize,
        pageCount: extracted.pageCount,
        extractedTextLength: extracted.text.length,
        jobDescriptionLength: trimmedJd.length,
        durationMs,
      })
    );

    return reply.status(200).send({
      status: 'success',
      message: 'CV and job description validated and extracted successfully',
      data: {
        ...analysis,
      },
    });
  };
}

export const analyzeController = new AnalyzeController();
