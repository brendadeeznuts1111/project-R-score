/**
 * @fileoverview Bun Runtime Utilities MCP Tools
 * @module mcp/tools/bun-utils
 *
 * MCP tools for Bun runtime utilities:
 * - Table inspection and formatting
 * - Deep object inspection
 * - UUID generation
 * - String width calculation
 * - Integrated diagnostics
 *
 * @see 7.0.0.0.0.0.0 for Bun Runtime Utilities Integration
 */

import type { MCPTool } from "../server";
import {
	inspectMarketData,
	inspectDeep,
	inspectShadowGraph,
} from "../../runtime/diagnostics/bun-inspect-integration";
import {
	generateEventId,
	generateEventIds,
	generateCorrelatedEventId,
} from "../../runtime/diagnostics/uuid-generator";
import {
	calculateTelegramPadding,
	padStrings,
	formatTelegramTable,
	formatRipgrepOutput,
} from "../../runtime/diagnostics/string-formatter";
import { HyperBunDiagnostics } from "../../runtime/diagnostics/integrated-inspector";
import type { HyperBunUIContext } from "../../services/ui-context-rewriter";

/**
 * Create Bun runtime utilities MCP tools
 *
 * @see 7.0.0.0.0.0.0 for Bun Runtime Utilities Integration
 */
