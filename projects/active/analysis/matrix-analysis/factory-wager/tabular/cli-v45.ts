#!/usr/bin/env bun
// factory-wager/tabular/cli-v45.ts
// FactoryWager YAML-Native Tabular v4.5 - CLI with Validation and Inheritance Diff

import { file } from "bun";
import { YAMLTabularParserV45 } from "./parser-v45";
import { renderYAMLTableV45 } from "./renderer-v45";
import { InheritanceDiffAnalyzer, renderInheritanceDiff } from "./inheritance-diff";
import { InheritanceTracker, renderInheritanceChain, generateInheritanceReport } from "./inheritance-tracker";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("🎯 FactoryWager YAML-Native Tabular v4.5");
  console.error("Usage: bun run cli-v45.ts <yaml-file> [--validate] [--diff-inheritance] [--track-inheritance]");
  console.error("");
  console.error("Features:");
  console.error("  • 15-column Infrastructure Nexus integration");
  console.error("  • Smart truncation indicators");
  console.error("  • Document statistics and analysis");
  console.error("  • Enhanced visual guidance");
  console.error("  • Validation mode for error detection");
  console.error("  • Inheritance diff view for configuration evolution");
  console.error("  • Advanced inheritance chain tracking");
  process.exit(1);
}

const filepath = args[0];
const shouldValidate = args.includes('--validate');
const shouldDiffInheritance = args.includes('--diff-inheritance');
const shouldTrackInheritance = args.includes('--track-inheritance');

try {
  console.info(`🔍 FactoryWager YAML v4.5 • Parsing ${filepath}...`);

  const content = await file(filepath).text();
  const parser = new YAMLTabularParserV45();
  const { rows, stats } = parser.parseWithStats(content);

  // Inheritance diff mode
  if (shouldDiffInheritance) {
    const analyzer = new InheritanceDiffAnalyzer();
    const diff = analyzer.analyzeInheritanceDiff(rows);

    if (diff) {
      renderInheritanceDiff(diff);
    } else {
      console.info("⚠️ No inheritance patterns found for diff analysis");
      console.info("   Ensure your YAML has merge keys (<<: *anchor) with multiple environments");
    }
    process.exit(0);
  }

  // Inheritance tracking mode
  if (shouldTrackInheritance) {
    const tracker = new InheritanceTracker();
    const analysis = tracker.analyzeInheritanceChains(rows);

    if (analysis) {
      renderInheritanceChain(analysis);
      console.info("\n" + generateInheritanceReport(analysis));
    } else {
      console.info("⚠️ No inheritance patterns found for chain tracking");
      console.info("   Ensure your YAML has merge keys (<<: *anchor) with multiple environments");
    }
    process.exit(0);
  }

  // Validation mode
  if (shouldValidate) {
    const errors = rows.filter(r => r.jsType === 'error');
    const interpolated = rows.filter(r => r.interpolated);

    console.info(`\n${errors.length > 0 ? '❌' : '✅'} Validation: ${errors.length} errors, ${interpolated.length} interpolations`);

    if (errors.length > 0) {
      console.info("Errors:");
      errors.forEach(e => console.info(`  Line ${e._lineNumber}: ${e.value}`));
    }
  }

  renderYAMLTableV45(rows, stats);

} catch (error) {
  console.error(`❌ Error processing ${filepath}:`, error);
  process.exit(1);
}
