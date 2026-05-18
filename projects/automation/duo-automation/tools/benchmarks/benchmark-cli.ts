#!/usr/bin/env bun

/**
 * 📊 Performance Benchmark CLI
 * 
 * Command-line tool for running performance benchmarks
 * and analyzing the Factory-Wager admin dashboard.
 */

import { PerformanceBenchmark } from './src/benchmark/performance-benchmark.ts';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface BenchmarkConfig {
  name: string;
  url: string;
  iterations: number;
  warmupIterations: number;
  timeout: number;
  outputFormat: 'json' | 'csv' | 'report';
  outputPath?: string;
  compareBaseline?: string;
}

class BenchmarkCLI {
  private configs: Map<string, BenchmarkConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Quick benchmark
    this.configs.set('quick', {
      name: 'Quick Performance Check',
      url: 'http://localhost:3001',
      iterations: 3,
      warmupIterations: 1,
      timeout: 15000,
      outputFormat: 'report'
    });

    // Standard benchmark
    this.configs.set('standard', {
      name: 'Standard Performance Benchmark',
      url: 'http://localhost:3001',
      iterations: 10,
      warmupIterations: 3,
      timeout: 30000,
      outputFormat: 'report'
    });

    // Comprehensive benchmark
    this.configs.set('comprehensive', {
      name: 'Comprehensive Performance Analysis',
      url: 'http://localhost:3001',
      iterations: 20,
      warmupIterations: 5,
      timeout: 60000,
      outputFormat: 'report'
    });

    // Production benchmark
    this.configs.set('production', {
      name: 'Production Performance Test',
      url: 'https://admin.factory-wager.com',
      iterations: 15,
      warmupIterations: 3,
      timeout: 45000,
      outputFormat: 'report'
    });

