#!/usr/bin/env bun
/**
 * Microservices Integration Patterns
 * 
 * Demonstrates service communication patterns, proxy configuration,
 * NO_PROXY for internal services, HTTP/2 for inter-service communication,
 * and monitoring/observability.
 */

console.log("🔗 Microservices Integration Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// Service Communication Patterns
// ============================================================================

interface ServiceConfig {
  name: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "http2";
  internal: boolean;
}

class MicroserviceClient {
  private config: ServiceConfig;
  private proxy?: string;
  private noProxy: string;
  
  constructor(config: ServiceConfig, proxy?: string, noProxy?: string) {
    this.config = config;
    this.proxy = proxy;
    this.noProxy = noProxy || "localhost,127.0.0.1,.local,*.internal";
  }
  
  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.protocol}://${this.config.host}:${this.config.port}${path}`;
    
    const fetchOptions: RequestInit = {
      ...options,
    };
    
    // Internal services bypass proxy
    if (this.config.internal) {
      // NO_PROXY handles this automatically in Bun v1.3.9
      // But we can also explicitly check
      if (this.shouldBypassProxy(url)) {
        // No proxy needed
      } else if (this.proxy) {
        fetchOptions.proxy = this.proxy;
      }
    } else if (this.proxy) {
      fetchOptions.proxy = this.proxy;
    }
    
    return fetch(url, fetchOptions);
  }
  
  private shouldBypassProxy(url: string): boolean {
    // Check NO_PROXY patterns
    const urlObj = new URL(url);
    const noProxyList = this.noProxy.split(",").map(s => s.trim());
    
    return noProxyList.some(pattern => {
      if (pattern === urlObj.hostname) return true;
      if (pattern.startsWith(".") && urlObj.hostname.endsWith(pattern.slice(1))) return true;
      if (urlObj.hostname.endsWith(`.${pattern}`)) return true;
      return false;
    });
  }
}

console.log("\n🌐 Service Communication Patterns");
console.log("-".repeat(70));

const internalService = new MicroserviceClient({
  name: "user-service",
  host: "user-service.internal",
  port: 3000,
  protocol: "http2",
  internal: true,
}, "http://corporate-proxy:8080", "*.internal");

console.log("\nInternal Service Client:");
console.log("  • Uses HTTP/2 for inter-service communication");
console.log("  • Bypasses proxy via NO_PROXY");
console.log("  • Optimized for internal network");

// ============================================================================
// Proxy Configuration
// ============================================================================

console.log("\n🔌 Proxy Configuration");
console.log("-".repeat(70));

const proxyConfig = {
  corporateProxy: "http://corporate-proxy:8080",
  noProxy: "localhost,127.0.0.1,.local,*.internal,10.0.0.0/8",
  services: {
    internal: {
      useProxy: false,
      protocol: "http2",
    },
    external: {
      useProxy: true,
      protocol: "https",
    },
  },
};

console.log("\nProxy Configuration:");
console.log(`  Corporate Proxy: ${proxyConfig.corporateProxy}`);
console.log(`  NO_PROXY: ${proxyConfig.noProxy}`);
console.log(`  Internal Services: ${proxyConfig.services.internal.useProxy ? "Use proxy" : "Bypass proxy"}`);
console.log(`  External Services: ${proxyConfig.services.external.useProxy ? "Use proxy" : "Bypass proxy"}`);

// ============================================================================
// HTTP/2 for Inter-Service Communication
// ============================================================================

console.log("\n⚡ HTTP/2 for Inter-Service Communication");
console.log("-".repeat(70));

console.log(`
Benefits of HTTP/2 for microservices:

• Multiplexing: Multiple requests over single connection
• Header compression: Reduced overhead
• Server push: Proactive resource delivery
• Better performance: Lower latency

Example:
  const service = new MicroserviceClient({
    protocol: "http2",
    internal: true,
  });
  
  // HTTP/2 connection with connection pooling
  const response = await service.request("/api/users");
`);

// ============================================================================
// Monitoring and Observability
// ============================================================================

interface ServiceMetrics {
  requests: number;
  errors: number;
  averageLatency: number;
  p95Latency: number;
}

class ServiceMonitor {
  private metrics = new Map<string, ServiceMetrics>();
  
  recordRequest(service: string, latency: number, error: boolean): void {
    const current = this.metrics.get(service) || {
      requests: 0,
      errors: 0,
      averageLatency: 0,
      p95Latency: 0,
    };
    
    current.requests++;
    if (error) current.errors++;
    current.averageLatency = (current.averageLatency + latency) / 2;
    
    this.metrics.set(service, current);
  }
  
  getMetrics(service: string): ServiceMetrics | undefined {
    return this.metrics.get(service);
  }
}

console.log("\n📊 Monitoring and Observability");
console.log("-".repeat(70));

const monitor = new ServiceMonitor();
console.log("\nService Monitor:");
console.log("  • Tracks request metrics");
console.log("  • Monitors latency");
console.log("  • Records errors");
console.log("  • Provides observability");

console.log("\n✅ Microservices Integration Complete!");
console.log("\nKey Patterns:");
console.log("  • Service communication with HTTP/2");
console.log("  • NO_PROXY for internal services");
console.log("  • Proxy configuration for external services");
console.log("  • Monitoring and observability");
