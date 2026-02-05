#!/usr/bin/env bun
// Performance optimization script using Bun CLI options and file I/O
import { $, argv } from "bun";

// Parse CLI arguments for optimization
const args = {
  smol: argv.includes("--smol"),
  exposeGc: argv.includes("--expose-gc"),
  consoleDepth:
    argv.find((arg) => arg.startsWith("--console-depth="))?.split("=")[1] ||
    "5",
  verbose: argv.includes("--verbose"),
  silent: argv.includes("--silent"),
  analyze: argv.includes("--analyze"),
  benchmark: argv.includes("--benchmark"),
  profile: argv.includes("--profile"),
  memory: argv.includes("--memory"),
  io: argv.includes("--io"),
  cli: argv.includes("--cli"),
  all: argv.includes("--all"),
  output:
    argv.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "optimization-report.json",
};

// Performance metrics collector
class PerformanceCollector {
  metrics: any = {};

  startTimer(name: string): number {
    return performance.now();
  }

  endTimer(name: string, startTime: number): number {
    const duration = performance.now() - startTime;
    this.metrics[name] = duration;
    return duration;
  }

  collectMemoryMetrics(label: string): void {
    const memUsage = process.memoryUsage();
    this.metrics[`${label}_memory`] = {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };
  }

  collectSystemMetrics(label: string): void {
    this.metrics[`${label}_system`] = {
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    };
  }

  async collectFileIOMetrics(): Promise<void> {
    const testDir = "./perf-test-files";
    await $`mkdir -p ${testDir}`;

    try {
      // Test write performance
      const writeStart = this.startTimer("file_write");
      const testContent = "Performance test content\n".repeat(10000);
      await Bun.write(`${testDir}/write-test.txt`, testContent);
      this.endTimer("file_write", writeStart);

      // Test read performance
      const readStart = this.startTimer("file_read");
      const file = Bun.file(`${testDir}/write-test.txt`);
      await file.text();
      this.endTimer("file_read", readStart);

      // Test copy performance
      const copyStart = this.startTimer("file_copy");
      const sourceFile = Bun.file(`${testDir}/write-test.txt`);
      await Bun.write(`${testDir}/copy-test.txt`, sourceFile);
      this.endTimer("file_copy", copyStart);

      // Test stream performance
      const streamStart = this.startTimer("file_stream");
      const stream = file.stream();
      const reader = stream.getReader();
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
      }
      this.endTimer("file_stream", streamStart);

      this.metrics.file_io_bytes = totalBytes;
    } finally {
      await $`rm -rf ${testDir}`;
    }
  }

  async collectCLIMetrics(): Promise<void> {
    // Test CLI argument parsing performance
    const cliStart = this.startTimer("cli_parsing");
    const testArgs = [
      "--port=3000",
      "--host=localhost",
      "--smol",
      "--expose-gc",
      "--verbose",
    ];
    // Simulate CLI parsing
    const parsed = testArgs
      .map((arg) => {
        if (arg.startsWith("--")) return arg;
        return null;
      })
      .filter(Boolean);
    this.endTimer("cli_parsing", cliStart);

    // Test stdin processing performance
    const stdinStart = this.startTimer("stdin_processing");
    const testInput = JSON.stringify({ test: "data", size: 1000 });
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(testInput);
    const decoder = new TextDecoder();
    decoder.decode(uint8Array);
    this.endTimer("stdin_processing", stdinStart);

    this.metrics.cli_args_count = parsed.length;
    this.metrics.stdin_size = testInput.length;
  }

  async collectMemoryMetrics(): Promise<void> {
    this.collectMemoryMetrics("initial");

    // Create memory pressure
    const arrays: Uint8Array[] = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Uint8Array(1024 * 1024)); // 1MB each
    }

    this.collectMemoryMetrics("pressure");

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.collectMemoryMetrics("after_gc");
    }

    // Clean up arrays
    arrays.length = 0;

    if (global.gc) {
      global.gc();
      this.collectMemoryMetrics("final");
    }
  }

  generateReport(): any {
    return {
      timestamp: new Date().toISOString(),
      bun_version: Bun.version,
      platform: process.platform,
      optimization_flags: {
        smol: args.smol,
        exposeGc: args.exposeGc,
        consoleDepth: args.consoleDepth,
      },
      metrics: this.metrics,
      summary: {
        total_tests: Object.keys(this.metrics).length,
        memory_efficiency: this.calculateMemoryEfficiency(),
        io_performance: this.calculateIOPerformance(),
        cli_performance: this.calculateCLIPerformance(),
      },
    };
  }

  calculateMemoryEfficiency(): string {
    const initial = this.metrics.initial_memory?.heapUsed || 0;
    const final = this.metrics.final_memory?.heapUsed || 0;
    const efficiency =
      initial > 0 ? (((initial - final) / initial) * 100).toFixed(2) : "0";
    return `${efficiency}% memory reduction`;
  }

  calculateIOPerformance(): string {
    const writeTime = this.metrics.file_write || 0;
    const readTime = this.metrics.file_read || 0;
    const copyTime = this.metrics.file_copy || 0;
    const totalTime = writeTime + readTime + copyTime;
    return `Total I/O time: ${totalTime.toFixed(2)}ms`;
  }

  calculateCLIPerformance(): string {
    const parseTime = this.metrics.cli_parsing || 0;
    const stdinTime = this.metrics.stdin_processing || 0;
    return `CLI processing: ${(parseTime + stdinTime).toFixed(2)}ms`;
  }
}

