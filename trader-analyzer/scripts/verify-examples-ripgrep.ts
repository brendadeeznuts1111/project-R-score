#!/usr/bin/env bun
/**
 * @fileoverview Ripgrep verification script for example files
 * @description Verifies that all example files have proper version numbers, ripgrep patterns, and JSDoc documentation.
 * @module scripts/verify-examples-ripgrep
 */

import { $ } from "bun";
import { readFileSync } from "fs";

interface VerificationResult {
  file: string;
  version?: string;
  instanceId?: string;
  blueprint?: string;
  hasFileHeader: boolean;
  hasRipgrepComments: boolean;
  hasExampleTags: boolean;
  errors: string[];
}

const EXPECTED_VERSIONS: Record<string, string> = {
  "demo-html-rewriter.ts": "6.1.0.0.0.0.0",
  "demo-html-rewriter-simple.ts": "6.1.1.0.0.0.0",
  "demo-html-rewriter-server.ts": "6.1.2.0.0.0.0",
  "demo-html-rewriter-comparison.ts": "6.1.3.0.0.0.0",
  "demo-html-rewriter-live-editor.ts": "6.1.4.0.0.0.0",
  "demo-bun-utils.ts": "6.2.0.0.0.0.0",
  "demo-bun-spawn-complete.ts": "6.2.1.0.0.0.0",
  "demo-bun-inspect-custom.ts": "6.2.2.0.0.0.0",
  "demo-console-features.ts": "6.2.3.0.0.0.0",
  "tag-manager.ts": "6.3.0.0.0.0.0",
  "demo-tag-manager-pro.ts": "6.3.1.0.0.0.0",
  "tag-manager-pro.ts": "6.3.2.0.0.0.0",
  "demo-worker-threads.ts": "6.4.0.0.0.0.0",
  "demo-fetch-debug.ts": "6.4.1.0.0.0.0",
  "demo-circular-buffer.ts": "6.4.2.0.0.0.0",
  "demo-advanced-circular-buffer.ts": "6.4.3.0.0.0.0",
  "fix-type-errors.ts": "6.4.4.0.0.0.0",
};

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function verifyFile(filePath: string): VerificationResult {
  const fileName = filePath.split("/").pop() || "";
  const content = readFileSync(filePath, "utf-8");
  const result: VerificationResult = {
    file: fileName,
    hasFileHeader: false,
    hasRipgrepComments: false,
    hasExampleTags: false,
    errors: [],
  };

  // Check for file header with @fileoverview
  if (content.includes("@fileoverview")) {
    result.hasFileHeader = true;
  } else {
    result.errors.push("Missing @fileoverview in file header");
  }

  // Extract version number
  const versionMatch = content.match(/Version:\s*([\d.]+)/);
  if (versionMatch) {
    result.version = versionMatch[1];
    const expectedVersion = EXPECTED_VERSIONS[fileName];
    if (expectedVersion && result.version !== expectedVersion) {
      result.errors.push(
        `Version mismatch: expected ${expectedVersion}, found ${result.version}`,
      );
    }
  } else {
    result.errors.push("Missing version number in file header");
  }

  // Extract instance ID
  const instanceIdMatch = content.match(/instance-id=([A-Z-]+-\d+)/);
  if (instanceIdMatch) {
    result.instanceId = instanceIdMatch[1];
  } else {
    result.errors.push("Missing instance-id in META block");
  }

  // Extract blueprint
  const blueprintMatch = content.match(/blueprint=BP-EXAMPLE@([\d.]+)/);
  if (blueprintMatch) {
    result.blueprint = blueprintMatch[1];
  } else {
    result.errors.push("Missing blueprint in META block");
  }

  // Check for ripgrep comments
  if (content.includes("// Ripgrep:")) {
    result.hasRipgrepComments = true;
  } else {
    result.errors.push("Missing ripgrep searchable comments");
  }

  // Check for @example tags
  if (content.includes("@example")) {
    result.hasExampleTags = true;
  } else {
    result.errors.push("Missing @example tags");
  }

  return result;
}

