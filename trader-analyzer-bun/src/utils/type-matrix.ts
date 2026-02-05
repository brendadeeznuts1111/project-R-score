/**
 * @fileoverview Type Matrix System
 * @description Comprehensive type/property matrix with categorization, sorting, and display utilities
 * @module utils/type-matrix
 */

import type {
	DataSource,
	DataSourceType,
	PipelineUser,
} from "../pipeline/types";
import type { PropertyDefinition } from "../properties/schema";

/**
 * Property category enumeration
 */
export type PropertyCategory =
	| "financial"
	| "temporal"
	| "identifier"
	| "metadata"
	| "analytics"
	| "correlation"
	| "arbitrage"
	| "risk"
	| "performance"
	| "system";

/**
 * Property sort order
 */
export type SortOrder = "asc" | "desc";

/**
 * Sort field for properties
 */
export type PropertySortField =
	| "id"
	| "namespace"
	| "version"
	| "type"
	| "category"
	| "createdAt"
	| "usageCount"
	| "name";

/**
 * Display format options
 */
export type DisplayFormat = "table" | "json" | "csv" | "markdown" | "inspect";

/**
 * Table display options using Bun's formatting capabilities
 */
export interface TableDisplayOptions {
	/** Format to display */
	format?: DisplayFormat;
	/** Maximum width for columns */
	maxWidth?: number;
	/** Show row numbers */
	showRowNumbers?: boolean;
	/** Column alignment */
	align?: "left" | "right" | "center";
	/** Compact mode (less spacing) */
	compact?: boolean;
	/** Color output (ANSI colors) */
	color?: boolean;
	/** Sort by field */
	sortBy?: PropertySortField;
	/** Sort order */
	sortOrder?: SortOrder;
	/** Filter by category */
	filterCategory?: PropertyCategory | PropertyCategory[];
	/** Filter by namespace */
	filterNamespace?: string | string[];
	/** Filter by type */
	filterType?: PropertyDefinition["type"] | PropertyDefinition["type"][];
	/** Limit number of results */
	limit?: number;
	/** Offset for pagination */
	offset?: number;
}

/**
 * Property matrix entry with enhanced metadata
 */
export interface PropertyMatrixEntry {
	/** Property definition */
	property: PropertyDefinition;
	/** Categorized category */
	category: PropertyCategory;
	/** Usage statistics */
	usage: {
		count: number;
		lastUsed: number | null;
		endpoints: string[];
		users: string[];
	};
	/** Performance metrics */
	performance: {
		avgAccessTime: number;
		avgValidationTime: number;
		cacheHitRate: number;
	};
	/** Relationships */
	relationships: {
		sources: string[];
		dependencies: string[];
		derivedFrom: string[];
	};
}

/**
 * Type matrix for data sources
 */
export interface TypeMatrix {
	/** Data source type */
	type: DataSourceType;
	/** Properties available for this type */
	properties: PropertyMatrixEntry[];
	/** Common patterns */
	patterns: {
		required: string[];
		optional: string[];
		derived: string[];
	};
	/** Statistics */
	stats: {
		totalProperties: number;
		categories: Record<PropertyCategory, number>;
		avgPropertiesPerSource: number;
	};
}

/**
 * Complete matrix system
 */
export interface PropertyMatrixSystem {
	/** All properties indexed by ID */
	properties: Map<string, PropertyMatrixEntry>;
	/** Properties grouped by category */
	byCategory: Map<PropertyCategory, PropertyMatrixEntry[]>;
	/** Properties grouped by namespace */
	byNamespace: Map<string, PropertyMatrixEntry[]>;
	/** Properties grouped by type */
	byType: Map<PropertyDefinition["type"], PropertyMatrixEntry[]>;
	/** Type matrices for each data source type */
	typeMatrices: Map<DataSourceType, TypeMatrix>;
	/** Statistics */
	stats: {
		totalProperties: number;
		totalNamespaces: number;
		totalCategories: number;
		mostUsed: PropertyMatrixEntry[];
		leastUsed: PropertyMatrixEntry[];
	};
}

/**
 * Property Matrix Manager
 *
 * Manages property categorization, sorting, filtering, and display
 */
export class PropertyMatrixManager {
	private matrix: PropertyMatrixSystem;

