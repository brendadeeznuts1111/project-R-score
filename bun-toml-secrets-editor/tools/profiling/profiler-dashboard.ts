#!/usr/bin/env bun
// scripts/profiler-dashboard.js - Real-time profiling dashboard with analytics

import * as os from "node:os";

class ProfilerDashboard {
	constructor() {
		this.metrics = {
			profiles: [],
			systemStats: [],
			alerts: [],
			trends: new Map(),
		};
		this.isRunning = false;
		this.updateInterval = 5000;
	}

	async startDashboard(port = 3001) {
		console.log(`🚀 Starting Profiler Dashboard on port ${port}`);

		// Start collecting metrics
		this.startMetricsCollection();

		// Start web server
		await this.startWebServer(port);

		console.log(`📊 Dashboard available at http://localhost:${port}`);
		console.log(`🔍 Real-time profiling metrics and analytics`);
	}

	startMetricsCollection() {
		this.isRunning = true;

		const collectMetrics = () => {
			if (!this.isRunning) return;

			// System metrics
			const systemStats = {
				timestamp: new Date().toISOString(),
				memory: process.memoryUsage(),
				cpu: os.loadavg(),
				uptime: os.uptime(),
				freeMemory: os.freemem(),
				totalMemory: os.totalmem(),
			};

			this.metrics.systemStats.push(systemStats);

			// Keep only last 100 entries
			if (this.metrics.systemStats.length > 100) {
				this.metrics.systemStats.shift();
			}

			// Check for alerts
			this.checkAlerts(systemStats);

			setTimeout(collectMetrics, this.updateInterval);
		};

		collectMetrics();
	}

	checkAlerts(stats) {
		const memoryUsage = (stats.memory.heapUsed / stats.memory.heapTotal) * 100;
		const cpuUsage = stats.cpu[0]; // 1-minute average

		// Memory alerts
		if (memoryUsage > 90) {
			this.addAlert(
				"CRITICAL",
				"High Memory Usage",
				`${memoryUsage.toFixed(1)}% heap used`,
			);
		} else if (memoryUsage > 75) {
			this.addAlert(
				"WARNING",
				"Elevated Memory Usage",
				`${memoryUsage.toFixed(1)}% heap used`,
			);
		}

		// CPU alerts
		if (cpuUsage > 2.0) {
			this.addAlert(
				"WARNING",
				"High CPU Load",
				`Load average: ${cpuUsage.toFixed(2)}`,
			);
		}
	}

	addAlert(level, title, message) {
		const alert = {
			id: Date.now(),
			level,
			title,
			message,
			timestamp: new Date().toISOString(),
		};

		this.metrics.alerts.unshift(alert);

		// Keep only last 50 alerts
		if (this.metrics.alerts.length > 50) {
			this.metrics.alerts.pop();
		}
	}

