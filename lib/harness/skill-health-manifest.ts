import type { ManagedProcessFailure } from './managed-process.ts';
import {
  assertRepositoryPath,
  bunVersionAtLeast,
  worstCaseLifecycleMs,
} from './skill-health-version.ts';
import type { SkillHealthJobId } from './skill-health-version.ts';

export type SkillHealthTrigger =
  { kind: 'cron'; schedule: string } | { kind: 'watch'; paths: string[]; debounceMs: number };

export interface SkillHealthJob {
  id: SkillHealthJobId;
  enabled: boolean;
  trigger: SkillHealthTrigger;
  command: string[];
  timeoutMs: number;
  terminateGraceMs: number;
  retries: number;
  retryOn: ManagedProcessFailure[];
  retryBackoffMs: number;
  outputLimitBytes: number;
}

export interface SkillHealthManifest {
  schemaVersion: 1;
  minimumBunVersion: string;
  timezone: 'UTC';
  statePath: string;
  lockPath: string;
  lockStaleMs: number;
  jobs: SkillHealthJob[];
}

function parseRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter(key => !allowedKeys.has(key));
  if (unknown.length > 0) throw new TypeError(`${label} has unknown keys: ${unknown.join(', ')}`);
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`${label} must be a string`);
  return value;
}

function parseInteger(value: unknown, label: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new TypeError(`${label} must be an integer >= ${minimum}`);
  }
  return value as number;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new TypeError(`${label} must be non-empty`);
  return value.map((entry, index) => parseString(entry, `${label}[${index}]`));
}

function parseTrigger(value: unknown, label: string): SkillHealthTrigger {
  const trigger = parseRecord(value, label);
  if (trigger.kind === 'cron') {
    assertKeys(trigger, ['kind', 'schedule'], label);
    const schedule = parseString(trigger.schedule, `${label}.schedule`);
    if (Bun.cron.parse(schedule) === null) throw new TypeError(`${label}.schedule has no next run`);
    return { kind: 'cron', schedule };
  }
  if (trigger.kind === 'watch') {
    assertKeys(trigger, ['kind', 'paths', 'debounceMs'], label);
    return {
      kind: 'watch',
      paths: parseStringArray(trigger.paths, `${label}.paths`),
      debounceMs: parseInteger(trigger.debounceMs, `${label}.debounceMs`, 10),
    };
  }
  throw new TypeError(`${label}.kind must be cron or watch`);
}

function parseJob(value: unknown, index: number): SkillHealthJob {
  const label = `jobs[${index}]`;
  const job = parseRecord(value, label);
  assertKeys(
    job,
    [
      'id',
      'enabled',
      'trigger',
      'command',
      'timeoutMs',
      'terminateGraceMs',
      'retries',
      'retryOn',
      'retryBackoffMs',
      'outputLimitBytes',
    ],
    label
  );
  const id = parseString(job.id, `${label}.id`);
  if (!/^[a-z][a-z0-9-]*$/.test(id))
    throw new TypeError(`${label}.id must be lowercase kebab-case`);
  if (typeof job.enabled !== 'boolean') throw new TypeError(`${label}.enabled must be boolean`);
  const retryOn = Array.isArray(job.retryOn) ? job.retryOn : [];
  const allowed = new Set<ManagedProcessFailure>(['exit', 'spawn-error', 'timeout']);
  if (retryOn.some(entry => !allowed.has(entry as ManagedProcessFailure))) {
    throw new TypeError(`${label}.retryOn contains an unknown failure class`);
  }
  const retries = parseInteger(job.retries, `${label}.retries`);
  if (retries > 5) throw new TypeError(`${label}.retries must be <= 5`);
  return {
    id,
    enabled: job.enabled,
    trigger: parseTrigger(job.trigger, `${label}.trigger`),
    command: parseStringArray(job.command, `${label}.command`),
    timeoutMs: parseInteger(job.timeoutMs, `${label}.timeoutMs`, 1),
    terminateGraceMs: parseInteger(job.terminateGraceMs, `${label}.terminateGraceMs`),
    retries,
    retryOn: retryOn as ManagedProcessFailure[],
    retryBackoffMs: parseInteger(job.retryBackoffMs, `${label}.retryBackoffMs`),
    outputLimitBytes: parseInteger(job.outputLimitBytes, `${label}.outputLimitBytes`),
  };
}

export function parseSkillHealthManifest(raw: unknown, root: string): SkillHealthManifest {
  const value = parseRecord(raw, 'skill-health manifest');
  assertKeys(
    value,
    [
      '$schema',
      'schemaVersion',
      'minimumBunVersion',
      'timezone',
      'statePath',
      'lockPath',
      'lockStaleMs',
      'jobs',
    ],
    'skill-health manifest'
  );
  if (value.$schema !== './schemas/skill-health-scheduler.schema.json') {
    throw new TypeError('skill-health manifest must reference its repository schema');
  }
  if (value.schemaVersion !== 1) throw new TypeError('skill-health schemaVersion must be 1');
  const minimumBunVersion = parseString(value.minimumBunVersion, 'minimumBunVersion');
  if (!bunVersionAtLeast(Bun.version, minimumBunVersion)) {
    throw new TypeError(`Bun ${minimumBunVersion}+ required; running ${Bun.version}`);
  }
  if (value.timezone !== 'UTC')
    throw new TypeError('pinned Bun 1.3 scheduler timezone must be UTC');
  const statePath = parseString(value.statePath, 'statePath');
  const lockPath = parseString(value.lockPath, 'lockPath');
  if (!statePath.startsWith('.cache/') || !lockPath.startsWith('.cache/')) {
    throw new TypeError('statePath and lockPath must use the ignored .cache boundary');
  }
  if (statePath === lockPath) throw new TypeError('statePath and lockPath must differ');
  assertRepositoryPath(root, statePath, 'statePath');
  assertRepositoryPath(root, lockPath, 'lockPath');
  if (!Array.isArray(value.jobs) || value.jobs.length === 0)
    throw new TypeError('jobs must be non-empty');
  const jobs = value.jobs.map(parseJob);
  for (const job of jobs) {
    if (job.trigger.kind === 'watch') {
      for (const watchPath of job.trigger.paths)
        assertRepositoryPath(root, watchPath, `${job.id} watch path`);
    }
  }
  if (new Set(jobs.map(job => job.id)).size !== jobs.length)
    throw new TypeError('job ids must be unique');
  const lockStaleMs = parseInteger(value.lockStaleMs, 'lockStaleMs', 1_000);
  const maximumLeaseMs = worstCaseLifecycleMs(jobs);
  if (lockStaleMs <= maximumLeaseMs) {
    throw new TypeError(`lockStaleMs must exceed worst-case job lifecycle ${maximumLeaseMs}ms`);
  }
  return {
    schemaVersion: 1,
    minimumBunVersion,
    timezone: 'UTC',
    statePath,
    lockPath,
    lockStaleMs,
    jobs,
  };
}
