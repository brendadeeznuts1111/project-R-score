#!/usr/bin/env bun
/**
 * Unified Shell Bridge for Kimi Shell + OpenClaw + Profile Terminal
 * Integrates all three systems into a single MCP interface
 * 
 * Features:
 * - Bun-native signal handling (SIGINT, SIGTERM, SIGHUP)
 * - Graceful shutdown with cleanup
 * - Health monitoring and telemetry
 * - Error recovery and logging
 * 
 * @version 2.0.0
 * @bun >= 1.3.0
 */

import { $ } from "bun";
import { existsSync } from "fs";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ShellContext {
  profile?: string;
  openclaw?: boolean;
  matrix?: boolean;
  workingDir?: string;
}

interface SignalState {
  isShuttingDown: boolean;
  receivedSignals: string[];
  startTime: number;
}

interface BridgeConfig {
  gracefulShutdownTimeoutMs: number;
  enableTelemetry: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface TelemetryData {
  commandsExecuted: number;
  errors: number;
  startTime: number;
  lastCommandTime: number | null;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG: BridgeConfig = {
  gracefulShutdownTimeoutMs: 5000,
  enableTelemetry: true,
  logLevel: 'info',
};

// ============================================================================
// State Management
// ============================================================================

const signalState: SignalState = {
  isShuttingDown: false,
  receivedSignals: [],
  startTime: Date.now(),
};

const telemetry: TelemetryData = {
  commandsExecuted: 0,
  errors: 0,
  startTime: Date.now(),
  lastCommandTime: null,
};

const cleanupHandlers: Array<() => Promise<void>> = [];

// ============================================================================
// Logging
// ============================================================================

function log(level: BridgeConfig['logLevel'], message: string, meta?: Record<string, unknown>): void {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] < levels[CONFIG.logLevel]) return;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(meta || {}),
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ============================================================================
// Signal Handling (Bun-native)
// ============================================================================

/**
 * Register cleanup handler for graceful shutdown
 */
export function onCleanup(handler: () => Promise<void>): void {
  cleanupHandlers.push(handler);
}

/**
 * Initialize Bun-native signal handlers
 */
function initializeSignalHandlers(): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => handleSignal('SIGINT'));
  
  // Handle SIGTERM (termination request)
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  
  // Handle SIGHUP (terminal closed)
  process.on('SIGHUP', () => handleSignal('SIGHUP'));
  
  // Handle beforeExit
  process.on('beforeExit', (code) => {
    log('debug', 'Process beforeExit', { code, signals: signalState.receivedSignals });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
    gracefulShutdown(1);
  });
  
  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Unhandled rejection', { reason: String(reason) });
  });
  
  log('info', 'Signal handlers initialized', { pid: process.pid });
}

/**
 * Handle OS signals with Bun-native support
 */
function handleSignal(signal: string): void {
  if (signalState.isShuttingDown) {
    log('warn', 'Shutdown already in progress, forcing exit', { signal });
    process.exit(1);
  }
  
  signalState.receivedSignals.push(signal);
  signalState.isShuttingDown = true;
  
  log('info', `Received ${signal}, starting graceful shutdown...`, {
    uptime: Date.now() - signalState.startTime,
    commandsExecuted: telemetry.commandsExecuted,
  });
  
  gracefulShutdown(signal === 'SIGINT' ? 130 : 0);
}

/**
 * Perform graceful shutdown with cleanup
 */
