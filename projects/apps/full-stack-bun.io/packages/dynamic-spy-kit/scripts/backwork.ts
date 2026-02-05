#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v5.0 - Backwork CLI
 * 
 * Reverse engineer winning plays
 */

import { BackworkEngine } from '../src/backwork/backwork-engine';
import type { WinningPlay, TickDataExtended } from '../src/types';

const args = Bun.argv.slice(2);
const playFile = args[0] || 'play.json';

console.log(`🔍 Backworking play from ${playFile}...`);

// Load winning play
let winningPlay: WinningPlay;
try {
	const file = Bun.file(playFile);
	if (await file.exists()) {
		winningPlay = await file.json();
	} else {
		// Default play
		winningPlay = {
			bookie: 'pinnacle',
			market: 'nfl-spread',
			line: 1.92,
			timestamp: Date.now() - 3600000,
			profit: 0.042
		};
		console.log('⚠️  Using default play (file not found)');
	}
} catch (error) {
	console.error('Failed to load play:', error);
	process.exit(1);
}

// Mock ticks (would load from R2)
const mockTicks = new Map<string, TickDataExtended[]>();
const engine = new BackworkEngine(mockTicks);

const result = await engine.reverseEngineer(winningPlay);

console.log('\n🎯 BACKWORK RESULT:');
console.log(JSON.stringify(result, null, 2));



