import { describe, test, expect } from 'bun:test';
import { parseGlossaryHash } from '../public/portal/scripts/glossary-router.js';
import {
  PORTAL_GLOSSARY_BOARD_PATHNAME_INIT,
  PORTAL_GLOSSARY_CONCEPT_HASH_INIT,
  PORTAL_SECTION_HASH_INIT,
  parsePortalGlossaryUrl,
} from '../lib/portal/url-planes.ts';

const FIXTURES = [
  {
    url: 'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net',
    expected: { board: 'glossary', concept: 'ops.view.account_net', type: 'glossary' as const },
  },
  {
    url: 'https://score.factory-wager.com/portal/account/#section:limits',
    expected: { board: 'account', concept: 'limits', type: 'section' as const },
  },
  {
    url: 'https://score.factory-wager.com/portal/partners/#glossary:section.partnersOnboard',
    expected: {
      board: 'partners',
      concept: 'section.partnersOnboard',
      type: 'glossary' as const,
    },
  },
] as const;

describe('parseGlossaryHash', () => {
  test('parses glossary: hash', () => {
    const r = parseGlossaryHash(FIXTURES[0].url);
    expect(r).toEqual(FIXTURES[0].expected);
  });

  test('parses section: hash', () => {
    const r = parseGlossaryHash(FIXTURES[1].url);
    expect(r).toEqual(FIXTURES[1].expected);
  });

  test('returns null for unmatched hash', () => {
    const r = parseGlossaryHash(
      'https://score.factory-wager.com/portal/glossary/#other:thing',
    );
    expect(r).toBeNull();
  });

  test('returns null for non-portal pathname', () => {
    const r = parseGlossaryHash(
      'https://score.factory-wager.com/other/glossary/#glossary:ops.view',
    );
    expect(r).toBeNull();
  });
});

describe('parsePortalGlossaryUrl SSOT (closes #160 dual-owner drift)', () => {
  test('browser mirror stays byte-equal to url-planes for fixtures', () => {
    for (const { url, expected } of FIXTURES) {
      expect(parseGlossaryHash(url)).toEqual(expected);
      expect(parsePortalGlossaryUrl(url)).toEqual(expected);
      expect(parseGlossaryHash(url)).toEqual(parsePortalGlossaryUrl(url));
    }
  });

  test('null cases stay aligned', () => {
    const unmatched = 'https://score.factory-wager.com/portal/glossary/#other:thing';
    const wrongPath = 'https://score.factory-wager.com/other/glossary/#glossary:ops.view';
    expect(parsePortalGlossaryUrl(unmatched)).toBeNull();
    expect(parsePortalGlossaryUrl(wrongPath)).toBeNull();
    expect(parseGlossaryHash(unmatched)).toEqual(parsePortalGlossaryUrl(unmatched));
    expect(parseGlossaryHash(wrongPath)).toEqual(parsePortalGlossaryUrl(wrongPath));
  });

  test('glossary-router.js mirrors SSOT pathname + hash dialect strings', async () => {
    const src = await Bun.file('public/portal/scripts/glossary-router.js').text();
    expect(src).toContain(PORTAL_GLOSSARY_BOARD_PATHNAME_INIT.pathname);
    // Source literals escape `\:` as `\\:` — compare the init string form.
    expect(PORTAL_SECTION_HASH_INIT.hash).toBe('section\\::section');
    expect(PORTAL_GLOSSARY_CONCEPT_HASH_INIT.hash).toBe('glossary\\::concept');
    expect(src).toContain(`hash: 'section\\\\::section'`);
    expect(src).toContain(`hash: 'glossary\\\\::concept'`);
    expect(src).toContain('parsePortalGlossaryUrl');
  });
});
