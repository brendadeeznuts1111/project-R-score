import { appendFile, chmod, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { serverConfig } from "./server-config";

export const SPORTS = {
  nfl: { label: "NFL", oddsApiKey: "americanfootball_nfl" },
  ncaaf: { label: "NCAAF", oddsApiKey: "americanfootball_ncaaf" },
  nba: { label: "NBA", oddsApiKey: "basketball_nba" },
  ncaab: { label: "NCAAB", oddsApiKey: "basketball_ncaab" },
  mlb: { label: "MLB", oddsApiKey: "baseball_mlb" },
  nhl: { label: "NHL", oddsApiKey: "icehockey_nhl" },
  epl: { label: "EPL", oddsApiKey: "soccer_epl" },
  ucl: { label: "UCL", oddsApiKey: "soccer_uefa_champs_league" },
  tennis: { label: "Tennis", oddsApiKey: "tennis_atp_wimbledon" },
  golf: { label: "PGA", oddsApiKey: "golf_pga_championship_winner" },
  mma: { label: "MMA", oddsApiKey: "mma_mixed_martial_arts" },
  boxing: { label: "Boxing", oddsApiKey: "boxing_boxing" },
} as const;

export type SportKey = keyof typeof SPORTS;
export type OddsMarket = "h2h" | "spreads" | "totals";
export type OddsSide = "home" | "away" | "over" | "under";
export type FeedStatus = "demo" | "live" | "api_key_missing" | "refresh_failed" | "rate_limited";

export type OddsSnapshot = {
  timestamp: string;
  sport: SportKey;
  eventId: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  book: string;
  market: OddsMarket;
  side: OddsSide;
  americanPrice: number;
  decimalPrice: number;
  impliedProbability: number;
  point: number | null;
  priceDelta: number;
  pointDelta: number;
  centsDelta: number;
};

export type BookLineView = {
  book: string;
  homeMl: number;
  awayMl: number;
  spread: number;
  spreadPrice: number;
  total: number;
  overPrice: number;
  updated: string;
  priceDelta: number;
  pointDelta: number;
  centsDelta: number;
  patterns: string[];
};

export type GameView = {
  id: string;
  sport: SportKey;
  league: string;
  away: string;
  home: string;
  start: string;
  commenceTime: string;
  lines: BookLineView[];
  movements: Array<{
    time: string;
    book: string;
    market: string;
    open: string;
    current: string;
    move: number;
    centsDelta: number;
    signal: string;
  }>;
  patterns: string[];
};

export type CurrentOddsResponse = {
  status: FeedStatus;
  sport: SportKey;
  updatedAt: string;
  message: string;
  coverage: {
    sportsbookCount: number;
    staleBookCount: number;
    books: string[];
    lastSuccessfulRefresh: string | null;
  };
  events: GameView[];
};

export type PatternSummary = {
  sport: SportKey;
  date: string;
  generatedAt: string;
  patterns: Array<{
    eventId: string;
    book: string;
    market: OddsMarket;
    side: OddsSide;
    label: string;
    priceDelta: number;
    pointDelta: number;
    centsDelta: number;
  }>;
  biggestMovers: Array<{
    eventId: string;
    book: string;
    market: OddsMarket;
    side: OddsSide;
    centsDelta: number;
  }>;
};

type OddsApiOutcome = {
  name: string;
  price?: number;
  point?: number;
};

type OddsApiMarket = {
  key: OddsMarket;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key?: string;
  title: string;
  last_update?: string;
  markets: OddsApiMarket[];
};

type OddsApiEvent = {
  id: string;
  sport_key?: string;
  commence_time: string;
  home_team: string;
  away_team?: string;
  teams?: string[];
  bookmakers: OddsApiBookmaker[];
};

const DEMO_BOOKS = ["DraftKings", "FanDuel", "Pinnacle", "BetMGM", "Caesars", "Bovada", "BetRivers", "ESPN BET"];

const DEMO_FIXTURES: Record<SportKey, Array<[string, string, string]>> = {
  nfl: [["kc_phi", "Kansas City", "Philadelphia"], ["buf_dal", "Buffalo", "Dallas"], ["sf_det", "San Francisco", "Detroit"]],
  ncaaf: [["uga_bama", "Georgia", "Alabama"], ["osu_mich", "Ohio State", "Michigan"]],
  nba: [["bos_nyk", "Boston", "New York"], ["lal_den", "LA Lakers", "Denver"], ["okc_min", "Oklahoma City", "Minnesota"]],
  ncaab: [["duke_unc", "Duke", "North Carolina"], ["hou_kan", "Houston", "Kansas"]],
  mlb: [["nyy_bos", "NY Yankees", "Boston"], ["lad_sdg", "LA Dodgers", "San Diego"]],
  nhl: [["tor_bos", "Toronto", "Boston"], ["edm_vgk", "Edmonton", "Vegas"]],
  epl: [["ars_mci", "Arsenal", "Manchester City"], ["liv_che", "Liverpool", "Chelsea"]],
  ucl: [["rma_bay", "Real Madrid", "Bayern Munich"], ["psg_bar", "PSG", "Barcelona"]],
  tennis: [["alc_sin", "Carlos Alcaraz", "Jannik Sinner"], ["iga_ary", "Iga Swiatek", "Aryna Sabalenka"]],
  golf: [["pga_outright", "Scottie Scheffler", "Rory McIlroy"]],
  mma: [["ufc_main", "Makhachev", "Topuria"]],
  boxing: [["boxing_main", "Usyk", "Fury"]],
};

const DEMO_TOTALS: Record<SportKey, number> = {
  nfl: 47.5,
  ncaaf: 56.5,
  nba: 224.5,
  ncaab: 143.5,
  mlb: 8.5,
  nhl: 6,
  epl: 2.5,
  ucl: 2.5,
  tennis: 38.5,
  golf: 271.5,
  mma: 2.5,
  boxing: 8.5,
};

function isSportKey(value: string | null | undefined): value is SportKey {
  return Boolean(value && value in SPORTS);
}

export function parseSport(value: string | null | undefined): SportKey {
  return isSportKey(value) ? value : "nfl";
}

export function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function americanToImpliedProbability(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function signedId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
}

function seededNumber(seed: number): number {
  let value = seed;
  value ^= value << 13;
  value ^= value >> 17;
  value ^= value << 5;
  return Math.abs(value);
}

function makeSnapshot(input: Omit<OddsSnapshot, "decimalPrice" | "impliedProbability" | "priceDelta" | "pointDelta" | "centsDelta">): OddsSnapshot {
  return {
    ...input,
    decimalPrice: round(americanToDecimal(input.americanPrice)),
    impliedProbability: round(americanToImpliedProbability(input.americanPrice)),
    priceDelta: 0,
    pointDelta: 0,
    centsDelta: 0,
  };
}

function sameSnapshotKey(a: OddsSnapshot, b: OddsSnapshot): boolean {
  return a.sport === b.sport && a.eventId === b.eventId && a.book === b.book && a.market === b.market && a.side === b.side;
}

function withDeltas(snapshots: OddsSnapshot[], previous: OddsSnapshot[]): OddsSnapshot[] {
  return snapshots.map((snapshot) => {
    const prior = previous.filter((candidate) => sameSnapshotKey(candidate, snapshot)).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    if (!prior) return snapshot;
    return {
      ...snapshot,
      priceDelta: snapshot.americanPrice - prior.americanPrice,
      pointDelta: round((snapshot.point ?? 0) - (prior.point ?? 0), 2),
      centsDelta: round((snapshot.impliedProbability - prior.impliedProbability) * 100, 2),
    };
  });
}

async function ensureSnapshotDir(): Promise<void> {
  await mkdir(dirname(serverConfig.oddsSnapshotPath), { recursive: true });
  try {
    await chmod(dirname(serverConfig.oddsSnapshotPath), 0o700);
  } catch {
    // Some local filesystems do not support chmod.
  }
}

export async function readOddsSnapshots(): Promise<OddsSnapshot[]> {
  const file = Bun.file(serverConfig.oddsSnapshotPath);
  if (!(await file.exists())) return [];
  const text = await file.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as OddsSnapshot)
    .filter((snapshot) => snapshot.timestamp && snapshot.eventId);
}

