#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v4.2 - Backwork Server
 * 
 * Production server for reverse engineering winning models
 */

import { BackworkEngine, WinningPlay } from "./backwork-engine";
import { TickDataExtended } from "./model-reverse";

// Mock tick data (in production, load from database)
const mockTicks = new Map<string, TickDataExtended[]>();

// Initialize backwork engine
const backworkEngine = new BackworkEngine(mockTicks);

const server = Bun.serve({
	port: process.env.PORT || 3000,
	hostname: '0.0.0.0',

	async fetch(req) {
		const url = new URL(req.url);

		// POST /backwork - Reverse engineer winning play
		if (url.pathname === '/backwork' && req.method === 'POST') {
			try {
				const play: WinningPlay = await req.json();

				const result = await backworkEngine.reverseEngineer(play);

				return Response.json({
					winningPlay: {
						line: play.line,
						profit: play.profit ? `$${(play.profit / 1000).toFixed(0)}K` : undefined
					},
					topMatch: result.topMatch ? {
						market: result.topMatch.market,
						bookie: result.topMatch.bookie,
						confidence: result.topMatch.confidence,
						tickTime: `${Math.floor((play.timestamp - result.topMatch.tickTime) / 60000)}min before play`,
						pattern: result.topMatch.pattern
					} : null,
					asiaSignals: result.asiaSignals.map(s => ({
						bookie: s.bookie,
						spikeTime: `${Math.floor((play.timestamp - s.spikeTime) / 60000)}min ${Math.floor(((play.timestamp - s.spikeTime) % 60000) / 1000)}s before`,
						volume: `${(s.volume / 1000000).toFixed(1)}x normal`,
						line: s.lineBeforePlay.home,
						leadTime: s.leadTime,
						confidence: s.confidence
					})),
					modelFingerprint: result.modelFingerprint
				});
			} catch (error: any) {
				return Response.json({
					error: 'Failed to reverse engineer play',
					message: error.message
				}, { status: 500 });
			}
		}

		// GET /models - List discovered models
		if (url.pathname === '/models') {
			// In production, return discovered models from database
			return Response.json([]);
		}

		return new Response('Backwork Server v4.2', { status: 200 });
	}
});

console.log(`🚀 Backwork Server running on http://localhost:${server.port}`);
console.log(`📊 Endpoints:`);
console.log(`  POST /backwork - Reverse engineer winning play`);
console.log(`  GET /models - List discovered models`);



