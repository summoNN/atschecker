import { describe, expect, it, vi } from 'vitest';
import { createGroqClient, GROQ_API_ENDPOINT } from '../src/services/groq/groq.service.js';

describe('Groq client adapter', () => {
  it('sends the provider-neutral request as a Groq JSON chat completion', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"matches":[]}' } }],
      }),
    });

    const client = createGroqClient('test-groq-key', fetcher as typeof fetch);
    const result = await client.models.generateContent({
      model: 'openai/gpt-oss-20b',
      contents: 'Evaluate this CV.',
      config: {
        systemInstruction: 'Return JSON only.',
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    expect(result.text).toBe('{"matches":[]}');
    expect(fetcher).toHaveBeenCalledWith(
      GROQ_API_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer test-groq-key',
          'content-type': 'application/json',
        },
      })
    );

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'openai/gpt-oss-20b',
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    expect(body.messages).toEqual([
      { role: 'system', content: 'Return JSON only.' },
      { role: 'user', content: 'Evaluate this CV.' },
    ]);
  });

  it('sends strict JSON schema output settings when supplied', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{}' } }] }),
    });

    const client = createGroqClient('test-groq-key', fetcher as typeof fetch);
    await client.models.generateContent({
      model: 'openai/gpt-oss-20b',
      contents: 'Extract requirements.',
      config: {
        systemInstruction: 'Return only the requested JSON.',
        responseSchemaName: 'job_requirements',
        responseSchema: {
          type: 'object',
          properties: { jobTitle: { type: 'string' } },
          required: ['jobTitle'],
          additionalProperties: false,
        },
        reasoningEffort: 'low',
      },
    });

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.reasoning_effort).toBe('low');
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'job_requirements',
        strict: true,
        schema: expect.objectContaining({ type: 'object' }),
      },
    });
  });

  it('surfaces the Groq error response', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":"unauthorized"}',
    });

    const client = createGroqClient('bad-key', fetcher as typeof fetch);

    await expect(client.models.generateContent({
      model: 'openai/gpt-oss-20b',
      contents: 'Evaluate this CV.',
    })).rejects.toThrow('AI provider request failed (401)');
  });
});
