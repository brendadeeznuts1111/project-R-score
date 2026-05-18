#!/usr/bin/env bun

// Corrected Bun Shell demo using proper API and available commands
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.info(colourKit(0.8).ansi + "✅ Corrected Bun Shell Demo" + "\x1b[0m");
console.info("=".repeat(50));

// Basic shell commands with proper output handling
async function basicShellCommands() {
  console.info(colourKit(0.6).ansi + "\n🔧 Basic Shell Commands" + "\x1b[0m");

  try {
    // Simple echo with proper text() method
    const echoResult = await $`echo "Hello from Corrected Bun Shell!"`.text();
    console.info(`📢 Echo: ${echoResult.trim()}`);

    // Current directory
    const pwdResult = await $`pwd`.text();
    console.info(`📁 Current directory: ${pwdResult.trim()}`);

    // List files
    console.info("\n📋 TypeScript files:");
    const tsFiles =
      await $`ls *.ts 2>/dev/null || echo "No .ts files found"`.text();
    console.info(tsFiles);

    // Date and time
    const dateResult = await $`date`.text();
    console.info(`🕒 Current time: ${dateResult.trim()}`);

    // User information
    const whoResult = await $`whoami`.text();
    console.info(`👤 Current user: ${whoResult.trim()}`);
  } catch (error) {
    console.info(`❌ Shell command error: ${error.message}`);
  }
}

// File operations using available commands
async function fileOperations() {
  console.info(colourKit(0.7).ansi + "\n💾 File Operations" + "\x1b[0m");

  try {
    // Create directory
    await $`mkdir -p shell-test`;
    console.info("📁 Created directory: shell-test");

    // Create files
    await $`touch shell-test/file1.txt shell-test/file2.txt`;
    console.info("📄 Created test files");

    // List directory contents
    console.info("\n📋 Directory contents:");
    const listResult = await $`ls -la shell-test`.text();
    console.info(listResult);

    // Create file with content
    await $`echo "This is test content" > shell-test/content.txt`;
    console.info("📝 Created content file");

    // Read file content
    const content = await $`cat shell-test/content.txt`.text();
    console.info(`📖 File content: ${content.trim()}`);

    // Move file
    await $`mv shell-test/content.txt shell-test/renamed.txt`;
    console.info("🔄 Renamed content file");

    // Verify move
    const verifyResult = await $`ls shell-test/*.txt`.text();
    console.info(`✅ Files after move: ${verifyResult.trim()}`);
  } catch (error) {
    console.info(`❌ File operations error: ${error.message}`);
  }
}

// Text processing using available tools
async function textProcessing() {
  console.info(colourKit(0.5).ansi + "\n📝 Text Processing" + "\x1b[0m");

  try {
    // Create test data
    const testData = `apple
banana
cherry
date
elderberry`;

    await $`echo "${testData}" > fruits.txt`;
    console.info("📄 Created test data file");

    // Count lines (using JavaScript since wc is not available)
    const fileContent = await $`cat fruits.txt`.text();
    const lines = fileContent.trim().split("\n");
    console.info(`📊 Line count: ${lines.length}`);

    // Count words
    const words = fileContent.trim().split(/\s+/);
    console.info(`📊 Word count: ${words.length}`);

    // Count characters
    console.info(`📊 Character count: ${fileContent.length}`);

    // Find lines containing specific text
    console.info('\n🔍 Lines containing "a":');
    lines.forEach((line, i) => {
      if (line.includes("a")) {
        console.info(`  ${i + 1}. ${line}`);
      }
    });

    // Sort lines using JavaScript
    console.info("\n🔄 Sorted lines:");
    const sortedLines = [...lines].sort();
    sortedLines.forEach((line, i) => {
      console.info(`  ${i + 1}. ${line}`);
    });
  } catch (error) {
    console.info(`❌ Text processing error: ${error.message}`);
  }
}

// Environment and configuration
async function environmentConfig() {
  console.info(
    colourKit(0.4).ansi + "\n🌍 Environment Configuration" + "\x1b[0m"
  );

  try {
    // Test environment variables
    console.info("🔧 Testing environment variables:");

    // Set custom environment
    const envResult = await $`echo $SHELL`
      .env({
        SHELL: "/bin/custom-shell",
        CUSTOM_VAR: "test-value",
      })
      .text();
    console.info(`Shell: ${envResult.trim()}`);

    // Test custom variable
    const customResult = await $`echo $CUSTOM_VAR`
      .env({
        CUSTOM_VAR: "test-value",
      })
      .text();
    console.info(`Custom var: ${customResult.trim()}`);

    // Test working directory changes
    console.info("\n📁 Working directory test:");

    // Create and change to subdirectory
    await $`mkdir -p subdir`;
    const subdirResult = await $`pwd`.cwd("./subdir").text();
    console.info(`In subdir: ${subdirResult.trim()}`);

    // Go back to original directory
    const originalResult = await $`pwd`.cwd("..").text();
    console.info(`Back to: ${originalResult.trim()}`);
  } catch (error) {
    console.info(`❌ Environment config error: ${error.message}`);
  }
}

