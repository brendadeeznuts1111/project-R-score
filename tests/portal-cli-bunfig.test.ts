// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');
const STATE = resolvePath(ROOT, 'public/registry/bunfig-state.json');

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  return { code, out, err };
}

describe('bake-bunfig', () => {
  test('bunfig-state.json exists with schema, provenance, and gates', async () => {
    const file = Bun.file(STATE);
    expect(await file.exists()).toBe(true);
    const state = (await file.json()) as {
      schemaVersion: number;
      kind: string;
      keys: Array<{ key: string; source: string; owner: string; drift: boolean }>;
      registry: { prodHost: string };
      scopes: Array<{
        scope: string;
        url: string | null;
        plane: string;
        usedBy: string[];
        tokenEnv: string | null;
      }>;
      gates: { doctor: { ok: boolean }; audit: { ok: boolean } };
      summary: { healthy: boolean; driftKeys: string[] };
    };
    expect(state.schemaVersion).toBe(2);
    expect(state.kind).toBe('bunfig-state');
    // machine-owned keys resolve from machine, project keys from project
    const byKey = new Map(state.keys.map(k => [k.key, k]));
    expect(byKey.get('linker')?.source).toBe('machine');
    expect(byKey.get('minimumReleaseAgeExcludes')?.source).toBe('machine');
    expect(byKey.get('exact')?.source).toBe('project');
    // no drift in a clean tree
    expect(state.summary.driftKeys).toEqual([]);
    // scopes carry URL + token env NAME — never token values
    expect(state.scopes.length).toBeGreaterThan(0);
    expect(JSON.stringify(state)).not.toMatch(/cfat_[A-Za-z0-9]+/);
    for (const s of state.scopes) {
      expect(s.tokenEnv == null || !s.tokenEnv.startsWith('$')).toBe(true);
    }
    // plane + consumer truth (schema v2): @factorywager is the dev-plane scope with workspace consumers
    expect(state.registry.prodHost).toBe('registry.factory-wager.com');
    const fw = state.scopes.find(s => s.scope === '@factorywager');
    expect(fw?.plane).toBe('dev');
    expect(fw?.usedBy).toContain('@factorywager/rip');
    const prod = state.scopes.find(s => s.scope === '@factorywager-prod');
    expect(prod?.plane).toBe('prod');
  });
});

describe('portal-cli bunfig', () => {
  test('bunfig status prints provenance table', async () => {
    const { code, out } = await run(['bunfig', 'status']);
    expect(code).toBe(0);
    expect(out.includes('bunfig-state')).toBe(true);
    expect(out.includes('minimumReleaseAgeExcludes')).toBe(true);
    expect(out.includes('registry scopes')).toBe(true);
    expect(out.includes('machine')).toBe(true);
  });

  test('bunfig status --json is parseable and matches the bake', async () => {
    const { code, out } = await run(['bunfig', 'status', '--json']);
    expect(code).toBe(0);
    const state = JSON.parse(out) as { kind: string; keys: unknown[] };
    expect(state.kind).toBe('bunfig-state');
    expect(Array.isArray(state.keys)).toBe(true);
  });

  test('bunfig check runs the strict audit and exits 0 when aligned', async () => {
    const { code } = await run(['bunfig', 'check']);
    expect(code).toBe(0);
  });

  test('bunfig rejects unknown subcommands and flags', async () => {
    const bad1 = await run(['bunfig', 'wat']);
    expect(bad1.code).not.toBe(0);
    const bad2 = await run(['bunfig', 'status', '--wat']);
    expect(bad2.code).not.toBe(0);
    expect(
      bad2.err.includes('Unknown bunfig status flag') || bad2.err.includes('Unknown long option')
    ).toBe(true);
  });
});
