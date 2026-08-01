// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  boardHtmlRelPath,
  collectElementIds,
  runGlossaryVerify,
  verifyDomIds,
  verifySectionHashes,
  type GlossaryBake,
} from '../tools/glossary-verify.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('glossary-verify', () => {
  test('boardHtmlRelPath maps surface path to public index.html', () => {
    expect(boardHtmlRelPath('/portal/limits/')).toBe(
      joinPath('public', 'portal/limits/', 'index.html')
    );
    expect(boardHtmlRelPath('portal/account')).toBe(
      joinPath('public', 'portal/account/', 'index.html')
    );
  });

  test('collectElementIds scrapes ids including colon-bearing section: ids', async () => {
    const html = `<!doctype html><html><body>
      <div id="plain"></div>
      <section id="section:telegram"></section>
      <div id="ad-section-identity"></div>
    </body></html>`;
    const ids = await collectElementIds(html);
    expect(ids.has('plain')).toBe(true);
    expect(ids.has('section:telegram')).toBe(true);
    expect(ids.has('ad-section-identity')).toBe(true);
    expect(ids.has('missing')).toBe(false);
  });

  test('verifySectionHashes counts ok/fail for URLPattern round-trip', () => {
    const ok = verifySectionHashes([
      {
        path: '/portal/limits/',
        sections: [{ hash: 'account-control' }, { hash: 'prediction' }],
      },
    ]);
    expect(ok.hashOk).toBe(2);
    expect(ok.hashFail).toBe(0);

    // Empty hash skipped; still ok count only real hashes
    const skip = verifySectionHashes([
      { path: '/x/', sections: [{ hash: '' }, {}] },
    ]);
    expect(skip.hashOk + skip.hashFail).toBe(0);
  });

  test('verifyDomIds reports missing-id and missing-file', async () => {
    const tmp = joinPath(ROOT, '.tmp-glossary-verify-test');
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/public/portal/limits`.quiet();
    await Bun.write(
      joinPath(tmp, 'public/portal/limits/index.html'),
      '<!doctype html><html><body><section id="account-control"></section></body></html>'
    );

    const result = await verifyDomIds(
      [
        {
          path: '/portal/limits/',
          sections: [
            { hash: 'account-control', domId: 'account-control' },
            { hash: 'prediction', domId: 'prediction' },
          ],
        },
        {
          path: '/portal/missing-board/',
          sections: [{ hash: 'x', domId: 'x' }],
        },
      ],
      tmp
    );

    expect(result.domOk).toBe(1);
    expect(result.domFail).toBe(2);
    expect(result.misses.some(m => m.reason === 'missing-id' && m.domId === 'prediction')).toBe(
      true
    );
    expect(result.misses.some(m => m.reason === 'missing-file')).toBe(true);

    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('committed domain-glossary board mounts all resolve in public HTML', async () => {
    const result = await runGlossaryVerify({ root: ROOT, json: false });
    expect(result.schemaVersion).toBe(3);
    expect(result.hash.hashFail).toBe(0);
    expect(result.dom.domFail).toBe(0);
    expect(result.dom.domOk).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  test('runGlossaryVerify exits 1 when DOM id missing (fixture bake)', async () => {
    const bake: GlossaryBake = {
      schemaVersion: 3,
      surfaces: [
        {
          path: '/portal/limits/',
          sections: [{ hash: 'nope', domId: 'this-id-does-not-exist-xyz' }],
        },
      ],
    };
    const result = await runGlossaryVerify({ root: ROOT, glossary: bake, json: false });
    expect(result.dom.domFail).toBe(1);
    expect(result.exitCode).toBe(1);
  });
});
