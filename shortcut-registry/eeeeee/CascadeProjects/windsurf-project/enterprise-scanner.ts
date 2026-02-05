#!/usr/bin/env bun

/**
 * Enterprise Scanner - Advanced Code Annotation System
 * 
 * Provides intelligent code annotations for enterprise-level code analysis
 * with support for performance, security, and compliance scanning.
 */

interface AnnotationRule {
  domain: 'PERF' | 'SEC' | 'COMP' | 'QUAL' | 'BUN';
  scope: 'GLOBAL' | 'FUNCTION' | 'CLASS' | 'MODULE';
  type: 'SYNC_IO' | 'SEC_RISK' | 'COMP_VIOLATION' | 'CODE_SMELL' | 'BUN_NATIVE';
  line: number;
  meta: Record<string, unknown>;
  className?: string;
  functionName?: string;
  refs: string[];
}

interface AnnotationResult {
  annotatedCode: string;
  appliedRules: AnnotationRule[];
  summary: {
    totalAnnotations: number;
    byDomain: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

interface ScannerOptions {
  includeBunNative: boolean;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  outputFormat: 'annotated' | 'json' | 'summary';
}

class EnterpriseScanner {
  private readonly defaultRules: AnnotationRule[] = [
    // Performance rules
    {
      domain: 'PERF',
      scope: 'GLOBAL',
      type: 'SYNC_IO',
      line: 0,
      meta: { fix: 'Bun.file().text()', issueId: 'PW001', severity: 'critical' },
      className: '',
      functionName: '',
      refs: ['performance-docs']
    },
    {
      domain: 'PERF',
      scope: 'FUNCTION',
      type: 'SYNC_IO',
      line: 0,
      meta: { fix: 'await Bun.write()', issueId: 'PW002', severity: 'critical' },
      className: '',
      functionName: '',
      refs: ['async-patterns']
    },
    {
      domain: 'PERF',
      scope: 'GLOBAL',
      type: 'CODE_SMELL',
      line: 0,
      meta: { fix: 'Use spread operator', issueId: 'PW003', severity: 'low' },
      className: '',
      functionName: '',
      refs: ['modern-js']
    },
    
    // Security rules
    {
      domain: 'SEC',
      scope: 'FUNCTION',
      type: 'SEC_RISK',
      line: 0,
      meta: { fix: 'Use parameterized queries', issueId: 'SEC001', severity: 'critical' },
      className: '',
      functionName: '',
      refs: ['security-guide']
    },
    {
      domain: 'SEC',
      scope: 'GLOBAL',
      type: 'SEC_RISK',
      line: 0,
      meta: { fix: 'Validate and sanitize input', issueId: 'SEC002', severity: 'high' },
      className: '',
      functionName: '',
      refs: ['input-validation']
    },
    
    // Compliance rules
    {
      domain: 'COMP',
      scope: 'MODULE',
      type: 'COMP_VIOLATION',
      line: 0,
      meta: { fix: 'Add proper error handling', issueId: 'COMP001', severity: 'medium' },
      className: '',
      functionName: '',
      refs: ['compliance-standards']
    },
    
    // Bun-specific rules
    {
      domain: 'BUN',
      scope: 'GLOBAL',
      type: 'BUN_NATIVE',
      line: 0,
      meta: { fix: 'Use Bun.file API', issueId: 'BUN001', severity: 'high' },
      className: '',
      functionName: '',
      refs: ['bun-optimization']
    },
    {
      domain: 'BUN',
      scope: 'FUNCTION',
      type: 'BUN_NATIVE',
      line: 0,
      meta: { fix: 'Use Bun.serve()', issueId: 'BUN002', severity: 'medium' },
      className: '',
      functionName: '',
      refs: ['bun-web-server']
    }
  ];

  suggestAnnotations(sourceCode: string, customRules: AnnotationRule[] = [], options: ScannerOptions = {
    includeBunNative: true,
    severityThreshold: 'low',
    outputFormat: 'annotated'
  }): AnnotationResult {
    const lines = sourceCode.split('\n');
    const appliedRules: AnnotationRule[] = [];
    const allRules = [...this.defaultRules, ...customRules];
    
    const annotatedLines = lines.map((line, index) => {
      const lineNumber = index + 1;
      let annotatedLine = line;
      const lineRules: AnnotationRule[] = [];
      
      // Apply rules based on line content patterns
      allRules.forEach((rule) => {
        if (this.shouldApplyRule(line, rule, lineNumber)) {
          const specificRule = { ...rule, line: lineNumber };
          lineRules.push(specificRule);
          appliedRules.push(specificRule);
        }
      });
      
      // Add annotations to the line
      if (lineRules.length > 0) {
        const annotations = lineRules.map(rule => this.formatAnnotation(rule)).join(' ');
        annotatedLine = `${annotations}${annotatedLine}`;
      }
      
      return annotatedLine;
    });
    
    const summary = this.generateSummary(appliedRules);
    
    return {
      annotatedCode: annotatedLines.join('\n'),
      appliedRules,
      summary
    };
  }
  
  private shouldApplyRule(line: string, rule: AnnotationRule, lineNumber: number): boolean {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return false;
    }
    
    switch (rule.type) {
      case 'SYNC_IO':
        return trimmed.includes('readFileSync(') || 
               trimmed.includes('writeFileSync(') || 
               trimmed.includes('fs.') ||
               trimmed.includes('require("fs")');
               
      case 'SEC_RISK':
        return trimmed.includes('eval(') || 
               trimmed.includes('innerHTML') || 
               trimmed.includes('SQL') ||
               trimmed.includes('exec(');
               
      case 'COMP_VIOLATION':
        return trimmed.includes('catch (e)') && !trimmed.includes('as Error') ||
               trimmed.includes('console.log(') ||
               trimmed.includes('any[');
               
      case 'CODE_SMELL':
        return trimmed.includes('.concat(') || 
               trimmed.includes('.slice(0,') ||
               trimmed.includes('var ');
               
      case 'BUN_NATIVE':
        return (trimmed.includes('fs.') && !trimmed.includes('Bun.')) ||
               (trimmed.includes('http.') && !trimmed.includes('Bun.')) ||
               (trimmed.includes('crypto.') && !trimmed.includes('Bun.'));
               
      default:
        return false;
    }
  }
  
  private formatAnnotation(rule: AnnotationRule): string {
    const metaString = Object.entries(rule.meta)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
    
    const parts: string[] = [
      rule.domain,
      rule.scope,
      rule.type,
      `META:{${metaString}}`
    ];
    
    if (rule.className) parts.push(rule.className);
    if (rule.functionName) parts.push(rule.functionName);
    if (rule.refs.length > 0) parts.push(`#REF:${rule.refs.join(',')}`);
    
    if (rule.domain === 'BUN') parts.push('BUN-NATIVE');
    
    return `[${parts.join('][')}] `;
  }
  
  private generateSummary(appliedRules: AnnotationRule[]): AnnotationResult['summary'] {
    const byDomain: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    appliedRules.forEach(rule => {
      byDomain[rule.domain] = (byDomain[rule.domain] || 0) + 1;
      
      const severity = (rule.meta.severity as string) || 'medium';
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    });
    
    return {
      totalAnnotations: appliedRules.length,
      byDomain,
      bySeverity
    };
  }
  
  // Additional utility methods
  generateReport(annotationResult: AnnotationResult): string {
    const { summary, appliedRules } = annotationResult;
    
    let report = `🔍 Enterprise Scanner Report\n`;
    report += `═════════════════════════════════\n\n`;
    
    report += `📊 Summary:\n`;
    report += `   Total Annotations: ${summary.totalAnnotations}\n`;
    report += `   By Domain: ${Object.entries(summary.byDomain).map(([d, c]) => `${d}(${c})`).join(', ')}\n`;
    report += `   By Severity: ${Object.entries(summary.bySeverity).map(([s, c]) => `${s}(${c})`).join(', ')}\n\n`;
    
    if (appliedRules.length > 0) {
      report += `🎯 Applied Rules:\n`;
      appliedRules.forEach((rule, index) => {
        const severity = rule.meta.severity || 'medium';
        const icon = severity === 'critical' ? '🔴' : 
                    severity === 'high' ? '🟠' : 
                    severity === 'medium' ? '🟡' : '🟢';
        
        report += `   ${index + 1}. ${icon} [${rule.domain}][${rule.type}] Line ${rule.line}\n`;
        report += `      Fix: ${rule.meta.fix}\n`;
        report += `      Issue: ${rule.meta.issueId}\n`;
        if (rule.refs.length > 0) {
          report += `      References: ${rule.refs.join(', ')}\n`;
        }
        report += `\n`;
      });
    }
    
    return report;
  }
  
  exportJSON(annotationResult: AnnotationResult): string {
    return JSON.stringify(annotationResult, null, 2);
  }
}

// Export for use in other modules
export { EnterpriseScanner };
export type { AnnotationRule, AnnotationResult, ScannerOptions };

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 && process.stdin.isTTY || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Enterprise Scanner - Advanced Code Annotation System

Usage:
  bun enterprise-scanner.ts <file> [options]
  cat <file> | bun enterprise-scanner.ts [options]

Options:
  --format <type>    Output format: annotated (default), json, summary
  --severity <level> Minimum severity: low (default), medium, high, critical
  --no-bun          Disable Bun-specific annotations
  --report          Generate detailed report
  --help, -h        Show this help

Examples:
  bun enterprise-scanner.ts src/app.ts
  bun enterprise-scanner.ts src/app.ts --format json --severity high
  bun enterprise-scanner.ts src/app.ts --report
    `);
    process.exit(0);
  }
  
  const scanner = new EnterpriseScanner();
  const options: ScannerOptions = {
    includeBunNative: !args.includes('--no-bun'),
    severityThreshold: 'low',
    outputFormat: 'annotated'
  };
  
  // Parse arguments
  const formatIndex = args.indexOf('--format');
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    options.outputFormat = args[formatIndex + 1] as 'annotated' | 'json' | 'summary';
  }
  
  const severityIndex = args.indexOf('--severity');
  if (severityIndex !== -1 && args[severityIndex + 1]) {
    options.severityThreshold = args[severityIndex + 1] as 'low' | 'medium' | 'high' | 'critical';
  }
  
  // Read source code
  let sourceCode = '';
  const fileArg = args.find(arg => !arg.startsWith('--'));
  
  if (fileArg && !process.stdin.isTTY) {
    // If piping from stdin but also have file arg, prioritize stdin
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      sourceCode = Buffer.concat(chunks).toString();
    } catch (error) {
      console.error(`❌ Error reading from stdin: ${(error as Error).message}`);
      process.exit(1);
    }
  } else if (fileArg) {
    try {
      sourceCode = await Bun.file(fileArg).text();
    } catch (error) {
      console.error(`❌ Error reading file: ${(error as Error).message}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      sourceCode = Buffer.concat(chunks).toString();
    } catch (error) {
      console.error(`❌ Error reading from stdin: ${(error as Error).message}`);
      process.exit(1);
    }
  } else {
    console.error('❌ No input file provided and no data on stdin');
    console.log('Use --help for usage information');
    process.exit(1);
  }
  
  // Example custom rule
  const customRules: AnnotationRule[] = [
    {
      domain: 'PERF',
      scope: 'GLOBAL',
      type: 'SYNC_IO',
      line: 42,
      meta: { fix: 'Bun.file().text()', issueId: 'PW001' },
      className: 'FileLoader',
      functionName: 'readConfig',
      refs: ['performance-docs']
    }
  ];
  
  const result = scanner.suggestAnnotations(sourceCode, customRules, options);
  
  // Output based on format
  switch (options.outputFormat) {
    case 'json':
      console.log(scanner.exportJSON(result));
      break;
    case 'summary':
      console.log(scanner.generateReport(result));
      break;
    case 'annotated':
    default:
      console.log(result.annotatedCode);
      if (args.includes('--report')) {
        console.log('\n' + scanner.generateReport(result));
      }
      break;
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
