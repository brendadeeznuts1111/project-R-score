/** Pure fantasy402 → command-center mappers. No credentials. */

export type F402Wager = {
  WagerNumber?: number | string;
  Login?: string;
  AgentLogin?: string;
  WagerType?: string;
  AmountWagered?: number | string;
  ToWinAmount?: number | string;
  InsertDateTime?: string;
  TicketWriter?: string;
  ShortDesc?: string;
};

export type F402Score = {
  SportType?: string;
  SportSubType?: string;
  Team1ID?: string;
  Team2ID?: string;
  Team1Score?: number | string;
  Team2Score?: number | string;
  PeriodDescription?: string;
  STATUS?: string;
  Final?: string;
  Spread?: number | string;
  MoneyLine1?: number | string;
  Total?: number | string;
};

export type DeskWager = {
  id: string;
  ts: string;
  customer: string;
  agent: string;
  type: string;
  source: string;
  sport: string;
  risk: number;
  win: number;
  legs: { desc: string }[];
};

export type DeskGame = {
  sport: string;
  away: string;
  as: number;
  bs: number;
  home: string;
  status: string;
  line: string;
  live: boolean;
  spread: number | null;
};

export type DeskAlert = { t: string; title: string; msg: string; sev: "high" | "watch" | "info" };
export type DeskMover = { what: string; ctx: string; dir: "up" | "dn"; chg: string; hot: boolean };
export type DeskSharp = {
  customer: string;
  agent: string;
  tickets: number;
  risk: number;
  win: number;
  hold_pct: number;
  alerts: number;
  sharp_score: number;
};

const SPORT_WORDS = ["Hockey", "Football", "Baseball", "Basketball", "Soccer", "Tennis", "Golf"];

export function moneyFromCents(value: number | string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 100);
}

export function normalizeStamp(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  const ms = s.match(/\/Date\((\d+)\)\//);
  if (ms) return new Date(Number(ms[1])).toISOString();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2} /.test(s)) return `${s.replace(" ", "T")}Z`;
  const parsed = Date.parse(s);
  if (s && !Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return s;
}

export function clockLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 5) || "--:--";
  return d.toISOString().slice(11, 16);
}

function wagerType(desc: string, explicit: string | undefined): string {
  const known = String(explicit ?? "").trim().toLowerCase();
  if (["parlay", "teaser", "straight", "ifbet", "prop"].includes(known)) return known;
  switch (desc.trim().slice(0, 1).toUpperCase()) {
    case "P":
      return "parlay";
    case "T":
      return "teaser";
    case "I":
      return "ifbet";
    case "C":
      return "prop";
    default:
      return "straight";
  }
}

function sportOf(desc: string, fallback: string): string {
  const hit = SPORT_WORDS.find((word) => desc.toLowerCase().includes(word.toLowerCase()));
  return (hit ?? fallback ?? "OTHER").toUpperCase();
}

export function mapWager(row: F402Wager): DeskWager | null {
  const desc = String(row.ShortDesc ?? "").trim();
  if (!desc || row.WagerNumber == null) return null;
  return {
    id: String(row.WagerNumber),
    ts: normalizeStamp(row.InsertDateTime),
    customer: String(row.Login ?? "").trim(),
    agent: String(row.AgentLogin ?? "").trim(),
    type: wagerType(desc, row.WagerType),
    source: String(row.TicketWriter ?? "internet").trim().toLowerCase() || "internet",
    sport: sportOf(desc, "OTHER"),
    risk: moneyFromCents(row.AmountWagered),
    win: moneyFromCents(row.ToWinAmount),
    legs: [{ desc }],
  };
}

