// @see https://bun.com/docs/test/index#run-tests
/**
 * Pages Functions bundle import allowlist — functions/ must not pull Bun-only lib paths.
 *
 * @see lib/verification/cloudflare-pages-preflight.ts
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';
import {
  FUNCTIONS_LIB_IMPORT_ALLOWLIST,
  functionsLibImportClosure,
} from '../lib/verification/cloudflare-pages-preflight.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('functions/ lib import graph', () => {
  test('transitive lib/config imports stay on allowlist', async () => {
    const closure = await functionsLibImportClosure(ROOT);
    const allowed = new Set<string>(FUNCTIONS_LIB_IMPORT_ALLOWLIST);
    const unexpected = closure.filter(p => !allowed.has(p));
    expect(unexpected).toEqual([]);
  });

  test('allowlist has no orphan entries (every path is reachable)', async () => {
    const closure = await functionsLibImportClosure(ROOT);
    const reachable = new Set(closure);
    const orphan = FUNCTIONS_LIB_IMPORT_ALLOWLIST.filter(p => !reachable.has(p));
    expect(orphan).toEqual([]);
  });
});
