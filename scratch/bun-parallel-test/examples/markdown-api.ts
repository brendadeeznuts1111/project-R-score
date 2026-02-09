// markdown-api.ts — Bun.markdown API + SIMD/caching perf benchmarks
// Feature #18 — API existing since Bun 1.3.0
// Features #15-16 — Perf improvements in Bun 1.3.9:
//   - SIMD-accelerated scanning for HTML escape chars (&, <, >, ")
//   - Cached HTML tag strings in react() renderer (div, p, h1-h6)
//
// Run: bun run examples/markdown-api.ts

// ── API correctness checks ──────────────────────────────────────────

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, test: (v: any) => boolean) {
  const ok = test(actual);
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label}: ${JSON.stringify(actual).slice(0, 80)}`);
  ok ? pass++ : fail++;
}

// html — returns HTML string
const html = Bun.markdown.html("# Hello **world**");
check("html returns string", html, v => typeof v === "string");
check("html contains <h1>", html, v => v.includes("<h1>"));
check("html contains <strong>", html, v => v.includes("<strong>"));

// render — returns plain text (strips markup)
const text = Bun.markdown.render("**bold** _italic_");
check("render returns string", text, v => typeof v === "string");
check("render strips markup", text, v => v === "bold italic");

// react — returns VDOM object
const vdom = Bun.markdown.react("# Hello");
check("react returns object", vdom, v => typeof v === "object" && v !== null);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);

// ── SIMD + caching performance benchmarks ───────────────────────────

console.log("\n=== Markdown Performance Benchmarks ===\n");

// Small doc — few escape chars, benefits from SIMD scan + tag caching
const small = "# Hello **world**\n\nA short paragraph.";

// Medium doc — mixed content with some HTML-escapable chars
const medium = Array.from({ length: 20 }, (_, i) =>
  `## Section ${i + 1}\n\nParagraph with **bold**, _italic_, and \`code\`.\n\n` +
  `- Item A < Item B & Item C\n- "Quoted" text > other text\n`
).join("\n");

// Large doc — stress test for SIMD escape scanning (many safe bytes)
const large = Array.from({ length: 200 }, (_, i) =>
  `### Chapter ${i + 1}\n\n` +
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit. `.repeat(5) + "\n\n" +
  `Key point with a few special chars: x < y, a & b, "quoted".\n`
).join("\n");

const ITERS = 1_000;

function bench(label: string, input: string, fn: (s: string) => unknown) {
  // Warmup
  for (let i = 0; i < 50; i++) fn(input);

  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERS; i++) fn(input);
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  const perOp = (elapsed / ITERS * 1000).toFixed(2);
  console.log(`${label.padEnd(40)} ${ITERS} ops in ${elapsed.toFixed(1)}ms (${perOp} us/op)`);
}

console.log(`Input sizes: small=${small.length} chars, medium=${medium.length} chars, large=${large.length} chars\n`);

console.log("Bun.markdown.html (SIMD escape scanning):");
bench("  small", small, s => Bun.markdown.html(s));
bench("  medium", medium, s => Bun.markdown.html(s));
bench("  large", large, s => Bun.markdown.html(s));

console.log("\nBun.markdown.react (cached tag strings):");
bench("  small", small, s => Bun.markdown.react(s));
bench("  medium", medium, s => Bun.markdown.react(s));
bench("  large", large, s => Bun.markdown.react(s));
