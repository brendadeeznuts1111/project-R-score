// scripts/endpoint-optimize.ts - Endpoint Optimizer CLI
// Analyze endpoints and generate optimization recommendations

import { endpointOptimizer } from '../src/api/services/endpoint-optimizer';

const args = process.argv.slice(2);

async function analyzeEndpoint(path: string, method: string) {
  console.info(`🔍 Analyzing endpoint: ${method} ${path}...\n`);

  const recommendations = await endpointOptimizer.analyzeEndpoint(path, method);

  if (recommendations.length === 0) {
    console.info('✅ No optimizations needed - endpoint is performing well!');
    return;
  }

  console.info(`📊 Found ${recommendations.length} optimization recommendations:\n`);

  recommendations.forEach((rec, index) => {
    const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.info(`${index + 1}. ${icon} [${rec.priority.toUpperCase()}] ${rec.type.toUpperCase()}`);
    console.info(`   Impact: ${rec.impact}`);
    console.info(`   Improvement: ${rec.estimatedImprovement}`);
    console.info(`   Implementation: ${rec.implementation}\n`);
  });
}

async function analyzeAll() {
  console.info('🔍 Analyzing all endpoints from bun.yaml...\n');

  const allRecommendations = await endpointOptimizer.analyzeAllEndpoints();

  if (allRecommendations.size === 0) {
    console.info('✅ No optimizations needed - all endpoints are performing well!');
    return;
  }

  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;

  for (const [routeId, recommendations] of allRecommendations) {
    const high = recommendations.filter(r => r.priority === 'high').length;
    const medium = recommendations.filter(r => r.priority === 'medium').length;
    const low = recommendations.filter(r => r.priority === 'low').length;

    totalHigh += high;
    totalMedium += medium;
    totalLow += low;

    console.info(`\n📍 ${routeId}:`);
    console.info(`   High: ${high}, Medium: ${medium}, Low: ${low}`);
  }

  console.info(`\n📊 Summary:`);
  console.info(`   Total Endpoints Analyzed: ${allRecommendations.size}`);
  console.info(`   High Priority: ${totalHigh}`);
  console.info(`   Medium Priority: ${totalMedium}`);
  console.info(`   Low Priority: ${totalLow}`);
}

async function generateReport() {
  console.info('📝 Generating optimization report...\n');

  const report = await endpointOptimizer.generateReport();
  const reportPath = `docs/endpoint-optimization-report.md`;
  
  await Bun.write(reportPath, report);
  
  console.info(`✅ Report generated: ${reportPath}`);
}

// Main CLI handler
async function main() {
  const path = args.find(arg => !arg.startsWith('--'));
  const method = args.find(arg => arg.startsWith('--method='))?.split('=')[1] || 'GET';
  const all = args.includes('--all');
  const report = args.includes('--report');

  try {
    if (report) {
      await generateReport();
    } else if (all) {
      await analyzeAll();
    } else if (path) {
      await analyzeEndpoint(path, method);
    } else {
      console.error('❌ Error: Please provide a path or use --all');
      console.error('Usage:');
      console.error('  bun run endpoint:optimize <path> [--method=GET]');
      console.error('  bun run endpoint:optimize --all');
      console.error('  bun run endpoint:optimize --report');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

