#!/usr/bin/env bun
// src/api/rss-storage-api.ts - RSS Storage API with R2 and Bun.secrets integration

import {
	createRSSR2ConfigWithSecrets,
	createRSSStorageWithSecrets,
	type ProfilingReport,
	type RSSFeedData,
} from "../storage/r2-storage-native.js";

export class RSSStorageAPI {
	private storage: any;
	private initialized: boolean = false;

	constructor() {
		this.initialize();
	}

	private async initialize() {
		try {
			this.storage = await createRSSStorageWithSecrets();
			this.initialized = true;
			console.log("✅ RSS Storage API initialized with R2 and Bun.secrets");
		} catch (error) {
			console.error(
				"❌ Failed to initialize RSS Storage API:",
				error instanceof Error ? error.message : String(error),
			);
			this.initialized = false;
		}
	}

	private ensureInitialized() {
		if (!this.initialized) {
			throw new Error("RSS Storage API not initialized");
		}
	}

	/**
	 * Store RSS feed data via API
	 */
	async storeRSSFeed(
		feedData: RSSFeedData,
	): Promise<{ success: boolean; key?: string; error?: string }> {
		this.ensureInitialized();

		try {
			const key = this.storage.generateFeedKey(
				feedData.url,
				feedData.fetchedAt,
			);
			await this.storage.storeRSSFeed(feedData);

			return {
				success: true,
				key,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Retrieve RSS feed data via API
	 */
	async retrieveRSSFeed(
		url: string,
		date?: string,
	): Promise<{ success: boolean; data?: RSSFeedData; error?: string }> {
		this.ensureInitialized();

		try {
			const data = await this.storage.getRSSFeed(url, date);

			if (!data) {
				return {
					success: false,
					error: "Feed not found",
				};
			}

			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Store profiling report via API
	 */
	async storeProfilingReport(
		report: ProfilingReport,
	): Promise<{ success: boolean; key?: string; error?: string }> {
		this.ensureInitialized();

		try {
			const key = this.storage.generateReportKey(
				report.type,
				report.generatedAt,
			);
			await this.storage.storeProfilingReport(report);

			return {
				success: true,
				key,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Retrieve profiling report via API
	 */
	async retrieveProfilingReport(
		type: string,
		timestamp: string,
	): Promise<{ success: boolean; data?: ProfilingReport; error?: string }> {
		this.ensureInitialized();

		try {
			const data = await this.storage.getProfilingReport(type, timestamp);

			if (!data) {
				return {
					success: false,
					error: "Report not found",
				};
			}

			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * List available RSS feeds for a URL
	 */
	async listRSSFeeds(
		url: string,
	): Promise<{ success: boolean; feeds?: string[]; error?: string }> {
		this.ensureInitialized();

		try {
			const feeds = await this.storage.listRSSFeeds(url);

			return {
				success: true,
				feeds,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * List available profiling reports by type
	 */
	async listProfilingReports(
		type: string,
	): Promise<{ success: boolean; reports?: string[]; error?: string }> {
		this.ensureInitialized();

		try {
			const reports = await this.storage.listProfilingReports(type);

			return {
				success: true,
				reports,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Get public URL for stored content
	 */
	async getPublicUrl(
		key: string,
	): Promise<{ success: boolean; url?: string; error?: string }> {
		this.ensureInitialized();

		try {
			const url = this.storage.getPublicUrl(key);

			return {
				success: true,
				url,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Health check for API and storage
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		details: any;
	}> {
		try {
			if (!this.initialized) {
				return {
					status: "unhealthy",
					details: { error: "API not initialized" },
				};
			}

			// Test basic storage functionality
			const testConfig = await createRSSR2ConfigWithSecrets();
			const testKey = this.storage.generateFeedKey(
				"https://test.com",
				new Date().toISOString(),
			);

			return {
				status: "healthy",
				details: {
					initialized: this.initialized,
					configured: !!testConfig.accessKeyId,
					testKey,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}
}

// Singleton instance
export const rssStorageAPI = new RSSStorageAPI();
