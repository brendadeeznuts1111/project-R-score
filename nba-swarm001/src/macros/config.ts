/**
 * Configuration macros - Load and inline config at build time
 */

import type { SystemConfig } from "../types/config.js";

/**
 * Load configuration from file at build time
 */
export async function loadConfigMacro(
  configPath?: string
): Promise<Partial<SystemConfig>> {
  const defaultPath = configPath || "config/default.json";

  try {
    const file = Bun.file(defaultPath);
    if (await file.exists()) {
      return (await file.json()) as Partial<SystemConfig>;
    }
  } catch {
    // Ignore errors, return empty config
  }

  return {};
}

/**
 * Generate edge configuration constants at build time
 */
export async function getEdgeConfigMacro(): Promise<{
  minSimilarity: number;
  highSimilarity: number;
  minWeight: number;
}> {
  try {
    const file = Bun.file("config/default.json");
    if (await file.exists()) {
      const config = (await file.json()) as {
        edge?: {
          minSimilarityThreshold?: number;
          highSimilarityThreshold?: number;
          minWeightThreshold?: number;
        };
      };
      return {
        minSimilarity: config.edge?.minSimilarityThreshold || 0.3,
        highSimilarity: config.edge?.highSimilarityThreshold || 0.7,
        minWeight: config.edge?.minWeightThreshold || 0.8,
      };
    }
  } catch {
    // Ignore errors
  }

  return {
    minSimilarity: 0.3,
    highSimilarity: 0.7,
    minWeight: 0.8,
  };
}

