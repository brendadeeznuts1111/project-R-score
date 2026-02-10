import { createServer } from "node:net";

const SERVER_CMD = ["bun", "run", "scratch/bun-v1.3.9-examples/playground-web/server.ts"];

export type DashboardTestConfig = {
  host: string;
  port: number;
  base: string;
};

export function getDashboardTestConfig(): DashboardTestConfig {
  const host = process.env.DASHBOARD_HOST || "localhost";
  const port = Number.parseInt(
    process.env.DASHBOARD_TEST_PORT ||
      process.env.DASHBOARD_PORT ||
      process.env.PLAYGROUND_PORT ||
      process.env.PORT ||
      "3401",
    10
  );
  const safePort = Number.isFinite(port) && port > 0 ? port : 3401;
  const base = `http://${host}:${safePort}`;
  return { host, port: safePort, base };
}

export function applyDashboardTestEnv(config: DashboardTestConfig): void {
  process.env.DASHBOARD_HOST = config.host;
  process.env.DASHBOARD_TEST_PORT = String(config.port);
  process.env.DASHBOARD_PORT = String(config.port);
  process.env.PLAYGROUND_PORT = String(config.port);
  process.env.PORT = String(config.port);
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

function parsePortRange(value: string, fallbackStart: number, fallbackEnd: number): { start: number; end: number } {
  const match = value.trim().match(/^(\d+)-(\d+)$/);
  if (!match) return { start: fallbackStart, end: fallbackEnd };
  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
    return { start: fallbackStart, end: fallbackEnd };
  }
  return start <= end ? { start, end } : { start: end, end: start };
}

async function isPortAvailable(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

async function findFallbackPort(fromPort: number): Promise<number | null> {
  const defaultRange = `${fromPort}-${Math.min(fromPort + 40, 65535)}`;
  const configuredRange = process.env.DASHBOARD_TEST_PORT_RANGE || defaultRange;
  const { start, end } = parsePortRange(configuredRange, fromPort, Math.min(fromPort + 40, 65535));
  for (let candidate = start; candidate <= end; candidate += 1) {
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }
  return null;
}

function detectPortOwner(port: number): { ownerPid: number | null; ownerCommand: string | null } {
  try {
    const result = Bun.spawnSync({
      cmd: ["lsof", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = result.stdout.toString().trim();
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return { ownerPid: null, ownerCommand: null };
    const parts = lines[1].split(/\s+/);
    return {
      ownerCommand: parts[0] || null,
      ownerPid: Number.parseInt(parts[1] || "", 10) || null,
    };
  } catch {
    return { ownerPid: null, ownerCommand: null };
  }
}

export async function withDashboardServer<T>(
  host: string,
  port: number,
  run: () => Promise<T>,
): Promise<T> {
  const allowFallback = parseBooleanEnv(process.env.DASHBOARD_TEST_ALLOW_PORT_FALLBACK, true);
  let activePort = port;
  let base = `http://${host}:${activePort}`;
  let serverProc: ReturnType<typeof Bun.spawn> | null = null;
  let startedHere = false;

  const isUp = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${base}/api/health`);
      return res.status === 200;
    } catch {
      return false;
    }
  };

  const waitForUp = async (timeoutMs = 12000): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await isUp()) return true;
      await Bun.sleep(250);
    }
    return false;
  };

  try {
    const alreadyUp = await isUp();
    if (!alreadyUp) {
      const available = await isPortAvailable(activePort);
      if (!available) {
        if (!allowFallback) {
          const owner = detectPortOwner(activePort);
          const ownerDetail = owner.ownerPid || owner.ownerCommand
            ? `pid=${owner.ownerPid ?? "unknown"} cmd=${owner.ownerCommand ?? "unknown"}`
            : "unknown owner";
          throw new Error(
            `dashboard test port ${activePort} is busy (${ownerDetail}). ` +
              "Set DASHBOARD_TEST_ALLOW_PORT_FALLBACK=true or choose DASHBOARD_TEST_PORT."
          );
        }
        const fallbackPort = await findFallbackPort(activePort);
        if (fallbackPort == null) {
          throw new Error(
            `dashboard test port ${activePort} is busy and no fallback port found. ` +
              "Adjust DASHBOARD_TEST_PORT_RANGE."
          );
        }
        activePort = fallbackPort;
        base = `http://${host}:${activePort}`;
      }

      process.env.DASHBOARD_HOST = host;
      process.env.DASHBOARD_TEST_PORT = String(activePort);
      process.env.DASHBOARD_PORT = String(activePort);
      process.env.PLAYGROUND_PORT = String(activePort);
      process.env.PORT = String(activePort);

      serverProc = Bun.spawn({
        cmd: SERVER_CMD,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "ignore",
        env: {
          ...process.env,
          DASHBOARD_HOST: host,
          DASHBOARD_PORT: String(activePort),
          PLAYGROUND_PORT: String(activePort),
          PORT: String(activePort),
          PLAYGROUND_ALLOW_PORT_FALLBACK: "false",
        },
      });
      startedHere = true;
      const ready = await waitForUp();
      if (!ready) {
        throw new Error(`dashboard server did not become healthy at ${base}`);
      }
    }

    return await run();
  } finally {
    if (startedHere && serverProc) {
      serverProc.kill();
      await serverProc.exited.catch(() => {});
    }
  }
}