    // Preconnect comparison
    this.configs.set('preconnect', {
      name: 'Preconnect Optimization Test',
      url: 'http://localhost:3001',
      iterations: 12,
      warmupIterations: 2,
      timeout: 30000,
      outputFormat: 'report'
    });
  }

  async runBenchmark(configName: string, options: any = {}): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      console.error(`❌ Benchmark configuration '${configName}' not found`);
      console.info('💡 Available configurations: quick, standard, comprehensive, production, preconnect');
      process.exit(1);
    }

    // Override config with options
    const finalConfig = { ...config, ...options };

    console.info('🚀 Starting Performance Benchmark');
    console.info('='.repeat(40));
    console.info(`📋 Test: ${finalConfig.name}`);
    console.info(`🌐 URL: ${finalConfig.url}`);
    console.info(`🔄 Iterations: ${finalConfig.iterations}`);
    console.info(`🔥 Warmup: ${finalConfig.warmupIterations}`);
    console.info(`⏱️ Timeout: ${finalConfig.timeout}ms`);
    console.info('');

    try {
      // Create benchmark instance
      const benchmark = new PerformanceBenchmark({
        name: finalConfig.name,
        iterations: finalConfig.iterations,
        warmupIterations: finalConfig.warmupIterations,
        timeout: finalConfig.timeout,
        targets: {
          webVitals: true,
          networkPerformance: true,
          resourceLoading: true,
          preconnectEffectiveness: configName === 'preconnect'
        }
      });

      // Run benchmark
      const results = await benchmark.runBenchmark(finalConfig.url);

      // Generate report
      const report = benchmark.generateReport();
      console.info(report);

      // Save results if requested
      if (finalConfig.outputPath || finalConfig.outputFormat !== 'report') {
        this.saveResults(benchmark, finalConfig);
      }

      // Compare with baseline if requested
      if (finalConfig.compareBaseline) {
        await this.compareWithBaseline(benchmark, finalConfig.compareBaseline);
      }

      console.info('✅ Benchmark completed successfully');

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }

  private saveResults(benchmark: PerformanceBenchmark, config: BenchmarkConfig): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (config.outputFormat) {
      case 'json':
        const jsonPath = config.outputPath || `benchmark-results-${timestamp}.json`;
        writeFileSync(jsonPath, benchmark.exportResults('json'));
        console.info(`💾 Results saved to: ${jsonPath}`);
        break;
        
      case 'csv':
        const csvPath = config.outputPath || `benchmark-results-${timestamp}.csv`;
        writeFileSync(csvPath, benchmark.exportResults('csv'));
        console.info(`💾 Results saved to: ${csvPath}`);
        break;
        
      case 'report':
        const reportPath = config.outputPath || `benchmark-report-${timestamp}.md`;
        const report = benchmark.generateReport();
        writeFileSync(reportPath, report);
        console.info(`💾 Report saved to: ${reportPath}`);
        break;
    }
  }

  private async compareWithBaseline(benchmark: PerformanceBenchmark, baselinePath: string): Promise<void> {
    try {
      const baselineData = readFileSync(baselinePath, 'utf-8');
      const baselineResults = JSON.parse(baselineData);
      
      const comparison = await benchmark.compareWithBaseline(baselineResults);
      console.info('\n' + comparison);
    } catch (error) {
      console.warn(`⚠️ Could not compare with baseline: ${error}`);
    }
  }

  async runPreconnectComparison(): Promise<void> {
    console.info('🚀 Running Preconnect Optimization Comparison');
    console.info('='.repeat(50));
    console.info('');

    // Test without preconnect
    console.info('📊 Testing WITHOUT preconnect optimization...');
    const benchmarkWithout = new PerformanceBenchmark({
      name: 'Without Preconnect',
      iterations: 8,
      warmupIterations: 2,
      targets: {
        webVitals: true,
        networkPerformance: true,
        resourceLoading: true,
        preconnectEffectiveness: false
      }
    });

    const resultsWithout = await benchmarkWithout.runBenchmark();
    const avgWithout = resultsWithout.reduce((sum, r) => sum + r.duration, 0) / resultsWithout.length;

    console.info(`⏱️ Average time without preconnect: ${avgWithout.toFixed(2)}ms`);
    console.info('');

    // Test with preconnect
    console.info('📊 Testing WITH preconnect optimization...');
    const benchmarkWith = new PerformanceBenchmark({
      name: 'With Preconnect',
      iterations: 8,
      warmupIterations: 2,
      targets: {
        webVitals: true,
        networkPerformance: true,
        resourceLoading: true,
        preconnectEffectiveness: true
      }
    });

    const resultsWith = await benchmarkWith.runBenchmark();
    const avgWith = resultsWith.reduce((sum, r) => sum + r.duration, 0) / resultsWith.length;

    console.info(`⏱️ Average time with preconnect: ${avgWith.toFixed(2)}ms`);
    console.info('');

    // Calculate improvement
    const improvement = ((avgWithout - avgWith) / avgWithout * 100);
    const timeSaved = avgWithout - avgWith;

    console.info('📈 Preconnect Optimization Results:');
    console.info('='.repeat(35));
    console.info(`⚡ Time Saved: ${timeSaved.toFixed(2)}ms`);
    console.info(`📊 Performance Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%`);
    
    if (improvement > 5) {
      console.info('🎉 Preconnect optimization is HIGHLY effective!');
    } else if (improvement > 0) {
      console.info('✅ Preconnect optimization shows positive results');
    } else {
      console.info('⚠️ Preconnect optimization shows minimal impact');
    }

    console.info('');

    // Save comparison results
    const comparisonData = {
      timestamp: new Date().toISOString(),
      withoutPreconnect: {
        averageTime: avgWithout,
        results: resultsWithout
      },
      withPreconnect: {
        averageTime: avgWith,
        results: resultsWith
      },
      improvement: {
        timeSaved,
        percentage: improvement
      }
    };

    const comparisonPath = `preconnect-comparison-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(comparisonPath, JSON.stringify(comparisonData, null, 2));
    console.info(`💾 Comparison saved to: ${comparisonPath}`);
  }

  async runNetworkAnalysis(): Promise<void> {
    console.info('🌐 Running Network Performance Analysis');
    console.info('='.repeat(40));
    console.info('');

    // Test different network conditions if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.info(`📶 Current Network: ${connection.effectiveType || 'Unknown'}`);
      console.info(`📊 Downlink: ${connection.downlink || 'Unknown'}Mbps`);
      console.info(`⏱️ RTT: ${connection.rtt || 'Unknown'}ms`);
      console.info('');
    }

    // Run network-focused benchmark
    const benchmark = new PerformanceBenchmark({
      name: 'Network Performance Analysis',
      iterations: 5,
      warmupIterations: 1,
      targets: {
        webVitals: true,
        networkPerformance: true,
        resourceLoading: true,
        preconnectEffectiveness: false
      }
    });

    const results = await benchmark.runBenchmark();
    
    // Analyze network performance
    const avgDNS = results.reduce((sum, r) => sum + (r.networkPerformance?.dnsLookup || 0), 0) / results.length;
    const avgTCP = results.reduce((sum, r) => sum + (r.networkPerformance?.tcpConnect || 0), 0) / results.length;
    const avgFirstByte = results.reduce((sum, r) => sum + (r.networkPerformance?.firstByte || 0), 0) / results.length;

    console.info('🌐 Network Performance Analysis:');
    console.info('='.repeat(35));
    console.info(`🔍 DNS Lookup: ${avgDNS.toFixed(2)}ms`);
    console.info(`🔗 TCP Connect: ${avgTCP.toFixed(2)}ms`);
    console.info(`📡 First Byte: ${avgFirstByte.toFixed(2)}ms`);
    console.info(`🌍 Total Network Time: ${(avgDNS + avgTCP + avgFirstByte).toFixed(2)}ms`);
    console.info('');

    // Network recommendations
    console.info('💡 Network Optimization Recommendations:');
    if (avgDNS > 100) {
      console.info('  • Consider DNS prefetching for slow DNS resolution');
    }
    if (avgTCP > 150) {
      console.info('  • Consider HTTP/2 or HTTP/3 for faster connection setup');
    }
    if (avgFirstByte > 200) {
      console.info('  • Consider CDN optimization for faster TTFB');
    }
    if (avgDNS < 50 && avgTCP < 100 && avgFirstByte < 150) {
      console.info('  ✅ Network performance is excellent');
    }
  }

  listConfigs(): void {
    console.info('📊 Available Benchmark Configurations:');
    console.info('='.repeat(40));

    this.configs.forEach((config, name) => {
      console.info(`\n🔧 ${name}: ${config.name}`);
      console.info(`   🌐 URL: ${config.url}`);
      console.info(`   🔄 Iterations: ${config.iterations}`);
      console.info(`   🔥 Warmup: ${config.warmupIterations}`);
      console.info(`   ⏱️ Timeout: ${config.timeout}ms`);
      console.info(`   📊 Format: ${config.outputFormat}`);
    });
  }

  showHelp(): void {
    console.info('📊 Performance Benchmark CLI');
    console.info('='.repeat(30));
    console.info('');
    console.info('USAGE:');
    console.info('  bun run benchmark-cli.ts <command> [options]');
    console.info('');
    console.info('COMMANDS:');
    console.info('  run <config>            Run benchmark with configuration');
    console.info('  compare                 Compare preconnect optimization');
    console.info('  network                 Analyze network performance');
    console.info('  list                    List available configurations');
    console.info('  help                    Show this help message');
    console.info('');
    console.info('CONFIGURATIONS:');
    console.info('  quick                   Quick performance check (3 iterations)');
    console.info('  standard                 Standard benchmark (10 iterations)');
    console.info('  comprehensive           Comprehensive analysis (20 iterations)');
    console.info('  production              Production environment test');
    console.info('  preconnect              Preconnect optimization test');
    console.info('');
    console.info('OPTIONS:');
    console.info('  --url <url>             Override target URL');
    console.info('  --iterations <n>        Override iteration count');
    console.info('  --output <format>       Output format (json|csv|report)');
    console.info('  --output-path <path>    Save results to file');
    console.info('  --compare <path>        Compare with baseline results');
    console.info('');
    console.info('EXAMPLES:');
    console.info('  bun run benchmark-cli.ts run quick');
    console.info('  bun run benchmark-cli.ts run standard --output json');
    console.info('  bun run benchmark-cli.ts run production --output-path results.json');
    console.info('  bun run benchmark-cli.ts compare');
    console.info('  bun run benchmark-cli.ts network');
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
              case '--url':
                options.url = args[++i];
                break;
              case '--iterations':
                options.iterations = parseInt(args[++i]);
                break;
              case '--output':
                options.outputFormat = args[++i];
                break;
              case '--output-path':
                options.outputPath = args[++i];
                break;
              case '--compare':
                options.compareBaseline = args[++i];
                break;
            }
          }

          await this.runBenchmark(configName, options);
          break;

        case 'compare':
          await this.runPreconnectComparison();
          break;

        case 'network':
          await this.runNetworkAnalysis();
          break;

        case 'list':
          this.listConfigs();
          break;

        default:
          console.error(`❌ Unknown command: ${command}`);
          console.info('💡 Run "bun run benchmark-cli.ts help" for available commands');
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
  const cli = new BenchmarkCLI();
  cli.run();
}

export { BenchmarkCLI };
