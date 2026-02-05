/**
 * @fileoverview Pinnacle aliases - canonical reference bookmaker
 * @description Pinnacle is the sharpest book, used as the canonical reference
 * @module orca/aliases/bookmakers/pinnacle
 */

import type { OrcaBookmaker, OrcaSport } from "../../../types";
import type { AliasRegistry } from "../registry";

export const BOOKMAKER: OrcaBookmaker = "pinnacle";

/**
 * Sport aliases for Pinnacle
 */
export const SPORT_ALIASES: Record<OrcaSport, string[]> = {
	NFL: ["NFL", "Football - NFL", "American Football - NFL"],
	NBA: ["NBA", "Basketball - NBA", "NBA Basketball"],
	MLB: ["MLB", "Baseball - MLB", "MLB Baseball"],
	NHL: ["NHL", "Hockey - NHL", "NHL Hockey"],
	NCAAF: ["NCAAF", "NCAA Football", "College Football"],
	NCAAB: ["NCAAB", "NCAA Basketball", "College Basketball"],
	EPL: ["EPL", "English Premier League", "Soccer - England - Premier League"],
	LALIGA: ["La Liga", "Spain - La Liga", "Soccer - Spain - La Liga"],
	BUNDESLIGA: [
		"Bundesliga",
		"Germany - Bundesliga",
		"Soccer - Germany - Bundesliga",
	],
	SERIEA: ["Serie A", "Italy - Serie A", "Soccer - Italy - Serie A"],
	LIGUE1: ["Ligue 1", "France - Ligue 1", "Soccer - France - Ligue 1"],
	MLS: ["MLS", "Major League Soccer", "Soccer - USA - MLS"],
	UFC: ["UFC", "MMA - UFC", "Mixed Martial Arts - UFC"],
	BOXING: ["Boxing", "Boxing - World"],
	TENNIS: ["Tennis", "Tennis - ATP", "Tennis - WTA"],
	GOLF: ["Golf", "Golf - PGA Tour"],
	ESPORTS: ["Esports", "E-Sports"],
};

/**
 * NBA team aliases for Pinnacle (canonical names)
 */
export const NBA_TEAMS: Record<string, string[]> = {
	"Atlanta Hawks": ["Atlanta Hawks", "Hawks"],
	"Boston Celtics": ["Boston Celtics", "Celtics"],
	"Brooklyn Nets": ["Brooklyn Nets", "Nets"],
	"Charlotte Hornets": ["Charlotte Hornets", "Hornets"],
	"Chicago Bulls": ["Chicago Bulls", "Bulls"],
	"Cleveland Cavaliers": ["Cleveland Cavaliers", "Cavaliers", "Cavs"],
	"Dallas Mavericks": ["Dallas Mavericks", "Mavericks", "Mavs"],
	"Denver Nuggets": ["Denver Nuggets", "Nuggets"],
	"Detroit Pistons": ["Detroit Pistons", "Pistons"],
	"Golden State Warriors": ["Golden State Warriors", "Warriors", "GSW"],
	"Houston Rockets": ["Houston Rockets", "Rockets"],
	"Indiana Pacers": ["Indiana Pacers", "Pacers"],
	"Los Angeles Clippers": ["Los Angeles Clippers", "LA Clippers", "Clippers"],
	"Los Angeles Lakers": ["Los Angeles Lakers", "LA Lakers", "Lakers"],
	"Memphis Grizzlies": ["Memphis Grizzlies", "Grizzlies"],
	"Miami Heat": ["Miami Heat", "Heat"],
	"Milwaukee Bucks": ["Milwaukee Bucks", "Bucks"],
	"Minnesota Timberwolves": [
		"Minnesota Timberwolves",
		"Timberwolves",
		"Wolves",
	],
	"New Orleans Pelicans": ["New Orleans Pelicans", "Pelicans"],
	"New York Knicks": ["New York Knicks", "Knicks", "NY Knicks"],
	"Oklahoma City Thunder": ["Oklahoma City Thunder", "Thunder", "OKC"],
	"Orlando Magic": ["Orlando Magic", "Magic"],
	"Philadelphia 76ers": ["Philadelphia 76ers", "Sixers", "76ers"],
	"Phoenix Suns": ["Phoenix Suns", "Suns"],
	"Portland Trail Blazers": [
		"Portland Trail Blazers",
		"Trail Blazers",
		"Blazers",
	],
	"Sacramento Kings": ["Sacramento Kings", "Kings"],
	"San Antonio Spurs": ["San Antonio Spurs", "Spurs"],
	"Toronto Raptors": ["Toronto Raptors", "Raptors"],
	"Utah Jazz": ["Utah Jazz", "Jazz"],
	"Washington Wizards": ["Washington Wizards", "Wizards"],
};

