#!/usr/bin/env bun
/**
 * Matrix Agent - AI Agent Management for Matrix Analysis Platform
 *
 * Migrated and integrated from clawdbot v2026.1.17-1
 * Part of nolarose-mcp-config project
 *
 * Features:
 * - Profile-aware agent management
 * - Telegram bot integration
 * - Tier-1380 CLI integration
 * - Health monitoring
 * - Skill management
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const MATRIX_DIR = join(homedir(), ".matrix");
const AGENT_DIR = join(MATRIX_DIR, "agent");
const CONFIG_FILE = join(AGENT_DIR, "config.json");
const LOGS_DIR = join(MATRIX_DIR, "logs");

interface AgentConfig {
  name: string;
  version: string;
  description: string;
  agents: {
    defaults: {
      model: { primary: string };
      models: Record<string, { alias: string }>;
      workspace: string;
    };
  };
  channels: {
    telegram: {
      enabled: boolean;
      [key: string]: unknown;
    };
  };
  gateway: {
    port: number;
    mode: string;
    bind: string;
  };
  integration: {
    profiles: { enabled: boolean; configPath: string };
    terminal: { enabled: boolean; bindingManager: string };
    tier1380: { enabled: boolean; cliPath: string };
    mcp: { enabled: boolean; configPath: string };
  };
  meta: {
    migratedFrom: string;
    migratedAt: string;
  };
}

interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

class MatrixAgent {
  private config: AgentConfig | null = null;

  async init(): Promise<void> {
    // Ensure directories exist
    if (!existsSync(MATRIX_DIR)) {
      mkdirSync(MATRIX_DIR, { recursive: true });
    }
    if (!existsSync(AGENT_DIR)) {
      mkdirSync(AGENT_DIR, { recursive: true });
    }
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Load config
    await this.loadConfig();

    console.log("✅ Matrix Agent initialized");
    console.log(`   Config: ${CONFIG_FILE}`);
    console.log(`   Logs: ${LOGS_DIR}`);
  }

  async loadConfig(): Promise<AgentConfig> {
    try {
      if (existsSync(CONFIG_FILE)) {
        const content = await Bun.file(CONFIG_FILE).text();
        this.config = JSON.parse(content);
      } else {
        // Create default config
        this.config = await this.createDefaultConfig();
      }
      return this.config!;
    } catch (error) {
      console.error("Failed to load config:", error);
      this.config = await this.createDefaultConfig();
      return this.config;
    }
  }

  async createDefaultConfig(): Promise<AgentConfig> {
    const defaultConfig: AgentConfig = {
      name: "matrix-agent",
      version: "1.0.0",
      description: "Matrix Analysis Platform - AI Agent Integration",
      agents: {
        defaults: {
          model: { primary: "openrouter/minimax/minimax-m2.1" },
          models: {
            "openrouter/auto": { alias: "auto" },
            "openrouter/minimax/minimax-m2.1": { alias: "mini" },
            "openrouter/anthropic/claude-sonnet-4": { alias: "sonnet" },
            "openrouter/anthropic/claude-opus-4": { alias: "opus" },
            "openrouter/openai/gpt-4o": { alias: "gpt" },
          },
          workspace: homedir(),
        },
      },
      channels: {
        telegram: {
          enabled: true,
        },
      },
      gateway: {
        port: 18789,
        mode: "local",
        bind: "loopback",
      },
      integration: {
        profiles: { enabled: true, configPath: "~/.matrix/profiles" },
        terminal: { enabled: true, bindingManager: ".claude/core/terminal" },
        tier1380: { enabled: true, cliPath: "cli/tier1380.ts" },
        mcp: { enabled: true, configPath: ".mcp.json" },
      },
      meta: {
        migratedFrom: "clawdbot",
        migratedAt: new Date().toISOString(),
      },
    };

    await Bun.write(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  async status(): Promise<void> {
    console.log("📊 Matrix Agent Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const config = await this.loadConfig();
    console.log(`Name: ${config.name}`);
    console.log(`Version: ${config.version}`);
    console.log(`Primary Model: ${config.agents.defaults.model.primary}`);
    console.log(`Workspace: ${config.agents.defaults.workspace}`);

    console.log("\n🔌 Integrations:");
    console.log(`  Profiles: ${config.integration.profiles.enabled ? "✅" : "❌"}`);
    console.log(`  Terminal: ${config.integration.terminal.enabled ? "✅" : "❌"}`);
    console.log(`  Tier-1380: ${config.integration.tier1380.enabled ? "✅" : "❌"}`);
    console.log(`  MCP: ${config.integration.mcp.enabled ? "✅" : "❌"}`);

    console.log("\n📡 Channels:");
    console.log(`  Telegram: ${config.channels.telegram.enabled ? "✅" : "❌"}`);

    console.log("\n🌐 Gateway:");
    console.log(`  Port: ${config.gateway.port}`);
    console.log(`  Mode: ${config.gateway.mode}`);
    console.log(`  Bind: ${config.gateway.bind}`);

    // Check legacy clawdbot
    const clawdbotDir = join(homedir(), ".clawdbot");
    if (existsSync(clawdbotDir)) {
      console.log("\n⚠️  Legacy clawdbot detected:");
      console.log(`   Path: ${clawdbotDir}`);
      console.log("   Run 'matrix-agent migrate' to fully migrate data");
    }
  }

  async migrate(): Promise<void> {
    console.log("🔄 Migrating from clawdbot...");

    const clawdbotDir = join(homedir(), ".clawdbot");
    if (!existsSync(clawdbotDir)) {
      console.log("No legacy clawdbot directory found. Nothing to migrate.");
      return;
    }

    const clawdbotConfig = join(clawdbotDir, "clawdbot.json");
    if (existsSync(clawdbotConfig)) {
      try {
        const legacy = await Bun.file(clawdbotConfig).json();

        // Migrate relevant settings
        const config = await this.loadConfig();
        config.agents.defaults.model = legacy.agents?.defaults?.model || config.agents.defaults.model;
        config.agents.defaults.models = legacy.agents?.defaults?.models || config.agents.defaults.models;
        config.channels.telegram = { ...config.channels.telegram, ...legacy.channels?.telegram };

        await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log("✅ Configuration migrated");
      } catch (error) {
        console.error("Failed to migrate config:", error);
      }
    }

    // Create migration marker
    const markerFile = join(MATRIX_DIR, ".migrated-from-clawdbot");
    await Bun.write(markerFile, JSON.stringify({
      migratedAt: new Date().toISOString(),
      fromVersion: "2026.1.17-1",
      toVersion: "1.0.0",
    }, null, 2));

    console.log("✅ Migration complete");
    console.log("   You can now safely remove ~/.clawdbot if desired");
  }

  async runProfileCommand(command: string, ...args: string[]): Promise<CommandResult> {
    const config = await this.loadConfig();
    if (!config.integration.profiles.enabled) {
      return { success: false, output: "", error: "Profile integration disabled" };
    }

    try {
      const result = await $`bun run matrix:profile:${command} ${args}`.quiet();
      return {
        success: result.exitCode === 0,
        output: result.stdout.toString(),
        error: result.stderr.toString(),
      };
    } catch (error) {
      return { success: false, output: "", error: String(error) };
    }
  }

  async runTier1380(...args: string[]): Promise<CommandResult> {
    const config = await this.loadConfig();
    if (!config.integration.tier1380.enabled) {
      return { success: false, output: "", error: "Tier-1380 integration disabled" };
    }

    try {
      const result = await $`bun run tier1380 -- ${args}`.quiet();
      return {
        success: result.exitCode === 0,
        output: result.stdout.toString(),
        error: result.stderr.toString(),
      };
    } catch (error) {
      return { success: false, output: "", error: String(error) };
    }
  }

  async healthCheck(): Promise<void> {
    console.log("🏥 Matrix Agent Health Check");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const checks = [
      { name: "Config file", check: () => existsSync(CONFIG_FILE) },
      { name: "Logs directory", check: () => existsSync(LOGS_DIR) },
      { name: "Project directory", check: () => existsSync(resolve("package.json")) },
      { name: "Bun runtime", check: () => typeof Bun !== "undefined" },
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, check } of checks) {
      const ok = check();
      console.log(`  ${ok ? "✅" : "❌"} ${name}`);
      if (ok) passed++; else failed++;
    }

    console.log(`\n${passed}/${checks.length} checks passed`);

    if (failed > 0) {
      process.exit(1);
    }
  }

  async showHelp(): Promise<void> {
    console.log(`
Matrix Agent - AI Agent Management for Matrix Analysis Platform

USAGE:
  matrix-agent <command> [options]

COMMANDS:
  init          Initialize matrix-agent configuration
  status        Show agent status and configuration
  migrate       Migrate from legacy clawdbot
  health        Run health checks
  profile       Run profile commands (list, use, show, diff, create)
  tier1380      Run Tier-1380 CLI commands
  help          Show this help message

EXAMPLES:
  matrix-agent init
  matrix-agent status
  matrix-agent migrate
  matrix-agent profile list
  matrix-agent tier1380 color init --team=omega --profile=prod

INTEGRATION:
  - Profiles: ~/.matrix/profiles
  - Terminal: .claude/core/terminal
  - Tier-1380: cli/tier1380.ts
  - MCP: .mcp.json

LEGACY:
  Migrated from clawdbot v2026.1.17-1
`);
  }
}

// CLI
async function main() {
  const agent = new MatrixAgent();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "init":
      await agent.init();
      break;
    case "status":
      await agent.status();
      break;
    case "migrate":
      await agent.migrate();
      break;
    case "health":
      await agent.healthCheck();
      break;
    case "profile":
      if (args.length === 0) {
        console.log("Usage: matrix-agent profile <command> [args]");
        console.log("Commands: list, use, show, diff, create");
        process.exit(1);
      }
      const result = await agent.runProfileCommand(args[0], ...args.slice(1));
      console.log(result.output);
      if (result.error) console.error(result.error);
      process.exit(result.success ? 0 : 1);
      break;
    case "tier1380":
    case "t1380":
      if (args.length === 0) {
        console.log("Usage: matrix-agent tier1380 <args>");
        process.exit(1);
      }
      const tresult = await agent.runTier1380(...args);
      console.log(tresult.output);
      if (tresult.error) console.error(tresult.error);
      process.exit(tresult.success ? 0 : 1);
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      await agent.showHelp();
      break;
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
