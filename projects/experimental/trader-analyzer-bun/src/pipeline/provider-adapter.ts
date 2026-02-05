/**
 * @fileoverview Pipeline Provider Adapter
 * @description Adapter to integrate existing providers with the pipeline
 * @module pipeline/provider-adapter
 */

import { err, ok } from "../types";
import { PipelineOrchestrator } from "./orchestrator";
import type { DataSource, PipelineUser, Result } from "./types";

/**
 * Interface for providers that can be adapted to the pipeline
 */
export interface PipelineAdaptableProvider {
	/** Provider name */
	name: string;
	/** Fetch data from the provider */
	fetchData(params?: Record<string, unknown>): Promise<Result<unknown>>;
	/** Get the data source metadata */
	getDataSource(): DataSource;
}

/**
 * Adapter to integrate existing providers with the pipeline
 *
 * Wraps provider calls and feeds the data through the pipeline orchestrator.
 */
export class PipelineProviderAdapter {
	private orchestrator: PipelineOrchestrator;

	constructor(orchestrator: PipelineOrchestrator) {
		this.orchestrator = orchestrator;
	}

	/**
	 * Execute a provider call through the pipeline
	 *
	 * @param provider - The provider to adapt
	 * @param params - Parameters to pass to the provider
	 * @param user - User context for RBAC and feature flags
	 * @returns Pipeline-processed result
	 */
	async executeProviderCall(
		provider: PipelineAdaptableProvider,
		params: Record<string, unknown> = {},
		user: PipelineUser,
	): Promise<Result<unknown>> {
		try {
			// 1. Fetch raw data from provider
			const fetchResult = await provider.fetchData(params);
			if (!fetchResult.ok) {
				return err(fetchResult.error);
			}

			// 2. Get data source metadata
			const source = provider.getDataSource();

			// 3. Process through pipeline
			const pipelineResult = await this.orchestrator.process(
				fetchResult.data,
				source,
				user,
			);

			if (!pipelineResult.ok) {
				return err(pipelineResult.error);
			}

			// 4. Return the served data
			return ok(pipelineResult.data.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Provider pipeline execution failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Create a pipeline-adaptable wrapper for an existing provider
	 *
	 * @param provider - The original provider instance
	 * @param fetchMethod - Method name to call for data fetching
	 * @param dataSource - Data source metadata
	 * @returns Pipeline-adaptable provider
	 */
	static createAdaptableProvider<T extends object>(
		provider: T,
		fetchMethod: keyof T,
		dataSource: DataSource,
	): PipelineAdaptableProvider {
		return {
			name: dataSource.name,
			getDataSource: () => dataSource,
			fetchData: async (params?: Record<string, unknown>) => {
				try {
					const method = provider[fetchMethod] as (
						params?: Record<string, unknown>,
					) => Promise<Result<unknown>>;
					return await method.call(provider, params);
				} catch (error) {
					return err(
						error instanceof Error
							? error
							: new Error(`Provider fetch failed: ${String(error)}`),
					);
				}
			},
		};
	}
}
