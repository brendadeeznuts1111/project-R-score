/**
 * @fileoverview URLPattern Wildcard Examples
 * @description 17.16.0.0.0.0.0 - Comprehensive examples demonstrating wildcard patterns
 * @module 17.16.0.0.0.0.0-routing/examples.17.16
 *
 * **Pro Tips for Maximum Radiance**
 */

import {
    extractAllSegments17,
    extractSegments17,
    getPatternMetadata17,
    matchRadiancePattern17,
    radiancePatterns,
} from "./17.16.1-urlpattern.wildcards";
import { handleRadianceRoute17 } from "./17.16.2-routing.handler";

/**
 * Example 1: Registry Deep Path
 */
export function exampleRegistryDeep17() {
	console.info("[17.16.0] Example: Registry Deep Path");

	const url = "https://localhost:3001/api/v17/registry/properties/v1.0.0/schema";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "registryDeep") {
		console.info(`Registry: ${match.groups.registry}`);
		console.info(`Subpath: ${match.groups["0"]}`);
		// Output:
		// Registry: properties
		// Subpath: v1.0.0/schema
	}

	return match;
}

/**
 * Example 2: Telemetry Ingestion
 */
export function exampleTelemetryIngest17() {
	console.info("[17.16.0] Example: Telemetry Ingestion");

	const url = "https://localhost:3001/ingest/bookmaker/pinnacle/2025-12-07/HBMO-017";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "telemetryIngest") {
		const path = match.groups["0"] as string;
		const segments = path.split("/");
		console.info(`Bookmaker: ${segments[0]}`);
		console.info(`Date: ${segments[2]}`);
		console.info(`Error Code: ${segments[3]}`);
		// Output:
		// Bookmaker: pinnacle
		// Date: 2025-12-07
		// Error Code: HBMO-017
	}

	return match;
}

/**
 * Example 3: Dashboard with Optional Slash
 */
export function exampleDashboard17() {
	console.info("[17.16.0] Example: Dashboard");

	const urls = [
		"https://localhost:3001/dashboard/registry",
		"https://localhost:3001/dashboard/registry/",
		"https://localhost:3001/dashboard/security/threats/live",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "dashboard") {
			console.info(`URL: ${url}`);
			console.info(`Page: ${match.groups.page}`);
		}
	});
}

/**
 * Example 4: Extract Segments as Array
 */
export function exampleExtractSegments17() {
	console.info("[17.16.0] Example: Extract Segments");

	const url = "https://localhost:3001/logs/2025/12/07/HBMO-017/debug";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "logsWildcard") {
		const segments = extractSegments17(match);
		console.info(`Segments: ${segments.join(", ")}`);
		// Output: Segments: 2025, 12, 07, HBMO-017, debug

		const allSegments = extractAllSegments17(match);
		console.info(`All Segments: ${allSegments.join(", ")}`);
		// Output: All Segments: 2025, 12, 07, HBMO-017, debug
	}

	return match;
}

/**
 * Example 5: Optional Segments
 */
export function exampleOptionalSegments17() {
	console.info("[17.16.0] Example: Optional Segments");

	const urls = [
		"https://localhost:3001/optional/edit",
		"https://localhost:3001/optional/123/delete",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "optionalSegments") {
			console.info(`URL: ${url}`);
			console.info(`ID: ${match.groups.id || "undefined"}`);
			console.info(`Action: ${match.groups.action}`);
		}
	});
}

/**
 * Example 6: Multiple Wildcards
 */
export function exampleMultipleWildcards17() {
	console.info("[17.16.0] Example: Multiple Wildcards");

	const url = "https://localhost:3001/files/alice/documents/confidential/report.pdf";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "multipleWildcards") {
		console.info(`User: ${match.groups.user}`);
		console.info(`Middle Path: ${match.groups["0"]}`);
		console.info(`Type: ${match.groups.type}`);
		// Output:
		// User: alice
		// Middle Path: documents/confidential
		// Type: report.pdf
	}

	return match;
}

/**
 * Example 7: WebSocket with Token
 */
export function exampleWebSocket17() {
	console.info("[17.16.0] Example: WebSocket with Token");

	const url = "https://localhost:3001/ws/v17/radiance?token=eng-alpha-001";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "wsRadiance") {
		console.info(`Token: ${match.searchGroups?.["0"]}`);
		// Output: Token: eng-alpha-001
	}

	return match;
}

