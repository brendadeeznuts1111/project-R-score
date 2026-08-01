#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/bunfig — bunfig.toml install keys
/**
 * audit-bunfig — find workspace bunfig.toml files duplicating machine-level install keys.
 *
 * Machine defaults live in ~/.bunfig.toml (linker, globalStore, cache.dir, age gate).
 * Policy table SSOT: lib/install/machine-bunfig-policy.ts
 * Doctor bunfig group re-exports the same constants (tools/lib/portal-cli-doctor-bunfig.ts).
 *
 *   bun scripts/audit-bunfig.ts
 *   bun scripts/audit-bunfig.ts --strict   # exit 1 if any redundant keys found
 *   bun scripts/audit-bunfig.ts --doctor   # prefer kimi-doctor --gate bunfig-policy (if on PATH)
 *   bash scripts/audit-bunfig.sh …         # thin wrapper (package.json audit:bunfig)
 *
 * @see docs/UNIFIED.md
 * @see lib/install/machine-bunfig-policy.ts
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../lib/install/machine-bunfig-policy.ts';
import { dirnamePath, resolvePath } from './lib/fs-bun.ts';

// Re-export SSOT so tests prove audit ≡ doctor (same array references).
export {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../lib/install/machine-bunfig-policy.ts';

const ROOT_DEFAULT = resolvePath(import.meta.dir, '..');

/** Escape a string for safe inclusion in a RegExp character class / alternation. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keys scanned as single-line `^key =` assignments in workspace bunfig.toml files.
 * Derived from {@link MACHINE_OWNED_INSTALL_KEYS} (never a parallel hard-coded name list).
 *
 * `minimumReleaseAgeExcludes` is omitted from the line scan: it is a multi-line array and
 * doctor enforces package content on machine bunfig (`bunfig-release-age-excludes`).
 * Workspace array copies remain intentional overrides (see docs/UNIFIED.md).
 */
export function machineOwnedLineAssignmentKeys(
  keys: readonly string[] = MACHINE_OWNED_INSTALL_KEYS
): readonly string[] {
  return keys.filter(k => k !== 'minimumReleaseAgeExcludes');
}

/**
 * Line-assignment pattern for machine-owned install keys + bare `dir =` (cache).
 * Built from {@link machineOwnedLineAssignmentKeys} so audit cannot drift from doctor SSOT.
 * Cache uses indented `dir =` under `[install.cache]` ({@link MACHINE_OWNED_CACHE_DIR_LABEL}).
 */
export function buildMachineOwnedKeyLinePattern(
  keys: readonly string[] = machineOwnedLineAssignmentKeys()
): RegExp {
  // Longest-first so longer key names win over prefixes when both are present.
  const ordered = [...keys].sort((a, b) => b.length - a.length);
  const keyAlt = ordered.map(escapeRegExp).join('|');
  return new RegExp(`^(?:${keyAlt})\\s*=|^\\s*dir\\s*=`);
}

/** Human label for the scanned machine-owned key set (header + notes). */
export function machineOwnedKeysLabel(
  keys: readonly string[] = machineOwnedLineAssignmentKeys()
): string {
  return [...keys, MACHINE_OWNED_CACHE_DIR_LABEL].join(', ');
}

export type AuditMatchFile = {
  /** Path relative to root. */
  rel: string;
  /** `lineNo:content` lines that matched. */
  matches: string[];
};

export type AuditBunfigOptions = {
  root?: string;
  strict?: boolean;
  useDoctor?: boolean;
  /** Injected env (tests); default Bun.env. */
  env?: Record<string, string | undefined>;
  /** Skip bun pm identity / untrusted sections (tests). */
  quietPm?: boolean;
  /** Collect stdout lines instead of writing to console (tests). */
  silent?: boolean;
};

export type AuditBunfigResult = {
  /** true when exit would be 0 (clean, or findings without --strict). */
  ok: boolean;
  found: boolean;
  files: AuditMatchFile[];
  exitCode: number;
  /** Forbidden install env set outside ephemeral CI (informational; does not fail alone). */
  forbiddenEnv: string[];
  ephemeralCi: boolean;
};

/** Resolve the Git worktree that owns a path; undefined outside a Git worktree. */
export async function resolveGitTopLevel(path: string): Promise<string | undefined> {
  const proc = Bun.spawn(['git', '-C', path, 'rev-parse', '--show-toplevel'], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0 || stdout.trim().length === 0) return undefined;
  return resolvePath(stdout.trim());
}

function parseArgs(argv: string[]): { strict: boolean; useDoctor: boolean } {
  let strict = false;
  let useDoctor = false;
  for (const arg of argv) {
    if (arg === '--strict') strict = true;
    if (arg === '--doctor') useDoctor = true;
  }
  return { strict, useDoctor };
}

async function whichOnPath(bin: string): Promise<boolean> {
  return Bun.which(bin) != null;
}

/**
 * Scan workspace bunfig.toml files for machine-owned key line assignments.
 * Pure of CLI flags except root / env; does not spawn kimi-doctor.
 */
