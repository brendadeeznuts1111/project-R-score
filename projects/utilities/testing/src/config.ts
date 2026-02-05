import { existsSync } from "bun";

export const registryConfig = {
  default: "https://registry.npmjs.org",
  devhq: process.env.DEVHQ_REGISTRY || "https://registry.devhq.com",
  token: process.env.NPM_CONFIG_TOKEN || process.env.DEVHQ_TOKEN
};

export const PROXY_CONFIG = {
  allowedDomains: ["@domain1", "@domain2"] as const,
  maxHeaderSize: 8192,
  requireToken: true,
  port: parseInt(process.env.PROXY_PORT || "4873"),
} as const;

export const DNS_CONFIG = {
  defaultTTL: 300, // 5 minutes
  maxCacheSize: 1000,
  preloadHosts: [
    "proxy.mycompany.com",
    "registry.mycompany.com",
    "proxy.npmjs.org",
    "registry.npmjs.org",
    "localhost",
    "127.0.0.1",
  ],
} as const;

export const SYSTEM_LIMITS = {
  MAX_PHONES: parseInt(process.env.MAX_PHONES || "50"),
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || "10"),
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

export function getRegistry(): string {
  if (existsSync(".devhq-npmrc")) {
    return process.env.npm_config_registry || registryConfig.default;
  }
  return registryConfig.default;
}

// Use in package.json generation
export function generatePackageJson(name: string, deps: Record<string, string>) {
  return {
    name,
    version: "1.0.0",
    dependencies: deps,
    publishConfig: {
      registry: registryConfig.devhq
    }
  };
}
