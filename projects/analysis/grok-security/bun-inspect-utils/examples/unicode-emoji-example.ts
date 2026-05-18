/**
 * [EXAMPLE][UNICODE][EMOJI][BUN-1.3+]{BUN-NATIVE}
 * Demonstrates improved Bun.stringWidth() with Unicode and emoji support
 * Bun 1.3+ features:
 * - Zero-width character support (soft hyphens, word joiners, etc.)
 * - Grapheme-aware emoji width (flags, skin tones, ZWJ sequences)
 * - Improved ANSI escape sequence handling
 */

import {
  calculateColumnWidths,
  enforceTable,
  aiSuggestColumns,
  aiSuggestCommonColumns,
  unicodeSafeWidth,
  type TableRow,
} from "../src/utils/table-utils";

// Example 1: International data with emoji flags
console.info("=== Example 1: International Data with Emoji Flags ===");
const internationalData = [
  {
    id: "1",
    country: "🇺🇸 United States",
    status: "✅ Active",
    region: "North America",
  },
  {
    id: "2",
    country: "🇬🇧 United Kingdom",
    status: "✅ Active",
    region: "Europe",
  },
  {
    id: "3",
    country: "🇯🇵 Japan",
    status: "✅ Active",
    region: "Asia",
  },
];

const intlColumns = ["id", "country", "status", "region"];
const intlWidths = calculateColumnWidths(internationalData, intlColumns);
console.info("Column widths with emoji flags:");
for (const [col, width] of intlWidths) {
  console.info(`  ${col}: ${width} chars`);
}

// Example 2: Emoji with skin tone modifiers
console.info("\n=== Example 2: Emoji with Skin Tone Modifiers ===");
const emojiData = [
  {
    id: "1",
    name: "Alice",
    gesture: "👋🏽",
    status: "active",
    team: "Engineering",
  },
  {
    id: "2",
    name: "Bob",
    gesture: "👍🏿",
    status: "active",
    team: "Design",
  },
];

const emojiColumns = ["id", "name", "gesture", "status", "team"];
const emojiWidths = calculateColumnWidths(emojiData, emojiColumns);
console.info("Column widths with skin tone emoji:");
for (const [col, width] of emojiWidths) {
  console.info(`  ${col}: ${width} chars`);
}

// Example 3: ZWJ sequences (family, professions)
console.info("\n=== Example 3: ZWJ Sequences ===");
const zwjData = [
  {
    id: "1",
    role: "👨‍💻",
    name: "Developer",
    status: "active",
  },
  {
    id: "2",
    role: "👩‍⚕️",
    name: "Doctor",
    status: "active",
  },
  {
    id: "3",
    role: "👨‍👩‍👧",
    name: "Family",
    status: "active",
  },
];

const zwjColumns = ["id", "role", "name", "status"];
const zwjWidths = calculateColumnWidths(zwjData, zwjColumns);
console.info("Column widths with ZWJ sequences:");
for (const [col, width] of zwjWidths) {
  console.info(`  ${col}: ${width} chars`);
}

// Example 4: Zero-width characters (soft hyphens, word joiners)
console.info("\n=== Example 4: Zero-Width Characters ===");
const zeroWidthData = [
  {
    id: "1",
    text: "hello\u2060world",
    description: "word joiner",
  },
  {
    id: "2",
    text: "hello\u00ADworld",
    description: "soft hyphen",
  },
];

const zwColumns = ["id", "text", "description"];
const zwWidths = calculateColumnWidths(zeroWidthData, zwColumns);
console.info("Column widths with zero-width characters:");
for (const [col, width] of zwWidths) {
  console.info(`  ${col}: ${width} chars`);
}

// Example 5: Multi-row analysis with aiSuggestCommonColumns
console.info("\n=== Example 5: Multi-Row Common Column Detection ===");
const diverseData: TableRow[] = [
  { id: "1", name: "🇺🇸 Alice", score: 95, status: "👨‍👩‍👧 active" },
  { id: "2", name: "🇯🇵 Bob", score: 87, tags: ["vip🌟"] }, // No status
  { id: "3", name: "Charlie🏻", score: 99 }, // No status or tags
];

console.info("Sample data with different structures:");
console.info("Row 1: id, name, score, status");
console.info("Row 2: id, name, score, tags (no status)");
console.info("Row 3: id, name, score (no status or tags)");

console.info("\nSingle sample (aiSuggestColumns):", aiSuggestColumns(diverseData[0]));
console.info("Common across ALL rows (aiSuggestCommonColumns):", aiSuggestCommonColumns(diverseData));

// Example 6: Direct unicodeSafeWidth demo
console.info("\n=== Example 6: unicodeSafeWidth Direct Usage ===");
console.info(`unicodeSafeWidth("🇺🇸") = ${unicodeSafeWidth("🇺🇸")} (flag emoji)`);
console.info(`unicodeSafeWidth("👋🏽") = ${unicodeSafeWidth("👋🏽")} (skin tone)`);
console.info(`unicodeSafeWidth("👨‍👩‍👧") = ${unicodeSafeWidth("👨‍👩‍👧")} (ZWJ sequence)`);
console.info(`unicodeSafeWidth("hello\\u2060world") = ${unicodeSafeWidth("hello\u2060world")} (word joiner)`);

console.info("\n✅ All examples completed successfully!");
console.info("Bun 1.3+ improvements enable accurate width calculation for:");
console.info("  • Flag emoji (🇺🇸, 🇬🇧, etc.)");
console.info("  • Emoji with skin tone modifiers (👋🏽, 👍🏿, etc.)");
console.info("  • ZWJ sequences (👨‍💻, 👩‍⚕️, 👨‍👩‍👧, etc.)");
console.info("  • Zero-width characters (soft hyphens, word joiners, etc.)");
console.info("  • ANSI escape sequences (colors, formatting, etc.)");
console.info("  • S3 export with contentDisposition support!");

