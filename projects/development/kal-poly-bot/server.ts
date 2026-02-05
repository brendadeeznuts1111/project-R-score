#!/usr/bin/env bun
/**
 * Enhanced Sports Wagering Dashboard Server
 * 
 * This server demonstrates Bun's file streaming capabilities and serves
 * the enhanced wagering testing dashboard with proxy configuration.
 */

import { serve } from "bun";

// Configuration
const PORT = 3000;
const HOST = "0.0.0.0";

// Dashboard file paths
const DASHBOARD_PATH = "./docs/wagering-testing-dashboard-with-proxy.html";
const STYLE_PATH = "./docs/style.css";
const SCRIPT_PATH = "./docs/script.js";

/**
 * File streaming utility using Bun.file() and Response constructor
 * Demonstrates the pattern from the Bun documentation
 */
async function streamFile(path: string): Promise<Response> {
  try {
    const file = Bun.file(path);
    
    // Check if file exists
    if (!(await file.exists())) {
      return new Response(`File not found: ${path}`, { 
        status: 404,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Stream file directly - Content-Type is automatically detected
    return new Response(file, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      }
    });

  } catch (error: unknown) {
    console.error(`Error streaming file ${path}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Internal Server Error: ${errorMessage}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

/**
 * API endpoint for proxy configuration testing
 * Simulates real-world proxy connection testing
 */
async function handleProxyTest(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { url, authType, username, password, customHeaders } = body;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate connection test
    const success = Math.random() > 0.15; // 85% success rate
    
    if (success) {
      return Response.json({
        success: true,
        message: "Proxy connection successful",
        responseTime: Math.floor(Math.random() * 50) + 20, // 20-70ms
        status: 200,
        proxyConfig: {
          url,
          authType,
          hasCustomHeaders: Object.keys(customHeaders || {}).length > 0
        }
      });
    } else {
      return Response.json({
        success: false,
        message: "Connection timeout - check proxy URL and credentials",
        status: 502,
        error: "ETIMEDOUT"
      }, { status: 502 });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json({
      success: false,
      message: "Invalid request format",
      error: errorMessage
    }, { status: 400 });
  }
}

/**
 * API endpoint for real-time metrics simulation
 * Returns current system metrics
 */
function handleMetrics(): Response {
  const metrics = {
    timestamp: new Date().toISOString(),
    latency: Math.floor(Math.random() * 40) + 30, // 30-70ms
    throughput: (Math.random() * 5 + 8).toFixed(1), // 8-13 req/s
    activeUsers: Math.floor(Math.random() * 200) + 500, // 500-700
    systemHealth: Math.random() > 0.8 ? "EXCELLENT" : "HEALTHY",
    exposure: Math.floor(Math.random() * 1000000) + 800000, // $800K-$1.8M
    uptime: (99.95 + Math.random() * 0.049).toFixed(3), // 99.95-99.999%
    memory: (Math.random() * 1.5 + 0.8).toFixed(1), // 0.8-2.3GB
    threatLevel: (Math.random() * 0.03 + 0.01).toFixed(3) // 0.01-0.04
  };

  return Response.json(metrics);
}

/**
 * Main server handler
 */
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Log requests
  console.log(`${req.method} ${url.pathname}`);

  // API routes
  if (url.pathname === "/api/proxy-test" && req.method === "POST") {
    return handleProxyTest(req);
  }

  if (url.pathname === "/api/metrics" && req.method === "GET") {
    return handleMetrics();
  }

  // Static file serving
  if (url.pathname === "/" || url.pathname === "/dashboard") {
    return streamFile(DASHBOARD_PATH);
  }

  if (url.pathname === "/style.css") {
    return streamFile(STYLE_PATH);
  }

  if (url.pathname === "/script.js") {
    return streamFile(SCRIPT_PATH);
  }

  // Health check endpoint
  if (url.pathname === "/health") {
    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.1.0",
      uptime: process.uptime()
    });
  }

  // Info endpoint
  if (url.pathname === "/info") {
    return new Response(`
Enhanced Sports Wagering Dashboard Server

Available Endpoints:
- GET  /              - Main dashboard
- GET  /dashboard     - Main dashboard (alias)
- GET  /health        - Health check
- GET  /info          - This information
- GET  /api/metrics   - Real-time metrics
- POST /api/proxy-test - Test proxy configuration

Static Files:
- /style.css          - Dashboard styles
- /script.js          - Dashboard JavaScript

Usage:
1. Open http://localhost:${PORT} in your browser
2. Configure proxy settings in the dashboard
3. Test connections via the API
4. Monitor real-time metrics

Bun Features Demonstrated:
✓ File streaming with Bun.file()
✓ Automatic Content-Type detection
✓ Efficient Response constructor usage
✓ API endpoints with JSON responses
✓ Error handling and logging
    `, { 
      headers: { "Content-Type": "text/plain" }
    });
  }

  // 404 handler
  return new Response(`Not Found: ${url.pathname}`, { 
    status: 404,
    headers: { "Content-Type": "text/plain" }
  });
}

// Start server
console.log("🚀 Starting Enhanced Sports Wagering Dashboard Server...");
console.log(`📊 Dashboard: http://localhost:${PORT}`);
console.log(`ℹ️  Info: http://localhost:${PORT}/info`);
console.log(`❤️  Health: http://localhost:${PORT}/health`);
console.log(`🔧 API: http://localhost:${PORT}/api/metrics`);
console.log("");

const server = serve({
  fetch: handleRequest,
  port: PORT,
  hostname: HOST,
});

console.log(`✅ Server running on http://${HOST}:${PORT}`);
console.log("Press Ctrl+C to stop");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.stop();
  process.exit(0);
});
