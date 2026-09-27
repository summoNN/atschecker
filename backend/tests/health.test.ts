import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Health Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual({ status: 'ok' });
  });

  it('GET /api/health returns status ok and service identifier', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual({
      status: 'ok',
      service: 'ats-backend',
    });
  });

  it('GET /non-existent returns 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent',
    });

    expect(response.statusCode).toBe(404);
  });
});
