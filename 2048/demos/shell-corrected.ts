#!/usr/bin/env bun

// Corrected Bun Shell demo using proper API and available commands
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log(colourKit(0.8).ansi + "✅ Corrected Bun Shell Demo" + "\x1b[0m");
console.log("=".repeat(50));

// Basic shell commands with proper output handling
async function basicShellCommands() {
  console.log(colourKit(0.6).ansi + "\n🔧 Basic Shell Commands" + "\x1b[0m");

  try {
    // Simple echo with proper text() method
    const echoResult = await $`echo "Hello from Corrected Bun Shell!"`.text();
    console.log(`📢 Echo: ${echoResult.trim()}`);

    // Current directory
    const pwdResult = await $`pwd`.text();
    console.log(`📁 Current directory: ${pwdResult.trim()}`);

    // List files
    console.log("\n📋 TypeScript files:");
    const tsFiles =
      await $`ls *.ts 2>/dev/null || echo "No .ts files found"`.text();
    console.log(tsFiles);

    // Date and time
    const dateResult = await $`date`.text();
    console.log(`🕒 Current time: ${dateResult.trim()}`);

    // User information
    const whoResult = await $`whoami`.text();
    console.log(`👤 Current user: ${whoResult.trim()}`);
  } catch (error) {
    console.log(`❌ Shell command error: ${error.message}`);
  }
}

// File operations using available commands
async function fileOperations() {
  console.log(colourKit(0.7).ansi + "\n💾 File Operations" + "\x1b[0m");

  try {
    // Create directory
    await $`mkdir -p shell-test`;
    console.log("📁 Created directory: shell-test");

    // Create files
    await $`touch shell-test/file1.txt shell-test/file2.txt`;
    console.log("📄 Created test files");

    // List directory contents
    console.log("\n📋 Directory contents:");
    const listResult = await $`ls -la shell-test`.text();
    console.log(listResult);

    // Create file with content
    await $`echo "This is test content" > shell-test/content.txt`;
    console.log("📝 Created content file");

    // Read file content
    const content = await $`cat shell-test/content.txt`.text();
    console.log(`📖 File content: ${content.trim()}`);

    // Move file
    await $`mv shell-test/content.txt shell-test/renamed.txt`;
    console.log("🔄 Renamed content file");

    // Verify move
    const verifyResult = await $`ls shell-test/*.txt`.text();
    console.log(`✅ Files after move: ${verifyResult.trim()}`);
  } catch (error) {
    console.log(`❌ File operations error: ${error.message}`);
  }
}

// Text processing using available tools
async function textProcessing() {
  console.log(colourKit(0.5).ansi + "\n📝 Text Processing" + "\x1b[0m");

  try {
    // Create test data
    const testData = `apple
banana
cherry
date
elderberry`;

    await $`echo "${testData}" > fruits.txt`;
    console.log("📄 Created test data file");

    // Count lines (using JavaScript since wc is not available)
    const fileContent = await $`cat fruits.txt`.text();
    const lines = fileContent.trim().split("\n");
    console.log(`📊 Line count: ${lines.length}`);

    // Count words
    const words = fileContent.trim().split(/\s+/);
    console.log(`📊 Word count: ${words.length}`);

    // Count characters
    console.log(`📊 Character count: ${fileContent.length}`);

    // Find lines containing specific text
    console.log('\n🔍 Lines containing "a":');
    lines.forEach((line, i) => {
      if (line.includes("a")) {
        console.log(`  ${i + 1}. ${line}`);
      }
    });

    // Sort lines using JavaScript
    console.log("\n🔄 Sorted lines:");
    const sortedLines = [...lines].sort();
    sortedLines.forEach((line, i) => {
      console.log(`  ${i + 1}. ${line}`);
    });
  } catch (error) {
    console.log(`❌ Text processing error: ${error.message}`);
  }
}

// Environment and configuration
async function environmentConfig() {
  console.log(
    colourKit(0.4).ansi + "\n🌍 Environment Configuration" + "\x1b[0m"
  );

  try {
    // Test environment variables
    console.log("🔧 Testing environment variables:");

    // Set custom environment
    const envResult = await $`echo $SHELL`
      .env({
        SHELL: "/bin/custom-shell",
        CUSTOM_VAR: "test-value",
      })
      .text();
    console.log(`Shell: ${envResult.trim()}`);

    // Test custom variable
    const customResult = await $`echo $CUSTOM_VAR`
      .env({
        CUSTOM_VAR: "test-value",
      })
      .text();
    console.log(`Custom var: ${customResult.trim()}`);

    // Test working directory changes
    console.log("\n📁 Working directory test:");

    // Create and change to subdirectory
    await $`mkdir -p subdir`;
    const subdirResult = await $`pwd`.cwd("./subdir").text();
    console.log(`In subdir: ${subdirResult.trim()}`);

    // Go back to original directory
    const originalResult = await $`pwd`.cwd("..").text();
    console.log(`Back to: ${originalResult.trim()}`);
  } catch (error) {
    console.log(`❌ Environment config error: ${error.message}`);
  }
}

