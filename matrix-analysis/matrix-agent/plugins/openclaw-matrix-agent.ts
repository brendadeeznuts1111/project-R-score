/**
 * OpenClaw Plugin: Matrix Agent Integration
 * Allows OpenClaw to leverage Matrix Agent capabilities
 */

import type { Plugin, PluginContext } from "../../plugin-sdk/types";

interface MatrixAgentConfig {
  enabled: boolean;
  matrixPath: string;
  tier1380Enabled: boolean;
  profileSync: boolean;
}

class MatrixAgentPlugin implements Plugin {
  name = "matrix-agent";
  version = "1.0.0";
  description = "Integrate with Matrix Agent for Tier-1380 governance";

  private config: MatrixAgentConfig = {
    enabled: true,
    matrixPath: "~/.matrix",
    tier1380Enabled: true,
    profileSync: true,
  };

  private context?: PluginContext;

  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info("Matrix Agent plugin initialized");
    this.registerCommands(context);
  }

  private registerCommands(context: PluginContext): void {
    context.commands.register({
      name: "matrix.commit",
      description: "Create commit using Tier-1380 flow",
      handler: async (args: { message?: string; generate?: boolean }) => {
        if (args.generate) {
          return this.generateCommitMessage();
        }
        if (args.message) {
          return this.createCommit(args.message);
        }
        return { success: false, error: "Usage: matrix.commit --message=... | --generate" };
      },
    });

    context.commands.register({
      name: "matrix.profile",
      description: "Manage Matrix profiles",
      handler: async (args: { command: string; name?: string }) => {
        return this.runProfileCommand(args.command, args.name);
      },
    });

    context.commands.register({
      name: "matrix.crc32",
      description: "Hardware-accelerated CRC32",
      handler: async (args: { input: string }) => {
        return this.computeCRC32(args.input);
      },
    });
  }

  private async generateCommitMessage(): Promise<unknown> {
    try {
      const { $ } = await import("bun");
      const result = await $`bun ~/.kimi/skills/tier1380-commit-flow/scripts/generate-message.ts`.nothrow();
      return {
        success: result.exitCode === 0,
        message: result.stdout.toString().trim(),
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async createCommit(message: string): Promise<unknown> {
    try {
      const { $ } = await import("bun");
      const result = await $`bun ~/.kimi/skills/tier1380-commit-flow/scripts/git-commit.ts ${message}`.nothrow();
      return {
        success: result.exitCode === 0,
        output: result.stdout.toString(),
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async runProfileCommand(command: string, name?: string): Promise<unknown> {
    try {
      const { $ } = await import("bun");
      const args = [command];
      if (name) args.push(name);
      const result = await $`bun ~/.matrix/matrix-agent.ts profile ${args}`.nothrow();
      return {
        success: result.exitCode === 0,
        output: result.stdout.toString(),
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async computeCRC32(input: string): Promise<unknown> {
    const hash = Bun.hash.crc32(input);
    return {
      success: true,
      crc32: hash,
      hex: (hash >>> 0).toString(16).padStart(8, "0"),
    };
  }

  async destroy(): Promise<void> {
    this.context?.logger.info("Matrix Agent plugin destroyed");
  }
}

export default function createPlugin(): Plugin {
  return new MatrixAgentPlugin();
}
