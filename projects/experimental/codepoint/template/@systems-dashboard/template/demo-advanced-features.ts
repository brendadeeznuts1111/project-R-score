#!/usr/bin/env bun
// Advanced Bun Features Demonstration
// This script showcases string width calculations and feature flags

console.info("🚀 Advanced Bun Features Demonstration\n");

// Test 1: String Width Calculations
console.info("📏 String Width Tests:");
console.info("=".repeat(50));

const stringTests = [
  { text: "🇺🇸", description: "Flag emoji" },
  { text: "👋🏽", description: "Emoji with skin tone" },
  { text: "👨‍👩‍👧", description: "Family emoji (ZWJ sequence)" },
  { text: "\u2060", description: "Zero-width space" },
  { text: "\x1b[31mRed\x1b[0m", description: "ANSI colored text" },
  {
    text: "\x1b]8;;https://bun.sh\x07Bun\x1b]8;;\x07",
    description: "ANSI hyperlink",
  },
  { text: "Hello 🌍 World", description: "Mixed text with emoji" },
  { text: "e\u0301", description: "Combining character (e + acute)" },
];

stringTests.forEach(({ text, description }) => {
  const width = Bun.stringWidth(text);
  const visible = text
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\x1b\][0-9;]*;.+\x07/g, "");
  const visibleWidth = Bun.stringWidth(visible);

  console.info(`${description.padEnd(25)}: "${text}"`);
  console.info(`${"".padEnd(25)}   Width: ${width}, Visible: ${visibleWidth}`);
  console.info();
});

// Test 2: Table Creation with Proper Alignment
console.info("📊 Table with Unicode and ANSI:");
console.info("=".repeat(50));

const tableHeaders = ["Project", "Status", "Progress", "Notes"];
const tableRows = [
  ["🇺🇸 Project Alpha", "\x1b[32m✅ Active\x1b[0m", "75%", "On track"],
  ["👋🏽 Feature Beta", "\x1b[33m🔄 In Progress\x1b[0m", "45%", "Testing"],
  ["👨‍👩‍👧 Team Gamma", "\x1b[31m⏸️ Paused\x1b[0m", "90%", "Review"],
  ["🚀 Rocket Delta", "\x1b[34m📋 Planning\x1b[0m", "10%", "New"],
];

