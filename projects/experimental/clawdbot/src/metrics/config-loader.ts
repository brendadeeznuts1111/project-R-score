/**
 * Load metrics configuration from JSONC file.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_DIR_CLAWDBOT } from "../config/config.js";
import type { MetricsConfig } from "./types.js";

const isBunFile = typeof Bun !== "undefined" && "file" in Bun;

const CONFIG_FILE = "metrics.config.jsonc";

function getDefaultConfig(): MetricsConfig {
  return {
    collection: {
      enabled: true,
      maxRecentExecutions: 100,
      thresholds: {
        warning: 5000,
        critical: 15000,
      },
    },
    archival: {
      enabled: true,
      maxAgeDays: 7,
      compressLevel: 9,
      storagePath: join(STATE_DIR_CLAWDBOT, "archives"),
    },
    terminal: {
      trackUsage: true,
      maxSessionTime: 3600000,
      recordSessions: false,
    },
    websocket: {
      enabled: true,
      updateInterval: 5000,
      maxConnections: 10,
    },
  };
}

const isBun = typeof Bun !== "undefined";

// Regex patterns cached at module scope for Node fallback (compiled once)
const SINGLE_LINE_COMMENT_RE = /\/\/.*$/gm;
const MULTI_LINE_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const TRAILING_COMMA_RE = /,(\s*[}\]])/g;

/**
 * Parse JSONC content (JSON with comments).
 */
function parseJsonc(content: string): unknown {
  if (isBun && "JSONC" in Bun) {
    return (Bun as unknown as { JSONC: { parse: (s: string) => unknown } }).JSONC.parse(content);
  }
  // Node fallback: strip comments manually (using cached regex)
  let result = content.replace(SINGLE_LINE_COMMENT_RE, "");
  result = result.replace(MULTI_LINE_COMMENT_RE, "");
  result = result.replace(TRAILING_COMMA_RE, "$1");
  return JSON.parse(result);
}

/**
 * Load metrics config from user's state directory or bundled default.
 * Async version using Bun.file() when available.
 */
export async function loadMetricsConfigAsync(): Promise<MetricsConfig> {
  const defaults = getDefaultConfig();
  const userConfigPath = join(STATE_DIR_CLAWDBOT, CONFIG_FILE);
  const bundledConfigPath = join(import.meta.dir, "config.jsonc");

  if (isBunFile) {
    // Use Bun.file() for faster async reads
    const userFile = Bun.file(userConfigPath);
    if (await userFile.exists()) {
      try {
        const content = await userFile.text();
        const parsed = parseJsonc(content) as Partial<MetricsConfig>;
        return mergeConfig(defaults, parsed);
      } catch (err) {
        console.warn(`[metrics] Failed to load user config from ${userConfigPath}:`, err);
      }
    }

    const bundledFile = Bun.file(bundledConfigPath);
    if (await bundledFile.exists()) {
      try {
        const content = await bundledFile.text();
        const parsed = parseJsonc(content) as Partial<MetricsConfig>;
        return mergeConfig(defaults, parsed);
      } catch (err) {
        console.warn(`[metrics] Failed to load bundled config:`, err);
      }
    }

    return defaults;
  }

  // Node fallback
  return loadMetricsConfig();
}

/**
 * Load metrics config from user's state directory or bundled default.
 * Sync version for backwards compatibility.
 */
export function loadMetricsConfig(): MetricsConfig {
  const defaults = getDefaultConfig();

  // Check user config location
  const userConfigPath = join(STATE_DIR_CLAWDBOT, CONFIG_FILE);
  if (existsSync(userConfigPath)) {
    try {
      const content = readFileSync(userConfigPath, "utf-8");
      const parsed = parseJsonc(content) as Partial<MetricsConfig>;
      return mergeConfig(defaults, parsed);
    } catch (err) {
      console.warn(`[metrics] Failed to load user config from ${userConfigPath}:`, err);
    }
  }

  // Check bundled config
  const bundledConfigPath = join(import.meta.dir, "config.jsonc");
  if (existsSync(bundledConfigPath)) {
    try {
      const content = readFileSync(bundledConfigPath, "utf-8");
      const parsed = parseJsonc(content) as Partial<MetricsConfig>;
      return mergeConfig(defaults, parsed);
    } catch (err) {
      console.warn(`[metrics] Failed to load bundled config:`, err);
    }
  }

  return defaults;
}

function mergeConfig(defaults: MetricsConfig, overrides: Partial<MetricsConfig>): MetricsConfig {
  return {
    collection: {
      ...defaults.collection,
      ...overrides.collection,
      thresholds: {
        ...defaults.collection.thresholds,
        ...overrides.collection?.thresholds,
      },
    },
    archival: {
      ...defaults.archival,
      ...overrides.archival,
    },
    terminal: {
      ...defaults.terminal,
      ...overrides.terminal,
    },
    websocket: {
      ...defaults.websocket,
      ...overrides.websocket,
    },
    s3: overrides.s3,
  };
}

/**
 * Resolve tilde in storage path.
 */
export function resolveStoragePath(path: string): string {
  if (path.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return join(home, path.slice(2));
  }
  return path;
}
