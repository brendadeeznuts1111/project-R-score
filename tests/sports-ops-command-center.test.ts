import { describe, expect, test } from 'bun:test';

const html = await Bun.file(
  'public/sports-ops/index.html',
).text();

function loadPure(): {
  normalizeState: (raw: unknown, fallback?: string) => {
    source: string;
    feed: { t: string; title: string; msg: string; sev: string }[];
    games: { sport: string; away: string; as: number; home: string; bs: number; live: boolean; line: string }[];
    movers: { what: string; dir: string; hot: boolean }[];
    betfeed: { risk: number }[];
    sharp: { sharp_score: number }[];
    logs: unknown[];
    history: Record<string, { series: number[] }>;
    noise: number;
    books: unknown;
    latency: unknown;
  };
  buildSeed: () => unknown;
  formatMoney: (n: number) => string;
} {
  const start = html.indexOf('/* @pure-start */');
  const end = html.indexOf('/* @pure-end */');
  const body = html.slice(start, end);
  const factory = new Function(`${body}\nreturn { normalizeState, buildSeed, formatMoney };`);
  return factory() as ReturnType<typeof loadPure>;
}

describe('sports ops command center', () => {
  test('main is a three-column shell', () => {
    const main = html.match(/<main>([\s\S]*?)<\/main>/);
    expect(main).toBeTruthy();
    const body = main?.[1] ?? '';
    expect(body.match(/class="col /g)?.length).toBe(3);
    expect(body.includes('class="col left"')).toBe(true);
    expect(body.includes('class="col mid"')).toBe(true);
    expect(body.includes('class="col right"')).toBe(true);
    expect(body.includes('class="panel col')).toBe(false);
    expect(body.includes('ALERT FEED')).toBe(true);
    expect(body.includes('BET FEED')).toBe(true);
    expect(body.includes('id="betfeed"')).toBe(true);
  });

  test('seed and relay payloads share one normalized shape', () => {
    const { normalizeState, buildSeed, formatMoney } = loadPure();
    const seed = normalizeState(buildSeed());
    expect(seed.source).toBe('seed');
    expect(seed.feed.length).toBe(18);
    expect(seed.games.length).toBe(8);
    expect(seed.movers.length).toBe(8);
    expect(seed.betfeed.length).toBe(5);
    expect(seed.sharp.length).toBe(5);
    expect(seed.logs.length).toBe(5);
    expect(seed.feed[0]?.title).toBe('NFL · MNF');
    expect(seed.feed[0]?.msg.includes('<')).toBe(false);
    expect(seed.feed.filter(row => row.sev === 'high').length).toBe(5);
    expect(seed.games[0]).toMatchObject({ sport: 'NFL', away: 'Chiefs', as: 24, bs: 21, home: 'Ravens', live: true });
    expect(seed.games.filter(game => game.live).length).toBe(6);
    expect(seed.movers.filter(move => move.hot).length).toBe(3);
    expect(seed.movers[0]?.dir).toBe('up');
    expect(seed.movers[1]?.dir).toBe('dn');
    const risk = seed.betfeed.reduce((sum, wager) => sum + wager.risk, 0);
    expect(formatMoney(risk)).toBe('$1,830');
    const mean = seed.sharp.reduce((sum, row) => sum + row.sharp_score, 0) / seed.sharp.length;
    expect(mean.toFixed(3)).toBe('0.414');
    expect(seed.history['NFL · Chiefs @ Ravens']?.series.length).toBe(42);
    expect(seed.books).toBeNull();
    expect(seed.latency).toBeNull();

    const relay = normalizeState(
      {
        games: [{ sport: 'NBA', away: 'Lakers', as: 10, bs: 8, home: 'Suns', status: 'Q1', line: 'OFF', live: true }],
        movers: [{ what: 'Lakers OFF', ctx: 'NBA', dir: 'up', chg: 'off', hot: false }],
        feed: [{ t: '01:02', title: 'NBA', msg: '<b>ignore</b> board pulled', sev: 'watch' }],
      },
      'snapshot',
    );
    expect(relay.source).toBe('snapshot');
    expect(relay.games[0]?.away).toBe('Lakers');
    expect(relay.movers[0]?.dir).toBe('up');
    expect(relay.feed[0]?.title).toBe('NBA');
    expect(relay.feed[0]?.msg.includes('<')).toBe(false);
  });

  test('link, motion, and overlay contracts stay in the page', () => {
    expect(html.includes("location.protocol==='https:'?'wss://':'ws://'")).toBe(true);
    expect(html.includes('prefers-reduced-motion')).toBe(true);
    expect(html.includes('Math.random')).toBe(false);
    expect(html.includes('SESSION RISK')).toBe(true);
    expect(html.includes('type="button"')).toBe(true);
    expect(html.includes('title="4C odds screen"')).toBe(true);
    expect(html.includes("e.key==='Escape'")).toBe(true);
    expect(html.includes('function gauge')).toBe(false);
    expect(html.includes("s.source!=='seed'&&rows.length>0")).toBe(true);
    expect(html.includes('if(s&&s.games)')).toBe(true);
    expect(html.includes('if(s.length<2)')).toBe(true);
    expect(html.includes('window.__sportsOpsMcp')).toBe(true);
    expect(html.includes('get_link_status')).toBe(true);
    expect(html.includes('MCP · LOCAL')).toBe(true);
  });
});
