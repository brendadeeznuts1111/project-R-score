#!/usr/bin/env bun

// [AI][HEADERS][AI-HE-6AD][v2.0.0][ACTIVE]

// scripts/validate-headers.ts
// Header validation and linting for v2.0 format

import { readFileSync } from "fs";

const HEADER_REGEX = /\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]/;

const VALID_DOMAINS = [
  "SETUP", "CODE", "DEPLOY", "AGENT", "MCP", "TELEGRAM", "POOL",
  "CONFIG", "USAGE", "MONITOR", "EXTEND", "ARCHITECTURE",
  "NAVIGATION", "SUMMARY", "BUN"
];

const VALID_SCOPES = [
  "GLOBAL", "LOCAL", "COMPONENT", "FUNCTION", "ENVIRONMENT",
  "DEPENDENCIES", "RUNTIME", "FEATURES", "COMMANDS", "HEALTH",
  "CUSTOM", "DESIGN", "INDEX", "OVERVIEW", "AGENTS"
];

const VALID_TYPES = [
  "CONFIG", "IMPLEMENTATION", "INTERFACE", "EXAMPLE", "TEST",
  "GUIDE", "RESPONSE"
];

const VALID_META = [
  "REQUIRED", "OPTIONAL", "ADVANCED", "INTERNAL", "DEPRECATED",
  "CORE", "META", "OVERVIEW"
];

const VALID_STATUSES = [
  "ACTIVE", "STABLE", "EXPERIMENTAL", "LEGACY", "DEPRECATED"
];

function validateHeader(header: string, lineNumber: number): string[] {
  const errors: string[] = [];

  // Extract fields from header - use exec for proper capture groups
  const match = HEADER_REGEX.exec(header);
  if (!match) {
    errors.push(`Invalid header format at line ${lineNumber}`);
    return errors;
  }

  const [, domain, scope, type, meta, id, version, status] = match;

  // Validate domain
  if (!VALID_DOMAINS.includes(domain)) {
    errors.push(`Invalid domain "${domain}" at line ${lineNumber}. Valid: ${VALID_DOMAINS.join(', ')}`);
  }

  // Validate scope
  if (!VALID_SCOPES.includes(scope)) {
    errors.push(`Invalid scope "${scope}" at line ${lineNumber}. Valid: ${VALID_SCOPES.join(', ')}`);
  }

  // Validate type
  if (!VALID_TYPES.includes(type)) {
    errors.push(`Invalid type "${type}" at line ${lineNumber}. Valid: ${VALID_TYPES.join(', ')}`);
  }

  // Validate meta
  if (!VALID_META.includes(meta)) {
    errors.push(`Invalid meta "${meta}" at line ${lineNumber}. Valid: ${VALID_META.join(', ')}`);
  }

  // Validate ID format (more flexible)
  if (!/^[A-Z]+(-[A-Z0-9]+)*-\d{2,3}$/.test(id)) {
    errors.push(`Invalid ID format "${id}" at line ${lineNumber}. Expected: DOMAIN-XXX-001 or similar format`);
  }

  // Validate version format
  if (!/^v\d+\.\d+$/.test(version)) {
    errors.push(`Invalid version format "${version}" at line ${lineNumber}. Expected: v2.0 format`);
  }

  // Validate status
  if (!VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status "${status}" at line ${lineNumber}. Valid: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

function validateFile(filePath: string): { errors: string[], warnings: string[] } {
  console.log(`\x1b[36m[VALIDATE]\x1b[0m Checking ${filePath}...`);

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split('\n');

  const errors: string[] = [];
  const warnings: string[] = [];

  let headerCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for headers
    if (line.startsWith('## [') || line.startsWith('# [')) {
      headerCount++;

      const headerErrors = validateHeader(line, lineNumber);
      errors.push(...headerErrors);

      // Check for v2.0 compliance
      if (!line.includes('[v2.0]')) {
        warnings.push(`Legacy header format at line ${lineNumber} (missing v2.0)`);
      }
    }
  }

  console.log(`\x1b[32m[CHECKED]\x1b[0m ${headerCount} headers found`);

  return { errors, warnings };
}

function main() {
  console.log(`\x1b[36m[HEADER-VALIDATION]\x1b[0m Starting v2.0 header validation...\n`);

  const files = ["guide.md"];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files) {
    try {
      const { errors, warnings } = validateFile(file);

      if (warnings.length > 0) {
        console.log(`\x1b[33m[WARNINGS]\x1b[0m ${warnings.length} warnings in ${file}:`);
        warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
        console.log('');
        totalWarnings += warnings.length;
      }

      if (errors.length > 0) {
        console.log(`\x1b[31m[ERRORS]\x1b[0m ${errors.length} errors in ${file}:`);
        errors.forEach(error => console.log(`  ❌ ${error}`));
        console.log('');
        totalErrors += errors.length;
      }

      if (errors.length === 0 && warnings.length === 0) {
        console.log(`\x1b[32m[VALID]\x1b[0m ${file} - All headers valid!\n`);
      }

    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Failed to read ${file}: ${error.message}\n`);
      totalErrors++;
    }
  }

  // Summary
  console.log(`\x1b[36m[SUMMARY]\x1b[0m Validation complete:`);
  console.log(`  📊 Files checked: ${files.length}`);

  if (totalErrors > 0) {
    console.log(`  ❌ Errors: ${totalErrors}`);
    console.log(`\x1b[31m[FAILED]\x1b[0m Header validation failed. Fix errors before proceeding.`);
    process.exit(1);
  } else {
    console.log(`  ✅ Errors: ${totalErrors}`);
    console.log(`  ⚠️  Warnings: ${totalWarnings}`);

    if (totalWarnings > 0) {
      console.log(`\x1b[33m[PASSED]\x1b[0m Headers valid with warnings. Consider upgrading legacy formats.`);
    } else {
      console.log(`\x1b[32m[SUCCESS]\x1b[0m All headers valid and compliant with v2.0 specification!`);
    }
  }
}

// CLI interface
if (import.meta.main) {
  main();
}
