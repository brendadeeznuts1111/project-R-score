// stringwidth.ts — Thai/Lao spacing vowel width verification
// Feature #22 — PR #26728 — Fix in Bun 1.3.9
//
// Thai and Lao spacing vowels now correctly report width 1 (were 0 before).
// Combining marks still correctly report 0.
//
// Run: bun run examples/stringwidth.ts

const cases: [string, string, number][] = [
  // Thai spacing vowels — should be width 1
  ["\u0E30", "Thai Sara A", 1],
  ["\u0E32", "Thai Sara Aa", 1],
  ["\u0E33", "Thai Sara Am", 1],
  ["\u0E40", "Thai Sara E", 1],
  ["\u0E41", "Thai Sara Ae", 1],
  ["\u0E42", "Thai Sara O", 1],

  // Lao spacing vowels — should be width 1
  ["\u0EB0", "Lao Sara A", 1],
  ["\u0EB2", "Lao Sara Aa", 1],

  // Combining marks — should be width 0
  ["\u0E31", "Thai Mai Han Akat (combining)", 0],
  ["\u0E34", "Thai Sara I (combining)", 0],

  // Latin / CJK baselines
  ["A", "Latin A", 1],
  ["\u4E16", "CJK \u4E16 (fullwidth)", 2],
];

let pass = 0;
let fail = 0;

for (const [char, label, expected] of cases) {
  // @ts-ignore — Bun.stringWidth exists at runtime
  const width = Bun.stringWidth(char);
  const ok = width === expected;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label} (U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}): width=${width}${ok ? "" : ` (expected ${expected})`}`);
  ok ? pass++ : fail++;
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
