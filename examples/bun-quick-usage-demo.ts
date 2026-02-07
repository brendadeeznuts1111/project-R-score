#!/usr/bin/env bun

/**
 * ⚡ Bun Quick Usage Patterns Demo
 *
 * Demonstrating the essential Bun API patterns from the documentation
 */

import { QuickUsagePatterns } from '../lib/docs/apis/bun-quick-usage.ts';

console.log('⚡ Bun Quick Usage Patterns Demo');
console.log('='.repeat(50));
console.log();

// Display all the quick usage patterns
console.log('📋 Available Quick Usage Patterns:');
console.log('-'.repeat(40));

Object.entries(QuickUsagePatterns).forEach(([name, code]) => {
  console.log(`🔸 ${name}:`);
  console.log(`   ${code}`);
  console.log();
});

// Show how to use them
console.log('💡 How to use these patterns:');
console.log('-'.repeat(40));
console.log('1. Copy the pattern you need');
console.log('2. Adapt the variables to your use case');
console.log('3. These are production-ready snippets');
console.log();

// Demonstrate pattern usage
console.log('🎯 Pattern Usage Examples:');
console.log('-'.repeat(40));

// Example 1: Table with colored status
console.log('1. Table with colored status:');
const data = [
  { name: 'Project A', status: '✅ Complete', priority: 'High' },
  { name: 'Project B', status: '🔄 In Progress', priority: 'Medium' },
  { name: 'Project C', status: '❌ Blocked', priority: 'Low' }
];
const columns = ['name', 'status', 'priority'];
console.log('   Code:', QuickUsagePatterns.tableWithColoredStatus);
console.log('   Result:');
console.log(Bun.inspect.table(data, columns, { colors: true }));
console.log();

// Example 2: Safe HTML export
console.log('2. Safe HTML export:');
const content = '<script>alert("XSS")</script><p>Safe content</p>';
console.log('   Code:', QuickUsagePatterns.safeHTMLExport);
console.log('   Would generate: <div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&lt;p&gt;Safe content&lt;/p&gt;</div>');
console.log();

// Example 3: Width-aware padding
console.log('3. Width-aware padding:');
const text = 'Hello 🌍';
console.log('   Code:', QuickUsagePatterns.widthAwarePadding);
console.log('   Text:', text);
console.log('   Width:', Bun.stringWidth(text));
console.log('   Padded:', text.padEnd(Bun.stringWidth(text) + 10));
console.log();

// Example 4: HSL color per profile
console.log('4. HSL color per profile:');
const hue = 240; // Blue
console.log('   Code:', QuickUsagePatterns.hslColorPerProfile);
console.log('   HSL Color:', Bun.color(`hsl(${hue}, 100%, 50%)`, "ansi"));
console.log();

// Example 5: Open file on error
console.log('5. Open file on error:');
console.log('   Code:', QuickUsagePatterns.openFileOnError);
console.log('   Opens the current file at line 123 in your editor');
console.log();

// Example 6: Scan projects
console.log('6. Scan projects:');
console.log('   Code:', QuickUsagePatterns.scanProjects);
console.log('   Asynchronously scans for project directories');
console.log();

console.log('✅ All Bun Quick Usage Patterns demonstrated!');
console.log('🚀 Ready for production use.');