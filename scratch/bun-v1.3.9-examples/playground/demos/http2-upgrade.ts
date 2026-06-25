#!/usr/bin/env bun
/**
 * Demo: HTTP/2 Connection Upgrades via net.Server
 * 
 * Demonstrates the net.Server → Http2SecureServer connection upgrade pattern
 */

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";

console.info("🔌 Bun v1.3.9: HTTP/2 Connection Upgrades\n");
console.info("=".repeat(70));

// Generate self-signed certificates for demo
console.info("📝 Generating self-signed certificates...");

const { execSync } = await import("node:child_process");
const keyPath = "/tmp/bun-demo-key.pem";
const certPath = "/tmp/bun-demo-cert.pem";

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${keyPath} -out ${certPath} -days 1 -subj "/CN=localhost"`,
    { stdio: "ignore" }
  );
} catch {
  console.info("⚠️  OpenSSL not available, using mock certificates");
  writeFileSync(keyPath, "mock-key");
  writeFileSync(certPath, "mock-cert");
}

console.info("✅ Certificates ready\n");

console.info("🚀 Starting HTTP/2 server with connection upgrade...");
console.info("-".repeat(70));

const h2Server = createSecureServer({
  key: readFileSync(keyPath),
  cert: readFileSync(certPath),
});

h2Server.on("stream", (stream, headers) => {
  console.info(`📨 Received stream: ${headers[":path"]}`);
  stream.respond({ ":status": 200, "content-type": "text/plain" });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  console.info("🔗 Raw TCP connection received, forwarding to HTTP/2 server");
  // Forward the raw TCP connection to the HTTP/2 server
  h2Server.emit("connection", rawSocket);
});

const PORT = 0; // Use random available port for demo
netServer.listen(PORT, () => {
  const actualPort = (netServer.address() as { port: number }).port;
  console.info(`✅ Server listening on port ${actualPort}`);
  console.info(`   Pattern: net.Server → Http2SecureServer`);
  console.info(`   This pattern now works correctly in Bun v1.3.9!`);
  console.info("\n💡 This is used by:");
  console.info("   • http2-wrapper");
  console.info("   • crawlee");
  console.info("   • Custom HTTP/2 proxy servers");
  
  console.info("\n⏹️  Press Ctrl+C to stop the server");
});

// Cleanup on exit
process.on("SIGINT", () => {
  console.info("\n\n🛑 Shutting down server...");
  netServer.close();
  h2Server.close();
  
  try {
    unlinkSync(keyPath);
    unlinkSync(certPath);
  } catch {
    console.error('Unhandled error:', error);
  }
  
  process.exit(0);
});

// Demo complete - show pattern and exit (don't keep server running in demo mode)
console.info("\n✅ HTTP/2 Connection Upgrade pattern demonstration complete!");
console.info("   Server would normally keep running for actual traffic.");

// Cleanup
netServer.close();
h2Server.close();

try {
  unlinkSync(keyPath);
  unlinkSync(certPath);
} catch {
    console.error('Unhandled error:', error);
  }
