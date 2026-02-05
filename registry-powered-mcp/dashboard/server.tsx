#!/usr/bin/env bun
import { serve } from "bun";

const port = process.env.PORT || 3000;

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bun MCP Registry Hub Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/index.js"></script>
</body>
</html>`;
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve the bundled JavaScript
    if (url.pathname === "/index.js") {
      try {
        const file = Bun.file("./dist/index.js");
        return new Response(await file.arrayBuffer(), {
          headers: { "Content-Type": "application/javascript" },
        });
      } catch {
        return new Response("Build the project first: bun run build", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Dashboard server running on http://localhost:${port}`);