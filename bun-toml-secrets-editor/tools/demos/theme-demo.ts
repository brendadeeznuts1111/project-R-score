#!/usr/bin/env bun

// scripts/theme-demo.js - Release Theme Demonstration

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "bun";

/**
 * Theme demonstration server showcasing the release theme
 * Features real-time metrics, interactive charts, and modern design
 */

class ThemeDemo {
	constructor() {
		this.port = 3001;
		this.metrics = {
			cpu: 25,
			memory: 512,
			activeProfiles: 2,
			responseTime: 45,
			uptime: 0,
			totalRequests: 1250,
			errorRate: 0.2,
		};
		this.alerts = [];
		this.server = null;
	}

	async start() {
		console.log("🎨 Starting Release Theme Demo Server...");
		console.log(
			`📊 Dashboard will be available at: http://localhost:${this.port}`,
		);
		console.log(
			"🚀 Features: Real-time metrics, interactive charts, modern design",
		);
		console.log("");

		this.server = serve({
			port: this.port,
			fetch: (req) => this.handleRequest(req),
			error(error) {
				console.error("❌ Server error:", error);
			},
		});

		// Start real-time updates
		this.startMetricsSimulation();
		this.startAlertSimulation();

		console.log("✅ Theme demo server started successfully!");
		console.log("🌟 Press Ctrl+C to stop the server");

		// Setup graceful shutdown
		process.on("SIGINT", () => this.shutdown());
		process.on("SIGTERM", () => this.shutdown());
	}

	async handleRequest(req) {
		const url = new URL(req.url);
		const pathname = url.pathname;

		try {
			// Serve the main dashboard
			if (pathname === "/" || pathname === "/dashboard") {
				const html = readFileSync(
					join(import.meta.dir, "../themes/release-dashboard-integrated.html"),
					"utf-8",
				);
				return new Response(html, {
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						"Cache-Control": "no-cache",
					},
				});
			}

			// Serve theme CSS
			if (pathname === "/theme.css") {
				const css = readFileSync(
					join(import.meta.dir, "../themes/release-theme.css"),
					"utf-8",
				);
				return new Response(css, {
					headers: {
						"Content-Type": "text/css; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					},
				});
			}

			// API endpoints
			if (pathname.startsWith("/api/v1/")) {
				return this.handleAPIRequest(req, pathname);
			}

			// Serve static files
			if (pathname.startsWith("/themes/")) {
				try {
					const filePath = join(import.meta.dir, "..", pathname);
					const content = readFileSync(filePath, "utf-8");
					const ext = pathname.split(".").pop();

					const contentType =
						{
							html: "text/html",
							css: "text/css",
							js: "application/javascript",
							json: "application/json",
							json5: "application/json",
						}[ext] || "text/plain";

					return new Response(content, {
						headers: {
							"Content-Type": `${contentType}; charset=utf-8`,
							"Cache-Control": "public, max-age=3600",
						},
					});
				} catch (_error) {
					return new Response("File not found", { status: 404 });
				}
			}

			// 404 for unknown routes
			return new Response("Not found", { status: 404 });
		} catch (error) {
			console.error("❌ Request handling error:", error);
			return new Response("Internal server error", { status: 500 });
		}
	}

