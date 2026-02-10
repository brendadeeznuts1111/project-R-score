import { resolveDashboardEnvConfig } from "../../scripts/lib/dashboard-env";

export type RuntimeEnvState = {
  host: string;
  port: number;
  base: string;
  allowFallback: boolean;
  portRange: string;
};

export class RuntimeEnv {
  static read(): RuntimeEnvState {
    const config = resolveDashboardEnvConfig(3011);
    return {
      host: config.host,
      port: config.port,
      base: config.base,
      allowFallback: config.allowFallback,
      portRange: config.portRange,
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
    return state;
  }
}
