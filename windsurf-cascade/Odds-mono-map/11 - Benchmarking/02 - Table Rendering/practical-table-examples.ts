#!/usr/bin/env bun

/**
 * Practical Bun.inspect.table() Examples
 * Using your actual vault data structures with optimal formatting
 */

import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Practical Bun.inspect.table() Examples'));
console.log(chalk.gray('Odds Protocol Vault - Real Data Implementation'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// SAMPLE VAULT DATA (Based on your structures)
// =============================================================================

// Sample vault files with realistic data
const rawVaultFiles = [
    {
        path: '01 - Daily Notes/02 - Journals/2025-11-18.md',
        name: '2025-11-18',
        extension: 'md',
        size: 2456,
        createdAt: new Date('2025-11-18T08:00:00Z'),
        modifiedAt: new Date('2025-11-18T16:30:00Z'),
        content: '# Daily Note\n\n## Productivity\n- Completed vault validation\n- Updated documentation',
        tags: ['daily', 'journal', 'productivity'],
        links: ['[[2025-11-17]]', '[[Project-Plan]]'],
        backlinks: ['[[Weekly-Review]]'],
        hasFrontmatter: true,
        wordCount: 156
    },
    {
        path: '02 - Architecture/01 - Data Models/OddsTick.md',
        name: 'OddsTick',
        extension: 'md',
        size: 5120,
        createdAt: new Date('2025-11-15T14:00:00Z'),
        modifiedAt: new Date('2025-11-17T14:15:00Z'),
        content: '# Odds Tick Data Model\n\n## Interface Definition\n```typescript\ninterface OddsTick {\n  timestamp: number;\n  value: number;\n}\n```',
        tags: ['architecture', 'data-model', 'core'],
        links: ['[[API-Documentation]]', '[[Database-Schema]]'],
        backlinks: ['[[System-Overview]]', '[[Developer-Guide]]'],
        hasFrontmatter: true,
        wordCount: 342
    },
    {
        path: '03 - Development/01 - Code Snippets/bun-utilities.ts',
        name: 'bun-utilities',
        extension: 'ts',
        size: 8192,
        createdAt: new Date('2025-11-10T09:00:00Z'),
        modifiedAt: new Date('2025-11-18T16:45:00Z'),
        content: '// Bun utilities demonstration\nimport { Bun } from \'bun\';\n\n// Performance utilities\nexport function measureTime<T>(fn: () => T): { result: T; duration: number } {',
        tags: ['development', 'typescript', 'utilities', 'performance'],
        links: ['[[TypeScript-Guide]]', '[[Performance-Benchmarks]]'],
        backlinks: [],
        hasFrontmatter: false,
        wordCount: 523
    },
    {
        path: '04 - Documentation/02 - Guides/Getting-Started.md',
        name: 'Getting-Started',
        extension: 'md',
        size: 15360,
        createdAt: new Date('2025-11-01T10:00:00Z'),
        modifiedAt: new Date('2025-11-16T11:20:00Z'),
        content: '# Getting Started with Odds Protocol Vault\n\n## Installation\n1. Clone the repository\n2. Install dependencies with bun\n3. Run the setup script',
        tags: ['documentation', 'guide', 'onboarding', 'setup'],
        links: ['[[Installation]]', '[[Configuration]]', '[[First-Project]]'],
        backlinks: ['[[README]]', '[[Homepage]]'],
        hasFrontmatter: true,
        wordCount: 1250
    },
    {
        path: '06 - Templates/01 - Note Templates/Daily-Note.md',
        name: 'Daily-Note',
        extension: 'md',
        size: 1024,
        createdAt: new Date('2025-10-20T12:00:00Z'),
        modifiedAt: new Date('2025-11-18T09:00:00Z'),
        content: '# Daily Note - {{date}}\n\n## 📋 Tasks\n- [ ] \n\n## 📝 Notes\n\n## 🎯 Goals\n\n## 📊 Progress',
        tags: ['template', 'daily', 'note'],
        links: [],
        backlinks: [['2025-11-18'], ['2025-11-17'], ['2025-11-16']],
        hasFrontmatter: true,
        wordCount: 85
    }
];

// Sample validation issues
const rawValidationIssues = [
    {
        id: 'L001',
        type: 'warning',
        ruleCategory: 'Linter',
        file: '04 - Documentation/02 - Guides/Getting-Started.md',
        line: 42,
        column: 125,
        message: 'Line too long (125 chars, max 100) detected in markdown content',
        suggestion: 'Break line into multiple shorter lines or use proper markdown formatting',
        severity: 'medium',
        timestamp: new Date('2025-11-18T16:50:00Z'),
        autoFixable: true
    },
    {
        id: 'H001',
        type: 'error',
        ruleCategory: 'Structure',
        file: '06 - Templates/02 - Project Templates/Misconfigured-Template.md',
        line: 8,
        column: 1,
        message: 'Multiple H1 headings found in a single document',
        suggestion: 'Ensure only one top-level heading (#) per document',
        severity: 'high',
        timestamp: new Date('2025-11-18T16:48:00Z'),
        autoFixable: false
    },
    {
        id: 'LNK001',
        type: 'warning',
        ruleCategory: 'Links',
        file: '01 - Daily Notes/02 - Journals/2025-11-18.md',
        line: 15,
        column: 23,
        message: 'Broken link detected: [[Non-Existent-Document]] points to missing file',
        suggestion: 'Update the link to point to an existing document or create the missing file',
        severity: 'medium',
        timestamp: new Date('2025-11-18T16:45:00Z'),
        autoFixable: true
    },
    {
        id: 'FMT001',
        type: 'info',
        ruleCategory: 'Formatting',
        file: '03 - Development/01 - Code Snippets/bun-utilities.ts',
        line: 25,
        column: 1,
        message: 'Missing trailing semicolon in TypeScript code',
        suggestion: 'Add semicolon at end of statement for consistency',
        severity: 'low',
        timestamp: new Date('2025-11-18T16:42:00Z'),
        autoFixable: true
    },
    {
        id: 'TAG001',
        type: 'warning',
        ruleCategory: 'Metadata',
        file: '02 - Architecture/01 - Data Models/OddsTick.md',
        line: 1,
        column: 1,
        message: 'Missing required tags in frontmatter (expected: architecture, data-model)',
        suggestion: 'Add missing tags to the YAML frontmatter section',
        severity: 'low',
        timestamp: new Date('2025-11-18T16:40:00Z'),
        autoFixable: true
    }
];

// Sample task statuses
const rawTaskStatuses = [
    {
        symbol: ' ',
        name: 'Todo',
        nextStatusSymbol: 'x',
        type: 'pending',
        description: 'Task not yet started',
        color: 'gray'
    },
    {
        symbol: '/',
        name: 'In Progress',
        nextStatusSymbol: 'x',
        type: 'active',
        description: 'Task currently being worked on',
        color: 'blue'
    },
    {
        symbol: 'x',
        name: 'Done',
        nextStatusSymbol: ' ',
        type: 'completed',
        description: 'Task completed successfully',
        color: 'green'
    },
    {
        symbol: '-',
        name: 'Cancelled',
        nextStatusSymbol: ' ',
        type: 'cancelled',
        description: 'Task cancelled or no longer needed',
        color: 'red'
    },
    {
        symbol: '>',
        name: 'Forwarded',
        nextStatusSymbol: 'x',
        type: 'deferred',
        description: 'Task forwarded to future date',
        color: 'orange'
    }
];

// =============================================================================
// DATA MAPPING AND FORMATTING
// =============================================================================

console.log(chalk.bold.cyan('\n📁 1. Vault Files Table'));
console.log(chalk.gray('Mapping raw file data to display format...'));

// Map vault files for optimal display
const mappedFiles = rawVaultFiles.map(file => ({
    fileName: chalk.cyan(file.name),
    directory: chalk.gray(file.path.split('/').slice(0, -1).join('/')),
    sizeKB: chalk.yellow((file.size / 1024).toFixed(1) + ' KB'),
    modified: file.modifiedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }),
    tags: file.tags.map(tag => chalk.magenta(`#${tag}`)).join(', '),
    hasFrontmatter: file.hasFrontmatter ? chalk.green('✅') : chalk.red('❌')
}));

