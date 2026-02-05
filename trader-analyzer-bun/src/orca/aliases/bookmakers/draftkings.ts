/**
 * @fileoverview DraftKings aliases
 * @description US retail sportsbook with distinct naming conventions
 * @module orca/aliases/bookmakers/draftkings
 */

import type { OrcaBookmaker, OrcaSport } from "../../../types";
import type { AliasRegistry } from "../registry";

export const BOOKMAKER: OrcaBookmaker = "draftkings";

/**
 * Sport aliases for DraftKings
 */
export const SPORT_ALIASES: Record<OrcaSport, string[]> = {
	NFL: ["NFL", "Football", "NFL Football", "Pro Football"],
	NBA: ["NBA", "Basketball", "NBA Basketball", "Pro Basketball"],
	MLB: ["MLB", "Baseball", "MLB Baseball", "Pro Baseball"],
	NHL: ["NHL", "Hockey", "NHL Hockey", "Pro Hockey"],
	NCAAF: ["NCAAF", "College Football", "CFB", "NCAA Football"],
	NCAAB: ["NCAAB", "College Basketball", "CBB", "NCAA Basketball"],
	EPL: [
		"EPL",
		"Premier League",
		"English Premier League",
		"England - Premier League",
	],
	LALIGA: ["La Liga", "LaLiga", "Spain - La Liga"],
	BUNDESLIGA: ["Bundesliga", "Germany - Bundesliga"],
	SERIEA: ["Serie A", "Italy - Serie A"],
	LIGUE1: ["Ligue 1", "France - Ligue 1"],
	MLS: ["MLS", "Major League Soccer"],
	UFC: ["UFC", "MMA", "Mixed Martial Arts"],
	BOXING: ["Boxing"],
	TENNIS: ["Tennis", "ATP", "WTA"],
	GOLF: ["Golf", "PGA", "PGA Tour"],
	ESPORTS: ["Esports", "E-Sports", "League of Legends", "CS2"],
};

/**
 * NBA team aliases for DraftKings
 * Maps canonical names to DraftKings variations
 */
export const NBA_TEAMS: Record<string, string[]> = {
	"Atlanta Hawks": ["ATL Hawks", "Atlanta Hawks", "Hawks"],
	"Boston Celtics": ["BOS Celtics", "Boston Celtics", "Celtics"],
	"Brooklyn Nets": ["BKN Nets", "Brooklyn Nets", "Nets"],
	"Charlotte Hornets": ["CHA Hornets", "Charlotte Hornets", "Hornets"],
	"Chicago Bulls": ["CHI Bulls", "Chicago Bulls", "Bulls"],
	"Cleveland Cavaliers": [
		"CLE Cavaliers",
		"Cleveland Cavaliers",
		"Cavaliers",
		"Cavs",
	],
	"Dallas Mavericks": [
		"DAL Mavericks",
		"Dallas Mavericks",
		"Mavericks",
		"Mavs",
	],
	"Denver Nuggets": ["DEN Nuggets", "Denver Nuggets", "Nuggets"],
	"Detroit Pistons": ["DET Pistons", "Detroit Pistons", "Pistons"],
	"Golden State Warriors": [
		"GS Warriors",
		"Golden State Warriors",
		"Warriors",
		"GSW",
	],
	"Houston Rockets": ["HOU Rockets", "Houston Rockets", "Rockets"],
	"Indiana Pacers": ["IND Pacers", "Indiana Pacers", "Pacers"],
	"Los Angeles Clippers": [
		"LA Clippers",
		"Los Angeles Clippers",
		"Clippers",
		"LAC",
	],
	"Los Angeles Lakers": ["LA Lakers", "Los Angeles Lakers", "Lakers", "LAL"],
	"Memphis Grizzlies": ["MEM Grizzlies", "Memphis Grizzlies", "Grizzlies"],
	"Miami Heat": ["MIA Heat", "Miami Heat", "Heat"],
	"Milwaukee Bucks": ["MIL Bucks", "Milwaukee Bucks", "Bucks"],
	"Minnesota Timberwolves": [
		"MIN Timberwolves",
		"Minnesota Timberwolves",
		"Timberwolves",
		"Wolves",
	],
	"New Orleans Pelicans": [
		"NO Pelicans",
		"New Orleans Pelicans",
		"Pelicans",
		"NOP",
	],
	"New York Knicks": ["NY Knicks", "New York Knicks", "Knicks", "NYK"],
	"Oklahoma City Thunder": ["OKC Thunder", "Oklahoma City Thunder", "Thunder"],
	"Orlando Magic": ["ORL Magic", "Orlando Magic", "Magic"],
	"Philadelphia 76ers": ["PHI 76ers", "Philadelphia 76ers", "76ers", "Sixers"],
	"Phoenix Suns": ["PHX Suns", "Phoenix Suns", "Suns"],
	"Portland Trail Blazers": [
		"POR Trail Blazers",
		"Portland Trail Blazers",
		"Blazers",
	],
	"Sacramento Kings": ["SAC Kings", "Sacramento Kings", "Kings"],
	"San Antonio Spurs": ["SA Spurs", "San Antonio Spurs", "Spurs"],
	"Toronto Raptors": ["TOR Raptors", "Toronto Raptors", "Raptors"],
	"Utah Jazz": ["UTA Jazz", "Utah Jazz", "Jazz"],
	"Washington Wizards": ["WAS Wizards", "Washington Wizards", "Wizards"],
};

