#!/usr/bin/env bun
/**
 * @fileoverview Enhanced TMA Types Verification Script
 * @description Comprehensive verification of TMA (Trading Market Analysis) types using ripgrep
 * @version 9.1.1.11.2.0.0.0
 * @module scripts/verify-tma-types-enhanced
 */

import { $ } from "bun";
import { writeFileSync } from "fs";

interface TMATypeDefinition {
  name: string;
  version: string;
  properties: Record<string, string>;
  files: string[];
  references?: string[]; // Other types this type references
}

interface VerificationResult {
  type: string;
  version: string;
  status: 'pass' | 'fail' | 'warning';
  errors: string[];
  warnings: string[];
  fileCoverage: {
    total: number;
    found: number;
    missing: string[];
  };
  propertyCoverage: {
    total: number;
    verified: number;
    missing: string[];
  };
  crossReferenceCoverage?: {
    total: number;
    verified: number;
    missing: string[];
  };
}

interface VerificationReport {
  timestamp: string;
  totalTypes: number;
  passed: number;
  failed: number;
  warnings: number;
  results: VerificationResult[];
  summary: {
    coverage: number;
    criticalErrors: number;
    recommendations: string[];
  };
}

const TMA_TYPES: TMATypeDefinition[] = [
  {
    name: 'TMABalanceOverview',
    version: '9.1.1.11.2.2.0',
    properties: {
      'total_available_usd': '9.1.1.11.2.2.0.1',
      'bookmaker_balances': '9.1.1.11.2.2.0.2'
    },
    files: ['src/types/tma.ts', 'src/types/index.ts', 'docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md'],
    references: ['TMABookmakerBalance']
  },
  {
    name: 'TMABookmakerBalance',
    version: '9.1.1.11.2.2.0.3',
    properties: {
      'bookmaker_name': '9.1.1.11.2.2.0.3.1',
      'current_balance_usd': '9.1.1.11.2.2.0.3.2',
      'exposure_usd': '9.1.1.11.2.2.0.3.3',
      'available_for_bet_usd': '9.1.1.11.2.2.0.3.4'
    },
    files: ['src/types/tma.ts', 'src/types/index.ts', 'docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md']
  },
  {
    name: 'TMAGraphData',
    version: '9.1.1.11.2.4.0',
    properties: {
      'graph_id': '9.1.1.11.2.4.0.1',
      'type': '9.1.1.11.2.4.0.2',
      'title': '9.1.1.11.2.4.0.3',
      'series': '9.1.1.11.2.4.0.4',
      'options': '9.1.1.11.2.4.0.5'
    },
    files: ['src/types/tma.ts', 'src/types/index.ts', 'docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md'],
    references: ['TMAGraphSeries', 'TMAGraphOptions']
  },
  {
    name: 'TMAGraphSeries',
    version: '9.1.1.11.2.4.0.6',
    properties: {
      'name': '9.1.1.11.2.4.0.6.1',
      'data': '9.1.1.11.2.4.0.6.2',
      'color': '9.1.1.11.2.4.0.6.3'
    },
    files: ['src/types/tma.ts', 'src/types/index.ts', 'docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md']
  },
  {
    name: 'TMAGraphOptions',
    version: '9.1.1.11.2.4.0.7',
    properties: {
      'y_axis_label': '9.1.1.11.2.4.0.7.1',
      'x_axis_format': '9.1.1.11.2.4.0.7.2',
      'min_y': '9.1.1.11.2.4.0.7.3',
      'max_y': '9.1.1.11.2.4.0.7.4'
    },
    files: ['src/types/tma.ts', 'src/types/index.ts', 'docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md']
  }
];

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

async function runRipgrepCheck(pattern: string, path: string = '.'): Promise<string[]> {
  try {
    const result = await $`rg ${pattern} ${path} --files-with-matches`.quiet();
    const output = result.stdout.toString().trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    return [];
  }
}



