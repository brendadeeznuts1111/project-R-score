/**
 * Tests for RSS Secrets Integration
 */

import { describe, expect, it } from "bun:test";
import { RSSSecretsManager } from "../rss/rss-secrets-integration-simple.js";

describe("RSSSecretsManager", () => {
	describe("loadConfigString", () => {
		it("should load basic RSS config", async () => {
			const toml = `
[[feeds]]
name = "Test Feed"
url = "https://example.com/rss"
`;

			const manager = new RSSSecretsManager();
			const config = await manager.loadConfigString(toml);

			expect(config.feeds).toHaveLength(1);
			expect(config.feeds?.[0].name).toBe("Test Feed");
			expect(config.feeds?.[0].url).toBe("https://example.com/rss");
		});

		it("should load config with categories", async () => {
			const toml = `
[[feeds]]
name = "Tech News"
url = "https://tech.example.com/rss"
categories = ["tech", "news"]
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const feeds = manager.getFeeds();
			expect(feeds[0].categories).toEqual(["tech", "news"]);
		});

		it("should load config with API definitions", async () => {
			const toml = `
[api.newsapi]
endpoint = "https://newsapi.org/v2"
rate_limit = 100

[[feeds]]
name = "API Feed"
url = "https://api.example.com/feed"
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const api = manager.getAPI("newsapi");
			expect(api).toBeDefined();
			expect(api?.endpoint).toBe("https://newsapi.org/v2");
			expect(api?.rate_limit).toBe(100);
		});

		it("should handle empty config", async () => {
			const manager = new RSSSecretsManager();
			const config = await manager.loadConfigString("");

			expect(config.feeds).toBeUndefined();
			expect(config.api).toBeUndefined();
		});

		it("should handle multiple feeds", async () => {
			const toml = `
[[feeds]]
name = "Feed 1"
url = "https://feed1.com/rss"

[[feeds]]
name = "Feed 2"
url = "https://feed2.com/rss"

[[feeds]]
name = "Feed 3"
url = "https://feed3.com/rss"
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			expect(manager.getFeeds()).toHaveLength(3);
		});
	});

	describe("getFeedsByCategory", () => {
		it("should filter feeds by category", async () => {
			const toml = `
[[feeds]]
name = "Tech Feed"
url = "https://tech.com/rss"
categories = ["tech"]

[[feeds]]
name = "News Feed"
url = "https://news.com/rss"
categories = ["news"]

[[feeds]]
name = "Tech News Feed"
url = "https://technews.com/rss"
categories = ["tech", "news"]
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const techFeeds = manager.getFeedsByCategory("tech");
			expect(techFeeds).toHaveLength(2);
			expect(techFeeds.map((f) => f.name)).toContain("Tech Feed");
			expect(techFeeds.map((f) => f.name)).toContain("Tech News Feed");

			const newsFeeds = manager.getFeedsByCategory("news");
			expect(newsFeeds).toHaveLength(2);
		});

		it("should return empty array for unknown category", async () => {
			const manager = new RSSSecretsManager();
			await manager.loadConfigString(
				'[[feeds]]\nname = "Test"\nurl = "https://test.com"',
			);

			const feeds = manager.getFeedsByCategory("nonexistent");
			expect(feeds).toHaveLength(0);
		});
	});

	describe("getSummary", () => {
		it("should return summary of loaded config", async () => {
			const toml = `
[api.newsapi]
endpoint = "https://newsapi.org/v2"

[[feeds]]
name = "Feed 1"
url = "https://feed1.com/rss"

[[feeds]]
name = "Feed 2"
url = "https://feed2.com/rss"
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const summary = manager.getSummary();
			expect(summary.feeds).toBe(2);
			expect(summary.apis).toBe(1);
			expect(summary.profile).toBe("default");
		});

		it("should return zero for empty config", () => {
			const manager = new RSSSecretsManager();
			const summary = manager.getSummary();
			expect(summary.feeds).toBe(0);
			expect(summary.apis).toBe(0);
		});
	});

	describe("Feed configuration options", () => {
		it("should support refresh_interval", async () => {
			const toml = `
[[feeds]]
name = "Fast Feed"
url = "https://fast.com/rss"
refresh_interval = 60

[[feeds]]
name = "Slow Feed"
url = "https://slow.com/rss"
refresh_interval = 3600
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const feeds = manager.getFeeds();
			expect(feeds[0].refresh_interval).toBe(60);
			expect(feeds[1].refresh_interval).toBe(3600);
		});

		it("should support api_key_ref for authenticated feeds", async () => {
			const toml = `
[[feeds]]
name = "Private Feed"
url = "https://private.com/rss"
api_key_ref = "\${secrets:production:API_KEY}"
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml, { strict: false });

			const feed = manager.getFeeds()[0];
			// Note: The template engine resolves the secret reference
			// Since the secret doesn't exist, it becomes a placeholder
			expect(feed.api_key_ref).toContain("MISSING");
		});

		it("should support custom headers", async () => {
			const toml = `
[[feeds]]
name = "Custom Headers Feed"
url = "https://custom.com/rss"
[feeds.headers]
Authorization = "Bearer token123"
X-Custom-Header = "value"
`;

			const manager = new RSSSecretsManager();
			await manager.loadConfigString(toml);

			const feed = manager.getFeeds()[0];
			expect(feed.headers).toBeDefined();
			expect(feed.headers?.Authorization).toBe("Bearer token123");
		});
	});

	describe("Settings configuration", () => {
		it("should load global settings", async () => {
			const toml = `
[settings]
default_refresh_interval = 300
max_concurrent_fetches = 10
timeout = 60000
user_agent = "CustomBot/1.0"

[[feeds]]
name = "Test"
url = "https://test.com/rss"
`;

			const manager = new RSSSecretsManager();
			const config = await manager.loadConfigString(toml);

			expect(config.settings).toBeDefined();
			expect(config.settings?.default_refresh_interval).toBe(300);
			expect(config.settings?.max_concurrent_fetches).toBe(10);
			expect(config.settings?.timeout).toBe(60000);
			expect(config.settings?.user_agent).toBe("CustomBot/1.0");
		});
	});
});
