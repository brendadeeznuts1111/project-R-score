/**
 * Protocol & Properties Demo
 * 
 * Demonstrates:
 * - Inspecting Request Headers (Protocol info)
 * - Setting Response Headers
 * - Bun.serve configuration (TLS/HTTPS setup)
 */

console.log("=== Bun Protocol & Properties Demo ===");

const server = Bun.serve({
  port: 0, // Random port
  hostname: "localhost",
  fetch(request: Request) {
    const url = new URL(request.url);
    console.log(`\n[Request] ${request.method} ${url.pathname}`);

    // 1. Inspect Protocol Properties via Headers
    // Bun exposes standard HTTP properties
    const headers = request.headers;
    console.log(`[Headers] Content-Type: ${headers.get("content-type") || "N/A"}`);
    console.log(`[Headers] User-Agent: ${headers.get("user-agent") || "N/A"}`);
    
    // 2. Check Method
    console.log(`[Request] Method: ${request.method}`);

    // 3. Response with custom headers
    const responseHeaders = new Headers();
    responseHeaders.set("X-Custom-Protocol", "Bun-HTTP/1.1");
    responseHeaders.set("Content-Type", "application/json");

    const body = JSON.stringify({
      message: "Hello from Bun!",
      protocol: "HTTP/1.1 (implied)",
      timestamp: Date.now(),
    }, null, 2);

    return new Response(body, {
      status: 200,
      headers: responseHeaders,
    });
  },
});

console.log(`\nServer running at http://${server.hostname}:${server.port}`);
console.log(`Try visiting: http://${server.hostname}:${server.port}/test`);
console.log("Press Ctrl+C to stop.");

// Keep alive
await new Promise(() => {});
