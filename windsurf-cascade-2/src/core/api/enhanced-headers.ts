// Enhanced Headers with Latency Tracking and Caching
// Provides standardized headers with per-endpoint performance monitoring

import LatencyTracker from '../metrics/latency-tracker';
import { ColorSchemeManager } from '../ui/color-schemes';

export interface EndpointConfig {
    url: string;
    integration: string;
    method: string;
    cacheable: boolean;
    cacheTTL?: number;
    timeout: number;
    retries: number;
    headers: Record<string, string>;
}

export interface RequestMetrics {
    endpoint: string;
    integration: string;
    method: string;
    statusCode: number;
    latency: number;
    cacheHit: boolean;
    timestamp: number;
    error?: string;
}

export interface StandardizedHeaders {
    // Standard headers
    'Content-Type': string;
    'Accept': string;
    'User-Agent': string;
    
    // Tracking headers
    'X-Request-ID': string;
    'X-Client-Version': string;
    'X-Integration': string;
    'X-Endpoint': string;
    
    // Performance headers
    'X-Request-Start': string;
    'X-Client-Timestamp': string;
    
    // Cache headers
    'X-Cache-Control': string;
    'X-Cache-Key': string;
    
    // Security headers
    'X-Security-Token': string;
    'X-Request-Signature': string;
    
    // Custom headers
    [key: string]: string;
}

class EnhancedHeaderManager {
    private latencyTracker: LatencyTracker;
    private endpoints: Map<string, EndpointConfig> = new Map();
    private clientVersion: string;
    private securityToken: string;
    private defaultTimeout: number = 5000;
    private defaultRetries: number = 3;

    constructor(config: {
        clientVersion?: string;
        securityToken?: string;
        defaultTimeout?: number;
        defaultRetries?: number;
    } = {}) {
        this.latencyTracker = new LatencyTracker();
        this.clientVersion = config.clientVersion || '1.0.0';
        this.securityToken = config.securityToken || 'default-token';
        this.defaultTimeout = config.defaultTimeout || 5000;
        this.defaultRetries = config.defaultRetries || 3;
    }

    // Register endpoint configuration
    public registerEndpoint(key: string, config: EndpointConfig): void {
        this.endpoints.set(key, config);
    }

    // Get standardized headers for a request
    public getHeaders(endpointKey: string, customHeaders?: Record<string, string>): StandardizedHeaders {
        const endpoint = this.endpoints.get(endpointKey);
        const requestId = this.generateRequestId();
        const timestamp = Date.now().toString();
        
        const baseHeaders: StandardizedHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': `LineHistoryClient/${this.clientVersion}`,
            'X-Request-ID': requestId,
            'X-Client-Version': this.clientVersion,
            'X-Integration': endpoint?.integration || 'unknown',
            'X-Endpoint': endpoint?.url || 'unknown',
            'X-Request-Start': timestamp,
            'X-Client-Timestamp': timestamp,
            'X-Cache-Control': endpoint?.cacheable ? 'max-age=300' : 'no-cache',
            'X-Cache-Key': this.generateCacheKey(endpointKey),
            'X-Security-Token': this.securityToken,
            'X-Request-Signature': this.generateSignature(requestId, timestamp),
            ...endpoint?.headers,
            ...customHeaders
        };

