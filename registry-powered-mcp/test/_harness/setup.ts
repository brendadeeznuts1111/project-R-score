/**
 * Global Test Setup
 * Preloaded before all tests run
 *
 * Usage: bun test --preload ./test/_harness/setup.ts
 * Or configure in bunfig.toml
 */

import { afterAll } from "bun:test";

// Set test environment immediately
process.env.NODE_ENV = "test";

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  info: console.info,
};

// Patterns to suppress (expected test output)
const SUPPRESS_PATTERNS = [
  /^\{"type":"(security|compliance)"/,  // Security logger test output
  /^S3 list operation failed/,           // S3 credential errors (expected)
  /^⚠️\s+Config load failed/,           // Config fallback (expected)
  /^⚠️\s+Plugin has no step handlers/,  // Plugin warning (expected)
  /^⚠️\s+Workflow .* has no steps/,     // Workflow warning (expected)
  /^⚠️\s+Redis not available/,          // Redis unavailable (expected)
  /^⚠️\s+RedisClient not available/,    // Redis unavailable (expected)
  /^⚠️\s+Integrity mismatch/,           // Skill integrity warnings (expected)
  /^❌\s+Failed to load skill/,          // Skill load failures (expected in some tests)
  /^Threat reported:/,                   // Threat intel test output
  /^\[.*\] (DEBUG|INFO|WARN|ERROR)/,    // Logger test output
  /^\{[\s\S]*"message":/,                // JSON error output from logger
  /^🔒 LATTICE BOOT/,                    // Lattice boot sequence
  /^═+$/,                                // Separator lines
  /^📋 Native API/,                      // Native API audit
  /^✅ (AUDIT PASSED|Switch|Map|String|URLPattern|Bun\.|crypto|performance)/,  // Audit results
  /^✓ (Registered|Compiled|Loaded|Exchange)/,  // Boot progress
  /^🎯 LATTICE BOOT/,                    // Skills loading
  /^📂 Loading/,                         // Skills directory
  /^🎰 LATTICE BOOT/,                    // Exchange handler
  /^🔗 LATTICE BOOT/,                    // Server registry
  /^⚡ LATTICE BOOT/,                    // Route compilation
  /^📊 (Performance|LATTICE)/,           // Performance matrix
  /^Total Optimization:/,                // Performance stats
  /^Average Dispatch:/,                  // Performance stats
  /^Heap Pressure:/,                     // Performance stats
  /^P99 Latency:/,                       // Performance stats
  /^Cold Start:/,                        // Performance stats
  /^Binary Size:/,                       // Performance stats
  /^Native APIs Enabled:/,               // Performance stats
  /^🔧 BUN RUNTIME/,                     // Runtime fixes
  /^📦 Runtime Version:/,                // Version info
  /^🔒 Security & Stability/,            // Fix list
  /^\s+\d+\. /,                          // Numbered list items
  /^✅ All fixes/,                        // Fix validation
  /^✅ BUN RUNTIME/,                      // Validation complete
  /^🔍 (Step starting|Step completed):/,  // Workflow step logging
  /^⚠️\s+warn message$/,                 // Builtin handler test output
  /^❌\s+error message$/,                 // Builtin handler test output
  /^🔍\s+debug message$/,                 // Builtin handler test output
];

// Check if message should be suppressed
function shouldSuppress(args: any[]): boolean {
  if (process.env.TEST_VERBOSE === "true") return false;

  const message = args.map(a => String(a)).join(" ");
  return SUPPRESS_PATTERNS.some(pattern => pattern.test(message));
}

// Create filtered console method
function createFilteredMethod(original: (...args: any[]) => void) {
  return (...args: any[]) => {
    if (!shouldSuppress(args)) {
      original.apply(console, args);
    }
  };
}

// Apply console filtering immediately (before any imports)
// Use TEST_VERBOSE=true to see all output
if (process.env.TEST_VERBOSE !== "true") {
  console.log = createFilteredMethod(originalConsole.log);
  console.warn = createFilteredMethod(originalConsole.warn);
  console.error = createFilteredMethod(originalConsole.error);
  console.debug = createFilteredMethod(originalConsole.debug);
  console.info = createFilteredMethod(originalConsole.info);
}

// Disable color output in CI
if (process.env.CI) {
  process.env.FORCE_COLOR = "0";
}

// Global test cleanup
afterAll(async () => {
  // Restore original console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;

  // Cleanup any global resources
  // Force GC to clean up memory
  Bun.gc(true);
});

// Global error handler for uncaught errors in tests
process.on("unhandledRejection", (reason, promise) => {
  originalConsole.error("Unhandled Rejection in tests:", reason);
  // Don't exit in tests - let the test framework handle it
});

// Export utilities that might be useful globally
export const TEST_TIMEOUT = 30000; // 30 seconds
export const IS_CI = !!process.env.CI;
export const IS_WATCH_MODE = !!process.env.WATCH;

// Export original console for tests that need it
export { originalConsole };
