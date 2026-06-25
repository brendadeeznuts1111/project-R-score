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
 * console.info(buffer); // Environment-aware output
 * ```
 * 
 * // Ripgrep: 6.4.3.0.0.0.0
 * // Ripgrep: EXAMPLE-ADVANCED-CIRCULAR-BUFFER-001
 * // Ripgrep: BP-EXAMPLE@6.4.3.0.0.0.0
 */

import { CircularBuffer, createCircularBuffer } from "../src/utils/circular-buffer";

console.info("\n" + "═".repeat(70));
console.info("  Advanced CircularBuffer Demo - Enhanced Bun.inspect.custom");
console.info("═".repeat(70) + "\n");

// Example 1: Environment-aware formatting
console.info("📋 Example 1: Environment-Aware Formatting");
console.info("-".repeat(70));
console.info(`NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.info(`DEBUG_LEVEL: ${Bun.env.DEBUG_LEVEL || 'info'}`);
console.info(`Bun.main: ${Bun.main}`);
console.info(`import.meta.path: ${import.meta.path}`);
console.info(`Is main script: ${import.meta.main}\n`);

const buffer1 = createCircularBuffer(20, Array.from({ length: 15 }, (_, i) => i + 1));
console.info("Default inspection (environment-aware):");
console.info(buffer1);
console.info();

// Example 2: Advanced array formatting options
console.info("📋 Example 2: Advanced Array Formatting Options");
console.info("-".repeat(70));

const buffer2 = createCircularBuffer(10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

console.info("oneline format:");
console.info(Bun.inspect(buffer2, { arrayFormat: 'oneline' }));
console.info();

console.info("compact format:");
console.info(Bun.inspect(buffer2, { arrayFormat: 'compact' }));
console.info();

console.info("expanded format:");
console.info(Bun.inspect(buffer2, { arrayFormat: 'expanded' }));
console.info();

console.info("structured format (default):");
console.info(Bun.inspect(buffer2, { arrayFormat: 'structured' }));
console.info();

console.info("Custom separator:");
console.info(Bun.inspect(buffer2, { 
  arrayFormat: 'oneline', 
  arraySeparator: ' | ' 
}));
console.info();

// Example 3: Enhanced maxArrayLength handling
console.info("📋 Example 3: Enhanced maxArrayLength Handling");
console.info("-".repeat(70));

const buffer3 = createCircularBuffer(1000);
for (let i = 1; i <= 500; i++) {
  buffer3.push(i);
}

console.info("Default maxArrayLength (context-aware):");
console.info(Bun.inspect(buffer3));
console.info();

console.info("Custom maxArrayLength (200):");
console.info(Bun.inspect(buffer3, { maxArrayLength: 200 }));
console.info();

console.info("Small maxArrayLength (5):");
console.info(Bun.inspect(buffer3, { maxArrayLength: 5 }));
console.info();

// Example 4: Security integration - sensitive data redaction
console.info("📋 Example 4: Security Integration - Sensitive Data Redaction");
console.info("-".repeat(70));

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

console.info("Without redaction:");
console.info(Bun.inspect(secureBuffer, { redactSensitive: false }));
console.info();

console.info("With redaction (production mode):");
console.info(Bun.inspect(secureBuffer, { redactSensitive: true }));
console.info();

// Example 5: File context tracking
console.info("📋 Example 5: File Context Tracking");
console.info("-".repeat(70));

const buffer5 = createCircularBuffer(10, [1, 2, 3, 4, 5]);

console.info("Without file context:");
console.info(Bun.inspect(buffer5, { showFileContext: false }));
console.info();

console.info("With file context:");
console.info(Bun.inspect(buffer5, { showFileContext: true }));
console.info();

// Example 6: Show hidden details
console.info("📋 Example 6: Hidden Details (showHidden)");
console.info("-".repeat(70));

const buffer6 = createCircularBuffer(50);
for (let i = 1; i <= 30; i++) {
  buffer6.push(i);
}

console.info("Without hidden details:");
console.info(Bun.inspect(buffer6, { showHidden: false }));
console.info();

console.info("With hidden details:");
console.info(Bun.inspect(buffer6, { showHidden: true }));
console.info();

// Example 7: Context-aware behavior demonstration
console.info("📋 Example 7: Context-Aware Behavior");
console.info("-".repeat(70));

console.info("Execution Context:");
console.info(`  Bun.main: ${Bun.main}`);
console.info(`  import.meta.path: ${import.meta.path}`);
console.info(`  import.meta.main: ${import.meta.main}`);
console.info(`  Match: ${import.meta.path === Bun.main ? 'YES (main script)' : 'NO (module)'}`);
console.info();

const buffer7 = createCircularBuffer(100);
for (let i = 1; i <= 50; i++) {
  buffer7.push(i);
}

console.info("Inspection (adapts to context):");
console.info(buffer7);
console.info();

// Example 8: Environment variable adaptation
console.info("📋 Example 8: Environment Variable Adaptation");
console.info("-".repeat(70));

console.info("Current environment:");
console.info(`  NODE_ENV: ${Bun.env.NODE_ENV || 'development'}`);
console.info(`  DEBUG_LEVEL: ${Bun.env.DEBUG_LEVEL || 'info'}`);
console.info();

const buffer8 = createCircularBuffer(50);
for (let i = 1; i <= 40; i++) {
  buffer8.push(i);
}

console.info("Inspection adapts to environment:");
console.info(buffer8);
console.info();

// Example 9: Combined advanced options
console.info("📋 Example 9: Combined Advanced Options");
console.info("-".repeat(70));

const buffer9 = createCircularBuffer(100);
for (let i = 1; i <= 80; i++) {
  buffer9.push({ id: i, value: `item-${i}`, metadata: { index: i } });
}

console.info("All features combined:");
console.info(Bun.inspect(buffer9, {
  arrayFormat: 'expanded',
  arraySeparator: '\n',
  maxArrayLength: 10,
  showFileContext: true,
  showHidden: true,
  redactSensitive: false,
  colors: true,
  depth: 3,
}));
console.info();

console.info("═".repeat(70));
console.info("  Advanced Demo Complete!");
console.info("═".repeat(70) + "\n");
