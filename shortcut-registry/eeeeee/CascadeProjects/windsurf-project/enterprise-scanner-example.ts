#!/usr/bin/env bun

/**
 * Enterprise Scanner Usage Example
 * 
 * This demonstrates the exact annotation format requested:
 * [PERF][GLOBAL][SYNC_IO][META:{fix:Bun.file().text(),issueId:PW001}][FileLoader][readConfig][#REF:performance-docs][BUN-NATIVE]
 */

import type { AnnotationRule } from './enterprise-scanner';
import { EnterpriseScanner } from './enterprise-scanner';

// Example usage with the exact annotation rule from your request
const sourceCode = `
class FileLoader {
  readConfig(): string {
    const config = readFileSync('./config.json');
    return config;
  }
}
`;

const scanner = new EnterpriseScanner();

// Custom annotation rule matching your exact specification
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

// Perform annotation
const result = scanner.suggestAnnotations(sourceCode, customRules);

console.log('🎯 Enterprise Scanner - Exact Format Demonstration');
console.log('═══════════════════════════════════════════════════\n');

console.log('📝 Input Source Code:');
console.log('─────────────────────');
console.log(sourceCode);

console.log('📋 Annotated Output:');
console.log('───────────────────');
console.log(result.annotatedCode);

console.log('📊 Summary:');
console.log('──────────');
console.log(`Total Annotations: ${result.summary.totalAnnotations}`);
console.log('By Domain:', Object.entries(result.summary.byDomain).map(([d, c]) => `${d}: ${c}`).join(', '));

console.log('\n🔧 Key Features Demonstrated:');
console.log('─────────────────────────────');
console.log('✅ Domain-based classification (PERF, SEC, COMP, BUN)');
console.log('✅ Scope targeting (GLOBAL, FUNCTION, CLASS, MODULE)');
console.log('✅ Type-specific annotations (SYNC_IO, SEC_RISK, etc.)');
console.log('✅ Metadata with fix suggestions and issue IDs');
console.log('✅ Class and function context awareness');
console.log('✅ Reference linking to documentation');
console.log('✅ Bun-native optimization indicators');

console.log('\n💻 CLI Usage Examples:');
console.log('─────────────────────');
console.log('# Basic annotation:');
console.log('bun enterprise-scanner.ts source.ts');
console.log('');
console.log('# JSON output:');
console.log('bun enterprise-scanner.ts source.ts --format json');
console.log('');
console.log('# With severity filtering:');
console.log('bun enterprise-scanner.ts source.ts --severity high');
console.log('');
console.log('# Generate detailed report:');
console.log('bun enterprise-scanner.ts source.ts --report');
console.log('');
console.log('# Pipe from stdin:');
console.log('cat source.ts | bun enterprise-scanner.ts --format summary');

console.log('\n🎉 Enterprise Scanner Implementation Complete!');
console.log('The system now provides intelligent code annotations with');
console.log('enterprise-grade analysis and customizable rule sets.');
