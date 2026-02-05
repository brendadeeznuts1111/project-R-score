#!/usr/bin/env bun
/**
 * Matrix Agent ↔ OpenClaw Bridge
 * Bidirectional integration between Matrix Agent and OpenClaw ACP
 * 
 * New Features:
 * - Telegram reactions and inline buttons
 * - Sticker support
 * - Enhanced message actions
 * - ACP client for OpenClaw communication
 * - Event forwarding between systems
 * - Command proxy for cross-system execution
 * - Session synchronization
 */

import { $ } from "bun";
import { join } from "path";
import { homedir } from "os";

const OPENCLAW_DIR = join(homedir(), "openclaw");
const OPENCLAW_DIST = join(OPENCLAW_DIR, "dist");
const MATRIX_DIR = join(homedir(), ".matrix");

interface ACPMessage {
  id: string;
  type: "command" | "event" | "query" | "response";
  source: "matrix" | "openclaw";
  target?: string;
  payload: unknown;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface ACPCommand {
  name: string;
  args: string[];
  options?: Record<string, unknown>;
}

interface TelegramAction {
  action: "send" | "edit" | "delete" | "react" | "sendSticker";
  accountId?: string;
  chatId: string | number;
  messageId?: number;
  text?: string;
  reaction?: string;
  sticker?: string;
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface BridgeConfig {
  openclaw: {
    enabled: boolean;
    acpEndpoint: string;
    gatewayPort: number;
  };
  matrix: {
    enabled: boolean;
    agentSocket: string;
  };
  sync: {
    sessions: boolean;
    commands: boolean;
    events: boolean;
  };
  telegram: {
    enabled: boolean;
    reactionLevel: "none" | "minimal" | "extensive";
    allowStickers: boolean;
    allowButtons: boolean;
  };
}

class OpenClawBridge {
  private config: BridgeConfig;
  private connected = false;
  private messageQueue: ACPMessage[] = [];

  constructor(config?: Partial<BridgeConfig>) {
    this.config = {
      openclaw: {
        enabled: true,
        acpEndpoint: "http://localhost:18790/acp",
        gatewayPort: 18790,
        ...config?.openclaw,
      },
      matrix: {
        enabled: true,
        agentSocket: join(MATRIX_DIR, "agent.sock"),
        ...config?.matrix,
      },
      sync: {
        sessions: true,
        commands: true,
        events: true,
        ...config?.sync,
      },
      telegram: {
        enabled: true,
        reactionLevel: "minimal",
        allowStickers: true,
        allowButtons: true,
        ...config?.telegram,
      },
    };
  }

