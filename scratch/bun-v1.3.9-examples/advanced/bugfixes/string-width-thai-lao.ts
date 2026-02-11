#!/usr/bin/env bun
/**
 * Bun.stringWidth – Thai and Lao spacing vowels fix
 *
 * Fixed: Thai SARA AA (U+0E32), SARA AM (U+0E33), and Lao equivalents
 * (U+0EB2, U+0EB3) are now reported as width 1 (spacing vowels), not zero-width.
 *
 * Example: Thai word "คำ" (word) correctly returns width 2 instead of 1.
 */

console.log("Bun.stringWidth – Thai & Lao spacing vowels\n");
console.log("=".repeat(60));

// Thai spacing vowels (fix: were 0, now 1)
const THAI_SARA_AA = "\u0E32"; // า
const THAI_SARA_AM = "\u0E33"; // ำ
// Lao equivalents
const LAO_SARA_AA = "\u0EB2"; // າ
const LAO_SARA_AM = "\u0EB3"; // ໍ

console.log("\nSingle spacing vowels (each should be width 1):");
console.log("  Thai SARA AA (U+0E32):", THAI_SARA_AA, "→ width", Bun.stringWidth(THAI_SARA_AA));
console.log("  Thai SARA AM (U+0E33):", THAI_SARA_AM, "→ width", Bun.stringWidth(THAI_SARA_AM));
console.log("  Lao  SARA AA (U+0EB2):", LAO_SARA_AA, "→ width", Bun.stringWidth(LAO_SARA_AA));
console.log("  Lao  SARA AM (U+0EB3):", LAO_SARA_AM, "→ width", Bun.stringWidth(LAO_SARA_AM));

// Common Thai word "คำ" (word) = ก (U+0E01) + ำ (U+0E33)
const thaiWord = "คำ";
console.log('\nThai word "คำ" (word):');
console.log("  string:", thaiWord);
console.log("  Bun.stringWidth:", Bun.stringWidth(thaiWord), "(expected: 2)");

// Another example: word with SARA AA
const thaiWord2 = "มา"; // ม (U+0E21) + า (U+0E32)
console.log('\nThai word "มา" (come):');
console.log("  string:", thaiWord2);
console.log("  Bun.stringWidth:", Bun.stringWidth(thaiWord2), "(expected: 2)");

const allCorrect =
  Bun.stringWidth(THAI_SARA_AA) === 1 &&
  Bun.stringWidth(THAI_SARA_AM) === 1 &&
  Bun.stringWidth(LAO_SARA_AA) === 1 &&
  Bun.stringWidth(LAO_SARA_AM) === 1 &&
  Bun.stringWidth(thaiWord) === 2 &&
  Bun.stringWidth(thaiWord2) === 2;

console.log("\n" + (allCorrect ? "✅ All widths match expected (fix applied)." : "❌ Unexpected widths (Bun may need update)."));
console.log("\nSee BUGFIXES-REFERENCE.md for full bugfix list.");
