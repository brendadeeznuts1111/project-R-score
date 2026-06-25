#!/usr/bin/env bun
// enhanced-table-demo.ts - Complete demonstration of EnhancedTable capabilities

import { EnhancedTable } from "./EnhancedTable";

console.info("🎯 EnhancedTable Advanced Features Demo");
console.info("=====================================");

// 1. Basic Table Demo
console.info("\n📊 1. Basic Table Demo:");

const basicData = [
  { id: "user1", name: "Alice", score: 95, active: true },
  { id: "user2", name: "Bob", score: 87, active: true },
  { id: "user3", name: "Charlie", score: 92, active: false },
];

console.info(
  EnhancedTable.table(basicData, ["id", "name", "score", "active"], {
    borderStyle: "rounded",
    headerColor: { h: 200, s: 70, l: 45 },
    borderColor: { h: 210, s: 15, l: 50 },
    showRowNumbers: true,
    artStyle: "simple",
  })
);

// 2. 13-byte Table Demo
console.info("\n🔢 2. 13-byte Optimized Table Demo:");
console.info(
  EnhancedTable.table13([42, "hello", true, 3.14159, "world"], {
    showBits: true,
    showHex: true,
    visual: true,
    compress: false,
  })
);

// 3. Performance Matrix Demo
console.info("\n⚡ 3. Performance Matrix Demo:");

const metrics = [
  { operation: "API Call", time: "45ms", ops: "1000/s", status: "✅ Success" },
  { operation: "DB Query", time: "120ms", ops: "500/s", status: "⚠️ Warning" },
  { operation: "File I/O", time: "600ms", ops: "100/s", status: "❌ Error" },
  { operation: "Cache Hit", time: "2ms", ops: "5000/s", status: "✅ Success" },
  { operation: "Network", time: "250ms", ops: "200/s", status: "⚠️ Warning" },
];

console.info(
  EnhancedTable.performanceMatrix(metrics, {
    warning: 100,
    critical: 500,
  })
);

// 4. Tree Table Demo
console.info("\n🌳 4. Tree Structure Demo:");

const treeData = [
  {
    name: "src",
    type: "folder",
    size: "2.4KB",
    children: [
      { name: "index.ts", type: "file", size: "245B" },
      { name: "config.json", type: "config", size: "128B" },
      {
        name: "components",
        type: "folder",
        size: "1.8KB",
        children: [
          { name: "Header.tsx", type: "file", size: "892B" },
          { name: "Footer.tsx", type: "file", size: "756B" },
        ],
      },
    ],
  },
  { name: "README.md", type: "file", size: "3.4KB" },
  { name: "package.json", type: "config", size: "567B" },
];

console.info(
  EnhancedTable.treeTable(treeData, {
    showIcons: true,
    indentSize: 2,
    colorByType: true,
  })
);

// 5. Progress Table Demo
console.info("\n📈 5. Progress Tracking Demo:");

const progressData = [
  { name: "File Upload", current: 75, total: 100, status: "running" as const },
  {
    name: "Database Backup",
    current: 100,
    total: 100,
    status: "completed" as const,
  },
  {
    name: "Image Processing",
    current: 25,
    total: 100,
    status: "pending" as const,
  },
  { name: "API Sync", current: 0, total: 100, status: "failed" as const },
  { name: "Cache Clear", current: 60, total: 100, status: "running" as const },
];

console.info(
  EnhancedTable.progressTable(progressData, {
    showPercentage: true,
    showBar: true,
    width: 20,
  })
);

// 6. Different Border Styles Demo
console.info("\n🎨 6. Border Styles Demo:");

const styleData = [
  { style: "single", description: "Basic Unicode borders" },
  { style: "double", description: "Bold Unicode borders" },
  { style: "rounded", description: "Rounded corner borders" },
  { style: "bold", description: "Heavy Unicode borders" },
  { style: "minimal", description: "Minimal borders" },
  { style: "ascii", description: "ASCII character borders" },
];

const borderStyles: Array<
  "single" | "double" | "rounded" | "bold" | "minimal" | "ascii"
> = ["single", "double", "rounded", "bold", "minimal", "ascii"];

borderStyles.forEach((borderStyle, index) => {
  console.info(`\n${borderStyle.toUpperCase()} Style:`);
  console.info(
    EnhancedTable.table([styleData[index]], ["style", "description"], {
      borderStyle,
      headerColor: { h: 200, s: 70, l: 45 },
      borderColor: { h: 210, s: 15, l: 50 },
      showRowNumbers: false,
      compact: true,
    })
  );
});