async function validateCrossReferences(typeDef: TMATypeDefinition, allTypes: TMATypeDefinition[]): Promise<{verified: number, missing: string[]}> {
  const result: {verified: number, missing: string[]} = { verified: 0, missing: [] };

  if (!typeDef.references) {
    return result;
  }

  const typeMap = new Map(allTypes.map(t => [t.name, t]));

  for (const refTypeName of typeDef.references) {
    const refType = typeMap.get(refTypeName);
    if (!refType) {
      result.missing.push(refTypeName);
      continue;
    }

    // Check if the referenced type version is mentioned in the current type's file
    const refVersionFiles = await runRipgrepCheck(refType.version, 'src/types/tma.ts');
    if (refVersionFiles.length > 0) {
      result.verified++;
    } else {
      result.missing.push(`${refTypeName} (${refType.version})`);
    }
  }

  return result;
}

async function verifyJSDocPropertyVersion(filePath: string, typeName: string, propName: string, expectedVersion: string): Promise<{found: boolean, correct: boolean, actualVersion?: string}> {
  try {
    // Read the file content
    const content = await Bun.file(filePath).text();

    // Find the property within the type interface - use a more robust approach
    const interfaceStart = content.indexOf(`export interface ${typeName} {`);
    if (interfaceStart === -1) {
      return { found: false, correct: false };
    }

    // Find the matching closing brace (start counting from the opening brace)
    const openingBracePos = content.indexOf('{', interfaceStart);
    let braceCount = 1; // We start after the opening brace
    let interfaceEnd = openingBracePos;
    for (let i = openingBracePos + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) {
        interfaceEnd = i;
        break;
      }
    }

    const interfaceContent = content.substring(openingBracePos + 1, interfaceEnd);

    // Find the property with its JSDoc comment - more flexible regex
    const propRegex = new RegExp(`\\/\\*\\*[\\s\\S]*?\\*\\/\\s+${propName}[?:]`, 'm');
    const propMatch = interfaceContent.match(propRegex);

    if (!propMatch) {
      return { found: false, correct: false };
    }

    // Extract version from JSDoc - look for the exact version pattern
    const versionRegex = new RegExp(`(${expectedVersion.replace(/\./g, '\\.')})`);
    const versionMatch = propMatch[0].match(versionRegex);

    if (versionMatch) {
      return { found: true, correct: true, actualVersion: versionMatch[1] };
    } else {
      // Check if any version number exists in the JSDoc
      const anyVersionRegex = /\d+\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+/;
      const anyVersionMatch = propMatch[0].match(anyVersionRegex);
      return {
        found: true,
        correct: false,
        actualVersion: anyVersionMatch ? anyVersionMatch[0] : undefined
      };
    }
  } catch (error) {
    return { found: false, correct: false };
  }
}

