#!/usr/bin/env bun
// Wiki-Profiler - v3.5 JuniorRunner Fusion for Wiki Output Analysis
// Usage: bun run wiki-profiler wiki-output.md → Wiki profiling table + JSON!

import { juniorProfile, ExtendedFeatureCounts } from './junior-runner';
import { join, resolve } from 'path';

interface WikiProfileResult {
  wiki: {
    urls: number;
    cliPages: number;
    validation: string;
    quickRef: number;
  };
  baseProfile: any; // LeadSpecProfile
  performance: {
    scanTime: number;
    parseTime: number;
    throughput: number;
  };
  metadata: {
    timestamp: string;
    wikiFile: string;
    gfmScore: number;
    totalFeatures: number;
  };
}

/**
 * Wiki-specific profiling with JuniorRunner integration
 * Analyzes wiki output files for structure, validation, and performance
 */
async function wikiProfile(wikiFile: string): Promise<WikiProfileResult> {
  console.log('\x1b[1;34m📚 Wiki Profiler: Analyzing wiki output\x1b[0m');
  console.log(`   File: ${wikiFile}`);
  
  // Step 1: Load wiki content
  const wikiPath = resolve(wikiFile);
  const wikiFileObj = Bun.file(wikiPath);
  
  if (!await wikiFileObj.exists()) {
    throw new Error(`Wiki file not found: ${wikiPath}`);
  }
  
  const wikiMd = await wikiFileObj.text();
  const startTime = performance.now();
  
  // Step 2: Run JuniorRunner analysis
  const baseProfile = await juniorProfile(wikiPath, { lspSafe: true });
  const analysisTime = performance.now() - startTime;
  
  // Step 3: Wiki-specific metrics extraction
  const wikiMetrics = {
    // Step 1: docsURLBuilder detection
    urls: wikiMd.match(/https:\/\/bun\.sh\/[^"\s]+/g)?.length || 0,
    
    // Step 2: DOC_PATTERNS related docs
    relatedDocs: wikiMd.match(/\[Related Documentation:\]/g)?.length || 0,
    
    // Step 3: CLI Pages/Tables detection
    cliTables: wikiMd.match(/\| Command \| Documentation \|/g)?.length || 0,
    cliExamples: wikiMd.match(/```bash/g)?.length || 0,
    
    // Step 4: URL Validation detection
    validationSections: wikiMd.match(/## ✅ URL Validation Report/g)?.length || 0,
    passRates: wikiMd.match(/\| Pass Rate \| \d+%/g)?.length || 0,
    
    // Step 5: QuickRef detection
    quickRefSections: wikiMd.match(/## 🔖 Quick Reference/g)?.length || 0,
    quickRefLinks: wikiMd.match(/\[.*\]\(https:\/\/.*\)/g)?.length || 0,
    
    // Additional wiki features
    tocSections: wikiMd.match(/## 📋 Table of Contents/g)?.length || 0,
    searchSections: wikiMd.match(/## 🔍 Search/g)?.length || 0,
    analyticsSections: wikiMd.match(/## 📈 Analytics/g)?.length || 0,
  };
  
  // Step 4: Calculate CLI pages (try to load from wiki.json if exists)
  let cliPages = 0;
  try {
    const wikiJsonPath = wikiPath.replace('.md', '.json');
    const wikiJsonFile = Bun.file(wikiJsonPath);
    if (await wikiJsonFile.exists()) {
      const wikiJson = await wikiJsonFile.json();
      cliPages = wikiJson.cliPages?.length || 0;
    }
  } catch (e) {
    // Fallback: count CLI sections in markdown
    cliPages = wikiMd.match(/### [A-Z_]+\n\n\| Command/g)?.length || 0;
  }
  
  // Step 5: Validation status calculation
  const validationPass = wikiMd.match(/\| \*?\*?Valid\*?\*? \| \d+ \|/g)?.[0];
  const validationTotal = wikiMd.match(/\| \*?\*?Total URLs\*?\*? \| \d+ \|/g)?.[0];
  let validationStatus = 'UNKNOWN';
  
  if (validationPass && validationTotal) {
    const passCount = parseInt(validationPass.match(/\d+/)?.[0] || '0');
    const totalCount = parseInt(validationTotal.match(/\d+/)?.[0] || '0');
    const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;
    validationStatus = passRate >= 95 ? 'PASS' : passRate >= 80 ? 'WARN' : 'FAIL';
  }
  
  // Step 6: QuickRef TOC calculation
  const quickRefTOC = wikiMd.match(/- \[🔖 Quick Reference\]/g)?.length || 0;
  
  // Step 7: Build result object
  const result: WikiProfileResult = {
    wiki: {
      urls: wikiMetrics.urls,
      cliPages,
      validation: validationStatus,
      quickRef: quickRefTOC,
    },
    baseProfile,
    performance: {
      scanTime: analysisTime,
      parseTime: baseProfile.markdown.parseTimeMs,
      throughput: baseProfile.core.throughput,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      wikiFile,
      gfmScore: (baseProfile.markdown.featureCounts as ExtendedFeatureCounts).gfmScore,
      totalFeatures: Object.values(baseProfile.markdown.featureCounts).reduce((sum, v) => 
        sum + (typeof v === 'object' ? (v as any).ordered + (v as any).unordered : v), 0
      ),
    }
  };
  
  return result;
}

/**
 * Display wiki profiling results in a formatted table
 */
function displayWikiDashboard(result: WikiProfileResult): void {
  console.log('\n\x1b[1;32m📊 Wiki Profiler Dashboard\x1b[0m');
  console.log('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
  
  // Wiki metrics table
  console.log('\n\x1b[1;33m🔗 Wiki Integration Metrics:\x1b[0m');
  console.table({
    'docsURLBuilder URLs': result.wiki.urls,
    'CLI Pages': result.wiki.cliPages,
    'URL Validation': result.wiki.validation,
    'QuickRef TOC': result.wiki.quickRef,
    'GFM Score': `${result.metadata.gfmScore}%`,
    'Total Features': result.metadata.totalFeatures,
  });
  
  // Performance metrics
  console.log('\n\x1b[1;33m⚡ Performance Metrics:\x1b[0m');
  console.table({
    'Scan Time': `${result.performance.scanTime.toFixed(2)}ms`,
    'Parse Time': `${result.performance.parseTime.toFixed(2)}ms`,
    'Throughput': `${Math.round(result.performance.throughput).toLocaleString()} chars/s`,
  });
  
  // Validation summary
  const validationColor = result.wiki.validation === 'PASS' ? '32' : 
                         result.wiki.validation === 'WARN' ? '33' : '31';
  console.log(`\n\x1b[1;${validationColor}m✅ Validation Status: ${result.wiki.validation}\x1b[0m`);
  
  // Integration checklist
  console.log('\n\x1b[1;35m🔧 Integration Checklist:\x1b[0m');
  const checks = [
    { name: 'docsURLBuilder', status: result.wiki.urls > 0 ? '✅' : '❌', count: result.wiki.urls },
    { name: 'CLI Reference', status: result.wiki.cliPages > 0 ? '✅' : '❌', count: result.wiki.cliPages },
    { name: 'URL Validation', status: result.wiki.validation !== 'UNKNOWN' ? '✅' : '❌', status: result.wiki.validation },
    { name: 'QuickRef TOC', status: result.wiki.quickRef > 0 ? '✅' : '❌', count: result.wiki.quickRef },
  ];
  
  checks.forEach(check => {
    const statusColor = check.status === '✅' ? '32' : '31';
    console.log(`  ${check.status} \x1b[1;${statusColor}m${check.name}\x1b[0m: ${check.count || check.status}`);
  });
  
  // Benchmark comparison
  console.log('\n\x1b[1;36m📈 Benchmark Comparison:\x1b[0m');
  const expectedThroughput = 95000; // 95K chars/s expected
  const actualThroughput = result.performance.throughput;
  const performanceGrade = actualThroughput >= expectedThroughput ? 'A+' : 
                          actualThroughput >= expectedThroughput * 0.9 ? 'A' :
                          actualThroughput >= expectedThroughput * 0.8 ? 'B' : 'C';
  
  console.log(`  Expected Throughput: ${expectedThroughput.toLocaleString()} chars/s`);
  console.log(`  Actual Throughput: ${Math.round(actualThroughput).toLocaleString()} chars/s`);
  console.log(`  Performance Grade: \x1b[1;${performanceGrade.startsWith('A') ? '32' : performanceGrade === 'B' ? '33' : '31'}m${performanceGrade}\x1b[0m`);
  
  console.log('\n\x1b[1;32m🎉 Wiki profiling complete!\x1b[0m');
}

/**
 * Export results for further analysis
 */
async function exportWikiProfile(result: WikiProfileResult): Promise<string> {
  const filename = `wiki-profile-${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(result, null, 2));
  console.log(`\x1b[1;33m📁 Exported wiki profile: ${filename}\x1b[0m`);
  return filename;
}

/**
 * Main CLI execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\x1b[1;31m❌ Usage: wiki-profiler <wiki-file.md>\x1b[0m');
    console.log('\x1b[1;36mExample: wiki-profiler wiki-output.md\x1b[0m');
    console.log('\x1b[1;36mExample: wiki-profiler internal-wiki/bun-utilities-wiki.md\x1b[0m');
    process.exit(1);
  }
  
  const wikiFile = args[0];
  
  try {
    const result = await wikiProfile(wikiFile);
    displayWikiDashboard(result);
    await exportWikiProfile(result);
    
    // Exit with appropriate code based on validation
    if (result.wiki.validation === 'FAIL') {
      process.exit(1);
    } else if (result.wiki.validation === 'WARN') {
      process.exit(2);
    }
    
  } catch (error) {
    console.error('\x1b[1;31m❌ Wiki Profiler Error:\x1b[0m', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

// Export for use in dashboard and other tools
export { wikiProfile, WikiProfileResult };
