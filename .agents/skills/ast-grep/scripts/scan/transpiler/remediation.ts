import { dirname } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import { listLockfileVersions } from "./lock-index.ts";
import { strictestSafeRange } from "./policy-engine.ts";
import type { ViolationKind } from "./types.ts";

export type RemediationAction = "upgrade" | "remove";

export type RemediationHint = {
  package: string;
  currentVersion: string;
  action: RemediationAction;
  safeRange: string;
  suggestedVersion: string | null;
  latestInLockfile: string | null;
  command: string;
  reason: string;
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
  safeRanges?: string[];
  extraVersions?: string[];
}): Promise<RemediationHint | null> {
  const merged = strictestSafeRange([
    ...(options.safeRanges ?? []),
    ...(options.safeRange ? [options.safeRange] : []),
    ...(options.vulnRange ? [resolveSafeRange(undefined, options.vulnRange) ?? ""] : []),
  ]);
  const safeRange = merged ?? resolveSafeRange(options.safeRange, options.vulnRange);
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
    action: "upgrade",
    safeRange,
    suggestedVersion: target,
    latestInLockfile,
    command: target ? `bun add ${options.package}@${target}` : `bun add ${options.package}@${safeRange}`,
    reason: `Upgrade ${options.package} to satisfy ${safeRange}`,
  };
}

export function suggestRemoval(options: {
  package: string;
  currentVersion: string;
  blockedRange?: string;
}): RemediationHint {
  return {
    package: options.package,
    currentVersion: options.currentVersion,
    action: "remove",
    safeRange: "removed",
    suggestedVersion: null,
    latestInLockfile: null,
    command: `bun remove ${options.package}`,
    reason: options.blockedRange
      ? `Remove ${options.package} — matches blocked range ${options.blockedRange}`
      : `Remove blocked package ${options.package}`,
  };
}

export async function suggestRemediation(options: {
  repo: string;
  package: string;
  currentVersion: string;
  kinds?: ViolationKind[];
  safeRange?: string;
  vulnRange?: string;
  safeRanges?: string[];
}): Promise<RemediationHint | null> {
  if (options.kinds?.includes("blocked")) {
    return suggestRemoval({
      package: options.package,
      currentVersion: options.currentVersion,
      blockedRange: options.vulnRange,
    });
  }
  return suggestUpgrade(options);
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

export async function applyPackageRemove(options: {
  packageJsonPath: string;
  package: string;
  dryRun?: boolean;
}): Promise<{ ok: boolean; command: string; output?: string }> {
  const command = `bun remove ${options.package}`;
  if (options.dryRun) {
    return { ok: true, command };
  }
  const cwd = dirname(options.packageJsonPath);
  const proc = Bun.spawn(["bun", "remove", options.package], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  const output = `${await new Response(proc.stdout).text()}${await new Response(proc.stderr).text()}`.trim();
  return { ok: code === 0, command, output };
}