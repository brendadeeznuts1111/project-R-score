#!/usr/bin/env bun
/**
 * Unified CLI for Dev Dashboard Benchmarks
 * 
 * Supports:
 * - P2P gateway benchmarks
 * - Profile engine benchmarks
 * - Combined benchmarks
 * - API server mode
 */

import { P2PGatewayBenchmark, type P2PGateway, type P2POperation } from './p2p-gateway-benchmark.ts';
import type { ProfileOperation } from './enhanced-dashboard';

interface CLIOptions {
  output?: string;
  json?: boolean;
  compare?: boolean;
  summary?: boolean;
}

async function runP2PBenchmarks(args: string[]) {
  const gateways: P2PGateway[] = [];
  const operations: P2POperation[] = [];
  let iterations = 100;
  let includeDryRun = false;
  let includeFull = false;
  const options: CLIOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--gateways':
        if (nextArg) {
          gateways.push(...nextArg.split(',').map(g => g.trim()) as P2PGateway[]);
          i++;
        }
        break;
      case '--operations':
        if (nextArg) {
          operations.push(...nextArg.split(',').map(o => o.trim()) as P2POperation[]);
          i++;
        }
        break;
      case '--iterations':
        if (nextArg) {
          iterations = parseInt(nextArg);
          i++;
        }
        break;
      case '--include-dry-run':
        includeDryRun = true;
        break;
      case '--include-full':
        includeFull = true;
        break;
      case '--output':
        if (nextArg) {
          options.output = nextArg;
          i++;
        }
        break;
      case '--json':
        options.json = true;
        break;
      case '--compare':
        options.compare = true;
        break;
      case '--summary':
        options.summary = true;
        break;
    }
  }

  // Defaults
  if (gateways.length === 0) {
    gateways.push('venmo', 'cashapp', 'paypal');
  }
  if (operations.length === 0) {
    operations.push('create', 'query', 'switch');
    if (includeDryRun) operations.push('dry-run');
    if (includeFull) operations.push('full');
  } else {
    if (includeDryRun && !operations.includes('dry-run')) operations.push('dry-run');
    if (includeFull && !operations.includes('full')) operations.push('full');
  }

  console.info(`🚀 Running P2P Gateway Benchmarks`);
  console.info(`   Gateways: ${gateways.join(', ')}`);
  console.info(`   Operations: ${operations.join(', ')}`);
  console.info(`   Iterations: ${iterations}\n`);

  const benchmark = new P2PGatewayBenchmark({
    gateways,
    operations,
    iterations,
    includeDryRun,
    includeFull,
  });

  const { results, summary } = await benchmark.runAllBenchmarks();

  // Output results
  if (options.json) {
    const output = JSON.stringify({ results, summary }, null, 2);
    if (options.output) {
      await Bun.write(options.output, output);
      console.info(`\n💾 Results saved to ${options.output}`);
    } else {
      console.info(output);
    }
  } else if (options.compare) {
    benchmark.printResults();
  } else {
    console.info('\n🎯 P2P Benchmark Complete!');
    console.info('='.repeat(50));
    console.info(`Total operations: ${results.length}`);
    console.info(`Gateways tested: ${gateways.length}`);
    console.info(`Operations tested: ${operations.length}`);
    console.info(`Overall success rate: ${summary.successRate.toFixed(1)}%`);

    const fastestGateway = Object.entries(summary.gateways)
      .sort(([, a], [, b]) => a.avgDuration - b.avgDuration)[0];

    if (fastestGateway) {
      console.info(`🏆 Fastest gateway: ${fastestGateway[0]} (${fastestGateway[1].avgDuration.toFixed(2)}ms)`);
    }

    if (options.summary) {
      console.info('\n📊 Summary:');
      console.info(JSON.stringify(summary, null, 2));
    }

    if (options.output) {
      await Bun.write(options.output, JSON.stringify({ results, summary }, null, 2));
      console.info(`\n💾 Results saved to ${options.output}`);
    }
  }

  return { results, summary };
}

