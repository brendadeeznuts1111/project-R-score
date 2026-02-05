#!/usr/bin/env bun

/**
 * Bun.inspect.table() Advanced Demonstration
 * Focused showcase of powerful table formatting for Odds Protocol Vault
 */

import chalk from 'chalk';

// Sample vault data
const vaultFiles = [
    {
        name: '2025-11-18',
        path: '01 - Daily Notes/02 - Journals/',
        size: 2456,
        modified: new Date('2025-11-18T10:30:00Z'),
        tags: ['daily', 'journal', 'productivity'],
        links: 2,
        backlinks: 1
    },
    {
        name: 'OddsTick',
        path: '02 - Architecture/01 - Data Models/',
        size: 5120,
        modified: new Date('2025-11-17T14:15:00Z'),
        tags: ['architecture', 'data-model', 'core'],
        links: 2,
        backlinks: 2
    },
    {
        name: 'bun-utilities',
        path: '03 - Development/01 - Code Snippets/',
        size: 8192,
        modified: new Date('2025-11-18T16:45:00Z'),
        tags: ['development', 'typescript', 'utilities'],
        links: 2,
        backlinks: 0
    }
];

const validationIssues = [
    {
        id: 'L1',
        type: 'warning',
        category: 'Linter',
        message: 'Line too long (125 chars, max 100) detected in markdown content that wraps around many characters.',
        file: 'Getting-Started.md',
        suggestion: 'Break line into multiple shorter lines.'
    },
    {
        id: 'H1',
        type: 'error',
        category: 'Structure',
        message: 'Multiple H1 headings found in a single document. This violates vault standards.',
        file: 'Misconfigured-Template.md',
        suggestion: 'Ensure only one top-level heading (#) per document.'
    },
    {
        id: 'LNK1',
        type: 'warning',
        category: 'Links',
        message: 'Broken link detected: [[Non-Existent-Document]] points to a file that does not exist.',
        file: '2025-11-18.md',
        suggestion: 'Update the link to point to an existing document.'
    }
];

const performanceMetrics = [
    {
        operation: 'File Validation',
        duration: 2.3,
        status: 'success',
        efficiency: 107
    },
    {
        operation: 'Template Processing',
        duration: 5.7,
        status: 'success',
        efficiency: 146
    },
    {
        operation: 'Link Validation',
        duration: 12.1,
        status: 'warning',
        efficiency: 85
    },
    {
        operation: 'Structure Analysis',
        duration: 1.5,
        status: 'success',
        efficiency: 226
    }
];

function demonstrateBasicTable(): void {
    console.log(chalk.bold.blue('\n📊 Basic Bun.inspect.table()'));
    console.log(chalk.gray('='.repeat(50)));

    // Simple table with basic data
    Bun.inspect.table([
        { name: 'Alice', age: 30, city: 'New York' },
        { name: 'Bob', age: 25, city: 'San Francisco' },
        { name: 'Charlie', age: 35, city: 'Chicago' }
    ]);
}

function demonstrateVaultFilesTable(): void {
    console.log(chalk.bold.cyan('\n📁 Vault Files Table (Pre-processed Data)'));
    console.log(chalk.gray('='.repeat(60)));

    // Pre-process data for optimal display
    const formattedFiles = vaultFiles.map(file => ({
        name: chalk.cyan(file.name),
        path: file.path,
        size_kb: chalk.yellow((file.size / 1024).toFixed(1) + ' KB'),
        modified: file.modified.toLocaleDateString('en-US'),
        tags: file.tags.join(', '),
        links: chalk.green(file.links.toString()),
        backlinks: chalk.blue(file.backlinks.toString())
    }));

    Bun.inspect.table(
        formattedFiles,
        ['name', 'path', 'size_kb', 'modified', 'tags', 'links', 'backlinks']
    );
}

function demonstrateValidationIssuesTable(): void {
    console.log(chalk.bold.red('\n⚠️ Validation Issues (with maxEntryWidth)'));
    console.log(chalk.gray('='.repeat(70)));

    // Pre-process with color coding
    const formattedIssues = validationIssues.map(issue => ({
        id: chalk.bold(issue.id),
        severity: issue.type === 'error' ?
            chalk.bgRed(' ERROR ') :
            chalk.bgYellow(' WARNING '),
        category: chalk.italic(issue.category),
        file: chalk.cyan(issue.file),
        message: issue.message,
        suggestion: chalk.gray(issue.suggestion)
    }));

    Bun.inspect.table(
        formattedIssues,
        ['id', 'severity', 'category', 'file', 'message', 'suggestion'],
        { maxEntryWidth: 35 }
    );
}

