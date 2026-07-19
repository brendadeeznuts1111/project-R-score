// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { join } from 'path';
import { collectBunCacheMetrics, type BunCacheMetrics } from './bun-cache-metrics.ts';

export type PmCommandResult = {
  command: string;
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type LockfileIntegrity = {
  hashCurrent: string | null;
  hashStored: string | null;
  match: boolean | null;
  ok: boolean;
  detail: string;
};

export type PmTrustAudit = {
  untrustedStdout: string;
  untrustedCount: number;
  trustedStdout: string;
  ok: boolean;
  detail: string;
};

export type PmBinPaths = {
  local: string | null;
  global: string | null;
  ok: boolean;
};

export type PmProjectIdentity = {
  name: string | null;
  version: string | null;
  private: boolean | null;
  ok: boolean;
};

export type BunPmHealthReport = {
  collectedAt: string;
  cache: BunCacheMetrics;
  lockfile: LockfileIntegrity;
  trust: PmTrustAudit;
  bin: PmBinPaths;
  project: PmProjectIdentity;
  ok: boolean;
  failures: string[];
  warnings: string[];
};

const ROOT = join(import.meta.dir, '../..');

function runPm(args: string[], cwd = ROOT): PmCommandResult {
  const proc = Bun.spawnSync(['bun', 'pm', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout).trim() : '';
  const stderr = proc.stderr ? new TextDecoder().decode(proc.stderr).trim() : '';
  return {
    command: `bun pm ${args.join(' ')}`,
    ok: proc.exitCode === 0,
    stdout,
    stderr,
    exitCode: proc.exitCode ?? 1,
  };
}

function lastMeaningfulLine(text: string): string | null {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('[') && !l.startsWith('bun pm '));
  return lines.at(-1) ?? null;
}

export function auditLockfileIntegrity(cwd = ROOT): LockfileIntegrity {
  const current = runPm(['hash'], cwd);
  const stored = runPm(['hash-print'], cwd);
  const hashCurrent = lastMeaningfulLine(current.stdout);
  const hashStored = lastMeaningfulLine(stored.stdout);

  if (!hashCurrent || !hashStored) {
    return {
      hashCurrent,
      hashStored,
      match: null,
      ok: true,
      detail: 'hash commands unavailable or lockfile format without stored hash',
    };
  }

  const zeroStored = /^0+-0+-0+-0+$/.test(hashStored.replace(/-/g, '-'));
  if (zeroStored) {
    return {
      hashCurrent,
      hashStored,
      match: null,
      ok: true,
      detail: 'hash-print is zero placeholder (text lockfile or unstored hash field)',
    };
  }

  const match = hashCurrent === hashStored;
  return {
    hashCurrent,
    hashStored,
    match,
    ok: match,
    detail: match
      ? `lockfile hash ${hashCurrent}`
      : `hash mismatch: current ${hashCurrent} vs stored ${hashStored}`,
  };
}

export function auditPmTrust(cwd = ROOT): PmTrustAudit {
  const untrusted = runPm(['untrusted'], cwd);
  const trusted = runPm(['ls', '--trusted'], cwd);

  const body = untrusted.stdout.replace(/bun pm untrusted.*\n?/i, '').trim();
  const untrustedLines = body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('Found 0') && !l.startsWith('This means') && !l.startsWith('For more'));

  const countMatch = untrusted.stdout.match(/Found (\d+) untrusted/i);
  const untrustedCount = countMatch ? Number.parseInt(countMatch[1]!, 10) : untrustedLines.length;

  const ok = untrustedCount === 0;
  return {
    untrustedStdout: untrusted.stdout,
    untrustedCount,
    trustedStdout: trusted.stdout,
    ok,
    detail: ok
      ? 'no untrusted dependencies with blocked lifecycle scripts'
      : `${untrustedCount} untrusted dependencies with scripts`,
  };
}

export function auditPmBin(cwd = ROOT): PmBinPaths {
  const local = runPm(['bin'], cwd);
  const global = runPm(['bin', '-g'], cwd);
  const localPath = lastMeaningfulLine(local.stdout);
  const globalPath = lastMeaningfulLine(global.stdout);
  return {
    local: localPath,
    global: globalPath,
    ok: Boolean(localPath),
  };
}

export function auditPmProjectIdentity(cwd = ROOT): PmProjectIdentity {
  const proc = runPm(['pkg', 'get', 'name', 'version', 'private'], cwd);
  if (!proc.ok) {
    return { name: null, version: null, private: null, ok: false };
  }
  try {
    const parsed = JSON.parse(proc.stdout) as {
      name?: string;
      version?: string;
      private?: boolean;
    };
    return {
      name: parsed.name ?? null,
      version: parsed.version ?? null,
      private: parsed.private ?? null,
      ok: Boolean(parsed.name),
    };
  } catch {
    return { name: null, version: null, private: null, ok: false };
  }
}

export async function collectBunPmHealth(cwd = ROOT): Promise<BunPmHealthReport> {
  const cache = await collectBunCacheMetrics();
  const lockfile = auditLockfileIntegrity(cwd);
  const trust = auditPmTrust(cwd);
  const bin = auditPmBin(cwd);
  const project = auditPmProjectIdentity(cwd);

  const failures: string[] = [];
  const warnings: string[] = [];

  if (!lockfile.ok && lockfile.match === false) {
    failures.push(lockfile.detail);
  }
  if (!trust.ok) {
    warnings.push(trust.detail);
  }
  if (!bin.ok) {
    warnings.push('bun pm bin did not resolve local node_modules/.bin');
  }
  if (!project.ok) {
    warnings.push('bun pm pkg get failed for project identity');
  }

  return {
    collectedAt: new Date().toISOString(),
    cache,
    lockfile,
    trust,
    bin,
    project,
    ok: failures.length === 0,
    failures,
    warnings,
  };
}