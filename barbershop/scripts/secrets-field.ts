#!/usr/bin/env bun

// secrets-field.ts - Secrets Field Computation CLI

import { SecretsField } from '../lib/security/secrets-field';
import { RedisVault } from '../lib/security/redis-vault';
import { integratedSecretManager } from '../lib/security/integrated-secret-manager';

interface ComputeOptions {
  keys?: string;
  systemId?: string;
  exposure?: number;
  output?: 'console' | 'json' | 'csv';
  iterations?: number;
  benchmark?: boolean;
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class SecretsFieldCompute {
  private options: ComputeOptions = {
    output: 'console',
    iterations: 1,
    benchmark: false
  };

  async run(args: string[]): Promise<void> {
    this.parseArgs(args);
    
    console.log(styled('🔍 Secrets Field Computation', 'primary'));
    console.log(styled('============================', 'muted'));
    console.log();
    
    if (this.options.benchmark) {
      await this.runBenchmark();
    } else {
      await this.runComputation();
    }
  }

  private parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--keys' && args[i + 1]) {
        this.options.keys = args[++i];
      }
      if (arg === '--system-id' && args[i + 1]) {
        this.options.systemId = args[++i];
      }
      if (arg === '--exposure' && args[i + 1]) {
        this.options.exposure = parseFloat(args[++i]);
      }
      if (arg === '--output' && args[i + 1]) {
        this.options.output = args[++i] as 'console' | 'json' | 'csv';
      }
      if (arg === '--iterations' && args[i + 1]) {
        this.options.iterations = parseInt(args[++i]);
      }
      if (arg === '--benchmark') {
        this.options.benchmark = true;
      }
      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      }
    }
  }

  private showHelp(): void {
    console.log(styled('🔍 Secrets Field Computation CLI', 'primary'));
    console.log(styled('================================', 'muted'));
    console.log();
    console.log(styled('Usage:', 'info'));
    console.log('  bun run secrets-field.ts [options]');
    console.log();
    console.log(styled('Options:', 'info'));
    console.log('  --keys <pattern>      Key pattern to compute (default: all)');
    console.log('  --system-id <id>      System identifier (default: auto-generated)');
    console.log('  --exposure <value>    Main exposure value (0-10)');
    console.log('  --output <format>     Output format: console, json, csv');
    console.log('  --iterations <num>    Number of iterations (default: 1)');
    console.log('  --benchmark           Run performance benchmark');
    console.log('  --help, -h            Show this help');
    console.log();
    console.log(styled('Examples:', 'info'));
    console.log('  bun run secrets-field.ts --keys factory');
    console.log('  bun run secrets-field.ts --exposure 7.5 --output json');
    console.log('  bun run secrets-field.ts --benchmark --iterations 100');
    console.log();
    console.log(styled('📚 Documentation:', 'accent'));
    console.log('  🔐 Bun Secrets: https://bun.sh/docs/runtime/secrets');
    console.log('  🏰 FactoryWager: https://docs.factory-wager.com/secrets');
  }

  private async runComputation(): Promise<void> {
    const systemId = this.options.systemId || `compute-${Date.now()}`;
    const mainExposure = this.options.exposure || 5.0;
    
    console.log(styled(`📊 Computing secrets field for: ${systemId}`, 'info'));
    console.log(styled(`📈 Main exposure: ${mainExposure}`, 'info'));
    console.log(styled(`🔑 Key pattern: ${this.options.keys || 'all'}`, 'info'));
    console.log();

    const results = [];
    
    for (let i = 0; i < this.options.iterations; i++) {
      if (this.options.iterations > 1) {
        console.log(styled(`🔄 Iteration ${i + 1}/${this.options.iterations}`, 'muted'));
      }
      
      try {
        // Create system state
        const state = {
          id: systemId,
          main: {
            exposure: mainExposure + (Math.random() - 0.5) * 2 // Add some variation
          },
          timestamp: new Date().toISOString(),
          metadata: {
            iteration: i + 1,
            keyPattern: this.options.keys,
            computeVersion: '5.1'
          }
        };
        
        // Compute secrets field
        const startTime = performance.now();
        const result = await SecretsField.compute(state);
        const computeTime = performance.now() - startTime;
        
        // Get recommendations
        const recommendations = await SecretsField.getRecommendations(result);
        
        const computationResult = {
          iteration: i + 1,
          timestamp: new Date().toISOString(),
          systemId,
          computeTime,
          field: {
            maxExposure: result.maxExposure,
            anomaly: result.anomaly,
            riskScore: this.calculateRiskScore(result.field)
          },
          recommendations: recommendations.length,
          fieldArray: Array.from(result.field)
        };
        
        results.push(computationResult);
        
        // Display results
        if (this.options.output === 'console') {
          this.displayConsoleResult(computationResult);
        }
        
      } catch (error) {
        console.error(styled(`❌ Computation failed: ${error.message}`, 'error'));
      }
    }
    
    // Output aggregated results
    if (this.options.iterations > 1) {
      await this.outputAggregatedResults(results);
    }
  }

  private async runBenchmark(): Promise<void> {
    console.log(styled('🚀 Running Secrets Field Benchmark', 'accent'));
    console.log(styled('================================', 'muted'));
    console.log();
    
    const iterations = this.options.iterations || 100;
    const systemId = `benchmark-${Date.now()}`;
    
    console.log(styled(`📊 Benchmarking ${iterations} iterations...`, 'info'));
    console.log();
    
    const times: number[] = [];
    const results: any[] = [];
    
    // Warmup
    console.log(styled('🔥 Warming up...', 'muted'));
    await SecretsField.compute({
      id: 'warmup',
      main: { exposure: 5.0 },
      timestamp: new Date().toISOString()
    });
    
    // Benchmark loop
    console.log(styled('⚡ Running benchmark...', 'muted'));
    
    for (let i = 0; i < iterations; i++) {
      const state = {
        id: `${systemId}-${i}`,
        main: {
          exposure: Math.random() * 10
        },
        timestamp: new Date().toISOString()
      };
      
      const startTime = performance.now();
      const result = await SecretsField.compute(state);
      const endTime = performance.now();
      
      const computeTime = endTime - startTime;
      times.push(computeTime);
      
      results.push({
        iteration: i + 1,
        computeTime,
        maxExposure: result.maxExposure,
        anomaly: result.anomaly
      });
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(styled(`   Progress: ${i + 1}/${iterations} (${((i + 1) / iterations * 100).toFixed(1)}%)`, 'info'));
      }
    }
    
    console.log();
    await this.displayBenchmarkResults(times, results);
  }

  private displayConsoleResult(result: any): void {
    console.log(styled('📊 Computation Result:', 'primary'));
    console.log(styled(`   Compute Time: ${result.computeTime.toFixed(2)}ms`, 'info'));
    console.log(styled(`   Max Exposure: ${(result.field.maxExposure * 100).toFixed(1)}%`, 
      result.field.maxExposure > 0.8 ? 'error' : result.field.maxExposure > 0.6 ? 'warning' : 'success'));
    console.log(styled(`   Anomaly: ${result.field.anomaly}`, 
      result.field.anomaly === 'SECURE' ? 'success' : 'error'));
    console.log(styled(`   Risk Score: ${result.field.riskScore.toFixed(1)}`, 'info'));
    console.log(styled(`   Recommendations: ${result.recommendations}`, 'accent'));
    
    // Field visualization
    console.log(styled('   Field Values:', 'muted'));
    const fieldNames = ['Main', 'API', 'DB', 'CSRF', 'Vault', 'Session', 'Encryption', 'Backup'];
    result.fieldArray.forEach((value: number, index: number) => {
      if (index < fieldNames.length) {
        const bar = '█'.repeat(Math.round(value * 10));
        const color = value > 0.8 ? 'error' : value > 0.6 ? 'warning' : value > 0.3 ? 'info' : 'success';
        console.log(styled(`     ${fieldNames[index].padEnd(12)}: ${bar.padEnd(10)} ${(value * 100).toFixed(1)}%`, color));
      }
    });
    console.log();
  }

  private calculateRiskScore(field: Float32Array): number {
    const weights = [0.8, 1.0, 0.7, 1.2, 0.8, 0.6, 0.5, 0.4];
    let risk = 0;
    
    for (let i = 0; i < field.length && i < weights.length; i++) {
      risk += field[i] * weights[i];
    }
    
    return Math.min(100, risk * 10);
  }

  private async outputAggregatedResults(results: any[]): Promise<void> {
    if (this.options.output === 'json') {
      await Bun.write(`secrets-field-results-${Date.now()}.json`, JSON.stringify(results, null, 2));
      console.log(styled(`📄 Results saved to JSON file`, 'success'));
    } else if (this.options.output === 'csv') {
      const csv = this.generateCSV(results);
      await Bun.write(`secrets-field-results-${Date.now()}.csv`, csv);
      console.log(styled(`📄 Results saved to CSV file`, 'success'));
    } else {
      // Console aggregation
      const avgComputeTime = results.reduce((sum, r) => sum + r.computeTime, 0) / results.length;
      const avgMaxExposure = results.reduce((sum, r) => sum + r.field.maxExposure, 0) / results.length;
      const anomalies = results.filter(r => r.field.anomaly !== 'SECURE').length;
      
      console.log(styled('📊 Aggregated Results:', 'primary'));
      console.log(styled(`   Average Compute Time: ${avgComputeTime.toFixed(2)}ms`, 'info'));
      console.log(styled(`   Average Max Exposure: ${(avgMaxExposure * 100).toFixed(1)}%`, 'info'));
      console.log(styled(`   Anomalies Detected: ${anomalies}/${results.length}`, anomalies > 0 ? 'warning' : 'success'));
      console.log(styled(`   Total Iterations: ${results.length}`, 'muted'));
    }
  }

  private generateCSV(results: any[]): string {
    const headers = ['Iteration', 'Timestamp', 'ComputeTime', 'MaxExposure', 'Anomaly', 'RiskScore', 'Recommendations'];
    const rows = results.map(r => [
      r.iteration,
      r.timestamp,
      r.computeTime.toFixed(2),
      r.field.maxExposure.toFixed(4),
      r.field.anomaly,
      r.field.riskScore.toFixed(1),
      r.recommendations
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private async displayBenchmarkResults(times: number[], results: any[]): Promise<void> {
    const stats = {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: this.median(times),
      p95: this.percentile(times, 95),
      p99: this.percentile(times, 99)
    };
    
    console.log(styled('📊 Benchmark Results:', 'primary'));
    console.log();
    console.log(styled('   Performance Statistics:', 'accent'));
    console.log(styled(`   Min:     ${stats.min.toFixed(2)}ms`, 'success'));
    console.log(styled(`   Max:     ${stats.max.toFixed(2)}ms`, 'error'));
    console.log(styled(`   Average: ${stats.avg.toFixed(2)}ms`, 'info'));
    console.log(styled(`   Median:  ${stats.median.toFixed(2)}ms`, 'info'));
    console.log(styled(`   95th:    ${stats.p95.toFixed(2)}ms`, 'warning'));
    console.log(styled(`   99th:    ${stats.p99.toFixed(2)}ms`, 'warning'));
    console.log();
    
    // Field analysis
    const exposures = results.map(r => r.field.maxExposure);
    const anomalies = results.filter(r => r.field.anomaly !== 'SECURE').length;
    
    console.log(styled('   Field Analysis:', 'accent'));
    console.log(styled(`   Avg Max Exposure: ${(exposures.reduce((sum, e) => sum + e, 0) / exposures.length * 100).toFixed(1)}%`, 'info'));
    console.log(styled(`   Anomalies: ${anomalies}/${results.length} (${(anomalies / results.length * 100).toFixed(1)}%)`, anomalies > 0 ? 'warning' : 'success'));
    
    // Performance classification
    const performance = stats.avg < 10 ? 'EXCELLENT' : stats.avg < 25 ? 'GOOD' : stats.avg < 50 ? 'FAIR' : 'POOR';
    const perfColor = performance === 'EXCELLENT' ? 'success' : performance === 'GOOD' ? 'info' : performance === 'FAIR' ? 'warning' : 'error';
    
    console.log();
    console.log(styled(`   Overall Performance: ${performance}`, perfColor));
    
    // Save benchmark results
    const benchmarkData = {
      timestamp: new Date().toISOString(),
      iterations: results.length,
      stats,
      fieldAnalysis: {
        avgMaxExposure: exposures.reduce((sum, e) => sum + e, 0) / exposures.length,
        anomalyRate: anomalies / results.length
      },
      results: results.slice(0, 10) // Save first 10 detailed results
    };
    
    await Bun.write(`secrets-field-benchmark-${Date.now()}.json`, JSON.stringify(benchmarkData, null, 2));
    console.log();
    console.log(styled('📄 Benchmark results saved to JSON file', 'success'));
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Run the CLI
const compute = new SecretsFieldCompute();
compute.run(Bun.argv.slice(2)).catch(console.error);
