/**
 * @fileoverview Dashboard Client Class
 * @description Main dashboard client logic
 * @module apps/dashboard/src/dashboard-client
 */

/**
 * Dashboard Client
 * Manages WebSocket connections, UI updates, and graph visualization
 */
export class DashboardClient {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private readonly maxReconnectAttempts = 5;

	/**
	 * Initialize dashboard client
	 */
	init(): void {
		this.setupWebSocket();
		this.setupMetricsPolling();
		this.setupGraphVisualization();
	}

	/**
	 * Setup WebSocket connection
	 */
	private setupWebSocket(): void {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws/logs`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log('Dashboard: WebSocket connected');
				this.reconnectAttempts = 0;
			};

			this.ws.onmessage = (event) => {
				this.handleLogMessage(event.data);
			};

			this.ws.onerror = (error) => {
				console.error('Dashboard: WebSocket error:', error);
			};

			this.ws.onclose = () => {
				console.log('Dashboard: WebSocket disconnected');
				this.handleReconnect();
			};
		} catch (error) {
			console.error('Dashboard: Failed to create WebSocket:', error);
		}
	}

	/**
	 * Handle log message from WebSocket
	 */
	private handleLogMessage(data: string): void {
		try {
			const log = JSON.parse(data);
			this.appendLog(log);
		} catch (error) {
			console.error('Dashboard: Failed to parse log message:', error);
		}
	}

	/**
	 * Append log to UI
	 */
	private appendLog(log: any): void {
		const logContainer = document.getElementById('log-stream');
		if (!logContainer) return;

		const logElement = document.createElement('div');
		logElement.className = 'log-entry';
		logElement.textContent = JSON.stringify(log, null, 2);
		logContainer.appendChild(logElement);

		// Auto-scroll to bottom
		logContainer.scrollTop = logContainer.scrollHeight;
	}

	/**
	 * Handle WebSocket reconnection
	 */
	private handleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Dashboard: Max reconnection attempts reached');
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

		setTimeout(() => {
			console.log(`Dashboard: Reconnecting (attempt ${this.reconnectAttempts})...`);
			this.setupWebSocket();
		}, delay);
	}

	/**
	 * Setup metrics polling
	 */
	private setupMetricsPolling(): void {
		setInterval(async () => {
			try {
				const response = await fetch('/api/health');
				const health = await response.json();
				this.updateHealthStatus(health);
			} catch (error) {
				console.error('Dashboard: Failed to fetch health:', error);
			}
		}, 5000);
	}

	/**
	 * Update health status in UI
	 */
	private updateHealthStatus(health: any): void {
		const healthElement = document.getElementById('health-status');
		if (healthElement) {
			healthElement.textContent = health.status || 'unknown';
		}
	}

	/**
	 * Setup graph visualization
	 */
	private setupGraphVisualization(): void {
		// Graph visualization setup
		// This would integrate with your graph visualization library
		console.log('Dashboard: Graph visualization initialized');
	}
}
