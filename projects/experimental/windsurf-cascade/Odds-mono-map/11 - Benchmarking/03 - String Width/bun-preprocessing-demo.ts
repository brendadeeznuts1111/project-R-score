#!/usr/bin/env bun

/**
 * Bun.stringWidth() Pre-processing Utilities
 * Smart pre-truncation and conditional formatting for Bun.inspect.table()
 */

import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Bun.stringWidth() Pre-processing Utilities'));
console.log(chalk.gray('Odds Protocol Vault - Smart Data Preparation'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// PRE-TRUNCATION UTILITIES
// =============================================================================

console.log(chalk.bold.cyan('\n✂️  1. Pre-truncation for Table Preparation'));

/**
 * Smart snippet creation with visual width awareness
 */
export function createVisualSnippet(content: string, maxWidth: number, suffix: string = '...'): string {
    const visualWidth = Bun.stringWidth(content);

    if (visualWidth <= maxWidth) {
        return content;
    }

    // Calculate how much content to keep
    const targetWidth = maxWidth - Bun.stringWidth(suffix);
    let truncated = content;

    // Truncate character by character until visual width fits
    while (Bun.stringWidth(truncated) > targetWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }

    return truncated + suffix;
}

/**
 * Advanced snippet with word boundary awareness
 */
export function createSmartSnippet(content: string, maxWidth: number): string {
    const visualWidth = Bun.stringWidth(content);

    if (visualWidth <= maxWidth) {
        return content;
    }

    const targetWidth = maxWidth - 3; // Account for '...'
    let truncated = content;

    // Try to truncate at word boundary first
    const words = content.split(' ');
    let result = '';

    for (const word of words) {
        const testResult = result + (result ? ' ' : '') + word;
        if (Bun.stringWidth(testResult) <= targetWidth) {
            result = testResult;
        } else {
            break;
        }
    }

    return result ? result + '...' : content.slice(0, targetWidth) + '...';
}

// Demonstrate pre-truncation
const sampleContents = [
    'This is a very very very long piece of content from a document that needs to be truncated for table display',
    'Short content',
    'Content with emoji 🚀 and Unicode こんにちは that should be measured correctly',
    'Medium length content that fits within limits but demonstrates the logic'
];

console.log(chalk.gray('Creating visual snippets for table preparation:'));
sampleContents.forEach((content, index) => {
    const snippet = createVisualSnippet(content, 40);
    const smartSnippet = createSmartSnippet(content, 40);

    console.log(chalk.yellow(`\nContent ${index + 1}:`));
    console.log(chalk.gray(`Original: ${content}`));
    console.log(chalk.cyan(`Visual:   ${snippet} (${Bun.stringWidth(snippet)} chars)`));
    console.log(chalk.blue(`Smart:    ${smartSnippet} (${Bun.stringWidth(smartSnippet)} chars)`));
});

// =============================================================================
// CONDITIONAL FORMATTING UTILITIES
// =============================================================================

console.log(chalk.bold.cyan('\n🎨 2. Conditional Formatting Based on Visual Width'));

/**
 * Apply conditional styling based on visual width
 */
export function applyConditionalWidthStyling(text: string, thresholds: {
    short?: number,
    medium?: number,
    long?: number
}): string {
    const visualWidth = Bun.stringWidth(text);

    if (thresholds.short && visualWidth <= thresholds.short) {
        return chalk.green(text); // Short - good
    } else if (thresholds.medium && visualWidth <= thresholds.medium) {
        return chalk.yellow(text); // Medium - warning
    } else if (thresholds.long && visualWidth <= thresholds.long) {
        return chalk.orange(text); // Long - caution
    } else {
        return chalk.red(text); // Very long - problem
    }
}

/**
 * Generate width-based warnings
 */
export function generateWidthWarnings(data: any[], field: string, thresholds: {
    warning?: number,
    error?: number
}): string[] {
    const warnings: string[] = [];

    data.forEach((item, index) => {
        const value = item[field];
        if (value) {
            const visualWidth = Bun.stringWidth(value);

            if (thresholds.error && visualWidth > thresholds.error) {
                warnings.push(`❌ Item ${index + 1}: ${field} too long (${visualWidth} > ${thresholds.error})`);
            } else if (thresholds.warning && visualWidth > thresholds.warning) {
                warnings.push(`⚠️  Item ${index + 1}: ${field} quite long (${visualWidth} > ${thresholds.warning})`);
            }
        }
    });

    return warnings;
}

// Demonstrate conditional formatting
const sampleFileNames = [
    'short.md',
    'medium-length-filename.md',
    'very-long-filename-that-exceeds-normal-limits-and-should-be-flagged.md',
    'extremely-long-filename-that-definitely-causes-problems-in-table-layouts-and-needs-attention.md'
];

console.log(chalk.gray('Conditional formatting based on filename length:'));
sampleFileNames.forEach(filename => {
    const styled = applyConditionalWidthStyling(filename, { short: 15, medium: 30, long: 50 });
    const width = Bun.stringWidth(filename);
    console.log(`${styled} ${chalk.gray(`(${width} chars)`)}`);
});

// =============================================================================
// VAULT-SPECIFIC PRE-PROCESSING
// =============================================================================

console.log(chalk.bold.cyan('\n📁 3. Vault-Specific Pre-processing Examples'));

// Sample vault data with problematic fields
const rawVaultData = [
    {
        name: '2025-11-18-Daily-Productivity-Review-With-Detailed-Analysis.md',
        path: '01 - Daily Notes/02 - Journals/',
        content: 'This is an extremely long piece of content from a daily note that contains detailed analysis of productivity metrics, task completion rates, time tracking data, and comprehensive project updates that would normally break table formatting if not properly pre-processed',
        tags: ['daily', 'journal', 'productivity', 'analysis', 'metrics', 'tracking'],
        status: 'validated'
    },
    {
        name: 'OddsTick-Data-Model-Specification.md',
        path: '02 - Architecture/01 - Data Models/',
        content: 'Interface definition for odds tick data structure',
        tags: ['architecture', 'data-model'],
        status: 'validated'
    },
    {
        name: 'Very-Long-Template-Name-For-Demonstration-Purposes.md',
        path: '06 - Templates/01 - Note Templates/',
        content: 'Template content with placeholder variables and formatting instructions',
        tags: ['template', 'demo'],
        status: 'draft'
    }
];

/**
 * Pre-process vault data for optimal table display
 */
export function preprocessVaultData(data: any[], options: {
    maxNameWidth?: number,
    maxContentWidth?: number,
    maxTagsWidth?: number
} = {}): any[] {
    const defaultOptions = {
        maxNameWidth: 25,
        maxContentWidth: 50,
        maxTagsWidth: 30
    };

    const opts = { ...defaultOptions, ...options };

    return data.map(item => ({
        name: createSmartSnippet(item.name, opts.maxNameWidth),
        path: item.path,
        content: createVisualSnippet(item.content, opts.maxContentWidth),
        tags: Array.isArray(item.tags) ?
            createVisualSnippet(item.tags.join(', '), opts.maxTagsWidth) :
            item.tags,
        status: item.status
    }));
}

/**
 * Generate vault data quality report
 */
export function generateVaultQualityReport(data: any[]): void {
    console.log(chalk.bold.blue('\n📊 Vault Data Quality Report:'));

    // Check filename lengths
    const nameWarnings = generateWidthWarnings(data, 'name', { warning: 25, error: 40 });
    if (nameWarnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Filename Length Warnings:'));
        nameWarnings.forEach(warning => console.log(chalk.gray(`   ${warning}`)));
    }

    // Check content lengths
    const contentWarnings = generateWidthWarnings(data, 'content', { warning: 60, error: 100 });
    if (contentWarnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Content Length Warnings:'));
        contentWarnings.forEach(warning => console.log(chalk.gray(`   ${warning}`)));
    }

    // Summary statistics
    const avgNameLength = data.reduce((sum, item) => sum + Bun.stringWidth(item.name), 0) / data.length;
    const avgContentLength = data.reduce((sum, item) => sum + Bun.stringWidth(item.content || ''), 0) / data.length;

    console.log(chalk.green('\n📈 Summary Statistics:'));
    console.log(chalk.gray(`   Average filename length: ${avgNameLength.toFixed(1)} chars`));
    console.log(chalk.gray(`   Average content length: ${avgContentLength.toFixed(1)} chars`));
    console.log(chalk.gray(`   Total files processed: ${data.length}`));
}

// Demonstrate vault pre-processing
console.log(chalk.gray('Original vault data (problematic widths):'));
Bun.inspect.table(rawVaultData, ['name', 'path', 'content', 'status']);

console.log(chalk.gray('\nPre-processed vault data (optimal widths):'));
const processedData = preprocessVaultData(rawVaultData);
Bun.inspect.table(processedData, ['name', 'path', 'content', 'status']);

// Generate quality report
generateVaultQualityReport(rawVaultData);

// =============================================================================
// ADVANCED PRE-PROCESSING SCENARIOS
// =============================================================================

console.log(chalk.bold.cyan('\n🔧 4. Advanced Pre-processing Scenarios'));

/**
 * Dynamic width allocation based on content analysis
 */
export function calculateDynamicWidths(data: any[], totalWidth: number): { [key: string]: number } {
    const columns = Object.keys(data[0] || {});
    const widths: { [key: string]: number } = {};

    // Calculate minimum required widths
    const minWidths: { [key: string]: number } = {};
    columns.forEach(col => {
        minWidths[col] = Math.max(
            col.length,
            ...data.map(item => Bun.stringWidth(item[col] || '').toString())
        );
    });

    // Calculate total minimum width
    const totalMinWidth = Object.values(minWidths).reduce((sum, width) => sum + width, 0);

    if (totalMinWidth <= totalWidth) {
        // Distribute extra space proportionally
        const extraSpace = totalWidth - totalMinWidth;
        columns.forEach(col => {
            const proportion = minWidths[col] / totalMinWidth;
            widths[col] = minWidths[col] + Math.floor(extraSpace * proportion);
        });
    } else {
        // Scale down proportionally
        const scaleFactor = totalWidth / totalMinWidth;
        columns.forEach(col => {
            widths[col] = Math.max(5, Math.floor(minWidths[col] * scaleFactor));
        });
    }

    return widths;
}

/**
 * Context-aware truncation (preserves important parts)
 */
export function createContextAwareSnippet(text: string, maxWidth: number, context: 'filename' | 'path' | 'content' = 'content'): string {
    const visualWidth = Bun.stringWidth(text);

    if (visualWidth <= maxWidth) {
        return text;
    }

    switch (context) {
        case 'filename':
            // Keep extension and start of name
            const parts = text.split('.');
            const extension = parts.length > 1 ? '.' + parts.pop() : '';
            const name = parts.join('.');
            const nameSnippet = createVisualSnippet(name, maxWidth - Bun.stringWidth(extension));
            return nameSnippet + extension;

        case 'path':
            // Keep start and end of path
            const pathParts = text.split('/');
            if (pathParts.length <= 2) return createVisualSnippet(text, maxWidth);

            const start = pathParts[0];
            const end = pathParts[pathParts.length - 1];
            const middleWidth = maxWidth - Bun.stringWidth(start) - Bun.stringWidth(end) - 6; // Account for "/.../"

            if (middleWidth > 0) {
                return `${start}/.../${end}`;
            } else {
                return createVisualSnippet(text, maxWidth);
            }

        default:
            return createSmartSnippet(text, maxWidth);
    }
}

// Demonstrate advanced scenarios
console.log(chalk.gray('Dynamic width allocation:'));
const dynamicWidths = calculateDynamicWidths(rawVaultData, 80);
console.log(chalk.cyan('Calculated column widths:'));
Object.entries(dynamicWidths).forEach(([col, width]) => {
    console.log(chalk.gray(`   ${col}: ${width} chars`));
});

console.log(chalk.gray('\nContext-aware truncation:'));
const advancedExamples = [
    { text: 'very-long-filename-with-extension.md', context: 'filename' as const },
    { text: '01 - Daily Notes/02 - Journals/2025-11-18.md', context: 'path' as const },
    { text: 'This is important content that should preserve the beginning when truncated', context: 'content' as const }
];

advancedExamples.forEach(example => {
    const snippet = createContextAwareSnippet(example.text, 25, example.context);
    console.log(chalk.cyan(`${example.context}: ${snippet}`));
});

// =============================================================================
// INTEGRATION WITH Bun.inspect.table()
// =============================================================================

console.log(chalk.bold.cyan('\n🔗 5. Integration with Bun.inspect.table()'));

/**
 * Complete pipeline: pre-process → display
 */
export function displayOptimizedTable(data: any[], columns: string[], options: {
    totalWidth?: number,
    truncateContent?: boolean
} = {}): void {
    const opts = { totalWidth: 100, truncateContent: true, ...options };

    // Pre-process data
    const processedData = data.map(item => {
        const processed: any = {};
        columns.forEach(col => {
            const value = item[col] || '';

            if (opts.truncateContent && typeof value === 'string') {
                // Use context-aware truncation
                if (col === 'name' || col.includes('file')) {
                    processed[col] = createContextAwareSnippet(value, 25, 'filename');
                } else if (col === 'path') {
                    processed[col] = createContextAwareSnippet(value, 30, 'path');
                } else if (col === 'content' || col === 'description') {
                    processed[col] = createContextAwareSnippet(value, 40, 'content');
                } else {
                    processed[col] = createSmartSnippet(value, 20);
                }
            } else {
                processed[col] = value;
            }
        });
        return processed;
    });

    // Display with Bun.inspect.table()
    Bun.inspect.table(processedData, columns);
}

// Demonstrate complete integration
console.log(chalk.gray('Complete pre-processing pipeline:'));
displayOptimizedTable(rawVaultData, ['name', 'path', 'content', 'status'], {
    totalWidth: 80,
    truncateContent: true
});

// =============================================================================
// QUICK REFERENCE
// =============================================================================

console.log(chalk.bold.magenta('\n🎯 Quick Reference Summary'));
console.log(chalk.gray('='.repeat(50)));

console.log(chalk.bold.cyan('\n✂️  Pre-truncation Functions:'));
console.log(chalk.gray('createVisualSnippet(text, maxWidth)           // Basic visual truncation'));
console.log(chalk.gray('createSmartSnippet(text, maxWidth)            // Word-boundary aware'));
console.log(chalk.gray('createContextAwareSnippet(text, maxWidth, context)  // Context-specific'));

console.log(chalk.bold.cyan('\n🎨 Conditional Formatting:'));
console.log(chalk.gray('applyConditionalWidthStyling(text, thresholds)  // Style by length'));
console.log(chalk.gray('generateWidthWarnings(data, field, thresholds)  // Create warnings'));

console.log(chalk.bold.cyan('\n📁 Vault Pre-processing:'));
console.log(chalk.gray('preprocessVaultData(data, options)             // Format vault data'));
console.log(chalk.gray('generateVaultQualityReport(data)               // Quality analysis'));

console.log(chalk.bold.cyan('\n🔧 Advanced Features:'));
console.log(chalk.gray('calculateDynamicWidths(data, totalWidth)       // Auto-width calculation'));
console.log(chalk.gray('displayOptimizedTable(data, columns, options)  // Complete pipeline'));

console.log(chalk.bold.cyan('\n✅ Benefits:'));
console.log(chalk.gray('• Smart pre-truncation before table display'));
console.log(chalk.gray('• Conditional formatting based on visual width'));
console.log(chalk.gray('• Context-aware truncation strategies'));
console.log(chalk.gray('• Quality analysis and warnings'));
console.log(chalk.gray('• Dynamic width allocation'));
console.log(chalk.gray('• Complete integration pipeline'));

console.log(chalk.bold.green('\n🎉 Pre-processing Utilities Complete!'));
