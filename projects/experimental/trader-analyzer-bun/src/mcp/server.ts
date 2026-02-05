/**
 * @fileoverview MCP Server Implementation
 * @description Model Context Protocol server following Bun MCP documentation
 * @module mcp/server
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-SERVER@0.1.0;instance-id=MCP-SERVER-001;version=0.1.0}]
 * [PROPERTIES:{mcp={value:"mcp-server";@root:"ROOT-MCP";@chain:["BP-MCP","BP-SERVER"];@version:"0.1.0"}}]
 * [CLASS:MCPServer][#REF:v-0.1.0.BP.MCP.SERVER.1.0.A.1.1.MCP.1.1]]
 */

import { counter, histogram } from "../observability/metrics";
import type { ComplianceLogger } from "../security/compliance-logger";

/**
 * Silent logger for MCP stdio mode (no console output - breaks JSON-RPC protocol)
 * In stdio mode, MCP servers must ONLY output JSON-RPC messages to stdout
 * Any console output will corrupt the JSON-RPC protocol stream
 */
const createSilentLogger = () => ({
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
});

// Detect if we're running in stdio mode (MCP protocol mode)
// In stdio mode, stdin is typically not a TTY
// Use silent logger to maintain JSON-RPC protocol compliance
const isStdioMode = !process.stdin.isTTY || process.env.MCP_STDIO_MODE === "true";

// Always use silent logger in stdio mode to maintain JSON-RPC protocol compliance
// In stdio mode, ANY console output breaks the JSON-RPC protocol
const mcpLogger = createSilentLogger();

/**
 * MCP Tool definition
 */
export interface MCPTool {
	name: string;
	description: string;
	inputSchema: Record<string, any>; // Flexible schema to support various JSON Schema structures
	execute: (args: Record<string, any>) => Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}>;
}

/**
 * MCP Server implementation
 */
export class MCPServer {
	private tools = new Map<string, MCPTool>();
	private resources: Array<{
		uri: string;
		name: string;
		description?: string;
		mimeType?: string;
	}> = [];
	private complianceLogger?: ComplianceLogger;
	private userId: string = "mcp-client"; // Default user ID for MCP invocations

	// Metrics
	private toolInvocationCounter = counter({
		name: "mcp_tool_invocations_total",
		help: "Total MCP tool invocations",
		labelNames: ["tool_name", "status"],
	});

	private toolLatencyHistogram = histogram({
		name: "mcp_tool_latency_ms",
		help: "MCP tool execution latency",
		buckets: [10, 50, 100, 500, 1000, 5000],
	});

	/**
	 * Set compliance logger for audit trail
	 */
	setComplianceLogger(logger: ComplianceLogger, userId?: string): void {
		this.complianceLogger = logger;
		if (userId) {
			this.userId = userId;
		}
	}

	/**
	 * Sanitize arguments for logging (remove sensitive data)
	 */
	private sanitizeArgsForLogging(args: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};
		const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apikey', 'api_key'];

