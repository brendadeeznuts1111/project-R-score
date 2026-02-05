#!/usr/bin/env bun
// scripts/demo-loop-guard.ts - Demo the loop guard functionality

import {interactive} from '../lib/interactive-cli';

async function demo() {
	console.log('🧪 Tier-1380 LoopGuard Demo\n');

	// Simulate repeated command execution
	const command = 'validate-pointers --bun-native';

	for (let i = 0; i < 3; i++) {
		console.log(`\n--- Execution ${i + 1} ---`);
		try {
			await interactive.execute(command, async () => {
				// Simulate work
				await Bun.sleep(100);
				return `Validation complete. Found 5 pointers. Iteration ${i + 1}`;
			});
		} catch (e) {
			console.error('Error:', e);
			break;
		}
	}

	console.log('\n✅ Demo complete');
}

void demo();
