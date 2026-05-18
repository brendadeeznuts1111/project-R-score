#!/usr/bin/env bun

// Comprehensive Bun Shell demo
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.8).ansi + "🐚 Comprehensive Bun Shell Demo" + "\x1b[0m"
);
console.info("=".repeat(50));

// Basic shell commands
async function basicShellCommands() {
  console.info(colourKit(0.6).ansi + "\n🔧 Basic Shell Commands" + "\x1b[0m");

  try {
    // Simple echo
    const echoResult = await $`echo "Hello from Bun Shell!"`;
    console.info(`📢 Echo: ${echoResult.toString().trim()}`);

    // Current directory
    const pwdResult = await $`pwd`;
    console.info(`📁 Current directory: ${pwdResult.toString().trim()}`);

    // List files
    console.info("\n📋 Files in current directory:");
    const lsResult = await $`ls -la`;
    console.info(lsResult.toString());

    // Date and time
    const dateResult = await $`date`;
    console.info(`🕒 Current time: ${dateResult.toString().trim()}`);

    // Who are we
    const whoResult = await $`whoami`;
    console.info(`👤 Current user: ${whoResult.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Shell command error: ${error.message}`);
  }
}

// Text processing with shell
async function textProcessing() {
  console.info(colourKit(0.7).ansi + "\n📝 Text Processing" + "\x1b[0m");

  try {
    // Create test file
    await $`echo "Line 1\nLine 2\nLine 3\nLine with numbers 123\nLine with symbols !@#" > test-shell.txt`;
    console.info("📄 Created test file: test-shell.txt");

    // Count lines
    const lineCount = await $`wc -l test-shell.txt`;
    console.info(`📊 Line count: ${lineCount.toString().trim()}`);

    // Count words
    const wordCount = await $`wc -w test-shell.txt`;
    console.info(`📊 Word count: ${wordCount.toString().trim()}`);

    // Find lines with numbers
    console.info("\n🔍 Lines containing numbers:");
    const numberLines = await $`grep -n "[0-9]" test-shell.txt`;
    console.info(numberLines.toString());

    // Sort and unique
    console.info("\n🔄 Sort and unique:");
    await $`echo "c\nb\na\nc\nb" | sort | uniq`;
  } catch (error) {
    console.info(`❌ Text processing error: ${error.message}`);
  }
}

// File operations
async function fileOperations() {
  console.info(colourKit(0.5).ansi + "\n💾 File Operations" + "\x1b[0m");

  try {
    // Create directory
    await $`mkdir -p shell-test-dir`;
    console.info("📁 Created directory: shell-test-dir");

    // Create multiple files
    await $`touch shell-test-dir/file1.txt shell-test-dir/file2.txt shell-test-dir/file3.txt`;
    console.info("📄 Created 3 test files");

    // List with details
    console.info("\n📋 Directory contents:");
    const listResult = await $`ls -la shell-test-dir/`;
    console.info(listResult.toString());

    // Copy file
    await $`cp test-shell.txt shell-test-dir/backup.txt`;
    console.info("💾 Copied test file to backup.txt");

    // Find files
    console.info("\n🔍 Find all .txt files:");
    const findResult = await $`find . -name "*.txt" -type f | head -5`;
    console.info(findResult.toString());
  } catch (error) {
    console.info(`❌ File operations error: ${error.message}`);
  }
}

// Process management
async function processManagement() {
  console.info(colourKit(0.4).ansi + "\n⚙️ Process Management" + "\x1b[0m");

  try {
    // Show running processes
    console.info("🔍 Current bun processes:");
    const psResult = await $`ps aux | grep bun | grep -v grep`;
    console.info(psResult.toString());

    // Show environment variables
    console.info("\n🌍 Environment variables (sample):");
    const envResult = await $`env | head -10`;
    console.info(envResult.toString());

    // System info
    console.info("\n💻 System information:");
    const unameResult = await $`uname -a`;
    console.info(`System: ${unameResult.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Process management error: ${error.message}`);
  }
}

// Network operations
async function networkOperations() {
  console.info(colourKit(0.8).ansi + "\n🌐 Network Operations" + "\x1b[0m");

  try {
    // Ping localhost
    console.info("🏓 Pinging localhost:");
    const pingResult = await $`ping -c 3 localhost | grep "round-trip"`;
    console.info(pingResult.toString());

    // Network connections
    console.info("\n🔗 Active network connections (sample):");
    const netResult = await $`netstat -an | head -5`;
    console.info(netResult.toString());
  } catch (error) {
    console.info(`❌ Network operations error: ${error.message}`);
  }
}

