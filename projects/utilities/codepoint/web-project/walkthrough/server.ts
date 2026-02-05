#!/usr/bin/env bun

import { file, serve } from "bun";

const port = 63514;

const server = serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve the main walkthrough page
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await file("./index.html").text();
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Handle 404
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Bun Proxy API Walkthrough running on http://localhost:${port}`);
console.log(`📖 Open your browser to: http://localhost:${port}/`);
console.log(`🛑 Press Ctrl+C to stop the server`);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down walkthrough server...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down walkthrough server...");
  server.stop();
  process.exit(0);
});