export async function collectMachineOwnedBunfigMatches(
  root: string,
  pattern: RegExp = buildMachineOwnedKeyLinePattern()
): Promise<AuditMatchFile[]> {
  const files: string[] = [];
  const auditGitRoot = await resolveGitTopLevel(root);
  for await (const rel of new Bun.Glob('**/bunfig.toml').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    if (
      rel.includes('node_modules/') ||
      rel.startsWith('node_modules') ||
      rel.includes('/.bun/') ||
      rel.startsWith('.bun/')
    ) {
      continue;
    }
    files.push(rel);
  }
  files.sort();

  const out: AuditMatchFile[] = [];
  for (const rel of files) {
    const abs = resolvePath(root, rel);
    const ownerGitRoot = await resolveGitTopLevel(dirnamePath(abs));
    if (auditGitRoot && ownerGitRoot && ownerGitRoot !== auditGitRoot) continue;
    let text: string;
    try {
      text = await Bun.file(abs).text();
    } catch {
      continue;
    }
    const matches: string[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (pattern.test(line)) {
        matches.push(`${i + 1}:${line}`);
      }
    }
    if (matches.length > 0) {
      out.push({ rel, matches });
    }
  }
  return out;
}

/**
 * Run audit:bunfig (same exit semantics as the historical shell script).
 * --strict → exit 1 when any workspace file has machine-owned key assignments.
 * Forbidden install env is reported but does not change exit (doctor owns that gate).
 */
export async function auditBunfig(opts: AuditBunfigOptions = {}): Promise<AuditBunfigResult> {
  const root = opts.root ?? ROOT_DEFAULT;
  const strict = opts.strict ?? false;
  const env = opts.env ?? (Bun.env as Record<string, string | undefined>);
  const lines: string[] = [];
  const log = (s: string) => {
    if (!opts.silent) console.log(s);
    lines.push(s);
  };

  if (opts.useDoctor && (await whichOnPath('kimi-doctor'))) {
    const proc = Bun.spawn(['kimi-doctor', '--gate', 'bunfig-policy'], {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const code = (await proc.exited) ?? 1;
    return {
      ok: code === 0,
      found: false,
      files: [],
      exitCode: code,
      forbiddenEnv: [],
      ephemeralCi: isEphemeralCiInstallEnv(env),
    };
  }

  const label = machineOwnedKeysLabel();
  log('=== Bunfig.toml duplication audit ===');
  log(`Machine defaults (~/.bunfig.toml): ${label}`);
  log('');

  if (!opts.quietPm && (await whichOnPath('bun'))) {
    log('── Project identity (bun pm pkg get) ──');
    try {
      const proc = Bun.spawn(bunSpawnArgs(['pm', 'pkg', 'get', 'name', 'version', 'private']), {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...Bun.env },
      });
      const out = await new Response(proc.stdout).text();
      await proc.exited;
      if (out.trim()) {
        for (const l of out.trimEnd().split('\n')) log(`  ${l}`);
      } else {
        log('  (bun pm pkg get unavailable)');
      }
    } catch {
      log('  (bun pm pkg get unavailable)');
    }
    log('');
    log('── Trust surface (bun pm untrusted) ──');
    try {
      const proc = Bun.spawn(bunSpawnArgs(['pm', 'untrusted']), {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...Bun.env },
      });
      const out = await new Response(proc.stdout).text();
      await proc.exited;
      const countMatch = out.match(/Found\s+(\d+)\s+untrusted/i);
      const count = countMatch ? Number(countMatch[1]) : 0;
      if (count !== 0) {
        for (const l of out.trimEnd().split('\n')) log(`  ${l}`);
      } else {
        log('  ✅ 0 untrusted dependencies with blocked scripts');
      }
    } catch {
      log('  ✅ 0 untrusted dependencies with blocked scripts');
    }
    log('');
  }

  const files = await collectMachineOwnedBunfigMatches(root);
  const found = files.length > 0;

  const forbiddenEnv = FORBIDDEN_INSTALL_ENV_VARS.filter(k => {
    const v = env[k];
    return typeof v === 'string' && v.trim().length > 0;
  }) as string[];
  const ephemeralCi = isEphemeralCiInstallEnv(env);

  // Surface SSOT excludes + env policy (informational — doctor owns fail gates for these).
  log(`── SSOT (lib/install/machine-bunfig-policy) ──`);
  log(`  machine-owned keys: ${MACHINE_OWNED_INSTALL_KEYS.join(', ')}`);
  log(`  release-age excludes: ${REQUIRED_RELEASE_AGE_EXCLUDES.join(', ')}`);
  log(
    forbiddenEnv.length === 0
      ? `  install env: no ${FORBIDDEN_INSTALL_ENV_VARS.join(' / ')}`
      : ephemeralCi
        ? `  install env: ephemeral CI allow ${forbiddenEnv.join(', ')}`
        : `  install env: forbidden set ${forbiddenEnv.join(', ')} (prefer ~/.bunfig.toml)`
  );
  log('');

  if (!found) {
    log('✅ No redundant install key assignments found.');
    return {
      ok: true,
      found: false,
      files,
      exitCode: 0,
      forbiddenEnv,
      ephemeralCi,
    };
  }

  for (const f of files) {
    log(`┌─ ${f.rel}`);
    for (const m of f.matches) log(`│  ${m}`);
    log('└─');
    log('');
  }

  log(
    'Note: intentional overrides (hoisted linker, project-local cache.dir) are expected in some workspaces.'
  );
  log(
    `Strip ${MACHINE_OWNED_INSTALL_KEYS.join('/')}/${MACHINE_OWNED_CACHE_DIR_LABEL} when they mirror ~/.bunfig.toml.`
  );

  const exitCode = strict ? 1 : 0;
  return {
    ok: exitCode === 0,
    found: true,
    files,
    exitCode,
    forbiddenEnv,
    ephemeralCi,
  };
}

if (import.meta.path === Bun.main) {
  const { strict, useDoctor } = parseArgs(Bun.argv.slice(2));
  const result = await auditBunfig({ strict, useDoctor });
  process.exit(result.exitCode);
}
