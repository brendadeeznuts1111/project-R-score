/**
 * Prove AST --define DEBUG=false participates in DCE for the root build contract.
 *
 * @see https://bun.com/docs/guides/runtime/define-constant
 */
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const FIXTURE = joinPath(ROOT, 'tests/fixtures/define-debug-sample.ts');

describe('build:defines contract', () => {
  test('DEBUG=false folds away debug branch text', async () => {
    const result = await Bun.build({
      entrypoints: [FIXTURE],
      target: 'bun',
      minify: { syntax: true },
      define: {
        DEBUG: 'false',
      },
    });
    expect(result.success).toBe(true);
    const text = (await Promise.all(result.outputs.map(o => o.text()))).join('\n');
    expect(text).not.toContain('DEBUG_PATH_MARKER');
    expect(text).toContain('RELEASE_PATH_MARKER');
  });

  test('DEBUG=true keeps debug branch', async () => {
    const result = await Bun.build({
      entrypoints: [FIXTURE],
      target: 'bun',
      minify: { syntax: true },
      define: {
        DEBUG: 'true',
      },
    });
    expect(result.success).toBe(true);
    const text = (await Promise.all(result.outputs.map(o => o.text()))).join('\n');
    expect(text).toContain('DEBUG_PATH_MARKER');
  });
});
