#!/usr/bin/env bun
/**
 * @fileoverview Demo showcasing TagManagerPro with custom error inspection
 * @description Demonstrates TagManagerPro features including custom error inspection with Error.prepareStackTrace, tag context handling, and advanced error formatting.
 * @module examples/demos/demo-tag-manager-pro
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.3.1.0.0.0.0;instance-id=EXAMPLE-TAG-MANAGER-PRO-DEMO-001;version=6.3.1.0.0.0.0}]
 * [PROPERTIES:{example={value:"Tag Manager Pro Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.3.1.0.0.0.0"}}]
 * [CLASS:TagManagerProDemo][#REF:v-6.3.1.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.3.1.0.0.0.0
 * Ripgrep Pattern: 6\.3\.1\.0\.0\.0\.0|EXAMPLE-TAG-MANAGER-PRO-DEMO-001|BP-EXAMPLE@6\.3\.1\.0\.0\.0\.0
 * 
 * @example 6.3.1.0.0.0.0.1: Custom Error Inspection
 * // Test Formula:
 * // 1. Create TagManagerError with context
 * // 2. Throw error and catch it
 * // 3. Verify custom error formatting
 * // Expected Result: Error displayed with custom formatting and context
 * //
 * // Snippet:
 * ```typescript
 * throw new TagManagerError('Test error', {
 *   operation: 'scan',
 *   file: 'test.ts',
 *   tag: '[hyper-bun][utils][feat]',
 * });
 * ```
 * 
 * // Ripgrep: 6.3.1.0.0.0.0
 * // Ripgrep: EXAMPLE-TAG-MANAGER-PRO-DEMO-001
 * // Ripgrep: BP-EXAMPLE@6.3.1.0.0.0.0
 */

import { TagManagerPro, TagParser, TagManagerError } from "./tag-manager-pro";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

console.log("\n" + "═".repeat(70));
console.log("  Tag Manager Pro Demo - Custom Error Inspection");
console.log("═".repeat(70) + "\n");

// Example 1: Custom error inspection
console.log("📋 Example 1: Custom Error Inspection with Error.prepareStackTrace");
console.log("-".repeat(70));

try {
  throw new TagManagerError('Test error with context', {
    operation: 'scan',
    file: 'test.ts',
    tag: '[hyper-bun][utils][feat][META:priority=high][tag-manager][#REF:Bun.utils]',
    metadata: { userId: 123, action: 'validate' }
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
    console.log();
  }
}

// Example 2: Error with tag context
console.log("📋 Example 2: Error with Tag Context");
console.log("-".repeat(70));

try {
  throw new TagManagerError('Invalid tag format', {
    tag: '[invalid][tag][format]',
    expectedFormat: '[domain][scope][type][META:key=value][class][#REF:ref]',
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
    console.log();
  }
}

// Example 3: Configuration error
console.log("📋 Example 3: Configuration Error");
console.log("-".repeat(70));

try {
  // Simulate config error
  throw new TagManagerError('Invalid configuration value', {
    key: 'TAG_MAX_ARRAY_LEN',
    value: 'invalid',
    expected: 'positive integer',
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
  }
  console.log();
}

// Example 4: File scan error
console.log("📋 Example 4: File Scan Error");
console.log("-".repeat(70));

try {
  throw new TagManagerError('Failed to scan file', {
    file: '/nonexistent/file.ts',
    error: 'ENOENT: no such file or directory',
    operation: 'scan',
    pattern: 'src/**/*.ts',
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
    console.log();
  }
}

// Example 5: Cache error
console.log("📋 Example 5: Cache Operation Error");
console.log("-".repeat(70));

try {
  throw new TagManagerError('Cache operation failed', {
    operation: 'get',
    key: 'scan:src/file.ts',
    error: 'Cache corrupted',
    cacheSize: 1000,
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
    console.log();
  }
}

// Example 6: Error inspection with showHidden
console.log("📋 Example 6: Error Inspection with showHidden");
console.log("-".repeat(70));

try {
  throw new TagManagerError('Debug error', {
    debug: true,
    level: 'trace',
  });
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(Bun.inspect(error, { showHidden: true, colors: true }));
    console.log();
  }
}

// Example 7: Normal operation (no errors)
console.log("📋 Example 7: Normal Operation - Tag Validation");
console.log("-".repeat(70));

const manager = new TagManagerPro();
const tag = "[hyper-bun][utils][feat][META:priority=high,status=production][tag-manager-pro][#REF:Bun.inspect]";

try {
  const validation = TagParser.validate(tag);
  if (validation.valid) {
    const parsed = TagParser.parse(tag);
    console.log(`${colors.green('✅ Valid tag')}`);
    console.log(Bun.inspect(parsed, { colors: true }));
  } else {
    console.log(`${colors.red('❌ Invalid tag')}`);
    validation.errors.forEach(err => console.log(`  ${colors.red('-')} ${err}`));
  }
} catch (error) {
  if (error instanceof TagManagerError) {
    console.log(error);
  } else {
    console.error('Unexpected error:', error);
  }
}

console.log("\n" + "═".repeat(70));
console.log("  Demo Complete!");
console.log("═".repeat(70) + "\n");
