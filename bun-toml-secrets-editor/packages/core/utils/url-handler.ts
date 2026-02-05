#!/usr/bin/env bun
// src/utils/url-handler.ts - URL handling utilities for RSS feeds

export interface URLMetadata {
	url: string;
	domain: string;
	path: string;
	protocol: string;
	isValid: boolean;
	feedType?: "rss" | "atom" | "json";
	lastModified?: string;
	etag?: string;
}

export interface FeedDiscoveryResult {
	url: string;
	title?: string;
	description?: string;
	feedType: "rss" | "atom" | "json";
	isValid: boolean;
	lastModified?: string;
	etag?: string;
}

export class URLHandler {
	/**
	 * Parse and validate URL
	 */
	static parseURL(url: string): URLMetadata {
		try {
			const parsed = new URL(url);

			return {
				url: parsed.href,
				domain: parsed.hostname,
				path: parsed.pathname,
				protocol: parsed.protocol,
				isValid: true,
			};
		} catch (error) {
			return {
				url,
				domain: "",
				path: "",
				protocol: "",
				isValid: false,
			};
		}
	}

	/**
	 * Check if URL is a valid RSS/Atom feed
	 */
	static async isFeedURL(url: string): Promise<FeedDiscoveryResult> {
		try {
			const response = await fetch(url, {
				method: "HEAD",
				headers: {
					"User-Agent": "RSS-Storage-API/1.0",
				},
			});

			if (!response.ok) {
				return {
					url,
					feedType: "rss",
					isValid: false,
				};
			}

			const contentType = response.headers.get("content-type") || "";
			const lastModified = response.headers.get("last-modified") || undefined;
			const etag = response.headers.get("etag") || undefined;

			// Determine feed type from content type
			let feedType: "rss" | "atom" | "json" = "rss";
			if (contentType.includes("atom")) {
				feedType = "atom";
			} else if (contentType.includes("json")) {
				feedType = "json";
			}

			// Do a quick GET to validate feed structure
			const getResponse = await fetch(url, {
				headers: {
					"User-Agent": "RSS-Storage-API/1.0",
				},
			});

			if (!getResponse.ok) {
				return {
					url,
					feedType,
					isValid: false,
				};
			}

			const content = await getResponse.text();
			const isValid = URLHandler.validateFeedContent(content, feedType);

			return {
				url,
				feedType,
				isValid,
				lastModified,
				etag,
			};
		} catch (error) {
			return {
				url,
				feedType: "rss",
				isValid: false,
			};
		}
	}

	/**
	 * Discover RSS feeds from a website URL
	 */
	static async discoverFeeds(
		websiteURL: string,
	): Promise<FeedDiscoveryResult[]> {
		const results: FeedDiscoveryResult[] = [];

		try {
			const response = await fetch(websiteURL, {
				headers: {
					"User-Agent": "RSS-Storage-API/1.0",
				},
			});

			if (!response.ok) {
				return results;
			}

			const html = await response.text();
			const feedURLs = URLHandler.extractFeedURLs(html, websiteURL);

			// Validate each discovered feed
			for (const feedURL of feedURLs) {
				const validation = await URLHandler.isFeedURL(feedURL);
				results.push(validation);
			}
		} catch (error) {
			console.error("Error discovering feeds:", error);
		}

		return results;
	}

	/**
	 * Extract feed URLs from HTML content
	 */
	private static extractFeedURLs(html: string, baseURL: string): string[] {
		const feedURLs: string[] = [];
		const base = new URL(baseURL);

		// RSS link tags
		const rssLinkRegex =
			/<link[^>]+rel=["'](?:alternate|alternate\s+type=["']application\/rss\+xml["']|application\/rss\+xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
		const atomLinkRegex =
			/<link[^>]+rel=["'](?:alternate|alternate\s+type=["']application\/atom\+xml["']|application\/atom\+xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
		const jsonLinkRegex =
			/<link[^>]+rel=["'](?:alternate|alternate\s+type=["']application\/json["']|application\/json)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;

