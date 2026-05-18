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
	console.info("=".repeat(60));
	console.info("1. Connection Monitoring & Debugging");
	console.info("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const connections = await monitorConnections(feeds.slice(0, 3)); // Test first 3
	
	console.info(`\n✅ Monitored ${connections.length} connections\n`);
	
	// Clean up
	connections.forEach(conn => conn.socket.end());
}

async function demoHealthCheck() {
	console.info("\n" + "=".repeat(60));
	console.info("2. Load Balancing/Health Check");
	console.info("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const checker = new FeedHealthChecker(feeds.slice(0, 3));
	
	const results = await checker.checkAll(5000);
	
	console.info("\n📊 Health Check Results:");
	results.forEach(result => {
		if (result.status === 'healthy') {
			console.info(`  ✅ ${result.feedId}: ${result.latency} - ${result.remoteEndpoint} (${result.family})`);
		} else {
			console.info(`  ❌ ${result.feedId}: ${result.error}`);
		}
	});
	
	const healthy = checker.getHealthyFeeds(results);
	const unhealthy = checker.getUnhealthyFeeds(results);
	
	console.info(`\n📈 Summary: ${healthy.length} healthy, ${unhealthy.length} unhealthy`);
}

async function demoConnectionPool() {
	console.info("\n" + "=".repeat(60));
	console.info("3. Connection Pool with Detailed Metrics");
	console.info("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const pool = new FeedConnectionPool(feeds, 3);
	
	const feedId = feeds[0].id;
	
	try {
		// Get connections
		const conn1 = await pool.getConnection(feedId);
		console.info(`\n✅ Connection 1: ${conn1.localInfo} → ${conn1.remoteInfo}`);
		
		const conn2 = await pool.getConnection(feedId);
		console.info(`✅ Connection 2: ${conn2.localInfo} → ${conn2.remoteInfo}`);
		
		// Release connections
		pool.releaseConnection(conn1);
		pool.releaseConnection(conn2);
		
		// Get pool stats
		const stats = pool.getPoolStats(feedId);
		console.info(`\n📊 Pool Stats for ${feedId}:`);
		console.info(`  Active: ${stats.active}`);
		console.info(`  Available: ${stats.available}`);
		console.info(`  Max: ${stats.maxConnections}`);
		
		// Clean up
		pool.closeAll();
	} catch (error) {
		console.error(`Error: ${(error as Error).message}`);
		pool.closeAll();
	}
}

async function demoDiagnostics() {
	console.info("\n" + "=".repeat(60));
	console.info("4. Real-time Feed Diagnostics");
	console.info("=".repeat(60));
	
	const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const issues = await diagnoseFeedIssues(feeds.slice(0, 3));
	
	console.info(formatDiagnostics(issues));
}

async function main() {
	console.info("\n🔌 Feed Monitoring - Bun 1.3 Enhanced Socket Information\n");
	
	try {
		await demoConnectionMonitoring();
		await demoHealthCheck();
		await demoConnectionPool();
		await demoDiagnostics();
		
		console.info("\n" + "=".repeat(60));
		console.info("✅ All demos completed!");
		console.info("=".repeat(60) + "\n");
	} catch (error) {
		console.error("❌ Demo failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}



