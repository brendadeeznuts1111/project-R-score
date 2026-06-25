#!/usr/bin/env bun

/**
 * Complete Bun.inspect.table() Function Reference
 * Detailed parameter breakdown with practical vault examples
 */

import chalk from 'chalk';

console.info(chalk.bold.magenta('🎯 Bun.inspect.table() Complete Function Reference'));
console.info(chalk.gray('Odds Protocol Vault - Comprehensive Parameter Guide'));
console.info(chalk.gray('='.repeat(80)));

// =============================================================================
// FUNCTION SIGNATURE
// =============================================================================

console.info(chalk.bold.cyan('\n📋 Function Signature:'));
console.info(chalk.white('Bun.inspect.table(tabularData, properties?, options?)'));

console.info(chalk.bold.yellow('\n📝 Parameters:'));
console.info(chalk.gray('• tabularData: any[] | object     (Required)'));
console.info(chalk.gray('• properties?: string[]           (Optional)'));
console.info(chalk.gray('• options?: object                (Optional)'));

// =============================================================================
// PARAMETER 1: tabularData (Required)
// =============================================================================

console.info(chalk.bold.blue('\n🔸 1. tabularData (Required)'));
console.info(chalk.gray('Type: any[] | object'));
console.info(chalk.gray('Description: The source data to display in table format'));

console.info(chalk.bold.cyan('\n✅ Best Practices:'));
console.info(chalk.gray('• Use array of objects for multi-row tables'));
console.info(chalk.gray('• Keep objects flat (no nested objects)'));
console.info(chalk.gray('• Ensure consistent property names across objects'));

console.info(chalk.bold.yellow('\n📊 Example Data Structures:'));

// Example 1: Array of Objects (Most Common)
const vaultFiles = [
    { name: '2025-11-18', size: 2456, type: 'markdown', modified: '2025-11-18' },
    { name: 'OddsTick', size: 5120, type: 'markdown', modified: '2025-11-17' },
    { name: 'bun-utilities', size: 8192, type: 'typescript', modified: '2025-11-18' }
];

console.info(chalk.green('\n// Array of Objects (Recommended):'));
console.info(chalk.gray(JSON.stringify(vaultFiles, null, 2)));

// Example 2: Single Object
const vaultSummary = {
    totalFiles: 42,
    totalSize: '156.3 KB',
    healthScore: 94,
    lastValidated: '2025-11-18'
};

console.info(chalk.green('\n// Single Object (Properties become rows):'));
console.info(chalk.gray(JSON.stringify(vaultSummary, null, 2)));

// Example 3: Complex Vault Data
const validationResults = [
    {
        id: 'VAL001',
        type: 'error',
        category: 'Structure',
        message: 'Multiple H1 headings found',
        filePath: '01 - Daily Notes/2025-11-18.md',
        lineNumber: 15,
        suggestion: 'Use only one H1 heading per document',
        timestamp: new Date('2025-11-18T16:55:00Z'),
        severity: 'high'
    },
    {
        id: 'VAL002',
        type: 'warning',
        category: 'Linter',
        message: 'Line too long (125 chars, max 100)',
        filePath: '04 - Documentation/Guide.md',
        lineNumber: 42,
        suggestion: 'Break line into multiple shorter lines',
        timestamp: new Date('2025-11-18T16:54:00Z'),
        severity: 'medium'
    }
];

console.info(chalk.green('\n// Complex Validation Data:'));
console.info(chalk.gray(JSON.stringify(validationResults, null, 2)));

// =============================================================================
// PARAMETER 2: properties (Optional)
// =============================================================================

console.info(chalk.bold.blue('\n🔸 2. properties (Optional)'));
console.info(chalk.gray('Type: string[]'));
console.info(chalk.gray('Description: Array of property names for column selection and ordering'));

console.info(chalk.bold.cyan('\n✅ Benefits:'));
console.info(chalk.gray('• Control column order'));
console.info(chalk.gray('• Select specific columns only'));
console.info(chalk.gray('• Prevent unwanted properties from appearing'));
console.info(chalk.gray('• Ensure consistent table structure'));

console.info(chalk.bold.yellow('\n📊 Properties Examples:'));

console.info(chalk.green('\n// Basic column selection:'));
const basicProperties = ['name', 'size', 'type'];
console.info(chalk.gray(`Bun.inspect.table(data, ${JSON.stringify(basicProperties)})`));

console.info(chalk.green('\n// Ordered columns with specific subset:'));
const orderedProperties = ['id', 'type', 'category', 'message', 'filePath'];
console.info(chalk.gray(`Bun.inspect.table(validationData, ${JSON.stringify(orderedProperties)})`));

console.info(chalk.green('\n// Vault-specific column ordering:'));
const vaultProperties = ['name', 'path', 'size_kb', 'modified', 'tags', 'status'];
console.info(chalk.gray(`Bun.inspect.table(vaultData, ${JSON.stringify(vaultProperties)})`));

