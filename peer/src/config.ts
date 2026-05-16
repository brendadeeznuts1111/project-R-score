export type CatalogEnv = "production" | "preproduction" | "staging";

export type AppRuntimeConfig = {
  apiBaseUrl: string;
  chainId: 8453 | 534352 | 31337;
  catalogEnv: CatalogEnv;
  pollingIntervalMs: number;
  slowPollingIntervalMs: number;
  enableMockRealtime: boolean;
  enableComplianceDashboard: boolean;
  defaultRole: "Operator" | "Admin" | "Compliance" | "Viewer";
};

declare global {
  interface Window {
    __PEER_CONFIG__?: Partial<AppRuntimeConfig>;
    ethereum?: unknown;
  }
}

const DEFAULT_CONFIG: AppRuntimeConfig = {
  apiBaseUrl: "",
  chainId: 8453,
  catalogEnv: "production",
  pollingIntervalMs: 15_000,
  slowPollingIntervalMs: 45_000,
  enableMockRealtime: true,
  enableComplianceDashboard: true,
  defaultRole: "Operator",
};

export function getRuntimeConfig(): AppRuntimeConfig {
  const overrides = typeof window !== "undefined" ? window.__PEER_CONFIG__ ?? {} : {};
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

export const runtimeConfig = getRuntimeConfig();
