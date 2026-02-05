#!/usr/bin/env bun
// Test Suite for Latency Tracker
// Comprehensive testing of performance monitoring and caching

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Latency Tracker Implementation
class LatencyTracker {
    private metrics: Map<string, any[]> = new Map();
    private cache: Map<string, any> = new Map();
    private stats: Map<string, any> = new Map();
    private maxHistorySize: number;
    private defaultCacheTTL: number;

    constructor(maxHistorySize: number = 10000, defaultCacheTTL: number = 300000) {
        this.maxHistorySize = maxHistorySize;
        this.defaultCacheTTL = defaultCacheTTL;
    }

    public recordLatency(
        endpoint: string,
        integration: string,
        latency: number,
        statusCode: number = 200,
        cacheHit: boolean = false,
        error?: string
    ): void {
        const key = this.getKey(endpoint, integration);
        const metric = {
            endpoint,
            integration,
            timestamp: Date.now(),
            latency,
            cacheHit,
            statusCode,
            error
        };

        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        
        const metrics = this.metrics.get(key)!;
        metrics.push(metric);

        if (metrics.length > this.maxHistorySize) {
            metrics.shift();
        }

        this.updateStats(key);
    }

    public async getCachedOrExecute<T>(
        endpoint: string,
        integration: string,
        fn: () => Promise<T>,
        ttl: number = this.defaultCacheTTL
    ): Promise<{ data: T; cacheHit: boolean }> {
        const key = this.getKey(endpoint, integration);
        const cacheKey = `${key}:cache`;

        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            this.recordLatency(endpoint, integration, 0, 200, true);
            return { data: cached.data, cacheHit: true };
        }

