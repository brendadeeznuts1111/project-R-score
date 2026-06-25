#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager CLI — Fully TypeScript-Enabled Architecture
 * Zero-dependency, type-safe, autocomplete-ready with Bun.env Interface Merging
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ServeOptions } from "bun";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Bun.env Interface Merging (Global Type Augmentation)
// ═══════════════════════════════════════════════════════════════════════════════

declare module "bun" {
  interface Env {
    // ═══════════════════════════════════════════════════════════════════════════
    // FactoryWager Custom Environment Variables
    // ═══════════════════════════════════════════════════════════════════════════

    /** FactoryWager operating mode */
    FW_MODE: "development" | "production" | "testing" | "audit" | "demo";

    /** Logging level configuration */
    FW_LOG_LEVEL: "debug" | "info" | "warn" | "error";

    /** Active profile name */
    FW_PROFILE?: string;

    /** Default report format */
    FW_REPORT_FORMAT: "html" | "ansi" | "markdown" | "react";

    /** Reports output directory */
    FW_OUTPUT_DIR: string;

    /** Configuration directory */
    FW_CONFIG_DIR: string;

    /** Enable audit mode */
    FW_AUDIT_MODE: "true" | "false";

    /** Enable debug output */
    FW_DEBUG: "true" | "false";

    /** Extended configuration */
    FW_MAX_ROWS?: string; // Parsed as number
    FW_CONFIG_PATH?: string;
    FW_TIMEOUT?: string; // Parsed as number
    FW_RETRY_COUNT?: string; // Parsed as number
    FW_CACHE_SIZE?: string; // Parsed as number

    // ═══════════════════════════════════════════════════════════════════════════
    // Bun Native Configuration Variables (Official)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Disable SSL certificate validation (Node.js compat) */
    NODE_TLS_REJECT_UNAUTHORIZED?: "0" | "1";

    /** Verbose fetch logging (curl style) */
    BUN_CONFIG_VERBOSE_FETCH?: "curl" | "1";

    /** Runtime transpiler cache path */
    BUN_RUNTIME_TRANSPILER_CACHE_PATH?: string;

    /** Max concurrent HTTP requests */
    BUN_CONFIG_MAX_HTTP_REQUESTS?: string;

    /** Disable terminal clear on reload */
    BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD?: "true" | "false";

    /** Disable crash report uploads */
    DO_NOT_TRACK?: "1";

    /** Prepend CLI arguments */
    BUN_OPTIONS?: string;

    /** Temporary directory override */
    TMPDIR?: string;

    /** Force ANSI colors */
    FORCE_COLOR?: "1";

    /** Disable ANSI colors */
    NO_COLOR?: "1";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Type-Safe Environment Access
// ═══════════════════════════════════════════════════════════════════════════════

class FactoryWagerEnvManager {
  /**
   * Get string env var with type safety
   */
  static getString<K extends keyof Bun.Env>(key: K): Bun.Env[K] {
    return Bun.env[key];
  }

  /**
   * Get string env var with default fallback
   */
  static getStringOrDefault<K extends keyof Bun.Env>(
    key: K,
    defaultValue: NonNullable<Bun.Env[K]>
  ): NonNullable<Bun.Env[K]> {
    const value = Bun.env[key];
    return (value ?? defaultValue) as NonNullable<Bun.Env[K]>;
  }