console.log(chalk.green('\n📋 Displaying mapped files:'));
Bun.inspect.table(
    mappedFiles,
    ['fileName', 'directory', 'sizeKB', 'modified', 'tags', 'hasFrontmatter']
);

console.log(chalk.bold.cyan('\n⚠️  2. Validation Issues Table'));
console.log(chalk.gray('Mapping validation issues with severity indicators...'));

// Map validation issues with color coding
const mappedIssues = rawValidationIssues.map(issue => ({
    type: issue.type === 'error' ?
        chalk.bgRed(' ERROR ') :
        issue.type === 'warning' ?
            chalk.bgYellow(' WARNING ') :
            chalk.bgBlue(' INFO '),
    ruleCategory: chalk.italic(issue.ruleCategory),
    file: chalk.cyan(issue.file.split('/').pop()), // Just filename
    line: chalk.gray(issue.line.toString()),
    message: issue.message,
    suggestion: chalk.gray(issue.suggestion)
}));

console.log(chalk.green('\n📋 Displaying mapped issues:'));
Bun.inspect.table(
    mappedIssues,
    ['type', 'ruleCategory', 'file', 'line', 'message', 'suggestion'],
    {
        maxEntryWidth: 40, // Limit text width for readability
        compact: true // Reduce padding for more content
    }
);

