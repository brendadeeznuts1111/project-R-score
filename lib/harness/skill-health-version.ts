function versionTuple(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) throw new TypeError(`invalid Bun version ${JSON.stringify(version)}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function bunVersionAtLeast(actual: string, minimum: string): boolean {
  const a = versionTuple(actual);
  const b = versionTuple(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return true;
}

export function assertRepositoryPath(root: string, candidate: string, label: string): void {
  const resolvedRoot = `${resolvePath(root).replace(/\/$/, '')}/`;
  if (!resolvePath(root, candidate).startsWith(resolvedRoot)) {
    throw new TypeError(`${label} must stay inside repository root`);
  }
}

export function worstCaseLifecycleMs(
  jobs: Array<{
    retries: number;
    timeoutMs: number;
    terminateGraceMs: number;
    retryBackoffMs: number;
  }>
): number {
  return Math.max(
    ...jobs.map(
      job =>
        (job.retries + 1) * (job.timeoutMs + job.terminateGraceMs) +
        job.retryBackoffMs * (2 ** job.retries - 1)
    )
  );
}
import { resolvePath } from '../path-bun.ts';

export type SkillHealthJobId = string; // brand-ok — opaque scheduler catalog key