// 7. Color Themes Demo
console.info("\n🌈 7. Color Themes Demo:");

const colorData = [
  { name: "Success", value: 100, status: "✅" },
  { name: "Warning", value: 50, status: "⚠️" },
  { name: "Error", value: 0, status: "❌" },
  { name: "Info", value: 75, status: "ℹ️" },
];

console.info("Green Theme (Success):");
console.info(
  EnhancedTable.table(colorData, ["name", "value", "status"], {
    borderStyle: "single",
    borderColor: { h: 120, s: 70, l: 45 },
    headerColor: { h: 120, s: 80, l: 50 },
    rowColors: [{ h: 120, s: 60, l: 55 }],
    showRowNumbers: false,
  })
);

console.info("\nBlue Theme (Info):");
console.info(
  EnhancedTable.table(colorData, ["name", "value", "status"], {
    borderStyle: "single",
    borderColor: { h: 210, s: 70, l: 45 },
    headerColor: { h: 210, s: 80, l: 50 },
    rowColors: [{ h: 210, s: 60, l: 55 }],
    showRowNumbers: false,
  })
);

console.info("\nRed Theme (Error):");
console.info(
  EnhancedTable.table(colorData, ["name", "value", "status"], {
    borderStyle: "single",
    borderColor: { h: 0, s: 70, l: 45 },
    headerColor: { h: 0, s: 80, l: 50 },
    rowColors: [{ h: 0, s: 60, l: 55 }],
    showRowNumbers: false,
  })
);

// 8. Advanced Alignment Demo
console.info("\n📐 8. Text Alignment Demo:");

const alignmentData = [
  { left: "Left-aligned", center: "Center", right: "Right", number: 42.5 },
  {
    left: "Short",
    center: "Middle-length",
    right: "Very long text",
    number: 3.14159,
  },
  { left: "A", center: "B", right: "C", number: 1000 },
];

console.info(
  EnhancedTable.table(alignmentData, ["left", "center", "right", "number"], {
    borderStyle: "double",
    headerColor: { h: 280, s: 70, l: 45 },
    borderColor: { h: 280, s: 15, l: 50 },
    align: {
      left: "left",
      center: "center",
      right: "right",
      number: "right",
    },
    showRowNumbers: false,
    artStyle: "detailed",
  })
);

// 9. Unicode Art Styles Demo
console.info("\n🎭 9. Unicode Art Styles Demo:");

const artData = [
  { feature: "Tables", count: 100, status: "✅ Complete" },
  { feature: "Colors", count: 256, status: "✅ Complete" },
  { feature: "Borders", count: 6, status: "✅ Complete" },
  { feature: "Progress", count: 1, status: "✅ Complete" },
];

console.info("Simple Art Style:");
console.info(
  EnhancedTable.table(artData, ["feature", "count", "status"], {
    borderStyle: "rounded",
    headerColor: { h: 200, s: 70, l: 45 },
    borderColor: { h: 45, s: 15, l: 50 },
    showRowNumbers: false,
    artStyle: "simple",
  })
);

console.info("\nDetailed Art Style:");
console.info(
  EnhancedTable.table(artData, ["feature", "count", "status"], {
    borderStyle: "double",
    headerColor: { h: 200, s: 70, l: 45 },
    borderColor: { h: 45, s: 15, l: 50 },
    showRowNumbers: false,
    artStyle: "detailed",
  })
);

console.info("\nBlock Art Style:");
console.info(
  EnhancedTable.table(artData, ["feature", "count", "status"], {
    borderStyle: "bold",
    headerColor: { h: 200, s: 70, l: 45 },
    borderColor: { h: 45, s: 15, l: 50 },
    showRowNumbers: false,
    artStyle: "block",
  })
);

console.info("\n🎉 EnhancedTable Demo Complete!");
console.info("=====================================");
console.info("Features demonstrated:");
console.info("✅ Basic table formatting");
console.info("✅ 13-byte optimization");
console.info("✅ Performance matrices");
console.info("✅ Tree structures");
console.info("✅ Progress tracking");
console.info("✅ Multiple border styles");
console.info("✅ Color themes");
console.info("✅ Text alignment");
console.info("✅ Unicode art styles");
console.info("✅ HSL color system");
