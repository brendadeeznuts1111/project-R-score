// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const SOURCE = joinPath(ROOT, 'public/portal/style.css');

describe('portal CSS Bun.build', () => {
  test('Bun.build lowers portal style.css', async () => {
    const outdir = joinPath(ROOT, 'tmp/portal-css-build-test');
    await Bun.$`rm -rf ${outdir}`.quiet();

    const result = await Bun.build({
      entrypoints: [SOURCE],
      outdir,
      naming: 'style.css',
      minify: false,
    });

    expect(result.success).toBe(true);
    expect(result.outputs.length).toBeGreaterThanOrEqual(1);

    const css = await Bun.file(joinPath(outdir, 'style.css')).text();
    // Multi-arg :lang() lowered for older engines
    expect(css).toMatch(/:lang\(ar\)|:is\(:lang\(ar\)/);
    // Nesting flattened
    expect(css).toContain('.nav-overflow');
    expect(css).toContain('.nav-more');
  });
});
