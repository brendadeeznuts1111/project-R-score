#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v4.2 - Polymarket CLI
 * 
 * Fetch crypto prediction markets data
 */

import { PolymarketClient } from "./polymarket-client";
import { writeFile } from "fs/promises";

const args = Bun.argv.slice(2);
const client = new PolymarketClient();

// Parse arguments
const command = args[0];
const options: Record<string, string> = {};

for (let i = 1; i < args.length; i++) {
	const arg = args[i];
	if (arg.startsWith('--')) {
		const [key, value] = arg.slice(2).split('=');
		options[key] = value || args[++i];
	}
}

// Execute command
switch (command) {
	case 'markets':
	case 'list':
		// List all markets
		client.fetchMarkets(options.historical === 'true').then(async (markets) => {
			const output = options.output || 'polymarket-markets.json';
			await writeFile(output, JSON.stringify(markets, null, 2));
			console.log(`✅ Fetched ${markets.length} markets → ${output}`);
		}).catch(error => {
			console.error('Error:', error);
			process.exit(1);
		});
		break;

	case 'search':
		if (!options.query) {
			console.error('Error: --query is required');
			process.exit(1);
		}
		client.searchMarkets(options.query).then(async (markets) => {
			const output = options.output || 'polymarket-search.json';
			await writeFile(output, JSON.stringify(markets, null, 2));
			console.log(`✅ Found ${markets.length} markets → ${output}`);
		}).catch(error => {
			console.error('Error:', error);
			process.exit(1);
		});
		break;

	case 'historical':
		if (!options.market) {
			console.error('Error: --market is required');
			process.exit(1);
		}
		const days = parseInt(options.days || '30');
		client.fetchHistorical(options.market, days).then(async (historical) => {
			const output = options.output || 'polymarket-historical.json';
			await writeFile(output, JSON.stringify(historical, null, 2));
			console.log(`✅ Fetched ${historical.length} days of history → ${output}`);
		}).catch(error => {
			console.error('Error:', error);
			process.exit(1);
		});
		break;

	default:
		console.log('Polymarket CLI - Crypto Prediction Markets');
		console.log('');
		console.log('Usage:');
		console.log('  bunx polymarket markets [--historical=true] [--output=file.json]');
		console.log('  bunx polymarket search --query="sports" [--output=file.json]');
		console.log('  bunx polymarket historical --market=market-id [--days=30] [--output=file.json]');
		console.log('');
		console.log('Examples:');
		console.log('  bunx polymarket markets --historical=true');
		console.log('  bunx polymarket search --query="manchester united"');
		console.log('  bunx polymarket historical --market=market-1 --days=60');
		process.exit(0);
}



