import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './utils/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { analyzeRoutes } from './routes/analyze.js';
import { createAnalyzeRoutes } from './routes/analyze.js';
import type { AnalyzeController } from './controllers/analyze.controller.js';

export interface AppDependencies {
  analyzeController?: AnalyzeController;
}

export async function buildApp(
  opts: FastifyServerOptions = {},
  dependencies: AppDependencies = {}
): Promise<FastifyInstance> {
  const isTest = env.NODE_ENV === 'test';
  const isDev = env.NODE_ENV === 'development';

  const defaultLogger: FastifyServerOptions['logger'] = isTest
    ? false
    : isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : true;

  const app = fastify({
    logger: opts.logger ?? defaultLogger,
    ...opts,
  });

  // CORS configuration
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Multipart/form-data configuration (10MB limit, 1 file)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes);
  await app.register(dependencies.analyzeController ? createAnalyzeRoutes(dependencies.analyzeController) : analyzeRoutes);

  return app;
}