export function createBunUtilsTools(): MCPTool[] {
	return [
		{
			name: "bun-inspect-table",
			description:
				"Format tabular data using Bun.inspect.table() with column selection and colors (7.1.1.0.0.0.0)",
			inputSchema: {
				type: "object",
				properties: {
					data: {
						type: "array",
						description: "Array of objects to display as table",
					},
					columns: {
						type: "array",
						items: { type: "string" },
						description: "Optional array of column names to display",
					},
					colors: {
						type: "boolean",
						description: "Enable ANSI colors (default: true)",
						default: true,
					},
				},
				required: ["data"],
			},
			execute: async (args: { data: any; columns?: any; colors?: boolean }) => {
				try {
					// Handle various input formats from CLI
					let data: any[];
					if (Array.isArray(args.data)) {
						data = args.data;
					} else if (typeof args.data === "string") {
						try {
							data = JSON.parse(args.data);
						} catch {
							throw new Error(`Invalid data format: ${args.data}`);
						}
					} else {
						throw new Error(`Data must be an array, got: ${typeof args.data}`);
					}

					let columns: string[] | undefined;
					if (args.columns) {
						if (Array.isArray(args.columns)) {
							columns = args.columns;
						} else if (typeof args.columns === "string") {
							try {
								columns = JSON.parse(args.columns);
							} catch {
								throw new Error(`Invalid columns format: ${args.columns}`);
							}
						}
					}

					const tableOutput = inspectMarketData(data, columns, {
						colors: args.colors ?? true,
					});

					return {
						content: [
							{
								type: "text",
								text: `📊 Table Output (7.1.1.0.0.0.0)\n\n${tableOutput}`,
							},
						],
					};
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					const errorDetails =
						error instanceof Error && error.stack
							? `\n\nStack: ${error.stack}`
							: "";
					return {
						content: [
							{
								text: `❌ Error formatting table: ${errorMessage}${errorDetails}\n\nReceived args: ${JSON.stringify(args, null, 2)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-inspect-deep",
			description:
				"Perform deep inspection of nested objects/arrays using Bun.inspect() (7.1.2.0.0.0.0)",
			inputSchema: {
				type: "object",
				properties: {
					value: {
						description: "Value to inspect (object, array, Map, Set, etc.)",
					},
					depth: {
						type: "number",
						description: "Inspection depth (default: 5)",
						default: 5,
					},
					colors: {
						type: "boolean",
						description: "Enable ANSI colors (default: true)",
						default: true,
					},
				},
				required: ["value"],
			},
			execute: async (args: {
				value: any;
				depth?: number;
				colors?: boolean;
			}) => {
				try {
					const inspected = inspectDeep(args.value, {
						depth: args.depth ?? 5,
						colors: args.colors ?? true,
					});

					return {
						content: [
							{
								type: "text",
								text: `🔍 Deep Inspection (7.1.2.0.0.0.0)\n\n${inspected}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error inspecting value: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-generate-uuid",
			description:
				"Generate time-ordered UUIDv7 for event correlation (7.2.1.0.0.0.0)",
			inputSchema: {
				type: "object",
				properties: {
					count: {
						type: "number",
						description: "Number of UUIDs to generate (default: 1)",
						default: 1,
						minimum: 1,
						maximum: 1000,
					},
					correlationKey: {
						type: "string",
						description: "Optional correlation key for deterministic sharding",
					},
				},
			},
			execute: async (args: { count?: number; correlationKey?: string }) => {
				try {
					const count = args.count ?? 1;

					if (count === 1) {
						const uuid = args.correlationKey
							? generateCorrelatedEventId(args.correlationKey)
							: generateEventId();

						return {
							content: [
								{
									type: "text",
									text: `🆔 Generated UUID (7.2.1.0.0.0.0)\n\n${uuid}${args.correlationKey ? `\n\nCorrelation Key: ${args.correlationKey}` : ""}`,
								},
							],
						};
					}

					const uuids = generateEventIds(count);
					const uniqueCount = new Set(uuids).size;

					return {
						content: [
							{
								type: "text",
								text: `🆔 Generated ${count} UUIDs (7.2.1.2.0)\n\n${uuids.slice(0, 10).join("\n")}${count > 10 ? `\n... (${count - 10} more)` : ""}\n\nUnique: ${uniqueCount}/${count}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error generating UUID: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-string-width",
			description:
				"Calculate Unicode-aware display width for string formatting (7.3.1.0.0.0.0)",
			inputSchema: {
				type: "object",
				properties: {
					strings: {
						type: "array",
						items: { type: "string" },
						description: "Array of strings to calculate width for",
					},
					targetWidth: {
						type: "number",
						description: "Target width for padding (optional)",
					},
				},
				required: ["strings"],
			},
			execute: async (args: { strings: any; targetWidth?: number }) => {
				try {
					// Handle various input formats from CLI
					let strings: string[];
					if (Array.isArray(args.strings)) {
						strings = args.strings;
					} else if (typeof args.strings === "string") {
						try {
							strings = JSON.parse(args.strings);
						} catch {
							throw new Error(`Invalid strings format: ${args.strings}`);
						}
					} else {
						throw new Error(
							`Strings must be an array, got: ${typeof args.strings}`,
						);
					}

					const results = strings.map((str: string) => {
						const width = Bun.stringWidth(str);
						const padded =
							args.targetWidth !== undefined
								? calculateTelegramPadding(str, args.targetWidth)
								: undefined;

						return {
							string: str,
							width,
							padded: padded
								? `${padded} (width: ${Bun.stringWidth(padded)})`
								: undefined,
						};
					});

					const tableData = results.map((r) => ({
						String: r.string,
						Width: r.width.toString(),
						Padded: r.padded || "N/A",
					}));

					const tableOutput = Bun.inspect.table(tableData, [
						"String",
						"Width",
						"Padded",
					]);

					return {
						content: [
							{
								type: "text",
								text: `📏 String Width Analysis (7.3.1.0.0.0.0)\n\n${tableOutput}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error calculating string width: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-format-telegram-table",
			description:
				"Format multi-column Telegram table with Unicode-aware alignment (7.3.1.3.0)",
			inputSchema: {
				type: "object",
				properties: {
					rows: {
						type: "array",
						description: "Array of row objects",
					},
					columns: {
						type: "array",
						items: {
							type: "object",
							properties: {
								key: { type: "string" },
								header: { type: "string" },
							},
						},
						description: "Column definitions with key and header",
					},
				},
				required: ["rows", "columns"],
			},
			execute: async (args: { rows: any; columns: any }) => {
				try {
					// Handle JSON string input from CLI
					let rows: any[];
					if (Array.isArray(args.rows)) {
						rows = args.rows;
					} else if (typeof args.rows === "string") {
						try {
							rows = JSON.parse(args.rows);
						} catch (parseError) {
							throw new Error(
								`Failed to parse rows JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Received: ${args.rows}`,
							);
						}
					} else {
						throw new Error(
							`Rows must be an array or JSON string, got: ${typeof args.rows} (${JSON.stringify(args.rows)})`,
						);
					}

					if (!Array.isArray(rows)) {
						throw new Error(`Parsed rows is not an array: ${typeof rows}`);
					}

					let columns: { key: string; header: string }[];
					if (Array.isArray(args.columns)) {
						columns = args.columns;
					} else if (typeof args.columns === "string") {
						try {
							columns = JSON.parse(args.columns);
						} catch (parseError) {
							throw new Error(
								`Failed to parse columns JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Received: ${args.columns}`,
							);
						}
					} else {
						throw new Error(
							`Columns must be an array or JSON string, got: ${typeof args.columns} (${JSON.stringify(args.columns)})`,
						);
					}

					if (!Array.isArray(columns)) {
						throw new Error(
							`Parsed columns is not an array: ${typeof columns}`,
						);
					}

					// Validate column structure
					for (const col of columns) {
						if (!col.key || !col.header) {
							throw new Error(
								`Invalid column structure: ${JSON.stringify(col)}. Must have 'key' and 'header' properties.`,
							);
						}
					}

					const table = formatTelegramTable(rows, columns);

					return {
						content: [
							{
								type: "text",
								text: `📊 Telegram Table (7.3.1.3.0)\n\n\`\`\`\n${table}\n\`\`\``,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error formatting Telegram table: ${error instanceof Error ? error.message : String(error)}\n\nReceived args: ${JSON.stringify(args, null, 2)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-format-ripgrep-output",
			description: "Format ripgrep output with aligned file names (7.3.1.4.0)",
			inputSchema: {
				type: "object",
				properties: {
					matches: {
						type: "array",
						items: {
							type: "object",
							properties: {
								file: { type: "string" },
								line: { type: "number" },
								content: { type: "string" },
							},
						},
						description: "Array of ripgrep match results",
					},
				},
				required: ["matches"],
			},
			execute: async (args: { matches: any }) => {
				try {
					// Handle JSON string input from CLI
					let matches: { file: string; line: number; content: string }[];
					if (Array.isArray(args.matches)) {
						matches = args.matches;
					} else if (typeof args.matches === "string") {
						matches = JSON.parse(args.matches);
					} else {
						throw new Error(
							`Matches must be an array, got: ${typeof args.matches}`,
						);
					}

					const output = formatRipgrepOutput(matches);

					return {
						content: [
							{
								type: "text",
								text: `🔍 Ripgrep Output (7.3.1.4.0)\n\n${output}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error formatting ripgrep output: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-diagnostics-log",
			description:
				"Log UIContext state using integrated diagnostics (7.4.1.2.0)",
			inputSchema: {
				type: "object",
				properties: {
					context: {
						type: "object",
						description: "HyperBunUIContext object to log",
						properties: {
							apiBaseUrl: { type: "string" },
							featureFlags: { type: "object" },
							userRole: { type: "string" },
							debugMode: { type: "boolean" },
							currentTimestamp: { type: "number" },
						},
					},
					severity: {
						type: "string",
						enum: ["info", "warn", "error"],
						description: "Log severity level",
						default: "info",
					},
				},
				required: ["context"],
			},
			execute: async (args: {
				context: HyperBunUIContext;
				severity?: "info" | "warn" | "error";
			}) => {
				try {
					const diagnostics = new HyperBunDiagnostics();
					const sessionId = diagnostics.getSessionId();

					// Log context
					diagnostics.logContext(args.context, args.severity ?? "info");

					return {
						content: [
							{
								type: "text",
								text: `📋 Diagnostic Logged (7.4.1.2.0)\n\nSession ID: ${sessionId}\nSeverity: ${args.severity ?? "info"}\n\nContext logged to terminal and Telegram (if error severity).`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error logging diagnostics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "bun-inspect-shadow-graph",
			description:
				"Inspect ShadowGraph data structures with specialized formatting (7.1.2.3.0)",
			inputSchema: {
				type: "object",
				properties: {
					graph: {
						description: "ShadowGraph data structure to inspect",
					},
				},
				required: ["graph"],
			},
			execute: async (args: { graph: any }) => {
				try {
					const inspected = inspectShadowGraph(args.graph);

					return {
						content: [
							{
								type: "text",
								text: `🕸️ ShadowGraph Inspection (7.1.2.3.0)\n\n${inspected}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `❌ Error inspecting ShadowGraph: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
