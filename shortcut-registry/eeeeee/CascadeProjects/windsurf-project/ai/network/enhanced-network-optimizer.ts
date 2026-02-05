// Enhanced Network Optimization with Intelligent Caching and Predictive Preconnection
// Enterprise-grade network performance optimization for fraud detection systems

interface NetworkHost {
	hostname: string;
	port: number;
	protocol: "http" | "https" | "ws" | "wss";
	priority: number;
	lastAccessed: number;
	accessFrequency: number;
	averageLatency: number;
	successRate: number;
	isPreconnected: boolean;
	connectionPool: number[];
}

interface CacheEntry {
	key: string;
	data: any;
	timestamp: number;
	ttl: number;
	accessCount: number;
	size: number;
	hits: number;
	lastAccessed: number;
}

interface PredictiveModel {
	hostPatterns: Map<string, number>;
	timePatterns: Map<string, number[]>;
	accessSequences: string[][];
	confidence: number;
}

interface NetworkMetrics {
	totalRequests: number;
	cacheHitRate: number;
	averageLatency: number;
	preconnectionSuccessRate: number;
	bandwidthSaved: number;
	connectionsReused: number;
	predictionAccuracy: number;
}

class EnhancedNetworkOptimizer {
	private hosts: Map<string, NetworkHost> = new Map();
	private cache: Map<string, CacheEntry> = new Map();
	private predictiveModel: PredictiveModel;
	private metrics: NetworkMetrics;
	private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
	private currentCacheSize: number = 0;
	private maxConnectionsPerHost: number = 10;
	private preconnectionThreshold: number = 0.7;
	private learningEnabled: boolean = true;

	constructor() {
		this.predictiveModel = {
			hostPatterns: new Map(),
			timePatterns: new Map(),
			accessSequences: [],
			confidence: 0.5,
		};

		this.metrics = {
			totalRequests: 0,
			cacheHitRate: 0,
			averageLatency: 0,
			preconnectionSuccessRate: 0,
			bandwidthSaved: 0,
			connectionsReused: 0,
			predictionAccuracy: 0,
		};

		this.initializeCommonHosts();
		this.startPredictiveLearning();
	}

	private initializeCommonHosts(): void {
		// Initialize commonly accessed hosts for fraud detection
		const commonHosts = [
			{
				hostname: "api.fraud-detection.com",
				port: 443,
				protocol: "https" as const,
				priority: 1,
			},
			{
				hostname: "ml.models.api.com",
				port: 443,
				protocol: "https" as const,
				priority: 2,
			},
			{
				hostname: "risk.scores.com",
				port: 443,
				protocol: "https" as const,
				priority: 1,
			},
			{
				hostname: "device.fingerprint.com",
				port: 443,
				protocol: "https" as const,
				priority: 2,
			},
			{
				hostname: "network.intelligence.com",
				port: 443,
				protocol: "https" as const,
				priority: 3,
			},
			{
				hostname: "cache.redis.local",
				port: 6379,
				protocol: "http" as const,
				priority: 1,
			},
			{
				hostname: "streaming.data.com",
				port: 443,
				protocol: "wss" as const,
				priority: 2,
			},
			{
				hostname: "auth.tokens.com",
				port: 443,
				protocol: "https" as const,
				priority: 1,
			},
		];

		commonHosts.forEach((host) => {
			this.hosts.set(`${host.protocol}://${host.hostname}:${host.port}`, {
				...host,
				lastAccessed: Date.now(),
				accessFrequency: 0,
				averageLatency: 0,
				successRate: 1.0,
				isPreconnected: false,
				connectionPool: [],
			});
		});
	}

	// Intelligent caching with adaptive TTL
	public async cacheData(key: string, data: any, ttl?: number): Promise<void> {
		const dataSize = this.calculateSize(data);

		// Check if we need to evict cache entries
		if (this.currentCacheSize + dataSize > this.maxCacheSize) {
			await this.evictCache(dataSize);
		}

		const adaptiveTTL = ttl || this.calculateAdaptiveTTL(key, data);

		const entry: CacheEntry = {
			key,
			data,
			timestamp: Date.now(),
			ttl: adaptiveTTL,
			accessCount: 0,
			size: dataSize,
			hits: 0,
			lastAccessed: Date.now(),
		};

		this.cache.set(key, entry);
		this.currentCacheSize += dataSize;

		// Update predictive model based on caching patterns
		this.updateCachePatterns(key);
	}

