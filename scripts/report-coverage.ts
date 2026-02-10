#!/usr/bin/env bun

import { parseArg, expandGlobs, parseLcovFiles } from "./coverage-utils";

const args = process.argv.slice(2);
const inputPattern = parseArg("--input", args, "coverage/**/lcov.info");
const outputPath = parseArg("--output", args, "coverage-total.html");
const threshold = Number.parseFloat(parseArg("--threshold", args, "80")) || 80;

const files = await expandGlobs([inputPattern]);
if (files.length === 0) {
  console.error(`No coverage files matched: ${inputPattern}`);
  process.exit(1);
}

const coverage = await parseLcovFiles(files);
const status = coverage.totals.lineCoverage >= threshold ? "PASS" : "FAIL";

const rows = coverage.files
  .map((f) => {
    const cls = f.lineCoverage >= threshold ? "ok" : "bad";
    return `<tr><td>${escape(f.file)}</td><td>${f.linesHit}/${f.linesFound}</td><td class="${cls}">${f.lineCoverage.toFixed(2)}%</td></tr>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Coverage Report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .ok { color: #0a7a22; font-weight: 600; }
    .bad { color: #b42318; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  <p>Status: <strong class="${status === "PASS" ? "ok" : "bad"}">${status}</strong></p>
  <p>Threshold: ${threshold.toFixed(2)}%</p>
  <p>Total: ${coverage.totals.linesHit}/${coverage.totals.linesFound} (${coverage.totals.lineCoverage.toFixed(2)}%) across ${coverage.totals.files} files</p>
  <table>
    <thead><tr><th>File</th><th>Lines</th><th>Coverage</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

await Bun.write(outputPath, html);
console.log(`Wrote ${outputPath}`);
console.log(`Coverage ${coverage.totals.lineCoverage.toFixed(2)}% (threshold ${threshold.toFixed(2)}%)`);
process.exit(status === "PASS" ? 0 : 1);

function escape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