console.log(chalk.bold.cyan('\n✅ 3. Task Statuses Table'));
console.log(chalk.gray('Mapping task statuses with visual indicators...'));

// Map task statuses with visual formatting
const taskStatuses = rawTaskStatuses.map(status => ({
    symbol: chalk.bold(status.symbol),
    name: chalk.white(status.name),
    nextStatusSymbol: chalk.gray(status.nextStatusSymbol),
    type: status.type === 'completed' ?
        chalk.green(status.type) :
        status.type === 'active' ?
            chalk.blue(status.type) :
            status.type === 'cancelled' ?
                chalk.red(status.type) :
                chalk.gray(status.type)
}));

console.log(chalk.green('\n📋 Displaying task statuses:'));
Bun.inspect.table(
    taskStatuses,
    ['symbol', 'name', 'nextStatusSymbol', 'type']
);

// =============================================================================
// ADVANCED EXAMPLES WITH DIFFERENT OPTIONS
// =============================================================================

console.log(chalk.bold.cyan('\n🎯 4. Advanced Formatting Examples'));

// Compact file listing for space-constrained environments
console.log(chalk.yellow('\n📐 Compact File Listing:'));
const compactFiles = rawVaultFiles.map(file => ({
    name: file.name,
    size: (file.size / 1024).toFixed(1) + 'KB',
    type: file.extension,
    modified: file.modifiedAt.toLocaleDateString()
}));

Bun.inspect.table(
    compactFiles,
    ['name', 'size', 'type', 'modified'],
    { compact: true }
);

// Summary statistics table
console.log(chalk.yellow('\n📊 Vault Summary Statistics:'));
const totalFiles = rawVaultFiles.length;
const totalSize = rawVaultFiles.reduce((sum, file) => sum + file.size, 0);
const filesWithFrontmatter = rawVaultFiles.filter(f => f.hasFrontmatter).length;
const errorCount = rawValidationIssues.filter(i => i.type === 'error').length;
const warningCount = rawValidationIssues.filter(i => i.type === 'warning').length;

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
        metric: chalk.bold('With Frontmatter'),
        value: chalk.cyan(`${filesWithFrontmatter}/${totalFiles}`),
        status: filesWithFrontmatter === totalFiles ? chalk.green('✅') : chalk.yellow('⚠️')
    },
    {
        metric: chalk.bold('Errors'),
        value: chalk.red(errorCount.toString()),
        status: errorCount > 0 ? chalk.red('❌') : chalk.green('✅')
    },
    {
        metric: chalk.bold('Warnings'),
        value: chalk.yellow(warningCount.toString()),
        status: warningCount > 3 ? chalk.yellow('⚠️') : chalk.green('✅')
    }
];

Bun.inspect.table(
    summaryData,
    ['metric', 'value', 'status']
);

