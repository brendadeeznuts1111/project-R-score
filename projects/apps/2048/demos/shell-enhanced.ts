#!/usr/bin/env bun

// Enhanced Bun Shell demo with advanced features
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log(colourKit(0.8).ansi + "🚀 Enhanced Bun Shell Demo" + "\x1b[0m");
console.log("=".repeat(50));

// Enhanced shell commands with proper output handling
async function enhancedShellCommands() {
  console.log(colourKit(0.6).ansi + "\n🔧 Enhanced Shell Commands" + "\x1b[0m");

  try {
    // Simple echo with proper string handling
    const echoResult = await $`echo "Hello from Enhanced Bun Shell!"`;
    console.log(`📢 Echo: ${echoResult.toString().trim()}`);

    // Current directory with formatting
    const pwdResult = await $`pwd`;
    console.log(`📁 Current directory: ${pwdResult.toString().trim()}`);

    // Enhanced file listing with filtering
    console.log("\n📋 TypeScript files in current directory:");
    const tsFiles = await $`ls -la *.ts | head -10`;
    console.log(tsFiles.toString());

    // Date with formatting
    const dateResult = await $`date "+%Y-%m-%d %H:%M:%S"`;
    console.log(`🕒 Formatted time: ${dateResult.toString().trim()}`);

    // User and system info
    const whoResult = await $`whoami`;
    const uptimeResult = await $`uptime`;
    console.log(`👤 User: ${whoResult.toString().trim()}`);
    console.log(`⏱️ Uptime: ${uptimeResult.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Shell command error: ${error.message}`);
  }
}

// Advanced text processing
async function advancedTextProcessing() {
  console.log(
    colourKit(0.7).ansi + "\n📝 Advanced Text Processing" + "\x1b[0m"
  );

  try {
    // Create enhanced test file
    const testContent = `Line 1: Simple text
Line 2: With numbers 42
Line 3: Mixed CASE Text
Line 4: Special chars !@#$%
Line 5: Email test@example.com
Line 6: URL https://bun.sh
Line 7: JSON {"key": "value"}
Line 8: Code const x = 123`;

    await $`echo "${testContent}" > enhanced-test.txt`;
    console.log("📄 Created enhanced test file");

    // Advanced counting with multiple metrics
    console.log("\n📊 File Analysis:");
    const lineCount = await $`wc -l < enhanced-test.txt`;
    const wordCount = await $`wc -w < enhanced-test.txt`;
    const charCount = await $`wc -c < enhanced-test.txt`;

    console.log(`  Lines: ${lineCount.toString().trim()}`);
    console.log(`  Words: ${wordCount.toString().trim()}`);
    console.log(`  Characters: ${charCount.toString().trim()}`);

    // Pattern matching with multiple filters
    console.log("\n🔍 Pattern Analysis:");

    console.log("  Lines with numbers:");
    const numberLines = await $`grep -n "[0-9]" enhanced-test.txt`;
    console.log(numberLines.toString());

    console.log("  Lines with uppercase:");
    const upperLines = await $`grep -n "[A-Z]" enhanced-test.txt`;
    console.log(upperLines.toString());

    console.log("  Email addresses:");
    const emailLines =
      await $`grep -o "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" enhanced-test.txt`;
    console.log(emailLines.toString());

    console.log("  URLs:");
    const urlLines = await $`grep -o "https\?://[^\s\"]*" enhanced-test.txt`;
    console.log(urlLines.toString());

    // Advanced sorting and statistics
    console.log("\n🔄 Advanced Processing:");

    // Sort by line length
    console.log("  Lines sorted by length:");
    const sortedByLength =
      await $`awk '{print length, $0}' enhanced-test.txt | sort -n | cut -d" " -f2-`;
    console.log(sortedByLength.toString());

    // Word frequency analysis
    console.log("  Top 5 most common words:");
    const wordFreq =
      await $`tr '[:upper:]' '[:lower:]' < enhanced-test.txt | grep -o "[a-zA-Z0-9]*" | sort | uniq -c | sort -nr | head -5`;
    console.log(wordFreq.toString());
  } catch (error) {
    console.log(`❌ Advanced text processing error: ${error.message}`);
  }
}

