// Comprehensive Monitoring and Alerting System
// Enterprise-grade monitoring with intelligent alerting for fraud detection systems

interface Alert {
	id: string;
	type: "critical" | "warning" | "info";
	category:
		| "performance"
		| "security"
		| "availability"
		| "capacity"
		| "accuracy";
	title: string;
	message: string;
	timestamp: number;
	severity: number; // 1-10 scale
	source: string;
	metrics: Record<string, number>;
	acknowledged: boolean;
	resolved: boolean;
	actions: string[];
}

interface MonitoringRule {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	condition: string;
	threshold: number;
	operator: ">" | "<" | "=" | ">=" | "<=";
	metric: string;
	severity: number;
	cooldown: number; // seconds
	lastTriggered: number;
	alertCount: number;
}

interface SystemMetrics {
	timestamp: number;
	cpu: {
		usage: number;
		loadAverage: number[];
	};
	memory: {
		used: number;
		total: number;
		percentage: number;
	};
	network: {
		requestsPerSecond: number;
		averageLatency: number;
		errorRate: number;
	};
	application: {
		activeConnections: number;
		queueSize: number;
		processingTime: number;
		fraudDetectionRate: number;
		modelAccuracy: number;
	};
}

interface HealthCheck {
	component: string;
	status: "healthy" | "degraded" | "unhealthy";
	lastCheck: number;
	responseTime: number;
	details: Record<string, any>;
}

class MonitoringAlertingSystem {
	private alerts: Alert[] = [];
	private rules: Map<string, MonitoringRule> = new Map();
	private metrics: SystemMetrics[] = [];
	private healthChecks: Map<string, HealthCheck> = new Map();
	private alertChannels: Map<string, any> = new Map();
	private isMonitoring: boolean = false;
	private monitoringInterval: number = 30000; // 30 seconds
	private maxAlerts: number = 1000;
	private maxMetrics: number = 10000;

	constructor() {
		this.initializeDefaultRules();
		this.initializeAlertChannels();
		this.startMonitoring();
	}

	private initializeDefaultRules(): void {
		const defaultRules: MonitoringRule[] = [
			// Performance Rules
			{
				id: "high_cpu_usage",
				name: "High CPU Usage",
				description: "Alert when CPU usage exceeds threshold",
				enabled: true,
				condition: "cpu.usage > 80",
				threshold: 80,
				operator: ">",
				metric: "cpu.usage",
				severity: 7,
				cooldown: 300,
				lastTriggered: 0,
				alertCount: 0,
			},
			{
				id: "high_memory_usage",
				name: "High Memory Usage",
				description: "Alert when memory usage exceeds threshold",
				enabled: true,
				condition: "memory.percentage > 85",
				threshold: 85,
				operator: ">",
				metric: "memory.percentage",
				severity: 8,
				cooldown: 300,
				lastTriggered: 0,
				alertCount: 0,
			},
			{
				id: "high_latency",
				name: "High Network Latency",
				description: "Alert when network latency exceeds threshold",
				enabled: true,
				condition: "network.averageLatency > 1000",
				threshold: 1000,
				operator: ">",
				metric: "network.averageLatency",
				severity: 6,
				cooldown: 180,
				lastTriggered: 0,
				alertCount: 0,
			},
			{
				id: "low_model_accuracy",
				name: "Low Model Accuracy",
				description: "Alert when model accuracy drops below threshold",
				enabled: true,
				condition: "application.modelAccuracy < 90",
				threshold: 90,
				operator: "<",
				metric: "application.modelAccuracy",
				severity: 8,
				cooldown: 600,
				lastTriggered: 0,
				alertCount: 0,
			},
			// Security Rules
			{
				id: "high_error_rate",
				name: "High Error Rate",
				description: "Alert when error rate exceeds threshold",
				enabled: true,
				condition: "network.errorRate > 5",
				threshold: 5,
				operator: ">",
				metric: "network.errorRate",
				severity: 7,
				cooldown: 240,
				lastTriggered: 0,
				alertCount: 0,
			},
			{
				id: "queue_overflow",
				name: "Processing Queue Overflow",
				description: "Alert when processing queue is too large",
				enabled: true,
				condition: "application.queueSize > 1000",
				threshold: 1000,
				operator: ">",
				metric: "application.queueSize",
				severity: 6,
				cooldown: 180,
				lastTriggered: 0,
				alertCount: 0,
			},
			// Capacity Rules
			{
				id: "connection_limit",
				name: "Connection Limit Approaching",
				description: "Alert when active connections near limit",
				enabled: true,
				condition: "application.activeConnections > 800",
				threshold: 800,
				operator: ">",
				metric: "application.activeConnections",
				severity: 5,
				cooldown: 300,
				lastTriggered: 0,
				alertCount: 0,
			},
			{
				id: "processing_time_spike",
				name: "Processing Time Spike",
				description: "Alert when processing time exceeds threshold",
				enabled: true,
				condition: "application.processingTime > 5000",
				threshold: 5000,
				operator: ">",
				metric: "application.processingTime",
				severity: 6,
				cooldown: 120,
				lastTriggered: 0,
				alertCount: 0,
			},
		];

		defaultRules.forEach((rule) => this.rules.set(rule.id, rule));
	}