/**
 * Example 8: Health Probe
 */
export function exampleHealthProbe17() {
	console.info("[17.16.0] Example: Health Probe");

	const urls = [
		"https://localhost:3001/health/v17",
		"https://localhost:3001/health/v17/properties",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "healthProbe") {
			console.info(`URL: ${url}`);
			console.info(`Registry: ${match.groups.registry || "system"}`);
		}
	});
}

/**
 * Example 9: Pattern Metadata
 */
export function examplePatternMetadata17() {
	console.info("[17.16.0] Example: Pattern Metadata");

	const patterns: Array<keyof typeof radiancePatterns> = [
		"registryItem",
		"registryDeep",
		"dashboard",
		"telemetryIngest",
	];

	patterns.forEach((patternName) => {
		const metadata = getPatternMetadata17(patternName);
		if (metadata) {
			console.info(`\n${patternName}:`);
			console.info(`  Description: ${metadata.description}`);
			console.info(`  Example: ${metadata.example}`);
			console.info(`  Latency: ${metadata.latency}`);
			console.info(`  Type Safety: ${metadata.typeSafety}`);
		}
	});
}

/**
 * Example 10: Complete Routing Handler
 */
export async function exampleRoutingHandler17() {
	console.info("[17.16.0] Example: Complete Routing Handler");

	const requests = [
		new Request("https://localhost:3001/api/v17/registry/properties/v1.0.0/schema"),
		new Request("https://localhost:3001/ingest/bookmaker/pinnacle/2025-12-07/HBMO-017"),
		new Request("https://localhost:3001/dashboard/registry"),
		new Request("https://localhost:3001/health/v17/properties"),
	];

	for (const req of requests) {
		console.info(`\nRequest: ${req.url}`);
		const response = await handleRadianceRoute17(req);
		console.info(`Status: ${response.status}`);
		const text = await response.text();
		console.info(`Response: ${text.substring(0, 100)}...`);
	}
}

/**
 * Example 11: Performance Benchmark
 */
export function examplePerformanceBenchmark17() {
	console.info("[17.16.0] Example: Performance Benchmark");

	const urls = [
		"https://localhost:3001/api/v17/registry/properties",
		"https://localhost:3001/api/v17/registry/properties/v1.0.0/schema",
		"https://localhost:3001/ingest/bookmaker/pinnacle/2025-12-07/HBMO-017",
		"https://localhost:3001/dashboard/registry",
		"https://localhost:3001/health/v17/properties",
	];

	const iterations = 10000;
	const start = Bun.nanoseconds();

	for (let i = 0; i < iterations; i++) {
		const url = urls[i % urls.length];
		matchRadiancePattern17(url);
	}

	const end = Bun.nanoseconds();
	const duration = (end - start) / 1_000_000; // Convert to milliseconds
	const avgLatency = duration / iterations;

	console.info(`\nPerformance Benchmark:`);
	console.info(`  Iterations: ${iterations}`);
	console.info(`  Total Time: ${duration.toFixed(2)}ms`);
	console.info(`  Avg Latency: ${avgLatency.toFixed(4)}ms`);
	console.info(`  Throughput: ${(iterations / duration * 1000).toFixed(0)} req/s`);
}

/**
 * Run all examples
 */
export async function runAllExamples17_16() {
	console.info("=".repeat(60));
	console.info("17.16.0.0.0.0.0 — URLPattern Wildcard Radiance Patterns");
	console.info("=".repeat(60));
	console.info();

	try {
		exampleRegistryDeep17();
		console.info();

		exampleTelemetryIngest17();
		console.info();

		exampleDashboard17();
		console.info();

		exampleExtractSegments17();
		console.info();

		exampleOptionalSegments17();
		console.info();

		exampleMultipleWildcards17();
		console.info();

		exampleWebSocket17();
		console.info();

		exampleHealthProbe17();
		console.info();

		examplePatternMetadata17();
		console.info();

		await exampleRoutingHandler17();
		console.info();

		examplePerformanceBenchmark17();
		console.info();

		console.info("=".repeat(60));
		console.info("All examples completed successfully!");
		console.info("=".repeat(60));
	} catch (error) {
		console.error("Example failed:", error);
		throw error;
	}
}

// Run examples if this file is executed directly
if (import.meta.main) {
	runAllExamples17_16().catch(console.error);
}
