// [1.2.2.1] ANSI Escape Code Handling Demo
// Bun.stringWidth with countAnsiEscapeCodes option (v1.3.5+)
// Zero-npm, dark-mode-first, Factory Wager monorepo

import { stringWidth, stringWidthDetailed } from "../src/utils/stringWidth";

console.log("\n🌑 [1.2.2.1] ANSI Escape Code Handling\n");

// [1.1.0.0] Basic ANSI sequences
const red = "\u001b[31mhello\u001b[0m"; // Red text
const green = "\u001b[32mworld\u001b[0m"; // Green text
const bold = "\u001b[1mbold\u001b[0m"; // Bold text

console.log("📊 Basic ANSI Sequences:");
console.log(`  Plain text: "${red}" → width=${stringWidth(red)}`);
console.log(`  With ANSI:  "${red}" → width=${stringWidth(red, { countAnsiEscapeCodes: true })}`);
console.log();

// [1.2.0.0] Complex sequences
const complex = "\u001b[1;32mGreen Bold\u001b[0m"; // Bold green
const nested = "\u001b[1m\u001b[32mNested\u001b[0m\u001b[0m"; // Nested codes

console.log("🎨 Complex ANSI Sequences:");
console.log(`  Complex: "${complex}"`);
console.log(`    → width (ignore ANSI): ${stringWidth(complex)}`);
console.log(`    → width (count ANSI):  ${stringWidth(complex, { countAnsiEscapeCodes: true })}`);
console.log();

// [1.3.0.0] Detailed metrics
const colored = "\u001b[36mCyan Text\u001b[0m";
const detailed = stringWidthDetailed(colored, { countAnsiEscapeCodes: true });

console.log("📈 Detailed Metrics (with ANSI counting):");
console.log(`  Text: "${colored}"`);
console.log(`  Metrics:`, {
  width: detailed.width,
  length: detailed.length,
  hasAnsi: detailed.hasAnsi,
  hasEmoji: detailed.hasEmoji,
});
console.log();

// [1.4.0.0] Table alignment with ANSI codes
const rows = [
  ["\u001b[1mID\u001b[0m", "\u001b[1mName\u001b[0m", "\u001b[1mStatus\u001b[0m"],
  ["\u001b[32m1\u001b[0m", "Alice", "\u001b[32m✓ Active\u001b[0m"],
  ["\u001b[31m2\u001b[0m", "Bob", "\u001b[31m✗ Inactive\u001b[0m"],
];

console.log("📋 Table with ANSI Codes (proper alignment):");
for (const row of rows) {
  const cells = row.map((cell) => {
    const w = stringWidth(cell); // Ignore ANSI for alignment
    const padding = Math.max(0, 12 - w);
    return cell + " ".repeat(padding);
  });
  console.log(`  ${cells.join(" | ")}`);
}
console.log();

// [1.5.0.0] Performance comparison
const testStr = "\u001b[1;32;40mPerformance Test\u001b[0m";
const iterations = 10000;

console.time("⚡ stringWidth (ignore ANSI)");
for (let i = 0; i < iterations; i++) {
  stringWidth(testStr);
}
console.timeEnd("⚡ stringWidth (ignore ANSI)");

console.time("⚡ stringWidth (count ANSI)");
for (let i = 0; i < iterations; i++) {
  stringWidth(testStr, { countAnsiEscapeCodes: true });
}
console.timeEnd("⚡ stringWidth (count ANSI)");

console.log("\n✅ Demo complete! [1.2.2.1] ANSI handling ready for production.\n");

