#!/usr/bin/env bun
/**
 * P2P Gateway Benchmark Runner
 * 
 * Comprehensive benchmarking for P2P payment gateways with detailed metrics collection.
 * Uses Bun's native APIs for timing and integrates with the dashboard's database.
 */

import type { Database } from 'bun:sqlite';

// Re-export types for use in dashboard
export type P2PGateway = 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'wise' | 'revolut';
export type P2POperation = 'create' | 'query' | 'switch' | 'dry-run' | 'full' | 'webhook' | 'refund' | 'dispute';

export interface P2PGatewayResult {
  gateway: P2PGateway;
  operation: P2POperation;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  dryRun?: boolean;
  success?: boolean;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  endpoint?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface P2PBenchmarkOptions {
  gateways?: P2PGateway[];
  operations?: P2POperation[];
  iterations?: number;
  includeDryRun?: boolean;
  includeFull?: boolean;
  transactionAmounts?: number[];
  currencies?: string[];
}

export interface P2PBenchmarkResult {
  gateway: P2PGateway;
  operation: P2POperation;
  durationMs: number;
  success: boolean;
  error?: string;
  requestSize?: number;
  responseSize?: number;
  statusCode?: number;
  endpoint?: string;
  metadata?: Record<string, any>;
}

export class P2PGatewayBenchmark {
  private results: P2PBenchmarkResult[] = [];
  
  constructor(
    private options: P2PBenchmarkOptions = {},
    private historyDb?: Database
  ) {}
  
