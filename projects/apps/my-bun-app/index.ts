#!/usr/bin/env bun
/**
 * My Bun App - Web server project
 * Demonstrates project isolation with Bun.main context
 */

// Entry guard - only allow direct execution
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  My Bun App Starting                                     ║
║  Entrypoint: ${Bun.main}${' '.repeat(Math.max(0, 80 - Bun.main.length))}║
╚═══════════════════════════════════════════════════════════╝
`);

// Example: Use the shared server.ts in parent directory
console.log(`Project Home: ${process.env.PROJECT_HOME || 'Not set'}`);
console.log(`BUN_PLATFORM_HOME: ${process.env.BUN_PLATFORM_HOME || 'Not set'}`);

// Simple web server
const port = process.env.PORT || 3000;

Bun.serve({
  port: Number(port),
  fetch(req) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Bun App</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
            .info { background: #f0f0f0; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
            code { background: #e0e0e0; padding: 0.2rem 0.4rem; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>🚀 My Bun App</h1>
          <div class="info">
            <p><strong>Entrypoint:</strong> <code>${Bun.main}</code></p>
            <p><strong>Project Home:</strong> <code>${process.env.PROJECT_HOME}</code></p>
            <p><strong>BUN_PLATFORM_HOME:</strong> <code>${process.env.BUN_PLATFORM_HOME}</code></p>
            <p><strong>Port:</strong> ${port}</p>
          </div>

          <h2>Quick Commands</h2>
          <ul>
            <li><code>bun run dev</code> - Start dev server (this)</li>
            <li><code>bun cli-resolver.ts typecheck</code> - Type check project</li>
            <li><code>bun tools/overseer-cli.ts my-bun-app bun run dev</code> - Run via root CLI</li>
          </ul>

          <p><a href="/api/health">Check API Health</a></p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  },
  error(err) {
    console.error(`[${Bun.main}] Server error:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`Server running at http://localhost:${port}`);