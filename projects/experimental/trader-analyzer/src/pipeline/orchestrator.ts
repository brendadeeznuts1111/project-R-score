/**
 * @fileoverview Pipeline Orchestrator
 * @description Orchestrates the multi-stage data pipeline
 * @module pipeline/orchestrator
 */

import { err, ok } from "../types";
import { PropertyRegistry } from "../properties/registry";
import { DataEnrichmentStage } from "./stages/enrichment";
import { DataIngestionStage } from "./stages/ingestion";
import { DataServingStage } from "./stages/serving";
import { DataTransformationStage } from "./stages/transformation";
import type {
	DataSource,
	EnrichedData,
	FeatureFlagManagerAdapter,
	PipelineConfig,
	PipelineUser,
	PropertyRegistryAdapter,
	RBACManagerAdapter,
	Result,
	ServedData,
} from "./types";

/**
 * Pipeline orchestrator that coordinates all stages of the data pipeline
 *
 * Manages the flow: Ingestion → Transformation → Enrichment → Serving
 * with RBAC filtering and feature flag checks at each stage.
 */
export class PipelineOrchestrator {
	private stages: {
		ingestion: DataIngestionStage;
		transformation: DataTransformationStage;
		enrichment: DataEnrichmentStage;
		serving: DataServingStage;
	};
	private config: PipelineConfig;
	private propertyRegistry?: PropertyRegistryAdapter;
	private rbacManager?: RBACManagerAdapter;
	private featureFlagManager?: FeatureFlagManagerAdapter;

	constructor(config: PipelineConfig) {
		this.config = config;

		// Initialize stages with descriptive names
		this.stages = {
			ingestion: new DataIngestionStage(),
			transformation: new DataTransformationStage(),
			enrichment: new DataEnrichmentStage(config.stages.enrichment),
			serving: new DataServingStage(config.stages.serving),
		};
	}

	/**
	 * Set property registry adapter for schema validation and enrichment rules
	 * @param registry - Property registry adapter implementation
	 */
	setPropertyRegistry(registry: PropertyRegistryAdapter): void {
		this.propertyRegistry = registry;
	}

	/**
	 * Set RBAC manager adapter for access control
	 * @param manager - RBAC manager adapter implementation
	 */
	setRBACManager(manager: RBACManagerAdapter): void {
		this.rbacManager = manager;
	}

	/**
	 * Set feature flag manager adapter for feature gating
	 * @param manager - Feature flag manager adapter implementation
	 */
	setFeatureFlagManager(manager: FeatureFlagManagerAdapter): void {
		this.featureFlagManager = manager;
	}

	/**
	 * Set property registry on transformation stage for property extraction
	 * @param registry - Property registry instance
	 */
	setPropertyRegistryOnTransformation(registry: PropertyRegistry): void {
		this.stages.transformation.setPropertyRegistry(registry);
	}

	/**
	 * Process data through the full pipeline: Ingestion → Transformation → Enrichment → Serving
	 *
	 * @param rawData - Raw data payload from the data source
	 * @param source - Data source metadata
	 * @param user - User context for RBAC and feature flags
	 * @returns Result containing served data or error
	 */
	async process(
		rawData: unknown,
		source: DataSource,
		user: PipelineUser,
	): Promise<Result<ServedData>> {
		try {
			// Stage 1: Ingestion (with feature flag check)
			const ingestionResult = await this.stages.ingestion.ingest(
				source,
				rawData,
				this.featureFlagManager,
				user,
			);

			if (!ingestionResult.ok) {
				return err(ingestionResult.error);
			}

			// RBAC check after ingestion
			if (this.rbacManager && !this.rbacManager.canAccess(user, source)) {
				return err(
					new Error(`User ${user.id} cannot access source ${source.id}`),
				);
			}

			// Stage 2: Transformation (with property extraction)
			const transformationResult = await this.stages.transformation.transform(
				ingestionResult.data.rawData,
				source,
				this.propertyRegistry?.getSchema(source),
			);

			if (!transformationResult.ok) {
				return err(transformationResult.error);
			}

			const transformed = transformationResult.data;

			// Stage 3: Enrichment (with cross-source correlation)
			const enrichmentResult = await this.stages.enrichment.enrich(
				transformed,
				this.propertyRegistry?.getEnrichmentRules(source),
			);

			if (!enrichmentResult.ok) {
				return err(enrichmentResult.error);
			}

			const enriched = enrichmentResult.data;

			// Stage 4: Serving (with RBAC filtering)
			const servingResult = await this.stages.serving.serve(
				{ source: source.id },
				user,
				enriched,
				this.rbacManager,
				this.featureFlagManager,
			);

			if (!servingResult.ok) {
				return err(servingResult.error);
			}

			return ok(servingResult.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Pipeline processing failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Process a batch of data items through the pipeline
	 *
	 * @param items - Array of data items with their sources
	 * @param user - User context for RBAC and feature flags
	 * @returns Result containing array of served data or error if all failed
	 */
	async processBatch(
		items: Array<{ data: unknown; source: DataSource }>,
		user: PipelineUser,
	): Promise<Result<ServedData[]>> {
		const results: ServedData[] = [];
		const errors: Error[] = [];

		for (const item of items) {
			const result = await this.process(item.data, item.source, user);
			if (result.ok) {
				results.push(result.data);
			} else {
				errors.push(result.error);
			}
		}

		if (errors.length > 0 && results.length === 0) {
			return err(
				new Error(
					`Batch processing failed: ${errors.map((e) => e.message).join(", ")}`,
				),
			);
		}

		return ok(results);
	}

	/**
	 * Close all stages and cleanup resources
	 * Should be called when the orchestrator is no longer needed
	 */
	close(): void {
		this.stages.ingestion.close();
		this.stages.serving.clearCache();
	}
}
