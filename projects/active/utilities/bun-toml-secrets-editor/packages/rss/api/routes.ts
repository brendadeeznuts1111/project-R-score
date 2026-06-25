#!/usr/bin/env bun

// src/api/routes.ts - API route handlers with URL integration

import type {
	ProfilingReport,
	RSSFeedData,
} from "../storage/r2-storage-native.js";
import URLHandler from "../utils/url-handler.js";
import { rssStorageAPI } from "./rss-storage-api.js";

export class APIRoutes {
	/**
	 * Handle RSS feed discovery
	 */
	static async discoverFeeds(url: string): Promise<Response> {
		if (!url) {
			return Response.json(
				{ error: "Missing 'url' parameter" },
				{ status: 400 },
			);
		}

		try {
			const feeds = await URLHandler.discoverFeeds(url);

			return Response.json({
				success: true,
				sourceUrl: url,
				feeds: feeds.filter((feed) => feed.isValid),
				totalDiscovered: feeds.length,
				validFeeds: feeds.filter((feed) => feed.isValid).length,
			});
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}

	/**
	 * Handle feed validation
	 */
	static async validateFeed(url: string): Promise<Response> {
		if (!url) {
			return Response.json(
				{ error: "Missing 'url' parameter" },
				{ status: 400 },
			);
		}

		try {
			const validation = await URLHandler.isFeedURL(url);

			return Response.json({
				success: true,
				validation,
			});
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}

	/**
	 * Handle enhanced RSS feed storage with URL validation
	 */
	static async storeFeedWithValidation(
		feedData: RSSFeedData,
	): Promise<Response> {
		try {
			// Validate URL first
			const urlMeta = URLHandler.parseURL(feedData.url);
			if (!urlMeta.isValid) {
				return Response.json(
					{
						success: false,
						error: "Invalid feed URL",
						details: urlMeta,
					},
					{ status: 400 },
				);
			}

			// Validate feed content
			const validation = await URLHandler.isFeedURL(feedData.url);
			if (!validation.isValid) {
				return Response.json(
					{
						success: false,
						error: "URL does not point to a valid RSS/Atom feed",
						validation,
					},
					{ status: 400 },
				);
			}

			// Store the feed
			const result = await rssStorageAPI.storeRSSFeed(feedData);

			return Response.json(
				{
					...result,
					urlMetadata: urlMeta,
					feedValidation: validation,
				},
				{
					status: result.success ? 201 : 400,
				},
			);
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}

	/**
	 * Handle batch feed operations
	 */
	static async batchStoreFeeds(feeds: RSSFeedData[]): Promise<Response> {
		if (!Array.isArray(feeds) || feeds.length === 0) {
			return Response.json(
				{ error: "Invalid or empty feeds array" },
				{ status: 400 },
			);
		}

		const results = [];
		let successCount = 0;
		let errorCount = 0;

		for (const feedData of feeds) {
			try {
				const result = await APIRoutes.storeFeedWithValidation(feedData);
				const resultData = await result.json();

				results.push({
					url: feedData.url,
					success: resultData.success,
					key: resultData.key,
					error: resultData.error,
				});

				if (resultData.success) {
					successCount++;
				} else {
					errorCount++;
				}
			} catch (error) {
				results.push({
					url: feedData.url,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				errorCount++;
			}
		}

		return Response.json(
			{
				success: errorCount === 0,
				summary: {
					total: feeds.length,
					successful: successCount,
					failed: errorCount,
					successRate: ((successCount / feeds.length) * 100).toFixed(2) + "%",
				},
				results,
			},
			{
				status: errorCount === 0 ? 201 : 207, // 207 Multi-Status for partial success
			},
		);
	}

	/**
	 * Handle feed analytics
	 */
	static async getFeedAnalytics(
		url: string,
		days: number = 7,
	): Promise<Response> {
		if (!url) {
			return Response.json(
				{ error: "Missing 'url' parameter" },
				{ status: 400 },
			);
		}

		try {
			// Get available feeds for the URL
			const feedsResult = await rssStorageAPI.listRSSFeeds(url);
			if (!feedsResult.success || !feedsResult.feeds) {
				return Response.json(
					{
						success: false,
						error: "No feeds found for URL",
						url,
					},
					{ status: 404 },
				);
			}

			// Analyze feed patterns
			const analytics = {
				url,
				totalFeeds: feedsResult.feeds.length,
				dateRange: {
					days,
					startDate: new Date(
						Date.now() - days * 24 * 60 * 60 * 1000,
					).toISOString(),
					endDate: new Date().toISOString(),
				},
				feeds: feedsResult.feeds,
				urlMetadata: URLHandler.parseURL(url),
				cacheKey: URLHandler.generateCacheKey(url),
			};

			return Response.json({
				success: true,
				analytics,
			});
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}

	/**
	 * Handle URL normalization and metadata
	 */
	static async getURLMetadata(url: string): Promise<Response> {
		if (!url) {
			return Response.json(
				{ error: "Missing 'url' parameter" },
				{ status: 400 },
			);
		}

		try {
			const metadata = URLHandler.parseURL(url);
			const normalized = URLHandler.normalizeURL(url);
			const domain = URLHandler.extractDomain(url);
			const cacheKey = URLHandler.generateCacheKey(url);

			return Response.json({
				success: true,
				url: {
					original: url,
					normalized,
					metadata,
					domain,
					cacheKey,
				},
			});
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}

	/**
	 * Handle feed URL suggestions
	 */
	static async suggestFeedURLs(websiteURL: string): Promise<Response> {
		if (!websiteURL) {
			return Response.json(
				{ error: "Missing 'url' parameter" },
				{ status: 400 },
			);
		}

		try {
			const suggestions = [];

			// Discover actual feeds
			const discovered = await URLHandler.discoverFeeds(websiteURL);
			suggestions.push(...discovered);

			// Generate common feed URLs if no feeds found
			if (discovered.length === 0) {
				const feedTypes: ("rss" | "atom" | "json")[] = ["rss", "atom", "json"];

				for (const type of feedTypes) {
					const suggestedURL = URLHandler.generateFeedURL(websiteURL, type);
					suggestions.push({
						url: suggestedURL,
						feedType: type,
						isValid: false,
						source: "generated",
					});
				}
			}

			return Response.json({
				success: true,
				websiteURL,
				suggestions,
				totalSuggestions: suggestions.length,
				validSuggestions: suggestions.filter((s) => s.isValid).length,
			});
		} catch (error) {
			return Response.json(
				{
					success: false,
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 },
			);
		}
	}
}

export default APIRoutes;
