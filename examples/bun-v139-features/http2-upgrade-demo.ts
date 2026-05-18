#!/usr/bin/env bun
/**
 * Bun v1.3.9: HTTP/2 Connection Upgrade Demo
 * 
 * Demonstrates the fixed net.Server → Http2SecureServer upgrade pattern
 */

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { randomUUID } from "node:crypto";

console.info("🔌 Bun v1.3.9: HTTP/2 Connection Upgrade Demo\n");
console.info("=" .repeat(70));

// Generate self-signed certificate for demo
async function generateCert(): Promise<{ key: string; cert: string }> {
  // For demo purposes, we'll create a simple in-memory server
  // In production, use real certificates
  const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgwMbRvI0MBZhpI
-----END RSA PRIVATE KEY-----`;

  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qa0B4x0zN0dWJxYWdlc3Qx
-----END CERTIFICATE-----`;

  return { key, cert };
}

// Demo 1: HTTP/2 Direct Server
function demo1_directHTTP2Server() {
  console.info("\n📦 Demo 1: Direct HTTP/2 Server");
  console.info("-".repeat(70));
  console.info(`
import { createSecureServer } from "node:http2";

const server = createSecureServer({
  key: await readFile("key.pem"),
  cert: await readFile("cert.pem"),
});

server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello HTTP/2!");
});

server.listen(8443);
`);
}

// Demo 2: Connection Upgrade Pattern (FIXED in v1.3.9)
function demo2_connectionUpgrade() {
  console.info("\n📦 Demo 2: Connection Upgrade Pattern (FIXED in v1.3.9)");
  console.info("-".repeat(70));
  console.info(`
import { createServer } from "node:net";
import { createSecureServer } from "node:http2";

// HTTP/2 server that will handle TLS connections
const h2Server = createSecureServer({
  key: await readFile("key.pem"),
  cert: await readFile("cert.pem"),
});

h2Server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello over HTTP/2!");
});

// Raw TCP server that forwards connections
const netServer = createServer((rawSocket) => {
  // Forward raw TCP connection to HTTP/2 server
  // This was broken before v1.3.9, now works correctly!
  h2Server.emit("connection", rawSocket);
});

netServer.listen(8443);
`);
}

// Demo 3: HTTP/2 Proxy Server
function demo3_http2Proxy() {
  console.info("\n📦 Demo 3: HTTP/2 Proxy Server Pattern");
  console.info("-".repeat(70));
  console.info(`
import { createServer } from "node:net";
import { createSecureServer, connect } from "node:http2";

// Create proxy that forwards HTTP/2 connections
class HTTP2Proxy {
  private h2Server: Http2SecureServer;
  private targetHost: string;
  private targetPort: number;

  constructor(targetHost: string, targetPort: number) {
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    
    this.h2Server = createSecureServer({
      key: readFileSync("proxy-key.pem"),
      cert: readFileSync("proxy-cert.pem"),
    });
    
    this.h2Server.on("stream", this.handleStream.bind(this));
  }

  private async handleStream(stream, headers) {
    // Connect to upstream HTTP/2 server
    const client = connect(\`https://\${this.targetHost}:\${this.targetPort}\`);
    
    const req = client.request({
      ":method": headers[":method"],
      ":path": headers[":path"],
      ...headers,
    });
    
    req.pipe(stream);
    stream.pipe(req);
  }

  listen(port: number) {
    const netServer = createServer((socket) => {
      // FIXED in v1.3.9: This now works correctly!
      this.h2Server.emit("connection", socket);
    });
    
    netServer.listen(port);
    console.info(\`HTTP/2 Proxy listening on port \${port}\`);
  }
}

const proxy = new HTTP2Proxy("backend.example.com", 443);
proxy.listen(8443);
`);
}