// Demonstrate properties usage
console.info(chalk.bold.magenta('\n🎯 Properties Demonstration:'));
console.info(chalk.gray('All properties vs. Selected properties:'));

console.info(chalk.yellow('\n// All Properties (Default):'));
Bun.inspect.table(vaultFiles);

console.info(chalk.yellow('\n// Selected Properties Only:'));
Bun.inspect.table(vaultFiles, ['name', 'size', 'type']);

console.info(chalk.yellow('\n// Reordered Properties:'));
Bun.inspect.table(vaultFiles, ['type', 'name', 'modified']);

// =============================================================================
// PARAMETER 3: options (Optional)
// =============================================================================

console.info(chalk.bold.blue('\n🔸 3. options (Optional)'));
console.info(chalk.gray('Type: object'));
console.info(chalk.gray('Description: Configuration object for display options'));

console.info(chalk.bold.cyan('\n🎛️ Available Options:'));

console.info(chalk.bold.yellow('\n• maxEntryWidth: number'));
console.info(chalk.gray('  Purpose: Limits text width in columns'));
console.info(chalk.gray('  Use Case: Long messages, file paths, descriptions'));
console.info(chalk.gray('  Default: No limit'));

console.info(chalk.bold.yellow('\n• compact: boolean'));
console.info(chalk.gray('  Purpose: Reduces horizontal padding between columns'));
console.info(chalk.gray('  Use Case: Tables with many columns, limited console space'));
console.info(chalk.gray('  Default: false'));

console.info(chalk.bold.yellow('\n• maxLines: number'));
console.info(chalk.gray('  Purpose: Limits number of rows displayed'));
console.info(chalk.gray('  Use Case: Large datasets, preventing console flooding'));
console.info(chalk.gray('  Default: No limit'));

// =============================================================================
// OPTIONS DEMONSTRATIONS
// =============================================================================

console.info(chalk.bold.magenta('\n🎯 Options Demonstrations:'));

// Create sample data with long text
const longTextData = [
    {
        id: 'ERR001',
        message: 'This is a very long error message that would normally break the table layout and make it difficult to read other columns properly',
        file: 'very-long-filename-that-demonstrates-truncation.md',
        suggestion: 'Break this long message into shorter, more manageable pieces'
    },
    {
        id: 'WARN002',
        message: 'Another lengthy warning message that shows how text truncation works in practice when you have content that exceeds the maximum entry width',
        file: 'another-extremely-long-filename-example.md',
        suggestion: 'Consider using more concise messaging'
    }
];

console.info(chalk.bold.cyan('\n📏 maxEntryWidth Demo:'));
console.info(chalk.gray('Without maxEntryWidth (layout breaks):'));
Bun.inspect.table(longTextData);

console.info(chalk.gray('\nWith maxEntryWidth: 40:'));
Bun.inspect.table(longTextData, ['id', 'message', 'file'], { maxEntryWidth: 40 });

console.info(chalk.gray('\nWith maxEntryWidth: 20:'));
Bun.inspect.table(longTextData, ['id', 'message', 'file'], { maxEntryWidth: 20 });

// Compact demo
const wideData = [
    { name: 'File1', size: '1.2KB', type: 'markdown', modified: '2025-11-18', author: 'Alice', status: 'validated' },
    { name: 'File2', size: '2.4KB', type: 'typescript', modified: '2025-11-17', author: 'Bob', status: 'pending' },
    { name: 'File3', size: '3.6KB', type: 'json', modified: '2025-11-16', author: 'Charlie', status: 'validated' }
];

console.info(chalk.bold.cyan('\n📐 compact Demo:'));
console.info(chalk.gray('Normal spacing:'));
Bun.inspect.table(wideData);

console.info(chalk.gray('\nCompact spacing:'));
Bun.inspect.table(wideData, ['name', 'size', 'type', 'modified', 'author', 'status'], { compact: true });

// maxLines demo
const largeDataset = Array.from({ length: 15 }, (_, i) => ({
    id: `FILE${String(i + 1).padStart(3, '0')}`,
    name: `document-${i + 1}.md`,
    size: `${Math.floor(Math.random() * 100) + 1}KB`,
    modified: '2025-11-18'
}));

console.info(chalk.bold.cyan('\n📊 maxLines Demo:'));
console.info(chalk.gray(`Full dataset (${largeDataset.length} rows):`));
Bun.inspect.table(largeDataset.slice(0, 3)); // Show first 3 to avoid flooding

console.info(chalk.gray(`\nLimited to 5 rows with maxLines:`));
Bun.inspect.table(largeDataset, ['id', 'name', 'size', 'modified'], { maxLines: 5 });

// =============================================================================
// COMBINED OPTIONS DEMONSTRATION
// =============================================================================

console.info(chalk.bold.magenta('\n🎯 Combined Options Demo:'));