		const extractMatches = (regex: RegExp, urls: string[]) => {
			let match;
			while ((match = regex.exec(html)) !== null) {
				const href = match[1];
				try {
					const absoluteURL = new URL(href, base).href;
					if (!urls.includes(absoluteURL)) {
						urls.push(absoluteURL);
					}
				} catch {
					// Invalid URL, skip
				}
			}
		};

		extractMatches(rssLinkRegex, feedURLs);
		extractMatches(atomLinkRegex, feedURLs);
		extractMatches(jsonLinkRegex, feedURLs);

		// Also check for common feed paths
		const commonPaths = [
			"/feed",
			"/rss",
			"/rss.xml",
			"/atom.xml",
			"/feed.xml",
			"/api/rss",
			"/api/feed",
		];

		for (const path of commonPaths) {
			try {
				const feedURL = new URL(path, base).href;
				if (!feedURLs.includes(feedURL)) {
					feedURLs.push(feedURL);
				}
			} catch {
				// Invalid URL, skip
			}
		}

		return feedURLs;
	}

	/**
	 * Validate feed content structure
	 */
	private static validateFeedContent(
		content: string,
		feedType: "rss" | "atom" | "json",
	): boolean {
		const trimmed = content.trim().toLowerCase();

		switch (feedType) {
			case "rss":
				return trimmed.includes("<rss") || trimmed.includes("<channel");
			case "atom":
				return (
					trimmed.includes("<feed") ||
					trimmed.includes('xmlns="http://www.w3.org/2005/atom"')
				);
			case "json":
				try {
					const parsed = JSON.parse(content);
					return (
						parsed.version === "https://jsonfeed.org/version/1.1" ||
						parsed.version === "https://jsonfeed.org/version/1" ||
						Array.isArray(parsed.items) ||
						Array.isArray(parsed.articles)
					);
				} catch {
					return false;
				}
			default:
				return false;
		}
	}

	/**
	 * Normalize URL format
	 */
	static normalizeURL(url: string): string {
		try {
			const parsed = new URL(url);

			// Ensure protocol is present
			if (!parsed.protocol) {
				url = `https://${url}`;
				parsed.href = url;
			}

			// Remove trailing slash for consistency (except for root)
			if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
				parsed.pathname = parsed.pathname.slice(0, -1);
			}

			// Convert to lowercase protocol and hostname
			return `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}${parsed.pathname}${parsed.search}${parsed.hash}`;
		} catch {
			// If URL parsing fails, return as-is
			return url;
		}
	}

	/**
	 * Generate cache key for URL
	 */
	static generateCacheKey(url: string): string {
		const normalized = URLHandler.normalizeURL(url);
		return Buffer.from(normalized)
			.toString("base64")
			.replace(/[+/=]/g, "")
			.substring(0, 32);
	}

	/**
	 * Extract domain from URL
	 */
	static extractDomain(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.hostname.toLowerCase();
		} catch {
			return "";
		}
	}

	/**
	 * Check if URL is from same domain
	 */
	static isSameDomain(url1: string, url2: string): boolean {
		const domain1 = URLHandler.extractDomain(url1);
		const domain2 = URLHandler.extractDomain(url2);
		return domain1 === domain2 && domain1 !== "";
	}

	/**
	 * Generate RSS feed URL from website URL
	 */
	static generateFeedURL(
		websiteURL: string,
		feedType: "rss" | "atom" | "json" = "rss",
	): string {
		const normalized = URLHandler.normalizeURL(websiteURL);

		const extensions = {
			rss: ".xml",
			atom: ".xml",
			json: ".json",
		};

		const paths = {
			rss: ["/feed", "/rss"],
			atom: ["/atom"],
			json: ["/feed.json", "/api/feed"],
		};

		// Try common paths first
		for (const path of paths[feedType]) {
			const candidate = normalized + path + extensions[feedType];
			// This would need to be validated asynchronously
		}

		// Default to /feed
		return normalized + "/feed" + extensions[feedType];
	}
}

export default URLHandler;
