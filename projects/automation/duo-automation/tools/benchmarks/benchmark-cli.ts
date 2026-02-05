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
      console.log('💡 Available configurations: quick, standard, comprehensive, production, preconnect');
      process.exit(1);
    }

    // Override config with options
    const finalConfig = { ...config, ...options };

    console.log('🚀 Starting Performance Benchmark');
    console.log('='.repeat(40));
    console.log(`📋 Test: ${finalConfig.name}`);
    console.log(`🌐 URL: ${finalConfig.url}`);
    console.log(`🔄 Iterations: ${finalConfig.iterations}`);
    console.log(`🔥 Warmup: ${finalConfig.warmupIterations}`);
    console.log(`⏱️ Timeout: ${finalConfig.timeout}ms`);
    console.log('');

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
      console.log(report);

      // Save results if requested
      if (finalConfig.outputPath || finalConfig.outputFormat !== 'report') {
        this.saveResults(benchmark, finalConfig);
      }

      // Compare with baseline if requested
      if (finalConfig.compareBaseline) {
        await this.compareWithBaseline(benchmark, finalConfig.compareBaseline);
      }

      console.log('✅ Benchmark completed successfully');

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
        console.log(`💾 Results saved to: ${jsonPath}`);
        break;
        
      case 'csv':
        const csvPath = config.outputPath || `benchmark-results-${timestamp}.csv`;
        writeFileSync(csvPath, benchmark.exportResults('csv'));
        console.log(`💾 Results saved to: ${csvPath}`);
        break;
        
      case 'report':
        const reportPath = config.outputPath || `benchmark-report-${timestamp}.md`;
        const report = benchmark.generateReport();
        writeFileSync(reportPath, report);
        console.log(`💾 Report saved to: ${reportPath}`);
        break;
    }
  }

  private async compareWithBaseline(benchmark: PerformanceBenchmark, baselinePath: string): Promise<void> {
    try {
      const baselineData = readFileSync(baselinePath, 'utf-8');
      const baselineResults = JSON.parse(baselineData);
      
      const comparison = await benchmark.compareWithBaseline(baselineResults);
      console.log('\n' + comparison);
    } catch (error) {
      console.warn(`⚠️ Could not compare with baseline: ${error}`);
    }
  }

  async runPreconnectComparison(): Promise<void> {
    console.log('🚀 Running Preconnect Optimization Comparison');
    console.log('='.repeat(50));
    console.log('');

    // Test without preconnect
    console.log('📊 Testing WITHOUT preconnect optimization...');
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

    console.log(`⏱️ Average time without preconnect: ${avgWithout.toFixed(2)}ms`);
    console.log('');

    // Test with preconnect
    console.log('📊 Testing WITH preconnect optimization...');
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

    console.log(`⏱️ Average time with preconnect: ${avgWith.toFixed(2)}ms`);
    console.log('');

    // Calculate improvement
    const improvement = ((avgWithout - avgWith) / avgWithout * 100);
    const timeSaved = avgWithout - avgWith;

    console.log('📈 Preconnect Optimization Results:');
    console.log('='.repeat(35));
    console.log(`⚡ Time Saved: ${timeSaved.toFixed(2)}ms`);
    console.log(`📊 Performance Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%`);
    
    if (improvement > 5) {
      console.log('🎉 Preconnect optimization is HIGHLY effective!');
    } else if (improvement > 0) {
      console.log('✅ Preconnect optimization shows positive results');
    } else {
      console.log('⚠️ Preconnect optimization shows minimal impact');
    }

    console.log('');

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
    console.log(`💾 Comparison saved to: ${comparisonPath}`);
  }

  async runNetworkAnalysis(): Promise<void> {
    console.log('🌐 Running Network Performance Analysis');
    console.log('='.repeat(40));
    console.log('');

    // Test different network conditions if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log(`📶 Current Network: ${connection.effectiveType || 'Unknown'}`);
      console.log(`📊 Downlink: ${connection.downlink || 'Unknown'}Mbps`);
      console.log(`⏱️ RTT: ${connection.rtt || 'Unknown'}ms`);
      console.log('');
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

    console.log('🌐 Network Performance Analysis:');
    console.log('='.repeat(35));
    console.log(`🔍 DNS Lookup: ${avgDNS.toFixed(2)}ms`);
    console.log(`🔗 TCP Connect: ${avgTCP.toFixed(2)}ms`);
    console.log(`📡 First Byte: ${avgFirstByte.toFixed(2)}ms`);
    console.log(`🌍 Total Network Time: ${(avgDNS + avgTCP + avgFirstByte).toFixed(2)}ms`);
    console.log('');

    // Network recommendations
    console.log('💡 Network Optimization Recommendations:');
    if (avgDNS > 100) {
      console.log('  • Consider DNS prefetching for slow DNS resolution');
    }
    if (avgTCP > 150) {
      console.log('  • Consider HTTP/2 or HTTP/3 for faster connection setup');
    }
    if (avgFirstByte > 200) {
      console.log('  • Consider CDN optimization for faster TTFB');
    }
    if (avgDNS < 50 && avgTCP < 100 && avgFirstByte < 150) {
      console.log('  ✅ Network performance is excellent');
    }
  }

  listConfigs(): void {
    console.log('📊 Available Benchmark Configurations:');
    console.log('='.repeat(40));

    this.configs.forEach((config, name) => {
      console.log(`\n🔧 ${name}: ${config.name}`);
      console.log(`   🌐 URL: ${config.url}`);
      console.log(`   🔄 Iterations: ${config.iterations}`);
      console.log(`   🔥 Warmup: ${config.warmupIterations}`);
      console.log(`   ⏱️ Timeout: ${config.timeout}ms`);
      console.log(`   📊 Format: ${config.outputFormat}`);
    });
  }

  showHelp(): void {
    console.log('📊 Performance Benchmark CLI');
    console.log('='.repeat(30));
    console.log('');
    console.log('USAGE:');
    console.log('  bun run benchmark-cli.ts <command> [options]');
    console.log('');
    console.log('COMMANDS:');
    console.log('  run <config>            Run benchmark with configuration');
    console.log('  compare                 Compare preconnect optimization');
    console.log('  network                 Analyze network performance');
    console.log('  list                    List available configurations');
    console.log('  help                    Show this help message');
    console.log('');
    console.log('CONFIGURATIONS:');
    console.log('  quick                   Quick performance check (3 iterations)');
    console.log('  standard                 Standard benchmark (10 iterations)');
    console.log('  comprehensive           Comprehensive analysis (20 iterations)');
    console.log('  production              Production environment test');
    console.log('  preconnect              Preconnect optimization test');
    console.log('');
    console.log('OPTIONS:');
    console.log('  --url <url>             Override target URL');
    console.log('  --iterations <n>        Override iteration count');
    console.log('  --output <format>       Output format (json|csv|report)');
    console.log('  --output-path <path>    Save results to file');
    console.log('  --compare <path>        Compare with baseline results');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  bun run benchmark-cli.ts run quick');
    console.log('  bun run benchmark-cli.ts run standard --output json');
    console.log('  bun run benchmark-cli.ts run production --output-path results.json');
    console.log('  bun run benchmark-cli.ts compare');
    console.log('  bun run benchmark-cli.ts network');
    console.log('');
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
          console.log('💡 Run "bun run benchmark-cli.ts help" for available commands');
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
