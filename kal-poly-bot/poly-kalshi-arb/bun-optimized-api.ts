#!/usr/bin/env bun
/**
 * Bun Optimized API Client
 * Enhanced API client with DNS caching, streaming, and performance optimizations
 * Part of the SERO (Shell Environment & Runtime Optimization) system
 */

// DNS functionality will be implemented with native fetch

// API Configuration
interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  enableDnsCache: boolean;
  enableStreaming: boolean;
}

// Request/Response interfaces
interface RequestPayload {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  headers: Headers;
  duration: number;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  responseTime?: number;
  lastCheck: string;
}

/**
 * Bun Optimized API Client with advanced features
 */
class BunOptimizedApiClient {
  private static dnsCache: Map<string, string> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static performanceMetrics: Map<string, number[]> = new Map();
  
  private config: ApiConfig;
  private healthStatus: HealthStatus = {
    status: 'healthy',
    message: 'Client initialized',
    lastCheck: new Date().toISOString()
  };

  constructor(config: ApiConfig) {
    this.config = config;
    this.startHealthMonitoring();
  }

  /**
   * DNS Resolution simulation (Bun DNS not available in current version)
   * In production, this would use Bun's native DNS or external DNS service
   */
  static async resolveDns(hostname: string): Promise<string> {
    const cacheKey = hostname;
    const now = Date.now();
    
    // Check cache expiry (5 minutes)
    const expiry = BunOptimizedApiClient.cacheExpiry.get(cacheKey);
    if (expiry && now < expiry) {
      const cached = BunOptimizedApiClient.dnsCache.get(cacheKey);
      if (cached) {
        console.log(`📍 DNS cache hit for ${hostname}: ${cached}`);
        return cached;
      }
    }

    try {
      console.log(`🔍 Resolving DNS for ${hostname}...`);
      
      // Simulate DNS resolution - in production, use Bun.dns or external service
      // For now, return hostname as-is (normal DNS resolution will happen)
      const ip = hostname; // Placeholder - real DNS happens at network level
      BunOptimizedApiClient.dnsCache.set(cacheKey, ip);
      BunOptimizedApiClient.cacheExpiry.set(cacheKey, now + 5 * 60 * 1000); // 5 minutes
      
      console.log(`✅ Using hostname ${hostname} (DNS resolution handled by system)`);
      return ip;
    } catch (error) {
      console.error(`❌ DNS resolution failed for ${hostname}:`, error);
      throw error;
    }
  }

