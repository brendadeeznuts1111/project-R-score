#!/usr/bin/env bun

/**
 * @fileoverview Type Matrix CLI
 * @description CLI tool for exploring the property type matrix
 * @module utils/type-matrix-cli
 */

import { registerAllProperties } from "../properties/registrations";
import { PropertyRegistry } from "../properties/registry";
import type {
	DisplayFormat,
	PropertyCategory,
	PropertySortField,
} from "./type-matrix";
import { PropertyMatrixManager } from "./type-matrix";

/**
 * CLI interface for type matrix exploration
 */
class TypeMatrixCLI {
	private manager: PropertyMatrixManager;
	private registry: PropertyRegistry;

	constructor() {
		this.manager = new PropertyMatrixManager();
		this.registry = new PropertyRegistry();

		// Load properties from registry
		this.loadProperties();
	}

	/**
	 * Load properties from registry into matrix
	 */
	private loadProperties(): void {
		// Register all properties if not already registered
		const existing = this.registry.query({});
		if (existing.length === 0) {
			registerAllProperties(this.registry);
		}

		// Load all properties into matrix
		const allProperties = this.registry.query({});
		for (const property of allProperties) {
			this.manager.addProperty(property, {
				count: 0,
				endpoints: [],
				users: [],
			});
		}
	}

	/**
	 * Parse command line arguments
	 */
	parseArgs(args: string[]): {
		command: string;
		options: Record<string, unknown>;
	} {
		const command = args[0] || "help";
		const options: Record<string, unknown> = {};

		for (let i = 1; i < args.length; i++) {
			const arg = args[i];
			if (arg.startsWith("--")) {
				const [key, value] = arg.slice(2).split("=");
				options[key] = value || true;
			} else if (arg.startsWith("-")) {
				// Short flags
				const flag = arg.slice(1);
				options[flag] = true;
			}
		}

		return { command, options };
	}

	/**
	 * Display help
	 */
	showHelp(): void {
		console.log(`
${"=".repeat(80)}
TYPE MATRIX CLI - Property Type Matrix Explorer
${"=".repeat(80)}

Usage: bun run type-matrix <command> [options]

Commands:
  list              List all properties
  categories        Show property categories
  stats             Show matrix statistics
  type <type>       Show type matrix for data source type
  search <query>    Search properties by ID or description
  filter            Filter properties with options
  inspect <id>      Inspect a specific property

Options:
  --format <fmt>    Output format: table, json, csv, markdown, inspect
  --sort <field>    Sort by: id, namespace, version, type, category, usageCount
  --order <order>   Sort order: asc, desc
  --category <cat>  Filter by category
  --namespace <ns>  Filter by namespace
  --type <type>     Filter by property type
  --limit <n>       Limit number of results
  --offset <n>      Offset for pagination
  --color           Enable colored output (default: true)
  --compact         Compact table format
  --no-color        Disable colored output

Examples:
  bun run type-matrix list
  bun run type-matrix list --format json --sort usageCount --order desc
  bun run type-matrix type sportsbook --format table
  bun run type-matrix filter --category financial --type number
  bun run type-matrix inspect price
  bun run type-matrix stats
    `);
	}

	/**
	 * Run command
	 */
	async run(args: string[]): Promise<void> {
		const { command, options } = this.parseArgs(args);

		switch (command) {
			case "help":
			case "--help":
			case "-h":
				this.showHelp();
				break;

			case "list":
				this.listProperties(options);
				break;

			case "categories":
				this.showCategories();
				break;

			case "stats":
				this.showStats();
				break;

			case "type": {
				const type = args[1] as "sportsbook" | "exchange" | "market" | "file";
				if (!type) {
					console.error(
						"Error: Type required. Use: type <sportsbook|exchange|market|file>",
					);
					process.exit(1);
				}
				this.showTypeMatrix(type, options);
				break;
			}

			case "search": {
				const query = args[1];
				if (!query) {
					console.error("Error: Search query required");
					process.exit(1);
				}
				this.searchProperties(query, options);
				break;
			}

			case "filter":
				this.filterProperties(options);
				break;

			case "inspect": {
				const id = args[1];
				if (!id) {
					console.error("Error: Property ID required");
					process.exit(1);
				}
				this.inspectProperty(id, options);
				break;
			}

			default:
				console.error(`Unknown command: ${command}`);
				this.showHelp();
				process.exit(1);
		}
	}

	/**
	 * List properties
	 */
	private listProperties(options: Record<string, unknown>): void {
		const displayOptions = this.buildDisplayOptions(options);
		this.manager.displayProperties(displayOptions);
	}