// JSON processing
async function jsonProcessing() {
  console.info(colourKit(0.8).ansi + "\n📋 JSON Processing" + "\x1b[0m");

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
    console.info("📄 Created JSON file");

    // Read and parse JSON
    const parsedJson = await $`cat data.json`.json();
    console.info("📊 Parsed JSON data:");
    console.info(`  Name: ${parsedJson.name}`);
    console.info(`  Version: ${parsedJson.version}`);
    console.info(`  Features: ${parsedJson.features.join(", ")}`);
    console.info(`  Performance: ${parsedJson.metrics.performance}%`);

    // Test different output formats
    console.info("\n🔄 Output format comparison:");

    // As text
    const textOutput = await $`cat data.json`.text();
    console.info(`  Text length: ${textOutput.length} chars`);

    // As bytes
    const bytesOutput = await $`cat data.json`.bytes();
    console.info(`  Bytes length: ${bytesOutput.length} bytes`);

    // As array buffer
    const bufferOutput = await $`cat data.json`.arrayBuffer();
    console.info(`  Buffer size: ${bufferOutput.byteLength} bytes`);
  } catch (error) {
    console.info(`❌ JSON processing error: ${error.message}`);
  }
}

// Error handling demonstration
async function errorHandling() {
  console.info(colourKit(0.5).ansi + "\n🛡️ Error Handling" + "\x1b[0m");

  try {
    // Test successful command
    console.info("✅ Testing successful command:");
    const successResult = await $`echo "Success!"`.text();
    console.info(`  Result: ${successResult.trim()}`);

    // Test command that doesn't exist
    console.info("\n❌ Testing non-existent command:");
    try {
      await $`nonexistent-command-12345`.text();
    } catch (error) {
      if (error instanceof $.ShellError) {
        console.info(`  ✅ Caught ShellError: ${error.exitCode}`);
        console.info(`  Stderr: ${error.stderr.toString().trim()}`);
      }
    }

    // Test with nothrow
    console.info("\n🔧 Testing with nothrow():");
    const nothrowResult = await $`exit 1`.nothrow().quiet();
    console.info(`  Exit code: ${nothrowResult.exitCode}`);
    console.info(`  Stdout: ${nothrowResult.stdout.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Error handling error: ${error.message}`);
  }
}

// Process management using Bun.spawn() for system commands
async function processManagement() {
  console.info(colourKit(0.4).ansi + "\n⚙️ Process Management" + "\x1b[0m");

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
    console.info("┌─────────────┬──────────────────┐");
    console.info("│ Property    │ Value            │");
    console.info("├─────────────┼──────────────────┤");
    console.info(
      `│ PID         │ ${currentProcess.pid.toString().padEnd(16)} │`
    );
    console.info(
      `│ PPID        │ ${currentProcess.ppid.toString().padEnd(16)} │`
    );
    console.info(`│ Platform    │ ${currentProcess.platform.padEnd(16)} │`);
    console.info(`│ Architecture│ ${currentProcess.arch.padEnd(16)} │`);
    console.info(`│ Version     │ ${currentProcess.nodeVersion.padEnd(16)} │`);
    console.info(
      `│ Uptime (s)  │ ${currentProcess.uptime.toFixed(2).padEnd(16)} │`
    );
    console.info("└─────────────┴──────────────────┘");

    // Get memory usage
    const memUsage = process.memoryUsage();
    console.info("\n💾 Memory Usage:");
    console.info("┌─────────────┬──────────┬──────────┐");
    console.info("│ Type        │ Used (MB)│ Total (MB)│");
    console.info("├─────────────┼──────────┼──────────┤");
    console.info(
      `│ RSS         │ ${
        (memUsage.rss / 1024 / 1024).toFixed(2).pad
      } │ N/A      │`
    );
    console.info(
      `│ Heap Used   │ ${(memUsage.heapUsed / 1024 / 1024).toFixed(2).pad} │ ${
        (memUsage.heapTotal / 1024 / 1024).toFixed(2).pad
      } │`
    );
    console.info(
      `│ External    │ ${
        (memUsage.external / 1024 / 1024).toFixed(2).pad
      } │ N/A      │`
    );
    console.info("└─────────────┴──────────┴──────────┘");

    // Get CPU usage
    const cpuUsage = process.cpuUsage();
    console.info("\n🖥️ CPU Usage:");
    console.info("┌─────────────┬──────────┐");
    console.info("│ Metric      │ Value    │");
    console.info("├─────────────┼──────────┤");
    console.info(`│ User (μs)   │ ${cpuUsage.user.toString().pad} │`);
    console.info(`│ System (μs) │ ${cpuUsage.system.toString().pad} │`);
    console.info("└─────────────┴──────────┘");

    // Environment variables summary
    console.info("\n🌍 Environment Summary:");
    const envVars = {
      SHELL: process.env.SHELL,
      PATH: process.env.PATH?.split(":").length + " paths",
      NODE_ENV: process.env.NODE_ENV || "undefined",
      USER: process.env.USER,
      HOME: process.env.HOME,
    };

    console.info("┌─────────┬─────────────────────────────────┐");
    console.info("│ Variable│ Value                           │");
    console.info("├─────────┼─────────────────────────────────┤");
    Object.entries(envVars).forEach(([key, value]) => {
      const displayValue = value?.toString().substring(0, 33) || "undefined";
      console.info(`│ ${key.padEnd(7)} │ ${displayValue.padEnd(33)} │`);
    });
    console.info("└─────────┴─────────────────────────────────┘");
  } catch (error) {
    console.info(`❌ Process management error: ${error.message}`);
  }
}

