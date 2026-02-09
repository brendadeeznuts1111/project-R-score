// HTTP/2 client to test the connection upgrade pattern
import { connect } from "node:http2";

const PORT = 8443;
const BASE = `https://localhost:${PORT}`;

// Disable TLS verification for self-signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function makeRequest(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = connect(BASE, {
      rejectUnauthorized: false,
    });

    client.on("error", (err) => {
      console.error(`[client] Connection error: ${err.message}`);
      reject(err);
    });

    const req = client.request({ ":path": path, ":method": "GET" });

    let data = "";
    let status: number | undefined;

    req.on("response", (headers) => {
      status = headers[":status"] as number;
    });

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      console.log(`[client] ${path} → ${status}: ${data}`);
      client.close();
      resolve();
    });

    req.on("error", (err) => {
      console.error(`[client] Request error on ${path}: ${err.message}`);
      client.close();
      reject(err);
    });

    req.end();
  });
}

console.log("[client] Testing HTTP/2 connection upgrade pattern\n");

try {
  await makeRequest("/");
  await makeRequest("/api/hello");
  await makeRequest("/api/status");
  console.log("\n[client] All requests succeeded!");
} catch (err: any) {
  console.error(`\n[client] Test failed: ${err.message}`);
  process.exit(1);
}
