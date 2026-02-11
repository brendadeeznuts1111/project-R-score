#!/usr/bin/env bun
/**
 * SAFE Entry Guard Utility
 * 
 * Prevents the silent killer pattern that destroys async operations
 */

/**
 * Check if the current module is being run directly (not imported)
 * @returns true if this file is the main entrypoint (Bun.main)
 */
export function isDirectExecution(): boolean {
  return import.meta.main;
}

/**
 * SAFE: Ensure this module is being run directly.
 * Uses positive logic and doesn't kill async operations.
 * Call this at the very top of CLI tools before any other code.
 */
export function ensureDirectExecution(): void {
  if (!import.meta.main) {
    console.log('ℹ️  Script was imported, not executed directly');
    return; // 🛡️ SAFE: Return instead of process.exit(0)
  }
}

/**
 * SAFE: Main execution wrapper
 * Use this pattern instead of the deadly entry guard
 */
export function runIfMain(mainFunction: () => void | Promise<void>): void {
  if (import.meta.main) {
    if (mainFunction.constructor.name === 'AsyncFunction') {
      mainFunction().catch(console.error);
    } else {
      try {
        mainFunction();
      } catch (error) {
        console.error(error);
      }
    }
  } else {
    console.log('ℹ️  Script was imported, not executed directly');
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

// 🛡️ SAFE USAGE EXAMPLES:
/*
// ❌ DEADLY PATTERN (DON'T USE):
if (import.meta.path !== Bun.main) {
  process.exit(0); // ← KILLS ASYNC OPERATIONS
}

// ✅ SAFE PATTERN 1:
import { ensureDirectExecution } from './entry-guard.ts';
ensureDirectExecution();
// Your code here...

// ✅ SAFE PATTERN 2 (RECOMMENDED):
import { runIfMain } from './entry-guard.ts';
runIfMain(async () => {
  // Your async code here...
  console.log('Running safely!');
});

// ✅ SAFE PATTERN 3:
if (import.meta.main) {
  main().catch(console.error);
} else {
  console.log('Imported, not executed');
}
*/
