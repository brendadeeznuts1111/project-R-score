import { describe, test, expect } from 'bun:test';
import { parseGlossaryHash } from '../public/portal/scripts/glossary-router.js';

describe('parseGlossaryHash', () => {
  test('parses glossary: hash', () => {
    const r = parseGlossaryHash(
      'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net',
    );
    expect(r).toEqual({ board: 'glossary', concept: 'ops.view.account_net', type: 'glossary' });
  });

  test('parses section: hash', () => {
    const r = parseGlossaryHash(
      'https://score.factory-wager.com/portal/account/#section:limits',
    );
    expect(r).toEqual({ board: 'account', concept: 'limits', type: 'section' });
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
