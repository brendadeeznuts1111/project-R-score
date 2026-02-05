import { Hono } from "hono";
import { cors } from "hono/cors";

// Environment variables
const FRONTEND_PORT = process.env.PORT || "3879";
const API_PORT = process.env.API_PORT || "3005";
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

const app = new Hono();

// Use environment variables for CORS configuration
app.use("/api/*", cors({ 
  origin: FRONTEND_URL, 
  allowMethods: ["POST", "GET"] 
}));

app.post("/api/files/analyze", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  if (!file) return c.json({ error: "No file provided" }, 400);
  if (file.size > 100 * 1024 * 1024) return c.json({ error: "File too large" }, 413);
  
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const signatures: Record<string, string> = { "89-50-4E-47": "PNG", "FF-D8-FF": "JPEG", "47-49-46-38": "GIF", "50-4B-03-04": "ZIP" };
  const key = Array.from(uint8.slice(0, 4)).map(b => b.toString(16).toUpperCase().padStart(2, "0")).join("-");
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", uint8);
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  
  return c.json({ success: true, data: { signature: signatures[key] || "Unknown", hash, size: file.size }, timestamp: Date.now() });
});

app.get("/health", async (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: Date.now(), 
    version: "1.0.0",
    ports: {
      frontend: FRONTEND_PORT,
      api: API_PORT,
    },
    environment: process.env.NODE_ENV || "development",
  });
});

const port = parseInt(API_PORT);
console.log(`🔥 API server starting on http://localhost:${port}`);
console.log(`🌐 Frontend URL for CORS: ${FRONTEND_URL}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);

// Direct server export for Bun
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`✅ API server running at http://localhost:${port}`);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down API server...");
  server.stop();
  process.exit(0);
});

export default server;
