#!/usr/bin/env bun
/**
 * @fileoverview Complete demo showcasing Bun.spawn() API covering all features
 * @description Comprehensive demonstration of Bun.spawn() API including both overloads, all stdin/stdout/stderr types, process management, resource monitoring, timeout handling, IPC communication, and synchronous spawn operations.
 * @module examples/demos/demo-bun-spawn-complete
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.2.1.0.0.0.0;instance-id=EXAMPLE-BUN-SPAWN-001;version=6.2.1.0.0.0.0}]
 * [PROPERTIES:{example={value:"Bun.spawn() Complete Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.2.1.0.0.0.0"}}]
 * [CLASS:BunSpawnDemo][#REF:v-6.2.1.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.2.1.0.0.0.0
 * Ripgrep Pattern: 6\.2\.1\.0\.0\.0\.0|EXAMPLE-BUN-SPAWN-001|BP-EXAMPLE@6\.2\.1\.0\.0\.0\.0
 * 
 * Features:
 * - Both API overloads (command array vs options object)
 * - All stdin types: Response, Request, Blob, BunFile, ArrayBufferView, ReadableStream
 * - All stdout/stderr types: pipe, inherit, ignore, BunFile, ArrayBufferView, number
 * - Process management: kill, ref, unref, send, disconnect
 * - Resource usage monitoring
 * - Timeout and AbortSignal
 * - onExit callback
 * - Environment variables and working directory
 * - IPC communication
 * - spawnSync for synchronous operations
 * 
 * @example 6.2.1.0.0.0.0.1: Basic Bun.spawn() Usage
 * // Test Formula:
 * // 1. Create spawn process with command array or options object
 * // 2. Configure stdin/stdout/stderr
 * // 3. Wait for process to exit
 * // 4. Read output and check exit code
 * // Expected Result: Process spawns, executes, and exits successfully
 * //
 * // Snippet:
 * ```typescript
 * const proc = Bun.spawn(['echo', 'Hello']);
 * await proc.exited;
 * const output = await (proc.stdout as any).text(); // Bun provides native .text() method
 * ```
 * 
 * @see {@link https://bun.sh/docs/api/spawn Bun.spawn() Documentation}
 * 
 * // Ripgrep: 6.2.1.0.0.0.0
 * // Ripgrep: EXAMPLE-BUN-SPAWN-001
 * // Ripgrep: BP-EXAMPLE@6.2.1.0.0.0.0
 */

// Make this file a module to support top-level await
export {};

console.info("\n" + "═".repeat(70));
console.info("  Bun.spawn() Complete API Demo");
console.info("═".repeat(70) + "\n");