function demonstratePerformanceTable(): void {
    console.log(chalk.bold.green('\n🚀 Performance Metrics (Color-coded)'));
    console.log(chalk.gray('='.repeat(55)));

    // Pre-process with performance indicators
    const formattedMetrics = performanceMetrics.map(metric => ({
        operation: chalk.white(metric.operation),
        duration: metric.duration < 5 ?
            chalk.green(`${metric.duration}ms`) :
            metric.duration < 10 ?
                chalk.yellow(`${metric.duration}ms`) :
                chalk.red(`${metric.duration}ms`),
        status: metric.status === 'success' ?
            chalk.green('✅ Success') :
            chalk.yellow('⚠️ Warning'),
        efficiency: metric.efficiency > 150 ?
            chalk.green(`${metric.efficiency}%`) :
            metric.efficiency > 100 ?
                chalk.yellow(`${metric.efficiency}%`) :
                chalk.red(`${metric.efficiency}%`)
    }));

    Bun.inspect.table(
        formattedMetrics,
        ['operation', 'duration', 'status', 'efficiency']
    );
}

function demonstrateCompactTable(): void {
    console.log(chalk.bold.magenta('\n📋 Compact vs Full Comparison'));
    console.log(chalk.gray('='.repeat(50)));

    const sampleData = [
        { name: 'Very Long File Name That Demonstrates Truncation', size: '15.2 KB', type: 'markdown' },
        { name: 'Short Name', size: '2.1 KB', type: 'typescript' },
        { name: 'Medium Length File Name Here', size: '8.7 KB', type: 'markdown' }
    ];

    console.log(chalk.yellow('\n🔸 FULL TABLE:'));
    Bun.inspect.table(sampleData, ['name', 'size', 'type']);

    console.log(chalk.yellow('\n🔸 COMPACT TABLE:'));
    Bun.inspect.table(
        sampleData,
        ['name', 'size', 'type'],
        { compact: true }
    );
}

function demonstrateMaxLinesTable(): void {
    console.log(chalk.bold.blue('\n📊 Max Lines Limitation'));
    console.log(chalk.gray('='.repeat(40)));

    const largeDataset = Array.from({ length: 10 }, (_, i) => ({
        file: `file-${i + 1}.md`,
        size: `${Math.floor(Math.random() * 100) + 1} KB`,
        modified: '2025-11-18'
    }));

    console.log(chalk.gray(`Showing only 3 of ${largeDataset.length} files:`));
    Bun.inspect.table(
        largeDataset,
        ['file', 'size', 'modified'],
        { maxLines: 3 }
    );
}

function demonstrateVaultSummary(): void {
    console.log(chalk.bold.green('\n📈 Vault Summary Report'));
    console.log(chalk.gray('='.repeat(45)));

    // Calculate summary statistics
    const totalFiles = vaultFiles.length;
    const totalSize = vaultFiles.reduce((sum, file) => sum + file.size, 0);
    const errors = validationIssues.filter(i => i.type === 'error').length;
    const warnings = validationIssues.filter(i => i.type === 'warning').length;
    const avgPerformance = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;

    const summaryData = [
        {
            metric: chalk.bold('Total Files'),
            value: chalk.cyan(totalFiles.toString()),
            status: chalk.green('✅')
        },
        {
            metric: chalk.bold('Total Size'),
            value: chalk.yellow((totalSize / 1024).toFixed(1) + ' KB'),
            status: chalk.green('✅')
        },
        {
            metric: chalk.bold('Errors'),
            value: chalk.red(errors.toString()),
            status: errors > 0 ? chalk.red('❌') : chalk.green('✅')
        },
        {
            metric: chalk.bold('Warnings'),
            value: chalk.yellow(warnings.toString()),
            status: warnings > 2 ? chalk.yellow('⚠️') : chalk.green('✅')
        },
        {
            metric: chalk.bold('Avg Performance'),
            value: chalk.magenta(avgPerformance.toFixed(1) + 'ms'),
            status: avgPerformance < 10 ? chalk.green('✅') : chalk.yellow('⚠️')
        }
    ];

    Bun.inspect.table(
        summaryData,
        ['metric', 'value', 'status']
    );
}

async function main(): Promise<void> {
    console.log(chalk.bold.magenta('🎪 Advanced Bun.inspect.table() Demonstration'));
    console.log(chalk.gray('Odds Protocol Vault - Enhanced Data Visualization'));
    console.log(chalk.gray('='.repeat(70)));

    demonstrateBasicTable();
    demonstrateVaultFilesTable();
    demonstrateValidationIssuesTable();
    demonstratePerformanceTable();
    demonstrateCompactTable();
    demonstrateMaxLinesTable();
    demonstrateVaultSummary();

    console.log(chalk.bold.green('\n🎉 Advanced Demonstration Complete!'));
    console.log(chalk.gray('\nKey Features Demonstrated:'));
    console.log(chalk.gray('• Data pre-processing for optimal formatting'));
    console.log(chalk.gray('• Color-coded status indicators'));
    console.log(chalk.gray('• maxEntryWidth for text truncation'));
    console.log(chalk.gray('• compact option for space optimization'));
    console.log(chalk.gray('• maxLines for large dataset limiting'));
    console.log(chalk.gray('• Real-world vault reporting'));
}

if (import.meta.main) {
    main().catch(console.error);
}
