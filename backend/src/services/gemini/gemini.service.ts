import { GoogleGenAI } from '@google/genai';
import { env } from '../../utils/env.js';
import {
  AtsAnalysisResult,
  atsAnalysisSchema,
  GeminiAnalyzeInput,
  GeminiServiceOptions,
  SemanticMatchingInput,
  SemanticMatchingResult,
  semanticMatchingResultSchema,
} from './types.js';
import type { JobRequirements, RequirementItem } from '../jobs/types.js';
import type { StructuredCV } from '../ats/types.js';
import {
  GeminiApiError,
  GeminiConfigError,
  GeminiError,
  GeminiRateLimitError,
  GeminiResponseParsingError,
  GeminiTimeoutError,
} from './gemini.errors.js';
import { createGroqClient } from '../groq/groq.service.js';

const SYSTEM_INSTRUCTION = `You are an elite Applicant Tracking System (ATS) evaluator and executive technical recruiter.
Your job is to objectively analyze a candidate's CV/resume against a target job description.

Analyze the resume and return a detailed, rigorous ATS compatibility report strictly matching the requested JSON structure.

Scoring Guidelines:
- atsScore (0-100): Weighted overall compatibility score considering hard skills, requirements, experience, and education.
- keywordMatch (0-100): Percentage of important keywords from the job description present in the CV.
- skillsMatch (0-100): Percentage of required technical and soft skills demonstrated.
- requirementsMatch (0-100): How well candidate meets essential job requirements (seniority, role duties, credentials).
- experienceMatch (0-100): Alignment of years of experience, relevant achievements, and career trajectory.
- educationMatch (0-100): Alignment with degrees, certifications, or educational background requested.

Arrays to populate:
- matchedKeywords: Array of objects { term: string, category: string } for terms found in both.
- missingKeywords: Array of objects { term: string, category: string, importance: "high" | "medium" | "low" } for terms in JD but missing in CV.
- matchedSkills: Array of skill strings found.
- missingSkills: Array of critical skill strings missing.
- strengths: Bulleted highlights of why candidate matches this specific role.
- weaknesses: Critical gaps or areas where candidate falls short.
- atsWarnings: Formatting, parsing, or structural red flags that could cause ATS parsers to misread the resume.
- recommendations: Array of objects { title: string, description: string, priority: "critical" | "important" | "nice_to_have" } with clear, actionable advice.
- explanation: A clear executive summary explaining the final ATS score and hiring likelihood.

You MUST output ONLY valid JSON matching this schema. No markdown formatting, no explanations outside JSON.`;

const SEMANTIC_SYSTEM_INSTRUCTION = `You are a careful semantic evidence evaluator for recruiting requirements.

Evaluate each supplied job requirement against the supplied structured CV.
This is NOT an ATS scoring task. Never calculate or return an ATS score.

For every supplied requirement return exactly one object in the matches array:
{
  "requirement": "the exact supplied requirement name",
  "status": "MATCHED | PARTIAL | MISSING | UNKNOWN",
  "evidence": "an exact quote or concise text copied from the CV, or an empty string",
  "confidence": 0.0
}

Rules:
- Evidence MUST be present in the supplied CV. Do not paraphrase facts that are not stated.
- Never invent experience, technologies, education, certifications, or years.
- MATCHED requires direct or clearly equivalent CV evidence.
- PARTIAL means the CV supports only part of the requirement.
- MISSING means the CV provides no evidence for the requirement.
- UNKNOWN means the CV contains related or ambiguous information, but it is insufficient to verify the requirement.
- For MISSING and UNKNOWN, use an empty evidence string unless the CV contains the related ambiguous evidence.
- Confidence must be between 0 and 1 and reflect the strength of the supplied evidence.
- Return one result for every requirement and no extra results.
- Output only valid JSON in the form {"matches":[...]}.`;

const SEMANTIC_MATCH_RESPONSE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    requirement: { type: 'string' },
    status: { type: 'string', enum: ['MATCHED', 'PARTIAL', 'MISSING', 'UNKNOWN'] },
    evidence: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['requirement', 'status', 'evidence', 'confidence'],
  additionalProperties: false,
};

function buildSemanticResponseSchema(requirementCount: number): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      matches: {
        type: 'array',
        items: SEMANTIC_MATCH_RESPONSE_ITEM_SCHEMA,
        minItems: requirementCount,
        maxItems: requirementCount,
      },
    },
    required: ['matches'],
    additionalProperties: false,
  };
}

