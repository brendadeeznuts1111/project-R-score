// Latency Tracker for Endpoints and Integrations
// Provides comprehensive performance monitoring with caching and standardization

export interface LatencyMetrics {
    endpoint: string;
    integration: string;
    timestamp: number;
    latency: number;
    cacheHit: boolean;
    statusCode: number;
    error?: string;
}

export interface EndpointStats {
    endpoint: string;
    integration: string;
    totalRequests: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    p95Latency: number;
    p99Latency: number;
    cacheHitRate: number;
    errorRate: number;
    lastUpdated: number;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    endpoint: string;
    integration: string;
}

class LatencyTracker {
    private metrics: Map<string, LatencyMetrics[]> = new Map();
    private cache: Map<string, CacheEntry<any>> = new Map();
    private stats: Map<string, EndpointStats> = new Map();
    private maxHistorySize: number = 10000;
    private defaultCacheTTL: number = 300000; // 5 minutes

    constructor(maxHistorySize: number = 10000, defaultCacheTTL: number = 300000) {
        this.maxHistorySize = maxHistorySize;
        this.defaultCacheTTL = defaultCacheTTL;
    }

    // Record latency for a specific endpoint and integration
    public recordLatency(
        endpoint: string,
        integration: string,
        latency: number,
        statusCode: number = 200,
        cacheHit: boolean = false,
        error?: string
    ): void {
        const key = this.getKey(endpoint, integration);
        const metric: LatencyMetrics = {
            endpoint,
            integration,
            timestamp: Date.now(),
            latency,
            cacheHit,
            statusCode,
            error
        };

        // Store metric
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        
        const metrics = this.metrics.get(key)!;
        metrics.push(metric);

        // Trim history if needed
        if (metrics.length > this.maxHistorySize) {
            metrics.shift();
        }

        // Update statistics
        this.updateStats(key);
    }

    // Get cached data or execute function and cache result
    public async getCachedOrExecute<T>(
        endpoint: string,
        integration: string,
        fn: () => Promise<T>,
        ttl: number = this.defaultCacheTTL
    ): Promise<{ data: T; cacheHit: boolean }> {
        const key = this.getKey(endpoint, integration);
        const cacheKey = `${key}:cache`;

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            this.recordLatency(endpoint, integration, 0, 200, true);
            return { data: cached.data, cacheHit: true };
        }

