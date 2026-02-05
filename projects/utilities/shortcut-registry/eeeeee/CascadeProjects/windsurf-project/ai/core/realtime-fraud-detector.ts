// Real-Time Fraud Detection with Streaming Data Processing
// Enterprise-grade streaming analytics for immediate fraud detection

interface StreamEvent {
	id: string;
	timestamp: number;
	type: "transaction" | "login" | "api_call" | "device_check" | "behavioral";
	userId: string;
	sessionId: string;
	data: Record<string, any>;
	source: string;
	priority: "low" | "medium" | "high" | "critical";
}

interface FraudSignal {
	eventId: string;
	score: number;
	riskLevel: "low" | "medium" | "high" | "critical";
	confidence: number;
	factors: string[];
	timestamp: number;
	requiresAction: boolean;
	recommendations: string[];
}

interface StreamProcessor {
	id: string;
	name: string;
	isActive: boolean;
	eventsProcessed: number;
	averageLatency: number;
	lastActivity: number;
	errorRate: number;
}

interface StreamMetrics {
	totalEvents: number;
	eventsPerSecond: number;
	averageProcessingTime: number;
	fraudDetectionRate: number;
	falsePositiveRate: number;
	alertResponseTime: number;
	throughput: number;
}

interface TimeWindow {
	start: number;
	end: number;
	events: StreamEvent[];
	signals: FraudSignal[];
}

class RealTimeFraudDetector {
	private eventStream: Map<string, StreamEvent[]> = new Map();
	private processors: Map<string, StreamProcessor> = new Map();
	private signalBuffer: FraudSignal[] = [];
	private timeWindows: Map<string, TimeWindow> = new Map();
	private metrics: StreamMetrics;
	private maxBufferSize: number = 10000;
	private windowSizeMs: number = 60000; // 1 minute windows
	private alertThreshold: number = 0.8;
	private isProcessing: boolean = false;
	private processingQueue: StreamEvent[] = [];

	constructor() {
		this.metrics = {
			totalEvents: 0,
			eventsPerSecond: 0,
			averageProcessingTime: 0,
			fraudDetectionRate: 0,
			falsePositiveRate: 0,
			alertResponseTime: 0,
			throughput: 0,
		};

		this.initializeProcessors();
		this.startStreamProcessing();
		this.startMetricsCollection();
	}

	private initializeProcessors(): void {
		// Initialize different stream processors for various fraud detection patterns
		const processors = [
			{
				id: "transaction_analyzer",
				name: "Transaction Pattern Analyzer",
				isActive: true,
			},
			{
				id: "behavioral_detector",
				name: "Behavioral Anomaly Detector",
				isActive: true,
			},
			{
				id: "velocity_checker",
				name: "Velocity Pattern Checker",
				isActive: true,
			},
			{
				id: "device_fingerprinter",
				name: "Device Fingerprint Analyzer",
				isActive: true,
			},
			{
				id: "network_analyzer",
				name: "Network Pattern Analyzer",
				isActive: true,
			},
			{
				id: "geolocation_checker",
				name: "Geolocation Anomaly Detector",
				isActive: true,
			},
		];

		processors.forEach((processor) => {
			this.processors.set(processor.id, {
				...processor,
				eventsProcessed: 0,
				averageLatency: 0,
				lastActivity: Date.now(),
				errorRate: 0,
			});
		});
	}

	// Stream event ingestion
	public async ingestEvent(event: StreamEvent): Promise<void> {
		// Add event to processing queue
		this.processingQueue.push(event);

		// Maintain queue size
		if (this.processingQueue.length > this.maxBufferSize) {
			this.processingQueue.shift();
		}

		// Update metrics
		this.metrics.totalEvents++;
		this.updateEventsPerSecond();

		// Trigger immediate processing for high-priority events
		if (event.priority === "critical" || event.priority === "high") {
			await this.processEvent(event);
		}
	}

	private startStreamProcessing(): void {
		setInterval(async () => {
			if (!this.isProcessing && this.processingQueue.length > 0) {
				await this.processBatch();
			}
		}, 100); // Process every 100ms
	}

