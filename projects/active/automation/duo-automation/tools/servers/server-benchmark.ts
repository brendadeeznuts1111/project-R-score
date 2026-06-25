#!/usr/bin/env bun

/**
 * 📊 Server-Side Performance Benchmark
 * 
 * Node.js-based benchmarking tool for testing server performance
 * and API response times without browser dependencies.
 */

import { fetch } from 'undici';

interface ServerBenchmarkConfig {
  name: string;
  url: string;
  iterations: number;
  concurrency: number;
  timeout: number;
  headers?: Record<string, string>;
}

interface ServerBenchmarkResult {
  name: string;
  timestamp: string;
  url: string;
  iterations: number;
  concurrency: number;
  totalDuration: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  successRate: number;
  errorCount: number;
  results: {
    iteration: number;
    responseTime: number;
    statusCode: number;
    success: boolean;
    error?: string;
  }[];
}

class ServerBenchmark {
  private config: ServerBenchmarkConfig;

  constructor(config: ServerBenchmarkConfig) {
    this.config = config;
  }

  async runBenchmark(): Promise<ServerBenchmarkResult> {
    console.info('📊 Starting Server Performance Benchmark');
    console.info('='.repeat(45));
    console.info(`📋 Test: ${this.config.name}`);
    console.info(`🌐 URL: ${this.config.url}`);
    console.info(`🔄 Iterations: ${this.config.iterations}`);
    console.info(`⚡ Concurrency: ${this.config.concurrency}`);
    console.info(`⏱️ Timeout: ${this.config.timeout}ms`);
    console.info('');

    const startTime = Date.now();
    const results: ServerBenchmarkResult['results'] = [];
    let errorCount = 0;

    // Run benchmark iterations
    for (let i = 0; i < this.config.iterations; i++) {
      console.info(`🔄 Running iteration ${i + 1}/${this.config.iterations}`);
      
      const result = await this.makeRequest(i + 1);
      results.push(result);
      
      if (!result.success) {
        errorCount++;
      }
      
      const progress = ((i + 1) / this.config.iterations * 100).toFixed(1);
      console.info(`📈 Progress: ${progress}% - Response: ${result.responseTime}ms - Status: ${result.statusCode}`);
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const successRate = ((this.config.iterations - errorCount) / this.config.iterations) * 100;
    const requestsPerSecond = (this.config.iterations / totalDuration) * 1000;

    const benchmarkResult: ServerBenchmarkResult = {
      name: this.config.name,
      timestamp: new Date().toISOString(),
      url: this.config.url,
      iterations: this.config.iterations,
      concurrency: this.config.concurrency,
      totalDuration,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      successRate,
      errorCount,
      results
    };

    console.info('');
    console.info('✅ Benchmark completed successfully');
    return benchmarkResult;
  }

  private async makeRequest(iteration: number): Promise<ServerBenchmarkResult['results'][0]> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Factory-Wager-Benchmark/1.0',
          'Accept': 'text/html,application/json',
          ...this.config.headers
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        iteration,
        responseTime,
        statusCode: response.status,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        iteration,
        responseTime,
        statusCode: 0,
        success: false,
        error: (error as Error).message
      };
    }
  }

  generateReport(result: ServerBenchmarkResult): string {
    const report = [];
    
    report.push('📊 Server Performance Benchmark Report');
    report.push('='.repeat(45));
    report.push(`📋 Test: ${result.name}`);
    report.push(`🌐 URL: ${result.url}`);
    report.push(`📅 Date: ${new Date(result.timestamp).toLocaleString()}`);
    report.push(`🔄 Iterations: ${result.iterations}`);
    report.push(`⚡ Concurrency: ${result.concurrency}`);
    report.push('');

    report.push('⏱️ Performance Metrics:');
    report.push(`  Total Duration: ${result.totalDuration}ms`);
    report.push(`  Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    report.push(`  Min Response Time: ${result.minResponseTime}ms`);
    report.push(`  Max Response Time: ${result.maxResponseTime}ms`);
    report.push(`  Requests Per Second: ${result.requestsPerSecond.toFixed(2)}`);
    report.push(`  Success Rate: ${result.successRate.toFixed(2)}%`);
    report.push(`  Error Count: ${result.errorCount}`);
    report.push('');

    // Performance Grade
    const grade = this.calculatePerformanceGrade(result.averageResponseTime, result.successRate);
    report.push(`🏆 Performance Grade: ${grade}`);
    report.push('');

    // Response Time Distribution
    report.push('📊 Response Time Distribution:');
    const distribution = this.calculateDistribution(result.results);
    distribution.forEach((bucket, index) => {
      const bar = '█'.repeat(Math.round(bucket.percentage / 5));
      report.push(`  ${bucket.range}ms: ${bucket.count} requests (${bucket.percentage.toFixed(1)}%) ${bar}`);
    });
    report.push('');

    // Status Code Distribution
    report.push('🌐 Status Code Distribution:');
    const statusCodes = this.calculateStatusDistribution(result.results);
    statusCodes.forEach(status => {
      report.push(`  ${status.code}: ${status.count} requests (${status.percentage.toFixed(1)}%)`);
    });
    report.push('');

    // Recommendations
    const recommendations = this.generateRecommendations(result);
    report.push('💡 Recommendations:');
    recommendations.forEach(rec => {
      report.push(`  • ${rec}`);
    });

    return report.join('\n');
  }

  private calculatePerformanceGrade(avgResponseTime: number, successRate: number): string {
    if (successRate < 95) return 'F (Poor Reliability)';
    if (avgResponseTime < 100) return 'A+ (Excellent)';
    if (avgResponseTime < 200) return 'A (Very Good)';
    if (avgResponseTime < 500) return 'B (Good)';
    if (avgResponseTime < 1000) return 'C (Fair)';
    if (avgResponseTime < 2000) return 'D (Poor)';
    return 'F (Very Poor)';
  }

  private calculateDistribution(results: ServerBenchmarkResult['results']): Array<{range: string, count: number, percentage: number}> {
    const buckets = [
      { range: '0-100', min: 0, max: 100, count: 0 },
      { range: '100-200', min: 100, max: 200, count: 0 },
      { range: '200-500', min: 200, max: 500, count: 0 },
      { range: '500-1000', min: 500, max: 1000, count: 0 },
      { range: '1000+', min: 1000, max: Infinity, count: 0 }
    ];

    results.forEach(result => {
      const bucket = buckets.find(b => result.responseTime >= b.min && result.responseTime < b.max);
      if (bucket) bucket.count++;
    });

    return buckets.map(bucket => ({
      range: bucket.range,
      count: bucket.count,
      percentage: (bucket.count / results.length) * 100
    }));
  }

  private calculateStatusDistribution(results: ServerBenchmarkResult['results']): Array<{code: string, count: number, percentage: number}> {
    const statusMap = new Map<number, number>();

    results.forEach(result => {
      const count = statusMap.get(result.statusCode) || 0;
      statusMap.set(result.statusCode, count + 1);
    });

    return Array.from(statusMap.entries()).map(([code, count]) => ({
      code: code.toString(),
      count,
      percentage: (count / results.length) * 100
    }));
  }

  private generateRecommendations(result: ServerBenchmarkResult): string[] {
    const recommendations = [];

    if (result.successRate < 99) {
      recommendations.push('Improve server reliability - success rate is below 99%');
    }

    if (result.averageResponseTime > 500) {
      recommendations.push('Optimize server response time - average is above 500ms');
    }

    if (result.maxResponseTime > result.averageResponseTime * 3) {
      recommendations.push('Investigate response time outliers - high variance detected');
    }

    if (result.requestsPerSecond < 10) {
      recommendations.push('Consider server scaling - low throughput detected');
    }

    const errorResults = result.results.filter(r => !r.success);
    if (errorResults.length > 0) {
      const commonErrors = errorResults.reduce((acc, result) => {
        const error = result.error || 'Unknown';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostCommonError = Object.entries(commonErrors).sort((a, b) => b[1] - a[1])[0];
      if (mostCommonError) {
        recommendations.push(`Address common error: ${mostCommonError[0]} (${mostCommonError[1]} occurrences)`);
      }
    }

    if (result.averageResponseTime < 200 && result.successRate > 99) {
      recommendations.push('Performance is excellent - maintain current optimizations');
    }

    return recommendations;
  }

  exportResults(result: ServerBenchmarkResult, format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (format === 'csv') {
      const headers = ['Iteration', 'ResponseTime', 'StatusCode', 'Success', 'Error'];
      const rows = result.results.map(r => [
        r.iteration,
        r.responseTime,
        r.statusCode,
        r.success,
        r.error || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return '';
  }
}

class ServerBenchmarkCLI {
  private configs: Map<string, ServerBenchmarkConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Local development
    this.configs.set('local', {
      name: 'Local Development Server',
      url: 'http://localhost:3001',
      iterations: 20,
      concurrency: 1,
      timeout: 5000
    });

    // Production API
    this.configs.set('production', {
      name: 'Production API Test',
      url: 'https://admin.factory-wager.com',
      iterations: 50,
      concurrency: 1,
      timeout: 10000
    });

    // API endpoint test
    this.configs.set('api', {
      name: 'API Endpoint Test',
      url: 'https://admin.factory-wager.com/api/system/status',
      iterations: 100,
      concurrency: 1,
      timeout: 5000
    });

    // Health check
    this.configs.set('health', {
      name: 'Health Check Test',
      url: 'https://admin.factory-wager.com/health',
      iterations: 30,
      concurrency: 1,
      timeout: 3000
    });

    // Stress test
    this.configs.set('stress', {
      name: 'Stress Test',
      url: 'https://admin.factory-wager.com',
      iterations: 200,
      concurrency: 1,
      timeout: 15000
    });
  }

  async runBenchmark(configName: string, options: any = {}): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      console.error(`❌ Benchmark configuration '${configName}' not found`);
      console.info('💡 Available configurations: local, production, api, health, stress');
      process.exit(1);
    }

    // Override config with options
    const finalConfig = { ...config, ...options };

    try {
      const benchmark = new ServerBenchmark(finalConfig);
      const result = await benchmark.runBenchmark();
      
      const report = benchmark.generateReport(result);
      console.info(report);

      // Save results if requested
      if (options.save) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.output || `server-benchmark-${configName}-${timestamp}.json`;
        
        if (options.format === 'csv') {
          require('fs').writeFileSync(filename, benchmark.exportResults(result, 'csv'));
        } else {
          require('fs').writeFileSync(filename, benchmark.exportResults(result, 'json'));
        }
        
        console.info(`💾 Results saved to: ${filename}`);
      }

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }

  listConfigs(): void {
    console.info('📊 Available Server Benchmark Configurations:');
    console.info('='.repeat(50));

    this.configs.forEach((config, name) => {
      console.info(`\n🔧 ${name}: ${config.name}`);
      console.info(`   🌐 URL: ${config.url}`);
      console.info(`   🔄 Iterations: ${config.iterations}`);
      console.info(`   ⚡ Concurrency: ${config.concurrency}`);
      console.info(`   ⏱️ Timeout: ${config.timeout}ms`);
    });
  }

  showHelp(): void {
    console.info('📊 Server Performance Benchmark CLI');
    console.info('='.repeat(35));
    console.info('');
    console.info('USAGE:');
    console.info('  bun run server-benchmark.ts <command> [options]');
    console.info('');
    console.info('COMMANDS:');
    console.info('  run <config>            Run server benchmark');
    console.info('  list                    List available configurations');
    console.info('  help                    Show this help message');
    console.info('');
    console.info('CONFIGURATIONS:');
    console.info('  local                   Local development server');
    console.info('  production              Production server test');
    console.info('  api                     API endpoint test');
    console.info('  health                  Health check test');
    console.info('  stress                  Stress test');
    console.info('');
    console.info('OPTIONS:');
    console.info('  --iterations <n>        Override iteration count');
    console.info('  --timeout <ms>          Override request timeout');
    console.info('  --save                  Save results to file');
    console.info('  --output <path>         Output file path');
    console.info('  --format <format>       Output format (json|csv)');
    console.info('');
    console.info('EXAMPLES:');
    console.info('  bun run server-benchmark.ts run local');
    console.info('  bun run server-benchmark.ts run production --save');
    console.info('  bun run server-benchmark.ts run api --iterations 100 --save --format csv');
    console.info('');
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'run':
          const configName = args[1];
          const options: any = {};

          // Parse options
          for (let i = 2; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
              case '--iterations':
                options.iterations = parseInt(args[++i]);
                break;
              case '--timeout':
                options.timeout = parseInt(args[++i]);
                break;
              case '--save':
                options.save = true;
                break;
              case '--output':
                options.output = args[++i];
                break;
              case '--format':
                options.format = args[++i];
                break;
            }
          }

          await this.runBenchmark(configName, options);
          break;

        case 'list':
          this.listConfigs();
          break;

        default:
          console.error(`❌ Unknown command: ${command}`);
          console.info('💡 Run "bun run server-benchmark.ts help" for available commands');
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  const cli = new ServerBenchmarkCLI();
  cli.run();
}

export { ServerBenchmark, ServerBenchmarkCLI };
