/**
 * Read the sports-ops sqlite desk and fold fantasy402 tickets, 4codds
 * status, and an optional live relay snapshot into one state document.
 */
import { Database } from "bun:sqlite";
import {
  cleanDesc,
  deriveAlerts,
  deriveSharp,
  leagueFromBoard,
  rollupLeagues,
  ticketOf,
  type DeskGame,
  type DeskWager,
  type LeagueRow,
} from "./map.ts";

export type DeskSource = {
  id: "f402" | "4c" | "sqlite";
  name: string;
  status: string;
  tickets: number;
  risk: number;
};

export type LiveOverlay = {
  source?: string;
  updatedAt?: string | null;
  games?: DeskGame[];
  movers?: unknown[];
  feed?: unknown[];
  logs?: { t: string; src: string; detail: string }[];
  links?: { f402?: string; fourc?: string };
  latency?: string | null;
  noise?: number;
  history?: Record<string, unknown>;
  events?: unknown[];
};

export type UnifiedDesk = {
  source: "live" | "snapshot" | "seed";
  socket: boolean;
  updatedAt: string | null;
  books: string | null;
  latency: string | null;
  noise: number;
  events: unknown[];
  feed: ReturnType<typeof deriveAlerts>;
  games: DeskGame[];
  movers: unknown[];
  history: Record<string, unknown>;
  betfeed: Array<DeskWager & { league: string; market: string; selection: string }>;
  sharp: ReturnType<typeof deriveSharp>;
  logs: { t: string; src: string; detail: string }[];
  links: { f402: string; fourc: string };
  leagues: LeagueRow[];
  sources: DeskSource[];
};

function wagerKey(wager: DeskWager): string {
  const desc = cleanDesc(wager.legs[0]?.desc ?? "").replace(/^([A-Za-z])[.:\s]\s*/, "$1.");
  return `${wager.customer}|${wager.ts}|${wager.risk}|${desc}`;
}

/** The ticker stores the same bet twice when the description uses `.` and `:`. */
export function dedupeWagers(wagers: DeskWager[]): DeskWager[] {
  const seen = new Set<string>();
  const out: DeskWager[] = [];
  for (const wager of wagers) {
    const key = wagerKey(wager);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(wager);
  }
  return out;
}

function asWagers(db: Database): DeskWager[] {
  const rows = db.query("SELECT payload FROM wagers").all() as { payload: string }[];
  const wagers: DeskWager[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as DeskWager;
      if (parsed && parsed.id) wagers.push(parsed);
    } catch {
      /* skip a damaged row */
    }
  }
  return dedupeWagers(wagers);
}

function latestFourc(db: Database): { status: string; title: string } | null {
  const row = db
    .query("SELECT status, title FROM fourc_status ORDER BY id DESC LIMIT 1")
    .get() as { status: string; title: string } | null;
  return row ?? null;
}

function recentLogs(db: Database): { t: string; src: string; detail: string }[] {
  const rows = db.query("SELECT t, src, detail FROM link_log ORDER BY id DESC LIMIT 12").all() as {
    t: string;
    src: string;
    detail: string;
  }[];
  return rows;
}

function grouped(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function bookLine(tickets: number, fourcStatus: string): string {
  const status = fourcStatus.trim().toUpperCase() || "SEED";
  return `F402 ${grouped(tickets)} · 4C ${status}`;
}

export function loadUnified(db: Database, live?: LiveOverlay | null): UnifiedDesk {
  const stored = asWagers(db);
  stored.sort((a, b) => Number(b.id) - Number(a.id) || b.ts.localeCompare(a.ts));
  const fourc = latestFourc(db);
  const fourcStatus = live?.links?.fourc || fourc?.status || "seed";
  const f402Status = live?.links?.f402 || (stored.length ? "snapshot" : "seed");
  const games = (live?.games ?? []).map((game) => ({ ...game, league: leagueFromBoard(game) }));
  const leagues = rollupLeagues(stored, games);
  const recent = stored.slice(0, 24).map((wager) => {
    const ticket = ticketOf(wager);
    return { ...wager, league: ticket.league, market: ticket.market, selection: ticket.selection };
  });
  const risk = stored.reduce((sum, wager) => sum + (Number(wager.risk) || 0), 0);
  const sources: DeskSource[] = [
    { id: "f402", name: "FANTASY402", status: f402Status, tickets: stored.length, risk },
    { id: "4c", name: "4CODDS", status: fourcStatus, tickets: 0, risk: 0 },
    { id: "sqlite", name: "DESK DB", status: stored.length ? "snapshot" : "seed", tickets: stored.length, risk },
  ];
  const source = live?.source === "live" && games.length ? "live" : stored.length || games.length ? "snapshot" : "seed";
  return {
    source,
    socket: false,
    updatedAt: live?.updatedAt ?? new Date().toISOString(),
    books: stored.length || fourc ? bookLine(stored.length, fourcStatus) : null,
    latency: live?.latency ?? (stored.length ? "SQLITE" : null),
    noise: Number(live?.noise ?? 0),
    events: live?.events ?? [],
    feed: deriveAlerts(stored),
    games,
    movers: live?.movers ?? [],
    history: live?.history && typeof live.history === "object" ? live.history : {},
    betfeed: recent,
    sharp: deriveSharp(stored),
    logs: live?.logs?.length ? live.logs : recentLogs(db),
    links: { f402: f402Status, fourc: fourcStatus },
    leagues,
    sources,
  };
}
