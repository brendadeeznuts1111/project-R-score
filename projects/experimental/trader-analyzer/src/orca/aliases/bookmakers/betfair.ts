/**
 * @fileoverview Betfair aliases
 * @description European betting exchange with UK-style naming conventions
 * @module orca/aliases/bookmakers/betfair
 */

import type { OrcaBookmaker, OrcaSport } from "../../../types";
import type { AliasRegistry } from "../registry";

export const BOOKMAKER: OrcaBookmaker = "betfair";

/**
 * Sport aliases for Betfair
 */
export const SPORT_ALIASES: Record<OrcaSport, string[]> = {
	NFL: ["American Football", "NFL", "American Football - NFL"],
	NBA: ["Basketball", "NBA", "Basketball - NBA"],
	MLB: ["Baseball", "MLB", "Baseball - MLB"],
	NHL: ["Ice Hockey", "NHL", "Ice Hockey - NHL"],
	NCAAF: ["American Football", "College Football", "NCAA Football"],
	NCAAB: ["Basketball", "College Basketball", "NCAA Basketball"],
	EPL: [
		"Football",
		"English Premier League",
		"Soccer",
		"England - Premier League",
	],
	LALIGA: ["Football", "La Liga", "Spain - La Liga"],
	BUNDESLIGA: ["Football", "Bundesliga", "Germany - Bundesliga"],
	SERIEA: ["Football", "Serie A", "Italy - Serie A"],
	LIGUE1: ["Football", "Ligue 1", "France - Ligue 1"],
	MLS: ["Football", "MLS", "Major League Soccer"],
	UFC: ["Mixed Martial Arts", "MMA", "UFC"],
	BOXING: ["Boxing"],
	TENNIS: ["Tennis"],
	GOLF: ["Golf"],
	ESPORTS: ["Esports", "E-Sports"],
};

/**
 * NBA team aliases for Betfair
 * Betfair uses city-first full names and occasionally British-style spellings
 */
export const NBA_TEAMS: Record<string, string[]> = {
	"Atlanta Hawks": ["Atlanta Hawks", "Hawks"],
	"Boston Celtics": ["Boston Celtics", "Celtics"],
	"Brooklyn Nets": ["Brooklyn Nets", "Nets"],
	"Charlotte Hornets": ["Charlotte Hornets", "Hornets"],
	"Chicago Bulls": ["Chicago Bulls", "Bulls"],
	"Cleveland Cavaliers": ["Cleveland Cavaliers", "Cavaliers"],
	"Dallas Mavericks": ["Dallas Mavericks", "Mavericks"],
	"Denver Nuggets": ["Denver Nuggets", "Nuggets"],
	"Detroit Pistons": ["Detroit Pistons", "Pistons"],
	"Golden State Warriors": [
		"Golden State Warriors",
		"Warriors",
		"Golden State",
	],
	"Houston Rockets": ["Houston Rockets", "Rockets"],
	"Indiana Pacers": ["Indiana Pacers", "Pacers"],
	"Los Angeles Clippers": [
		"L.A. Clippers",
		"LA Clippers",
		"Los Angeles Clippers",
		"Clippers",
	],
	"Los Angeles Lakers": [
		"L.A. Lakers",
		"LA Lakers",
		"Los Angeles Lakers",
		"Lakers",
	],
	"Memphis Grizzlies": ["Memphis Grizzlies", "Grizzlies"],
	"Miami Heat": ["Miami Heat", "Heat"],
	"Milwaukee Bucks": ["Milwaukee Bucks", "Bucks"],
	"Minnesota Timberwolves": ["Minnesota Timberwolves", "Timberwolves"],
	"New Orleans Pelicans": ["New Orleans Pelicans", "Pelicans"],
	"New York Knicks": ["New York Knicks", "Knicks"],
	"Oklahoma City Thunder": ["Oklahoma City Thunder", "OKC Thunder", "Thunder"],
	"Orlando Magic": ["Orlando Magic", "Magic"],
	"Philadelphia 76ers": [
		"Philadelphia 76ers",
		"Philadelphia Seventy Sixers",
		"76ers",
	],
	"Phoenix Suns": ["Phoenix Suns", "Suns"],
	"Portland Trail Blazers": ["Portland Trail Blazers", "Trail Blazers"],
	"Sacramento Kings": ["Sacramento Kings", "Kings"],
	"San Antonio Spurs": ["San Antonio Spurs", "Spurs"],
	"Toronto Raptors": ["Toronto Raptors", "Raptors"],
	"Utah Jazz": ["Utah Jazz", "Jazz"],
	"Washington Wizards": ["Washington Wizards", "Wizards"],
};

/**
 * NFL team aliases for Betfair
 */
