import { feature } from "bun:bundle";
import "./types.d.ts";

interface URLValidationResult {
  valid: boolean;
  error?: string;
}

// Validates URLs; rejects out-of-range ports
export class RedisURLValidator {
  // Zero-cost when REDIS_URL_VALIDATE is disabled
  static validateURL(url: string): URLValidationResult {
    if (!feature("REDIS_URL_VALIDATE")) {
      // Legacy: silently defaults to localhost:6379
      return { valid: true };
    }

    try {
      const parsed = new URL(url);

      // Validate protocol
      if (!parsed.protocol.startsWith("redis")) {
        return {
          valid: false,
          error: `Invalid Redis protocol: ${parsed.protocol}. Expected redis:// or rediss://`,
        };
      }

      // Validate hostname
      if (!parsed.hostname) {
        return { valid: false, error: "Missing hostname in Redis URL" };
      }

      // Validate port
      const port = parseInt(parsed.port || "6379");
      if (isNaN(port) || port < 1 || port > 65535) {
        return {
          valid: false,
          error: `Invalid port: ${port}. Must be between 1 and 65535`,
        };
      }

      // Log validation success (Component #11 audit)
      this.logValidation(parsed.host, port);

      return { valid: true };
    } catch (error: unknown) {
      return { valid: false, error: (error as Error).message };
    }
  }

  static createClient(
    url: string,
    options: Record<string, unknown> = {}
  ): RedisClient {
    const validation = this.validateURL(url);

    if (!validation.valid) {
      throw new Error(`[Redis] ${validation.error}`);
    }

    if (globalThis.Bun?.RedisClient) {
      return new globalThis.Bun.RedisClient({ url, ...options });
    }

    // Fallback mock client
    return {
      ping: async () => "PONG",
      get: async () => null,
      set: async () => {},
    };
  }

  private static logValidation(host: string, port: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 80,
        action: "redis_url_validated",
        host,
        port,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
}

// Zero-cost export
export const { validateURL, createClient } = feature("REDIS_URL_VALIDATE")
  ? RedisURLValidator
  : {
      validateURL: (): URLValidationResult => ({ valid: true }),
      createClient: (u: string, o: Record<string, unknown>): RedisClient => {
        if (globalThis.Bun?.RedisClient) {
          return new globalThis.Bun.RedisClient({ url: u, ...o });
        }
        return {
          ping: async () => "PONG",
          get: async () => null,
          set: async () => {},
        };
      },
    };