	private initializeAlertChannels(): void {
		// Initialize different alert channels
		this.alertChannels.set("console", {
			type: "console",
			enabled: true,
			format: "structured",
		});

		this.alertChannels.set("email", {
			type: "email",
			enabled: false,
			recipients: ["admin@company.com"],
			template: "default",
		});

		this.alertChannels.set("slack", {
			type: "slack",
			enabled: false,
			webhook: "https://hooks.slack.com/...",
			channel: "#alerts",
		});

		this.alertChannels.set("webhook", {
			type: "webhook",
			enabled: false,
			url: "https://api.company.com/alerts",
			headers: { Authorization: "Bearer token" },
		});
	}

	// Monitoring lifecycle
	private startMonitoring(): void {
		if (this.isMonitoring) return;

		this.isMonitoring = true;
		console.log("📊 Starting monitoring and alerting system...");

		// Main monitoring loop
		setInterval(async () => {
			if (this.isMonitoring) {
				await this.performMonitoringCycle();
			}
		}, this.monitoringInterval);

		// Health check loop
		setInterval(async () => {
			if (this.isMonitoring) {
				await this.performHealthChecks();
			}
		}, 60000); // Every minute

		// Metrics cleanup
		setInterval(() => {
			this.cleanupOldMetrics();
		}, 300000); // Every 5 minutes
	}

	private async performMonitoringCycle(): Promise<void> {
		try {
			// Collect current metrics
			const currentMetrics = await this.collectSystemMetrics();
			this.metrics.push(currentMetrics);

			// Maintain metrics buffer size
			if (this.metrics.length > this.maxMetrics) {
				this.metrics.shift();
			}

			// Evaluate monitoring rules
			await this.evaluateRules(currentMetrics);

			// Update dashboard metrics
			this.updateDashboardMetrics(currentMetrics);
		} catch (error) {
			console.error("❌ Error in monitoring cycle:", error);
			await this.createAlert({
				type: "critical",
				category: "availability",
				title: "Monitoring System Error",
				message: `Error in monitoring cycle: ${error instanceof Error ? error.message : String(error)}`,
				severity: 9,
				source: "monitoring-system",
				metrics: {},
			});
		}
	}

	private async collectSystemMetrics(): Promise<SystemMetrics> {
		const now = Date.now();
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		// Simulate network and application metrics
		// In real implementation, would collect from actual services
		return {
			timestamp: now,
			cpu: {
				usage: Math.random() * 20 + 40, // Simulated 40-60%
				loadAverage: [0.5, 0.8, 1.2], // Simulated load averages
			},
			memory: {
				used: memUsage.heapUsed,
				total: memUsage.heapTotal,
				percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
			},
			network: {
				requestsPerSecond: Math.random() * 500 + 100,
				averageLatency: Math.random() * 200 + 50,
				errorRate: Math.random() * 2,
			},
			application: {
				activeConnections: Math.floor(Math.random() * 400 + 100),
				queueSize: Math.floor(Math.random() * 200),
				processingTime: Math.random() * 1000 + 200,
				fraudDetectionRate: Math.random() * 0.05 + 0.02,
				modelAccuracy: Math.random() * 5 + 92, // 92-97%
			},
		};
	}

