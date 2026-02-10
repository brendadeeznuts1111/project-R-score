import { resolveDashboardEnvConfig } from "../../scripts/lib/dashboard-env";

export type RuntimeEnvState = {
  host: string;
  port: number;
  base: string;
  allowFallback: boolean;
  portRange: string;
  runtimeOrigins: string[];
  runtimeStaleMs: number;
  wsBroadcastMs: number;
};

export class RuntimeEnv {
  static read(): RuntimeEnvState {
    const config = resolveDashboardEnvConfig(3011);
    const defaultOrigins = [`http://${config.host}:${config.port}`, "http://127.0.0.1:3011", "http://localhost:3011"];
    const configuredOrigins = String(process.env.PLAYGROUND_RUNTIME_ORIGINS || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//.test(item));
    const runtimeOrigins = Array.from(new Set((configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins)));
    const runtimeStaleMsRaw = Number.parseInt(process.env.PLAYGROUND_RUNTIME_STALE_MS || "15000", 10);
    const wsBroadcastMsRaw = Number.parseInt(process.env.PLAYGROUND_WS_BROADCAST_MS || "1000", 10);
    return {
      host: config.host,
      port: config.port,
      base: config.base,
      allowFallback: config.allowFallback,
      portRange: config.portRange,
      runtimeOrigins,
      runtimeStaleMs:
        Number.isFinite(runtimeStaleMsRaw) && runtimeStaleMsRaw >= 1000 && runtimeStaleMsRaw <= 300_000
          ? runtimeStaleMsRaw
          : 15000,
      wsBroadcastMs:
        Number.isFinite(wsBroadcastMsRaw) && wsBroadcastMsRaw >= 250 && wsBroadcastMsRaw <= 60_000
          ? wsBroadcastMsRaw
          : 1000,
    };
  }

  static validate(): RuntimeEnvState {
    const state = RuntimeEnv.read();
    if (!state.host || state.host.trim().length === 0) {
      throw new Error("DASHBOARD_HOST/PLAYGROUND host is not set");
    }
    if (!Number.isFinite(state.port) || state.port <= 0 || state.port > 65535) {
      throw new Error(`Invalid dashboard port: ${state.port}`);
    }
    if (!/^https?:\/\//.test(state.base)) {
      throw new Error(`Invalid dashboard base URL: ${state.base}`);
    }
    if (state.runtimeOrigins.length === 0) {
      throw new Error("PLAYGROUND_RUNTIME_ORIGINS resolved to an empty list");
    }
    return state;
  }
}
