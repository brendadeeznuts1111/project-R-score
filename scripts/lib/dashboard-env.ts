export type DashboardEnvConfig = {
  host: string;
  port: number;
  base: string;
  allowFallback: boolean;
  portRange: string;
};

export type PlaygroundPortPolicy = {
  host: string;
  requestedPort: number;
  portRange: string;
  allowFallback: boolean;
};

export function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

export function resolveDashboardHost(): string {
  return process.env.DASHBOARD_HOST || process.env.SERVER_HOST || "localhost";
}

export function resolveDashboardPort(fallback = 3401): number {
  const raw = Number.parseInt(
    process.env.DASHBOARD_TEST_PORT ||
      process.env.DASHBOARD_PORT ||
      process.env.PLAYGROUND_PORT ||
      process.env.PORT ||
      String(fallback),
    10
  );
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function resolveDashboardEnvConfig(portFallback = 3401): DashboardEnvConfig {
  const host = resolveDashboardHost();
  const port = resolveDashboardPort(portFallback);
  return {
    host,
    port,
    base: `http://${host}:${port}`,
    allowFallback: parseBooleanEnv(process.env.DASHBOARD_TEST_ALLOW_PORT_FALLBACK, true),
    portRange: process.env.DASHBOARD_TEST_PORT_RANGE || `${port}-${Math.min(port + 40, 65535)}`,
  };
}

export function applyDashboardEnv(config: Pick<DashboardEnvConfig, "host" | "port">): void {
  process.env.DASHBOARD_HOST = config.host;
  process.env.DASHBOARD_TEST_PORT = String(config.port);
  process.env.DASHBOARD_PORT = String(config.port);
  process.env.PLAYGROUND_PORT = String(config.port);
  process.env.PORT = String(config.port);
}

export function resolvePlaygroundPortPolicy(portFallback = 3011): PlaygroundPortPolicy {
  return {
    host: resolveDashboardHost(),
    requestedPort: resolveDashboardPort(portFallback),
    portRange: process.env.PLAYGROUND_PORT_RANGE || "3011-3020",
    allowFallback: parseBooleanEnv(process.env.PLAYGROUND_ALLOW_PORT_FALLBACK, false),
  };
}
