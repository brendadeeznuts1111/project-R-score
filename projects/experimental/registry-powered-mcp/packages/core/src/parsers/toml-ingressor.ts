/**
 * Native TOML Ingressor v2.4.1 - Hardened Baseline
 * Zero-Parser Fusion using Bun's compile-time import attributes
 *
 * Architecture:
 * - TOML parsed at module load time, not runtime
 * - Configuration fused into binary during `bun build --compile`
 * - Zero allocation, zero parsing overhead at runtime
 *
 * Powered by Bun's native TOML parser (C++ implementation)
 */

import registryConfigFused from "../../registry.toml" with { type: "toml" };

export interface RegistryConfig {
  lattice: {
    version: string;
    tier: string;
    runtime: string;
    global_pops: number;
    performance: {
      bundle_size_kb: number;
      p99_response_ms: number;
      cold_start_ms: number;
      search_acceleration: string;
    };
    security: {
      profile: string;
      rfc_compliance: number;
      cookie_partitioning: boolean;
      http_only: boolean;
    };
  };
  servers: Array<{
    name: string;
    description: string;
    protocol: string;
    transport: string;
    command?: string;
    args?: string[];
    endpoint?: string;
    enabled: boolean;
  }>;
  routes: Array<{
    pattern: string;
    target: string;
    method: string;
    description: string;
    enabled?: boolean;
  }>;
  edge: {
    failover_threshold_ms: number;
    avg_latency_target_ms: number;
    connection_pooling: string;
    keep_alive: boolean;
  };
  instrumentation: {
    logging_enabled: boolean;
    log_level: string;
    metrics_enabled: boolean;
    tracing_enabled: boolean;
    health_checks_enabled: boolean;
    logger: {
      format: string;
      timestamp: boolean;
      include_pid: boolean;
    };
    metrics: {
      provider: string;
      export_interval_ms: number;
      include_runtime: boolean;
    };
  };
}

export class RegistryLoader {
  /** Namespace accessor so callers can use RegistryLoader.YAML.parse() */
  static readonly YAML = RegistryLoader;

  /**
   * Load registry configuration with Zero-Parser Fusion
   *
   * Two modes:
   * 1. Production (standalone build): Uses compile-time fused config (0ms load time)
   * 2. Development: Falls back to runtime TOML parsing
   *
   * @param path - Path to registry.toml file (ignored in standalone builds)
   * @returns Parsed and validated registry configuration
   */
  static async parse(path: string = './registry.toml'): Promise<RegistryConfig> {
    try {
      let config: RegistryConfig;

      // Production mode: Use compile-time fused configuration
      // This is embedded in the binary during `bun build --compile`
      if (registryConfigFused && typeof registryConfigFused === 'object') {
        config = registryConfigFused as RegistryConfig;
      }
      // Development mode: Runtime TOML loading
      else {
        // Resolve to absolute path
        const resolvedPath = path.startsWith('/')
          ? path
          : `${process.cwd()}/${path}`;

        // Use Bun's native TOML parser - zero dependencies!
        // Import with file:// protocol and type: "toml" attribute
        const fileUrl = `file://${resolvedPath}`;
        const { default: loadedConfig } = await import(fileUrl, {
          with: { type: "toml" }
        }) as { default: RegistryConfig };

        config = loadedConfig;
      }

      // Validate the configuration
      this.validate(config);

      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load registry.toml: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get fused configuration directly (zero-allocation access)
   * Use this for performance-critical paths in standalone builds
   */
  static getFused(): RegistryConfig | null {
    if (registryConfigFused && typeof registryConfigFused === 'object') {
      return registryConfigFused as RegistryConfig;
    }
    return null;
  }

  /**
   * Validate the registry configuration structure
   */
  private static validate(config: any): asserts config is RegistryConfig {
    if (!config.lattice) {
      throw new Error('Missing [lattice] section in registry.toml');
    }

    if (!config.servers || !Array.isArray(config.servers)) {
      throw new Error('Missing or invalid [[servers]] section in registry.toml');
    }

    if (!config.routes || !Array.isArray(config.routes)) {
      throw new Error('Missing or invalid [[routes]] section in registry.toml');
    }

    // Validate lattice configuration
    const { lattice } = config;
    if (!lattice.version || !lattice.tier || !lattice.runtime) {
      throw new Error('Incomplete [lattice] configuration');
    }

    // Validate servers
    for (const server of config.servers) {
      if (!server.name || !server.transport) {
        throw new Error(`Invalid server configuration: ${JSON.stringify(server)}`);
      }

      if (server.transport === 'stdio' && (!server.command || !server.args)) {
        throw new Error(`Server "${server.name}" with stdio transport requires command and args`);
      }

      if (server.transport === 'sse' && !server.endpoint) {
        throw new Error(`Server "${server.name}" with SSE transport requires endpoint`);
      }
    }

    // Validate routes
    for (const route of config.routes) {
      if (!route.pattern || !route.target || !route.method) {
        throw new Error(`Invalid route configuration: ${JSON.stringify(route)}`);
      }

      // Ensure target server exists
      const targetExists = config.servers.some((s: RegistryConfig['servers'][0]) => s.name === route.target);
      if (!targetExists) {
        throw new Error(`Route "${route.pattern}" references non-existent server "${route.target}"`);
      }
    }
  }

  /**
   * Get enabled servers only
   */
  static getEnabledServers(config: RegistryConfig) {
    return config.servers.filter(s => s.enabled);
  }

  /**
   * Get enabled routes only
   */
  static getEnabledRoutes(config: RegistryConfig) {
    return config.routes.filter(r => r.enabled !== false);
  }
}