export const NFL_TEAMS: Record<string, string[]> = {
	"Arizona Cardinals": ["Arizona Cardinals", "Cardinals"],
	"Atlanta Falcons": ["Atlanta Falcons", "Falcons"],
	"Baltimore Ravens": ["Baltimore Ravens", "Ravens"],
	"Buffalo Bills": ["Buffalo Bills", "Bills"],
	"Carolina Panthers": ["Carolina Panthers", "Panthers"],
	"Chicago Bears": ["Chicago Bears", "Bears"],
	"Cincinnati Bengals": ["Cincinnati Bengals", "Bengals"],
	"Cleveland Browns": ["Cleveland Browns", "Browns"],
	"Dallas Cowboys": ["Dallas Cowboys", "Cowboys"],
	"Denver Broncos": ["Denver Broncos", "Broncos"],
	"Detroit Lions": ["Detroit Lions", "Lions"],
	"Green Bay Packers": ["Green Bay Packers", "Packers"],
	"Houston Texans": ["Houston Texans", "Texans"],
	"Indianapolis Colts": ["Indianapolis Colts", "Colts"],
	"Jacksonville Jaguars": ["Jacksonville Jaguars", "Jaguars"],
	"Kansas City Chiefs": ["Kansas City Chiefs", "Chiefs"],
	"Las Vegas Raiders": ["Las Vegas Raiders", "Raiders", "LV Raiders"],
	"Los Angeles Chargers": [
		"L.A. Chargers",
		"LA Chargers",
		"Los Angeles Chargers",
		"Chargers",
	],
	"Los Angeles Rams": ["L.A. Rams", "LA Rams", "Los Angeles Rams", "Rams"],
	"Miami Dolphins": ["Miami Dolphins", "Dolphins"],
	"Minnesota Vikings": ["Minnesota Vikings", "Vikings"],
	"New England Patriots": ["New England Patriots", "Patriots"],
	"New Orleans Saints": ["New Orleans Saints", "Saints"],
	"New York Giants": ["New York Giants", "NY Giants", "Giants"],
	"New York Jets": ["New York Jets", "NY Jets", "Jets"],
	"Philadelphia Eagles": ["Philadelphia Eagles", "Eagles"],
	"Pittsburgh Steelers": ["Pittsburgh Steelers", "Steelers"],
	"San Francisco 49ers": ["San Francisco 49ers", "SF 49ers", "49ers"],
	"Seattle Seahawks": ["Seattle Seahawks", "Seahawks"],
	"Tampa Bay Buccaneers": ["Tampa Bay Buccaneers", "Buccaneers"],
	"Tennessee Titans": ["Tennessee Titans", "Titans"],
	"Washington Commanders": ["Washington Commanders", "Commanders"],
};

/**
 * EPL team aliases for Betfair (primary for UK exchange)
 */
export const EPL_TEAMS: Record<string, string[]> = {
	Arsenal: ["Arsenal", "Arsenal FC"],
	"Aston Villa": ["Aston Villa", "Aston Villa FC"],
	Bournemouth: ["Bournemouth", "AFC Bournemouth"],
	Brentford: ["Brentford", "Brentford FC"],
	Brighton: ["Brighton", "Brighton & Hove Albion", "Brighton and Hove Albion"],
	Chelsea: ["Chelsea", "Chelsea FC"],
	"Crystal Palace": ["Crystal Palace", "Crystal Palace FC"],
	Everton: ["Everton", "Everton FC"],
	Fulham: ["Fulham", "Fulham FC"],
	"Ipswich Town": ["Ipswich Town", "Ipswich"],
	"Leicester City": ["Leicester City", "Leicester"],
	Liverpool: ["Liverpool", "Liverpool FC"],
	"Manchester City": ["Manchester City", "Man City", "Man. City"],
	"Manchester United": [
		"Manchester United",
		"Man United",
		"Man. United",
		"Man Utd",
	],
	"Newcastle United": ["Newcastle United", "Newcastle", "Newcastle Utd"],
	"Nottingham Forest": ["Nottingham Forest", "Nott'm Forest", "Forest"],
	Southampton: ["Southampton", "Southampton FC"],
	Tottenham: ["Tottenham", "Tottenham Hotspur", "Spurs"],
	"West Ham": ["West Ham", "West Ham United"],
	Wolverhampton: ["Wolverhampton", "Wolverhampton Wanderers", "Wolves"],
};

/**
 * MLB team aliases for Betfair
 */
