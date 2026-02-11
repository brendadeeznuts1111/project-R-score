#!/usr/bin/env bun
/**
 * HTTP/2 Load Balancer with Connection Upgrade
 * 
 * Demonstrates load balancing with HTTP/2, health checking,
 * failover strategies, connection distribution, and performance optimization.
 */

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";

console.log("⚖️  HTTP/2 Load Balancer Implementation\n");
console.log("=".repeat(70));

// ============================================================================
// Backend Server Configuration
// ============================================================================

interface BackendServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  activeConnections: number;
  totalRequests: number;
  errorCount: number;
  lastHealthCheck: number;
}

// ============================================================================
// Load Balancing Strategies
// ============================================================================

enum LoadBalanceStrategy {
  ROUND_ROBIN = "round-robin",
  WEIGHTED_ROUND_ROBIN = "weighted-round-robin",
  LEAST_CONNECTIONS = "least-connections",
  LEAST_RESPONSE_TIME = "least-response-time",
  IP_HASH = "ip-hash",
}

class HTTP2LoadBalancer {
  private backends: BackendServer[];
  private strategy: LoadBalanceStrategy;
  private currentIndex: number = 0;
  private h2Server: ReturnType<typeof createSecureServer>;
  private netServer: ReturnType<typeof createServer>;
  private healthCheckInterval: number = 5000;
  private healthCheckTimer?: Timer;
  
  constructor(
    backends: Omit<BackendServer, "healthy" | "activeConnections" | "totalRequests" | "errorCount" | "lastHealthCheck">[],
    strategy: LoadBalanceStrategy = LoadBalanceStrategy.ROUND_ROBIN,
    keyPath: string,
    certPath: string
  ) {
    this.backends = backends.map(backend => ({
      ...backend,
      healthy: true,
      activeConnections: 0,
      totalRequests: 0,
      errorCount: 0,
      lastHealthCheck: Date.now(),
    }));
    
    this.strategy = strategy;
    
    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);
    
    this.h2Server = createSecureServer({ key, cert });
    this.setupH2Handlers();
    
    this.netServer = createServer((rawSocket) => {
      this.h2Server.emit("connection", rawSocket);
    });
    