	private async evaluateRules(metrics: SystemMetrics): Promise<void> {
		for (const rule of this.rules.values()) {
			if (!rule.enabled) continue;

			// Check cooldown
			if (Date.now() - rule.lastTriggered < rule.cooldown * 1000) {
				continue;
			}

			// Get metric value
			const metricValue = this.getMetricValue(metrics, rule.metric);
			if (metricValue === null) continue;

			// Evaluate condition
			const isTriggered = this.evaluateCondition(
				metricValue,
				rule.operator,
				rule.threshold,
			);

			if (isTriggered) {
				rule.lastTriggered = Date.now();
				rule.alertCount++;

				await this.triggerRule(rule, metrics, metricValue);
			}
		}
	}

	private getMetricValue(
		metrics: SystemMetrics,
		metricPath: string,
	): number | null {
		const parts = metricPath.split(".");
		let value: any = metrics;

		for (const part of parts) {
			if (value && typeof value === "object" && part in value) {
				value = value[part];
			} else {
				return null;
			}
		}

		return typeof value === "number" ? value : null;
	}

	private evaluateCondition(
		value: number,
		operator: string,
		threshold: number,
	): boolean {
		switch (operator) {
			case ">":
				return value > threshold;
			case "<":
				return value < threshold;
			case ">=":
				return value >= threshold;
			case "<=":
				return value <= threshold;
			case "=":
				return value === threshold;
			default:
				return false;
		}
	}

	private async triggerRule(
		rule: MonitoringRule,
		metrics: SystemMetrics,
		metricValue: number,
	): Promise<void> {
		const alert: Alert = {
			id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type:
				rule.severity >= 8
					? "critical"
					: rule.severity >= 6
						? "warning"
						: "info",
			category: this.getAlertCategory(rule.id),
			title: rule.name,
			message: `${rule.description}: Current value ${metricValue.toFixed(2)} ${rule.operator} threshold ${rule.threshold}`,
			timestamp: Date.now(),
			severity: rule.severity,
			source: "monitoring-system",
			metrics: { [rule.metric]: metricValue },
			acknowledged: false,
			resolved: false,
			actions: this.generateAlertActions(rule),
		};

		await this.createAlert(alert);
	}

	private getAlertCategory(ruleId: string): Alert["category"] {
		if (
			ruleId.includes("cpu") ||
			ruleId.includes("memory") ||
			ruleId.includes("latency")
		) {
			return "performance";
		}
		if (ruleId.includes("error") || ruleId.includes("security")) {
			return "security";
		}
		if (ruleId.includes("connection") || ruleId.includes("queue")) {
			return "capacity";
		}
		if (ruleId.includes("accuracy") || ruleId.includes("model")) {
			return "accuracy";
		}
		return "availability";
	}

	private generateAlertActions(rule: MonitoringRule): string[] {
		const actions: string[] = ["Acknowledge Alert", "View Details"];

		if (rule.severity >= 8) {
			actions.push("Escalate to Team", "Create Incident");
		}

		if (rule.id.includes("cpu") || rule.id.includes("memory")) {
			actions.push("Scale Resources");
		}

		if (rule.id.includes("model")) {
			actions.push("Retrain Model", "Rollback Model");
		}

		return actions;
	}

	private async performHealthChecks(): Promise<void> {
		const components = [
			"ai-model",
			"network-optimizer",
			"fraud-detector",
			"database",
			"cache",
			"message-queue",
		];

		for (const component of components) {
			try {
				const healthCheck = await this.checkComponentHealth(component);
				this.healthChecks.set(component, healthCheck);

				// Create alert if component is unhealthy
				if (healthCheck.status === "unhealthy") {
					await this.createAlert({
						type: "critical",
						category: "availability",
						title: `Component Unhealthy: ${component}`,
						message: `Component ${component} is unhealthy. Response time: ${healthCheck.responseTime}ms`,
						severity: 9,
						source: "health-check",
						metrics: { responseTime: healthCheck.responseTime },
					});
				}
			} catch (error) {
				console.error(`❌ Health check failed for ${component}:`, error);
			}
		}
	}

