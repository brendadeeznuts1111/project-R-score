#!/usr/bin/env bun
/**
 * @fileoverview Bun Spawn HTTP Piping Demo
 * @description Demonstrate piping HTTP responses to subprocess stdin with spawn and spawnSync
 * @module examples/demos/demo-bun-spawn-http-pipe.ts
 */

import { $ } from "bun";

/**
 * HTTP Validation Utilities using spawnSync
 */
class HttpValidator {
  static async checkUrl(url: string): Promise<boolean> {
    const result = Bun.spawnSync({
      cmd: ["curl", "-I", "--max-time", "5", "--silent", url],
    });
    return result.success;
  }

  static async getContentType(url: string): Promise<string | null> {
    const result = Bun.spawnSync({
      cmd: ["curl", "-I", "--max-time", "5", "--silent", url],
    });

    if (!result.success) return null;

    const headers = result.stdout?.toString() || "";
    const match = headers.match(/content-type:\s*([^\r\n]+)/i);
    return match ? match[1] : null;
  }

  static async getContentLength(url: string): Promise<number | null> {
    const result = Bun.spawnSync({
      cmd: ["curl", "-I", "--max-time", "5", "--silent", url],
    });

    if (!result.success) return null;

    const headers = result.stdout?.toString() || "";
    const match = headers.match(/content-length:\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }
}

/**
 * Resource Usage Monitor
 */
class ResourceMonitor {
  static async monitorProcess(proc: Bun.Subprocess): Promise<void> {
    await proc.exited;
    const usage = proc.resourceUsage();

    if (usage) {
      console.log(`📊 Resource Usage:`);
      console.log(`   Max memory: ${usage.maxRSS} bytes`);
      console.log(`   CPU time (user): ${usage.cpuTime.user} µs`);
      console.log(`   CPU time (system): ${usage.cpuTime.system} µs`);
      console.log(`   Total CPU time: ${usage.cpuTime.total} µs`);
    }
  }
}

/**
 * Example 1: Basic HTTP response piping with validation and monitoring
 */
async function basicHttpPipe() {
  console.log("=== Basic HTTP Response Piping ===");

  const url = "https://httpbin.org/get";

  // Pre-validate URL with spawnSync
  console.log("🔍 Validating URL...");
  const isValid = await HttpValidator.checkUrl(url);
  if (!isValid) {
    console.log("❌ URL not accessible");
    return;
  }
  console.log("✅ URL accessible");

  // Get content type
  const contentType = await HttpValidator.getContentType(url);
  console.log(`📄 Content-Type: ${contentType || "unknown"}`);

  const proc = Bun.spawn(["cat"], {
    stdin: await fetch(url),
    onExit(proc, exitCode, signalCode, error) {
      if (exitCode !== 0) {
        console.error(`❌ Process failed: ${error?.message || `exit code ${exitCode}`}`);
      }
    },
  });

  // Monitor resources in background
  ResourceMonitor.monitorProcess(proc);

  // Use proper Response wrapper for .text() method
  const text = await new Response(proc.stdout).text();
  console.log("Fetched content length:", text.length);
  console.log("First 100 chars:", text.substring(0, 100) + "...");

  // Wait for process to complete
  await proc.exited;
}

/**
 * Example 2: Using $ template literal with HTTP piping
 */
async function templateHttpPipe() {
  console.log("\n=== Template Literal HTTP Piping ===");

  // Fetch and pipe to grep
  const result = await $`curl -s https://raw.githubusercontent.com/oven-sh/bun/main/package.json | grep -o '"version": "[^"]*"'`;
  console.log("Bun version from package.json:", result.stdout.toString().trim());
}

/**
 * Example 3: Processing JSON data through pipeline
 */
async function jsonProcessingPipe() {
  console.log("\n=== JSON Processing Pipeline ===");

  try {
    // Fetch package.json and extract devDependencies count
    const result = await $`curl -s https://raw.githubusercontent.com/oven-sh/bun/main/package.json | jq '.devDependencies | length'`;

    console.log("Bun has", result.stdout.toString().trim(), "devDependencies");
  } catch (error) {
    console.log("JSON processing failed, trying fallback...");

    // Fallback: simpler approach
    const response = await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/package.json");
    const packageJson = await response.json();
    const depCount = Object.keys(packageJson.devDependencies || {}).length;
    console.log("Bun has", depCount, "devDependencies (fallback method)");
  }
}

/**
 * Example 4: Streaming large files with progress
 */
async function streamingLargeFile() {
  console.log("\n=== Streaming Large File Processing ===");

  // Download and process a large text file
  const proc = Bun.spawn(["wc", "-l"], {
    stdin: await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/README.md"),
  });

  // Bun provides native .text() method on stdout/stderr streams
  const lineCount = await (proc.stdout as any).text();
  console.log("Lines in bun.js source:", lineCount.trim());
}

/**
 * Example 5: Error handling with HTTP pipes
 */
async function errorHandling() {
  console.log("\n=== Error Handling ===");

  try {
    // Try to fetch non-existent URL
    const proc = Bun.spawn(["cat"], {
      stdin: await fetch("https://httpstat.us/404"),
    });

    // Bun provides native .text() method on stdout/stderr streams
    const result = await (proc.stdout as any).text();
    console.log("Unexpected success:", result.length, "chars");
  } catch (error) {
    console.log("Expected error caught:", error.message);
  }
}

/**
 * Example 6: Real-world use case - API data processing
 */
async function apiDataProcessing() {
  console.log("\n=== API Data Processing ===");

  try {
    // Fetch GitHub API and process with jq
    const result = await $`curl -s https://api.github.com/repos/oven-sh/bun | jq -r '"Stars: " + (.stargazers_count | tostring) + ", Forks: " + (.forks_count | tostring)'`;

    console.log("Bun repository stats:", result.stdout.toString().trim());
  } catch (error) {
    console.log("API processing failed:", error.message);
  }
}

/**
 * Example 7: IPC Communication Demo
 */
async function ipcCommunicationDemo() {
  console.log("\n=== IPC Communication Demo ===");

  try {
    // Create a subprocess that communicates via IPC
    const proc = Bun.spawn(["node", "-e", `
      process.on('message', (msg) => {
        console.log('📨 Child received:', JSON.stringify(msg));
        process.send({ response: 'Hello from child!', data: msg, timestamp: Date.now() });
        setTimeout(() => process.exit(0), 100); // Exit after sending response
      });

      // Timeout if no message received
      setTimeout(() => {
        console.log('⏰ Child timeout - no message received');
        process.exit(1);
      }, 3000);
    `], {
      ipc: (message, subprocess) => {
        console.log('📬 Parent received IPC message:', JSON.stringify(message));
      },
      timeout: 5000, // 5 second timeout
    });

    // Send message to child process
    console.log('📤 Parent sending message to child...');
    proc.send({ type: 'test', payload: 'IPC message from parent', timestamp: Date.now() });

    await proc.exited;
    console.log('✅ IPC demo completed');
  } catch (error) {
    console.log('❌ IPC demo failed:', error.message);
  }
}

/**
 * Example 8: Timeout Handling
 */
async function timeoutHandlingDemo() {
  console.log("\n=== Timeout Handling Demo ===");

  try {
    // Process with timeout - should complete normally
    const proc = Bun.spawn(["sleep", "1"], {
      timeout: 3000, // 3 seconds
    });

    console.log("Process started with 3s timeout...");
    await proc.exited;
    console.log("✅ Process completed within timeout");
  } catch (error) {
    console.log("❌ Process timed out:", error.message);
  }

  try {
    // Process that will timeout - use a hanging command
    const proc = Bun.spawn(["bash", "-c", "echo 'Starting long process...'; sleep 5; echo 'Done'"], {
      timeout: 2000, // 2 seconds
    });

    console.log("Process started with 2s timeout (5s sleep)...");
    await proc.exited;
    console.log("✅ Process completed (unexpected)");
  } catch (error) {
    console.log("❌ Process timed out as expected:", error.message);
  }
}

/**
 * Example 9: AbortSignal Integration
 */
async function abortSignalDemo() {
  console.log("\n=== AbortSignal Integration Demo ===");

  const controller = new AbortController();
  const { signal } = controller;

  // Start a long-running process
  const proc = Bun.spawn(["bash", "-c", "echo 'Starting long process...'; sleep 10; echo 'Done'"], {
    signal, // Connect abort signal
  });

  console.log("Started long-running process (10s sleep)...");

  // Abort after 2 seconds
  setTimeout(() => {
    console.log("🛑 Aborting process after 2 seconds...");
    controller.abort();
  }, 2000);

  try {
    await proc.exited;
    console.log("✅ Process completed normally");
  } catch (error) {
    console.log("❌ Process aborted:", error.message);
  }
}

/**
 * Example 10: Memory Limits and Resource Constraints
 */
async function memoryLimitsDemo() {
  console.log("\n=== Memory Limits Demo ===");

  try {
    // Try to allocate a lot of memory in subprocess
    const proc = Bun.spawn(["node", "-e", `
      const arr = [];
      for (let i = 0; i < 1000000; i++) {
        arr.push(new Array(1000).fill('x').join(''));
      }
      console.log('Memory allocation completed');
    `], {
      maxBuffer: 1024 * 1024, // 1MB limit
    });

    await proc.exited;
    console.log("✅ Process completed within memory limits");
  } catch (error) {
    console.log("❌ Process exceeded memory limits:", error.message);
  }
}

/**
 * Example 11: Hybrid Sync/Async Pipeline Pattern
 */
async function hybridPipelineDemo() {
  console.log("\n=== Hybrid Sync/Async Pipeline Demo ===");

  const url = "https://httpbin.org/json";

  // Check content size first
  const contentLength = await HttpValidator.getContentLength(url);
  console.log(`Content length: ${contentLength} bytes`);

  if (contentLength && contentLength < 10000) {
    // Small content: use spawnSync for immediate result
    console.log("Using spawnSync for small content...");
    const result = Bun.spawnSync({
      cmd: ["curl", "-s", url],
    });

    if (result.success) {
      const data = result.stdout.toString();
      console.log("Sync result length:", data.length);
    }
  } else {
    // Large content: use async spawn
    console.log("Using async spawn for larger content...");
    const proc = Bun.spawn(["curl", "-s", url]);

    const data = await new Response(proc.stdout).text();
    console.log("Async result length:", data.length);

    await proc.exited;
  }
}

/**
 * Example 12: Performance Benchmarking
 */
async function performanceBenchmarkDemo() {
  console.log("\n=== Performance Benchmarking Demo ===");

  const url = "https://httpbin.org/json";
  const iterations = 5;

  console.log(`Benchmarking ${iterations} iterations of HTTP fetch + processing...`);

  // Benchmark spawnSync approach
  const syncTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = Bun.spawnSync({
      cmd: ["curl", "-s", url],
    });
    const end = performance.now();
    if (result.success) {
      syncTimes.push(end - start);
    }
  }

