#!/usr/bin/env bun

import { expandGlobs, groupByComponent, parseArg, parseLcovFiles } from "./coverage-utils";

const args = process.argv.slice(2);
const inputPattern = parseArg("--input", args, "coverage/**/lcov.info");
const target = Number.parseFloat(parseArg("--target", args, "90")) || 90;
const deadline = parseArg("--deadline", args, "2026-03-31");
const excludeRaw = parseArg("--exclude", args, "beta/");
const excludePatterns = excludeRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace("*", ""));

const files = await expandGlobs([inputPattern]);
if (files.length === 0) {
  console.error(`No coverage files matched: ${inputPattern}`);
  process.exit(1);
}

const coverage = await parseLcovFiles(files);
const components = groupByComponent(coverage.files, excludePatterns);
const needsWork = components.filter((c) => c.coverage < target).sort((a, b) => a.coverage - b.coverage);

const lines = [
  "# Coverage Improvement Plan",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Target: ${target.toFixed(2)}%`,
  `Deadline: ${deadline}`,
  "",
  "## Summary",
  `- Components analyzed: ${components.length}`,
  `- Components below target: ${needsWork.length}`,
  "",
  "## Priority Backlog",
];

if (needsWork.length === 0) {
  lines.push("- All components meet target.");
} else {
  for (const item of needsWork) {
    const gap = (target - item.coverage).toFixed(2);
    lines.push(`- ${item.component}: ${item.coverage.toFixed(2)}% (gap ${gap}%)`);
  }
}

lines.push("", "## Execution Steps");
lines.push("- Add tests for uncovered branches in lowest-coverage components first.");
lines.push("- Prioritize error-handling and boundary-condition tests.");
lines.push("- Re-run coverage and close gaps until all components meet target.");
lines.push("- Lock each improved slice with a focused commit.");

console.log(lines.join("\n"));