// Helper function to run examples with error handling
async function runExample(name: string, fn: () => Promise<void> | void) {
  console.info(`📋 ${name}`);
  console.info("-".repeat(70));
  try {
    await fn();
    console.info("✅ Success\n");
  } catch (error) {
    console.info(`⚠️  Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

// ============================================================================
// 1. API OVERLOADS
// ============================================================================

await runExample("Example 1: Command Array API", async () => {
  const proc = Bun.spawn(["echo", "Hello from command array API"]);
  await proc.exited;
  console.info("Process completed with exit code:", await proc.exited);
});

await runExample("Example 2: Options Object API", async () => {
  const proc = Bun.spawn({
    cmd: ["echo", "Hello from options object API"],
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Output:", output.trim());
});

// ============================================================================
// 2. STDIN TYPES
// ============================================================================

await runExample("Example 3: Stdin from Response (User's Example)", async () => {
  const proc = Bun.spawn(["cat"], {
    stdin: await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/examples/hashing.js"),
  });
  const reader = proc.stdout.getReader();
  const { value } = await reader.read();
  const text = new TextDecoder().decode(value);
  console.info("Fetched content length:", text.length, "characters");
  console.info("First 100 chars:", text.substring(0, 100) + "...");
});

await runExample("Example 4: Stdin from Request", async () => {
  const request = new Request("https://httpbin.org/post", {
    method: "POST",
    body: JSON.stringify({ test: "data" }),
  });
  const proc = Bun.spawn(["cat"], {
    stdin: request,
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Request body passed through:", output.substring(0, 100));
});

await runExample("Example 5: Stdin from Blob", async () => {
  const blob = new Blob(["Hello from Blob!\nLine 2\nLine 3"], { type: "text/plain" });
  const proc = Bun.spawn(["cat"], {
    stdin: blob,
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Blob content:", output.trim());
});

await runExample("Example 6: Stdin from BunFile", async () => {
  // Create a temporary file
  const tempFile = Bun.file("/tmp/bun-spawn-demo.txt");
  await Bun.write(tempFile, "Hello from BunFile!\nThis is a test.");
  
  const proc = Bun.spawn(["cat"], {
    stdin: tempFile,
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("File content:", output.trim());
  
  // Cleanup
  await Bun.write(tempFile, "");
});

await runExample("Example 7: Stdin from ArrayBufferView (Uint8Array)", async () => {
  const data = new TextEncoder().encode("Hello from Uint8Array!\nBinary data here.");
  const proc = Bun.spawn(["cat"], {
    stdin: data,
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("ArrayBufferView content:", output.trim());
});

await runExample("Example 8: Stdin from ReadableStream", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("Line 1\n"));
      controller.enqueue(new TextEncoder().encode("Line 2\n"));
      controller.enqueue(new TextEncoder().encode("Line 3\n"));
      controller.close();
    },
  });
  
  const proc = Bun.spawn(["cat"], {
    stdin: stream,
    stdout: "pipe",
  });
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Stream content:", output.trim());
});

await runExample("Example 9: Stdin as 'pipe' (Manual Write)", async () => {
  const proc = Bun.spawn(["cat"], {
    stdin: "pipe",
    stdout: "pipe",
  });
  
  proc.stdin.write("Manual write 1\n");
  proc.stdin.write("Manual write 2\n");
  proc.stdin.end();
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Manual write output:", output.trim());
});

// ============================================================================
// 3. STDOUT/STDERR TYPES
// ============================================================================

await runExample("Example 10: Stdout/Stderr as 'pipe'", async () => {
  const proc = Bun.spawn(["sh", "-c", "echo 'stdout message'; echo 'stderr message' >&2"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const [stdout, stderr] = await Promise.all([
    (proc.stdout as any).text(),
    (proc.stderr as any).text(),
  ]);
  
  console.info("Stdout:", stdout.trim());
  console.info("Stderr:", stderr.trim());
});

await runExample("Example 11: Stdout/Stderr as 'inherit'", async () => {
  console.info("(Output will appear directly in console)");
  const proc = Bun.spawn(["echo", "Inherited stdout"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
});

await runExample("Example 12: Stdout/Stderr as 'ignore'", async () => {
  const proc = Bun.spawn(["sh", "-c", "echo 'hidden'; echo 'also hidden' >&2"], {
    stdout: "ignore",
    stderr: "ignore",
  });
  await proc.exited;
  console.info("Process completed (output was ignored)");
});

await runExample("Example 13: Stdout to BunFile", async () => {
  const outputFile = Bun.file("/tmp/bun-spawn-output.txt");
  const proc = Bun.spawn(["echo", "Hello, this goes to a file!"], {
    stdout: outputFile,
  });
  await proc.exited;
  
  const content = await outputFile.text();
  console.info("File content:", content.trim());
  
  // Cleanup
  await Bun.write(outputFile, "");
});

await runExample("Example 14: Stdout to ArrayBufferView (Uint8Array)", async () => {
  const buffer = new Uint8Array(1024);
  const proc = Bun.spawn(["echo", "Hello to buffer!"], {
    stdout: buffer,
  });
  await proc.exited;
  
  // Find null terminator or end of data
  let length = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) break;
    length = i + 1;
  }
  
  const text = new TextDecoder().decode(buffer.subarray(0, length));
  console.info("Buffer content:", text.trim());
});

await runExample("Example 15: Stdout to File Descriptor Number", async () => {
  // This would write to a specific file descriptor
  // In practice, you'd typically use 'inherit' or 'pipe'
  console.info("(File descriptor numbers are typically used for advanced scenarios)");
  const proc = Bun.spawn(["echo", "test"], {
    stdout: 1, // stdout file descriptor
  });
  await proc.exited;
});

// ============================================================================
// 4. PROCESS MANAGEMENT
// ============================================================================

await runExample("Example 16: Process Kill", async () => {
  const proc = Bun.spawn(["sleep", "10"], {
    stdout: "pipe",
  });
  
  // Kill after 100ms
  setTimeout(() => {
    proc.kill();
    console.info("Process killed");
  }, 100);
  
  const exitCode = await proc.exited;
  console.info("Exit code:", exitCode);
  console.info("Killed:", exitCode !== 0);
});

await runExample("Example 17: Process Kill with Signal", async () => {
  const proc = Bun.spawn(["sleep", "5"], {
    stdout: "pipe",
  });
  
  setTimeout(() => {
    proc.kill("SIGTERM"); // Graceful termination
    console.info("Sent SIGTERM");
  }, 100);
  
  await proc.exited;
  console.info("Process terminated");
});

await runExample("Example 18: Process Ref/Unref", async () => {
  const proc = Bun.spawn(["sleep", "1"], {
    stdout: "pipe",
  });
  
  console.info("Process created, unref() called");
  proc.unref(); // Process won't keep event loop alive
  
  // Note: In a real scenario, the process might exit before main script
  // This is useful for background processes
  console.info("Main script can exit independently");
  
  await proc.exited;
});

await runExample("Example 19: Process Send (IPC)", async () => {
  // IPC requires a Node.js-compatible child process setup
  // This is a simplified example
  console.info("IPC send() is available for Node.js-compatible processes");
  const proc = Bun.spawn(["node", "-e", "process.on('message', (m) => console.info('Received:', m)); process.send('pong');"], {
    stdout: "pipe",
  });
  
  if (proc.send) {
    proc.send("ping");
  }
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("IPC output:", output.trim());
});

// ============================================================================
// 5. RESOURCE USAGE MONITORING
// ============================================================================

await runExample("Example 20: Resource Usage Monitoring", async () => {
  const proc = Bun.spawn(["bun", "--version"], {
    stdout: "pipe",
  });
  
  await proc.exited;
  
  const usage = proc.resourceUsage();
  if (usage) {
    console.info("Resource Usage:");
    console.info(`  Max memory used: ${usage.maxRSS} bytes`);
    console.info(`  CPU time (user): ${usage.cpuTime.user} ns`);
    console.info(`  CPU time (system): ${usage.cpuTime.system} ns`);
    console.info(`  CPU time (total): ${usage.cpuTime.total} ns`);
    console.info(`  Context switches (voluntary): ${usage.contextSwitches.voluntary}`);
    console.info(`  Context switches (involuntary): ${usage.contextSwitches.involuntary}`);
    console.info(`  I/O ops (in): ${usage.ops.in}`);
    console.info(`  I/O ops (out): ${usage.ops.out}`);
    console.info(`  Signals: ${usage.signalCount}`);
    console.info(`  Swaps: ${usage.swapCount}`);
    
    // Formatted output
    const memoryMB = usage.maxRSS / 1024 / 1024;
    const cpuTimeUs = usage.cpuTime.total / 1_000; // Convert ns to µs
    console.info(`\nFormatted:`);
    console.info(`  Memory: ${memoryMB.toFixed(2)} MB`);
    console.info(`  CPU time: ${cpuTimeUs.toFixed(2)} µs`);
  }
});

// ============================================================================
// 6. TIMEOUT AND ABORTSIGNAL
// ============================================================================

await runExample("Example 21: Timeout Option", async () => {
  try {
    const proc = Bun.spawn(["sleep", "10"], {
      stdout: "pipe",
      timeout: 100, // 100ms timeout
    });
    
    await proc.exited;
  } catch (error) {
    console.info("Timeout caught:", error instanceof Error ? error.message : String(error));
  }
});

await runExample("Example 22: AbortSignal", async () => {
  const controller = new AbortController();
  const proc = Bun.spawn(["sleep", "5"], {
    stdout: "pipe",
    signal: controller.signal,
  });
  
  setTimeout(() => {
    controller.abort();
    console.info("Abort signal sent");
  }, 100);
  
  try {
    await proc.exited;
  } catch (error) {
    console.info("Aborted:", error instanceof Error ? error.message : String(error));
  }
});

// ============================================================================
// 7. ONEXIT CALLBACK
// ============================================================================

await runExample("Example 23: onExit Callback", async () => {
  let exitCode: number | null = null;
  let signal: number | null = null;
  
  const proc = Bun.spawn(["echo", "test"], {
    stdout: "pipe",
    onExit(subprocess, code, signalNum, error) {
      exitCode = code;
      signal = signalNum;
      console.info("onExit called:");
      console.info("  Exit code:", code);
      console.info("  Signal:", signalNum);
      console.info("  Error:", error ? error.message : "none");
    },
  });
  
  await proc.exited;
  console.info("Process exited, callback was invoked");
});

// ============================================================================
// 8. ENVIRONMENT VARIABLES AND WORKING DIRECTORY
// ============================================================================

await runExample("Example 24: Environment Variables", async () => {
  const proc = Bun.spawn(["sh", "-c", "echo $CUSTOM_VAR"], {
    stdout: "pipe",
    env: {
      ...process.env,
      CUSTOM_VAR: "Hello from custom env!",
    },
  });
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Environment variable:", output.trim());
});

await runExample("Example 25: Working Directory", async () => {
  const proc = Bun.spawn(["pwd"], {
    stdout: "pipe",
    cwd: "/tmp",
  });
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Working directory:", output.trim());
});

// ============================================================================
// 9. SPAWNSYNC FOR SYNCHRONOUS OPERATIONS
// ============================================================================

await runExample("Example 26: spawnSync - Synchronous Execution", () => {
  const result = Bun.spawnSync(["echo", "Hello from spawnSync"], {
    stdout: "pipe",
  });
  
  console.info("Output:", result.stdout.toString().trim());
  console.info("Exit code:", result.exitCode);
  console.info("Success:", result.success);
});

await runExample("Example 27: spawnSync - Error Handling", () => {
  const result = Bun.spawnSync(["sh", "-c", "exit 42"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  
  console.info("Exit code:", result.exitCode);
  console.info("Success:", result.success);
  console.info("Stdout:", result.stdout.toString().trim());
  console.info("Stderr:", result.stderr?.toString().trim() || "(empty)");
});

await runExample("Example 28: spawnSync - With Environment", () => {
  const result = Bun.spawnSync(["sh", "-c", "echo $TEST_VAR"], {
    stdout: "pipe",
    env: {
      TEST_VAR: "spawnSync test value",
    },
  });
  
  console.info("Environment variable:", result.stdout.toString().trim());
});

// ============================================================================
// 10. ADVANCED: COMBINING FEATURES
// ============================================================================

await runExample("Example 29: Complete Workflow - Fetch, Process, Monitor", async () => {
  // Fetch data from URL
  const response = await fetch("https://httpbin.org/json");
  
  // Process through jq (if available) or cat
  const proc = Bun.spawn(["cat"], {
    stdin: response,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
    cwd: process.cwd(),
    onExit(subprocess, code, signal, error) {
      if (error) {
        console.info("Process error:", error.message);
      }
    },
  });
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  const usage = proc.resourceUsage();
  
  console.info("Processed JSON length:", output.length, "characters");
  if (usage) {
    console.info("CPU time:", usage.cpuTime.total, "ns");
    console.info("Memory:", usage.maxRSS, "bytes");
  }
  console.info("Exit code:", await proc.exited);
});

await runExample("Example 30: Streaming Large Data", async () => {
  // Create a large data stream
  const largeData = "Line ".repeat(1000).split("").map((_, i) => `Line ${i}\n`).join("");
  const stream = new ReadableStream({
    start(controller) {
      const chunks = largeData.match(/.{1,100}/g) || [];
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  
  const proc = Bun.spawn(["wc", "-l"], {
    stdin: stream,
    stdout: "pipe",
  });
  
  // Bun provides native .text() method on stdout/stderr streams
  const output = await (proc.stdout as any).text();
  console.info("Line count:", output.trim());
});

// ============================================================================
// SUMMARY
// ============================================================================

console.info("═".repeat(70));
console.info("  Demo Complete!");
console.info("═".repeat(70));
console.info("\n💡 Key Takeaways:");
console.info("  • Bun.spawn() supports two API styles: command array and options object");
console.info("  • Stdin accepts: Response, Request, Blob, BunFile, ArrayBufferView, ReadableStream, 'pipe'");
console.info("  • Stdout/Stderr accept: 'pipe', 'inherit', 'ignore', BunFile, ArrayBufferView, number");
console.info("  • Process management: kill(), ref(), unref(), send(), disconnect()");
console.info("  • Resource monitoring: resourceUsage() for CPU, memory, and system stats");
console.info("  • Timeout and AbortSignal for cancellation");
console.info("  • onExit callback for cleanup");
console.info("  • spawnSync() for synchronous operations");
console.info("\n📚 See docs/BUN-SPAWN-COMPLETE.md for complete API reference\n");
