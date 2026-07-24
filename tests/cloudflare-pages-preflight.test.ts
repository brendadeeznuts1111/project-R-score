// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';
import {
  FUNCTIONS_LIB_IMPORT_ALLOWLIST,
  functionsLibImportClosure,
  runCloudflarePagesPreflight,
} from '../lib/verification/cloudflare-pages-preflight.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('cloudflare-pages-preflight', () => {
  test('import closure matches allowlist exactly', async () => {
    const closure = await functionsLibImportClosure(ROOT);
    expect(closure.sort()).toEqual([...FUNCTIONS_LIB_IMPORT_ALLOWLIST].sort());
  });

  test('preflight report has expected step ids', async () => {
    const report = await runCloudflarePagesPreflight({
      rootDir: ROOT,
      edgeSafetyTest: false,
    });
    const ids = report.steps.map(s => s.id);
    expect(ids).toContain('well-known-mcp-parity');
    expect(ids).toContain('cloudflare-token-static');
    expect(ids).toContain('functions-import-graph');
    expect(ids).toContain('proof-taxonomy-audit');
    expect(report.commands.deployVerify).toBe('bun run cloudflare:deploy:verify');
  });
});
