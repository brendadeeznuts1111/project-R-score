// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// lib/mcp/sports-leader.ts — stdio client for WalrusQuant/sports-leader-mcp.
// HTTP mode is not used: the child environment never includes PORT.

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** ESPN sportsbook ids documented by sports-leader-mcp. */
export const SPORTSBOOK_PROVIDERS = [
  { id: 38, name: 'Caesars' },
  { id: 37, name: 'FanDuel' },
  { id: 41, name: 'DraftKings' },
  { id: 58, name: 'BetMGM' },
  { id: 68, name: 'ESPN BET' },
  { id: 2000, name: 'Bet365' },
] as const;

/**
 * The 30 slug pairs `list_sports_and_leagues` returns. Other ESPN slugs are
 * unverified and are rejected before a tool call.
 */
export const VERIFIED_LEAGUES = [
  { sport: 'football', league: 'nfl', name: 'NFL' },
  { sport: 'football', league: 'college-football', name: 'NCAA Football (FBS)' },
  { sport: 'football', league: 'cfl', name: 'CFL' },
  { sport: 'football', league: 'ufl', name: 'UFL' },
  { sport: 'basketball', league: 'nba', name: 'NBA' },
  { sport: 'basketball', league: 'wnba', name: 'WNBA' },
  { sport: 'basketball', league: 'mens-college-basketball', name: "NCAA Men's Basketball" },
  { sport: 'basketball', league: 'womens-college-basketball', name: "NCAA Women's Basketball" },
  { sport: 'baseball', league: 'mlb', name: 'MLB' },
  { sport: 'baseball', league: 'college-baseball', name: 'NCAA Baseball' },
  { sport: 'baseball', league: 'college-softball', name: 'NCAA Softball' },
  { sport: 'hockey', league: 'nhl', name: 'NHL' },
  { sport: 'hockey', league: 'mens-college-hockey', name: "NCAA Men's Hockey" },
  { sport: 'soccer', league: 'usa.1', name: 'MLS' },
  { sport: 'soccer', league: 'eng.1', name: 'English Premier League' },
  { sport: 'soccer', league: 'esp.1', name: 'La Liga' },
  { sport: 'soccer', league: 'ger.1', name: 'Bundesliga' },
  { sport: 'soccer', league: 'ita.1', name: 'Serie A' },
  { sport: 'soccer', league: 'fra.1', name: 'Ligue 1' },
  { sport: 'soccer', league: 'uefa.champions', name: 'UEFA Champions League' },
  { sport: 'soccer', league: 'fifa.world', name: 'FIFA World Cup' },
  { sport: 'golf', league: 'pga', name: 'PGA Tour' },
  { sport: 'golf', league: 'lpga', name: 'LPGA Tour' },
  { sport: 'tennis', league: 'atp', name: 'ATP' },
  { sport: 'tennis', league: 'wta', name: 'WTA' },
  { sport: 'mma', league: 'ufc', name: 'UFC' },
  { sport: 'racing', league: 'f1', name: 'Formula 1' },
  { sport: 'racing', league: 'nascar-premier', name: 'NASCAR Cup Series' },
  { sport: 'lacrosse', league: 'pll', name: 'Premier Lacrosse League' },
  { sport: 'australian-football', league: 'afl', name: 'AFL' },
] as const;

export interface PlayerReport {
  query: string;
  athlete: {
    id: string; // brand-ok — ESPN athlete id
    name: string;
    sport: string;
    league: string;
  };
  overview: JsonObject;
  stats: JsonObject;
  splits: JsonObject;
}

export interface SportsLeaderToolResult {
  isError?: boolean;
  content?: Array<{ type?: string; text?: string }>;
}

export type ToolArgs = Record<string, string | number | boolean>;

export type SportsLeaderCaller = (name: string, args: ToolArgs) => Promise<JsonObject>;

export interface SportsLeaderApi {
  getLiveScores(sport: string, league: string): Promise<JsonObject>;
  getGameOdds(
    sport: string,
    league: string,
    eventId: string, // brand-ok — ESPN event id
    providerId?: number
  ): Promise<JsonObject>;
  getSlate(sport: string, league: string, date: string): Promise<JsonObject>;
  getPlayerReport(playerName: string): Promise<PlayerReport>;
}

export interface SportsLeaderSession extends SportsLeaderApi {
  close(): Promise<void>;
}

const DATE_RE = /^\d{8}$/;

export function sportsLeaderEntryPoint(): string {
  return new URL('../../vendor/sports-leader-mcp/dist/index.js', import.meta.url).pathname;
}

/** Child env for the stdio server. PORT is omitted so the process stays on stdio. */
export function sportsLeaderChildEnv(
  source: Record<string, string | undefined> = Bun.env
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && key !== 'PORT') env[key] = value;
  }
  return env;
}

export function isVerifiedLeague(sport: string, league: string): boolean {
  return VERIFIED_LEAGUES.some(row => row.sport === sport && row.league === league);
}

export function parseSportsLeaderDocument(text: string): JsonObject {
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(text) as JsonValue;
  } catch {
    throw new Error(`sports-leader returned non-JSON: ${text.slice(0, 240)}`);
  }
  if (!isJsonObject(parsed)) {
    throw new Error('sports-leader returned a non-object document');
  }
  if (parsed.raw === true) {
    throw new Error('refusing sports-leader raw=true payload');
  }
  return parsed;
}

export function parseSportsLeaderToolResult(value: unknown): JsonObject {
  const result = parseToolResultShape(value);
  const text = result.content?.find(block => block.type === 'text')?.text;
  if (result.isError) {
    throw new Error(text || 'sports-leader tool call failed');
  }
  if (typeof text !== 'string') {
    throw new Error('sports-leader tool returned no text content');
  }
  return parseSportsLeaderDocument(text);
}

