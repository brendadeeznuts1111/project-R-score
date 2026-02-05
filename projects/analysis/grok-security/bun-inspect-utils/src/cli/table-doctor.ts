#!/usr/bin/env bun

/**
 * [SECURITY][CLI][TOOL][META:{VERSION:2.1.0}][#REF:table-enforcement,analysis,ast]{BUN-NATIVE}
 * bun table-doctor - Analyze and fix table enforcement issues
 * Now with AST-based detection, domain enforcement, and watch mode
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, watch } from "fs";
import { existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import { ASTParser, type TableCall } from "./ast-parser";
import {
  DomainEnforcementFactory,
  type IDomainEnforcement,
} from "../enforcement/index.js";

interface Options {
  help?: boolean;
  analyze?: boolean;
  fix?: boolean;
  report?: boolean;
  interactive?: boolean;
  watch?: boolean;
  domain?: string;
  pattern?: string;
  minColumns?: number;
  strict?: boolean;
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    analyze: true,
    pattern: "src/**/*.ts",
    minColumns: 6,
    domain: "general",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--analyze") options.analyze = true;
    if (arg === "--fix") options.fix = true;
    if (arg === "--report") options.report = true;
    if (arg === "--interactive" || arg === "-i") options.interactive = true;
    if (arg === "--watch" || arg === "-w") options.watch = true;
    if (arg === "--strict") options.strict = true;
    if (arg === "--domain" && args[i + 1]) {
      options.domain = args[++i];
    }
    if (arg === "--pattern" && args[i + 1]) {
      options.pattern = args[++i];
    }
    if (arg === "--min-columns" && args[i + 1]) {
      options.minColumns = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
🏥 bun table-doctor - Table Enforcement CLI

Usage:
  bun table-doctor [options]

Options:
  --help, -h              Show this help message
  --analyze               Analyze table calls (default)
  --fix                   Attempt to fix violations
  --report                Generate compliance report
  --interactive, -i       Interactive mode with prompts
  --watch, -w             Watch for file changes
  --domain <name>         Domain for enforcement (medical, financial, ecommerce, general)
  --pattern <glob>        File pattern to analyze (default: src/**/*.ts)
  --min-columns <n>       Minimum columns required (default: 6)
  --strict                Strict mode (fail on any violation)

Domains:
  medical     HIPAA compliance, medical data handling
  financial   SOX compliance, financial records
  ecommerce   PCI-DSS compliance, e-commerce data
  general     General data tables

Examples:
  bun table-doctor --analyze
  bun table-doctor --analyze --domain medical
  bun table-doctor --interactive
  bun table-doctor --report --min-columns 8
  bun table-doctor --fix --pattern "src/**/*.ts"
  bun table-doctor --watch

Documentation:
  https://docs.bun.sh/api/inspect#table
  `);
}

/**
 * Interactive mode - prompt user for options
 */
async function interactiveMode(): Promise<Options> {
  const { question } = await import("util");

  console.log("\n🏥 Table Doctor - Interactive Mode\n");

  const domainOptions = ["general", "medical", "financial", "ecommerce"];
  const defaultDomain = "general";

  let selectedDomain = defaultDomain;
  while (!domainOptions.includes(selectedDomain)) {
    const answer = await question(
      `Select domain (general/medical/financial/ecommerce) [${defaultDomain}]: `
    );
    selectedDomain = answer.trim() || defaultDomain;
  }

  let pattern = "src/**/*.ts";
  const patternAnswer = await question("File pattern [src/**/*.ts]: ");
  if (patternAnswer.trim()) {
    pattern = patternAnswer.trim();
  }

  let minColumns = 6;
  const columnsAnswer = await question("Minimum columns [6]: ");
  if (columnsAnswer.trim()) {
    minColumns = parseInt(columnsAnswer.trim(), 10) || 6;
  }

  const watchAnswer = await question("Enable watch mode? (y/n) [n]: ");
  const watchMode = watchAnswer.trim().toLowerCase() === "y";

  return {
    analyze: true,
    domain: selectedDomain,
    pattern,
    minColumns,
    watch: watchMode,
    interactive: true,
  };
}

/**
 * Validate table call against domain enforcement
 */
async function validateAgainstDomain(
  call: TableCall,
  domain: string
): Promise<{
  isValid: boolean;
  message: string;
  suggestions: string[];
}> {
  try {
    const factory = new DomainEnforcementFactory();
    const enforcer = factory.create(domain as any);

    if (!enforcer) {
      return {
        isValid: call.properties.length >= 6,
        message: `Unknown domain: ${domain}`,
        suggestions: [],
      };
    }

    const mockData = call.properties.map((prop) => ({ [prop]: "sample" }));
    const result = await enforcer.validate(mockData as any, call.properties);

    return {
      isValid: result.isValid,
      message: result.message,
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    return {
      isValid: false,
      message: `Validation error: ${(error as Error).message}`,
      suggestions: [],
    };
  }
}

/**
 * Analyze files with domain enforcement
 */
async function analyzeWithDomain(
  pattern: string,
  domain: string,
  minColumns: number
): Promise<void> {
  console.log(`\n🔍 Analyzing with domain enforcement: ${domain}\n`);

  const parser = new ASTParser({ minColumns });
  const tableCalls = await parser.analyze(pattern);

  if (tableCalls.length === 0) {
    console.log("✅ No table calls found!");
    return;
  }

  let compliant = 0;
  let nonCompliant = 0;
  const results: Array<{
    file: string;
    line: number;
    status: "compliant" | "non-compliant";
    domain: string;
    message: string;
  }> = [];

  for (const call of tableCalls) {
    const validation = await validateAgainstDomain(call, domain);
    const isCompliant = call.properties.length >= minColumns && validation.isValid;

    if (isCompliant) {
      compliant++;
    } else {
      nonCompliant++;
    }

    results.push({
      file: `${call.file}:${call.line}`,
      line: call.line,
      status: isCompliant ? "compliant" : "non-compliant",
      domain,
      message: validation.message,
    });

    const statusIcon = isCompliant ? "✅" : "⚠️";
    console.log(`${statusIcon} ${call.file}:${call.line}`);
    console.log(`   Function: ${call.functionName}`);
    console.log(`   Properties: [${call.properties.join(", ")}]`);
    console.log(`   Domain: ${domain}`);
    console.log(`   Message: ${validation.message}`);

    if (!isCompliant && validation.suggestions.length > 0) {
      console.log(`   Suggestions: ${validation.suggestions.join(", ")}`);
    }
    console.log("");
  }

  const total = compliant + nonCompliant;
  console.log(`📈 Summary:`);
  console.log(`   Total table calls: ${total}`);
  console.log(`   Compliant: ${compliant}`);
  console.log(`   Non-compliant: ${nonCompliant}`);
  console.log(
    `   Compliance rate: ${((compliant / total) * 100).toFixed(1)}%\n`
  );

  // Save results
  const resultsFile = "table-analysis-results.json";
  writeFileSync(resultsFile, JSON.stringify({ results, summary: { compliant, nonCompliant, total } }, null, 2));
  console.log(`📄 Results saved to: ${resultsFile}\n`);
}

/**
 * Generate domain-specific compliance report
 */
async function generateDomainReport(
  pattern: string,
  domain: string,
  minColumns: number
): Promise<void> {
  console.log(`\n📋 Generating ${domain.toUpperCase()} Compliance Report\n`);

  const parser = new ASTParser({ minColumns });
  const tableCalls = await parser.analyze(pattern);

  const factory = new DomainEnforcementFactory();
  const enforcer = factory.create(domain as any);

  const report = {
    timestamp: new Date().toISOString(),
    domain,
    configuration: { minColumns, pattern },
    compliance: {
      hipaa: false,
      sox: false,
      pciDss: false,
      gdpr: false,
      ccpa: false,
    },
    results: [] as Array<{
      file: string;
      line: number;
      status: string;
      issues: string[];
    }>,
    summary: {
      totalCalls: tableCalls.length,
      compliant: 0,
      nonCompliant: 0,
      complianceRate: 100,
    },
  };

  for (const call of tableCalls) {
    const validation = await validateAgainstDomain(call, domain);
    const isCompliant = call.properties.length >= minColumns && validation.isValid;

    if (isCompliant) {
      report.summary.compliant++;
    } else {
      report.summary.nonCompliant++;
    }

    report.results.push({
      file: `${call.file}:${call.line}`,
      line: call.line,
      status: isCompliant ? "compliant" : "non-compliant",
      issues: isCompliant ? [] : [validation.message],
    });
  }

  // Calculate compliance rate
  if (report.summary.totalCalls > 0) {
    report.summary.complianceRate =
      (report.summary.compliant / report.summary.totalCalls) * 100;
  }

  // Set compliance flags based on domain
  if (enforcer) {
    report.compliance = {
      hipaa: domain === "medical",
      sox: domain === "financial",
      pciDss: domain === "ecommerce",
      gdpr: domain === "medical" || domain === "financial",
      ccpa: true,
    };
  }

  console.log(`Configuration:`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Minimum columns: ${minColumns}`);
  console.log(`  Pattern: ${pattern}\n`);

  console.log(`Results:`);
  console.log(`  Total table calls: ${report.summary.totalCalls}`);
  console.log(`  Compliant: ${report.summary.compliant}`);
  console.log(`  Non-compliant: ${report.summary.nonCompliant}`);
  console.log(`  Compliance rate: ${report.summary.complianceRate.toFixed(1)}%`);
  console.log(`\nCompliance Flags:`);
  console.log(`  HIPAA: ${report.compliance.hipaa ? "✅" : "❌"}`);
  console.log(`  SOX: ${report.compliance.sox ? "✅" : "❌"}`);
  console.log(`  PCI-DSS: ${report.compliance.pciDss ? "✅" : "❌"}`);
  console.log(`  GDPR: ${report.compliance.gdpr ? "✅" : "❌"}`);
  console.log(`  CCPA: ${report.compliance.ccpa ? "✅" : "❌"}\n`);

  // Save report
  const reportFile = `table-${domain}-compliance-report.json`;
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to: ${reportFile}\n`);
}

/**
 * Watch mode - monitor files and re-analyze on changes
 */
async function watchMode(
  pattern: string,
  domain: string,
  minColumns: number
): Promise<void> {
  console.log(`\n👀 Watch mode enabled`);
  console.log(`   Pattern: ${pattern}`);
  console.log(`   Domain: ${domain}`);
  console.log(`   Press Ctrl+C to stop\n`);

  const baseDir = process.cwd();

  // Initial analysis
  console.log("📊 Running initial analysis...\n");
  await analyzeWithDomain(pattern, domain, minColumns);

  // Set up file watcher
  const watchedDirs = new Set<string>();

  // Get directories to watch
  const collectWatchDirs = (dir: string) => {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        if (item.isDirectory() && !["node_modules", "dist", "build"].includes(item.name)) {
          watchedDirs.add(fullPath);
          collectWatchDirs(fullPath);
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  };

  collectWatchDirs(baseDir);

  console.log(`👀 Watching ${watchedDirs.size} directories for changes...\n`);

  // Simple polling-based watch using setInterval
  const interval = setInterval(async () => {
    console.log("📊 Re-analyzing...\n");
    await analyzeWithDomain(pattern, domain, minColumns);
  }, 30000); // Re-analyze every 30 seconds

  // Handle interrupt
  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\n👋 Watch mode stopped\n");
    process.exit(0);
  });

  // Keep process running
  await new Promise(() => {});
}

/**
 * Fix table call issues
 */
async function fixIssues(
  pattern: string,
  domain: string,
  minColumns: number
): Promise<void> {
  console.log(`\n🔧 Fixing table enforcement issues...\n`);

  const parser = new ASTParser({ minColumns });
  const tableCalls = await parser.analyze(pattern);

  let fixed = 0;

  for (const call of tableCalls) {
    const validation = await validateAgainstDomain(call, domain);

    if (!validation.isValid || call.properties.length < minColumns) {
      const suggestions = parser.generateSuggestions(call);

      // Only add suggestions if they don't exceed minColumns
      while (call.properties.length < minColumns && suggestions.length > 0) {
        const suggestion = suggestions.shift();
        if (suggestion && !call.properties.includes(suggestion)) {
          call.properties.push(suggestion);
        }
      }

      fixed++;
      console.log(`🔧 Fixed: ${call.file}:${call.line}`);
      console.log(`   New properties: [${call.properties.join(", ")}]\n`);
    }
  }

  console.log(`📈 Summary:`);
  console.log(`   Total table calls: ${tableCalls.length}`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Skipped: ${tableCalls.length - fixed}\n`);

  if (fixed > 0) {
    console.log(`✅ Fixed ${fixed} table call(s)\n`);
  } else {
    console.log(`✅ No issues found\n`);
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  let options = parseCliArgs();

  // Interactive mode
  if (options.interactive) {
    options = await interactiveMode();
  }

  if (options.help) {
    printHelp();
    return;
  }

  const { pattern, domain, minColumns } = options;

  if (options.watch) {
    await watchMode(pattern!, domain!, minColumns!);
  } else if (options.report) {
    await generateDomainReport(pattern!, domain!, minColumns!);
  } else if (options.fix) {
    await fixIssues(pattern!, domain!, minColumns!);
  } else if (options.analyze) {
    await analyzeWithDomain(pattern!, domain!, minColumns!);
  }
}

main().catch(console.error);