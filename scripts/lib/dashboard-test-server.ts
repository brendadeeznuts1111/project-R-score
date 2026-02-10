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
  process.env.DASHBOARD_PORT = String(config.port);
  process.env.PLAYGROUND_PORT = String(config.port);
  process.env.PORT = String(config.port);
}

export async function withDashboardServer<T>(
  host: string,
  port: number,
  run: () => Promise<T>,
): Promise<T> {
  const base = `http://${host}:${port}`;
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
      serverProc = Bun.spawn({
        cmd: SERVER_CMD,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "ignore",
        env: {
          ...process.env,
          DASHBOARD_HOST: host,
          DASHBOARD_PORT: String(port),
          PLAYGROUND_PORT: String(port),
          PORT: String(port),
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
