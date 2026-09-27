import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'ats-backend',
    };
  });
};