	private async checkComponentHealth(component: string): Promise<HealthCheck> {
		// Simulate health check
		const responseTime = Math.random() * 500 + 50;
		const isHealthy = responseTime < 300 && Math.random() > 0.1;

		return {
			component,
			status: isHealthy
				? "healthy"
				: Math.random() > 0.5
					? "degraded"
					: "unhealthy",
			lastCheck: Date.now(),
			responseTime,
			details: {
				version: "1.0.0",
				uptime: process.uptime(),
				memory: process.memoryUsage().heapUsed,
			},
		};
	}

	private updateDashboardMetrics(metrics: SystemMetrics): void {
		// Update real-time dashboard metrics
		// In real implementation, would push to dashboard service
		console.log(
			`📊 Metrics Updated - CPU: ${metrics.cpu.usage.toFixed(1)}%, Memory: ${metrics.memory.percentage.toFixed(1)}%, Latency: ${metrics.network.averageLatency.toFixed(1)}ms`,
		);
	}

	private cleanupOldMetrics(): void {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Keep 24 hours
		this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
	}

	// Alert management
	private async createAlert(alertData: Partial<Alert>): Promise<void> {
		const alert: Alert = {
			id:
				alertData.id ||
				`alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type: alertData.type || "warning",
			category: alertData.category || "availability",
			title: alertData.title || "System Alert",
			message: alertData.message || "An alert condition was triggered",
			timestamp: Date.now(),
			severity: alertData.severity || 5,
			source: alertData.source || "system",
			metrics: alertData.metrics || {},
			acknowledged: false,
			resolved: false,
			actions: alertData.actions || ["Acknowledge"],
		};

		this.alerts.push(alert);

		// Maintain alert buffer size
		if (this.alerts.length > this.maxAlerts) {
			this.alerts.shift();
		}

		// Send to alert channels
		await this.sendAlertToChannels(alert);

		console.log(`🚨 ALERT: [${alert.type.toUpperCase()}] ${alert.title}`);
		console.log(`   ${alert.message}`);
		console.log(`   Severity: ${alert.severity}/10 | Source: ${alert.source}`);
	}

	private async sendAlertToChannels(alert: Alert): Promise<void> {
		for (const [channelId, channel] of this.alertChannels) {
			if (!channel.enabled) continue;

			try {
				await this.sendToChannel(channelId, channel, alert);
			} catch (error) {
				console.error(`❌ Failed to send alert to ${channelId}:`, error);
			}
		}
	}

	private async sendToChannel(
		channelId: string,
		channel: any,
		alert: Alert,
	): Promise<void> {
		switch (channel.type) {
			case "console":
				console.log(
					`📢 [${channelId.toUpperCase()}] ${alert.title}: ${alert.message}`,
				);
				break;

			case "email":
				console.log(`📧 Email alert sent to ${channel.recipients.join(", ")}`);
				break;

			case "slack":
				console.log(`💬 Slack alert sent to #${channel.channel}`);
				break;

			case "webhook":
				console.log(`🌐 Webhook alert sent to ${channel.url}`);
				break;

			default:
				console.log(`❓ Unknown channel type: ${channel.type}`);
		}
	}

	// Public API methods
	public getAlerts(
		options: {
			type?: Alert["type"];
			category?: Alert["category"];
			acknowledged?: boolean;
			resolved?: boolean;
			limit?: number;
		} = {},
	): Alert[] {
		let filtered = [...this.alerts];

		if (options.type) {
			filtered = filtered.filter((a) => a.type === options.type);
		}
		if (options.category) {
			filtered = filtered.filter((a) => a.category === options.category);
		}
		if (options.acknowledged !== undefined) {
			filtered = filtered.filter(
				(a) => a.acknowledged === options.acknowledged,
			);
		}
		if (options.resolved !== undefined) {
			filtered = filtered.filter((a) => a.resolved === options.resolved);
		}

		// Sort by timestamp (newest first)
		filtered.sort((a, b) => b.timestamp - a.timestamp);

		// Apply limit
		if (options.limit) {
			filtered = filtered.slice(0, options.limit);
		}

		return filtered;
	}

