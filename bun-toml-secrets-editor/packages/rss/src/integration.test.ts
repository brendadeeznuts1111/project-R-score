import { expect, test } from "bun:test";
import { RSSFeedMonitor } from "./rss-feed-monitor";
import { RSSFetcher } from "./rss-fetcher";

test("RSS Fetcher blocks internal IPs", async () => {
	const fetcher = new RSSFetcher();
	expect(async () => {
		await fetcher.fetch("http://192.168.1.1/feed");
	}).toThrow();
});

test("RSS Monitor lifecycle", () => {
	const monitor = new RSSFeedMonitor({
		maxFeeds: 5,
		maxItemsPerFeed: 10,
		defaultInterval: 30,
		userAgent: "test",
	});

	const id = monitor.addFeed("https://example.com/rss", { title: "Test" });
	expect(id).toBeTruthy();
	expect(monitor.feeds.size).toBe(1);

	monitor.removeFeed(id);
	expect(monitor.feeds.size).toBe(0);
});