async function runProfileBenchmarks(args: string[]) {
  console.info('📊 Running Profile Engine Benchmarks');
  
  const operations: ProfileOperation[] = [];
  let iterations = 50;
  const options: CLIOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--operations':
        if (nextArg) {
          operations.push(...nextArg.split(',').map(o => o.trim()) as ProfileOperation[]);
          i++;
        }
        break;
      case '--iterations':
        if (nextArg) {
          iterations = parseInt(nextArg);
          i++;
        }
        break;
      case '--output':
        if (nextArg) {
          options.output = nextArg;
          i++;
        }
        break;
      case '--json':
        options.json = true;
        break;
      case '--summary':
        options.summary = true;
        break;
    }
  }

  // Defaults
  if (operations.length === 0) {
    operations.push('xgboost_personalize', 'redis_hll_add', 'r2_snapshot');
  }

  console.info(`   Operations: ${operations.join(', ')}`);
  console.info(`   Iterations: ${iterations}\n`);

  // Note: Profile benchmarks require the full dashboard context (config, database, etc.)
  // For CLI usage, we recommend using the API endpoint instead
  console.info('⚠️  Profile benchmarks require dashboard server context');
  console.info('   Starting dashboard server or use API endpoint:');
  console.info('   POST http://localhost:3008/api/profile/benchmark');
  console.info('\n   Alternatively, start the dashboard server:');
  console.info('   bun src/enhanced-dashboard.ts');
  console.info('   Then use the API endpoints.\n');
  
  // For now, return empty results
  // In the future, we could start a minimal server instance or extract the benchmark logic
  const results: any[] = [];
  const summary = {
    totalOperations: 0,
    successfulOps: 0,
    failedOps: 0,
    successRate: 0,
    operations: {},
  };

  if (options.json) {
    const output = JSON.stringify({ results, summary }, null, 2);
    if (options.output) {
      await Bun.write(options.output, output);
      console.info(`💾 Empty results template saved to ${options.output}`);
    } else {
      console.info(output);
    }
  } else {
    console.info('📊 Profile Benchmark Results (empty - use API endpoint)');
    console.info('='.repeat(50));
    console.info(`Total operations: 0`);
    console.info(`Operations requested: ${operations.join(', ')}`);
    console.info(`\n💡 Tip: Use the API endpoint for actual profile benchmarks:`);
    console.info(`   curl -X POST "http://localhost:3008/api/profile/benchmark" \\`);
    console.info(`     -H "Content-Type: application/json" \\`);
    console.info(`     -d '{"operations": [${operations.map(o => `"${o}"`).join(', ')}], "iterations": ${iterations}}'`);
  }

  return { results, summary };
}

async function runCombinedBenchmarks(args: string[]) {
  console.info('🔄 Running Combined Benchmarks\n');
  
  const options: CLIOptions = {};
  let outputFile: string | undefined;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--output':
        if (nextArg) {
          outputFile = nextArg;
          options.output = nextArg;
          i++;
        }
        break;
      case '--json':
        options.json = true;
        break;
    }
  }

  // Run both P2P and Profile benchmarks
  const p2pArgs = ['--gateways', 'venmo,cashapp,paypal', '--operations', 'create,query,switch', '--iterations', '100'];
  const profileArgs = ['--operations', 'xgboost_personalize,redis_hll_add,r2_snapshot', '--iterations', '50'];

  console.info('1️⃣  Running P2P benchmarks...\n');
  const p2pResults = await runP2PBenchmarks(p2pArgs);

  console.info('\n2️⃣  Running Profile benchmarks...\n');
  const profileResults = await runProfileBenchmarks(profileArgs);

  // Combine results
  const combined = {
    timestamp: new Date().toISOString(),
    p2p: p2pResults,
    profile: profileResults,
  };

  if (outputFile) {
    await Bun.write(outputFile, JSON.stringify(combined, null, 2));
    console.info(`\n💾 Combined results saved to ${outputFile}`);
  } else if (options.json) {
    console.info(JSON.stringify(combined, null, 2));
  } else {
    console.info('\n✅ Combined benchmarks complete!');
    console.info(`   P2P operations: ${p2pResults.results.length}`);
    console.info(`   Profile operations: ${profileResults.results.length}`);
  }

  return combined;
}

function printHelp() {
  console.info(`
Dev Dashboard CLI
──────────────────

Usage:
  bun cli.ts <command> [options]

Commands:
  p2p          Run P2P gateway benchmarks
  profile      Run profile engine benchmarks
  combined     Run both P2P and profile benchmarks
  help         Show this help message

P2P Benchmark Options:
  --gateways <list>        Comma-separated gateways (venmo,cashapp,paypal,zelle,wise,revolut)
  --operations <list>      Comma-separated operations (create,query,switch,dry-run,full,webhook)
  --iterations <n>         Number of iterations (default: 100)
  --include-dry-run        Include dry-run operation
  --include-full           Include full lifecycle operation
  --output <file>          Save results to file
  --json                   Output as JSON
  --compare                Show detailed comparison
  --summary                Show summary statistics

Profile Benchmark Options:
  --operations <list>      Comma-separated operations (xgboost_personalize,redis_hll_add,r2_snapshot,etc.)
  --iterations <n>         Number of iterations (default: 50)
  --output <file>          Save results to file
  --json                   Output as JSON
  --summary                Show summary statistics

Combined Benchmark Options:
  --output <file>          Save combined results to file
  --json                   Output as JSON

Examples:
  # Run P2P benchmarks
  bun cli.ts p2p --gateways venmo,cashapp,paypal --operations create,query,switch --iterations 100

  # Run profile benchmarks
  bun cli.ts profile --operations xgboost_personalize,redis_hll_add,r2_snapshot --iterations 50

  # Run combined benchmarks
  bun cli.ts combined --output combined-results.json

  # JSON output
  bun cli.ts p2p --json --output results.json

  # Compare mode
  bun cli.ts p2p --compare --iterations 10
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'p2p':
        await runP2PBenchmarks(commandArgs);
        break;
      case 'profile':
        await runProfileBenchmarks(commandArgs);
        break;
      case 'combined':
        await runCombinedBenchmarks(commandArgs);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.info('\nRun "bun cli.ts help" for usage information.');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
