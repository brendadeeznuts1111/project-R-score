#!/usr/bin/env bun
/**
 * @fileoverview Property Registration Script
 * @description Register properties for all data sources
 * @module scripts/register-properties
 */

import { PropertyRegistry } from "../src/properties/registry";
import { PropertyMatrixManager } from "../src/utils/type-matrix";
import { registerAllProperties } from "../src/properties/registrations";

/**
 * Main registration script
 */
async function main() {
	console.info("🚀 Registering properties for all data sources...\n");

	// Initialize registry
	const registry = new PropertyRegistry();
	const matrix = new PropertyMatrixManager();

	// Register all properties
	console.info("📝 Registering properties...");
	registerAllProperties(registry);

	// Add properties to matrix
	console.info("📊 Building property matrix...");
	const allProperties = registry.query({});
	for (const property of allProperties) {
		matrix.addProperty(property, {
			count: 0,
			endpoints: [],
			users: [],
		});
	}

	// Display statistics
	console.info("\n✅ Property registration complete!\n");
	const stats = matrix.getStats();
	console.info(`Total Properties: ${stats.totalProperties}`);
	console.info(`Total Namespaces: ${stats.totalNamespaces}`);
	console.info(`Total Categories: ${stats.totalCategories}`);

	// Display by category
	console.info("\n📊 Properties by Category:");
	const categories = matrix.getCategories();
	for (const category of categories) {
		const entries = matrix.getProperties({
			filterCategory: category,
		});
		if (entries.length > 0) {
			console.info(`  ${category}: ${entries.length}`);
		}
	}

	// Display by namespace
	console.info("\n📦 Properties by Namespace:");
	const namespaces = new Set(
		allProperties.map((p) => p.namespace),
	);
	for (const namespace of namespaces) {
		const entries = matrix.getProperties({
			filterNamespace: namespace,
		});
		console.info(`  ${namespace}: ${entries.length}`);
	}

	// Display matrix
	console.info("\n📋 Property Matrix:");
	matrix.displayProperties({
		format: "table",
		sortBy: "namespace",
		sortOrder: "asc",
		color: true,
		limit: 50,
	});

	// Cleanup
	registry.close();

	console.info("\n✅ Done!");
}

// Run if executed directly
if (import.meta.main) {
	await main();
}
