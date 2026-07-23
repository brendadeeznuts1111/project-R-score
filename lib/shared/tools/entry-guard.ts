#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// lib/shared/tools/entry-guard.ts — Safe entry guard for CLI tools
//
// Prevents shared CLI tools from being imported accidentally without killing
// async operations. Prefer `runIfMain` for async scripts.

/**
 * Check if the current module is being run directly (not imported).
 * @returns true if this file is the main entrypoint (Bun.main)
 */
export function isDirectExecution(): boolean {
  return import.meta.main;
}

/**
 * Ensure this module is being run directly.
 * If imported from another script, returns early so async operations are not
 * torn down.
 */
export function ensureDirectExecution(): void {
  if (!import.meta.main) {
    console.info('ℹ️  Script was imported, not executed directly');
    return;
  }
}

/**
 * Main execution wrapper.
 * Runs `mainFunction` only when the module is executed directly and safely
 * handles async errors.
 */
export function runIfMain(mainFunction: () => void | Promise<void>): void {
  if (import.meta.main) {
    void Promise.resolve(mainFunction()).catch(console.error);
  } else {
    console.info('ℹ️  Script was imported, not executed directly');
  }
}

/**
 * Get the main entrypoint path.
 * @returns The absolute path of the entry script (Bun.main)
 */
export function getMainPath(): string {
  return Bun.main;
}

/**
 * Get whether this module is the main module.
 * Alias for isDirectExecution().
 */
export const isMain = isDirectExecution;
