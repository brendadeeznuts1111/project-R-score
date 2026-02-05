/**
 * Function cleanup utilities to reduce memory leaks
 */

// WeakMap for tracking function references
const functionRefs = new WeakMap<Function, Set<() => void>>();

/**
 * Register a cleanup function for a given function instance
 */
export function registerFunctionCleanup(fn: Function, cleanup: () => void): void {
  if (!functionRefs.has(fn)) {
    functionRefs.set(fn, new Set());
  }
  functionRefs.get(fn)!.add(cleanup);
}

/**
 * Execute cleanup for a function instance
 */
export function cleanupFunction(fn: Function): void {
  const cleanups = functionRefs.get(fn);
  if (cleanups) {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    functionRefs.delete(fn);
  }
}
