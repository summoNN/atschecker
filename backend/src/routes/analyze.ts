import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AnalyzeController, analyzeController } from '../controllers/analyze.controller.js';

export function createAnalyzeRoutes(controller: AnalyzeController = analyzeController): FastifyPluginAsync {
  return async (fastify: FastifyInstance) => {
    fastify.post('/api/analyze', controller.handleAnalyze);
  };
}

export const analyzeRoutes: FastifyPluginAsync = createAnalyzeRoutes();
