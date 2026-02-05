/**
 * @fileoverview Pipeline Configuration
 * @description Default pipeline configuration
 * @module pipeline/config
 */

import type { PipelineConfig } from "./types";

/**
 * Default pipeline configuration
 */
export const defaultPipelineConfig: PipelineConfig = {
	stages: {
		ingestion: {
			batchSize: 100,
			concurrency: 5,
			retryPolicy: {
				maxRetries: 3,
				backoffMs: 1000,
				backoffMultiplier: 2,
			},
		},
		transformation: {
			validateSchema: true,
			strictMode: false,
		},
		enrichment: {
			enableAnalytics: true,
			enableCorrelations: true,
			enableTensionDetection: true,
		},
		serving: {
			cacheTTL: 300_000, // 5 minutes
			maxResults: 1000,
		},
	},
};
