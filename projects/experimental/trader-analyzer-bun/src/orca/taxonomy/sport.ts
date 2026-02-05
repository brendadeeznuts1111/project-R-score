/**
 * @fileoverview Sport taxonomy and normalization
 * @module orca/taxonomy/sport
 */

import type { OrcaSport } from "../../types";

/**
 * Canonical sport definitions with metadata
 */
export const SPORTS: Record<
	OrcaSport,
	{ name: string; country: string; type: string }
> = {
	// US Major Sports
	NFL: {
		name: "National Football League",
		country: "USA",
		type: "american_football",
	},
	NBA: {
		name: "National Basketball Association",
		country: "USA",
		type: "basketball",
	},
	MLB: { name: "Major League Baseball", country: "USA", type: "baseball" },
	NHL: {
		name: "National Hockey League",
		country: "USA/Canada",
		type: "ice_hockey",
	},
	NCAAF: { name: "NCAA Football", country: "USA", type: "american_football" },
	NCAAB: { name: "NCAA Basketball", country: "USA", type: "basketball" },

	// Soccer Leagues
	EPL: { name: "English Premier League", country: "England", type: "soccer" },
	LALIGA: { name: "La Liga", country: "Spain", type: "soccer" },
	BUNDESLIGA: { name: "Bundesliga", country: "Germany", type: "soccer" },
	SERIEA: { name: "Serie A", country: "Italy", type: "soccer" },
	LIGUE1: { name: "Ligue 1", country: "France", type: "soccer" },
	MLS: { name: "Major League Soccer", country: "USA", type: "soccer" },

	// Combat Sports
	UFC: { name: "Ultimate Fighting Championship", country: "USA", type: "mma" },
	BOXING: { name: "Boxing", country: "International", type: "boxing" },

	// Individual Sports
	TENNIS: { name: "Tennis", country: "International", type: "tennis" },
	GOLF: { name: "Golf", country: "International", type: "golf" },

	// Esports
	ESPORTS: { name: "Esports", country: "International", type: "esports" },
};

/**
 * Sport aliases by bookmaker - maps raw sport names to canonical OrcaSport
 */
export const SPORT_ALIASES: Record<string, OrcaSport> = {
	// NFL aliases
	nfl: "NFL",
	"nfl football": "NFL",
	"pro football": "NFL",
	"american football - nfl": "NFL",
	"football - nfl": "NFL",

	// NBA aliases
	nba: "NBA",
	"nba basketball": "NBA",
	"pro basketball": "NBA",
	"basketball - nba": "NBA",
	basketball: "NBA",

	// MLB aliases
	mlb: "MLB",
	"mlb baseball": "MLB",
	"pro baseball": "MLB",
	"baseball - mlb": "MLB",

	// NHL aliases
	nhl: "NHL",
	"nhl hockey": "NHL",
	"pro hockey": "NHL",
	"ice hockey - nhl": "NHL",

	// College Football aliases
	ncaaf: "NCAAF",
	"ncaa football": "NCAAF",
	"college football": "NCAAF",
	cfb: "NCAAF",

	// College Basketball aliases
	ncaab: "NCAAB",
	"ncaa basketball": "NCAAB",
	"college basketball": "NCAAB",
	cbb: "NCAAB",

	// Soccer aliases
	epl: "EPL",
	"premier league": "EPL",
	"english premier league": "EPL",
	"england - premier league": "EPL",
	"la liga": "LALIGA",
	laliga: "LALIGA",
	"spain - la liga": "LALIGA",
	bundesliga: "BUNDESLIGA",
	"german bundesliga": "BUNDESLIGA",
	"germany - bundesliga": "BUNDESLIGA",
	"serie a": "SERIEA",
	seriea: "SERIEA",
	"italy - serie a": "SERIEA",
	"ligue 1": "LIGUE1",
	ligue1: "LIGUE1",
	"france - ligue 1": "LIGUE1",
	mls: "MLS",
	"major league soccer": "MLS",

	// Combat Sports aliases
	ufc: "UFC",
	mma: "UFC",
	"mixed martial arts": "UFC",
	boxing: "BOXING",

	// Individual Sports aliases
	tennis: "TENNIS",
	atp: "TENNIS",
	wta: "TENNIS",
	golf: "GOLF",
	pga: "GOLF",

	// Esports aliases
	esports: "ESPORTS",
	"e-sports": "ESPORTS",
	lol: "ESPORTS",
	csgo: "ESPORTS",
	cs2: "ESPORTS",
	dota2: "ESPORTS",
};

/**
 * Resolves raw sport name to canonical OrcaSport
 *
 * @param rawSport - Raw sport name from bookmaker
 * @returns Canonical sport or null if not found
 */
export function resolveSport(rawSport: string): OrcaSport | null {
	const normalized = rawSport.toLowerCase().trim();
	return SPORT_ALIASES[normalized] || null;
}

/**
 * Gets sport metadata
 */
export function getSportInfo(sport: OrcaSport) {
	return SPORTS[sport];
}

/**
 * Lists all supported sports
 */
export function listSports(): OrcaSport[] {
	return Object.keys(SPORTS) as OrcaSport[];
}
