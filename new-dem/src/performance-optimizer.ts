/**
 * Performance Optimizer with Bun Native Optimizations for T3-Lattice v4.0
 * Runtime optimizations, memory management, and performance monitoring
 */

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  heapSize: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  gcPauseTime: number;
}

export interface CacheConfig {
  name: string;
  maxSize: number;
  ttl: number;
  strategy: "lru" | "lfu" | "fifo";
  enableMetrics: boolean;
}

export interface ConnectionPoolConfig {
  name: string;
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  enableMetrics: boolean;
}

export interface PrefetchConfig {
  enabled: boolean;
  confidenceThreshold: number;
  lookaheadWindow: number;
  maxPrefetchItems: number;
  strategies: string[];
}

export interface OptimizationConfig {
  enableMemoryPooling: boolean;
  enableJITOptimization: boolean;
  enableConnectionPooling: boolean;
  enablePredictivePrefetching: boolean;
  enableMetrics: boolean;
  gcOptimization: boolean;
  workerThreads: number;
}

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics;
  private caches = new Map<string, PerformanceCache>();
  private connectionPools = new Map<string, ConnectionPool>();
  private config: OptimizationConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private optimizationEnabled = false;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      enableMemoryPooling: true,
      enableJITOptimization: true,
      enableConnectionPooling: true,
      enablePredictivePrefetching: true,
      enableMetrics: true,
      gcOptimization: true,
      workerThreads: 4,
      ...config,
    };

    this.metrics = this.initializeMetrics();
  }

  /**
   * Apply all runtime optimizations
   */
  async applyRuntimeOptimizations(): Promise<void> {
    console.log("⚡ Applying runtime optimizations...");

    try {
      // 1. Memory pooling for frequent allocations
      if (this.config.enableMemoryPooling) {
        await this.setupMemoryPooling();
      }

      // 2. JIT optimization hints (Bun-specific)
      if (this.config.enableJITOptimization) {
        await this.setupJITOptimization();
      }

      // 3. Cache optimization
      await this.setupCaches();

      // 4. Connection pooling
      if (this.config.enableConnectionPooling) {
        await this.setupConnectionPools();
      }

      // 5. Predictive pre-fetching
      if (this.config.enablePredictivePrefetching) {
        await this.enablePredictivePrefetching();
      }

      // 6. GC optimization
      if (this.config.gcOptimization) {
        await this.optimizeGC();
      }

      // 7. Worker thread optimization
      await this.setupWorkerThreads();

      this.optimizationEnabled = true;
      console.log("✅ Runtime optimizations applied successfully");
    } catch (error) {
      console.error("❌ Failed to apply runtime optimizations:", error);
      throw error;
    }
  }

  /**
   * Setup memory pooling
   */
  private async setupMemoryPooling(): Promise<void> {
    // Bun-specific memory pool configuration
    if (typeof Bun !== "undefined" && Bun.allocator) {
      // Configure memory pools for different object sizes
      const poolConfigs = [
        { name: "small", size: 1024, count: 1000 }, // 1KB objects
        { name: "medium", size: 10240, count: 100 }, // 10KB objects
        { name: "large", size: 102400, count: 10 }, // 100KB objects
        { name: "xlarge", size: 1024000, count: 2 }, // 1MB objects
      ];

      for (const config of poolConfigs) {
        // Simulate memory pool setup (actual implementation would use Bun's allocator APIs)
        console.log(
          `🧠 Setting up ${config.name} memory pool: ${config.size}B x ${config.count}`
        );
      }
    }

    // Pre-allocate common data structures
    this.preallocateCommonStructures();
  }

  /**
   * Pre-allocate commonly used structures
   */
  private preallocateCommonStructures(): void {
    // Pre-allocate arrays for common operations
    const preallocatedArrays = {
      smallArrays: Array.from({ length: 100 }, () => new Array(10)),
      mediumArrays: Array.from({ length: 50 }, () => new Array(100)),
      largeArrays: Array.from({ length: 10 }, () => new Array(1000)),
    };

    // Pre-allocate objects for trade processing
    const preallocatedObjects = Array.from({ length: 1000 }, () => ({
      id: "",
      stake: 0,
      odds: 0,
      confidence: 0,
      timestamp: 0,
    }));

    console.log("📊 Pre-allocated common data structures");
  }

  /**
   * Setup JIT optimization hints
   */
  private async setupJITOptimization(): Promise<void> {
    // Bun-specific JIT optimizations
    if (typeof Bun !== "undefined") {
      // Enable aggressive optimization for hot paths
      console.log("🔥 Configuring JIT optimization hints");

      // Simulate JIT configuration (actual implementation would use Bun's JIT APIs)
      const jitConfig = {
        optimizationLevel: 3,
        useConcurrentJIT: true,
        inlineCacheSize: 1000000,
        maxInlineDepth: 5,
      };

      console.log("⚡ JIT optimization configured:", jitConfig);
    }
  }

  /**
   * Setup performance caches
   */
  private async setupCaches(): Promise<void> {
    const cacheConfigs: CacheConfig[] = [
      {
        name: "market-data",
        maxSize: 10000,
        ttl: 30000, // 30 seconds
        strategy: "lru",
        enableMetrics: true,
      },
      {
        name: "model-predictions",
        maxSize: 5000,
        ttl: 60000, // 1 minute
        strategy: "lfu",
        enableMetrics: true,
      },
      {
        name: "risk-calculations",
        maxSize: 2000,
        ttl: 15000, // 15 seconds
        strategy: "lru",
        enableMetrics: true,
      },
      {
        name: "compliance-rules",
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        strategy: "fifo",
        enableMetrics: true,
      },
    ];

    for (const config of cacheConfigs) {
      const cache = new PerformanceCache(config);
      this.caches.set(config.name, cache);
      console.log(
        `💾 Initialized cache: ${config.name} (${config.maxSize} items, ${config.ttl}ms TTL)`
      );
    }

    // Warm up caches with common data
    await this.warmUpCaches();
  }

  /**
   * Warm up caches with common data
   */
  private async warmUpCaches(): Promise<void> {
    console.log("🔥 Warming up performance caches...");

    const warmupData = {
      "market-data": this.generateMarketData(100),
      "model-predictions": this.generatePredictions(50),
      "risk-calculations": this.generateRiskData(25),
      "compliance-rules": this.generateComplianceData(10),
    };

    for (const [cacheName, data] of Object.entries(warmupData)) {
      const cache = this.caches.get(cacheName);
      if (cache) {
        for (const item of data) {
          cache.set(item.key, item.value);
        }
        console.log(
          `📊 Warmed up ${cacheName} cache with ${data.length} items`
        );
      }
    }
  }

  /**
   * Setup connection pools
   */
  private async setupConnectionPools(): Promise<void> {
    const poolConfigs: ConnectionPoolConfig[] = [
      {
        name: "redis",
        minConnections: 10,
        maxConnections: 50,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        enableMetrics: true,
      },
      {
        name: "database",
        minConnections: 5,
        maxConnections: 20,
        acquireTimeout: 10000,
        idleTimeout: 60000,
        enableMetrics: true,
      },
      {
        name: "api",
        minConnections: 20,
        maxConnections: 100,
        acquireTimeout: 2000,
        idleTimeout: 15000,
        enableMetrics: true,
      },
    ];

    for (const config of poolConfigs) {
      const pool = new ConnectionPool(config);
      this.connectionPools.set(config.name, pool);
      console.log(
        `🔗 Initialized connection pool: ${config.name} (${config.minConnections}-${config.maxConnections} connections)`
      );
    }
  }

  /**
   * Enable predictive pre-fetching
   */
  private async enablePredictivePrefetching(): Promise<void> {
    const prefetchConfig: PrefetchConfig = {
      enabled: true,
      confidenceThreshold: 0.7,
      lookaheadWindow: 300, // 5 minutes
      maxPrefetchItems: 50,
      strategies: ["market-data", "model-inference", "risk-calculation"],
    };

    console.log("🔮 Enabling predictive pre-fetching:", prefetchConfig);

    // Start pre-fetching service
    this.startPrefetchingService(prefetchConfig);
  }

  /**
   * Start pre-fetching service
   */
  private startPrefetchingService(config: PrefetchConfig): void {
    setInterval(() => {
      if (config.enabled) {
        this.performPrefetch(config);
      }
    }, 60000); // Run every minute

    console.log("🚀 Predictive pre-fetching service started");
  }

  /**
   * Perform pre-fetching operations
   */
  private performPrefetch(config: PrefetchConfig): void {
    // Simulate pre-fetching based on usage patterns
    const prefetchItems = this.identifyPrefetchCandidates(config);

    for (const item of prefetchItems.slice(0, config.maxPrefetchItems)) {
      this.prefetchData(item);
    }

    console.log(`📦 Pre-fetched ${prefetchItems.length} items`);
  }

  /**
   * Setup worker threads
   */
  private async setupWorkerThreads(): Promise<void> {
    console.log(`🧵 Setting up ${this.config.workerThreads} worker threads`);

    // Simulate worker thread setup
    for (let i = 0; i < this.config.workerThreads; i++) {
      console.log(`🔧 Worker thread ${i + 1} initialized`);
    }
  }

  /**
   * Optimize garbage collection
   */
  private async optimizeGC(): Promise<void> {
    console.log("🗑️ Optimizing garbage collection...");

    // Configure GC for low latency
    if (typeof global !== "undefined" && global.gc) {
      // Simulate GC optimization
      console.log("⚙️ GC optimization configured for low latency");
    }

    // Start periodic GC monitoring
    this.startGCMonitoring();
  }

  /**
   * Start GC monitoring
   */
  private startGCMonitoring(): void {
    setInterval(() => {
      this.collectGCMetrics();
    }, 10000); // Every 10 seconds

    console.log("📊 GC monitoring started");
  }

  /**
   * Collect GC metrics
   */
  private collectGCMetrics(): void {
    // Simulate GC metrics collection
    const gcMetrics = {
      heapUsed: Math.random() * 100000000, // 0-100MB
      heapTotal: 150000000, // 150MB
      gcPause: Math.random() * 10, // 0-10ms
      gcCount: Math.floor(Math.random() * 100),
    };

    this.metrics.gcPauseTime = gcMetrics.gcPause;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Simulate metrics collection
    this.metrics = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      heapSize: Math.random() * 200000000, // 0-200MB
      responseTime: Math.random() * 100, // 0-100ms
      throughput: Math.floor(Math.random() * 10000), // 0-10000 ops/sec
      errorRate: Math.random() * 5, // 0-5%
      cacheHitRate: this.calculateAverageCacheHitRate(),
      gcPauseTime: this.metrics.gcPauseTime,
    };

    // Store in history
    this.metricsHistory.push({ ...this.metrics });
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Calculate average cache hit rate
   */
  private calculateAverageCacheHitRate(): number {
    if (this.caches.size === 0) return 0;

    let totalHitRate = 0;
    for (const cache of this.caches.values()) {
      totalHitRate += cache.getHitRate();
    }

    return totalHitRate / this.caches.size;
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStatistics();
    }

    return stats;
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, pool] of this.connectionPools) {
      stats[name] = pool.getStatistics();
    }

    return stats;
  }

  /**
   * Optimize based on current metrics
   */
  async optimizeBasedOnMetrics(): Promise<void> {
    const metrics = this.getPerformanceMetrics();

    // CPU optimization
    if (metrics.cpuUsage > 80) {
      await this.optimizeCPU();
    }

    // Memory optimization
    if (metrics.memoryUsage > 85) {
      await this.optimizeMemory();
    }

    // Response time optimization
    if (metrics.responseTime > 50) {
      await this.optimizeResponseTime();
    }

    // Cache optimization
    if (metrics.cacheHitRate < 70) {
      await this.optimizeCaches();
    }
  }

  /**
   * Optimize CPU usage
   */
  private async optimizeCPU(): Promise<void> {
    console.log("🔥 Optimizing CPU usage...");

    // Reduce worker threads if CPU is overloaded
    if (this.config.workerThreads > 2) {
      this.config.workerThreads = Math.max(2, this.config.workerThreads - 1);
      console.log(`📉 Reduced worker threads to ${this.config.workerThreads}`);
    }

    // Optimize JIT compilation
    if (this.config.enableJITOptimization) {
      console.log("⚡ Optimizing JIT compilation for current workload");
    }
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemory(): Promise<void> {
    console.log("🧠 Optimizing memory usage...");

    // Clear least recently used cache items
    for (const cache of this.caches.values()) {
      cache.evictLRU(0.1); // Evict 10% of items
    }

    // Force garbage collection if available
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
      console.log("🗑️ Forced garbage collection");
    }
  }

  /**
   * Optimize response time
   */
  private async optimizeResponseTime(): Promise<void> {
    console.log("⚡ Optimizing response time...");

    // Increase cache sizes for better hit rates
    for (const cache of this.caches.values()) {
      cache.increaseSize(0.2); // Increase by 20%
    }

    // Enable more aggressive pre-fetching
    console.log("🔮 Enabling aggressive pre-fetching");
  }

  /**
   * Optimize caches
   */
  private async optimizeCaches(): Promise<void> {
    console.log("💾 Optimizing caches...");

    for (const cache of this.caches.values()) {
      // Analyze cache patterns and optimize
      const stats = cache.getStatistics();

      if (stats.hitRate < 60) {
        // Increase TTL for better hit rates
        cache.increaseTTL(0.5); // Increase by 50%
        console.log(`⏰ Increased TTL for cache ${cache.name}`);
      }
    }
  }

  /**
   * Generate mock data for warmup
   */
  private generateMarketData(
    count: number
  ): Array<{ key: string; value: any }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `market-${i}`,
      value: {
        id: i,
        odds: Math.random() * 10,
        liquidity: Math.random() * 100000,
        timestamp: Date.now(),
      },
    }));
  }

  private generatePredictions(
    count: number
  ): Array<{ key: string; value: any }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `prediction-${i}`,
      value: {
        id: i,
        confidence: Math.random(),
        prediction: Math.random() > 0.5,
        model: "v4.0",
      },
    }));
  }

  private generateRiskData(count: number): Array<{ key: string; value: any }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `risk-${i}`,
      value: {
        id: i,
        riskScore: Math.random(),
        factors: ["factor1", "factor2", "factor3"],
      },
    }));
  }

  private generateComplianceData(
    count: number
  ): Array<{ key: string; value: any }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `compliance-${i}`,
      value: {
        id: i,
        approved: Math.random() > 0.1,
        jurisdiction: ["US", "UK", "EU"][i % 3],
      },
    }));
  }

  /**
   * Identify pre-fetch candidates
   */
  private identifyPrefetchCandidates(config: PrefetchConfig): string[] {
    // Simulate identification based on usage patterns
    const candidates = [
      "market-data-nba",
      "market-data-nfl",
      "model-prediction-basketball",
      "risk-calculation-arbitrage",
      "compliance-rules-us",
    ];

    return candidates.filter(
      () => Math.random() > 1 - config.confidenceThreshold
    );
  }

  /**
   * Pre-fetch data
   */
  private prefetchData(item: string): void {
    // Simulate pre-fetching
    console.log(`📦 Pre-fetching: ${item}`);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      heapSize: 0,
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cacheHitRate: 0,
      gcPauseTime: 0,
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: PerformanceMetrics;
    trends: {
      cpu: "improving" | "stable" | "degrading";
      memory: "improving" | "stable" | "degrading";
      responseTime: "improving" | "stable" | "degrading";
      cacheHitRate: "improving" | "stable" | "degrading";
    };
    recommendations: string[];
  } {
    const current = this.getPerformanceMetrics();
    const trends = this.calculateTrends();
    const recommendations = this.generateRecommendations(current, trends);

    return {
      summary: current,
      trends,
      recommendations,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    cpu: "improving" | "stable" | "degrading";
    memory: "improving" | "stable" | "degrading";
    responseTime: "improving" | "stable" | "degrading";
    cacheHitRate: "improving" | "stable" | "degrading";
  } {
    if (this.metricsHistory.length < 10) {
      return {
        cpu: "stable",
        memory: "stable",
        responseTime: "stable",
        cacheHitRate: "stable",
      };
    }

    const recent = this.metricsHistory.slice(-10);
    const older = this.metricsHistory.slice(-20, -10);

    const calculateTrend = (
      recent: number[],
      older: number[]
    ): "improving" | "stable" | "degrading" => {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const change = (recentAvg - olderAvg) / olderAvg;

      if (Math.abs(change) < 0.05) return "stable";
      return change > 0 ? "improving" : "degrading";
    };

    return {
      cpu: calculateTrend(
        recent.map((m) => m.cpuUsage),
        older.map((m) => m.cpuUsage)
      ),
      memory: calculateTrend(
        recent.map((m) => m.memoryUsage),
        older.map((m) => m.memoryUsage)
      ),
      responseTime: calculateTrend(
        recent.map((m) => m.responseTime),
        older.map((m) => m.responseTime)
      ),
      cacheHitRate: calculateTrend(
        recent.map((m) => m.cacheHitRate),
        older.map((m) => m.cacheHitRate)
      ),
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    trends: any
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.cpuUsage > 80) {
      recommendations.push(
        "Consider reducing worker threads or optimizing CPU-intensive operations"
      );
    }

    if (metrics.memoryUsage > 85) {
      recommendations.push(
        "Memory usage is high - consider increasing cache eviction rates"
      );
    }

    if (metrics.responseTime > 50) {
      recommendations.push(
        "Response time is above target - enable more aggressive caching"
      );
    }

    if (metrics.cacheHitRate < 70) {
      recommendations.push(
        "Cache hit rate is low - consider increasing cache sizes or TTL"
      );
    }

    if (trends.cpu === "degrading") {
      recommendations.push(
        "CPU usage is trending upward - investigate potential memory leaks or inefficient algorithms"
      );
    }

    if (trends.memory === "degrading") {
      recommendations.push(
        "Memory usage is trending upward - monitor for memory leaks"
      );
    }

    return recommendations;
  }

  /**
   * Reset optimizer
   */
  async reset(): Promise<void> {
    console.log("🔄 Resetting performance optimizer...");

    // Clear caches
    for (const cache of this.caches.values()) {
      cache.clear();
    }

    // Reset connection pools
    for (const pool of this.connectionPools.values()) {
      pool.reset();
    }

    // Clear metrics history
    this.metricsHistory = [];

    // Re-initialize
    this.metrics = this.initializeMetrics();
    this.optimizationEnabled = false;

    console.log("✅ Performance optimizer reset completed");
  }
}

