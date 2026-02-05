/**
 * Shortcuts Performance Benchmark Suite
 * Performance benchmarks for shortcut operations
 *
 * Run with: bun run src/client/__tests__/shortcuts-performance.bench.ts
 */
import { color } from "bun";
import {
  shortcutsConfig,
  getAllKeyboardShortcuts,
  findShortcutByAction,
} from "../config";
import type { ShortcutBinding } from "../config";

const ITERATIONS = 10000;
const WARMUP = 100;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgNs: number;
  opsPerSec: number;
}

function benchmark(name: string, fn: () => void, iterations = ITERATIONS): BenchmarkResult {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    fn();
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = performance.now() - start;

  const avgNs = (elapsed / iterations) * 1_000_000; // Convert to nanoseconds
  const opsPerSec = Math.floor((iterations / elapsed) * 1000);

  return {
    name,
    iterations,
    totalMs: elapsed,
    avgNs,
    opsPerSec,
  };
}

// Helper functions for benchmarks
const normalizeKey = (key: string, platform: string): string => {
  return key
    .replace(/CmdOrCtrl/gi, platform === "mac" ? "Cmd" : "Ctrl")
    .replace(/Cmd\/Ctrl/gi, platform === "mac" ? "Cmd" : "Ctrl")
    .toLowerCase();
};

const generateMockShortcuts = (count: number): Record<string, ShortcutBinding> => {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `Cmd/Ctrl + ${String.fromCharCode(65 + (i % 26))}`,
      {
        action: `action-${i}`,
        description: `Description for action ${i}`,
      },
    ])
  );
};

// ============================================
// Benchmarks
// ============================================

const results: BenchmarkResult[] = [];

