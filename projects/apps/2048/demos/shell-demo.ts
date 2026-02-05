#!/usr/bin/env bun

// Comprehensive Bun Shell demo
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log(
  colourKit(0.8).ansi + "🐚 Comprehensive Bun Shell Demo" + "\x1b[0m"
);
console.log("=".repeat(50));

// Basic shell commands
async function basicShellCommands() {
  console.log(colourKit(0.6).ansi + "\n🔧 Basic Shell Commands" + "\x1b[0m");

  try {
    // Simple echo
    const echoResult = await $`echo "Hello from Bun Shell!"`;
    console.log(`📢 Echo: ${echoResult.toString().trim()}`);

    // Current directory
    const pwdResult = await $`pwd`;
    console.log(`📁 Current directory: ${pwdResult.toString().trim()}`);

    // List files
    console.log("\n📋 Files in current directory:");
    const lsResult = await $`ls -la`;
    console.log(lsResult.toString());

    // Date and time
    const dateResult = await $`date`;
    console.log(`🕒 Current time: ${dateResult.toString().trim()}`);

    // Who are we
    const whoResult = await $`whoami`;
    console.log(`👤 Current user: ${whoResult.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Shell command error: ${error.message}`);
  }
}

// Text processing with shell
async function textProcessing() {
  console.log(colourKit(0.7).ansi + "\n📝 Text Processing" + "\x1b[0m");

  try {
    // Create test file
    await $`echo "Line 1\nLine 2\nLine 3\nLine with numbers 123\nLine with symbols !@#" > test-shell.txt`;
    console.log("📄 Created test file: test-shell.txt");

    // Count lines
    const lineCount = await $`wc -l test-shell.txt`;
    console.log(`📊 Line count: ${lineCount.toString().trim()}`);

    // Count words
    const wordCount = await $`wc -w test-shell.txt`;
    console.log(`📊 Word count: ${wordCount.toString().trim()}`);

    // Find lines with numbers
    console.log("\n🔍 Lines containing numbers:");
    const numberLines = await $`grep -n "[0-9]" test-shell.txt`;
    console.log(numberLines.toString());

    // Sort and unique
    console.log("\n🔄 Sort and unique:");
    await $`echo "c\nb\na\nc\nb" | sort | uniq`;
  } catch (error) {
    console.log(`❌ Text processing error: ${error.message}`);
  }
}

// File operations
async function fileOperations() {
  console.log(colourKit(0.5).ansi + "\n💾 File Operations" + "\x1b[0m");

  try {
    // Create directory
    await $`mkdir -p shell-test-dir`;
    console.log("📁 Created directory: shell-test-dir");

    // Create multiple files
    await $`touch shell-test-dir/file1.txt shell-test-dir/file2.txt shell-test-dir/file3.txt`;
    console.log("📄 Created 3 test files");

    // List with details
    console.log("\n📋 Directory contents:");
    const listResult = await $`ls -la shell-test-dir/`;
    console.log(listResult.toString());

    // Copy file
    await $`cp test-shell.txt shell-test-dir/backup.txt`;
    console.log("💾 Copied test file to backup.txt");

    // Find files
    console.log("\n🔍 Find all .txt files:");
    const findResult = await $`find . -name "*.txt" -type f | head -5`;
    console.log(findResult.toString());
  } catch (error) {
    console.log(`❌ File operations error: ${error.message}`);
  }
}

// Process management
async function processManagement() {
  console.log(colourKit(0.4).ansi + "\n⚙️ Process Management" + "\x1b[0m");

  try {
    // Show running processes
    console.log("🔍 Current bun processes:");
    const psResult = await $`ps aux | grep bun | grep -v grep`;
    console.log(psResult.toString());

    // Show environment variables
    console.log("\n🌍 Environment variables (sample):");
    const envResult = await $`env | head -10`;
    console.log(envResult.toString());

    // System info
    console.log("\n💻 System information:");
    const unameResult = await $`uname -a`;
    console.log(`System: ${unameResult.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Process management error: ${error.message}`);
  }
}

// Network operations
async function networkOperations() {
  console.log(colourKit(0.8).ansi + "\n🌐 Network Operations" + "\x1b[0m");

  try {
    // Ping localhost
    console.log("🏓 Pinging localhost:");
    const pingResult = await $`ping -c 3 localhost | grep "round-trip"`;
    console.log(pingResult.toString());

    // Network connections
    console.log("\n🔗 Active network connections (sample):");
    const netResult = await $`netstat -an | head -5`;
    console.log(netResult.toString());
  } catch (error) {
    console.log(`❌ Network operations error: ${error.message}`);
  }
}

