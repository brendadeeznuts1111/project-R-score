import { getLogger, isInternalIP, SecurityError } from "@bun-toml/core";
import { RSSFetcher } from "./rss-fetcher";

export interface RSSFeedMonitorOptions {
	maxFeeds: number;
	maxItemsPerFeed: number;
	defaultInterval: number;
	userAgent: string;
}

export interface RSSFeedMetadata {
	title?: string;
	category?: string;
	priority?: "high" | "medium" | "low";
	interval?: number;
}

export interface RSSFeed {
	id: string;
	url: string;
	metadata: RSSFeedMetadata;
	lastFetch?: Date;
	nextFetch?: Date;
	items: RSSFeedItem[];
	errorCount: number;
}

export interface RSSFeedItem {
	title: string;
	link: string;
	description?: string;
	pubDate?: Date;
	guid?: string;
}

export class RSSFeedMonitor {
	private feeds: Map<string, RSSFeed> = new Map();
	private fetcher: RSSFetcher;
	private logger = getLogger();
	private intervalId?: Timer;

	constructor(private options: RSSFeedMonitorOptions) {
		this.fetcher = new RSSFetcher();
		this.logger.info("RSSFeedMonitor initialized", {
			maxFeeds: options.maxFeeds,
			defaultInterval: options.defaultInterval,
		});
	}

	addFeed(url: string, metadata: RSSFeedMetadata = {}): string {
		// Security check
		if (isInternalIP(url)) {
			throw new SecurityError(`SSRF blocked: ${url}`);
		}

		// Check max feeds limit
		if (this.feeds.size >= this.options.maxFeeds) {
			throw new Error(
				`Maximum number of feeds (${this.options.maxFeeds}) reached`,
			);
		}

		const id = this.generateId();
		const feed: RSSFeed = {
			id,
			url,
			metadata: {
				title: metadata.title || "Untitled Feed",
				category: metadata.category || "general",
				priority: metadata.priority || "medium",
				interval: metadata.interval || this.options.defaultInterval,
			},
			items: [],
			errorCount: 0,
		};

		this.feeds.set(id, feed);
		this.logger.info("Feed added", { id, url, title: feed.metadata.title });

		return id;
	}

	removeFeed(id: string): boolean {
		const existed = this.feeds.has(id);
		if (existed) {
			this.feeds.delete(id);
			this.logger.info("Feed removed", { id });
		}
		return existed;
	}

	getFeed(id: string): RSSFeed | undefined {
		return this.feeds.get(id);
	}

	getAllFeeds(): RSSFeed[] {
		return Array.from(this.feeds.values());
	}

	async fetchFeed(id: string): Promise<RSSFeedItem[]> {
		const feed = this.feeds.get(id);
		if (!feed) {
			throw new Error(`Feed not found: ${id}`);
		}

		try {
			const content = await this.fetcher.fetch(feed.url, {
				userAgent: this.options.userAgent,
			});

			const items = this.parseRSS(content);
			feed.items = items.slice(0, this.options.maxItemsPerFeed);
			feed.lastFetch = new Date();
			feed.nextFetch = new Date(
				Date.now() +
					(feed.metadata.interval || this.options.defaultInterval) * 1000,
			);
			feed.errorCount = 0;

			this.logger.info("Feed fetched successfully", {
				id,
				url: feed.url,
				items: feed.items.length,
			});

			return feed.items;
		} catch (error) {
			feed.errorCount++;
			this.logger.error("Feed fetch failed", {
				id,
				url: feed.url,
				errorCount: feed.errorCount,
				error,
			});
			throw error;
		}
	}

	async fetchAllFeeds(): Promise<Map<string, RSSFeedItem[]>> {
		const results = new Map<string, RSSFeedItem[]>();

		for (const [id, _feed] of this.feeds) {
			try {
				const items = await this.fetchFeed(id);
				results.set(id, items);
			} catch (_error) {
				results.set(id, []);
			}
		}

		return results;
	}

	startMonitoring(): void {
		if (this.intervalId) {
			return;
		}

		this.intervalId = setInterval(async () => {
			for (const [id, feed] of this.feeds) {
				if (!feed.nextFetch || Date.now() >= feed.nextFetch.getTime()) {
					try {
						await this.fetchFeed(id);
					} catch (_error) {
						// Error already logged in fetchFeed
					}
				}
			}
		}, 5000); // Check every 5 seconds

		this.logger.info("Feed monitoring started");
	}

	stopMonitoring(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
			this.logger.info("Feed monitoring stopped");
		}
	}

	getStats(): {
		totalFeeds: number;
		totalItems: number;
		errorFeeds: number;
	} {
		let totalItems = 0;
		let errorFeeds = 0;

		for (const feed of this.feeds.values()) {
			totalItems += feed.items.length;
			if (feed.errorCount > 0) {
				errorFeeds++;
			}
		}

		return {
			totalFeeds: this.feeds.size,
			totalItems,
			errorFeeds,
		};
	}

	private generateId(): string {
		return `feed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private parseRSS(content: string): RSSFeedItem[] {
		const items: RSSFeedItem[] = [];

		// Simple regex-based RSS parsing
		const itemRegex = /<item>(.*?)<\/item>/gs;
		const titleRegex = /<title>(.*?)<\/title>/i;
		const linkRegex = /<link>(.*?)<\/link>/i;
		const descRegex = /<description>(.*?)<\/description>/i;
		const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/i;
		const guidRegex = /<guid>(.*?)<\/guid>/i;

		let match: RegExpExecArray | null = null;
		match = itemRegex.exec(content);
		while (match !== null) {
			const itemContent = match[1];

			const titleMatch = titleRegex.exec(itemContent);
			const linkMatch = linkRegex.exec(itemContent);
			const descMatch = descRegex.exec(itemContent);
			const pubDateMatch = pubDateRegex.exec(itemContent);
			const guidMatch = guidRegex.exec(itemContent);

			if (titleMatch && linkMatch) {
				items.push({
					title: this.unescapeXml(titleMatch[1]),
					link: this.unescapeXml(linkMatch[1]),
					description: descMatch ? this.unescapeXml(descMatch[1]) : undefined,
					pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : undefined,
					guid: guidMatch ? this.unescapeXml(guidMatch[1]) : undefined,
				});
			}
			match = itemRegex.exec(content);
		}

		return items;
	}

	private unescapeXml(str: string): string {
		return str
			.replace(/</g, "<")
			.replace(/>/g, ">")
			.replace(/&/g, "&")
			.replace(/"/g, '"')
			.replace(/'/g, "'")
			.replace(/<![CDATA[(.*?)]]>/s, "$1");
	}
}