// Enhanced file operations with metadata
async function enhancedFileOperations() {
  console.log(
    colourKit(0.5).ansi + "\n💾 Enhanced File Operations" + "\x1b[0m"
  );

  try {
    // Create structured directory tree
    await $`mkdir -p enhanced-test/{docs,scripts,data,config}`;
    console.log("📁 Created structured directory tree");

    // Create files with different content types
    await $`echo '{"name": "config", "version": "1.0.0"}' > enhanced-test/config/app.json`;
    await $`echo 'console.log("Hello from script");' > enhanced-test/scripts/main.js`;
    await $`echo 'name,age,city\nJohn,25,NYC\nJane,30,LA' > enhanced-test/data/users.csv`;
    await $`echo '# Documentation\n\nThis is a README file.' > enhanced-test/docs/README.md`;

    console.log("📄 Created test files with different formats");

    // Enhanced directory analysis
    console.log("\n📊 Directory Analysis:");
    const treeResult = await $`find enhanced-test -type f | sort`;
    console.log("File tree:");
    console.log(treeResult.toString());

    // File size analysis
    console.log("\n📏 File Size Analysis:");
    const sizeAnalysis =
      await $`find enhanced-test -type f -exec ls -lh {} \; | awk '{print $5, $9}'`;
    console.log(sizeAnalysis.toString());

    // Content type detection
    console.log("\n🔍 Content Type Analysis:");

    console.log("  JSON content:");
    const jsonContent = await $`cat enhanced-test/config/app.json`;
    console.log(`    ${jsonContent.toString().trim()}`);

    console.log("  CSV data:");
    const csvContent = await $`cat enhanced-test/data/users.csv`;
    console.log(`    ${csvContent.toString().trim()}`);

    // File permissions analysis
    console.log("\n🔐 Permission Analysis:");
    const permAnalysis = await $`find enhanced-test -type f -exec ls -la {} \;`;
    console.log(permAnalysis.toString());
  } catch (error) {
    console.log(`❌ Enhanced file operations error: ${error.message}`);
  }
}

// System monitoring and diagnostics
async function systemDiagnostics() {
  console.log(colourKit(0.4).ansi + "\n⚙️ System Diagnostics" + "\x1b[0m");

  try {
    // Enhanced process monitoring
    console.log("🔍 Process Analysis:");

    // Bun processes with detailed info
    const bunProcesses =
      await $`ps aux | grep bun | grep -v grep | awk '{print $2, $3, $4, $11}' | head -5`;
    console.log("  Bun processes (PID, %CPU, %MEM, Command):");
    console.log(bunProcesses.toString());

    // Memory analysis
    console.log("\n💾 Memory Analysis:");
    const memInfo = await $`vm_stat | head -10`;
    console.log(memInfo.toString());

    // Disk usage analysis
    console.log("\n💿 Disk Usage:");
    const diskInfo = await $`df -h | head -5`;
    console.log(diskInfo.toString());

    // Network interface analysis
    console.log("\n🌐 Network Interfaces:");
    const netInfo = await $`ifconfig | grep -A 1 "en0"`;
    console.log(netInfo.toString());

    // Environment analysis
    console.log("\n🌍 Environment Analysis:");

    // Development tools detection
    const devTools = await $`which node npm git curl 2>/dev/null`;
    console.log("  Development tools found:");
    console.log(devTools.toString());

    // Shell and terminal info
    const shellInfo = await $`echo $SHELL $TERM`;
    console.log(`  Shell: ${shellInfo.toString().trim()}`);
  } catch (error) {
    console.log(`❌ System diagnostics error: ${error.message}`);
  }
}

// Performance benchmarking
async function performanceBenchmarking() {
  console.log(
    colourKit(0.8).ansi + "\n⚡ Performance Benchmarking" + "\x1b[0m"
  );

  try {
    // Command execution speed test
    console.log("🏃 Command Speed Test:");

    const commands = ['echo "test"', "date", "pwd", "whoami"];

    for (const cmd of commands) {
      const start = performance.now();
      await $`${cmd}`;
      const end = performance.now();
      console.log(`  ${cmd}: ${(end - start).toFixed(3)}ms`);
    }

    // Parallel vs sequential execution
    console.log("\n🔄 Parallel vs Sequential Test:");

    // Sequential execution
    const seqStart = performance.now();
    await $`echo "Task 1"`;
    await $`echo "Task 2"`;
    await $`echo "Task 3"`;
    const seqEnd = performance.now();

    // Parallel execution
    const parStart = performance.now();
    await Promise.all([$`echo "Task 1"`, $`echo "Task 2"`, $`echo "Task 3"`]);
    const parEnd = performance.now();

    console.log(`  Sequential: ${(seqEnd - seqStart).toFixed(3)}ms`);
    console.log(`  Parallel: ${(parEnd - parStart).toFixed(3)}ms`);
    console.log(
      `  Speedup: ${((seqEnd - seqStart) / (parEnd - parStart)).toFixed(2)}x`
    );

    // Large file processing test
    console.log("\n📄 Large File Processing:");

    // Create large test file
    const largeFileStart = performance.now();
    await $`yes "This is a test line with some content" | head -10000 > large-test.txt`;
    const largeFileEnd = performance.now();
    console.log(
      `  File creation (10k lines): ${(largeFileEnd - largeFileStart).toFixed(
        3
      )}ms`
    );

    // Process large file
    const processStart = performance.now();
    const lineCount = await $`wc -l < large-test.txt`;
    const processEnd = performance.now();
    console.log(`  Line counting: ${(processEnd - processStart).toFixed(3)}ms`);
    console.log(`  Total lines: ${lineCount.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Performance benchmarking error: ${error.message}`);
  }
}

