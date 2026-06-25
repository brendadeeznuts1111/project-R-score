#!/usr/bin/env bun

// Enhanced Bun Shell demo with advanced features
import { $ } from "bun";
import { colourKit } from "./quantum-toolkit-patch.ts";

console.info(colourKit(0.8).ansi + "🚀 Enhanced Bun Shell Demo" + "\x1b[0m");
console.info("=".repeat(50));

// Enhanced shell commands with proper output handling
async function enhancedShellCommands() {
  console.info(colourKit(0.6).ansi + "\n🔧 Enhanced Shell Commands" + "\x1b[0m");

  try {
    // Simple echo with proper string handling
    const echoResult = await $`echo "Hello from Enhanced Bun Shell!"`;
    console.info(`📢 Echo: ${echoResult.toString().trim()}`);

    // Current directory with formatting
    const pwdResult = await $`pwd`;
    console.info(`📁 Current directory: ${pwdResult.toString().trim()}`);

    // Enhanced file listing with filtering
    console.info("\n📋 TypeScript files in current directory:");
    const tsFiles = await $`ls -la *.ts | head -10`;
    console.info(tsFiles.toString());

    // Date with formatting
    const dateResult = await $`date "+%Y-%m-%d %H:%M:%S"`;
    console.info(`🕒 Formatted time: ${dateResult.toString().trim()}`);

    // User and system info
    const whoResult = await $`whoami`;
    const uptimeResult = await $`uptime`;
    console.info(`👤 User: ${whoResult.toString().trim()}`);
    console.info(`⏱️ Uptime: ${uptimeResult.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Shell command error: ${error.message}`);
  }
}

// Advanced text processing
async function advancedTextProcessing() {
  console.info(
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
    console.info("📄 Created enhanced test file");

    // Advanced counting with multiple metrics
    console.info("\n📊 File Analysis:");
    const lineCount = await $`wc -l < enhanced-test.txt`;
    const wordCount = await $`wc -w < enhanced-test.txt`;
    const charCount = await $`wc -c < enhanced-test.txt`;

    console.info(`  Lines: ${lineCount.toString().trim()}`);
    console.info(`  Words: ${wordCount.toString().trim()}`);
    console.info(`  Characters: ${charCount.toString().trim()}`);

    // Pattern matching with multiple filters
    console.info("\n🔍 Pattern Analysis:");

    console.info("  Lines with numbers:");
    const numberLines = await $`grep -n "[0-9]" enhanced-test.txt`;
    console.info(numberLines.toString());

    console.info("  Lines with uppercase:");
    const upperLines = await $`grep -n "[A-Z]" enhanced-test.txt`;
    console.info(upperLines.toString());

    console.info("  Email addresses:");
    const emailLines =
      await $`grep -o "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" enhanced-test.txt`;
    console.info(emailLines.toString());

    console.info("  URLs:");
    const urlLines = await $`grep -o "https\?://[^\s\"]*" enhanced-test.txt`;
    console.info(urlLines.toString());

    // Advanced sorting and statistics
    console.info("\n🔄 Advanced Processing:");

    // Sort by line length
    console.info("  Lines sorted by length:");
    const sortedByLength =
      await $`awk '{print length, $0}' enhanced-test.txt | sort -n | cut -d" " -f2-`;
    console.info(sortedByLength.toString());

    // Word frequency analysis
    console.info("  Top 5 most common words:");
    const wordFreq =
      await $`tr '[:upper:]' '[:lower:]' < enhanced-test.txt | grep -o "[a-zA-Z0-9]*" | sort | uniq -c | sort -nr | head -5`;
    console.info(wordFreq.toString());
  } catch (error) {
    console.info(`❌ Advanced text processing error: ${error.message}`);
  }
}

