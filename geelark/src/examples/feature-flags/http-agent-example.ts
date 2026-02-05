#!/usr/bin/env bun

/**
 * HTTP Agent Connection Pool Example
 * 
 * Demonstrates the fixed http.Agent connection pooling with keepAlive.
 * Three bugs were fixed:
 * 1. Property name (keepalive vs keepAlive)
 * 2. Connection: keep-alive header handling
 * 3. Case-insensitive header parsing (RFC 7230)
 */

import http from "node:http";

// Create agent with keepAlive (fixed: use keepAlive, not keepalive)
export const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000, // Time to keep connections alive
  maxSockets: 5, // Max concurrent connections
  maxFreeSockets: 2, // Max idle connections
});

// Make request with connection reuse
export function makeRequestWithAgent(options: http.RequestOptions) {
  return new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = http.request(
      {
        ...options,
        agent: agent, // Connection will be reused
      },
      (res) => {
        resolve(res);
      }
    );

    req.on("error", reject);
    req.end();
  });
}

// Example: Multiple requests reusing the same connection
export async function exampleConnectionReuse() {
  const requests = [
    makeRequestWithAgent({
      hostname: "example.com",
      port: 80,
      path: "/",
    }),
    makeRequestWithAgent({
      hostname: "example.com",
      port: 80,
      path: "/about",
    }),
    makeRequestWithAgent({
      hostname: "example.com",
      port: 80,
      path: "/contact",
    }),
  ];

  // All requests should reuse the same connection
  await Promise.all(requests);

  // Clean up
  agent.destroy();
}

// Example: Proper keepAlive configuration
export function createOptimizedAgent() {
  return new http.Agent({
    keepAlive: true, // ✅ Correct property name (not keepalive)
    keepAliveMsecs: 2000, // Keep connections alive for 2 seconds
    maxSockets: 10, // Allow up to 10 concurrent connections
    maxFreeSockets: 5, // Keep up to 5 idle connections
    timeout: 5000, // Connection timeout
  });
}