// Demo 4: Connection Pool with HTTP/2
function demo4_connectionPool() {
  console.info("\n📦 Demo 4: HTTP/2 Connection Pool");
  console.info("-".repeat(70));
  console.info(`
import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import type { Socket } from "node:net";

class HTTP2ConnectionPool {
  private connections: Map<string, Socket> = new Map();
  private h2Server: Http2SecureServer;

  constructor() {
    this.h2Server = createSecureServer({
      key: readFileSync("server-key.pem"),
      cert: readFileSync("server-cert.pem"),
    });
    
    this.h2Server.on("stream", (stream, headers) => {
      const connId = headers["x-connection-id"] as string;
      const conn = this.connections.get(connId);
      
      if (conn) {
        stream.respond({ ":status": 200 });
        stream.end(JSON.stringify({ 
          reused: true, 
          connectionId: connId 
        }));
      } else {
        stream.respond({ ":status": 404 });
        stream.end("Connection not found");
      }
    });
  }

  addConnection(id: string, socket: Socket) {
    this.connections.set(id, socket);
    
    // FIXED in v1.3.9: emit("connection") now works correctly
    this.h2Server.emit("connection", socket);
    
    socket.on("close", () => {
      this.connections.delete(id);
    });
  }

  createNetServer(port: number) {
    const server = createServer((socket) => {
      const id = randomUUID();
      this.addConnection(id, socket);
    });
    
    server.listen(port);
    return server;
  }
}

const pool = new HTTP2ConnectionPool();
pool.createNetServer(8443);
`);
}

// Show what was fixed
function showWhatWasFixed() {
  console.info("\n" + "=".repeat(70));
  console.info("🔧 What Was Fixed in v1.3.9");
  console.info("=".repeat(70));
  console.info(`
BEFORE v1.3.9:
──────────────
• h2Server.emit("connection", rawSocket) was broken
• HTTP/2 upgrade pattern from libraries like http2-wrapper failed
• Crawlee and similar tools couldn't establish HTTP/2 connections
• Custom proxy servers had to use workarounds

AFTER v1.3.9:
─────────────
• h2Server.emit("connection", rawSocket) works correctly
• Raw TCP sockets can be forwarded to HTTP/2 servers
• Libraries like http2-wrapper now work with Bun
• Full HTTP/2 proxy infrastructure support

USE CASES ENABLED:
──────────────────
✓ HTTP/2 reverse proxies
✓ Connection pooling with HTTP/2
✓ Load balancers with HTTP/2 backends
✓ Web scraping tools (Crawlee, etc.)
✓ Custom TLS termination with HTTP/2
✓ HTTP/2 multiplexing over custom transports

AFFECTED LIBRARIES:
───────────────────
• http2-wrapper - Now works with Bun
• Crawlee - HTTP/2 crawling enabled
• got (with HTTP/2) - Fully functional
• Any custom HTTP/2 proxy implementations
`);
}

// Show security considerations
function showSecurityConsiderations() {
  console.info("\n" + "=".repeat(70));
  console.info("🔒 Security Considerations");
  console.info("=".repeat(70));
  console.info(`
TLS CERTIFICATES:
─────────────────
• Always use proper TLS certificates in production
• Self-signed certs are fine for development only
• Consider using Let's Encrypt for production

PROXY SECURITY:
───────────────
• Validate incoming connections before forwarding
• Implement rate limiting at the proxy level
• Use connection timeouts to prevent resource exhaustion
• Log connection attempts for security auditing

HTTP/2 SPECIFIC:
────────────────
• HTTP/2 has stricter header requirements than HTTP/1.1
• Some headers are pseudo-headers (:method, :path, etc.)
• Header compression (HPACK) considerations
• Stream multiplexing can complicate rate limiting
`);
}

// Main
async function main() {
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}\n`);

  console.info("NOTE: This is a code demonstration.");
  console.info("The actual server examples require valid TLS certificates.\n");

  demo1_directHTTP2Server();
  demo2_connectionUpgrade();
  demo3_http2Proxy();
  demo4_connectionPool();
  showWhatWasFixed();
  showSecurityConsiderations();

  console.info("\n✅ HTTP/2 Connection Upgrade demo complete!\n");
}

if (import.meta.main) {
  main();
}

export { main };