	/**
	 * Show categories
	 */
	private showCategories(): void {
		const categories = this.manager.getCategories();
		console.log("\nProperty Categories:");
		console.log("=".repeat(80));
		categories.forEach((cat, index) => {
			console.log(`${index + 1}. ${cat}`);
		});
		console.log("=".repeat(80));
	}

	/**
	 * Show statistics
	 */
	private showStats(): void {
		const stats = this.manager.getStats();
		console.log("\n" + "=".repeat(80));
		console.log("MATRIX STATISTICS");
		console.log("=".repeat(80));
		console.log(`Total Properties: ${stats.totalProperties}`);
		console.log(`Total Namespaces: ${stats.totalNamespaces}`);
		console.log(`Total Categories: ${stats.totalCategories}`);
		console.log(`\nMost Used Properties:`);
		stats.mostUsed.forEach((entry, index) => {
			console.log(
				`  ${index + 1}. ${entry.property.id} (${entry.usage.count} uses)`,
			);
		});
		console.log(`\nLeast Used Properties:`);
		stats.leastUsed.forEach((entry, index) => {
			console.log(
				`  ${index + 1}. ${entry.property.id} (${entry.usage.count} uses)`,
			);
		});
		console.log("=".repeat(80));
	}

	/**
	 * Show type matrix
	 */
	private showTypeMatrix(
		type: "sportsbook" | "exchange" | "market" | "file",
		options: Record<string, unknown>,
	): void {
		const displayOptions = this.buildDisplayOptions(options);
		this.manager.displayTypeMatrix(type, displayOptions);
	}

	/**
	 * Search properties
	 */
	private searchProperties(
		query: string,
		options: Record<string, unknown>,
	): void {
		const entries = this.manager.getProperties();
		const results = entries.filter(
			(entry) =>
				entry.property.id.toLowerCase().includes(query.toLowerCase()) ||
				entry.property.metadata.description
					.toLowerCase()
					.includes(query.toLowerCase()),
		);

		if (results.length === 0) {
			console.log(`No properties found matching "${query}"`);
			return;
		}

		const displayOptions = this.buildDisplayOptions(options);
		this.manager.displayProperties({
			...displayOptions,
			format: "table",
		});
	}

	/**
	 * Filter properties
	 */
	private filterProperties(options: Record<string, unknown>): void {
		const displayOptions = this.buildDisplayOptions(options);
		this.manager.displayProperties(displayOptions);
	}

	/**
	 * Inspect property
	 */
	private inspectProperty(id: string, options: Record<string, unknown>): void {
		const entries = this.manager.getProperties();
		const entry = entries.find((e) => e.property.id === id);

		if (!entry) {
			console.error(`Property not found: ${id}`);
			process.exit(1);
		}

		const displayOptions = this.buildDisplayOptions({
			...options,
			format: "inspect",
		});

		console.log(`\n${"=".repeat(80)}`);
		console.log(`PROPERTY INSPECTION: ${id}`);
		console.log("=".repeat(80));
		this.manager.displayProperties({
			...displayOptions,
			format: "inspect",
		});
	}

	/**
	 * Build display options from CLI arguments
	 */
	private buildDisplayOptions(options: Record<string, unknown>): {
		format?: DisplayFormat;
		sortBy?: PropertySortField;
		sortOrder?: "asc" | "desc";
		filterCategory?: PropertyCategory | PropertyCategory[];
		filterNamespace?: string | string[];
		filterType?: "number" | "string" | "boolean" | "object" | "array";
		limit?: number;
		offset?: number;
		color?: boolean;
		compact?: boolean;
	} {
		const displayOptions: ReturnType<typeof this.buildDisplayOptions> = {};

		if (options.format) {
			displayOptions.format = options.format as DisplayFormat;
		}

		if (options.sort) {
			displayOptions.sortBy = options.sort as PropertySortField;
		}

		if (options.order) {
			displayOptions.sortOrder = options.order as "asc" | "desc";
		}

		if (options.category) {
			displayOptions.filterCategory = options.category as PropertyCategory;
		}

		if (options.namespace) {
			displayOptions.filterNamespace = options.namespace as string;
		}

		if (options.type) {
			displayOptions.filterType = options.type as
				| "number"
				| "string"
				| "boolean"
				| "object"
				| "array";
		}

		if (options.limit) {
			displayOptions.limit = parseInt(String(options.limit), 10);
		}

		if (options.offset) {
			displayOptions.offset = parseInt(String(options.offset), 10);
		}

		if (options.color === false || options["no-color"]) {
			displayOptions.color = false;
		} else {
			displayOptions.color = true;
		}

		if (options.compact) {
			displayOptions.compact = true;
		}

		return displayOptions;
	}
}

// Run CLI if executed directly
if (import.meta.main) {
	const cli = new TypeMatrixCLI();
	await cli.run(process.argv.slice(2));
}

export { TypeMatrixCLI };
