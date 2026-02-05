#!/usr/bin/env bun
/**
 * @fileoverview Advanced demo showcasing enhanced CircularBuffer inspection features
 * @description Demonstrates advanced CircularBuffer features including environment-aware formatting, advanced array formatting options, and enhanced Bun.inspect.custom capabilities.
 * @module examples/demos/demo-advanced-circular-buffer
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.3.0.0.0.0;instance-id=EXAMPLE-ADVANCED-CIRCULAR-BUFFER-001;version=6.4.3.0.0.0.0}]
 * [PROPERTIES:{example={value:"Advanced Circular Buffer Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.3.0.0.0.0"}}]
 * [CLASS:AdvancedCircularBufferDemo][#REF:v-6.4.3.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.4.3.0.0.0.0
 * Ripgrep Pattern: 6\.4\.3\.0\.0\.0\.0|EXAMPLE-ADVANCED-CIRCULAR-BUFFER-001|BP-EXAMPLE@6\.4\.3\.0\.0\.0\.0
 * 
 * @example 6.4.3.0.0.0.0.1: Environment-Aware Formatting
 * // Test Formula:
 * // 1. Create CircularBuffer with data
 * // 2. Set NODE_ENV and DEBUG_LEVEL environment variables
 * // 3. Verify formatting adapts to environment
 * // Expected Result: Formatting changes based on environment
 * //
 * // Snippet:
 * ```typescript
 * const buffer = createCircularBuffer(20, [1, 2, 3]);
 * console.log(buffer); // Environment-aware output
 * ```
 * 
 * // Ripgrep: 6.4.3.0.0.0.0
 * // Ripgrep: EXAMPLE-ADVANCED-CIRCULAR-BUFFER-001
 * // Ripgrep: BP-EXAMPLE@6.4.3.0.0.0.0
 */

import { CircularBuffer, createCircularBuffer } from "../src/utils/circular-buffer";

console.log("\n" + "═".repeat(70));
console.log("  Advanced CircularBuffer Demo - Enhanced Bun.inspect.custom");
console.log("═".repeat(70) + "\n");

