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
  league?: string;
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

const SPORT_WORDS = ["Martial Arts", "Hockey", "Football", "Baseball", "Basketball", "Soccer", "Tennis", "Golf"];

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
    league: leagueFromBoard({
      sport: String(row.SportType || row.SportSubType || "?").trim(),
      away,
      home,
      league: leagueLabel(String(row.SportSubType || row.SportType || "")),
    }),
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
    .map((wager) => {
      const ticket = ticketOf(wager);
      return {
        t: clockLabel(wager.ts),
        title: ticket.league,
        msg: `${ticket.market} r${wager.risk} · ${ticket.selection}`.trim(),
        sev: wager.risk >= 1000 ? "high" : wager.risk >= 300 ? "watch" : "info",
      };
    });
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

const LEAGUE_WORDS = ["NCAAF", "NCAAB", "WNBA", "NFL", "MLB", "NHL", "NBA", "EPL", "UCL", "MLS"] as const;

const NFL_CLUBS = [
  "chiefs", "ravens", "bills", "bengals", "49ers", "rams", "raiders", "giants", "titans", "texans",
  "saints", "falcons", "jets", "broncos", "dolphins", "packers", "bears", "lions", "vikings",
  "cowboys", "eagles", "commanders", "steelers", "browns", "colts", "jaguars", "patriots",
  "buccaneers", "panthers", "seahawks", "cardinals", "chargers",
];

const COLLEGE_CLUBS = [
  "southern miss", "troy", "texas a&m", "missouri", "florida st", "florida state", "louisville",
  "lsu", "alabama", "kennesaw", "ole miss", "tennessee", "washington", "texas", "nebraska", "wisconsin",
];

export type TicketParts = {
  code: string;
  sport: string;
  rotation: number | null;
  selection: string;
  league: string;
  market: string;
};

export type LeagueRow = {
  league: string;
  sport: string;
  tickets: number;
  risk: number;
  win: number;
  straight: number;
  parlay: number;
  games: number;
};

