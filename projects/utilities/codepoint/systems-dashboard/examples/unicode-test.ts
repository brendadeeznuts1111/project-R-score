// examples/unicode-test.ts

import type { Config13Byte } from "../types/api.types";
import { UnicodeInspector } from "../utils/UnicodeInspector";

const inspector = new UnicodeInspector();

// Create sample config
const config: Config13Byte = {
  version: 1,
  registryHash: 305419896,
  featureFlags: 0b11111001,
  terminalMode: 2,
  rows: 48,
  cols: 80,
  reserved: 0,
};

// Test Unicode components
console.log("🎯 Unicode Inspector Test");
console.log("========================");

// Double box
console.log("\n📦 Double Box:");
console.log(inspector.createDoubleBox(30, 3, { h: 120, s: 70, l: 45 }));

// Status panel
console.log("📊 Status Panel:");
const statusItems = [
  { label: "Service", value: "OPERATIONAL", status: "success" as const },
  { label: "Cache", value: "47 entries", status: "info" as const },
  { label: "Hit Rate", value: "89.1%", status: "success" as const },
  { label: "Errors", value: "0", status: "success" as const },
];
console.log(
  inspector.createStatusPanel("System Status", statusItems, {
    h: 210,
    s: 15,
    l: 50,
  })
);

// Matrix table
console.log("📋 Matrix Table:");
const matrix = inspector.createMatrixTable(
  ["Operation", "Time", "Status"],
  [
    ["Score Calc", "23 ns", "✅"],
    ["Cache Hit", "<1 μs", "✅"],
    ["WebSocket", "500 μs", "⚡"],
  ],
  {
    headerColor: { h: 200, s: 70, l: 45 },
    rowColors: [
      { h: 120, s: 60, l: 45 },
      { h: 210, s: 60, l: 45 },
      { h: 45, s: 60, l: 45 },
    ],
    align: ["left", "right", "center"],
  }
);
console.log(matrix);

// Tree structure
console.log("🌳 Tree Structure:");
const tree = inspector.createTree(
  [
    {
      name: "ScoringSystem",
      value: "13 bytes",
      children: [
        { name: "ScoringService", value: "active" },
        { name: "CacheManager", value: "47 entries" },
        {
          name: "URLPatternRouter",
          value: "6 patterns",
          children: [
            { name: "score", value: "/api/score/:id" },
            { name: "batch", value: "/api/batch/:batchId" },
          ],
        },
      ],
    },
  ],
  { h: 280, s: 40, l: 50 }
);
console.log(tree);

// Progress bar
console.log("📈 Progress Bar:");
console.log(inspector.createProgressBar(75, 100));

console.log("\n✅ Unicode Inspector test completed!");