export async function appendOddsSnapshots(snapshots: OddsSnapshot[]): Promise<OddsSnapshot[]> {
  if (snapshots.length === 0) return [];
  await ensureSnapshotDir();
  const existing = await readOddsSnapshots();
  const enriched = withDeltas(snapshots, existing);
  await appendFile(serverConfig.oddsSnapshotPath, enriched.map((snapshot) => JSON.stringify(snapshot)).join("\n") + "\n", "utf8");
  try {
    await chmod(serverConfig.oddsSnapshotPath, 0o600);
  } catch {
    // Ignore host permission limitations.
  }
  return enriched;
}

export function makeDemoSnapshots(sport: SportKey, timestamp = new Date().toISOString()): OddsSnapshot[] {
  const fixtureIndex = Object.keys(SPORTS).indexOf(sport);
  const tick = Math.floor(Date.now() / 60_000) % 17;
  const baseTime = Date.now() + 6 * 60 * 60 * 1000;

  return DEMO_FIXTURES[sport].flatMap(([fixtureId, awayTeam, homeTeam], gameIndex) => {
    const seed = seededNumber((fixtureIndex + 3) * 91 + gameIndex * 37 + tick * 11);
    const baseHome = [-165, -145, -125, 115, 130, 150][seed % 6] ?? -125;
    const baseAway = baseHome < 0 ? Math.round(Math.abs(baseHome) * 0.7 + 20) : -Math.round(baseHome * 0.7 + 45);
    const commenceTime = new Date(baseTime + gameIndex * 3 * 60 * 60 * 1000).toISOString();

    return DEMO_BOOKS.flatMap((book, bookIndex) => {
      const local = seededNumber(seed + bookIndex * 19);
      const drift = [-12, -8, -5, 0, 4, 7, 11][local % 7] ?? 0;
      const tickDrift = [-6, -3, 0, 2, 5][(tick + bookIndex) % 5] ?? 0;
      const spread = ([-3.5, -2.5, -1.5, 1.5, 2.5, 3.5][local % 6] ?? -2.5) * (baseHome > 0 ? -1 : 1);
      const total = DEMO_TOTALS[sport] + ([-1, -0.5, 0, 0.5, 1][local % 5] ?? 0);
      const homeMl = baseHome + drift + tickDrift;
      const awayMl = baseAway - drift - tickDrift;
      const spreadPrice = [-115, -110, -105, 100][local % 4] ?? -110;
      const overPrice = [-116, -112, -108, -104, 100][local % 5] ?? -110;

      return [
        makeSnapshot({ timestamp, sport, eventId: fixtureId, commenceTime, homeTeam, awayTeam, book, market: "h2h", side: "home", americanPrice: homeMl, point: null }),
        makeSnapshot({ timestamp, sport, eventId: fixtureId, commenceTime, homeTeam, awayTeam, book, market: "h2h", side: "away", americanPrice: awayMl, point: null }),
        makeSnapshot({ timestamp, sport, eventId: fixtureId, commenceTime, homeTeam, awayTeam, book, market: "spreads", side: "home", americanPrice: spreadPrice, point: round(spread, 1) }),
        makeSnapshot({ timestamp, sport, eventId: fixtureId, commenceTime, homeTeam, awayTeam, book, market: "totals", side: "over", americanPrice: overPrice, point: round(total, 1) }),
      ];
    });
  });
}

