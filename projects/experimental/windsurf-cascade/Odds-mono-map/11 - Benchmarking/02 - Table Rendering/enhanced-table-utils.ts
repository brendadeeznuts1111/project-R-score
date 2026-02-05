#!/usr/bin/env bun

/**
 * Enhanced Table Utilities with Bun.stringWidth()
 * Practical integration for Odds Protocol Vault
 */

import chalk from 'chalk';

// =============================================================================
// CORE WIDTH MANAGEMENT UTILITIES
// =============================================================================

/**
 * Truncates text to specified display width, preserving ANSI codes
 */
export function truncateText(text: string, maxWidth: number): string {
    const displayWidth = Bun.stringWidth(text);
    if (displayWidth <= maxWidth) {
        return text;
    }

    // Extract ANSI codes for preservation
    const ansiCodes: string[] = [];
    let cleanText = text;
    let match;

    // Extract all ANSI codes
    const ansiRegex = /\u001b\[[0-9;]*m/g;
    while ((match = ansiRegex.exec(text)) !== null) {
        ansiCodes.push(match[0]);
    }

    // Remove ANSI codes for measurement
    cleanText = text.replace(ansiRegex, '');

    // Truncate clean text
    let truncated = cleanText;
    while (Bun.stringWidth(truncated) > maxWidth - 3) {
        truncated = truncated.slice(0, -1);
    }

    // Re-apply ANSI codes if they existed at the start
    const firstAnsiCode = ansiCodes[0];
    return firstAnsiCode ? firstAnsiCode + truncated + '...' : truncated + '...';
}

/**
 * Pads text to exact width, accounting for ANSI codes
 */
export function padText(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
    const displayWidth = Bun.stringWidth(text);
    const padding = Math.max(0, width - displayWidth);

    switch (align) {
        case 'right':
            return ' '.repeat(padding) + text;
        case 'center':
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
        default:
            return text + ' '.repeat(padding);
    }
}

/**
 * Calculates optimal column widths based on content
 */
export function calculateOptimalWidths(data: any[], padding: number = 2): { [key: string]: number } {
    if (data.length === 0) return {};

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

/**
 * Creates a well-formatted table with width management
 */
export function createWellFormattedTable(
    data: any[],
    columns: string[],
    maxWidths: { [key: string]: number },
    options: any = {}
): void {
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

// =============================================================================
// VAULT-SPECIFIC TABLE FORMATTERS
// =============================================================================

/**
 * Formats vault file data with proper width management
 */
export function formatVaultFileTable(files: any[], options: { maxNameWidth?: number, maxPathWidth?: number } = {}): void {
    const defaultWidths = {
        name: options.maxNameWidth || 25,
        path: options.maxPathWidth || 30,
        size: 10,
        modified: 12,
        tags: 20,
        status: 10
    };

    const formattedFiles = files.map(file => ({
        name: chalk.cyan(file.name),
        path: chalk.gray(file.path),
        size: chalk.yellow(file.size),
        modified: chalk.blue(file.modified),
        tags: chalk.magenta(file.tags),
        status: file.hasFrontmatter ? chalk.green('✅') : chalk.red('❌')
    }));

    createWellFormattedTable(formattedFiles, Object.keys(defaultWidths), defaultWidths);
}

/**
 * Formats validation issues with width management
 */
export function formatValidationIssues(issues: any[], options: { maxMessageWidth?: number } = {}): void {
    const defaultWidths = {
        type: 12,
        category: 15,
        file: 25,
        line: 6,
        message: options.maxMessageWidth || 40,
        suggestion: 30
    };

    const formattedIssues = issues.map(issue => ({
        type: issue.type === 'error' ?
            chalk.bgRed(' ERROR ') :
            issue.type === 'warning' ?
                chalk.bgYellow(' WARNING ') :
                chalk.bgBlue(' INFO '),
        category: chalk.italic(issue.category),
        file: chalk.cyan(issue.file),
        line: chalk.gray(issue.line.toString()),
        message: chalk.yellow(issue.message),
        suggestion: chalk.gray(issue.suggestion)
    }));

    createWellFormattedTable(
        formattedIssues,
        Object.keys(defaultWidths),
        defaultWidths,
        { compact: true }
    );
}

/**
 * Formats performance metrics with tight width control
 */
export function formatPerformanceMetrics(metrics: any[]): void {
    const defaultWidths = {
        operation: 20,
        duration: 10,
        status: 10,
        efficiency: 12
    };

    const formattedMetrics = metrics.map(metric => ({
        operation: chalk.white(metric.operation),
        duration: metric.duration < 5 ?
            chalk.green(`${metric.duration}ms`) :
            chalk.red(`${metric.duration}ms`),
        status: metric.status === 'success' ?
            chalk.green('✅') :
            chalk.yellow('⚠️'),
        efficiency: metric.efficiency > 120 ?
            chalk.green(`${metric.efficiency}%`) :
            chalk.yellow(`${metric.efficiency}%`)
    }));

    createWellFormattedTable(
        formattedMetrics,
        Object.keys(defaultWidths),
        defaultWidths,
        { compact: true }
    );
}

// =============================================================================
// ADVANCED WIDTH MANAGEMENT
// =============================================================================

/**
 * Creates responsive table that adapts to terminal width
 */
export function createResponsiveTable(data: any[], columns: string[], minColumnWidth: number = 10): void {
    // Get terminal width (fallback to 80)
    const terminalWidth = process.stdout.columns || 80;

    // Calculate optimal widths
    const optimalWidths = calculateOptimalWidths(data, 2);

    // Calculate total required width
    const totalRequiredWidth = Object.values(optimalWidths).reduce((sum, width) => sum + width, 0);

    // Adjust widths if necessary
    let adjustedWidths = { ...optimalWidths };
    if (totalRequiredWidth > terminalWidth) {
        const scaleFactor = (terminalWidth - (columns.length * 4)) / totalRequiredWidth;

        columns.forEach(column => {
            adjustedWidths[column] = Math.max(
                minColumnWidth,
                Math.floor(optimalWidths[column] * scaleFactor)
            );
        });
    }

    createWellFormattedTable(data, columns, adjustedWidths);
}

/**
 * Creates summary statistics table
 */
export function createSummaryTable(stats: { [key: string]: any }): void {
    const summaryData = Object.entries(stats).map(([key, value]) => ({
        metric: chalk.bold(key),
        value: typeof value === 'string' ? chalk.cyan(value) : chalk.yellow(value.toString()),
        status: value.toString().includes('error') || parseInt(value.toString()) > 0 ?
            chalk.red('❌') :
            chalk.green('✅')
    }));

    const widths = {
        metric: 20,
        value: 15,
        status: 10
    };

    createWellFormattedTable(summaryData, Object.keys(widths), widths);
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

async function demonstrateWidthManagement(): Promise<void> {
    console.log(chalk.bold.magenta('🎯 Enhanced Table Utilities with Bun.stringWidth()'));
    console.log(chalk.gray('Odds Protocol Vault - Width Management Solutions'));
    console.log(chalk.gray('='.repeat(80)));

    // Sample data with problematic widths
    const sampleFiles = [
        {
            name: 'Very-Long-Filename-That-Demonstrates-Width-Problems.md',
            path: '01 - Daily Notes/02 - Journals/',
            size: '2.4 KB',
            modified: '2025-11-18',
            tags: 'daily, journal, productivity',
            hasFrontmatter: true
        },
        {
            name: 'Short.md',
            path: '02 - Architecture/',
            size: '5.1 KB',
            modified: '2025-11-17',
            tags: 'architecture',
            hasFrontmatter: true
        }
    ];

    const sampleIssues = [
        {
            type: 'error',
            category: 'Structure',
            file: 'Very-Long-Filename-With-Width-Issues.md',
            line: 42,
            message: 'This is an extremely long validation message that would normally break table layout',
            suggestion: 'Break into shorter lines'
        }
    ];

    const sampleMetrics = [
        { operation: 'File Validation Process', duration: 2.3, status: 'success', efficiency: 107 },
        { operation: 'Template Processing', duration: 5.7, status: 'success', efficiency: 146 }
    ];

    console.log(chalk.bold.cyan('\n📁 Vault Files (Width Managed):'));
    formatVaultFileTable(sampleFiles, { maxNameWidth: 20, maxPathWidth: 25 });

    console.log(chalk.bold.cyan('\n⚠️  Validation Issues (Width Managed):'));
    formatValidationIssues(sampleIssues, { maxMessageWidth: 35 });

    console.log(chalk.bold.cyan('\n🚀 Performance Metrics (Width Managed):'));
    formatPerformanceMetrics(sampleMetrics);

    console.log(chalk.bold.cyan('\n📊 Summary Statistics:'));
    createSummaryTable({
        'Total Files': 42,
        'Total Size': '156.3 KB',
        'Errors': 0,
        'Warnings': 2
    });

    console.log(chalk.bold.cyan('\n📱 Responsive Table (Adapts to Terminal):'));
    createResponsiveTable(sampleFiles, ['name', 'size', 'modified'], 10);

    console.log(chalk.bold.green('\n🎉 Enhanced Table Utilities Complete!'));
}

// Run demonstration if called directly
if (import.meta.main) {
    demonstrateWidthManagement().catch(console.error);
}
