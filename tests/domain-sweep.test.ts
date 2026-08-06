// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  captureProcess,
  lastOutputLine,
  summarizeProcessOutput,
} from '../lib/harness/process-capture.ts';
import { fireSweep, type SweepCronState } from '../tools/domain-sweep-cron.ts';
import {
  httpTargetEvidence,
  inventoryPassed,
  parseHttpOrigin,
  resolveDomainSweepConfig,
  resolveHttpTarget,
  runProbe,
  summarizeFailures,
} from '../tools/domain-sweep.ts';

describe('domain sweep resilience', () => {
  test('converts a thrown probe into a failure detail and continues', async () => {
    const failures: string[] = [];
    let laterProbeRan = false;

    await runProbe(
      async () => {
        throw new Error('getaddrinfo ENOTFOUND example.test');
      },
      detail => failures.push(detail)
    );
    await runProbe(
      async () => {
        laterProbeRan = true;
      },
      detail => failures.push(detail)
    );

    expect(failures).toEqual(['getaddrinfo ENOTFOUND example.test']);
    expect(laterProbeRan).toBe(true);
  });

  test('--help exits successfully without starting network probes', async () => {
    const proc = Bun.spawn(['bun', 'tools/domain-sweep.ts', '--help'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Full-surface domain verification');
    expect(stdout).toContain('--no-write');
    expect(stdout).not.toContain('ENOTFOUND');
  });

  test('rejects empty or incomplete evidence inventories', () => {
    expect(inventoryPassed(0, 0)).toBe(false);
    expect(inventoryPassed(10, 1)).toBe(false);
    expect(inventoryPassed(10, 0)).toBe(true);
  });

  test('bounds failure lists while retaining omitted-count evidence', () => {
    expect(summarizeFailures(['a', 'b'])).toBe('a, b');
    expect(summarizeFailures(['a', 'b', 'c', 'd'], 2)).toBe('a, b, +2 more');
  });

  test('resolves fetch URL protocol and explicit port without server env leakage', () => {
    const config = resolveDomainSweepConfig({
      DOMAIN_SWEEP_PAGES_BASE_URL: 'http://127.0.0.1:4321',
      DOMAIN_SWEEP_SCORE_BASE_URL: 'https://score.example.test',
      DOMAIN_SWEEP_FETCH_TIMEOUT_MS: '2500',
      DOMAIN_SWEEP_GATE_TIMEOUT_MS: '9000',
      BUN_PORT: '5001',
      PORT: '5002',
      NODE_PORT: '5003',
    });
    const target = resolveHttpTarget(config.pagesOrigin, '/api/health');

    expect(target.href).toBe('http://127.0.0.1:4321/api/health');
    expect(httpTargetEvidence(config.pagesOrigin)).toEqual({
      href: 'http://127.0.0.1:4321/',
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: '4321',
      explicitPort: '4321',
    });
    expect(config.fetchTimeoutMs).toBe(2500);
    expect(config.gateTimeoutMs).toBe(9000);
  });

  test('uses PAGES_VERIFY_BASE compatibility and reports the effective default port', () => {
    const config = resolveDomainSweepConfig({
      PAGES_VERIFY_BASE: 'https://preview.example.test',
    });

    expect(config.pagesOrigin.href).toBe('https://preview.example.test/');
    expect(httpTargetEvidence(config.pagesOrigin).port).toBe('443');
    expect(httpTargetEvidence(config.pagesOrigin).explicitPort).toBeNull();
  });

  test('rejects non-http origins, URL paths, and invalid timeout values', () => {
    expect(() => parseHttpOrigin('file:///tmp/report', 'TEST_URL')).toThrow(
      'protocol must be http: or https:'
    );
    expect(() => parseHttpOrigin('https://example.test/path', 'TEST_URL')).toThrow(
      'must be an origin'
    );
    expect(() =>
      resolveDomainSweepConfig({ DOMAIN_SWEEP_FETCH_TIMEOUT_MS: '0' })
    ).toThrow('must be a positive integer');
  });
});

describe('domain sweep subprocess capture', () => {
  test('drains stdout and stderr concurrently', async () => {
    const bytes = 256 * 1024;
    const result = await captureProcess([
      process.execPath,
      '-e',
      `process.stdout.write('o'.repeat(${bytes})); process.stderr.write('e'.repeat(${bytes}));`,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout.length).toBe(bytes);
    expect(result.stderr.length).toBe(bytes);
  });

  test('marks and terminates a timed-out child', async () => {
    const result = await captureProcess([process.execPath, '-e', 'await Bun.sleep(5000)'], {
      timeoutMs: 25,
    });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  });

  test('selects the final non-empty output line', () => {
    expect(lastOutputLine('first\n\nlast\n')).toBe('last');
    expect(lastOutputLine('')).toBe('');
  });

  test('prefers the actionable failure over a generic final summary', () => {
    const summary = summarizeProcessOutput({
      exitCode: 1,
      stdout:
        '✗ artifact registry api: https://registry.example/api/npm/api/registry/health → 400\n',
      stderr: '❌ 1 pm check(s) failed\n',
      timedOut: false,
    });

    expect(summary).toBe(
      '✗ artifact registry api: https://registry.example/api/npm/api/registry/health → 400'
    );
  });

  test('strips ANSI and selects a meaningful success line', () => {
    const summary = summarizeProcessOutput({
      exitCode: 0,
      stdout: '\u001b[32m✅ PM verify passed\u001b[0m\n└────────┘\n',
      stderr: '',
      timedOut: false,
    });

    expect(summary).toBe('✅ PM verify passed');
  });
});

describe('domain sweep cron resilience', () => {
  test('contains sweep failures and resets the overlap guard', async () => {
    const state: SweepCronState = { running: false, tick: 0 };
    const errors: string[] = [];

    await fireSweep(
      state,
      async () => {
        throw new Error('spawn failed');
      },
      message => errors.push(message)
    );

    expect(state).toEqual({ running: false, tick: 1 });
    expect(errors).toEqual(['❌ sweep tick 1 crashed · spawn failed']);
  });

  test('runs every fourth tick as a full sweep', async () => {
    const state: SweepCronState = { running: false, tick: 3 };
    const modes: boolean[] = [];

    await fireSweep(state, async full => {
      modes.push(full);
    });

    expect(state.tick).toBe(4);
    expect(modes).toEqual([true]);
  });

  test('skips an overlapping invocation', async () => {
    const state: SweepCronState = { running: true, tick: 7 };
    const errors: string[] = [];
    let ran = false;

    await fireSweep(
      state,
      async () => {
        ran = true;
      },
      message => errors.push(message)
    );

    expect(ran).toBe(false);
    expect(state.tick).toBe(7);
    expect(errors).toEqual(['⏭  sweep tick skipped — previous run still active']);
  });
});
