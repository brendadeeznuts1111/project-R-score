#!/usr/bin/env bun

// Demo of enhanced quantum calculator features
import { colourKit, pad, rgbaLattice, sse } from "./quantum-toolkit-patch.ts";

console.info("\n🧮 Enhanced Quantum Calculator Demo");
console.info("=".repeat(40));

// Simulate calculations
const calculations = [10, 25, -5, 15, 30];
let total = 0;
const operations: { input: number; total: number; color: string }[] = [];

console.info("\n📊 Simulated Calculations:");
console.info("┌─────┬─────┬──────────┐");
console.info("│ #   │ Val │ Total    │");
console.info("├─────┼─────┼──────────┤");

calculations.forEach((value, i) => {
  total += value;
  const color = colourKit(Math.min(Math.abs(value) / 50, 1));
  operations.push({ input: value, total, color: color.ansi });

  console.info(
    `│ ${pad((i + 1).toString(), 3)} │ ${pad(value.toString(), 3)} │ ${
      color.ansi
    }${pad(total.toString(), 8)}\x1b[0m │`
  );
});

console.info("└─────┴─────┴──────────┘");
console.info(
  `\nFinal Total: ${
    colourKit(Math.min(Math.abs(total) / 100, 1)).ansi
  }${total}\x1b[0m`
);

// Show quantum lattice
console.info("\n🎨 Quantum Lattice Visualization:");
const tension = Math.min(Math.abs(total) / 200, 1);
console.info(rgbaLattice(tension * 10));
console.info(`Tension level: ${(tension * 100).toFixed(1)}%\n`);

// Generate SSE
console.info("📡 Server-Sent Event:");
const event = sse("calculation", {
  total: total,
  count: calculations.length,
  average: total / calculations.length,
  timestamp: new Date().toISOString(),
});
console.info(event);

// Show features
console.info("✨ Features Demonstrated:");
console.info("  ✓ stdin AsyncIterable reading");
console.info("  • Real-time color updates");
console.info("  • Unicode table formatting");
console.info("  • Quantum lattice visualization");
console.info("  • SSE event generation");
console.info("  • Command processing system");

console.info("\n🎮 Try interactive mode: bun run calc");