	private async processBatch(): Promise<void> {
		if (this.isProcessing) return;

		this.isProcessing = true;
		const startTime = Date.now();

		try {
			// Process events in batches
			const batchSize = Math.min(100, this.processingQueue.length);
			const batch = this.processingQueue.splice(0, batchSize);

			const processingPromises = batch.map((event) => this.processEvent(event));
			await Promise.all(processingPromises);

			// Update metrics
			const processingTime = Date.now() - startTime;
			this.updateProcessingMetrics(batchSize, processingTime);
		} catch (error) {
			console.error("❌ Error processing batch:", error);
		} finally {
			this.isProcessing = false;
		}
	}

	private async processEvent(event: StreamEvent): Promise<FraudSignal | null> {
		const startTime = Date.now();

		try {
			// Add event to time window
			this.addToTimeWindow(event);

			// Run through active processors
			const processorResults = await this.runProcessors(event);

			// Aggregate results and generate fraud signal
			const signal = this.aggregateProcessorResults(event, processorResults);

			if (signal) {
				await this.handleFraudSignal(signal);
			}

			// Update processor metrics
			const processingTime = Date.now() - startTime;
			this.updateProcessorMetrics(event.type, processingTime, !signal);

			return signal;
		} catch (error) {
			console.error(`❌ Error processing event ${event.id}:`, error);
			return null;
		}
	}

	private addToTimeWindow(event: StreamEvent): void {
		const windowKey = this.getWindowKey(event.timestamp);

		if (!this.timeWindows.has(windowKey)) {
			this.timeWindows.set(windowKey, {
				start: event.timestamp,
				end: event.timestamp + this.windowSizeMs,
				events: [],
				signals: [],
			});
		}

		const window = this.timeWindows.get(windowKey)!;
		window.events.push(event);

		// Clean old windows
		this.cleanupOldWindows();
	}

	private getWindowKey(timestamp: number): string {
		return Math.floor(timestamp / this.windowSizeMs).toString();
	}

	private cleanupOldWindows(): void {
		const now = Date.now();
		const expiredWindows: string[] = [];

		for (const [key, window] of this.timeWindows) {
			if (window.end < now - this.windowSizeMs * 2) {
				expiredWindows.push(key);
			}
		}

		for (const key of expiredWindows) {
			this.timeWindows.delete(key);
		}
	}

	private async runProcessors(event: StreamEvent): Promise<
		Array<{
			processorId: string;
			score: number;
			factors: string[];
			confidence: number;
		}>
	> {
		const results = [];

		for (const [processorId, processor] of this.processors) {
			if (!processor.isActive) continue;

			try {
				const result = await this.runProcessor(processorId, event);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				console.error(`❌ Processor ${processorId} failed:`, error);
				processor.errorRate = Math.min(1.0, processor.errorRate + 0.01);
			}
		}

		return results;
	}