async function runRipgrepTests() {
  console.log("\n" + "═".repeat(70));
  console.log(colors.bold("  Ripgrep Pattern Verification Tests"));
  console.log("═".repeat(70) + "\n");

  const testCases = [
    {
      name: "Find by version number",
      pattern: "6\\.1\\.0\\.0\\.0\\.0\\.0",
      expectedFiles: ["demo-html-rewriter.ts"],
    },
    {
      name: "Find by instance ID",
      pattern: "EXAMPLE-HTML-REWRITER-001",
      expectedFiles: ["demo-html-rewriter.ts"],
    },
    {
      name: "Find by blueprint",
      pattern: "BP-EXAMPLE@6\\.1\\.0\\.0\\.0\\.0\\.0",
      expectedFiles: ["demo-html-rewriter.ts"],
    },
    {
      name: "Find all version numbers",
      pattern: "\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
      expectedFiles: [], // Should find many files
    },
  ];

  for (const testCase of testCases) {
    try {
      const result = await $`rg ${testCase.pattern} examples/demos/`.quiet();
      const output = result.stdout.toString();
      const matches = output.split("\n").filter((line) => line.trim());

      if (testCase.expectedFiles.length === 0) {
        // Just check that we found something
        if (matches.length > 0) {
          console.log(
            `${colors.green("✅")} ${testCase.name}: Found ${matches.length} matches`,
          );
        } else {
          console.log(
            `${colors.red("❌")} ${testCase.name}: No matches found`,
          );
        }
      } else {
        const foundFiles = testCase.expectedFiles.filter((file) =>
          matches.some((match) => match.includes(file)),
        );
        if (foundFiles.length === testCase.expectedFiles.length) {
          console.log(
            `${colors.green("✅")} ${testCase.name}: Found all expected files`,
          );
        } else {
          console.log(
            `${colors.red("❌")} ${testCase.name}: Missing files`,
          );
        }
      }
    } catch (error) {
      console.log(
        `${colors.yellow("⚠️")}  ${testCase.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log(colors.bold("  Example Files JSDoc Verification"));
  console.log("═".repeat(70) + "\n");

  const exampleGlob = new Bun.Glob("examples/demos/demo-*.ts");
  const tagManagerGlob = new Bun.Glob("examples/demos/tag-manager*.ts");
  const otherGlob = new Bun.Glob("examples/demos/fix-*.ts");
  
  const exampleFiles: string[] = [];
  const tagManagerFiles: string[] = [];
  const otherFiles: string[] = [];
  
  for await (const file of exampleGlob.scan(".")) {
    exampleFiles.push(file);
  }
  for await (const file of tagManagerGlob.scan(".")) {
    tagManagerFiles.push(file);
  }
  for await (const file of otherGlob.scan(".")) {
    otherFiles.push(file);
  }
  
  const allFiles = [...exampleFiles, ...tagManagerFiles, ...otherFiles];

  const results: VerificationResult[] = [];
  let totalErrors = 0;

  for (const file of allFiles) {
    const result = verifyFile(file);
    results.push(result);
    totalErrors += result.errors.length;
  }

  // Display results
  for (const result of results) {
    if (result.errors.length === 0) {
      console.log(
        `${colors.green("✅")} ${result.file} ${colors.dim(`(${result.version})`)}`,
      );
    } else {
      console.log(`${colors.red("❌")} ${result.file}`);
      for (const error of result.errors) {
        console.log(`   ${colors.dim(`• ${error}`)}`);
      }
    }
  }

  console.log("\n" + "─".repeat(70));
  console.log(
    `Total files checked: ${allFiles.length}`,
  );
  console.log(
    `Files with errors: ${results.filter((r) => r.errors.length > 0).length}`,
  );
  console.log(`Total errors: ${totalErrors}`);

  // Run ripgrep tests
  await runRipgrepTests();

  console.log("\n" + "═".repeat(70));
  if (totalErrors === 0) {
    console.log(colors.green("✅ All verifications passed!"));
  } else {
    console.log(colors.red(`❌ Found ${totalErrors} verification errors`));
    process.exit(1);
  }
  console.log("═".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(colors.red("Fatal error:"), error);
  process.exit(1);
});
