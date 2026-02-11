#!/usr/bin/env bun

import { buildBundleAnalysis, parseArg } from "./lib/bundle-analysis";

const DEFAULT_ENTRY = "scratch/bun-v1.3.9-examples/playground-web/server.ts";
const DEFAULT_OUTPUT = "reports/bundle-analysis.md";

function formatTableRows(rows: Array<{ path: string; bytes: number }>, limit: number): string {
  if (rows.length === 0) return "| (none) | 0 |\n";
  return rows.slice(0, limit).map((row) => `| \`${row.path}\` | ${row.bytes} |`).join("\n") + "\n";
}

async function main() {
  const entry = parseArg("entry", DEFAULT_ENTRY);
  const output = parseArg("output", DEFAULT_OUTPUT);
  const analysis = await buildBundleAnalysis(entry);

  const markdown = [
    "# Bundle Analysis Report",
    "",
    `- Generated: \`${analysis.generatedAt}\``,
    `- Source: \`${analysis.source}\``,
    `- Entrypoint: \`${analysis.entrypoint}\``,
    "",
    "## Summary",
    "",
    `- Input files: ${analysis.summary.inputCount}`,
    `- Output files: ${analysis.summary.outputCount}`,
    `- Input bytes: ${analysis.summary.inputBytes}`,
    `- Output bytes: ${analysis.summary.outputBytes}`,
    `- Compression ratio: ${analysis.summary.compressionRatio}`,
    `- External dependencies: ${analysis.summary.externalDependencyCount}`,
    "",
    "## Largest Inputs",
    "",
    "| Path | Bytes |",
    "| --- | ---: |",
    formatTableRows(analysis.largestInputs, 10),
    "## Largest Outputs",
    "",
    "| Path | Bytes |",
    "| --- | ---: |",
    formatTableRows(analysis.largestOutputs, 10),
    "## External Dependencies",
    "",
    ...(analysis.externalDependencies.length > 0
      ? analysis.externalDependencies.map((dep) => `- \`${dep}\``)
      : ["- (none)"]),
    "",
  ].join("\n");

  await Bun.write(output, markdown);
  console.log(JSON.stringify({ ok: true, output, entrypoint: analysis.entrypoint }, null, 2));
}

await main();
