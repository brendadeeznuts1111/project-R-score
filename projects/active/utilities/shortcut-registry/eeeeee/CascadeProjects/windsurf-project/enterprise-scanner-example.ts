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

console.info('🎯 Enterprise Scanner - Exact Format Demonstration');
console.info('═══════════════════════════════════════════════════\n');

console.info('📝 Input Source Code:');
console.info('─────────────────────');
console.info(sourceCode);

console.info('📋 Annotated Output:');
console.info('───────────────────');
console.info(result.annotatedCode);

console.info('📊 Summary:');
console.info('──────────');
console.info(`Total Annotations: ${result.summary.totalAnnotations}`);
console.info('By Domain:', Object.entries(result.summary.byDomain).map(([d, c]) => `${d}: ${c}`).join(', '));

console.info('\n🔧 Key Features Demonstrated:');
console.info('─────────────────────────────');
console.info('✅ Domain-based classification (PERF, SEC, COMP, BUN)');
console.info('✅ Scope targeting (GLOBAL, FUNCTION, CLASS, MODULE)');
console.info('✅ Type-specific annotations (SYNC_IO, SEC_RISK, etc.)');
console.info('✅ Metadata with fix suggestions and issue IDs');
console.info('✅ Class and function context awareness');
console.info('✅ Reference linking to documentation');
console.info('✅ Bun-native optimization indicators');

console.info('\n💻 CLI Usage Examples:');
console.info('─────────────────────');
console.info('# Basic annotation:');
console.info('bun enterprise-scanner.ts source.ts');
console.info('');
console.info('# JSON output:');
console.info('bun enterprise-scanner.ts source.ts --format json');
console.info('');
console.info('# With severity filtering:');
console.info('bun enterprise-scanner.ts source.ts --severity high');
console.info('');
console.info('# Generate detailed report:');
console.info('bun enterprise-scanner.ts source.ts --report');
console.info('');
console.info('# Pipe from stdin:');
console.info('cat source.ts | bun enterprise-scanner.ts --format summary');

console.info('\n🎉 Enterprise Scanner Implementation Complete!');
console.info('The system now provides intelligent code annotations with');
console.info('enterprise-grade analysis and customizable rule sets.');
