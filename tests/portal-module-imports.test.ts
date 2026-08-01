// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';

/**
 * Import smoke for logic-only portal modules.
 *
 * Motivation: #149 shipped public/portal/scripts/glossary-router.js with a
 * top-level `new URLPattern` that Chrome accepted but Bun's parser rejected —
 * every Bun-side consumer (bun:test, tools) crashed at import while the
 * browser page looked fine. If a module is listed here, it must stay
 * import-safe in Bun: no DOM access at module top level.
 *
 * When you add a logic-only module under public/portal/, add it to the list.
 * Modules that touch `document`/`window` at import time do NOT belong here.
 */
const LOGIC_ONLY_MODULES: ReadonlyArray<readonly [path: string, requiredExport: string]> = [
  ['../public/portal/search.js', 'parseHashState'],
  ['../public/portal/navigation.js', 'markCurrentNavigation'],
  ['../public/portal/components/sidebar.js', 'resolveTenantId'],
  ['../public/portal/scripts/glossary-router.js', 'parseGlossaryHash'],
];

describe('portal module import smoke', () => {
  for (const [path, requiredExport] of LOGIC_ONLY_MODULES) {
    test(`${path} imports in Bun and exports ${requiredExport}`, async () => {
      const mod = await import(path);
      expect(typeof mod[requiredExport]).toBe('function');
    });
  }
});
