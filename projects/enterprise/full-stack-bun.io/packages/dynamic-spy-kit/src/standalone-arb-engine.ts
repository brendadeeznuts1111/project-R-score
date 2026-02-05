#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Standalone Arbitrage Engine
 * 
 * Deterministic production build - NO .env dependency
 * Config baked in at compile time
 */

// Config baked in (no .env needed)
const CONFIG = {
	port: 3000,
	bookies: ['pinnacle', 'bet365', 'betmgm'],
	markets: 25000,
	compression: 'zstd' as const
} as const;

console.log('🚀 Standalone Arbitrage Engine');
console.log('==============================');
console.log(`Port: ${CONFIG.port}`);
console.log(`Bookies: ${CONFIG.bookies.length}`);
console.log(`Markets: ${CONFIG.markets}`);
console.log(`Compression: ${CONFIG.compression}`);
console.log('');

// Import compression utilities
import { generateNBAMarketsStream, compressStream } from './utils/compression-stream';

// Start server
Bun.serve({
	port: CONFIG.port,
	async fetch(req) {
		const url = new URL(req.url);
		
		if (url.pathname === '/markets') {
			// Generate and compress markets
			const marketsStream = generateNBAMarketsStream();
			const compressed = compressStream(marketsStream, CONFIG.compression);
			
			return new Response(compressed, {
				headers: {
					'Content-Type': 'application/x-ndjson',
					'Content-Encoding': CONFIG.compression
				}
			});
		}
		
		if (url.pathname === '/health') {
			return Response.json({
				status: 'live',
				version: '9.0.0',
				standalone: true,
				config: CONFIG
			});
		}
		
		return new Response('Not Found', { status: 404 });
	}
});

console.log(`✅ Server running on port ${CONFIG.port}`);
console.log(`📊 Markets: http://localhost:${CONFIG.port}/markets`);
console.log(`💚 Health: http://localhost:${CONFIG.port}/health`);