// Advanced shell features
async function advancedShellFeatures() {
  console.info(colourKit(0.6).ansi + "\n🚀 Advanced Shell Features" + "\x1b[0m");

  try {
    // Variable interpolation
    const filename = "advanced-test.txt";
    const content = "Advanced content with variables";

    await $`echo "${content}" > ${filename}`;
    console.info(`📝 Created file with variables: ${filename}`);

    // Command substitution
    const fileCount = await $`echo "Found $(ls *.ts | wc -l) TypeScript files"`;
    console.info(`📊 ${fileCount.toString().trim()}`);

    // Pipeline operations
    console.info("\n🔄 Pipeline operations:");
    const pipelineResult = await $`ls -la | grep "\\.ts$" | wc -l`;
    console.info(`TypeScript files: ${pipelineResult.toString().trim()}`);

    // JSON processing
    console.info("\n📋 JSON from shell:");
    const jsonResult = await $`echo '{"name": "Bun Shell", "version": "1.0"}'`;
    const parsed = JSON.parse(jsonResult.toString());
    console.info(`Parsed JSON: ${parsed.name} v${parsed.version}`);
  } catch (error) {
    console.info(`❌ Advanced features error: ${error.message}`);
  }
}

// Parallel execution
async function parallelExecution() {
  console.info(colourKit(0.7).ansi + "\n⚡ Parallel Execution" + "\x1b[0m");

  try {
    const commands = [
      $`echo "Task 1: $(date)"`,
      $`echo "Task 2: $(whoami)"`,
      $`echo "Task 3: $(pwd)"`,
    ];

    console.info("🏃 Running commands in parallel...");
    const startTime = Date.now();

    const results = await Promise.all(commands);

    const endTime = Date.now();
    console.info(`⏱️ Completed in ${endTime - startTime}ms\n`);

    results.forEach((result, i) => {
      console.info(`Result ${i + 1}: ${result.toString().trim()}`);
    });
  } catch (error) {
    console.info(`❌ Parallel execution error: ${error.message}`);
  }
}

// Error handling
async function errorHandling() {
  console.info(colourKit(0.5).ansi + "\n🛡️ Error Handling" + "\x1b[0m");

  try {
    // This should fail
    console.info("🧪 Testing non-existent command:");
    await $`nonexistent-command-12345`;
  } catch (error) {
    console.info(`✅ Caught error: ${error.message}`);
  }

  try {
    // This should also fail
    console.info("\n🧪 Testing invalid syntax:");
    await $`echo "unclosed quote`;
  } catch (error) {
    console.info(`✅ Caught syntax error: ${error.message}`);
  }

  try {
    // This should work
    console.info("\n✅ Testing valid command:");
    const result = await $`echo "Success!"`;
    console.info(`Result: ${result.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Unexpected error: ${error.message}`);
  }
}

// Output processing methods
async function outputProcessing() {
  console.info(
    colourKit(0.4).ansi + "\n📊 Output Processing Methods" + "\x1b[0m"
  );

  try {
    // Create test data
    await $`echo -e "apple\nbanana\ncherry\ndate\nelderberry" > fruits.txt`;

    // Method 1: .text()
    console.info("📝 Using .text() method:");
    const textResult = await $`cat fruits.txt`.text();
    console.info(`Text: ${JSON.stringify(textResult)}`);

    // Method 2: .lines()
    console.info("\n📋 Using .lines() method:");
    console.info("Lines:");
    for await (const line of $`cat fruits.txt`.lines()) {
      console.info(`  - ${line}`);
    }

    // Method 3: Direct iteration
    console.info("\n🔄 Direct iteration:");
    const linesResult = await $`cat fruits.txt`;
    const lines = linesResult.toString().trim().split("\n");
    lines.forEach((line, i) => {
      console.info(`  ${i + 1}. ${line}`);
    });
  } catch (error) {
    console.info(`❌ Output processing error: ${error.message}`);
  }
}

// Cleanup
async function cleanup() {
  console.info(colourKit(0.6).ansi + "\n🧹 Cleanup" + "\x1b[0m");

  try {
    await $`rm -f test-shell.txt advanced-test.txt fruits.txt`;
    await $`rm -rf shell-test-dir`;
    console.info("✅ Cleaned up test files and directories");
  } catch (error) {
    console.info(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info("🎯 This demo showcases Bun Shell capabilities:");
  console.info("  • Basic shell commands");
  console.info("  • Text processing");
  console.info("  • File operations");
  console.info("  • Process management");
  console.info("  • Network operations");
  console.info("  • Advanced features");
  console.info("  • Parallel execution");
  console.info("  • Error handling");
  console.info("  • Output processing");

  await basicShellCommands();
  await textProcessing();
  await fileOperations();
  await processManagement();
  await networkOperations();
  await advancedShellFeatures();
  await parallelExecution();
  await errorHandling();
  await outputProcessing();
  await cleanup();

  console.info(
    "\n" + colourKit(0.2).ansi + "🎉 Shell Demo Complete!" + "\x1b[0m"
  );
  console.info(
    "🐚 Bun Shell provides powerful cross-platform shell capabilities!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Shell demo interrupted gracefully!");
  cleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
