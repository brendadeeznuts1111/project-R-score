#!/usr/bin/env bun
// factory-wager/tabular/cli.ts
// FactoryWager YAML-Native Tabular v4.4 - CLI for Quick Checks

import { file } from "bun";
import { YAMLTabularParser } from "./parser";
import { renderYAMLTable, renderSummary } from "./renderer";
import { COLUMNS_V44 } from "./types";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.info("🎯 FactoryWager YAML-Native Tabular v4.4");
  console.info("Usage: bun run cli.ts <yaml-file> [--summary]");
  console.info("");
  console.info("Features:");
  console.info("  • Multi-document YAML support");
  console.info("  • Anchor/alias tracking & resolution");
  console.info("  • 12-column schema visualization");
  console.info("  • Environment interpolation detection");
  console.info("  • HSL chromatic terminal rendering");
  process.exit(1);
}

const filepath = args[0];
const showSummary = args.includes('--summary');

try {
  const content = await file(filepath).text();
  
  console.info(`🔍 Parsing ${filepath} with FactoryWager YAML v4.4...`);
  console.info(`📋 12-Column Schema: doc, key, value, yamlType, jsType, anchor, alias, version, bun, interp, author, status`);
  console.info("");

  const parser = new YAMLTabularParser();
  const rows = parser.parseMultiDoc(content);

  if (rows.length === 0) {
    console.info("❌ No YAML content found or parsing failed.");
    process.exit(1);
  }

  renderYAMLTable(rows, COLUMNS_V44);
  
  if (showSummary) {
    renderSummary(rows);
  }

  console.info(`✅ Successfully parsed ${rows.length} nodes across ${Math.max(...rows.map(r => r.docIndex)) + 1} documents.`);
  
} catch (error) {
  console.error(`❌ Error processing ${filepath}:`, error);
  process.exit(1);
}
