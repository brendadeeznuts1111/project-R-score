// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
import { describe, expect, test } from 'bun:test';
import {
  PARTNER_HASH_PATTERN_INITS,
  PORTAL_GLOSSARY_CONCEPT_HASH_INIT,
  PORTAL_SECTION_HASH_INIT,
  classifyPortalHash,
  classifyPortalLocation,
  classifyPortalPathname,
} from '../lib/portal/url-planes.ts';

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
});