	private async runProcessor(
		processorId: string,
		event: StreamEvent,
	): Promise<{
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null> {
		const processor = this.processors.get(processorId);
		if (!processor) return null;

		switch (processorId) {
			case "transaction_analyzer":
				return this.analyzeTransactionPatterns(event);
			case "behavioral_detector":
				return this.detectBehavioralAnomalies(event);
			case "velocity_checker":
				return this.checkVelocityPatterns(event);
			case "device_fingerprinter":
				return this.analyzeDeviceFingerprint(event);
			case "network_analyzer":
				return this.analyzeNetworkPatterns(event);
			case "geolocation_checker":
				return this.checkGeolocationAnomalies(event);
			default:
				return null;
		}
	}

	private analyzeTransactionPatterns(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		if (event.type !== "transaction") return null;

		const data = event.data;
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.8;

		// Amount analysis
		if (data.amount > 10000) {
			score += 0.3;
			factors.push("High transaction amount");
		}

		// Frequency analysis
		const recentTransactions = this.getRecentEvents(
			event.userId,
			"transaction",
			300000,
		); // 5 minutes
		if (recentTransactions.length > 10) {
			score += 0.4;
			factors.push("High transaction frequency");
		}

		// Unusual merchant
		if (data.merchant && data.merchant.isNew) {
			score += 0.2;
			factors.push("Transaction with new merchant");
		}

		// Cross-border transaction
		if (data.isCrossBorder) {
			score += 0.2;
			factors.push("Cross-border transaction");
		}

		return {
			processorId: "transaction_analyzer",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private detectBehavioralAnomalies(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.7;

		// Time-based anomalies
		const hour = new Date(event.timestamp).getHours();
		if (hour < 6 || hour > 22) {
			score += 0.2;
			factors.push("Unusual activity time");
		}

		// Device changes
		const recentDevices = this.getRecentDevices(event.userId, 86400000); // 24 hours
		if (recentDevices.size > 3) {
			score += 0.3;
			factors.push("Multiple devices used");
		}

		// Location changes
		const recentLocations = this.getRecentLocations(event.userId, 3600000); // 1 hour
		if (recentLocations.size > 2) {
			score += 0.4;
			factors.push("Multiple locations in short time");
		}

		// Session patterns
		const sessionDuration = event.data.sessionDuration || 0;
		if (sessionDuration < 30) {
			score += 0.1;
			factors.push("Very short session");
		}

		return {
			processorId: "behavioral_detector",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private checkVelocityPatterns(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.9;

		const now = event.timestamp;

		// Check velocity over different time periods
		const periods = [
			{ ms: 60000, threshold: 5, name: "1 minute" }, // 5 events per minute
			{ ms: 300000, threshold: 20, name: "5 minutes" }, // 20 events per 5 minutes
			{ ms: 3600000, threshold: 100, name: "1 hour" }, // 100 events per hour
		];

		for (const period of periods) {
			const recentEvents = this.getRecentEvents(
				event.userId,
				event.type,
				period.ms,
			);
			if (recentEvents.length > period.threshold) {
				score += 0.3;
				factors.push(
					`High velocity: ${recentEvents.length} events in ${period.name}`,
				);
			}
		}

		// Check for rapid successive events
		const veryRecentEvents = this.getRecentEvents(
			event.userId,
			event.type,
			10000,
		); // 10 seconds
		if (veryRecentEvents.length > 3) {
			score += 0.4;
			factors.push("Rapid successive events");
		}

		return {
			processorId: "velocity_checker",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private analyzeDeviceFingerprint(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		if (!event.data.deviceFingerprint) return null;

		const fingerprint = event.data.deviceFingerprint;
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.8;

		// Root/jailbreak detection
		if (fingerprint.isRooted) {
			score += 0.5;
			factors.push("Device is rooted/jailbroken");
		}

		// Emulator detection
		if (fingerprint.isEmulator) {
			score += 0.4;
			factors.push("Emulator detected");
		}

		// VPN/Proxy detection
		if (fingerprint.hasVPN || fingerprint.hasProxy) {
			score += 0.2;
			factors.push("VPN or proxy detected");
		}

		// Suspicious user agent
		if (fingerprint.hasSuspiciousUserAgent) {
			score += 0.2;
			factors.push("Suspicious user agent");
		}

		// New device
		const knownDevices = this.getKnownDevices(event.userId);
		if (!knownDevices.has(fingerprint.id)) {
			score += 0.1;
			factors.push("New device for user");
		}

		return {
			processorId: "device_fingerprinter",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private analyzeNetworkPatterns(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		if (!event.data.networkInfo) return null;

		const network = event.data.networkInfo;
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.7;

		// High latency
		if (network.latency > 1000) {
			score += 0.2;
			factors.push("High network latency");
		}

		// Unusual IP
		if (network.isSuspiciousIP) {
			score += 0.4;
			factors.push("Suspicious IP address");
		}

		// Tor exit node
		if (network.isTorExitNode) {
			score += 0.5;
			factors.push("Tor exit node detected");
		}

		// Data center IP
		if (network.isDataCenterIP) {
			score += 0.3;
			factors.push("Data center IP address");
		}

		return {
			processorId: "network_analyzer",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private checkGeolocationAnomalies(event: StreamEvent): {
		processorId: string;
		score: number;
		factors: string[];
		confidence: number;
	} | null {
		if (!event.data.location) return null;

		const location = event.data.location;
		let score = 0;
		const factors: string[] = [];
		const confidence = 0.8;

		// Impossible travel
		const lastLocation = this.getLastLocation(event.userId);
		if (
			lastLocation &&
			this.isImpossibleTravel(lastLocation, location, event.timestamp)
		) {
			score += 0.6;
			factors.push("Impossible travel detected");
		}

		// High-risk country
		if (location.isHighRiskCountry) {
			score += 0.3;
			factors.push("High-risk country");
		}

		// Unusual location for user
		const userLocations = this.getUserLocations(event.userId);
		if (!userLocations.has(location.country)) {
			score += 0.2;
			factors.push("Unusual country for user");
		}

		return {
			processorId: "geolocation_checker",
			score: Math.min(1.0, score),
			factors,
			confidence,
		};
	}

	private aggregateProcessorResults(
		event: StreamEvent,
		processorResults: Array<{
			processorId: string;
			score: number;
			factors: string[];
			confidence: number;
		}>,
	): FraudSignal | null {
		if (processorResults.length === 0) return null;

		// Weighted aggregation of processor results
		let totalScore = 0;
		let totalWeight = 0;
		const allFactors: string[] = [];
		let minConfidence = 1.0;

		for (const result of processorResults) {
			const weight = result.confidence;
			totalScore += result.score * weight;
			totalWeight += weight;
			allFactors.push(...result.factors);
			minConfidence = Math.min(minConfidence, result.confidence);
		}

		const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

		// Only generate signal if score exceeds threshold
		if (finalScore >= this.alertThreshold) {
			return {
				eventId: event.id,
				score: finalScore,
				riskLevel: this.determineRiskLevel(finalScore),
				confidence: minConfidence,
				factors: [...new Set(allFactors)], // Remove duplicates
				timestamp: Date.now(),
				requiresAction: finalScore >= 0.9,
				recommendations: this.generateRecommendations(finalScore, allFactors),
			};
		}

		return null;
	}

	private determineRiskLevel(
		score: number,
	): "low" | "medium" | "high" | "critical" {
		if (score >= 0.9) return "critical";
		if (score >= 0.8) return "high";
		if (score >= 0.6) return "medium";
		return "low";
	}

	private generateRecommendations(score: number, factors: string[]): string[] {
		const recommendations: string[] = [];

		if (score >= 0.9) {
			recommendations.push("🚨 BLOCK TRANSACTION IMMEDIATELY");
			recommendations.push("Require manual review");
			recommendations.push("Lock user account temporarily");
		} else if (score >= 0.8) {
			recommendations.push("⚠️ REQUIRE ADDITIONAL VERIFICATION");
			recommendations.push("Limit transaction amount");
			recommendations.push("Enable enhanced monitoring");
		} else if (score >= 0.6) {
			recommendations.push("🔍 STEP UP AUTHENTICATION");
			recommendations.push("Monitor user behavior");
			recommendations.push("Consider transaction limits");
		}

		// Factor-specific recommendations
		if (factors.includes("High transaction amount")) {
			recommendations.push("Verify large transaction with user");
		}
		if (factors.includes("Device is rooted/jailbroken")) {
			recommendations.push("Block transactions from rooted devices");
		}
		if (factors.includes("Impossible travel detected")) {
			recommendations.push("Require location verification");
		}

		return recommendations;
	}

	private async handleFraudSignal(signal: FraudSignal): Promise<void> {
		// Add to signal buffer
		this.signalBuffer.push(signal);

		// Maintain buffer size
		if (this.signalBuffer.length > this.maxBufferSize) {
			this.signalBuffer.shift();
		}

		// Update metrics
		this.metrics.fraudDetectionRate =
			this.signalBuffer.length / Math.max(1, this.metrics.totalEvents);

		// Trigger immediate actions for critical signals
		if (signal.riskLevel === "critical") {
			await this.triggerImmediateAction(signal);
		}

		// Log signal
		console.log(
			`🚨 FRAUD DETECTED: ${signal.riskLevel.toUpperCase()} (Score: ${signal.score.toFixed(3)})`,
		);
		console.log(`   Event: ${signal.eventId}`);
		console.log(`   Factors: ${signal.factors.join(", ")}`);
		console.log(`   Recommendations: ${signal.recommendations.join(", ")}`);
	}

	private async triggerImmediateAction(signal: FraudSignal): Promise<void> {
		const responseTime = Date.now() - signal.timestamp;
		this.metrics.alertResponseTime =
			(this.metrics.alertResponseTime + responseTime) / 2;

		// In real implementation, would trigger actual actions:
		// - Block transaction
		// - Lock account
		// - Send alerts
		// - Notify security team

		console.log(
			`⚡ Immediate action triggered for ${signal.eventId} (${responseTime}ms)`,
		);
	}

	// Helper methods for data retrieval
	private getRecentEvents(
		userId: string,
		eventType: string,
		timeMs: number,
	): StreamEvent[] {
		const cutoff = Date.now() - timeMs;
		const recentEvents: StreamEvent[] = [];

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (
					event.userId === userId &&
					event.type === eventType &&
					event.timestamp >= cutoff
				) {
					recentEvents.push(event);
				}
			}
		}

		return recentEvents;
	}

	private getRecentDevices(userId: string, timeMs: number): Set<string> {
		const devices = new Set<string>();
		const cutoff = Date.now() - timeMs;

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (
					event.userId === userId &&
					event.timestamp >= cutoff &&
					event.data.deviceFingerprint
				) {
					devices.add(event.data.deviceFingerprint.id);
				}
			}
		}

		return devices;
	}

	private getRecentLocations(userId: string, timeMs: number): Set<string> {
		const locations = new Set<string>();
		const cutoff = Date.now() - timeMs;

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (
					event.userId === userId &&
					event.timestamp >= cutoff &&
					event.data.location
				) {
					locations.add(event.data.location.country);
				}
			}
		}

		return locations;
	}

	private getKnownDevices(userId: string): Set<string> {
		const devices = new Set<string>();

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (event.userId === userId && event.data.deviceFingerprint) {
					devices.add(event.data.deviceFingerprint.id);
				}
			}
		}

		return devices;
	}

	private getLastLocation(userId: string): any {
		let lastLocation = null;
		let lastTimestamp = 0;

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (
					event.userId === userId &&
					event.data.location &&
					event.timestamp > lastTimestamp
				) {
					lastLocation = event.data.location;
					lastTimestamp = event.timestamp;
				}
			}
		}

		return lastLocation;
	}

	private getUserLocations(userId: string): Set<string> {
		const locations = new Set<string>();

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (event.userId === userId && event.data.location) {
					locations.add(event.data.location.country);
				}
			}
		}