// Optimization functions
async function optimizeFileIO(): Promise<void> {
  if (!args.silent) console.log("🔧 Optimizing file I/O operations...");

  const collector = new PerformanceCollector();
  await collector.collectFileIOMetrics();

  if (args.verbose) {
    console.log("📊 File I/O Metrics:");
    console.log(`  Write: ${collector.metrics.file_write?.toFixed(2)}ms`);
    console.log(`  Read: ${collector.metrics.file_read?.toFixed(2)}ms`);
    console.log(`  Copy: ${collector.metrics.file_copy?.toFixed(2)}ms`);
    console.log(`  Stream: ${collector.metrics.file_stream?.toFixed(2)}ms`);
  }
}

async function optimizeMemory(): Promise<void> {
  if (!args.silent) console.log("🧠 Optimizing memory usage...");

  const collector = new PerformanceCollector();
  await collector.collectMemoryMetrics();

  if (args.verbose) {
    console.log("💾 Memory Metrics:");
    console.log(
      `  Initial: ${(collector.metrics.initial_memory?.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(
      `  Pressure: ${(collector.metrics.pressure_memory?.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    if (collector.metrics.after_gc) {
      console.log(
        `  After GC: ${(collector.metrics.after_gc.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    }
    if (collector.metrics.final_memory) {
      console.log(
        `  Final: ${(collector.metrics.final_memory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    }
  }
}

async function optimizeCLI(): Promise<void> {
  if (!args.silent) console.log("⚡ Optimizing CLI performance...");

  const collector = new PerformanceCollector();
  await collector.collectCLIMetrics();

  if (args.verbose) {
    console.log("🚀 CLI Metrics:");
    console.log(
      `  Argument parsing: ${collector.metrics.cli_parsing?.toFixed(2)}ms`
    );
    console.log(
      `  Stdin processing: ${collector.metrics.stdin_processing?.toFixed(2)}ms`
    );
    console.log(`  Args processed: ${collector.metrics.cli_args_count}`);
  }
}

async function runBenchmark(): Promise<void> {
  if (!args.silent) console.log("🏃 Running comprehensive benchmark...");

  const collector = new PerformanceCollector();

  // File I/O benchmark
  await collector.collectFileIOMetrics();

  // Memory benchmark
  await collector.collectMemoryMetrics();

  // CLI benchmark
  await collector.collectCLIMetrics();

  // System metrics
  collector.collectSystemMetrics("benchmark");

  // Generate report
  const report = collector.generateReport();

  // Save report
  await Bun.write(args.output, JSON.stringify(report, null, 2));

  if (!args.silent) {
    console.log("📋 Benchmark complete!");
    console.log(`📄 Report saved to: ${args.output}`);
    console.log(`📊 Summary:`);
    console.log(`  Memory efficiency: ${report.summary.memory_efficiency}`);
    console.log(`  I/O performance: ${report.summary.io_performance}`);
    console.log(`  CLI performance: ${report.summary.cli_performance}`);
  }

  if (args.verbose) {
    console.log("\n🔍 Detailed Metrics:");
    console.log(JSON.stringify(report.metrics, null, 2));
  }
}

async function analyzeProject(): Promise<void> {
  if (!args.silent) console.log("🔍 Analyzing project structure...");

  const analysis = {
    timestamp: new Date().toISOString(),
    project: {
      name: "systems-dashboard",
      root: process.cwd(),
      bun_version: Bun.version,
    },
    files: {
      config: await analyzeFile("package.json"),
      bunfig: await analyzeFile("bunfig.toml"),
      readme: await analyzeFile("README.md"),
      setup: await analyzeFile("setup.ts"),
      index: await analyzeFile("src/index.ts"),
    },
    dependencies: await analyzeDependencies(),
    scripts: await analyzeScripts(),
    recommendations: [],
  };

  // Generate recommendations
  if (analysis.dependencies?.missing?.length > 0) {
    analysis.recommendations.push(
      `Install missing dependencies: ${analysis.dependencies.missing.join(", ")}`
    );
  }

  if (analysis.scripts?.missing?.length > 0) {
    analysis.recommendations.push(
      `Add missing scripts: ${analysis.scripts.missing.join(", ")}`
    );
  }

  // Save analysis
  await Bun.write("project-analysis.json", JSON.stringify(analysis, null, 2));

  if (!args.silent) {
    console.log("📊 Project analysis complete!");
    console.log(`📄 Analysis saved to: project-analysis.json`);
    console.log(
      `💡 Recommendations: ${analysis.recommendations.length || "None"}`
    );

    if (analysis.recommendations.length > 0) {
      analysis.recommendations.forEach((rec: string, i: number) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
  }
}

async function analyzeFile(filePath: string): Promise<any> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return { exists: false };
    }

    const content = await file.text();
    const lines = content.split("\n");

    return {
      exists: true,
      size: file.size,
      type: file.type,
      lines: lines.length,
      characters: content.length,
      lastModified: file.lastModified,
    };
  } catch (error) {
    return { exists: false, error: (error as Error).message };
  }
}

async function analyzeDependencies(): Promise<any> {
  try {
    const packageFile = Bun.file("package.json");
    if (!(await packageFile.exists())) {
      return { error: "package.json not found" };
    }

    const packageJson = await packageFile.json();
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    return {
      total:
        Object.keys(dependencies).length + Object.keys(devDependencies).length,
      production: Object.keys(dependencies).length,
      development: Object.keys(devDependencies).length,
      missing: [], // Could check node_modules here
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

async function analyzeScripts(): Promise<any> {
  try {
    const packageFile = Bun.file("package.json");
    if (!(await packageFile.exists())) {
      return { error: "package.json not found" };
    }

    const packageJson = await packageFile.json();
    const scripts = packageJson.scripts || {};

    const expectedScripts = [
      "dev",
      "build",
      "test",
      "lint",
      "format",
      "stdin:eval",
      "file:read",
      "file:write",
      "optimize",
      "benchmark",
    ];

    const missing = expectedScripts.filter((script) => !scripts[script]);

    return {
      total: Object.keys(scripts).length,
      expected: expectedScripts.length,
      missing,
      available: Object.keys(scripts),
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// Main optimization function
async function optimize() {
  if (!args.silent) {
    console.log("🚀 Starting performance optimization...");
    console.log(`🔧 Configuration:`);
    console.log(`  Smol mode: ${args.smol}`);
    console.log(`  Expose GC: ${args.exposeGc}`);
    console.log(`  Console depth: ${args.consoleDepth}`);
    console.log(`  Verbose: ${args.verbose}`);
  }

  // Apply optimizations based on arguments
  if (args.all || args.io) {
    await optimizeFileIO();
  }

  if (args.all || args.memory) {
    await optimizeMemory();
  }

  if (args.all || args.cli) {
    await optimizeCLI();
  }

  if (args.benchmark) {
    await runBenchmark();
  }

  if (args.analyze) {
    await analyzeProject();
  }

  if (args.profile) {
    await runProfile();
  }

  if (!args.silent) {
    console.log("✅ Optimization complete!");

    if (args.exposeGc && global.gc) {
      console.log("🗑️  Garbage collection available - call global.gc()");
    }

    if (args.smol) {
      console.log("📦 Smol mode enabled for reduced memory usage");
    }
  }
}

async function runProfile(): Promise<void> {
  if (!args.silent) console.log("🔍 Running performance profile...");

  const profileData = {
    timestamp: new Date().toISOString(),
    bun_version: Bun.version,
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    performance: {
      now: performance.now(),
      timing: performance.timing,
    },
  };

  // Test various operations
  const operations = {
    string_operations: await benchmarkStringOperations(),
    array_operations: await benchmarkArrayOperations(),
    object_operations: await benchmarkObjectOperations(),
    file_operations: await benchmarkFileOperations(),
  };

  profileData.operations = operations;

  await Bun.write(
    "performance-profile.json",
    JSON.stringify(profileData, null, 2)
  );

  if (!args.silent) {
    console.log("📊 Profile saved to: performance-profile.json");
  }
}

async function benchmarkStringOperations(): Promise<any> {
  const iterations = 100000;
  const testString = "Performance test string";

  const concatStart = performance.now();
  let result = "";
  for (let i = 0; i < iterations; i++) {
    result += testString;
  }
  const concatTime = performance.now() - concatStart;

  const splitStart = performance.now();
  const parts = result.split(" ");
  const splitTime = performance.now() - splitStart;

  return {
    iterations,
    concatenation: concatTime,
    splitting: splitTime,
    result_length: result.length,
  };
}

async function benchmarkArrayOperations(): Promise<any> {
  const size = 100000;
  const array = Array.from({ length: size }, (_, i) => i);

  const mapStart = performance.now();
  const mapped = array.map((x) => x * 2);
  const mapTime = performance.now() - mapStart;

  const filterStart = performance.now();
  const filtered = array.filter((x) => x % 2 === 0);
  const filterTime = performance.now() - filterStart;

  return {
    size,
    mapping: mapTime,
    filtering: filterTime,
    mapped_length: mapped.length,
    filtered_length: filtered.length,
  };
}

async function benchmarkObjectOperations(): Promise<any> {
  const size = 10000;
  const objects = Array.from({ length: size }, (_, i) => ({
    id: i,
    name: `object_${i}`,
    data: { value: i * 2 },
  }));

  const stringifyStart = performance.now();
  const json = JSON.stringify(objects);
  const stringifyTime = performance.now() - stringifyStart;

  const parseStart = performance.now();
  const parsed = JSON.parse(json);
  const parseTime = performance.now() - parseStart;

  return {
    size,
    stringification: stringifyTime,
    parsing: parseTime,
    json_size: json.length,
    parsed_length: parsed.length,
  };
}

async function benchmarkFileOperations(): Promise<any> {
  const testDir = "./profile-test";
  await $`mkdir -p ${testDir}`;

  try {
    const testContent = "Profile test content\n".repeat(1000);

    const writeStart = performance.now();
    await Bun.write(`${testDir}/profile.txt`, testContent);
    const writeTime = performance.now() - writeStart;

    const readStart = performance.now();
    const file = Bun.file(`${testDir}/profile.txt`);
    await file.text();
    const readTime = performance.now() - readStart;

    return {
      content_size: testContent.length,
      write_time: writeTime,
      read_time: readTime,
      total_time: writeTime + readTime,
    };
  } finally {
    await $`rm -rf ${testDir}`;
  }
}

// Export for testing
export {
  analyzeProject,
  optimize,
  optimizeCLI,
  optimizeFileIO,
  optimizeMemory,
  runBenchmark,
};

// Run if called directly
if (import.meta.main) {
  optimize().catch(console.error);
}
