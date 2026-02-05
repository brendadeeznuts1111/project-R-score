#!/usr/bin/env bun
/**
 * colors-lint.ts - TOML Schema Validator for Syntax Colors
 *
 * Validates syntax-colors.toml against JSON Schema using Bun's native TOML loader.
 * Usage: bun scripts/colors-lint.ts [--fix] [--verbose]
 */

import { Glob } from "bun";
import Ajv from "ajv";
import schema from "../src/client/utils/colors.schema.json" with { type: "json" };

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

interface LintResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ajv = new Ajv({ allErrors: true, verbose: true });
const validate = ajv.compile(schema);

async function lintFile(filePath: string, verbose: boolean): Promise<LintResult> {
  const result: LintResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Use Bun's native TOML loader via dynamic import
    let data: any;
    try {
      // Bun parses TOML natively with import attributes
      const module = await import(filePath, { with: { type: "toml" } });
      data = module.default;
    } catch (parseError: any) {
      result.valid = false;
      result.errors.push(`TOML parse error: ${parseError.message}`);
      return result;
    }

    // Validate against schema
    const valid = validate(data);
    if (!valid && validate.errors) {
      result.valid = false;
      for (const err of validate.errors) {
        const path = err.instancePath || "/";
        const msg = err.message || "unknown error";
        result.errors.push(`${path}: ${msg}`);

        if (verbose && err.params) {
          result.errors.push(`  params: ${JSON.stringify(err.params)}`);
        }
      }
    }

    // Additional semantic checks
    if (data.colors && data.names) {
      const colorKeys = new Set(Object.keys(data.colors));
      const nameKeys = new Set(Object.keys(data.names));

      // Warn about colors without names
      for (const key of colorKeys) {
        if (!nameKeys.has(key)) {
          result.warnings.push(`Color '${key}' has no display name in [names]`);
        }
      }

      // Warn about names without colors
      for (const key of nameKeys) {
        if (!colorKeys.has(key)) {
          result.warnings.push(`Name '${key}' has no color in [colors]`);
        }
      }
    }

    // Check text_colors coverage
    if (data.colors && data.text_colors) {
      const colorKeys = new Set(Object.keys(data.colors));
      const textKeys = new Set(Object.keys(data.text_colors));

      for (const key of colorKeys) {
        if (!textKeys.has(key)) {
          result.warnings.push(`Color '${key}' has no text_color (will use fallback)`);
        }
      }
    }

    // Validate hex colors are proper format
    if (data.colors) {
      for (const [key, value] of Object.entries(data.colors)) {
        if (typeof value === "string") {
          // Check contrast-friendly (not too similar to white/black)
          const hex = value.replace("#", "");
          if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            if (luminance > 0.95) {
              result.warnings.push(`Color '${key}' (${value}) is very light - may have contrast issues`);
            } else if (luminance < 0.05) {
              result.warnings.push(`Color '${key}' (${value}) is very dark - may have contrast issues`);
            }
          }
        }
      }
    }

  } catch (err: any) {
    result.valid = false;
    result.errors.push(`File error: ${err.message}`);
  }

  return result;
}

async function main() {
  const args = Bun.argv.slice(2);
  const verbose = args.includes("--verbose") || args.includes("-v");
  const showWarnings = !args.includes("--no-warnings");

  console.log(`${BOLD}${CYAN}🎨 Syntax Colors TOML Linter${RESET}\n`);

  const startTime = performance.now();
  const glob = new Glob("**/*colors*.toml");
  const files: string[] = [];

  // Scan for TOML files
  for await (const file of glob.scan({ cwd: "./src", absolute: true })) {
    files.push(file);
  }

  // Also check config directory
  for await (const file of glob.scan({ cwd: "./config", absolute: true })) {
    files.push(file);
  }

  if (files.length === 0) {
    console.log(`${YELLOW}⚠ No *colors*.toml files found${RESET}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} TOML file(s) to validate:\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  const results: LintResult[] = [];

  for (const file of files) {
    const result = await lintFile(file, verbose);
    results.push(result);

    const relativePath = file.replace(process.cwd() + "/", "");

    if (result.valid && result.warnings.length === 0) {
      console.log(`${GREEN}✓${RESET} ${relativePath}`);
    } else if (result.valid && result.warnings.length > 0) {
      console.log(`${YELLOW}⚠${RESET} ${relativePath} (${result.warnings.length} warning(s))`);
      if (showWarnings) {
        for (const warning of result.warnings) {
          console.log(`  ${YELLOW}→${RESET} ${warning}`);
        }
      }
      totalWarnings += result.warnings.length;
    } else {
      console.log(`${RED}✗${RESET} ${relativePath}`);
      for (const error of result.errors) {
        console.log(`  ${RED}→${RESET} ${error}`);
      }
      totalErrors += result.errors.length;
    }
  }

  const elapsed = (performance.now() - startTime).toFixed(2);
  console.log(`\n${BOLD}Summary:${RESET}`);
  console.log(`  Files:    ${files.length}`);
  console.log(`  Errors:   ${totalErrors > 0 ? RED : GREEN}${totalErrors}${RESET}`);
  console.log(`  Warnings: ${totalWarnings > 0 ? YELLOW : GREEN}${totalWarnings}${RESET}`);
  console.log(`  Time:     ${elapsed}ms`);

  if (totalErrors > 0) {
    console.log(`\n${RED}${BOLD}✗ Validation failed${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✓ All files valid${RESET}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
