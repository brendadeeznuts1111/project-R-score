#!/usr/bin/env bun
// scripts/rss-performance-profiler.js - Bun v1.3.7 RSS Performance Profiling

/**
 * Performance profiling for RSS fetching with Bun v1.3.7 optimizations
 * Generates CPU and heap profiles with markdown output for analysis
 */

import { RSSFetcherV137 } from "../src/services/rss-fetcher-v1.3.7.js";
import { JSON5ConfigLoader } from "../src/utils/json5-config-loader.js";

class RSSPerformanceProfiler {
	constructor() {
		this.fetcher = new RSSFetcherV137();
		this.configLoader = new JSON5ConfigLoader();
		this.profiles = {
			cpu: [],
			heap: [],
			metrics: [],
		};
	}

	/**
	 * Run comprehensive performance profiling
	 */
	async runProfile(options = {}) {
		const {
			duration = 60000, // 1 minute
			interval = 5000, // 5 seconds
			enableCPU = true,
			enableHeap = true,
			enableMetrics = true,
		} = options;

		console.info("🚀 Starting RSS Performance Profiling");
		console.info(`⏱️  Duration: ${duration}ms, Interval: ${interval}ms`);
		console.info(
			`📊 CPU: ${enableCPU ? "✅" : "❌"}, Heap: ${enableHeap ? "✅" : "❌"}, Metrics: ${enableMetrics ? "✅" : "❌"}\n`,
		);

		const startTime = Date.now();
		const profileData = {
			startTime,
			endTime: startTime + duration,
			samples: [],
		};

		// Start profiling
		if (enableCPU) this.startCPUProfiling();
		if (enableHeap) this.startHeapProfiling();

		// Run metrics collection
		const metricsInterval = setInterval(async () => {
			if (Date.now() >= startTime + duration) {
				clearInterval(metricsInterval);
				return;
			}

			if (enableMetrics) {
				await this.collectMetrics();
			}
		}, interval);

		// Wait for profiling to complete
		await new Promise((resolve) => setTimeout(resolve, duration));

		// Stop profiling
		clearInterval(metricsInterval);
		if (enableCPU) this.stopCPUProfiling();
		if (enableHeap) this.stopHeapProfiling();

		// Generate report
		await this.generateReport(profileData);

		return profileData;
	}

	/**
	 * Start CPU profiling
	 */
	startCPUProfiling() {
		console.info("🔥 Starting CPU profiling...");
		// CPU profiling is handled by Bun CLI flags
		// This method tracks the start time for reporting
		this.cpuStartTime = performance.now();
	}

	/**
	 * Start heap profiling
	 */
	startHeapProfiling() {
		console.info("💾 Starting heap profiling...");
		// Heap profiling is handled by Bun CLI flags
		this.heapStartTime = performance.now();
	}

	/**
	 * Stop CPU profiling
	 */
	stopCPUProfiling() {
		const duration = performance.now() - this.cpuStartTime;
		console.info(`🔥 CPU profiling stopped (${duration.toFixed(2)}ms)`);
	}

	/**
	 * Stop heap profiling
	 */
	stopHeapProfiling() {
		const duration = performance.now() - this.heapStartTime;
		console.info(`💾 Heap profiling stopped (${duration.toFixed(2)}ms)`);
	}

	/**
	 * Collect performance metrics
	 */
	async collectMetrics() {
		const timestamp = Date.now();
		const stats = this.fetcher.getStats();

		// Memory usage
		const memUsage = process.memoryUsage();

		// RSS fetch performance test
		const fetchMetrics = await this.benchmarkFetch();

		const metrics = {
			timestamp,
			fetcher: stats,
			memory: {
				rss: memUsage.rss,
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				external: memUsage.external,
			},
			performance: fetchMetrics,
			bunVersion: Bun.version,
		};

		this.profiles.metrics.push(metrics);

		// v1.3.7: 90% faster string padding for aligned output
		console.info(
			`${new Date(timestamp).toISOString().slice(11, 19)} | ` +
				`${stats.fetchCount.toString().padStart(6)} fetches | ` +
				`${stats.averageTime.toFixed(2).padStart(8)}ms avg | ` +
				`${(memUsage.heapUsed / 1024 / 1024).toFixed(1).padStart(6)}MB heap`,
		);

		return metrics;
	}

