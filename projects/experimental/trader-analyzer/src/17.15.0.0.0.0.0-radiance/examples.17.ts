/**
 * @fileoverview Radiance v17 Examples
 * @description 17.15.0.0.0.0.0 - Comprehensive examples demonstrating Radiance v17 patterns
 * @module 17.15.0.0.0.0.0-radiance/examples.17
 *
 * **Complete examples for all Radiance v17 patterns.**
 */

import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";
import {
    buildRadianceContentType17,
    buildRadianceHeaders17,
    emitRadianceDiscovery17,
    emitRadianceFailure17,
    emitRadianceHealthChange17,
    isPropertyDefinition17,
    probeDataSourcesHealth17,
    probeMcpToolsHealth17,
    probePropertiesHealth17,
    probeSharpBooksHealth17,
    queryDataSourcesRegistry17,
    queryMcpToolsRegistry17,
    queryPropertiesRegistry17,
    querySharpBooksRegistry17,
    v17
} from "./index.17";

/**
 * Example 1: Query Properties Registry
 */
export async function exampleQueryProperties17() {
	console.log("[17.15.0] Example: Query Properties Registry");

	const props = await queryPropertiesRegistry17({
		namespace: "users",
		validationMode: "strict",
	});

	console.log(`Found ${props.length} properties`);
	props.forEach((prop) => {
		console.log(`  - ${prop.id}: ${prop.name}`);
		console.log(`    Channel: ${prop.__radianceChannel}`);
		console.log(`    Type: ${prop.__semanticType}`);
	});

	return props;
}

/**
 * Example 2: Query with Type Guards
 */
export async function exampleTypeGuards17() {
	console.log("[17.15.0] Example: Type Guards");

	const props = await queryPropertiesRegistry17();
	const sources = await queryDataSourcesRegistry17();

	// Type-safe iteration
	props.forEach((item) => {
		if (isPropertyDefinition17(item)) {
			// TypeScript knows item is PropertyDefinition
			console.log(`Property: ${item.id}, Validation: ${item.validationMode}`);
		}
	});

	return { props, sources };
}

/**
 * Example 3: Health Monitoring
 */
export async function exampleHealthMonitoring17() {
	console.log("[17.15.0] Example: Health Monitoring");

	const [propsHealth, toolsHealth, booksHealth, sourcesHealth] = await Promise.all([
		probePropertiesHealth17(),
		probeMcpToolsHealth17(),
		probeSharpBooksHealth17(),
		probeDataSourcesHealth17(),
	]);

	console.log("Registry Health Status:");
	console.log(`  Properties: ${propsHealth.status} (${propsHealth.healthy ? "✓" : "✗"})`);
	console.log(`  MCP Tools: ${toolsHealth.status} (${toolsHealth.toolCount} tools)`);
	console.log(`  Sharp Books: ${booksHealth.status} (${booksHealth.activeCount}/${booksHealth.totalCount} active)`);
	console.log(`  Data Sources: ${sourcesHealth.status} (${sourcesHealth.sourceCount} sources)`);

	// Emit events on status change
	if (propsHealth.status === "degraded") {
		emitRadianceHealthChange17("properties", "radiance-properties", false, "healthy");
	}

	return { propsHealth, toolsHealth, booksHealth, sourcesHealth };
}

/**
 * Example 4: Radiance Event Emission
 */
export async function exampleRadianceEvents17() {
	console.log("[17.15.0] Example: Radiance Events");

	// Discovery event
	emitRadianceDiscovery17(
		"properties",
		"radiance-properties",
		"new_property_added",
		{
			propertyId: "prop_user_email",
			namespace: "users",
			version: "v1.0.0",
		},
		"info",
	);

	// Health change event
	emitRadianceHealthChange17(ROUTING_REGISTRY_NAMES.MCP_TOOLS, "radiance-mcp", true, "degraded");

	// Failure event (example)
	try {
		await queryPropertiesRegistry17();
	} catch (error) {
		emitRadianceFailure17(
			"properties",
			"radiance-properties",
			error instanceof Error ? error : new Error(String(error)),
			"QUERY_FAILED",
		);
	}
}

/**
 * Example 5: Using Versioned Routes
 */
export function exampleVersionedRoutes17() {
	console.log("[17.15.0] Example: Versioned Routes");

	console.log("Registry Routes:");
	console.log(`  Properties: ${v17.registry.properties}`);
	console.log(`  MCP Tools: ${v17.registry["mcp-tools"]}`);
	console.log(`  Sharp Books: ${v17.registry["sharp-books"]}`);
	console.log(`  Data Sources: ${v17.registry["data-sources"]}`);

	console.log("\nWebSocket Routes:");
	console.log(`  Radiance: ${v17.realtime.ws}`);
	console.log(`  PubSub: ${v17.realtime.pubsub}`);
	console.log(`  Log Stream: ${v17.realtime.logStream}`);

	console.log("\nMini App Routes:");
	console.log(`  Base: ${v17.miniapp.base}`);
	console.log(`  Sportsbooks: ${v17.miniapp.sportsbooks}`);
	console.log(`  Markets: ${v17.miniapp.markets}`);

	console.log("\nHealth Routes:");
	console.log(`  Base: ${v17.health.base}`);
	console.log(`  Registry: ${v17.health.registry}`);
	console.log(`  Radiance: ${v17.health.radiance}`);

	return v17;
}

