#!/usr/bin/env bun
/**
 * Bun Content-Type Handling Demo
 * Demonstrates automatic Content-Type detection and handling
 * Run with: bun run bun-content-type-demo.ts
 */

import { serve } from "bun";

serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Blob → Content-Type is copied from blob.type
    if (url.pathname === "/png") {
      const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
      return new Response(png); // ← headers: content-type: image/png
    }

    // 2. File → Content-Type is inferred from extension
    if (url.pathname === "/style.css") {
      try {
        return new Response(Bun.file("web-app/styles.css")); // ← content-type: text/css
      } catch {
        return new Response("/* CSS file not found */", {
          headers: { "content-type": "text/css" }
        });
      }
    }

    // 3. String → *no* default (you should still set it explicitly)
    if (url.pathname === "/text") {
      return new Response("plain text"); // ← no content-type header
    }

    // 4. FormData → automatic multipart boundary
    if (url.pathname === "/upload" && req.method === "POST") {
      const form = await req.formData(); // consumes multipart
      return new Response(form); // ← content-type: multipart/form-data; boundary=----
    }

    // 5. URLSearchParams → application/x-www-form-urlencoded
    if (url.pathname === "/search") {
      const params = new URLSearchParams({ q: "bun", v: "1.3" });
      return new Response(params); // ← content-type: application/x-www-form-urlencoded
    }

    // 6. JSON via Response.json() → application/json
    if (url.pathname === "/api") {
      return Response.json({ hello: "world", version: "1.3.6" }); // ← content-type: application/json
    }

    // 7. HTML file
    if (url.pathname === "/html") {
      try {
        return new Response(Bun.file("web-app/index.html")); // ← content-type: text/html
      } catch {
        return new Response("<h1>HTML file not found</h1>", {
          headers: { "content-type": "text/html" }
        });
      }
    }

    // 8. JavaScript file
    if (url.pathname === "/app.js") {
      try {
        return new Response(Bun.file("web-app/app.js")); // ← content-type: application/javascript
      } catch {
        return new Response("console.log('JS file not found');", {
          headers: { "content-type": "application/javascript" }
        });
      }
    }

    // 9. ArrayBuffer (no default content-type)
    if (url.pathname === "/buffer") {
      const buffer = new ArrayBuffer(8);
      return new Response(buffer); // ← no content-type header
    }

    // 10. Info page
    if (url.pathname === "/") {
      return new Response(`Bun Content-Type Handling Demo

Endpoints:
  /png       - Blob with type: image/png
  /style.css - File with .css extension
  /text      - Plain string (no default)
  /upload    - FormData response
  /search    - URLSearchParams
  /api       - Response.json()
  /html      - HTML file
  /app.js    - JavaScript file
  /buffer    - ArrayBuffer (no default)

Test with:
  curl -i http://localhost:3002/api
  curl -i http://localhost:3002/style.css
  curl -i http://localhost:3002/text
  curl -i http://localhost:3002/search
      `, {
        headers: { "content-type": "text/plain" }
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("\n✅ Content-Type Demo listening on http://localhost:3002");
console.log("\n📝 Try these commands:");
console.log("   curl -i http://localhost:3002/api");
console.log("   curl -i http://localhost:3002/style.css");
console.log("   curl -i http://localhost:3002/text");
console.log("   curl -i http://localhost:3002/search");
console.log("\n🌐 Or visit: http://localhost:3002\n");