// Large dataset demonstration with maxLines
console.log(chalk.yellow('\n📈 Top 3 Largest Files (maxLines example):'));
const sortedBySize = rawVaultFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .map(file => ({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        words: file.wordCount.toString(),
        modified: file.modifiedAt.toLocaleDateString()
    }));

Bun.inspect.table(
    sortedBySize,
    ['name', 'size', 'words', 'modified'],
    { maxLines: 3 }
);

// =============================================================================
// REAL-WORLD WORKFLOW EXAMPLES
// =============================================================================

console.log(chalk.bold.cyan('\n🔄 5. Real-World Workflow Examples'));

// Validation report for CI/CD
console.log(chalk.yellow('\n🚀 CI/CD Validation Report:'));
const criticalIssues = rawValidationIssues.filter(i => i.type === 'error');
if (criticalIssues.length > 0) {
    const ciReport = criticalIssues.map(issue => ({
        file: issue.file.split('/').pop(),
        line: issue.line.toString(),
        issue: issue.message,
        fixable: issue.autoFixable ? chalk.green('Yes') : chalk.red('No')
    }));

    console.log(chalk.red('\n❌ Critical Issues Found:'));
    Bun.inspect.table(
        ciReport,
        ['file', 'line', 'issue', 'fixable'],
        { maxEntryWidth: 30 }
    );
} else {
    console.log(chalk.green('\n✅ No critical issues found!'));
}

// Performance metrics dashboard
console.log(chalk.yellow('\n📊 Performance Metrics Dashboard:'));
const performanceData = [
    { operation: 'File Validation', duration: 2.3, status: 'success', efficiency: 107 },
    { operation: 'Template Processing', duration: 5.7, status: 'success', efficiency: 146 },
    { operation: 'Link Analysis', duration: 12.1, status: 'warning', efficiency: 85 },
    { operation: 'Cache Update', duration: 0.8, status: 'success', efficiency: 95 }
];

const formattedPerformance = performanceData.map(metric => ({
    operation: chalk.white(metric.operation),
    duration: metric.duration < 5 ?
        chalk.green(`${metric.duration}ms`) :
        metric.duration < 10 ?
            chalk.yellow(`${metric.duration}ms`) :
            chalk.red(`${metric.duration}ms`),
    status: metric.status === 'success' ?
        chalk.green('✅') :
        chalk.yellow('⚠️'),
    efficiency: metric.efficiency > 120 ?
        chalk.green(`${metric.efficiency}%`) :
        chalk.yellow(`${metric.efficiency}%`)
}));

Bun.inspect.table(
    formattedPerformance,
    ['operation', 'duration', 'status', 'efficiency']
);

// =============================================================================
// QUICK REFERENCE
// =============================================================================

console.log(chalk.bold.magenta('\n🎯 Quick Reference Summary'));
console.log(chalk.gray('='.repeat(50)));

console.log(chalk.bold.cyan('\n📋 Your Data Structures:'));
console.log(chalk.gray('• mappedFiles: fileName, directory, sizeKB, modified, tags, hasFrontmatter'));
console.log(chalk.gray('• mappedIssues: type, ruleCategory, file, line, message, suggestion'));
console.log(chalk.gray('• taskStatuses: symbol, name, nextStatusSymbol, type'));

console.log(chalk.bold.cyan('\n🔧 Best Practices Used:'));
console.log(chalk.gray('• Data pre-processing with chalk for colors'));
console.log(chalk.gray('• maxEntryWidth for text truncation'));
console.log(chalk.gray('• compact option for space optimization'));
console.log(chalk.gray('• maxLines for large dataset limiting'));
console.log(chalk.gray('• Consistent property ordering'));
console.log(chalk.gray('• Status indicators with emojis'));

console.log(chalk.bold.cyan('\n✅ Available Commands:'));
console.log(chalk.gray('bun run benchmark:table     # Advanced demonstration'));
console.log(chalk.gray('bun run benchmark:reference # Complete reference'));

console.log(chalk.bold.green('\n🎉 Practical Examples Complete!'));

export { mappedFiles, mappedIssues, taskStatuses };
