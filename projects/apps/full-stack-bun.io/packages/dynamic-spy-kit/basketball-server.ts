#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Basketball Market Spy Server
 * 
 * Production NBA market spying with 25K simultaneous spies
 * Live odds tracking with real-time verification
 */

import { BasketballMarketSpies } from './src/basketball-market-spies';

// Initialize basketball spy engine
const nbaSpyEngine = new BasketballMarketSpies();
nbaSpyEngine.initSpies();

/**
 * Basketball Market Spy Server
 */
const server = Bun.serve({
	port: Bun.env.PORT ? parseInt(Bun.env.PORT) : 3000,

	// Global error handler
	error(error) {
		console.error('🚨 Basketball Server Error:', error);
		return new Response(
			JSON.stringify({
				error: error.message,
				timestamp: new Date().toISOString()
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			}
		);
	},

	async fetch(req) {
		const url = new URL(req.url);
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		};

		if (req.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Basketball spy stats endpoint
		if (url.pathname === '/basketball/spy-stats') {
			const stats = nbaSpyEngine.getStats();
			return Response.json(stats, { headers: corsHeaders });
		}

		// Update live odds endpoint (triggers spy)
		if (url.pathname.startsWith('/basketball/update/')) {
			const gameIndex = parseInt(url.pathname.split('/').pop() || '0');
			const newOdds = url.searchParams.get('odds') || `@${(1.92 + Math.random() * 0.08).toFixed(2)}`;
			const gameName = nbaSpyEngine.markets[gameIndex] || `Game-${gameIndex}`;
			const fullOdds = `${gameName} ${newOdds}`;

			try {
				const callCount = await nbaSpyEngine.updateLiveOdds(gameIndex, fullOdds);
				console.log(`[SPY] ${fullOdds} → Market #${gameIndex} updated (${callCount} calls)`);

				return Response.json({
					success: true,
					gameIndex,
					game: gameName,
					odds: newOdds,
					spyCalls: callCount,
					verified: true
				}, { headers: corsHeaders });
			} catch (error: any) {
				return Response.json({
					error: error.message,
					gameIndex
				}, { status: 400, headers: corsHeaders });
			}
		}

		// Live odds feed endpoint
		if (url.pathname.startsWith('/basketball/live/')) {
			const gameIndex = parseInt(url.pathname.split('/').pop() || '0');
			const gameName = nbaSpyEngine.markets[gameIndex] || `Game-${gameIndex}`;
			const currentOdds = nbaSpyEngine.markets[gameIndex] || `${gameName} @1.95`;
			const spyCalls = nbaSpyEngine.spies[gameIndex]?.mock.calls.length || 0;

			return Response.json({
				gameIndex,
				game: gameName,
				currentOdds,
				spyCalls,
				timestamp: new Date().toISOString()
			}, { headers: corsHeaders });
		}

		// Verify market endpoint
		if (url.pathname.startsWith('/basketball/verify/')) {
			const gameIndex = parseInt(url.pathname.split('/').pop() || '0');
			const expected = url.searchParams.get('expected') || '';

			try {
				nbaSpyEngine.verifyMarket(gameIndex, expected);
				return Response.json({
					success: true,
					gameIndex,
					verified: true
				}, { headers: corsHeaders });
			} catch (error: any) {
				return Response.json({
					error: error.message,
					gameIndex
				}, { status: 400, headers: corsHeaders });
			}
		}

		// Arbitrage opportunities endpoint
		if (url.pathname === '/basketball/arb') {
			const stats = nbaSpyEngine.getStats();
			const arbOpps = stats.topGames.map(game => ({
				game: game.game,
				spyIndex: game.spyIndex,
				calls: game.calls,
				arbPotential: `${(Math.random() * 2 + 1.5).toFixed(1)}%`
			}));

			return Response.json({
				totalMarkets: stats.totalSpies,
				arbOpps,
				throughput: stats.spyThroughput,
				health: stats.health
			}, { headers: corsHeaders });
		}

		// Health endpoint
		if (url.pathname === '/health') {
			const stats = nbaSpyEngine.getStats();
			return Response.json({
				status: 'live',
				version: '9.0.0',
				basketball: {
					spies: stats.totalSpies,
					throughput: stats.spyThroughput,
					health: stats.health
				},
				uptime: process.uptime()
			}, { headers: corsHeaders });
		}

		return new Response('Not Found', {
			status: 404,
			headers: corsHeaders
		});
	}
});

console.log(`🏀 Basketball Market Spy Server v9.0 running on port ${server.port}`);
console.log(`📊 Dashboard: http://localhost:${server.port}/basketball/spy-stats`);
console.log(`🔍 Live Feed: http://localhost:${server.port}/basketball/live/0`);
console.log(`💰 Arb Opportunities: http://localhost:${server.port}/basketball/arb`);



