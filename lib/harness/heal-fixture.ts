// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Sandboxed maintenance-loop fixture for the E2E heal journey.
 *
 * Not a SPINE_TENANTS entry — production daemon stays untouched. The journey
 * copies tests/fixtures/tenant-heal into a cache dir, breaks health, detects
 * the signal, runs intervention, and re-proves green.
 *
 * @see ../../docs/harness/spine-tenants.md
 * @see ../../tests/journey/tenant-heal.test.ts
 */

export const HEAL_FIXTURE_TENANT = 'heal-fixture';

export type HealScenario = {
  tenant: typeof HEAL_FIXTURE_TENANT;
  /** Probe that should exit non-zero when broken */
  checkCommand: (dir: string) => string;
  /** Repair command that restores health */
  interventionCommand: (dir: string) => string;
  /** Deliberate failure injector */
  breakCommand: (dir: string) => string;
};

export const HEAL_SCENARIO: HealScenario = {
  tenant: HEAL_FIXTURE_TENANT,
  checkCommand: dir => `bun scripts/tenant-heal-fixture.ts check --dir=${dir}`,
  interventionCommand: dir => `bun scripts/tenant-heal-fixture.ts fix --dir=${dir}`,
  breakCommand: dir => `bun scripts/tenant-heal-fixture.ts break --dir=${dir}`,
};

export type HealthState = {
  ok: boolean;
  label?: string;
};

const HEALTH_FILE = 'health.json';

export function healthPath(dir: string): string {
  return `${dir.replace(/\/$/, '')}/${HEALTH_FILE}`;
}

export async function readHealth(dir: string): Promise<HealthState | undefined> {
  const file = Bun.file(healthPath(dir));
  if (!(await file.exists())) return undefined;
  try {
    return (await file.json()) as HealthState;
  } catch {
    return undefined;
  }
}

export async function writeHealth(dir: string, state: HealthState): Promise<void> {
  await Bun.write(healthPath(dir), `${JSON.stringify(state, null, 2)}\n`);
}

/** Exit 0 when health.ok === true; otherwise 1. */
export async function checkHealth(dir: string): Promise<number> {
  const state = await readHealth(dir);
  if (!state?.ok) return 1;
  return 0;
}

export async function breakHealth(dir: string): Promise<void> {
  const prev = (await readHealth(dir)) ?? { ok: true, label: HEAL_FIXTURE_TENANT };
  await writeHealth(dir, { ...prev, ok: false });
}

export async function fixHealth(dir: string): Promise<void> {
  const prev = (await readHealth(dir)) ?? { label: HEAL_FIXTURE_TENANT };
  await writeHealth(dir, { ...prev, ok: true, label: prev.label ?? HEAL_FIXTURE_TENANT });
}

export async function runHealArgv(
  cmd: string,
  cwd: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  const argv = cmd.trim().split(/\s+/).filter(Boolean);
  const proc = Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

/**
 * Full loop: healthy → break → signal fails → intervene → proof passes.
 * `workspace` must already contain a health.json (copy of the fixture).
 */
export async function runHealLoop(
  root: string,
  workspace: string
): Promise<{ ok: boolean; steps: string[] }> {
  const steps: string[] = [];
  const check = HEAL_SCENARIO.checkCommand(workspace);
  const brk = HEAL_SCENARIO.breakCommand(workspace);
  const fix = HEAL_SCENARIO.interventionCommand(workspace);

  let r = await runHealArgv(check, root);
  steps.push(`baseline check exit ${r.code}`);
  if (r.code !== 0) return { ok: false, steps };

  r = await runHealArgv(brk, root);
  steps.push(`break exit ${r.code}`);
  if (r.code !== 0) return { ok: false, steps };

  r = await runHealArgv(check, root);
  steps.push(`signal-detected exit ${r.code}`);
  if (r.code === 0) return { ok: false, steps };

  r = await runHealArgv(fix, root);
  steps.push(`intervention exit ${r.code}`);
  if (r.code !== 0) return { ok: false, steps };

  r = await runHealArgv(check, root);
  steps.push(`recovery check exit ${r.code}`);
  if (r.code !== 0) return { ok: false, steps };

  return { ok: true, steps };
}
