#!/usr/bin/env node

/**
 * FactoryWager Performance Optimizations
 * Implements caching, connection pooling, and request batching
 */

const fs = require('fs');
const path = require('path');

class PerformanceOptimizer {
    constructor(options = {}) {
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || 30000; // 30 seconds
        this.maxCacheSize = options.maxCacheSize || 100;
        this.connectionPool = [];
        this.maxConnections = options.maxConnections || 10;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    // Response Caching
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            this.cacheHits++;
            return cached.data;
        }
        this.cacheMisses++;
        this.cache.delete(key);
        return null;
    }

    generateCacheKey(method, endpoint, data = null) {
        // Include method and endpoint
        let key = `${method}:${endpoint}`;
        
        // For non-GET requests, include data hash
        if (method !== 'GET' && data) {
            const dataHash = this.hashData(data);
            key += `:${dataHash}`;
        }
        
        return key;
    }

    hashData(data) {
        // Simple hash function for cache keys
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    setCachedData(key, data) {
        // Clean expired entries first
        this.cleanExpiredEntries();
        
        // Enforce cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldestEntries(Math.floor(this.maxCacheSize * 0.2)); // Remove 20%
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    cleanExpiredEntries() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    evictOldestEntries(count) {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    // Connection Pooling
    async getConnection() {
        if (this.connectionPool.length > 0) {
            return this.connectionPool.pop();
        }
        return null; // Let browser create new connection
    }

    releaseConnection(connection) {
        if (this.connectionPool.length < this.maxConnections) {
            this.connectionPool.push(connection);
        }
    }

    // Request Batching
    async batchRequests(requests) {
        const batchSize = 5;
        const results = [];
        
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
                batch.map(req => this.executeRequest(req))
            );
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < requests.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    async executeRequest(request) {
        const cacheKey = `${request.method}:${request.url}`;
        
        // Check cache for GET requests
        if (request.method === 'GET') {
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                body: request.body
            });
            
            const data = await response.json();
            
            // Cache successful GET requests
            if (request.method === 'GET' && response.ok) {
                this.setCachedData(cacheKey, data);
            }
            
            return data;
        } catch (error) {
            console.error(`Request failed: ${error.message}`);
            throw error;
        }
    }

    // Memory Optimization
    optimizeMemory() {
        // Clear old cache entries
        for (const [key, value] of this.cache.entries()) {
            if (Date.now() - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
        
        // Limit connection pool size
        if (this.connectionPool.length > this.maxConnections) {
            this.connectionPool = this.connectionPool.slice(0, this.maxConnections);
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    // Performance Metrics
    getPerformanceStats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0 
            ? this.cacheHits / (this.cacheHits + this.cacheMisses) 
            : 0;
            
        return {
            cacheSize: this.cache.size,
            connectionPoolSize: this.connectionPool.length,
            cacheHitRate: hitRate,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            memoryUsage: process.memoryUsage(),
            cacheTimeout: this.cacheTimeout,
            maxCacheSize: this.maxCacheSize
        };
    }
}

// CLI Integration
function optimizeCLICommand(originalFunction, cacheKey, ttl = 30000) {
    const optimizer = new PerformanceOptimizer();
    
    return async function(...args) {
        const key = `${cacheKey}:${JSON.stringify(args)}`;
        const cached = optimizer.getCachedData(key);
        
        if (cached) {
            console.log('📋 Using cached data...');
            return cached;
        }
        
        console.log('🔄 Executing command...');
        const result = await originalFunction.apply(this, args);
        optimizer.setCachedData(key, result);
        
        return result;
    };
}

// Export for use in main CLI
module.exports = {
    PerformanceOptimizer,
    optimizeCLICommand
};

// Auto-cleanup every 5 minutes
setInterval(() => {
    const optimizer = new PerformanceOptimizer();
    optimizer.optimizeMemory();
}, 300000);
