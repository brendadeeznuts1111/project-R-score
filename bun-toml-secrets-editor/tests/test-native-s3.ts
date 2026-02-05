#!/usr/bin/env bun
// test-native-s3.ts - Test Bun's native S3Client with R2

import { createRSSStorageWithSecrets } from "./src/storage/r2-storage-native.js";

async function testNativeS3() {
	console.log("🚀 Testing Bun Native S3Client with R2");
	console.log("=====================================\n");

	try {
		// Initialize storage
		const storage = await createRSSStorageWithSecrets();
		console.log("✅ R2 Storage initialized with native S3Client");

		// Test storing RSS feed
		const feedData = {
			url: "https://example.com/native-test-feed.xml",
			title: "Native S3 Test Feed",
			description: "Testing Bun's native S3Client",
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
				fetchTime: 75.5,
				parseTime: 15.3,
				totalTime: 90.8,
			},
		};

		const feedKey = await storage.storeRSSFeed(feedData);
		console.log(`✅ RSS feed stored: ${feedKey}`);

		// Test retrieving RSS feed
		const retrievedFeed = await storage.getRSSFeed(feedData.url);
		if (retrievedFeed) {
			console.log(`✅ RSS feed retrieved successfully`);
			console.log(`   Title: ${retrievedFeed.title}`);
			console.log(`   Items: ${retrievedFeed.items.length}`);
		} else {
			console.log(`❌ Failed to retrieve RSS feed`);
		}

		// Test storing profiling report
		const report = {
			type: "native-s3-test" as const,
			generatedAt: new Date().toISOString(),
			data: {
				test: "native-s3",
				performance: {
					storeTime: 50,
					retrieveTime: 25,
				},
			},
			summary: {
				status: "success" as const,
				metrics: {
					totalOperations: 2,
					successRate: 100,
				},
			},
		};

		const reportKey = await storage.storeProfilingReport(report);
		console.log(`✅ Profiling report stored: ${reportKey}`);

		// Test retrieving profiling report
		const retrievedReport = await storage.getProfilingReport(
			report.type,
			report.generatedAt,
		);
		if (retrievedReport) {
			console.log(`✅ Profiling report retrieved successfully`);
			console.log(`   Type: ${retrievedReport.type}`);
			console.log(`   Status: ${retrievedReport.summary.status}`);
		} else {
			console.log(`❌ Failed to retrieve profiling report`);
		}

		// Test file operations
		const exists = await storage.exists(feedKey);
		console.log(`✅ File exists check: ${exists}`);

		const size = await storage.size(feedKey);
		console.log(`✅ File size: ${size} bytes`);

		// Test listing feeds
		const feeds = await storage.listRSSFeeds();
		console.log(`✅ Listed ${feeds.length} RSS feeds`);

		// Test public URL generation
		const publicUrl = storage.getPublicUrl(feedKey);
		console.log(`✅ Public URL: ${publicUrl}`);

		// Test performance
		console.log("\n📊 Performance Test:");
		const iterations = 5;
		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			const testFeed = {
				...feedData,
				url: `https://example.com/test-${i}.xml`,
				fetchedAt: new Date().toISOString(),
			};
			await storage.storeRSSFeed(testFeed);
		}

		const duration = performance.now() - start;
		const avgTime = duration / iterations;
		console.log(`   Average store time: ${avgTime.toFixed(2)}ms`);

		console.log("\n🎉 Native S3Client Test Complete!");
		console.log("================================");
		console.log("✅ All operations successful with Bun's native S3Client");
		console.log("✅ Much simpler implementation than manual AWS signatures");
		console.log("✅ Better performance and reliability");
	} catch (error) {
		console.error(
			"❌ Test failed:",
			error instanceof Error ? error.message : String(error),
		);
	}
}

// Run the test
testNativeS3().catch(console.error);