// Advanced shell features
async function advancedShellFeatures() {
  console.log(colourKit(0.6).ansi + "\n🚀 Advanced Shell Features" + "\x1b[0m");

  try {
    // Complex variable interpolation
    const projectName = "bun-shell-demo";
    const version = "2.0.0";
    const author = "Enhanced Demo";

    await $`echo "Project: ${projectName}, Version: ${version}, Author: ${author}" > project-info.txt`;
    console.log(`📝 Created project info with variables`);

    // Command substitution chains
    const fileCount =
      await $`echo "Found $(find . -name "*.ts" | wc -l | tr -d ' ') TypeScript files in $(pwd | awk -F'/' '{print $NF}')"`;
    console.log(`📊 ${fileCount.toString().trim()}`);

    // Pipeline operations with multiple stages
    console.log("\n🔄 Complex Pipeline:");
    const pipelineResult =
      await $`ls -la *.ts | awk '{print $5, $9}' | sort -n | tail -5`;
    console.log("  5 largest TypeScript files (size, name):");
    console.log(pipelineResult.toString());

    // Here document creation
    console.log("\n📄 Here Document:");
    await $`cat > multiline.txt << 'EOF'
This is a multiline file
created with a here document
it preserves formatting
and special characters: !@#$%^&*()
EOF`;

    const hereDocContent = await $`cat multiline.txt`;
    console.log(hereDocContent.toString());

    // Advanced JSON processing
    console.log("\n📋 Advanced JSON Processing:");

    // Create complex JSON
    await $`cat > complex.json << 'EOF'
{
  "name": "Enhanced Shell Demo",
  "version": "2.0.0",
  "features": ["timing", "monitoring", "benchmarking"],
  "metrics": {
    "performance": 95,
    "reliability": 98,
    "usability": 92
  }
}
EOF`;

    // Extract specific JSON fields
    const nameField =
      await $`cat complex.json | grep -o '"name": "[^"]*"' | cut -d'"' -f4`;
    const featuresField =
      await $`cat complex.json | grep -A 10 '"features"' | grep -o '"[^"]*"' | tr -d '"' | tr '\n' ' '`;

    console.log(`  Project name: ${nameField.toString().trim()}`);
    console.log(`  Features: ${featuresField.toString().trim()}`);
  } catch (error) {
    console.log(`❌ Advanced features error: ${error.message}`);
  }
}

