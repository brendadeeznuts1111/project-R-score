import { Hono } from "hono";
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type SortKey =
	| "risk"
	| "agent"
	| "sport"
	| "time"
	| "vig"
	| "movement"
	| "clv";

type FilterKey =
	| "highjuice"
	| "goodmovement"
	| "buyingpoints"
	| "futuregames"
	| "clvpositive";

interface Fantasy402BetRow {
	id: string;
	betGroupId: string;
	ticketNumber: string;
	profile: string;
	agent: string;
	bet: string;
	result: string;
	sID: string;
	eventStartTime: string;
	team1: string;
	team2: string;
	period: string;
	marketTypeCategory: string;
	logTime: string;
	acceptTime: string;
	calcTime: string;
	state: string;
	delay: string;
	fVal: string;
	fVal_new: string;
	finalUncorrelatedOdds: string;
	player: string;
	marketId: string;
	odds: string;
	description?: string;
	juicePct?: string;
	vigPct?: string;
	buyingPoints?: string;
	movementPts?: string;
	clvPct?: string;
	lastJuiceParse?: string;
}

interface NormalizedBet {
	id: string;
	betGroupId: string;
	ticketNumber: string;
	customer: string;
	agent: string;
	player: string;
	sport: string;
	game: string;
	period: string;
	market: string;
	description: string;
	odds: string;
	risk: number;
	result: number;
	vigPct: number;
	juicePct: number;
	buyingPoints: boolean;
	movementPts: number;
	clvPct: number;
	eventTime: number | null;
	betTime: number | null;
	delaySeconds: number;
	state: string;
}

interface TopGameRow {
	game: string;
	sport: string;
	totalRisk: number;
	totalBets: number;
	avgVigPct: number;
	avgMovementPts: number;
	avgClvPct: number;
	lastBetTime: number | null;
	customers: string[];
	bets: Array<{
		customer: string;
		agent: string;
		risk: number;
		betTime: number | null;
		movementPts: number;
		vigPct: number;
		clvPct: number;
		description: string;
	}>;
}

const fantasy402Api = new Hono();

const DB_PATH = process.env.FANTASY402_DB_PATH ||
	resolve(
		dirname(import.meta.dir),
		"../../concise-mcp-agents/datapipe.db",
	);

const SOURCE_PORT = Number(process.env.FANTASY402_SOURCE_PORT || "5000");
const STATUS_SAMPLE_LIMIT = 1200;
const FILTER_SET = new Set<FilterKey>([
	"highjuice",
	"goodmovement",
	"buyingpoints",
	"futuregames",
	"clvpositive",
]);

fantasy402Api.get("/urgent", (c) => {
	const bets = getNormalizedBets().filter((bet) => bet.risk > 1000);
	const items = sortBets(bets, "risk").slice(0, 100);

	return c.json({
		items,
		summary: {
			total: items.length,
			maxRisk: items[0]?.risk || 0,
			avgClvPct: round(avg(items.map((item) => item.clvPct))),
			avgMovementPts: round(avg(items.map((item) => item.movementPts))),
		},
	});
});

fantasy402Api.get("/patterns", (c) => {
	const bets = getNormalizedBets();
	const byAgent = summarizeGroup(bets, (bet) => bet.agent);
	const bySport = summarizeGroup(bets, (bet) => bet.sport);
	const byHour = summarizeGroup(
		bets,
		(bet) =>
			bet.betTime === null
				? "unknown"
				: new Date(bet.betTime * 1000).getHours().toString().padStart(2, "0"),
	);

	return c.json({
		heatmaps: {
			agent: byAgent,
			sport: bySport,
			time: byHour,
		},
		summaries: {
			totalBets: bets.length,
			totalRisk: round(sum(bets.map((bet) => bet.risk))),
			avgVigPct: round(avg(bets.map((bet) => bet.vigPct))),
			avgClvPct: round(avg(bets.map((bet) => bet.clvPct))),
			buyingPointsCount: bets.filter((bet) => bet.buyingPoints).length,
			highJuiceCount: bets.filter((bet) => bet.vigPct >= 4.76).length,
		},
	});
});

