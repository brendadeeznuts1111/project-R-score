import { resolveDashboardEnvConfig } from "../../scripts/lib/dashboard-env";

export type RuntimePortsScan = {
  ok: boolean;
  base: string;
  status: number;
  requestedPort?: number;
  activePort?: number;
  remapped?: boolean;
  fallbackAllowed?: boolean;
  requestedPortOwner?: { ownerPid: number | null; ownerCommand: string | null };
  activePortOwner?: { ownerPid: number | null; ownerCommand: string | null };
  error?: string;
};

export class RuntimePortsPanel {
  readonly base: string;
  readonly candidates: string[];
  readonly autoStart: boolean;

  constructor(base?: string, options?: { autoStart?: boolean }) {
    const resolved = resolveDashboardEnvConfig(3011).base;
    this.base = base || resolved;
    this.autoStart = options?.autoStart ?? true;
    this.candidates = Array.from(
      new Set([
        this.base,
        resolveDashboardEnvConfig(3401).base,
        "http://localhost:3011",
        "http://localhost:3401",
      ])
    );
  }

  async scan(): Promise<RuntimePortsScan> {
    let lastError: string | null = null;
    for (const base of this.candidates) {
      const url = `${base}/api/control/runtime/ports`;
      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
          lastError = `HTTP ${response.status} @ ${base}`;
          continue;
        }
        return {
          ok: true,
          base,
          status: response.status,
          requestedPort: Number(payload?.requestedPort || 0),
          activePort: Number(payload?.activePort || 0),
          remapped: Boolean(payload?.remapped),
          fallbackAllowed: Boolean(payload?.fallbackAllowed),
          requestedPortOwner: (payload?.requestedPortOwner || null) as
            | { ownerPid: number | null; ownerCommand: string | null }
            | undefined,
          activePortOwner: (payload?.activePortOwner || null) as
            | { ownerPid: number | null; ownerCommand: string | null }
            | undefined,
        };
      } catch (error) {
        lastError = `${base}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    if (!this.autoStart) {
      return {
        ok: false,
        base: this.base,
        status: 0,
        error: lastError || "No runtime ports endpoint reachable",
      };
    }

    try {
      const { getDashboardTestConfig, applyDashboardTestEnv, withDashboardServer } = await import(
        "../../scripts/lib/dashboard-test-server"
      );
      const cfg = getDashboardTestConfig();
      applyDashboardTestEnv(cfg);
      return await withDashboardServer(cfg.host, cfg.port, async () => {
        const response = await fetch(`${cfg.base}/api/control/runtime/ports`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!response.ok) {
          return {
            ok: false,
            base: cfg.base,
            status: response.status,
            error: `HTTP ${response.status} @ ${cfg.base}`,
          };
        }
        return {
          ok: true,
          base: cfg.base,
          status: response.status,
          requestedPort: Number(payload?.requestedPort || 0),
          activePort: Number(payload?.activePort || 0),
          remapped: Boolean(payload?.remapped),
          fallbackAllowed: Boolean(payload?.fallbackAllowed),
          requestedPortOwner: (payload?.requestedPortOwner || null) as
            | { ownerPid: number | null; ownerCommand: string | null }
            | undefined,
          activePortOwner: (payload?.activePortOwner || null) as
            | { ownerPid: number | null; ownerCommand: string | null }
            | undefined,
        };
      });
    } catch (error) {
      return {
        ok: false,
        base: this.base,
        status: 0,
        error:
          lastError ||
          (error instanceof Error ? error.message : String(error)) ||
          "No runtime ports endpoint reachable",
      };
    }
  }
}
