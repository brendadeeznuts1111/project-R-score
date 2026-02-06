/**
 * /dev - Start and manage the MCP registry development server
 *
 * Usage:
 *   /dev               - Start dev server (port 3333)
 *   /dev --port 4000   - Start on custom port
 *   /dev status        - Check if server is running
 *   /dev stop          - Stop running server
 *   /dev restart       - Restart the server
 *   /dev logs          - View recent server logs
 *
 * Environment Variables:
 *   MCP_PORT           - Server port (default: 3333)
 *   NODE_ENV           - Runtime environment
 *   EXCHANGE_ENABLED   - Enable exchange handler
 *   EXCHANGE_MOCK_MODE - Use mock data (default: true in dev)
 *
 * @see packages/core/src/index.ts
 */

const DEFAULT_PORT = 3333;

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({
      port,
      fetch: () => new Response("test"),
    });
    server.stop();
    return false;
  } catch {
    return true;
  }
}

/**
 * Find process using a specific port (macOS/Linux)
 */
async function findProcessOnPort(port: number): Promise<string | null> {
  try {
    const proc = Bun.spawn(["lsof", "-ti", `:${port}`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    const output = await new Response(proc.stdout).text();
    return output.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Kill process on a specific port
 */
async function killProcessOnPort(port: number): Promise<boolean> {
  const pid = await findProcessOnPort(port);
  if (!pid) {
    console.log(`No process found on port ${port}`);
    return false;
  }

  try {
    const proc = Bun.spawn(["kill", "-9", pid], {
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;
    console.log(`Killed process ${pid} on port ${port}`);
    return true;
  } catch {
    console.error(`Failed to kill process ${pid}`);
    return false;
  }
}

/**
 * Check server health
 */
async function checkHealth(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/mcp/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Parse port from arguments
 */
function parsePort(parts: string[]): number {
  const portIndex = parts.findIndex((p) => p === "--port" || p === "-p");
  if (portIndex !== -1 && parts[portIndex + 1]) {
    const port = parseInt(parts[portIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  return DEFAULT_PORT;
}

export default async function dev(args?: string) {
  const parts = args?.trim().split(/\s+/).filter(Boolean) || [];
  const command = parts[0]?.toLowerCase();
  const port = parsePort(parts);

  switch (command) {
    case "status": {
      console.log(`\nChecking server status on port ${port}...`);
      const inUse = await isPortInUse(port);
      if (!inUse) {
        console.log(`Server is not running on port ${port}`);
        return false;
      }

      const healthy = await checkHealth(port);
      if (healthy) {
        console.log(`Server is running and healthy on port ${port}`);
        const pid = await findProcessOnPort(port);
        if (pid) console.log(`Process ID: ${pid}`);
      } else {
        console.log(`Port ${port} is in use but health check failed`);
      }
      return healthy;
    }

    case "stop": {
      console.log(`\nStopping server on port ${port}...`);
      const killed = await killProcessOnPort(port);
      if (killed) {
        // Wait a moment for port to be released
        await Bun.sleep(500);
        console.log("Server stopped");
      }
      return killed;
    }

    case "restart": {
      console.log(`\nRestarting server on port ${port}...`);

      // Stop if running
      const inUse = await isPortInUse(port);
      if (inUse) {
        await killProcessOnPort(port);
        await Bun.sleep(1000);
      }

      // Start fresh
      return startServer(port, parts);
    }

    case "logs": {
      console.log(`\nViewing logs is not yet implemented.`);
      console.log(`Tip: Check the terminal where the server is running.`);
      return true;
    }

    default: {
      // Start the server
      return startServer(port, parts);
    }
  }
}

/**
 * Start the development server
 */
async function startServer(port: number, parts: string[]): Promise<boolean> {
  // Check if already running
  const inUse = await isPortInUse(port);
  if (inUse) {
    const healthy = await checkHealth(port);
    if (healthy) {
      console.log(`\nServer already running on port ${port}`);
      console.log(`Use '/dev restart' to restart or '/dev stop' to stop.`);
      return true;
    } else {
      console.log(`\nPort ${port} is in use by another process.`);
      console.log(`Use '/dev --port <other>' or stop the other process.`);
      return false;
    }
  }

  console.log(`\nStarting development server on port ${port}...`);

  // Build environment
  const env: Record<string, string> = {
    ...process.env,
    MCP_PORT: String(port),
  };

  // Check for additional flags
  if (parts.includes("--no-exchange")) {
    env.EXCHANGE_ENABLED = "false";
  }
  if (parts.includes("--production")) {
    env.NODE_ENV = "production";
    env.EXCHANGE_MOCK_MODE = "false";
  }

  const proc = Bun.spawn(["bun", "run", "dev"], {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  // The dev server runs indefinitely, so we wait for it
  await proc.exited;
  return proc.exitCode === 0;
}