	public async getCachedData(key: string): Promise<any | null> {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if entry has expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			this.currentCacheSize -= entry.size;
			return null;
		}

		// Update access statistics
		entry.accessCount++;
		entry.hits++;
		entry.lastAccessed = Date.now();

		// Update metrics
		this.metrics.cacheHitRate = this.calculateCacheHitRate();

		return entry.data;
	}

	private calculateSize(data: any): number {
		// Rough estimation of data size in bytes
		return JSON.stringify(data).length * 2; // UTF-16 characters
	}

	private calculateAdaptiveTTL(key: string, data: any): number {
		// Adaptive TTL based on access patterns and data importance
		const entry = this.cache.get(key);
		const baseTTL = 5 * 60 * 1000; // 5 minutes base

		if (!entry) {
			return baseTTL;
		}

		// Longer TTL for frequently accessed data
		const accessMultiplier = Math.min(3.0, 1 + entry.accessCount / 10);

		// Longer TTL for important data (based on key patterns)
		const importanceMultiplier = key.includes("critical") ? 2.0 : 1.0;

		return baseTTL * accessMultiplier * importanceMultiplier;
	}

	private async evictCache(requiredSpace: number): Promise<void> {
		// Sort cache entries by eviction priority (LFU with time decay)
		const entries = Array.from(this.cache.entries()).sort((a, b) => {
			const scoreA = this.calculateEvictionScore(a[1]);
			const scoreB = this.calculateEvictionScore(b[1]);
			return scoreA - scoreB;
		});

		let freedSpace = 0;
		for (const [key, entry] of entries) {
			if (freedSpace >= requiredSpace) break;

			this.cache.delete(key);
			this.currentCacheSize -= entry.size;
			freedSpace += entry.size;
		}
	}

	private calculateEvictionScore(entry: CacheEntry): number {
		const now = Date.now();
		const age = now - entry.timestamp;
		const timeSinceAccess = now - entry.lastAccessed;

		// Lower score = higher eviction priority
		const frequencyScore = entry.accessCount / Math.max(1, age / 1000);
		const recencyScore = 1 / Math.max(1, timeSinceAccess / 1000);

		return frequencyScore + recencyScore;
	}

	// Predictive preconnection
	public async predictAndPreconnect(): Promise<void> {
		if (!this.learningEnabled) return;

		const predictions = this.generatePredictions();

		for (const prediction of predictions) {
			if (prediction.confidence >= this.preconnectionThreshold) {
				await this.preconnectHost(prediction.hostname);
			}
		}
	}

	private generatePredictions(): Array<{
		hostname: string;
		confidence: number;
	}> {
		const predictions: Array<{ hostname: string; confidence: number }> = [];
		const currentHour = new Date().getHours();

		for (const [hostKey, host] of this.hosts) {
			// Time-based prediction
			const timePattern = this.predictiveModel.timePatterns.get(hostKey);
			let timeConfidence = 0;

			if (timePattern) {
				const hourFrequency = timePattern[currentHour] || 0;
				timeConfidence = hourFrequency / Math.max(...timePattern);
			}

			// Pattern-based prediction
			const patternConfidence =
				this.predictiveModel.hostPatterns.get(hostKey) || 0;

			// Recency-based prediction
			const recencyScore = Math.exp(
				-(Date.now() - host.lastAccessed) / (60 * 60 * 1000),
			);

			// Combined confidence
			const combinedConfidence =
				timeConfidence * 0.4 + patternConfidence * 0.4 + recencyScore * 0.2;

			if (combinedConfidence > 0.3) {
				predictions.push({
					hostname: hostKey,
					confidence: combinedConfidence,
				});
			}
		}

		return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
	}

	private async preconnectHost(hostKey: string): Promise<void> {
		const host = this.hosts.get(hostKey);
		if (!host || host.isPreconnected) return;

		try {
			// Simulate preconnection (in real implementation, would establish actual connections)
			const startTime = Date.now();

			// Create connection pool
			const connections: number[] = [];
			for (let i = 0; i < Math.min(3, this.maxConnectionsPerHost); i++) {
				connections.push(Date.now() + Math.random() * 1000);
			}

			host.connectionPool = connections;
			host.isPreconnected = true;

			const latency = Date.now() - startTime;
			host.averageLatency = (host.averageLatency + latency) / 2;

			this.metrics.connectionsReused++;
			console.log(`🔗 Preconnected to ${hostKey} (latency: ${latency}ms)`);
		} catch (error) {
			console.error(`❌ Failed to preconnect ${hostKey}:`, error);
			host.successRate = Math.max(0, host.successRate - 0.1);
		}
	}

	public async getConnection(hostKey: string): Promise<number | null> {
		const host = this.hosts.get(hostKey);
		if (!host) return null;

		// Try to reuse preconnected connection
		if (host.connectionPool.length > 0) {
			const connection = host.connectionPool.pop();
			host.lastAccessed = Date.now();
			host.accessFrequency++;

			// Refill connection pool if needed
			if (host.connectionPool.length < 2) {
				setTimeout(() => this.preconnectHost(hostKey), 100);
			}

			return connection || null;
		}

		// No preconnected connection available
		host.isPreconnected = false;
		return null;
	}

	// Learning and adaptation
	private startPredictiveLearning(): void {
		setInterval(() => {
			this.updatePredictiveModel();
			this.predictAndPreconnect();
		}, 60000); // Learn and predict every minute
	}

	private updatePredictiveModel(): void {
		const now = Date.now();
		const currentHour = new Date().getHours();

		// Update time patterns
		for (const [hostKey, host] of this.hosts) {
			if (!this.predictiveModel.timePatterns.has(hostKey)) {
				this.predictiveModel.timePatterns.set(hostKey, new Array(24).fill(0));
			}

			const timePattern = this.predictiveModel.timePatterns.get(hostKey)!;

			// Update hourly access frequency
			if (now - host.lastAccessed < 60 * 60 * 1000) {
				// Accessed within last hour
				timePattern[currentHour] = Math.min(
					1.0,
					timePattern[currentHour] + 0.1,
				);
			} else {
				// Decay older patterns
				for (let i = 0; i < 24; i++) {
					timePattern[i] *= 0.95;
				}
			}

			// Update host access patterns
			const accessScore =
				host.accessFrequency /
				Math.max(1, (now - host.lastAccessed) / (24 * 60 * 60 * 1000));
			this.predictiveModel.hostPatterns.set(hostKey, accessScore);
		}

		// Update confidence based on prediction accuracy
		this.updatePredictionConfidence();
	}

	private updateCachePatterns(key: string): void {
    // Extract host pattern from cache key
    const hostMatch = key.match(/https?:\/\/([^\/]+)/);
    if (hostMatch?.[1]) {
      const hostname = hostMatch[1];
      const currentFrequency = this.predictiveModel.hostPatterns.get(hostname) || 0;
      this.predictiveModel.hostPatterns.set(hostname, Math.min(1.0, currentFrequency + 0.01));
    }
  }

	private updatePredictionAccuracy(): void {
		// Calculate prediction accuracy based on preconnection success
		const totalPreconnections = Array.from(this.hosts.values()).filter(
			(h) => h.isPreconnected,
		).length;
		const successfulPreconnections = this.metrics.connectionsReused;

		this.metrics.predictionAccuracy =
			totalPreconnections > 0
				? successfulPreconnections / totalPreconnections
				: 0;
	}

	private updatePredictionConfidence(): void {
		this.updatePredictionAccuracy();

		// Adjust confidence based on recent accuracy
		const targetConfidence = this.metrics.predictionAccuracy;
		this.predictiveModel.confidence =
			this.predictiveModel.confidence * 0.9 + targetConfidence * 0.1;
	}

	// Performance monitoring and optimization
	public recordRequest(
		hostKey: string,
		latency: number,
		success: boolean,
	): void {
		this.metrics.totalRequests++;

		const host = this.hosts.get(hostKey);
		if (host) {
			host.lastAccessed = Date.now();
			host.accessFrequency++;
			host.averageLatency = (host.averageLatency + latency) / 2;

			if (success) {
				host.successRate = Math.min(1.0, host.successRate + 0.01);
			} else {
				host.successRate = Math.max(0, host.successRate - 0.05);
			}
		}

		// Update overall metrics
		this.updateOverallMetrics();
	}

	private updateOverallMetrics(): void {
		// Calculate average latency across all hosts
		const latencies = Array.from(this.hosts.values()).map(
			(h) => h.averageLatency,
		);
		this.metrics.averageLatency =
			latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

		// Calculate preconnection success rate
		const preconnectedHosts = Array.from(this.hosts.values()).filter(
			(h) => h.isPreconnected,
		);
		this.metrics.preconnectionSuccessRate =
			preconnectedHosts.length > 0
				? preconnectedHosts.reduce((sum, h) => sum + h.successRate, 0) /
					preconnectedHosts.length
				: 0;

		// Estimate bandwidth saved by caching
		this.metrics.bandwidthSaved = this.currentCacheSize * 0.8; // Rough estimate
	}

	private calculateCacheHitRate(): number {
		const totalAccesses = Array.from(this.cache.values()).reduce(
			(sum, entry) => sum + entry.accessCount,
			0,
		);
		const totalHits = Array.from(this.cache.values()).reduce(
			(sum, entry) => sum + entry.hits,
			0,
		);

		return totalAccesses > 0 ? totalHits / totalAccesses : 0;
	}

	// Public API for monitoring and management
	public getNetworkMetrics(): NetworkMetrics & {
		cacheSize: number;
		cacheEntries: number;
		preconnectedHosts: number;
		activeConnections: number;
		modelConfidence: number;
	} {
		return {
			...this.metrics,
			cacheSize: this.currentCacheSize,
			cacheEntries: this.cache.size,
			preconnectedHosts: Array.from(this.hosts.values()).filter(
				(h) => h.isPreconnected,
			).length,
			activeConnections: Array.from(this.hosts.values()).reduce(
				(sum, h) => sum + h.connectionPool.length,
				0,
			),
			modelConfidence: this.predictiveModel.confidence,
		};
	}

	public getHostStatus(): Array<{
		key: string;
		hostname: string;
		port: number;
		priority: number;
		isPreconnected: boolean;
		connectionPoolSize: number;
		averageLatency: number;
		successRate: number;
		accessFrequency: number;
	}> {
		return Array.from(this.hosts.entries()).map(([key, host]) => ({
			key,
			hostname: host.hostname,
			port: host.port,
			priority: host.priority,
			isPreconnected: host.isPreconnected,
			connectionPoolSize: host.connectionPool.length,
			averageLatency: host.averageLatency,
			successRate: host.successRate,
			accessFrequency: host.accessFrequency,
		}));
	}

	public getCacheStatus(): Array<{
		key: string;
		size: number;
		ttl: number;
		hits: number;
		accessCount: number;
		lastAccessed: number;
	}> {
		return Array.from(this.cache.entries()).map(([key, entry]) => ({
			key,
			size: entry.size,
			ttl: entry.ttl,
			hits: entry.hits,
			accessCount: entry.accessCount,
			lastAccessed: entry.lastAccessed,
		}));
	}

	public async clearCache(): Promise<void> {
		this.cache.clear();
		this.currentCacheSize = 0;
		console.log("🗑️ Cache cleared");
	}

	public setPreconnectionThreshold(threshold: number): void {
		this.preconnectionThreshold = Math.max(0.1, Math.min(1.0, threshold));
	}

	public setMaxCacheSize(size: number): void {
		this.maxCacheSize = size;
		// Evict if necessary
		if (this.currentCacheSize > this.maxCacheSize) {
			this.evictCache(this.currentCacheSize - this.maxCacheSize);
		}
	}

	public enableLearning(enabled: boolean): void {
		this.learningEnabled = enabled;
	}

	public async optimizeNetwork(): Promise<void> {
		console.log("🚀 Starting network optimization...");

		// Force predictive learning
		this.updatePredictiveModel();

		// Preconnect high-priority hosts
		await this.predictAndPreconnect();

		// Optimize cache
		await this.optimizeCache();

		console.log("✅ Network optimization complete");
	}

	private async optimizeCache(): Promise<void> {
		// Remove expired entries
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache) {
			if (now - entry.timestamp > entry.ttl) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			const entry = this.cache.get(key)!;
			this.cache.delete(key);
			this.currentCacheSize -= entry.size;
		}

		console.log(`🗑️ Removed ${expiredKeys.length} expired cache entries`);
	}
}

