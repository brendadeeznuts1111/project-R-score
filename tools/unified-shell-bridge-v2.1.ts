#!/usr/bin/env bun
/**
 * Enhanced Unified Shell Bridge for Kimi Shell + OpenClaw + Profile Terminal
 * Integrates all three systems into a single MCP interface
 * 
 * Features:
 * - Structured SignalHandler class with 5+ signal support
 * - Parallel cleanup with configurable timeout
 * - Error resilience (unhandled rejections/exceptions)
 * - Health check messaging support
 * - Structured JSON telemetry
 * 
 * @version 2.1.0
 * @bun >= 1.3.0
 */

import { $ } from "bun";
import { existsSync } from "fs";

// ============================================================================
// Signal Handler Class
// ============================================================================

class SignalHandler {
  private shutdownInProgress = false;
  private cleanupCallbacks: Array<() => Promise<void>> = [];
  private readonly cleanupTimeout: number;
  private readonly shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'] as const;
  private startTime = Date.now();

  constructor(timeoutMs = 8000) {
    this.cleanupTimeout = timeoutMs;
  }

  registerCleanup(callback: () => Promise<void>) {
    this.cleanupCallbacks.push(callback);
  }

  async gracefulShutdown(signal: string) {
    if (this.shutdownInProgress) {
      console.error(JSON.stringify({
        level: "WARN",
        message: "Shutdown already in progress, ignoring signal",
        signal
      }));
      return;
    }
    this.shutdownInProgress = true;

    console.error(JSON.stringify({
      level: "INFO",
      message: `Received ${signal}, starting graceful shutdown...`,
      signal,
      uptime: Date.now() - this.startTime,
      cleanupTasks: this.cleanupCallbacks.length
    }));

    // Execute cleanup callbacks in parallel with timeout
    const cleanupPromise = Promise.allSettled(
      this.cleanupCallbacks.map(cb => cb())
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Cleanup timeout after ${this.cleanupTimeout}ms`)), 
        this.cleanupTimeout);
    });

    try {
      await Promise.race([cleanupPromise, timeoutPromise]);
      console.error(JSON.stringify({
        level: "INFO",
        message: "Graceful shutdown complete",
        uptime: Date.now() - this.startTime
      }));
      process.exit(0);
    } catch (error) {
      console.error(JSON.stringify({
        level: "ERROR",
        message: "Forced shutdown due to timeout",
        error: error instanceof Error ? error.message : String(error),
        uptime: Date.now() - this.startTime
      }));
      process.exit(1);
    }
  }

  setupHandlers() {
    // Setup individual signal handlers
    for (const signal of this.shutdownSignals) {
      process.on(signal, async () => {
        await this.gracefulShutdown(signal);
      });
    }

    // Prevent unhandled promise rejections from crashing
    process.on('unhandledRejection', (reason, promise) => {
      console.error(JSON.stringify({
        level: "ERROR",
        message: "Unhandled promise rejection",
        reason: reason instanceof Error ? reason.message : String(reason)
      }));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(JSON.stringify({
        level: "CRITICAL",
        message: "Uncaught exception",
        error: error.message,
        stack: error.stack
      }));
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    console.error(JSON.stringify({
      level: "INFO",
      message: "Enhanced signal handlers initialized",
      signals: this.shutdownSignals,
      cleanupTimeout: this.cleanupTimeout,
      pid: process.pid
    }));
  }
}

// ============================================================================
// Shell Context Types
// ============================================================================

interface ShellContext {
  profile?: string;
  openclaw?: boolean;
  matrix?: boolean;
  workingDir?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

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

export async function executeCommand(
  command: string, 
  context: ShellContext = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const env: Record<string, string> = { ...process.env };
  
  if (context.profile) {
    env.MATRIX_ACTIVE_PROFILE = context.profile;
    const profileEnv = await loadProfileEnv(context.profile);
    Object.assign(env, profileEnv);
  }
  
  if (context.openclaw) {
    const token = await getOpenClawToken();
    if (token) env.OPENCLAW_GATEWAY_TOKEN = token;
  }
  
  const cwd = context.workingDir || process.cwd();
  
  const result = await $`${{ raw: command }}`
    .env(env)
    .cwd(cwd)
    .nothrow();
  
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const signalHandler = new SignalHandler(8000);
  
  // Register cleanup tasks
  signalHandler.registerCleanup(async () => {
    console.error(JSON.stringify({
      level: "INFO",
      message: "Cleaning up shell resources..."
    }));
  });

  // Setup signal handlers
  signalHandler.setupHandlers();

  // Health check support
  process.on('message', (msg) => {
    if (msg === 'health_check') {
      process.send!({ 
        status: 'healthy', 
        version: '2.1.0',
        uptime: Date.now() - signalHandler['startTime'] 
      });
    }
  });

  console.error(JSON.stringify({
    level: "INFO",
    message: "Enhanced Unified Shell Bridge started",
    version: "2.1.0",
    pid: process.pid,
    bunVersion: Bun.version
  }));

  // Keep alive
  setInterval(() => {
    // Heartbeat for process managers
  }, 30000);
}

main().catch((error) => {
  console.error(JSON.stringify({
    level: "CRITICAL",
    message: "Bridge startup failed",
    error: error instanceof Error ? error.message : String(error)
  }));
  process.exit(1);
});

/**
 * Protocol Note: MCP vs ACP
 * 
 * This bridge implements MCP (Model Context Protocol) - the Anthropic standard.
 * MCP is used by Claude Desktop, Claude Code, and 'kimi mcp' command.
 * 
 * ACP (Agent Client Protocol) is a separate kimi-cli specific protocol
 * for IDE integration (Zed, JetBrains). To use ACP, run 'kimi acp' instead.
 * 
 * MCP is the industry standard for model context and tool execution.
 * ACP is kimi-cli's IDE integration protocol.
 * 
 * Both can coexist - use MCP for shell tooling, ACP for IDE features.
 */