		return locations;
	}

	private isImpossibleTravel(
		lastLocation: any,
		currentLocation: any,
		currentTime: number,
	): boolean {
		if (!lastLocation || !currentLocation) return false;

		// Calculate distance between locations (simplified)
		const distance = this.calculateDistance(
			lastLocation.latitude,
			lastLocation.longitude,
			currentLocation.latitude,
			currentLocation.longitude,
		);

		// Calculate time difference
		const timeDiff = currentTime - lastLocation.timestamp;

		// Check if travel is impossible (faster than 900 km/h commercial flight speed)
		const maxPossibleDistance = (timeDiff / 1000 / 3600) * 900; // km

		return distance > maxPossibleDistance;
	}

	private calculateDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number,
	): number {
		// Haversine formula (simplified)
		const R = 6371; // Earth's radius in km
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Metrics and monitoring
	private startMetricsCollection(): void {
		setInterval(() => {
			this.updateMetrics();
		}, 5000); // Update every 5 seconds
	}

	private updateEventsPerSecond(): void {
		const now = Date.now();
		const recentEvents = this.getEventsInTimeWindow(now - 60000, now);
		this.metrics.eventsPerSecond = recentEvents.length / 60;
	}

	private getEventsInTimeWindow(start: number, end: number): StreamEvent[] {
		const events: StreamEvent[] = [];

		for (const window of this.timeWindows.values()) {
			for (const event of window.events) {
				if (event.timestamp >= start && event.timestamp <= end) {
					events.push(event);
				}
			}
		}

		return events;
	}

	private updateProcessorMetrics(
		eventType: string,
		processingTime: number,
		success: boolean,
	): void {
		// Update relevant processor metrics
		for (const processor of this.processors.values()) {
			processor.eventsProcessed++;
			processor.averageLatency =
				(processor.averageLatency + processingTime) / 2;
			processor.lastActivity = Date.now();

			if (!success) {
				processor.errorRate = Math.min(1.0, processor.errorRate + 0.01);
			}
		}
	}

	private updateProcessingMetrics(
		eventCount: number,
		processingTime: number,
	): void {
		this.metrics.averageProcessingTime =
			(this.metrics.averageProcessingTime + processingTime) / 2;
		this.metrics.throughput = eventCount / (processingTime / 1000); // events per second
	}

	private updateMetrics(): void {
		this.updateEventsPerSecond();

		// Calculate false positive rate (simplified)
		const totalSignals = this.signalBuffer.length;
		const confirmedFraud = Math.floor(totalSignals * 0.7); // Assume 70% are real fraud
		this.metrics.falsePositiveRate =
			totalSignals > 0 ? (totalSignals - confirmedFraud) / totalSignals : 0;
	}

	// Public API
	public getStreamMetrics(): StreamMetrics & {
		activeProcessors: number;
		queueSize: number;
		signalCount: number;
		timeWindowCount: number;
	} {
		return {
			...this.metrics,
			activeProcessors: Array.from(this.processors.values()).filter(
				(p) => p.isActive,
			).length,
			queueSize: this.processingQueue.length,
			signalCount: this.signalBuffer.length,
			timeWindowCount: this.timeWindows.size,
		};
	}

	public getProcessorStatus(): Array<{
		id: string;
		name: string;
		isActive: boolean;
		eventsProcessed: number;
		averageLatency: number;
		errorRate: number;
		lastActivity: number;
	}> {
		return Array.from(this.processors.values()).map((processor) => ({
			id: processor.id,
			name: processor.name,
			isActive: processor.isActive,
			eventsProcessed: processor.eventsProcessed,
			averageLatency: processor.averageLatency,
			errorRate: processor.errorRate,
			lastActivity: processor.lastActivity,
		}));
	}

	public getRecentSignals(limit: number = 50): FraudSignal[] {
		return this.signalBuffer.slice(-limit);
	}

	public setAlertThreshold(threshold: number): void {
		this.alertThreshold = Math.max(0.1, Math.min(1.0, threshold));
	}

	public enableProcessor(processorId: string, enabled: boolean): void {
		const processor = this.processors.get(processorId);
		if (processor) {
			processor.isActive = enabled;
		}
	}

	public async clearBuffers(): Promise<void> {
		this.processingQueue = [];
		this.signalBuffer = [];
		this.timeWindows.clear();
		console.log("🗑️ Stream buffers cleared");
	}
}

