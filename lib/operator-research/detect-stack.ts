import { hostFromUrl } from './operators.ts';
import type { StackDetection, StackHit } from './types.ts';

type FingerprintRule = {
  provider: string;
  weight: number;
  patterns: RegExp[];
};

/** HTML / script fingerprint rules for common sportsbook stacks. */
export const STACK_RULES: FingerprintRule[] = [
  {
    provider: 'kambi',
    weight: 92,
    patterns: [/kambi/i, /kc-widget/i, /client\.kambi\.com/i, /kambiapi/i, /kambicdn/i],
  },
  {
    provider: 'sportradar',
    weight: 90,
    patterns: [/sportradar/i, /betradar/i, /srt\.cdn/i, /widgets\.sir\.sportradar/i],
  },
  {
    provider: 'openbet',
    weight: 88,
    patterns: [/openbet/i, /\bobg\b/i, /coral\.openbet/i],
  },
  {
    provider: 'softswiss',
    weight: 86,
    patterns: [/softswiss/i, /sbtech/i, /ss-cdn/i],
  },
  {
    provider: 'everymatrix',
    weight: 85,
    patterns: [/everymatrix/i, /oddsfeed\.everymatrix/i],
  },
  {
    provider: 'betgenius',
    weight: 85,
    patterns: [/betgenius/i, /geniussports/i, /genius-sports/i],
  },
  {
    provider: 'altenar',
    weight: 84,
    patterns: [/altenar/i, /altnavwidget/i],
  },
  {
    provider: 'betconstruct',
    weight: 84,
    patterns: [/betconstruct/i, /bc\.game/i, /springbuilder/i],
  },
  {
    provider: 'flutter',
    weight: 80,
    // Brand hosts have dedicated rules — keep this for shared Flutter CDN only.
    patterns: [/flutter\.com/i, /flutter-cdn/i],
  },
  {
    provider: 'draftkings',
    weight: 82,
    patterns: [/draftkings/i, /dk-api/i, /sportsbook\.draftkings/i],
  },
  {
    provider: 'fanduel',
    weight: 82,
    patterns: [/fanduel/i, /sportsbook\.fanduel/i],
  },
  {
    provider: 'williamhill',
    weight: 80,
    patterns: [/williamhill/i, /caesars/i, /wh-sportsbook/i],
  },
  {
    provider: 'bet365',
    weight: 88,
    patterns: [/bet365/i, /ips\.bet365/i],
  },
  {
    provider: 'betfair',
    weight: 88,
    patterns: [/betfair/i, /betfair-exchange/i],
  },
  {
    provider: 'pinnacle',
    weight: 86,
    patterns: [/pinnacle/i, /api\.pinnacle/i],
  },
  {
    provider: 'penn',
    weight: 78,
    patterns: [/espnbet/i, /thescore\.bet/i, /pennentertainment/i],
  },
  {
    provider: 'hardrock',
    weight: 80,
    patterns: [/hardrock\.bet/i, /hardrockbet/i, /hard rock bet/i],
  },
  {
    provider: 'prizepicks',
    weight: 80,
    patterns: [/prizepicks/i],
  },
  {
    provider: 'underdog',
    weight: 80,
    patterns: [/underdogfantasy/i, /underdog fantasy/i],
  },
  {
    provider: 'smarkets',
    weight: 80,
    patterns: [/smarkets/i],
  },
  {
    provider: 'cloudbet',
    weight: 78,
    patterns: [/cloudbet/i],
  },
  {
    provider: 'thunderpick',
    weight: 78,
    patterns: [/thunderpick/i],
  },
  {
    provider: 'bovada',
    weight: 78,
    patterns: [/bovada/i],
  },
  {
    provider: 'betonline',
    weight: 76,
    patterns: [/betonline/i],
  },
  {
    provider: 'pointsbet',
    weight: 76,
    patterns: [/pointsbet/i],
  },
  {
    provider: 'betway',
    weight: 76,
    patterns: [/betway/i],
  },
];

const MARKET_PATTERNS: Array<{ market: string; re: RegExp }> = [
  { market: 'tennis', re: /\btennis\b/i },
  // Avoid matching the "football" inside "american-football".
  { market: 'soccer', re: /\bsoccer\b|(?<![a-z-])football\b/i },
  { market: 'basketball', re: /\bbasketball\b|\bnba\b/i },
  { market: 'american-football', re: /\bnfl\b|american[\s-]?football/i },
  { market: 'baseball', re: /\bbaseball\b|\bmlb\b/i },
  { market: 'hockey', re: /\bhockey\b|\bnhl\b/i },
  { market: 'mma', re: /\bmma\b|\bufc\b/i },
  { market: 'boxing', re: /\bboxing\b/i },
  { market: 'esports', re: /\besports\b|\bcs2\b|\blol\b|\bdota/i },
  { market: 'cricket', re: /\bcricket\b/i },
  { market: 'horse-racing', re: /\bhorse.?racing\b|\bracing\b/i },
  { market: 'tabletennis', re: /\btable.?tennis\b/i },
  { market: 'australian-rules', re: /\bafl\b|australian.?rules/i },
  { market: 'rugby', re: /\brugby\b/i },
  { market: 'politics', re: /\bpolitics\b/i },
];

export function detectStackFromHtml(url: string, html: string): StackDetection {
  const host = hostFromUrl(url);
  if (!html || html.trim().length === 0) {
    return {
      url,
      host,
      provider: 'unknown',
      confidence: 0,
      fingerprint: 'empty',
      hits: [],
      marketsObserved: [],
      source: 'empty',
    };
  }

  const hits: StackHit[] = [];
  const hostLower = host.toLowerCase();
  for (const rule of STACK_RULES) {
    const matches: string[] = [];
    for (const re of rule.patterns) {
      const m = html.match(re);
      if (m?.[0]) matches.push(m[0]);
    }
    // Brand host is a first-class identity signal (identity ≠ incidental CDN hit).
    const providerKey = rule.provider.replace(/[^a-z0-9]/g, '');
    const hostBoost = hostLower.includes(providerKey) ? 12 : 0;
    if (matches.length > 0 || hostBoost > 0) {
      if (hostBoost > 0 && matches.length === 0) matches.push(`host:${host}`);
      const confidence = Math.min(
        99,
        rule.weight + Math.min(8, Math.max(0, matches.length - 1) * 3) + hostBoost
      );
      hits.push({
        provider: rule.provider,
        confidence,
        fingerprint: rule.patterns[0]?.source ?? rule.provider,
        matches: [...new Set(matches)].slice(0, 8),
      });
    }
  }

  hits.sort((a, b) => b.confidence - a.confidence || a.provider.localeCompare(b.provider));
  const top = hits[0];
  const marketsObserved = MARKET_PATTERNS.filter(m => m.re.test(html)).map(m => m.market);

  return {
    url,
    host,
    provider: top?.provider ?? 'unknown',
    confidence: top?.confidence ?? 0,
    fingerprint: top?.fingerprint ?? 'no-match',
    hits,
    marketsObserved,
    source: 'html',
  };
}

export async function detectStack(url: string, html?: string): Promise<StackDetection> {
  if (typeof html === 'string') return detectStackFromHtml(url, html);
  try {
    const res = await fetch(url, {
      headers: politeHeaders(),
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    });
    const text = await res.text();
    return detectStackFromHtml(url, text);
  } catch {
    return detectStackFromHtml(url, '');
  }
}

export function politeHeaders(): HeadersInit {
  return {
    'User-Agent': 'FactoryWager-OperatorResearch/0.1 (+research; polite; contact=ops)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.8',
  };
}
