// API Integration - Configuration
//
// Loads API credentials from environment variables
// Defaults from Sports Config.md

import type { ApiConfig } from "./types";

export const DEFAULT_CONFIG: ApiConfig = {
  sportradar: {
    url: "wss://api.sportradar.com",
    apiKey: "",
    sports: ["NBA", "WNBA"],
  },
  odds: {
    url: "https://api.odds.com",
    apiKey: "",
  },
};

export function loadConfig(): ApiConfig {
  return {
    sportradar: {
      url: Bun.env.SPORTRADAR_URL || DEFAULT_CONFIG.sportradar.url,
      apiKey: Bun.env.SPORTRADAR_API_KEY || "",
      sports: Bun.env.SPORTRADAR_SPORTS?.split(",") || DEFAULT_CONFIG.sportradar.sports,
    },
    odds: {
      url: Bun.env.ODDS_URL || DEFAULT_CONFIG.odds.url,
      apiKey: Bun.env.ODDS_API_KEY || "",
    },
  };
}

export function validateConfig(config: ApiConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Sportradar config
  if (!config.sportradar.url) {
    errors.push("Missing sportradar.url");
  } else if (!isValidUrl(config.sportradar.url, ["ws:", "wss:"])) {
    errors.push("Invalid sportradar.url: must be ws:// or wss://");
  }

  if (!config.sportradar.apiKey) {
    errors.push("Missing sportradar.apiKey");
  }

  if (!config.sportradar.sports || config.sportradar.sports.length === 0) {
    errors.push("Missing sportradar.sports");
  }

  // Validate Odds config
  if (!config.odds.url) {
    errors.push("Missing odds.url");
  } else if (!isValidUrl(config.odds.url, ["http:", "https:"])) {
    errors.push("Invalid odds.url: must be http:// or https://");
  }

  if (!config.odds.apiKey) {
    errors.push("Missing odds.apiKey");
  }

  return { valid: errors.length === 0, errors };
}

function isValidUrl(urlStr: string, protocols: string[]): boolean {
  try {
    const url = new URL(urlStr);
    return protocols.includes(url.protocol);
  } catch {
    return false;
  }
}
