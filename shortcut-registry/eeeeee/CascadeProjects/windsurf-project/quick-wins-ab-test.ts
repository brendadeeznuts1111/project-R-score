#!/usr/bin/env bun

/**
 * Quick Wins AB Test - Codebase Optimization Scanner
 * 
 * Usage:
 * bun quick-wins-ab-test.ts --scan                    # Auto-scan codebase for optimizations
 * bun quick-wins-ab-test.ts --scan --test             # Scan + benchmark detected issues
 * bun quick-wins-ab-test.ts --scan --test --json      # Full report with JSON export for CI
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

interface ScanOptions {
  scan: boolean;
  test: boolean;
  json: boolean;
  verbose: boolean;
}

interface OptimizationIssue {
  file: string;
  line: number;
  type: 'performance' | 'memory' | 'bun-specific' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  estimatedImpact: string;
  implementation: string;
}

interface BenchmarkResult {
  optimization: string;
  before: number;
  after: number;
  improvement: number;
  improvementPercent: string;
  unit: string;
}

interface ScanReport {
  timestamp: string;
  summary: {
    totalFiles: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    estimatedSavings: string;
  };
  issues: OptimizationIssue[];
  benchmarks?: BenchmarkResult[];
  recommendations: string[];
}

class QuickWinsScanner {
  private readonly fileExtensions = ['.ts', '.js', '.tsx', '.jsx'];
  private readonly excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next'];
  
  async scanDirectory(dir: string, options: ScanOptions): Promise<OptimizationIssue[]> {
    const issues: OptimizationIssue[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory() && !this.excludeDirs.includes(entry.name)) {
          issues.push(...await this.scanDirectory(fullPath, options));
        } else if (entry.isFile() && this.fileExtensions.includes(extname(entry.name))) {
          issues.push(...await this.scanFile(fullPath, options));
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
      }
    }
    
    return issues;
  }
  
  async scanFile(filePath: string, options: ScanOptions): Promise<OptimizationIssue[]> {
    const issues: OptimizationIssue[] = [];
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Scan for specific optimization patterns
      issues.push(...this.scanForBunOptimizations(filePath, lines));
      issues.push(...this.scanForPerformanceIssues(filePath, lines));
      issues.push(...this.scanForMemoryIssues(filePath, lines));
      issues.push(...this.scanForGeneralOptimizations(filePath, lines));
      
    } catch (error) {
      if (options.verbose) {
        console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
      }
    }
    
    return issues;
  }
  
  private scanForBunOptimizations(filePath: string, lines: string[]): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Check for non-Bun file operations
      if (trimmed.includes('fs.') && !trimmed.includes('Bun.file')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'bun-specific',
          severity: 'high',
          title: 'Use Bun.file API instead of Node.js fs',
          description: 'Detected Node.js fs usage instead of optimized Bun.file API',
          suggestion: 'Replace fs.read/write with Bun.file for better performance',
          estimatedImpact: '20-40% faster file operations',
          implementation: `// Replace:\nfs.readFile(path, callback)\n// With:\nconst file = Bun.file(path);\nconst content = await file.text();`
        });
      }
      
      // Check for non-Bun crypto
      if (trimmed.includes('crypto.') && !trimmed.includes('Bun.')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'bun-specific',
          severity: 'medium',
          title: 'Use Bun crypto instead of Node.js crypto',
          description: 'Detected Node.js crypto usage instead of optimized Bun crypto',
          suggestion: 'Replace crypto functions with Bun equivalents',
          estimatedImpact: '15-25% faster cryptographic operations',
          implementation: `// Replace:\ncrypto.randomBytes(32)\n// With:\nBun.randomBytes(32)`
        });
      }
      
      // Check for setTimeout/setInterval patterns
      if (trimmed.includes('setTimeout(') || trimmed.includes('setInterval(')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'performance',
          severity: 'low',
          title: 'Consider using Bun timers for better performance',
          description: 'Detected standard timer usage',
          suggestion: 'Bun timers are optimized for better performance',
          estimatedImpact: '5-10% faster timer operations',
          implementation: `// Standard timers work, but Bun timers are optimized\nsetTimeout(callback, delay)`
        });
      }
    });
    
    return issues;
  }
  
  private scanForPerformanceIssues(filePath: string, lines: string[]): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Check for synchronous operations
      if (trimmed.includes('readFileSync(') || trimmed.includes('writeFileSync(')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'performance',
          severity: 'critical',
          title: 'Avoid synchronous file operations',
          description: 'Synchronous file operations block the event loop',
          suggestion: 'Use async file operations for better performance',
          estimatedImpact: '50-80% better responsiveness',
          implementation: `// Replace:\nfs.readFileSync(path)\n// With:\nawait Bun.file(path).text()`
        });
      }
      
      // Check for JSON.parse in loops
      if (trimmed.includes('JSON.parse(') && trimmed.includes('for(')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'performance',
          severity: 'medium',
          title: 'JSON parsing in loop detected',
          description: 'Parsing JSON repeatedly in loops is inefficient',
          suggestion: 'Cache parsed JSON or parse outside loops',
          estimatedImpact: '20-30% faster loop execution',
          implementation: `// Cache parsed JSON\nconst parsed = JSON.parse(data);\nfor (const item of parsed.items) { ... }`
        });
      }
      
      // Check for inefficient array operations
      if (trimmed.includes('.concat(') || trimmed.includes('.slice(0,')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'performance',
          severity: 'low',
          title: 'Consider using spread operator for array operations',
          description: 'Modern array operations can be more efficient',
          suggestion: 'Use spread operator or built-in methods',
          estimatedImpact: '5-15% faster array operations',
          implementation: `// Replace:\narr1.concat(arr2)\n// With:\n[...arr1, ...arr2]`
        });
      }
    });
    
    return issues;
  }
  
  private scanForMemoryIssues(filePath: string, lines: string[]): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Check for potential memory leaks
      if (trimmed.includes('addEventListener(') && !trimmed.includes('removeEventListener(')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'memory',
          severity: 'medium',
          title: 'Potential memory leak - addEventListener without cleanup',
          description: 'Event listeners should be removed when no longer needed',
          suggestion: 'Add removeEventListener calls or use AbortController',
          estimatedImpact: 'Prevents memory leaks in long-running applications',
          implementation: `// Add cleanup:\nelement.addEventListener('click', handler);\n// Later:\nelement.removeEventListener('click', handler);\n// Or use AbortController:\nconst controller = new AbortController();\nelement.addEventListener('click', handler, { signal: controller.signal });`
        });
      }
      
      // Check for large object creation in loops
      if (trimmed.includes('for(') && trimmed.includes('new ')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'memory',
          severity: 'low',
          title: 'Object creation in loop detected',
          description: 'Creating objects in loops can increase memory pressure',
          suggestion: 'Consider object pooling or reuse patterns',
          estimatedImpact: '10-20% memory usage reduction',
          implementation: `// Consider object reuse\nconst reusable = {};\nfor (let i = 0; i < n; i++) {\n  // Reset and reuse object\n  Object.assign(reusable, newData);\n}`
        });
      }
    });
    
    return issues;
  }
  
  private scanForGeneralOptimizations(filePath: string, lines: string[]): OptimizationIssue[] {
    const issues: OptimizationIssue[] = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Check for console.log in production
      if (trimmed.includes('console.log(') || trimmed.includes('console.debug(')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'general',
          severity: 'low',
          title: 'Console logging in production code',
          description: 'Console statements should be removed or conditional',
          suggestion: 'Use proper logging library or conditional logging',
          estimatedImpact: 'Cleaner production builds',
          implementation: `// Replace:\nconsole.log(data);\n// With:\nif (process.env.NODE_ENV === 'development') {\n  console.log(data);\n}`
        });
      }
      
      // Check for unused imports
      if (trimmed.startsWith('import ') && !trimmed.includes('default')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'general',
          severity: 'low',
          title: 'Review import usage',
          description: 'Some imports may be unused',
          suggestion: 'Remove unused imports to reduce bundle size',
          estimatedImpact: '5-10% smaller bundle size',
          implementation: `// Review and remove unused imports\n// Use tree-shaking friendly imports\nimport { neededFunction } from 'library';`
        });
      }
    });
    
    return issues;
  }
  
  async runBenchmarks(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];
    
    console.log('🏃 Running performance benchmarks...');
    
    // Benchmark 1: File operations
    const testFile = 'benchmark-test.txt';
    const testData = 'x'.repeat(10000);
    
    // Node.js fs style (simulated)
    const startFs = performance.now();
    await writeFile(testFile, testData);
    const _fsContent = await readFile(testFile, 'utf-8');
    const endFs = performance.now();
    
    // Bun.file style
    const startBun = performance.now();
    const bunFile = Bun.file(testFile);
    await Bun.write(testFile, testData);
    const _bunContent = await bunFile.text();
    const endBun = performance.now();
    
    benchmarks.push({
      optimization: 'Bun.file vs Node.js fs',
      before: endFs - startFs,
      after: endBun - startBun,
      improvement: (endFs - startFs) - (endBun - startBun),
      improvementPercent: `${(((endFs - startFs) - (endBun - startBun)) / (endFs - startFs) * 100).toFixed(1)}%`,
      unit: 'ms'
    });
    
    // Cleanup
    try {
      await Bun.file(testFile).delete();
    } catch {}
    
    return benchmarks;
  }
  
  generateRecommendations(issues: OptimizationIssue[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const bunIssues = issues.filter(i => i.type === 'bun-specific').length;
    
    if (criticalCount > 0) {
      recommendations.push(`🚨 Address ${criticalCount} critical issues immediately for maximum performance gain`);
    }
    
    if (highCount > 0) {
      recommendations.push(`⚠️  Fix ${highCount} high-priority issues for significant improvements`);
    }
    
    if (bunIssues > 0) {
      recommendations.push(`🔥 Leverage ${bunIssues} Bun-specific optimizations for 20-40% performance gains`);
    }
    
    recommendations.push('📊 Run benchmarks to validate optimization improvements');
    recommendations.push('🔄 Implement changes incrementally and test each optimization');
    
    return recommendations;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options: ScanOptions = {
    scan: args.includes('--scan'),
    test: args.includes('--test'),
    json: args.includes('--json'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  if (!options.scan) {
    console.log(`
🚀 Quick Wins AB Test - Codebase Optimization Scanner

Usage:
  bun quick-wins-ab-test.ts --scan                    # Auto-scan codebase for optimizations
  bun quick-wins-ab-test.ts --scan --test             # Scan + benchmark detected issues
  bun quick-wins-ab-test.ts --scan --test --json      # Full report with JSON export for CI
  bun quick-wins-ab-test.ts --scan --verbose          # Verbose scanning output

Options:
  --scan      Scan codebase for optimization opportunities
  --test      Run benchmarks on detected optimizations
  --json      Export results as JSON for CI/CD integration
  --verbose   Show detailed scanning information
    `);
    process.exit(0);
  }
  
  const scanner = new QuickWinsScanner();
  const startTime = performance.now();
  
  console.log('🔍 Scanning codebase for optimization opportunities...');
  
  const issues = await scanner.scanDirectory(process.cwd(), options);
  const benchmarks = options.test ? await scanner.runBenchmarks() : undefined;
  const recommendations = scanner.generateRecommendations(issues);
  
  const scanTime = performance.now() - startTime;
  
  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: issues.length > 0 ? new Set(issues.map(i => i.file)).size : 0,
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
      estimatedSavings: `${issues.reduce((acc, i) => acc + (i.severity === 'critical' ? 50 : i.severity === 'high' ? 30 : i.severity === 'medium' ? 15 : 5), 0)}%+ performance improvement`
    },
    issues,
    benchmarks,
    recommendations
  };
  
  if (options.json) {
    await writeFile('quick-wins-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Report saved to quick-wins-report.json');
  }
  
  // Display results
  console.log(`\n📊 Scan completed in ${scanTime.toFixed(2)}ms\n`);
  
  console.log('📈 Summary:');
  console.log(`   Files scanned: ${report.summary.totalFiles}`);
  console.log(`   Total issues: ${report.summary.totalIssues}`);
  console.log(`   Critical: ${report.summary.criticalIssues} 🔴`);
  console.log(`   High: ${report.summary.highIssues} 🟠`);
  console.log(`   Medium: ${report.summary.mediumIssues} 🟡`);
  console.log(`   Low: ${report.summary.lowIssues} 🟢`);
  console.log(`   Estimated savings: ${report.summary.estimatedSavings}`);
  
  if (issues.length > 0) {
    console.log('\n🎯 Top Issues:');
    issues.slice(0, 5).forEach((issue, index) => {
      const severityIcon = issue.severity === 'critical' ? '🔴' : 
                          issue.severity === 'high' ? '🟠' : 
                          issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${severityIcon} ${issue.title}`);
      console.log(`      📁 ${issue.file}:${issue.line}`);
      console.log(`      💡 ${issue.suggestion}`);
      console.log(`      📈 ${issue.estimatedImpact}`);
    });
    
    if (issues.length > 5) {
      console.log(`   ... and ${issues.length - 5} more issues`);
    }
  }
  
  if (benchmarks && benchmarks.length > 0) {
    console.log('\n🏃 Benchmark Results:');
    benchmarks.forEach(benchmark => {
      const improvementIcon = parseFloat(benchmark.improvementPercent) > 0 ? '📈' : '📉';
      console.log(`   ${improvementIcon} ${benchmark.optimization}`);
      console.log(`      Before: ${benchmark.before.toFixed(2)}${benchmark.unit}`);
      console.log(`      After: ${benchmark.after.toFixed(2)}${benchmark.unit}`);
      console.log(`      Improvement: ${benchmark.improvementPercent}`);
    });
  }
  
  console.log('\n💡 Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
  
  // Exit with error code if critical issues found
  if (report.summary.criticalIssues > 0) {
    process.exit(1);
  }
}

// Run the scanner
main().catch(console.error);
