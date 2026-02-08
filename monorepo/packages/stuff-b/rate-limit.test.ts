import { test, expect, beforeEach } from 'bun:test';
import { checkRateLimit, resetRateLimits, getRateLimitMetrics } from './rate-limit';
import { LIMITS } from 'stuff-a/config';

beforeEach(() => {
  resetRateLimits();
});

test('allows requests under limit', () => {
  const result = checkRateLimit('10.0.0.1');
  expect(result.allowed).toBe(true);
  expect(result.remaining).toBe(LIMITS.RATE_LIMIT_MAX_REQUESTS - 1);
});

test('blocks requests over limit', () => {
  for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
    checkRateLimit('10.0.0.2');
  }
  const result = checkRateLimit('10.0.0.2');
  expect(result.allowed).toBe(false);
  expect(result.remaining).toBe(0);
});

test('isolates rate limits per IP', () => {
  for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
    checkRateLimit('10.0.0.3');
  }
  const blocked = checkRateLimit('10.0.0.3');
  expect(blocked.allowed).toBe(false);

  const other = checkRateLimit('10.0.0.4');
  expect(other.allowed).toBe(true);
});

test('reset clears all limits', () => {
  for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
    checkRateLimit('10.0.0.5');
  }
  resetRateLimits();
  const result = checkRateLimit('10.0.0.5');
  expect(result.allowed).toBe(true);
});

test('remaining decrements correctly', () => {
  checkRateLimit('10.0.0.6');
  checkRateLimit('10.0.0.6');
  const result = checkRateLimit('10.0.0.6');
  expect(result.remaining).toBe(LIMITS.RATE_LIMIT_MAX_REQUESTS - 3);
});

test('metrics increment on allow', () => {
  const before = getRateLimitMetrics();
  checkRateLimit('10.0.0.7');
  const after = getRateLimitMetrics();
  expect(after.totalAllowed).toBe(before.totalAllowed + 1);
});

test('metrics increment on block', () => {
  for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
    checkRateLimit('10.0.0.8');
  }
  const before = getRateLimitMetrics();
  checkRateLimit('10.0.0.8');
  const after = getRateLimitMetrics();
  expect(after.totalBlocked).toBe(before.totalBlocked + 1);
});

test('withRateLimit returns Response with Retry-After header', async () => {
  const { withRateLimit } = await import('./middleware');
  // Exhaust rate limit for a specific IP
  for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
    checkRateLimit('10.0.0.9');
  }
  const req = new Request('http://localhost/', { headers: { 'x-forwarded-for': '10.0.0.9' } });
  const res = withRateLimit(req);
  expect(res).not.toBeNull();
  expect(res!.status).toBe(429);
  expect(res!.headers.get('Retry-After')).toBe('60');
});
