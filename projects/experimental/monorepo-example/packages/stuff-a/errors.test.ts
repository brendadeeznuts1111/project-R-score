import { test, expect } from 'bun:test';
import { Errors, errorResponse, type ApiError } from './errors';

test('notFound returns correct shape', () => {
  const err = Errors.notFound();
  expect(err).toEqual({ error: 'Not found', code: 'NOT_FOUND', status: 404 });
});

test('badRequest returns correct shape', () => {
  const err = Errors.badRequest();
  expect(err).toEqual({ error: 'Bad request', code: 'BAD_REQUEST', status: 400 });
});

test('unauthorized returns correct shape', () => {
  const err = Errors.unauthorized();
  expect(err).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 });
});

test('rateLimited returns correct shape', () => {
  const err = Errors.rateLimited();
  expect(err).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED', status: 429 });
});

test('factories accept custom messages', () => {
  const err = Errors.notFound('User 123 not found');
  expect(err.error).toBe('User 123 not found');
  expect(err.code).toBe('NOT_FOUND');
});

test('errorResponse returns Response with correct status', async () => {
  const err = Errors.notFound();
  const res = errorResponse(err);
  expect(res.status).toBe(404);
  const body = await res.json() as ApiError;
  expect(body.code).toBe('NOT_FOUND');
  expect(body.error).toBe('Not found');
});
