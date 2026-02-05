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
  console.log("🌐 Testing HTTP Endpoints");
  console.log("==========================");

  try {
    // Test health endpoint
    console.log("Testing /health...");
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === "ok" && healthData.service === "FactoryWager") {
      console.log("✅ /health endpoint working");
      testResults.health = true;
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Version: ${healthData.version}`);
      console.log(`   Uptime: ${healthData.uptime}ms`);
    } else {
      console.log("❌ /health endpoint failed");
      testResults.health = false;
    }

    // Test env endpoint
    console.log("\nTesting /env...");
    const envResponse = await fetch(`${SERVER_URL}/env`);
    const envData = await envResponse.json();
    
    if (envData.factoryWager && envData.bun) {
      console.log("✅ /env endpoint working");
      testResults.env = true;
      console.log(`   FW Mode: ${envData.factoryWager.mode}`);
      console.log(`   FW Debug: ${envData.factoryWager.debug}`);
      console.log(`   Bun TLS: ${envData.bun.tlsRejectUnauthorized ? "Secure" : "Disabled"}`);
    } else {
      console.log("❌ /env endpoint failed");
      testResults.env = false;
    }

    // Test config endpoint
    console.log("\nTesting /config...");
    const configResponse = await fetch(`${SERVER_URL}/config`);
    const configData = await configResponse.json();
    
    if (configData.factoryWager && configData.bun && configData.security) {
      console.log("✅ /config endpoint working");
      testResults.config = true;
      console.log(`   Security Warnings: ${configData.security.warnings.length}`);
    } else {
      console.log("❌ /config endpoint failed");
      testResults.config = false;
    }

    // Test status endpoint
    console.log("\nTesting /status...");
    const statusResponse = await fetch(`${SERVER_URL}/status`);
    const statusData = await statusResponse.json();
    
    if (statusData.system && statusData.factoryWager && statusData.security) {
      console.log("✅ /status endpoint working");
      testResults.status = true;
      console.log(`   Platform: ${statusData.system.platform}`);
      console.log(`   Memory: ${Math.round(statusData.system.memory.heapUsed / 1024 / 1024)}MB`);
    } else {
      console.log("❌ /status endpoint failed");
      testResults.status = false;
    }

    // Test metrics endpoint
    console.log("\nTesting /metrics...");
    const metricsResponse = await fetch(`${SERVER_URL}/metrics`);
    const metricsData = await metricsResponse.json();
    
    if (metricsData.server && metricsData.memory && metricsData.process) {
      console.log("✅ /metrics endpoint working");
      testResults.metrics = true;
      console.log(`   Uptime: ${metricsData.server.uptimeHuman}`);
      console.log(`   Memory: ${metricsData.memory.heapUsedHuman}`);
    } else {
      console.log("❌ /metrics endpoint failed");
      testResults.metrics = false;
    }

    // Test security endpoint
    console.log("\nTesting /security...");
    const securityResponse = await fetch(`${SERVER_URL}/security`);
    const securityData = await securityResponse.json();
    
    if (securityData.security && securityData.recommendations) {
      console.log("✅ /security endpoint working");
      testResults.security = true;
      console.log(`   SSL Status: ${securityData.security.sslValidation.status}`);
      console.log(`   Risk Level: ${securityData.security.sslValidation.risk}`);
      console.log(`   Recommendations: ${securityData.recommendations.length}`);
    } else {
      console.log("❌ /security endpoint failed");
      testResults.security = false;
    }

    // Test 404 handling
    console.log("\nTesting 404 handling...");
    const notFoundResponse = await fetch(`${SERVER_URL}/nonexistent`);
    if (notFoundResponse.status === 404) {
      console.log("✅ 404 handling working");
      testResults.notFound = true;
    } else {
      console.log("❌ 404 handling failed");
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
  console.log("\n🔌 Testing WebSocket Communication");
  console.log("==================================");

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;
      const expectedMessages = 4; // welcome + echo_response + config_response + status_response

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
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
              console.log("✅ Welcome message received");
              console.log(`   Server: ${data.server.version}`);
              console.log(`   Mode: ${data.server.mode}`);
              testResults.welcomeMessage = true;
              break;

            case "echo_response":
              console.log("✅ Echo response received");
              console.log(`   Message: ${data.data}`);
              testResults.echoResponse = true;
              break;

            case "config_response":
              console.log("✅ Config response received");
              console.log(`   FW Mode: ${data.data.factoryWager.mode}`);
              console.log(`   Bun TLS: ${data.data.bun.tlsRejectUnauthorized ? "Secure" : "Disabled"}`);
              testResults.configResponse = true;
              break;

            case "status_response":
              console.log("✅ Status response received");
              console.log(`   Platform: ${data.data.system.platform}`);
              console.log(`   Memory: ${Math.round(data.data.system.memory.heapUsed / 1024 / 1024)}MB`);
              testResults.statusResponse = true;
              break;

            case "error":
              console.log("✅ Error handling working");
              console.log(`   Error: ${data.message}`);
              testResults.errorHandling = true;
              break;

            default:
              console.log(`ℹ️  Unknown message type: ${data.type}`);
          }

          if (messageCount >= expectedMessages) {
            ws.close();
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("✅ WebSocket disconnected");
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
  console.log("🧪 FactoryWager Server Test Suite");
  console.log("=================================");
  console.log(`Testing server on port ${TEST_PORT}\n`);

  // Start server
  console.log("🚀 Starting FactoryWager server...");
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
    console.log("\n📊 Test Results");
    console.log("================");
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${test}`);
    });
    
    console.log(`\n🎯 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log("🎉 All tests passed! FactoryWager server is working correctly.");
    } else {
      console.log("⚠️  Some tests failed. Please check the server configuration.");
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
