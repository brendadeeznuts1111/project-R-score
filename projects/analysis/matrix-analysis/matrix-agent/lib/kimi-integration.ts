/**
 * Matrix Agent - Kimi Shell Integration
 * Provides seamless integration with Kimi CLI
 */

import { join } from "path";
import { homedir } from "os";
import { $ } from "bun";

const KIMI_CONFIG_DIR = join(homedir(), ".kimi");
const KIMI_MCP_CONFIG = join(KIMI_CONFIG_DIR, "mcp.json");

export interface KimiConfig {
  default_model?: string;
  default_thinking?: boolean;
  mcp?: {
    client?: {
      tool_call_timeout_ms?: number;
    };
  };
}

export interface KimiMCPServer {
  command?: string;
  args?: string[];
  transport?: string;
  url?: string;
}

export interface KimiMCPConfig {
  mcpServers: Record<string, KimiMCPServer>;
}

/**
 * Check if Kimi CLI is available
 */
export async function isKimiAvailable(): Promise<boolean> {
  try {
    const result = await $`which kimi`.quiet().nothrow();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get Kimi version
 */
export async function getKimiVersion(): Promise<string | null> {
  try {
    const result = await $`kimi --version`.quiet();
    return result.stdout.toString().trim();
  } catch {
    return null;
  }
}

/**
 * Load Kimi MCP configuration
 */
export async function loadKimiMCPConfig(): Promise<KimiMCPConfig | null> {
  try {
    const file = Bun.file(KIMI_MCP_CONFIG);
    if (!(await file.exists())) {
      return null;
    }
    return await file.json() as KimiMCPConfig;
  } catch {
    return null;
  }
}

/**
 * Add Matrix Agent MCP server to Kimi config
 */
export async function addMatrixAgentMCP(): Promise<boolean> {
  try {
    const config = await loadKimiMCPConfig() || { mcpServers: {} };

    // Add matrix-agent MCP server
    config.mcpServers["matrix-agent"] = {
      command: "bun",
      args: [join(homedir(), ".matrix/matrix-agent.ts"), "mcp"],
    };

    await Bun.write(KIMI_MCP_CONFIG, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
}

/**
 * Run Kimi with a specific prompt
 */
export async function runKimi(prompt: string, options: {
  model?: string;
  thinking?: boolean;
  yolo?: boolean;
} = {}): Promise<{ success: boolean; output: string }> {
  try {
    const args = ["-p", prompt];

    if (options.model) {
      args.push("-m", options.model);
    }
    if (options.thinking !== undefined) {
      args.push(options.thinking ? "--thinking" : "--no-thinking");
    }
    if (options.yolo) {
      args.push("-y");
    }

    const result = await $`kimi ${args}`.nothrow();
    return {
      success: result.exitCode === 0,
      output: result.stdout.toString(),
    };
  } catch (error) {
    return {
      success: false,
      output: String(error),
    };
  }
}

/**
 * Run Kimi with matrix context
 */
export async function runKimiWithContext(
  prompt: string,
  context: {
    profile?: string;
    matrixContext?: boolean;
  } = {}
): Promise<{ success: boolean; output: string }> {
  let enhancedPrompt = prompt;

  if (context.matrixContext) {
    enhancedPrompt = `[Matrix Context] ${enhancedPrompt}`;
  }

  if (context.profile) {
    enhancedPrompt = `[Profile: ${context.profile}] ${enhancedPrompt}`;
  }

  return runKimi(enhancedPrompt, { thinking: true });
}

/**
 * Get Kimi session info
 */
export async function getKimiSession(): Promise<{
  sessionId: string | null;
  workDir: string;
}> {
  const sessionId = process.env.KIMI_SESSION_ID || null;
  const workDir = process.cwd();

  return {
    sessionId,
    workDir,
  };
}

/**
 * Sync profile with Kimi environment
 */
export async function syncProfileWithKimi(profileName: string): Promise<boolean> {
  try {
    const { loadProfile, applyProfileEnv } = await import("./profile-integration.ts");
    const profile = await loadProfile(profileName);

    if (!profile) {
      return false;
    }

    const envVars = applyProfileEnv(profile);

    // Create a Kimi-compatible environment file
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const envPath = join(KIMI_CONFIG_DIR, ".matrix-env");
    await Bun.write(envPath, envContent);

    return true;
  } catch {
    return false;
  }
}
