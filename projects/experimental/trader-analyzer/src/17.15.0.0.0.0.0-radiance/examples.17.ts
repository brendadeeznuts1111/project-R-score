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
	console.info("[17.15.0] Example: Query Properties Registry");

	const props = await queryPropertiesRegistry17({
		namespace: "users",
		validationMode: "strict",
	});

	console.info(`Found ${props.length} properties`);
	props.forEach((prop) => {
		console.info(`  - ${prop.id}: ${prop.name}`);
		console.info(`    Channel: ${prop.__radianceChannel}`);
		console.info(`    Type: ${prop.__semanticType}`);
	});

	return props;
}

/**
 * Example 2: Query with Type Guards
 */
export async function exampleTypeGuards17() {
	console.info("[17.15.0] Example: Type Guards");

	const props = await queryPropertiesRegistry17();
	const sources = await queryDataSourcesRegistry17();

	// Type-safe iteration
	props.forEach((item) => {
		if (isPropertyDefinition17(item)) {
			// TypeScript knows item is PropertyDefinition
			console.info(`Property: ${item.id}, Validation: ${item.validationMode}`);
		}
	});

	return { props, sources };
}

/**
 * Example 3: Health Monitoring
 */
export async function exampleHealthMonitoring17() {
	console.info("[17.15.0] Example: Health Monitoring");

	const [propsHealth, toolsHealth, booksHealth, sourcesHealth] = await Promise.all([
		probePropertiesHealth17(),
		probeMcpToolsHealth17(),
		probeSharpBooksHealth17(),
		probeDataSourcesHealth17(),
	]);

	console.info("Registry Health Status:");
	console.info(`  Properties: ${propsHealth.status} (${propsHealth.healthy ? "✓" : "✗"})`);
	console.info(`  MCP Tools: ${toolsHealth.status} (${toolsHealth.toolCount} tools)`);
	console.info(`  Sharp Books: ${booksHealth.status} (${booksHealth.activeCount}/${booksHealth.totalCount} active)`);
	console.info(`  Data Sources: ${sourcesHealth.status} (${sourcesHealth.sourceCount} sources)`);

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
	console.info("[17.15.0] Example: Radiance Events");

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
	console.info("[17.15.0] Example: Versioned Routes");

	console.info("Registry Routes:");
	console.info(`  Properties: ${v17.registry.properties}`);
	console.info(`  MCP Tools: ${v17.registry["mcp-tools"]}`);
	console.info(`  Sharp Books: ${v17.registry["sharp-books"]}`);
	console.info(`  Data Sources: ${v17.registry["data-sources"]}`);

	console.info("\nWebSocket Routes:");
	console.info(`  Radiance: ${v17.realtime.ws}`);
	console.info(`  PubSub: ${v17.realtime.pubsub}`);
	console.info(`  Log Stream: ${v17.realtime.logStream}`);

	console.info("\nMini App Routes:");
	console.info(`  Base: ${v17.miniapp.base}`);
	console.info(`  Sportsbooks: ${v17.miniapp.sportsbooks}`);
	console.info(`  Markets: ${v17.miniapp.markets}`);

	console.info("\nHealth Routes:");
	console.info(`  Base: ${v17.health.base}`);
	console.info(`  Registry: ${v17.health.registry}`);
	console.info(`  Radiance: ${v17.health.radiance}`);

	return v17;
}

/**
 * Example 6: Building Radiance Headers
 */
export function exampleRadianceHeaders17() {
	console.info("[17.15.0] Example: Radiance Headers");

	const headers = buildRadianceHeaders17({
		version: "17.15.0",
		channel: "radiance-properties",
		registryId: "properties",
		semanticType: "PropertyDefinition",
		compression: "permessage-deflate",
		healthStatus: "healthy",
	});

	console.info("Radiance Headers:");
	Object.entries(headers).forEach(([key, value]) => {
		console.info(`  ${key}: ${value}`);
	});

	const contentType = buildRadianceContentType17("17.15", "PropertyDefinition");
	console.info(`\nContent-Type: ${contentType}`);

	return { headers, contentType };
}

/**
 * Example 7: Filtered Queries
 */
export async function exampleFilteredQueries17() {
	console.info("[17.15.0] Example: Filtered Queries");

	// Properties with namespace filter
	const userProps = await queryPropertiesRegistry17({
		namespace: "users",
		validationMode: "strict",
	});
	console.info(`User properties (strict): ${userProps.length}`);

	// Sharp books tier 1 only
	const tier1Books = await querySharpBooksRegistry17({
		tier: 1,
		status: "active",
	});
	console.info(`Tier 1 active books: ${tier1Books.length}`);

	// REST data sources with bearer auth
	const restSources = await queryDataSourcesRegistry17({
		type: "rest",
		auth: "bearer",
	});
	console.info(`REST sources (bearer auth): ${restSources.length}`);

	return { userProps, tier1Books, restSources };
}

/**
 * Example 8: Error Handling with Radiance Events
 */
export async function exampleErrorHandling17() {
	console.info("[17.15.0] Example: Error Handling");

	try {
		const props = await queryPropertiesRegistry17();
		console.info(`Successfully queried ${props.length} properties`);
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
	console.info("[17.15.0] Example: Type-Safe Operations");

	const props = await queryPropertiesRegistry17();

	// TypeScript knows prop is PropertyDefinition
	props.forEach((prop) => {
		if (prop.validationMode === "strict") {
			console.info(`Strict validation: ${prop.id}`);
			// Can safely use prop.schema (ZodTypeAny)
		}

		// Type-safe access to radiance metadata
		console.info(`  Channel: ${prop.__radianceChannel}`);
		console.info(`  Version: ${prop.__version}`);
		console.info(`  Category: ${prop.__category}`);
	});

	return props;
}

/**
 * Example 10: Complete Registry Query Pattern
 */
export async function exampleCompleteRegistryQuery17() {
	console.info("[17.15.0] Example: Complete Registry Query");

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

		console.info(`Queried all registries in ${duration}ms:`);
		console.info(`  Properties: ${props.length}`);
		console.info(`  MCP Tools: ${tools.length}`);
		console.info(`  Sharp Books: ${books.length}`);
		console.info(`  Data Sources: ${sources.length}`);

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
	console.info("=".repeat(60));
	console.info("17.15.0.0.0.0.0 — Radiance v17 Examples");
	console.info("=".repeat(60));
	console.info();

	try {
		await exampleQueryProperties17();
		console.info();

		await exampleTypeGuards17();
		console.info();

		await exampleHealthMonitoring17();
		console.info();

		await exampleRadianceEvents17();
		console.info();

		exampleVersionedRoutes17();
		console.info();

		exampleRadianceHeaders17();
		console.info();

		await exampleFilteredQueries17();
		console.info();

		await exampleErrorHandling17();
		console.info();

		await exampleTypeSafeOperations17();
		console.info();

		await exampleCompleteRegistryQuery17();
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
	runAllExamples17().catch(console.error);
}
