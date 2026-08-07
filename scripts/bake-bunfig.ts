#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bake-bunfig.ts — bake bunfig configuration reality → public/registry/bunfig-state.json
 *
 * Reads machine ~/.bunfig.toml + project ./bunfig.toml, computes the effective
 * merge (Bun precedence: project overlays machine), records per-key provenance,
 * and captures the two enforcement gates:
 *   kimi-doctor --gate bunfig-policy   (machine SSOT values)
 *   bash scripts/audit-bunfig.sh --strict   (no workspace duplication)
 *
 *   bun run bunfig:bake          # write public/registry/bunfig-state.json
 *   bun run bunfig:bake -- --check   # fail if drift vs SSOT or audit fails
 *
 * Values only — no tokens; scope entries record url + token-env NAME, never values.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { homedir } from 'node:os';
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import { resolvePath } from './lib/fs-bun';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('bunfig:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const MACHINE_PATH = `${homedir()}/.bunfig.toml`;
const PROJECT_PATH = resolvePath(ROOT, 'bunfig.toml');
const OUT_PATH = resolvePath(ROOT, 'public/registry/bunfig-state.json');
const CHECK = argv.includes('--check');

/** Keys whose provenance the bake tracks (machine-owned policy + project surface). */
const TRACKED_INSTALL_KEYS = [
  'linker',
  'globalStore',
  'frozenLockfile',
  'minimumReleaseAge',
  'minimumReleaseAgeExcludes',
  'exact',
  'saveTextLockfile',
] as const;

/** Machine-owned per docs/UNIFIED.md — a project assignment here is drift. */
const MACHINE_OWNED = new Set([
  'linker',
  'globalStore',
  'minimumReleaseAge',
  'minimumReleaseAgeExcludes',
]);

type TomlTable = Record<string, unknown>;

async function readToml(path: string): Promise<TomlTable | null> {
  try {
    return (Bun.TOML.parse(await Bun.file(path).text()) ?? null) as TomlTable | null;
  } catch {
    return null;
  }
}

async function runGate(cmd: string[]): Promise<{ code: number; tail: string }> {
  try {
    const proc = Bun.spawn(cmd, {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = (await proc.exited) ?? 1;
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
    return { code, tail: out.trim().split('\n').slice(-4).join('\n') };
  } catch (e) {
    return { code: 127, tail: e instanceof Error ? e.message : String(e) };
  }
}

function provenance(
  machine: TomlTable | null,
  project: TomlTable | null
): Array<{
  key: string;
  machine: unknown;
  project: unknown;
  effective: unknown;
  source: 'machine' | 'project' | 'unset';
  owner: 'machine' | 'project';
  drift: boolean;
}> {
  const mi = (machine?.install ?? {}) as TomlTable;
  const pi = (project?.install ?? {}) as TomlTable;
  return TRACKED_INSTALL_KEYS.map(key => {
    const m = mi[key];
    const p = pi[key];
    const hasM = m !== undefined;
    const hasP = p !== undefined;
    const owner = MACHINE_OWNED.has(key) ? 'machine' : 'project';
    return {
      key,
      machine: hasM ? m : null,
      project: hasP ? p : null,
      effective: hasP ? p : hasM ? m : null,
      source: hasP ? 'project' : hasM ? 'machine' : 'unset',
      owner,
      // drift = project assigns a machine-owned key (mirror or subset — both replace)
      drift: owner === 'machine' && hasP,
    };
  });
}

async function main(): Promise<void> {
  const machine = await readToml(MACHINE_PATH);
  const project = await readToml(PROJECT_PATH);
  if (!machine) console.error(`⚠ machine bunfig unreadable: ${MACHINE_PATH}`);
  if (!project) console.error(`⚠ project bunfig unreadable: ${PROJECT_PATH}`);

  const keys = provenance(machine, project);

  // Registry scopes: record URL + token env var NAME only — never resolved values.
  // plane: dev = loopback URL (this machine's local registry); prod = remote host.
  // usedBy: workspace packages whose name carries the scope prefix (packages/*, lib/*).
  const workspaceNames: string[] = [];
  for (const pkgGlob of ['packages/*/package.json', 'lib/*/package.json']) {
    for await (const f of new Bun.Glob(pkgGlob).scan({ cwd: ROOT, absolute: false })) {
      try {
        const name = ((await Bun.file(`${ROOT}/${f}`).json()) as { name?: string }).name;
        if (name) workspaceNames.push(name);
      } catch {
        /* skip */
      }
    }
  }
  const scopeUrl = (v: { url?: unknown }): string | null =>
    typeof v.url === 'string' ? v.url : null;
  const scopes = Object.entries((project?.install as TomlTable | undefined)?.scopes ?? {}).map(
    ([scope, v]) => {
      const url = scopeUrl(v);
      return {
        scope,
        url,
        plane: url && /localhost|127\.0\.0\.1/.test(url) ? 'dev' : 'prod',
        usedBy: workspaceNames.filter(n => n.startsWith(`${scope}/`)).sort(),
        tokenEnv:
          typeof (v as TomlTable)?.token === 'string'
            ? String((v as TomlTable).token).replace(/^\$/, '')
            : null,
      };
    }
  );

  const scanner =
    ((project?.install as TomlTable | undefined)?.security as TomlTable | undefined)?.scanner ??
    null;

  const doctor = await runGate(['kimi-doctor', '--gate', 'bunfig-policy']);
  const audit = await runGate(['bash', 'scripts/audit-bunfig.sh', '--strict']);

  const state = {
    schemaVersion: 2,
    kind: 'bunfig-state',
    generatedAt: new Date().toISOString(),
    paths: { machine: MACHINE_PATH, project: 'bunfig.toml' },
    cacheDir:
      ((machine?.install as TomlTable | undefined)?.cache as TomlTable | undefined)?.dir ?? null,
    /** Production registry host (SSOT: config/r2-env.ts) — dev scopes point at loopback. */
    registry: { prodHost: CLOUDFLARE_DEFAULTS.registryHost },
    keys,
    scopes,
    securityScanner: scanner,
    gates: {
      doctor: { ok: doctor.code === 0, exitCode: doctor.code, tail: doctor.tail },
      audit: { ok: audit.code === 0, exitCode: audit.code, tail: audit.tail },
    },
    summary: {
      trackedKeys: keys.length,
      driftKeys: keys.filter(k => k.drift).map(k => k.key),
      healthy:
        doctor.code === 0 &&
        audit.code === 0 &&
        keys.every(k => !k.drift) &&
        !!machine &&
        !!project,
    },
  };

  const { mkdirSync } = await import('node:fs');
  mkdirSync(resolvePath(ROOT, 'public/registry'), { recursive: true });
  await Bun.write(OUT_PATH, JSON.stringify(state, null, 2) + '\n');
  console.log(`→ public/registry/bunfig-state.json`);
  console.log(
    `bunfig-state  doctor=${state.gates.doctor.ok ? 'ok' : 'FAIL'}  audit=${state.gates.audit.ok ? 'ok' : 'FAIL'}  drift=${state.summary.driftKeys.join(',') || 'none'}  healthy=${state.summary.healthy}`
  );

  if (CHECK && !state.summary.healthy) {
    console.error('❌ bunfig-state check failed — see gates in public/registry/bunfig-state.json');
    process.exit(1);
  }
}

if (isModuleEntrypoint(import.meta)) await main();
