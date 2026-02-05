// Bun Proxy API - Complete Properties Reference Implementation

// Export main classes and utilities
export {
  ProxyConfigBuilder,
  ProxyServerConfig,
  WebSocketProxyConfigurationError,
} from "./config";
export { BunProxyServer } from "./server";

// Export the createProxyConfig function
import { ProxyConfigBuilder as ConfigBuilder } from "./config";
export const createProxyConfig = () => new ConfigBuilder();

// Export types
export * from "./types";

// Example usage
import { BunProxyServer, ProxyServerConfig } from "./index";

/**
 * Example: Basic WebSocket Proxy
 */
async function basicExample() {
  const config = new ProxyServerConfig({
    targetUrl: "ws://localhost:8080/ws",
    listenPort: 3000,
    debug: true,
  });

  const server = new BunProxyServer(config);
  await server.start();
  console.log("Basic proxy server running on ws://localhost:3000");
}

/**
 * Example: Production-ready Proxy with TLS and Authentication
 */
async function productionExample() {
  const config = new ProxyServerConfig({
    targetUrl: "wss://backend.example.com/ws",
    listenPort: 443,
    listenHost: "0.0.0.0",

    // TLS configuration
    tls: {
      cert: await Bun.file("./cert.pem").text(),
      key: await Bun.file("./key.pem").text(),
    },

    // Authentication
    authentication: {
      type: "bearer",
      token: "your-secret-token",
    },

    // Rate limiting
    rateLimiting: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },

    // Performance settings
    maxConnections: 10000,
    idleTimeout: 60000,
    compression: {
      enabled: true,
      algorithm: "gzip",
      level: 6,
    },

    // Health checks
    health: {
      enabled: true,
      endpoint: "/health",
      interval: 30000,
    },

    // Statistics
    stats: {
      collectionInterval: 5000,
      exportFormat: "json",
    },
  });

  const server = new BunProxyServer(config);
  await server.start();
  console.log("Production proxy server running on wss://localhost:443");
}

/**
 * Example: Load Balanced Proxy
 */
async function loadBalancedExample() {
  const config = new ProxyServerConfig({
    targetUrl: "ws://backend1.example.com/ws", // Primary target
    listenPort: 3000,

    // Load balancing configuration
    loadBalancing: {
      strategy: "round-robin",
      targets: [
        { url: "ws://backend1.example.com/ws", weight: 1 },
        { url: "ws://backend2.example.com/ws", weight: 2 },
        { url: "ws://backend3.example.com/ws", weight: 1 },
      ],
      healthCheck: {
        enabled: true,
        endpoint: "/health",
        interval: 10000,
        unhealthyThreshold: 3,
        healthyThreshold: 2,
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30000,
      },
    },
  });

  const server = new BunProxyServer(config);
  await server.start();
  console.log("Load balanced proxy server running on ws://localhost:3000");
}

/**
 * Example: Using the Configuration Builder
 */
async function builderExample() {
  const config = createProxyConfig()
    .target("ws://localhost:8080/ws")
    .port(3000)
    .host("localhost")
    .maxConnections(1000)
    .idleTimeout(30000)
    .debug(true)
    .build();

  const server = new BunProxyServer(config);
  await server.start();
  console.log("Builder-based proxy server running on ws://localhost:3000");
}

// Export examples for documentation
export const examples = {
  basicExample,
  productionExample,
  loadBalancedExample,
  builderExample,
};

// Run basic example if this file is executed directly
if (import.meta.main) {
  basicExample().catch(console.error);
}