/**
 * NFL team aliases for Pinnacle
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
	"Jacksonville Jaguars": ["Jacksonville Jaguars", "Jaguars", "Jags"],
	"Kansas City Chiefs": ["Kansas City Chiefs", "Chiefs", "KC Chiefs"],
	"Las Vegas Raiders": ["Las Vegas Raiders", "Raiders", "LV Raiders"],
	"Los Angeles Chargers": ["Los Angeles Chargers", "LA Chargers", "Chargers"],
	"Los Angeles Rams": ["Los Angeles Rams", "LA Rams", "Rams"],
	"Miami Dolphins": ["Miami Dolphins", "Dolphins"],
	"Minnesota Vikings": ["Minnesota Vikings", "Vikings"],
	"New England Patriots": ["New England Patriots", "Patriots", "Pats"],
	"New Orleans Saints": ["New Orleans Saints", "Saints"],
	"New York Giants": ["New York Giants", "Giants", "NY Giants"],
	"New York Jets": ["New York Jets", "Jets", "NY Jets"],
	"Philadelphia Eagles": ["Philadelphia Eagles", "Eagles"],
	"Pittsburgh Steelers": ["Pittsburgh Steelers", "Steelers"],
	"San Francisco 49ers": ["San Francisco 49ers", "49ers", "Niners", "SF 49ers"],
	"Seattle Seahawks": ["Seattle Seahawks", "Seahawks"],
	"Tampa Bay Buccaneers": ["Tampa Bay Buccaneers", "Buccaneers", "Bucs"],
	"Tennessee Titans": ["Tennessee Titans", "Titans"],
	"Washington Commanders": ["Washington Commanders", "Commanders"],
};

/**
 * MLB team aliases for Pinnacle
 */
export const MLB_TEAMS: Record<string, string[]> = {
	"Arizona Diamondbacks": ["Arizona Diamondbacks", "Diamondbacks", "D-backs"],
	"Atlanta Braves": ["Atlanta Braves", "Braves"],
	"Baltimore Orioles": ["Baltimore Orioles", "Orioles", "Os"],
	"Boston Red Sox": ["Boston Red Sox", "Red Sox"],
	"Chicago Cubs": ["Chicago Cubs", "Cubs"],
	"Chicago White Sox": ["Chicago White Sox", "White Sox"],
	"Cincinnati Reds": ["Cincinnati Reds", "Reds"],
	"Cleveland Guardians": ["Cleveland Guardians", "Guardians"],
	"Colorado Rockies": ["Colorado Rockies", "Rockies"],
	"Detroit Tigers": ["Detroit Tigers", "Tigers"],
	"Houston Astros": ["Houston Astros", "Astros"],
	"Kansas City Royals": ["Kansas City Royals", "Royals"],
	"Los Angeles Angels": ["Los Angeles Angels", "LA Angels", "Angels"],
	"Los Angeles Dodgers": ["Los Angeles Dodgers", "LA Dodgers", "Dodgers"],
	"Miami Marlins": ["Miami Marlins", "Marlins"],
	"Milwaukee Brewers": ["Milwaukee Brewers", "Brewers"],
	"Minnesota Twins": ["Minnesota Twins", "Twins"],
	"New York Mets": ["New York Mets", "Mets", "NY Mets"],
	"New York Yankees": ["New York Yankees", "Yankees", "NY Yankees"],
	"Oakland Athletics": ["Oakland Athletics", "Athletics", "As"],
	"Philadelphia Phillies": ["Philadelphia Phillies", "Phillies"],
	"Pittsburgh Pirates": ["Pittsburgh Pirates", "Pirates"],
	"San Diego Padres": ["San Diego Padres", "Padres"],
	"San Francisco Giants": ["San Francisco Giants", "Giants", "SF Giants"],
	"Seattle Mariners": ["Seattle Mariners", "Mariners"],
	"St. Louis Cardinals": ["St. Louis Cardinals", "Cardinals", "STL Cardinals"],
	"Tampa Bay Rays": ["Tampa Bay Rays", "Rays"],
	"Texas Rangers": ["Texas Rangers", "Rangers"],
	"Toronto Blue Jays": ["Toronto Blue Jays", "Blue Jays", "Jays"],
	"Washington Nationals": ["Washington Nationals", "Nationals", "Nats"],
};

