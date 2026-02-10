#!/usr/bin/env bun

import { expandGlobs, groupByComponent, parseArg, parseLcovFiles } from "./coverage-utils";

const args = process.argv.slice(2);
const inputPattern = parseArg("--input", args, "coverage/**/lcov.info");
const min = Number.parseFloat(parseArg("--min", args, "80")) || 80;
const excludeRaw = parseArg("--exclude", args, "");
const excludePatterns = excludeRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace("*", ""));

const files = await expandGlobs([inputPattern]);
if (files.length === 0) {
  console.error(JSON.stringify({ error: `No coverage files matched: ${inputPattern}` }, null, 2));
  process.exit(1);
}

const coverage = await parseLcovFiles(files);
const components = groupByComponent(coverage.files, excludePatterns);
const failing = components.filter((c) => c.coverage < min);

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      threshold: min,
      inputPattern,
      excluded: excludePatterns,
      summary: {
        components: components.length,
        belowThreshold: failing.length,
      },
      components,
    },
    null,
    2
  )
);

process.exit(failing.length === 0 ? 0 : 1);