export function athleteFromSearch(doc: JsonObject): PlayerReport['athlete'] | undefined {
  const groups = doc.groups;
  if (!Array.isArray(groups)) return undefined;
  for (const group of groups) {
    if (!isJsonObject(group) || group.type !== 'player') continue;
    const results = group.results;
    if (!Array.isArray(results)) continue;
    for (const item of results) {
      if (!isJsonObject(item)) continue;
      const id = readString(item, 'id');
      const name = readString(item, 'name');
      const sport = readString(item, 'sport');
      const league = readString(item, 'league');
      if (!id || !name || !sport || !league) continue;
      if (!isVerifiedLeague(sport, league)) continue;
      return { id, name, sport, league };
    }
  }
  return undefined;
}

export function createSportsLeaderApi(call: SportsLeaderCaller): SportsLeaderApi {
  return {
    async getLiveScores(sport, league) {
      requireVerifiedLeague(sport, league);
      return call('get_scoreboard', { sport, league });
    },
    async getGameOdds(sport, league, eventId, providerId) {
      requireVerifiedLeague(sport, league);
      if (eventId.trim().length === 0) throw new Error('eventId is required');
      const args: ToolArgs = { sport, league, eventId };
      if (providerId !== undefined) {
        if (!Number.isInteger(providerId)) throw new Error('providerId must be an integer');
        args.providerId = providerId;
      }
      return call('get_game_odds', args);
    },
    async getSlate(sport, league, date) {
      requireVerifiedLeague(sport, league);
      if (!DATE_RE.test(date)) throw new Error('date must be YYYYMMDD');
      return call('get_slate', { sport, league, date });
    },
    async getPlayerReport(playerName) {
      const query = playerName.trim();
      if (query.length === 0) throw new Error('playerName is required');
      const search = await call('search', { query, limit: 10 });
      const athlete = athleteFromSearch(search);
      if (!athlete) throw new Error(`no verified athlete matches "${query}"`);
      const toolArgs = { sport: athlete.sport, league: athlete.league, athleteId: athlete.id };
      const [overview, stats, splits] = await Promise.all([
        call('get_athlete_overview', toolArgs),
        call('get_athlete_stats', toolArgs),
        call('get_athlete_splits', toolArgs),
      ]);
      return { query, athlete, overview, stats, splits };
    },
  };
}

export async function connectSportsLeader(): Promise<SportsLeaderSession> {
  const entry = sportsLeaderEntryPoint();
  if (!(await Bun.file(entry).exists())) {
    throw new Error(
      `sports-leader-mcp is not built at ${entry}. Clone ` +
        'https://github.com/WalrusQuant/sports-leader-mcp.git into vendor/sports-leader-mcp ' +
        'and run npm install && npm run build.'
    );
  }
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const client = new Client({ name: 'factorywager-sports-leader', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: [entry],
    env: sportsLeaderChildEnv(),
    stderr: 'ignore',
  });
  await client.connect(transport);
  const call: SportsLeaderCaller = async (name, args) => {
    const result: unknown = await client.callTool({
      name,
      arguments: toolArguments(args),
    });
    return parseSportsLeaderToolResult(result);
  };
  const api = createSportsLeaderApi(call);
  return {
    ...api,
    close: async () => {
      await client.close();
    },
  };
}

let sessionPromise: Promise<SportsLeaderSession> | undefined;

async function session(): Promise<SportsLeaderSession> {
  if (!sessionPromise) {
    sessionPromise = connectSportsLeader().catch(err => {
      sessionPromise = undefined;
      throw err;
    });
  }
  return sessionPromise;
}

export async function closeSportsLeader(): Promise<void> {
  const current = sessionPromise;
  sessionPromise = undefined;
  if (!current) return;
  const open = await current;
  await open.close();
}

export async function getLiveScores(sport: string, league: string): Promise<JsonObject> {
  return (await session()).getLiveScores(sport, league);
}

export async function getGameOdds(
  sport: string,
  league: string,
  eventId: string, // brand-ok — ESPN event id
  providerId?: number
): Promise<JsonObject> {
  return (await session()).getGameOdds(sport, league, eventId, providerId);
}

export async function getSlate(sport: string, league: string, date: string): Promise<JsonObject> {
  return (await session()).getSlate(sport, league, date);
}

export async function getPlayerReport(playerName: string): Promise<PlayerReport> {
  return (await session()).getPlayerReport(playerName);
}

function toolArguments(args: ToolArgs): { [key: string]: unknown } {
  const out: { [key: string]: unknown } = {};
  for (const [key, value] of Object.entries(args)) out[key] = value;
  return out;
}

function requireVerifiedLeague(sport: string, league: string): void {
  if (!isVerifiedLeague(sport, league)) {
    throw new Error(
      `unverified ESPN slug ${sport}/${league}. ` +
        `Use one of the ${VERIFIED_LEAGUES.length} leagues from list_sports_and_leagues.`
    );
  }
}

function readString(obj: JsonObject, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTextBlock(value: unknown): value is { type?: string; text?: string } {
  return typeof value === 'object' && value !== null;
}

function parseToolResultShape(value: unknown): SportsLeaderToolResult {
  if (typeof value !== 'object' || value === null) {
    throw new Error('sports-leader tool result was not an object');
  }
  const record = value as { isError?: unknown; content?: unknown };
  const content = Array.isArray(record.content) ? record.content.filter(isTextBlock) : undefined;
  return { isError: record.isError === true, content };
}
