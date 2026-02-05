/**
 * @fileoverview Pipeline Integration Service
 * @description Service to integrate existing providers with the enterprise pipeline
 * @module pipeline/integration
 */

import { PropertyRegistry } from "../properties/registry";
import { RBACManager } from "../rbac/manager";
import { FeatureFlagManager } from "../features/flags";
import {
	createProviderAdapter,
	type ProviderAdapter,
} from "./adapters/providers";
import { PipelineOrchestrator } from "./orchestrator";
import { defaultPipelineConfig } from "./index";
import type { DataProvider } from "../types";
import { err, ok, type Result } from "../types";
import type { DataSource, PipelineUser } from "./types";

/**
 * Pipeline integration service
 *
 * Connects existing data providers to the enterprise pipeline with proper
 * adapters, property registry integration, RBAC, and feature flags.
 */
export class PipelineIntegrationService {
	private orchestrator: PipelineOrchestrator;
	private propertyRegistry: PropertyRegistry;
	private rbacManager: RBACManager;
	private featureFlagManager: FeatureFlagManager;
	private providerAdapters: Map<string, ProviderAdapter> = new Map();

	constructor() {
		// Initialize pipeline components
		this.orchestrator = new PipelineOrchestrator(defaultPipelineConfig);
		this.propertyRegistry = new PropertyRegistry();
		this.rbacManager = new RBACManager();
		this.featureFlagManager = new FeatureFlagManager();

		// Set up adapters
		this.setupAdapters();
	}

	/**
	 * Set up pipeline adapters for property registry, RBAC, and feature flags
	 */
	private setupAdapters(): void {
		// Set property registry on transformation stage for property extraction and validation
		this.orchestrator.setPropertyRegistryOnTransformation(this.propertyRegistry);

		// Property registry adapter
		this.orchestrator.setPropertyRegistry({
			getSchema: (source: DataSource) => {
				// Get schema for the source's namespace
				return this.propertyRegistry.getSchema(source.id, source.namespace);
			},
			getEnrichmentRules: (source: DataSource) => {
				// Return enrichment rules based on source type
				switch (source.type) {
					case "exchange":
						return {
							enableAnalytics: true,
							enableCorrelations: true,
							enableArbitrageDetection: true,
						};
					case "market":
						return {
							enableAnalytics: true,
							enableCorrelations: true,
							enableMarketEfficiency: true,
						};
					case "sportsbook":
						return {
							enableAnalytics: true,
							enableCorrelations: true,
							enableSharpBookDetection: true,
						};
					default:
						return {
							enableAnalytics: false,
							enableCorrelations: false,
						};
				}
			},
		});

		// RBAC manager adapter
		this.orchestrator.setRBACManager({
			canAccess: (user: PipelineUser, source: DataSource) => {
				return this.rbacManager.canAccess(user, source);
			},
			filterData: (data, user) => {
				return this.rbacManager.filterData(data, user);
			},
		});

		// Feature flag manager adapter
		this.orchestrator.setFeatureFlagManager({
			isEnabled: (flag: string, user: PipelineUser) => {
				return this.featureFlagManager.isEnabled(flag, user);
			},
		});
	}

	/**
	 * Register a data provider with the pipeline
	 *
	 * @param provider - The data provider instance
	 * @param dataSource - Data source metadata
	 */
	registerProvider(provider: DataProvider, dataSource: DataSource): void {
		const adapter = createProviderAdapter(provider, dataSource);
		this.providerAdapters.set(dataSource.id, adapter);
	}

