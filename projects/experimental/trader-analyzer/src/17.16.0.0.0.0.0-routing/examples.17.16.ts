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
	console.log("[17.16.0] Example: Registry Deep Path");

	const url = "https://localhost:3001/api/v17/registry/properties/v1.0.0/schema";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "registryDeep") {
		console.log(`Registry: ${match.groups.registry}`);
		console.log(`Subpath: ${match.groups["0"]}`);
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
	console.log("[17.16.0] Example: Telemetry Ingestion");

	const url = "https://localhost:3001/ingest/bookmaker/pinnacle/2025-12-07/HBMO-017";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "telemetryIngest") {
		const path = match.groups["0"] as string;
		const segments = path.split("/");
		console.log(`Bookmaker: ${segments[0]}`);
		console.log(`Date: ${segments[2]}`);
		console.log(`Error Code: ${segments[3]}`);
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
	console.log("[17.16.0] Example: Dashboard");

	const urls = [
		"https://localhost:3001/dashboard/registry",
		"https://localhost:3001/dashboard/registry/",
		"https://localhost:3001/dashboard/security/threats/live",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "dashboard") {
			console.log(`URL: ${url}`);
			console.log(`Page: ${match.groups.page}`);
		}
	});
}

/**
 * Example 4: Extract Segments as Array
 */
export function exampleExtractSegments17() {
	console.log("[17.16.0] Example: Extract Segments");

	const url = "https://localhost:3001/logs/2025/12/07/HBMO-017/debug";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "logsWildcard") {
		const segments = extractSegments17(match);
		console.log(`Segments: ${segments.join(", ")}`);
		// Output: Segments: 2025, 12, 07, HBMO-017, debug

		const allSegments = extractAllSegments17(match);
		console.log(`All Segments: ${allSegments.join(", ")}`);
		// Output: All Segments: 2025, 12, 07, HBMO-017, debug
	}

	return match;
}

/**
 * Example 5: Optional Segments
 */
export function exampleOptionalSegments17() {
	console.log("[17.16.0] Example: Optional Segments");

	const urls = [
		"https://localhost:3001/optional/edit",
		"https://localhost:3001/optional/123/delete",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "optionalSegments") {
			console.log(`URL: ${url}`);
			console.log(`ID: ${match.groups.id || "undefined"}`);
			console.log(`Action: ${match.groups.action}`);
		}
	});
}

/**
 * Example 6: Multiple Wildcards
 */
export function exampleMultipleWildcards17() {
	console.log("[17.16.0] Example: Multiple Wildcards");

	const url = "https://localhost:3001/files/alice/documents/confidential/report.pdf";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "multipleWildcards") {
		console.log(`User: ${match.groups.user}`);
		console.log(`Middle Path: ${match.groups["0"]}`);
		console.log(`Type: ${match.groups.type}`);
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
	console.log("[17.16.0] Example: WebSocket with Token");

	const url = "https://localhost:3001/ws/v17/radiance?token=eng-alpha-001";
	const match = matchRadiancePattern17(url);

	if (match && match.pattern === "wsRadiance") {
		console.log(`Token: ${match.searchGroups?.["0"]}`);
		// Output: Token: eng-alpha-001
	}

	return match;
}

/**
 * Example 8: Health Probe
 */
export function exampleHealthProbe17() {
	console.log("[17.16.0] Example: Health Probe");

	const urls = [
		"https://localhost:3001/health/v17",
		"https://localhost:3001/health/v17/properties",
	];

	urls.forEach((url) => {
		const match = matchRadiancePattern17(url);
		if (match && match.pattern === "healthProbe") {
			console.log(`URL: ${url}`);
			console.log(`Registry: ${match.groups.registry || "system"}`);
		}
	});
}

/**
 * Example 9: Pattern Metadata
 */
export function examplePatternMetadata17() {
	console.log("[17.16.0] Example: Pattern Metadata");

	const patterns: Array<keyof typeof radiancePatterns> = [
		"registryItem",
		"registryDeep",
		"dashboard",
		"telemetryIngest",
	];

	patterns.forEach((patternName) => {
		const metadata = getPatternMetadata17(patternName);
		if (metadata) {
			console.log(`\n${patternName}:`);
			console.log(`  Description: ${metadata.description}`);
			console.log(`  Example: ${metadata.example}`);
			console.log(`  Latency: ${metadata.latency}`);
			console.log(`  Type Safety: ${metadata.typeSafety}`);
		}
	});
}

/**
 * Example 10: Complete Routing Handler
 */
export async function exampleRoutingHandler17() {
	console.log("[17.16.0] Example: Complete Routing Handler");

	const requests = [
		new Request("https://localhost:3001/api/v17/registry/properties/v1.0.0/schema"),
		new Request("https://localhost:3001/ingest/bookmaker/pinnacle/2025-12-07/HBMO-017"),
		new Request("https://localhost:3001/dashboard/registry"),
		new Request("https://localhost:3001/health/v17/properties"),
	];

	for (const req of requests) {
		console.log(`\nRequest: ${req.url}`);
		const response = await handleRadianceRoute17(req);
		console.log(`Status: ${response.status}`);
		const text = await response.text();
		console.log(`Response: ${text.substring(0, 100)}...`);
	}
}

/**
 * Example 11: Performance Benchmark
 */
export function examplePerformanceBenchmark17() {
	console.log("[17.16.0] Example: Performance Benchmark");

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

	console.log(`\nPerformance Benchmark:`);
	console.log(`  Iterations: ${iterations}`);
	console.log(`  Total Time: ${duration.toFixed(2)}ms`);
	console.log(`  Avg Latency: ${avgLatency.toFixed(4)}ms`);
	console.log(`  Throughput: ${(iterations / duration * 1000).toFixed(0)} req/s`);
}

/**
 * Run all examples
 */
export async function runAllExamples17_16() {
	console.log("=".repeat(60));
	console.log("17.16.0.0.0.0.0 — URLPattern Wildcard Radiance Patterns");
	console.log("=".repeat(60));
	console.log();

	try {
		exampleRegistryDeep17();
		console.log();

		exampleTelemetryIngest17();
		console.log();

		exampleDashboard17();
		console.log();

		exampleExtractSegments17();
		console.log();

		exampleOptionalSegments17();
		console.log();

		exampleMultipleWildcards17();
		console.log();

		exampleWebSocket17();
		console.log();

		exampleHealthProbe17();
		console.log();

		examplePatternMetadata17();
		console.log();

		await exampleRoutingHandler17();
		console.log();

		examplePerformanceBenchmark17();
		console.log();

		console.log("=".repeat(60));
		console.log("All examples completed successfully!");
		console.log("=".repeat(60));
	} catch (error) {
		console.error("Example failed:", error);
		throw error;
	}
}

// Run examples if this file is executed directly
if (import.meta.main) {
	runAllExamples17_16().catch(console.error);
}
