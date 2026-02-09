// HTTP/2 Connection Upgrade via net.Server
// Feature #7 — PR #26539 — Fixed in Bun 1.3.9
//
// Pattern: accept raw TCP on net.Server, emit 'connection' on the H2 server
// to hand off the socket. Previously broken in Bun, now fixed.
//
// Run: bun run examples/h2-connection-upgrade.ts

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { createServer as createTlsServer } from "node:tls";

// Generate a self-signed cert in-memory for testing
const selfSigned = await (async () => {
  // Use Bun's built-in TLS if available, otherwise skip
  try {
    const proc = Bun.spawn(["openssl", "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", "/dev/stdout", "-out", "/dev/stdout",
      "-days", "1", "-nodes", "-subj", "/CN=localhost",
      "-batch"], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    const keyMatch = text.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
    const certMatch = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    if (keyMatch && certMatch) return { key: keyMatch[0], cert: certMatch[0] };
  } catch {}
  return null;
})();

if (!selfSigned) {
  console.log("[SKIP] openssl not available — cannot generate self-signed cert");
  process.exit(0);
}

const h2Server = createSecureServer({
  key: selfSigned.key,
  cert: selfSigned.cert,
});

let streamReceived = false;

h2Server.on("stream", (stream, headers) => {
  streamReceived = true;
  stream.respond({ ":status": 200, "content-type": "text/plain" });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket);
});

await new Promise<void>((resolve) => netServer.listen(0, resolve));
const port = (netServer.address() as any).port;

// Make an HTTP/2 request to verify the upgrade works
try {
  // Use a raw TLS connection to test the emit pattern
  const { connect } = await import("node:http2");
  const client = connect(`https://localhost:${port}`, {
    rejectUnauthorized: false,
  });

  const req = client.request({ ":path": "/" });
  let data = "";
  req.on("data", (chunk: Buffer) => { data += chunk; });
  await new Promise<void>((resolve, reject) => {
    req.on("end", resolve);
    req.on("error", reject);
  });

  client.close();
  console.log(`[PASS] HTTP/2 connection upgrade works — received: "${data}"`);
} catch (err: any) {
  console.log(`[FAIL] HTTP/2 connection upgrade failed: ${err.message}`);
  process.exit(1);
} finally {
  netServer.close();
  h2Server.close();
}
