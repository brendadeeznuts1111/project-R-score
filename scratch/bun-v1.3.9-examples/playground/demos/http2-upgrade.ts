#!/usr/bin/env bun
/**
 * Demo: HTTP/2 Connection Upgrades via net.Server
 * 
 * Demonstrates the net.Server → Http2SecureServer connection upgrade pattern
 */

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";

console.log("🔌 Bun v1.3.9: HTTP/2 Connection Upgrades\n");
console.log("=".repeat(70));

// Generate self-signed certificates for demo
console.log("📝 Generating self-signed certificates...");

const { execSync } = await import("node:child_process");
const keyPath = "/tmp/bun-demo-key.pem";
const certPath = "/tmp/bun-demo-cert.pem";

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${keyPath} -out ${certPath} -days 1 -subj "/CN=localhost"`,
    { stdio: "ignore" }
  );
} catch {
  console.log("⚠️  OpenSSL not available, using mock certificates");
  writeFileSync(keyPath, "mock-key");
  writeFileSync(certPath, "mock-cert");
}

console.log("✅ Certificates ready\n");

console.log("🚀 Starting HTTP/2 server with connection upgrade...");
console.log("-".repeat(70));

const h2Server = createSecureServer({
  key: readFileSync(keyPath),
  cert: readFileSync(certPath),
});

h2Server.on("stream", (stream, headers) => {
  console.log(`📨 Received stream: ${headers[":path"]}`);
  stream.respond({ ":status": 200, "content-type": "text/plain" });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  console.log("🔗 Raw TCP connection received, forwarding to HTTP/2 server");
  // Forward the raw TCP connection to the HTTP/2 server
  h2Server.emit("connection", rawSocket);
});

const PORT = 8443;
netServer.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`   Pattern: net.Server → Http2SecureServer`);
  console.log(`   This pattern now works correctly in Bun v1.3.9!`);
  console.log("\n💡 This is used by:");
  console.log("   • http2-wrapper");
  console.log("   • crawlee");
  console.log("   • Custom HTTP/2 proxy servers");
  
  console.log("\n⏹️  Press Ctrl+C to stop the server");
});

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down server...");
  netServer.close();
  h2Server.close();
  
  try {
    unlinkSync(keyPath);
    unlinkSync(certPath);
  } catch {}
  
  process.exit(0);
});

// Keep process alive
await new Promise(() => {});
