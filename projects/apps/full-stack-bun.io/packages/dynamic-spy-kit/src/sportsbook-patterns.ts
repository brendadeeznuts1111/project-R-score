/**
 * @dynamic-spy/kit v3.3 - Sportsbook URLPattern Configurations
 * 
 * 50+ Sportsbooks • Protocol Analysis • Sharp vs Square • Arb Targets
 */

import { URLPatternInit } from "./urlpattern-spy";

export interface SportsbookBenchmark {
	type: 'Sharp' | 'Square';
	protocol: string;
	hostname: string;
	oddsPath: string;
	vig: string;
	arbRole: 'Benchmark' | 'Arb Target';
	proxyHeaders: Record<string, string>;
	avgSpread?: number;
	apiLatency?: string;
	connectionReuse?: string;
	proxySuccess?: string;
	marketsPerSport?: number;
	// Enhanced metrics v2.0
	rank?: number;
	volume24h?: string;
	arbProfit?: number;
	geo?: string;
	status?: string;
}

export const SPORTSBOOK_PATTERNS: Record<string, URLPatternInit> = {
	pinnacle: {
		protocol: 'https:',
		hostname: 'pinnacle.com',
		pathname: '/vds/sports/:sportId/odds/:marketId',
		search: '?lang=en&currency=USD'
	},
	sbobet: {
		protocol: 'https:',
		hostname: 'sbobet.com',
		pathname: '/sports/:sport/*',
		search: '?lang=en'
	},
	betfair: {
		protocol: 'https:',
		hostname: 'betfair.com',
		pathname: '/exchange/:market',
		search: '?locale=en'
	},
	bet365: {
		protocol: 'https:',
		hostname: 'bet365.com',
		pathname: '/en/sportsbook/:sport/:league/:market',
		search: '?affiliate=arb001'
	},
	fonbet: {
		protocol: 'https:',
		hostname: 'fonbet.ru',
		pathname: '/line/football/:league/:matchId',
		search: '?mode=live'
	},
	betmgm: {
		protocol: 'https:',
		hostname: 'sports.betmgm.com',
		pathname: '/en/sports/:sport/-1/:market',
		port: '443'
	},
	draftkings: {
		protocol: 'https:',
		hostname: 'sportsbook.draftkings.com',
		pathname: '/leagues/:league/:market',
		search: '?region=US'
	},
	fanduel: {
		protocol: 'https:',
		hostname: 'sportsbook.fanduel.com',
		pathname: '/navigation/:market',
		search: '?region=US'
	},
	williamhill: {
		protocol: 'https:',
		hostname: 'williamhill.com',
		pathname: '/sport/:sport/:event',
		search: '?locale=uk'
	},
	betway: {
		protocol: 'https:',
		hostname: 'betway.com',
		pathname: '/sports/:market/*',
		search: '?lang=en'
	},
	// Add more sportsbooks...
	unibet: {
		protocol: 'https:',
		hostname: 'unibet.com',
		pathname: '/sports/:sport/:market',
		search: '?lang=en'
	},
	coral: {
		protocol: 'https:',
		hostname: 'coral.co.uk',
		pathname: '/sports/:sport/:market',
		search: '?locale=uk'
	},
	ladbrokes: {
		protocol: 'https:',
		hostname: 'ladbrokes.com',
		pathname: '/sports/:sport/:event',
		search: '?locale=uk'
	}
} as const;