export function normalizeOddsApiEvents(sport: SportKey, events: OddsApiEvent[], timestamp = new Date().toISOString()): OddsSnapshot[] {
  return events.flatMap((event) => {
    const homeTeam = event.home_team;
    const awayTeam = event.away_team ?? event.teams?.find((team) => team !== homeTeam) ?? "Away";
    const eventId = event.id || `${sport}_${signedId(`${awayTeam}_${homeTeam}`)}`;
    return event.bookmakers.flatMap((book) => {
      const markets = new Map(book.markets.map((market) => [market.key, market]));
      const h2h = markets.get("h2h")?.outcomes ?? [];
      const spreads = markets.get("spreads")?.outcomes ?? [];
      const totals = markets.get("totals")?.outcomes ?? [];
      const homeMl = h2h.find((outcome) => outcome.name === homeTeam)?.price;
      const awayMl = h2h.find((outcome) => outcome.name === awayTeam)?.price;
      const homeSpread = spreads.find((outcome) => outcome.name === homeTeam);
      const over = totals.find((outcome) => outcome.name.toLowerCase() === "over");
      const rows: OddsSnapshot[] = [];

      if (typeof homeMl === "number") {
        rows.push(makeSnapshot({ timestamp, sport, eventId, commenceTime: event.commence_time, homeTeam, awayTeam, book: book.title, market: "h2h", side: "home", americanPrice: homeMl, point: null }));
      }
      if (typeof awayMl === "number") {
        rows.push(makeSnapshot({ timestamp, sport, eventId, commenceTime: event.commence_time, homeTeam, awayTeam, book: book.title, market: "h2h", side: "away", americanPrice: awayMl, point: null }));
      }
      if (typeof homeSpread?.price === "number") {
        rows.push(makeSnapshot({ timestamp, sport, eventId, commenceTime: event.commence_time, homeTeam, awayTeam, book: book.title, market: "spreads", side: "home", americanPrice: homeSpread.price, point: typeof homeSpread.point === "number" ? homeSpread.point : null }));
      }
      if (typeof over?.price === "number") {
        rows.push(makeSnapshot({ timestamp, sport, eventId, commenceTime: event.commence_time, homeTeam, awayTeam, book: book.title, market: "totals", side: "over", americanPrice: over.price, point: typeof over.point === "number" ? over.point : null }));
      }

      return rows;
    });
  });
}