  private async simulateCreateTransaction(gateway: P2PGateway): Promise<any> {
    // Simulate different latencies per gateway
    const latencies: Record<P2PGateway, number> = {
      venmo: 150,
      cashapp: 120,
      paypal: 200,
      zelle: 180,
      wise: 220,
      revolut: 160
    };
    
    const latency = latencies[gateway] || 150;
    await Bun.sleep(latency + Math.random() * 50);
    
    const transactionId = `tx_${gateway}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    return {
      id: transactionId,
      gateway,
      amount: this.options.transactionAmounts?.[0] || 100.00,
      currency: this.options.currencies?.[0] || 'USD',
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: {
        simulated: true,
        benchmark: true
      }
    };
  }
  
  private async simulateQueryTransaction(gateway: P2PGateway): Promise<any> {
    // Simulate different query times
    const queryTimes: Record<P2PGateway, number> = {
      venmo: 100,
      cashapp: 80,
      paypal: 150,
      zelle: 120,
      wise: 180,
      revolut: 90
    };
    
    const queryTime = queryTimes[gateway] || 100;
    await Bun.sleep(queryTime + Math.random() * 30);
    
    return {
      id: `tx_${gateway}_${Date.now()}`,
      gateway,
      amount: this.options.transactionAmounts?.[0] || 100.00,
      currency: this.options.currencies?.[0] || 'USD',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString()
    };
  }
  
  private async simulateSwitchEnvironment(gateway: P2PGateway): Promise<any> {
    await Bun.sleep(200 + Math.random() * 100);
    
    return {
      gateway,
      environment: Math.random() > 0.5 ? 'sandbox' : 'production',
      switchedAt: new Date().toISOString()
    };
  }
  
  private async simulateDryRun(gateway: P2PGateway): Promise<any> {
    await Bun.sleep(50 + Math.random() * 50);
    
    const valid = Math.random() > 0.1; // 90% success rate
    
    return {
      valid,
      request: {
        amount: this.options.transactionAmounts?.[0] || 100.00,
        currency: this.options.currencies?.[0] || 'USD',
        gateway
      },
      result: valid ? {
        estimatedFee: 1.50,
        estimatedTime: '2-3 minutes',
        limits: {
          daily: 10000.00,
          remaining: 8500.00
        }
      } : {
        error: 'Insufficient funds',
        code: 'INSUFFICIENT_FUNDS'
      }
    };
  }
  
  private async simulateFullLifecycle(gateway: P2PGateway): Promise<any> {
    const steps = [
      { name: 'validation', duration: 50 },
      { name: 'fraud_check', duration: 100 },
      { name: 'funds_reservation', duration: 150 },
      { name: 'processing', duration: 200 },
      { name: 'settlement', duration: 250 }
    ];
    
    for (const step of steps) {
      await Bun.sleep(step.duration);
    }
    
    const success = Math.random() > 0.05; // 95% success rate
    
    return {
      success,
      requestSize: 512,
      responseSize: 1024,
      statusCode: success ? 200 : 400,
      steps: steps.length
    };
  }
  
  private async simulateWebhookProcessing(gateway: P2PGateway): Promise<any> {
    await Bun.sleep(80 + Math.random() * 40);
    
    const valid = Math.random() > 0.05; // 95% valid webhooks
    const payloadSize = 256 + Math.random() * 768; // 256-1024 bytes
    
    return {
      valid,
      payloadSize: Math.round(payloadSize),
      processedAt: new Date().toISOString(),
      signatureVerified: valid
    };
  }
  
  async runCreateBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'create';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const transaction = await this.simulateCreateTransaction(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: true,
          requestSize: JSON.stringify(transaction).length,
          responseSize: 512,
          statusCode: 201,
          endpoint: `/api/transactions/create`,
          metadata: {
            transactionId: transaction.id,
            gateway,
            simulated: true
          }
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 500,
          endpoint: `/api/transactions/create`
        });
      }
    }
    
    return results;
  }
  
  async runQueryBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'query';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const transaction = await this.simulateQueryTransaction(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: true,
          requestSize: 128,
          responseSize: JSON.stringify(transaction).length,
          statusCode: 200,
          endpoint: `/api/transactions/query`,
          metadata: {
            transactionId: transaction.id,
            gateway
          }
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 404,
          endpoint: `/api/transactions/query`
        });
      }
    }
    
    return results;
  }
  
  async runSwitchBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'switch';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const result = await this.simulateSwitchEnvironment(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: true,
          requestSize: 64,
          responseSize: 128,
          statusCode: 200,
          endpoint: `/api/gateways/switch`,
          metadata: result
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 400,
          endpoint: `/api/gateways/switch`
        });
      }
    }
    
    return results;
  }
  
  async runDryRunBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'dry-run';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const validation = await this.simulateDryRun(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: validation.valid,
          requestSize: JSON.stringify(validation.request).length,
          responseSize: JSON.stringify(validation.result).length,
          statusCode: validation.valid ? 200 : 422,
          endpoint: `/api/transactions/dry-run`,
          metadata: validation
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 500,
          endpoint: `/api/transactions/dry-run`
        });
      }
    }
    
    return results;
  }
  
  async runFullBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'full';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const lifecycle = await this.simulateFullLifecycle(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: lifecycle.success,
          requestSize: lifecycle.requestSize,
          responseSize: lifecycle.responseSize,
          statusCode: lifecycle.statusCode,
          endpoint: `/api/transactions/full`,
          metadata: {
            steps: lifecycle.steps,
            gateway
          }
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 500,
          endpoint: `/api/transactions/full`
        });
      }
    }
    
    return results;
  }
  
  async runWebhookBenchmark(gateway: P2PGateway, iterations: number = 1): Promise<P2PBenchmarkResult[]> {
    const results: P2PBenchmarkResult[] = [];
    const operation: P2POperation = 'webhook';
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Bun.nanoseconds();
      
      try {
        const processed = await this.simulateWebhookProcessing(gateway);
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: processed.valid,
          requestSize: processed.payloadSize,
          responseSize: 64,
          statusCode: processed.valid ? 200 : 400,
          endpoint: `/api/webhooks/${gateway}`,
          metadata: {
            signatureVerified: processed.signatureVerified,
            processedAt: processed.processedAt
          }
        });
      } catch (error) {
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        
        results.push({
          gateway,
          operation,
          durationMs,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 500,
          endpoint: `/api/webhooks/${gateway}`
        });
      }
    }
    
    return results;
  }
  
  async runAllBenchmarks(): Promise<{
    results: P2PBenchmarkResult[];
    summary: Record<string, any>;
  }> {
    const gateways = this.options.gateways || ['venmo', 'cashapp', 'paypal'];
    const operations = this.options.operations || ['create', 'query', 'switch'];
    const iterations = this.options.iterations || 100;
    
    // Run benchmarks for each gateway and operation combination
    for (const gateway of gateways) {
      for (const operation of operations) {
        let opResults: P2PBenchmarkResult[] = [];
        
        switch (operation) {
          case 'create':
            opResults = await this.runCreateBenchmark(gateway, Math.min(iterations, 50));
            break;
          case 'query':
            opResults = await this.runQueryBenchmark(gateway, Math.min(iterations, 100));
            break;
          case 'switch':
            opResults = await this.runSwitchBenchmark(gateway, Math.min(iterations, 10));
            break;
          case 'dry-run':
            if (this.options.includeDryRun) {
              opResults = await this.runDryRunBenchmark(gateway, Math.min(iterations, 50));
            }
            break;
          case 'full':
            if (this.options.includeFull) {
              opResults = await this.runFullBenchmark(gateway, Math.min(iterations, 10));
            }
            break;
          case 'webhook':
            opResults = await this.runWebhookBenchmark(gateway, Math.min(iterations, 50));
            break;
        }
        
        this.results.push(...opResults);
      }
    }
    
    // Generate summary
    const summary = this.generateSummary();
    
    return {
      results: this.results,
      summary
    };
  }
  
  private generateSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      totalOperations: this.results.length,
      successfulOps: this.results.filter(r => r.success).length,
      failedOps: this.results.filter(r => !r.success).length,
      successRate: this.results.length > 0 
        ? (this.results.filter(r => r.success).length / this.results.length) * 100 
        : 0,
      gateways: {},
      operations: {}
    };
    
    // Group by gateway
    for (const result of this.results) {
      if (!summary.gateways[result.gateway]) {
        summary.gateways[result.gateway] = {
          total: 0,
          successful: 0,
          failed: 0,
          durations: []
        };
      }
      
      summary.gateways[result.gateway].total++;
      if (result.success) {
        summary.gateways[result.gateway].successful++;
      } else {
        summary.gateways[result.gateway].failed++;
      }
      summary.gateways[result.gateway].durations.push(result.durationMs);
    }
    
    // Group by operation
    for (const result of this.results) {
      if (!summary.operations[result.operation]) {
        summary.operations[result.operation] = {
          total: 0,
          successful: 0,
          failed: 0,
          durations: []
        };
      }
      
      summary.operations[result.operation].total++;
      if (result.success) {
        summary.operations[result.operation].successful++;
      } else {
        summary.operations[result.operation].failed++;
      }
      summary.operations[result.operation].durations.push(result.durationMs);
    }
    
    // Calculate averages
    for (const gateway in summary.gateways) {
      const durations = summary.gateways[gateway].durations;
      summary.gateways[gateway].avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      summary.gateways[gateway].minDuration = Math.min(...durations);
      summary.gateways[gateway].maxDuration = Math.max(...durations);
      summary.gateways[gateway].successRate = (summary.gateways[gateway].successful / summary.gateways[gateway].total) * 100;
      delete summary.gateways[gateway].durations;
    }
    
    for (const operation in summary.operations) {
      const durations = summary.operations[operation].durations;
      summary.operations[operation].avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      summary.operations[operation].minDuration = Math.min(...durations);
      summary.operations[operation].maxDuration = Math.max(...durations);
      summary.operations[operation].successRate = (summary.operations[operation].successful / summary.operations[operation].total) * 100;
      delete summary.operations[operation].durations;
    }
    
    return summary;
  }
  
  // Convert internal results to dashboard format
  toDashboardResults(): P2PGatewayResult[] {
    return this.results.map(result => {
      // Calculate target based on operation type
      let target = 100; // Default target in ms
      if (result.operation === 'create') target = 200;
      else if (result.operation === 'query') target = 150;
      else if (result.operation === 'switch') target = 300;
      else if (result.operation === 'dry-run') target = 100;
      else if (result.operation === 'full') target = 750;
      else if (result.operation === 'webhook') target = 120;
      
      // Determine status
      let status: 'pass' | 'fail' | 'warning' = 'pass';
      if (!result.success) {
        status = 'fail';
      } else if (result.durationMs > target * 2) {
        status = 'warning';
      } else if (result.durationMs > target) {
        status = 'warning';
      }
      
      return {
        gateway: result.gateway,
        operation: result.operation,
        time: result.durationMs,
        target,
        status,
        note: result.success 
          ? `✅ ${result.gateway} ${result.operation}: ${result.durationMs.toFixed(3)}ms`
          : `❌ Error: ${result.error?.substring(0, 50)}`,
        dryRun: result.operation === 'dry-run',
        success: result.success,
        errorMessage: result.error,
        requestSize: result.requestSize,
        responseSize: result.responseSize,
        endpoint: result.endpoint,
        statusCode: result.statusCode,
        metadata: result.metadata,
      };
    });
  }
  
  getResults(): P2PBenchmarkResult[] {
    return this.results;
  }
  
  printResults() {
    console.log('\n📊 P2P Gateway Benchmark Results');
    console.log('='.repeat(50));
    
    // Group results by gateway
    const byGateway: Record<string, P2PBenchmarkResult[]> = {};
    
    for (const result of this.results) {
      if (!byGateway[result.gateway]) {
        byGateway[result.gateway] = [];
      }
      byGateway[result.gateway].push(result);
    }
    
    for (const [gateway, results] of Object.entries(byGateway)) {
      console.log(`\n${gateway.toUpperCase()}:`);
      console.log('-'.repeat(30));
      
      // Group by operation
      const byOperation: Record<string, P2PBenchmarkResult[]> = {};
      for (const result of results) {
        if (!byOperation[result.operation]) {
          byOperation[result.operation] = [];
        }
        byOperation[result.operation].push(result);
      }
      
      for (const [operation, opResults] of Object.entries(byOperation)) {
        const successful = opResults.filter(r => r.success).length;
        const total = opResults.length;
        const successRate = (successful / total) * 100;
        const avgDuration = opResults.reduce((sum, r) => sum + r.durationMs, 0) / total;
        
        console.log(`  ${operation}:`);
        console.log(`    Success Rate: ${successRate.toFixed(1)}% (${successful}/${total})`);
        console.log(`    Avg Duration: ${avgDuration.toFixed(2)}ms`);
        console.log(`    Min/Max: ${Math.min(...opResults.map(r => r.durationMs)).toFixed(2)}ms / ${Math.max(...opResults.map(r => r.durationMs)).toFixed(2)}ms`);
      }
    }
    
    // Overall summary
    console.log('\n📈 Overall Summary:');
    console.log('-'.repeat(30));
    console.log(`Total Operations: ${this.results.length}`);
    console.log(`Successful: ${this.results.filter(r => r.success).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.success).length}`);
    console.log(`Overall Success Rate: ${((this.results.filter(r => r.success).length / this.results.length) * 100).toFixed(1)}%`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
P2P Gateway Benchmark Tool
──────────────────────────

Usage:
  bun p2p-gateway-benchmark.ts [options]

Options:
  --gateways <list>     Comma-separated list of gateways (venmo,cashapp,paypal,zelle,wise,revolut)
  --operations <list>   Comma-separated list of operations (create,query,switch,dry-run,full,webhook)
  --iterations <n>      Number of iterations per benchmark (default: 100)
  --include-dry-run     Include dry-run operation
  --include-full        Include full lifecycle operation
  --output <file>       Output results to JSON file
  --json                Output results as JSON
  --compare             Compare gateways side-by-side
  --summary             Show summary statistics

Examples:
  bun p2p-gateway-benchmark.ts --gateways venmo,cashapp --operations create,query
  bun p2p-gateway-benchmark.ts --iterations 50 --include-dry-run --include-full
  bun p2p-gateway-benchmark.ts --output results.json --json
    `);
    return;
  }
  
  // Parse arguments
  const gateways = args.includes('--gateways') 
    ? args[args.indexOf('--gateways') + 1].split(',').map(g => g.trim()) as P2PGateway[]
    : ['venmo', 'cashapp', 'paypal'] as P2PGateway[];
  
  const includeDryRun = args.includes('--include-dry-run');
  const includeFull = args.includes('--include-full');
  
  // Build operations list - include dry-run and full if flags are set
  let operations: P2POperation[];
  if (args.includes('--operations')) {
    operations = args[args.indexOf('--operations') + 1].split(',').map(o => o.trim()) as P2POperation[];
    // Add dry-run and full if flags are set and not already in the list
    if (includeDryRun && !operations.includes('dry-run')) {
      operations.push('dry-run');
    }
    if (includeFull && !operations.includes('full')) {
      operations.push('full');
    }
  } else {
    // Default operations
    operations = ['create', 'query', 'switch'] as P2POperation[];
    // Add dry-run and full if flags are set
    if (includeDryRun) {
      operations.push('dry-run');
    }
    if (includeFull) {
      operations.push('full');
    }
  }
  
  const iterations = args.includes('--iterations')
    ? parseInt(args[args.indexOf('--iterations') + 1])
    : 100;
  
  // Run benchmark
  const benchmark = new P2PGatewayBenchmark({
    gateways,
    operations,
    iterations,
    includeDryRun,
    includeFull
  });
  
  const { results, summary } = await benchmark.runAllBenchmarks();
  
  // Output results
  if (args.includes('--json')) {
    console.log(JSON.stringify({ results, summary }, null, 2));
  } else if (args.includes('--compare')) {
    benchmark.printResults();
  } else {
    console.log('\n🎯 P2P Benchmark Complete!');
    console.log('='.repeat(50));
    console.log(`Total operations: ${results.length}`);
    console.log(`Gateways tested: ${gateways.length}`);
    console.log(`Operations tested: ${operations.length}`);
    console.log(`Overall success rate: ${summary.successRate.toFixed(1)}%`);
    
    // Show fastest gateway
    const fastestGateway = Object.entries(summary.gateways)
      .sort(([, a], [, b]) => a.avgDuration - b.avgDuration)[0];
    
    if (fastestGateway) {
      console.log(`🏆 Fastest gateway: ${fastestGateway[0]} (${fastestGateway[1].avgDuration.toFixed(2)}ms)`);
    }
    
    if (args.includes('--summary')) {
      console.log('\n📊 Summary:');
      console.log(JSON.stringify(summary, null, 2));
    }
  }
  
  // Save to file if requested
  if (args.includes('--output')) {
    const outputFile = args[args.indexOf('--output') + 1];
    await Bun.write(outputFile, JSON.stringify({ results, summary }, null, 2));
    console.log(`\n💾 Results saved to ${outputFile}`);
  }
}

if (import.meta.main) {
  await main();
}
