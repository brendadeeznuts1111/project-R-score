#!/usr/bin/env bun
// rss-parser.ts — Bun.xml RSS parse (v1.3.7+ experimental) with fallback

export {};

const feedUrl = process.argv[2] || "https://bun.sh/rss.xml";

async function parseRSS() {
	try {
		const response = await fetch(feedUrl);
		const text = await response.text();

		let xml: any;

		// Try Bun.xml.parse (v1.3.7+ experimental)
		try {
			xml = (Bun as any).xml.parse(text);
			console.log(`✅ Using Bun.xml.parse (v1.3.7+ experimental)`);
		} catch (bunXmlError) {
			console.log(`⚠️  Bun.xml.parse failed, trying fallback...`);

			// Fallback to basic regex parsing
			const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
			const itemMatches = text.match(/<item>[\s\S]*?<\/item>/gi) || [];
			const pubDateMatch = itemMatches[0]?.match(/<pubDate>([^<]+)<\/pubDate>/i);

			const feed = {
				title: titleMatch?.[1] || "Unknown Feed",
				latest: {
					title: itemMatches[0]?.match(/<title>([^<]+)<\/title>/i)?.[1] || "No title",
					pubDate: pubDateMatch?.[1] || "No date",
				},
				itemCount: itemMatches.length,
				feedSize: text.length,
				method: "regex fallback",
			};

			console.log(`📰 RSS Feed Analysis`);
			console.log(`🔗 URL: ${feedUrl}`);
			console.log(`📊 Feed size: ${feed.feedSize.toLocaleString()} bytes`);
			console.log(`📝 Title: ${feed.title}`);
			console.log(`📦 Items: ${feed.itemCount}`);
			console.log(`🕐 Latest: "${feed.latest.title}"`);
			console.log(`📅 Published: ${feed.latest.pubDate}`);
			console.log(`🔧 Method: ${feed.method}`);

			return feed;
		}

		// Bun.xml.parse succeeded
		const channel = xml.rss?.channel;
		if (!channel) {
			throw new Error("Invalid RSS format: missing channel");
		}

		const latestItem = channel.item?.[0];

		const feed = {
			title: channel.title || "Unknown Feed",
			latest: {
				title: latestItem?.title || "No title",
				pubDate: latestItem?.pubDate || "No date",
			},
			itemCount: channel.item?.length || 0,
			feedSize: text.length,
			method: "Bun.xml.parse",
		};

		console.log(`📰 RSS Feed Analysis`);
		console.log(`🔗 URL: ${feedUrl}`);
		console.log(`📊 Feed size: ${feed.feedSize.toLocaleString()} bytes`);
		console.log(`📝 Title: ${feed.title}`);
		console.log(`📦 Items: ${feed.itemCount}`);
		console.log(`🕐 Latest: "${feed.latest.title}"`);
		console.log(`📅 Published: ${feed.latest.pubDate}`);
		console.log(`🔧 Method: ${feed.method}`);

		return feed;
	} catch (error: any) {
		console.error(`❌ Error fetching/parsing RSS: ${error?.message || error}`);
		process.exit(1);
	}
}

parseRSS();
