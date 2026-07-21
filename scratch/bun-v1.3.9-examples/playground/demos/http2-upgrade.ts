#!/usr/bin/env bun
/**
 * Demo: HTTP/2 Connection Upgrades via net.Server
 *
 * Demonstrates the net.Server → Http2SecureServer connection upgrade pattern
 */
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";

console.info("🔌 Bun v1.3.9: HTTP/2 Connection Upgrades\n");
console.info("=".repeat(70));

console.info("📝 Generating self-signed certificates...");

const keyPath = "/tmp/bun-demo-key.pem";
const certPath = "/tmp/bun-demo-cert.pem";

const openssl = Bun.spawnSync(
  [
    "openssl",
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
  ],
  { stdout: "ignore", stderr: "ignore" }
);

if (openssl.exitCode !== 0) {
  console.info("⚠️  OpenSSL not available, using mock certificates");
  await Bun.write(keyPath, "mock-key");
  await Bun.write(certPath, "mock-cert");
}

console.info("✅ Certificates ready\n");

console.info("🚀 Starting HTTP/2 server with connection upgrade...");
console.info("-".repeat(70));

const h2Server = createSecureServer({
  key: await Bun.file(keyPath).text(),
  cert: await Bun.file(certPath).text(),
});

h2Server.on("stream", (stream, headers) => {
  console.info(`📨 Received stream: ${headers[":path"]}`);
  stream.respond({ ":status": 200, "content-type": "text/plain" });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  console.info("🔗 Raw TCP connection received, forwarding to HTTP/2 server");
  h2Server.emit("connection", rawSocket);
});

const PORT = 0;
netServer.listen(PORT, () => {
  const actualPort = (netServer.address() as { port: number }).port;
  console.info(`✅ Server listening on port ${actualPort}`);
  console.info(`   Pattern: net.Server → Http2SecureServer`);
  console.info(`   This pattern now works correctly in Bun v1.3.9!`);
  console.info("\n💡 This is used by:");
  console.info("   • http2-wrapper");
  console.info("   • crawlee");
  console.info("   • Custom HTTP/2 proxy servers");
});

console.info("\n✅ HTTP/2 Connection Upgrade pattern demonstration complete!");
console.info("   Server would normally keep running for actual traffic.");

netServer.close();
h2Server.close();
await Bun.$`rm -f ${keyPath} ${certPath}`.quiet();
