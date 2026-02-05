/**
 * @fileoverview Bun 1.3 stripANSI Examples
 * @description Practical examples of using Bun.stripANSI for log processing and CLI output
 * @module examples/bun-strip-ansi-examples
 */

import { stripANSI } from "bun";

/**
 * Example 1: Log File Processing
 * Cleaning ANSI escape codes from server logs
 */
export function logProcessingExamples() {
  console.log("=== Log File Processing ===\n");

  // Simulate server logs with ANSI colors
  const rawLogs = [
    "[\\x1b[32mINFO\\x1b[0m] \\x1b[36m2024-01-01 12:00:00\\x1b[0m Server started on port 3000",
    "[\\x1b[33mWARN\\x1b[0m] \\x1b[36m2024-01-01 12:01:00\\x1b[0m High memory usage: 85%",
    "[\\x1b[31mERROR\\x1b[0m] \\x1b[36m2024-01-01 12:02:00\\x1b[0m Database connection failed",
    "[\\x1b[34mDEBUG\\x1b[0m] \\x1b[36m2024-01-01 12:03:00\\x1b[0m Processing request ID: 12345",
    "[\\x1b[35mTRACE\\x1b[0m] \\x1b[36m2024-01-01 12:04:00\\x1b[0m Function execution time: 150ms",
  ];

  console.log("Raw logs with ANSI colors:");
  for (const log of rawLogs) {
    console.log("  " + log);
  }

  console.log("\nClean logs (ANSI removed):");
  for (const log of rawLogs) {
    console.log("  " + stripANSI(log));
  }

  // Performance test with large log files
  const largeLogSet = rawLogs.join("\n").repeat(1000); // ~50KB of logs
  console.log(`\nProcessing ${(largeLogSet.length / 1024).toFixed(1)}KB of logs...`);

  const start = performance.now();
  const cleanLogs = stripANSI(largeLogSet);
  const end = performance.now();

  console.log(`Cleaned size: ${(cleanLogs.length / 1024).toFixed(1)}KB`);
  console.log(`Processing time: ${(end - start).toFixed(3)}ms`);
  console.log(`Reduction: ${(((largeLogSet.length - cleanLogs.length) / largeLogSet.length) * 100).toFixed(1)}% size reduction`);

  console.log("✅ Efficient log processing\n");
}

/**
 * Example 2: CLI Output Sanitization
 * Removing colors from command-line tool output
 */
export function cliOutputExamples() {
  console.log("=== CLI Output Sanitization ===\n");

  // Simulate CLI tool output with colors and formatting
  const cliOutputs = [
    "\\x1b[1m\\x1b[32m✓\\x1b[0m \\x1b[1mBuild completed successfully\\x1b[0m",
    "\\x1b[31m✗\\x1b[0m \\x1b[1mError:\\x1b[0m TypeScript compilation failed",
    "\\x1b[33m⚠\\x1b[0m \\x1b[1mWarning:\\x1b[0m Unused variable 'config'",
    "\\x1b[36mℹ\\x1b[0m \\x1b[1mInfo:\\x1b[0m Starting development server on http://localhost:3000",
    "\\x1b[35m→\\x1b[0m \\x1b[1mHint:\\x1b[0m Consider using --optimize flag",
  ];

  console.log("CLI output with colors and symbols:");
  for (const output of cliOutputs) {
    console.log("  " + output);
  }

  console.log("\nSanitized CLI output (plain text):");
  for (const output of cliOutputs) {
    console.log("  " + stripANSI(output));
  }

  // Test with complex ANSI sequences
  const complexOutput = "\\x1b]0;My App - Development\\x1b\\\\x1b[1;32m▶\\x1b[0m \\x1b[1mStarting...\\x1b[0m \\x1b[2m(press Ctrl+C to stop)\\x1b[0m";
  console.log(`\nComplex ANSI (XTerm title + formatting):`);
  console.log(`  Raw: ${JSON.stringify(complexOutput)}`);
  console.log(`  Clean: "${stripANSI(complexOutput)}"`);

  console.log("✅ CLI output sanitization\n");
}

/**
 * Example 3: Terminal Recording Cleanup
 * Processing terminal session recordings
 */
export function terminalRecordingExamples() {
  console.log("=== Terminal Recording Cleanup ===\n");

  // Simulate terminal recording with cursor movements and colors
  const terminalRecording = [
    "\\x1b[2J\\x1b[H", // Clear screen and home cursor
    "\\x1b[32mWelcome to MyApp\\x1b[0m",
    "\\x1b[1;34m>\\x1b[0m \\x1b[33mLoading configuration...\\x1b[0m",
    "\\x1b[2K\\x1b[1;32m✓\\x1b[0m Configuration loaded", // Clear line + success
    "\\x1b[1;34m>\\x1b[0m \\x1b[33mConnecting to database...\\x1b[0m",
    "\\x1b[2K\\x1b[1;32m✓\\x1b[0m Database connected",
    "\\x1b[1;34m>\\x1b[0m \\x1b[33mStarting server...\\x1b[0m",
    "\\x1b[2K\\x1b[1;32m✓\\x1b[0m Server running on port 3000",
    "\\x1b[?25h", // Show cursor
  ].join("\n");

  console.log("Terminal recording (raw):");
  console.log(JSON.stringify(terminalRecording));

  const cleanRecording = stripANSI(terminalRecording);
  console.log("\nClean terminal recording:");
  console.log(JSON.stringify(cleanRecording));

  console.log("\nFormatted clean output:");
  for (const line of cleanRecording.split("\n")) {
    if (line.trim()) {
      console.log("  " + line);
    }
  }

  console.log("✅ Terminal recording cleanup\n");
}

