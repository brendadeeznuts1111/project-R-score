/**
 * @fileoverview Pipeline API Integration
 * @description Integration layer for using the pipeline in API routes
 * @module api/pipeline
 */

import { FeatureFlagManager } from "../features";
import { PropertyRegistry } from "../properties";
import { RBACManager } from "../rbac";
import {
	defaultPipelineConfig,
	PipelineOrchestrator,
	PipelineProviderAdapter,
} from "../pipeline";
import type { PipelineUser } from "../pipeline/types";

/**
 * Global pipeline instance for API routes
 */
let globalPipelineOrchestrator: PipelineOrchestrator | null = null;
let globalPipelineAdapter: PipelineProviderAdapter | null = null;

/**
 * Initialize the global pipeline orchestrator with all adapters
 */
export async function initializePipeline(): Promise<void> {
	if (globalPipelineOrchestrator) return;

	// Create pipeline orchestrator
	const config = defaultPipelineConfig;
	globalPipelineOrchestrator = new PipelineOrchestrator(config);

	// Initialize adapters
	const propertyRegistry = new PropertyRegistry();
	const rbacManager = new RBACManager();
	const featureFlagManager = new FeatureFlagManager();

	// Set up adapters
	globalPipelineOrchestrator.setPropertyRegistry({
		getSchema: (source) =>
			propertyRegistry.getSchema("price", source.namespace),
		getEnrichmentRules: (source) => ({
			enableAnalytics: true,
			enableCorrelations: true,
		}),
	});

	globalPipelineOrchestrator.setRBACManager({
		canAccess: (user, source) => rbacManager.canAccess(user, source),
		filterData: (data, user) => rbacManager.filterData(data, user),
	});

	globalPipelineOrchestrator.setFeatureFlagManager({
		isEnabled: (flag, user) => featureFlagManager.isEnabled(flag, user),
	});

	// Create provider adapter
	globalPipelineAdapter = new PipelineProviderAdapter(
		globalPipelineOrchestrator,
	);
}

/**
 * Get the global pipeline orchestrator
 */
export function getPipelineOrchestrator(): PipelineOrchestrator {
	if (!globalPipelineOrchestrator) {
		throw new Error(
			"Pipeline not initialized. Call initializePipeline() first.",
		);
	}
	return globalPipelineOrchestrator;
}

/**
 * Get the global pipeline provider adapter
 */
export function getPipelineAdapter(): PipelineProviderAdapter {
	if (!globalPipelineAdapter) {
		throw new Error(
			"Pipeline not initialized. Call initializePipeline() first.",
		);
	}
	return globalPipelineAdapter;
}

/**
 * Create a pipeline user from request context
 * This is a placeholder - will be replaced with real auth integration
 */
export function createPipelineUserFromContext(
	userId = "anonymous",
	role = "guest",
): PipelineUser {
	return {
		id: userId,
		username: userId,
		role: role as any, // Will be properly typed when RBAC is integrated
		featureFlags: [],
	};
}

/**
 * Execute a provider call through the pipeline
 *
 * @param provider - Pipeline-adaptable provider
 * @param params - Parameters for the provider call
 * @param user - User context (optional, defaults to anonymous)
 * @returns Pipeline-processed result
 */
export async function executeProviderThroughPipeline(
	provider: any,
	methodName: string,
	params: Record<string, unknown> = {},
	user?: PipelineUser,
): Promise<any> {
	const adapter = getPipelineAdapter();
	const pipelineUser = user || createPipelineUserFromContext();

	// Create adaptable provider
	const adaptableProvider = PipelineProviderAdapter.createAdaptableProvider(
		provider,
		methodName as keyof typeof provider,
		{
			id: provider.name || "unknown",
			name: provider.name || "Unknown Provider",
			type: "exchange", // Default type
		},
	);

	return adapter.executeProviderCall(adaptableProvider, params, pipelineUser);
}