export function cleanDesc(desc: string): string {
  return desc
    .replace(/&#189;|&frac12;/gi, "½")
    .replace(/&#188;|&frac14;/gi, "¼")
    .replace(/&#190;|&frac34;/gi, "¾")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alt-line ids embed the board rotation, such as 1130101 → 301. */
export function baseRotation(sport: string, rotation: number | null): number | null {
  if (rotation == null || !Number.isFinite(rotation)) return null;
  if (rotation < 1000) return rotation;
  const digits = String(Math.trunc(rotation));
  const bands =
    sport === "FOOTBALL"
      ? [[300, 499], [200, 299], [100, 199]]
      : sport === "BASEBALL"
        ? [[800, 999]]
        : sport === "BASKETBALL"
          ? [[500, 699]]
          : sport === "HOCKEY"
            ? [[1, 99]]
            : [];
  for (const [lo, hi] of bands) {
    let found: number | null = null;
    for (let i = 0; i + 3 <= digits.length; i++) {
      const chunk = Number(digits.slice(i, i + 3));
      if (chunk >= lo! && chunk <= hi!) found = chunk;
    }
    if (found != null) return found;
  }
  return rotation;
}

export function leagueFor(sport: string, rotation: number | null, desc = ""): string {
  const text = `${sport} ${desc}`.toUpperCase();
  for (const name of LEAGUE_WORDS) {
    if (new RegExp(`\\b${name}\\b`).test(text)) return name;
  }
  const family = sport.toUpperCase();
  const n = baseRotation(family, rotation);
  if (family === "BASEBALL") {
    if (rotation != null && rotation >= 300000 && rotation < 400000) return "KBO";
    return "MLB";
  }
  if (family === "FOOTBALL") {
    if (n != null && ((n >= 200 && n < 300) || (n >= 451 && n <= 499))) return "NFL";
    return "NCAAF";
  }
  if (family === "HOCKEY") return "NHL";
  if (family === "BASKETBALL") {
    if (n != null && n >= 600 && n < 700) return "WNBA";
    return "NBA";
  }
  if (family === "SOCCER") return "SOCCER";
  if (family === "MARTIAL ARTS" || family === "MMA" || family === "UFC") return "UFC";
  if (family === "GOLF") return "GOLF";
  if (family === "TENNIS") return "TENNIS";
  return family || "OTHER";
}

function leagueLabel(raw: string): string {
  const text = raw.trim().toUpperCase();
  if (!text || text === "?" ) return "";
  for (const name of LEAGUE_WORDS) {
    if (text === name) return name;
  }
  return "";
}

export function leagueFromBoard(game: { sport: string; away: string; home: string; league?: string }): string {
  if (game.league) return game.league;
  const sport = game.sport.trim().toUpperCase();
  if ((LEAGUE_WORDS as readonly string[]).includes(sport) || sport === "SOCCER" || sport === "GOLF" || sport === "TENNIS" || sport === "KBO") {
    return sport;
  }
  const names = `${game.away} ${game.home}`.toLowerCase();
  if (sport === "FOOTBALL") {
    if (COLLEGE_CLUBS.some((club) => names.includes(club))) return "NCAAF";
    if (NFL_CLUBS.some((club) => names.includes(club))) return "NFL";
    return "NCAAF";
  }
  if (sport === "BASEBALL") return names.includes("landers") || names.includes("hanwha") ? "KBO" : "MLB";
  if (sport === "HOCKEY") return "NHL";
  if (sport === "BASKETBALL") return "NBA";
  if (sport === "SOCCER") return "SOCCER";
  return sport || "OTHER";
}

const MARKET: Record<string, string> = {
  S: "spread",
  M: "moneyline",
  L: "total",
  P: "parlay",
  T: "teaser",
  E: "total",
  I: "ifbet",
  C: "prop",
};

export function parseTicket(desc: string): TicketParts {
  const text = cleanDesc(desc);
  const match = text.match(/^([A-Za-z])[.:\s]\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+#(\d+)\s*(.*)$/);
  if (!match) {
    const sport = sportOf(text, "OTHER");
    return { code: "", sport, rotation: null, selection: text, league: leagueFor(sport, null, text), market: "straight" };
  }
  const code = match[1]!.toUpperCase();
  const sport = match[2]!.toUpperCase();
  const rotation = Number(match[3]);
  const selection = (match[4] ?? "").trim();
  return {
    code,
    sport,
    rotation,
    selection,
    league: leagueFor(sport, rotation, text),
    market: MARKET[code] ?? "straight",
  };
}

export function ticketOf(wager: DeskWager): TicketParts {
  const legs = wager.legs.map((leg) => parseTicket(leg.desc));
  const first = legs[0] ?? parseTicket("");
  const leagues = [...new Set(legs.map((leg) => leg.league).filter(Boolean))];
  return {
    ...first,
    sport: first.sport || wager.sport,
    league: leagues.length > 1 ? "MULTI" : leagues[0] || leagueFor(wager.sport, first.rotation, first.selection),
    market: first.market || wager.type,
  };
}

export function rollupLeagues(wagers: DeskWager[], games: DeskGame[]): LeagueRow[] {
  const by = new Map<string, LeagueRow>();
  const touch = (league: string, sport: string): LeagueRow => {
    const current = by.get(league) ?? { league, sport, tickets: 0, risk: 0, win: 0, straight: 0, parlay: 0, games: 0 };
    if (!current.sport && sport) current.sport = sport;
    by.set(league, current);
    return current;
  };
  for (const wager of wagers) {
    const ticket = ticketOf(wager);
    const row = touch(ticket.league, ticket.sport || wager.sport);
    row.tickets += 1;
    row.risk += Number(wager.risk) || 0;
    row.win += Number(wager.win) || 0;
    if (wager.type === "parlay" || ticket.market === "parlay") row.parlay += 1;
    else row.straight += 1;
  }
  for (const game of games) {
    const league = leagueFromBoard(game);
    touch(league, game.sport).games += 1;
  }
  return [...by.values()].sort((a, b) => b.risk - a.risk || b.tickets - a.tickets || a.league.localeCompare(b.league));
}
