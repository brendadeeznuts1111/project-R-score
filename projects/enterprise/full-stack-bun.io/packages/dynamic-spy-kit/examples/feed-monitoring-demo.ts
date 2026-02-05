/**
 * @dynamic-spy/kit v9.0 - Feed Monitoring Demo
 * 
 * Demonstrates practical use cases for Bun 1.3 enhanced socket information
 */

import { loadEnhancedFeedPatterns } from "../src/utils/feed-registry-loader";
import { monitorConnections } from "../src/utils/feed-connection-monitor";
import { FeedHealthChecker } from "../src/utils/feed-health-checker";
import { FeedConnectionPool } from "../src/utils/feed-connection-pool";
import { diagnoseFeedIssues, formatDiagnostics } from "../src/utils/feed-diagnostics";

async function demoConnectionMonitoring() {
	console.log("=".repeat(60));
	console.log("1. Connection Monitoring & Debugging");
	console.log("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const connections = await monitorConnections(feeds.slice(0, 3)); // Test first 3
	
	console.log(`\n✅ Monitored ${connections.length} connections\n`);
	
	// Clean up
	connections.forEach(conn => conn.socket.end());
}

async function demoHealthCheck() {
	console.log("\n" + "=".repeat(60));
	console.log("2. Load Balancing/Health Check");
	console.log("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const checker = new FeedHealthChecker(feeds.slice(0, 3));
	
	const results = await checker.checkAll(5000);
	
	console.log("\n📊 Health Check Results:");
	results.forEach(result => {
		if (result.status === 'healthy') {
			console.log(`  ✅ ${result.feedId}: ${result.latency} - ${result.remoteEndpoint} (${result.family})`);
		} else {
			console.log(`  ❌ ${result.feedId}: ${result.error}`);
		}
	});
	
	const healthy = checker.getHealthyFeeds(results);
	const unhealthy = checker.getUnhealthyFeeds(results);
	
	console.log(`\n📈 Summary: ${healthy.length} healthy, ${unhealthy.length} unhealthy`);
}

async function demoConnectionPool() {
	console.log("\n" + "=".repeat(60));
	console.log("3. Connection Pool with Detailed Metrics");
	console.log("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const pool = new FeedConnectionPool(feeds, 3);
	
	const feedId = feeds[0].id;
	
	try {
		// Get connections
		const conn1 = await pool.getConnection(feedId);
		console.log(`\n✅ Connection 1: ${conn1.localInfo} → ${conn1.remoteInfo}`);
		
		const conn2 = await pool.getConnection(feedId);
		console.log(`✅ Connection 2: ${conn2.localInfo} → ${conn2.remoteInfo}`);
		
		// Release connections
		pool.releaseConnection(conn1);
		pool.releaseConnection(conn2);
		
		// Get pool stats
		const stats = pool.getPoolStats(feedId);
		console.log(`\n📊 Pool Stats for ${feedId}:`);
		console.log(`  Active: ${stats.active}`);
		console.log(`  Available: ${stats.available}`);
		console.log(`  Max: ${stats.maxConnections}`);
		
		// Clean up
		pool.closeAll();
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
		pool.closeAll();
	}
}

async function demoDiagnostics() {
	console.log("\n" + "=".repeat(60));
	console.log("4. Real-time Feed Diagnostics");
	console.log("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const issues = await diagnoseFeedIssues(feeds.slice(0, 3));
	
	console.log(formatDiagnostics(issues));
}

async function main() {
	console.log("\n🔌 Feed Monitoring - Bun 1.3 Enhanced Socket Information\n");
	
	try {
		await demoConnectionMonitoring();
		await demoHealthCheck();
		await demoConnectionPool();
		await demoDiagnostics();
		
		console.log("\n" + "=".repeat(60));
		console.log("✅ All demos completed!");
		console.log("=".repeat(60) + "\n");
	} catch (error) {
		console.error("❌ Demo failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}