	constructor() {
		this.matrix = {
			properties: new Map(),
			byCategory: new Map(),
			byNamespace: new Map(),
			byType: new Map(),
			typeMatrices: new Map(),
			stats: {
				totalProperties: 0,
				totalNamespaces: 0,
				totalCategories: 0,
				mostUsed: [],
				leastUsed: [],
			},
		};

		// Initialize category maps
		for (const category of this.getCategories()) {
			this.matrix.byCategory.set(category, []);
		}
	}

	/**
	 * Get all property categories
	 */
	getCategories(): PropertyCategory[] {
		return [
			"financial",
			"temporal",
			"identifier",
			"metadata",
			"analytics",
			"correlation",
			"arbitrage",
			"risk",
			"performance",
			"system",
		];
	}

	/**
	 * Categorize a property based on its definition
	 * Uses keyword matching against property ID, description, and tags
	 */
	categorizeProperty(property: PropertyDefinition): PropertyCategory {
		const id = property.id.toLowerCase();
		const description = property.metadata.description.toLowerCase();
		const tags = property.metadata.tags.map((t) => t.toLowerCase());
		const searchText = `${id} ${description} ${tags.join(" ")}`;

		// Check each category using keyword matching
		const categoryKeywords: Record<PropertyCategory, string[]> = {
			financial: ["price", "cost", "fee", "amount", "volume", "odds", "spread"],
			temporal: ["time", "date", "timestamp", "duration"],
			identifier: ["id", "uuid", "key", "identifier"],
			metadata: ["source", "namespace", "tags"],
			analytics: ["analytics", "stat", "metric", "score", "derived"],
			correlation: ["correlation", "correlate"],
			arbitrage: ["arbitrage", "opportunity"],
			risk: ["risk", "volatility", "tension"],
			performance: ["performance", "latency", "throughput"],
			system: ["system"],
		};

		// Check categories in priority order
		for (const [category, keywords] of Object.entries(categoryKeywords)) {
			if (keywords.some((keyword) => searchText.includes(keyword))) {
				return category as PropertyCategory;
			}
		}

		// Also check tags explicitly
		for (const [category, keywords] of Object.entries(categoryKeywords)) {
			if (keywords.some((keyword) => tags.includes(keyword))) {
				return category as PropertyCategory;
			}
		}

		// Default to metadata
		return "metadata";
	}

	/**
	 * Add a property to the matrix
	 */
	addProperty(
		property: PropertyDefinition,
		usage?: Partial<PropertyMatrixEntry["usage"]>,
		performance?: Partial<PropertyMatrixEntry["performance"]>,
		relationships?: Partial<PropertyMatrixEntry["relationships"]>,
	): void {
		const category = this.categorizeProperty(property);

		const entry: PropertyMatrixEntry = {
			property,
			category,
			usage: {
				count: usage?.count || 0,
				lastUsed: usage?.lastUsed || null,
				endpoints: usage?.endpoints || [],
				users: usage?.users || [],
			},
			performance: {
				avgAccessTime: performance?.avgAccessTime || 0,
				avgValidationTime: performance?.avgValidationTime || 0,
				cacheHitRate: performance?.cacheHitRate || 0,
			},
			relationships: {
				sources: relationships?.sources || [],
				dependencies: relationships?.dependencies || [],
				derivedFrom: relationships?.derivedFrom || [],
			},
		};

		// Add to main map
		this.matrix.properties.set(property.id, entry);

		// Add to category map
		const categoryList = this.matrix.byCategory.get(category) || [];
		categoryList.push(entry);
		this.matrix.byCategory.set(category, categoryList);

		// Add to namespace map
		const namespaceList = this.matrix.byNamespace.get(property.namespace) || [];
		namespaceList.push(entry);
		this.matrix.byNamespace.set(property.namespace, namespaceList);

		// Add to type map
		const typeList = this.matrix.byType.get(property.type) || [];
		typeList.push(entry);
		this.matrix.byType.set(property.type, typeList);

		// Update statistics
		this.updateStats();
	}

