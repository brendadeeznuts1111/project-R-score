import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSkillHealthManifest, type SkillHealthJob, type SkillHealthManifest } from '../lib/harness/skill-health-manifest.ts';
import { loadSkillHealthManifest } from '../lib/harness/skill-health-loader.ts';
import { runSkillHealthJob, startSkillHealthScheduler } from '../lib/harness/skill-health-runner.ts';
import { loadSkillHealthState } from '../lib/harness/skill-health-state.ts';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'project-r-skill-health-'));
  temporaryRoots.push(root);
  await mkdir(join(root, '.agents/skills'), { recursive: true });
  return root;
}

function manifestWith(job: SkillHealthJob): SkillHealthManifest {
  return {
    schemaVersion: 1,
    minimumBunVersion: '1.3.12',
    timezone: 'UTC',
    statePath: '.cache/project-r/state.json',
    lockPath: '.cache/project-r/scheduler.lock',
    lockStaleMs: 5_000,
    jobs: [job],
  };
}

function commandJob(command: string[]): SkillHealthJob {
  return {
    id: 'test-health',
    enabled: true,
    trigger: { kind: 'cron', schedule: '@daily' },
    command,
    timeoutMs: 2_000,
    terminateGraceMs: 50,
    retries: 0,
    retryOn: [],
    retryBackoffMs: 0,
    outputLimitBytes: 1_024,
  };
}

describe('skill-health manifest', () => {
  test('loads the repository manifest with explicit UTC and three jobs', async () => {
    const root = join(import.meta.dir, '..');
    const manifest = await loadSkillHealthManifest(join(root, 'config/skill-health-scheduler.json'), root);
    expect(manifest.timezone).toBe('UTC');
    expect(manifest.jobs.map(job => job.id)).toEqual([
      'skill-quick-lint',
      'skill-deep-score',
      'bun-runtime-freshness',
    ]);
    expect(manifest.jobs.find(job => job.id === 'skill-deep-score')?.command).toContain(
      '--dynamic'
    );
  });

  test('fails closed on timezone, path escape, duplicate ids, and unknown keys', () => {
    const root = '/tmp/project-r-manifest-root';
    const base = {
      $schema: './schemas/skill-health-scheduler.schema.json',
      schemaVersion: 1,
      minimumBunVersion: '1.3.12',
      timezone: 'UTC',
      statePath: '.cache/state.json',
      lockPath: '.cache/lock',
      lockStaleMs: 5_000,
      jobs: [commandJob([process.execPath, '-e', 'void 0'])],
    };
    expect(() => parseSkillHealthManifest({ ...base, timezone: 'local' }, root)).toThrow('UTC');
    expect(() =>
      parseSkillHealthManifest({ ...base, statePath: '.cache/../../state.json' }, root)
    ).toThrow('inside repository');
    expect(() => parseSkillHealthManifest({ ...base, jobs: [...base.jobs, ...base.jobs] }, root)).toThrow(
      'unique'
    );
    expect(() => parseSkillHealthManifest({ ...base, surprise: true }, root)).toThrow('unknown keys');
  });
});

