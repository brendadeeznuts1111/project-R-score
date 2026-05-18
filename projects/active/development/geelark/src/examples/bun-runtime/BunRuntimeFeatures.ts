#!/usr/bin/env bun
/**
 * Bun Runtime Features Demo
 *
 * Demonstrates:
 * - Global Configuration & Context (Bun.main, Bun.env, Bun.file)
 * - Networking & Security (Bun.serve, security headers, TLS)
 * - Decorators for HTTP endpoints
 * - Config loading with Bun.file
 *
 * Run: bun examples/BunRuntimeFeatures.ts
 */

import { BunContext, getEnv } from "../src/context/BunContext.js";
import { BunServe } from "../src/server/BunServe.js";
import { createSecurityHeaders, cspPresets } from "../src/security/Headers.js";
import { Get, Post, registerRoutes } from "../src/decorators/Route.js";
import { middleware, Middleware } from "../src/decorators/Middleware.js";
import { loadConfig } from "../src/config/ConfigLoader.js";

// ============================================================================
// CLI Formatting Utilities (TypeScript instead of JSX)
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const icons = {
  success: "✅",
  error: "❌",
  warning: "⚠️ ",
  info: "ℹ️ ",
};

function renderTable(headers: string[], rows: string[][]) {
  const widths = headers.map((_, i) =>
    Math.max(headers[i].length, ...rows.map((row) => (row[i] ?? "").length))
  );

  const renderRow = (row: string[]) =>
    row.map((cell, i) => (cell ?? "").padEnd(widths[i] + 2)).join("|");

  console.info(colors.bold + renderRow(headers) + colors.reset);
  console.info(widths.map((w) => "─".repeat(w + 2)).join("+"));
  rows.forEach((row) => console.info(renderRow(row)));
}

function renderOutput(title: string, status: "success" | "error" | "warning" | "info", message: string) {
  const color = colors[status];
  const icon = icons[status];
  console.info(`\n${color}${colors.bold}${title}${colors.reset}`);
  console.info(`${icon} ${message}`);
}

function renderProgress(value: number, max = 100, label = "") {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  const bar = colors.success + "█".repeat(filled) + colors.dim + "░".repeat(empty) + colors.reset;
  console.info(`${label} ${bar} ${percentage.toFixed(0)}%`);
}

// ============================================================================
// Decorator Example
// ============================================================================

@Middleware(middleware.logger, middleware.timing)
class APIController {
  private data = new Map<string, any>();

  constructor() {
    this.data.set("users", [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "user" },
      { id: 3, name: "Charlie", role: "user" },
    ]);
  }

  @Get("/api/users")
  getUsers(req: Request) {
    const users = this.data.get("users") ?? [];
    return Response.json({ users, count: users.length });
  }

  @Get("/api/users/:id")
  getUser(req: Request, params: { id: string }) {
    const users = this.data.get("users") ?? [];
    const user = users.find((u: any) => u.id === Number(params.id));
    return user
      ? Response.json(user)
      : Response.json({ error: "User not found" }, { status: 404 });
  }

  @Post("/api/users")
  async createUser(req: Request) {
    const body = await req.json();
    const users = this.data.get("users") ?? [];
    const newUser = { id: users.length + 1, ...body };
    users.push(newUser);
    return Response.json(newUser, { status: 201 });
  }
}

// ============================================================================
// Server Setup with Security
// ============================================================================

