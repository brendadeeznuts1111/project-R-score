#!/usr/bin/env bun

/**
 * Dev Dashboard Server
 * Real-time monitoring dashboard with Kimi integration
 */

import { type ServerWebSocket, serve } from "bun";
import { createKimiClient } from "../integrations/kimi-api-client";
import {
	type DriftAlert,
	getDriftMonitorManager,
} from "../services/connection-drift-monitor";

// Dashboard HTML template
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Dashboard - Kimi & Network Monitor</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            background: #0a0a0f;
            color: #e0e0e0;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #2a2a3e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 1.5rem; color: #00d4ff; }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .status-healthy { background: rgba(0, 255, 100, 0.1); color: #00ff64; }
        .status-warning { background: rgba(255, 200, 0, 0.1); color: #ffc800; }
        .status-critical { background: rgba(255, 50, 50, 0.1); color: #ff3232; }
        .dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
        .dot-healthy { background: #00ff64; }
        .dot-warning { background: #ffc800; }
        .dot-critical { background: #ff3232; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 1.5rem;
            padding: 1.5rem;
            max-width: 1600px;
            margin: 0 auto;
        }
        .panel {
            background: #111118;
            border: 1px solid #1e1e2e;
            border-radius: 12px;
            overflow: hidden;
        }
        .panel-header {
            background: #16161f;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #1e1e2e;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-content { padding: 1.25rem; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .metric-card {
            background: #0d0d12;
            border: 1px solid #1e1e2e;
            border-radius: 8px;
            padding: 1rem;
        }
        .metric-label {
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        .metric-value {
            font-size: 1.75rem;
            font-weight: 700;
            font-family: 'SF Mono', monospace;
        }
        .metric-unit {
            font-size: 0.875rem;
            color: #666;
            margin-left: 0.25rem;
        }
        .chart-container {
            height: 200px;
            background: #0d0d12;
            border: 1px solid #1e1e2e;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }
        .chart-canvas { width: 100%; height: 100%; }
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 600px;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .message {
            max-width: 85%;
            padding: 0.875rem 1rem;
            border-radius: 12px;
            font-size: 0.9375rem;
            line-height: 1.5;
        }
        .message-user {
            align-self: flex-end;
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .message-assistant {
            align-self: flex-start;
            background: #1e1e2e;
            border: 1px solid #2a2a3e;
            border-bottom-left-radius: 4px;
        }
        .message-system {
            align-self: center;
            background: rgba(255, 200, 0, 0.1);
            border: 1px solid rgba(255, 200, 0, 0.2);
            color: #ffc800;
            font-size: 0.875rem;
        }
        .chat-input-container {
            padding: 1rem;
            border-top: 1px solid #1e1e2e;
            display: flex;
            gap: 0.75rem;
        }
        .chat-input {
            flex: 1;
            background: #0d0d12;
            border: 1px solid #2a2a3e;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            color: #e0e0e0;
            font-size: 0.9375rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .chat-input:focus { border-color: #00d4ff; }
        .btn {
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            color: #0a0a0f;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .alerts-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .alert-item {
            padding: 0.875rem;
            border-radius: 8px;
            margin-bottom: 0.75rem;
            border-left: 3px solid;
            font-size: 0.875rem;
        }
        .alert-critical { background: rgba(255, 50, 50, 0.1); border-left-color: #ff3232; }
        .alert-high { background: rgba(255, 100, 50, 0.1); border-left-color: #ff6432; }
        .alert-medium { background: rgba(255, 200, 0, 0.1); border-left-color: #ffc800; }
        .alert-low { background: rgba(100, 200, 255, 0.1); border-left-color: #64c8ff; }
        .alert-time { font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
        .network-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .stat-box {
            text-align: center;
            padding: 0.75rem;
            background: #0d0d12;
            border-radius: 6px;
        }
        .stat-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #00d4ff;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #666;
            margin-top: 0.25rem;
        }
        .latency-bar {
            height: 4px;
            background: #1e1e2e;
            border-radius: 2px;
            margin-top: 0.5rem;
            overflow: hidden;
        }
        .latency-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s, background-color 0.3s;
        }
        .latency-good { background: #00ff64; }
        .latency-warning { background: #ffc800; }
        .latency-bad { background: #ff3232; }
        @media (max-width: 1200px) {
            .container { grid-template-columns: 1fr; }
        }
        .connection-log {
            font-family: 'SF Mono', monospace;
            font-size: 0.8125rem;
            max-height: 150px;
            overflow-y: auto;
        }
        .log-entry {
            padding: 0.375rem 0;
            border-bottom: 1px solid #1e1e2e;
            color: #888;
        }
        .log-entry:last-child { border-bottom: none; }
        .log-time { color: #555; margin-right: 0.5rem; }
        .log-success { color: #00ff64; }
        .log-error { color: #ff3232; }
        .log-info { color: #64c8ff; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Dev Dashboard</h1>
        <div class="status-indicator" id="connectionStatus">
            <span class="dot dot-healthy"></span>
            <span>Connected</span>
        </div>
    </div>

    <div class="container">
        <div class="left-column">
            <!-- Network Monitoring Panel -->
            <div class="panel" style="margin-bottom: 1.5rem;">
                <div class="panel-header">
                    <span>📊 Network Monitor - Kimi API</span>
                    <span id="driftScore" style="font-size: 0.875rem; color: #00ff64;">Drift Score: 0/100</span>
                </div>
                <div class="panel-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-label">Current Latency</div>
                            <div class="metric-value" id="currentLatency">--<span class="metric-unit">ms</span></div>
                            <div class="latency-bar">
                                <div class="latency-fill latency-good" id="latencyBar" style="width: 0%"></div>
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Average Latency</div>
                            <div class="metric-value" id="avgLatency">--<span class="metric-unit">ms</span></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Jitter</div>
                            <div class="metric-value" id="jitter">--<span class="metric-unit">ms</span></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Error Rate</div>
                            <div class="metric-value" id="errorRate">--<span class="metric-unit">%</span></div>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="latencyChart" class="chart-canvas"></canvas>
                    </div>
                    <div class="network-stats">
                        <div class="stat-box">
                            <div class="stat-value" id="packetLoss">0%</div>
                            <div class="stat-label">Packet Loss</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value" id="consecutiveFailures">0</div>
                            <div class="stat-label">Failures</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value" id="trend">→</div>
                            <div class="stat-label">Trend</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Connection Log Panel -->
            <div class="panel">
                <div class="panel-header">📜 Connection Log</div>
                <div class="panel-content">
                    <div class="connection-log" id="connectionLog">
                        <div class="log-entry"><span class="log-time">--:--:--</span> Waiting for connection...</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="right-column">
            <!-- Kimi Chat Panel -->
            <div class="panel chat-container">
                <div class="panel-header">
                    <span>🤖 Kimi Chat</span>
                    <span id="kimiStatus" style="font-size: 0.75rem; color: #666;">Ready</span>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="message message-system">Welcome! I'm connected and monitoring your network. How can I help?</div>
                </div>
                <div class="chat-input-container">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Type a message..." />
                    <button class="btn" id="sendBtn">Send</button>
                </div>
            </div>

            <!-- Alerts Panel -->
            <div class="panel" style="margin-top: 1.5rem;">
                <div class="panel-header">🚨 Drift Alerts</div>
                <div class="panel-content">
                    <div class="alerts-list" id="alertsList">
                        <div style="color: #666; text-align: center; padding: 2rem;">No alerts yet</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // WebSocket connection
        const ws = new WebSocket('ws://localhost:4269/ws');
        const latencyHistory = [];
        const maxHistory = 50;
        
        // DOM elements
        const els = {
            connectionStatus: document.getElementById('connectionStatus'),
            currentLatency: document.getElementById('currentLatency'),
            avgLatency: document.getElementById('avgLatency'),
            jitter: document.getElementById('jitter'),
            errorRate: document.getElementById('errorRate'),
            driftScore: document.getElementById('driftScore'),
            packetLoss: document.getElementById('packetLoss'),
            consecutiveFailures: document.getElementById('consecutiveFailures'),
            trend: document.getElementById('trend'),
            latencyBar: document.getElementById('latencyBar'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            kimiStatus: document.getElementById('kimiStatus'),
            alertsList: document.getElementById('alertsList'),
            connectionLog: document.getElementById('connectionLog'),
        };

        // WebSocket handlers
        ws.onopen = () => {
            addLogEntry('WebSocket connected', 'info');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleMessage(data);
        };

        ws.onclose = () => {
            addLogEntry('WebSocket disconnected', 'error');
            updateConnectionStatus('disconnected');
        };

        ws.onerror = (error) => {
            addLogEntry('WebSocket error', 'error');
        };

        function handleMessage(data) {
            switch (data.type) {
                case 'status':
                    updateMetrics(data.payload);
                    break;
                case 'alert':
                    addAlert(data.payload);
                    break;
                case 'chat':
                    addChatMessage(data.payload.role, data.payload.content);
                    break;
                case 'log':
                    addLogEntry(data.payload.message, data.payload.level);
                    break;
            }
        }

        function updateMetrics(status) {
            // Update text values
            els.currentLatency.innerHTML = status.currentLatencyMs.toFixed(0) + '<span class="metric-unit">ms</span>';
            els.avgLatency.innerHTML = status.avgLatencyMs.toFixed(0) + '<span class="metric-unit">ms</span>';
            els.jitter.innerHTML = status.jitterMs.toFixed(1) + '<span class="metric-unit">ms</span>';
            els.errorRate.innerHTML = status.errorRatePercent.toFixed(1) + '<span class="metric-unit">%</span>';
            els.packetLoss.textContent = status.packetLossPercent.toFixed(1) + '%';
            els.consecutiveFailures.textContent = status.consecutiveFailures;
            
            // Update trend
            const trendMap = { improving: '↑', stable: '→', degrading: '↓', critical: '⚠' };
            els.trend.textContent = trendMap[status.latencyTrend] || '→';
            
            // Update drift score
            els.driftScore.textContent = 'Drift Score: ' + status.driftScore.toFixed(0) + '/100';
            els.driftScore.style.color = status.driftScore < 30 ? '#00ff64' : status.driftScore < 60 ? '#ffc800' : '#ff3232';
            
            // Update connection status
            updateConnectionStatus(status.isHealthy ? 'healthy' : status.driftScore < 60 ? 'warning' : 'critical');
            
            // Update latency bar
            const latencyPercent = Math.min((status.currentLatencyMs / 5000) * 100, 100);
            els.latencyBar.style.width = latencyPercent + '%';
            els.latencyBar.className = 'latency-fill ' + (status.currentLatencyMs < 1000 ? 'latency-good' : status.currentLatencyMs < 3000 ? 'latency-warning' : 'latency-bad');
            
            // Update chart
            latencyHistory.push(status.currentLatencyMs);
            if (latencyHistory.length > maxHistory) latencyHistory.shift();
            drawChart();
        }

        function updateConnectionStatus(status) {
            const statusClass = status === 'healthy' ? 'status-healthy' : status === 'warning' ? 'status-warning' : 'status-critical';
            const dotClass = status === 'healthy' ? 'dot-healthy' : status === 'warning' ? 'dot-warning' : 'dot-critical';
            const text = status === 'healthy' ? 'Connected' : status === 'warning' ? 'Degraded' : 'Critical';
            
            els.connectionStatus.className = 'status-indicator ' + statusClass;
            els.connectionStatus.innerHTML = '<span class="dot ' + dotClass + '"></span><span>' + text + '</span>';
        }

        function addAlert(alert) {
            const alertEl = document.createElement('div');
            alertEl.className = 'alert-item alert-' + alert.severity;
            alertEl.innerHTML = '<div class="alert-time">' + new Date(alert.timestamp).toLocaleTimeString() + '</div><div>' + alert.message + '</div>';
            
            const noAlerts = els.alertsList.querySelector('[style*="No alerts"]');
            if (noAlerts) noAlerts.remove();
            
            els.alertsList.insertBefore(alertEl, els.alertsList.firstChild);
            
            // Keep only last 10 alerts
            while (els.alertsList.children.length > 10) {
                els.alertsList.removeChild(els.alertsList.lastChild);
            }
        }

        function addChatMessage(role, content) {
            const msgEl = document.createElement('div');
            msgEl.className = 'message message-' + role;
            msgEl.textContent = content;
            els.chatMessages.appendChild(msgEl);
            els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
            
            if (role === 'assistant') {
                els.kimiStatus.textContent = 'Ready';
                els.sendBtn.disabled = false;
            }
        }

        function addLogEntry(message, level) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            const time = new Date().toLocaleTimeString();
            entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-' + level + '">' + message + '</span>';
            els.connectionLog.insertBefore(entry, els.connectionLog.firstChild);
            
            while (els.connectionLog.children.length > 20) {
                els.connectionLog.removeChild(els.connectionLog.lastChild);
            }
        }

        // Chat handlers
        function sendMessage() {
            const message = els.chatInput.value.trim();
            if (!message) return;
            
            addChatMessage('user', message);
            els.chatInput.value = '';
            els.kimiStatus.textContent = 'Thinking...';
            els.sendBtn.disabled = true;
            
            ws.send(JSON.stringify({ type: 'chat', payload: { message } }));
        }

        els.sendBtn.addEventListener('click', sendMessage);
        els.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Chart drawing
        function drawChart() {
            const canvas = document.getElementById('latencyChart');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            const width = canvas.width;
            const height = canvas.height;
            const padding = 20;
            
            ctx.clearRect(0, 0, width, height);
            
            if (latencyHistory.length < 2) return;
            
            const maxLatency = Math.max(...latencyHistory, 1000);
            const minLatency = Math.min(...latencyHistory);
            const range = maxLatency - minLatency || 1;
            
            // Draw grid
            ctx.strokeStyle = '#1e1e2e';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding + (height - 2 * padding) * (i / 4);
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }
            
            // Draw line
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            latencyHistory.forEach((latency, i) => {
                const x = padding + (width - 2 * padding) * (i / (maxHistory - 1));
                const y = height - padding - ((latency - minLatency) / range) * (height - 2 * padding);
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            
            ctx.stroke();
            
            // Draw fill
            ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
            ctx.lineTo(width - padding, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.closePath();
            ctx.fill();
        }

        // Initial draw
        drawChart();
        window.addEventListener('resize', drawChart);
    </script>
</body>
</html>`;

interface WebSocketData {
	connectionId: string;
}

interface DashboardClient {
	ws: ServerWebSocket<WebSocketData>;
	connectedAt: Date;
}

class DevDashboardServer {
	private port = 4269;
	private clients: Map<string, DashboardClient> = new Map();
	private kimiClient: Awaited<ReturnType<typeof createKimiClient>> | null =
		null;
	private monitorInterval?: Timer;
	private driftMonitor = getDriftMonitorManager();
	private connectionLogs: Array<{
		time: string;
		message: string;
		level: string;
	}> = [];

	async start(): Promise<void> {
		// Initialize Kimi client
		try {
			this.kimiClient = await createKimiClient();
			this.log("Kimi client initialized", "info");
		} catch (error) {
			this.log(
				`Failed to initialize Kimi client: ${(error as Error).message}`,
				"error",
			);
		}

		// Start drift monitoring
		this.startDriftMonitoring();

		// Start HTTP/WebSocket server
		const _server = serve<WebSocketData>({
			port: this.port,
			websocket: {
				open: (ws) => this.handleWebSocketOpen(ws),
				message: (ws, message) => this.handleWebSocketMessage(ws, message),
				close: (ws) => this.handleWebSocketClose(ws),
			},
			fetch: (req, server) => this.handleHttpRequest(req, server),
		});

		console.log(`\n🚀 Dev Dashboard running at: http://localhost:${this.port}`);
		console.log(`📊 Real-time network monitoring active`);
		console.log(`🤖 Kimi chat ready`);
		console.log(`\nPress Ctrl+C to stop\n`);

		// Graceful shutdown
		process.on("SIGINT", () => this.shutdown());
		process.on("SIGTERM", () => this.shutdown());
	}

	private handleHttpRequest(req: Request, server: any): Response | undefined {
		const url = new URL(req.url);

		// WebSocket upgrade
		if (url.pathname === "/ws") {
			const upgraded = server.upgrade(req, {
				data: { connectionId: crypto.randomUUID() },
			});
			if (upgraded) return undefined;
		}

		// Serve dashboard HTML
		if (url.pathname === "/" || url.pathname === "/index.html") {
			return new Response(DASHBOARD_HTML, {
				headers: { "Content-Type": "text/html" },
			});
		}

		return new Response("Not Found", { status: 404 });
	}

	private handleWebSocketOpen(ws: ServerWebSocket<WebSocketData>): void {
		const { connectionId } = ws.data;
		this.clients.set(connectionId, { ws, connectedAt: new Date() });
		this.log(`Client connected: ${connectionId.slice(0, 8)}...`, "info");

		// Send current status immediately
		this.broadcastStatus();
	}

	private async handleWebSocketMessage(
		ws: ServerWebSocket<WebSocketData>,
		message: string | Buffer,
	): Promise<void> {
		try {
			const data = JSON.parse(message.toString());

			if (data.type === "chat" && data.payload?.message) {
				await this.handleChatMessage(ws, data.payload.message);
			}
		} catch (error) {
			this.log(`WebSocket message error: ${(error as Error).message}`, "error");
		}
	}

	private async handleChatMessage(
		ws: ServerWebSocket<WebSocketData>,
		message: string,
	): Promise<void> {
		if (!this.kimiClient) {
			ws.send(
				JSON.stringify({
					type: "chat",
					payload: {
						role: "system",
						content: "Kimi client not initialized. Please check API key.",
					},
				}),
			);
			return;
		}

		try {
			this.log(`Chat request: "${message.slice(0, 50)}..."`, "info");

			const response = await this.kimiClient.chatCompletion([
				{ role: "user", content: message },
			]);

			const content = response.choices[0]?.message?.content || "No response";

			ws.send(
				JSON.stringify({
					type: "chat",
					payload: { role: "assistant", content },
				}),
			);

			this.log("Chat response sent", "info");
		} catch (error) {
			const errorMsg = (error as Error).message;
			this.log(`Chat error: ${errorMsg}`, "error");

			ws.send(
				JSON.stringify({
					type: "chat",
					payload: { role: "system", content: `Error: ${errorMsg}` },
				}),
			);
		}
	}

	private handleWebSocketClose(ws: ServerWebSocket<WebSocketData>): void {
		const { connectionId } = ws.data;
		this.clients.delete(connectionId);
		this.log(`Client disconnected: ${connectionId.slice(0, 8)}...`, "info");
	}

	private startDriftMonitoring(): void {
		// Monitor Kimi API
		this.driftMonitor.monitor("kimi-api", "https://api.moonshot.cn", {
			checkIntervalMs: 10000, // Check every 10 seconds
			thresholds: {
				latencyMs: 3000,
				latencyDriftPercent: 50,
				errorRatePercent: 10,
				timeoutMs: 10000,
				packetLossPercent: 5,
				jitterMs: 500,
			},
			onDriftAlert: (alert) => this.handleDriftAlert(alert),
		});

		// Broadcast status periodically
		this.monitorInterval = setInterval(() => {
			this.broadcastStatus();
		}, 2000);

		this.log("Drift monitoring started", "info");
	}

	private handleDriftAlert(alert: DriftAlert): void {
		this.log(
			`[DRIFT ALERT] ${alert.message}`,
			alert.severity === "critical" ? "error" : "warning",
		);

		// Broadcast to all clients
		const message = JSON.stringify({
			type: "alert",
			payload: alert,
		});

		for (const client of this.clients.values()) {
			client.ws.send(message);
		}
	}

	private broadcastStatus(): void {
		const monitor = this.driftMonitor.getMonitor("kimi-api");
		if (!monitor) return;

		const status = monitor.getStatus();
		const message = JSON.stringify({
			type: "status",
			payload: status,
		});

		for (const client of this.clients.values()) {
			client.ws.send(message);
		}
	}

	private log(message: string, level: string = "info"): void {
		const time = new Date().toLocaleTimeString();
		this.connectionLogs.unshift({ time, message, level });

		if (this.connectionLogs.length > 100) {
			this.connectionLogs.pop();
		}

		// Also broadcast to clients
		const logMessage = JSON.stringify({
			type: "log",
			payload: { message, level },
		});

		for (const client of this.clients.values()) {
			client.ws.send(logMessage);
		}

		// Console output with colors
		const color =
			level === "error"
				? "\x1b[31m"
				: level === "warning"
					? "\x1b[33m"
					: "\x1b[36m";
		console.log(`${color}[${time}] ${message}\x1b[0m`);
	}

	private shutdown(): void {
		console.log("\n\n🛑 Shutting down dev dashboard...");

		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
		}

		this.driftMonitor.stopAll();

		// Close all WebSocket connections
		for (const client of this.clients.values()) {
			client.ws.close();
		}

		console.log("✅ Dev dashboard stopped");
		process.exit(0);
	}
}

// Run if called directly
if (import.meta.main) {
	const server = new DevDashboardServer();
	server.start().catch(console.error);
}

export { DevDashboardServer };