console.log("\n⌨️  Shortcuts Performance Benchmark Suite\n");
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Warmup: ${WARMUP}`);
console.log("-".repeat(70));

// Benchmark: Load shortcuts config
results.push(benchmark("Load shortcuts config", () => {
  const config = shortcutsConfig;
  const _ = config.keyboard;
}));

// Benchmark: Get all keyboard shortcuts
results.push(benchmark("Get all keyboard shortcuts", () => {
  const shortcuts = getAllKeyboardShortcuts();
  const _ = shortcuts.size;
}));

// Benchmark: Find shortcut by action
results.push(benchmark("Find shortcut by action", () => {
  findShortcutByAction("open-search");
}));

// Benchmark: Normalize keys (100 iterations)
results.push(benchmark("Normalize keys (100x)", () => {
  const keys = [
    "Cmd/Ctrl + K",
    "CmdOrCtrl + S",
    "Alt + F4",
    "Shift + Tab",
    "Cmd/Ctrl + Shift + E",
  ];
  for (let i = 0; i < 100; i++) {
    keys.forEach((key) => {
      normalizeKey(key, "mac");
      normalizeKey(key, "windows");
    });
  }
}, ITERATIONS / 10));

// Benchmark: Build shortcut map
results.push(benchmark("Build shortcut map", () => {
  const shortcuts: Array<{ key: string; action: string; category: string }> = [];
  const { keyboard } = shortcutsConfig;

  for (const [category, bindings] of Object.entries(keyboard)) {
    for (const [key, binding] of Object.entries(bindings as Record<string, ShortcutBinding>)) {
      shortcuts.push({
        key,
        action: binding.action,
        category,
      });
    }
  }
}));

// Benchmark: Conflict detection (small)
results.push(benchmark("Conflict detection (10 shortcuts)", () => {
  const shortcuts = generateMockShortcuts(10);
  const keyMap = new Map<string, string[]>();

  Object.entries(shortcuts).forEach(([key, binding]) => {
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(binding.action);
  });

  const conflicts: Array<{ key: string; actions: string[] }> = [];
  keyMap.forEach((actions, key) => {
    if (actions.length > 1) {
      conflicts.push({ key, actions });
    }
  });
}));

// Benchmark: Conflict detection (medium)
results.push(benchmark("Conflict detection (100 shortcuts)", () => {
  const shortcuts = generateMockShortcuts(100);
  const keyMap = new Map<string, string[]>();

  Object.entries(shortcuts).forEach(([key, binding]) => {
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(binding.action);
  });

  const conflicts: Array<{ key: string; actions: string[] }> = [];
  keyMap.forEach((actions, key) => {
    if (actions.length > 1) {
      conflicts.push({ key, actions });
    }
  });
}, ITERATIONS / 10));

// Benchmark: Conflict detection (large)
results.push(benchmark("Conflict detection (1000 shortcuts)", () => {
  const shortcuts = generateMockShortcuts(1000);
  const keyMap = new Map<string, string[]>();

  Object.entries(shortcuts).forEach(([key, binding]) => {
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(binding.action);
  });

  const conflicts: Array<{ key: string; actions: string[] }> = [];
  keyMap.forEach((actions, key) => {
    if (actions.length > 1) {
      conflicts.push({ key, actions });
    }
  });
}, ITERATIONS / 100));

// Benchmark: Serialize to JSON
results.push(benchmark("Serialize shortcuts to JSON", () => {
  const shortcuts = {
    global: shortcutsConfig.keyboard.global,
    tabs: shortcutsConfig.keyboard.tabs,
  };
  JSON.stringify(shortcuts);
}));

// Benchmark: Parse from JSON
results.push(benchmark("Parse shortcuts from JSON", () => {
  const shortcuts = {
    global: shortcutsConfig.keyboard.global,
    tabs: shortcutsConfig.keyboard.tabs,
  };
  const json = JSON.stringify(shortcuts);
  JSON.parse(json);
}));

// Benchmark: Search filter
results.push(benchmark("Filter shortcuts by search", () => {
  const searchQuery = "search";
  const { keyboard } = shortcutsConfig;
  const filtered: Record<string, Record<string, ShortcutBinding>> = {};

  Object.entries(keyboard).forEach(([category, bindings]) => {
    const filteredBindings: Record<string, ShortcutBinding> = {};
    Object.entries(bindings as Record<string, ShortcutBinding>).forEach(([key, binding]) => {
      if (
        binding.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        binding.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        filteredBindings[key] = binding;
      }
    });
    if (Object.keys(filteredBindings).length > 0) {
      filtered[category] = filteredBindings;
    }
  });
}));

// ============================================
// Output Results
// ============================================

console.log("\n📊 Results:\n");

// Sort by ops/sec descending
results.sort((a, b) => b.opsPerSec - a.opsPerSec);

// Format output using Bun.inspect.table
const tableData = results.map((r, i) => ({
  "#": i + 1,
  "Benchmark": r.name,
  "Iterations": r.iterations.toLocaleString(),
  "Total (ms)": r.totalMs.toFixed(2),
  "Avg (ns)": r.avgNs.toFixed(0),
  "Ops/sec": r.opsPerSec.toLocaleString(),
}));

console.log(Bun.inspect.table(tableData, { colors: true }));

// Summary stats
const fastestOps = Math.max(...results.map(r => r.opsPerSec));
const slowestOps = Math.min(...results.map(r => r.opsPerSec));
const avgOps = Math.floor(results.reduce((sum, r) => sum + r.opsPerSec, 0) / results.length);

console.log("\n📈 Summary:");
console.log(`  Fastest:  ${fastestOps.toLocaleString()} ops/sec`);
console.log(`  Slowest:  ${slowestOps.toLocaleString()} ops/sec`);
console.log(`  Average:  ${avgOps.toLocaleString()} ops/sec`);

// Performance assertions
console.log("\n✅ Performance Assertions:");

const configLoad = results.find(r => r.name === "Load shortcuts config");
if (configLoad && configLoad.avgNs < 1000) {
  console.log(`  ✓ Config load: ${configLoad.avgNs.toFixed(0)}ns < 1000ns`);
} else {
  console.log(`  ✗ Config load too slow: ${configLoad?.avgNs.toFixed(0)}ns`);
}

const conflictSmall = results.find(r => r.name === "Conflict detection (10 shortcuts)");
if (conflictSmall && conflictSmall.opsPerSec > 100_000) {
  console.log(`  ✓ Small conflict detection: ${conflictSmall.opsPerSec.toLocaleString()} ops/sec > 100K`);
} else {
  console.log(`  ✗ Small conflict detection too slow: ${conflictSmall?.opsPerSec.toLocaleString()} ops/sec`);
}

const conflictLarge = results.find(r => r.name === "Conflict detection (1000 shortcuts)");
if (conflictLarge && conflictLarge.opsPerSec > 1_000) {
  console.log(`  ✓ Large conflict detection: ${conflictLarge.opsPerSec.toLocaleString()} ops/sec > 1K`);
} else {
  console.log(`  ✗ Large conflict detection too slow: ${conflictLarge?.opsPerSec.toLocaleString()} ops/sec`);
}

console.log("\n" + "=".repeat(70));
console.log("Benchmark complete.\n");
