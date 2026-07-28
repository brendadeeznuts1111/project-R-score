// @see https://bun.com/docs/test
// @see https://bun.com/docs/typescript-6 — TS 6+ requires explicit "types": ["bun"]
/**
 * Guard: TypeScript 6.0 defaults `compilerOptions.types` to [] (no auto @types/*).
 * Primary monorepo tsconfigs must load @types/bun so editors/tsc see Bun globals.
 */
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

/** Root configs that must include "bun" in types (or inherit it via extends without override). */
const MUST_INCLUDE_BUN = [
  'tsconfig.base.json',
  'tsconfig.bun.json',
  'tsconfig.check.json',
  'tsconfig.lint.json',
  'tools/tsconfig.json',
  'tests/tsconfig.branded.json',
  'tests/tsconfig.snapshot.json',
] as const;

/** Strip line and block comments so we can parse tsconfig JSONC. */
function stripJsonc(text: string): string {
  let out = '';
  let i = 0;
  let inStr = false;
  let strQ = '';
  while (i < text.length) {
    const c = text[i]!;
    const n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < text.length) {
        out += text[i + 1]!;
        i += 2;
        continue;
      }
      if (c === strQ) inStr = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strQ = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

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
  });
});