	/**
	 * Update statistics
	 */
	private updateStats(): void {
		const entries = Array.from(this.matrix.properties.values());

		this.matrix.stats.totalProperties = entries.length;
		this.matrix.stats.totalNamespaces = this.matrix.byNamespace.size;
		this.matrix.stats.totalCategories = this.matrix.byCategory.size;

		// Sort by usage (descending)
		const sortedByUsage = [...entries].sort(
			(a, b) => b.usage.count - a.usage.count,
		);

		const TOP_N_PROPERTIES = 10;
		this.matrix.stats.mostUsed = sortedByUsage.slice(0, TOP_N_PROPERTIES);
		// Get least used (last N items, already sorted descending, so reverse to ascending)
		const leastUsed = sortedByUsage.slice(-TOP_N_PROPERTIES);
		this.matrix.stats.leastUsed = [...leastUsed].reverse();
	}

	/**
	 * Sort properties
	 */
	sortProperties(
		entries: PropertyMatrixEntry[],
		field: PropertySortField,
		order: SortOrder = "asc",
	): PropertyMatrixEntry[] {
		const sorted = [...entries].sort((a, b) => {
			let aValue: unknown;
			let bValue: unknown;

			switch (field) {
				case "id":
					aValue = a.property.id;
					bValue = b.property.id;
					break;
				case "namespace":
					aValue = a.property.namespace;
					bValue = b.property.namespace;
					break;
				case "version":
					aValue = a.property.version;
					bValue = b.property.version;
					break;
				case "type":
					aValue = a.property.type;
					bValue = b.property.type;
					break;
				case "category":
					aValue = a.category;
					bValue = b.category;
					break;
				case "createdAt":
					// Would need to track creation time
					aValue = 0;
					bValue = 0;
					break;
				case "usageCount":
					aValue = a.usage.count;
					bValue = b.usage.count;
					break;
				case "name":
					aValue = a.property.metadata.description;
					bValue = b.property.metadata.description;
					break;
			}

			// Compare values
			if (aValue < bValue) return order === "asc" ? -1 : 1;
			if (aValue > bValue) return order === "asc" ? 1 : -1;
			return 0;
		});

		return sorted;
	}

	/**
	 * Filter properties
	 */
	filterProperties(
		entries: PropertyMatrixEntry[],
		options: {
			category?: PropertyCategory | PropertyCategory[];
			namespace?: string | string[];
			type?: PropertyDefinition["type"] | PropertyDefinition["type"][];
			minUsage?: number;
			maxUsage?: number;
		},
	): PropertyMatrixEntry[] {
		return entries.filter((entry) => {
			// Category filter
			if (options.category) {
				const categories = Array.isArray(options.category)
					? options.category
					: [options.category];
				if (!categories.includes(entry.category)) return false;
			}

			// Namespace filter
			if (options.namespace) {
				const namespaces = Array.isArray(options.namespace)
					? options.namespace
					: [options.namespace];
				if (!namespaces.includes(entry.property.namespace)) return false;
			}

			// Type filter
			if (options.type) {
				const types = Array.isArray(options.type)
					? options.type
					: [options.type];
				if (!types.includes(entry.property.type)) return false;
			}

			// Usage filters
			if (options.minUsage !== undefined) {
				if (entry.usage.count < options.minUsage) return false;
			}
			if (options.maxUsage !== undefined) {
				if (entry.usage.count > options.maxUsage) return false;
			}

			return true;
		});
	}

	/**
	 * Get properties with options
	 */
	getProperties(options: TableDisplayOptions = {}): PropertyMatrixEntry[] {
		let entries = Array.from(this.matrix.properties.values());

		// Apply filters
		if (options.filterCategory) {
			entries = this.filterProperties(entries, {
				category: options.filterCategory,
			});
		}

		if (options.filterNamespace) {
			entries = this.filterProperties(entries, {
				namespace: options.filterNamespace,
			});
		}

		if (options.filterType) {
			entries = this.filterProperties(entries, {
				type: options.filterType,
			});
		}

		// Apply sorting
		if (options.sortBy) {
			entries = this.sortProperties(
				entries,
				options.sortBy,
				options.sortOrder || "asc",
			);
		}

		// Apply pagination
		if (options.offset) {
			entries = entries.slice(options.offset);
		}
		if (options.limit) {
			entries = entries.slice(0, options.limit);
		}

		return entries;
	}

	/**
	 * Display properties using Bun's native formatting
	 */
	displayProperties(options: TableDisplayOptions = {}): void {
		const entries = this.getProperties(options);

		switch (options.format || "table") {
			case "table":
				this.displayTable(entries, options);
				break;
			case "json":
				this.displayJSON(entries, options);
				break;
			case "csv":
				this.displayCSV(entries, options);
				break;
			case "markdown":
				this.displayMarkdown(entries, options);
				break;
			case "inspect":
				this.displayInspect(entries, options);
				break;
		}
	}