export async function fetchOddsApiSnapshots(sport: SportKey): Promise<OddsSnapshot[]> {
  if (!serverConfig.oddsApiKey) {
    throw new Error("ODDS_API_KEY is not configured.");
  }
  const query = new URLSearchParams({
    apiKey: serverConfig.oddsApiKey,
    regions: "us,uk,eu,au",
    markets: "h2h,spreads,totals",
    oddsFormat: "american",
  });
  const response = await fetch(`https://api.the-odds-api.com/v4/sports/${SPORTS[sport].oddsApiKey}/odds/?${query.toString()}`);
  if (response.status === 429) {
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`The Odds API returned HTTP ${response.status}.`);
  }
  return normalizeOddsApiEvents(sport, (await response.json()) as OddsApiEvent[]);
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

export async function refreshOdds(sport: SportKey): Promise<CurrentOddsResponse> {
  let status: FeedStatus = "live";
  let message = "Live odds refreshed.";
  let snapshots: OddsSnapshot[];

  if (!serverConfig.oddsApiKey) {
    status = "api_key_missing";
    message = "ODDS_API_KEY is missing; using demo snapshots.";
    snapshots = makeDemoSnapshots(sport);
  } else {
    try {
      snapshots = await fetchOddsApiSnapshots(sport);
      if (snapshots.length === 0) {
        status = "refresh_failed";
        message = "Live feed returned no markets; using demo snapshots.";
        snapshots = makeDemoSnapshots(sport);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      status = text === "rate_limited" ? "rate_limited" : "refresh_failed";
      message = `${text}; using demo snapshots.`;
      snapshots = makeDemoSnapshots(sport);
    }
  }

  const persisted = await appendOddsSnapshots(snapshots);
  return buildCurrentOddsResponse(sport, persisted, status, message);
}

export async function getCurrentOdds(sport: SportKey): Promise<CurrentOddsResponse> {
  const history = await readOddsSnapshots();
  const sportHistory = history.filter((snapshot) => snapshot.sport === sport);
  if (sportHistory.length === 0) {
    return refreshOdds(sport);
  }
  const latestTimestamp = sportHistory.map((snapshot) => snapshot.timestamp).sort().at(-1)!;
  const latest = sportHistory.filter((snapshot) => snapshot.timestamp === latestTimestamp);
  return buildCurrentOddsResponse(sport, latest, serverConfig.oddsApiKey ? "live" : "demo", serverConfig.oddsApiKey ? "Latest stored odds snapshot." : "Demo snapshot from local history.");
}

export async function getOddsHistory(eventId: string, date = new Date().toISOString().slice(0, 10)): Promise<{ eventId: string; date: string; snapshots: OddsSnapshot[] }> {
  const snapshots = (await readOddsSnapshots())
    .filter((snapshot) => snapshot.eventId === eventId && datePart(snapshot.timestamp) === date)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return { eventId, date, snapshots };
}

function snapshotLabel(snapshot: OddsSnapshot): string[] {
  const labels: string[] = [];
  if (Math.abs(snapshot.centsDelta) >= 2) labels.push("steam");
  if (["Pinnacle", "Bookmaker", "Circa"].some((name) => snapshot.book.toLowerCase().includes(name.toLowerCase())) && Math.abs(snapshot.centsDelta) >= 1) labels.push("sharpLead");
  if (Math.abs(snapshot.priceDelta) >= 20 || Math.abs(snapshot.pointDelta) >= 1) labels.push("wideDisagreement");
  return labels;
}

export async function getPatternSummary(sport: SportKey, date = new Date().toISOString().slice(0, 10)): Promise<PatternSummary> {
  const snapshots = (await readOddsSnapshots())
    .filter((snapshot) => snapshot.sport === sport && datePart(snapshot.timestamp) === date)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const patterns = snapshots.flatMap((snapshot) =>
    snapshotLabel(snapshot).map((label) => ({
      eventId: snapshot.eventId,
      book: snapshot.book,
      market: snapshot.market,
      side: snapshot.side,
      label,
      priceDelta: snapshot.priceDelta,
      pointDelta: snapshot.pointDelta,
      centsDelta: snapshot.centsDelta,
    })),
  );

  const biggestMovers = snapshots
    .filter((snapshot) => Math.abs(snapshot.centsDelta) > 0)
    .sort((a, b) => Math.abs(b.centsDelta) - Math.abs(a.centsDelta))
    .slice(0, 12)
    .map((snapshot) => ({
      eventId: snapshot.eventId,
      book: snapshot.book,
      market: snapshot.market,
      side: snapshot.side,
      centsDelta: snapshot.centsDelta,
    }));

  return { sport, date, generatedAt: new Date().toISOString(), patterns, biggestMovers };
}

function latestByBookMarket(snapshots: OddsSnapshot[]): OddsSnapshot[] {
  const map = new Map<string, OddsSnapshot>();
  for (const snapshot of snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    map.set(`${snapshot.eventId}:${snapshot.book}:${snapshot.market}:${snapshot.side}`, snapshot);
  }
  return [...map.values()];
}

export function buildCurrentOddsResponse(sport: SportKey, snapshots: OddsSnapshot[], status: FeedStatus, message: string): CurrentOddsResponse {
  const latest = latestByBookMarket(snapshots.filter((snapshot) => snapshot.sport === sport));
  const books = [...new Set(latest.map((snapshot) => snapshot.book))].sort();
  const eventIds = [...new Set(latest.map((snapshot) => snapshot.eventId))];
  const events = eventIds.map((eventId) => buildGameView(eventId, latest)).filter((event): event is GameView => Boolean(event));
  const lastSuccessfulRefresh = latest.map((snapshot) => snapshot.timestamp).sort().at(-1) ?? null;
  const staleBookCount = new Set(latest.filter((snapshot) => snapshotLabel(snapshot).includes("staleBook")).map((snapshot) => snapshot.book)).size;

  return {
    status,
    sport,
    updatedAt: new Date().toISOString(),
    message,
    coverage: {
      sportsbookCount: books.length,
      staleBookCount,
      books,
      lastSuccessfulRefresh,
    },
    events,
  };
}

function formatStart(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function buildGameView(eventId: string, snapshots: OddsSnapshot[]): GameView | null {
  const eventRows = snapshots.filter((snapshot) => snapshot.eventId === eventId);
  const first = eventRows[0];
  if (!first) return null;
  const books = [...new Set(eventRows.map((snapshot) => snapshot.book))].sort();
  const lines = books.map((book) => {
    const rows = eventRows.filter((snapshot) => snapshot.book === book);
    const home = rows.find((snapshot) => snapshot.market === "h2h" && snapshot.side === "home");
    const away = rows.find((snapshot) => snapshot.market === "h2h" && snapshot.side === "away");
    const spread = rows.find((snapshot) => snapshot.market === "spreads" && snapshot.side === "home");
    const total = rows.find((snapshot) => snapshot.market === "totals" && snapshot.side === "over");
    const patternSet = new Set(rows.flatMap(snapshotLabel));
    return {
      book,
      homeMl: home?.americanPrice ?? 0,
      awayMl: away?.americanPrice ?? 0,
      spread: spread?.point ?? 0,
      spreadPrice: spread?.americanPrice ?? -110,
      total: total?.point ?? 0,
      overPrice: total?.americanPrice ?? -110,
      updated: (home ?? away ?? spread ?? total)?.timestamp.slice(11, 16) ?? "--:--",
      priceDelta: home?.priceDelta ?? away?.priceDelta ?? 0,
      pointDelta: spread?.pointDelta ?? total?.pointDelta ?? 0,
      centsDelta: home?.centsDelta ?? away?.centsDelta ?? 0,
      patterns: [...patternSet],
    };
  });

  const movements = eventRows
    .filter((snapshot) => snapshot.priceDelta !== 0 || snapshot.pointDelta !== 0 || snapshot.centsDelta !== 0)
    .sort((a, b) => Math.abs(b.centsDelta) - Math.abs(a.centsDelta))
    .slice(0, 8)
    .map((snapshot) => ({
      time: snapshot.timestamp.slice(11, 16),
      book: snapshot.book,
      market: snapshot.market,
      open: snapshot.market === "h2h" ? String(snapshot.americanPrice - snapshot.priceDelta) : String(round((snapshot.point ?? 0) - snapshot.pointDelta, 1)),
      current: snapshot.market === "h2h" ? String(snapshot.americanPrice) : String(snapshot.point ?? snapshot.americanPrice),
      move: snapshot.market === "h2h" ? snapshot.priceDelta : snapshot.pointDelta,
      centsDelta: snapshot.centsDelta,
      signal: snapshotLabel(snapshot)[0] ?? "move",
    }));

  const patternSet = new Set(lines.flatMap((line) => line.patterns));
  return {
    id: eventId,
    sport: first.sport,
    league: SPORTS[first.sport].label,
    away: first.awayTeam,
    home: first.homeTeam,
    start: formatStart(first.commenceTime),
    commenceTime: first.commenceTime,
    lines,
    movements,
    patterns: [...patternSet],
  };
}

export async function fetchPolymarketMarkets(): Promise<Array<{ id: string; category: string; title: string; yes: number; no: number; volume: number; move: number }>> {
  const response = await fetch("https://gamma-api.polymarket.com/markets?closed=false&limit=8&order=volume&ascending=false");
  if (!response.ok) return [];
  const payload = (await response.json()) as Array<Record<string, unknown>>;
  return payload.slice(0, 8).map((market) => {
    let prices: unknown = market.outcomePrices;
    if (typeof prices === "string") {
      try {
        prices = JSON.parse(prices);
      } catch {
        prices = [];
      }
    }
    const yes = Array.isArray(prices) && typeof prices[0] === "string" ? Number(prices[0]) : 0.5;
    return {
      id: String(market.id ?? "").slice(0, 24),
      category: String(market.category ?? "Prediction"),
      title: String(market.question ?? market.title ?? "Prediction market"),
      yes: Number.isFinite(yes) ? yes : 0.5,
      no: Number.isFinite(yes) ? 1 - yes : 0.5,
      volume: Number(market.volume ?? 0),
      move: Number(market.oneDayPriceChange ?? 0) * 100,
    };
  });
}