fantasy402Api.get("/search", (c) => {
	const q = (c.req.query("q") || "").trim().toLowerCase();
	const sort = parseSort(c.req.query("sort"));
	const filters = parseFilters(c.req.query("filter"));

	let bets = getNormalizedBets();
	if (q) {
		bets = bets.filter((bet) =>
			[
				bet.customer,
				bet.agent,
				bet.player,
				bet.game,
				bet.market,
				bet.description,
				bet.sport,
			]
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}

	const items = sortBets(applyFilters(bets, filters), sort).slice(0, 250);
	return c.json({ items, query: q, sort, filters });
});

fantasy402Api.get("/history", (c) => {
	const days = Math.max(1, Number(c.req.query("days") || "1"));
	const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
	const items = sortBets(
		getNormalizedBets().filter((bet) => (bet.betTime || 0) >= cutoff),
		"time",
	).slice(0, 250);

	return c.json({
		items,
		meta: {
			days,
			total: items.length,
		},
	});
});

fantasy402Api.get("/topgames", (c) => {
	const items = buildTopGames(getNormalizedBets()).slice(0, 100);
	return c.json({
		items,
		meta: {
			total: items.length,
		},
	});
});

fantasy402Api.get("/status", (c) => {
	const { dbExists, dbCount, latestJuiceParse } = getDbStatus();
	const bets = getNormalizedBets(200);

	return c.json({
		port: SOURCE_PORT,
		uptimeSeconds: Math.round(process.uptime()),
		dbPath: DB_PATH,
		dbExists,
		dbCount,
		lastJuiceParse: latestJuiceParse,
		fantasy402Connection: dbExists && dbCount > 0,
		vigStats: {
			avgVigPct: round(avg(bets.map((bet) => bet.vigPct))),
			maxVigPct: round(max(bets.map((bet) => bet.vigPct))),
			avgClvPct: round(avg(bets.map((bet) => bet.clvPct))),
		},
	});
});

function getDbStatus(): {
	dbExists: boolean;
	dbCount: number;
	latestJuiceParse: string | null;
} {
	if (!existsSync(DB_PATH)) {
		return { dbExists: false, dbCount: 0, latestJuiceParse: null };
	}

	const db = new Database(DB_PATH, { readonly: true });
	try {
		const countRow = db
			.query("SELECT COUNT(*) AS count FROM bets")
			.get() as { count: number } | null;
		const latestRow = db
			.query(
				"SELECT lastJuiceParse FROM bets WHERE lastJuiceParse IS NOT NULL AND lastJuiceParse != '' ORDER BY lastJuiceParse DESC LIMIT 1",
			)
			.get() as { lastJuiceParse?: string } | null;

		return {
			dbExists: true,
			dbCount: countRow?.count || 0,
			latestJuiceParse: latestRow?.lastJuiceParse || null,
		};
	} finally {
		db.close();
	}
}

function getNormalizedBets(limit = STATUS_SAMPLE_LIMIT): NormalizedBet[] {
	if (!existsSync(DB_PATH)) {
		return [];
	}

	const db = new Database(DB_PATH, { readonly: true });
	try {
		const hasEnhancedColumns = columnExists(db, "bets", "lastJuiceParse");
		const query = hasEnhancedColumns
			? `SELECT id, betGroupId, ticketNumber, profile, agent, bet, result, sID, eventStartTime, team1, team2,
          period, marketTypeCategory, logTime, acceptTime, calcTime, state, delay, fVal, fVal_new,
          finalUncorrelatedOdds, player, marketId, odds, description, juicePct, vigPct, buyingPoints,
          movementPts, clvPct, lastJuiceParse
        FROM bets
        ORDER BY COALESCE(CAST(calcTime AS INTEGER), CAST(logTime AS INTEGER), CAST(acceptTime AS INTEGER), 0) DESC
        LIMIT ?`
			: `SELECT id, betGroupId, ticketNumber, profile, agent, bet, result, sID, eventStartTime, team1, team2,
          period, marketTypeCategory, logTime, acceptTime, calcTime, state, delay, fVal, fVal_new,
          finalUncorrelatedOdds, player, marketId, odds
        FROM bets
        ORDER BY COALESCE(CAST(calcTime AS INTEGER), CAST(logTime AS INTEGER), CAST(acceptTime AS INTEGER), 0) DESC
        LIMIT ?`;

		const rows = db.query(query).all(limit) as Fantasy402BetRow[];
		return rows.map(normalizeBetRow);
	} finally {
		db.close();
	}
}

function normalizeBetRow(row: Fantasy402BetRow): NormalizedBet {
	const description =
		row.description ||
		[row.player, row.marketTypeCategory, row.period].filter(Boolean).join(" | ");
	const extractedOdds = extractAmericanOdds(description) ?? extractAmericanOdds(row.odds);
	const juicePct = parseNumber(row.juicePct) ?? calculateJuicePct(extractedOdds);
	const vigPct = parseNumber(row.vigPct) ?? juicePct;
	const movementPts =
		parseNumber(row.movementPts) ??
		deriveMovementPts(row.fVal, row.fVal_new, extractedOdds, row.finalUncorrelatedOdds);
	const clvPct =
		parseNumber(row.clvPct) ??
		deriveClvPct(extractedOdds, row.finalUncorrelatedOdds, movementPts);

	return {
		id: row.id,
		betGroupId: row.betGroupId,
		ticketNumber: row.ticketNumber,
		customer: row.profile || "Unknown",
		agent: row.agent || "Unknown",
		player: row.player || "Unknown",
		sport: row.sID || "Unknown",
		game: [row.team1, row.team2].filter(Boolean).join(" vs ") || "Unknown Game",
		period: row.period || "",
		market: row.marketTypeCategory || "",
		description,
		odds: row.odds || "",
		risk: parseNumber(row.bet) ?? 0,
		result: parseNumber(row.result) ?? 0,
		vigPct,
		juicePct,
		buyingPoints:
			parseBoolean(row.buyingPoints) || /buy(?:ing)?\s*points?/i.test(description),
		movementPts,
		clvPct,
		eventTime: parseTime(row.eventStartTime),
		betTime: parseTime(row.calcTime) ?? parseTime(row.acceptTime) ?? parseTime(row.logTime),
		delaySeconds: parseNumber(row.delay) ?? 0,
		state: row.state || "",
	};
}

function summarizeGroup(
	bets: NormalizedBet[],
	getKey: (bet: NormalizedBet) => string,
): Array<Record<string, string | number>> {
	const buckets = new Map<
		string,
		{ count: number; risk: number; clvPct: number[]; vigPct: number[] }
	>();

	for (const bet of bets) {
		const key = getKey(bet) || "unknown";
		const bucket = buckets.get(key) || {
			count: 0,
			risk: 0,
			clvPct: [],
			vigPct: [],
		};
		bucket.count += 1;
		bucket.risk += bet.risk;
		bucket.clvPct.push(bet.clvPct);
		bucket.vigPct.push(bet.vigPct);
		buckets.set(key, bucket);
	}

	return Array.from(buckets.entries())
		.map(([label, stats]) => ({
			label,
			count: stats.count,
			risk: round(stats.risk),
			avgClvPct: round(avg(stats.clvPct)),
			avgVigPct: round(avg(stats.vigPct)),
		}))
		.sort((a, b) => Number(b.risk) - Number(a.risk));
}

function buildTopGames(bets: NormalizedBet[]): TopGameRow[] {
	const groups = new Map<string, TopGameRow>();

	for (const bet of bets) {
		const key = bet.game;
		const existing = groups.get(key) || {
			game: bet.game,
			sport: bet.sport,
			totalRisk: 0,
			totalBets: 0,
			avgVigPct: 0,
			avgMovementPts: 0,
			avgClvPct: 0,
			lastBetTime: null,
			customers: [],
			bets: [],
		};

		existing.totalRisk += bet.risk;
		existing.totalBets += 1;
		existing.avgVigPct += bet.vigPct;
		existing.avgMovementPts += bet.movementPts;
		existing.avgClvPct += bet.clvPct;
		existing.lastBetTime = Math.max(existing.lastBetTime || 0, bet.betTime || 0) || null;
		if (!existing.customers.includes(bet.customer)) {
			existing.customers.push(bet.customer);
		}
		existing.bets.push({
			customer: bet.customer,
			agent: bet.agent,
			risk: bet.risk,
			betTime: bet.betTime,
			movementPts: bet.movementPts,
			vigPct: bet.vigPct,
			clvPct: bet.clvPct,
			description: bet.description,
		});

		groups.set(key, existing);
	}

	return Array.from(groups.values())
		.map((game) => ({
			...game,
			avgVigPct: round(game.avgVigPct / Math.max(game.totalBets, 1)),
			avgMovementPts: round(game.avgMovementPts / Math.max(game.totalBets, 1)),
			avgClvPct: round(game.avgClvPct / Math.max(game.totalBets, 1)),
			bets: game.bets
				.sort((a, b) => b.risk - a.risk)
				.slice(0, 5),
		}))
		.sort((a, b) => b.totalRisk - a.totalRisk);
}

function sortBets(bets: NormalizedBet[], sort: SortKey): NormalizedBet[] {
	const items = [...bets];
	items.sort((left, right) => {
		switch (sort) {
			case "agent":
				return left.agent.localeCompare(right.agent);
			case "sport":
				return left.sport.localeCompare(right.sport);
			case "time":
				return (right.betTime || 0) - (left.betTime || 0);
			case "vig":
				return right.vigPct - left.vigPct;
			case "movement":
				return right.movementPts - left.movementPts;
			case "clv":
				return right.clvPct - left.clvPct;
			case "risk":
			default:
				return right.risk - left.risk;
		}
	});
	return items;
}

function applyFilters(bets: NormalizedBet[], filters: FilterKey[]): NormalizedBet[] {
	if (filters.length === 0) {
		return bets;
	}

	const now = Math.floor(Date.now() / 1000);
	return bets.filter((bet) =>
		filters.every((filter) => {
			switch (filter) {
				case "highjuice":
					return bet.vigPct >= 4.76;
				case "goodmovement":
					return bet.movementPts > 0 || bet.clvPct > 0;
				case "buyingpoints":
					return bet.buyingPoints;
				case "futuregames":
					return (bet.eventTime || 0) > now;
				case "clvpositive":
					return bet.clvPct > 0;
				default:
					return true;
			}
		}),
	);
}

function parseSort(input?: string): SortKey {
	switch ((input || "").toLowerCase()) {
		case "agent":
		case "sport":
		case "time":
		case "vig":
		case "movement":
		case "clv":
			return input.toLowerCase() as SortKey;
		default:
			return "risk";
	}
}

function parseFilters(filterParam?: string): FilterKey[] {
	if (!filterParam) {
		return [];
	}

	return filterParam
		.split(",")
		.map((value) => value.trim().toLowerCase() as FilterKey)
		.filter((value) => FILTER_SET.has(value));
}

function calculateJuicePct(americanOdds: number | null): number {
	if (americanOdds === null) {
		return 0;
	}

	const impliedProbability =
		americanOdds < 0
			? Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
			: 100 / (americanOdds + 100);

	return round(Math.max(0, impliedProbability * 2 - 1) * 100);
}

function deriveMovementPts(
	openingValue: string,
	closingValue: string,
	openingOdds: number | null,
	closingOddsText: string,
): number {
	const opening = parseNumber(openingValue);
	const closing = parseNumber(closingValue);
	if (opening !== null && closing !== null) {
		return round(closing - opening);
	}

	const closingOdds = extractAmericanOdds(closingOddsText);
	if (openingOdds !== null && closingOdds !== null) {
		return round(closingOdds - openingOdds);
	}

	return 0;
}

function deriveClvPct(
	openingOdds: number | null,
	closingOddsText: string,
	movementPts: number,
): number {
	const closingOdds = extractAmericanOdds(closingOddsText);
	if (openingOdds !== null && closingOdds !== null) {
		const openingProb =
			openingOdds < 0
				? Math.abs(openingOdds) / (Math.abs(openingOdds) + 100)
				: 100 / (openingOdds + 100);
		const closingProb =
			closingOdds < 0
				? Math.abs(closingOdds) / (Math.abs(closingOdds) + 100)
				: 100 / (closingOdds + 100);
		return round((closingProb - openingProb) * 100);
	}

	return round(movementPts);
}

function extractAmericanOdds(value: string): number | null {
	const match = value.match(/([+-]\d{3})/);
	return match ? Number(match[1]) : null;
}

function parseNumber(value?: string): number | null {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const normalized = String(value).replace(/[^0-9+-.]/g, "");
	if (!normalized) {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value?: string): boolean {
	return value === "1" || value === "true";
}

function parseTime(value?: string): number | null {
	const parsed = parseNumber(value);
	return parsed === null ? null : parsed;
}

function columnExists(db: Database, tableName: string, columnName: string): boolean {
	const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{
		name: string;
	}>;
	return columns.some((column) => column.name === columnName);
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function avg(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	return sum(values) / values.length;
}

function max(values: number[]): number {
	return values.length === 0 ? 0 : Math.max(...values);
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

export default fantasy402Api;