	/**
	 * Display as table using Bun's console formatting
	 */
	private displayTable(
		entries: PropertyMatrixEntry[],
		options: TableDisplayOptions,
	): void {
		const color = options.color !== false;
		const compact = options.compact || false;
		const showRowNumbers = options.showRowNumbers || false;

		// ANSI color codes
		const colors = {
			reset: "\x1b[0m",
			bold: "\x1b[1m",
			dim: "\x1b[2m",
			red: "\x1b[31m",
			green: "\x1b[32m",
			yellow: "\x1b[33m",
			blue: "\x1b[34m",
			magenta: "\x1b[35m",
			cyan: "\x1b[36m",
			gray: "\x1b[90m",
		};

		const c = color
			? colors
			: {
					reset: "",
					bold: "",
					dim: "",
					red: "",
					green: "",
					yellow: "",
					blue: "",
					magenta: "",
					cyan: "",
					gray: "",
				};

		// Table header
		const header = [
			showRowNumbers ? "#" : "",
			"ID",
			"Category",
			"Type",
			"Namespace",
			"Usage",
			"Description",
		]
			.filter(Boolean)
			.join(compact ? " | " : "  ");

		console.log(`${c.bold}${c.cyan}${"=".repeat(120)}${c.reset}`);
		console.log(
			`${c.bold}${c.cyan}PROPERTY MATRIX${c.reset} ${c.dim}(${entries.length} properties)${c.reset}`,
		);
		console.log(`${c.bold}${c.cyan}${"=".repeat(120)}${c.reset}`);
		console.log(`${c.bold}${header}${c.reset}`);

		// Table rows
		entries.forEach((entry, index) => {
			const row = [
				showRowNumbers ? String(index + 1) : "",
				entry.property.id,
				this.formatCategory(entry.category, c),
				entry.property.type,
				entry.property.namespace,
				String(entry.usage.count),
				entry.property.metadata.description.slice(0, 40) + "...",
			]
				.filter(Boolean)
				.join(compact ? " | " : "  ");

			console.log(row);
		});

		console.log(`${c.bold}${c.cyan}${"=".repeat(120)}${c.reset}`);
	}

	/**
	 * Format category with color
	 */
	private formatCategory(category: PropertyCategory, c: typeof colors): string {
		const categoryColors: Record<PropertyCategory, string> = {
			financial: c.green,
			temporal: c.blue,
			identifier: c.yellow,
			metadata: c.gray,
			analytics: c.magenta,
			correlation: c.cyan,
			arbitrage: c.red,
			risk: c.red,
			performance: c.yellow,
			system: c.gray,
		};

		return `${categoryColors[category]}${category}${c.reset}`;
	}

	/**
	 * Display as JSON using Bun's JSON formatting
	 */
	private displayJSON(
		entries: PropertyMatrixEntry[],
		options: TableDisplayOptions,
	): void {
		const data = entries.map((entry) => ({
			id: entry.property.id,
			category: entry.category,
			type: entry.property.type,
			namespace: entry.property.namespace,
			version: entry.property.version,
			usage: entry.usage,
			performance: entry.performance,
			relationships: entry.relationships,
			description: entry.property.metadata.description,
		}));

		console.log(JSON.stringify(data, null, 2));
	}

	/**
	 * Display as CSV
	 */
	private displayCSV(
		entries: PropertyMatrixEntry[],
		options: TableDisplayOptions,
	): void {
		// CSV header
		console.log("id,category,type,namespace,version,usage_count,description");

		// CSV rows
		entries.forEach((entry) => {
			const row = [
				entry.property.id,
				entry.category,
				entry.property.type,
				entry.property.namespace,
				entry.property.version,
				entry.usage.count,
				`"${entry.property.metadata.description.replace(/"/g, '""')}"`,
			].join(",");

			console.log(row);
		});
	}

	/**
	 * Display as Markdown table
	 */
	private displayMarkdown(
		entries: PropertyMatrixEntry[],
		options: TableDisplayOptions,
	): void {
		console.log("| ID | Category | Type | Namespace | Usage | Description |");
		console.log("|----|----------|------|-----------|-------|-------------|");

		entries.forEach((entry) => {
			const row = [
				entry.property.id,
				entry.category,
				entry.property.type,
				entry.property.namespace,
				entry.usage.count,
				entry.property.metadata.description.slice(0, 50),
			].join(" | ");

			console.log(`| ${row} |`);
		});
	}