describe('skill-health execution', () => {
  test('migrates legacy wall-clock duration without claiming nanosecond provenance', async () => {
    const root = await temporaryRoot();
    const statePath = join(root, '.cache/project-r/state.json');
    await mkdir(join(root, '.cache/project-r'), { recursive: true });
    await Bun.write(
      statePath,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: '2026-08-15T00:00:01.000Z',
        bunVersion: '1.3.14',
        jobs: {
          legacy: {
            status: 'succeeded',
            lastStartedAt: '2026-08-15T00:00:00.000Z',
            lastFinishedAt: '2026-08-15T00:00:01.000Z',
            lastSuccessfulAt: '2026-08-15T00:00:01.000Z',
            nextRunAt: null, durationMs: 1_000, attempts: 1,
            exitCode: 0, signalCode: null, hardKillRequested: false,
            stdoutSha256: 'a'.repeat(64),
            stderrSha256: 'b'.repeat(64),
            stdoutTruncated: false, stderrTruncated: false,
          },
        },
      })
    );

    const migrated = await loadSkillHealthState(statePath);
    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.jobs.legacy).toMatchObject({
      processLifecycleDurationNs: null,
      processLifecycleDurationMs: 1_000,
      clockSource: 'wall-clock-legacy',
      finalAttemptDurationNs: null,
      finalAttemptDurationMs: 1_000,
    });
  });

  test('persists evidence digests without persisting raw output', async () => {
    const root = await temporaryRoot();
    const manifest = manifestWith(commandJob([process.execPath, '-e', 'console.log("secret-output")']));
    const outcome = await runSkillHealthJob(root, manifest, manifest.jobs[0]!);
    expect(outcome.status).toBe('completed');
    if (outcome.status !== 'completed') return;
    expect(outcome.result.ok).toBe(true);

    const statePath = join(root, manifest.statePath);
    const stateText = await Bun.file(statePath).text();
    expect(stateText).not.toContain('secret-output');
    const state = await loadSkillHealthState(statePath);
    expect(state?.schemaVersion).toBe(3);
    expect(state?.jobs['test-health']).toMatchObject({
      status: 'succeeded',
      attempts: 1,
      exitCode: 0,
      clockSource: 'bun.nanoseconds',
    });
    expect(state?.jobs['test-health']?.processLifecycleDurationNs).toBeGreaterThanOrEqual(
      state?.jobs['test-health']?.finalAttemptDurationNs ?? Number.POSITIVE_INFINITY
    );
    expect(state?.jobs['test-health']?.processLifecycleDurationMs).toBeGreaterThanOrEqual(
      state?.jobs['test-health']?.finalAttemptDurationMs ?? Number.POSITIVE_INFINITY
    );
    expect(state?.jobs['test-health']?.stdoutSha256).toHaveLength(64);
    expect((await readdir(join(root, '.cache/project-r'))).some(name => name.endsWith('.tmp'))).toBe(false);
  });

  test('uses one cross-process lease for watch and cron work', async () => {
    const root = await temporaryRoot();
    const job = commandJob([process.execPath, '-e', 'await Bun.sleep(150)']);
    const manifest = manifestWith(job);
    const first = runSkillHealthJob(root, manifest, job);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (await Bun.file(join(root, manifest.lockPath)).exists()) break;
      await Bun.sleep(2);
    }
    expect(await runSkillHealthJob(root, manifest, job)).toMatchObject({ status: 'busy' });
    expect((await first).status).toBe('completed');
  });

  test('registers and disposes watch and cron handles without OS mutation', async () => {
    const root = await temporaryRoot();
    const watchJob: SkillHealthJob = {
      ...commandJob([process.execPath, '-e', '']),
      id: 'watch-health',
      trigger: { kind: 'watch', paths: ['.agents/skills'], debounceMs: 20 },
    };
    const manifest = { ...manifestWith(watchJob), jobs: [watchJob, commandJob([process.execPath, '-e', ''])] };
    const handle = startSkillHealthScheduler(root, manifest);
    expect(handle.watchers).toHaveLength(1);
    expect(handle.cronJobs).toHaveLength(1);
    handle.stop();
  });

  test('coalesces a watched skill edit into a recorded quick run', async () => {
    const root = await temporaryRoot();
    const watchJob: SkillHealthJob = {
      ...commandJob([process.execPath, '-e', 'console.log("quick")']),
      id: 'watch-health',
      trigger: { kind: 'watch', paths: ['.agents/skills'], debounceMs: 20 },
    };
    const manifest = manifestWith(watchJob);
    const handle = startSkillHealthScheduler(root, manifest, { cron: false, watch: true });
    try {
      await Bun.sleep(20);
      await Bun.write(join(root, '.agents/skills/example.md'), 'changed\n');
      const statePath = join(root, manifest.statePath);
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (await Bun.file(statePath).exists()) break;
        await Bun.sleep(10);
      }
      expect((await loadSkillHealthState(statePath))?.jobs['watch-health']?.status).toBe(
        'succeeded'
      );
    } finally {
      handle.stop();
    }
  });
});
