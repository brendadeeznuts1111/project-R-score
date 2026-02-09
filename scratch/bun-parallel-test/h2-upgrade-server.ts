// HTTP/2 Connection Upgrade via net.Server — Bun v1.3.9 fix
// Pattern: raw TCP on net.Server → emit 'connection' on Http2SecureServer

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";

// Generate self-signed cert inline for testing
const proc = Bun.spawnSync([
  "openssl",
  "req",
  "-x509",
  "-newkey",
  "rsa:2048",
  "-keyout",
  "/dev/stdout",
  "-out",
  "/dev/stdout",
  "-days",
  "1",
  "-nodes",
  "-subj",
  "/CN=localhost",
]);
const pem = proc.stdout.toString();
// openssl outputs key then cert concatenated
const keyMatch = pem.match(
  /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/,
);
const certMatch = pem.match(
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/,
);

if (!keyMatch || !certMatch) {
  console.error("Failed to generate self-signed cert");
  process.exit(1);
}

const key = keyMatch[0];
const cert = certMatch[0];

const PORT = 8443;
let requestCount = 0;

// Create the HTTP/2 secure server (doesn't listen directly)
const h2Server = createSecureServer({
  key,
  cert,
  allowHTTP1: false,
});

h2Server.on("stream", (stream, headers) => {
  requestCount++;
  const method = headers[":method"];
  const path = headers[":path"];
  console.log(`[h2] Request #${requestCount}: ${method} ${path}`);

  stream.respond({
    ":status": 200,
    "content-type": "application/json",
  });
  stream.end(
    JSON.stringify({
      message: "Hello over HTTP/2!",
      request: requestCount,
      path,
    }),
  );
});

h2Server.on("error", (err) => {
  console.error("[h2] Server error:", err.message);
});

// Create net.Server that forwards connections to h2Server
const netServer = createServer((rawSocket) => {
  console.log(
    `[net] Raw TCP connection from ${rawSocket.remoteAddress}:${rawSocket.remotePort}`,
  );
  // This is the pattern that was broken before v1.3.9
  h2Server.emit("connection", rawSocket);
});

netServer.listen(PORT, () => {
  console.log(`[net] TCP server listening on port ${PORT}`);
  console.log(`[net] Forwarding connections to Http2SecureServer`);
  console.log(`\nTest with: curl --http2 --insecure https://localhost:${PORT}/`);
  console.log(`Or run:    bun run h2-upgrade-client.ts\n`);
});