  /**
   * Fetch with DNS caching and performance optimization
   */
  async fetchWithDnsCache<T>(payload: RequestPayload): Promise<ApiResponse<T>> {
    const startTime = performance.now();

    const endpoint = payload.endpoint;
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = payload.method ?? 'GET';
    let headers = payload.headers ?? {};
    const body = payload.body;
    const timeout = payload.timeout ?? this.config.timeout;

    try {
      // Resolve DNS with caching
      const url = new URL(endpoint, this.config.baseUrl);
      const hostname = url.hostname;

      if (this.config.enableDnsCache) {
        const ip = await BunOptimizedApiClient.resolveDns(hostname);
        url.hostname = ip;

        // Add Host header for IP-based requests
        headers['Host'] = hostname;
      }

      console.log(`📡 ${method} ${url.toString()}`);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'BunOptimizedApiClient/1.0',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      // Perform fetch with retry logic
      const response = await this.fetchWithRetry<T>(url.toString(), fetchOptions);

      const duration = performance.now() - startTime;
      this.recordMetric('request_duration', duration);

      console.log(`✅ ${method} ${endpoint} - ${response.status} (${duration.toFixed(2)}ms)`);

      return {
        success: response.status >= 200 && response.status < 300,
        data: response.status === 204 ? undefined : await response.json().catch(() => undefined),
        status: response.status,
        headers: response.headers,
        duration
      };

    } catch (error) {
      const duration = performance.now() - startTime;

      console.error(`❌ ${method} ${endpoint} failed (${duration.toFixed(2)}ms):`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 0,
        headers: new Headers(),
        duration
      };
    }
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry<T>(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Success case
        if (response.ok) {
          return response;
        }
        
        // Server error - retry
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Client error - don't retry
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`🔄 Retry attempt ${attempt + 1} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Stream large responses efficiently
   */
  async streamLargeResponse(endpoint: string): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    console.log(`🌊 Streaming large response from ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/octet-stream'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Transform stream for processing
    return response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // Process chunk (e.g., parse JSON, validate, etc.)
        controller.enqueue(chunk);
      },
      flush() {
        console.log('✅ Stream completed');
      }
    }));
  }

  /**
   * Health monitoring with performance metrics
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const startTime = performance.now();
        const healthCheck = await this.performHealthCheck();
        const duration = performance.now() - startTime;
        
        this.healthStatus = {
          ...healthCheck,
          responseTime: duration,
          lastCheck: new Date().toISOString()
        };
        
        this.recordMetric('health_check_duration', duration);
        
      } catch (error) {
        this.healthStatus = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Health check failed',
          lastCheck: new Date().toISOString()
        };
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(): Promise<HealthStatus> {
    try {
      const response = await this.fetchWithDnsCache<{ status: string }>({
        endpoint: '/health',
        method: 'GET',
        timeout: 5000
      });

      if (response.success && response.data?.status === 'healthy') {
        return {
          status: 'healthy',
          message: 'API is responsive and functioning correctly',
          lastCheck: new Date().toISOString()
        };
      }

      return {
        status: 'degraded',
        message: 'API responded but with unexpected data',
        lastCheck: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Health check failed',
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Performance metrics tracking
   */
  private recordMetric(metricName: string, value: number): void {
    if (!BunOptimizedApiClient.performanceMetrics.has(metricName)) {
      BunOptimizedApiClient.performanceMetrics.set(metricName, []);
    }
    
    const metrics = BunOptimizedApiClient.performanceMetrics.get(metricName)!;
    metrics.push(value);
    
    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [metric, values] of BunOptimizedApiClient.performanceMetrics.entries()) {
      if (values.length === 0) continue;
      
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats[metric] = { avg, min, max, count: values.length };
    }
    
    return stats;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }

  /**
   * Clear DNS cache
   */
  static clearDnsCache(): void {
    BunOptimizedApiClient.dnsCache.clear();
    BunOptimizedApiClient.cacheExpiry.clear();
    console.log('🗑️ DNS cache cleared');
  }
}

// Enhanced API client factory for SERO integration
class SeroApiClient {
  private client: BunOptimizedApiClient;
  
  constructor() {
    this.client = new BunOptimizedApiClient({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      apiKey: process.env.API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      enableDnsCache: true,
      enableStreaming: true
    });
  }
  
  /**
   * Fetch market data with optimization
   */
  async fetchMarketData(endpoint: string): Promise<ApiResponse<any>> {
    return await this.client.fetchWithDnsCache({
      endpoint,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
  
  /**
   * Stream large market data feeds
   */
  async streamMarketFeed(endpoint: string): Promise<ReadableStream<Uint8Array>> {
    return await this.client.streamLargeResponse(endpoint);
  }
  
  /**
   * Submit trading orders with retry logic
   */
  async submitOrder(orderData: any): Promise<ApiResponse<any>> {
    return await this.client.fetchWithDnsCache({
      endpoint: '/orders',
      method: 'POST',
      body: orderData,
      timeout: 10000 // Shorter timeout for trading
    });
  }
  
  /**
   * Get system health and performance metrics
   */
  getSystemHealth(): HealthStatus {
    return this.client.getHealthStatus();
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return this.client.getPerformanceStats();
  }
}

// Export for use in other modules
export { BunOptimizedApiClient, SeroApiClient };
export type { ApiConfig, RequestPayload, ApiResponse, HealthStatus };
