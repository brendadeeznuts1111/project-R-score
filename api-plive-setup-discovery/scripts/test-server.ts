#!/usr/bin/env bun

import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Server is running" });
});

app.get("/test", (c) => {
  return c.json({ message: "Test endpoint working" });
});

console.log("🚀 Starting test server on port 3002");

Bun.serve({
  port: 3002,
  hostname: "0.0.0.0",
  fetch: app.fetch,
});

console.log("✅ Test server started successfully");
console.log("📍 Test endpoints:");
console.log("   GET http://localhost:3002/health");
console.log("   GET http://localhost:3002/test");