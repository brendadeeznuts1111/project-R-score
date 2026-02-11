#!/usr/bin/env bun

type Row = {
  id: "markdown-simd" | "react-markdown-cache" | "abort-signal-optimize";
  iterations: number;
  elapsedMs: number;
  opsPerSec: number;
};

function parseFocus(): string {
  const hit = Bun.argv.find((arg) => arg.startsWith("--focus="));
  return hit ? hit.split("=")[1] : "";
}

function runBench(id: Row["id"], iterations: number, fn: () => void): Row {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedMs = Math.max(0.001, performance.now() - start);
  return {
    id,
    iterations,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    opsPerSec: Math.round((iterations / elapsedMs) * 1000),
  };
}

const markdownInput = `# Title\n\nWorld & <script>${"x".repeat(4096)}`;
const focus = parseFocus();
const rows: Row[] = [];

if (!focus || focus === "markdown-simd") {
  rows.push(runBench("markdown-simd", 75_000, () => {
    Bun.markdown.html(markdownInput);
  }));
}
if (!focus || focus === "react-markdown-cache") {
  rows.push(runBench("react-markdown-cache", 75_000, () => {
    Bun.markdown.react(markdownInput);
  }));
}
if (!focus || focus === "abort-signal-optimize") {
  rows.push(runBench("abort-signal-optimize", 1_000_000, () => {
    const controller = new AbortController();
    controller.abort();
  }));
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

