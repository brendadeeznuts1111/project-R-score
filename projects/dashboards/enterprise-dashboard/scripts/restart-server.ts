#!/usr/bin/env bun
/**
 * Restart the enterprise dashboard server
 * Graceful shutdown → health verification → status output
 */

import { $ } from "bun";

const SERVER_SCRIPT = "src/server/index.ts";
const PORT = process.env.PORT || "8080";
const HEALTH_URL = `http://localhost:${PORT}/health`;

// Preconnect hosts for --fetch-preconnect CLI flag (early DNS+TCP+TLS)
// Note: CLI flag requires explicit port, so we add :443 for https if missing
function normalizePreconnectUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    // CLI requires explicit port - URL.toString() omits default ports, so build manually
    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return null;
  }
}

const PRECONNECT_HOSTS = [
  process.env.S3_ENDPOINT,
  process.env.PROXY_URL,
  ...(process.env.PRECONNECT_HOSTS?.split(",") || []),
].map(h => h ? normalizePreconnectUrl(h) : null).filter(Boolean) as string[];
const SHUTDOWN_TIMEOUT = 3000; // ms to wait for graceful shutdown
const HEALTH_TIMEOUT = 10000; // ms to wait for health check
const HEALTH_INTERVAL = 250; // ms between health checks

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  ok: "\x1b[36m",
  err: "\x1b[35m",
  warn: "\x1b[33m",
};

interface ServerStatus {
  pid: number;
  uptime?: number;
  version?: string;
  secretsLoaded?: number;
}

async function getRunningServer(): Promise<ServerStatus | null> {
  try {
    const result = await $`lsof -ti :${PORT}`.text();
    const pid = parseInt(result.trim().split("\n")[0]);
    if (!pid) return null;

    // Try to get health info from running server
    try {
      const health = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1000) });
      const data = await health.json() as any;
      return {
        pid,
        uptime: data.runtime?.uptime,
        version: data.version,
        secretsLoaded: data.secrets?.count,
      };
    } catch {
      return { pid };
    }
  } catch {
    return null;
  }
}

async function gracefulShutdown(pid: number): Promise<boolean> {
  // Try SIGTERM first (graceful)
  try {
    await $`kill -TERM ${pid}`.quiet();
  } catch {
    return false;
  }

  // Wait for process to exit
  const start = Date.now();
  while (Date.now() - start < SHUTDOWN_TIMEOUT) {
    try {
      await $`kill -0 ${pid}`.quiet();
      await Bun.sleep(100);
    } catch {
      return true; // Process exited
    }
  }

  // Force kill if still running
  try {
    await $`kill -KILL ${pid}`.quiet();
    await Bun.sleep(100);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
  const start = Date.now();

  while (Date.now() - start < HEALTH_TIMEOUT) {
    try {
      const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(HEALTH_INTERVAL);
  }

  return { success: false, error: "Health check timeout" };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force") || args.includes("-f");

  console.log(`\n${c.bold}Server Restart${c.reset}\n`);

  // Check for existing server
  const existing = await getRunningServer();

  if (existing) {
    const uptimeStr = existing.uptime ? ` (uptime: ${formatUptime(existing.uptime)})` : "";
    const versionStr = existing.version ? ` v${existing.version}` : "";
    console.log(`${c.dim}├─${c.reset} Found server${versionStr} on port ${PORT}${uptimeStr}`);
    console.log(`${c.dim}├─${c.reset} PID: ${existing.pid}`);

    if (force) {
      console.log(`${c.dim}├─${c.reset} ${c.warn}Force killing...${c.reset}`);
      await $`kill -KILL ${existing.pid}`.quiet().catch(() => {});
      await Bun.sleep(100);
    } else {
      console.log(`${c.dim}├─${c.reset} Graceful shutdown...`);
      const stopped = await gracefulShutdown(existing.pid);
      if (!stopped) {
        console.log(`${c.dim}├─${c.reset} ${c.warn}Graceful shutdown failed, force killing${c.reset}`);
      }
    }
    console.log(`${c.dim}├─${c.reset} ${c.ok}◆${c.reset} Previous server stopped`);
  } else {
    console.log(`${c.dim}├─${c.reset} No existing server on port ${PORT}`);
  }

  // Start new server
  console.log(`${c.dim}├─${c.reset} Starting server...`);

  // Build command with preconnect flags
  const bunArgs = ["bun", "--hot"];
  for (const host of PRECONNECT_HOSTS) {
    bunArgs.push("--fetch-preconnect", host);
  }
  bunArgs.push(SERVER_SCRIPT);

  if (PRECONNECT_HOSTS.length > 0) {
    console.log(`${c.dim}├─${c.reset} Preconnecting to ${PRECONNECT_HOSTS.length} host(s)`);
  }

  const proc = Bun.spawn(bunArgs, {
    cwd: import.meta.dir + "/..",
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  });

  proc.unref();

  // Wait for health check
  console.log(`${c.dim}├─${c.reset} Waiting for health check...`);
  const health = await waitForHealth();

  if (!health.success) {
    console.log(`${c.dim}└─${c.reset} ${c.err}✖ Health check failed: ${health.error}${c.reset}`);
    process.exit(1);
  }

  // Success output
  console.log(`${c.dim}└─${c.reset} ${c.ok}◆ Server ready${c.reset}\n`);

  // Status table
  const network = health.data?.network;
  const status = [
    { Key: "URL", Value: `http://localhost:${PORT}` },
    { Key: "PID", Value: String(proc.pid) },
    { Key: "Version", Value: health.data?.version || "unknown" },
    { Key: "Bun", Value: health.data?.runtime?.bun || "unknown" },
    { Key: "Memory", Value: `${health.data?.runtime?.memory?.rss || "?"}MB RSS` },
    { Key: "Secrets", Value: `${health.data?.secrets?.count || 0} loaded` },
    { Key: "Network", Value: network ? `${network.hosts} preconnect, ${network.maxConcurrent} max` : "default" },
    { Key: "Integrity", Value: health.data?.integrity?.verified ? `${c.ok}◆ verified${c.reset}` : `${c.err}✖ failed${c.reset}` },
  ];

  console.log(Bun.inspect.table(status, { colors: true }));
}

main().catch(err => {
  console.error(`\n${c.err}✖ Restart failed:${c.reset}`, err.message);
  process.exit(1);
});
