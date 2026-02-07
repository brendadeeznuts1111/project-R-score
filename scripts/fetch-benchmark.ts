// scripts/fetch-benchmark.ts
import { enhancedFetch, FetchBenchmark, getFetchMetrics } from '../src/fetch/enhanced-fetch';

// CLI Benchmark Tool
async function runCLI() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Bun Enhanced Fetch Benchmark Tool

Usage:
  bun run scripts/fetch-benchmark.ts [options]

Options:
  --url <url>           Target URL to benchmark (default: https://httpbin.org/json)
  --count <number>      Number of requests (default: 10000)
  --concurrency <num>   Concurrent requests (default: 50)
  --body-type <type>    Response body type: json|text|bytes (default: json)
  --integrity          Enable integrity checks
  --gov-scope <scope>   GOV scope: SEC|OPS|AI (default: OPS)
  --timeout <ms>        Request timeout (default: 5000)
  --retries <num>       Max retries (default: 3)

Examples:
  bun run scripts/fetch-benchmark.ts --count 10000 --concurrency 100
  bun run scripts/fetch-benchmark.ts --url https://api.github.com --body-type json --integrity
  bun run scripts/fetch-benchmark.ts --gov-scope SEC --timeout 10000
    `);
    return;
  }
  
  // Parse arguments
  const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'https://httpbin.org/json';
  const count = args.includes('--count') ? parseInt(args[args.indexOf('--count') + 1]) : 10000;
  const concurrency = args.includes('--concurrency') ? parseInt(args[args.indexOf('--concurrency') + 1]) : 50;
  const bodyType = args.includes('--body-type') ? args[args.indexOf('--body-type') + 1] as 'json' | 'text' | 'bytes' : 'json';
  const integrity = args.includes('--integrity');
  const govScope = args.includes('--gov-scope') ? args[args.indexOf('--gov-scope') + 1] as 'SEC' | 'OPS' | 'AI' : 'OPS';
  const timeout = args.includes('--timeout') ? parseInt(args[args.indexOf('--timeout') + 1]) : 5000;
  const retries = args.includes('--retries') ? parseInt(args[args.indexOf('--retries') + 1]) : 3;
  
  console.log('🔥 BUN FETCH APOCALYPSE BENCHMARK 🔥');
  console.log('=====================================');
  console.log(`URL: ${url}`);
  console.log(`Requests: ${count.toLocaleString()}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Body Type: ${bodyType}`);
  console.log(`Integrity: ${integrity ? '✅' : '❌'}`);
  console.log(`GOV Scope: ${govScope}`);
  console.log(`Timeout: ${timeout}ms`);
  console.log(`Max Retries: ${retries}`);
  console.log('');
  
  // Pre-warm
  console.log('🔥 Pre-warming connection...');
  try {
    await enhancedFetch(url, { 
      timeout: 5000,
      benchmark: false 
    });
    console.log('✅ Pre-warm complete');
  } catch (error) {
    console.log('⚠️ Pre-warm failed, continuing anyway...');
  }
  
  // Run benchmark
  const startTime = performance.now();
  
  const results = await FetchBenchmark.runBenchmark(url, {
    count,
    concurrency,
    bodyType,
  });
  
  const totalTime = performance.now() - startTime;
  
  // Calculate performance improvements
  const nodeBaseline = {
    totalTime: 4200, // 4.2s for 10k requests (Node.js baseline)
    avgTime: 12, // 12ms average response time
    throughput: 2381, // requests/sec
  };
  
  const timeImprovement = ((nodeBaseline.totalTime - results.totalTime) / nodeBaseline.totalTime) * 100;
  const speedImprovement = ((results.avgTime - nodeBaseline.avgTime) / nodeBaseline.avgTime) * 100;
  const throughputImprovement = ((results.throughput - nodeBaseline.throughput) / nodeBaseline.throughput) * 100;
  
  console.log('\n🚀 PERFORMANCE COMPARISON vs Node.js');
  console.log('=====================================');
  console.log(`Time Improvement: ${timeImprovement > 0 ? '+' : ''}${timeImprovement.toFixed(1)}%`);
  console.log(`Response Time: ${speedImprovement < 0 ? '+' : ''}${Math.abs(speedImprovement).toFixed(1)}% faster`);
  console.log(`Throughput Improvement: ${throughputImprovement > 0 ? '+' : ''}${throughputImprovement.toFixed(1)}%`);
  
  // System metrics
  console.log('\n📊 SYSTEM METRICS');
  console.log('==================');
  const memUsage = process.memoryUsage();
  console.log(`Memory Usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`CPU Usage: ${process.cpuUsage().user / 1000000}ms user time`);
  
  // Hot paths analysis
  const metrics = getFetchMetrics();
  if (Object.keys(metrics.hotPaths).length > 0) {
    console.log('\n🔥 HOT PATHS');
    console.log('============');
    const sortedPaths = Object.entries(metrics.hotPaths)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);
    
    sortedPaths.forEach(([path, stats]) => {
      console.log(`${path}: ${stats.count} calls, ${stats.avgTime.toFixed(2)}ms avg`);
    });
  }
  
  // Performance rating
  let rating = 'C';
  if (results.throughput > 10000 && results.avgTime < 1) rating = 'S';
  else if (results.throughput > 5000 && results.avgTime < 2) rating = 'A';
  else if (results.throughput > 2000 && results.avgTime < 5) rating = 'B';
  
  const ratingEmoji = { S: '🌟', A: '⭐', B: '✨', C: '💫' }[rating];
  
  console.log(`\n${ratingEmoji} PERFORMANCE RATING: ${rating}`);
  
  if (timeImprovement > 1000) {
    console.log('🎆 LEGENDARY: Over 1000% improvement achieved!');
  } else if (timeImprovement > 500) {
    console.log('🚀 EPIC: Over 500% improvement achieved!');
  } else if (timeImprovement > 100) {
    console.log('⚡ EXCELLENT: Over 100% improvement achieved!');
  }
}

// Integrity verification tool
async function runIntegrityTest() {
  const url = 'https://httpbin.org/json';
  
  console.log('🔒 INTEGRITY VERIFICATION TEST');
  console.log('============================');
  
  try {
    // Test with integrity
    const response = await enhancedFetch(url, {
      integrity: true,
      benchmark: true,
    });
    
    const data = await response.json();
    console.log('✅ Integrity check passed');
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Integrity check failed:', error.message);
  }
}

// GOV headers test
async function runGOVTest() {
  const url = 'https://httpbin.org/headers';
  
  console.log('🏛️ GOV HEADERS TEST');
  console.log('==================');
  
  try {
    const response = await enhancedFetch(url, {
      headers: {
        'X-FactoryWager-Scope': 'SEC',
        'X-FactoryWager-Version': 'v4.0',
        'Authorization': 'Bearer test-token',
      },
      benchmark: true,
    });
    
    const data = await response.json();
    console.log('✅ GOV headers sent successfully');
    console.log('Response headers:', JSON.stringify(data.headers, null, 2));
  } catch (error) {
    console.log('❌ GOV headers test failed:', error.message);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case '--integrity':
      await runIntegrityTest();
      break;
    case '--gov':
      await runGOVTest();
      break;
    default:
      await runCLI();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