export interface GeminiClientLike {
  models: {
    generateContent: (params: {
      model: string;
      contents: string | Array<{ role?: string; parts: Array<{ text: string }> }>;
      config?: {
        systemInstruction?: string;
        responseMimeType?: string;
        temperature?: number;
        responseSchema?: Record<string, unknown>;
        responseSchemaName?: string;
        reasoningEffort?: 'low' | 'medium' | 'high';
      };
    }) => Promise<{ text?: string | null }>;
  };
}

export class GeminiService {
  private readonly client: GeminiClientLike;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: GeminiServiceOptions = {}, customClient?: GeminiClientLike) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;

    if (!customClient && (!apiKey || apiKey.trim() === '')) {
      throw new GeminiConfigError('AI provider API key is not configured');
    }

    this.client = customClient ?? (new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike);
    this.model = options.model ?? process.env.GEMINI_MODEL ?? env.GEMINI_MODEL ?? 'gemini-3.8-flash';
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  /**
   * Analyzes CV text against a Job Description using the configured AI provider.
   * Stateless, timeout-protected, and automatically retries transient errors.
   */
  async analyzeWithGemini(input: GeminiAnalyzeInput): Promise<AtsAnalysisResult> {
    const startTime = Date.now();

    // Sanitized structured logging (never log raw CV or JD contents)
    console.info(
      JSON.stringify({
        event: 'ai_analyze_start',
        model: this.model,
        cvLength: input.cvText?.length ?? 0,
        jobDescLength: input.jobDescription?.length ?? 0,
        jobTitle: input.jobTitle ?? 'Unspecified',
        company: input.company ?? 'Unspecified',
      })
    );

    const prompt = this.buildPrompt(input);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const rawJson = await this.executeWithTimeout(prompt);
        const result = this.parseAndValidateResponse(rawJson);

        const durationMs = Date.now() - startTime;
        console.info(
          JSON.stringify({
            event: 'ai_analyze_success',
            durationMs,
            attempts: attempt,
            atsScore: result.atsScore,
            matchedKeywordsCount: result.matchedKeywords.length,
            missingKeywordsCount: result.missingKeywords.length,
            recommendationsCount: result.recommendations.length,
          })
        );

        return result;
      } catch (err: unknown) {
        lastError = this.normalizeError(err);

        const isRetryable = lastError instanceof GeminiError && lastError.isRetryable;
        const willRetry = isRetryable && attempt < this.maxRetries;

        console.warn(
          JSON.stringify({
            event: 'ai_analyze_attempt_failed',
            attempt,
            maxRetries: this.maxRetries,
            errorName: lastError.name,
            errorMessage: lastError.message,
            willRetry,
          })
        );

        if (!willRetry) {
          break;
        }

        // Exponential backoff with jitter
        const backoff = this.retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    const durationMs = Date.now() - startTime;
    console.error(
      JSON.stringify({
        event: 'ai_analyze_failed',
        durationMs,
        errorName: lastError?.name ?? 'UnknownError',
        errorMessage: lastError?.message ?? 'Unknown error',
      })
    );

    throw lastError ?? new GeminiError('AI analysis failed');
  }

  /**
   * Evaluates semantic relationships only. This method intentionally returns
   * no score; deterministic scoring remains the responsibility of the ATS
   * engine.
   */
  async matchSemantically(
    cv: StructuredCV,
    requirements: JobRequirements
  ): Promise<SemanticMatchingResult>;
  async matchSemantically(input: SemanticMatchingInput): Promise<SemanticMatchingResult>;
  async matchSemantically(
    cvOrInput: StructuredCV | SemanticMatchingInput,
    requirementsArg?: JobRequirements
  ): Promise<SemanticMatchingResult> {
    const input: SemanticMatchingInput = requirementsArg
      ? { cv: cvOrInput as StructuredCV, requirements: requirementsArg }
      : (cvOrInput as SemanticMatchingInput);
    const relevantRequirements = this.collectSemanticRequirements(input.requirements);
    const prompt = this.buildSemanticPrompt(input.cv, relevantRequirements);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const rawJson = await this.executeWithTimeout(
          prompt,
          SEMANTIC_SYSTEM_INSTRUCTION,
          0,
          buildSemanticResponseSchema(relevantRequirements.length),
          'semantic_matches'
        );
        const result = this.parseAndValidateSemanticResponse(
          rawJson,
          input.cv,
          relevantRequirements
        );

        console.info(
          JSON.stringify({
            event: 'ai_semantic_match_success',
            model: this.model,
            attempts: attempt,
            matchCount: result.matches.length,
          })
        );
        return result;
      } catch (err: unknown) {
        lastError = this.normalizeError(err);
        const isRetryable = lastError instanceof GeminiError && lastError.isRetryable;
        const willRetry = isRetryable && attempt < this.maxRetries;

        console.warn(
          JSON.stringify({
            event: 'ai_semantic_match_attempt_failed',
            attempt,
            maxRetries: this.maxRetries,
            errorName: lastError.name,
            errorMessage: lastError.message,
            willRetry,
          })
        );

        if (!willRetry) break;

        const backoff = this.retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError ?? new GeminiError('Semantic matching failed');
  }

  async semanticMatch(
    cv: StructuredCV,
    requirements: JobRequirements
  ): Promise<SemanticMatchingResult> {
    return this.matchSemantically(cv, requirements);
  }

  private collectSemanticRequirements(requirements: JobRequirements): Array<{
    requirement: string;
    category: string;
    importance: string;
    evidence: string;
  }> {
    const groups: Array<[string, RequirementItem[] | undefined]> = [
      ['requiredSkills', requirements.requiredSkills],
      ['preferredSkills', requirements.preferredSkills],
      ['requiredTechnologies', requirements.requiredTechnologies],
      ['preferredTechnologies', requirements.preferredTechnologies],
      ['requiredExperience', requirements.requiredExperience],
      ['education', requirements.educationRequirements],
      ['certifications', requirements.certifications],
      ['languages', requirements.languages],
      ['responsibilities', requirements.responsibilities],
      ['softSkills', requirements.softSkills],
      ['importantKeywords', requirements.importantKeywords],
    ];

    const seen = new Set<string>();
    return groups.flatMap(([category, items]) =>
      (items ?? []).flatMap((item) => {
        const requirement = item.name.trim();
        const key = this.normalizeEvidence(requirement);
        if (!requirement || seen.has(key)) return [];
        seen.add(key);
        return [{
          requirement,
          category,
          importance: item.importance,
          evidence: item.evidence,
        }];
      })
    );
  }

  private buildSemanticPrompt(
    cv: StructuredCV,
    requirements: Array<{ requirement: string; category: string; importance: string; evidence: string }>
  ): string {
    return `Evaluate the following requirements using only evidence in the CV.

STRUCTURED CV:
${JSON.stringify(cv, null, 2)}

REQUIREMENTS TO EVALUATE:
${JSON.stringify(requirements, null, 2)}

Return exactly one semantic match for every requirement name in the input. Do not return an ATS score.`;
  }

  private parseAndValidateSemanticResponse(
    rawText: string,
    cv: StructuredCV,
    expectedRequirements: Array<{ requirement: string }>
  ): SemanticMatchingResult {
    let parsed: unknown;
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) parsed = { matches: parsed };
    } catch {
      throw new GeminiResponseParsingError(
        'Failed to parse semantic response as JSON',
        rawText
      );
    }

    const validation = semanticMatchingResultSchema.safeParse(parsed);
    if (!validation.success) {
      throw new GeminiResponseParsingError(
        `Semantic response failed schema validation: ${validation.error.message}`,
        rawText
      );
    }

    const receivedByName = new Map<string, typeof validation.data.matches>();
    for (const match of validation.data.matches) {
      const key = this.normalizeEvidence(match.requirement);
      const matches = receivedByName.get(key) ?? [];
      matches.push(match);
      receivedByName.set(key, matches);
    }

    const result: SemanticMatchingResult = {
      matches: expectedRequirements.map((expected) => {
        const key = this.normalizeEvidence(expected.requirement);
        const matches = receivedByName.get(key);
        const match = matches?.shift();
        return match ?? {
          requirement: expected.requirement,
          status: 'UNKNOWN' as const,
          evidence: '',
          confidence: 0,
        };
      }),
    };

    const cvEvidence = this.normalizeEvidence(JSON.stringify(cv));
    for (const match of result.matches) {
      const evidence = this.normalizeEvidence(match.evidence);
      if ((match.status === 'MATCHED' || match.status === 'PARTIAL') && !evidence) {
        throw new GeminiResponseParsingError(
          `Semantic response returned ${match.status} without CV evidence for '${match.requirement}'`,
          rawText
        );
      }
      if (evidence && !cvEvidence.includes(evidence)) {
        throw new GeminiResponseParsingError(
          `Semantic response returned evidence not found in the supplied CV for '${match.requirement}'`,
          rawText
        );
      }
    }

    return result;
  }

  private normalizeEvidence(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildPrompt(input: GeminiAnalyzeInput): string {
    return `TARGET JOB TITLE: ${input.jobTitle ?? 'Not Specified'}
TARGET COMPANY: ${input.company ?? 'Not Specified'}

--- JOB DESCRIPTION ---
${input.jobDescription}

--- CANDIDATE CV TEXT ---
${input.cvText}

Analyze the candidate CV against the job description above and return the comprehensive ATS analysis JSON.`;
  }

  private async executeWithTimeout(
    prompt: string,
    systemInstruction = SYSTEM_INSTRUCTION,
    temperature = 0.1,
    responseSchema?: Record<string, unknown>,
    responseSchemaName?: string
  ): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new GeminiTimeoutError(this.timeoutMs));
      }, this.timeoutMs);

      // Node.js specific unref so timer doesn't prevent process exit
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    const apiPromise = (async () => {
      const config = {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature,
        ...(responseSchema && this.model.startsWith('openai/gpt-oss')
          ? {
              responseSchema,
              responseSchemaName,
              reasoningEffort: 'low' as const,
            }
          : {}),
      };

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new GeminiResponseParsingError('AI provider returned an empty text response');
      }

      return text;
    })();

    return Promise.race([apiPromise, timeoutPromise]);
  }

  private parseAndValidateResponse(rawText: string): AtsAnalysisResult {
    let parsed: unknown;
    try {
      // Strip potential markdown fence wrappers if model included them
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch {
      throw new GeminiResponseParsingError('Failed to parse AI response as JSON', rawText);
    }

    const validation = atsAnalysisSchema.safeParse(parsed);
    if (!validation.success) {
      throw new GeminiResponseParsingError(
        `AI response failed ATS schema validation: ${validation.error.message}`,
        rawText
      );
    }

    return validation.data;
  }

  private normalizeError(err: unknown): Error {
    if (err instanceof GeminiError) {
      return err;
    }

    if (err instanceof Error) {
      const msg = err.message.toLowerCase();

      // Check for rate limit / quota
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
        return new GeminiRateLimitError(err.message);
      }

      // Check for timeout
      if (msg.includes('timeout') || msg.includes('timed out')) {
        return new GeminiTimeoutError(this.timeoutMs);
      }

      // Check for auth / key errors
      if (msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('unauthorized')) {
        return new GeminiApiError(err.message, 401, false);
      }

      // Check for 5xx transient server errors
      if (msg.includes('500') || msg.includes('503') || msg.includes('overloaded') || msg.includes('unavailable')) {
        return new GeminiApiError(err.message, 503, true);
      }

      return new GeminiApiError(err.message, undefined, false);
    }

    return new GeminiError(String(err));
  }
}

/**
 * Functional wrapper for analyzeWithGemini using environment defaults.
 */
export async function analyzeWithGemini(
  input: GeminiAnalyzeInput,
  options?: GeminiServiceOptions
): Promise<AtsAnalysisResult> {
  const service = new GeminiService(options);
  return service.analyzeWithGemini(input);
}

export async function matchSemantically(
  cv: StructuredCV,
  requirements: JobRequirements,
  options?: GeminiServiceOptions
): Promise<SemanticMatchingResult> {
  const provider = process.env.AI_PROVIDER ?? env.AI_PROVIDER;
  if (provider === 'groq') {
    const apiKey = options?.apiKey ?? process.env.GROQ_API_KEY ?? env.GROQ_API_KEY;
    if (!apiKey?.trim()) throw new GeminiConfigError('AI provider API key is not configured');
    const service = new GeminiService(
      { ...options, apiKey, model: options?.model ?? process.env.GROQ_MODEL ?? env.GROQ_MODEL },
      createGroqClient(apiKey)
    );
    return service.matchSemantically(cv, requirements);
  }

  const service = new GeminiService(options);
  return service.matchSemantically(cv, requirements);
}