  /**
   * Initialize the bridge
   */
  async init(): Promise<void> {
    console.log("🌉 Initializing Matrix ↔ OpenClaw Bridge");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check OpenClaw installation
    const openclawExists = await this.checkOpenClaw();
    if (!openclawExists) {
      console.log("⚠️  OpenClaw not found at ~/openclaw");
      console.log("   Bridge will operate in Matrix-only mode");
    } else {
      console.log("✅ OpenClaw detected");
    }

    // Check Matrix Agent
    const matrixExists = await this.checkMatrix();
    if (!matrixExists) {
      throw new Error("Matrix Agent not initialized. Run 'matrix-agent init' first");
    }
    console.log("✅ Matrix Agent detected");

    // Check Telegram features
    if (this.config.telegram.enabled) {
      console.log("✅ Telegram features enabled");
      console.log(`   Reaction level: ${this.config.telegram.reactionLevel}`);
      console.log(`   Stickers: ${this.config.telegram.allowStickers ? "✓" : "✗"}`);
      console.log(`   Buttons: ${this.config.telegram.allowButtons ? "✓" : "✗"}`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.connected = openclawExists && matrixExists;
  }

  /**
   * Check if OpenClaw is installed
   */
  private async checkOpenClaw(): Promise<boolean> {
    try {
      await $`test -d ${OPENCLAW_DIR}`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Matrix Agent is initialized
   */
  private async checkMatrix(): Promise<boolean> {
    try {
      await $`test -d ${MATRIX_DIR}`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send ACP message to OpenClaw
   */
  async sendToOpenClaw(message: ACPMessage): Promise<ACPMessage | null> {
    if (!this.connected) {
      console.error("❌ Bridge not connected");
      return null;
    }

    try {
      const response = await fetch(this.config.openclaw.acpEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json() as ACPMessage;
    } catch (error) {
      console.error("❌ Failed to send ACP message:", error);
      return null;
    }
  }

  /**
   * Execute command via OpenClaw CLI
   */
  async executeCommand(command: string, args: string[] = []): Promise<{
    success: boolean;
    output: string;
    exitCode: number;
  }> {
    try {
      const result = await $`cd ${OPENCLAW_DIR} && bun run cli ${command} ${args}`.nothrow();
      return {
        success: result.exitCode === 0,
        output: result.stdout.toString() + result.stderr.toString(),
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        output: String(error),
        exitCode: 1,
      };
    }
  }

  /**
   * Execute Telegram action via OpenClaw
   */
  async executeTelegramAction(action: TelegramAction): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    if (!this.config.telegram.enabled) {
      return { success: false, error: "Telegram features disabled" };
    }

    try {
      // Validate action
      if (action.action === "react" && this.config.telegram.reactionLevel === "none") {
        return { success: false, error: "Telegram reactions disabled" };
      }

      if (action.action === "sendSticker" && !this.config.telegram.allowStickers) {
        return { success: false, error: "Telegram stickers disabled" };
      }

      if (action.buttons && !this.config.telegram.allowButtons) {
        return { success: false, error: "Telegram buttons disabled" };
      }

      // Build ACP message for Telegram action
      const message: ACPMessage = {
        id: crypto.randomUUID(),
        type: "command",
        source: "matrix",
        target: "telegram",
        payload: {
          tool: "telegram",
          params: {
            action: action.action,
            accountId: action.accountId,
            chatId: action.chatId,
            messageId: action.messageId,
            text: action.text,
            reaction: action.reaction,
            sticker: action.sticker,
            buttons: action.buttons,
            parseMode: action.parseMode,
          },
        },
        timestamp: new Date().toISOString(),
      };

      const response = await this.sendToOpenClaw(message);
      
      if (!response) {
        return { success: false, error: "No response from OpenClaw" };
      }

      return {
        success: true,
        result: response.payload,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Send Telegram message
   */
  async sendTelegramMessage(
    chatId: string | number,
    text: string,
    options?: {
      accountId?: string;
      buttons?: Array<Array<{ text: string; callback_data: string }>>;
      parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    }
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const result = await this.executeTelegramAction({
      action: "send",
      chatId,
      text,
      ...options,
    });

    if (result.success) {
      const payload = result.result as { messageId?: number };
      return { success: true, messageId: payload?.messageId };
    }

    return { success: false, error: result.error };
  }

  /**
   * React to Telegram message
   */
  async reactToTelegramMessage(
    chatId: string | number,
    messageId: number,
    reaction: string,
    accountId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeTelegramAction({
      action: "react",
      chatId,
      messageId,
      reaction,
      accountId,
    });

    return result;
  }

  /**
   * Send Telegram sticker
   */
  async sendTelegramSticker(
    chatId: string | number,
    sticker: string,
    accountId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeTelegramAction({
      action: "sendSticker",
      chatId,
      sticker,
      accountId,
    });

    return result;
  }

  /**
   * Get OpenClaw status
   */
  async getStatus(): Promise<{
    connected: boolean;
    openclaw: {
      installed: boolean;
      version?: string;
      gatewayRunning: boolean;
    };
    matrix: {
      initialized: boolean;
      activeProfile?: string;
    };
    telegram: {
      enabled: boolean;
      accounts: number;
    };
  }> {
    const status = {
      connected: this.connected,
      openclaw: {
        installed: await this.checkOpenClaw(),
        gatewayRunning: false,
      },
      matrix: {
        initialized: await this.checkMatrix(),
      },
      telegram: {
        enabled: this.config.telegram.enabled,
        accounts: 0,
      },
    };

    // Check gateway status
    if (status.openclaw.installed) {
      try {
        const result = await $`cd ${OPENCLAW_DIR} && bun run cli gateway status`.nothrow();
        status.openclaw.gatewayRunning = result.exitCode === 0 && 
          result.stdout.toString().includes("running");
      } catch {
        // Gateway not running
      }
    }

    return status;
  }

  /**
   * Sync sessions between Matrix and OpenClaw
   */
  async syncSessions(): Promise<void> {
    if (!this.config.sync.sessions) {
      console.log("ℹ️  Session sync disabled");
      return;
    }

    console.log("🔄 Syncing sessions...");
    
    // Get Matrix sessions
    const matrixSessions = await $`ls ${MATRIX_DIR}/sessions 2>/dev/null || echo ""`.quiet();
    
    // Get OpenClaw sessions  
    const openclawResult = await this.executeCommand("sessions", ["list"]);
    
    console.log(`   Matrix sessions: ${matrixSessions.stdout.toString().trim().split("\n").filter(Boolean).length}`);
    console.log(`   OpenClaw sessions: ${openclawResult.success ? "synced" : "unavailable"}`);
  }
}

// CLI
async function main() {
  const args = Bun.argv.slice(2);
  const command = args[0];
  const bridge = new OpenClawBridge();

  switch (command) {
    case "init":
      await bridge.init();
      break;

    case "status": {
      await bridge.init();
      const status = await bridge.getStatus();
      console.log("\n📊 Bridge Status:");
      console.log(`   Connected: ${status.connected ? "✅" : "❌"}`);
      console.log(`   OpenClaw: ${status.openclaw.installed ? "✅" : "❌"} ${status.openclaw.gatewayRunning ? "(running)" : "(stopped)"}`);
      console.log(`   Matrix: ${status.matrix.initialized ? "✅" : "❌"}`);
      console.log(`   Telegram: ${status.telegram.enabled ? "✅" : "❌"} (${status.telegram.accounts} accounts)`);
      break;
    }

    case "telegram": {
      await bridge.init();
      const subCommand = args[1];
      
      switch (subCommand) {
        case "send": {
          const chatId = args[2];
          const text = args.slice(3).join(" ");
          if (!chatId || !text) {
            console.error("Usage: bridge.ts telegram send <chatId> <text>");
            process.exit(1);
          }
          const result = await bridge.sendTelegramMessage(chatId, text);
          console.log(result.success ? "✅ Message sent" : `❌ Error: ${result.error}`);
          break;
        }

        case "react": {
          const chatId = args[2];
          const messageId = parseInt(args[3]);
          const reaction = args[4];
          if (!chatId || !messageId || !reaction) {
            console.error("Usage: bridge.ts telegram react <chatId> <messageId> <reaction>");
            process.exit(1);
          }
          const result = await bridge.reactToTelegramMessage(chatId, messageId, reaction);
          console.log(result.success ? `✅ Reacted with ${reaction}` : `❌ Error: ${result.error}`);
          break;
        }

        case "sticker": {
          const chatId = args[2];
          const sticker = args[3];
          if (!chatId || !sticker) {
            console.error("Usage: bridge.ts telegram sticker <chatId> <sticker>");
            process.exit(1);
          }
          const result = await bridge.sendTelegramSticker(chatId, sticker);
          console.log(result.success ? "✅ Sticker sent" : `❌ Error: ${result.error}`);
          break;
        }

        default: {
          console.log("Telegram commands:");
          console.log("  telegram send <chatId> <text>       Send message");
          console.log("  telegram react <chatId> <msgId> <emoji>  React to message");
          console.log("  telegram sticker <chatId> <sticker>  Send sticker");
        }
      }
      break;
    }

    case "sync":
      await bridge.init();
      await bridge.syncSessions();
      break;

    case "proxy": {
      await bridge.init();
      const proxyCommand = args[1];
      const proxyArgs = args.slice(2);
      
      if (!proxyCommand) {
        console.error("Usage: bridge.ts proxy <command> [args...]");
        process.exit(1);
      }

      const result = await bridge.executeCommand(proxyCommand, proxyArgs);
      console.log(result.output);
      process.exit(result.exitCode);
    }

    default:
      console.log("🌉 Matrix-Agent ↔ OpenClaw Bridge");
      console.log("\nUsage:");
      console.log("  bridge.ts init                      Initialize bridge");
      console.log("  bridge.ts status                    Show bridge status");
      console.log("  bridge.ts telegram <cmd>            Telegram actions");
      console.log("  bridge.ts sync                      Sync sessions");
      console.log("  bridge.ts proxy <cmd> [args]        Proxy to OpenClaw CLI");
      console.log("\nTelegram Features:");
      console.log("  • Send messages with inline buttons");
      console.log("  • React with emojis (configurable level)");
      console.log("  • Send stickers");
      console.log("  • Edit and delete messages");
  }
}

export { OpenClawBridge };
export type { ACPMessage, ACPCommand, TelegramAction, BridgeConfig };

if (import.meta.main) {
  main().catch(console.error);
}
