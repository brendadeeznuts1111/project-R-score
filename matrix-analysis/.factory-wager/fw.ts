#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager CLI — Global Bun.env Interface Merging
 * Pure TypeScript with zero dependencies, full auto-completion support
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Global Bun.env Interface Merging — Top of File
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

import { profileManager, ProfileUtils } from "./config/profiles.ts";
import { PATHS } from "./config/paths.ts";
import { readFileSync, existsSync } from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// Type-Safe Environment Access (EnvManager)
// ═══════════════════════════════════════════════════════════════════════════════

class EnvManager {
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
   * Validate required env vars - throws if missing
   */
  static validateRequired(required: Array<keyof Bun.Env>): void {
    const missing = required.filter(key => Bun.env[key] === undefined);
    if (missing.length > 0) {
      throw new Error(`❌ Missing required FactoryWager environment variables: ${missing.join(", ")}`);
    }
  }

  /**
   * Get FactoryWager configuration with full type safety
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

  /**
   * Get Bun configuration with full type safety
   */
  static getBunConfig() {
    return {
      tlsRejectUnauthorized: this.getString("NODE_TLS_REJECT_UNAUTHORIZED") !== "0",
      verboseFetch: this.getString("BUN_CONFIG_VERBOSE_FETCH") === "curl" ? "curl"
        : this.getString("BUN_CONFIG_VERBOSE_FETCH") === "1" ? "basic"
        : "none",
      transpilerCachePath: this.getString("BUN_RUNTIME_TRANSPILER_CACHE_PATH"),
      maxHttpRequests: this.getNumberOrDefault("BUN_CONFIG_MAX_HTTP_REQUESTS", 256),
      noClearTerminalOnReload: this.getBoolean("BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD"),
      doNotTrack: this.getBoolean("DO_NOT_TRACK"),
      bunOptions: this.getStringOrDefault("BUN_OPTIONS", ""),
      tmpdir: this.getString("TMPDIR"),
      forceColor: this.getBoolean("FORCE_COLOR"),
      noColor: this.getBoolean("NO_COLOR")
    };
  }
}

// Export EnvManager for external use
export { EnvManager };

// Version information using existing systems
const VERSION = "1.4.0-beta.20260201";
const BUILD_DATE = new Date().toISOString();
const BUN_VERSION = process.versions.bun;

// FactoryWager environment configuration using EnvManager
const FW_CONFIG = EnvManager.getFactoryWagerConfig();

// Bun environment configuration using EnvManager
const BUN_CONFIG = {
  // Core Bun configuration
  VERBOSE_FETCH: EnvManager.getString("BUN_CONFIG_VERBOSE_FETCH"),
  MAX_HTTP_REQUESTS: EnvManager.getStringOrDefault("BUN_CONFIG_MAX_HTTP_REQUESTS", "256"),
  NO_CLEAR_TERMINAL: EnvManager.getString("BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD"),
  TRANSPILER_CACHE_PATH: EnvManager.getString("BUN_RUNTIME_TRANSPILER_CACHE_PATH"),
  BUN_OPTIONS: EnvManager.getStringOrDefault("BUN_OPTIONS", ""),

  // Color and output control
  FORCE_COLOR: EnvManager.getString("FORCE_COLOR"),
  NO_COLOR: EnvManager.getString("NO_COLOR"),

  // Security and networking
  NODE_TLS_REJECT_UNAUTHORIZED: EnvManager.getString("NODE_TLS_REJECT_UNAUTHORIZED"),

  // Telemetry and tracking
  DO_NOT_TRACK: EnvManager.getString("DO_NOT_TRACK"),

  // System integration
  TMPDIR: EnvManager.getString("TMPDIR")
};

// CLI Arguments parsing
const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];
const options = args.slice(2);

