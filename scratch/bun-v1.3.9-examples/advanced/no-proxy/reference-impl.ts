#!/usr/bin/env bun
/**
 * Production-Ready NO_PROXY Reference Implementation
 * 
 * Complete proxy client with NO_PROXY support, error handling,
 * logging, debugging, and performance monitoring.
 */

import { NO_PROXYMatcher } from "./pattern-matching";

console.log("📚 Production-Ready NO_PROXY Reference Implementation\n");
console.log("=".repeat(70));

// ============================================================================
// Production Proxy Client
// ============================================================================

interface ProxyClientConfig {
  proxy?: string;
  noProxy?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

interface RequestMetrics {
  totalRequests: number;
  proxiedRequests: number;
  bypassedRequests: number;
  errors: number;
  averageLatency: number;
  latencies: number[];
}

class ProductionProxyClient {
  private config: Required<ProxyClientConfig>;
  private matcher?: NO_PROXYMatcher;
  private metrics: RequestMetrics;
  private logger?: (message: string, data?: any) => void;
  
  constructor(config: ProxyClientConfig = {}) {
    this.config = {
      proxy: config.proxy || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "",
      noProxy: config.noProxy || process.env.NO_PROXY || "",
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      enableLogging: config.enableLogging ?? true,
      enableMetrics: config.enableMetrics ?? true,
    };
    
    if (this.config.noProxy) {
      this.matcher = new NO_PROXYMatcher(this.config.noProxy);
    }
    
    this.metrics = {
      totalRequests: 0,
      proxiedRequests: 0,
      bypassedRequests: 0,
      errors: 0,
      averageLatency: 0,
      latencies: [],
    };
    
    if (this.config.enableLogging) {
      this.logger = (message, data) => {
        console.log(`[ProxyClient] ${message}`, data || "");
      };
    }
  }
  
  /**
   * Fetch with automatic proxy handling
   */
  async fetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
    const startTime = performance.now();
    this.metrics.totalRequests++;
    
    try {
      const shouldBypass = this.shouldBypassProxy(url);
      
      if (this.logger) {
        this.logger(`Request to ${url}`, { bypass: shouldBypass });
      }
      
      const fetchOptions: RequestInit = {
        ...options,
        signal: AbortSignal.timeout(this.config.timeout),
      };
      
      if (!shouldBypass && this.config.proxy) {
        fetchOptions.proxy = this.config.proxy;
        this.metrics.proxiedRequests++;
      } else {
        this.metrics.bypassedRequests++;
      }
      
      let lastError: Error | undefined;
      
      // Retry logic
      for (let attempt = 0; attempt <= this.config.retries; attempt++) {
        try {
          const response = await fetch(url, fetchOptions);
          
          const latency = performance.now() - startTime;
          this.recordLatency(latency);
          
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < this.config.retries) {
            const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            
            if (this.logger) {
              this.logger(`Retry ${attempt + 1}/${this.config.retries} for ${url}`);
            }
          }
        }
      }
      
      this.metrics.errors++;
      throw lastError || new Error("Request failed after retries");
    } catch (error) {
      this.metrics.errors++;
      const latency = performance.now() - startTime;
      this.recordLatency(latency);
      
      if (this.logger) {
        this.logger(`Error fetching ${url}`, { error: error instanceof Error ? error.message : String(error) });
      }
      
      throw error;
    }
  }
  
  /**
   * WebSocket with automatic proxy handling
   */
  createWebSocket(
    url: string | URL,
    protocols?: string | string[],
    options?: { proxy?: string }
  ): WebSocket {
    const wsUrl = typeof url === "string" ? url : url.toString();
    const shouldBypass = this.shouldBypassProxy(wsUrl);
    
    if (this.logger) {
      this.logger(`WebSocket to ${wsUrl}`, { bypass: shouldBypass });
    }
    
    const wsOptions: any = {
      ...options,
    };
    
    if (!shouldBypass && this.config.proxy) {
      wsOptions.proxy = options?.proxy || this.config.proxy;
      this.metrics.proxiedRequests++;
    } else {
      this.metrics.bypassedRequests++;
    }
    
    return new WebSocket(wsUrl, protocols, wsOptions);
  }
  
  private shouldBypassProxy(url: string | URL): boolean {
    if (!this.matcher) {
      return false;
    }
    
    return this.matcher.shouldBypass(url);
  }
  
  private recordLatency(latency: number): void {
    if (!this.config.enableMetrics) return;
    
    this.metrics.latencies.push(latency);
    
    // Keep only last 1000 latencies
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies = this.metrics.latencies.slice(-1000);
    }
    
    // Update average
    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.metrics.latencies.length;
  }
  
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      proxiedRequests: 0,
      bypassedRequests: 0,
      errors: 0,
      averageLatency: 0,
      latencies: [],
    };
  }
}

// ============================================================================
// WebSocket Proxy Client
// ============================================================================

class WebSocketProxyClient {
  private config: ProxyClientConfig;
  private matcher?: NO_PROXYMatcher;
  
  constructor(config: ProxyClientConfig = {}) {
    this.config = {
      proxy: config.proxy || process.env.HTTP_PROXY || "",
      noProxy: config.noProxy || process.env.NO_PROXY || "",
    };
    
    if (this.config.noProxy) {
      this.matcher = new NO_PROXYMatcher(this.config.noProxy);
    }
  }
  
  connect(
    url: string | URL,
    protocols?: string | string[],
    options?: { proxy?: string }
  ): WebSocket {
    const wsUrl = typeof url === "string" ? url : url.toString();
    const shouldBypass = this.matcher?.shouldBypass(wsUrl) ?? false;
    
    const wsOptions: any = {
      ...options,
    };
    
    if (!shouldBypass && this.config.proxy) {
      wsOptions.proxy = options?.proxy || this.config.proxy;
    }
    
    return new WebSocket(wsUrl, protocols, wsOptions);
  }
}

// ============================================================================
// Example Usage
// ============================================================================

console.log("\n📝 Example: Production Proxy Client");
console.log("-".repeat(70));

const client = new ProductionProxyClient({
  proxy: "http://corporate-proxy:8080",
  noProxy: "localhost,127.0.0.1,.local",
  timeout: 30000,
  retries: 3,
  enableLogging: true,
  enableMetrics: true,
});

console.log("\nUsage:");
console.log(`
const client = new ProductionProxyClient({
  proxy: "http://proxy:8080",
  noProxy: "localhost,127.0.0.1",
  timeout: 30000,
  retries: 3,
});

// Fetch with automatic proxy handling
const response = await client.fetch("http://api.example.com/data");

// WebSocket with automatic proxy handling
const ws = client.createWebSocket("ws://api.example.com/ws");

// Get metrics
const metrics = client.getMetrics();
console.log(\`Proxied: \${metrics.proxiedRequests}, Bypassed: \${metrics.bypassedRequests}\`);
`);

console.log("\n✅ Reference Implementation Complete!");
console.log("\nKey Features:");
console.log("  • Automatic NO_PROXY checking");
console.log("  • Retry logic with exponential backoff");
console.log("  • Error handling and logging");
console.log("  • Performance metrics");
console.log("  • WebSocket support");
console.log("  • Production-ready error handling");
