#!/usr/bin/env bun

// 🚀 Bun Proxy API Complete Demo
// Showcasing the full Bun Proxy ecosystem with table displays

import { createProxyServer, ProxyServerConfig } from './bun-proxy/src/core/server';
import { createHTTPProxy, HTTPProxyConfig } from './bun-proxy/src/protocols/http';
import { createCircuitBreaker, CircuitBreakerConfig } from './bun-proxy/src/patterns/circuit-breaker';

// Demo configuration
const demoConfig = {
  proxy: {
    host: 'localhost',
    port: 8080,
    target: 'http://httpbin.org'
  },
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    name: 'HTTPBinBreaker'
  }
};

// Create proxy server with circuit breaker protection
async function createProtectedProxy() {
  console.log("🔧 Setting up protected HTTP proxy...");

  const breaker = createCircuitBreaker(demoConfig.circuitBreaker);

  // Create HTTP proxy with circuit breaker
  const proxy = createHTTPProxy({
    ...demoConfig.proxy,
    // Add circuit breaker protection to requests
    async onRequest(request: Request) {
      return breaker.execute(async () => {
        // Simulate occasional failures for demo
        if (Math.random() < 0.3) {
          throw new Error('Simulated network failure');
        }
        return request;
      });
    }
  });

  return { proxy, breaker };
}

// Test the proxy with various scenarios
async function runProxyTests(proxy: any, breaker: any) {
  console.log("\n🧪 Running proxy tests...");

  const testUrls = [
    'https://httpbin.org/get',
    'https://httpbin.org/status/200',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/status/500', // This will fail
  ];

  const results = [];

  for (const url of testUrls) {
    try {
      console.log(`📡 Testing: ${url}`);

      const response = await fetch(`http://localhost:8080${new URL(url).pathname}`);
      const success = response.ok;

      results.push({
        url: url.split('/').pop(),
        status: response.status,
        success,
        breakerState: breaker.getState(),
        timestamp: new Date().toLocaleTimeString()
      });

      if (!success) {
        console.log(`❌ Failed: ${response.status}`);
      } else {
        console.log(`✅ Success: ${response.status}`);
      }

    } catch (error) {
      results.push({
        url: url.split('/').pop(),
        status: 'ERROR',
        success: false,
        breakerState: breaker.getState(),
        timestamp: new Date().toLocaleTimeString(),
        error: error.message
      });

      console.log(`💥 Error: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Display comprehensive results table
function displayResultsTable(results: any[]) {
  console.log("\n📊 Test Results Summary:");
  console.log(Bun.inspect.table(results, {
    colors: true,
    columns: [
      { key: 'url', header: 'Test' },
      { key: 'status', header: 'Status' },
      { key: 'success', header: 'Success', format: (v) => v ? '✅' : '❌' },
      { key: 'breakerState', header: 'Circuit State' },
      { key: 'timestamp', header: 'Time' }
    ]
  }));
}

// Display circuit breaker statistics
function displayBreakerStats(breaker: any) {
  const stats = breaker.getStats();

  console.log("\n🔴 Circuit Breaker Statistics:");
  console.log(Bun.inspect.table([{
    'State': stats.state.toUpperCase(),
    'Requests': stats.requests,
    'Successes': stats.successes,
    'Failures': stats.failures,
    'Rejections': stats.rejections,
    'Success Rate': stats.requests > 0 ? `${Math.round((stats.successes / stats.requests) * 100)}%` : 'N/A'
  }], { colors: true }));
}

// Display proxy server status
function displayProxyStatus(proxy: any) {
  const status = proxy.getStatus();

  console.log("\n📡 Proxy Server Status:");
  console.log(Bun.inspect.table([{
    'Running': status.isRunning ? '✅' : '❌',
    'Protocol': status.config.protocol?.toUpperCase(),
    'Host': status.config.host,
    'Port': status.config.port,
    'Uptime': status.uptime ? `${Math.round(status.uptime / 1000)}s` : 'N/A',
    'Total Connections': status.connections.total,
    'Active Connections': status.connections.active
  }], { colors: true }));
}

// Main demo execution
async function runDemo() {
  console.log("🚀 Bun Proxy API Complete Demo");
  console.log("===============================\n");

  try {
    // Create protected proxy
    const { proxy, breaker } = await createProtectedProxy();

    // Start proxy server
    await proxy.start();

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run tests
    const results = await runProxyTests(proxy, breaker);

    // Display results
    displayResultsTable(results);
    displayBreakerStats(breaker);
    displayProxyStatus(proxy);

    // Show circuit breaker state changes
    console.log("\n📈 Circuit Breaker State History:");
    let stateChanges = 0;
    breaker.on('stateChange', (event) => {
      stateChanges++;
      console.log(`🔄 State change ${stateChanges}: ${event.from} → ${event.to} (${event.reason})`);
    });

    // Wait a bit more to see if circuit recovers
    console.log("\n⏳ Waiting for circuit breaker recovery...");
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Final status
    displayBreakerStats(breaker);

    // Stop proxy
    await proxy.stop();

    console.log("\n✨ Demo completed successfully!");
    console.log("💡 Demonstrated: HTTP Proxy + Circuit Breaker + Table Displays");

  } catch (error) {
    console.error("💥 Demo failed:", error);
  }
}

// Run the demo
runDemo();