	/**
	 * Process data from a registered provider through the pipeline
	 *
	 * @param sourceId - ID of the registered data source
	 * @param user - User context for RBAC and feature flags
	 * @param options - Fetch options (symbol, since, limit, etc.)
	 * @returns Pipeline processing result
	 */
	async processProviderData(
		sourceId: string,
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown>> {
		try {
			const adapter = this.providerAdapters.get(sourceId);
			if (!adapter) {
				return err(
					new Error(`Provider not registered for source: ${sourceId}`),
				);
			}

			// Fetch data from the provider
			const fetchResult = await adapter.fetchData(user, options);
			if (!fetchResult.ok) {
				return err(fetchResult.error);
			}

			// Process each data item through the pipeline
			const results: unknown[] = [];
			const errors: Error[] = [];

			for (const dataItem of fetchResult.data) {
				const pipelineResult = await this.orchestrator.process(
					dataItem,
					adapter.getDataSource(),
					user,
				);

				if (pipelineResult.ok) {
					results.push(pipelineResult.data);
				} else {
					errors.push(pipelineResult.error);
				}
			}

			if (errors.length > 0 && results.length === 0) {
				return err(
					new Error(
						`Pipeline processing failed for all items: ${errors.map((e) => e.message).join(", ")}`,
					),
				);
			}

			return ok(results);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Pipeline integration failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Get list of registered providers
	 */
	getRegisteredProviders(): Array<{
		sourceId: string;
		dataSource: DataSource;
	}> {
		return Array.from(this.providerAdapters.entries()).map(
			([sourceId, adapter]) => ({
				sourceId,
				dataSource: adapter.getDataSource(),
			}),
		);
	}

	/**
	 * Check if a provider is registered
	 */
	isProviderRegistered(sourceId: string): boolean {
		return this.providerAdapters.has(sourceId);
	}

	/**
	 * Get the pipeline orchestrator
	 */
	getOrchestrator(): PipelineOrchestrator {
		return this.orchestrator;
	}

	/**
	 * Get the property registry
	 */
	getPropertyRegistry(): PropertyRegistry {
		return this.propertyRegistry;
	}

	/**
	 * Get the RBAC manager
	 */
	getRBACManager(): RBACManager {
		return this.rbacManager;
	}

	/**
	 * Close all pipeline components
	 */
	close(): void {
		this.orchestrator.close();
		this.propertyRegistry.close();
		this.rbacManager.close();
		this.featureFlagManager.close();
	}
}

/**
 * Global pipeline integration service instance
 */
let pipelineIntegrationService: PipelineIntegrationService | null = null;

/**
 * Get or create the global pipeline integration service
 */
export function getPipelineIntegrationService(): PipelineIntegrationService {
	if (!pipelineIntegrationService) {
		pipelineIntegrationService = new PipelineIntegrationService();
	}
	return pipelineIntegrationService;
}

/**
 * Initialize pipeline integration with common providers
 */
export async function initializePipelineIntegration(): Promise<Result<void>> {
	try {
		const service = getPipelineIntegrationService();

		// Import pipeline provider adapters
		const {
			CCXTPipelineProvider,
			DeribitPipelineProvider,
			PolymarketPipelineProvider,
			KalshiPipelineProvider,
		} = await import("./providers");

		// Import ORCA provider directly
		const { ORCAProvider } = await import("../providers/orca");

		// Register providers that can work with public data or default configs

		// Deribit (public API, no auth required)
		try {
			const deribitPipelineProvider = new DeribitPipelineProvider({ testnet: false });
			const deribitProvider = deribitPipelineProvider.getProvider();
			const deribitDataSource = deribitPipelineProvider.getDataSource();
			service.registerProvider(deribitProvider, deribitDataSource);
			console.log("✅ Registered Deribit provider");
		} catch (error) {
			console.warn("⚠️ Failed to register Deribit provider:", error);
		}

		// Polymarket (public market data, no auth required)
		try {
			const polymarketPipelineProvider = new PolymarketPipelineProvider();
			const polymarketProvider = polymarketPipelineProvider.getProvider();
			const polymarketDataSource = polymarketPipelineProvider.getDataSource();
			service.registerProvider(polymarketProvider, polymarketDataSource);
			console.log("✅ Registered Polymarket provider");
		} catch (error) {
			console.warn("⚠️ Failed to register Polymarket provider:", error);
		}

		// Kalshi (read-only mode, no auth required)
		try {
			const kalshiPipelineProvider = new KalshiPipelineProvider();
			const kalshiProvider = kalshiPipelineProvider.getProvider();
			const kalshiDataSource = kalshiPipelineProvider.getDataSource();
			service.registerProvider(kalshiProvider, kalshiDataSource);
			console.log("✅ Registered Kalshi provider");
		} catch (error) {
			console.warn("⚠️ Failed to register Kalshi provider:", error);
		}

		// ORCA (sports betting, no auth required)
		try {
			const orcaProvider = new ORCAProvider();
			const orcaDataSource = {
				id: "orca",
				name: "ORCA Sports Betting",
				type: "sportsbook" as const,
				namespace: "@nexus/providers/orca",
				version: "1.0.0",
				featureFlag: "orca-integration",
			};
			service.registerProvider(orcaProvider, orcaDataSource);
			console.log("✅ Registered ORCA provider");
		} catch (error) {
			console.warn("⚠️ Failed to register ORCA provider:", error);
		}

		// Note: CCXT providers require API keys and are registered per-exchange
		// They can be registered dynamically when users provide credentials

		const registeredProviders = service.getRegisteredProviders();
		console.log(
			`Pipeline integration initialized with ${registeredProviders.length} providers:`,
			registeredProviders.map(p => p.dataSource.name),
		);

		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error
				? error
				: new Error(
						`Pipeline integration initialization failed: ${String(error)}`,
					),
		);
	}
}