	async startWebServer(port) {
		const apiPolicy = new (
			await import("../backend/src/api/api-policy.js")
		).APIPolicy();

		const server = Bun.serve({
			port,
			async fetch(req) {
				const url = new URL(req.url);

				// Apply CORS policy
				const corsResponse = apiPolicy.applyCORS(req, new Response());
				if (corsResponse) return corsResponse;

				// Apply rate limiting
				try {
					await apiPolicy.checkRateLimit(
						req.headers.get("x-forwarded-for") || "unknown",
						"dashboard",
					);
				} catch (error) {
					return new Response(
						JSON.stringify({
							success: false,
							error: { message: error.message, code: 429 },
						}),
						{
							status: 429,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Enhanced API endpoints with proper patterns
				if (url.pathname === "/api/v1/metrics") {
					const response = new Response(
						JSON.stringify({
							success: true,
							data: this.getMetricsSummary(),
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
							},
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);

					// Apply security headers and CORS
					return apiPolicy.applySecurityHeaders(response);
				}

				if (url.pathname === "/api/v1/alerts") {
					const sanitizedAlerts = apiPolicy.sanitizeResponse(
						this.metrics.alerts,
					);
					const response = new Response(
						JSON.stringify({
							success: true,
							data: sanitizedAlerts,
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
								count: sanitizedAlerts.length,
							},
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);

					return apiPolicy.applySecurityHeaders(response);
				}

				if (url.pathname === "/api/v1/system") {
					const response = new Response(
						JSON.stringify({
							success: true,
							data: this.metrics.systemStats.slice(-10),
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
								sampleCount: Math.min(10, this.metrics.systemStats.length),
							},
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);

					return apiPolicy.applySecurityHeaders(response);
				}

				// New enhanced endpoints
				if (url.pathname === "/api/v1/health") {
					const health = {
						status: "healthy",
						timestamp: new Date().toISOString(),
						uptime: os.uptime(),
						memory: process.memoryUsage(),
						services: {
							profiler: { status: "running" },
							monitoring: { status: "active" },
							alerts: { status: "enabled" },
						},
						metrics: {
							activeAlerts: this.metrics.alerts.length,
							systemStatsCount: this.metrics.systemStats.length,
							isRunning: this.isRunning,
						},
					};

					const response = new Response(
						JSON.stringify({
							success: true,
							data: health,
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
							},
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);

					return apiPolicy.applySecurityHeaders(response);
				}

				if (url.pathname === "/api/v1/config" && req.method === "GET") {
					const config = {
						profiling: {
							updateInterval: this.updateInterval,
							maxAlerts: 50,
							maxSystemStats: 100,
						},
						features: {
							realTimeUpdates: true,
							alertsEnabled: true,
							trendAnalysis: true,
						},
					};

					const response = new Response(
						JSON.stringify({
							success: true,
							data: config,
							meta: {
								timestamp: new Date().toISOString(),
								requestId: crypto.randomUUID(),
							},
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);

					return apiPolicy.applySecurityHeaders(response);
				}

				// Serve dashboard HTML with security headers
				const htmlResponse = new Response(this.getDashboardHTML(), {
					headers: { "Content-Type": "text/html" },
				});

				return apiPolicy.applySecurityHeaders(htmlResponse);
			},
		});

		return server;
	}

	getMetricsSummary() {
		const latestStats =
			this.metrics.systemStats[this.metrics.systemStats.length - 1];
		const memoryUsage = latestStats
			? (latestStats.memory.heapUsed / latestStats.memory.heapTotal) * 100
			: 0;
		const cpuUsage = latestStats ? latestStats.cpu[0] : 0;

		return {
			memoryUsage: memoryUsage.toFixed(1),
			cpuUsage: cpuUsage.toFixed(2),
			uptime: latestStats ? latestStats.uptime : 0,
			profileCount: this.metrics.profiles.length,
			alertCount: this.metrics.alerts.length,
			lastUpdate: new Date().toISOString(),
		};
	}

	getDashboardHTML() {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profiler Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto p-6">
        <header class="mb-8">
            <h1 class="text-4xl font-bold mb-2">🔍 Profiler Dashboard</h1>
            <p class="text-gray-400">Real-time performance monitoring and analytics</p>
        </header>

        <!-- Metrics Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Memory Usage</p>
                        <p class="text-2xl font-bold" id="memory-usage">0%</p>
                    </div>
                    <div class="text-blue-400 text-3xl">💾</div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">CPU Load</p>
                        <p class="text-2xl font-bold" id="cpu-usage">0.00</p>
                    </div>
                    <div class="text-green-400 text-3xl">⚡</div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Profiles</p>
                        <p class="text-2xl font-bold" id="profile-count">0</p>
                    </div>
                    <div class="text-purple-400 text-3xl">📊</div>
                </div>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">Alerts</p>
                        <p class="text-2xl font-bold" id="alert-count">0</p>
                    </div>
                    <div class="text-red-400 text-3xl">⚠️</div>
                </div>
            </div>
        </div>

        <!-- Charts and Alerts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Memory Chart -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">Memory Usage Trend</h2>
                <canvas id="memoryChart" width="400" height="200"></canvas>
            </div>
            
            <!-- Alerts Panel -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-semibold mb-4">Recent Alerts</h2>
                <div id="alerts-list" class="space-y-2 max-h-64 overflow-y-auto">
                    <p class="text-gray-400">No alerts</p>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
            <div class="flex flex-wrap gap-4">
                <button onclick="startCPUProfile()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">
                    Start CPU Profile
                </button>
                <button onclick="startHeapProfile()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition">
                    Start Heap Profile
                </button>
                <button onclick="startAdaptiveProfile()" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition">
                    Start Adaptive Profile
                </button>
                <button onclick="clearAlerts()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition">
                    Clear Alerts
                </button>
            </div>
        </div>
    </div>

    <script>
        let isUpdating = false;
        
        async function refreshData() {
            if (isUpdating) return;
                        const colorClass = alert.level === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400';
                        return \`
                            <div class="bg-gray-700 rounded p-3">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="\${colorClass} font-semibold">\${alert.title}</p>
                                        <p class="text-gray-400 text-sm">\${alert.message}</p>
                                    </div>
                                    <div class="text-gray-500 text-xs">
                                        \${new Date(alert.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                }
            } catch (error) {
                console.error('Error updating alerts:', error);
            }
        }
        
        // Quick actions
        function startCPUProfile() {
            fetch('/api/profile/cpu', { method: 'POST' })
                .then(() => alert('CPU profiling started'))
                .catch(err => alert('Error: ' + err.message));
        }
        
        function startHeapProfile() {
            fetch('/api/profile/heap', { method: 'POST' })
                .then(() => alert('Heap profiling started'))
                .catch(err => alert('Error: ' + err.message));
        }
        
        function startAdaptiveProfile() {
            fetch('/api/profile/adaptive', { method: 'POST' })
                .then(() => alert('Adaptive profiling started'))
                .catch(err => alert('Error: ' + err.message));
        }
        
        function clearAlerts() {
            fetch('/api/alerts', { method: 'DELETE' })
                .then(() => updateAlerts())
                .catch(err => alert('Error: ' + err.message));
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initCharts();
            updateMetrics();
            updateAlerts();
            
            // Update every 5 seconds
            setInterval(() => {
                updateMetrics();
                updateAlerts();
            }, 5000);
        });
    </script>
</body>
</html>`;
	}

	addProfile(profileData) {
		this.metrics.profiles.push({
			...profileData,
			timestamp: new Date().toISOString(),
		});

		// Keep only last 50 profiles
		if (this.metrics.profiles.length > 50) {
			this.metrics.profiles.shift();
		}
	}

	stop() {
		this.isRunning = false;
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	let port = 3001;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--port") {
			port = parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === "--help") {
			console.log(`
📊 Profiler Dashboard - Real-time performance monitoring

USAGE:
  bun profiler-dashboard.js [options]

OPTIONS:
  --port <port>     Dashboard port (default: 3001)
  --help           Show this help

EXAMPLES:
  bun profiler-dashboard.js
  bun profiler-dashboard.js --port 8080

FEATURES:
  ✅ Real-time memory and CPU monitoring
  ✅ Interactive charts and graphs
  ✅ Alert system for performance issues
  ✅ Quick profiling actions
  ✅ Historical trend analysis
`);
			process.exit(0);
		}
	}

	const dashboard = new ProfilerDashboard();

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n👋 Shutting down Profiler Dashboard...");
		dashboard.stop();
		process.exit(0);
	});

	await dashboard.startDashboard(port);
}

if (import.meta.main) {
	main().catch(console.error);
}

export { ProfilerDashboard };