async function gracefulShutdown(exitCode: number): Promise<void> {
  // Set a timeout to force exit if cleanup takes too long
  const timeoutId = setTimeout(() => {
    log('error', 'Shutdown timeout exceeded, forcing exit', {
      timeoutMs: CONFIG.gracefulShutdownTimeoutMs,
    });
    process.exit(exitCode || 1);
  }, CONFIG.gracefulShutdownTimeoutMs);
  
  try {
    // Run all cleanup handlers
    log('debug', `Running ${cleanupHandlers.length} cleanup handlers...`);
    
    for (const handler of cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        log('error', 'Cleanup handler failed', { error: String(error) });
      }
    }
    
    log('info', 'Graceful shutdown complete', {
      uptime: Date.now() - signalState.startTime,
      commandsExecuted: telemetry.commandsExecuted,
      errors: telemetry.errors,
    });
  } catch (error) {
    log('error', 'Error during graceful shutdown', { error: String(error) });
  } finally {
    clearTimeout(timeoutId);
    process.exit(exitCode);
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Load OpenClaw token from Bun secrets
 */
async function getOpenClawToken(): Promise<string | null> {
  try {
    return await Bun.secrets.get({
      service: "com.openclaw.gateway",
      name: "gateway_token"
    });
  } catch {
    return null;
  }
}

/**
 * Load profile environment
 */
async function loadProfileEnv(profile: string): Promise<Record<string, string>> {
  const profilePath = `${process.env.HOME}/.matrix/profiles/${profile}.json`;
  if (!existsSync(profilePath)) return {};
  
  try {
    const profileData = await Bun.file(profilePath).json();
    return profileData.env || {};
  } catch {
    return {};
  }
}

/**
 * Execute command with full context
 */
export async function executeCommand(
  command: string, 
  context: ShellContext = {}
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  const startTime = performance.now();
  
  try {
    const env: Record<string, string> = { ...process.env as Record<string, string> };
    
    // Load profile context
    if (context.profile) {
      env.MATRIX_ACTIVE_PROFILE = context.profile;
      const profileEnv = await loadProfileEnv(context.profile);
      Object.assign(env, profileEnv);
    }
    
    // Load OpenClaw token
    if (context.openclaw) {
      const token = await getOpenClawToken();
      if (token) env.OPENCLAW_GATEWAY_TOKEN = token;
    }
    
    // Set working directory
    const cwd = context.workingDir || process.cwd();
    
    // Execute with Bun's $ for optimal performance
    const result = await $`${{ raw: command }}`
      .env(env)
      .cwd(cwd)
      .nothrow();
    
    const durationMs = performance.now() - startTime;
    
    if (CONFIG.enableTelemetry) {
      telemetry.commandsExecuted++;
      telemetry.lastCommandTime = Date.now();
    }
    
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
      durationMs: Math.round(durationMs * 1000) / 1000,
    };
  } catch (error) {
    if (CONFIG.enableTelemetry) {
      telemetry.errors++;
    }
    
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      durationMs: Math.round((performance.now() - startTime) * 1000) / 1000,
    };
  }
}

/**
 * Get OpenClaw status
 */
async function getOpenClawStatus(): Promise<object> {
  const token = await getOpenClawToken();
  if (!token) {
    return { error: "OpenClaw token not found in keychain" };
  }
  
  try {
    const result = await $`openclaw status 2>&1`.env({ OPENCLAW_GATEWAY_TOKEN: token }).nothrow();
    return {
      running: result.exitCode === 0,
      output: result.stdout.toString(),
      errors: result.stderr.toString()
    };
  } catch (e) {
    return { error: String(e) };
  }
}

/**
 * Profile terminal operations
 */
async function profileTerminal(command: string, args: string[] = []): Promise<object> {
  const cliPath = `${process.env.HOME}/.claude/core/terminal/cli.ts`;
  const result = await $`bun run ${cliPath} ${command} ${args}`.nothrow();
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode
  };
}

/**
 * List available profiles
 */