function createServer() {
  const server = new BunServe({
    port: getEnv("PORT", 3000),
    cors: {
      origin: ["http://localhost:3000", "http://localhost:5173"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Register decorated routes
  registerRoutes(server, APIController);

  // Add custom route with security headers
  server.get("/api/health", (req) => {
    const response = Response.json({
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      bun: Bun.version,
    });

    return createSecurityHeaders({
      strictTransportSecurity: true,
      contentSecurityPolicy: cspPresets.moderate,
      referrerPolicy: "strict-origin-when-cross-origin",
    })(response);
  });

  // WebSocket echo server
  server.websocket({
    open(ws) {
      console.info("📡 WebSocket connected");
      ws.subscribe("chat");
    },
    message(ws, message) {
      ws.publish("chat", `Echo: ${message}`);
    },
    close(ws, code, message) {
      console.info(`📡 WebSocket disconnected: ${code} ${message}`);
    },
  });

  return server;
}

// ============================================================================
// Bun Context Demo
// ============================================================================

function showBunContext() {
  console.info("\n" + "=".repeat(60));
  console.info("🔧 Bun Context Demo");
  console.info("=".repeat(60));

  console.info(`
    Bun Version:        ${BunContext.version}
    Is Main:            ${BunContext.isMain}
    Main Entry:         ${BunContext.mainEntry ?? "unknown"}
    Platform:           ${BunContext.platform}
    Architecture:       ${BunContext.arch}
    CPU Count:          ${BunContext.cpuCount}
    Is CI:              ${BunContext.isCI}
    Is Development:     ${BunContext.isDevelopment}
    Is Production:      ${BunContext.isProduction}
    Is Test:            ${BunContext.isTest}
  `.trim().split("\n").map((line) => "    " + line).join("\n"));

  console.info("\n📋 Environment Variables:");
  console.info(`    NODE_ENV:           ${getEnv("NODE_ENV") ?? "not set"}`);
  console.info(`    PORT:               ${getEnv("PORT") ?? "3000 (default)"}`);
  console.info(`    BUN_VERSION:        ${getEnv("BUN_VERSION") ?? "not set"}`);
}

// ============================================================================
// Config Loading Demo with Bun.file
// ============================================================================

async function showConfigLoading() {
  console.info("\n" + "=".repeat(60));
  console.info("⚙️  Config Loading Demo (Bun.file)");
  console.info("=".repeat(60));

  // Load bun.toml
  try {
    const bunConfig = await loadConfig<any>("bun.toml");
    console.info("\n📄 bun.toml loaded:");
    console.info(`    Test root:          ${bunConfig.test?.root ?? "not set"}`);
    console.info(`    Lockfile:           ${bunConfig.lockfile?.print ?? "not set"}`);
  } catch (error) {
    console.info("\n⚠️  bun.toml not found (this is okay if running from different dir)");
  }

  // Load package.json
  try {
    const packageConfig = await loadConfig<any>("package.json");
    console.info("\n📄 package.json loaded:");
    console.info(`    Name:               ${packageConfig.name}`);
    console.info(`    Version:            ${packageConfig.version}`);
  } catch (error) {
    console.info("\n❌ Failed to load package.json");
  }

  // Load tsconfig.json
  try {
    const tsConfig = await loadConfig<any>("tsconfig.json");
    console.info("\n📄 tsconfig.json loaded:");
    console.info(`    JSX:                ${tsConfig.compilerOptions?.jsx ?? "not set"}`);
    console.info(`    Decorators:         ${tsConfig.compilerOptions?.experimentalDecorators ?? "false"}`);
  } catch (error) {
    console.info("\n⚠️  tsconfig.json not found");
  }
}

// ============================================================================
// CLI UI Demo
// ============================================================================

function showUI() {
  console.info("\n" + "=".repeat(60));
  console.info("📦 CLI UI Components Demo");
  console.info("=".repeat(60));

  renderOutput("System Status", "success", "All systems operational");
  renderOutput("Warnings", "warning", "High memory usage detected");

  console.info("\n📊 Service Status:");
  renderTable(["Service", "Status", "Uptime"], [
    ["API", icons.success + " Running", "99.9%"],
    ["Database", icons.success + " Connected", "99.5%"],
    ["Cache", icons.info + " Warm", "98.2%"],
  ]);

  console.info("\n📈 Resource Usage:");
  renderProgress(75, 100, "CPU Usage");
  renderProgress(45, 100, "Memory");
  renderProgress(90, 100, "Disk");
}

// ============================================================================
// Networking Demo
// ============================================================================

async function showNetworking() {
  console.info("\n" + "=".repeat(60));
  console.info("🌐 Networking Demo (Bun.serve)");
  console.info("=".repeat(60));

  // Test fetch with Bun
  try {
    const response = await fetch("https://httpbun.org/get");
    const data = await response.json();
    console.info("\n✅ Fetch test successful:");
    console.info(`    URL:               ${data.url}`);
    console.info(`    Status:            ${response.status}`);
    console.info(`    Headers:           ${Object.keys(data.headers as object).length}`);
  } catch (error) {
    console.info("\n⚠️  Fetch test failed (network may be unavailable)");
  }

  // Show security headers
  console.info("\n🔒 Security Headers configured:");
  const headers = [
    "X-Frame-Options: DENY",
    "X-Content-Type-Options: nosniff",
    "Strict-Transport-Security: max-age=31536000",
    "Content-Security-Policy: default-src 'self'",
    "Referrer-Policy: strict-origin-when-cross-origin",
  ];
  headers.forEach((h) => console.info(`    ${h}`));
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.info("\n" + "=".repeat(60));
  console.info("🚀 Bun Runtime Features Demo");
  console.info("=".repeat(60));
  console.info("Demonstrating: Transpilation, Global Config, Networking, Security");

  // Show Bun context info
  showBunContext();

  // Show config loading with Bun.file
  await showConfigLoading();

  // Show CLI components
  showUI();

  // Show networking
  await showNetworking();

  // Only start server if this is the main module
  if (BunContext.isMain) {
    console.info("\n" + "=".repeat(60));
    console.info("🌐 Starting HTTP Server with Bun.serve");
    console.info("=".repeat(60));

    const server = createServer();
    server.start();

    console.info("\n📡 WebSocket endpoint: ws://localhost:3000");
    console.info("🔗 API endpoints:");
    console.info("   GET  /api/health");
    console.info("   GET  /api/users");
    console.info("   GET  /api/users/:id");
    console.info("   POST /api/users");
    console.info("\nPress Ctrl+C to stop\n");

    // Keep process alive
    process.on("SIGINT", () => {
      console.info("\n🛑 Shutting down server...");
      server.stop();
      process.exit(0);
    });
  }
}

// Run if main
if (BunContext.isMain) {
  main().catch(console.error);
}

export { main, createServer, APIController };
