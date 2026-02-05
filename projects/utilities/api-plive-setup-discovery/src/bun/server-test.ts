import { Hono } from "hono";
import { cors } from "hono/cors";

// Simple test server for Bun 1.3 production setup
const app = new Hono();

// CORS middleware
app.use("*", cors({
  origin: ["http://localhost:3000", "https://bettingplatform.com"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
}));

// Health endpoint as per cheat sheet
app.get("/health", async (c) => {
  const healthData = {
    status: "ok",
    db: "connected", // Mock for testing
    migrations: "complete",
    timestamp: new Date().toISOString(),
    version: "1.3.1",
    environment: Bun.env.NODE_ENV || "production",
    bun_version: Bun.version
  };

  // Set custom user agent header
  c.header('x-powered-by', 'BettingPlatform/1.3.1');

  return c.json(healthData);
});

// Test endpoint that makes outbound HTTP call to verify custom UA
app.get("/test-ua", async (c) => {
  try {
    // Make an outbound request to httpbin.org to test UA
    const response = await fetch('https://httpbin.org/user-agent');
    const data = await response.json();

    return c.json({
      success: true,
      outbound_ua: data['user-agent'],
      expected: 'BettingPlatform/1.3.1'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to test UA',
      details: error.message
    });
  }
});

// Start server
const server = Bun.serve({
  port: 3002, // Different port to avoid conflicts
  hostname: "0.0.0.0",
  development: false,

  fetch: app.fetch,

  error(error) {
    console.error("Server-level error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

console.log(`🚀 Bun 1.3 Production Test Server running on ${server.hostname}:${server.port}`);
console.log(`❤️ Health: http://localhost:${server.port}/health`);
console.log(`📊 Bun version: ${Bun.version}`);
console.log(`🔧 Environment: ${Bun.env.NODE_ENV || 'production'}`);