// Calculate column widths
const columnWidths = tableHeaders.map((header, i) => {
  const maxRowWidth = Math.max(
    ...tableRows.map((row) =>
      Bun.stringWidth(row[i]?.replace(/\x1b\[[0-9;]*m/g, "") || "")
    )
  );
  return Math.max(Bun.stringWidth(header), maxRowWidth);
});

// Create table
const createRow = (cells: string[], isHeader = false) => {
  return cells
    .map((cell, i) => {
      const cleanCell = cell.replace(/\x1b\[[0-9;]*m/g, "");
      const cellWidth = Bun.stringWidth(cleanCell);
      const padding = columnWidths[i] - cellWidth;
      return cell + " ".repeat(padding);
    })
    .join(" | ");
};

const headerRow = createRow(tableHeaders, true);
const separator = columnWidths.map((width) => "-".repeat(width)).join("-+-");
const dataRows = tableRows.map((row) => createRow(row));

console.info(headerRow);
console.info(separator);
dataRows.forEach((row) => console.info(row));
console.info();

// Test 3: Feature Flags Demonstration
console.info("🏷️ Feature Flags Demonstration:");
console.info("=".repeat(50));

// Create test code with feature flags
const featureTestCode = `
import { feature } from "bun:bundle";

console.info("🧪 Testing Feature Flags:");

if (feature("DEBUG")) {
  console.info("✅ DEBUG feature enabled");
} else {
  console.info("❌ DEBUG feature disabled");
}

if (feature("PERFORMANCE")) {
  console.info("✅ PERFORMANCE feature enabled");
} else {
  console.info("❌ PERFORMANCE feature disabled");
}

if (feature("EXPERIMENTAL")) {
  console.info("✅ EXPERIMENTAL feature enabled");
} else {
  console.info("❌ EXPERIMENTAL feature disabled");
}

console.info("🏁 Feature flag test completed");
`;

// Write test file
await Bun.write("feature-demo.ts", featureTestCode);

// Build with different feature combinations
const featureConfigs = [
  { name: "Debug Build", features: ["DEBUG"] },
  { name: "Performance Build", features: ["PERFORMANCE"] },
  { name: "Experimental Build", features: ["EXPERIMENTAL"] },
  { name: "Full Build", features: ["DEBUG", "PERFORMANCE", "EXPERIMENTAL"] },
];

for (const config of featureConfigs) {
  console.info(`\n🔨 Building ${config.name}:`);

  try {
    const buildResult = await Bun.build({
      entrypoints: ["feature-demo.ts"],
      outdir: "./feature-out",
      minify: true,
      features: config.features,
    });

    if (buildResult.success) {
      console.info(
        `✅ Build successful with features: ${config.features.join(", ")}`
      );

      // Run the built file
      const process = Bun.spawn(["bun", "./feature-out/feature-demo.js"]);
      await process.exited;
    } else {
      console.info(`❌ Build failed`);
    }
  } catch (error) {
    console.info(`❌ Build error: ${(error as Error).message}`);
  }
}

// Test 4: Advanced String Operations
console.info("\n🔧 Advanced String Operations:");
console.info("=".repeat(50));

// Text truncation with proper width handling
const longText =
  "This is a very long text with emojis 🇺🇸👋🏽 that needs truncation";
console.info(`Original: "${longText}"`);
console.info(`Width: ${Bun.stringWidth(longText)}`);

// Manual truncation demonstration
const maxWidth = 20;
let truncated = "";
let currentWidth = 0;

for (const char of longText) {
  const charWidth = Bun.stringWidth(char);
  if (currentWidth + charWidth > maxWidth) break;
  truncated += char;
  currentWidth += charWidth;
}

truncated += "...";
console.info(`Truncated: "${truncated}"`);
console.info(`Width: ${Bun.stringWidth(truncated)}`);

// Test 5: Color and Formatting Demo
console.info("\n🎨 Color and Formatting Demo:");
console.info("=".repeat(50));

const colors = [
  { name: "Red", code: "\x1b[31m" },
  { name: "Green", code: "\x1b[32m" },
  { name: "Yellow", code: "\x1b[33m" },
  { name: "Blue", code: "\x1b[34m" },
  { name: "Magenta", code: "\x1b[35m" },
  { name: "Cyan", code: "\x1b[36m" },
];

colors.forEach(({ name, code }) => {
  const text = `${code}${name} Text\x1b[0m`;
  console.info(`${name.padEnd(8)}: "${text}" (Width: ${Bun.stringWidth(text)})`);
});

// Hyperlink demo
const hyperlink = "\x1b]8;;https://bun.sh\x07🚀 Bun Documentation\x1b]8;;\x07";
console.info(`Hyperlink: "${hyperlink}" (Width: ${Bun.stringWidth(hyperlink)})`);

// Test 6: Performance Metrics
console.info("\n⚡ Performance Metrics:");
console.info("=".repeat(50));

const performanceTests = [
  {
    name: "Simple text",
    text: "Hello World",
    iterations: 10000,
  },
  {
    name: "Unicode text",
    text: "Hello 🌍 World 🇺🇸",
    iterations: 10000,
  },
  {
    name: "ANSI text",
    text: "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m",
    iterations: 10000,
  },
];

performanceTests.forEach(({ name, text, iterations }) => {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    Bun.stringWidth(text);
  }

  const end = performance.now();
  const duration = end - start;
  const avgTime = duration / iterations;

  console.info(
    `${name.padEnd(15)}: ${duration.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg (${iterations} iterations)`
  );
});

// Cleanup
console.info("\n🧹 Cleaning up...");
await Bun.write("feature-demo.ts", "");
await Bun.$`rm -rf feature-out`;

console.info("\n✅ Advanced Bun Features Demo Complete!");
console.info("\n📚 Features demonstrated:");
console.info("  • Bun.stringWidth() for Unicode and ANSI handling");
console.info("  • Feature flags with Bun.build()");
console.info("  • Table creation with proper alignment");
console.info("  • Text truncation with width awareness");
console.info("  • ANSI color codes and hyperlinks");
console.info("  • Performance optimization");
console.info("\n🚀 Try these commands in your template:");
console.info("  bun run advanced:string-width 'Hello 🌍'");
console.info("  bun run advanced:table");
console.info("  bun run advanced:features DEBUG PERFORMANCE");
console.info("  bun run build:debug");
console.info("  bun run build:experimental");
