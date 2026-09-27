import { GoogleGenAI } from '@google/genai';
import { env } from '../../utils/env.js';
import {
  JobRequirements,
  jobRequirementsSchema,
  NormalizeJdInput,
  JdServiceOptions,
} from './types.js';
import {
  EmptyJobDescriptionError,
  JdNormalizationError,
} from './jd.errors.js';
import {
  GeminiClientLike,
  GeminiConfigError,
  GeminiError,
  GeminiTimeoutError,
} from '../gemini/index.js';
import { createGroqClient } from '../groq/groq.service.js';

const SYSTEM_INSTRUCTION = `You are an elite HR Technology & ATS Knowledge Engineer specializing in Job Description Parsing.

Your objective is to normalize and deconstruct raw Job Descriptions into concrete, verifiable JobRequirements strictly matching the requested JSON structure.

Parsing Rules & Guidelines:
1. Extract Concrete Requirements:
   - Deconstruct complex sentences into distinct atomic requirements.
   - Example: "3+ years of Java and Spring Boot experience required" must yield:
     • Java -> importance: "REQUIRED"
     • Spring Boot -> importance: "REQUIRED"
     • 3+ years experience -> importance: "REQUIRED"
2. Strict Importance Classification:
   - "REQUIRED": Expressly stated as required, mandatory, essential, "must have", "minimum", or fundamental to the role.
   - "PREFERRED": Mentioned as nice-to-have, bonus, plus, preferred, advantageous, or "familiarity with".
   - "INFORMATIONAL": Contextual, organizational, or domain descriptions that do not constitute a direct hiring gate.
3. Keyword Filtering:
   - Do NOT treat every word as a keyword.
   - Strictly IGNORE standalone generic words such as: "company", "team", "work", "development", "experience", "business", "environment", "solutions", "opportunity", unless contextualized into a specific skill or qualification (e.g. "agile development process", "team leadership").
4. Never Hallucinate or Invent Requirements:
   - Extract ONLY what is stated or directly evidenced in the text.
   - If no certifications, languages, or degrees are mentioned, return an empty array [] for those categories.
5. Evidence Tracking:
   - Every requirement item must include the exact or near-verbatim "evidence" quote from the job description text supporting the extraction.

JSON Schema Output:
{
  "jobTitle": "Extracted or inferred target job title",
  "requiredSkills": [{ "name": "string", "importance": "REQUIRED", "evidence": "string" }],
  "preferredSkills": [{ "name": "string", "importance": "PREFERRED", "evidence": "string" }],
  "requiredTechnologies": [{ "name": "string", "importance": "REQUIRED", "evidence": "string" }],
  "preferredTechnologies": [{ "name": "string", "importance": "PREFERRED", "evidence": "string" }],
  "requiredExperience": [{ "name": "string", "importance": "REQUIRED", "evidence": "string" }],
  "educationRequirements": [{ "name": "string", "importance": "REQUIRED" | "PREFERRED", "evidence": "string" }],
  "certifications": [{ "name": "string", "importance": "REQUIRED" | "PREFERRED", "evidence": "string" }],
  "languages": [{ "name": "string", "importance": "REQUIRED" | "PREFERRED", "evidence": "string" }],
  "responsibilities": [{ "name": "string", "importance": "REQUIRED" | "INFORMATIONAL", "evidence": "string" }],
  "softSkills": [{ "name": "string", "importance": "REQUIRED" | "PREFERRED", "evidence": "string" }],
  "importantKeywords": [{ "name": "string", "importance": "REQUIRED" | "PREFERRED" | "INFORMATIONAL", "evidence": "string" }]
}

Output strictly valid JSON with no markdown wrapping and no exterior commentary.`;

const REQUIREMENT_ITEM_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    importance: { type: 'string', enum: ['REQUIRED', 'PREFERRED', 'INFORMATIONAL'] },
    evidence: { type: 'string' },
  },
  required: ['name', 'importance', 'evidence'],
  additionalProperties: false,
};

const JOB_REQUIREMENTS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    jobTitle: { type: 'string' },
    requiredSkills: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    preferredSkills: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    requiredTechnologies: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    preferredTechnologies: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    requiredExperience: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    educationRequirements: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    certifications: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    languages: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    responsibilities: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    softSkills: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
    importantKeywords: { type: 'array', items: REQUIREMENT_ITEM_RESPONSE_SCHEMA },
  },
  required: [
    'jobTitle',
    'requiredSkills',
    'preferredSkills',
    'requiredTechnologies',
    'preferredTechnologies',
    'requiredExperience',
    'educationRequirements',
    'certifications',
    'languages',
    'responsibilities',
    'softSkills',
    'importantKeywords',
  ],
  additionalProperties: false,
};