async function verifyTypeDefinition(typeDef: TMATypeDefinition, allTypes: TMATypeDefinition[]): Promise<VerificationResult> {
  const result: VerificationResult = {
    type: typeDef.name,
    version: typeDef.version,
    status: 'pass',
    errors: [],
    warnings: [],
    fileCoverage: {
      total: typeDef.files.length,
      found: 0,
      missing: []
    },
    propertyCoverage: {
      total: Object.keys(typeDef.properties).length,
      verified: 0,
      missing: []
    }
  };

  // Check file coverage
  for (const file of typeDef.files) {
    const filesWithType = await runRipgrepCheck(typeDef.name, file);
    if (filesWithType.includes(file)) {
      result.fileCoverage.found++;
    } else {
      result.fileCoverage.missing.push(file);
      result.errors.push(`Type ${typeDef.name} not found in ${file}`);
    }
  }

  // Check version consistency
  const versionFiles = await runRipgrepCheck(typeDef.version);
  const versionCoverage = versionFiles.length;
  if (versionCoverage < typeDef.files.length) {
    result.warnings.push(`Version ${typeDef.version} found in ${versionCoverage}/${typeDef.files.length} expected files`);
  }

  // Enhanced property validation - check JSDoc comments
  const typeFile = 'src/types/tma.ts';
  for (const [propName, propVersion] of Object.entries(typeDef.properties)) {
    // First check if version exists anywhere
    const propFiles = await runRipgrepCheck(propVersion);
    const hasVersionReference = propFiles.length > 0;

    // Then check JSDoc in the type definition file
    const jsdocCheck = await verifyJSDocPropertyVersion(typeFile, typeDef.name, propName, propVersion);

    if (jsdocCheck.found && jsdocCheck.correct) {
      result.propertyCoverage.verified++;
    } else if (jsdocCheck.found && !jsdocCheck.correct) {
      result.errors.push(`Property ${propName} has incorrect JSDoc version: expected ${propVersion}, found ${jsdocCheck.actualVersion || 'none'}`);
    } else if (!hasVersionReference) {
      result.propertyCoverage.missing.push(propName);
      result.errors.push(`Property ${propName} version ${propVersion} not found anywhere`);
    } else {
      result.warnings.push(`Property ${propName} version found but JSDoc validation failed`);
    }
  }

  // Cross-reference validation
  if (typeDef.references) {
    const crossRefResult = await validateCrossReferences(typeDef, allTypes);
    result.crossReferenceCoverage = {
      total: typeDef.references.length,
      verified: crossRefResult.verified,
      missing: crossRefResult.missing
    };

    if (crossRefResult.missing.length > 0) {
      result.warnings.push(`Missing cross-references: ${crossRefResult.missing.join(', ')}`);
    }
  }

  // Determine status
  if (result.errors.length > 0) {
    result.status = 'fail';
  } else if (result.warnings.length > 0) {
    result.status = 'warning';
  }

  return result;
}

function generateRecommendations(results: VerificationResult[]): string[] {
  const recommendations: string[] = [];

  const failedTypes = results.filter(r => r.status === 'fail');
  const warningTypes = results.filter(r => r.status === 'warning');

  if (failedTypes.length > 0) {
    recommendations.push(`Fix ${failedTypes.length} types with critical errors`);
  }

  if (warningTypes.length > 0) {
    recommendations.push(`Review ${warningTypes.length} types with warnings`);
  }

  const missingFiles = results.flatMap(r => r.fileCoverage.missing);
  if (missingFiles.length > 0) {
    recommendations.push(`Add type definitions to ${missingFiles.length} missing files`);
  }

  const missingProperties = results.flatMap(r => r.propertyCoverage.missing);
  if (missingProperties.length > 0) {
    recommendations.push(`Add version numbers to ${missingProperties.length} missing properties`);
  }

  return recommendations;
}

function displayResults(results: VerificationResult[]) {
  console.log("\n" + "═".repeat(80));
  console.log(colors.bold("  Enhanced TMA Types Verification Results"));
  console.log("═".repeat(80) + "\n");

  for (const result of results) {
    const statusIcon = result.status === 'pass' ? colors.green('✅') :
                      result.status === 'fail' ? colors.red('❌') :
                      colors.yellow('⚠️');

    console.log(`${statusIcon} ${colors.bold(result.type)} (${result.version})`);

    if (result.fileCoverage.found < result.fileCoverage.total) {
      console.log(`   ${colors.dim('Files:')} ${result.fileCoverage.found}/${result.fileCoverage.total}`);
      if (result.fileCoverage.missing.length > 0) {
        console.log(`   ${colors.red('Missing:')} ${result.fileCoverage.missing.join(', ')}`);
      }
    }

    if (result.propertyCoverage.verified < result.propertyCoverage.total) {
      console.log(`   ${colors.dim('Properties:')} ${result.propertyCoverage.verified}/${result.propertyCoverage.total}`);
      if (result.propertyCoverage.missing.length > 0) {
        console.log(`   ${colors.red('Missing props:')} ${result.propertyCoverage.missing.join(', ')}`);
      }
    }

    for (const error of result.errors) {
      console.log(`   ${colors.red('•')} ${error}`);
    }

    for (const warning of result.warnings) {
      console.log(`   ${colors.yellow('•')} ${warning}`);
    }

    console.log('');
  }
}