    this.startHealthChecks();
  }
  
  private setupH2Handlers(): void {
    this.h2Server.on("stream", async (stream, headers) => {
      const backend = this.selectBackend(headers);
      
      if (!backend) {
        stream.respond({ ":status": 503 });
        stream.end("No healthy backends available");
        return;
      }
      
      backend.activeConnections++;
      backend.totalRequests++;
      
      try {
        await this.forwardToBackend(stream, headers, backend);
      } catch (error) {
        backend.errorCount++;
        stream.respond({ ":status": 502 });
        stream.end("Backend error");
      } finally {
        backend.activeConnections--;
      }
    });
  }
  
  private selectBackend(headers: Record<string, string | string[]>): BackendServer | null {
    const healthyBackends = this.backends.filter(b => b.healthy);
    
    if (healthyBackends.length === 0) {
      return null;
    }
    
    switch (this.strategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        return this.roundRobin(healthyBackends);
      
      case LoadBalanceStrategy.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobin(healthyBackends);
      
      case LoadBalanceStrategy.LEAST_CONNECTIONS:
        return this.leastConnections(healthyBackends);
      
      case LoadBalanceStrategy.LEAST_RESPONSE_TIME:
        return this.leastResponseTime(healthyBackends);
      
      case LoadBalanceStrategy.IP_HASH:
        return this.ipHash(healthyBackends, headers);
      
      default:
        return healthyBackends[0];
    }
  }
  
  private roundRobin(backends: BackendServer[]): BackendServer {
    const backend = backends[this.currentIndex % backends.length];
    this.currentIndex++;
    return backend;
  }
  
  private weightedRoundRobin(backends: BackendServer[]): BackendServer {
    const totalWeight = backends.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const backend of backends) {
      random -= backend.weight;
      if (random <= 0) {
        return backend;
      }
    }
    
    return backends[0];
  }
  
  private leastConnections(backends: BackendServer[]): BackendServer {
    return backends.reduce((min, backend) =>
      backend.activeConnections < min.activeConnections ? backend : min
    );
  }
  
  private leastResponseTime(backends: BackendServer[]): BackendServer {
    // Simplified - would track actual response times
    return backends.reduce((min, backend) =>
      backend.errorCount < min.errorCount ? backend : min
    );
  }
  
  private ipHash(backends: BackendServer[], headers: Record<string, string | string[]>): BackendServer {
    const clientIP = headers["x-forwarded-for"] as string || headers[":authority"] as string || "";
    const hash = this.simpleHash(clientIP);
    return backends[hash % backends.length];
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private async forwardToBackend(
    stream: any,
    headers: Record<string, string | string[]>,
    backend: BackendServer
  ): Promise<void> {
    const url = `https://${backend.host}:${backend.port}${headers[":path"]}`;
    const method = headers[":method"] as string;
    
    const response = await fetch(url, {
      method,
      headers: Object.fromEntries(
        Object.entries(headers).filter(([key]) => !key.startsWith(":"))
      ),
    });
    
    const responseHeaders: Record<string, string> = {
      ":status": response.status.toString(),
    };
    
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });
    
    stream.respond(responseHeaders);
    
    const body = await response.arrayBuffer();
    stream.end(Buffer.from(body));
  }
  
  private async startHealthChecks(): Promise<void> {
    const checkHealth = async () => {
      for (const backend of this.backends) {
        try {
          const response = await fetch(`https://${backend.host}:${backend.port}/health`, {
            signal: AbortSignal.timeout(2000),
          });
          
          backend.healthy = response.ok;
          backend.lastHealthCheck = Date.now();
        } catch (error) {
          backend.healthy = false;
          backend.lastHealthCheck = Date.now();
        }
      }
    };
    
    // Initial check
    await checkHealth();
    
    // Periodic checks
    this.healthCheckTimer = setInterval(checkHealth, this.healthCheckInterval);
  }
  
  start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.netServer.listen(port, () => {
        console.log(`✅ HTTP/2 Load Balancer listening on port ${port}`);
        console.log(`   Strategy: ${this.strategy}`);
        console.log(`   Backends: ${this.backends.length}`);
        resolve();
      });
    });
  }
  
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.netServer.close();
    this.h2Server.close();
  }
  
  getStats(): {
    backends: Array<{
      id: string;
      healthy: boolean;
      activeConnections: number;
      totalRequests: number;
      errorCount: number;
    }>;
    strategy: string;
  } {
    return {
      backends: this.backends.map(b => ({
        id: b.id,
        healthy: b.healthy,
        activeConnections: b.activeConnections,
        totalRequests: b.totalRequests,
        errorCount: b.errorCount,
      })),
      strategy: this.strategy,
    };
  }
}

// ============================================================================
// Example Usage
// ============================================================================

console.log("\n📝 Example: HTTP/2 Load Balancer");
console.log("-".repeat(70));

console.log(`
const loadBalancer = new HTTP2LoadBalancer(
  [
    { id: "backend-1", host: "api1.example.com", port: 443, weight: 1 },
    { id: "backend-2", host: "api2.example.com", port: 443, weight: 2 },
    { id: "backend-3", host: "api3.example.com", port: 443, weight: 1 },
  ],
  LoadBalanceStrategy.WEIGHTED_ROUND_ROBIN,
  "key.pem",
  "cert.pem"
);

await loadBalancer.start(8443);
`);

console.log("\nAvailable Strategies:");
Object.values(LoadBalanceStrategy).forEach(strategy => {
  console.log(`  • ${strategy}`);
});

console.log("\n✅ HTTP/2 Load Balancer Implementation Complete!");
console.log("\nKey Features:");
console.log("  • Multiple load balancing strategies");
console.log("  • Health checking with automatic failover");
console.log("  • Connection distribution");
console.log("  • Performance metrics");
console.log("  • HTTP/2 connection upgrade pattern");
