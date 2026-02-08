import { test, expect, beforeEach, afterEach } from 'bun:test';
import { log, logger } from './logger';

let captured: string[] = [];
const originalLog = console.log;

beforeEach(() => {
  captured = [];
  console.log = (...args: any[]) => { captured.push(args.join(' ')); };
});

afterEach(() => {
  console.log = originalLog;
});

test('log outputs valid JSON', () => {
  log('info', 'test message');
  expect(captured).toHaveLength(1);
  const parsed = JSON.parse(captured[0]);
  expect(parsed.msg).toBe('test message');
  expect(typeof parsed.ts).toBe('number');
});

test('log merges context into output', () => {
  log('warn', 'with context', { requestId: 'abc', extra: 42 });
  const parsed = JSON.parse(captured[0]);
  expect(parsed.requestId).toBe('abc');
  expect(parsed.extra).toBe(42);
  expect(parsed.msg).toBe('with context');
});

test('logger shortcuts set correct level', () => {
  logger.debug('d');
  logger.info('i');
  logger.warn('w');
  logger.error('e');
  expect(captured).toHaveLength(4);
  expect(JSON.parse(captured[0]).level).toBe('debug');
  expect(JSON.parse(captured[1]).level).toBe('info');
  expect(JSON.parse(captured[2]).level).toBe('warn');
  expect(JSON.parse(captured[3]).level).toBe('error');
});
