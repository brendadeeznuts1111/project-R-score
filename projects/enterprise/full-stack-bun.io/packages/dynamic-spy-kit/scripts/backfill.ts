#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v5.0 - Backfill CLI
 * 
 * Load historical data from R2
 */

import { R2Loader } from '../src/storage/r2-loader';

const args = Bun.argv.slice(2);
const options: { months?: number; bookie?: string } = {};

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === '--months' && args[i + 1]) {
		options.months = parseInt(args[i + 1]);
		i++;
	} else if (arg.startsWith('--months=')) {
		options.months = parseInt(arg.split('=')[1]);
	} else if (arg === '--bookie' && args[i + 1]) {
		options.bookie = args[i + 1];
		i++;
	} else if (arg.startsWith('--bookie=')) {
		options.bookie = arg.split('=')[1];
	}
}

const months = options.months || 6;
const bookie = options.bookie || 'pinnacle';

console.log(`📊 Backfilling ${months} months of data for ${bookie}...`);

const r2Loader = new R2Loader({
	accountId: process.env.R2_ACCOUNT_ID || '',
	bucket: process.env.R2_BUCKET || 'arb-ticks',
	accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
	secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
});

const endDate = new Date();
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - months);

const ticks = await r2Loader.loadHistorical('nfl-spread', bookie, startDate, endDate);

console.log(`✅ Loaded ${ticks.length} ticks from R2`);
console.log(`📅 Date range: ${startDate.toISOString()} → ${endDate.toISOString()}`);