// JSON processing
async function jsonProcessing() {
  console.log(colourKit(0.8).ansi + "\n📋 JSON Processing" + "\x1b[0m");

  try {
    // Create JSON data
    const jsonData = {
      name: "Bun Shell Demo",
      version: "1.0.0",
      features: ["cross-platform", "safe", "fast"],
      metrics: {
        performance: 95,
        reliability: 98,
      },
    };

    // Write JSON to file
    await $`echo '${JSON.stringify(jsonData)}' > data.json`;
    console.log("📄 Created JSON file");

    // Read and parse JSON
    const parsedJson = await $`cat data.json`.json();
    console.log("📊 Parsed JSON data:");
    console.log(`  Name: ${parsedJson.name}`);
    console.log(`  Version: ${parsedJson.version}`);
    console.log(`  Features: ${parsedJson.features.join(", ")}`);
    console.log(`  Performance: ${parsedJson.metrics.performance}%`);

    // Test different output formats
    console.log("\n🔄 Output format comparison:");

    // As text
    const textOutput = await $`cat data.json`.text();
    console.log(`  Text length: ${textOutput.length} chars`);

    // As bytes
    const bytesOutput = await $`cat data.json`.bytes();
    console.log(`  Bytes length: ${bytesOutput.length} bytes`);

    // As array buffer
    const bufferOutput = await $`cat data.json`.arrayBuffer();
    console.log(`  Buffer size: ${bufferOutput.byteLength} bytes`);
  } catch (error) {
    console.log(`❌ JSON processing error: ${error.message}`);
  }
}

// Error handling demonstration
async function errorHandling() {
  console.log(colourKit(0.5).ansi + "\n🛡️ Error Handling" + "\x1b[0m");

  try {
    // Test successful command
    console.log("✅ Testing successful command:");
    const successResult = await $`echo "Success!"`.text();
    console.log(`  Result: ${successResult.trim()}`);

    // Test command that doesn't exist
    console.log("\n❌ Testing non-existent command:");
    try {
      await $`nonexistent-command-12345`.text();
    } catch (error) {
      if (error instanceof $.ShellError) {
        console.log(`  ✅ Caught ShellError: ${error.exitCode}`);
        console.log(`  Stderr: ${error.stderr.toString().trim()}`);
      }
    }

    // Test with nothrow
    console.log("\n🔧 Testing with nothrow():");
    const nothrowResult = await $`exit 1`.nothrow().quiet();
    console.log(`  Exit code: ${nothrowResult.exitCode}`);
    console.log(`  Stdout: ${nothrowResult.stdout.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Error handling error: ${error.message}`);
  }
}

// Process management using Bun.spawn() for system commands
async function processManagement() {
  console.log(colourKit(0.4).ansi + "\n⚙️ Process Management" + "\x1b[0m");

  try {
    // Get current process info
    const currentProcess = {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
    };

    // Display current process info in table format
    console.log("┌─────────────┬──────────────────┐");
    console.log("│ Property    │ Value            │");
    console.log("├─────────────┼──────────────────┤");
    console.log(
      `│ PID         │ ${currentProcess.pid.toString().padEnd(16)} │`
    );
    console.log(
      `│ PPID        │ ${currentProcess.ppid.toString().padEnd(16)} │`
    );
    console.log(`│ Platform    │ ${currentProcess.platform.padEnd(16)} │`);
    console.log(`│ Architecture│ ${currentProcess.arch.padEnd(16)} │`);
    console.log(`│ Version     │ ${currentProcess.nodeVersion.padEnd(16)} │`);
    console.log(
      `│ Uptime (s)  │ ${currentProcess.uptime.toFixed(2).padEnd(16)} │`
    );
    console.log("└─────────────┴──────────────────┘");

    // Get memory usage
    const memUsage = process.memoryUsage();
    console.log("\n💾 Memory Usage:");
    console.log("┌─────────────┬──────────┬──────────┐");
    console.log("│ Type        │ Used (MB)│ Total (MB)│");
    console.log("├─────────────┼──────────┼──────────┤");
    console.log(
      `│ RSS         │ ${
        (memUsage.rss / 1024 / 1024).toFixed(2).pad
      } │ N/A      │`
    );
    console.log(
      `│ Heap Used   │ ${(memUsage.heapUsed / 1024 / 1024).toFixed(2).pad} │ ${
        (memUsage.heapTotal / 1024 / 1024).toFixed(2).pad
      } │`
    );
    console.log(
      `│ External    │ ${
        (memUsage.external / 1024 / 1024).toFixed(2).pad
      } │ N/A      │`
    );
    console.log("└─────────────┴──────────┴──────────┘");

    // Get CPU usage
    const cpuUsage = process.cpuUsage();
    console.log("\n🖥️ CPU Usage:");
    console.log("┌─────────────┬──────────┐");
    console.log("│ Metric      │ Value    │");
    console.log("├─────────────┼──────────┤");
    console.log(`│ User (μs)   │ ${cpuUsage.user.toString().pad} │`);
    console.log(`│ System (μs) │ ${cpuUsage.system.toString().pad} │`);
    console.log("└─────────────┴──────────┘");

    // Environment variables summary
    console.log("\n🌍 Environment Summary:");
    const envVars = {
      SHELL: process.env.SHELL,
      PATH: process.env.PATH?.split(":").length + " paths",
      NODE_ENV: process.env.NODE_ENV || "undefined",
      USER: process.env.USER,
      HOME: process.env.HOME,
    };

    console.log("┌─────────┬─────────────────────────────────┐");
    console.log("│ Variable│ Value                           │");
    console.log("├─────────┼─────────────────────────────────┤");
    Object.entries(envVars).forEach(([key, value]) => {
      const displayValue = value?.toString().substring(0, 33) || "undefined";
      console.log(`│ ${key.padEnd(7)} │ ${displayValue.padEnd(33)} │`);
    });
    console.log("└─────────┴─────────────────────────────────┘");
  } catch (error) {
    console.log(`❌ Process management error: ${error.message}`);
  }
}

