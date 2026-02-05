#!/usr/bin/env bun
// test-api-integration.ts - Test API integration with URL handling

async function testAPIIntegration() {
	console.log("🚀 Testing RSS Storage API Integration");
	console.log("=====================================\n");

	const baseURL = "http://localhost:3001";

	// Test 1: Health Check
	console.log("1️⃣ Testing Health Check...");
	try {
		const response = await fetch(`${baseURL}/health`);
		const health = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   Health: ${health.status}`);
		console.log(
			`   ✅ Health Check: ${health.status === "healthy" ? "PASS" : "FAIL"}\n`,
		);
	} catch (error) {
		console.log(
			`   ❌ Health Check: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 2: URL Discovery
	console.log("2️⃣ Testing URL Discovery...");
	try {
		const testURL = "https://news.ycombinator.com";
		const response = await fetch(
			`${baseURL}/api/discover?url=${encodeURIComponent(testURL)}`,
		);
		const result = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   Discovered: ${result.validFeeds || 0} valid feeds`);
		console.log(`   ✅ URL Discovery: ${result.success ? "PASS" : "FAIL"}\n`);
	} catch (error) {
		console.log(
			`   ❌ URL Discovery: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 3: Feed Validation
	console.log("3️⃣ Testing Feed Validation...");
	try {
		const feedURL = "https://news.ycombinator.com/rss";
		const response = await fetch(
			`${baseURL}/api/validate?url=${encodeURIComponent(feedURL)}`,
		);
		const result = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   Feed Valid: ${result.validation?.isValid || false}`);
		console.log(`   Feed Type: ${result.validation?.feedType || "unknown"}`);
		console.log(`   ✅ Feed Validation: ${result.success ? "PASS" : "FAIL"}\n`);
	} catch (error) {
		console.log(
			`   ❌ Feed Validation: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 4: URL Metadata
	console.log("4️⃣ Testing URL Metadata...");
	try {
		const testURL = "https://example.com/rss.xml";
		const response = await fetch(
			`${baseURL}/api/metadata?url=${encodeURIComponent(testURL)}`,
		);
		const result = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   Domain: ${result.url?.domain || "unknown"}`);
		console.log(`   Cache Key: ${result.url?.cacheKey || "unknown"}`);
		console.log(`   ✅ URL Metadata: ${result.success ? "PASS" : "FAIL"}\n`);
	} catch (error) {
		console.log(
			`   ❌ URL Metadata: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 5: Feed Storage with Validation
	console.log("5️⃣ Testing Feed Storage...");
	try {
		const feedData = {
			url: "https://news.ycombinator.com/rss",
			title: "Hacker News",
			description: "Hacker News RSS Feed",
			items: [
				{
					title: "Test Article",
					link: "https://example.com/article",
					description: "Test description",
					pubDate: new Date().toISOString(),
				},
			],
			fetchedAt: new Date().toISOString(),
			profileData: {
				fetchTime: 150.5,
				parseTime: 25.3,
				totalTime: 175.8,
			},
		};

		const response = await fetch(`${baseURL}/api/feeds`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(feedData),
		});

		const result = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   Storage Success: ${result.success}`);
		console.log(`   Feed Key: ${result.key || "none"}`);
		console.log(`   ✅ Feed Storage: ${result.success ? "PASS" : "FAIL"}\n`);
	} catch (error) {
		console.log(
			`   ❌ Feed Storage: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 6: API Documentation
	console.log("6️⃣ Testing API Documentation...");
	try {
		const response = await fetch(`${baseURL}/api`);
		const docs = await response.json();
		console.log(`   Status: ${response.status}`);
		console.log(`   API Title: ${docs.title}`);
		console.log(`   Version: ${docs.version}`);
		console.log(`   Endpoints: ${Object.keys(docs.endpoints).length}`);
		console.log(`   ✅ API Documentation: ${docs.title ? "PASS" : "FAIL"}\n`);
	} catch (error) {
		console.log(
			`   ❌ API Documentation: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	// Test 7: Bun.secrets Integration
	console.log("7️⃣ Testing Bun.secrets Integration...");
	try {
		const testSecret = {
			service: "com.cloudflare.r2.rssfeedmaster",
			name: "API_TEST_SECRET",
			value: "api-test-value-" + Date.now(),
		};

		// Store secret
		await Bun.secrets.set(testSecret);

		// Retrieve secret
		const retrieved = await Bun.secrets.get({
			service: testSecret.service,
			name: testSecret.name,
		});

		console.log(`   Secret Stored: ✅`);
		console.log(
			`   Secret Retrieved: ${retrieved === testSecret.value ? "✅" : "❌"}`,
		);
		console.log(
			`   ✅ Bun.secrets: ${retrieved === testSecret.value ? "PASS" : "FAIL"}\n`,
		);

		// Cleanup
		await Bun.secrets.delete({
			service: testSecret.service,
			name: testSecret.name,
		});
	} catch (error) {
		console.log(
			`   ❌ Bun.secrets: ${error instanceof Error ? error.message : String(error)}\n`,
		);
	}

	console.log("🎉 API Integration Test Complete!");
	console.log("===============================");
}

// Run the test
testAPIIntegration().catch(console.error);
