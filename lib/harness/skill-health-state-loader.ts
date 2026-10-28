import type { SkillHealthJobState, SkillHealthState } from './skill-health-state.ts';

export function parseSkillHealthState(raw: unknown, path: string): SkillHealthState {
  const candidate = raw as {
    schemaVersion?: unknown;
    updatedAt?: unknown;
    bunVersion?: unknown;
    jobs?: unknown;
  };
  if (
    (candidate.schemaVersion !== 1 &&
      candidate.schemaVersion !== 2 &&
      candidate.schemaVersion !== 3) ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.bunVersion !== 'string' ||
    typeof candidate.jobs !== 'object' ||
    candidate.jobs === null
  ) {
    throw new TypeError(`invalid skill-health state at ${path}`);
  }
  const jobs = Object.fromEntries(
    Object.entries(candidate.jobs).map(([id, value]) => {
      if (typeof value !== 'object' || value === null) {
        throw new TypeError(`invalid skill-health job state ${JSON.stringify(id)} at ${path}`);
      }
      const job = value as Partial<SkillHealthJobState> & {
        durationMs?: unknown;
        durationClock?: unknown;
      };
      const processLifecycleDurationMs =
        typeof job.processLifecycleDurationMs === 'number'
          ? job.processLifecycleDurationMs
          : typeof job.durationMs === 'number'
            ? job.durationMs
            : null;
      if (processLifecycleDurationMs === null) {
        throw new TypeError(`invalid skill-health duration for ${JSON.stringify(id)} at ${path}`);
      }
      const clockSource =
        job.clockSource === 'bun.nanoseconds' || job.durationClock === 'bun.nanoseconds'
          ? 'bun.nanoseconds'
          : 'wall-clock-legacy';
      const finalAttemptDurationMs =
        typeof job.finalAttemptDurationMs === 'number'
          ? job.finalAttemptDurationMs
          : processLifecycleDurationMs;
      const { durationMs: _durationMs, durationClock: _durationClock, ...current } = job;
      return [
        id,
        {
          ...current,
          processLifecycleDurationNs:
            clockSource === 'bun.nanoseconds'
              ? (job.processLifecycleDurationNs ??
                Math.round(processLifecycleDurationMs * 1_000_000))
              : null,
          processLifecycleDurationMs,
          clockSource,
          finalAttemptDurationNs:
            clockSource === 'bun.nanoseconds'
              ? (job.finalAttemptDurationNs ?? Math.round(finalAttemptDurationMs * 1_000_000))
              : null,
          finalAttemptDurationMs,
        } as SkillHealthJobState,
      ];
    })
  );
  return {
    schemaVersion: 3,
    updatedAt: candidate.updatedAt,
    bunVersion: candidate.bunVersion,
    jobs,
  };
}
