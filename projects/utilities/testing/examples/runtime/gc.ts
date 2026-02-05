/**
 * This example demonstrates Garbage Collection in Bun.
 * Flags: 
 * - None: Uses Bun.gc()
 * - --expose-gc: Enables the global gc() function (Node.js compatibility)
 */

console.log("--- Garbage Collection Demo ---");

// Bun.gc() is always available in Bun
console.log("Forcing GC using Bun.gc(true)...");
Bun.gc(true); 

// Check if global gc is exposed (via --expose-gc flag)
if (typeof globalThis.gc === "function") {
  console.log("Global gc() is available (enabled via --expose-gc)");
  globalThis.gc();
} else {
  console.log("Global gc() is NOT available. Run with `bun --expose-gc examples/runtime/gc.ts` to enable it.");
}

function createLargeObjects() {
  const arr = [];
  for (let i = 0; i < 1000000; i++) {
    arr.push({ message: "large object " + i });
  }
  return arr.length;
}

console.log(`Created ${createLargeObjects()} objects.`);
Bun.gc(true);
console.log("GC performed after object creation.");