async function listProfiles(): Promise<string[]> {
  const profilesDir = `${process.env.HOME}/.matrix/profiles`;
  try {
    const files = await $`ls ${profilesDir}/*.json 2>/dev/null`.text();
    return files.split("\n").filter(f => f.trim()).map(f => f.replace(/.*\//, "").replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * Get bridge health status
 */
async function getHealthStatus(): Promise<object> {
  return {
    status: 'healthy',
    uptime: Date.now() - signalState.startTime,
    pid: process.pid,
    signals: signalState.receivedSignals,
    telemetry: CONFIG.enableTelemetry ? {
      commandsExecuted: telemetry.commandsExecuted,
      errors: telemetry.errors,
      startTime: telemetry.startTime,
    } : null,
  };
}

// ============================================================================
// MCP Server Handlers
// ============================================================================

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<object> {
  if (signalState.isShuttingDown) {
    return { error: 'Bridge is shutting down' };
  }
  
  switch (name) {
    case "shell_execute": {
      return executeCommand(args.command as string, {
        profile: args.profile as string | undefined,
        openclaw: args.openclaw as boolean | undefined,
        matrix: args.matrix as boolean | undefined,
        workingDir: args.workingDir as string | undefined,
      });
    }
    
    case "shell_execute_stream": {
      const result = await executeCommand(args.command as string, {
        profile: args.profile as string | undefined,
        openclaw: args.openclaw as boolean | undefined,
      });
      return {
        ...result,
        stream: true
      };
    }
    
    case "openclaw_status": {
      return getOpenClawStatus();
    }
    
    case "openclaw_gateway_restart": {
      await $`pkill -f "openclaw gateway" 2>/dev/null || true`;
      await Bun.sleep(1000);
      const token = await getOpenClawToken();
      if (!token) return { error: "Token not found" };
      
      await $`openclaw gateway --port 18789 &`
        .env({ OPENCLAW_GATEWAY_TOKEN: token })
        .nothrow();
      
      return { restarted: true };
    }
    
    case "profile_list": {
      const profiles = await listProfiles();
      return { profiles };
    }
    
    case "profile_bind": {
      return profileTerminal("bind", [args.profile as string]);
    }
    
    case "profile_switch": {
      return profileTerminal("switch", [args.profile as string]);
    }
    
    case "profile_status": {
      return profileTerminal("status");
    }
    
    case "bridge_health": {
      return getHealthStatus();
    }
    
    case "clawbot_migrate":
      return handleMatrixAgentTools("clawbot_migrate", args);
    case "clawbot_legacy_config":
      return handleMatrixAgentTools("clawbot_legacy_config", args);
    
    case "matrix_agent_status": {
      const result = await $`bun ${process.env.HOME}/.matrix/matrix-agent.ts status`.nothrow();
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode
      };
    }
    
    case "cron_list": {
      const result = await $`crontab -l 2>/dev/null || echo "No crontab"`.nothrow();
      return {
        crontab: result.stdout.toString()
      };
    }
    
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Matrix Agent (Clawdbot) specific tools
async function handleMatrixAgentTools(name: string, args: Record<string, unknown>): Promise<object> {
  const agentPath = `${process.env.HOME}/.matrix/matrix-agent.ts`;
  
  switch (name) {
    case "clawbot_migrate": {
      const marker = `${process.env.HOME}/.matrix/.migrated-from-clawdbot`;
      if (existsSync(marker)) {
        const data = await Bun.file(marker).json();
        return { migrated: true, ...data };
      }
      return { migrated: false };
    }
    
    case "clawbot_legacy_config": {
      const legacyConfig = `${process.env.HOME}/.clawdbot/clawdbot.json`;
      if (!existsSync(legacyConfig)) {
        return { error: "Legacy config not found" };
      }
      try {
        const config = await Bun.file(legacyConfig).json();
        return { 
          legacyConfig: config,
          note: "This is the legacy clawdbot config (read-only). Matrix Agent uses ~/.matrix/agent/config.json"
        };
      } catch (e) {
        return { error: String(e) };
      }
    }
    
    case "matrix_agent_init": {
      const result = await $`bun ${agentPath} init`.nothrow();
      return {
        initialized: result.exitCode === 0,
        output: result.stdout.toString(),
        errors: result.stderr.toString()
      };
    }
    
    case "matrix_agent_health": {
      const result = await $`bun ${agentPath} health`.nothrow();
      return {
        healthy: result.exitCode === 0,
        output: result.stdout.toString()
      };
    }
    
    case "matrix_agent_migrate": {
      const result = await $`bun ${agentPath} migrate`.nothrow();
      return {
        migrated: result.exitCode === 0,
        output: result.stdout.toString()
      };
    }
    
    case "matrix_agent_profile": {
      const result = await $`bun ${agentPath} profile ${args.command || 'list'} ${args.args || ''}`.nothrow();
      return {
        output: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode
      };
    }
    
    default:
      return null;
  }
}

// ============================================================================
// Main MCP Loop
// ============================================================================

async function startMcpServer(): Promise<void> {
  // Initialize signal handlers first
  initializeSignalHandlers();
  
  // Register cleanup handler
  onCleanup(async () => {
    log('info', 'MCP server cleanup', { 
      commandsExecuted: telemetry.commandsExecuted,
      errors: telemetry.errors,
    });
  });
  
  // Send initialization response
  console.log(JSON.stringify({
    jsonrpc: "2.0",
    id: 0,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "unified-shell-bridge",
        version: "2.0.0",
        bunVersion: Bun.version,
      }
    }
  }));
  
  log('info', 'MCP server started', { pid: process.pid });
  
  // Main input loop
  for await (const line of console) {
    try {
      const request = JSON.parse(line);
      
      if (request.method === "tools/list") {
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
              {
                name: "shell_execute",
                description: "Execute shell command with profile/OpenClaw context",
                inputSchema: {
                  type: "object",
                  properties: {
                    command: { type: "string" },
                    profile: { type: "string", optional: true },
                    openclaw: { type: "boolean", optional: true },
                    workingDir: { type: "string", optional: true }
                  },
                  required: ["command"]
                }
              },
              {
                name: "shell_execute_stream",
                description: "Execute shell command with streaming output",
                inputSchema: {
                  type: "object",
                  properties: {
                    command: { type: "string" },
                    profile: { type: "string", optional: true },
                    openclaw: { type: "boolean", optional: true }
                  },
                  required: ["command"]
                }
              },
              {
                name: "openclaw_status",
                description: "Check OpenClaw gateway status",
                inputSchema: { type: "object" }
              },
              {
                name: "openclaw_gateway_restart",
                description: "Restart OpenClaw gateway",
                inputSchema: { type: "object" }
              },
              {
                name: "profile_list",
                description: "List available Matrix profiles",
                inputSchema: { type: "object" }
              },
              {
                name: "profile_bind",
                description: "Bind current directory to profile",
                inputSchema: {
                  type: "object",
                  properties: {
                    profile: { type: "string" }
                  },
                  required: ["profile"]
                }
              },
              {
                name: "profile_switch",
                description: "Switch to different profile",
                inputSchema: {
                  type: "object",
                  properties: {
                    profile: { type: "string" }
                  },
                  required: ["profile"]
                }
              },
              {
                name: "profile_status",
                description: "Show profile-terminal binding status",
                inputSchema: { type: "object" }
              },
              {
                name: "matrix_agent_status",
                description: "Check Matrix Agent status",
                inputSchema: { type: "object" }
              },
              {
                name: "bridge_health",
                description: "Check bridge health and telemetry",
                inputSchema: { type: "object" }
              },
              {
                name: "cron_list",
                description: "List configured cron jobs",
                inputSchema: { type: "object" }
              }
            ]
          }
        }));
      } else if (request.method === "tools/call") {
        const result = await handleToolCall(request.params.name, request.params.arguments);
        console.log(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          }
        }));
      }
    } catch (e) {
      log('error', 'Request processing error', { error: String(e) });
      console.error("Error:", e);
    }
  }
}

// ============================================================================
// Entry Point
// ============================================================================

if (import.meta.main) {
  startMcpServer().catch((error) => {
    log('error', 'Failed to start MCP server', { error: String(error) });
    process.exit(1);
  });
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  getHealthStatus,
  loadProfileEnv,
  listProfiles,
  getOpenClawToken,
  CONFIG,
  telemetry,
  signalState,
};
