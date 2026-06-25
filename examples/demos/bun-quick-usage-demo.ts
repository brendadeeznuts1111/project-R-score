#!/usr/bin/env bun

/**
 * ⚡ Bun Quick Usage Patterns Demo
 *
 * Demonstrating the essential Bun API patterns from the documentation
 */

import { QuickUsagePatterns } from '../lib/docs/apis/bun-quick-usage.ts';

console.info('⚡ Bun Quick Usage Patterns Demo');
console.info('='.repeat(50));
console.info();

// Display all the quick usage patterns
console.info('📋 Available Quick Usage Patterns:');
console.info('-'.repeat(40));

Object.entries(QuickUsagePatterns).forEach(([name, code]) => {
  console.info(`🔸 ${name}:`);
  console.info(`   ${code}`);
  console.info();
});

// Show how to use them
console.info('💡 How to use these patterns:');
console.info('-'.repeat(40));
console.info('1. Copy the pattern you need');
console.info('2. Adapt the variables to your use case');
console.info('3. These are production-ready snippets');
console.info();

// Demonstrate pattern usage
console.info('🎯 Pattern Usage Examples:');
console.info('-'.repeat(40));

// Example 1: Table with colored status
console.info('1. Table with colored status:');
const data = [
  { name: 'Project A', status: '✅ Complete', priority: 'High' },
  { name: 'Project B', status: '🔄 In Progress', priority: 'Medium' },
  { name: 'Project C', status: '❌ Blocked', priority: 'Low' }
];
const columns = ['name', 'status', 'priority'];
console.info('   Code:', QuickUsagePatterns.tableWithColoredStatus);
console.info('   Result:');
console.info(Bun.inspect.table(data, columns, { colors: true }));
console.info();

// Example 2: Safe HTML export
console.info('2. Safe HTML export:');
const content = '<script>alert("XSS")</script><p>Safe content</p>';
console.info('   Code:', QuickUsagePatterns.safeHTMLExport);
console.info('   Would generate: <div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&lt;p&gt;Safe content&lt;/p&gt;</div>');
console.info();

// Example 3: Width-aware padding
console.info('3. Width-aware padding:');
const text = 'Hello 🌍';
console.info('   Code:', QuickUsagePatterns.widthAwarePadding);
console.info('   Text:', text);
console.info('   Width:', Bun.stringWidth(text));
console.info('   Padded:', text.padEnd(Bun.stringWidth(text) + 10));
console.info();

// Example 4: HSL color per profile
console.info('4. HSL color per profile:');
const hue = 240; // Blue
console.info('   Code:', QuickUsagePatterns.hslColorPerProfile);
console.info('   HSL Color:', Bun.color(`hsl(${hue}, 100%, 50%)`, "ansi"));
console.info();

// Example 5: Open file on error
console.info('5. Open file on error:');
console.info('   Code:', QuickUsagePatterns.openFileOnError);
console.info('   Opens the current file at line 123 in your editor');
console.info();

// Example 6: Scan projects
console.info('6. Scan projects:');
console.info('   Code:', QuickUsagePatterns.scanProjects);
console.info('   Asynchronously scans for project directories');
console.info();

console.info('✅ All Bun Quick Usage Patterns demonstrated!');
console.info('🚀 Ready for production use.');