/**
 * Example 6: Building Radiance Headers
 */
export function exampleRadianceHeaders17() {
	console.log("[17.15.0] Example: Radiance Headers");

	const headers = buildRadianceHeaders17({
		version: "17.15.0",
		channel: "radiance-properties",
		registryId: "properties",
		semanticType: "PropertyDefinition",
		compression: "permessage-deflate",
		healthStatus: "healthy",
	});

	console.log("Radiance Headers:");
	Object.entries(headers).forEach(([key, value]) => {
		console.log(`  ${key}: ${value}`);
	});

	const contentType = buildRadianceContentType17("17.15", "PropertyDefinition");
	console.log(`\nContent-Type: ${contentType}`);

	return { headers, contentType };
}

/**
 * Example 7: Filtered Queries
 */
export async function exampleFilteredQueries17() {
	console.log("[17.15.0] Example: Filtered Queries");

	// Properties with namespace filter
	const userProps = await queryPropertiesRegistry17({
		namespace: "users",
		validationMode: "strict",
	});
	console.log(`User properties (strict): ${userProps.length}`);

	// Sharp books tier 1 only
	const tier1Books = await querySharpBooksRegistry17({
		tier: 1,
		status: "active",
	});
	console.log(`Tier 1 active books: ${tier1Books.length}`);

	// REST data sources with bearer auth
	const restSources = await queryDataSourcesRegistry17({
		type: "rest",
		auth: "bearer",
	});
	console.log(`REST sources (bearer auth): ${restSources.length}`);

	return { userProps, tier1Books, restSources };
}

/**
 * Example 8: Error Handling with Radiance Events
 */
export async function exampleErrorHandling17() {
	console.log("[17.15.0] Example: Error Handling");

	try {
		const props = await queryPropertiesRegistry17();
		console.log(`Successfully queried ${props.length} properties`);
		return props;
	} catch (error) {
		// Emit failure event
		emitRadianceFailure17(
			"properties",
			"radiance-properties",
			error instanceof Error ? error : new Error(String(error)),
			"QUERY_FAILED",
		);

		// Re-throw or handle
		throw error;
	}
}

/**
 * Example 9: Type-Safe Property Operations
 */
export async function exampleTypeSafeOperations17() {
	console.log("[17.15.0] Example: Type-Safe Operations");

	const props = await queryPropertiesRegistry17();

	// TypeScript knows prop is PropertyDefinition
	props.forEach((prop) => {
		if (prop.validationMode === "strict") {
			console.log(`Strict validation: ${prop.id}`);
			// Can safely use prop.schema (ZodTypeAny)
		}

		// Type-safe access to radiance metadata
		console.log(`  Channel: ${prop.__radianceChannel}`);
		console.log(`  Version: ${prop.__version}`);
		console.log(`  Category: ${prop.__category}`);
	});

	return props;
}

/**
 * Example 10: Complete Registry Query Pattern
 */
export async function exampleCompleteRegistryQuery17() {
	console.log("[17.15.0] Example: Complete Registry Query");

	const startTime = Date.now();

	try {
		// Query all registries in parallel
		const [props, tools, books, sources] = await Promise.all([
			queryPropertiesRegistry17(),
			queryMcpToolsRegistry17(),
			querySharpBooksRegistry17(),
			queryDataSourcesRegistry17(),
		]);

		const duration = Date.now() - startTime;

		// Emit discovery event
		emitRadianceDiscovery17(
			"registry-of-registries",
			"radiance-registry",
			"complete_registry_query",
			{
				properties: props.length,
				tools: tools.length,
				books: books.length,
				sources: sources.length,
				durationMs: duration,
			},
			"info",
		);

		console.log(`Queried all registries in ${duration}ms:`);
		console.log(`  Properties: ${props.length}`);
		console.log(`  MCP Tools: ${tools.length}`);
		console.log(`  Sharp Books: ${books.length}`);
		console.log(`  Data Sources: ${sources.length}`);

		return { props, tools, books, sources, duration };
	} catch (error) {
		emitRadianceFailure17(
			"registry-of-registries",
			"radiance-registry",
			error instanceof Error ? error : new Error(String(error)),
			"COMPLETE_QUERY_FAILED",
		);
		throw error;
	}
}

/**
 * Run all examples
 */
export async function runAllExamples17() {
	console.log("=".repeat(60));
	console.log("17.15.0.0.0.0.0 — Radiance v17 Examples");
	console.log("=".repeat(60));
	console.log();

	try {
		await exampleQueryProperties17();
		console.log();

		await exampleTypeGuards17();
		console.log();

		await exampleHealthMonitoring17();
		console.log();

		await exampleRadianceEvents17();
		console.log();

		exampleVersionedRoutes17();
		console.log();

		exampleRadianceHeaders17();
		console.log();

		await exampleFilteredQueries17();
		console.log();

		await exampleErrorHandling17();
		console.log();

		await exampleTypeSafeOperations17();
		console.log();

		await exampleCompleteRegistryQuery17();
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
	runAllExamples17().catch(console.error);
}
