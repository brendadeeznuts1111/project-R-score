#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-colored-table-demo
 * 
 * Bun Colored Table Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,color,ansi,formatting,bun,runtime,performance
 */

#!/usr/bin/env bun

import chalk from 'chalk';

console.log(chalk.blue.bold('🎨 Bun.inspect.table() Color Formatting Demo'));
console.log(chalk.gray('Demonstrating colored table output with ANSI color support\n'));

// Sample data for table formatting
const validationResults = [
    { file: 'validate.ts', errors: 5, warnings: 12, status: '⚠️', score: 85, critical: true },
    { file: 'demo.md', errors: 0, warnings: 2, status: '✅', score: 98, critical: false },
    { file: 'test.js', errors: 3, warnings: 1, status: '❌', score: 72, critical: true },
    { file: 'config.json', errors: 0, warnings: 0, status: '✅', score: 100, critical: false },
    { file: 'utils.ts', errors: 1, warnings: 4, status: '⚠️', score: 91, critical: false }
];

const performanceMetrics = [
    { operation: 'Array generation', time: 0.071, memory: 1024, status: 'fast' },
    { operation: 'JSON serialization', time: 0.065, memory: 512, status: 'fast' },
    { operation: 'Base64 encoding', time: 0.442, memory: 2048, status: 'medium' },
    { operation: 'File compression', time: 2.156, memory: 4096, status: 'slow' },
    { operation: 'Database query', time: 15.234, memory: 8192, status: 'slow' }
];

console.log(chalk.yellow('📊 Default Table (No Colors):'));
const defaultTable = Bun.inspect.table(validationResults, ['file', 'errors', 'warnings', 'status']);
console.log(defaultTable);

console.log(chalk.yellow('\n🎨 Colored Table (colors: true):'));
const coloredTable = Bun.inspect.table(validationResults, ['file', 'errors', 'warnings', 'status'], { colors: true });
console.log(coloredTable);

console.log(chalk.yellow('\n📊 Full Colored Table (All Columns):'));
const fullColoredTable = Bun.inspect.table(validationResults, { colors: true });
console.log(fullColoredTable);

console.log(chalk.yellow('\n⚡ Performance Metrics Table:'));
const performanceTable = Bun.inspect.table(performanceMetrics, ['operation', 'time', 'memory', 'status'], { colors: true });
console.log(performanceTable);

// Demonstrate with different data types
console.log(chalk.yellow('\n🔧 Mixed Data Types Table:'));
const mixedData = [
    { id: 1, name: 'Alice', active: true, score: 95.5, tags: ['admin', 'user'] },
    { id: 2, name: 'Bob', active: false, score: 87.2, tags: ['user'] },
    { id: 3, name: 'Charlie', active: true, score: 92.8, tags: ['admin', 'moderator', 'user'] }
];

const mixedTable = Bun.inspect.table(mixedData, { colors: true });
console.log(mixedTable);

// Show difference in terminal output
console.log(chalk.blue('\n💡 Color Options Comparison:'));
console.log(chalk.gray('   // Without colors (plain text)'));
console.log(chalk.gray('   Bun.inspect.table(data, columns);'));
console.log(chalk.gray(''));
console.log(chalk.gray('   // With colors (ANSI escape codes)'));
console.log(chalk.gray('   Bun.inspect.table(data, columns, { colors: true });'));
console.log(chalk.gray(''));
console.log(chalk.gray('   // All columns with colors'));
console.log(chalk.gray('   Bun.inspect.table(data, { colors: true });'));

// Practical usage examples
console.log(chalk.blue('\n✅ Practical Usage Examples:'));

console.log(chalk.gray('   // Validation report with colors'));
console.log(chalk.gray('   function formatValidationReport(results) {'));
console.log(chalk.gray('     return Bun.inspect.table(results, ['));
console.log(chalk.gray('       "file", "errors", "warnings", "status"'));
console.log(chalk.gray('     ], { colors: true });'));
console.log(chalk.gray('   }'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Performance dashboard'));
console.log(chalk.gray('   function formatPerformanceDashboard(metrics) {'));
console.log(chalk.gray('     return Bun.inspect.table(metrics, {'));
console.log(chalk.gray('       colors: true'));
console.log(chalk.gray('     });'));
console.log(chalk.gray('   }'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // System status report'));
console.log(chalk.gray('   function formatSystemStatus(services) {'));
console.log(chalk.gray('     return Bun.inspect.table(services, ['));
console.log(chalk.gray('       "service", "status", "uptime", "memory"'));
console.log(chalk.gray('     ], { colors: true });'));
console.log(chalk.gray('   }'));

// Color benefits
console.log(chalk.blue('\n🎯 Benefits of Colored Tables:'));
console.log(chalk.gray('   • Enhanced readability with visual distinction'));
console.log(chalk.gray('   • Better data type recognition (numbers vs strings)'));
console.log(chalk.gray('   • Improved status indication (errors vs success)'));
console.log(chalk.gray('   • Professional terminal output appearance'));
console.log(chalk.gray('   • Easier scanning of large datasets'));
console.log(chalk.gray('   • Automatic ANSI color code handling'));

// Terminal compatibility note
console.log(chalk.blue('\n📱 Terminal Compatibility:'));
console.log(chalk.gray('   • Works in most modern terminals'));
console.log(chalk.gray('   • Automatic fallback in non-color terminals'));
console.log(chalk.gray('   • Preserves table structure with or without colors'));
console.log(chalk.gray('   • Compatible with terminal emulators and IDE consoles'));

console.log(chalk.green('\n✅ Colored table formatting demo completed!'));