	async handleAPIRequest(req, pathname) {
		const method = req.method;

		switch (pathname) {
			case "/api/v1/metrics":
				if (method === "GET") {
					return new Response(
						JSON.stringify({
							success: true,
							data: {
								system: {
									cpuUsage: this.metrics.cpu,
									memoryUsage: this.metrics.memory,
									platform: process.platform,
									version: process.version,
								},
								activeProfiles: this.metrics.activeProfiles,
								uptime: this.metrics.uptime,
								responseTime: this.metrics.responseTime,
								totalRequests: this.metrics.totalRequests,
								errorRate: this.metrics.errorRate,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
							},
						}),
						{
							headers: {
								"Content-Type": "application/json",
								"Cache-Control": "no-cache",
							},
						},
					);
				}
				break;

			case "/api/v1/alerts":
				if (method === "GET") {
					return new Response(
						JSON.stringify({
							success: true,
							data: this.alerts,
							meta: {
								timestamp: new Date().toISOString(),
								count: this.alerts.length,
							},
						}),
						{
							headers: {
								"Content-Type": "application/json",
								"Cache-Control": "no-cache",
							},
						},
					);
				}
				break;

			case "/api/v1/system":
				if (method === "GET") {
					return new Response(
						JSON.stringify({
							success: true,
							data: {
								platform: process.platform,
								version: process.version,
								uptime: this.metrics.uptime,
								totalRequests: this.metrics.totalRequests,
								errorRate: this.metrics.errorRate,
								memory: process.memoryUsage(),
								cpu: process.cpuUsage(),
							},
							meta: {
								timestamp: new Date().toISOString(),
							},
						}),
						{
							headers: {
								"Content-Type": "application/json",
								"Cache-Control": "no-cache",
							},
						},
					);
				}
				break;

			case "/api/v1/health":
				if (method === "GET") {
					return new Response(
						JSON.stringify({
							success: true,
							data: {
								status: "healthy",
								timestamp: new Date().toISOString(),
								uptime: this.metrics.uptime,
								services: {
									profiler: { status: "running" },
									monitoring: { status: "active" },
									alerts: { status: "enabled" },
								},
								metrics: {
									activeAlerts: this.alerts.length,
									systemStatsCount: 10,
									isRunning: true,
								},
							},
							meta: {
								timestamp: new Date().toISOString(),
							},
						}),
						{
							headers: {
								"Content-Type": "application/json",
								"Cache-Control": "no-cache",
							},
						},
					);
				}
				break;

			case "/api/v1/profile/start":
				if (method === "POST") {
					try {
						const body = await req.json();
						const profileId = `profile-${Date.now()}`;

						console.log(
							`🔥 Started ${body.type || "cpu"} profile: ${profileId}`,
						);

						return new Response(
							JSON.stringify({
								success: true,
								data: {
									profileId,
									config: {
										type: body.type || "cpu",
										duration: body.duration || 30000,
										timestamp: new Date().toISOString(),
									},
								},
								meta: {
									timestamp: new Date().toISOString(),
								},
							}),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					} catch (_error) {
						return new Response(
							JSON.stringify({
								success: false,
								error: { message: "Invalid request body" },
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}
				}
				break;

			default:
				return new Response(
					JSON.stringify({
						success: false,
						error: { message: "Endpoint not found" },
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				);
		}

		return new Response("Method not allowed", { status: 405 });
	}

	startMetricsSimulation() {
		// Update metrics every 2 seconds
		setInterval(() => {
			// Simulate realistic metric changes
			this.metrics.cpu = Math.max(
				5,
				Math.min(95, this.metrics.cpu + (Math.random() - 0.5) * 8),
			);
			this.metrics.memory = Math.max(
				200,
				Math.min(900, this.metrics.memory + (Math.random() - 0.5) * 40),
			);
			this.metrics.activeProfiles = Math.max(
				0,
				Math.floor(this.metrics.activeProfiles + (Math.random() - 0.5) * 2),
			);
			this.metrics.responseTime = Math.max(
				10,
				Math.min(200, this.metrics.responseTime + (Math.random() - 0.5) * 20),
			);
			this.metrics.uptime += 2;
			this.metrics.totalRequests += Math.floor(Math.random() * 10) + 5;
			this.metrics.errorRate = Math.max(
				0,
				Math.min(5, this.metrics.errorRate + (Math.random() - 0.5) * 0.5),
			);
		}, 2000);

		console.log("📊 Metrics simulation started");
	}

	startAlertSimulation() {
		// Generate alerts occasionally
		setInterval(() => {
			if (Math.random() < 0.1) {
				// 10% chance every 10 seconds
				const alertTypes = [
					{
						type: "High CPU",
						message: "CPU usage exceeded 80% threshold",
						level: "warning",
					},
					{
						type: "Memory Alert",
						message: "Memory usage approaching limit",
						level: "warning",
					},
					{
						type: "Slow Response",
						message: "Response time degradation detected",
						level: "error",
					},
					{
						type: "Profile Complete",
						message: "Profiling session completed successfully",
						level: "success",
					},
				];

				const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
				alert.timestamp = new Date().toISOString();
				alert.id = crypto.randomUUID();

				this.alerts.unshift(alert);

				// Keep only last 10 alerts
				if (this.alerts.length > 10) {
					this.alerts = this.alerts.slice(0, 10);
				}

				console.log(`🚨 Alert generated: ${alert.type} - ${alert.message}`);
			}
		}, 10000);

		console.log("🚨 Alert simulation started");
	}

	shutdown() {
		console.log("\n🛑 Shutting down theme demo server...");

		if (this.server) {
			this.server.stop();
			console.log("✅ Server stopped");
		}

		console.log("👋 Theme demo server shut down complete");
		process.exit(0);
	}
}

// CLI Interface
async function main() {
	const demo = new ThemeDemo();

	try {
		await demo.start();

		// Keep process alive
		await new Promise(() => {});
	} catch (error) {
		console.error("❌ Failed to start theme demo:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { ThemeDemo };