export const SPORTSBOOK_BENCHMARK: Record<string, SportsbookBenchmark> = {
	pinnacle: {
		rank: 1,
		type: 'Sharp',
		protocol: 'https:',
		hostname: 'pinnacle.com',
		oddsPath: '/vds/:sport/:market',
		vig: '1.95%',
		arbRole: 'Benchmark',
		proxyHeaders: { 'X-VIP': 'diamond', 'X-Geo': 'global' },
		avgSpread: 14.5,
		apiLatency: '45ms',
		connectionReuse: '95%',
		proxySuccess: '99.9%',
		marketsPerSport: 12467,
		volume24h: '$250M',
		arbProfit: 0.028,
		geo: '🌍',
		status: '🟢 LIVE'
	},
	sbobet: {
		rank: 2,
		type: 'Sharp',
		protocol: 'https:',
		hostname: 'sbobet.com',
		oddsPath: '/sports/:sport/*',
		vig: '2.1%',
		arbRole: 'Benchmark',
		proxyHeaders: { 'X-Asia': 'true' },
		avgSpread: 16.2,
		apiLatency: '52ms',
		connectionReuse: '93%',
		proxySuccess: '99.7%',
		marketsPerSport: 11234,
		volume24h: '$180M',
		arbProfit: 0.026,
		geo: '🌏',
		status: '🟢 LIVE'
	},
	betfair: {
		rank: 3,
		type: 'Sharp',
		protocol: 'https:',
		hostname: 'betfair.com',
		oddsPath: '/exchange/:market',
		vig: '2.5%',
		arbRole: 'Benchmark',
		proxyHeaders: { 'X-Exchange': 'true' },
		avgSpread: 18.7,
		apiLatency: '68ms',
		connectionReuse: '97%',
		proxySuccess: '99.5%',
		marketsPerSport: 15678,
		volume24h: '$320M',
		arbProfit: 0.024,
		geo: '🌍',
		status: '🟢 LIVE'
	},
	bet365: {
		rank: 5,
		type: 'Square',
		protocol: 'https:',
		hostname: 'bet365.com',
		oddsPath: '/sports/:sport/:market',
		vig: '5.2%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-UK': 'true' },
		avgSpread: 40.0,
		apiLatency: '120ms',
		connectionReuse: '87%',
		proxySuccess: '98.2%',
		marketsPerSport: 10234,
		volume24h: '$180M',
		arbProfit: 0.029,
		geo: '🌍',
		status: '🟢 LIVE'
	},
	fonbet: {
		rank: 4,
		type: 'Square',
		protocol: 'https:',
		hostname: 'fonbet.ru',
		oddsPath: '/line/:sport/:league/*',
		vig: '3.8%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-RU': 'true', 'X-Language': 'ru' },
		avgSpread: 22.4,
		apiLatency: '89ms',
		connectionReuse: '89%',
		proxySuccess: '98.8%',
		marketsPerSport: 8945,
		volume24h: '$120M',
		arbProfit: 0.032,
		geo: '🇷🇺',
		status: '🔥 EXECUTE'
	},
	betmgm: {
		rank: 6,
		type: 'Square',
		protocol: 'https:',
		hostname: 'betmgm.com',
		oddsPath: '/sports/:sport/-1/:market',
		vig: '6.1%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-US': 'true', 'X-State': 'NJ' },
		avgSpread: 45.2,
		apiLatency: '135ms',
		connectionReuse: '85%',
		proxySuccess: '97.9%',
		marketsPerSport: 7890,
		volume24h: '$85M',
		arbProfit: 0.027,
		geo: '🇺🇸',
		status: '🟢 LIVE'
	},
	draftkings: {
		rank: 7,
		type: 'Square',
		protocol: 'https:',
		hostname: 'draftkings.com',
		oddsPath: '/leagues/:league/:market',
		vig: '5.8%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-US': 'true' },
		avgSpread: 42.1,
		apiLatency: '142ms',
		connectionReuse: '86%',
		proxySuccess: '97.5%',
		marketsPerSport: 8123,
		volume24h: '$95M',
		arbProfit: 0.025,
		geo: '🇺🇸',
		status: '🟢 LIVE'
	},
	fanduel: {
		rank: 8,
		type: 'Square',
		protocol: 'https:',
		hostname: 'fanduel.com',
		oddsPath: '/navigation/:market',
		vig: '6.3%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-US': 'true' },
		avgSpread: 47.8,
		apiLatency: '149ms',
		connectionReuse: '84%',
		proxySuccess: '97.2%',
		marketsPerSport: 7456,
		volume24h: '$88M',
		arbProfit: 0.023,
		geo: '🇺🇸',
		status: '🟡 ACTIVE'
	},
	williamhill: {
		rank: 9,
		type: 'Square',
		protocol: 'https:',
		hostname: 'williamhill.com',
		oddsPath: '/sport/:sport/:event',
		vig: '4.9%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-UK': 'true' },
		avgSpread: 38.5,
		apiLatency: '112ms',
		connectionReuse: '88%',
		proxySuccess: '98.4%',
		marketsPerSport: 9678,
		volume24h: '$140M',
		arbProfit: 0.031,
		geo: '🌍',
		status: '🟡 ACTIVE'
	},
	betway: {
		rank: 10,
		type: 'Square',
		protocol: 'https:',
		hostname: 'betway.com',
		oddsPath: '/sports/:market/*',
		vig: '5.5%',
		arbRole: 'Arb Target',
		proxyHeaders: { 'X-Global': 'true' },
		avgSpread: 41.2,
		apiLatency: '128ms',
		connectionReuse: '87%',
		proxySuccess: '97.8%',
		marketsPerSport: 6789,
		volume24h: '$75M',
		arbProfit: 0.026,
		geo: '🌍',
		status: '🟢 LIVE'
	}
};

