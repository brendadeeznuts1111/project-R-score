// eslint-disable-next-line no-restricted-imports -- Bun 1.3.14 has no Bun.watch; node:fs.watch is the documented Bun watcher.
import { watch, type FSWatcher } from 'node:fs';
import { resolvePath } from '../path-bun.ts';
import { runManagedProcess, type ManagedProcessResult } from './managed-process.ts';
import type { SkillHealthJob, SkillHealthManifest } from './skill-health-manifest.ts';
import {
  acquireSkillHealthLease,
  loadSkillHealthState,
  resolveSkillHealthPaths,
  stateFromRun,
  writeJsonAtomically,
} from './skill-health-state.ts';

export type SkillHealthRunOutcome =
  | { status: 'busy'; job: SkillHealthJob }
  | { status: 'completed'; job: SkillHealthJob; result: ManagedProcessResult };

export interface SkillHealthSchedulerHandle {
  stop: () => void;
  cronJobs: Bun.CronJob[];
  watchers: FSWatcher[];
}

export interface SkillHealthSchedulerOptions {
  cron?: boolean;
  watch?: boolean;
}

export function jobById(manifest: SkillHealthManifest, id: string): SkillHealthJob {
  const job = manifest.jobs.find(candidate => candidate.id === id && candidate.enabled);
  if (!job) throw new Error(`unknown or disabled skill-health job ${JSON.stringify(id)}`);
  return job;
}

export async function runSkillHealthJob(
  root: string,
  manifest: SkillHealthManifest,
  job: SkillHealthJob
): Promise<SkillHealthRunOutcome> {
  const paths = resolveSkillHealthPaths(root, manifest);
  const lease = await acquireSkillHealthLease(paths.lockPath, manifest.lockStaleMs);
  if (lease === null) return { status: 'busy', job };

  try {
    const result = await runManagedProcess({
      command: job.command,
      cwd: root,
      env: { ...Bun.env, SKILL_HEALTH_JOB: job.id },
      timeoutMs: job.timeoutMs,
      terminateGraceMs: job.terminateGraceMs,
      retries: job.retries,
      retryOn: job.retryOn,
      retryBackoffMs: job.retryBackoffMs,
      outputLimitBytes: job.outputLimitBytes,
    });
    const previous = await loadSkillHealthState(paths.statePath);
    await writeJsonAtomically(paths.statePath, stateFromRun(previous, job, result));
    return { status: 'completed', job, result };
  } finally {
    await lease.release();
  }
}

function createCoalescedRunner(run: () => Promise<void>): () => void {
  let running = false;
  let pending = false;
  return () => {
    pending = true;
    if (running) return;
    running = true;
    void (async () => {
      try {
        while (pending) {
          pending = false;
          await run();
        }
      } catch (error) {
        console.error('skill-health watch run failed:', error);
      } finally {
        running = false;
      }
    })();
  };
}

function registerWatchJob(
  root: string,
  manifest: SkillHealthManifest,
  job: SkillHealthJob & { trigger: Extract<SkillHealthJob['trigger'], { kind: 'watch' }> }
): { watchers: FSWatcher[]; stopTimers: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const queue = createCoalescedRunner(async () => {
    const outcome = await runSkillHealthJob(root, manifest, job);
    if (outcome.status === 'busy') {
      console.warn(`skill-health ${job.id} deferred: scheduler busy`);
      retryTimer = setTimeout(queue, 5_000);
    }
  });
  const watchers = job.trigger.paths.map(relative =>
    watch(resolvePath(root, relative), { recursive: true }, () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(queue, job.trigger.debounceMs);
    })
  );
  return {
    watchers,
    stopTimers: () => {
      if (timer !== undefined) clearTimeout(timer);
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    },
  };
}

export function startSkillHealthScheduler(
  root: string,
  manifest: SkillHealthManifest,
  options: SkillHealthSchedulerOptions = {}
): SkillHealthSchedulerHandle {
  const enableCron = options.cron ?? true;
  const enableWatch = options.watch ?? true;
  const cronJobs: Bun.CronJob[] = [];
  const watchers: FSWatcher[] = [];
  const stopTimers: Array<() => void> = [];
  for (const job of manifest.jobs.filter(candidate => candidate.enabled)) {
    if (job.trigger.kind === 'cron' && enableCron) {
      cronJobs.push(
        Bun.cron(job.trigger.schedule, async () => {
          try {
            const outcome = await runSkillHealthJob(root, manifest, job);
            if (outcome.status === 'busy')
              console.warn(`skill-health ${job.id} skipped: scheduler busy`);
          } catch (error) {
            console.error(`skill-health ${job.id} failed:`, error);
          }
        })
      );
    } else if (job.trigger.kind === 'watch' && enableWatch) {
      const registered = registerWatchJob(
        root,
        manifest,
        job as typeof job & { trigger: typeof job.trigger }
      );
      watchers.push(...registered.watchers);
      stopTimers.push(registered.stopTimers);
    }
  }
  return {
    cronJobs,
    watchers,
    stop: () => {
      for (const stopTimer of stopTimers) stopTimer();
      for (const watcher of watchers) watcher.close();
      for (const job of cronJobs) job.stop();
    },
  };
}