/**
 * Example 4: Performance Benchmarking
 * Comparing Bun.stripANSI with traditional approaches
 */
export function performanceBenchmarking() {
  console.log("=== Performance Benchmarking ===\n");

  // Create test data with various ANSI sequences
  const testCases = [
    {
      name: "Simple colors",
      data: "\\x1b[31mRed\\x1b[0m \\x1b[32mGreen\\x1b[0m \\x1b[33mYellow\\x1b[0m".repeat(100),
    },
    {
      name: "Complex formatting",
      data: "\\x1b[1;31m\\x1b[4mBold Red Underline\\x1b[0m \\x1b[2;32m\\x1b[3mDim Green Italic\\x1b[0m".repeat(50),
    },
    {
      name: "XTerm sequences",
      data: "\\x1b]0;Window Title\\x1b\\\\x1b[31mContent\\x1b[0m\\x1b]1;Icon Title\\x1b\\\\x1b[32mMore\\x1b[0m".repeat(30),
    },
    {
      name: "Cursor control",
      data: "\\x1b[2J\\x1b[H\\x1b[31mScreen\\x1b[0m\\x1b[10;20H\\x1b[32mCursor\\x1b[0m\\x1b[?25h".repeat(75),
    },
  ];

  console.log("Benchmarking Bun.stripANSI vs Traditional Regex:");
  console.log("Test Case                    | Size    | Bun.stripANSI | Traditional | Speedup");
  console.log("-".repeat(80));

  for (const testCase of testCases) {
    const size = (testCase.data.length / 1024).toFixed(1) + "KB";
    const iterations = Math.max(1000, Math.min(10000, 10000000 / testCase.data.length));

    // Bun.stripANSI
    const bunStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      stripANSI(testCase.data);
    }
    const bunTime = performance.now() - bunStart;

    // Traditional regex (common strip-ansi pattern)
    const traditionalStrip = (str: string) =>
      str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '').replace(/\x1b\].*?\x1b\\/g, '');
    const traditionalStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      traditionalStrip(testCase.data);
    }
    const traditionalTime = performance.now() - traditionalStart;

    const speedup = (traditionalTime / bunTime).toFixed(1) + "x";
    const bunMs = bunTime.toFixed(2) + "ms";
    const traditionalMs = traditionalTime.toFixed(2) + "ms";

    console.log(`${testCase.name.padEnd(25)} | ${size.padEnd(7)} | ${bunMs.padEnd(12)} | ${traditionalMs.padEnd(11)} | ${speedup}`);
  }

  console.log("✅ High-performance ANSI processing\n");
}

/**
 * Example 5: Integration with File Processing
 * Reading, cleaning, and writing log files
 */
export function fileProcessingExamples() {
  console.log("=== File Processing Integration ===\n");

  // Simulate reading a colored log file
  const coloredLogContent = [
    "\\x1b[32m[INFO]\\x1b[0m \\x1b[36m2024-01-01 10:00:00\\x1b[0m Application started",
    "\\x1b[33m[WARN]\\x1b[0m \\x1b[36m2024-01-01 10:05:00\\x1b[0m Memory usage high: 80%",
    "\\x1b[31m[ERROR]\\x1b[0m \\x1b[36m2024-01-01 10:10:00\\x1b[0m Database connection timeout",
    "\\x1b[34m[DEBUG]\\x1b[0m \\x1b[36m2024-01-01 10:15:00\\x1b[0m Processing 1500 records",
    "\\x1b[32m[INFO]\\x1b[0m \\x1b[36m2024-01-01 10:20:00\\x1b[0m Batch processing completed",
  ].join("\n");

  console.log("Simulating file processing workflow:");
  console.log("1. Read colored log file");
  console.log("2. Strip ANSI escape codes");
  console.log("3. Write clean log file");
  console.log("4. Generate processing report\n");

  // Simulate the processing workflow
  console.log("Original file content:");
  console.log(coloredLogContent);

  const cleanContent = stripANSI(coloredLogContent);
  console.log("\nCleaned file content:");
  console.log(cleanContent);

  // Generate processing statistics
  const originalSize = coloredLogContent.length;
  const cleanSize = cleanContent.length;
  const reduction = ((originalSize - cleanSize) / originalSize * 100).toFixed(1);

  console.log(`\nProcessing Statistics:`);
  console.log(`  Original size: ${originalSize} characters`);
  console.log(`  Clean size: ${cleanSize} characters`);
  console.log(`  Size reduction: ${reduction}%`);
  console.log(`  ANSI sequences removed: ${originalSize - cleanSize} characters`);

  console.log("✅ File processing integration\n");
}

// Run all examples
export function runAllStripANSIExamples() {
  console.log("🚀 Bun 1.3 stripANSI - Practical Examples\n");

  logProcessingExamples();
  cliOutputExamples();
  terminalRecordingExamples();
  performanceBenchmarking();
  fileProcessingExamples();

  console.log("🎯 Bun.stripANSI delivers enterprise-grade ANSI processing!");
  console.log("   • 6-57x faster than traditional regex");
  console.log("   • Handles complex XTerm sequences");
  console.log("   • SIMD-accelerated performance");
  console.log("   • Zero external dependencies");
}

// Allow running as standalone script
if (import.meta.main) {
  runAllStripANSIExamples();
}