// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');

/**
 * Fixture CSS: exercises :lang() + nesting lowering without site-root absolute
 * `url("/icons/…")` paths. Bun.build resolves those as file paths and fails
 * (production CSS correctly uses root-absolute URLs for static hosting).
 */
const FIXTURE = `
:root { --accent: #58a6ff; }
:lang(ar, he) { direction: rtl; }
.nav-overflow {
  .nav-more { display: flex; }
}
`;

describe('portal CSS Bun.build', () => {
  test('Bun.build lowers portal style.css features (:lang + nesting)', async () => {
    const outdir = joinPath(ROOT, 'tmp/portal-css-build-test');
    const entry = joinPath(outdir, 'fixture.css');
    await Bun.$`rm -rf ${outdir}`.quiet();
    await Bun.$`mkdir -p ${outdir}`.quiet();
    await Bun.write(entry, FIXTURE);

    const result = await Bun.build({
      entrypoints: [entry],
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