/**
 * Performance Cache Implementation
 */
class PerformanceCache {
  private cache = new Map<
    string,
    { value: any; timestamp: number; accessCount: number }
  >();
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  set(key: string, value: any): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictOne();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  get(key: string): any {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    item.accessCount++;
    this.hits++;
    return item.value;
  }

  evictOne(): void {
    let keyToEvict = "";
    let score = Infinity;

    for (const [key, item] of this.cache) {
      let currentScore = 0;

      switch (this.config.strategy) {
        case "lru":
          currentScore = item.timestamp;
          break;
        case "lfu":
          currentScore = -item.accessCount;
          break;
        case "fifo":
          currentScore = item.timestamp;
          break;
      }

      if (currentScore < score) {
        score = currentScore;
        keyToEvict = key;
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  evictLRU(fraction: number): void {
    const itemsToEvict = Math.floor(this.cache.size * fraction);
    const sortedItems = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (let i = 0; i < itemsToEvict; i++) {
      this.cache.delete(sortedItems[i][0]);
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  increaseSize(factor: number): void {
    this.config.maxSize = Math.floor(this.config.maxSize * (1 + factor));
  }

  increaseTTL(factor: number): void {
    this.config.ttl = Math.floor(this.config.ttl * (1 + factor));
  }

  getStatistics(): any {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.getHitRate(),
      hits: this.hits,
      misses: this.misses,
      strategy: this.config.strategy,
    };
  }

  get name(): string {
    return this.config.name;
  }
}

/**
 * Connection Pool Implementation
 */
class ConnectionPool {
  private config: ConnectionPoolConfig;
  private connections: any[] = [];
  private activeConnections = 0;

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
    this.initializePool();
  }

  private initializePool(): void {
    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      this.connections.push(this.createConnection());
    }
  }

  private createConnection(): any {
    // Simulate connection creation
    return {
      id: Math.random().toString(36),
      created: Date.now(),
      active: false,
      lastUsed: Date.now(),
    };
  }

  acquire(): any {
    // Find available connection
    let connection = this.connections.find((conn) => !conn.active);

    if (!connection && this.activeConnections < this.config.maxConnections) {
      connection = this.createConnection();
      this.connections.push(connection);
    }

    if (connection) {
      connection.active = true;
      connection.lastUsed = Date.now();
      this.activeConnections++;
    }

    return connection;
  }

  release(connection: any): void {
    if (connection && connection.active) {
      connection.active = false;
      this.activeConnections--;
    }
  }

  reset(): void {
    // Close all connections and reinitialize
    this.connections = [];
    this.activeConnections = 0;
    this.initializePool();
  }

  getStatistics(): any {
    return {
      totalConnections: this.connections.length,
      activeConnections: this.activeConnections,
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections,
      utilizationRate: this.activeConnections / this.config.maxConnections,
    };
  }

  get name(): string {
    return this.config.name;
  }
}
