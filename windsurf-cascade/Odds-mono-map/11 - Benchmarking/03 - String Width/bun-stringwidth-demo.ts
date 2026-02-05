#!/usr/bin/env bun

/**
 * Bun.stringWidth() for Table Width Management
 * Solving max string width issues in Bun.inspect.table()
 */

import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Bun.stringWidth() for Table Width Management'));
console.log(chalk.gray('Odds Protocol Vault - Solving Table Width Issues'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// BASIC Bun.stringWidth() DEMONSTRATION
// =============================================================================

console.log(chalk.bold.cyan('\n📏 Basic Bun.stringWidth() Examples:'));

const basicExamples = [
    { text: 'hello', description: 'Plain text' },
    { text: '\u001b[31mhello\u001b[0m', description: 'Red text with ANSI codes' },
    { text: '\u001b[31mhello\u001b[0m', description: 'Red text (counting ANSI)', countAnsi: true },
    { text: '🚀 hello', description: 'Text with emoji' },
    { text: '\u001b[31m🚀 hello\u001b[0m', description: 'Colored emoji text' },
    { text: 'こんにちは', description: 'Japanese characters' }
];

console.log(chalk.gray('Text Width Calculations:'));
basicExamples.forEach(example => {
    const width = example.countAnsi ?
        Bun.stringWidth(example.text, { countAnsiEscapeCodes: true }) :
        Bun.stringWidth(example.text);

    console.log(`${chalk.cyan(example.description.padEnd(25))} | ${chalk.yellow(width.toString().padStart(3))} | ${chalk.gray(`"${example.text.replace(/\u001b\[[0-9;]*m/g, '[ANSI]')}"`)} `);
});

// =============================================================================
// TABLE WIDTH PROBLEM DEMONSTRATION
// =============================================================================

console.log(chalk.bold.cyan('\n❌ Table Width Problem Without stringWidth():'));

// Problem: Long text with colors breaks table layout
const problematicData = [
    {
        name: chalk.red('Very Long File Name'),
        description: chalk.blue('This is a very long description with ANSI colors that breaks the table layout'),
        status: chalk.green('✅ Active')
    },
    {
        name: chalk.yellow('Medium File'),
        description: chalk.magenta('Medium length description with colors'),
        status: chalk.red('❌ Error')
    },
    {
        name: chalk.cyan('Short'),
        description: chalk.gray('Short desc'),
        status: chalk.yellow('⚠️ Warning')
    }
];

console.log(chalk.gray('Problem: Table layout breaks with colored long text:'));
Bun.inspect.table(problematicData, ['name', 'description', 'status']);

// =============================================================================
// SOLUTION: USING Bun.stringWidth() FOR WIDTH CALCULATION
// =============================================================================

console.log(chalk.bold.cyan('\n✅ Solution: Using Bun.stringWidth() for Proper Width Management:'));

function truncateText(text: string, maxWidth: number): string {
    const displayWidth = Bun.stringWidth(text);
    if (displayWidth <= maxWidth) {
        return text;
    }

    // Remove ANSI codes for measurement, then truncate
    const cleanText = text.replace(/\u001b\[[0-9;]*m/g, '');
    let truncated = cleanText;

    while (Bun.stringWidth(truncated) > maxWidth - 3) {
        truncated = truncated.slice(0, -1);
    }

    return truncated + '...';
}

function padText(text: string, width: number): string {
    const displayWidth = Bun.stringWidth(text);
    const padding = Math.max(0, width - displayWidth);
    return text + ' '.repeat(padding);
}

// Create properly formatted data with width management
const wellFormattedData = problematicData.map(item => ({
    name: truncateText(item.name, 15),
    description: truncateText(item.description, 30),
    status: item.status
}));

console.log(chalk.gray('Solution: Properly truncated text maintains table layout:'));
Bun.inspect.table(wellFormattedData, ['name', 'description', 'status']);

// =============================================================================
// ADVANCED WIDTH MANAGEMENT FOR VAULT DATA
// =============================================================================

console.log(chalk.bold.cyan('\n🎯 Advanced Width Management for Vault Data:'));

// Sample vault files with problematic long names and descriptions
const vaultFiles = [
    {
        name: chalk.cyan('2025-11-18-Daily-Productivity-Review-With-Detailed-Analysis.md'),
        path: '01 - Daily Notes/02 - Journals/',
        description: chalk.blue('This is an extremely long description that contains detailed information about the daily productivity review and would normally break table formatting'),
        size: '2.4 KB',
        status: chalk.green('✅ Validated')
    },
    {
        name: chalk.yellow('OddsTick-Data-Model-Interface-Definition-With-Complete-Specification.md'),
        path: '02 - Architecture/01 - Data Models/',
        description: chalk.magenta('Comprehensive data model specification for the odds tick system with all interface definitions'),
        size: '5.1 KB',
        status: chalk.green('✅ Validated')
    },
    {
        name: chalk.red('Very-Long-Template-Name-That-Demonstrates-Truncation-Issues-In-Table-Formatting.md'),
        path: '06 - Templates/01 - Note Templates/',
        description: chalk.gray('Template description'),
        size: '1.2 KB',
        status: chalk.yellow('⚠️ Draft')
    }
];

// Advanced width management function
function formatVaultData(data: any[], maxWidths: { [key: string]: number }) {
    return data.map(item => {
        const formatted: any = {};

        Object.keys(maxWidths).forEach(key => {
            if (item[key]) {
                formatted[key] = truncateText(item[key], maxWidths[key]);
            }
        });

        return formatted;
    });
}

// Apply width management
const formattedVaultFiles = formatVaultData(vaultFiles, {
    name: 25,
    description: 40,
    path: 30,
    size: 10,
    status: 15
});

console.log(chalk.gray('Formatted vault data with proper width management:'));
Bun.inspect.table(
    formattedVaultFiles,
    ['name', 'path', 'description', 'size', 'status']
);

// =============================================================================
// DYNAMIC WIDTH CALCULATION
// =============================================================================

console.log(chalk.bold.cyan('\n📊 Dynamic Width Calculation Based on Content:'));

function calculateOptimalWidths(data: any[], padding: number = 2): { [key: string]: number } {
    const widths: { [key: string]: number } = {};

    // Find maximum width for each column
    Object.keys(data[0] || {}).forEach(key => {
        widths[key] = data.reduce((max, item) => {
            const itemWidth = Bun.stringWidth(item[key] || '');
            return Math.max(max, itemWidth);
        }, key.length) + padding;
    });

    return widths;
}

// Calculate optimal widths
const optimalWidths = calculateOptimalWidths(vaultFiles, 3);

console.log(chalk.gray('Calculated optimal column widths:'));
Object.entries(optimalWidths).forEach(([column, width]) => {
    console.log(`${chalk.cyan(column.padEnd(12))}: ${chalk.yellow(width.toString())} characters`);
});

// Apply optimal widths
const optimallyFormatted = formatVaultData(vaultFiles, optimalWidths);

console.log(chalk.gray('\nTable with optimal width calculation:'));
Bun.inspect.table(
    optimallyFormatted,
    Object.keys(optimalWidths)
);

// =============================================================================
// VALIDATION ISSUES WITH WIDTH MANAGEMENT
// =============================================================================

console.log(chalk.bold.cyan('\n⚠️  Validation Issues with Proper Width Management:'));

const validationIssues = [
    {
        id: 'VAL001',
        type: chalk.bgRed(' ERROR '),
        file: chalk.cyan('Very-Long-Filename-That-Causes-Width-Problems.md'),
        message: chalk.yellow('This is an extremely long validation message that would normally break the table layout and make it difficult to read other columns properly'),
        suggestion: chalk.gray('Break this long message into shorter parts')
    },
    {
        id: 'VAL002',
        type: chalk.bgYellow(' WARNING '),
        file: chalk.cyan('Another-Long-Filename-Example.md'),
        message: chalk.blue('Another lengthy message demonstrating width management'),
        suggestion: chalk.gray('Use proper formatting')
    }
];

// Format validation issues with width constraints
const formattedIssues = validationIssues.map(issue => ({
    id: issue.id,
    type: issue.type,
    file: truncateText(issue.file, 25),
    message: truncateText(issue.message, 50),
    suggestion: truncateText(issue.suggestion, 30)
}));

console.log(chalk.gray('Validation issues with proper width management:'));
Bun.inspect.table(
    formattedIssues,
    ['id', 'type', 'file', 'message', 'suggestion']
);

// =============================================================================
// PERFORMANCE METRICS WITH WIDTH CONTROL
// =============================================================================

console.log(chalk.bold.cyan('\n🚀 Performance Metrics with Precise Width Control:'));

const performanceData = [
    {
        operation: chalk.white('File Validation Process'),
        duration: chalk.green('2.3ms'),
        efficiency: chalk.green('107%'),
        status: chalk.green('✅ Success'),
        details: chalk.blue('All files validated successfully with no errors found in the processing pipeline')
    },
    {
        operation: chalk.white('Template Processing'),
        duration: chalk.yellow('5.7ms'),
        efficiency: chalk.yellow('146%'),
        status: chalk.green('✅ Success'),
        details: chalk.magenta('Templates processed with above average efficiency metrics')
    }
];

// Format performance data with tight width control
const formattedPerformance = performanceData.map(metric => ({
    operation: truncateText(metric.operation, 20),
    duration: metric.duration,
    efficiency: metric.efficiency,
    status: metric.status,
    details: truncateText(metric.details, 40)
}));

console.log(chalk.gray('Performance metrics with tight width control:'));
Bun.inspect.table(
    formattedPerformance,
    ['operation', 'duration', 'efficiency', 'status', 'details'],
    { compact: true }
);

// =============================================================================
// UTILITY FUNCTIONS FOR TABLE WIDTH MANAGEMENT
// =============================================================================

console.log(chalk.bold.cyan('\n🔧 Utility Functions for Table Width Management:'));

// Utility function for creating well-formatted tables
function createWellFormattedTable(
    data: any[],
    columns: string[],
    maxWidths: { [key: string]: number },
    options: any = {}
) {
    // Format data with width constraints
    const formattedData = data.map(item => {
        const formatted: any = {};
        columns.forEach(column => {
            if (item[column]) {
                formatted[column] = truncateText(item[column], maxWidths[column]);
            }
        });
        return formatted;
    });

    // Display table
    Bun.inspect.table(formattedData, columns, options);
}

// Demonstrate utility function
console.log(chalk.gray('Using utility function for consistent table formatting:'));
createWellFormattedTable(
    vaultFiles,
    ['name', 'path', 'size', 'status'],
    { name: 20, path: 25, size: 8, status: 10 },
    { compact: true }
);

// =============================================================================
// QUICK REFERENCE
// =============================================================================

console.log(chalk.bold.magenta('\n🎯 Quick Reference Summary'));
console.log(chalk.gray('='.repeat(50)));

console.log(chalk.bold.cyan('\n📏 Bun.stringWidth() Usage:'));
console.log(chalk.gray('Bun.stringWidth(text)                    // Display width only'));
console.log(chalk.gray('Bun.stringWidth(text, { countAnsiEscapeCodes: true })  // Include ANSI codes'));

console.log(chalk.bold.cyan('\n🔧 Key Functions:'));
console.log(chalk.gray('truncateText(text, maxWidth)           // Truncate with width awareness'));
console.log(chalk.gray('padText(text, width)                   // Pad to exact width'));
console.log(chalk.gray('calculateOptimalWidths(data, padding)  // Auto-calculate column widths'));
console.log(chalk.gray('createWellFormattedTable()             // Utility for consistent formatting'));

console.log(chalk.bold.cyan('\n✅ Benefits:'));
console.log(chalk.gray('• Handles ANSI color codes correctly'));
console.log(chalk.gray('• Prevents table layout breakage'));
console.log(chalk.gray('• Supports emoji and Unicode'));
console.log(chalk.gray('• Dynamic width calculation'));
console.log(chalk.gray('• Consistent table formatting'));

console.log(chalk.bold.green('\n🎉 Table Width Management Complete!'));

export {
    truncateText,
    padText,
    calculateOptimalWidths,
    createWellFormattedTable
};