// Performance testing
async function performanceTesting() {
  console.info(colourKit(0.6).ansi + "\n⚡ Performance Testing" + "\x1b[0m");

  try {
    // Test command execution speed
    console.info("🏃 Command speed test:");
    console.info("┌─────────────────┬──────────┐");
    console.info("│ Command         │ Time (ms) │");
    console.info("├─────────────────┼──────────┤");

    const commands = ['echo "test"', "pwd", "whoami", "date"];

    for (const cmd of commands) {
      const start = performance.now();
      await $`${cmd}`.text();
      const end = performance.now();
      console.info(`│ ${cmd.padEnd(15)} │ ${(end - start).toFixed(3).pad} │`);
    }

    console.info("└─────────────────┴──────────┘");

    // Test parallel execution
    console.info("\n🔄 Parallel vs Sequential Execution:");
    console.info("┌─────────────┬──────────┬──────────┬──────────┐");
    console.info("│ Type        │ Tasks    │ Time (ms)│ Speedup  │");
    console.info("├─────────────┼──────────┼──────────┼──────────┤");

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

    console.info(
      `│ Parallel    │ 3        │ ${parallelTime.toFixed(3).pad} │ ${
        speedup.pad
      } │`
    );
    console.info(
      `│ Sequential  │ 3        │ ${sequentialTime.toFixed(3).pad} │ 1.00     │`
    );
    console.info("└─────────────┴──────────┴──────────┴──────────┘");

    // Bun performance metrics
    console.info("\n📊 Bun Performance Metrics:");
    console.info("┌─────────────────┬──────────┐");
    console.info("│ Metric          │ Value    │");
    console.info("├─────────────────┼──────────┤");
    console.info(`│ Uptime (s)      │ ${process.uptime().toFixed(2).pad} │`);
    console.info(
      `│ Memory (MB)     │ ${
        (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2).pad
      } │`
    );
    console.info(
      `│ CPU User (μs)   │ ${process.cpuUsage().user.toString().pad} │`
    );
    console.info(
      `│ CPU System (μs) │ ${process.cpuUsage().system.toString().pad} │`
    );
    console.info("└─────────────────┴──────────┘");
  } catch (error) {
    console.info(`❌ Performance testing error: ${error.message}`);
  }
}

// Cleanup function
async function cleanup() {
  console.info(colourKit(0.6).ansi + "\n🧹 Cleanup" + "\x1b[0m");

  try {
    // Remove test files and directories
    await $`rm -rf shell-test subdir fruits.txt data.json 2>/dev/null || true`;
    console.info("✅ Cleaned up test files and directories");
  } catch (error) {
    console.info(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info("🎯 This corrected demo showcases proper Bun Shell usage:");
  console.info("  • Correct output handling with .text()");
  console.info("  • Only available builtin commands");
  console.info("  • Proper error handling");
  console.info("  • Environment and directory management");
  console.info("  • JSON processing");
  console.info("  • Performance testing");

  await basicShellCommands();
  await fileOperations();
  await textProcessing();
  await environmentConfig();
  await jsonProcessing();
  await errorHandling();
  await processManagement();
  await performanceTesting();
  await cleanup();

  console.info(
    "\n" + colourKit(0.2).ansi + "🎉 Corrected Shell Demo Complete!" + "\x1b[0m"
  );
  console.info("✅ Bun Shell works perfectly when used correctly!");
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Corrected shell demo interrupted gracefully!");
  cleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
