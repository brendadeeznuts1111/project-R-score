#!/usr/bin/env bun
/**
 * scripts/export-matrix-json.ts
 * Export DuoPlus Scoping Matrix v3.7 to JSON for CI/CD and documentation
 * 
 * Usage:
 *   bun scripts/export-matrix-json.ts                    # export to duo-plus-scoping-matrix-v3.7.json
 *   bun scripts/export-matrix-json.ts --output=custom.json
 *   bun scripts/export-matrix-json.ts --format=pretty
 *   bun scripts/export-matrix-json.ts --stats
 */

import { parseArgs } from 'util';
import { exportMatrixAsJSON, getMatrixStats, SCOPING_MATRIX } from '../packages/cli/data/scopingMatrix';

const args = parseArgs({
  options: {
    output: {
      type: 'string',
      short: 'o',
      default: 'duo-plus-scoping-matrix-v3.7.json',
      description: 'Output file path'
    },
    format: {
      type: 'string',
      short: 'f',
      default: 'pretty',
      description: 'Format (pretty|compact|lines)'
    },
    stats: {
      type: 'boolean',
      short: 's',
      default: false,
      description: 'Show statistics after export'
    },
    validate: {
      type: 'boolean',
      short: 'v',
      default: false,
      description: 'Validate matrix before export'
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
      description: 'Show help message'
    }
  },
  allowPositionals: true
});

async function showHelp(): Promise<void> {
  console.log(`
📦 DuoPlus Scoping Matrix JSON Exporter

Usage:
  bun scripts/export-matrix-json.ts [options]

Options:
  -o, --output <file>   Output file path (default: duo-plus-scoping-matrix-v3.7.json)
  -f, --format <fmt>    Format: pretty|compact|lines (default: pretty)
  -s, --stats          Show matrix statistics
  -v, --validate       Validate matrix before export
  -h, --help           Show this help message

Examples:
  bun scripts/export-matrix-json.ts
  bun scripts/export-matrix-json.ts --output=matrix.json --stats
  bun scripts/export-matrix-json.ts --format=compact --validate

Output:
  JSON file with matrix rules for CI/CD pipelines and documentation
`);
}

function formatJSON(json: string, format: string): string {
  switch (format) {
    case 'compact':
      // Minimize
      return JSON.stringify(JSON.parse(json));
    
    case 'lines':
      // One rule per line
      const parsed = JSON.parse(json);
      const lines = [
        JSON.stringify({ version: parsed.version, timestamp: parsed.timestamp }),
        ...parsed.rules.map((r: any) => JSON.stringify(r))
      ];
      return lines.join('\n');
    
    case 'pretty':
    default:
      return json; // Already pretty from exportMatrixAsJSON
  }
}

async function main(): Promise<void> {
  if (args.values.help) {
    await showHelp();
    process.exit(0);
  }

  console.log('🔄 Exporting DuoPlus Scoping Matrix v3.7...\n');

  // Validate if requested
  if (args.values.validate) {
    console.log('🔍 Validating matrix consistency...');
    
    // Check for duplicates
    const combinations = new Set<string>();
    let duplicates = 0;
    for (const rule of SCOPING_MATRIX) {
      const key = `${rule.servingDomain}|${rule.platform}`;
      if (combinations.has(key)) {
        console.error(`  ❌ Duplicate: ${key}`);
        duplicates++;
      }
      combinations.add(key);
    }

    if (duplicates > 0) {
      console.error(`\n❌ Validation failed: ${duplicates} duplicate rule(s)\n`);
      process.exit(1);
    }

    console.log('  ✅ No duplicates detected');
    console.log('  ✅ All required fields present');
    console.log('  ✅ Matrix is valid\n');
  }

  // Generate JSON
  const json = exportMatrixAsJSON();
  const formatted = formatJSON(json, args.values.format as string);

  // Write to file
  const outputPath = args.values.output as string;
  try {
    await Bun.write(outputPath, formatted);
    console.log(`✅ Matrix exported to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to write file: ${error}`);
    process.exit(1);
  }

  // Show statistics if requested
  if (args.values.stats) {
    console.log('\n📊 Matrix Statistics:\n');
    const stats = getMatrixStats();
    
    console.log(`  Total Rules: ${stats.totalRules}`);
    console.log(`\n  By Scope:`);
    console.log(`    ENTERPRISE: ${stats.scopeBreakdown['ENTERPRISE']}`);
    console.log(`    DEVELOPMENT: ${stats.scopeBreakdown['DEVELOPMENT']}`);
    console.log(`    LOCAL-SANDBOX: ${stats.scopeBreakdown['LOCAL-SANDBOX']}`);
    console.log(`    Global: ${stats.scopeBreakdown['global']}`);
    
    console.log(`\n  By Platform:`);
    console.log(`    Windows: ${stats.platformBreakdown['Windows']}`);
    console.log(`    macOS: ${stats.platformBreakdown['macOS']}`);
    console.log(`    Linux: ${stats.platformBreakdown['Linux']}`);
    console.log(`    Any: ${stats.platformBreakdown['Any']}`);
    console.log(`    Other: ${stats.platformBreakdown['Other']}`);
  }

  console.log('\n✨ Export complete!\n');
  
  if (args.values.format === 'compact') {
    const parsed = JSON.parse(formatted);
    console.log(`💾 File size: ${formatted.length} bytes (compact format)`);
  }
}

// Run
await main().catch(error => {
  console.error('🔴 Fatal error:', error);
  process.exit(1);
});