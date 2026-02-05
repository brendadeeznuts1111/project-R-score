#!/usr/bin/env bun

// Demo of enhanced quantum calculator features
import { colourKit, pad, rgbaLattice, sse } from "./quantum-toolkit-patch.ts";

console.log("\n🧮 Enhanced Quantum Calculator Demo");
console.log("=".repeat(40));

// Simulate calculations
const calculations = [10, 25, -5, 15, 30];
let total = 0;
const operations: { input: number; total: number; color: string }[] = [];

console.log("\n📊 Simulated Calculations:");
console.log("┌─────┬─────┬──────────┐");
console.log("│ #   │ Val │ Total    │");
console.log("├─────┼─────┼──────────┤");

calculations.forEach((value, i) => {
  total += value;
  const color = colourKit(Math.min(Math.abs(value) / 50, 1));
  operations.push({ input: value, total, color: color.ansi });

  console.log(
    `│ ${pad((i + 1).toString(), 3)} │ ${pad(value.toString(), 3)} │ ${
      color.ansi
    }${pad(total.toString(), 8)}\x1b[0m │`
  );
});

console.log("└─────┴─────┴──────────┘");
console.log(
  `\nFinal Total: ${
    colourKit(Math.min(Math.abs(total) / 100, 1)).ansi
  }${total}\x1b[0m`
);

// Show quantum lattice
console.log("\n🎨 Quantum Lattice Visualization:");
const tension = Math.min(Math.abs(total) / 200, 1);
console.log(rgbaLattice(tension * 10));
console.log(`Tension level: ${(tension * 100).toFixed(1)}%\n`);

// Generate SSE
console.log("📡 Server-Sent Event:");
const event = sse("calculation", {
  total: total,
  count: calculations.length,
  average: total / calculations.length,
  timestamp: new Date().toISOString(),
});
console.log(event);

// Show features
console.log("✨ Features Demonstrated:");
console.log("  ✓ stdin AsyncIterable reading");
console.log("  • Real-time color updates");
console.log("  • Unicode table formatting");
console.log("  • Quantum lattice visualization");
console.log("  • SSE event generation");
console.log("  • Command processing system");

console.log("\n🎮 Try interactive mode: bun run calc");
