// scan.ts — Tier-1380 CLI v2.1
type PosIndex = 0 | 1 | 2 | 3 | 4;
type Fallback<T = string> = T | (() => T);

const positionals = process.argv.slice(2);

// Performance improvements
// Buffer.from() is now 50% faster with JS arrays
const data = [1, 2, 3, 4, 5, 6, 7, 8];
const buf = Buffer.from(data); // ~50% faster

// JSC upgrades
// - Faster async/await
// - Faster Array.from(arguments)
// - Faster string.padStart/padEnd
// - Faster array.flat()

// ARM64 optimizations
// Better conditional compare instructions (ccmp/ccmn)
// Direct FP constant loading in registers

// Windows ARM64: JIT support added (coming soon)

// Bug fixes
// - Fixed race condition in thread termination
// - Fixed exception handling edge cases
// - Fixed bytecode cache JIT compilation
// - fetch() now preserves header case

// Example: Headers preserve original casing
try {
  const response = await fetch("https://api.example.com/data", {
    headers: {
      "Authorization": "Bearer token123", // sent as "Authorization"
      "Content-Type": "application/json", // sent as "Content-Type"
    },
  });
  console.log("Fetch successful");
} catch (error) {
  console.log("Fetch failed (expected for demo):", error.message);
}

// Bun.wrapAnsi() - ANSI-aware text wrapping
const text = "\x1b[31mThis is a long red text that needs wrapping\x1b[0m";
const wrapped = Bun.wrapAnsi(text, 20);
// Options: hard, wordWrap, trim, ambiguousIsNarrow

// Performance: 33–88x faster than wrap-ansi npm