// Performance testing
async function performanceTesting() {
  console.log(colourKit(0.6).ansi + "\n⚡ Performance Testing" + "\x1b[0m");

  try {
    // Test command execution speed
    console.log("🏃 Command speed test:");
    console.log("┌─────────────────┬──────────┐");
    console.log("│ Command         │ Time (ms) │");
    console.log("├─────────────────┼──────────┤");

    const commands = ['echo "test"', "pwd", "whoami", "date"];

    for (const cmd of commands) {
      const start = performance.now();
      await $`${cmd}`.text();
      const end = performance.now();
      console.log(`│ ${cmd.padEnd(15)} │ ${(end - start).toFixed(3).pad} │`);
    }

    console.log("└─────────────────┴──────────┘");

    // Test parallel execution
    console.log("\n🔄 Parallel vs Sequential Execution:");
    console.log("┌─────────────┬──────────┬──────────┬──────────┐");
    console.log("│ Type        │ Tasks    │ Time (ms)│ Speedup  │");
    console.log("├─────────────┼──────────┼──────────┼──────────┤");

    // Parallel execution
    const parallelStart = performance.now();
    await Promise.all([
      $`echo "Task 1"`.text(),
      $`echo "Task 2"`.text(),
      $`echo "Task 3"`.text(),
    ]);
    const parallelEnd = performance.now();
    const parallelTime = parallelEnd - parallelStart;

    // Sequential execution
    const sequentialStart = performance.now();
    await $`echo "Task 1"`.text();
    await $`echo "Task 2"`.text();
    await $`echo "Task 3"`.text();
    const sequentialEnd = performance.now();
    const sequentialTime = sequentialEnd - sequentialStart;

    const speedup = (sequentialTime / parallelTime).toFixed(2);

    console.log(
      `│ Parallel    │ 3        │ ${parallelTime.toFixed(3).pad} │ ${
        speedup.pad
      } │`
    );
    console.log(
      `│ Sequential  │ 3        │ ${sequentialTime.toFixed(3).pad} │ 1.00     │`
    );
    console.log("└─────────────┴──────────┴──────────┴──────────┘");

    // Bun performance metrics
    console.log("\n📊 Bun Performance Metrics:");
    console.log("┌─────────────────┬──────────┐");
    console.log("│ Metric          │ Value    │");
    console.log("├─────────────────┼──────────┤");
    console.log(`│ Uptime (s)      │ ${process.uptime().toFixed(2).pad} │`);
    console.log(
      `│ Memory (MB)     │ ${
        (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2).pad
      } │`
    );
    console.log(
      `│ CPU User (μs)   │ ${process.cpuUsage().user.toString().pad} │`
    );
    console.log(
      `│ CPU System (μs) │ ${process.cpuUsage().system.toString().pad} │`
    );
    console.log("└─────────────────┴──────────┘");
  } catch (error) {
    console.log(`❌ Performance testing error: ${error.message}`);
  }
}

// Cleanup function
async function cleanup() {
  console.log(colourKit(0.6).ansi + "\n🧹 Cleanup" + "\x1b[0m");

  try {
    // Remove test files and directories
    await $`rm -rf shell-test subdir fruits.txt data.json 2>/dev/null || true`;
    console.log("✅ Cleaned up test files and directories");
  } catch (error) {
    console.log(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log("🎯 This corrected demo showcases proper Bun Shell usage:");
  console.log("  • Correct output handling with .text()");
  console.log("  • Only available builtin commands");
  console.log("  • Proper error handling");
  console.log("  • Environment and directory management");
  console.log("  • JSON processing");
  console.log("  • Performance testing");

  await basicShellCommands();
  await fileOperations();
  await textProcessing();
  await environmentConfig();
  await jsonProcessing();
  await errorHandling();
  await processManagement();
  await performanceTesting();
  await cleanup();

  console.log(
    "\n" + colourKit(0.2).ansi + "🎉 Corrected Shell Demo Complete!" + "\x1b[0m"
  );
  console.log("✅ Bun Shell works perfectly when used correctly!");
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 Corrected shell demo interrupted gracefully!");
  cleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
