/**
 * @fileoverview League taxonomy and normalization
 * @module orca/taxonomy/league
 */

import type { OrcaLeague, OrcaSport } from "../../types";
import { generateLeagueId } from "../namespace";

/**
 * Canonical league definitions
 */
export const LEAGUES: Record<string, Omit<OrcaLeague, "id">> = {
	// US Major Leagues
	nba: { name: "NBA", sport: "NBA", country: "USA" },
	nfl: { name: "NFL", sport: "NFL", country: "USA" },
	mlb: { name: "MLB", sport: "MLB", country: "USA" },
	nhl: { name: "NHL", sport: "NHL", country: "USA" },

	// College
	ncaaf: { name: "NCAA Football", sport: "NCAAF", country: "USA" },
	ncaab: { name: "NCAA Basketball", sport: "NCAAB", country: "USA" },

	// Soccer
	epl: { name: "English Premier League", sport: "EPL", country: "England" },
	laliga: { name: "La Liga", sport: "LALIGA", country: "Spain" },
	bundesliga: { name: "Bundesliga", sport: "BUNDESLIGA", country: "Germany" },
	seriea: { name: "Serie A", sport: "SERIEA", country: "Italy" },
	ligue1: { name: "Ligue 1", sport: "LIGUE1", country: "France" },
	mls: { name: "Major League Soccer", sport: "MLS", country: "USA" },

	// Combat
	ufc: { name: "UFC", sport: "UFC", country: "USA" },

	// Tennis
	atp: { name: "ATP Tour", sport: "TENNIS", country: "International" },
	wta: { name: "WTA Tour", sport: "TENNIS", country: "International" },

	// Golf
	pga: { name: "PGA Tour", sport: "GOLF", country: "USA" },
};

/**
 * League aliases by bookmaker
 */
export const LEAGUE_ALIASES: Record<string, string> = {
	// NBA
	nba: "nba",
	"national basketball association": "nba",
	"nba basketball": "nba",
	"pro basketball": "nba",

	// NFL
	nfl: "nfl",
	"national football league": "nfl",
	"nfl football": "nfl",
	"pro football": "nfl",

	// MLB
	mlb: "mlb",
	"major league baseball": "mlb",
	"mlb baseball": "mlb",
	"pro baseball": "mlb",

	// NHL
	nhl: "nhl",
	"national hockey league": "nhl",
	"nhl hockey": "nhl",
	"pro hockey": "nhl",

	// College
	"ncaa football": "ncaaf",
	ncaaf: "ncaaf",
	"college football": "ncaaf",
	cfb: "ncaaf",
	"ncaa basketball": "ncaab",
	ncaab: "ncaab",
	"college basketball": "ncaab",
	cbb: "ncaab",

	// Soccer
	"premier league": "epl",
	"english premier league": "epl",
	epl: "epl",
	"england premier league": "epl",
	"la liga": "laliga",
	laliga: "laliga",
	"spanish la liga": "laliga",
	bundesliga: "bundesliga",
	"german bundesliga": "bundesliga",
	"serie a": "seriea",
	seriea: "seriea",
	"italian serie a": "seriea",
	"ligue 1": "ligue1",
	ligue1: "ligue1",
	"french ligue 1": "ligue1",
	mls: "mls",
	"major league soccer": "mls",

	// UFC
	ufc: "ufc",
	"ultimate fighting championship": "ufc",

	// Tennis
	atp: "atp",
	"atp tour": "atp",
	wta: "wta",
	"wta tour": "wta",

	// Golf
	pga: "pga",
	"pga tour": "pga",
};

/**
 * Resolves raw league name to canonical league key
 */
export function resolveLeague(rawLeague: string): string | null {
	const normalized = rawLeague.toLowerCase().trim();
	return LEAGUE_ALIASES[normalized] || null;
}

/**
 * Gets full league object with generated ID
 */
export function getLeague(leagueKey: string): OrcaLeague | null {
	const league = LEAGUES[leagueKey];
	if (!league) return null;

	return {
		...league,
		id: generateLeagueId(league.sport, league.name),
	};
}

/**
 * Lists all leagues for a sport
 */
export function getLeaguesBySport(sport: OrcaSport): OrcaLeague[] {
	return Object.entries(LEAGUES)
		.filter(([_, league]) => league.sport === sport)
		.map(([key, league]) => ({
			...league,
			id: generateLeagueId(league.sport, league.name),
		}));
}