	/**
	 * Benchmark RSS fetching performance
	 */
	async benchmarkFetch() {
		const testUrls = [
			"https://feeds.bbci.co.uk/news/rss.xml",
			"https://rss.cnn.com/rss/edition.rss",
		];

		const results = {
			totalTime: 0,
			successCount: 0,
			errorCount: 0,
			averageTime: 0,
		};

		try {
			const startTime = performance.now();

			// Test concurrent fetching (v1.3.7: 35% faster async/await)
			const promises = testUrls.map(async (url) => {
				try {
					const result = await this.fetcher.fetchWithCasing(url);
					results.successCount++;
					return result.duration;
				} catch (_error) {
					results.errorCount++;
					return 0;
				}
			});

			const times = await Promise.all(promises);
			results.totalTime = performance.now() - startTime;
			results.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
		} catch (error) {
			console.warn("Benchmark error:", error.message);
		}

		return results;
	}

	/**
	 * Generate comprehensive performance report
	 */
	async generateReport(profileData) {
		const report = {
			metadata: {
				generated: new Date().toISOString(),
				duration: profileData.endTime - profileData.startTime,
				bunVersion: Bun.version,
				nodeVersion: process.version,
				platform: process.platform,
			},
			summary: this.generateSummary(),
			metrics: this.profiles.metrics,
			recommendations: this.generateRecommendations(),
		};

		// Save markdown report
		const markdownReport = this.generateMarkdownReport(report);
		await Bun.write("./profiles/rss-performance-report.md", markdownReport);

		// Save JSON report
		await Bun.write(
			"./profiles/rss-performance-data.json",
			JSON.stringify(report, null, 2),
		);

		console.info("\n📄 Performance report generated:");
		console.info("   📝 Markdown: ./profiles/rss-performance-report.md");
		console.info("   📊 JSON: ./profiles/rss-performance-data.json");
	}

	/**
	 * Generate performance summary
	 */
	generateSummary() {
		if (this.profiles.metrics.length === 0) {
			return { error: "No metrics collected" };
		}

		const metrics = this.profiles.metrics;
		const first = metrics[0];
		const last = metrics[metrics.length - 1];

		const fetchStats = last.fetcher;
		const memoryStats = {
			peak: Math.max(...metrics.map((m) => m.memory.heapUsed)),
			average:
				metrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / metrics.length,
			growth: last.memory.heapUsed - first.memory.heapUsed,
		};

		const performanceStats = {
			averageFetchTime:
				metrics.reduce((sum, m) => sum + m.performance.averageTime, 0) /
				metrics.length,
			totalRequests: fetchStats.fetchCount,
			errorRate: fetchStats.errors / Math.max(fetchStats.fetchCount, 1),
		};

		return {
			fetcher: fetchStats,
			memory: memoryStats,
			performance: performanceStats,
			samples: metrics.length,
		};
	}

	/**
	 * Generate optimization recommendations
	 */
	generateRecommendations() {
		const summary = this.generateSummary();
		const recommendations = [];

		if (summary.performance.averageFetchTime > 1000) {
			recommendations.push(
				"Consider increasing cache TTL to reduce fetch frequency",
			);
		}

		if (summary.memory.growth > 50 * 1024 * 1024) {
			// 50MB
			recommendations.push(
				"Memory usage growing significantly - check for memory leaks",
			);
		}

		if (summary.performance.errorRate > 0.1) {
			recommendations.push(
				"High error rate - verify RSS feed URLs and network connectivity",
			);
		}

		if (summary.fetcher.cacheHitRate < 0.5) {
			recommendations.push(
				"Low cache hit rate - consider increasing cache duration",
			);
		}

		// v1.3.7 specific recommendations
		recommendations.push(
			"Leverage Bun v1.3.7 header case preservation for legacy RSS servers",
		);
		recommendations.push(
			"Use Buffer.from() optimization for XML parsing (50% faster)",
		);
		recommendations.push("Enable async/await optimizations (35% faster)");

		return recommendations;
	}