export function parseSpread(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function mapScore(row: F402Score): DeskGame | null {
  const away = String(row.Team1ID ?? "").trim();
  const home = String(row.Team2ID ?? "").trim();
  if (!away || !home) return null;
  const final = String(row.Final ?? "").toUpperCase() === "Y" || String(row.STATUS ?? "").toLowerCase() === "final";
  const spread = parseSpread(row.Spread);
  const line = spread != null ? String(spread) : row.MoneyLine1 != null && row.MoneyLine1 !== "" ? `ML ${row.MoneyLine1}` : row.Total != null && row.Total !== "" ? `O/U ${row.Total}` : "—";
  return {
    sport: String(row.SportType || row.SportSubType || "?").trim(),
    away,
    as: Number(row.Team1Score ?? 0) || 0,
    bs: Number(row.Team2Score ?? 0) || 0,
    home,
    status: String(row.PeriodDescription || row.STATUS || "").trim(),
    line,
    live: !final,
    spread,
  };
}

export function gameKey(game: DeskGame): string {
  return `${game.sport} · ${game.away} @ ${game.home}`;
}

export function deriveSharp(wagers: DeskWager[]): DeskSharp[] {
  const by = new Map<string, DeskSharp>();
  for (const wager of wagers) {
    const key = wager.customer || wager.id;
    const current = by.get(key) ?? {
      customer: wager.customer || key,
      agent: wager.agent,
      tickets: 0,
      risk: 0,
      win: 0,
      hold_pct: 0,
      alerts: 0,
      sharp_score: 0,
    };
    current.tickets += 1;
    current.risk += wager.risk;
    current.win += wager.win;
    if (wager.source.includes("alert")) current.alerts += 1;
    if (!current.agent && wager.agent) current.agent = wager.agent;
    by.set(key, current);
  }
  return [...by.values()]
    .map((row) => {
      const hold = row.risk ? ((row.risk - row.win) / row.risk) * 100 : 0;
      const score = Math.max(
        0,
        Math.min(1, (row.alerts / Math.max(row.tickets, 1)) * 0.5 + (hold < 0 ? 0.35 : 0.05) + Math.min(row.risk, 5000) / 20000),
      );
      return {
        ...row,
        hold_pct: Math.round(hold * 10) / 10,
        sharp_score: Math.round(score * 100) / 100,
      };
    })
    .sort((a, b) => b.sharp_score - a.sharp_score || b.risk - a.risk)
    .slice(0, 12);
}

export function deriveAlerts(wagers: DeskWager[]): DeskAlert[] {
  return [...wagers]
    .sort((a, b) => b.risk - a.risk || b.id.localeCompare(a.id))
    .slice(0, 18)
    .map((wager) => ({
      t: clockLabel(wager.ts),
      title: wager.sport,
      msg: `${wager.customer} ${wager.type} r${wager.risk} · ${wager.legs[0]?.desc ?? ""}`.trim(),
      sev: wager.risk >= 1000 ? "high" : wager.risk >= 300 ? "watch" : "info",
    }));
}

export function deriveMovers(previous: DeskGame[], next: DeskGame[]): DeskMover[] {
  const prior = new Map(previous.map((game) => [gameKey(game), game]));
  const movers: DeskMover[] = [];
  for (const game of next) {
    const before = prior.get(gameKey(game));
    if (!before || before.spread == null || game.spread == null || before.spread === game.spread) continue;
    const delta = game.spread - before.spread;
    movers.push({
      what: `${game.away} ${before.spread} → ${game.spread}`,
      ctx: game.sport,
      dir: delta < 0 ? "dn" : "up",
      chg: `${Math.abs(delta).toFixed(1)} pt`,
      hot: Math.abs(delta) >= 1,
    });
  }
  return movers.slice(0, 8);
}

export type HistoryPoint = { game: string; spread: number };

export function historyFromPoints(points: HistoryPoint[], games: DeskGame[]) {
  const grouped = new Map<string, number[]>();
  for (const point of points) {
    const series = grouped.get(point.game) ?? [];
    series.push(point.spread);
    grouped.set(point.game, series);
  }
  const history: Record<string, {
    market: string;
    open: number;
    now: number;
    signal: number;
    severity: string;
    keys: number[];
    books: string;
    series: number[];
    cascade: [];
  }> = {};
  for (const game of games) {
    const key = gameKey(game);
    const series = grouped.get(key) ?? (game.spread == null ? [] : [game.spread]);
    if (series.length < 2 || game.spread == null) continue;
    const open = series[0] ?? game.spread;
    const now = series[series.length - 1] ?? game.spread;
    const moved = Math.abs(now - open);
    history[key] = {
      market: "SPREAD",
      open,
      now,
      signal: Math.round(Math.min(1, moved / 3) * 100) / 100,
      severity: moved >= 1.5 ? "high" : moved >= 0.5 ? "watch" : "info",
      keys: [],
      books: "F402 LINE",
      series: series.slice(-42),
      cascade: [],
    };
  }
  return history;
}