const complexData = [
    {
        id: 'COMPLEX001',
        name: 'Very Long Document Name That Exceeds Normal Width',
        description: 'This is a detailed description that contains a lot of information about the document and its purpose in the vault system',
        size: '15.3KB',
        modified: '2025-11-18T10:30:00Z',
        status: 'validated',
        author: 'John Doe'
    },
    {
        id: 'COMPLEX002',
        name: 'Another Extended Filename Example',
        description: 'Additional descriptive content that demonstrates how multiple options work together to create well-formatted output',
        size: '8.7KB',
        modified: '2025-11-17T14:15:00Z',
        status: 'pending',
        author: 'Jane Smith'
    }
];

console.info(chalk.gray('All options combined:'));
Bun.inspect.table(
    complexData,
    ['id', 'name', 'description', 'size', 'status'],
    {
        maxEntryWidth: 30,
        compact: true,
        maxLines: 2
    }
);

// =============================================================================
// VAULT-SPECIFIC EXAMPLES
// =============================================================================

console.info(chalk.bold.magenta('\n🎯 Vault-Specific Examples:'));

// Validation Report
console.info(chalk.bold.cyan('\n📋 Validation Report Example:'));
const validationData = [
    {
        id: 'VAL001',
        severity: 'error',
        category: 'Structure',
        file: 'Daily-Note.md',
        message: 'Multiple H1 headings detected in document structure',
        line: 15,
        suggestion: 'Remove extra H1 headings, use H2+ for subheadings'
    },
    {
        id: 'VAL002',
        severity: 'warning',
        category: 'Linter',
        file: 'Project-Plan.md',
        message: 'Line length exceeds 100 characters limit',
        line: 42,
        suggestion: 'Break long lines into multiple shorter lines'
    }
];

const formattedValidation = validationData.map(item => ({
    id: chalk.bold(item.id),
    severity: item.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️'),
    category: chalk.italic(item.category),
    file: chalk.cyan(item.file),
    issue: item.message,
    line: item.line.toString()
}));

Bun.inspect.table(
    formattedValidation,
    ['id', 'severity', 'category', 'file', 'issue', 'line'],
    { maxEntryWidth: 25, compact: true }
);

// Performance Metrics
console.info(chalk.bold.cyan('\n🚀 Performance Metrics Example:'));
const performanceData = [
    { operation: 'File Validation', duration: 2.3, status: 'success', efficiency: 107 },
    { operation: 'Template Processing', duration: 5.7, status: 'success', efficiency: 146 },
    { operation: 'Link Analysis', duration: 12.1, status: 'warning', efficiency: 85 },
    { operation: 'Cache Update', duration: 0.8, status: 'success', efficiency: 95 }
];

const formattedPerformance = performanceData.map(item => ({
    operation: chalk.white(item.operation),
    duration: item.duration < 5 ?
        chalk.green(`${item.duration}ms`) :
        item.duration < 10 ?
            chalk.yellow(`${item.duration}ms`) :
            chalk.red(`${item.duration}ms`),
    status: item.status === 'success' ? chalk.green('✅') : chalk.yellow('⚠️'),
    efficiency: item.efficiency > 120 ?
        chalk.green(`${item.efficiency}%`) :
        chalk.yellow(`${item.efficiency}%`)
}));

Bun.inspect.table(
    formattedPerformance,
    ['operation', 'duration', 'status', 'efficiency']
);

// =============================================================================
// QUICK REFERENCE
// =============================================================================

console.info(chalk.bold.magenta('\n🎯 Quick Reference Summary:'));
console.info(chalk.gray('='.repeat(50)));

console.info(chalk.bold.cyan('\n📋 Function Signature:'));
console.info(chalk.white('Bun.inspect.table(tabularData, properties?, options?)'));

console.info(chalk.bold.cyan('\n🔧 Parameters:'));
console.info(chalk.gray('• tabularData  : any[] | object  (Required)'));
console.info(chalk.gray('• properties   : string[]        (Optional)'));
console.info(chalk.gray('• options      : object          (Optional)'));

console.info(chalk.bold.cyan('\n⚙️ Options Object:'));
console.info(chalk.gray('• maxEntryWidth : number  (Limit column width)'));
console.info(chalk.gray('• compact       : boolean (Reduce padding)'));
console.info(chalk.gray('• maxLines      : number  (Limit rows)'));

console.info(chalk.bold.cyan('\n✅ Best Practices:'));
console.info(chalk.gray('1. Pre-process data before display'));
console.info(chalk.gray('2. Use explicit properties array'));
console.info(chalk.gray('3. Apply maxEntryWidth for text columns'));
console.info(chalk.gray('4. Use compact for space optimization'));
console.info(chalk.gray('5. Set maxLines for large datasets'));
console.info(chalk.gray('6. Keep objects flat (no nesting)'));

console.info(chalk.bold.green('\n🎉 Reference Complete!'));

export { };