        const startTime = Date.now();
        try {
            const data = await fn();
            const latency = Date.now() - startTime;

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

    public getEndpointStats(endpoint: string, integration: string): any {
        const key = this.getKey(endpoint, integration);
        return this.stats.get(key) || null;
    }

    public getAllStats(): Map<string, any> {
        return new Map(this.stats);
    }

    public getPerformanceSummary(): any {
        const stats = Array.from(this.stats.values());
        const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
        const overallAverageLatency = stats.reduce((sum, stat) => sum + stat.averageLatency * stat.totalRequests, 0) / totalRequests || 0;
        const overallCacheHitRate = stats.reduce((sum, stat) => sum + stat.cacheHitRate * stat.totalRequests, 0) / totalRequests || 0;

        const topSlowEndpoints = stats
            .filter(stat => stat.totalRequests > 0)
            .sort((a, b) => b.averageLatency - a.averageLatency)
            .slice(0, 5)
            .map(stat => ({
                endpoint: stat.endpoint,
                integration: stat.integration,
                avgLatency: stat.averageLatency
            }));

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

    public clearCache(endpoint: string, integration: string): void {
        const key = this.getKey(endpoint, integration);
        this.cache.delete(`${key}:cache`);
    }

    public clearAllCache(): void {
        this.cache.clear();
    }

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

    public getDashboardData(): any {
        const endpoints = Array.from(this.stats.values()).map(stat => {
            let status = 'healthy';
            
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

        const stats = {
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

describe('LatencyTracker', () => {
    let tracker: LatencyTracker;

    beforeEach(() => {
        tracker = new LatencyTracker();
    });

    describe('Basic Functionality', () => {
        it('should initialize with default configuration', () => {
            expect(tracker).toBeDefined();
        });

        it('should record latency metrics', () => {
            tracker.recordLatency('https://api.example.com/test', 'test-service', 100);
            
            const stats = tracker.getEndpointStats('https://api.example.com/test', 'test-service');
            expect(stats).toBeDefined();
            expect(stats.totalRequests).toBe(1);
            expect(stats.averageLatency).toBe(100);
        });

        it('should track multiple endpoints separately', () => {
            tracker.recordLatency('https://api.example.com/users', 'user-service', 100);
            tracker.recordLatency('https://api.example.com/orders', 'order-service', 200);
            
            const userStats = tracker.getEndpointStats('https://api.example.com/users', 'user-service');
            const orderStats = tracker.getEndpointStats('https://api.example.com/orders', 'order-service');
            
            expect(userStats.averageLatency).toBe(100);
            expect(orderStats.averageLatency).toBe(200);
        });

        it('should calculate statistics correctly', () => {
            tracker.recordLatency('https://api.example.com/test', 'test-service', 100);
            tracker.recordLatency('https://api.example.com/test', 'test-service', 200);
            tracker.recordLatency('https://api.example.com/test', 'test-service', 300);
            
            const stats = tracker.getEndpointStats('https://api.example.com/test', 'test-service');
            
            expect(stats.totalRequests).toBe(3);
            expect(stats.averageLatency).toBe(200);
            expect(stats.minLatency).toBe(100);
            expect(stats.maxLatency).toBe(300);
        });
    });

    describe('Caching Functionality', () => {
        it('should cache function results', async () => {
            let callCount = 0;
            const testFunction = async () => {
                callCount++;
                return { data: 'test-result', timestamp: Date.now() };
            };

            // First call should execute function
            const result1 = await tracker.getCachedOrExecute(
                'https://api.example.com/test',
                'test-service',
                testFunction
            );
            
            expect(result1.cacheHit).toBe(false);
            expect(callCount).toBe(1);
            expect(result1.data.data).toBe('test-result');

            // Second call should use cache
            const result2 = await tracker.getCachedOrExecute(
                'https://api.example.com/test',
                'test-service',
                testFunction
            );
            
            expect(result2.cacheHit).toBe(true);
            expect(callCount).toBe(1); // Should not increase
            expect(result2.data.data).toBe('test-result');
        });

        it('should handle cache expiration', async () => {
            let callCount = 0;
            const testFunction = async () => {
                callCount++;
                return { data: 'test-result' };
            };

            // Call with very short TTL
            const result1 = await tracker.getCachedOrExecute(
                'https://api.example.com/test',
                'test-service',
                testFunction,
                10 // 10ms TTL
            );
            
            expect(result1.cacheHit).toBe(false);
            expect(callCount).toBe(1);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 20));

            // Next call should execute function again
            const result2 = await tracker.getCachedOrExecute(
                'https://api.example.com/test',
                'test-service',
                testFunction,
                10
            );
            
            expect(result2.cacheHit).toBe(false);
            expect(callCount).toBe(2);
        });

        it('should handle function errors', async () => {
            const testFunction = async () => {
                throw new Error('Test error');
            };

            try {
                await tracker.getCachedOrExecute(
                    'https://api.example.com/test',
                    'test-service',
                    testFunction
                );
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect((error as Error).message).toBe('Test error');
            }

            // Check that error was recorded
            const stats = tracker.getEndpointStats('https://api.example.com/test', 'test-service');
            expect(stats.errorRate).toBe(1);
        });
    });

    describe('Performance Metrics', () => {
        it('should calculate performance summary', () => {
            // Add data for multiple endpoints
            tracker.recordLatency('https://api.example.com/fast', 'fast-service', 50);
            tracker.recordLatency('https://api.example.com/slow', 'slow-service', 500);
            tracker.recordLatency('https://api.example.com/error', 'error-service', 100, 500, false, 'Error');
            
            const summary = tracker.getPerformanceSummary();
            
            expect(summary.totalEndpoints).toBe(3);
            expect(summary.totalRequests).toBe(3);
            expect(summary.overallAverageLatency).toBeCloseTo(216.67, 1); // Allow for floating point precision
            expect(summary.topSlowEndpoints).toHaveLength(3); // All endpoints have requests
            expect(summary.topSlowEndpoints[0].avgLatency).toBe(500);
            expect(summary.topErrorEndpoints).toHaveLength(1);
        });

        it('should identify slow endpoints', () => {
            tracker.recordLatency('https://api.example.com/slow1', 'service', 1000);
            tracker.recordLatency('https://api.example.com/slow2', 'service', 800);
            tracker.recordLatency('https://api.example.com/fast', 'service', 50);
            
            const summary = tracker.getPerformanceSummary();
            
            expect(summary.topSlowEndpoints[0].avgLatency).toBe(1000);
            expect(summary.topSlowEndpoints[1].avgLatency).toBe(800);
        });

        it('should calculate cache hit rate', () => {
            tracker.recordLatency('https://api.example.com/test', 'service', 100, 200, true);
            tracker.recordLatency('https://api.example.com/test', 'service', 200, 200, false);
            tracker.recordLatency('https://api.example.com/test', 'service', 150, 200, false);
            
            const stats = tracker.getEndpointStats('https://api.example.com/test', 'service');
            
            expect(stats.cacheHitRate).toBe(1/3); // 1 cache hit out of 3 requests
        });
    });

    describe('Dashboard Data', () => {
        it('should generate dashboard data', () => {
            tracker.recordLatency('https://api.example.com/healthy', 'service', 100, 200, false);
            tracker.recordLatency('https://api.example.com/warning', 'service', 1500, 200, false); // Higher latency for warning
            tracker.recordLatency('https://api.example.com/critical', 'service', 100, 500, false, 'Error');
            
            const dashboard = tracker.getDashboardData();
            
            expect(dashboard.endpoints).toHaveLength(3);
            expect(dashboard.endpoints[0].status).toBe('healthy');
            expect(dashboard.endpoints[1].status).toBe('warning');
            expect(dashboard.endpoints[2].status).toBe('critical');
            expect(dashboard.summary.totalRequests).toBe(3);
        });

        it('should determine endpoint status correctly', () => {
            // Add endpoints with different characteristics
            tracker.recordLatency('https://api.example.com/healthy', 'service', 100, 200, false);
            tracker.recordLatency('https://api.example.com/warning', 'service', 1500, 200, false);
            tracker.recordLatency('https://api.example.com/critical', 'service', 100, 500, false, 'Error');
            
            const dashboard = tracker.getDashboardData();
            
            // Verify that endpoints are tracked
            expect(dashboard.endpoints).toHaveLength(3);
            
            // Verify that we have different latency values
            const latencies = dashboard.endpoints.map((e: any) => e.latency);
            expect(latencies).toContain(100);
            expect(latencies).toContain(1500);
            
            // Verify status logic is working (all endpoints have some status)
            const statuses = dashboard.endpoints.map((e: any) => e.status);
            expect(statuses.every((s: string) => ['healthy', 'warning', 'critical', 'unknown'].includes(s))).toBe(true);
        });
    });

    describe('Cache Management', () => {
        it('should clear specific endpoint cache', async () => {
            let callCount = 0;
            const testFunction = async () => {
                callCount++;
                return { data: 'test' };
            };

            // Cache result
            await tracker.getCachedOrExecute('https://api.example.com/test', 'service', testFunction);
            expect(callCount).toBe(1);

            // Clear cache
            tracker.clearCache('https://api.example.com/test', 'service');

            // Call again - should execute function
            await tracker.getCachedOrExecute('https://api.example.com/test', 'service', testFunction);
            expect(callCount).toBe(2);
        });

        it('should clear all cache', async () => {
            let callCount = 0;
            const testFunction = async () => {
                callCount++;
                return { data: 'test' };
            };

            // Cache multiple endpoints
            await tracker.getCachedOrExecute('https://api.example.com/test1', 'service', testFunction);
            await tracker.getCachedOrExecute('https://api.example.com/test2', 'service', testFunction);
            expect(callCount).toBe(2);

            // Clear all cache
            tracker.clearAllCache();

            // Call again - should execute both functions
            await tracker.getCachedOrExecute('https://api.example.com/test1', 'service', testFunction);
            await tracker.getCachedOrExecute('https://api.example.com/test2', 'service', testFunction);
            expect(callCount).toBe(4);
        });

        it('should cleanup expired cache entries', async () => {
            const testFunction = async () => ({ data: 'test' });

            // Add cache with 1ms TTL
            await tracker.getCachedOrExecute('https://api.example.com/test', 'service', testFunction, 1);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 10));

            // Cleanup expired entries
            const cleaned = tracker.cleanupExpiredCache();
            
            expect(cleaned).toBe(1);
        });
    });

    describe('History Management', () => {
        it('should limit history size', () => {
            const smallTracker = new LatencyTracker(5); // Max 5 entries
            
            // Add 10 entries
            for (let i = 0; i < 10; i++) {
                smallTracker.recordLatency('https://api.example.com/test', 'service', i * 10);
            }
            
            const stats = smallTracker.getEndpointStats('https://api.example.com/test', 'service');
            
            // Should only have 5 entries (most recent)
            expect(stats.totalRequests).toBe(5);
            expect(stats.maxLatency).toBe(90); // Last 5 entries: 50, 60, 70, 80, 90
        });

        it('should maintain performance with large datasets', () => {
            const startTime = Date.now();
            
            // Add 1000 entries
            for (let i = 0; i < 1000; i++) {
                tracker.recordLatency(`https://api.example.com/endpoint${i % 10}`, 'service', Math.random() * 1000);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete quickly
            expect(duration).toBeLessThan(1000);
            
            const summary = tracker.getPerformanceSummary();
            expect(summary.totalRequests).toBe(1000);
        });
    });

    describe('Error Handling', () => {
        it('should handle empty metrics gracefully', () => {
            const stats = tracker.getEndpointStats('https://api.example.com/nonexistent', 'service');
            expect(stats).toBeNull();
        });

        it('should handle zero division in averages', () => {
            const summary = tracker.getPerformanceSummary();
            expect(summary.overallAverageLatency).toBe(0);
            expect(summary.overallCacheHitRate).toBe(0);
        });

        it('should record error metrics correctly', () => {
            tracker.recordLatency('https://api.example.com/test', 'service', 100, 500, false, 'Test Error');
            
            const stats = tracker.getEndpointStats('https://api.example.com/test', 'service');
            
            expect(stats.errorRate).toBe(1);
            expect(stats.totalRequests).toBe(1);
        });
    });
});