// Export the real-time fraud detector
export {
	RealTimeFraudDetector,
	type StreamEvent,
	type FraudSignal,
	type StreamProcessor,
	type StreamMetrics,
};

// Demo and testing section
async function demonstrateRealTimeFraudDetection() {
	console.log("🔥 Real-Time Fraud Detection - Streaming Analytics Demo");
	console.log("=" .repeat(60));

	// Initialize the real-time fraud detector
	const detector = new RealTimeFraudDetector();

	console.log("✅ Real-Time Fraud Detector initialized");
	const metrics = detector.getStreamMetrics();
	console.log(`📊 Total events: ${metrics.totalEvents}`);
	console.log(`⚡ Processing active: Yes`); // Constructor auto-starts processing

	// Simulate real-time events
	console.log("\n📡 Simulating real-time event stream...");
	
	const generateEvent = (type: StreamEvent['type'], risk: 'low' | 'medium' | 'high' | 'critical'): StreamEvent => ({
		id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: Date.now(),
		type: type || 'transaction', // Default to transaction if undefined
		userId: `user_${Math.floor(Math.random() * 1000)}`,
		sessionId: `session_${Math.floor(Math.random() * 100)}`,
		data: {
			amount: Math.floor(Math.random() * 10000),
			ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			deviceFingerprint: `fp_${Math.random().toString(36).substr(2, 9)}`,
			location: { country: 'US', city: 'New York' },
		},
		source: 'mobile_app',
		priority: risk,
	});

	// Generate different types of events
	const eventTypes: StreamEvent['type'][] = ['transaction', 'login', 'api_call', 'device_check', 'behavioral'];
	const riskLevels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

	// Stream events in real-time
	for (let i = 0; i < 50; i++) {
		const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)] || 'transaction';
		const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)] || 'low';
		const event = generateEvent(eventType, riskLevel);
		
		// Ingest the event instead of processing it directly
		await detector.ingestEvent(event);
		
		// Get recent signals to check for fraud detection
		const recentSignals = detector.getRecentSignals(5);
		if (recentSignals.length > 0) {
			const latestSignal = recentSignals[recentSignals.length - 1];
			if (latestSignal && latestSignal.riskLevel !== 'low') {
				console.log(`🚨 ${latestSignal.riskLevel.toUpperCase()} RISK DETECTED:`);
				console.log(`   Event ID: ${latestSignal.eventId}`);
				console.log(`   Score: ${(latestSignal.score * 100).toFixed(2)}%`);
				console.log(`   Confidence: ${(latestSignal.confidence * 100).toFixed(2)}%`);
				console.log(`   Factors: ${latestSignal.factors.join(', ')}`);
			}
		}
		
		// Small delay to simulate real-time streaming
		await new Promise(resolve => setTimeout(resolve, 50));
	}

	// Get processing metrics
	console.log("\n📊 Stream Processing Metrics:");
	const finalMetrics = detector.getStreamMetrics();
	console.log(`   Events Processed: ${finalMetrics.totalEvents}`);
	console.log(`   Events Per Second: ${finalMetrics.eventsPerSecond.toFixed(2)}`);
	console.log(`   Average Processing Time: ${finalMetrics.averageProcessingTime.toFixed(2)}ms`);
	console.log(`   Fraud Detection Rate: ${(finalMetrics.fraudDetectionRate * 100).toFixed(2)}%`);
	console.log(`   Throughput: ${finalMetrics.throughput.toFixed(2)} events/sec`);

	// Test pattern detection
	console.log("\n🔍 Testing pattern detection...");
	const suspiciousEvents = [
		generateEvent('transaction', 'high'),
		generateEvent('transaction', 'high'),
		generateEvent('login', 'critical'),
		generateEvent('api_call', 'high'),
	];

	for (const event of suspiciousEvents) {
		event.userId = 'suspicious_user_123'; // Same user for pattern detection
		await detector.ingestEvent(event);
	}
	
	// Check for pattern detection signals
	const patternSignals = detector.getRecentSignals(10);
	const suspiciousSignals = patternSignals.filter(signal => 
		signal.eventId.includes('suspicious_user_123') && signal.riskLevel !== 'low'
	);
	
	if (suspiciousSignals.length > 0) {
		console.log(`🎯 Pattern detected for suspicious_user_123: ${suspiciousSignals.length} high-risk signals`);
	}

	// Test alert system
	console.log("\n🚨 Testing alert system...");
	const criticalEvent = generateEvent('transaction', 'critical');
	criticalEvent.data.amount = 50000; // High amount transaction
	await detector.ingestEvent(criticalEvent);
	
	// Check for critical alerts
	const criticalSignals = detector.getRecentSignals(3);
	const latestCritical = criticalSignals.find(signal => signal.riskLevel === 'critical');
	
	if (latestCritical) {
		console.log("💥 CRITICAL ALERT TRIGGERED!");
		console.log(`   Immediate action required for event ${latestCritical.eventId}`);
		console.log(`   Risk score: ${(latestCritical.score * 100).toFixed(2)}%`);
	}

	// Final metrics and status
	const finalStatus = detector.getStreamMetrics();
	const processorStatus = detector.getProcessorStatus();
	console.log("\n🎯 Final Performance Metrics:");
	console.log(`   Total Events: ${finalStatus.totalEvents}`);
	console.log(`   Fraud Detection Rate: ${(finalStatus.fraudDetectionRate * 100).toFixed(2)}%`);
	console.log(`   Processing Efficiency: ${finalStatus.averageProcessingTime < 10 ? 'Excellent' : 'Good'}`);
	console.log(`   Active Processors: ${processorStatus.length}`);

	console.log("\n🎉 Real-Time Fraud Detection Demo Complete!");
	console.log("💚 Streaming analytics with immediate fraud detection operational!");
}

// Run the demo if this file is executed directly
if (import.meta.main) {
	demonstrateRealTimeFraudDetection().catch(console.error);
}
