/**
 * Enterprise Scanner Usage Examples
 */

import { EnterpriseScanner } from "./enterprise-scanner.ts";
import { checkPackageBeforeInstall } from "./bunpm-preinstall-gate.ts";
import { loadScannerConfig, createDefaultScannerRC } from "./scanner-config.ts";
import { FixSuggestionsGenerator, exportSuggestions } from "./scanner-fix-suggestions.ts";

/**
 * Example 1: Basic scan
 */
async function basicScan() {
  const config = await loadScannerConfig();
  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  const result = await scanner.scan(".");
  console.log(`Scanned ${result.filesScanned} files, found ${result.issuesFound} issues`);
}

/**
 * Example 2: Pre-install gate
 */
async function preInstallExample() {
  const result = await checkPackageBeforeInstall("express", "4.18.0", {
    forceLicense: false
  });

  if (!result.allowed) {
    if (result.requiresForce) {
      console.log("Use --force-license to proceed");
    } else {
      console.log(`Blocked: ${result.reason}`);
    }
  }
}

/**
 * Example 3: Generate baseline
 */
async function generateBaselineExample() {
  const config = await loadScannerConfig();
  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  await scanner.generateBaseline(".scanner-baseline.json", "2026-02-01");
}

/**
 * Example 4: Streaming SARIF
 */
async function streamingSarifExample() {
  const config = await loadScannerConfig();
  config.format = "sarif";
  config.traceId = "019bee46"; // Distributed tracing

  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  const result = await scanner.scan(".");
  console.log(`SARIF output: scan-${result.traceId}.sarif.json`);
}

/**
 * Example 5: Fix suggestions
 */
async function fixSuggestionsExample() {
  const config = await loadScannerConfig();
  config.suggestFixes = true;

  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  const result = await scanner.scan(".");
  const suggestions = await scanner.getFixSuggestions(result.issues);

  // Export suggestions
  await exportSuggestions(suggestions, "fixes.json");

  // Apply suggestions
  const generator = new FixSuggestionsGenerator();
  const { applied, failed } = await generator.applySuggestions(suggestions, {
    backup: true,
    dryRun: false
  });

  console.log(`Applied ${applied} fixes, ${failed} failed`);
}

/**
 * Example 6: NDJSON for VS Code
 */
async function ndjsonExample() {
  const config = await loadScannerConfig();
  config.format = "ndjson";

  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  const result = await scanner.scan(".");
  // NDJSON is streamed to stdout for VS Code extension
}

/**
 * Example 7: Metrics endpoint
 */
async function metricsExample() {
  const config = await loadScannerConfig();
  config.metricsPort = 9090;

  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  // Metrics server started on port 9090
  // Visit http://localhost:9090/metrics for Prometheus
}

/**
 * Example 8: Sandbox mode
 */
async function sandboxExample() {
  const config = await loadScannerConfig();
  config.sandbox = true;

  const scanner = new EnterpriseScanner(config);
  await scanner.initialize();

  const result = await scanner.scan(".");
  // Scans run in isolated subprocess
}

/**
 * Example 9: Gradual enforcement
 */
async function enforcementExample() {
  // Phase 1: Audit (adoption)
  let config = await loadScannerConfig();
  config.mode = "audit";
  let scanner = new EnterpriseScanner(config);
  await scanner.initialize();
  await scanner.scan("."); // Logs issues, exit 0

  // Phase 2: Warn (migration)
  config.mode = "warn";
  scanner = new EnterpriseScanner(config);
  await scanner.initialize();
  await scanner.scan("."); // Warns, exit 0

  // Phase 3: Enforce (production)
  config.mode = "enforce";
  scanner = new EnterpriseScanner(config);
  await scanner.initialize();
  await scanner.scan("."); // Exits 1 on violations
}

/**
 * Example 10: Create default config
 */
async function createConfigExample() {
  await createDefaultScannerRC(".scannerrc");
  console.log("Created .scannerrc with default settings");
}

// Run examples
if (import.meta.main) {
  const example = process.argv[2] || "basic";

  switch (example) {
    case "basic":
      await basicScan();
      break;
    case "preinstall":
      await preInstallExample();
      break;
    case "baseline":
      await generateBaselineExample();
      break;
    case "sarif":
      await streamingSarifExample();
      break;
    case "fixes":
      await fixSuggestionsExample();
      break;
    case "ndjson":
      await ndjsonExample();
      break;
    case "metrics":
      await metricsExample();
      break;
    case "sandbox":
      await sandboxExample();
      break;
    case "enforce":
      await enforcementExample();
      break;
    case "config":
      await createConfigExample();
      break;
    default:
      console.log("Available examples: basic, preinstall, baseline, sarif, fixes, ndjson, metrics, sandbox, enforce, config");
  }
}