/**
 * NHL team aliases for Pinnacle
 */
export const NHL_TEAMS: Record<string, string[]> = {
	"Anaheim Ducks": ["Anaheim Ducks", "Ducks"],
	"Arizona Coyotes": ["Arizona Coyotes", "Coyotes"],
	"Boston Bruins": ["Boston Bruins", "Bruins"],
	"Buffalo Sabres": ["Buffalo Sabres", "Sabres"],
	"Calgary Flames": ["Calgary Flames", "Flames"],
	"Carolina Hurricanes": ["Carolina Hurricanes", "Hurricanes", "Canes"],
	"Chicago Blackhawks": ["Chicago Blackhawks", "Blackhawks", "Hawks"],
	"Colorado Avalanche": ["Colorado Avalanche", "Avalanche", "Avs"],
	"Columbus Blue Jackets": ["Columbus Blue Jackets", "Blue Jackets"],
	"Dallas Stars": ["Dallas Stars", "Stars"],
	"Detroit Red Wings": ["Detroit Red Wings", "Red Wings"],
	"Edmonton Oilers": ["Edmonton Oilers", "Oilers"],
	"Florida Panthers": ["Florida Panthers", "Panthers"],
	"Los Angeles Kings": ["Los Angeles Kings", "LA Kings", "Kings"],
	"Minnesota Wild": ["Minnesota Wild", "Wild"],
	"Montreal Canadiens": ["Montreal Canadiens", "Canadiens", "Habs"],
	"Nashville Predators": ["Nashville Predators", "Predators", "Preds"],
	"New Jersey Devils": ["New Jersey Devils", "Devils", "NJ Devils"],
	"New York Islanders": ["New York Islanders", "Islanders", "NY Islanders"],
	"New York Rangers": ["New York Rangers", "Rangers", "NY Rangers"],
	"Ottawa Senators": ["Ottawa Senators", "Senators", "Sens"],
	"Philadelphia Flyers": ["Philadelphia Flyers", "Flyers"],
	"Pittsburgh Penguins": ["Pittsburgh Penguins", "Penguins", "Pens"],
	"San Jose Sharks": ["San Jose Sharks", "Sharks"],
	"Seattle Kraken": ["Seattle Kraken", "Kraken"],
	"St. Louis Blues": ["St. Louis Blues", "Blues", "STL Blues"],
	"Tampa Bay Lightning": ["Tampa Bay Lightning", "Lightning", "Bolts"],
	"Toronto Maple Leafs": ["Toronto Maple Leafs", "Maple Leafs", "Leafs"],
	"Vancouver Canucks": ["Vancouver Canucks", "Canucks"],
	"Vegas Golden Knights": ["Vegas Golden Knights", "Golden Knights", "VGK"],
	"Washington Capitals": ["Washington Capitals", "Capitals", "Caps"],
	"Winnipeg Jets": ["Winnipeg Jets", "Jets"],
};

/**
 * Loads Pinnacle aliases into the registry
 */
export function loadPinnacleAliases(registry: AliasRegistry): void {
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