function displaySummary(report: VerificationReport) {
  console.log("═".repeat(80));
  console.log(colors.bold("  Verification Summary"));
  console.log("═".repeat(80));

  console.log(`\n${colors.bold('Coverage:')} ${report.summary.coverage.toFixed(1)}%`);
  console.log(`${colors.bold('Total Types:')} ${report.totalTypes}`);
  console.log(`${colors.green('Passed:')} ${report.passed}`);
  console.log(`${colors.red('Failed:')} ${report.failed}`);
  console.log(`${colors.yellow('Warnings:')} ${report.warnings}`);

  if (report.summary.criticalErrors > 0) {
    console.log(`\n${colors.red('Critical Errors:')} ${report.summary.criticalErrors}`);
  }

  if (report.summary.recommendations.length > 0) {
    console.log(`\n${colors.bold('Recommendations:')}`);
    for (const rec of report.summary.recommendations) {
      console.log(`   ${colors.cyan('•')} ${rec}`);
    }
  }

  console.log("\n" + "═".repeat(80) + "\n");
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json') || args.includes('-j');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
${colors.bold('Enhanced TMA Types Verification Script')}
${colors.dim('Version: 9.1.1.11.2.0.0.0')}

${colors.bold('Usage:')}
  bun run scripts/verify-tma-types-enhanced.ts [options]

${colors.bold('Options:')}
  --json, -j    Output results in JSON format only (machine-readable)
  --help, -h    Show this help message

${colors.bold('Description:')}
  Performs comprehensive verification of TMA (Trading Market Analysis) types including:
  - File coverage across TypeScript and documentation files
  - Property-level version validation in JSDoc comments
  - Cross-reference validation between related types
  - Version consistency checks

${colors.bold('Output:')}
  - Human-readable report (default)
  - JSON report saved to docs/9.1.1.11.2-verification-report.json
  - JSON-only output with --json flag

${colors.bold('Exit Codes:')}
  0  Success (all verifications passed)
  1  Failure (critical errors found)
`);
    process.exit(0);
  }

  if (!jsonOnly) {
    console.log(colors.bold("🔍 Enhanced TMA Types Verification"));
    console.log(colors.dim("Running comprehensive ripgrep analysis...\n"));
  }

  const results: VerificationResult[] = [];

  // Verify each type
  for (const typeDef of TMA_TYPES) {
    if (!jsonOnly) {
      console.log(`Verifying ${typeDef.name}...`);
    }
    const result = await verifyTypeDefinition(typeDef, TMA_TYPES);
    results.push(result);
  }

  // Generate report
  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    totalTypes: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length,
    results,
    summary: {
      coverage: (results.filter(r => r.status === 'pass').length / results.length) * 100,
      criticalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      recommendations: generateRecommendations(results)
    }
  };

  // Save JSON report
  const jsonPath = 'docs/9.1.1.11.2-verification-report.json';
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  if (jsonOnly) {
    // Output only JSON to stdout
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Display human-readable results
    displayResults(results);
    displaySummary(report);
    console.log(`JSON report saved to: ${jsonPath}\n`);

    // Exit with appropriate code
    if (report.failed > 0 || report.summary.criticalErrors > 0) {
      console.log(colors.red("❌ Verification failed - check errors above"));
      process.exit(1);
    } else if (report.warnings > 0) {
      console.log(colors.yellow("⚠️  Verification passed with warnings"));
      process.exit(0);
    } else {
      console.log(colors.green("✅ All verifications passed!"));
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error(colors.red("Fatal error:"), error);
  process.exit(1);
});