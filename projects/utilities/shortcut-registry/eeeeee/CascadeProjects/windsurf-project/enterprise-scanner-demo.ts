#!/usr/bin/env bun

/**
 * Enterprise Scanner Demo - Advanced Code Annotation Examples
 * 
 * Demonstrates the enterprise scanner functionality with various code patterns
 * and annotation rules.
 */

import type { AnnotationRule } from './enterprise-scanner';
import { EnterpriseScanner } from './enterprise-scanner';

// Demo source code with various issues to annotate
const demoSourceCode = `
import { readFileSync, writeFileSync } from 'fs';
import * as crypto from 'crypto';

class FileLoader {
  private configPath: string;
  
  constructor(configPath: string) {
    this.configPath = configPath;
  }
  
  readConfig(): string {
    // Sync IO issue - should be async
    const config = readFileSync(this.configPath, 'utf-8');
    return config;
  }
  
  saveConfig(data: string): void {
    // Sync IO issue - should be async
    writeFileSync(this.configPath, data);
  }
  
  processData(input: string): string {
    // Security risk - eval usage
    const result = eval(input);
    return result;
  }
  
  generateHash(data: string): string {
    // Non-Bun crypto usage
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  legacyArrayOperation(arr1: any[], arr2: any[]): any[] {
    // Code smell - outdated array operation
    return arr1.concat(arr2);
  }
  
  riskyOperation(query: string): any {
    try {
      // SQL injection risk
      const result = database.exec(query);
      console.info('Operation completed'); // Console log in production
      return result;
    } catch (e) {
      // Poor error handling - no type assertion
      console.info('Error occurred: ' + e.message);
      return null;
    }
  }
}

// Global scope issues
const globalConfig = readFileSync('./global.json', 'utf-8');

function legacyFunction() {
  var legacy = 'using var keyword'; // Code smell
  return legacy;
}

// Modern Bun-native alternatives would be:
// const file = Bun.file(path);
// const content = await file.text();
// await Bun.write(path, data);
// const hash = await Bun.crypto.hasher('sha256').update(data).digest('hex');
`;

async function runDemo() {
  console.info('🔍 Enterprise Scanner Demo');
  console.info('═════════════════════════════════\n');
  
  const scanner = new EnterpriseScanner();
  
  // Custom annotation rules for demo
  const customRules: AnnotationRule[] = [
    {
      domain: 'PERF',
      scope: 'GLOBAL',
      type: 'SYNC_IO',
      line: 42,
      meta: { fix: 'Bun.file().text()', issueId: 'PW001', severity: 'critical' },
      className: 'FileLoader',
      functionName: 'readConfig',
      refs: ['performance-docs']
    },
    {
      domain: 'SEC',
      scope: 'FUNCTION',
      type: 'SEC_RISK',
      line: 0,
      meta: { fix: 'Replace eval with safe alternatives', issueId: 'SEC003', severity: 'critical' },
      className: 'FileLoader',
      functionName: 'processData',
      refs: ['security-guide', 'eval-alternatives']
    },
    {
      domain: 'BUN',
      scope: 'FUNCTION',
      type: 'BUN_NATIVE',
      line: 0,
      meta: { fix: 'Use Bun.crypto.hasher()', issueId: 'BUN003', severity: 'medium' },
      className: 'FileLoader',
      functionName: 'generateHash',
      refs: ['bun-crypto', 'performance-guide']
    }
  ];
  
  // Perform annotation
  console.info('📝 Annotating demo code...\n');
  const result = scanner.suggestAnnotations(demoSourceCode, customRules);
  
  // Display annotated code
  console.info('🎯 Annotated Code:');
  console.info('─────────────────');
  console.info(result.annotatedCode);
  
  // Display summary
  console.info('\n📊 Annotation Summary:');
  console.info('────────────────────');
  console.info(`Total Annotations: ${result.summary.totalAnnotations}`);
  console.info('By Domain:', Object.entries(result.summary.byDomain).map(([d, c]) => `${d}: ${c}`).join(', '));
  console.info('By Severity:', Object.entries(result.summary.bySeverity).map(([s, c]) => `${s}: ${c}`).join(', '));
  
  // Display detailed report
  console.info('\n📋 Detailed Report:');
  console.info('──────────────────');
  console.info(scanner.generateReport(result));
  
  // Export JSON example
  console.info('📄 JSON Export (first 500 chars):');
  console.info('─────────────────────────────────');
  const jsonExport = scanner.exportJSON(result);
  console.info(jsonExport.substring(0, 500) + '...');
  
  // Demonstrate CLI-like usage
  console.info('\n🖥️  CLI Usage Examples:');
  console.info('──────────────────────');
  console.info('# Basic annotation:');
  console.info('bun enterprise-scanner.ts src/app.ts');
  console.info('');
  console.info('# JSON output with high severity threshold:');
  console.info('bun enterprise-scanner.ts src/app.ts --format json --severity high');
  console.info('');
  console.info('# Generate detailed report:');
  console.info('bun enterprise-scanner.ts src/app.ts --report');
  console.info('');
  console.info('# Pipe from stdin:');
  console.info('cat src/app.ts | bun enterprise-scanner.ts --format summary');
  
  console.info('\n✅ Demo completed successfully!');
}