  // Benchmark async spawn approach
  const asyncTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const proc = Bun.spawn(["curl", "-s", url]);
    await new Response(proc.stdout).text();
    await proc.exited;
    const end = performance.now();
    asyncTimes.push(end - start);
  }

  // Calculate statistics
  const avgSync = syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length;
  const avgAsync = asyncTimes.reduce((a, b) => a + b, 0) / asyncTimes.length;

  console.log(`SpawnSync average: ${avgSync.toFixed(2)}ms`);
  console.log(`Async spawn average: ${avgAsync.toFixed(2)}ms`);
  console.log(`Performance ratio: ${(avgAsync / avgSync).toFixed(2)}x ${avgAsync > avgSync ? '(async slower)' : '(async faster)'}`);
}

// Run all examples
async function main() {
  console.log("🚀 Bun Spawn HTTP Piping Examples\n");

  await basicHttpPipe();
  await templateHttpPipe();
  await jsonProcessingPipe();
  await streamingLargeFile();
  await errorHandling();
  await apiDataProcessing();
  await ipcCommunicationDemo();
  await timeoutHandlingDemo();
  await abortSignalDemo();
  await memoryLimitsDemo();
  await hybridPipelineDemo();
  await performanceBenchmarkDemo();

  console.log("\n✅ All examples completed!");
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}