export const MLB_TEAMS: Record<string, string[]> = {
	"Arizona Diamondbacks": ["Arizona Diamondbacks", "Diamondbacks"],
	"Atlanta Braves": ["Atlanta Braves", "Braves"],
	"Baltimore Orioles": ["Baltimore Orioles", "Orioles"],
	"Boston Red Sox": ["Boston Red Sox", "Red Sox"],
	"Chicago Cubs": ["Chicago Cubs", "Cubs"],
	"Chicago White Sox": ["Chicago White Sox", "White Sox"],
	"Cincinnati Reds": ["Cincinnati Reds", "Reds"],
	"Cleveland Guardians": ["Cleveland Guardians", "Guardians"],
	"Colorado Rockies": ["Colorado Rockies", "Rockies"],
	"Detroit Tigers": ["Detroit Tigers", "Tigers"],
	"Houston Astros": ["Houston Astros", "Astros"],
	"Kansas City Royals": ["Kansas City Royals", "Royals"],
	"Los Angeles Angels": [
		"L.A. Angels",
		"LA Angels",
		"Los Angeles Angels",
		"Angels",
	],
	"Los Angeles Dodgers": [
		"L.A. Dodgers",
		"LA Dodgers",
		"Los Angeles Dodgers",
		"Dodgers",
	],
	"Miami Marlins": ["Miami Marlins", "Marlins"],
	"Milwaukee Brewers": ["Milwaukee Brewers", "Brewers"],
	"Minnesota Twins": ["Minnesota Twins", "Twins"],
	"New York Mets": ["New York Mets", "NY Mets", "Mets"],
	"New York Yankees": ["New York Yankees", "NY Yankees", "Yankees"],
	"Oakland Athletics": ["Oakland Athletics", "Athletics"],
	"Philadelphia Phillies": ["Philadelphia Phillies", "Phillies"],
	"Pittsburgh Pirates": ["Pittsburgh Pirates", "Pirates"],
	"San Diego Padres": ["San Diego Padres", "Padres"],
	"San Francisco Giants": ["San Francisco Giants", "SF Giants", "Giants"],
	"Seattle Mariners": ["Seattle Mariners", "Mariners"],
	"St. Louis Cardinals": [
		"St Louis Cardinals",
		"St. Louis Cardinals",
		"Cardinals",
	],
	"Tampa Bay Rays": ["Tampa Bay Rays", "Rays"],
	"Texas Rangers": ["Texas Rangers", "Rangers"],
	"Toronto Blue Jays": ["Toronto Blue Jays", "Blue Jays"],
	"Washington Nationals": ["Washington Nationals", "Nationals"],
};

/**
 * NHL team aliases for Betfair
 */
export const NHL_TEAMS: Record<string, string[]> = {
	"Anaheim Ducks": ["Anaheim Ducks", "Ducks"],
	"Arizona Coyotes": ["Arizona Coyotes", "Coyotes"],
	"Boston Bruins": ["Boston Bruins", "Bruins"],
	"Buffalo Sabres": ["Buffalo Sabres", "Sabres"],
	"Calgary Flames": ["Calgary Flames", "Flames"],
	"Carolina Hurricanes": ["Carolina Hurricanes", "Hurricanes"],
	"Chicago Blackhawks": ["Chicago Blackhawks", "Blackhawks"],
	"Colorado Avalanche": ["Colorado Avalanche", "Avalanche"],
	"Columbus Blue Jackets": ["Columbus Blue Jackets", "Blue Jackets"],
	"Dallas Stars": ["Dallas Stars", "Stars"],
	"Detroit Red Wings": ["Detroit Red Wings", "Red Wings"],
	"Edmonton Oilers": ["Edmonton Oilers", "Oilers"],
	"Florida Panthers": ["Florida Panthers", "Panthers"],
	"Los Angeles Kings": ["L.A. Kings", "LA Kings", "Los Angeles Kings", "Kings"],
	"Minnesota Wild": ["Minnesota Wild", "Wild"],
	"Montreal Canadiens": ["Montreal Canadiens", "Canadiens"],
	"Nashville Predators": ["Nashville Predators", "Predators"],
	"New Jersey Devils": ["New Jersey Devils", "Devils"],
	"New York Islanders": ["New York Islanders", "NY Islanders", "Islanders"],
	"New York Rangers": ["New York Rangers", "NY Rangers", "Rangers"],
	"Ottawa Senators": ["Ottawa Senators", "Senators"],
	"Philadelphia Flyers": ["Philadelphia Flyers", "Flyers"],
	"Pittsburgh Penguins": ["Pittsburgh Penguins", "Penguins"],
	"San Jose Sharks": ["San Jose Sharks", "Sharks"],
	"Seattle Kraken": ["Seattle Kraken", "Kraken"],
	"St. Louis Blues": ["St Louis Blues", "St. Louis Blues", "Blues"],
	"Tampa Bay Lightning": ["Tampa Bay Lightning", "Lightning"],
	"Toronto Maple Leafs": ["Toronto Maple Leafs", "Maple Leafs"],
	"Vancouver Canucks": ["Vancouver Canucks", "Canucks"],
	"Vegas Golden Knights": ["Vegas Golden Knights", "Golden Knights"],
	"Washington Capitals": ["Washington Capitals", "Capitals"],
	"Winnipeg Jets": ["Winnipeg Jets", "Jets"],
};

/**
 * Loads Betfair aliases into the registry
 */
export function loadBetfairAliases(registry: AliasRegistry): void {
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

	// Load EPL teams
	registry.loadTeamAliases(BOOKMAKER, "EPL", "EPL", EPL_TEAMS);
}