// Enhanced file operations with metadata
async function enhancedFileOperations() {
  console.info(
    colourKit(0.5).ansi + "\n💾 Enhanced File Operations" + "\x1b[0m"
  );

  try {
    // Create structured directory tree
    await $`mkdir -p enhanced-test/{docs,scripts,data,config}`;
    console.info("📁 Created structured directory tree");

    // Create files with different content types
    await $`echo '{"name": "config", "version": "1.0.0"}' > enhanced-test/config/app.json`;
    await $`echo 'console.info("Hello from script");' > enhanced-test/scripts/main.js`;
    await $`echo 'name,age,city\nJohn,25,NYC\nJane,30,LA' > enhanced-test/data/users.csv`;
    await $`echo '# Documentation\n\nThis is a README file.' > enhanced-test/docs/README.md`;

    console.info("📄 Created test files with different formats");

    // Enhanced directory analysis
    console.info("\n📊 Directory Analysis:");
    const treeResult = await $`find enhanced-test -type f | sort`;
    console.info("File tree:");
    console.info(treeResult.toString());

    // File size analysis
    console.info("\n📏 File Size Analysis:");
    const sizeAnalysis =
      await $`find enhanced-test -type f -exec ls -lh {} \; | awk '{print $5, $9}'`;
    console.info(sizeAnalysis.toString());

    // Content type detection
    console.info("\n🔍 Content Type Analysis:");

    console.info("  JSON content:");
    const jsonContent = await $`cat enhanced-test/config/app.json`;
    console.info(`    ${jsonContent.toString().trim()}`);

    console.info("  CSV data:");
    const csvContent = await $`cat enhanced-test/data/users.csv`;
    console.info(`    ${csvContent.toString().trim()}`);

    // File permissions analysis
    console.info("\n🔐 Permission Analysis:");
    const permAnalysis = await $`find enhanced-test -type f -exec ls -la {} \;`;
    console.info(permAnalysis.toString());
  } catch (error) {
    console.info(`❌ Enhanced file operations error: ${error.message}`);
  }
}

// System monitoring and diagnostics
async function systemDiagnostics() {
  console.info(colourKit(0.4).ansi + "\n⚙️ System Diagnostics" + "\x1b[0m");

  try {
    // Enhanced process monitoring
    console.info("🔍 Process Analysis:");

    // Bun processes with detailed info
    const bunProcesses =
      await $`ps aux | grep bun | grep -v grep | awk '{print $2, $3, $4, $11}' | head -5`;
    console.info("  Bun processes (PID, %CPU, %MEM, Command):");
    console.info(bunProcesses.toString());

    // Memory analysis
    console.info("\n💾 Memory Analysis:");
    const memInfo = await $`vm_stat | head -10`;
    console.info(memInfo.toString());

    // Disk usage analysis
    console.info("\n💿 Disk Usage:");
    const diskInfo = await $`df -h | head -5`;
    console.info(diskInfo.toString());

    // Network interface analysis
    console.info("\n🌐 Network Interfaces:");
    const netInfo = await $`ifconfig | grep -A 1 "en0"`;
    console.info(netInfo.toString());

    // Environment analysis
    console.info("\n🌍 Environment Analysis:");

    // Development tools detection
    const devTools = await $`which node npm git curl 2>/dev/null`;
    console.info("  Development tools found:");
    console.info(devTools.toString());

    // Shell and terminal info
    const shellInfo = await $`echo $SHELL $TERM`;
    console.info(`  Shell: ${shellInfo.toString().trim()}`);
  } catch (error) {
    console.info(`❌ System diagnostics error: ${error.message}`);
  }
}

// Performance benchmarking
async function performanceBenchmarking() {
  console.info(
    colourKit(0.8).ansi + "\n⚡ Performance Benchmarking" + "\x1b[0m"
  );

  try {
    // Command execution speed test
    console.info("🏃 Command Speed Test:");

    const commands = ['echo "test"', "date", "pwd", "whoami"];

    for (const cmd of commands) {
      const start = performance.now();
      await $`${cmd}`;
      const end = performance.now();
      console.info(`  ${cmd}: ${(end - start).toFixed(3)}ms`);
    }

    // Parallel vs sequential execution
    console.info("\n🔄 Parallel vs Sequential Test:");

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

    console.info(`  Sequential: ${(seqEnd - seqStart).toFixed(3)}ms`);
    console.info(`  Parallel: ${(parEnd - parStart).toFixed(3)}ms`);
    console.info(
      `  Speedup: ${((seqEnd - seqStart) / (parEnd - parStart)).toFixed(2)}x`
    );

    // Large file processing test
    console.info("\n📄 Large File Processing:");

    // Create large test file
    const largeFileStart = performance.now();
    await $`yes "This is a test line with some content" | head -10000 > large-test.txt`;
    const largeFileEnd = performance.now();
    console.info(
      `  File creation (10k lines): ${(largeFileEnd - largeFileStart).toFixed(
        3
      )}ms`
    );

    // Process large file
    const processStart = performance.now();
    const lineCount = await $`wc -l < large-test.txt`;
    const processEnd = performance.now();
    console.info(`  Line counting: ${(processEnd - processStart).toFixed(3)}ms`);
    console.info(`  Total lines: ${lineCount.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Performance benchmarking error: ${error.message}`);
  }
}