// Advanced shell features
async function advancedShellFeatures() {
  console.log(colourKit(0.6).ansi + "\n🚀 Advanced Shell Features" + "\x1b[0m");

  try {
    // Variable interpolation
    const filename = "advanced-test.txt";
    const content = "Advanced content with variables";

    await $`echo "${content}" > ${filename}`;
    console.log(`📝 Created file with variables: ${filename}`);

    // Command substitution
    const fileCount = await $`echo "Found $(ls *.ts | wc -l) TypeScript files"`;
    console.log(`📊 ${fileCount.toString().trim()}`);

    // Pipeline operations
    console.log("\n🔄 Pipeline operations:");
    const pipelineResult = await $`ls -la | grep "\\.ts$" | wc -l`;
    console.log(`TypeScript files: ${pipelineResult.toString().trim()}`);

    // JSON processing
    console.log("\n📋 JSON from shell:");
    const jsonResult = await $`echo '{"name": "Bun Shell", "version": "1.0"}'`;
    const parsed = JSON.parse(jsonResult.toString());
    console.log(`Parsed JSON: ${parsed.name} v${parsed.version}`);
  } catch (error) {
    console.log(`❌ Advanced features error: ${error.message}`);
  }
}

// Parallel execution
async function parallelExecution() {
  console.log(colourKit(0.7).ansi + "\n⚡ Parallel Execution" + "\x1b[0m");

  try {
    const commands = [
      $`echo "Task 1: $(date)"`,
      $`echo "Task 2: $(whoami)"`,
      $`echo "Task 3: $(pwd)"`,
    ];

    console.log("🏃 Running commands in parallel...");
    const startTime = Date.now();

    const results = await Promise.all(commands);

    const endTime = Date.now();
    console.log(`⏱️ Completed in ${endTime - startTime}ms\n`);

    results.forEach((result, i) => {
      console.log(`Result ${i + 1}: ${result.toString().trim()}`);
    });
  } catch (error) {
    console.log(`❌ Parallel execution error: ${error.message}`);
  }
}

// Error handling
async function errorHandling() {
  console.log(colourKit(0.5).ansi + "\n🛡️ Error Handling" + "\x1b[0m");

  try {
    // This should fail
    console.log("🧪 Testing non-existent command:");
    await $`nonexistent-command-12345`;
  } catch (error) {
    console.log(`✅ Caught error: ${error.message}`);
  }

  try {
    // This should also fail
    console.log("\n🧪 Testing invalid syntax:");
    await $`echo "unclosed quote`;
  } catch (error) {
    console.log(`✅ Caught syntax error: ${error.message}`);
  }

  try {
    // This should work
    console.log("\n✅ Testing valid command:");
    const result = await $`echo "Success!"`;
    console.log(`Result: ${result.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`);
  }
}

// Output processing methods
async function outputProcessing() {
  console.log(
    colourKit(0.4).ansi + "\n📊 Output Processing Methods" + "\x1b[0m"
  );

  try {
    // Create test data
    await $`echo -e "apple\nbanana\ncherry\ndate\nelderberry" > fruits.txt`;

    // Method 1: .text()
    console.log("📝 Using .text() method:");
    const textResult = await $`cat fruits.txt`.text();
    console.log(`Text: ${JSON.stringify(textResult)}`);

    // Method 2: .lines()
    console.log("\n📋 Using .lines() method:");
    console.log("Lines:");
    for await (const line of $`cat fruits.txt`.lines()) {
      console.log(`  - ${line}`);
    }

    // Method 3: Direct iteration
    console.log("\n🔄 Direct iteration:");
    const linesResult = await $`cat fruits.txt`;
    const lines = linesResult.toString().trim().split("\n");
    lines.forEach((line, i) => {
      console.log(`  ${i + 1}. ${line}`);
    });
  } catch (error) {
    console.log(`❌ Output processing error: ${error.message}`);
  }
}

// Cleanup
async function cleanup() {
  console.log(colourKit(0.6).ansi + "\n🧹 Cleanup" + "\x1b[0m");

  try {
    await $`rm -f test-shell.txt advanced-test.txt fruits.txt`;
    await $`rm -rf shell-test-dir`;
    console.log("✅ Cleaned up test files and directories");
  } catch (error) {
    console.log(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log("🎯 This demo showcases Bun Shell capabilities:");
  console.log("  • Basic shell commands");
  console.log("  • Text processing");
  console.log("  • File operations");
  console.log("  • Process management");
  console.log("  • Network operations");
  console.log("  • Advanced features");
  console.log("  • Parallel execution");
  console.log("  • Error handling");
  console.log("  • Output processing");

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

  console.log(
    "\n" + colourKit(0.2).ansi + "🎉 Shell Demo Complete!" + "\x1b[0m"
  );
  console.log(
    "🐚 Bun Shell provides powerful cross-platform shell capabilities!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 Shell demo interrupted gracefully!");
  cleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