/**
 * NFL team aliases for DraftKings
 */
export const NFL_TEAMS: Record<string, string[]> = {
	"Arizona Cardinals": ["ARI Cardinals", "Arizona Cardinals", "Cardinals"],
	"Atlanta Falcons": ["ATL Falcons", "Atlanta Falcons", "Falcons"],
	"Baltimore Ravens": ["BAL Ravens", "Baltimore Ravens", "Ravens"],
	"Buffalo Bills": ["BUF Bills", "Buffalo Bills", "Bills"],
	"Carolina Panthers": ["CAR Panthers", "Carolina Panthers", "Panthers"],
	"Chicago Bears": ["CHI Bears", "Chicago Bears", "Bears"],
	"Cincinnati Bengals": ["CIN Bengals", "Cincinnati Bengals", "Bengals"],
	"Cleveland Browns": ["CLE Browns", "Cleveland Browns", "Browns"],
	"Dallas Cowboys": ["DAL Cowboys", "Dallas Cowboys", "Cowboys"],
	"Denver Broncos": ["DEN Broncos", "Denver Broncos", "Broncos"],
	"Detroit Lions": ["DET Lions", "Detroit Lions", "Lions"],
	"Green Bay Packers": ["GB Packers", "Green Bay Packers", "Packers"],
	"Houston Texans": ["HOU Texans", "Houston Texans", "Texans"],
	"Indianapolis Colts": ["IND Colts", "Indianapolis Colts", "Colts"],
	"Jacksonville Jaguars": [
		"JAX Jaguars",
		"Jacksonville Jaguars",
		"Jaguars",
		"Jags",
	],
	"Kansas City Chiefs": ["KC Chiefs", "Kansas City Chiefs", "Chiefs"],
	"Las Vegas Raiders": ["LV Raiders", "Las Vegas Raiders", "Raiders"],
	"Los Angeles Chargers": ["LAC Chargers", "Los Angeles Chargers", "Chargers"],
	"Los Angeles Rams": ["LAR Rams", "Los Angeles Rams", "Rams"],
	"Miami Dolphins": ["MIA Dolphins", "Miami Dolphins", "Dolphins"],
	"Minnesota Vikings": ["MIN Vikings", "Minnesota Vikings", "Vikings"],
	"New England Patriots": [
		"NE Patriots",
		"New England Patriots",
		"Patriots",
		"Pats",
	],
	"New Orleans Saints": ["NO Saints", "New Orleans Saints", "Saints"],
	"New York Giants": ["NYG Giants", "New York Giants", "Giants"],
	"New York Jets": ["NYJ Jets", "New York Jets", "Jets"],
	"Philadelphia Eagles": ["PHI Eagles", "Philadelphia Eagles", "Eagles"],
	"Pittsburgh Steelers": ["PIT Steelers", "Pittsburgh Steelers", "Steelers"],
	"San Francisco 49ers": ["SF 49ers", "San Francisco 49ers", "49ers", "Niners"],
	"Seattle Seahawks": ["SEA Seahawks", "Seattle Seahawks", "Seahawks"],
	"Tampa Bay Buccaneers": [
		"TB Buccaneers",
		"Tampa Bay Buccaneers",
		"Buccaneers",
		"Bucs",
	],
	"Tennessee Titans": ["TEN Titans", "Tennessee Titans", "Titans"],
	"Washington Commanders": [
		"WAS Commanders",
		"Washington Commanders",
		"Commanders",
	],
};