		for (const [key, value] of Object.entries(args)) {
			if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
				sanitized[key] = '[REDACTED]';
			} else if (typeof value === 'object' && value !== null) {
				sanitized[key] = this.sanitizeArgsForLogging(value);
			} else {
				sanitized[key] = value;
			}
		}

		return sanitized;
	}

	/**
	 * Register a tool
	 */
	registerTool(tool: MCPTool): void {
		this.tools.set(tool.name, tool);
		mcpLogger.info("Tool registered", {
			toolName: tool.name,
			description: tool.description,
			requiredParams: tool.inputSchema.required?.length || 0,
			totalParams: Object.keys(tool.inputSchema.properties).length,
		});
	}

	/**
	 * Register multiple tools
	 */
	registerTools(tools: MCPTool[]): void {
		mcpLogger.info("Registering multiple tools", {
			toolCount: tools.length,
			toolNames: tools.map(t => t.name),
		});

		for (const tool of tools) {
			this.registerTool(tool);
		}

		mcpLogger.info("All tools registered successfully", {
			totalTools: this.tools.size,
		});
	}

	/**
	 * Register a resource
	 */
	registerResource(resource: {
		uri: string;
		name: string;
		description?: string;
		mimeType?: string;
	}): void {
		this.resources.push(resource);
		mcpLogger.debug("Resource registered", {
			uri: resource.uri,
			name: resource.name,
			mimeType: resource.mimeType,
		});
	}

	/**
	 * List all tools
	 */
	listTools(): MCPTool[] {
		return Array.from(this.tools.values());
	}

	/**
	 * List all resources
	 */
	listResources(): Array<{
		uri: string;
		name: string;
		description?: string;
		mimeType?: string;
	}> {
		return this.resources;
	}

	/**
	 * Execute a tool with logging and metrics
	 */
	async executeTool(
		name: string,
		args: Record<string, any>,
		requestId?: string | number,
		ipAddress?: string,
	): Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}> {
		const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		mcpLogger.info("Tool execution started", {
			executionId,
			toolName: name,
			requestId,
			ipAddress,
			args: this.sanitizeArgsForLogging(args),
		});

		const tool = this.tools.get(name);
		if (!tool) {
			mcpLogger.warn("Tool not found", {
				executionId,
				toolName: name,
				requestId,
				availableTools: Array.from(this.tools.keys()),
			});

			this.toolInvocationCounter.inc({ tool_name: name, status: "not_found" });
			return {
				content: [{ text: `Tool "${name}" not found` }],
				isError: true,
			};
		}

		const startTime = Bun.nanoseconds();
		let result: {
			content: Array<{ type?: string; text?: string; data?: any }>;
			isError?: boolean;
		};

		try {
			result = await tool.execute(args);
			const latencyMs = (Bun.nanoseconds() - startTime) / 1_000_000;

			// Record metrics
			this.toolInvocationCounter.inc({
				tool_name: name,
				status: result.isError ? "error" : "success",
			});
			this.toolLatencyHistogram.observe({ tool_name: name }, latencyMs);

			// Log successful execution
			mcpLogger.info("Tool execution completed", {
				executionId,
				toolName: name,
				requestId,
				latencyMs: Math.round(latencyMs),
				status: result.isError ? "error" : "success",
				contentCount: result.content?.length || 0,
			});

			// Log to compliance logger if available
			if (this.complianceLogger) {
				try {
					this.complianceLogger.logMCPInvocation(
						name,
						this.userId,
						args,
						result,
						ipAddress,
					);
				} catch (logError) {
					mcpLogger.warn("Compliance logging failed", {
						executionId,
						toolName: name,
						error: logError instanceof Error ? logError.message : String(logError),
					});
				}
			}

			return result;
		} catch (error: any) {
			const latencyMs = (Bun.nanoseconds() - startTime) / 1_000_000;

			// Record error metrics
			this.toolInvocationCounter.inc({
				tool_name: name,
				status: "exception",
			});
			this.toolLatencyHistogram.observe({ tool_name: name }, latencyMs);

			// Log tool execution error
			mcpLogger.error("Tool execution failed", error, {
				executionId,
				toolName: name,
				requestId,
				latencyMs: Math.round(latencyMs),
				errorType: error?.name || 'UnknownError',
			});

			result = {
				content: [
					{
						text: `Error executing tool "${name}": ${error.message}`,
					},
				],
				isError: true,
			};

			// Log error to compliance logger if available
			if (this.complianceLogger) {
				try {
					this.complianceLogger.logMCPInvocation(
						name,
						this.userId,
						args,
						result,
						ipAddress,
					);
				} catch (logError) {
					mcpLogger.warn("Compliance logging failed during error", {
						executionId,
						toolName: name,
						complianceError: logError instanceof Error ? logError.message : String(logError),
					});
				}
			}

			return result;
		}
	}

	/**
	 * Get resource
	 */
	async getResource(uri: string): Promise<{
		contents: Array<{
			uri: string;
			mimeType?: string;
			text?: string;
			data?: string;
		}>;
	}> {
		const resource = this.resources.find((r) => r.uri === uri);
		if (!resource) {
			return {
				contents: [],
			};
		}

		// Try to read the resource
		try {
			const file = Bun.file(uri);
			if (await file.exists()) {
				const text = await file.text();
				return {
					contents: [
						{
							uri,
							mimeType: resource.mimeType || "text/plain",
							text,
						},
					],
				};
			}
		} catch {
			// File doesn't exist or can't be read
		}

		return {
			contents: [
				{
					uri,
					mimeType: resource.mimeType || "text/plain",
					text: `Resource "${uri}" not found`,
				},
			],
		};
	}

	/**
	 * Handle MCP request
	 */
	async handleRequest(request: {
		method: string;
		params?: Record<string, any>;
		id?: string | number;
	}): Promise<any> {
		const requestId = request.id ? String(request.id) : `req-${Date.now()}`;

		mcpLogger.debug("MCP request received", {
			requestId,
			method: request.method,
			hasParams: !!request.params,
			paramKeys: request.params ? Object.keys(request.params) : [],
		});

		switch (request.method) {
		case "tools/list": {
			const tools = this.listTools();
			mcpLogger.debug("Tools list requested", {
				requestId,
				toolCount: tools.length,
			});
			return {
				tools: tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema,
				})),
			};
		}

		case "tools/call": {
			if (!request.params?.name) {
				mcpLogger.warn("Tool call missing name parameter", { requestId });
				return { error: "Tool name required" };
			}
			return await this.executeTool(
				request.params.name,
				request.params.arguments || {},
				requestId,
				request.params?.ipAddress,
			);
		}

		case "resources/list": {
			const resources = this.listResources();
			mcpLogger.debug("Resources list requested", {
				requestId,
				resourceCount: resources.length,
			});
			return { resources };
		}

		case "resources/read": {
			if (!request.params?.uri) {
				mcpLogger.warn("Resource read missing URI parameter", { requestId });
				return { error: "Resource URI required" };
			}
			const result = await this.getResource(request.params.uri);
			mcpLogger.debug("Resource read completed", {
				requestId,
				uri: request.params.uri,
				found: result.contents.length > 0,
			});
			return result;
		}

		case "initialize": {
			mcpLogger.info("MCP client initialized", {
				requestId,
				protocolVersion: "2024-11-05",
				serverVersion: "0.1.0",
			});
			return {
				protocolVersion: "2024-11-05",
				capabilities: {
					tools: {},
					resources: {},
				},
				serverInfo: {
					name: "nexus-mcp-server",
					version: "0.1.0",
				},
			};
		}

		default: {
			mcpLogger.warn("Unknown MCP method requested", {
				requestId,
				method: request.method,
			});
			return { error: `Unknown method: ${request.method}` };
		}
		}
	}

	/**
	 * Start MCP server (stdio mode)
	 * Note: No console output allowed - must only output JSON-RPC messages to stdout
	 */
	async start(): Promise<void> {
		mcpLogger.info("MCP server starting in stdio mode", {
			toolCount: this.tools.size,
			resourceCount: this.resources.length,
			complianceEnabled: !!this.complianceLogger,
		});

		// Read from stdin
		const stdin = Bun.stdin.stream();
		const reader = stdin.getReader();
		const decoder = new TextDecoder();
		let messageCount = 0;

		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				mcpLogger.info("MCP server stdin closed", { totalMessages: messageCount });
				break;
			}

			const text = decoder.decode(value);
			const lines = text.split("\n").filter((l) => l.trim());

			for (const line of lines) {
				messageCount++;
				let requestId: string | number | null = null;
				const messageId = `msg-${messageCount}-${Date.now()}`;

				try {
					const request = JSON.parse(line);
					requestId = request.id || null;

					mcpLogger.debug("Processing MCP message", {
						messageId,
						requestId,
						method: request.method,
						lineLength: line.length,
					});

					const response = await this.handleRequest(request);

					// Write response to stdout
					const responseLine =
						JSON.stringify({
							jsonrpc: "2.0",
							id: requestId,
							result: response,
						}) + "\n";

					await Bun.write(Bun.stdout, responseLine);

					mcpLogger.debug("MCP response sent", {
						messageId,
						requestId,
						responseSize: responseLine.length,
					});

				} catch (error: any) {
					mcpLogger.error("MCP message processing failed", error, {
						messageId,
						requestId,
						rawMessage: line.substring(0, 200), // Truncate for logging
					});

					const errorResponse =
						JSON.stringify({
							jsonrpc: "2.0",
							id: requestId,
							error: {
								code: -32603,
								message: error.message,
							},
						}) + "\n";

					await Bun.write(Bun.stdout, errorResponse);
				}
			}
		}
	}
}
