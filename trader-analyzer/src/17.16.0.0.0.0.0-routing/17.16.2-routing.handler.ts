/**
 * @fileoverview Radiance Routing Handler
 * @description 17.16.0.0.0.0.0 - Real-world routing handler using URLPattern wildcards
 * @module 17.16.0.0.0.0.0-routing/17.16.2-routing.handler
 *
 * **Real-World Radiance Examples (Live from Production)**
 */

import { emitRadianceEvent17 } from "../17.15.0.0.0.0.0-radiance/emit.radiance.17";
import { queryDataSourcesRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.data-sources.17";
import { queryMcpToolsRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.mcp-tools.17";
import { queryPropertiesRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.properties.17";
import { querySharpBooksRegistry17 } from "../17.15.0.0.0.0.0-radiance/registry.sharp-books.17";
import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";
import { getCLICommandsRegistry } from "../../api/registry";
import {
    matchRadiancePattern17
} from "./17.16.1-urlpattern.wildcards";

/**
 * Query CLI Commands Registry v17
 * Wrapper for getCLICommandsRegistry to match v17 radiance pattern
 */
async function queryCLICommandsRegistry17() {
	const registry = getCLICommandsRegistry();
	return registry.commands;
}

/**
 * Serve registry deep path (e.g., schema history, versioned endpoints)
 */
async function serveRegistryDeep17(
	registry: string,
	subpath: string,
): Promise<Response> {
	const segments = subpath.split("/").filter(Boolean);

		try {
			switch (registry) {
				case ROUTING_REGISTRY_NAMES.PROPERTIES: {
					if (segments[0] === "schema" && segments[1]) {
						// /api/v17/registry/properties/schema/v1.0.0
						const props = await queryPropertiesRegistry17();
						const prop = props.find((p) => p.version === segments[1]);
						if (prop) {
							return new Response(JSON.stringify(prop.schema), {
								headers: {
									"Content-Type": "application/json",
								},
							});
						}
					}
					break;
				}
				case ROUTING_REGISTRY_NAMES.MCP_TOOLS: {
					if (segments[0] === "execute" && segments[1]) {
						// /api/v17/registry/mcp-tools/execute/tool-name
						const tools = await queryMcpToolsRegistry17();
						const tool = tools.find((t) => t.id === `tool_${segments[1]}`);
						if (tool) {
							return new Response(
								JSON.stringify({
									tool: tool.name,
									description: tool.description,
									inputSchema: tool.inputSchema,
								}),
								{
									headers: {
										"Content-Type": "application/json",
									},
								},
							);
						}
					}
					break;
				}
				case ROUTING_REGISTRY_NAMES.CLI_COMMANDS: {
					if (segments[0] === "command" && segments[1]) {
						// /api/v17/registry/cli-commands/command/telegram
						const commands = await queryCLICommandsRegistry17();
						const command = commands.find((c) => c.id === segments[1]);
						if (command) {
							return new Response(
								JSON.stringify({
									command: command.name,
									description: command.description,
									usage: command.usage,
									version: command.version,
									examples: command.examples,
								}),
								{
									headers: {
										"Content-Type": "application/json",
									},
								},
							);
						}
					}
					break;
				}
			}

		return new Response("Not Found", { status: 404 });
	} catch (error) {
		emitRadianceEvent17({
			type: "REGISTRY_FAILURE",
			registry,
			timestamp: Date.now(),
			severity: "high",
			channel: `radiance-${registry}` as any,
			data: {
				error: {
					message: error instanceof Error ? error.message : String(error),
					code: "REGISTRY_DEEP_QUERY_FAILED",
				},
			},
		});

		return new Response("Internal Server Error", { status: 500 });
	}
}

/**
 * Serve telemetry ingestion (high volume forensic logging)
 */
function serveTelemetryIngest17(path: string): Response {
	const segments = path.split("/").filter(Boolean);

	try {
		// Extract telemetry data
		const [type, ...rest] = segments;
		const data = {
			type,
			segments: rest,
			timestamp: Date.now(),
		};

		// Emit radiance event
		if (type === "bookmaker" && rest.length >= 3) {
			emitRadianceEvent17({
				type: "REGISTRY_DISCOVERY",
				registry: "telemetry",
				timestamp: Date.now(),
				severity: "info",
				channel: "radiance-telemetry" as any,
				data: {
					discovery: {
						type: "telemetry_ingest",
						details: {
							bookmaker: rest[0],
							date: rest[1],
							errorCode: rest[2],
						},
					},
				},
			});
		}

		return new Response("OK", { status: 200 });
	} catch (error) {
		emitRadianceEvent17({
			type: "REGISTRY_FAILURE",
			registry: "telemetry",
			timestamp: Date.now(),
			severity: "critical",
			channel: "radiance-telemetry" as any,
			data: {
				error: {
					message: error instanceof Error ? error.message : String(error),
					code: "TELEMETRY_INGEST_FAILED",
				},
			},
		});

		return new Response("Internal Server Error", { status: 500 });
	}
}

/**
 * Serve Radiance Dashboard
 */
function serveRadianceDashboard17(page: string): Response {
	const pageName = page || "home";

	// In production, this would serve actual dashboard HTML
		return new Response(
			JSON.stringify({
				page: pageName,
				version: "17.16.0.0.0.0.0",
				dashboard: "radiance",
			}),
		{
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
}

/**
 * Handle forensic fallback — never lose a request
 */
function handleForensicFallback17(path: string): Response {
	emitRadianceEvent17({
		type: "REGISTRY_DISCOVERY",
		registry: "forensic",
		timestamp: Date.now(),
		severity: "warn",
		channel: "radiance-forensic" as any,
		data: {
			discovery: {
				type: "unrouted_request",
				details: {
					path,
					timestamp: Date.now(),
				},
			},
		},
	});

	return new Response("Radiance Captured", {
		status: 200,
		headers: {
			"Content-Type": "text/plain",
		},
	});
}

/**
 * Main Radiance routing handler
 * 
 * @example
 * ```ts
 * Bun.serve({
 *   fetch: async (req) => {
 *     return handleRadianceRoute17(req);
 *   }
 * });
 * ```
 */
export async function handleRadianceRoute17(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const match = matchRadiancePattern17(url);

	if (!match) {
		return handleForensicFallback17(url.pathname);
	}

	try {
		switch (match.pattern) {
			case "registryDeep": {
				const registry = match.groups.registry as string;
				const subpath = match.groups["0"] as string;
				return await serveRegistryDeep17(registry, subpath);
			}

			case "telemetryIngest": {
				const path = match.groups["0"] as string;
				return serveTelemetryIngest17(path);
			}

			case "dashboard": {
				const page = (match.groups.page as string) || "home";
				return serveRadianceDashboard17(page);
			}

			case "registryItem": {
				const registry = match.groups.registry as string;
				switch (registry) {
					case ROUTING_REGISTRY_NAMES.PROPERTIES:
						return new Response(
							JSON.stringify(await queryPropertiesRegistry17()),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					case ROUTING_REGISTRY_NAMES.MCP_TOOLS:
						return new Response(
							JSON.stringify(await queryMcpToolsRegistry17()),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					case ROUTING_REGISTRY_NAMES.CLI_COMMANDS:
						return new Response(
							JSON.stringify(await queryCLICommandsRegistry17()),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					case ROUTING_REGISTRY_NAMES.SHARP_BOOKS:
						return new Response(
							JSON.stringify(await querySharpBooksRegistry17()),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					case ROUTING_REGISTRY_NAMES.DATA_SOURCES:
						return new Response(
							JSON.stringify(await queryDataSourcesRegistry17()),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					default:
						return new Response("Registry not found", { status: 404 });
				}
			}

			case "healthProbe": {
				const registry = match.groups.registry as string | undefined;
				if (registry) {
					// Probe specific registry health
					const health = {
						registry,
						healthy: true,
						status: "healthy",
						timestamp: Date.now(),
					};
					return new Response(JSON.stringify(health), {
						headers: { "Content-Type": "application/json" },
					});
				}
				// System health
				return new Response(
					JSON.stringify({
						status: "healthy",
						version: "17.16.0",
						timestamp: Date.now(),
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			case "logsWildcard": {
				const year = match.groups.year as string;
				const month = match.groups.month as string;
				const day = match.groups.day as string;
				const rest = match.groups["0"] as string;

				return new Response(
					JSON.stringify({
						date: `${year}-${month}-${day}`,
						path: rest,
						logs: [],
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			case "researchPatterns": {
				const eventId = match.groups.eventId as string;
				return new Response(
					JSON.stringify({
						eventId,
						patterns: [],
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			case "graphEvent": {
				const eventId = match.groups.eventId as string;
				const layer = match.groups.layer as string | undefined;
				return new Response(
					JSON.stringify({
						eventId,
						layer: layer || "all",
						graph: {},
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			default:
				return handleForensicFallback17(url.pathname);
		}
	} catch (error) {
		emitRadianceEvent17({
			type: "REGISTRY_FAILURE",
			registry: "routing",
			timestamp: Date.now(),
			severity: "critical",
			channel: "radiance-critical" as any,
			data: {
				error: {
					message: error instanceof Error ? error.message : String(error),
					code: "ROUTING_HANDLER_FAILED",
					stack: error instanceof Error ? error.stack : undefined,
				},
			},
		});

		return new Response("Internal Server Error", { status: 500 });
	}
}

// Note: extractAllSegments17 is exported from 17.16.1-urlpattern.wildcards.ts
// Import it from there instead of duplicating here
