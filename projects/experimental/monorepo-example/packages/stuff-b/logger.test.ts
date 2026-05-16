import { test, expect, beforeEach, afterEach } from 'bun:test';
import { log, logger, enableFileLog, disableFileLog, getLogFilePath, getLogFileInfo } from './logger';

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

// ── File sink tests (BunFile.writer / FileSink) ──

const sinkPath = '/tmp/stuff-b-logger-sink-test.jsonl';

test('enableFileLog writes log lines to file', async () => {
  enableFileLog(sinkPath);
  expect(getLogFilePath()).toBe(sinkPath);

  log('info', 'file-sink-test', { tag: 'sink' });
  disableFileLog(); // flush + close

  expect(getLogFilePath()).toBeNull();

  const content = await Bun.file(sinkPath).text();
  const lines = content.trim().split('\n');
  expect(lines.length).toBeGreaterThanOrEqual(1);
  const parsed = JSON.parse(lines[0]);
  expect(parsed.msg).toBe('file-sink-test');
  expect(parsed.tag).toBe('sink');
  expect(parsed.level).toBe('info');

  // cleanup
  await Bun.$`rm -f ${sinkPath}`.quiet();
});

test('getLogFileInfo returns size and type for active log', async () => {
  expect(getLogFileInfo()).toBeNull();

  enableFileLog(sinkPath);
  log('info', 'size-check');
  disableFileLog(); // flush to disk

  // Read back via BunFile to verify size/type
  const f = Bun.file(sinkPath);
  expect(f.size).toBeGreaterThan(0);
  expect(typeof f.type).toBe('string');

  await Bun.$`rm -f ${sinkPath}`.quiet();
});

test('disableFileLog is safe to call when no sink active', () => {
  expect(getLogFilePath()).toBeNull();
  disableFileLog(); // should not throw
  expect(getLogFilePath()).toBeNull();
});

test('multiple log lines accumulate in file', async () => {
  enableFileLog(sinkPath);
  log('debug', 'line-1');
  log('warn', 'line-2');
  log('error', 'line-3');
  disableFileLog();

  const lines = (await Bun.file(sinkPath).text()).trim().split('\n');
  expect(lines).toHaveLength(3);
  expect(JSON.parse(lines[0]).msg).toBe('line-1');
  expect(JSON.parse(lines[1]).msg).toBe('line-2');
  expect(JSON.parse(lines[2]).msg).toBe('line-3');

  await Bun.$`rm -f ${sinkPath}`.quiet();
});
