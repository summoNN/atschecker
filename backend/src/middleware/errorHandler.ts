import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(
    {
      err: error,
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
    },
    'Request failed with error'
  );

  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.flatten(),
    });
  }

  const statusCode = 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500;

  const responseMessage = statusCode >= 500
    ? 'Internal Server Error'
    : error.message;

  return reply.status(statusCode).send({
    statusCode,
    error: 'name' in error ? error.name : 'Error',
    message: responseMessage,
  });
}
