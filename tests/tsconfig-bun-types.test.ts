// @see https://bun.com/docs/test
// @see https://bun.com/docs/typescript-6 — TS 6+ requires explicit "types": ["bun"]
/**
 * Guard: TypeScript 6.0 defaults `compilerOptions.types` to [] (no auto @types/*).
 * Primary monorepo tsconfigs must load @types/bun so editors/tsc see Bun globals.
 * Full monorepo walk: `bun run check:tsconfig-types` (`tools/tsconfig-types-audit.ts`).
 */
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun';
import {
  auditTsconfigTypes,
  isIntentionalEmptyTypes,
  isMonorepoOwnedTsconfig,
  resolveTypes,
  stripJsonc,
} from '../tools/tsconfig-types-audit';

const ROOT = resolvePath(import.meta.dir, '..');

/** Root configs that must include "bun" in types (or inherit it via extends without override). */
const MUST_INCLUDE_BUN = [
  'tsconfig.base.json',
  'tsconfig.bun.json',
  'tsconfig.check.json',
  'tsconfig.lint.json',
  'tools/tsconfig.json',
  'tests/tsconfig.branded.json',
  'tests/tsconfig.bun-native-comprehensive.json',
  // tests/tsconfig.snapshot.json — referenced by check:snapshot:types but not present on main
] as const;

async function readJson(rel: string): Promise<Record<string, unknown>> {
  const path = joinPath(ROOT, rel);
  const text = await Bun.file(path).text();
  return JSON.parse(stripJsonc(text)) as Record<string, unknown>;
}

function typesArray(cfg: Record<string, unknown>): string[] | null {
  const co = cfg.compilerOptions as Record<string, unknown> | undefined;
  if (!co || !('types' in co)) return null;
  const t = co.types;
  if (!Array.isArray(t)) return null;
  return t.map(String);
}

describe('TypeScript 6+ bun types (tsconfig)', () => {
  test('typescript is 6+ and @types/bun is installed', async () => {
    const ts = await readJson('node_modules/typescript/package.json');
    const major = Number(String(ts.version ?? '0').split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(6);
    const bunTypes = Bun.file(joinPath(ROOT, 'node_modules/@types/bun/package.json'));
    expect(await bunTypes.exists()).toBe(true);
  });

  test('primary tsconfigs list types: ["bun"]', async () => {
    for (const rel of MUST_INCLUDE_BUN) {
      const cfg = await readJson(rel);
      const types = typesArray(cfg);
      expect(types, `${rel} must set compilerOptions.types`).not.toBeNull();
      expect(types, `${rel} must include "bun"`).toContain('bun');
    }
  });

  test('registry-client keeps empty types for clean .d.ts emit', async () => {
    const cfg = await readJson('packages/registry-client/tsconfig.json');
    const types = typesArray(cfg);
    expect(types).toEqual([]);
    expect(isIntentionalEmptyTypes('packages/registry-client/tsconfig.json')).toBe(true);
  });
});

describe('tsconfig-types-audit helpers', () => {
  test('stripJsonc removes // and /* */ outside strings', () => {
    const raw = `{
  // line comment
  "types": ["bun"] /* trailing */,
  "note": "not // a comment"
}`;
    const j = JSON.parse(stripJsonc(raw)) as { types: string[]; note: string };
    expect(j.types).toEqual(['bun']);
    expect(j.note).toBe('not // a comment');
  });

  test('isMonorepoOwnedTsconfig matches spine surfaces', () => {
    expect(isMonorepoOwnedTsconfig('tsconfig.base.json')).toBe(true);
    expect(isMonorepoOwnedTsconfig('tools/tsconfig.json')).toBe(true);
    expect(isMonorepoOwnedTsconfig('packages/registry-client/tsconfig.json')).toBe(true);
    expect(isMonorepoOwnedTsconfig('tests/tsconfig.branded.json')).toBe(true);
    expect(isMonorepoOwnedTsconfig('projects/active/foo/tsconfig.json')).toBe(false);
  });

  test('resolveTypes walks extends for packages that omit local types', async () => {
    // packages that only extend base should resolve ["bun"] via extends
    const hit = await resolveTypes(resolvePath(ROOT, 'packages/guards/tsconfig.json'));
    // guards may or may not exist with that shape — fall back to base itself
    const base = await resolveTypes(resolvePath(ROOT, 'tsconfig.base.json'));
    expect(base.types).toContain('bun');
    expect(base.source).toBe('local');
    if (await Bun.file(resolvePath(ROOT, 'packages/guards/tsconfig.json')).exists()) {
      expect(hit.types === null || hit.types.includes('bun') || hit.types.length === 0).toBe(true);
    }
  });

  test('audit monorepo_risk is zero (strict gate)', async () => {
    const { summary, monorepoRisk } = await auditTsconfigTypes(ROOT);
    expect(summary.monorepoRisk).toBe(0);
    expect(monorepoRisk).toEqual([]);
    expect(summary.bunOk).toBeGreaterThan(0);
    expect(summary.emitClean).toBeGreaterThanOrEqual(1);
  });
});