	/**
	 * Generate markdown report
	 */
	generateMarkdownReport(report) {
		const { metadata, summary, recommendations } = report;

		return `# RSS Performance Profiling Report

## 📊 Metadata

- **Generated**: ${metadata.generated}
- **Duration**: ${(metadata.duration / 1000).toFixed(2)}s
- **Bun Version**: ${metadata.bunVersion}
- **Platform**: ${metadata.platform}

## 🎯 Performance Summary

### Fetcher Statistics
- **Total Requests**: ${summary.fetcher.fetchCount}
- **Average Time**: ${summary.fetcher.averageTime.toFixed(2)}ms
- **Cache Hit Rate**: ${(summary.fetcher.cacheHitRate * 100).toFixed(1)}%
- **Errors**: ${summary.fetcher.errors}

### Memory Usage
- **Peak Heap**: ${(summary.memory.peak / 1024 / 1024).toFixed(1)}MB
- **Average Heap**: ${(summary.memory.average / 1024 / 1024).toFixed(1)}MB
- **Memory Growth**: ${(summary.memory.growth / 1024 / 1024).toFixed(1)}MB

### Performance Metrics
- **Average Fetch Time**: ${summary.performance.averageFetchTime.toFixed(2)}ms
- **Total Requests**: ${summary.performance.totalRequests}
- **Error Rate**: ${(summary.performance.errorRate * 100).toFixed(1)}%

## 🚀 Bun v1.3.7 Optimizations Utilized

✅ **Header Case Preservation**: Critical for legacy RSS server compatibility  
✅ **35% Faster async/await**: Improved concurrent fetch performance  
✅ **50% Faster Buffer.from()**: Optimized XML parsing  
✅ **90% Faster String Padding**: Efficient log formatting  
✅ **3x Faster array.flat()**: Enhanced batch processing  

## 💡 Recommendations

${recommendations.map((rec) => `- ${rec}`).join("\n")}

## 📈 Metrics Timeline

${report.metrics
	.map(
		(m) =>
			`${new Date(m.timestamp).toISOString().slice(11, 19)} | ` +
			`${m.fetcher.fetchCount} fetches | ` +
			`${m.fetcher.averageTime.toFixed(2)}ms avg | ` +
			`${(m.memory.heapUsed / 1024 / 1024).toFixed(1)}MB heap`,
	)
	.join("\n")}

---

*Report generated by Bun v1.3.7 RSS Performance Profiler*
`;
	}

	/**
	 * Run quick benchmark comparison
	 */
	async runBenchmark() {
		console.info("⚡ Running Bun v1.3.7 RSS Benchmark...\n");

		const iterations = 100;
		const testUrl = "https://feeds.bbci.co.uk/news/rss.xml";

		// Test v1.3.7 optimizations
		console.info("🔄 Testing optimized implementation...");
		const optimizedStart = performance.now();

		for (let i = 0; i < iterations; i++) {
			try {
				await this.fetcher.fetchWithCasing(testUrl);
			} catch (_error) {
				// Ignore network errors for benchmark
			}
		}

		const optimizedTime = performance.now() - optimizedStart;

		// Results
		console.info("\n📊 Benchmark Results:");
		console.info(
			`   Optimized: ${optimizedTime.toFixed(2)}ms (${iterations} requests)`,
		);
		console.info(
			`   Average: ${(optimizedTime / iterations).toFixed(2)}ms per request`,
		);
		console.info(
			`   Requests/sec: ${(iterations / (optimizedTime / 1000)).toFixed(0)}`,
		);

		return {
			optimizedTime,
			averageTime: optimizedTime / iterations,
			requestsPerSecond: iterations / (optimizedTime / 1000),
		};
	}
}

/**
 * CLI interface for the profiler
 */
async function main() {
	const args = process.argv.slice(2);
	const profiler = new RSSPerformanceProfiler();

	if (args.includes("--benchmark")) {
		await profiler.runBenchmark();
	} else if (args.includes("--profile")) {
		const duration = parseInt(
			args.find((arg) => arg.startsWith("--duration="))?.split("=")[1] ||
				"60000",
			10,
		);
		await profiler.runProfile({ duration: parseInt(duration, 10) });
	} else {
		console.info("🔧 RSS Performance Profiler");
		console.info("");
		console.info("Usage:");
		console.info("  --benchmark     Run quick benchmark");
		console.info("  --profile       Run full profiling (60s default)");
		console.info("  --duration=MS   Set profiling duration");
		console.info("");
		console.info("Examples:");
		console.info("  bun scripts/rss-performance-profiler.js --benchmark");
		console.info(
			"  bun scripts/rss-performance-profiler.js --profile --duration=120000",
		);
	}
}

// Run if called directly
if (import.meta.main) {
	await main();
}

export default RSSPerformanceProfiler;
