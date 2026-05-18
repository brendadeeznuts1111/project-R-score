// Demo: Bun Archive Memory Leak Analysis
// Comprehensive testing and analysis of the Archive.extract() memory leak

import { mkdtempSync, rmSync, readdirSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

interface TestResults {
  testName: string;
  initialMemory: MemoryUsage;
  finalMemory: MemoryUsage;
  memoryGrowth: number;
  fileCount: number;
  duration: number;
  leakDetected: boolean;
}

class ArchiveLeakAnalyzer {
  private testDir: string;
  private results: TestResults[] = [];

  constructor() {
    this.testDir = mkdtempSync(join(tmpdir(), "archive-leak-analysis-"));
    console.info(`🔍 Archive Leak Analyzer Initialized`);
    console.info(`📁 Test directory: ${this.testDir}`);
  }

  private formatMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  private getMemoryUsage(): MemoryUsage {
    return process.memoryUsage();
  }

  private formatMemoryUsage(usage: MemoryUsage): string {
    return `RSS: ${this.formatMB(usage.rss)}, ` +
           `Heap: ${this.formatMB(usage.heapUsed)}, ` +
           `External: ${this.formatMB(usage.external)}, ` +
           `ArrayBuffers: ${this.formatMB(usage.arrayBuffers)}`;
  }

  private countFiles(dir: string): number {
    try {
      const files = readdirSync(dir);
      return files.length;
    } catch {
      return 0;
    }
  }

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResults> {
    console.info(`\n🧪 Running test: ${testName}`);
    console.info("─".repeat(50));

    const startTime = Date.now();
    const initialMemory = this.getMemoryUsage();
    
    console.info(`📊 Initial memory: ${this.formatMemoryUsage(initialMemory)}`);

    // Run the test
    await testFunction();

    // Force garbage collection multiple times
    Bun.gc(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    Bun.gc(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    Bun.gc(true);

    const finalMemory = this.getMemoryUsage();
    const duration = Date.now() - startTime;
    const memoryGrowth = finalMemory.rss - initialMemory.rss;
    const fileCount = this.countFiles(this.testDir);

    console.info(`📊 Final memory: ${this.formatMemoryUsage(finalMemory)}`);
    console.info(`📈 Memory growth: ${this.formatMB(memoryGrowth)}`);
    console.info(`📁 Files created: ${fileCount}`);
    console.info(`⏱️  Duration: ${duration}ms`);

    const result: TestResults = {
      testName,
      initialMemory,
      finalMemory,
      memoryGrowth,
      fileCount,
      duration,
      leakDetected: memoryGrowth > 1024 * 1024 // 1MB threshold
    };

    this.results.push(result);
    return result;
  }

  async testBasicLeak(): Promise<TestResults> {
    const files = {
      "test1.txt": "Hello, World! This is test file 1.",
      "test2.txt": "Hello, World! This is test file 2.",
      "subdir/nested.txt": "This is a nested file in a subdirectory."
    };

    const archive = new Bun.Archive(files);

    return this.runTest("Basic Memory Leak Test", async () => {
      // Perform 1000 extractions
      for (let i = 0; i < 1000; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testLargeFileLeak(): Promise<TestResults> {
    // Create a larger archive for testing
    const largeContent = "A".repeat(10000); // 10KB per file
    const files = {
      "large1.txt": largeContent,
      "large2.txt": largeContent,
      "large3.txt": largeContent
    };

    const archive = new Bun.Archive(files);

    return this.runTest("Large File Memory Leak Test", async () => {
      // Perform 500 extractions with larger files
      for (let i = 0; i < 500; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testManyFilesLeak(): Promise<TestResults> {
    // Create archive with many small files
    const files: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      files[`file${i}.txt`] = `Content of file ${i}`;
    }

    const archive = new Bun.Archive(files);

    return this.runTest("Many Files Memory Leak Test", async () => {
      // Perform 200 extractions with many files
      for (let i = 0; i < 200; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testNestedStructureLeak(): Promise<TestResults> {
    // Create archive with deep nested structure
    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        for (let k = 0; k < 5; k++) {
          files[`level1-${i}/level2-${j}/level3-${k}/file.txt`] = 
            `Content in nested structure ${i}-${j}-${k}`;
        }
      }
    }

    const archive = new Bun.Archive(files);

    return this.runTest("Nested Structure Memory Leak Test", async () => {
      // Perform 100 extractions with nested structure
      for (let i = 0; i < 100; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testArchiveRecreation(): Promise<TestResults> {
    // Test if recreating archive prevents leak
    return this.runTest("Archive Recreation Test", async () => {
      for (let i = 0; i < 100; i++) {
        const files = {
          "test.txt": `Content iteration ${i}`,
          "data.json": JSON.stringify({ iteration: i })
        };
        
        const archive = new Bun.Archive(files);
        await archive.extract(this.testDir);
        
        // Recreate archive every 10 iterations
        if (i % 10 === 0) {
          console.info(`  🔄 Archive recreation at iteration ${i}`);
        }
      }
    });
  }

  async testDirectoryRotation(): Promise<TestResults> {
    // Test if using different directories prevents leak
    return this.runTest("Directory Rotation Test", async () => {
      const files = {
        "rotating.txt": "This content is extracted to rotating directories"
      };
      
      const archive = new Bun.Archive(files);
      
      for (let i = 0; i < 200; i++) {
        const rotateDir = join(this.testDir, `rotate-${i % 10}`);
        await archive.extract(rotateDir);
      }
    });
  }

  async testCompressedArchiveLeak(): Promise<TestResults> {
    // Test memory leak with compressed archives
    const files = {
      "compressed.txt": "This content will be compressed during extraction test. ".repeat(100),
      "data.json": JSON.stringify({ 
        large: "object".repeat(1000),
        nested: { deep: { value: "test".repeat(100) } }
      })
    };

    const archive = new Bun.Archive(files, { compress: "gzip" });

    return this.runTest("Compressed Archive Memory Leak Test", async () => {
      // Perform 300 extractions with compressed archive
      for (let i = 0; i < 300; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testBinaryArchiveLeak(): Promise<TestResults> {
    // Test memory leak with binary data
    const binaryData1 = new Uint8Array(1000).map((_, i) => i % 256);
    const binaryData2 = new ArrayBuffer(2000);
    const view = new DataView(binaryData2);
    for (let i = 0; i < 500; i++) {
      view.setUint32(i * 4, i, true);
    }

    const files = {
      "binary1.bin": binaryData1,
      "binary2.bin": new Uint8Array(binaryData2),
      "mixed.txt": "Mixed content with binary data"
    };

    const archive = new Bun.Archive(files);

    return this.runTest("Binary Archive Memory Leak Test", async () => {
      // Perform 400 extractions with binary data
      for (let i = 0; i < 400; i++) {
        await archive.extract(this.testDir);
      }
    });
  }

  async testControlledGc(): Promise<TestResults> {
    // Test with controlled garbage collection during operations
    const files = {
      "gc-test.txt": "Testing memory leak with controlled garbage collection"
    };

    const archive = new Bun.Archive(files);

    return this.runTest("Controlled GC Memory Leak Test", async () => {
      for (let i = 0; i < 500; i++) {
        await archive.extract(this.testDir);
        
        // Force GC every 50 extractions
        if (i % 50 === 0) {
          Bun.gc(true);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    });
  }

  printSummary(): void {
    console.info("\n" + "=".repeat(60));
    console.info("📊 MEMORY LEAK ANALYSIS SUMMARY");
    console.info("=".repeat(60));

    let totalLeakDetected = 0;
    let totalMemoryGrowth = 0;

    for (const result of this.results) {
      const status = result.leakDetected ? "🚨 LEAK DETECTED" : "✅ No Leak";
      const growth = this.formatMB(result.memoryGrowth);
      
      console.info(`\n🧪 ${result.testName}`);
      console.info(`   Status: ${status}`);
      console.info(`   Memory Growth: ${growth}`);
      console.info(`   Duration: ${result.duration}ms`);
      console.info(`   Files: ${result.fileCount}`);

      if (result.leakDetected) {
        totalLeakDetected++;
      }
      totalMemoryGrowth += result.memoryGrowth;
    }

    console.info("\n" + "─".repeat(60));
    console.info("📈 OVERALL RESULTS:");
    console.info(`   Tests with leaks: ${totalLeakDetected}/${this.results.length}`);
    console.info(`   Total memory growth: ${this.formatMB(totalMemoryGrowth)}`);
    console.info(`   Average growth per test: ${this.formatMB(totalMemoryGrowth / this.results.length)}`);

    if (totalLeakDetected > 0) {
      console.info("\n🚨 MEMORY LEAK CONFIRMED!");
      console.info("   The Bun.Archive.extract() method has a confirmed memory leak.");
      console.info("   See BUN-ARCHIVE-LEAK-ANALYSIS.md for detailed analysis and solutions.");
    } else {
      console.info("\n✅ NO MEMORY LEAK DETECTED!");
      console.info("   All tests passed without significant memory growth.");
    }

    console.info("\n💡 RECOMMENDATIONS:");
    if (totalLeakDetected > 0) {
      console.info("   1. Use archive recreation workaround for production");
      console.info("   2. Implement memory monitoring in long-running processes");
      console.info("   3. Consider process restart strategies for critical applications");
      console.info("   4. Monitor the Bun GitHub issue for official fixes");
    } else {
      console.info("   1. Archive.extract() appears to be memory-safe");
      console.info("   2. Continue monitoring in production environments");
      console.info("   3. Test with larger datasets for comprehensive validation");
    }
  }

  async cleanup(): Promise<void> {
    try {
      rmSync(this.testDir, { recursive: true });
      console.info(`\n🧹 Cleaned up test directory: ${this.testDir}`);
    } catch (error) {
      console.info(`⚠️  Warning: Could not clean up test directory: ${error}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.info("🔍 Starting Comprehensive Archive Memory Leak Analysis");
    console.info("=====================================================");

    try {
      // Run all test cases
      await this.testBasicLeak();
      await this.testLargeFileLeak();
      await this.testManyFilesLeak();
      await this.testNestedStructureLeak();
      await this.testArchiveRecreation();
      await this.testDirectoryRotation();
      await this.testCompressedArchiveLeak();
      await this.testBinaryArchiveLeak();
      await this.testControlledGc();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error("❌ Test execution failed:", error);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  console.info("🚀 Bun Archive Memory Leak Analysis Tool");
  console.info("==========================================");
  console.info("This tool tests for memory leaks in Bun.Archive.extract()");
  console.info("Run with: bun run DEMO-ARCHIVE-LEAK-TEST.ts\n");

  const analyzer = new ArchiveLeakAnalyzer();
  await analyzer.runAllTests();
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
