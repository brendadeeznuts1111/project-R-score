/**
 * Display labels + book-type taxonomy + internal/external endpoints for the
 * sportsbook fleet. Glossary owner for book identity is scrape.book; venue
 * class uses book.type.* (legal-us → book.type.legal).
 */

export const SPORTSBOOK_GLOSSARY = 'scrape.book';

/**
 * Preferred sportsbook type wire tokens.
 * @type {Readonly<{
 *   crypto: { label: string; glossaryId: string };
 *   pph: { label: string; glossaryId: string };
 *   'legal-us': { label: string; glossaryId: string };
 *   sweepstakes: { label: string; glossaryId: string };
 *   exchange: { label: string; glossaryId: string };
 *   offshore: { label: string; glossaryId: string };
 * }>}
 */
export const SPORTSBOOK_TYPES = Object.freeze({
  crypto: { label: 'Crypto', glossaryId: 'book.type.crypto' },
  pph: { label: 'PPH', glossaryId: 'book.type.pph' },
  'legal-us': { label: 'Legal US', glossaryId: 'book.type.legal' },
  sweepstakes: { label: 'Sweepstakes', glossaryId: 'book.type.sweepstakes' },
  exchange: { label: 'Exchange', glossaryId: 'book.type.exchange' },
  offshore: { label: 'Offshore', glossaryId: 'book.type.offshore' },
});

/** @typedef {'crypto' | 'pph' | 'legal-us' | 'sweepstakes' | 'exchange' | 'offshore'} SportsbookTypeWire */

/**
 * Normalize wire tokens onto SPORTSBOOK_TYPES keys.
 * Accepts registry `legal` and typo `crpyto`.
 * @param {unknown} raw
 * @returns {SportsbookTypeWire | ''}
 */
export function parseSportsbookType(raw) {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-');
  if (!key) return '';
  if (key === 'legal' || key === 'legal-us' || key === 'us-legal') return 'legal-us';
  if (key === 'crypto' || key === 'crpyto') return 'crypto';
  if (key === 'pph' || key === 'pay-per-head') return 'pph';
  if (key === 'sweepstakes' || key === 'sweepstake' || key === 'sweeps') return 'sweepstakes';
  if (key === 'exchange' || key === 'betting-exchange') return 'exchange';
  if (key === 'offshore') return 'offshore';
  return '';
}

/**
 * @param {unknown} raw
 * @returns {{ id: SportsbookTypeWire | ''; label: string; glossaryId: string; glossaryHref: string }}
 */
export function resolveSportsbookType(raw) {
  const id = parseSportsbookType(raw);
  if (!id) {
    return {
      id: '',
      label: '—',
      glossaryId: SPORTSBOOK_GLOSSARY,
      glossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
    };
  }
  const entry = SPORTSBOOK_TYPES[id];
  return {
    id,
    label: entry.label,
    glossaryId: entry.glossaryId,
    glossaryHref: `/portal/glossary/#glossary:${encodeURIComponent(entry.glossaryId)}`,
  };
}

