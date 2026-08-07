/**
 * Unit + smoke for Bun Inspector TestReporter client helpers.
 * @see https://bun.com/docs/test/reporters
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  accumulateInspectMessage,
  buildEnableRequests,
  buildInspectSummary,
  createInspectAccumulator,
  debugBunShUrl,
  parseInspectorWsUrl,
  testDisplayName,
  testStatus,
  tryParseJsonRpc,
} from '../lib/harness/inspect-test-reporter.ts';

describe('inspect-test-reporter helpers', () => {
  test('parseInspectorWsUrl extracts ws URL from bun stderr banner', () => {
    const text =
      '--------------------- Bun Inspector ---------------------\n' +
      'Listening:\n  ws://127.0.0.1:6499/abcd-efgh\n' +
      '--------------------- Bun Inspector ---------------------\n';
    expect(parseInspectorWsUrl(text)).toBe('ws://127.0.0.1:6499/abcd-efgh');
  });

  test('parseInspectorWsUrl strips trailing punctuation', () => {
    expect(parseInspectorWsUrl('see ws://127.0.0.1:1/x).')).toBe('ws://127.0.0.1:1/x');
  });

  test('debugBunShUrl prefixes inspector URL', () => {
    expect(debugBunShUrl('ws://127.0.0.1:6499/abc')).toBe(
      'https://debug.bun.sh/#ws://127.0.0.1:6499/abc'
    );
  });

  test('testDisplayName prefers name → title → testId', () => {
    expect(testDisplayName({ name: 'a' })).toBe('a');
    expect(testDisplayName({ title: 'b' })).toBe('b');
    expect(testDisplayName({ testId: 3 })).toBe('3');
    expect(testDisplayName({})).toBe('(unnamed)');
  });

  test('buildEnableRequests covers TestReporter + LifecycleReporter', () => {
    const reqs = buildEnableRequests(1);
    const methods = reqs.map(r => r.method);
    expect(methods).toContain('TestReporter.enable');
    expect(methods).toContain('LifecycleReporter.enable');
    expect(methods).toContain('Console.enable');
    expect(methods).toContain('Inspector.enable');
  });

  test('accumulateInspectMessage tallies found/start/end/status', () => {
    const acc = createInspectAccumulator();
    accumulateInspectMessage(acc, {
      method: 'TestReporter.found',
      params: { id: 1, name: 't1', type: 'test' },
    });
    accumulateInspectMessage(acc, { method: 'TestReporter.start', params: { id: 1 } });
    accumulateInspectMessage(acc, {
      method: 'TestReporter.end',
      params: { id: 1, status: 'pass', duration: 1 },
    });
    accumulateInspectMessage(acc, {
      method: 'TestReporter.end',
      params: { id: 2, status: 'fail' },
    });
    accumulateInspectMessage(acc, { method: 'LifecycleReporter.error', params: {} });
    accumulateInspectMessage(acc, { method: 'Console.messageAdded', params: {} });
    expect(acc.found).toBe(1);
    expect(acc.started).toBe(1);
    expect(acc.ended).toBe(2);
    expect(acc.passed).toBe(1);
    expect(acc.failed).toBe(1);
    expect(acc.errors).toBe(1);
    expect(acc.consoleMessages).toBe(1);
    expect(testStatus({ status: 'pass' })).toBe('pass');
  });

  test('buildInspectSummary shape', () => {
    const acc = createInspectAccumulator();
    acc.found = 2;
    const s = buildInspectSummary({
      acc,
      inspectorUrl: 'ws://127.0.0.1:9/x',
      bunVersion: '1.3.14',
      startedAt: 't0',
      finishedAt: 't1',
      exitCode: 0,
      eventsPath: 'tmp/inspect/inspect-events.jsonl',
      summaryPath: 'tmp/inspect/inspect-summary.json',
    });
    expect(s.kind).toBe('inspect-test-summary');
    expect(s.schemaVersion).toBe(1);
    expect(s.found).toBe(2);
    expect(s.debugBunUrl).toContain('debug.bun.sh');
  });

  test('tryParseJsonRpc accepts objects only', () => {
    expect(tryParseJsonRpc('{"method":"TestReporter.found"}')?.method).toBe('TestReporter.found');
    expect(tryParseJsonRpc('not-json')).toBeUndefined();
  });
});

describe('inspect-tests CLI smoke', () => {
  const outDir = `tmp/inspect-smoke-${process.pid}`;

  afterAll(async () => {
    await Bun.$`rm -rf ${outDir}`.quiet().nothrow();
  });

  test(
    'spawns bun test --inspect-wait and writes summary JSON',
    async () => {
      const fixture = `${outDir}/fixture.test.ts`;
      await Bun.$`mkdir -p ${outDir}`.quiet();
      await Bun.write(
        fixture,
        `import { test, expect } from "bun:test";\ntest("inspect smoke", () => { expect(1).toBe(1); });\n`
      );

      // Pick an ephemeral port to avoid collisions with parallel agents
      const port = 17000 + (process.pid % 1000);
      const proc = Bun.spawn(
        bunSpawnArgs([
          'scripts/inspect-tests.ts',
          '--host',
          '127.0.0.1',
          '--inspect-port',
          String(port),
          '--out',
          outDir,
          '--quiet',
          '--json',
          '--timeout',
          '45000',
          '--',
          fixture,
        ]),
        {
          stdout: 'pipe',
          stderr: 'pipe',
          env: { ...Bun.env, BUN_OPTIONS: '' },
        }
      );

      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      if (code !== 0) {
        console.error('smoke stderr', stderr);
        console.error('smoke stdout', stdout);
      }
      expect(code).toBe(0);

      const summaryFile = Bun.file(`${outDir}/inspect-summary.json`);
      expect(await summaryFile.exists()).toBe(true);
      const summary = (await summaryFile.json()) as {
        kind: string;
        found: number;
        ended: number;
        passed: number;
        exitCode: number | null;
      };
      expect(summary.kind).toBe('inspect-test-summary');
      expect(summary.exitCode).toBe(0);
      // Retroactive / live reporting should see at least the one test
      expect(summary.found).toBeGreaterThanOrEqual(1);
      expect(summary.ended).toBeGreaterThanOrEqual(1);
      expect(summary.passed).toBeGreaterThanOrEqual(1);

      const eventsFile = Bun.file(`${outDir}/inspect-events.jsonl`);
      expect(await eventsFile.exists()).toBe(true);
      const eventsText = await eventsFile.text();
      expect(eventsText.includes('TestReporter.')).toBe(true);
    },
    { timeout: 60_000 }
  );
});
