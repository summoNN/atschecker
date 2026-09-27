import type { GeminiClientLike } from '../gemini/gemini.service.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/** Adapts Groq's OpenAI-compatible API to the existing provider-neutral client shape. */
export function createGroqClient(apiKey: string, fetcher: typeof fetch = fetch): GeminiClientLike {
  return {
    models: {
      generateContent: async ({ model, contents, config }) => {
        const userContent = typeof contents === 'string'
          ? contents
          : contents.map((message) => message.parts.map((part) => part.text).join('\n')).join('\n');

        const response = await fetcher(GROQ_API_URL, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: config?.temperature ?? 0,
            messages: [
              ...(config?.systemInstruction
                ? [{ role: 'system', content: config.systemInstruction }]
                : []),
              { role: 'user', content: userContent },
            ],
            ...(config?.reasoningEffort
              ? { reasoning_effort: config.reasoningEffort }
              : {}),
            response_format: config?.responseSchema
              ? {
                  type: 'json_schema',
                  json_schema: {
                    name: config.responseSchemaName ?? 'response',
                    strict: true,
                    schema: config.responseSchema,
                  },
                }
              : { type: 'json_object' },
          }),
        });

        const body = await response.text();
        if (!response.ok) throw new Error(`AI provider request failed (${response.status}): ${body}`);

        let parsed: GroqResponse;
        try {
          parsed = JSON.parse(body) as GroqResponse;
        } catch {
          throw new Error('AI provider returned invalid JSON');
        }

        return { text: parsed.choices?.[0]?.message?.content ?? null };
      },
    },
  };
}

export const GROQ_API_ENDPOINT = GROQ_API_URL;