/**
 * MLB team aliases for DraftKings
 */
export const MLB_TEAMS: Record<string, string[]> = {
	"Arizona Diamondbacks": [
		"ARI Diamondbacks",
		"Arizona Diamondbacks",
		"D-backs",
	],
	"Atlanta Braves": ["ATL Braves", "Atlanta Braves", "Braves"],
	"Baltimore Orioles": ["BAL Orioles", "Baltimore Orioles", "Orioles"],
	"Boston Red Sox": ["BOS Red Sox", "Boston Red Sox", "Red Sox"],
	"Chicago Cubs": ["CHC Cubs", "Chicago Cubs", "Cubs"],
	"Chicago White Sox": ["CHW White Sox", "Chicago White Sox", "White Sox"],
	"Cincinnati Reds": ["CIN Reds", "Cincinnati Reds", "Reds"],
	"Cleveland Guardians": ["CLE Guardians", "Cleveland Guardians", "Guardians"],
	"Colorado Rockies": ["COL Rockies", "Colorado Rockies", "Rockies"],
	"Detroit Tigers": ["DET Tigers", "Detroit Tigers", "Tigers"],
	"Houston Astros": ["HOU Astros", "Houston Astros", "Astros"],
	"Kansas City Royals": ["KC Royals", "Kansas City Royals", "Royals"],
	"Los Angeles Angels": ["LAA Angels", "Los Angeles Angels", "Angels"],
	"Los Angeles Dodgers": ["LAD Dodgers", "Los Angeles Dodgers", "Dodgers"],
	"Miami Marlins": ["MIA Marlins", "Miami Marlins", "Marlins"],
	"Milwaukee Brewers": ["MIL Brewers", "Milwaukee Brewers", "Brewers"],
	"Minnesota Twins": ["MIN Twins", "Minnesota Twins", "Twins"],
	"New York Mets": ["NYM Mets", "New York Mets", "Mets"],
	"New York Yankees": ["NYY Yankees", "New York Yankees", "Yankees"],
	"Oakland Athletics": ["OAK Athletics", "Oakland Athletics", "As"],
	"Philadelphia Phillies": [
		"PHI Phillies",
		"Philadelphia Phillies",
		"Phillies",
	],
	"Pittsburgh Pirates": ["PIT Pirates", "Pittsburgh Pirates", "Pirates"],
	"San Diego Padres": ["SD Padres", "San Diego Padres", "Padres"],
	"San Francisco Giants": ["SF Giants", "San Francisco Giants", "Giants"],
	"Seattle Mariners": ["SEA Mariners", "Seattle Mariners", "Mariners"],
	"St. Louis Cardinals": ["STL Cardinals", "St. Louis Cardinals", "Cardinals"],
	"Tampa Bay Rays": ["TB Rays", "Tampa Bay Rays", "Rays"],
	"Texas Rangers": ["TEX Rangers", "Texas Rangers", "Rangers"],
	"Toronto Blue Jays": ["TOR Blue Jays", "Toronto Blue Jays", "Blue Jays"],
	"Washington Nationals": [
		"WAS Nationals",
		"Washington Nationals",
		"Nationals",
	],
};

/**
 * NHL team aliases for DraftKings
 */
