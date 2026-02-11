/**
 * Bun v1.3.9 HTTP/2 Connection Upgrade Demo
 * 
 * Demonstrates the fixed HTTP/2 connection upgrade path.
 * Previously broken, now works correctly for proxy infrastructure.
 * 
 * Key fix: h2Server.emit("connection", rawSocket) now works
 */

import { createSecureServer } from "node:http2";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 8443;
const HOST = "localhost";

// Load certificates (or generate self-signed for testing)
let cert: string;
let key: string;

try {
  cert = readFileSync(join(import.meta.dirname || ".", "cert.pem"), "utf-8");
  key = readFileSync(join(import.meta.dirname || ".", "key.pem"), "utf-8");
} catch {
  console.log("⚠ No certificates found, using dummy values");
  console.log("  Generate with: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes");
  cert = "dummy";
  key = "dummy";
}

// Create HTTP/2 server
const h2Server = createSecureServer(
  { cert, key },
  (req, res) => {
    console.log(`[H2] ${req.method} ${req.url}`);
    
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      protocol: "HTTP/2",
      secure: true,
      headers: req.headers,
      timestamp: Date.now(),
    }, null, 2));
  }
);

// Handle HTTP/2 specific events
h2Server.on("stream", (stream, headers) => {
  console.log(`[H2 Stream] ${headers[":method"]} ${headers[":path"]}`);
});

h2Server.on("error", (err) => {
  console.error("[H2 Server Error]", err.message);
});

// Option 1: Direct HTTP/2 server
function startDirect() {
  h2Server.listen(PORT, HOST, () => {
    console.log(`✓ HTTP/2 server listening on https://${HOST}:${PORT}`);
  });
}

// Option 2: Connection upgrade path (the v1.3.9 fix!)
// This allows proxy infrastructure to upgrade connections properly
function startWithUpgrade() {
  const netServer = createServer((rawSocket) => {
    // This emit pattern was broken before v1.3.9, now works!
    h2Server.emit("connection", rawSocket);
  });
  
  netServer.listen(PORT, HOST, () => {
    console.log(`✓ HTTP/2 server (with connection upgrade) on https://${HOST}:${PORT}`);
    console.log("  Note: Connection upgrade path now works correctly in v1.3.9+");
  });
  
  return netServer;
}

// Health check endpoint
function startHealthCheck() {
  const healthPort = PORT + 1;
  const healthServer = createServer((socket) => {
    socket.write("HTTP/1.1 200 OK\r\n");
    socket.write("Content-Type: application/json\r\n");
    socket.write("\r\n");
    socket.write(JSON.stringify({ 
      status: "healthy", 
      http2: true,
      version: Bun.version 
    }));
    socket.end();
    
    // Emit to H2 server (demonstrates the fix)
    h2Server.emit("connection", socket);
  });
  
  healthServer.listen(healthPort, () => {
    console.log(`✓ Health check on port ${healthPort}`);
  });
}

// Main
const mode = process.argv[2] || "direct";

console.log("=".repeat(60));
console.log("Bun v1.3.9 HTTP/2 Connection Upgrade Demo");
console.log("=".repeat(60));
console.log(`Mode: ${mode}`);
console.log(`Bun: ${Bun.version}`);
console.log("");

switch (mode) {
  case "direct":
    startDirect();
    break;
  case "upgrade":
    startWithUpgrade();
    break;
  case "health":
    startDirect();
    startHealthCheck();
    break;
  default:
    console.log("Usage: bun run http2-server.ts [direct|upgrade|health]");
    process.exit(1);
}

console.log("\nTest with:");
console.log(`  curl -k --http2 https://${HOST}:${PORT}/`);
console.log("");
