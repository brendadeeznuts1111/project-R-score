/**
 * @fileoverview Pipeline Example
 * @description Example usage of the enterprise data pipeline
 * @module pipeline/example
 */

import { FeatureFlagManager } from "../features";
import { PropertyRegistry } from "../properties";
import { RBACManager } from "../rbac";
import { defaultPipelineConfig, PipelineOrchestrator } from "./index";
import type { DataSource, PipelineUser } from "./types";

/**
 * Example: Process data through the pipeline
 */
export async function examplePipelineUsage() {
	// 1. Initialize pipeline with config
	const config = defaultPipelineConfig;
	const orchestrator = new PipelineOrchestrator(config);

	// 2. Set up property registry
	const propertyRegistry = new PropertyRegistry();
	orchestrator.setPropertyRegistry({
		getSchema: (source) => {
			// Return schema for source
			return propertyRegistry.getSchema("price", source.namespace);
		},
		getEnrichmentRules: (source) => {
			// Return enrichment rules for source
			return {
				enableAnalytics: true,
				enableCorrelations: true,
			};
		},
	});

	// 3. Set up RBAC manager
	const rbacManager = new RBACManager();
	orchestrator.setRBACManager({
		canAccess: (user, source) => rbacManager.canAccess(user, source),
		filterData: (data, user) => rbacManager.filterData(data, user),
	});

	// 4. Set up feature flag manager
	const featureFlagManager = new FeatureFlagManager();
	orchestrator.setFeatureFlagManager({
		isEnabled: (flag, user) => featureFlagManager.isEnabled(flag, user),
	});

	// 5. Define data source
	const source: DataSource = {
		id: "pinnacle",
		name: "Pinnacle Sports",
		type: "sportsbook",
		namespace: "@nexus/providers/sharp-books",
		version: "1.0.0",
		featureFlag: "sharp-books-v2",
	};

	// 6. Define user
	const user: PipelineUser = {
		id: "user-123",
		username: "trader",
		role: "trader",
		featureFlags: [],
	};

	// 7. Process data
	const rawData = {
		sport: "NFL",
		homeTeam: "Kansas City Chiefs",
		awayTeam: "Buffalo Bills",
		odds: 2.5,
		line: -3.5,
		timestamp: Date.now(),
	};

	const result = await orchestrator.process(rawData, source, user);

	if (result.ok) {
		console.log("Pipeline processing successful:", result.data);
	} else {
		console.error("Pipeline processing failed:", result.error);
	}

	// 8. Cleanup
	orchestrator.close();
	propertyRegistry.close();
	rbacManager.close();
	featureFlagManager.close();
}
