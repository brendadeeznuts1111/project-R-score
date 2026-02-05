#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Bunx Performance Benchmark Demo
 * Real-world performance benchmarking for enterprise bunx usage
 */

console.log('🚀 Fantasy42-Fire22 Registry - Bunx Performance Benchmark');
console.log('======================================================\n');

// Performance Metrics Collection
interface BenchmarkResult {
  command: string;
  totalTime: number;
  userTime: number;
  systemTime: number;
  cpuUsage: number;
  exitCode: number;
  output: string;
  timestamp: Date;
}

class BunxBenchmark {
  private results: BenchmarkResult[] = [];

  async benchmarkCommand(description: string, command: string): Promise<BenchmarkResult> {
    console.log(`📊 Benchmarking: ${description}`);
    console.log(`🔧 Command: ${command}`);

    const startTime = Date.now();
    const proc = Bun.spawn(['sh', '-c', `time -p ${command} 2>&1`], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const endTime = Date.now();
    const exitCode = await proc.exited;

    // Parse time output (from stderr)
    const timeMatch = stderr.match(/real\s+([\d.]+)\s*\nuser\s+([\d.]+)\s*\n sys\s+([\d.]+)/);
    let totalTime = endTime - startTime;
    let userTime = 0;
    let systemTime = 0;
    let cpuUsage = 0;

    if (timeMatch) {
      totalTime = parseFloat(timeMatch[1]) * 1000; // Convert to milliseconds
      userTime = parseFloat(timeMatch[2]) * 1000;
      systemTime = parseFloat(timeMatch[3]) * 1000;
      cpuUsage = ((userTime + systemTime) / totalTime) * 100;
    }

    const result: BenchmarkResult = {
      command,
      totalTime,
      userTime,
      systemTime,
      cpuUsage,
      exitCode,
      output: stdout + stderr,
      timestamp: new Date(),
    };

    this.results.push(result);

    console.log(`⏱️  Total Time: ${totalTime.toFixed(3)}ms`);
    console.log(`👤 User Time: ${userTime.toFixed(3)}ms`);
    console.log(`⚙️  System Time: ${systemTime.toFixed(3)}ms`);
    console.log(`💻 CPU Usage: ${cpuUsage.toFixed(1)}%`);
    console.log(`📝 Exit Code: ${exitCode}`);
    console.log('');

    return result;
  }

  async runEnterpriseBenchmarks(): Promise<void> {
    console.log('🏢 ENTERPRISE REGISTRY BENCHMARKS');
    console.log('=================================');

    // Registry Package Benchmarks
    await this.benchmarkCommand(
      'Security Scanner (Registry)',
      'bunx --bun --package @fire22-registry/security-scanner audit'
    );

    await this.benchmarkCommand(
      'Compliance Core (Registry)',
      'bunx --bun -p @fire22-registry/compliance-core validate'
    );

    await this.benchmarkCommand(
      'Fraud Prevention (Registry)',
      'bunx --bun --package @fire22-registry/fraud-prevention monitor'
    );

    await this.benchmarkCommand(
      'Analytics Dashboard (Registry)',
      'bunx --bun -p @fire22-registry/analytics-dashboard report'
    );

    await this.benchmarkCommand(
      'Betting Engine (Registry)',
      'bunx --bun --package @fire22-registry/betting-engine validate'
    );

    await this.benchmarkCommand(
      'Payment Processing (Registry)',
      'bunx --bun -p @fire22-registry/payment-processing audit'
    );

    await this.benchmarkCommand(
      'User Management (Registry)',
      'bunx --bun --package @fire22-registry/user-management verify'
    );

    console.log('📦 NPM REGISTRY BENCHMARKS');
    console.log('==========================');

    // Real Package Benchmarks
    await this.benchmarkCommand('Prettier (NPM Registry)', 'bunx prettier --version');

    await this.benchmarkCommand('ESLint (NPM Registry)', 'bunx eslint --version');

    await this.benchmarkCommand('TypeScript Compiler (NPM Registry)', 'bunx tsc --version');

    await this.benchmarkCommand('Lodash (NPM Registry)', 'bunx lodash --version');

    console.log('🔄 CACHED PACKAGE BENCHMARKS');
    console.log('============================');

    // Run the same commands again to test caching
    await this.benchmarkCommand('Prettier (Cached)', 'bunx prettier --version');

    await this.benchmarkCommand('ESLint (Cached)', 'bunx eslint --version');

    console.log('⚡ PERFORMANCE COMPARISON');
    console.log('========================');

    await this.generatePerformanceReport();
  }

  private async generatePerformanceReport(): Promise<void> {
    const registryResults = this.results.filter(r => r.command.includes('@fire22-registry'));

    const npmResults = this.results.filter(
      r =>
        r.command.includes('bunx') &&
        !r.command.includes('@fire22-registry') &&
        !r.command.includes('(Cached)')
    );

    const cachedResults = this.results.filter(r => r.command.includes('(Cached)'));

    console.log('📊 Registry Package Performance:');
    console.log(
      `   Average Total Time: ${(registryResults.reduce((sum, r) => sum + r.totalTime, 0) / registryResults.length).toFixed(3)}ms`
    );
    console.log(
      `   Average CPU Usage: ${(registryResults.reduce((sum, r) => sum + r.cpuUsage, 0) / registryResults.length).toFixed(1)}%`
    );
    console.log(
      `   Success Rate: ${((registryResults.filter(r => r.exitCode === 0).length / registryResults.length) * 100).toFixed(1)}%`
    );

    console.log('');
    console.log('📦 NPM Package Performance:');
    console.log(
      `   Average Total Time: ${(npmResults.reduce((sum, r) => sum + r.totalTime, 0) / npmResults.length).toFixed(3)}ms`
    );
    console.log(
      `   Average CPU Usage: ${(npmResults.reduce((sum, r) => sum + r.cpuUsage, 0) / npmResults.length).toFixed(1)}%`
    );
    console.log(
      `   Success Rate: ${((npmResults.filter(r => r.exitCode === 0).length / npmResults.length) * 100).toFixed(1)}%`
    );

    console.log('');
    console.log('🔄 Cached Package Performance:');
    console.log(
      `   Average Total Time: ${(cachedResults.reduce((sum, r) => sum + r.totalTime, 0) / cachedResults.length).toFixed(3)}ms`
    );
    console.log(
      `   Average CPU Usage: ${(cachedResults.reduce((sum, r) => sum + r.cpuUsage, 0) / cachedResults.length).toFixed(1)}%`
    );
    console.log(
      `   Success Rate: ${((cachedResults.filter(r => r.exitCode === 0).length / cachedResults.length) * 100).toFixed(1)}%`
    );

    const cacheImprovement =
      cachedResults.length > 0
        ? (
            npmResults.reduce((sum, r) => sum + r.totalTime, 0) /
            npmResults.length /
            (cachedResults.reduce((sum, r) => sum + r.totalTime, 0) / cachedResults.length)
          ).toFixed(1)
        : 'N/A';

    console.log('');
    console.log(`🚀 Cache Performance Improvement: ${cacheImprovement}x faster`);

    console.log('');
    console.log('📋 DETAILED RESULTS');
    console.log('==================');

    this.results.forEach((result, index) => {
      const status = result.exitCode === 0 ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.command.split(' ').slice(-2).join(' ')}`);
      console.log(
        `   Time: ${result.totalTime.toFixed(3)}ms, CPU: ${result.cpuUsage.toFixed(1)}%, Exit: ${result.exitCode}`
      );
    });

    console.log('');
    console.log('💾 BENCHMARK DATA EXPORT');
    console.log('=======================');

    const exportData = {
      timestamp: new Date().toISOString(),
      benchmarks: this.results.map(r => ({
        command: r.command,
        totalTime: r.totalTime,
        userTime: r.userTime,
        systemTime: r.systemTime,
        cpuUsage: r.cpuUsage,
        exitCode: r.exitCode,
        success: r.exitCode === 0,
      })),
      summary: {
        totalBenchmarks: this.results.length,
        successfulBenchmarks: this.results.filter(r => r.exitCode === 0).length,
        averageTotalTime:
          this.results.reduce((sum, r) => sum + r.totalTime, 0) / this.results.length,
        averageCpuUsage: this.results.reduce((sum, r) => sum + r.cpuUsage, 0) / this.results.length,
      },
    };

    console.log('📄 JSON Export:');
    console.log(JSON.stringify(exportData, null, 2));

    // Save to file
    const filename = `bunx-benchmark-${Date.now()}.json`;
    await Bun.write(filename, JSON.stringify(exportData, null, 2));
    console.log(`💾 Saved benchmark data to: ${filename}`);
  }
}

// Run the benchmark
const benchmark = new BunxBenchmark();
await benchmark.runEnterpriseBenchmarks();

console.log('');
console.log('🎉 Fantasy42-Fire22 Registry - Bunx Benchmark Complete!');
console.log('Benchmark data saved and performance metrics calculated! 🚀');
