// eslint-disable-next-line no-restricted-imports -- Bun lacks exclusive-create locks, mkdir, and atomic rename APIs.
import { mkdir, open, readFile, rename, unlink, type FileHandle } from 'node:fs/promises';
import { dirnamePath, resolvePath } from '../path-bun.ts';
import type { ManagedProcessResult } from './managed-process.ts';
import type { SkillHealthJob, SkillHealthManifest } from './skill-health-manifest.ts';
import { parseSkillHealthState } from './skill-health-state-loader.ts';

export interface SkillHealthJobState {
  status: 'failed' | 'spawn-error' | 'succeeded' | 'timed-out';
  lastStartedAt: string;
  lastFinishedAt: string;
  lastSuccessfulAt: string | null;
  nextRunAt: string | null;
  processLifecycleDurationNs: number | null;
  processLifecycleDurationMs: number;
  clockSource: 'bun.nanoseconds' | 'wall-clock-legacy';
  finalAttemptDurationNs: number | null;
  finalAttemptDurationMs: number;
  attempts: number;
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  hardKillRequested: boolean;
  stdoutSha256: string;
  stderrSha256: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface SkillHealthState {
  schemaVersion: 3;
  updatedAt: string;
  bunVersion: string;
  jobs: Record<string, SkillHealthJobState>;
}

export interface SkillHealthLease {
  release: () => Promise<void>;
}

function sha256(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex');
}

export async function loadSkillHealthState(path: string): Promise<SkillHealthState | null> {
  if (!(await Bun.file(path).exists())) return null;
  return parseSkillHealthState(await Bun.file(path).json(), path);
}

export async function writeJsonAtomically(path: string, value: object): Promise<void> {
  await mkdir(dirnamePath(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    await Bun.write(temporary, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function readLease(path: string): Promise<{ pid: number; startedAt: number } | null> {
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as { pid?: unknown; startedAt?: unknown };
    if (typeof raw.pid !== 'number' || typeof raw.startedAt !== 'string') return null;
    const startedAt = Date.parse(raw.startedAt);
    return Number.isFinite(startedAt) ? { pid: raw.pid, startedAt } : null;
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function createLease(path: string): Promise<FileHandle | null> {
  try {
    const handle = await open(path, 'wx');
    await handle.writeFile(
      `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`
    );
    return handle;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null;
    throw error;
  }
}

export async function acquireSkillHealthLease(
  path: string,
  staleMs: number
): Promise<SkillHealthLease | null> {
  await mkdir(dirnamePath(path), { recursive: true });
  let handle = await createLease(path);
  if (handle === null) {
    const existing = await readLease(path);
    if (
      existing === null ||
      Date.now() - existing.startedAt <= staleMs ||
      processIsAlive(existing.pid)
    )
      return null;
    await unlink(path).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
    handle = await createLease(path);
  }
  if (handle === null) return null;

  let released = false;
  return {
    release: async () => {
      if (released) return;
      released = true;
      await handle.close();
      await unlink(path).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      });
    },
  };
}

export function stateFromRun(
  previous: SkillHealthState | null,
  job: SkillHealthJob,
  result: ManagedProcessResult
): SkillHealthState {
  const final = result.final;
  const next =
    job.trigger.kind === 'cron' ? Bun.cron.parse(job.trigger.schedule, Date.now()) : null;
  const prior = previous?.jobs[job.id];
  const jobState: SkillHealthJobState = {
    status: final.status,
    lastStartedAt: result.startedAt,
    lastFinishedAt: result.endedAt,
    lastSuccessfulAt: result.ok ? result.endedAt : (prior?.lastSuccessfulAt ?? null),
    nextRunAt: next?.toISOString() ?? null,
    processLifecycleDurationNs: result.durationNs,
    processLifecycleDurationMs: result.durationMs,
    clockSource: result.clockSource,
    finalAttemptDurationNs: final.durationNs,
    finalAttemptDurationMs: final.durationMs,
    attempts: result.attempts.length,
    exitCode: final.exitCode,
    signalCode: final.signalCode,
    hardKillRequested: final.hardKillRequested,
    stdoutSha256: sha256(final.stdout),
    stderrSha256: sha256(final.stderr),
    stdoutTruncated: final.stdoutTruncated,
    stderrTruncated: final.stderrTruncated,
  };
  return {
    schemaVersion: 3,
    updatedAt: result.endedAt,
    bunVersion: Bun.version,
    jobs: { ...(previous?.jobs ?? {}), [job.id]: jobState },
  };
}

export function resolveSkillHealthPaths(
  root: string,
  manifest: SkillHealthManifest
): { statePath: string; lockPath: string } {
  return {
    statePath: resolvePath(root, manifest.statePath),
    lockPath: resolvePath(root, manifest.lockPath),
  };
}
