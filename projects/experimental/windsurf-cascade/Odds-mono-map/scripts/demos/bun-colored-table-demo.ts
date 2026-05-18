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

console.info(chalk.blue.bold('🎨 Bun.inspect.table() Color Formatting Demo'));
console.info(chalk.gray('Demonstrating colored table output with ANSI color support\n'));

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

console.info(chalk.yellow('📊 Default Table (No Colors):'));
const defaultTable = Bun.inspect.table(validationResults, ['file', 'errors', 'warnings', 'status']);
console.info(defaultTable);

console.info(chalk.yellow('\n🎨 Colored Table (colors: true):'));
const coloredTable = Bun.inspect.table(validationResults, ['file', 'errors', 'warnings', 'status'], { colors: true });
console.info(coloredTable);

console.info(chalk.yellow('\n📊 Full Colored Table (All Columns):'));
const fullColoredTable = Bun.inspect.table(validationResults, { colors: true });
console.info(fullColoredTable);

console.info(chalk.yellow('\n⚡ Performance Metrics Table:'));
const performanceTable = Bun.inspect.table(performanceMetrics, ['operation', 'time', 'memory', 'status'], { colors: true });
console.info(performanceTable);

// Demonstrate with different data types
console.info(chalk.yellow('\n🔧 Mixed Data Types Table:'));
const mixedData = [
    { id: 1, name: 'Alice', active: true, score: 95.5, tags: ['admin', 'user'] },
    { id: 2, name: 'Bob', active: false, score: 87.2, tags: ['user'] },
    { id: 3, name: 'Charlie', active: true, score: 92.8, tags: ['admin', 'moderator', 'user'] }
];

const mixedTable = Bun.inspect.table(mixedData, { colors: true });
console.info(mixedTable);

// Show difference in terminal output
console.info(chalk.blue('\n💡 Color Options Comparison:'));
console.info(chalk.gray('   // Without colors (plain text)'));
console.info(chalk.gray('   Bun.inspect.table(data, columns);'));
console.info(chalk.gray(''));
console.info(chalk.gray('   // With colors (ANSI escape codes)'));
console.info(chalk.gray('   Bun.inspect.table(data, columns, { colors: true });'));
console.info(chalk.gray(''));
console.info(chalk.gray('   // All columns with colors'));
console.info(chalk.gray('   Bun.inspect.table(data, { colors: true });'));

// Practical usage examples
console.info(chalk.blue('\n✅ Practical Usage Examples:'));

console.info(chalk.gray('   // Validation report with colors'));
console.info(chalk.gray('   function formatValidationReport(results) {'));
console.info(chalk.gray('     return Bun.inspect.table(results, ['));
console.info(chalk.gray('       "file", "errors", "warnings", "status"'));
console.info(chalk.gray('     ], { colors: true });'));
console.info(chalk.gray('   }'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Performance dashboard'));
console.info(chalk.gray('   function formatPerformanceDashboard(metrics) {'));
console.info(chalk.gray('     return Bun.inspect.table(metrics, {'));
console.info(chalk.gray('       colors: true'));
console.info(chalk.gray('     });'));
console.info(chalk.gray('   }'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // System status report'));
console.info(chalk.gray('   function formatSystemStatus(services) {'));
console.info(chalk.gray('     return Bun.inspect.table(services, ['));
console.info(chalk.gray('       "service", "status", "uptime", "memory"'));
console.info(chalk.gray('     ], { colors: true });'));
console.info(chalk.gray('   }'));

// Color benefits
console.info(chalk.blue('\n🎯 Benefits of Colored Tables:'));
console.info(chalk.gray('   • Enhanced readability with visual distinction'));
console.info(chalk.gray('   • Better data type recognition (numbers vs strings)'));
console.info(chalk.gray('   • Improved status indication (errors vs success)'));
console.info(chalk.gray('   • Professional terminal output appearance'));
console.info(chalk.gray('   • Easier scanning of large datasets'));
console.info(chalk.gray('   • Automatic ANSI color code handling'));

// Terminal compatibility note
console.info(chalk.blue('\n📱 Terminal Compatibility:'));
console.info(chalk.gray('   • Works in most modern terminals'));
console.info(chalk.gray('   • Automatic fallback in non-color terminals'));
console.info(chalk.gray('   • Preserves table structure with or without colors'));
console.info(chalk.gray('   • Compatible with terminal emulators and IDE consoles'));

console.info(chalk.green('\n✅ Colored table formatting demo completed!'));
