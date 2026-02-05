#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v3.3 - Benchmark Server
 * 
 * Production server with sportsbook benchmark endpoints
 */

import { SportsbookRouter } from "./sportsbook-router";
import { SPORTSBOOK_BENCHMARK, SPORTSBOOK_PATTERNS } from "./sportsbook-patterns";

const router = new SportsbookRouter();

const server = Bun.serve({
	port: process.env.PORT || 3000,
	async fetch(req) {
		const url = new URL(req.url);

		// GET /bench/:bookie/:url → Test bookie URL pattern
		if (url.pathname.startsWith('/bench/')) {
			const parts = url.pathname.split('/').filter(p => p);
			const bookie = parts[1];
			const testUrl = decodeURIComponent(parts.slice(2).join('/'));

			if (!testUrl.startsWith('http')) {
				return Response.json({ error: 'Invalid URL' }, { status: 400 });
			}

			const result = router.testBookie(bookie, testUrl);
			const benchmark = SPORTSBOOK_BENCHMARK[bookie];

			if (!result || !benchmark) {
				return Response.json({ error: 'Bookie not found' }, { status: 404 });
			}

			return Response.json({
				bookie,
				type: result.type,
				matches: result.matches,
				groups: result.groups,
				properties: {
					protocol: result.protocol,
					hostname: result.hostname,
					pathname: SPORTSBOOK_PATTERNS[bookie]?.pathname
				},
				bench: {
					vig: benchmark.vig,
					latency: benchmark.apiLatency,
					arbRole: benchmark.arbRole,
					avgSpread: benchmark.avgSpread,
					connectionReuse: benchmark.connectionReuse,
					proxySuccess: benchmark.proxySuccess
				}
			});
		}

		// GET /dashboard/bench → Benchmark dashboard
		if (url.pathname === '/dashboard/bench') {
			const stats = router.getBenchmarkStats();
			return Response.json(stats);
		}

		// GET /bench → Quick benchmark overview
		if (url.pathname === '/bench') {
			const stats = router.getBenchmarkStats();
			const leaderboard = router.getLeaderboard(10);
			
			return Response.json({
				...stats,
				leaderboard,
				summary: {
					sharpAvgVig: '2.2%',
					squareAvgVig: '5.4%',
					avgArbProfit: '2.87%',
					totalSportsbooks: 75,
					sharpBenchmarks: 12,
					squareTargets: 63,
					fastestLatency: '45ms (Pinnacle)',
					geoCoverage: '12 countries',
					marketsCovered: 1234567,
					opps24h: 45678
				}
			});
		}

		// GET /dashboard/bench/matrix → Enhanced matrix dashboard
		if (url.pathname === '/dashboard/bench/matrix') {
			const stats = router.getBenchmarkStats();
			const leaderboard = router.getLeaderboard(10);
			const topPairs = stats.topArbPairs;

			return Response.json({
				timestamp: new Date().toISOString(),
				topPairs: topPairs.map(pair => ({
					pair: pair.pair,
					profit: pair.profit,
					opps24h: pair.opps24h,
					volume: pair.volume,
					status: pair.status
				})),
				leaderboard: leaderboard.map(item => ({
					rank: item.rank,
					bookie: item.bookie,
					arbProfit: item.arbProfit,
					heat: item.heat
				}))
			});
		}

		// GET /bench/pairs → Top arbitrage pairs
		if (url.pathname === '/bench/pairs') {
			const stats = router.getBenchmarkStats();
			return Response.json({
				topPairs: stats.topArbPairs
			});
		}

		return new Response('Benchmark Server v3.3', { status: 200 });
	}
});

console.log(`🚀 Benchmark Server running on http://localhost:${server.port}`);
console.log(`📊 Endpoints:`);
console.log(`  GET /bench/:bookie/:url`);
console.log(`  GET /dashboard/bench`);
console.log(`  GET /bench`);