/** @type {Record<string, { label: string; externalUrl: string; internalBookId: string; type: SportsbookTypeWire }>} */
export const SPORTSBOOK_CATALOG = Object.freeze({
  draftkings: {
    label: 'DraftKings',
    externalUrl: 'https://sportsbook.draftkings.com/',
    internalBookId: 'book-draftkings',
    type: 'legal-us',
  },
  fanduel: {
    label: 'FanDuel',
    externalUrl: 'https://sportsbook.fanduel.com/',
    internalBookId: 'book-fanduel',
    type: 'legal-us',
  },
  betmgm: {
    label: 'BetMGM',
    externalUrl: 'https://sports.betmgm.com/',
    internalBookId: 'book-betmgm',
    type: 'legal-us',
  },
  caesars: {
    label: 'Caesars',
    externalUrl: 'https://www.caesars.com/sportsbook-and-casino',
    internalBookId: 'book-caesars',
    type: 'legal-us',
  },
  espnbet: {
    label: 'ESPN BET',
    externalUrl: 'https://espnbet.com/',
    internalBookId: 'book-espnbet',
    type: 'legal-us',
  },
  fanatics: {
    label: 'Fanatics',
    externalUrl: 'https://sportsbook.fanatics.com/',
    internalBookId: 'book-fanatics',
    type: 'legal-us',
  },
  hardrock: {
    label: 'Hard Rock Bet',
    externalUrl: 'https://www.hardrock.bet/',
    internalBookId: 'book-hardrock',
    type: 'legal-us',
  },
  bet365: {
    label: 'bet365',
    externalUrl: 'https://www.bet365.com/',
    internalBookId: 'book-bet365',
    type: 'legal-us',
  },
  betrivers: {
    label: 'BetRivers',
    externalUrl: 'https://www.betrivers.com/',
    internalBookId: 'book-betrivers',
    type: 'legal-us',
  },
  circa: {
    label: 'Circa Sports',
    externalUrl: 'https://www.circasports.com/',
    internalBookId: 'book-circa',
    type: 'legal-us',
  },
  fliff: {
    label: 'Fliff',
    externalUrl: 'https://www.getfliff.com/',
    internalBookId: 'book-fliff',
    type: 'sweepstakes',
  },
  dabble: {
    label: 'Dabble',
    externalUrl: 'https://www.dabble.com/',
    internalBookId: 'book-dabble',
    type: 'sweepstakes',
  },
  underdog: {
    label: 'Underdog',
    externalUrl: 'https://underdogfantasy.com/',
    internalBookId: 'book-underdog',
    type: 'sweepstakes',
  },
  prizepicks: {
    label: 'PrizePicks',
    externalUrl: 'https://prizepicks.com/',
    internalBookId: 'book-prizepicks',
    type: 'sweepstakes',
  },
  pinnacle: {
    label: 'Pinnacle',
    externalUrl: 'https://www.pinnacle.com/',
    internalBookId: 'book-pinnacle',
    type: 'pph',
  },
  betfair: {
    label: 'Betfair',
    externalUrl: 'https://www.betfair.com/exchange/',
    internalBookId: 'book-betfair',
    type: 'exchange',
  },
  smarkets: {
    label: 'Smarkets',
    externalUrl: 'https://smarkets.com/',
    internalBookId: 'book-smarkets',
    type: 'exchange',
  },
  kalshi: {
    label: 'Kalshi',
    externalUrl: 'https://kalshi.com/',
    internalBookId: 'book-kalshi',
    type: 'exchange',
  },
  polymarket: {
    label: 'Polymarket',
    externalUrl: 'https://polymarket.com/',
    internalBookId: 'book-polymarket',
    type: 'exchange',
  },
  stake: {
    label: 'Stake',
    externalUrl: 'https://stake.com/',
    internalBookId: 'book-stake',
    type: 'crypto',
  },
});

export function resolveSportsbook(id) {
  const key = String(id ?? '')
    .trim()
    .toLowerCase();
  const entry = SPORTSBOOK_CATALOG[key];
  if (entry) {
    const bookType = resolveSportsbookType(entry.type);
    return {
      id: key,
      label: entry.label,
      type: bookType.id,
      typeLabel: bookType.label,
      typeGlossaryId: bookType.glossaryId,
      typeGlossaryHref: bookType.glossaryHref,
      glossaryConcept: SPORTSBOOK_GLOSSARY,
      glossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
      internalHref: `/portal/partners/#book/${entry.internalBookId}`,
      externalUrl: entry.externalUrl,
    };
  }
  if (!key) {
    return {
      id: '',
      label: '—',
      type: '',
      typeLabel: '—',
      typeGlossaryId: SPORTSBOOK_GLOSSARY,
      typeGlossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
      glossaryConcept: SPORTSBOOK_GLOSSARY,
      glossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
      internalHref: '/portal/partners/#partners',
      externalUrl: null,
    };
  }
  return {
    id: key,
    label: key,
    type: '',
    typeLabel: '—',
    typeGlossaryId: SPORTSBOOK_GLOSSARY,
    typeGlossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
    glossaryConcept: SPORTSBOOK_GLOSSARY,
    glossaryHref: `/portal/glossary/#glossary:${SPORTSBOOK_GLOSSARY}`,
    internalHref: `/portal/partners/#book/book-${encodeURIComponent(key)}`,
    externalUrl: null,
  };
}