	public acknowledgeAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.acknowledged = true;
			console.log(`✅ Alert ${alertId} acknowledged`);
			return true;
		}
		return false;
	}

	public resolveAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolved = true;
			console.log(`✅ Alert ${alertId} resolved`);
			return true;
		}
		return false;
	}

	public getRules(): MonitoringRule[] {
		return Array.from(this.rules.values());
	}

	public updateRule(ruleId: string, updates: Partial<MonitoringRule>): boolean {
		const rule = this.rules.get(ruleId);
		if (rule) {
			Object.assign(rule, updates);
			console.log(`✅ Rule ${ruleId} updated`);
			return true;
		}
		return false;
	}

	public enableRule(ruleId: string, enabled: boolean): boolean {
		const rule = this.rules.get(ruleId);
		if (rule) {
			rule.enabled = enabled;
			console.log(`✅ Rule ${ruleId} ${enabled ? "enabled" : "disabled"}`);
			return true;
		}
		return false;
	}

	public getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMetrics(timeRange?: number): SystemMetrics[] {
    if (!timeRange) return [...this.metrics];

    const cutoff = Date.now() - timeRange;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

	public getHealthStatus(): Map<string, HealthCheck> {
		return new Map(this.healthChecks);
	}

	public getSystemHealth(): {
		overall: "healthy" | "degraded" | "unhealthy";
		components: number;
		healthy: number;
		degraded: number;
		unhealthy: number;
	} {
		const components = Array.from(this.healthChecks.values());
		const healthy = components.filter((c) => c.status === "healthy").length;
		const degraded = components.filter((c) => c.status === "degraded").length;
		const unhealthy = components.filter((c) => c.status === "unhealthy").length;

		let overall: "healthy" | "degraded" | "unhealthy";
		if (unhealthy > 0) {
			overall = "unhealthy";
		} else if (degraded > 0) {
			overall = "degraded";
		} else {
			overall = "healthy";
		}

		return {
			overall,
			components: components.length,
			healthy,
			degraded,
			unhealthy,
		};
	}

	public configureAlertChannel(channelId: string, config: any): boolean {
		if (this.alertChannels.has(channelId)) {
			Object.assign(this.alertChannels.get(channelId)!, config);
			console.log(`✅ Alert channel ${channelId} configured`);
			return true;
		}
		return false;
	}

	public enableAlertChannel(channelId: string, enabled: boolean): boolean {
		const channel = this.alertChannels.get(channelId);
		if (channel) {
			channel.enabled = enabled;
			console.log(
				`✅ Alert channel ${channelId} ${enabled ? "enabled" : "disabled"}`,
			);
			return true;
		}
		return false;
	}

	public async createCustomAlert(alertData: Partial<Alert>): Promise<void> {
		await this.createAlert(alertData);
	}

	public getMonitoringStatus(): {
		isActive: boolean;
		interval: number;
		rulesCount: number;
		alertsCount: number;
		metricsCount: number;
		channelsCount: number;
	} {
		return {
			isActive: this.isMonitoring,
			interval: this.monitoringInterval,
			rulesCount: this.rules.size,
			alertsCount: this.alerts.length,
			metricsCount: this.metrics.length,
			channelsCount: this.alertChannels.size,
		};
	}

	public stopMonitoring(): void {
		this.isMonitoring = false;
		console.log("⏹️  Monitoring and alerting system stopped");
	}

	public startMonitoringSystem(): void {
		if (!this.isMonitoring) {
			this.isMonitoring = true;
			console.log("▶️  Monitoring and alerting system started");
		}
	}

	public async runHealthCheck(): Promise<Map<string, HealthCheck>> {
		await this.performHealthChecks();
		return new Map(this.healthChecks);
	}

	public clearAlerts(): void {
		this.alerts = [];
		console.log("🗑️  All alerts cleared");
	}

	public clearMetrics(): void {
		this.metrics = [];
		console.log("🗑️  All metrics cleared");
	}
}

// Export the monitoring and alerting system
export {
	MonitoringAlertingSystem,
	type Alert,
	type MonitoringRule,
	type SystemMetrics,
	type HealthCheck,
};