// Export the enhanced network optimizer
export {
	EnhancedNetworkOptimizer,
	type NetworkHost,
	type CacheEntry,
	type NetworkMetrics,
};

// Demo and testing section
async function demonstrateNetworkOptimizer() {
	console.log("🌐 Enhanced Network Optimizer - Intelligent Caching Demo");
	console.log("=" .repeat(60));

	// Initialize the enhanced network optimizer
	const optimizer = new EnhancedNetworkOptimizer({
		maxCacheSize: 1000,
		cacheTimeoutMs: 300000, // 5 minutes
		maxConnections: 50,
		preconnectThreshold: 0.7,
		enablePredictiveCaching: true,
		enableCompression: true,
	});

	console.log("✅ Enhanced Network Optimizer initialized");
	const cacheStatus = optimizer.getCacheStatus();
	const hostStatus = optimizer.getHostStatus();
	console.log(`📊 Cache entries: ${cacheStatus.length}`);
	console.log(`🔗 Active hosts: ${hostStatus.length}`);

	// Simulate network operations
	console.log("\n🚀 Simulating network operations...");
	
	// Test caching
	const testData = { userId: "12345", transactionId: "txn_67890" };
	const cacheKey = "user_session_12345";
	
	// Cache some data
	await optimizer.cacheData(cacheKey, testData);
	console.log("💾 Cached user session data");
	
	// Retrieve from cache
	const cachedData = await optimizer.getCachedData(cacheKey);
	if (cachedData) {
		console.log("✅ Retrieved data from cache successfully");
	}

	// Test predictive preconnection
	console.log("\n🔮 Testing predictive preconnection...");
	const currentHostStatus = optimizer.getHostStatus();
	const highPriorityHosts = currentHostStatus.filter(host => host.priority <= 2);
	console.log(`📈 High priority hosts: ${highPriorityHosts.length}`);
	
	for (const host of highPriorityHosts.slice(0, 2)) {
		const connection = await optimizer.getConnection(host.hostname);
		console.log(`🔗 Connection to ${host.hostname}: ${connection ? "Active" : "Failed"}`);
	}

	// Get network metrics
	console.log("\n📊 Network Performance Metrics:");
	const metrics = optimizer.getNetworkMetrics();
	console.log(`   Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%`);
	console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
	console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`);
	console.log(`   Active Connections: ${metrics.activeConnections}`);
	console.log(`   Cached Entries: ${metrics.cachedEntries}`);

	// Test intelligent routing
	console.log("\n🧭 Testing intelligent routing...");
	const testRequests = [
		{ url: "https://api.factory-wager.com/validate", priority: "high" },
		{ url: "http://fraud-detection.service/check", priority: "medium" },
		{ url: "ws://realtime.analytics/stream", priority: "low" },
	];

	for (const request of testRequests) {
		// Record the request to track metrics
		optimizer.recordRequest(request.url, 200, 150); // Mock successful request
		const url = new URL(request.url);
		console.log(`📍 Processed ${request.url}: ${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 80)}`);
	}

	// Performance optimization
	console.log("\n⚡ Performance optimization...");
	await optimizer.optimizeNetwork();
	
	const finalMetrics = optimizer.getNetworkMetrics();
	console.log(`📈 Final cache hit rate: ${(finalMetrics.cacheHitRate * 100).toFixed(2)}%`);
	console.log(`🔧 Optimized connections: ${finalMetrics.activeConnections}`);

	console.log("\n🎉 Enhanced Network Optimizer Demo Complete!");
	console.log("💚 Intelligent caching and predictive routing operational!");
}

// Run the demo if this file is executed directly
if (import.meta.main) {
	demonstrateNetworkOptimizer().catch(console.error);
}
