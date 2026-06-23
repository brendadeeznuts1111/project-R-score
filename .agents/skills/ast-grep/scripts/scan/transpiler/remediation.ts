import { dirname } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import { listLockfileVersions } from "./lock-index.ts";

export type RemediationHint = {
  package: string;
  currentVersion: string;
  safeRange: string;
  suggestedVersion: string | null;
  latestInLockfile: string | null;
  command: string;
};

/** Infer a safe floor range from a vulnerability range like `<4.17.21`. */
export function inferSafeRange(vulnRange: string): string | null {
  const lt = vulnRange.match(/^<\s*=?(.+)$/);
  if (lt) return `>=${lt[1].trim()}`;
  const lte = vulnRange.match(/^<=\s*(.+)$/);
  if (lte) return `>${lte[1].trim()}`;
  return null;
}

export function resolveSafeRange(explicit?: string, vulnRange?: string): string | null {
  if (explicit) return explicit;
  if (vulnRange) return inferSafeRange(vulnRange);
  return null;
}

export async function suggestUpgrade(options: {
  repo: string;
  package: string;
  currentVersion: string;
  safeRange?: string;
  vulnRange?: string;
  extraVersions?: string[];
}): Promise<RemediationHint | null> {
  const safeRange = resolveSafeRange(options.safeRange, options.vulnRange);
  if (!safeRange) return null;

  const lockVersions = await listLockfileVersions(options.repo, options.package);
  const pool = [...new Set([...lockVersions, ...(options.extraVersions ?? []), options.currentVersion])];
  const suggested = SemverMatcher.latestSatisfying(pool, safeRange);
  const latestInLockfile = lockVersions.length
    ? SemverMatcher.latestSatisfying(lockVersions, "*")
    : null;

  const target = suggested ?? latestInLockfile;
  return {
    package: options.package,
    currentVersion: options.currentVersion,
    safeRange,
    suggestedVersion: target,
    latestInLockfile,
    command: target ? `bun add ${options.package}@${target}` : `bun add ${options.package}@${safeRange}`,
  };
}

export async function applyPackageFix(options: {
  packageJsonPath: string;
  package: string;
  version: string;
  dryRun?: boolean;
}): Promise<{ ok: boolean; command: string; output?: string }> {
  const spec = `${options.package}@${options.version}`;
  const command = `bun add ${spec}`;
  if (options.dryRun) {
    return { ok: true, command };
  }
  const cwd = dirname(options.packageJsonPath);
  const proc = Bun.spawn(["bun", "add", spec], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  const output = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`.trim();
  return { ok: code === 0, command, output };
}