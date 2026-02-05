#!/usr/bin/env bun
/**
 * @fileoverview Register Feature Flags Script
 * @description Script to register default feature flags in the system
 * @module scripts/register-feature-flags
 */

import { FeatureFlagManager } from "../src/features/flags";
import type { FeatureFlagConfig } from "../src/features/config";

/**
 * Default feature flags to register
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig[] = [
	{
		id: "sharp-books-v2",
		name: "Sharp Books V2",
		enabled: true,
		rollout: 100,
		conditions: {
			roles: ["admin", "trader"],
		},
	},
	{
		id: "premium-data",
		name: "Premium Data Access",
		enabled: true,
		rollout: 100,
		conditions: {
			roles: ["admin", "trader"],
		},
	},
	{
		id: "beta-features",
		name: "Beta Features",
		enabled: false,
		rollout: 10, // Only 10% of users
		conditions: {
			roles: ["admin"],
		},
	},
	{
		id: "analytics-pro",
		name: "Professional Analytics",
		enabled: true,
		rollout: 100,
		conditions: {
			roles: ["admin", "trader", "analyst"],
		},
	},
	{
		id: "real-time-streams",
		name: "Real-time Data Streams",
		enabled: true,
		rollout: 100,
		conditions: {
			roles: ["admin", "trader"],
		},
	},
];

/**
 * Register all default feature flags
 */
async function registerFeatureFlags(): Promise<void> {
	console.log("🚩 Registering feature flags...");

	const manager = new FeatureFlagManager();

	let registered = 0;
	let skipped = 0;

	for (const flag of DEFAULT_FEATURE_FLAGS) {
		try {
			// Check if flag already exists
			const existingFlags = manager.getAllFlags();
			const exists = existingFlags.some(f => f.id === flag.id);

			if (exists) {
				console.log(`⏭️  Skipping existing flag: ${flag.id}`);
				skipped++;
				continue;
			}

			manager.registerFlag(flag);
			console.log(`✅ Registered flag: ${flag.id} - ${flag.name}`);
			registered++;
		} catch (error) {
			console.error(`❌ Failed to register flag ${flag.id}:`, error);
		}
	}

	console.log(`\n📊 Feature flag registration complete!`);
	console.log(`Registered: ${registered}`);
	console.log(`Skipped: ${skipped}`);
	console.log(`Total: ${registered + skipped}`);

	manager.close();
}

// Run the script
if (import.meta.main) {
	registerFeatureFlags().catch(console.error);
}

export { registerFeatureFlags, DEFAULT_FEATURE_FLAGS };