// Enhanced error handling and recovery
async function enhancedErrorHandling() {
  console.log(colourKit(0.5).ansi + "\n🛡️ Enhanced Error Handling" + "\x1b[0m");

  try {
    // Test different error scenarios
    const errorTests = [
      { cmd: "nonexistent-command-12345", desc: "Non-existent command" },
      { cmd: 'echo "unclosed quote', desc: "Syntax error" },
      { cmd: "ls /nonexistent/directory", desc: "File not found" },
      { cmd: "cat nonexistent.txt", desc: "Missing file" },
    ];

    for (const test of errorTests) {
      console.log(`\n🧪 Testing: ${test.desc}`);
      try {
        await $`${test.cmd}`;
        console.log("  ✅ Unexpectedly succeeded");
      } catch (error) {
        console.log(`  ✅ Caught error: ${error.message}`);
      }
    }

    // Test successful operations
    console.log("\n✅ Testing successful operations:");
    const successTests = ['echo "Success test 1"', 'date "+%Y-%m-%d"', "pwd"];

    for (const cmd of successTests) {
      try {
        const result = await $`${cmd}`;
        console.log(`  ✅ ${cmd}: ${result.toString().trim()}`);
      } catch (error) {
        console.log(`  ❌ Unexpected error: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error handling test failed: ${error.message}`);
  }
}

// Enhanced output processing
async function enhancedOutputProcessing() {
  console.log(
    colourKit(0.4).ansi + "\n📊 Enhanced Output Processing" + "\x1b[0m"
  );

  try {
    // Create test data
    await $`echo -e "apple,red,sweet\nbanana,yellow,sweet\ncherry,red,sour\ndate,brown,sweet" > fruits.csv`;

    // Method 1: Process as text with parsing
    console.log("📝 Text processing with parsing:");
    const textResult = await $`cat fruits.csv`.text();
    const lines = textResult.trim().split("\n");
    console.log(`  Total lines: ${lines.length}`);

    // Parse CSV data
    const parsedData = lines.map((line) => line.split(","));
    console.log("  Parsed data:");
    parsedData.forEach((row, i) => {
      console.log(`    ${i + 1}. ${row.join(" | ")}`);
    });

    // Method 2: Line-by-line processing
    console.log("\n📋 Line-by-line processing:");
    let lineCount = 0;
    for await (const line of $`cat fruits.csv`.lines()) {
      lineCount++;
      const [fruit, color, taste] = line.split(",");
      console.log(`  ${lineCount}. ${fruit} (${color}) - ${taste}`);
    }

    // Method 3: Stream processing with filtering
    console.log("\n🔄 Stream processing with filtering:");
    console.log("  Red fruits:");
    for await (const line of $`cat fruits.csv`.lines()) {
      const [fruit, color] = line.split(",");
      if (color === "red") {
        console.log(`    - ${fruit}`);
      }
    }

    // Method 4: JSON conversion
    console.log("\n📋 JSON conversion:");
    const jsonArray = parsedData.map(([fruit, color, taste]) => ({
      fruit,
      color,
      taste,
    }));

    const jsonOutput = JSON.stringify(jsonArray, null, 2);
    console.log("  JSON array:");
    console.log(jsonOutput);
  } catch (error) {
    console.log(`❌ Enhanced output processing error: ${error.message}`);
  }
}

// Enhanced cleanup
async function enhancedCleanup() {
  console.log(colourKit(0.6).ansi + "\n🧹 Enhanced Cleanup" + "\x1b[0m");

  try {
    // List all files created by this demo
    console.log("📋 Files to clean up:");
    const demoFiles =
      await $`ls -la enhanced-test.txt large-test.txt multiline.txt complex.json project-info.txt fruits.csv 2>/dev/null || echo "No demo files found"`;
    console.log(demoFiles.toString());

    // Remove individual files
    await $`rm -f enhanced-test.txt large-test.txt multiline.txt complex.json project-info.txt fruits.csv`;
    console.log("✅ Removed individual test files");

    // Remove directory tree
    await $`rm -rf enhanced-test`;
    console.log("✅ Removed test directory tree");

    // Verify cleanup
    const remainingFiles =
      await $`find . -name "*test*" -o -name "*demo*" 2>/dev/null | head -5`;
    if (remainingFiles.toString().trim()) {
      console.log("⚠️ Some test files may remain:");
      console.log(remainingFiles.toString());
    } else {
      console.log("✅ All test files cleaned up successfully");
    }
  } catch (error) {
    console.log(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log(
    "🎯 This enhanced demo showcases advanced Bun Shell capabilities:"
  );
  console.log("  • Enhanced command execution");
  console.log("  • Advanced text processing");
  console.log("  • Structured file operations");
  console.log("  • System diagnostics");
  console.log("  • Performance benchmarking");
  console.log("  • Advanced shell features");
  console.log("  • Enhanced error handling");
  console.log("  • Sophisticated output processing");

  await enhancedShellCommands();
  await advancedTextProcessing();
  await enhancedFileOperations();
  await systemDiagnostics();
  await performanceBenchmarking();
  await advancedShellFeatures();
  await enhancedErrorHandling();
  await enhancedOutputProcessing();
  await enhancedCleanup();

  console.log(
    "\n" + colourKit(0.2).ansi + "🎉 Enhanced Shell Demo Complete!" + "\x1b[0m"
  );
  console.log(
    "🚀 Bun Shell provides enterprise-grade cross-platform shell capabilities!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 Enhanced shell demo interrupted gracefully!");
  enhancedCleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
