#!/usr/bin/env bun
/**
 * FactoryWager Server Test — Typed Routes and WebSocket Demo
 * Tests the native Bun.serve implementation with full type safety
 */

import { FactoryWagerServer } from "./fw-server.ts";

// Test configuration
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const WS_URL = `ws://localhost:${TEST_PORT}`;

// Test results
const testResults: { [key: string]: boolean } = {};

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP API Tests
// ═══════════════════════════════════════════════════════════════════════════════

async function testHttpEndpoints(): Promise<void> {
  console.info("🌐 Testing HTTP Endpoints");
  console.info("==========================");

  try {
    // Test health endpoint
    console.info("Testing /health...");
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === "ok" && healthData.service === "FactoryWager") {
      console.info("✅ /health endpoint working");
      testResults.health = true;
      console.info(`   Status: ${healthData.status}`);
      console.info(`   Version: ${healthData.version}`);
      console.info(`   Uptime: ${healthData.uptime}ms`);
    } else {
      console.info("❌ /health endpoint failed");
      testResults.health = false;
    }

    // Test env endpoint
    console.info("\nTesting /env...");
    const envResponse = await fetch(`${SERVER_URL}/env`);
    const envData = await envResponse.json();
    
    if (envData.factoryWager && envData.bun) {
      console.info("✅ /env endpoint working");
      testResults.env = true;
      console.info(`   FW Mode: ${envData.factoryWager.mode}`);
      console.info(`   FW Debug: ${envData.factoryWager.debug}`);
      console.info(`   Bun TLS: ${envData.bun.tlsRejectUnauthorized ? "Secure" : "Disabled"}`);
    } else {
      console.info("❌ /env endpoint failed");
      testResults.env = false;
    }

    // Test config endpoint
    console.info("\nTesting /config...");
    const configResponse = await fetch(`${SERVER_URL}/config`);
    const configData = await configResponse.json();
    
    if (configData.factoryWager && configData.bun && configData.security) {
      console.info("✅ /config endpoint working");
      testResults.config = true;
      console.info(`   Security Warnings: ${configData.security.warnings.length}`);
    } else {
      console.info("❌ /config endpoint failed");
      testResults.config = false;
    }

    // Test status endpoint
    console.info("\nTesting /status...");
    const statusResponse = await fetch(`${SERVER_URL}/status`);
    const statusData = await statusResponse.json();
    
    if (statusData.system && statusData.factoryWager && statusData.security) {
      console.info("✅ /status endpoint working");
      testResults.status = true;
      console.info(`   Platform: ${statusData.system.platform}`);
      console.info(`   Memory: ${Math.round(statusData.system.memory.heapUsed / 1024 / 1024)}MB`);
    } else {
      console.info("❌ /status endpoint failed");
      testResults.status = false;
    }

    // Test metrics endpoint
    console.info("\nTesting /metrics...");
    const metricsResponse = await fetch(`${SERVER_URL}/metrics`);
    const metricsData = await metricsResponse.json();
    
    if (metricsData.server && metricsData.memory && metricsData.process) {
      console.info("✅ /metrics endpoint working");
      testResults.metrics = true;
      console.info(`   Uptime: ${metricsData.server.uptimeHuman}`);
      console.info(`   Memory: ${metricsData.memory.heapUsedHuman}`);
    } else {
      console.info("❌ /metrics endpoint failed");
      testResults.metrics = false;
    }

    // Test security endpoint
    console.info("\nTesting /security...");
    const securityResponse = await fetch(`${SERVER_URL}/security`);
    const securityData = await securityResponse.json();
    
    if (securityData.security && securityData.recommendations) {
      console.info("✅ /security endpoint working");
      testResults.security = true;
      console.info(`   SSL Status: ${securityData.security.sslValidation.status}`);
      console.info(`   Risk Level: ${securityData.security.sslValidation.risk}`);
      console.info(`   Recommendations: ${securityData.recommendations.length}`);
    } else {
      console.info("❌ /security endpoint failed");
      testResults.security = false;
    }

    // Test 404 handling
    console.info("\nTesting 404 handling...");
    const notFoundResponse = await fetch(`${SERVER_URL}/nonexistent`);
    if (notFoundResponse.status === 404) {
      console.info("✅ 404 handling working");
      testResults.notFound = true;
    } else {
      console.info("❌ 404 handling failed");
      testResults.notFound = false;
    }

  } catch (error) {
    console.error("❌ HTTP tests failed:", (error as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Tests
// ═══════════════════════════════════════════════════════════════════════════════

async function testWebSocket(): Promise<void> {
  console.info("\n🔌 Testing WebSocket Communication");
  console.info("==================================");

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;
      const expectedMessages = 4; // welcome + echo_response + config_response + status_response

      ws.onopen = () => {
        console.info("✅ WebSocket connected");
        testResults.websocketConnect = true;

        // Send echo message
        ws.send(JSON.stringify({
          type: "echo",
          message: "Hello FactoryWager!"
        }));

        // Send config request
        ws.send(JSON.stringify({
          type: "config"
        }));

        // Send status request
        ws.send(JSON.stringify({
          type: "status"
        }));

        // Send invalid message type
        ws.send(JSON.stringify({
          type: "invalid_type",
          data: "test"
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageCount++;

          switch (data.type) {
            case "welcome":
              console.info("✅ Welcome message received");
              console.info(`   Server: ${data.server.version}`);
              console.info(`   Mode: ${data.server.mode}`);
              testResults.welcomeMessage = true;
              break;

            case "echo_response":
              console.info("✅ Echo response received");
              console.info(`   Message: ${data.data}`);
              testResults.echoResponse = true;
              break;

            case "config_response":
              console.info("✅ Config response received");
              console.info(`   FW Mode: ${data.data.factoryWager.mode}`);
              console.info(`   Bun TLS: ${data.data.bun.tlsRejectUnauthorized ? "Secure" : "Disabled"}`);
              testResults.configResponse = true;
              break;

            case "status_response":
              console.info("✅ Status response received");
              console.info(`   Platform: ${data.data.system.platform}`);
              console.info(`   Memory: ${Math.round(data.data.system.memory.heapUsed / 1024 / 1024)}MB`);
              testResults.statusResponse = true;
              break;

            case "error":
              console.info("✅ Error handling working");
              console.info(`   Error: ${data.message}`);
              testResults.errorHandling = true;
              break;

            default:
              console.info(`ℹ️  Unknown message type: ${data.type}`);
          }

          if (messageCount >= expectedMessages) {
            ws.close();
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.info("✅ WebSocket disconnected");
        testResults.websocketDisconnect = true;
        resolve();
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        testResults.websocketError = false;
        resolve();
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve();
      }, 5000);

    } catch (error) {
      console.error("❌ WebSocket tests failed:", (error as Error).message);
      resolve();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests(): Promise<void> {
  console.info("🧪 FactoryWager Server Test Suite");
  console.info("=================================");
  console.info(`Testing server on port ${TEST_PORT}\n`);

  // Start server
  console.info("🚀 Starting FactoryWager server...");
  const server = new FactoryWagerServer();
  
  try {
    // Start server in background
    const serverPromise = server.start(TEST_PORT);
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run HTTP tests
    await testHttpEndpoints();
    
    // Run WebSocket tests
    await testWebSocket();
    
    // Display results
    console.info("\n📊 Test Results");
    console.info("================");
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? "✅ PASS" : "❌ FAIL";
      console.info(`${status} ${test}`);
    });
    
    console.info(`\n🎯 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.info("🎉 All tests passed! FactoryWager server is working correctly.");
    } else {
      console.info("⚠️  Some tests failed. Please check the server configuration.");
    }
    
  } catch (error) {
    console.error("❌ Test suite failed:", (error as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  runTests().catch((error: Error) => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { runTests };
