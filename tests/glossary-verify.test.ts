// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  boardHtmlRelPath,
  collectElementIds,
  diffDomIds,
  isSectionShapedDomId,
  runGlossaryVerify,
  scrapeElementIds,
  verifyDomIds,
  verifySectionHashes,
  verifySectionTitles,
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

  test('isSectionShapedDomId distinguishes mounts from chrome', () => {
    expect(isSectionShapedDomId('section:telegram')).toBe(true);
    expect(isSectionShapedDomId('ad-section-identity')).toBe(true);
    expect(isSectionShapedDomId('account-control')).toBe(false);
    expect(isSectionShapedDomId('tenant-sidebar')).toBe(false);
  });

  test('scrapeElementIds scrapes colon ids and detects duplicates', async () => {
    const html = `<!doctype html><html><body>
      <div id="plain"></div>
      <section id="section:telegram"></section>
      <div id="section:telegram"></div>
      <div id="ad-section-identity"></div>
    </body></html>`;
    const scrape = await scrapeElementIds(html);
    expect(scrape.unique.has('section:telegram')).toBe(true);
    expect(scrape.duplicates).toContain('section:telegram');
    expect(scrape.counts.get('section:telegram')).toBe(2);

    const ids = await collectElementIds(html);
    expect(ids.has('ad-section-identity')).toBe(true);
  });

  test('diffDomIds classifies missing, duplicates, section vs chrome orphans', async () => {
    const scrape = await scrapeElementIds(`<!doctype html><body>
      <div id="account-control"></div>
      <div id="account-control"></div>
      <section id="section:stale"></section>
      <nav id="tenant-sidebar"></nav>
    </body>`);
    const diff = diffDomIds(['account-control', 'prediction'], scrape);
    expect(diff.present).toEqual(['account-control']);
    expect(diff.missing).toEqual(['prediction']);
    expect(diff.duplicates.map(d => d.domId)).toContain('account-control');
    expect(diff.sectionOrphans).toContain('section:stale');
    expect(diff.chromeOrphans).toContain('tenant-sidebar');
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

    const skip = verifySectionHashes([{ path: '/x/', sections: [{ hash: '' }, {}] }]);
    expect(skip.hashOk + skip.hashFail).toBe(0);
  });

  test('verifySectionTitles requires non-empty title on bake mounts', () => {
    const ok = verifySectionTitles([
      {
        path: '/portal/limits/',
        sections: [
          { hash: 'a', domId: 'a', title: 'Account control' },
          { hash: 'b', domId: 'b', title: '  Prediction  ' },
        ],
      },
    ]);
    expect(ok.titleOk).toBe(2);
    expect(ok.titleFail).toBe(0);

    const bad = verifySectionTitles([
      {
        path: '/portal/limits/',
        sections: [
          { hash: 'a', domId: 'a', title: 'Ok' },
          { hash: 'b', domId: 'b' },
          { hash: 'c', domId: 'c', title: '   ' },
        ],
      },
    ]);
    expect(bad.titleOk).toBe(1);
    expect(bad.titleFail).toBe(2);
    expect(bad.failures.some(f => f.includes('#b'))).toBe(true);
  });

  test('verifyDomIds reports missing-id, missing-file, and duplicates', async () => {
    const tmp = joinPath(ROOT, '.tmp-glossary-verify-test');
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/public/portal/limits`.quiet();
    await Bun.write(
      joinPath(tmp, 'public/portal/limits/index.html'),
      `<!doctype html><html><body>
        <section id="account-control"></section>
        <section id="account-control"></section>
        <section id="section:orphan"></section>
      </body></html>`
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
    expect(result.duplicates.some(d => d.domId === 'account-control' && d.count === 2)).toBe(true);
    expect(result.sectionOrphans.some(o => o.domId === 'section:orphan')).toBe(true);

    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('committed domain-glossary board mounts all resolve without dups', async () => {
    const result = await runGlossaryVerify({ root: ROOT, json: false });
    expect(result.schemaVersion).toBe(3);
    expect(result.hash.hashFail).toBe(0);
    expect(result.dom.domFail).toBe(0);
    expect(result.dom.duplicates.length).toBe(0);
    expect(result.dom.sectionOrphans.length).toBe(0);
    expect(result.dom.domOk).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  test('runGlossaryVerify exits 1 when DOM id missing (fixture bake)', async () => {
    const bake: GlossaryBake = {
      schemaVersion: 3,
      surfaces: [
        {
          path: '/portal/limits/',
          sections: [
            { hash: 'nope', domId: 'this-id-does-not-exist-xyz', title: 'Nope' },
          ],
        },
      ],
    };
    const result = await runGlossaryVerify({ root: ROOT, glossary: bake, json: false });
    expect(result.dom.domFail).toBe(1);
    expect(result.exitCode).toBe(1);
  });

  test('runGlossaryVerify exits 1 when section title missing', async () => {
    const bake: GlossaryBake = {
      schemaVersion: 3,
      surfaces: [
        {
          path: '/portal/limits/',
          sections: [{ hash: 'account-control', domId: 'account-control' }],
        },
      ],
    };
    const result = await runGlossaryVerify({ root: ROOT, glossary: bake, json: false });
    expect(result.titles?.titleFail).toBe(1);
    expect(result.exitCode).toBe(1);
  });

  test('strict mode fails on section-shaped orphans only', async () => {
    const tmp = joinPath(ROOT, '.tmp-glossary-verify-strict');
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/public/portal/partners`.quiet();
    await Bun.write(
      joinPath(tmp, 'public/portal/partners/index.html'),
      `<!doctype html><body>
        <div id="section:telegram"></div>
        <div id="section:stale-left-behind"></div>
        <nav id="tenant-sidebar"></nav>
      </body>`
    );

    const bake: GlossaryBake = {
      schemaVersion: 3,
      surfaces: [
        {
          path: '/portal/partners/',
          sections: [
            {
              hash: 'telegram',
              domId: 'section:telegram',
              title: 'Telegram package groups',
            },
          ],
        },
      ],
    };

    const loose = await runGlossaryVerify({ root: tmp, glossary: bake, json: false, strict: false });
    expect(loose.dom.sectionOrphans.length).toBe(1);
    expect(loose.dom.chromeOrphans).toBeGreaterThan(0);
    expect(loose.titles?.titleFail ?? 0).toBe(0);
    expect(loose.exitCode).toBe(0); // WARN only (orphan, not fail)

    const strict = await runGlossaryVerify({ root: tmp, glossary: bake, json: false, strict: true });
    expect(strict.exitCode).toBe(1);

    await Bun.$`rm -rf ${tmp}`.quiet();
  });
});
