#!/usr/bin/env bun
/**
 * Test Optimizations Script
 * 
 * Re-runs profiles and compares before/after metrics to validate improvements.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = '/Users/nolarose/Projects';
const BEFORE_REPORT = join(ROOT_DIR, 'BOTTLENECK_REPORT.md');
const AFTER_REPORT = join(ROOT_DIR, 'BOTTLENECK_REPORT_AFTER.md');

interface ProjectMetrics {
  project: string;
  functions: number;
  largeObjects: number;
  gcRoots: number;
}

/**
 * Parse metrics from bottleneck report
 */
function parseMetrics(report: string): Map<string, ProjectMetrics> {
  const metrics = new Map<string, ProjectMetrics>();
  
  // Extract project sections
  const projectSections = report.matchAll(/### (\w+[\w-]*)[\s\S]*?Function Objects.*?(\d{1,3}(?:,\d{3})*)[\s\S]*?Large Objects.*?(\d+)[\s\S]*?GC Roots.*?(\d{1,3}(?:,\d{3})*)/g);
  
  for (const match of projectSections) {
    const [, project, functions, largeObjects, gcRoots] = match;
    metrics.set(project, {
      project,
      functions: parseInt(functions.replace(/,/g, ''), 10),
      largeObjects: parseInt(largeObjects, 10),
      gcRoots: parseInt(gcRoots.replace(/,/g, ''), 10),
    });
  }
  
  return metrics;
}

/**
 * Compare before and after metrics
 */
function compareMetrics(
  before: Map<string, ProjectMetrics>,
  after: Map<string, ProjectMetrics>
): void {
  console.log('\n📊 Comparison Results:\n');
  console.log('| Project | Metric | Before | After | Change | Improvement |');
  console.log('|---------|--------|--------|-------|--------|-------------|');
  
  const allProjects = new Set([...before.keys(), ...after.keys()]);
  
  for (const project of allProjects) {
    const beforeMetrics = before.get(project);
    const afterMetrics = after.get(project);
    
    if (!beforeMetrics && afterMetrics) {
      console.log(`| ${project} | - | New project | - | - | - |`);
      continue;
    }
    
    if (!beforeMetrics) continue;
    
    const afterFuncs = afterMetrics?.functions ?? beforeMetrics.functions;
    const afterLarge = afterMetrics?.largeObjects ?? beforeMetrics.largeObjects;
    const afterGC = afterMetrics?.gcRoots ?? beforeMetrics.gcRoots;
    
    // Functions
    const funcChange = afterFuncs - beforeMetrics.functions;
    const funcPct = beforeMetrics.functions > 0 
      ? ((funcChange / beforeMetrics.functions) * 100).toFixed(1)
      : '0.0';
    const funcImprovement = funcChange < 0 ? '✅' : funcChange > 0 ? '❌' : '➖';
    console.log(`| ${project} | Functions | ${beforeMetrics.functions.toLocaleString()} | ${afterFuncs.toLocaleString()} | ${funcChange > 0 ? '+' : ''}${funcChange.toLocaleString()} | ${funcImprovement} ${funcPct}% |`);
    
    // Large Objects
    const largeChange = afterLarge - beforeMetrics.largeObjects;
    const largePct = beforeMetrics.largeObjects > 0
      ? ((largeChange / beforeMetrics.largeObjects) * 100).toFixed(1)
      : '0.0';
    const largeImprovement = largeChange < 0 ? '✅' : largeChange > 0 ? '❌' : '➖';
    console.log(`| ${project} | Large Objects | ${beforeMetrics.largeObjects.toLocaleString()} | ${afterLarge.toLocaleString()} | ${largeChange > 0 ? '+' : ''}${largeChange.toLocaleString()} | ${largeImprovement} ${largePct}% |`);
    
    // GC Roots
    const gcChange = afterGC - beforeMetrics.gcRoots;
    const gcPct = beforeMetrics.gcRoots > 0
      ? ((gcChange / beforeMetrics.gcRoots) * 100).toFixed(1)
      : '0.0';
    const gcImprovement = gcChange < 0 ? '✅' : gcChange > 0 ? '❌' : '➖';
    console.log(`| ${project} | GC Roots | ${beforeMetrics.gcRoots.toLocaleString()} | ${afterGC.toLocaleString()} | ${gcChange > 0 ? '+' : ''}${gcChange.toLocaleString()} | ${gcImprovement} ${gcPct}% |`);
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Reading before/after reports...\n');
  
  if (!existsSync(BEFORE_REPORT)) {
    console.error('❌ Before report not found. Run analyze-bottlenecks.ts first.');
    process.exit(1);
  }
  
  if (!existsSync(AFTER_REPORT)) {
    console.log('⚠️  After report not found. Generating new profiles...\n');
    console.log('💡 Run the following commands:');
    console.log('   1. bun run scripts/generate-all-profiles.ts');
    console.log('   2. bun run scripts/analyze-bottlenecks.ts');
    console.log('   3. mv BOTTLENECK_REPORT.md BOTTLENECK_REPORT_AFTER.md');
    console.log('   4. mv BOTTLENECK_REPORT_BEFORE.md BOTTLENECK_REPORT.md');
    console.log('   5. bun run scripts/test-optimizations.ts\n');
    process.exit(0);
  }
  
  try {
    const beforeReport = readFileSync(BEFORE_REPORT, 'utf-8');
    const afterReport = readFileSync(AFTER_REPORT, 'utf-8');
    
    const beforeMetrics = parseMetrics(beforeReport);
    const afterMetrics = parseMetrics(afterReport);
    
    console.log(`Found ${beforeMetrics.size} projects in before report`);
    console.log(`Found ${afterMetrics.size} projects in after report\n`);
    
    compareMetrics(beforeMetrics, afterMetrics);
    
    // Calculate overall improvements
    let totalFuncBefore = 0;
    let totalFuncAfter = 0;
    let totalLargeBefore = 0;
    let totalLargeAfter = 0;
    let totalGCBefore = 0;
    let totalGCAfter = 0;
    
    for (const [project, metrics] of beforeMetrics.entries()) {
      totalFuncBefore += metrics.functions;
      totalLargeBefore += metrics.largeObjects;
      totalGCBefore += metrics.gcRoots;
      
      const after = afterMetrics.get(project);
      if (after) {
        totalFuncAfter += after.functions;
        totalLargeAfter += after.largeObjects;
        totalGCAfter += after.gcRoots;
      } else {
        totalFuncAfter += metrics.functions;
        totalLargeAfter += metrics.largeObjects;
        totalGCAfter += metrics.gcRoots;
      }
    }
    
    console.log('📈 Overall Summary:');
    console.log(`   Functions: ${totalFuncBefore.toLocaleString()} → ${totalFuncAfter.toLocaleString()} (${totalFuncAfter - totalFuncBefore > 0 ? '+' : ''}${(totalFuncAfter - totalFuncBefore).toLocaleString()})`);
    console.log(`   Large Objects: ${totalLargeBefore.toLocaleString()} → ${totalLargeAfter.toLocaleString()} (${totalLargeAfter - totalLargeBefore > 0 ? '+' : ''}${(totalLargeAfter - totalLargeBefore).toLocaleString()})`);
    console.log(`   GC Roots: ${totalGCBefore.toLocaleString()} → ${totalGCAfter.toLocaleString()} (${totalGCAfter - totalGCBefore > 0 ? '+' : ''}${(totalGCAfter - totalGCBefore).toLocaleString()})`);
    
    const funcImprovement = ((totalFuncBefore - totalFuncAfter) / totalFuncBefore * 100).toFixed(1);
    const largeImprovement = totalLargeBefore > 0 ? ((totalLargeBefore - totalLargeAfter) / totalLargeBefore * 100).toFixed(1) : '0.0';
    const gcImprovement = ((totalGCBefore - totalGCAfter) / totalGCBefore * 100).toFixed(1);
    
    console.log(`\n✅ Improvements:`);
    console.log(`   Functions: ${funcImprovement}% reduction`);
    console.log(`   Large Objects: ${largeImprovement}% reduction`);
    console.log(`   GC Roots: ${gcImprovement}% reduction`);
    
  } catch (error) {
    console.error(`❌ Error comparing reports: ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
