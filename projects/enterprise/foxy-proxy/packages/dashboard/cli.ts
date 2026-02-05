#!/usr/bin/env bun
/**
 * Dashboard CLI
 * Bun-based CLI for dashboard operations
 */

import { join, resolve } from "path";

import { serve } from "bun";

const args = process.argv.slice(2);
const command = args[0];
const port = parseInt(args[1] || "3000");

const commands = {
  serve: "Serve the dashboard on a local server",
  build: "Build the dashboard for production",
  benchmark: "Run performance benchmarks",
  help: "Show this help message"
};

async function serveDashboard(port: number) {
  const distDir = resolve(import.meta.dir, "dist");
  const indexFile = join(distDir, "index.html");

  console.log("📦 Dashboard Server");
  console.log(`🚀 Starting server on http://localhost:${port}`);
  console.log(`📁 Serving: ${distDir}`);
  console.log("⏹️  Press Ctrl+C to stop\n");

  const _server = serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const filePath = join(distDir, url.pathname);

      // Try to serve the file
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }
      } catch (e) {
        // File doesn't exist, continue
      }

      // If it's a directory or doesn't exist, try index.html
      try {
        const dirFile = Bun.file(join(filePath, "index.html"));
        if (await dirFile.exists()) {
          return new Response(dirFile, {
            headers: { "Content-Type": "text/html" }
          });
        }
      } catch (e) {
        // Not a directory, continue
      }

      // Fall back to root index.html for SPA routing
      try {
        const indexFileContent = Bun.file(indexFile);
        if (await indexFileContent.exists()) {
          return new Response(indexFileContent, {
            headers: { "Content-Type": "text/html" }
          });
        }
      } catch (e) {
        // index.html doesn't exist
      }

      return new Response("404 Not Found", { status: 404 });
    }
  });

  console.log("✅ Server started");
}

async function buildDashboard() {
  console.log("📦 Building dashboard...");

  const result = await Bun.spawn(["bun", "build", "src/main.tsx", "--outdir", "dist"]);
  const exitCode = await result.exited;

  if (exitCode === 0) {
    console.log("✅ Build complete!");
  } else {
    console.error("❌ Build failed");
    process.exit(1);
  }
}

async function runBenchmark() {
  console.log("📊 Running benchmarks...\n");

  const result = await Bun.spawn(["bun", "benchmarks/feature-flags.ts"], {
    stdio: ["inherit", "pipe", "pipe"]
  });

  const output = await new Response(result.stdout).text();
  const errors = await new Response(result.stderr).text();

  console.log(output);
  if (errors) {
    console.error(errors);
  }
}

function showHelp() {
  console.log(`
📦 Dashboard CLI

Usage: bun cli.ts <command> [options]

Commands:
  serve <port>      ${commands.serve} (default: 3000)
  build             ${commands.build}
  benchmark         ${commands.benchmark}
  help              ${commands.help}

Examples:
  bun cli.ts serve              # Start server on port 3000
  bun cli.ts serve 8080         # Start server on port 8080
  bun cli.ts build              # Build dashboard
  bun cli.ts benchmark          # Run benchmarks

Environment:
  PORT              Override default port (default: 3000)
`);
}

async function main() {
  if (!command || command === "help") {
    showHelp();
    return;
  }

  switch (command) {
    case "serve":
      await serveDashboard(port);
      break;
    case "build":
      await buildDashboard();
      break;
    case "benchmark":
      await runBenchmark();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log("Run 'bun cli.ts help' for usage information");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
