/**
 * @dynamic-spy/kit v9.0 - Simple Socket Information Demo
 * 
 * Direct usage of Bun.connect() enhanced socket properties
 */

import { connect } from "bun";

async function main() {
	console.log("🔌 Simple Socket Information Demo\n");
	
	try {
		// Connect to ai-odds.stream (production feed) with TLS
		const s = await connect({
			hostname: "ai-odds.stream",
			port: 443,
			tls: true,
			socket: {
				data: () => {},
				open: () => {},
				error: () => {},
				close: () => {},
				drain: () => {},
			},
		});
		
		// Direct access to enhanced socket properties
		console.log(`${s.localAddress}:${s.localPort} → ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`);
		// Example output: 10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
		
		// Access individual properties
		console.log("\nIndividual Properties:");
		console.log(`  Local:  ${s.localAddress}:${s.localPort} (${s.localFamily})`);
		console.log(`  Remote: ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`);
		
		s.end();
	} catch (error) {
		// Fallback to HTTP connection if TLS fails
		console.log("TLS connection failed, trying HTTP...\n");
		
		const s = await connect({
			hostname: "example.com",
			port: 80,
			socket: {
				data: () => {},
				open: () => {},
				error: () => {},
				close: () => {},
				drain: () => {},
			},
		});
		
		console.log(`${s.localAddress}:${s.localPort} → ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`);
		
		s.end();
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