// Advanced shell features
async function advancedShellFeatures() {
  console.info(colourKit(0.6).ansi + "\n🚀 Advanced Shell Features" + "\x1b[0m");

  try {
    // Complex variable interpolation
    const projectName = "bun-shell-demo";
    const version = "2.0.0";
    const author = "Enhanced Demo";

    await $`echo "Project: ${projectName}, Version: ${version}, Author: ${author}" > project-info.txt`;
    console.info(`📝 Created project info with variables`);

    // Command substitution chains
    const fileCount =
      await $`echo "Found $(find . -name "*.ts" | wc -l | tr -d ' ') TypeScript files in $(pwd | awk -F'/' '{print $NF}')"`;
    console.info(`📊 ${fileCount.toString().trim()}`);

    // Pipeline operations with multiple stages
    console.info("\n🔄 Complex Pipeline:");
    const pipelineResult =
      await $`ls -la *.ts | awk '{print $5, $9}' | sort -n | tail -5`;
    console.info("  5 largest TypeScript files (size, name):");
    console.info(pipelineResult.toString());

    // Here document creation
    console.info("\n📄 Here Document:");
    await $`cat > multiline.txt << 'EOF'
This is a multiline file
created with a here document
it preserves formatting
and special characters: !@#$%^&*()
EOF`;

    const hereDocContent = await $`cat multiline.txt`;
    console.info(hereDocContent.toString());

    // Advanced JSON processing
    console.info("\n📋 Advanced JSON Processing:");

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

    console.info(`  Project name: ${nameField.toString().trim()}`);
    console.info(`  Features: ${featuresField.toString().trim()}`);
  } catch (error) {
    console.info(`❌ Advanced features error: ${error.message}`);
  }
}

// Enhanced error handling and recovery
async function enhancedErrorHandling() {
  console.info(colourKit(0.5).ansi + "\n🛡️ Enhanced Error Handling" + "\x1b[0m");

  try {
    // Test different error scenarios
    const errorTests = [
      { cmd: "nonexistent-command-12345", desc: "Non-existent command" },
      { cmd: 'echo "unclosed quote', desc: "Syntax error" },
      { cmd: "ls /nonexistent/directory", desc: "File not found" },
      { cmd: "cat nonexistent.txt", desc: "Missing file" },
    ];

    for (const test of errorTests) {
      console.info(`\n🧪 Testing: ${test.desc}`);
      try {
        await $`${test.cmd}`;
        console.info("  ✅ Unexpectedly succeeded");
      } catch (error) {
        console.info(`  ✅ Caught error: ${error.message}`);
      }
    }

    // Test successful operations
    console.info("\n✅ Testing successful operations:");
    const successTests = ['echo "Success test 1"', 'date "+%Y-%m-%d"', "pwd"];

    for (const cmd of successTests) {
      try {
        const result = await $`${cmd}`;
        console.info(`  ✅ ${cmd}: ${result.toString().trim()}`);
      } catch (error) {
        console.info(`  ❌ Unexpected error: ${error.message}`);
      }
    }
  } catch (error) {
    console.info(`❌ Error handling test failed: ${error.message}`);
  }
}

