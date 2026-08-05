import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  executeBunChannelCronCommand,
  parseBunChannelCronArgs,
  previewBunChannelSchedule,
  type BunChannelCronDependencies,
} from '../tools/bun-channel-doctor-cron.ts';
import {
  resolveBunChannelArtifactPath,
  runBunChannelDoctorWorker,
  writeBunChannelStatus,
  type BunChannelDoctorWorkerDependencies,
} from '../tools/bun-channel-doctor-worker.ts';
import type {
  BunChannelConfig,
  BunChannelDoctorReport,
} from '../lib/verification/bun-channel-doctor.ts';

const CONFIG: BunChannelConfig = {
  schema_version: 1,
  policy: { runtime_channel: 'stable', mutation: 'never', promotion: 'reviewed' },
  types: {
    wrapper_package: '@types/bun',
    wrapper_channel: 'latest',
    definitions_package: 'bun-types',
    definitions_channel: 'canary',
  },
  monitor: {
    os_schedule: '17 6 * * *',
    os_timezone: 'system',
    in_process_timezone: 'UTC',
    title: 'bun-channel-doctor',
    artifact: 'public/registry/bun-channel-status.json',
    fetch_timeout_ms: 10_000,
  },
  sources: {
    stable_api: 'https://example.test/stable',
    stable_api_fallback: 'https://example.test/stable-fallback',
    canary_api: 'https://example.test/canary',
    tip_api: 'https://example.test/tip',
    rss: 'https://example.test/rss',
    atom: 'https://example.test/atom',
    npm_registry: 'https://example.test/npm',
  },
};

const REPORT = {
  schemaVersion: 1,
  generatedAt: '2026-08-05T00:00:00.000Z',
  policy: { ...CONFIG.policy, ...CONFIG.types },
  local: {
    installedVersion: '1.3.14',
    installedRevision: 'test',
    wrapperReferenceUsesSelectedDefinitions: true,
  },
  observations: [],
  capabilities: {
    cron: {
      evidence: 'resolved-bun-types',
      selectedDefinitionsVersion: '1.4.0-canary.test',
      localContract: 'in-process-utc/no-tz-options',
      inProcessTimezone: 'UTC',
      timezoneOptions: 'absent',
      osTimezone: 'system',
      tipCapability: 'not-probed-by-commit-endpoint',
      authority: 'informational',
    },
  },
  drift: [],
  summary: {
    status: 'healthy',
    exitCode: 0,
    intentional: 0,
    informational: 0,
    actionable: 0,
    sourceErrors: 0,
    reason: 'healthy',
  },
} satisfies BunChannelDoctorReport;

describe('bun channel doctor OS cron', () => {
  test('parses commands and overrides without invoking the scheduler', () => {
    expect(
      parseBunChannelCronArgs([
        'preview',
        '--root=/tmp/repo',
        '--schedule=@daily',
        '--title=doctor-test',
        '--count=2',
      ])
    ).toEqual({
      command: 'preview',
      root: '/tmp/repo',
      schedule: '@daily',
      title: 'doctor-test',
      count: 2,
    });
    expect(parseBunChannelCronArgs(['unknown'])).toBeNull();
  });

  test('previews deterministically in pinned Bun 1.3 UTC semantics', () => {
    const times = previewBunChannelSchedule('17 6 * * *', 2, Date.parse('2026-08-05T00:00:00Z'));
    expect(times.map(time => time.toISOString())).toEqual([
      '2026-08-05T06:17:00.000Z',
      '2026-08-06T06:17:00.000Z',
    ]);
  });

  test('register and remove use injected OS scheduler operations', async () => {
    const calls: string[] = [];
    const dependencies: BunChannelCronDependencies = {
      loadConfig: async () => CONFIG,
      register: async (path, schedule, title) => {
        calls.push(`register:${path}:${schedule}:${title}`);
      },
      remove: async title => {
        calls.push(`remove:${title}`);
      },
    };

    const registerResult = await executeBunChannelCronCommand(
      { command: 'register', root: '/tmp/repo', count: 1 },
      dependencies
    );
    const removeResult = await executeBunChannelCronCommand(
      { command: 'remove', root: '/tmp/repo', count: 1 },
      dependencies
    );

    expect(registerResult.schedule).toBe(CONFIG.monitor.os_schedule);
    expect(registerResult.osTimezone).toBe('system');
    expect(calls[0]).toContain(`:${CONFIG.monitor.os_schedule}:${CONFIG.monitor.title}`);
    expect(removeResult.title).toBe(CONFIG.monitor.title);
    expect(calls[1]).toBe(`remove:${CONFIG.monitor.title}`);
  });

  test('worker writes through injected dependencies and performs no direct network calls', async () => {
    const calls: string[] = [];
    const dependencies: BunChannelDoctorWorkerDependencies = {
      loadConfig: async root => {
        calls.push(`load:${root}`);
        return CONFIG;
      },
      runDoctor: async options => {
        calls.push(`doctor:${options?.root}`);
        return REPORT;
      },
      persistReport: async (report, path) => {
        calls.push(`persist:${report.summary.status}:${path}`);
      },
    };

    const report = await runBunChannelDoctorWorker({ root: '/tmp/repo', dependencies });
    expect(report).toBe(REPORT);
    expect(calls).toEqual([
      'load:/tmp/repo',
      'doctor:/tmp/repo',
      'persist:healthy:/tmp/repo/public/registry/bun-channel-status.json',
    ]);
  });

  test('artifact path cannot escape the repository root', () => {
    expect(resolveBunChannelArtifactPath('/tmp/repo', 'public/status.json')).toBe(
      '/tmp/repo/public/status.json'
    );
    expect(() => resolveBunChannelArtifactPath('/tmp/repo', '../status.json')).toThrow();
    expect(() => resolveBunChannelArtifactPath('/tmp/repo', '/tmp/status.json')).toThrow();
  });

  test('persists a complete report and removes its sibling temp file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bun-channel-cron-'));
    const path = join(root, 'registry', 'status.json');
    try {
      await writeBunChannelStatus(REPORT, path);
      expect(await Bun.file(path).json()).toEqual(REPORT);
      const entries = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: root, onlyFiles: true }));
      expect(entries).toEqual(['registry/status.json']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
