#!/usr/bin/env bun
/**
 * Entry Guard Utility
 * Prevents shared CLI tools from being imported accidentally.
 * Only allows direct execution via `bun <script>.ts`
 */

/**
 * Check if the current module is being run directly (not imported)
 * @returns true if this file is the main entrypoint (Bun.main)
 */
export function isDirectExecution(): boolean {
  return import.meta.path === Bun.main;
}

/**
 * Ensure this module is being run directly.
 * If imported from another script, exits immediately without running.
 * Call this at the very top of CLI tools before any other code.
 */
export function ensureDirectExecution(): void {
  if (import.meta.path !== Bun.main) {
    process.exit(0);
  }
}

/**
 * Alternative: Ensure direct execution with custom exit code
 * @param exitCode - Exit code when imported (default: 0)
 */
export function ensureDirectExecutionWithCode(exitCode: number = 0): void {
  if (import.meta.path !== Bun.main) {
    process.exit(exitCode);
  }
}

/**
 * Get the main entrypoint path
 * @returns The absolute path of the entry script (Bun.main)
 */
export function getMainPath(): string {
  return Bun.main;
}

/**
 * Get whether this module is the main module
 * Alias for isDirectExecution()
 */
export const isMain = isDirectExecution;