        return baseHeaders;
    }

    // Make enhanced request with latency tracking
    public async makeRequest<T>(
        endpointKey: string,
        options: {
            method?: string;
            body?: any;
            customHeaders?: Record<string, string>;
            timeout?: number;
            retries?: number;
        } = {}
    ): Promise<{ data: T; metrics: RequestMetrics }> {
        const endpoint = this.endpoints.get(endpointKey);
        if (!endpoint) {
            throw new Error(`Endpoint ${endpointKey} not registered`);
        }

        const startTime = Date.now();
        const method = options.method || endpoint.method;
        const timeout = options.timeout || endpoint.timeout;
        const retries = options.retries || endpoint.retries;

        let lastError: Error | null = null;
        let statusCode = 0;
        let cacheHit = false;

        // Check cache first if cacheable
        if (endpoint.cacheable) {
            try {
                const cached = await this.latencyTracker.getCachedOrExecute(
                    endpoint.url,
                    endpoint.integration,
                    () => this.executeRequest<T>(endpoint, method, options.body, options.customHeaders, timeout),
                    endpoint.cacheTTL
                );
                
                cacheHit = cached.cacheHit;
                const latency = Date.now() - startTime;
                
                const metrics: RequestMetrics = {
                    endpoint: endpoint.url,
                    integration: endpoint.integration,
                    method,
                    statusCode: 200,
                    latency,
                    cacheHit,
                    timestamp: startTime
                };

                this.latencyTracker.recordLatency(
                    endpoint.url,
                    endpoint.integration,
                    latency,
                    200,
                    cacheHit
                );

                return { data: cached.data, metrics };
            } catch (error) {
                lastError = error as Error;
            }
        }

        // Execute with retries
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const data = await this.executeRequest<T>(endpoint, method, options.body, options.customHeaders, timeout);
                const latency = Date.now() - startTime;
                
                const metrics: RequestMetrics = {
                    endpoint: endpoint.url,
                    integration: endpoint.integration,
                    method,
                    statusCode: 200,
                    latency,
                    cacheHit,
                    timestamp: startTime
                };

                this.latencyTracker.recordLatency(
                    endpoint.url,
                    endpoint.integration,
                    latency,
                    200,
                    cacheHit
                );

                return { data, metrics };
            } catch (error) {
                lastError = error as Error;
                statusCode = (error as any).status || 500;
                
                if (attempt < retries) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }

        // All retries failed
        const latency = Date.now() - startTime;
        const errorMessage = lastError?.message || 'Unknown error';
        
        const metrics: RequestMetrics = {
            endpoint: endpoint.url,
            integration: endpoint.integration,
            method,
            statusCode,
            latency,
            cacheHit,
            timestamp: startTime,
            error: errorMessage
        };

        this.latencyTracker.recordLatency(
            endpoint.url,
            endpoint.integration,
            latency,
            statusCode,
            cacheHit,
            errorMessage
        );

        throw lastError || new Error('Request failed after all retries');
    }

    // Get performance metrics for all endpoints
    public getPerformanceMetrics(): any {
        return this.latencyTracker.getDashboardData();
    }

    // Get latency color for visualization
    public getLatencyColor(latency: number): string {
        return ColorSchemeManager.getLatencyColor(latency);
    }

    // Get status color for endpoint
    public getStatusColor(endpointKey: string): string {
        const endpoint = this.endpoints.get(endpointKey);
        if (!endpoint) return ColorSchemeManager.getStatusColor('unknown');

        const stats = this.latencyTracker.getEndpointStats(endpoint.url, endpoint.integration);
        if (!stats) return ColorSchemeManager.getStatusColor('unknown');

        if (stats.errorRate > 0.1) return ColorSchemeManager.getStatusColor('critical');
        if (stats.averageLatency > 1000 || stats.errorRate > 0.05) return ColorSchemeManager.getStatusColor('warning');
        return ColorSchemeManager.getStatusColor('healthy');
    }

    // Clear cache for specific endpoint
    public clearEndpointCache(endpointKey: string): void {
        const endpoint = this.endpoints.get(endpointKey);
        if (endpoint) {
            this.latencyTracker.clearCache(endpoint.url, endpoint.integration);
        }
    }

    // Clear all caches
    public clearAllCaches(): void {
        this.latencyTracker.clearAllCache();
    }

    // Export metrics for analysis
    public exportMetrics(): string {
        return this.latencyTracker.exportMetrics();
    }

    // Get endpoint summary
    public getEndpointSummary(): Array<{
        key: string;
        url: string;
        integration: string;
        status: 'healthy' | 'warning' | 'critical' | 'unknown';
        latency: number;
        cacheHitRate: number;
        errorRate: number;
        requests: number;
    }> {
        const summary = [];
        
        for (const [key, endpoint] of this.endpoints.entries()) {
            const stats = this.latencyTracker.getEndpointStats(endpoint.url, endpoint.integration);
            
            let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown';
            if (stats) {
                if (stats.errorRate > 0.1) {
                    status = 'critical';
                } else if (stats.averageLatency > 1000 || stats.errorRate > 0.05) {
                    status = 'warning';
                } else {
                    status = 'healthy';
                }
            }

            summary.push({
                key,
                url: endpoint.url,
                integration: endpoint.integration,
                status,
                latency: stats?.averageLatency || 0,
                cacheHitRate: stats?.cacheHitRate || 0,
                errorRate: stats?.errorRate || 0,
                requests: stats?.totalRequests || 0
            });
        }

        return summary;
    }

    private async executeRequest<T>(
        endpoint: EndpointConfig,
        method: string,
        body: any,
        customHeaders?: Record<string, string>,
        timeout?: number
    ): Promise<T> {
        const headers = this.getHeaders(endpoint.url, customHeaders);
        
        const response = await fetch(endpoint.url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeout || this.defaultTimeout)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateCacheKey(endpointKey: string): string {
        return `cache_${endpointKey}_${Date.now()}`;
    }

    private generateSignature(requestId: string, timestamp: string): string {
        // Simple signature generation - in production, use proper cryptographic signing
        const data = `${requestId}:${timestamp}:${this.securityToken}`;
        return btoa(data).substr(0, 32);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default EnhancedHeaderManager;
export { EnhancedHeaderManager };
