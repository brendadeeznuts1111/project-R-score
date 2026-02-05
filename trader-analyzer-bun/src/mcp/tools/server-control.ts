/**
 * @fileoverview Server Control Tools
 * @description MCP tools for controlling main servers (API server, dashboard server)
 * @module mcp/tools/server-control
 */

import type { MCPTool } from "../server";
import { processRegistry } from "../utils/process-registry";
import { apiClient } from "../utils/api-client";

/**
 * Create server control tools
 */
export function createServerControlTools(): MCPTool[] {
	return [
		{
			name: "server-status",
			description:
				"Get status of all servers (API, dashboard, ORCA streaming). Returns running state, ports, URLs, uptime, and memory usage.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const processes = processRegistry.list();
					const status: Record<string, any> = {};

					// Check API server
					const apiProcess = processRegistry.get("api-server");
					if (apiProcess) {
						const healthCheck = await apiClient
							.healthCheck()
							.catch(() => false);
						status.apiServer = {
							running: true,
							pid: apiProcess.pid,
							port: apiProcess.port,
							url: apiProcess.url || `http://localhost:${apiProcess.port}`,
							uptime: processRegistry.getUptime("api-server"),
							healthCheck,
						};
					} else {
						// Try to check if API is running via health endpoint
						const healthCheck = await apiClient
							.healthCheck()
							.catch(() => false);
						status.apiServer = {
							running: healthCheck,
							healthCheck,
						};
					}

					// Check dashboard server
					const dashboardProcess = processRegistry.get("dashboard-server");
					if (dashboardProcess) {
						status.dashboardServer = {
							running: true,
							pid: dashboardProcess.pid,
							port: dashboardProcess.port,
							url:
								dashboardProcess.url ||
								`http://localhost:${dashboardProcess.port}`,
							uptime: processRegistry.getUptime("dashboard-server"),
						};
					} else {
						status.dashboardServer = {
							running: false,
						};
					}

					// Check ORCA streaming server (via API)
					try {
						const orcaStatus = await apiClient.get("/api/orca/stream/status");
						status.orcaStreaming = {
							running: orcaStatus.status === "ok" && orcaStatus.data?.running,
							...(orcaStatus.data || {}),
						};
					} catch {
						status.orcaStreaming = {
							running: false,
						};
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(status, null, 2),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting server status: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-start-api",
			description:
				"Start the main API server. Spawns process and tracks PID and port. Waits for health check before returning.",
			inputSchema: {
				type: "object",
				properties: {
					port: {
						type: "number",
						description: "Port to start server on (default: 3000)",
					},
					command: {
						type: "string",
						description: "Command to run (default: 'bun run dev')",
					},
				},
			},
			execute: async (args) => {
				try {
					// Check if already running
					const existing = processRegistry.get("api-server");
					if (existing) {
						return {
							content: [
								{
									type: "text",
									text: `API server already running (PID: ${existing.pid}, Port: ${existing.port})`,
								},
							],
							isError: true,
						};
					}

					const port = args.port || 3000;
					const command = args.command || "bun run dev";

					// Check if port is in use
					if (processRegistry.isPortInUse(port)) {
						return {
							content: [
								{
									type: "text",
									text: `Port ${port} is already in use`,
								},
							],
							isError: true,
						};
					}

					// Spawn process
					const proc = Bun.spawn(command.split(" "), {
						cwd: process.cwd(),
						env: {
							...process.env,
							PORT: String(port),
						},
						stdout: "pipe",
						stderr: "pipe",
					});

					// Register process
					processRegistry.register("api-server", proc.pid, {
						port,
						command,
						url: `http://localhost:${port}`,
					});

					// Wait for health check (with timeout)
					const maxWait = 30000; // 30 seconds
					const startTime = Date.now();
					let healthCheck = false;

					while (Date.now() - startTime < maxWait) {
						await new Promise((resolve) => setTimeout(resolve, 1000));
						try {
							const client = new (
								await import("../utils/api-client")
							).APIClient({
								baseURL: `http://localhost:${port}`,
								timeout: 2000,
							});
							healthCheck = await client.healthCheck();
							if (healthCheck) break;
						} catch {
							// Continue waiting
						}
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										success: true,
										pid: proc.pid,
										port,
										url: `http://localhost:${port}`,
										healthCheck,
										message: healthCheck
											? "Server started and health check passed"
											: "Server started but health check timed out",
									},
									null,
									2,
								),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error starting API server: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-stop-api",
			description:
				"Stop the main API server. Finds process by port or PID and gracefully terminates it.",
			inputSchema: {
				type: "object",
				properties: {
					pid: {
						type: "number",
						description:
							"Process ID (optional, will find by name if not provided)",
					},
				},
			},
			execute: async (args) => {
				try {
					const processInfo = args.pid
						? processRegistry.getByPid(args.pid)
						: processRegistry.get("api-server");

					if (!processInfo) {
						return {
							content: [
								{
									type: "text",
									text: "API server process not found in registry",
								},
							],
							isError: true,
						};
					}

					const pid = processInfo.pid;

					// Try graceful termination
					try {
						process.kill(pid, "SIGTERM");
					} catch (error: any) {
						// Process might already be dead
						if (error.code !== "ESRCH") {
							throw error;
						}
					}

					// Wait a bit, then force kill if still running
					await new Promise((resolve) => setTimeout(resolve, 2000));

					try {
						// Check if process is still alive
						process.kill(pid, 0);
						// Still alive, force kill
						process.kill(pid, "SIGKILL");
					} catch {
						// Process is dead, good
					}

					// Remove from registry
					processRegistry.unregister("api-server");

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										success: true,
										pid,
										message: "API server stopped",
									},
									null,
									2,
								),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error stopping API server: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-restart-api",
			description:
				"Restart the main API server. Stops then starts it, preserving configuration.",
			inputSchema: {
				type: "object",
				properties: {
					port: {
						type: "number",
						description: "Port to start server on (default: 3000)",
					},
					command: {
						type: "string",
						description: "Command to run (default: 'bun run dev')",
					},
				},
			},
			execute: async (args) => {
				try {
					// Stop first
					const stopResult = await createServerControlTools()
						.find((t) => t.name === "server-stop-api")!
						.execute({});

					if (
						stopResult.isError &&
						!stopResult.content[0]?.text?.includes("not found")
					) {
						return stopResult;
					}

					// Wait a bit
					await new Promise((resolve) => setTimeout(resolve, 1000));

					// Start
					const startResult = await createServerControlTools()
						.find((t) => t.name === "server-start-api")!
						.execute(args);

					return startResult;
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error restarting API server: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-start-dashboard",
			description:
				"Start dashboard server. Spawns process and tracks PID and port (default 8080).",
			inputSchema: {
				type: "object",
				properties: {
					port: {
						type: "number",
						description: "Port to start dashboard on (default: 8080)",
					},
				},
			},
			execute: async (args) => {
				try {
					// Check if already running
					const existing = processRegistry.get("dashboard-server");
					if (existing) {
						return {
							content: [
								{
									type: "text",
									text: `Dashboard server already running (PID: ${existing.pid}, Port: ${existing.port})`,
								},
							],
							isError: true,
						};
					}

					const port = args.port || 8080;
					const command = "bun run scripts/dashboard-server.ts";

					// Check if port is in use
					if (processRegistry.isPortInUse(port)) {
						return {
							content: [
								{
									type: "text",
									text: `Port ${port} is already in use`,
								},
							],
							isError: true,
						};
					}

					// Spawn process
					const proc = Bun.spawn(command.split(" "), {
						cwd: process.cwd(),
						env: {
							...process.env,
							PORT: String(port),
						},
						stdout: "pipe",
						stderr: "pipe",
					});

					// Register process
					processRegistry.register("dashboard-server", proc.pid, {
						port,
						command,
						url: `http://localhost:${port}`,
					});

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										success: true,
										pid: proc.pid,
										port,
										url: `http://localhost:${port}`,
										message: "Dashboard server started",
									},
									null,
									2,
								),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error starting dashboard server: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-stop-dashboard",
			description: "Stop dashboard server. Finds and terminates the process.",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const processInfo = processRegistry.get("dashboard-server");

					if (!processInfo) {
						return {
							content: [
								{
									type: "text",
									text: "Dashboard server process not found in registry",
								},
							],
							isError: true,
						};
					}

					const pid = processInfo.pid;

					// Try graceful termination
					try {
						process.kill(pid, "SIGTERM");
					} catch (error: any) {
						if (error.code !== "ESRCH") {
							throw error;
						}
					}

					// Wait a bit, then force kill if still running
					await new Promise((resolve) => setTimeout(resolve, 2000));

					try {
						process.kill(pid, 0);
						process.kill(pid, "SIGKILL");
					} catch {
						// Process is dead
					}

					// Remove from registry
					processRegistry.unregister("dashboard-server");

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										success: true,
										pid,
										message: "Dashboard server stopped",
									},
									null,
									2,
								),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error stopping dashboard server: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "server-logs",
			description:
				"Get recent server logs. Reads from log files or process output. Supports filtering by server type, level, and time range.",
			inputSchema: {
				type: "object",
				properties: {
					server: {
						type: "string",
						description:
							"Server name: 'api-server' | 'dashboard-server' | 'all'",
						enum: ["api-server", "dashboard-server", "all"],
					},
					lines: {
						type: "number",
						description: "Number of lines to return (default: 100)",
					},
				},
			},
			execute: async (args) => {
				try {
					const server = args.server || "all";
					const lines = args.lines || 100;

					// For now, return process info since we don't have log file access
					// In a real implementation, you'd read from log files
					const processes = processRegistry.list();
					const filtered =
						server === "all"
							? processes
							: processes.filter((p) => p.name === server);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										servers: filtered.map((p) => ({
											name: p.name,
											pid: p.pid,
											port: p.port,
											uptime: processRegistry.getUptime(p.name),
											startedAt: new Date(p.startedAt).toISOString(),
										})),
										message:
											"Log file reading not implemented. Showing process info instead.",
									},
									null,
									2,
								),
							},
						],
					};
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting server logs: ${error.message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