// Performance comparison demo
async function performanceDemo() {
  console.info('\n⚡ Performance Comparison Demo');
  console.info('═══════════════════════════════════\n');
  
  const largeSourceCode = demoSourceCode.repeat(100); // Simulate larger codebase
  const scanner = new EnterpriseScanner();
  
  const iterations = 1000;
  console.info(`Running ${iterations} iterations on ${largeSourceCode.length} character source...`);
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    scanner.suggestAnnotations(largeSourceCode);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.info(`⏱️  Performance Results:`);
  console.info(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.info(`   Average per scan: ${avgTime.toFixed(3)}ms`);
  console.info(`   Scans per second: ${(1000 / avgTime).toFixed(0)}`);
  console.info(`   Throughput: ${(largeSourceCode.length / avgTime / 1000).toFixed(2)} KB/s`);
}

// Integration demo with existing codebase
async function codebaseDemo() {
  console.info('\n🏗️  Codebase Integration Demo');
  console.info('═════════════════════════════════\n');
  
  const scanner = new EnterpriseScanner();
  
  // Example: Scan a real file from the project
  const testFile = './quick-wins-ab-test.ts';
  
  try {
    const sourceCode = await Bun.file(testFile).text();
    console.info(`📁 Scanning ${testFile} (${sourceCode.length} characters)...`);
    
    const result = scanner.suggestAnnotations(sourceCode);
    
    console.info(`🎯 Found ${result.summary.totalAnnotations} annotations`);
    console.info('Top issues:');
    
    result.appliedRules.slice(0, 5).forEach((rule, index) => {
      const severity = rule.meta.severity || 'medium';
      const icon = severity === 'critical' ? '🔴' : 
                  severity === 'high' ? '🟠' : 
                  severity === 'medium' ? '🟡' : '🟢';
      
      console.info(`   ${index + 1}. ${icon} Line ${rule.line}: ${rule.meta.fix} (${rule.meta.issueId})`);
    });
    
  } catch (error) {
    console.info(`⚠️  Could not scan ${testFile}: ${(error as Error).message}`);
  }
}

// Main demo execution
async function main() {
  try {
    await runDemo();
    await performanceDemo();
    await codebaseDemo();
    
    console.info('\n🎉 All demos completed!');
    console.info('\n💡 Next Steps:');
    console.info('   1. Integrate with your CI/CD pipeline');
    console.info('   2. Add custom rules for your specific codebase');
    console.info('   3. Configure severity thresholds for your team');
    console.info('   4. Export reports for code review processes');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo
if (import.meta.main) {
  main();
}
