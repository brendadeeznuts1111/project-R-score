// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — test/exec fast paths
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { parsePartnerHash, partnerHash, type PartnerRoute } from '../lib/portal/partner-routes.ts';
import {
  PARTNER_HASH_PATTERN_INITS,
  PORTAL_GLOSSARY_BOARD_PATHNAME_INIT,
  PORTAL_GLOSSARY_CONCEPT_HASH_INIT,
  PORTAL_SECTION_HASH_INIT,
  classifyPortalHash,
  classifyPortalLocation,
  classifyPortalPathname,
  isPortalSectionHash,
  parsePortalGlossaryUrl,
  portalGlossaryConceptFromHash,
  portalSectionFromHash,
} from '../lib/portal/url-planes.ts';

/** One fixture per PARTNER_HASH_PATTERN_INITS key (parse + partnerHash round-trip). */
const PARTNER_HASH_FIXTURES: readonly { initKey: keyof typeof PARTNER_HASH_PATTERN_INITS; route: PartnerRoute }[] =
  [
    { initKey: 'partners', route: { type: 'partners' } },
    { initKey: 'partner', route: { type: 'partner', code: 'ASH' } },
    { initKey: 'out', route: { type: 'out', code: 'ASH', outId: 'out-ASH-1' } },
    { initKey: 'accounting', route: { type: 'accounting', code: 'ASH' } },
    { initKey: 'telegram', route: { type: 'telegram', code: 'ASH', topic: 'ops' } },
    { initKey: 'book', route: { type: 'book', bookId: 'book-dk-nj' } },
  ];

describe('portal url planes', () => {
  test('pathname plane separates page, registry, and real APIs', () => {
    expect(classifyPortalPathname('/portal/partners/')).toBe('page');
    expect(classifyPortalPathname('/portal/glossary')).toBe('page');
    expect(classifyPortalPathname('/registry/domain-glossary.json')).toBe('registry');
    expect(classifyPortalPathname('/registry/partners-ops.json')).toBe('registry');
    expect(classifyPortalPathname('/api/health')).toBe('api');
    expect(classifyPortalPathname('/health')).toBe('api');
    expect(classifyPortalPathname('/api/glossary')).toBe('other'); // not a real API — SPA fallback live
    expect(classifyPortalPathname('/')).toBe('other');
  });

  test('hash plane separates section, partner, and glossary (client-only)', () => {
    expect(classifyPortalHash('#section:onboard')).toBe('hash-section');
    expect(classifyPortalHash('section:accounting')).toBe('hash-section');
    expect(classifyPortalHash('#partner/ASH')).toBe('hash-partner');
    expect(classifyPortalHash('#partner/ASH/out/out-ASH-1')).toBe('hash-partner');
    expect(classifyPortalHash('#book/book-dk-nj')).toBe('hash-partner');
    expect(classifyPortalHash('#partners')).toBe('hash-partner');
    expect(classifyPortalHash('#glossary:section.partnersOnboard')).toBe('hash-glossary');
    expect(classifyPortalHash('')).toBe('empty');
    expect(classifyPortalHash('#nope')).toBe('other');
  });

  test('classifyPortalLocation keeps pathname and hash independent', () => {
    const loc = classifyPortalLocation({
      pathname: '/portal/partners/',
      hash: '#partner/ASH/out/out-ASH-1',
    });
    expect(loc.pathnamePlane).toBe('page');
    expect(loc.hashPlane).toBe('hash-partner');
    expect(loc.hashIsClientOnly).toBe(true);

    const registry = classifyPortalLocation({
      pathname: '/registry/domain-glossary.json',
      hash: '',
    });
    expect(registry.pathnamePlane).toBe('registry');
    expect(registry.hashPlane).toBe('empty');
    expect(registry.hashIsClientOnly).toBe(false);
  });

  test('board JS mirrors partner + glossary-ux hash pattern strings from SSOT', async () => {
    const board = await Bun.file('public/portal/partners/partner-routes.js').text();
    for (const init of Object.values(PARTNER_HASH_PATTERN_INITS)) {
      expect(board).toContain(`hash: '${init.hash}'`);
    }

    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();
    // Source literals escape `\:` as `\\:` — compare the init string form.
    expect(ux).toContain(`hash: 'section\\\\::section'`);
    expect(ux).toContain(`hash: 'glossary\\\\::concept'`);
    expect(PORTAL_SECTION_HASH_INIT.hash).toBe('section\\::section');
    expect(PORTAL_GLOSSARY_CONCEPT_HASH_INIT.hash).toBe('glossary\\::concept');
  });

  test('URLPattern hash inits construct and match Bun blog-style exec groups', () => {
    const section = new URLPattern(PORTAL_SECTION_HASH_INIT);
    const hit = section.exec({ hash: 'section:onboard' });
    expect(hit?.hash.groups.section).toBe('onboard');

    const partner = new URLPattern(PARTNER_HASH_PATTERN_INITS.out);
    const out = partner.exec({ hash: 'partner/ASH/out/out-ASH-1' });
    expect(out?.hash.groups.code).toBe('ASH');
    expect(out?.hash.groups.outId).toBe('out-ASH-1');
  });

  test('parsePortalGlossaryUrl owns board+hash dialect for deep links', () => {
    expect(
      parsePortalGlossaryUrl(
        'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net',
      ),
    ).toEqual({
      board: 'glossary',
      concept: 'ops.view.account_net',
      type: 'glossary',
    });
    expect(PORTAL_GLOSSARY_BOARD_PATHNAME_INIT.pathname).toContain('glossary|account|partners');
  });

  test('shared precompiled patterns separate test-only checks from group extraction', () => {
    expect(isPortalSectionHash('#section:onboard')).toBe(true);
    expect(isPortalSectionHash('#glossary:ops.view.account_net')).toBe(false);
    expect(portalSectionFromHash('#section:accounts-limits')).toBe('accounts-limits');
    expect(portalSectionFromHash('#section:')).toBeUndefined();
    expect(portalGlossaryConceptFromHash('#glossary:ops.view.account_net')).toBe(
      'ops.view.account_net'
    );
    expect(portalGlossaryConceptFromHash('#section:onboard')).toBeUndefined();
  });

  test('every partner hash init has TS↔JS parse parity and partnerHash round-trip', async () => {
    expect(new Set(PARTNER_HASH_FIXTURES.map(f => f.initKey))).toEqual(
      new Set(Object.keys(PARTNER_HASH_PATTERN_INITS))
    );

    const board = await import('../public/portal/partners/partner-routes.js');
    for (const { route } of PARTNER_HASH_FIXTURES) {
      const hash = partnerHash(route);
      const ts = parsePartnerHash(hash);
      const js = board.parsePartnerHash(hash) as PartnerRoute | null;
      expect(ts, hash).toEqual(route);
      expect(js, `JS ${hash}`).toEqual(route);
      expect(parsePartnerHash(partnerHash(ts!)), `round-trip ${hash}`).toEqual(route);
    }
  });
});