export class JobDescriptionService {
  private readonly client: GeminiClientLike | null;
  private readonly provider: 'gemini' | 'groq' | 'none';
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: JdServiceOptions = {}, customClient?: GeminiClientLike) {
    const provider = (process.env.AI_PROVIDER ?? env.AI_PROVIDER) as 'gemini' | 'groq' | 'none';
    this.provider = provider;
    const apiKey = options.apiKey ?? (provider === 'groq'
      ? process.env.GROQ_API_KEY ?? env.GROQ_API_KEY
      : process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY);

    this.client = customClient ?? (apiKey?.trim()
      ? provider === 'groq'
        ? createGroqClient(apiKey)
        : (new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike)
      : null);
    this.model = options.model ?? (provider === 'groq'
      ? process.env.GROQ_MODEL ?? env.GROQ_MODEL
      : process.env.GEMINI_MODEL ?? env.GEMINI_MODEL ?? 'gemini-3.8-flash');
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * Normalizes raw job description text into structured JobRequirements.
   * Enforces Zod schema validation and filters out generic noise.
   */
  async normalizeJobDescription(input: NormalizeJdInput): Promise<JobRequirements> {
    const startTime = Date.now();
    const rawText = input.jobDescription?.trim();

    if (!rawText || rawText.length === 0) {
      throw new EmptyJobDescriptionError();
    }

    if (!this.client) {
      throw new GeminiConfigError('AI provider API key is not configured');
    }

    // Sanitized logging (never log raw JD text)
    console.info(
      JSON.stringify({
        event: 'jd_normalize_start',
        model: this.model,
        jdLength: rawText.length,
        fallbackJobTitle: input.fallbackJobTitle ?? 'None',
      })
    );

    const prompt = this.buildPrompt(rawText, input.fallbackJobTitle);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const rawJson = await this.executeWithTimeout(prompt);
        const result = this.parseAndValidateResponse(rawJson, input.fallbackJobTitle);

        const durationMs = Date.now() - startTime;
        console.info(
          JSON.stringify({
            event: 'jd_normalize_success',
            jobTitle: result.jobTitle,
            requiredSkillsCount: result.requiredSkills.length,
            requiredTechCount: result.requiredTechnologies.length,
            requiredExpCount: result.requiredExperience.length,
            keywordsCount: result.importantKeywords.length,
            durationMs,
          })
        );

        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const isRetryable =
          lastError instanceof GeminiError
            ? lastError.isRetryable
            : lastError.message.includes('503') || lastError.message.includes('429');

        const willRetry = isRetryable && attempt < this.maxRetries;

        console.warn(
          JSON.stringify({
            event: 'jd_normalize_attempt_failed',
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

        const backoff = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    const durationMs = Date.now() - startTime;
    console.error(
      JSON.stringify({
        event: 'jd_normalize_failed',
        durationMs,
        errorName: lastError?.name ?? 'UnknownError',
        errorMessage: lastError?.message ?? 'Unknown error',
      })
    );

    throw lastError ?? new JdNormalizationError('Failed to normalize job description');
  }

  private buildPrompt(jobDescription: string, fallbackJobTitle?: string): string {
    return `TARGET JOB TITLE HINT: ${fallbackJobTitle ?? 'Not Specified (infer from description)'}

--- RAW JOB DESCRIPTION ---
${jobDescription}

Deconstruct and normalize the job description above into the required JobRequirements JSON schema.`;
  }

  private async executeWithTimeout(prompt: string): Promise<string> {
    const client = this.client;
    if (!client) {
      throw new GeminiConfigError('AI provider API key is not configured');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new GeminiTimeoutError(this.timeoutMs));
      }, this.timeoutMs);

      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    const apiPromise = (async () => {
      const config = {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.1,
        ...(this.provider === 'groq' && this.model.startsWith('openai/gpt-oss')
          ? {
              responseSchema: JOB_REQUIREMENTS_RESPONSE_SCHEMA,
              responseSchemaName: 'job_requirements',
              reasoningEffort: 'low' as const,
            }
          : {}),
      };

      const response = await client.models.generateContent({
        model: this.model,
        contents: prompt,
        config,
      });

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new JdNormalizationError('AI provider returned an empty response');
      }

      return text;
    })();

    return Promise.race([apiPromise, timeoutPromise]);
  }

  private parseAndValidateResponse(rawText: string, fallbackJobTitle?: string): JobRequirements {
    let parsed: unknown;
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch {
      throw new JdNormalizationError('Failed to parse AI provider response as JSON', rawText);
    }

    // Default missing arrays to empty
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (!record.jobTitle && fallbackJobTitle) {
        record.jobTitle = fallbackJobTitle;
      }
    }

    const validation = jobRequirementsSchema.safeParse(parsed);
    if (!validation.success) {
      throw new JdNormalizationError(
        `Normalized JobRequirements failed schema validation: ${validation.error.message}`,
        rawText
      );
    }

    return validation.data;
  }
}

export const jobDescriptionService = new JobDescriptionService();

export async function normalizeJobDescription(
  input: NormalizeJdInput,
  options?: JdServiceOptions
): Promise<JobRequirements> {
  const service = new JobDescriptionService(options);
  return service.normalizeJobDescription(input);
}