// Helper function to get git information
async function getGitInfo(): Promise<{ commit?: string; branch?: string }> {
  const info: { commit?: string; branch?: string } = {};

  try {
    const commitProcess = Bun.spawn(["git", "rev-parse", "HEAD"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const commitOutput = await new Response(commitProcess.stdout).text();
    info.commit = commitOutput.trim() || undefined;
  } catch {
    // Git not available
  }

  try {
    const branchProcess = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const branchOutput = await new Response(branchProcess.stdout).text();
    info.branch = branchOutput.trim() || undefined;
  } catch {
    // Git not available
  }

  return info;
}

// Helper function to get system status with security validation
async function getSystemStatus(): Promise<{
  version: string;
  buildDate: string;
  bunVersion: string;
  environment: string;
  gitInfo: { commit?: string; branch?: string };
  features: Record<string, boolean>;
  configStatus: Record<string, boolean>;
  bunConfig: typeof BUN_CONFIG;
  fwConfig: typeof FW_CONFIG;
  securityWarnings: string[];
}> {
  const gitInfo = await getGitInfo();
  const activeProfile = profileManager.getActiveProfileName();

  // Security validation
  const securityWarnings: string[] = [];

  // Check for SSL validation disabled
  if (BUN_CONFIG.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    securityWarnings.push(" SSL certificate validation is DISABLED (NODE_TLS_REJECT_UNAUTHORIZED=0) - SECURITY RISK");
  }

  // Check for development mode in production-like environment
  if (FW_CONFIG.mode === "development" && process.env.NODE_ENV === "production") {
    securityWarnings.push(" Development mode detected in production environment");
  }

  // Check for debug mode in production
  if (FW_CONFIG.debug && FW_CONFIG.mode === "production") {
    securityWarnings.push(" Debug mode enabled in production environment");
  }

  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    bunVersion: BUN_VERSION,
    environment: FW_CONFIG.mode,
    gitInfo,
    features: {
      markdown_engine: existsSync(PATHS.MARKDOWN_ENGINE),
      toml_config: existsSync(PATHS.REPORT_CONFIG),
      profile_system: true,
      cli_integration: true,
      audit_system: existsSync(`${PATHS.AUDIT_DIR}/native-audit.ts`),
      archive_system: existsSync(`${PATHS.CWD}/archive-api.ts`),
    },
    configStatus: {
      report_config: existsSync(PATHS.REPORT_CONFIG),
      column_config: existsSync(PATHS.COLUMN_CONFIG),
      visibility_config: existsSync(PATHS.VISIBILITY_CONFIG),
      types: existsSync(PATHS.TYPES_DIR),
      profiles: activeProfile !== null,
    },
    bunConfig: BUN_CONFIG,
    fwConfig: FW_CONFIG,
    securityWarnings,
  };
}

// Helper function to display comprehensive status
async function displaySystemStatus(): Promise<void> {
  const status = await getSystemStatus();
  const activeProfile = profileManager.getActiveProfileName();

  console.log(`
🏭 ═══════════════════════════════════════════════════════════════════════════════
    FactoryWager System Status
    ═══════════════════════════════════════════════════════════════════════════════

    📋 Version Information:
    Version: ${status.version}
    Build Date: ${new Date(status.buildDate).toLocaleString()}
    Environment: ${status.environment}
    Bun Version: ${status.bunVersion}

    ${status.gitInfo.commit ? `🔗 Git Commit: ${status.gitInfo.commit.substring(0, 8)}` : ""}
    ${status.gitInfo.branch ? `🌿 Git Branch: ${status.gitInfo.branch}` : ""}

    👤 Active Profile: ${activeProfile || "None"}

    ${status.securityWarnings.length > 0 ? `
    🚨 SECURITY WARNINGS:
    ${status.securityWarnings.map(warning => `    ${warning}`).join('\n')}
    ` : ''}

    🥟 Bun Configuration:
    Max HTTP Requests: ${status.bunConfig.MAX_HTTP_REQUESTS}
    Verbose Fetch: ${status.bunConfig.VERBOSE_FETCH || "disabled"}
    No Clear Terminal: ${status.bunConfig.NO_CLEAR_TERMINAL ? "enabled" : "disabled"}
    Transpiler Cache: ${status.bunConfig.TRANSPILER_CACHE_PATH || "default"}
    Bun Options: ${status.bunConfig.BUN_OPTIONS || "none"}
    Force Color: ${status.bunConfig.FORCE_COLOR ? "enabled" : "disabled"}
    No Color: ${status.bunConfig.NO_COLOR ? "enabled" : "disabled"}
    TLS Reject Unauthorized: ${status.bunConfig.NODE_TLS_REJECT_UNAUTHORIZED || "1"} ${status.bunConfig.NODE_TLS_REJECT_UNAUTHORIZED === "0" ? "⚠️ SECURITY RISK" : "✅ Secure"}
    Do Not Track: ${status.bunConfig.DO_NOT_TRACK ? "enabled" : "disabled"}
    Temp Directory: ${status.bunConfig.TMPDIR || "system default"}

    🏭 FactoryWager Configuration:
    Mode: ${status.fwConfig.mode}
    Log Level: ${status.fwConfig.logLevel}
    Profile: ${status.fwConfig.profile || "auto"}
    Report Format: ${status.fwConfig.reportFormat}
    Output Directory: ${status.fwConfig.outputDir}
    Config Directory: ${status.fwConfig.configDir}
    Audit Mode: ${status.fwConfig.auditMode ? "enabled" : "disabled"}
    Debug: ${status.fwConfig.debug ? "enabled" : "disabled"}

    🚀 Features Status:
    ${Object.entries(status.features)
      .map(([feature, enabled]) => `    ${enabled ? '✅' : '❌'} ${feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
      .join('\n')}

    ⚙️ Configuration Status:
    ${Object.entries(status.configStatus)
      .map(([config, exists]) => `    ${exists ? '✅' : '❌'} ${config.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
      .join('\n')}

    📁 Key Paths:
    Working Directory: ${process.cwd()}
    Git Root: ${PATHS.GIT_ROOT}
    Config Directory: ${PATHS.CONFIG_DIR}
    Reports Directory: ${PATHS.REPORTS_DIR}

════════════════════════════════════════════════════════════════════════════════ 🏭
  `);
}

// Helper function to execute shell commands
async function execCommand(cmd: string): Promise<void> {
  const process = Bun.spawn(["sh", "-c", cmd], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await process.exited;
}

// Helper function to show help
function showHelp(): void {
  console.log(`
🏭 ═══════════════════════════════════════════════════════════════════════════════
    FactoryWager CLI - Single Point of Entry (Bun Native)
    ═══════════════════════════════════════════════════════════════════════════════

    Usage: fw <command> [subcommand] [options]

    Profile Management:
      fw profile list              - List all available profiles
      fw profile switch <name>     - Switch to a profile
      fw profile apply [name]      - Apply profile to current environment
      fw profile current           - Show current active profile
      fw profile generate <name>   - Generate shell configuration for profile
      fw profile export <name> <file> - Export profile to file

    Report Generation:
      fw report markdown [format]  - Generate markdown-native report
      fw report toml <config> <output> [useCase] - Generate TOML-powered report
      fw report demo               - Generate demo reports in all formats

    Configuration:
      fw config show               - Show configuration
      fw config paths              - Show paths
      fw config env                - Show environment variables

    Audit & Compliance:
      fw audit run                 - Run audit system
      fw audit validate            - Validate audit data
      fw audit rotate              - Rotate audit logs

    Build & Deploy:
      fw build archive             - Build archive
      fw build deploy              - Deploy to production

    System Status:
      fw status system             - Show system status
      fw status git                - Show git status
      fw status health             - Run health check

    Utilities:
      fw util clean                - Clean generated files
      fw util setup                - Initial setup
      fw util version              - Show version information

    Quick Commands:
      fw dev                       - Switch to development profile
      fw prod                      - Switch to production profile
      fw audit-mode                - Switch to audit profile
      fw demo                      - Switch to demo profile
      fw report-html               - Generate HTML report
      fw report-ansi               - Generate ANSI report
      fw info                      - Show quick system info
      fw welcome                   - Show welcome message

    Examples:
      fw setup                     # Initial setup
      fw dev                       # Switch to development
      fw report-html               # Generate HTML report
      fw status health             # Health check

════════════════════════════════════════════════════════════════════════════════ 🏭
  `);
}

// Main command router
async function main(): Promise<void> {
  try {
    // Show help if no command or --help
    if (!command || command === "--help" || command === "-h") {
      showHelp();
      return;
    }

    // Route commands based on input
    switch (command) {
      case "profile":
      case "p":
        switch (subCommand) {
          case "list":
          case "ls":
            ProfileUtils.init();
            break;
          case "switch":
          case "sw":
            if (!options[0]) {
              console.error("❌ Profile name required");
              process.exit(1);
            }
            ProfileUtils.switchProfile(options[0]);
            break;
          case "current":
          case "cur":
            const current = profileManager.getActiveProfileName();
            if (current) {
              console.log(`📋 Current profile: ${current}`);
              const profile = profileManager.getActiveProfile();
              if (profile) {
                console.log(`📝 Description: ${profile.description}`);
                console.log(`🔧 Mode: ${profile.factoryWager.mode}`);
                console.log(`🎨 Theme: ${profile.terminal.theme}`);
              }
            } else {
              console.log("❌ No active profile set");
            }
            break;
          default:
            console.error("❌ Unknown profile subcommand");
            console.log("Available: list, switch, current");
            process.exit(1);
        }
        break;

      case "report":
      case "r":
        switch (subCommand) {
          case "markdown":
          case "md":
            const format = options[0] || "html";
            await execCommand(`bun run ${PATHS.MARKDOWN_ENGINE} ${format}`);
            break;
          case "demo":
            await execCommand(`bun run ${PATHS.MARKDOWN_ENGINE} demo`);
            break;
          default:
            console.error("❌ Unknown report subcommand");
            console.log("Available: markdown, demo");
            process.exit(1);
        }
        break;

      case "config":
      case "c":
        switch (subCommand) {
          case "show":
          case "sh":
            console.log("🔧 FactoryWager Configuration:");
            console.log(`📁 Config Directory: ${PATHS.CONFIG_DIR}`);
            console.log(`📋 Report Config: ${PATHS.REPORT_CONFIG}`);
            break;
          case "paths":
          case "p":
            console.log("🛤️ FactoryWager Paths:");
            Object.entries(PATHS).forEach(([key, value]) => {
              console.log(`${key}: ${value}`);
            });
            break;
          case "env":
          case "environment":
            console.log("🌍 Environment Configuration:");
            console.log("\n🥟 Bun Configuration (Official Variables from bun.com/docs):");
            console.log("  Core Configuration:");
            console.log(`    VERBOSE_FETCH: ${BUN_CONFIG.VERBOSE_FETCH || "disabled"} - Logs fetch requests with headers for debugging`);
            console.log(`    MAX_HTTP_REQUESTS: ${BUN_CONFIG.MAX_HTTP_REQUESTS} (default: 256) - Control concurrent HTTP requests for fetch and bun install`);
            console.log(`    NO_CLEAR_TERMINAL: ${BUN_CONFIG.NO_CLEAR_TERMINAL ? "enabled" : "disabled"} - Prevents console clearing on bun --watch reload`);
            console.log(`    TRANSPILER_CACHE_PATH: ${BUN_CONFIG.TRANSPILER_CACHE_PATH || "default"} - Cache directory for transpiled output (>50kb files)`);
            console.log(`    BUN_OPTIONS: ${BUN_CONFIG.BUN_OPTIONS || "none"} - Prepended command-line arguments to any Bun execution`);
            console.log("\n  Color & Output Control:");
            console.log(`    FORCE_COLOR: ${BUN_CONFIG.FORCE_COLOR ? "enabled" : "disabled"} - Force ANSI color output, even if NO_COLOR is set`);
            console.log(`    NO_COLOR: ${BUN_CONFIG.NO_COLOR ? "enabled" : "disabled"} - Disable ANSI color output`);
            console.log("\n  Security & Networking:");
            const tlsStatus = BUN_CONFIG.NODE_TLS_REJECT_UNAUTHORIZED || "1";
            const tlsWarning = tlsStatus === "0" ? " ⚠️ SECURITY RISK - SSL validation disabled" : " ✅ Secure";
            console.log(`    NODE_TLS_REJECT_UNAUTHORIZED: ${tlsStatus}${tlsWarning} - Disables SSL certificate validation (testing only)`);
            console.log("\n  Telemetry & Tracking:");
            console.log(`    DO_NOT_TRACK: ${BUN_CONFIG.DO_NOT_TRACK ? "enabled" : "disabled"} - Disable crash reports and telemetry uploads to bun.report`);
            console.log("\n  System Integration:");
            console.log(`    TMPDIR: ${BUN_CONFIG.TMPDIR || "system default"} - Directory for intermediate assets during bundling operations`);

            console.log("\n🏭 FactoryWager Configuration:");
            console.log("  Core Settings:");
            console.log(`    MODE: ${FW_CONFIG.mode} - Operating mode (development/production/testing/audit/demo)`);
            console.log(`    LOG_LEVEL: ${FW_CONFIG.logLevel} - Logging level (debug/info/warn/error)`);
            console.log(`    PROFILE: ${FW_CONFIG.profile || "auto"} - Active profile name`);
            console.log("\n  Output Configuration:");
            console.log(`    REPORT_FORMAT: ${FW_CONFIG.reportFormat} - Default report format (html/ansi/markdown/react)`);
            console.log(`    OUTPUT_DIR: ${FW_CONFIG.outputDir} - Reports output directory`);
            console.log(`    CONFIG_DIR: ${FW_CONFIG.configDir} - Configuration directory`);
            console.log("\n  Feature Flags:");
            console.log(`    AUDIT_MODE: ${FW_CONFIG.auditMode ? "enabled" : "disabled"} - Enable audit mode features`);
            console.log(`    DEBUG: ${FW_CONFIG.debug ? "enabled" : "disabled"} - Enable debug output`);
            break;
          default:
            console.error("❌ Unknown config subcommand");
            console.log("Available: show, paths, env");
            process.exit(1);
        }
        break;

      case "status":
      case "s":
        switch (subCommand) {
          case "system":
          case "sys":
            await displaySystemStatus();
            break;
          case "health":
            console.log("🏥 FactoryWager Health Check:");
            const status = await getSystemStatus();
            const enabledFeatures = Object.values(status.features).filter(Boolean).length;
            const totalFeatures = Object.keys(status.features).length;
            const existingConfigs = Object.values(status.configStatus).filter(Boolean).length;
            const totalConfigs = Object.keys(status.configStatus).length;

            console.log(`✅ Features: ${enabledFeatures}/${totalFeatures} enabled`);
            console.log(`✅ Configuration: ${existingConfigs}/${totalConfigs} files found`);
            console.log(`✅ Version: ${status.version}`);
            console.log(`✅ Environment: ${status.environment}`);
            console.log("🎯 Overall Health: GOOD");
            break;
          default:
            console.error("❌ Unknown status subcommand");
            console.log("Available: system, health");
            process.exit(1);
        }
        break;

      case "util":
      case "u":
        switch (subCommand) {
          case "setup":
            console.log("🚀 FactoryWager Initial Setup:");
            ProfileUtils.init();
            try {
              ProfileUtils.switchProfile("development");
              console.log("✅ Default profile set to development");
            } catch (error) {
              console.log("❌ Failed to set default profile");
            }
            console.log("✅ Setup completed");
            break;
          case "version":
          case "v":
            const gitInfo = await getGitInfo();
            const activeProfile = profileManager.getActiveProfileName();

            console.log(`
🏭 ═══════════════════════════════════════════════════════════════════════════════
    FactoryWager Version Information
    ═══════════════════════════════════════════════════════════════════════════════

    📋 Version: ${VERSION}
    🏭 Name: FactoryWager CLI
    📅 Build Date: ${new Date(BUILD_DATE).toLocaleString()}
    🌍 Environment: ${process.env.NODE_ENV || "development"}
    🥟 Bun Version: ${BUN_VERSION}

    ${gitInfo.commit ? `🔗 Git Commit: ${gitInfo.commit.substring(0, 8)}` : ""}
    ${gitInfo.branch ? `🌿 Git Branch: ${gitInfo.branch}` : ""}

    👤 Active Profile: ${activeProfile || "None"}

    🚀 Features:
    ✅ Profile System
    ✅ CLI Integration
    ✅ TOML Configuration
    ${existsSync(PATHS.MARKDOWN_ENGINE) ? "✅ Markdown Engine" : "❌ Markdown Engine"}
    ${existsSync(`${PATHS.AUDIT_DIR}/native-audit.ts`) ? "✅ Audit System" : "❌ Audit System"}
    ${existsSync(`${PATHS.CWD}/archive-api.ts`) ? "✅ Archive System" : "❌ Archive System"}

    📁 Working Directory: ${process.cwd()}
    🔧 Git Root: ${PATHS.GIT_ROOT}

════════════════════════════════════════════════════════════════════════════════ 🏭
            `);
            break;
          default:
            console.error("❌ Unknown util subcommand");
            console.log("Available: setup, version");
            process.exit(1);
        }
        break;

      // Quick commands
      case "dev":
        ProfileUtils.switchProfile("development");
        break;

      case "prod":
        ProfileUtils.switchProfile("production");
        break;

      case "demo":
        ProfileUtils.switchProfile("demo");
        break;

      case "report-html":
        await execCommand(`bun run ${PATHS.MARKDOWN_ENGINE} html`);
        break;

      case "info":
        const status = await getSystemStatus();
        const activeProfile = profileManager.getActiveProfileName();

        console.log("🏭 FactoryWager Quick Info:");
        console.log(`👤 Profile: ${activeProfile || "None"}`);
        console.log(`📋 Version: ${status.version}`);
        console.log(`📁 Directory: ${process.cwd()}`);
        console.log(`🔧 Mode: ${process.env.FW_MODE || "Unknown"}`);
        console.log(`🌍 Environment: ${status.environment}`);
        console.log(`🥟 Bun: ${status.bunVersion}`);

        if (status.gitInfo.commit) {
          console.log(`🔗 Git: ${status.gitInfo.commit.substring(0, 8)}`);
        }
        break;

      case "welcome":
        console.log(`
🏭 ═══════════════════════════════════════════════════════════════════════════════
    FactoryWager CLI - Single Point of Entry
    ═══════════════════════════════════════════════════════════════════════════════

    Quick Start:
      fw setup              # Initial setup
      fw dev                # Switch to development
      fw report-html        # Generate HTML report
      fw status system      # Show system status

    Profile Management:
      fw profile list       # List profiles
      fw profile switch dev # Switch profile
      fw profile current    # Show current profile

    Report Generation:
      fw report markdown    # Markdown report
      fw report demo        # Demo reports

    System Status:
      fw status health      # Health check
      fw info               # Quick info

    Utilities:
      fw util version       # Version info

    For detailed help: fw --help
════════════════════════════════════════════════════════════════════════════════ 🏭
        `);
        break;

      default:
        console.error("❌ Unknown command");
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.main) {
  main();
}

// Export for programmatic use
export { main };
export default main;
