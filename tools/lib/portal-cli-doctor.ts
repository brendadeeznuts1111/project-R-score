// @see https://bun.com/docs/pm/isolated-installs — configVersion + linker defaults
// @see https://bun.com/docs/pm/cli/install#default-strategy — lockfile configVersion
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * portal-cli doctor — unified offline health gate for portal control plane.
 *
 * Fast pure checks by default (no network). Linker policy is mandatory:
 *   bun.lock configVersion must be 1 for this workspace monorepo.
 *
 *   portal-cli doctor
 *   portal-cli doctor --json
 *   portal-cli doctor --full   # also spawns vault/capabilities/scanner light probes
 *
 * @see lib/docs/bun-install-linker-docs.ts
 * @see scripts/verify-install-cache.ts (install:verify)
 */

import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  INSTALL_LINKER_DOCS,
  probeLockfileConfigVersion,
} from '../../lib/docs/bun-install-linker-docs.ts';
import {
  readMachineBunfig,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
} from '../../scripts/lib/machine-bunfig.ts';

export type PortalDoctorLevel = 'fatal' | 'warn' | 'info';

export type PortalDoctorCheck = {
  id: string; // brand-ok — check id enum-like opaque key (linker-config-version, …)
  level: PortalDoctorLevel;
  ok: boolean;
  message: string;
  source?: string;
};

export type PortalDoctorReport = {
  kind: 'portal-cli-doctor';
  schemaVersion: 1;
  ok: boolean;
  full: boolean;
  generatedAt: string;
  checks: PortalDoctorCheck[];
  docs: {
    isolatedInstalls: string;
    defaultStrategy: string;
  };
};

export type PortalDoctorOpts = {
  cwd?: string;
  full?: boolean;
  /** Inject spawn for tests */
  spawn?: (argv: string[], opts?: { cwd?: string }) => Promise<number>;
};

async function defaultSpawn(argv: string[], opts?: { cwd?: string }): Promise<number> {
  const proc = Bun.spawn(argv, {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  return (await proc.exited) ?? 1;
}

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

/**
 * Linker policy check — text lockfile configVersion must be 1 for monorepo.
 * Uses the same probe as install:verify / install-platform.
 */
export async function checkLinkerConfigVersion(cwd: string): Promise<PortalDoctorCheck> {
  const probe = await probeLockfileConfigVersion(cwd);
  return {
    id: 'linker-config-version',
    level: 'fatal',
    ok: probe.ok,
    message: probe.note,
    source: INSTALL_LINKER_DOCS.installDefaultStrategy,
  };
}

export async function checkMachineIsolatedLinker(cwd: string): Promise<PortalDoctorCheck> {
  const eff = resolveEffectiveInstallPolicy(
    await readProjectBunfig(cwd),
    await readMachineBunfig()
  );
  const ok = eff.linker === 'isolated';
  return {
    id: 'machine-isolated-linker',
    level: 'fatal',
    ok,
    message: ok
      ? `linker=${eff.linker} (source=${eff.source.linker}) · globalStore=${String(eff.globalStore)}`
      : `linker=${eff.linker ?? 'unset'} — monorepo requires isolated (machine ~/.bunfig.toml)`,
    source: INSTALL_LINKER_DOCS.bunfigLinker,
  };
}

export async function runPortalDoctor(opts: PortalDoctorOpts = {}): Promise<PortalDoctorReport> {
  const cwd = opts.cwd ?? process.cwd();
  const full = Boolean(opts.full);
  const spawn = opts.spawn ?? defaultSpawn;
  const checks: PortalDoctorCheck[] = [];

  // 1) Linker policy (mandatory, pure)
  checks.push(await checkLinkerConfigVersion(cwd));
  checks.push(await checkMachineIsolatedLinker(cwd));

  // 2) Offline artifact presence (vault / capabilities / bunfig bake)
  const vaultHealth = joinPath(cwd, 'public/registry/vault-health.json');
  checks.push({
    id: 'vault-health-bake',
    level: 'warn',
    ok: await fileExists(vaultHealth),
    message: (await fileExists(vaultHealth))
      ? 'public/registry/vault-health.json present'
      : 'vault-health bake missing — bun run vault:health:bake (needs pass session)',
  });

  const capSubset = joinPath(cwd, 'public/registry/capability-map-subset.json');
  checks.push({
    id: 'capability-map-subset',
    level: 'warn',
    ok: await fileExists(capSubset),
    message: (await fileExists(capSubset))
      ? 'public/registry/capability-map-subset.json present'
      : 'capability-map-subset missing — bun run bake:capabilities',
  });

  const bunfigState = joinPath(cwd, 'public/registry/bunfig-state.json');
  checks.push({
    id: 'bunfig-state-bake',
    level: 'info',
    ok: await fileExists(bunfigState),
    message: (await fileExists(bunfigState))
      ? 'public/registry/bunfig-state.json present'
      : 'bunfig-state bake missing — bun run bunfig:bake (optional)',
  });

  // 3) Optional full: spawn existing gates (no network assumed)
  if (full) {
    const installVerify = await spawn(['bun', 'run', 'install:verify'], { cwd });
    checks.push({
      id: 'install-verify',
      level: 'fatal',
      ok: installVerify === 0,
      message: installVerify === 0 ? 'bun run install:verify OK' : 'bun run install:verify FAILED',
    });

    const vaultGate = await spawn(['bun', 'test', 'tests/vault-health.test.ts'], { cwd });
    checks.push({
      id: 'vault-health-gate',
      level: 'fatal',
      ok: vaultGate === 0,
      message:
        vaultGate === 0 ? 'portal-cli vault health (offline snap) OK' : 'vault-health tests FAILED',
    });

    const capGate = await spawn(['bun', 'test', 'tests/capability-map-subset.test.ts'], { cwd });
    checks.push({
      id: 'capabilities-health-gate',
      level: 'fatal',
      ok: capGate === 0,
      message:
        capGate === 0
          ? 'capabilities health (subset tests) OK'
          : 'capability-map-subset tests FAILED',
    });
  }

  // Default mode: only fatal failures fail the doctor; warns are advisory
  const ok = checks.filter(c => c.level === 'fatal').every(c => c.ok);

  return {
    kind: 'portal-cli-doctor',
    schemaVersion: 1,
    ok,
    full,
    generatedAt: new Date().toISOString(),
    checks,
    docs: {
      isolatedInstalls: INSTALL_LINKER_DOCS.isolatedInstalls,
      defaultStrategy: INSTALL_LINKER_DOCS.installDefaultStrategy,
    },
  };
}

export function formatPortalDoctor(r: PortalDoctorReport): string {
  const lines = [`portal doctor  ${r.ok ? 'OK' : 'FAIL'}${r.full ? ' (full)' : ''}`, ''];
  for (const c of r.checks) {
    const mark = c.ok ? '✓' : c.level === 'info' ? '·' : '✗';
    lines.push(`  ${mark} [${c.level}] ${c.id}: ${c.message}`);
  }
  lines.push('');
  lines.push(`Isolated installs: ${r.docs.isolatedInstalls}`);
  lines.push(`Default strategy:  ${r.docs.defaultStrategy}`);
  lines.push('');
  lines.push(
    'Related: portal-cli vault health · capabilities health · scanner doctor · bunfig check'
  );
  lines.push('         bun run install:verify · portal-cli doctor --full');
  return lines.join('\n');
}
