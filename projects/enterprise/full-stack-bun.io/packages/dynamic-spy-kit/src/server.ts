#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v3.2 - Production Server
 * 
 * Full arbitrage server with cache + mapping + endpoints
 */

import { ArbServer } from "./arb-server";
import { OddsRouter } from "./odds-router";

const server = Bun.serve({
	port: process.env.PORT || 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const arbServer = new ArbServer();

		// Initialize on first request
		if (!arbServer['initialized']) {
			await arbServer.init();
			arbServer['initialized'] = true;
		}

		// GET /sports/:sport/:league/:market
		if (url.pathname.startsWith('/sports/')) {
			const parts = url.pathname.split('/').filter(p => p);
			const [sport, league, market] = parts.slice(1);

			const markets = await arbServer.getMarkets(sport, league, market);
			return Response.json({ sport, league, market, markets });
		}

		// GET /cache/stats
		if (url.pathname === '/cache/stats') {
			const stats = await arbServer.getCacheStats();
			return Response.json(stats);
		}

		// GET /health
		if (url.pathname === '/health') {
			const health = await arbServer.health();
			return Response.json(health);
		}

		return new Response('Arbitrage Server v3.2', { status: 200 });
	}
});

console.log(`🚀 Arbitrage Server running on http://localhost:${server.port}`);
console.log(`📊 Endpoints:`);
console.log(`  GET /sports/:sport/:league/:market`);
console.log(`  GET /cache/stats`);
console.log(`  GET /health`);



