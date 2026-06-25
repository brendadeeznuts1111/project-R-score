#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Registry - Bunx Performance Benchmark Demo
 * Real-world performance benchmarking for enterprise bunx usage
 */

console.info('🚀 Fantasy42-Fire22 Registry - Bunx Performance Benchmark');
console.info('======================================================\n');

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
    console.info(`📊 Benchmarking: ${description}`);
    console.info(`🔧 Command: ${command}`);

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

    console.info(`⏱️  Total Time: ${totalTime.toFixed(3)}ms`);
    console.info(`👤 User Time: ${userTime.toFixed(3)}ms`);
    console.info(`⚙️  System Time: ${systemTime.toFixed(3)}ms`);
    console.info(`💻 CPU Usage: ${cpuUsage.toFixed(1)}%`);
    console.info(`📝 Exit Code: ${exitCode}`);
    console.info('');

    return result;
  }

  async runEnterpriseBenchmarks(): Promise<void> {
    console.info('🏢 ENTERPRISE REGISTRY BENCHMARKS');
    console.info('=================================');

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

    console.info('📦 NPM REGISTRY BENCHMARKS');
    console.info('==========================');

    // Real Package Benchmarks
    await this.benchmarkCommand('Prettier (NPM Registry)', 'bunx prettier --version');

    await this.benchmarkCommand('ESLint (NPM Registry)', 'bunx eslint --version');

    await this.benchmarkCommand('TypeScript Compiler (NPM Registry)', 'bunx tsc --version');

    await this.benchmarkCommand('Lodash (NPM Registry)', 'bunx lodash --version');

    console.info('🔄 CACHED PACKAGE BENCHMARKS');
    console.info('============================');

    // Run the same commands again to test caching
    await this.benchmarkCommand('Prettier (Cached)', 'bunx prettier --version');

    await this.benchmarkCommand('ESLint (Cached)', 'bunx eslint --version');

    console.info('⚡ PERFORMANCE COMPARISON');
    console.info('========================');

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

    console.info('📊 Registry Package Performance:');
    console.info(
      `   Average Total Time: ${(registryResults.reduce((sum, r) => sum + r.totalTime, 0) / registryResults.length).toFixed(3)}ms`
    );
    console.info(
      `   Average CPU Usage: ${(registryResults.reduce((sum, r) => sum + r.cpuUsage, 0) / registryResults.length).toFixed(1)}%`
    );
    console.info(
      `   Success Rate: ${((registryResults.filter(r => r.exitCode === 0).length / registryResults.length) * 100).toFixed(1)}%`
    );

    console.info('');
    console.info('📦 NPM Package Performance:');
    console.info(
      `   Average Total Time: ${(npmResults.reduce((sum, r) => sum + r.totalTime, 0) / npmResults.length).toFixed(3)}ms`
    );
    console.info(
      `   Average CPU Usage: ${(npmResults.reduce((sum, r) => sum + r.cpuUsage, 0) / npmResults.length).toFixed(1)}%`
    );
    console.info(
      `   Success Rate: ${((npmResults.filter(r => r.exitCode === 0).length / npmResults.length) * 100).toFixed(1)}%`
    );

    console.info('');
    console.info('🔄 Cached Package Performance:');
    console.info(
      `   Average Total Time: ${(cachedResults.reduce((sum, r) => sum + r.totalTime, 0) / cachedResults.length).toFixed(3)}ms`
    );
    console.info(
      `   Average CPU Usage: ${(cachedResults.reduce((sum, r) => sum + r.cpuUsage, 0) / cachedResults.length).toFixed(1)}%`
    );
    console.info(
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

    console.info('');
    console.info(`🚀 Cache Performance Improvement: ${cacheImprovement}x faster`);

    console.info('');
    console.info('📋 DETAILED RESULTS');
    console.info('==================');

    this.results.forEach((result, index) => {
      const status = result.exitCode === 0 ? '✅' : '❌';
      console.info(`${index + 1}. ${status} ${result.command.split(' ').slice(-2).join(' ')}`);
      console.info(
        `   Time: ${result.totalTime.toFixed(3)}ms, CPU: ${result.cpuUsage.toFixed(1)}%, Exit: ${result.exitCode}`
      );
    });

    console.info('');
    console.info('💾 BENCHMARK DATA EXPORT');
    console.info('=======================');

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

    console.info('📄 JSON Export:');
    console.info(JSON.stringify(exportData, null, 2));

    // Save to file
    const filename = `bunx-benchmark-${Date.now()}.json`;
    await Bun.write(filename, JSON.stringify(exportData, null, 2));
    console.info(`💾 Saved benchmark data to: ${filename}`);
  }
}

// Run the benchmark
const benchmark = new BunxBenchmark();
await benchmark.runEnterpriseBenchmarks();

console.info('');
console.info('🎉 Fantasy42-Fire22 Registry - Bunx Benchmark Complete!');
console.info('Benchmark data saved and performance metrics calculated! 🚀');
