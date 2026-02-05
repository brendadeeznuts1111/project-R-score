/**
 * @dynamic-spy/kit v5.4 - Adaptive Multi-Region Patterns
 * 
 * Dynamic & Geo-adaptive endpoints
 */

import { URLPatternInit } from "./core/urlpattern-spy";
import { HYPER_ENHANCED_SPORTSBOOK_PATTERNS } from "./hyper-enhanced-sportsbook-patterns";

export const ADAPTIVE_MULTI_REGION_PATTERNS: Record<string, URLPatternInit[]> = {
	'pinnacle-asia': [
		{ pathname: "/vds/sports/:sportId/zh/odds/:marketId", hostname: "pinnacle.com" },
		{ pathname: "/vds/sports/:sportId/odds/:marketId", hostname: "pinnacle.com" },
		{ pathname: "/vds/asian/odds/:marketId", hostname: "asian.pinnacle.com" }
	],

	'bet365-eu': [
		{ pathname: "/:lang(en|de|fr)/sportsbook/:sportSlug+/:market", hostname: "bet365.com" },
		{ pathname: "/#/SB/*/:marketId", hostname: "bet365.com" },
		{ pathname: "/m/:lang(en|de|fr)?/sports/:eventId", hostname: "m.bet365.com" }
	],

	'fonbet-cis': [
		{ pathname: "/line/:sport/:league/:matchId", hostname: "fonbet.ru" },
		{ pathname: "/live/line/:sportId/:eventId", hostname: "fonbet.kz" }
	],

	'default-global': Object.values(HYPER_ENHANCED_SPORTSBOOK_PATTERNS).flat()
};