// Enhanced output processing
async function enhancedOutputProcessing() {
  console.info(
    colourKit(0.4).ansi + "\n📊 Enhanced Output Processing" + "\x1b[0m"
  );

  try {
    // Create test data
    await $`echo -e "apple,red,sweet\nbanana,yellow,sweet\ncherry,red,sour\ndate,brown,sweet" > fruits.csv`;

    // Method 1: Process as text with parsing
    console.info("📝 Text processing with parsing:");
    const textResult = await $`cat fruits.csv`.text();
    const lines = textResult.trim().split("\n");
    console.info(`  Total lines: ${lines.length}`);

    // Parse CSV data
    const parsedData = lines.map((line) => line.split(","));
    console.info("  Parsed data:");
    parsedData.forEach((row, i) => {
      console.info(`    ${i + 1}. ${row.join(" | ")}`);
    });

    // Method 2: Line-by-line processing
    console.info("\n📋 Line-by-line processing:");
    let lineCount = 0;
    for await (const line of $`cat fruits.csv`.lines()) {
      lineCount++;
      const [fruit, color, taste] = line.split(",");
      console.info(`  ${lineCount}. ${fruit} (${color}) - ${taste}`);
    }

    // Method 3: Stream processing with filtering
    console.info("\n🔄 Stream processing with filtering:");
    console.info("  Red fruits:");
    for await (const line of $`cat fruits.csv`.lines()) {
      const [fruit, color] = line.split(",");
      if (color === "red") {
        console.info(`    - ${fruit}`);
      }
    }

    // Method 4: JSON conversion
    console.info("\n📋 JSON conversion:");
    const jsonArray = parsedData.map(([fruit, color, taste]) => ({
      fruit,
      color,
      taste,
    }));

    const jsonOutput = JSON.stringify(jsonArray, null, 2);
    console.info("  JSON array:");
    console.info(jsonOutput);
  } catch (error) {
    console.info(`❌ Enhanced output processing error: ${error.message}`);
  }
}

// Enhanced cleanup
async function enhancedCleanup() {
  console.info(colourKit(0.6).ansi + "\n🧹 Enhanced Cleanup" + "\x1b[0m");

  try {
    // List all files created by this demo
    console.info("📋 Files to clean up:");
    const demoFiles =
      await $`ls -la enhanced-test.txt large-test.txt multiline.txt complex.json project-info.txt fruits.csv 2>/dev/null || echo "No demo files found"`;
    console.info(demoFiles.toString());

    // Remove individual files
    await $`rm -f enhanced-test.txt large-test.txt multiline.txt complex.json project-info.txt fruits.csv`;
    console.info("✅ Removed individual test files");

    // Remove directory tree
    await $`rm -rf enhanced-test`;
    console.info("✅ Removed test directory tree");

    // Verify cleanup
    const remainingFiles =
      await $`find . -name "*test*" -o -name "*demo*" 2>/dev/null | head -5`;
    if (remainingFiles.toString().trim()) {
      console.info("⚠️ Some test files may remain:");
      console.info(remainingFiles.toString());
    } else {
      console.info("✅ All test files cleaned up successfully");
    }
  } catch (error) {
    console.info(`⚠️ Cleanup warning: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info(
    "🎯 This enhanced demo showcases advanced Bun Shell capabilities:"
  );
  console.info("  • Enhanced command execution");
  console.info("  • Advanced text processing");
  console.info("  • Structured file operations");
  console.info("  • System diagnostics");
  console.info("  • Performance benchmarking");
  console.info("  • Advanced shell features");
  console.info("  • Enhanced error handling");
  console.info("  • Sophisticated output processing");

  await enhancedShellCommands();
  await advancedTextProcessing();
  await enhancedFileOperations();
  await systemDiagnostics();
  await performanceBenchmarking();
  await advancedShellFeatures();
  await enhancedErrorHandling();
  await enhancedOutputProcessing();
  await enhancedCleanup();

  console.info(
    "\n" + colourKit(0.2).ansi + "🎉 Enhanced Shell Demo Complete!" + "\x1b[0m"
  );
  console.info(
    "🚀 Bun Shell provides enterprise-grade cross-platform shell capabilities!"
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Enhanced shell demo interrupted gracefully!");
  enhancedCleanup();
  process.exit(0);
});

// Start the demo
main().catch(console.error);