        // Execute function
        const startTime = Date.now();
        try {
            const data = await fn();
            const latency = Date.now() - startTime;

            // Cache result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl,
                endpoint,
                integration
            });

            this.recordLatency(endpoint, integration, latency, 200, false);
            return { data, cacheHit: false };
        } catch (error) {
            const latency = Date.now() - startTime;
            this.recordLatency(endpoint, integration, latency, 500, false, error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    // Get statistics for a specific endpoint
    public getEndpointStats(endpoint: string, integration: string): EndpointStats | null {
        const key = this.getKey(endpoint, integration);
        return this.stats.get(key) || null;
    }

    // Get all endpoint statistics
    public getAllStats(): Map<string, EndpointStats> {
        return new Map(this.stats);
    }

    // Get performance summary
    public getPerformanceSummary(): {
        totalEndpoints: number;
        totalRequests: number;
        overallAverageLatency: number;
        overallCacheHitRate: number;
        topSlowEndpoints: Array<{ endpoint: string; integration: string; avgLatency: number; }>;
        topErrorEndpoints: Array<{ endpoint: string; integration: string; errorRate: number; }>;
    } {
        const stats = Array.from(this.stats.values());
        const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
        const overallAverageLatency = stats.reduce((sum, stat) => sum + stat.averageLatency * stat.totalRequests, 0) / totalRequests || 0;
        const overallCacheHitRate = stats.reduce((sum, stat) => sum + stat.cacheHitRate * stat.totalRequests, 0) / totalRequests || 0;

        // Top slow endpoints
        const topSlowEndpoints = stats
            .filter(stat => stat.totalRequests > 0)
            .sort((a, b) => b.averageLatency - a.averageLatency)
            .slice(0, 5)
            .map(stat => ({
                endpoint: stat.endpoint,
                integration: stat.integration,
                avgLatency: stat.averageLatency
            }));

        // Top error endpoints
        const topErrorEndpoints = stats
            .filter(stat => stat.totalRequests > 0 && stat.errorRate > 0)
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 5)
            .map(stat => ({
                endpoint: stat.endpoint,
                integration: stat.integration,
                errorRate: stat.errorRate
            }));

        return {
            totalEndpoints: stats.length,
            totalRequests,
            overallAverageLatency,
            overallCacheHitRate,
            topSlowEndpoints,
            topErrorEndpoints
        };
    }

    // Clear cache for specific endpoint
    public clearCache(endpoint: string, integration: string): void {
        const key = this.getKey(endpoint, integration);
        this.cache.delete(`${key}:cache`);
    }

    // Clear all cache
    public clearAllCache(): void {
        this.cache.clear();
    }

    // Clean up expired cache entries
    public cleanupExpiredCache(): number {
        let cleaned = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }

    // Export metrics for analysis
    public exportMetrics(): string {
        const data = {
            metrics: Array.from(this.metrics.entries()).map(([key, metrics]) => ({
                key,
                metrics: metrics.slice(-1000) // Last 1000 entries per endpoint
            })),
            stats: Array.from(this.stats.entries()),
            summary: this.getPerformanceSummary(),
            exportTime: Date.now()
        };

        return JSON.stringify(data, null, 2);
    }

    // Import metrics from data
    public importMetrics(data: string): void {
        try {
            const parsed = JSON.parse(data);
            
            if (parsed.metrics) {
                this.metrics = new Map(parsed.metrics);
            }
            
            if (parsed.stats) {
                this.stats = new Map(parsed.stats);
            }
        } catch (error) {
            throw new Error('Invalid metrics data format');
        }
    }

    // Get real-time performance dashboard data
    public getDashboardData(): {
        endpoints: Array<{
            endpoint: string;
            integration: string;
            status: 'healthy' | 'warning' | 'critical';
            latency: number;
            cacheHitRate: number;
            errorRate: number;
            requests: number;
        }>;
        summary: {
            totalRequests: number;
            averageLatency: number;
            cacheHitRate: number;
        };
    } {
        const now = Date.now();
        const endpoints = Array.from(this.stats.values()).map(stat => {
            // Determine status based on recent performance
            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            
            if (stat.errorRate > 0.1) {
                status = 'critical';
            } else if (stat.averageLatency > 1000 || stat.errorRate > 0.05) {
                status = 'warning';
            }

            return {
                endpoint: stat.endpoint,
                integration: stat.integration,
                status,
                latency: stat.averageLatency,
                cacheHitRate: stat.cacheHitRate,
                errorRate: stat.errorRate,
                requests: stat.totalRequests
            };
        });

        const summary = this.getPerformanceSummary();

        return {
            endpoints,
            summary: {
                totalRequests: summary.totalRequests,
                averageLatency: summary.overallAverageLatency,
                cacheHitRate: summary.overallCacheHitRate
            }
        };
    }

    private getKey(endpoint: string, integration: string): string {
        return `${integration}:${endpoint}`;
    }

    private updateStats(key: string): void {
        const metrics = this.metrics.get(key);
        if (!metrics || metrics.length === 0) return;

        const sortedLatencies = metrics.map(m => m.latency).sort((a, b) => a - b);
        const totalRequests = metrics.length;
        const cacheHits = metrics.filter(m => m.cacheHit).length;
        const errors = metrics.filter(m => m.error).length;

        const stats: EndpointStats = {
            endpoint: metrics[0].endpoint,
            integration: metrics[0].integration,
            totalRequests,
            averageLatency: sortedLatencies.reduce((sum, lat) => sum + lat, 0) / totalRequests,
            minLatency: sortedLatencies[0],
            maxLatency: sortedLatencies[sortedLatencies.length - 1],
            p95Latency: sortedLatencies[Math.floor(totalRequests * 0.95)],
            p99Latency: sortedLatencies[Math.floor(totalRequests * 0.99)],
            cacheHitRate: cacheHits / totalRequests,
            errorRate: errors / totalRequests,
            lastUpdated: Date.now()
        };

        this.stats.set(key, stats);
    }
}

export default LatencyTracker;
export { LatencyTracker };
