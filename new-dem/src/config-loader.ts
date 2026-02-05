#!/usr/bin/env bun

// Bun YAML Configuration Loader
// Loads and merges configuration from bun.yaml with environment overrides

import { readFileSync } from "fs";

interface BunConfig {
  runtime?: {
    experimental?: boolean;
  };
  http?: {
    headers?: Record<string, string>;
    security?: {
      csrf?: boolean;
      hsts?: boolean;
      csp?: string;
    };
  };
  networking?: {
    dns?: {
      prefetch?: boolean;
      cache_ttl?: number;
      hosts?: string[];
    };
    connection_pool?: {
      max_sockets?: number;
      keep_alive?: boolean;
      keep_alive_timeout?: number;
    };
  };
  cookies?: {
    defaults?: {
      http_only?: boolean;
      secure?: boolean;
      same_site?: string;
      max_age?: number;
    };
    session?: {
      name?: string;
      path?: string;
      domain?: string;
    };
    csrf?: {
      name?: string;
      path?: string;
      http_only?: boolean;
    };
  };
  monitoring?: {
    enabled?: boolean;
    endpoints?: Record<string, string>;
    thresholds?: Record<string, number>;
  };
  logging?: {
    level?: string;
    format?: string;
    outputs?: string[];
  };
  features?: Record<string, boolean>;
  [key: string]: any;
}

class BunConfigLoader {
  private config: BunConfig = {};
  private isLoaded = false;

  async load(): Promise<BunConfig> {
    if (this.isLoaded) return this.config;

    try {
      // Try to load bun.yaml (not implemented - using defaults)
      console.warn("YAML config loading not implemented, using defaults");
      this.config = this.getDefaults();
    } catch (error) {
      console.warn("Config loading failed, using defaults");
      this.config = this.getDefaults();
    }

    // Apply environment-specific overrides
    this.applyEnvironmentOverrides();

    this.isLoaded = true;
    return this.config;
  }

  private getDefaults(): BunConfig {
    return {
      runtime: {
        experimental: false
      },
      http: {
        headers: {
          "X-Powered-By": "T3-Lattice-Registry/3.3",
          "X-Content-Type-Options": "nosniff"
        },
        security: {
          csrf: false,
          hsts: false
        }
      },
      networking: {
        dns: {
          prefetch: true,
          cache_ttl: 300000,
          hosts: ["registry.npmjs.org", "api.github.com"]
        },
        connection_pool: {
          max_sockets: 256,
          keep_alive: true,
          keep_alive_timeout: 30000
        }
      },
      cookies: {
        defaults: {
          http_only: true,
          secure: process.env.NODE_ENV === "production",
          same_site: "strict",
          max_age: 86400
        },
        session: {
          name: "t3_session",
          path: "/",
          domain: "localhost"
        },
        csrf: {
          name: "t3_csrf",
          path: "/",
          http_only: false
        }
      },
      monitoring: {
        enabled: true,
        endpoints: {
          health: "/health",
          metrics: "/api/metrics"
        }
      },
      features: {
        enterprise: true,
        websocket: true,
        dns_prefetch: true
      }
    };
  }

  private applyEnvironmentOverrides(): void {
    const env = process.env.NODE_ENV || "development";

    // Apply environment-specific overrides
    if (this.config[env]) {
      this.deepMerge(this.config, this.config[env]);
    }

    // Apply runtime environment variables
    if (process.env.LATTICE_CSRF_ENABLED) {
      this.config.http!.security!.csrf = process.env.LATTICE_CSRF_ENABLED === "true";
    }

    if (process.env.LATTICE_MAX_SOCKETS) {
      this.config.networking!.connection_pool!.max_sockets = parseInt(process.env.LATTICE_MAX_SOCKETS);
    }
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  getConfig(): BunConfig {
    return this.config;
  }

  getHttpHeaders(): Record<string, string> {
    return {
      ...this.config.http?.headers,
      ...(this.config.http?.security?.csrf ? { "X-CSRF-Protection": "1" } : {}),
      ...(this.config.http?.security?.hsts ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
      ...(this.config.http?.security?.csp ? { "Content-Security-Policy": this.config.http.security.csp } : {})
    };
  }

  getCookieDefaults(): NonNullable<BunConfig['cookies']['defaults']> {
    return this.config.cookies?.defaults || {
      http_only: true,
      secure: true,
      same_site: "strict",
      max_age: 86400
    };
  }

  isFeatureEnabled(feature: string): boolean {
    return this.config.features?.[feature] ?? false;
  }
}

// Global config instance
export const bunConfig = new BunConfigLoader();

// Export types
export type { BunConfig };
export default bunConfig;