export const NHL_TEAMS: Record<string, string[]> = {
	"Anaheim Ducks": ["ANA Ducks", "Anaheim Ducks", "Ducks"],
	"Arizona Coyotes": ["ARI Coyotes", "Arizona Coyotes", "Coyotes"],
	"Boston Bruins": ["BOS Bruins", "Boston Bruins", "Bruins"],
	"Buffalo Sabres": ["BUF Sabres", "Buffalo Sabres", "Sabres"],
	"Calgary Flames": ["CGY Flames", "Calgary Flames", "Flames"],
	"Carolina Hurricanes": [
		"CAR Hurricanes",
		"Carolina Hurricanes",
		"Hurricanes",
	],
	"Chicago Blackhawks": ["CHI Blackhawks", "Chicago Blackhawks", "Blackhawks"],
	"Colorado Avalanche": ["COL Avalanche", "Colorado Avalanche", "Avalanche"],
	"Columbus Blue Jackets": [
		"CBJ Blue Jackets",
		"Columbus Blue Jackets",
		"Blue Jackets",
	],
	"Dallas Stars": ["DAL Stars", "Dallas Stars", "Stars"],
	"Detroit Red Wings": ["DET Red Wings", "Detroit Red Wings", "Red Wings"],
	"Edmonton Oilers": ["EDM Oilers", "Edmonton Oilers", "Oilers"],
	"Florida Panthers": ["FLA Panthers", "Florida Panthers", "Panthers"],
	"Los Angeles Kings": ["LA Kings", "Los Angeles Kings", "Kings"],
	"Minnesota Wild": ["MIN Wild", "Minnesota Wild", "Wild"],
	"Montreal Canadiens": ["MTL Canadiens", "Montreal Canadiens", "Canadiens"],
	"Nashville Predators": ["NSH Predators", "Nashville Predators", "Predators"],
	"New Jersey Devils": ["NJ Devils", "New Jersey Devils", "Devils"],
	"New York Islanders": ["NYI Islanders", "New York Islanders", "Islanders"],
	"New York Rangers": ["NYR Rangers", "New York Rangers", "Rangers"],
	"Ottawa Senators": ["OTT Senators", "Ottawa Senators", "Senators"],
	"Philadelphia Flyers": ["PHI Flyers", "Philadelphia Flyers", "Flyers"],
	"Pittsburgh Penguins": ["PIT Penguins", "Pittsburgh Penguins", "Penguins"],
	"San Jose Sharks": ["SJ Sharks", "San Jose Sharks", "Sharks"],
	"Seattle Kraken": ["SEA Kraken", "Seattle Kraken", "Kraken"],
	"St. Louis Blues": ["STL Blues", "St. Louis Blues", "Blues"],
	"Tampa Bay Lightning": ["TB Lightning", "Tampa Bay Lightning", "Lightning"],
	"Toronto Maple Leafs": [
		"TOR Maple Leafs",
		"Toronto Maple Leafs",
		"Maple Leafs",
	],
	"Vancouver Canucks": ["VAN Canucks", "Vancouver Canucks", "Canucks"],
	"Vegas Golden Knights": [
		"VGK Golden Knights",
		"Vegas Golden Knights",
		"Golden Knights",
	],
	"Washington Capitals": ["WAS Capitals", "Washington Capitals", "Capitals"],
	"Winnipeg Jets": ["WPG Jets", "Winnipeg Jets", "Jets"],
};

/**
 * Loads DraftKings aliases into the registry
 */
export function loadDraftKingsAliases(registry: AliasRegistry): void {
	// Load sport aliases
	registry.loadSportAliases(BOOKMAKER, SPORT_ALIASES);

	// Load NBA teams
	registry.loadTeamAliases(BOOKMAKER, "NBA", "NBA", NBA_TEAMS);

	// Load NFL teams
	registry.loadTeamAliases(BOOKMAKER, "NFL", "NFL", NFL_TEAMS);

	// Load MLB teams
	registry.loadTeamAliases(BOOKMAKER, "MLB", "MLB", MLB_TEAMS);

	// Load NHL teams
	registry.loadTeamAliases(BOOKMAKER, "NHL", "NHL", NHL_TEAMS);
}
