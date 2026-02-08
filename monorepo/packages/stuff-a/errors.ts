import type { User } from './index';

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export const Errors = {
  notFound: (msg = 'Not found'): ApiError => ({ error: msg, code: 'NOT_FOUND', status: 404 }),
  badRequest: (msg = 'Bad request'): ApiError => ({ error: msg, code: 'BAD_REQUEST', status: 400 }),
  unauthorized: (msg = 'Unauthorized'): ApiError => ({ error: msg, code: 'UNAUTHORIZED', status: 401 }),
  rateLimited: (msg = 'Too many requests'): ApiError => ({ error: msg, code: 'RATE_LIMITED', status: 429 }),
  internal: (msg = 'Internal server error'): ApiError => ({ error: msg, code: 'INTERNAL_ERROR', status: 500 }),
} as const;

export function errorResponse(err: ApiError): Response {
  return Response.json(err, { status: err.status });
}