  /**
   * Get number from env var
   */
  static getNumber<K extends keyof Bun.Env>(key: K): number | undefined {
    const value = Bun.env[key];
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Get number with default
   */
  static getNumberOrDefault<K extends keyof Bun.Env>(key: K, defaultValue: number): number {
    return this.getNumber(key) ?? defaultValue;
  }

  /**
   * Get boolean from env var
   */
  static getBoolean<K extends keyof Bun.Env>(key: K): boolean {
    const value = Bun.env[key];
    return value === "true" || value === "1" || value === "yes";
  }

  /**
   * Validate required FactoryWager env vars
   */
  static validateRequired(required: Array<keyof Bun.Env>): void {
    const missing = required.filter(key => Bun.env[key] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required FactoryWager environment variables: ${missing.join(", ")}`);
    }
  }

  /**
   * Load .env files with type safety
   */
  static async loadEnvFile(path: string): Promise<void> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      console.warn(`⚠️  FactoryWager env file not found: ${path}`);
      return;
    }

    const content = await file.text();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        (Bun.env as Record<string, string>)[key.trim()] = value;
      }
    }
  }

  /**
   * Get FactoryWager configuration with type safety
   */
  static getFactoryWagerConfig() {
    return {
      mode: this.getStringOrDefault("FW_MODE", "development"),
      logLevel: this.getStringOrDefault("FW_LOG_LEVEL", "info"),
      profile: this.getString("FW_PROFILE"),
      reportFormat: this.getStringOrDefault("FW_REPORT_FORMAT", "html"),
      outputDir: this.getStringOrDefault("FW_OUTPUT_DIR", "./reports"),
      configDir: this.getStringOrDefault("FW_CONFIG_DIR", "./config"),
      auditMode: this.getBoolean("FW_AUDIT_MODE"),
      debug: this.getBoolean("FW_DEBUG"),
      maxRows: this.getNumberOrDefault("FW_MAX_ROWS", 1000),
      configPath: this.getStringOrDefault("FW_CONFIG_PATH", "./config/report-config.toml"),
      timeout: this.getNumberOrDefault("FW_TIMEOUT", 30000),
      retryCount: this.getNumberOrDefault("FW_RETRY_COUNT", 3),
      cacheSize: this.getNumberOrDefault("FW_CACHE_SIZE", 100)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Runtime Configuration (Bun Native Env Vars)
// ═══════════════════════════════════════════════════════════════════════════════

interface BunRuntimeConfig {
  /** SSL certificate validation */
  tlsRejectUnauthorized: boolean;

  /** Verbose fetch logging mode */
  verboseFetch: "curl" | "basic" | "none";

  /** Transpiler cache configuration */
  transpilerCache: {
    enabled: boolean;
    path: string | null;
  };

  /** HTTP client settings */
  http: {
    maxConcurrentRequests: number;
  };

  /** Terminal behavior */
  terminal: {
    clearOnReload: boolean;
    forceColor: boolean;
    noColor: boolean;
  };

  /** Telemetry settings */
  telemetry: {
    enabled: boolean;
  };

  /** System integration */
  system: {
    tmpdir: string | null;
    bunOptions: string;
  };
}

class BunRuntimeConfigManager {
  static getConfig(): BunRuntimeConfig {
    return {
      tlsRejectUnauthorized: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",

      verboseFetch: Bun.env.BUN_CONFIG_VERBOSE_FETCH === "curl" ? "curl"
        : Bun.env.BUN_CONFIG_VERBOSE_FETCH === "1" ? "basic"
        : "none",

      transpilerCache: {
        enabled: Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH !== "0"
          && Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH !== "",
        path: Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH === "0"
          || Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH === ""
            ? null
            : Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH ?? null
      },

      http: {
        maxConcurrentRequests: FactoryWagerEnvManager.getNumberOrDefault(
          "BUN_CONFIG_MAX_HTTP_REQUESTS",
          256
        )
      },

      terminal: {
        clearOnReload: Bun.env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD !== "true",
        forceColor: Bun.env.FORCE_COLOR === "1",
        noColor: Bun.env.NO_COLOR === "1"
      },

      telemetry: {
        enabled: Bun.env.DO_NOT_TRACK !== "1"
      },

      system: {
        tmpdir: Bun.env.TMPDIR ?? null,
        bunOptions: Bun.env.BUN_OPTIONS ?? ""
      }
    };
  }

  static applyConfig(): void {
    const config = this.getConfig();

    // Apply HTTP agent settings
    if (config.http.maxConcurrentRequests !== 256) {
      console.info(`🔧 HTTP max requests: ${config.http.maxConcurrentRequests}`);
    }

    // Log configuration in debug mode
    if (FactoryWagerEnvManager.getBoolean("FW_DEBUG")) {
      console.info("🔧 Bun Runtime Config:", JSON.stringify(config, null, 2));
    }
  }

  static getSecurityWarnings(): string[] {
    const warnings: string[] = [];
    const config = this.getConfig();

    if (!config.tlsRejectUnauthorized) {
      warnings.push("🔒 SSL certificate validation is DISABLED - SECURITY RISK");
    }

    if (config.telemetry.enabled && FactoryWagerEnvManager.getString("FW_MODE") === "production") {
      warnings.push("📊 Telemetry enabled in production environment");
    }

    return warnings;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Type-Safe CLI Arguments
// ═══════════════════════════════════════════════════════════════════════════════

interface FactoryWagerCLIOptions {
  command: "profile" | "report" | "config" | "status" | "util" | "dev" | "prod" | "demo" | "serve";
  subcommand?: string;
  configPath: string;
  format: "html" | "ansi" | "markdown" | "react";
  debug: boolean;
  verbose: boolean;
  args: string[];
}

class FactoryWagerCLIParser {
  static parse(argv: string[]): FactoryWagerCLIOptions {
    const args = argv.slice(2);
    const command = (args[0] as FactoryWagerCLIOptions["command"]) || "help";

    // Parse flags
    const getFlag = (short: string, long: string, defaultValue: string): string => {
      const idx = args.findIndex(a => a === short || a === long);
      return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
    };

    const hasFlag = (short: string, long: string): boolean => {
      return args.includes(short) || args.includes(long);
    };

    return {
      command,
      subcommand: args[1],
      configPath: getFlag("-c", "--config", "./config/report-config.toml"),
      format: (getFlag("-f", "--format", "html") as FactoryWagerCLIOptions["format"]),
      debug: hasFlag("-d", "--debug"),
      verbose: hasFlag("-v", "--verbose"),
      args: args.slice(1)
    };
  }

  static validate(options: FactoryWagerCLIOptions): void {
    const validCommands: FactoryWagerCLIOptions["command"][] = ["profile", "report", "config", "status", "util", "dev", "prod", "demo", "serve"];
    if (!validCommands.includes(options.command)) {
      throw new Error(`Invalid command: ${options.command}. Valid: ${validCommands.join(", ")}`);
    }

    const validFormats: FactoryWagerCLIOptions["format"][] = ["html", "ansi", "markdown", "react"];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Valid: ${validFormats.join(", ")}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Type-Safe Server with Bun.serve
// ═══════════════════════════════════════════════════════════════════════════════

class FactoryWagerServer {
  private fwConfig: ReturnType<typeof FactoryWagerEnvManager.getFactoryWagerConfig>;
  private bunConfig: BunRuntimeConfig;

  constructor() {
    this.fwConfig = FactoryWagerEnvManager.getFactoryWagerConfig();
    this.bunConfig = BunRuntimeConfigManager.getConfig();
  }

  async start(port: number): Promise<void> {
    const server = Bun.serve({
      port,
      hostname: "0.0.0.0",

      fetch: async (req: Request): Promise<Response> => {
        const url = new URL(req.url);

        // Type-safe route handling
        switch (url.pathname) {
          case "/health":
            return this.healthCheck();

          case "/config":
            return this.getConfig();

          case "/env":
            return this.getEnvStatus();

          case "/status":
            return this.getSystemStatus();

          default:
            return new Response("FactoryWager API - Not Found", { status: 404 });
        }
      },

      // WebSocket support with typed messages
      websocket: {
        open: (ws) => {
          console.info(`🔌 FactoryWager WebSocket connected: ${ws.remoteAddress}`);
        },
        message: (ws, message: string | Buffer) => {
          // Handle typed messages
          if (typeof message === "string") {
            try {
              const data = JSON.parse(message);
              ws.send(JSON.stringify({
                type: "response",
                data: `FactoryWager echo: ${JSON.stringify(data)}`,
                timestamp: new Date().toISOString()
              }));
            } catch {
              ws.send(`FactoryWager echo: ${message}`);
            }
          }
        },
        close: (ws) => {
          console.info(`🔌 FactoryWager WebSocket disconnected: ${ws.remoteAddress}`);
        }
      },

      // Error handling
      error: (error: Error): Response => {
        console.error("FactoryWager server error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } as ServeOptions);

    console.info(`🏭 FactoryWager server running at http://localhost:${server.port}`);
    console.info(`🔧 Mode: ${this.fwConfig.mode} | Debug: ${this.fwConfig.debug}`);

    // Show security warnings
    const warnings = BunRuntimeConfigManager.getSecurityWarnings();
    if (warnings.length > 0) {
      console.info("⚠️  Security Warnings:");
      warnings.forEach(warning => console.info(`   ${warning}`));
    }
  }

  private healthCheck(): Response {
    return Response.json({
      status: "ok",
      service: "FactoryWager",
      version: "1.4.0-beta.20260201",
      bunVersion: Bun.version,
      timestamp: new Date().toISOString(),
      mode: this.fwConfig.mode,
      logLevel: this.fwConfig.logLevel
    });
  }

  private getConfig(): Response {
    return Response.json({
      factoryWager: this.fwConfig,
      bunRuntime: this.bunConfig,
      securityWarnings: BunRuntimeConfigManager.getSecurityWarnings()
    });
  }

  private getEnvStatus(): Response {
    return Response.json({
      factoryWager: {
        mode: FactoryWagerEnvManager.getString("FW_MODE"),
        logLevel: FactoryWagerEnvManager.getString("FW_LOG_LEVEL"),
        profile: FactoryWagerEnvManager.getString("FW_PROFILE"),
        reportFormat: FactoryWagerEnvManager.getString("FW_REPORT_FORMAT"),
        auditMode: FactoryWagerEnvManager.getBoolean("FW_AUDIT_MODE"),
        debug: FactoryWagerEnvManager.getBoolean("FW_DEBUG")
      },
      bun: {
        tlsRejectUnauthorized: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED,
        verboseFetch: Bun.env.BUN_CONFIG_VERBOSE_FETCH,
        maxHttpRequests: Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS,
        doNotTrack: Bun.env.DO_NOT_TRACK,
        forceColor: Bun.env.FORCE_COLOR,
        noColor: Bun.env.NO_COLOR
      }
    });
  }

  private getSystemStatus(): Response {
    return Response.json({
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: Bun.version,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      security: {
        warnings: BunRuntimeConfigManager.getSecurityWarnings(),
        sslValidation: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
        telemetry: Bun.env.DO_NOT_TRACK !== "1"
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Main CLI Execution
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  // Load environment files
  await FactoryWagerEnvManager.loadEnvFile(".env");
  await FactoryWagerEnvManager.loadEnvFile(`.env.${Bun.env.NODE_ENV || "development"}`);

  // Apply runtime configuration
  BunRuntimeConfigManager.applyConfig();

  // Parse CLI arguments
  const options = FactoryWagerCLIParser.parse(Bun.argv);
  FactoryWagerCLIParser.validate(options);

  // Set debug mode from CLI
  if (options.debug) {
    (Bun.env as Record<string, string>).FW_DEBUG = "true";
  }

  switch (options.command) {
    case "serve": {
      const server = new FactoryWagerServer();
      await server.start(parseInt(options.args.find(a => !a.startsWith('-')) || "3000", 10));
      break;
    }

    case "profile": {
      console.info(`👤 Profile management: ${options.subcommand || "list"}`);
      break;
    }

    case "report": {
      console.info(`📊 Report generation: ${options.subcommand || "html"} in ${options.format} format`);
      break;
    }

    case "config": {
      console.info(`⚙️ Configuration: ${options.subcommand || "show"}`);
      break;
    }

    case "status": {
      console.info(`📋 System status: ${options.subcommand || "overview"}`);
      break;
    }

    case "util": {
      console.info(`🔧 Utilities: ${options.subcommand || "version"}`);
      break;
    }

    case "dev": {
      console.info("🛠️ Development mode activated");
      (Bun.env as Record<string, string>).FW_MODE = "development";
      break;
    }

    case "prod": {
      console.info("🚀 Production mode activated");
      (Bun.env as Record<string, string>).FW_MODE = "production";
      break;
    }

    case "demo": {
      console.info("🎭 Demo mode activated");
      (Bun.env as Record<string, string>).FW_MODE = "demo";
      break;
    }

    default:
      console.info(`
╔══════════════════════════════════════════════════════════════╗
║     🏭 FactoryWager CLI — Type-Safe Bun Environment          ║
╠══════════════════════════════════════════════════════════════╣
║  Commands:                                                   ║
║    serve [PORT]           Start HTTP/WebSocket server        ║
║    profile [SUBCMD]       Profile management                 ║
║    report [SUBCMD]        Generate reports                   ║
║    config [SUBCMD]        Configuration management           ║
║    status [SUBCMD]        System status                      ║
║    util [SUBCMD]          Utilities                         ║
║    dev                    Switch to development mode         ║
║    prod                   Switch to production mode          ║
║    demo                   Switch to demo mode                ║
║                                                              ║
║  Options:                                                    ║
║    -c, --config PATH      Config file path                   ║
║    -f, --format FORMAT    Output format (html|ansi|markdown)║
║    -d, --debug            Enable debug logging               ║
║    -v, --verbose          Verbose output                    ║
║                                                              ║
║  Environment:                                                ║
║    FW_MODE                 development|production|testing     ║
║    FW_LOG_LEVEL            debug|info|warn|error             ║
║    FW_REPORT_FORMAT        html|ansi|markdown|react          ║
║    FW_DEBUG                Enable debug mode                  ║
║    NODE_TLS_REJECT_UNAUTHORIZED  SSL validation (0=disable)  ║
║    BUN_CONFIG_VERBOSE_FETCH      Network debugging          ║
╚══════════════════════════════════════════════════════════════╝
      `);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Type-Safe Execution
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(`❌ FactoryWager fatal error: ${error.message}`);
    process.exit(1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (for library usage)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  FactoryWagerEnvManager,
  BunRuntimeConfigManager,
  FactoryWagerCLIParser,
  FactoryWagerServer,
  type FactoryWagerCLIOptions,
  type BunRuntimeConfig
};