	/**
	 * Display using Bun's inspect
	 */
	private displayInspect(
		entries: PropertyMatrixEntry[],
		options: TableDisplayOptions,
	): void {
		// Use Bun's native inspect with custom options
		const inspectOptions = {
			depth: options.compact ? 2 : 5,
			colors: options.color !== false,
			compact: options.compact || false,
			sorted: true,
		};

		entries.forEach((entry, index) => {
			console.log(`\n${"=".repeat(80)}`);
			console.log(`Property ${index + 1}: ${entry.property.id}`);
			console.log("=".repeat(80));
			console.log(Bun.inspect(entry, inspectOptions));
		});
	}

	/**
	 * Get matrix statistics
	 */
	getStats(): PropertyMatrixSystem["stats"] {
		return this.matrix.stats;
	}

	/**
	 * Get type matrix for a data source type
	 */
	getTypeMatrix(type: DataSourceType): TypeMatrix | null {
		return this.matrix.typeMatrices.get(type) || null;
	}

	/**
	 * Build type matrix for a data source type
	 */
	buildTypeMatrix(type: DataSourceType): TypeMatrix {
		const entries = Array.from(this.matrix.properties.values()).filter(
			(entry) => {
				// Filter by source type based on namespace or tags
				const namespace = entry.property.namespace.toLowerCase();
				const tags = entry.property.metadata.tags.map((t) => t.toLowerCase());

				switch (type) {
					case "sportsbook":
						return (
							namespace.includes("sports") ||
							namespace.includes("book") ||
							tags.includes("sportsbook")
						);
					case "exchange":
						return (
							namespace.includes("exchange") ||
							namespace.includes("crypto") ||
							tags.includes("exchange")
						);
					case "market":
						return (
							namespace.includes("market") ||
							namespace.includes("prediction") ||
							tags.includes("prediction")
						);
					case "file":
						return namespace.includes("file") || tags.includes("file");
					default:
						return false;
				}
			},
		);

		const categories: Record<PropertyCategory, number> = {} as Record<
			PropertyCategory,
			number
		>;
		for (const category of this.getCategories()) {
			categories[category] = 0;
		}

		entries.forEach((entry) => {
			categories[entry.category]++;
		});

		const required: string[] = [];
		const optional: string[] = [];
		const derived: string[] = [];

		entries.forEach((entry) => {
			if (entry.property.schema.required?.includes(entry.property.id)) {
				required.push(entry.property.id);
			} else {
				optional.push(entry.property.id);
			}

			if (entry.relationships.derivedFrom.length > 0) {
				derived.push(entry.property.id);
			}
		});

		const matrix: TypeMatrix = {
			type,
			properties: entries,
			patterns: {
				required,
				optional,
				derived,
			},
			stats: {
				totalProperties: entries.length,
				categories,
				avgPropertiesPerSource: entries.length,
			},
		};

		this.matrix.typeMatrices.set(type, matrix);
		return matrix;
	}

	/**
	 * Display type matrix
	 */
	displayTypeMatrix(
		type: DataSourceType,
		options: TableDisplayOptions = {},
	): void {
		const matrix = this.getTypeMatrix(type) || this.buildTypeMatrix(type);

		console.log(`\n${"=".repeat(80)}`);
		console.log(`TYPE MATRIX: ${type.toUpperCase()}`);
		console.log("=".repeat(80));
		console.log(`Total Properties: ${matrix.stats.totalProperties}`);
		console.log(`\nCategories:`);
		for (const [category, count] of Object.entries(matrix.stats.categories)) {
			if (count > 0) {
				console.log(`  ${category}: ${count}`);
			}
		}
		console.log(
			`\nRequired Properties: ${matrix.patterns.required.join(", ")}`,
		);
		console.log(`Optional Properties: ${matrix.patterns.optional.length}`);
		console.log(`Derived Properties: ${matrix.patterns.derived.length}`);

		this.displayProperties({
			...options,
			filterNamespace: matrix.properties
				.map((p) => p.property.namespace)
				.filter((v, i, a) => a.indexOf(v) === i),
		});
	}
}
