#!/usr/bin/env bun
/**
 * Zsh Bridge Connector
 * 
 * Integrates unified-shell-bridge with MoonshotAI's official zsh-kimi-cli plugin
 * Provides seamless bidirectional communication between Zsh and MCP server
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  zshPluginDir: join(homedir(), ".oh-my-zsh", "custom", "plugins", "kimi-cli"),
  zshPluginDirAlt: join(homedir(), ".zsh", "kimi-cli"),
  bridgeSocketPath: join(homedir(), ".kimi", "bridge.sock"),
  stateFile: join(homedir(), ".kimi", "bridge-state.json"),
  heartbeatIntervalMs: 5000,
};

// ============================================================================
// Types
// ============================================================================

interface ZshBridgeState {
  isConnected: boolean;
  lastHeartbeat: number;
  activeProfile?: string;
  activeDirectory?: string;
  commandHistory: string[];
}

interface ZshCommand {
  id: string;
  command: string;
  workingDir: string;
  timestamp: number;
}

interface ZshEvent {
  type: "command" | "profile_switch" | "directory_change" | "heartbeat";
  data: unknown;
  timestamp: number;
}

// ============================================================================
// State Management
// ============================================================================

class ZshBridgeStateManager {
  private state: ZshBridgeState = {
    isConnected: false,
    lastHeartbeat: 0,
    commandHistory: [],
  };

  async load(): Promise<void> {
    try {
      if (existsSync(CONFIG.stateFile)) {
        const data = await Bun.file(CONFIG.stateFile).json();
        this.state = { ...this.state, ...data };
      }
    } catch {
      // Ignore load errors
    }
  }

  async save(): Promise<void> {
    try {
      await Bun.write(CONFIG.stateFile, JSON.stringify(this.state, null, 2));
    } catch {
      // Ignore save errors
    }
  }

  update(updates: Partial<ZshBridgeState>): void {
    this.state = { ...this.state, ...updates };
    this.save();
  }

  get(): ZshBridgeState {
    return { ...this.state };
  }

  addToHistory(command: string): void {
    this.state.commandHistory.unshift(command);
    if (this.state.commandHistory.length > 100) {
      this.state.commandHistory = this.state.commandHistory.slice(0, 100);
    }
    this.save();
  }
}

// ============================================================================
// Zsh Plugin Detector
// ============================================================================

class ZshPluginDetector {
  async detect(): Promise<{ installed: boolean; path?: string; method?: string }> {
    // Check Oh My Zsh
    if (existsSync(CONFIG.zshPluginDir)) {
      return { installed: true, path: CONFIG.zshPluginDir, method: "oh-my-zsh" };
    }

    // Check manual install
    if (existsSync(CONFIG.zshPluginDirAlt)) {
      return { installed: true, path: CONFIG.zshPluginDirAlt, method: "manual" };
    }

    // Check Zinit (common locations)
    const zinitDir = join(homedir(), ".local", "share", "zinit", "plugins");
    if (existsSync(zinitDir)) {
      const entries = await Array.fromAsync(Bun.file(zinitDir).stream());
      // Simplified check - in production would scan directories
    }

    return { installed: false };
  }

  async getVersion(pluginPath: string): Promise<string | undefined> {
    try {
      const gitDir = join(pluginPath, ".git");
      if (existsSync(gitDir)) {
        const result = await $`cd ${pluginPath} && git describe --tags --always`.nothrow();
        return result.stdout.toString().trim();
      }
    } catch {
      // Ignore
    }
    return undefined;
  }
}

// ============================================================================
// Zsh Bridge Connector
// ============================================================================

export class ZshBridgeConnector {
  private stateManager = new ZshBridgeStateManager();
  private detector = new ZshPluginDetector();
  private heartbeatInterval?: Timer;

  async initialize(): Promise<void> {
    await this.stateManager.load();
    
    const plugin = await this.detector.detect();
    if (!plugin.installed) {
      console.log("⚠️  Official zsh-kimi-cli plugin not detected");
      console.log("   Install: git clone https://github.com/MoonshotAI/zsh-kimi-cli.git");
      return;
    }

    console.log(`✅ Zsh plugin detected (${plugin.method})`);
    if (plugin.path) {
      const version = await this.detector.getVersion(plugin.path);
      if (version) {
        console.log(`   Version: ${version}`);
      }
    }

    this.stateManager.update({ isConnected: true });
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.stateManager.update({ lastHeartbeat: Date.now() });
    }, CONFIG.heartbeatIntervalMs);
  }

  async handleZshEvent(event: ZshEvent): Promise<void> {
    switch (event.type) {
      case "command": {
        const cmd = event.data as ZshCommand;
        this.stateManager.addToHistory(cmd.command);
        
        // Sync with unified bridge
        await this.syncCommandToBridge(cmd);
        break;
      }
      
      case "profile_switch": {
        const profile = event.data as string;
        this.stateManager.update({ activeProfile: profile });
        console.log(`🔄 Profile switched: ${profile}`);
        break;
      }
      
      case "directory_change": {
        const dir = event.data as string;
        this.stateManager.update({ activeDirectory: dir });
        break;
      }
      
      case "heartbeat": {
        this.stateManager.update({ lastHeartbeat: Date.now() });
        break;
      }
    }
  }

  private async syncCommandToBridge(cmd: ZshCommand): Promise<void> {
    // Send to unified bridge via IPC or file
    try {
      const bridgeInput = join(homedir(), ".kimi", "bridge-input.jsonl");
      const line = JSON.stringify({
        type: "zsh_command",
        data: cmd,
        timestamp: Date.now(),
      });
      await Bun.write(bridgeInput, line + "\n", { append: true });
    } catch {
      // Ignore sync errors
    }
  }

  async getContextForMcp(): Promise<{
    workingDir: string;
    activeProfile?: string;
    recentCommands: string[];
  }> {
    const state = this.stateManager.get();
    return {
      workingDir: state.activeDirectory || process.cwd(),
      activeProfile: state.activeProfile,
      recentCommands: state.commandHistory.slice(0, 10),
    };
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.stateManager.update({ isConnected: false });
  }
}

// ============================================================================
// Enhanced MCP Tools with Zsh Context
// ============================================================================

export async function handleZshEnhancedToolCall(
  name: string,
  args: Record<string, unknown>,
  connector: ZshBridgeConnector
): Promise<object> {
  const context = await connector.getContextForMcp();

  switch (name) {
    case "zsh_context": {
      return {
        workingDir: context.workingDir,
        activeProfile: context.activeProfile,
        recentCommands: context.recentCommands,
        timestamp: Date.now(),
      };
    }

    case "zsh_execute_with_context": {
      const command = args.command as string;
      
      // Prepend cd if different directory
      const finalCommand = context.workingDir !== process.cwd()
        ? `cd ${context.workingDir} && ${command}`
        : command;
      
      // Execute with profile context
      const env: Record<string, string> = {};
      if (context.activeProfile) {
        env.MATRIX_ACTIVE_PROFILE = context.activeProfile;
      }

      const result = await $`${{ raw: finalCommand }}`.env(env).nothrow();
      
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode,
        workingDir: context.workingDir,
        profile: context.activeProfile,
      };
    }

    case "zsh_suggest_command": {
      const partial = args.partial as string;
      const suggestions = context.recentCommands
        .filter(cmd => cmd.startsWith(partial))
        .slice(0, 5);
      
      return {
        partial,
        suggestions,
        basedOnHistory: true,
      };
    }

    default:
      return { error: `Unknown Zsh tool: ${name}` };
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  console.log("🔗 Zsh Bridge Connector");
  console.log("======================\n");

  const connector = new ZshBridgeConnector();
  await connector.initialize();

  // Keep alive
  process.on("SIGINT", async () => {
    await connector.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await connector.shutdown();
    process.exit(0);
  });

  // Simulate some activity
  setInterval(async () => {
    const context = await connector.getContextForMcp();
    if (context.activeProfile) {
      console.log(`💓 Heartbeat | Profile: ${context.activeProfile} | Dir: ${context.workingDir}`);
    }
  }, 10000);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { ZshBridgeStateManager, ZshPluginDetector };