// Example 1: Environment-aware formatting
console.log("📋 Example 1: Environment-Aware Formatting");
console.log("-".repeat(70));
console.log(`NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.log(`DEBUG_LEVEL: ${Bun.env.DEBUG_LEVEL || 'info'}`);
console.log(`Bun.main: ${Bun.main}`);
console.log(`import.meta.path: ${import.meta.path}`);
console.log(`Is main script: ${import.meta.main}\n`);

const buffer1 = createCircularBuffer(20, Array.from({ length: 15 }, (_, i) => i + 1));
console.log("Default inspection (environment-aware):");
console.log(buffer1);
console.log();

// Example 2: Advanced array formatting options
console.log("📋 Example 2: Advanced Array Formatting Options");
console.log("-".repeat(70));

const buffer2 = createCircularBuffer(10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

console.log("oneline format:");
console.log(Bun.inspect(buffer2, { arrayFormat: 'oneline' }));
console.log();

console.log("compact format:");
console.log(Bun.inspect(buffer2, { arrayFormat: 'compact' }));
console.log();

console.log("expanded format:");
console.log(Bun.inspect(buffer2, { arrayFormat: 'expanded' }));
console.log();

console.log("structured format (default):");
console.log(Bun.inspect(buffer2, { arrayFormat: 'structured' }));
console.log();

console.log("Custom separator:");
console.log(Bun.inspect(buffer2, { 
  arrayFormat: 'oneline', 
  arraySeparator: ' | ' 
}));
console.log();

// Example 3: Enhanced maxArrayLength handling
console.log("📋 Example 3: Enhanced maxArrayLength Handling");
console.log("-".repeat(70));

const buffer3 = createCircularBuffer(1000);
for (let i = 1; i <= 500; i++) {
  buffer3.push(i);
}

console.log("Default maxArrayLength (context-aware):");
console.log(Bun.inspect(buffer3));
console.log();

console.log("Custom maxArrayLength (200):");
console.log(Bun.inspect(buffer3, { maxArrayLength: 200 }));
console.log();

console.log("Small maxArrayLength (5):");
console.log(Bun.inspect(buffer3, { maxArrayLength: 5 }));
console.log();

// Example 4: Security integration - sensitive data redaction
console.log("📋 Example 4: Security Integration - Sensitive Data Redaction");
console.log("-".repeat(70));

const sensitivePatterns = [
  /(api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
  /(token|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
  /(password|passwd)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
];

const secureBuffer = new CircularBuffer<any>(10, { sensitivePatterns });
secureBuffer.push(
  { apiKey: "sk_live_1234567890abcdefghijklmnop", userId: 123 },
  { token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", action: "read" },
  { password: "super_secret_password_123", username: "admin" },
  { normalData: "this is fine", value: 42 }
);

console.log("Without redaction:");
console.log(Bun.inspect(secureBuffer, { redactSensitive: false }));
console.log();

console.log("With redaction (production mode):");
console.log(Bun.inspect(secureBuffer, { redactSensitive: true }));
console.log();

// Example 5: File context tracking
console.log("📋 Example 5: File Context Tracking");
console.log("-".repeat(70));

const buffer5 = createCircularBuffer(10, [1, 2, 3, 4, 5]);

console.log("Without file context:");
console.log(Bun.inspect(buffer5, { showFileContext: false }));
console.log();

console.log("With file context:");
console.log(Bun.inspect(buffer5, { showFileContext: true }));
console.log();

// Example 6: Show hidden details
console.log("📋 Example 6: Hidden Details (showHidden)");
console.log("-".repeat(70));

const buffer6 = createCircularBuffer(50);
for (let i = 1; i <= 30; i++) {
  buffer6.push(i);
}

console.log("Without hidden details:");
console.log(Bun.inspect(buffer6, { showHidden: false }));
console.log();

console.log("With hidden details:");
console.log(Bun.inspect(buffer6, { showHidden: true }));
console.log();

// Example 7: Context-aware behavior demonstration
console.log("📋 Example 7: Context-Aware Behavior");
console.log("-".repeat(70));

console.log("Execution Context:");
console.log(`  Bun.main: ${Bun.main}`);
console.log(`  import.meta.path: ${import.meta.path}`);
console.log(`  import.meta.main: ${import.meta.main}`);
console.log(`  Match: ${import.meta.path === Bun.main ? 'YES (main script)' : 'NO (module)'}`);
console.log();

const buffer7 = createCircularBuffer(100);
for (let i = 1; i <= 50; i++) {
  buffer7.push(i);
}

console.log("Inspection (adapts to context):");
console.log(buffer7);
console.log();

// Example 8: Environment variable adaptation
console.log("📋 Example 8: Environment Variable Adaptation");
console.log("-".repeat(70));

console.log("Current environment:");
console.log(`  NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.log(`  DEBUG_LEVEL: ${Bun.env.DEBUG_LEVEL || 'info'}`);
console.log();

const buffer8 = createCircularBuffer(50);
for (let i = 1; i <= 40; i++) {
  buffer8.push(i);
}

console.log("Inspection adapts to environment:");
console.log(buffer8);
console.log();

// Example 9: Combined advanced options
console.log("📋 Example 9: Combined Advanced Options");
console.log("-".repeat(70));

const buffer9 = createCircularBuffer(100);
for (let i = 1; i <= 80; i++) {
  buffer9.push({ id: i, value: `item-${i}`, metadata: { index: i } });
}

console.log("All features combined:");
console.log(Bun.inspect(buffer9, {
  arrayFormat: 'expanded',
  arraySeparator: '\n',
  maxArrayLength: 10,
  showFileContext: true,
  showHidden: true,
  redactSensitive: false,
  colors: true,
  depth: 3,
}));
console.log();

console.log("═".repeat(70));
console.log("  Advanced Demo Complete!");
console.log("═".repeat(70) + "\n");
