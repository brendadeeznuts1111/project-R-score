// markdown-api.ts — Bun.markdown API demonstration
// Feature #18 — Existing since Bun 1.3.0, perf improved in 1.3.9 (#15-16)
//
// Three methods: html, render, react
//
// Run: bun run examples/markdown-api.ts

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

// react — returns VDOM object
const vdom = Bun.markdown.react("# Hello");
check("react returns object", vdom, v => typeof v === "object" && v !== null);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
