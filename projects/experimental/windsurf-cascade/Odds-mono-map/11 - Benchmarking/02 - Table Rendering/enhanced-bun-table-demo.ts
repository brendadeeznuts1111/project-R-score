#!/usr/bin/env bun

/**
 * Enhanced Bun Utilities Demonstration Script
 * Advanced showcase of Bun.inspect.table() with Odds Protocol Vault integration
 * 
 * @fileoverview Demonstrates powerful table formatting, data processing, and vault-specific applications
 * @author Odds Protocol Team
 * @version 2.0.0
 * @since 2025-11-18
 */

import chalk from 'chalk';

// =============================================================================
// VAULT TYPE DEFINITIONS (Enhanced for demonstration)
// =============================================================================

interface VaultFile {
    path: string;
    name: string;
    extension: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    content: string;
    tags: string[];
    links: string[];
    backlinks: string[];
}

interface ValidationIssue {
    id: string;
    type: 'error' | 'warning' | 'info';
    category: 'Linter' | 'Structure' | 'Links' | 'Performance';
    message: string;
    filePath: string;
    timestamp: Date;
    suggestion: string;
}

interface VaultNode {
    id: string;
    type: 'file' | 'folder';
    path: string;
    metadata: {
        health: number;
        lastValidated: Date;
        relationships: number;
    };
}

interface PerformanceMetric {
    operation: string;
    duration: number;
    nanoseconds: number;
    status: 'success' | 'warning' | 'error';
    efficiency?: number;
}

interface TemplateUsage {
    templateName: string;
    usageCount: number;
    lastUsed: Date;
    avgFileSize: number;
    category: string;
}

// =============================================================================
// SAMPLE DATA GENERATION
// =============================================================================

function generateSampleVaultFiles(): VaultFile[] {
    return [
        {
            path: '01 - Daily Notes/02 - Journals/2025-11-18.md',
            name: '2025-11-18',
            extension: 'md',
            size: 2456,
            createdAt: new Date('2025-11-18T08:00:00Z'),
            modifiedAt: new Date('2025-11-18T10:30:00Z'),
            content: '# Daily Note for November 18, 2025',
            tags: ['daily', 'journal', 'productivity'],
            links: ['[[2025-11-17]]', '[[Project-Plan]]'],
            backlinks: ['[[Weekly-Review]]']
        },
        {
            path: '02 - Architecture/01 - Data Models/OddsTick.md',
            name: 'OddsTick',
            extension: 'md',
            size: 5120,
            createdAt: new Date('2025-11-15T14:00:00Z'),
            modifiedAt: new Date('2025-11-17T14:15:00Z'),
            content: '# Odds Tick Data Model Specification',
            tags: ['architecture', 'data-model', 'core'],
            links: ['[[API-Documentation]]', '[[Database-Schema]]'],
            backlinks: ['[[System-Overview]]', '[[Developer-Guide]]']
        },
        {
            path: '03 - Development/01 - Code Snippets/bun-utilities.ts',
            name: 'bun-utilities',
            extension: 'ts',
            size: 8192,
            createdAt: new Date('2025-11-10T09:00:00Z'),
            modifiedAt: new Date('2025-11-18T16:45:00Z'),
            content: '// Bun utilities demonstration code',
            tags: ['development', 'typescript', 'utilities'],
            links: ['[[TypeScript-Guide]]', '[[Performance-Benchmarks]]'],
            backlinks: []
        },
        {
            path: '04 - Documentation/02 - Guides/Getting-Started.md',
            name: 'Getting-Started',
            extension: 'md',
            size: 15360,
            createdAt: new Date('2025-11-01T10:00:00Z'),
            modifiedAt: new Date('2025-11-16T11:20:00Z'),
            content: '# Getting Started with Odds Protocol Vault',
            tags: ['documentation', 'guide', 'onboarding'],
            links: ['[[Installation]]', '[[Configuration]]', '[[First-Project]]'],
            backlinks: ['[[README]]', '[[Homepage]]']
        },
        {
            path: '06 - Templates/01 - Note Templates/Daily-Note.md',
            name: 'Daily-Note',
            extension: 'md',
            size: 1024,
            createdAt: new Date('2025-10-20T12:00:00Z'),
            modifiedAt: new Date('2025-11-18T09:00:00Z'),
            content: '# Daily Note Template',
            tags: ['template', 'daily', 'note'],
            links: [],
            backlinks: [['2025-11-18'], ['2025-11-17'], ['2025-11-16']]
        }
    ];
}

function generateValidationIssues(): ValidationIssue[] {
    return [
        {
            id: 'L1',
            type: 'warning',
            category: 'Linter',
            message: 'Line too long (125 chars, max 100) detected in markdown content that wraps around many characters and needs to be shortened for better readability and compliance with vault standards.',
            filePath: '04 - Documentation/02 - Guides/Getting-Started.md',
            timestamp: new Date('2025-11-18T16:50:00Z'),
            suggestion: 'Break line into multiple shorter lines or use proper markdown formatting.'
        },
        {
            id: 'H1',
            type: 'error',
            category: 'Structure',
            message: 'Multiple H1 headings found in a single document. This violates the vault standards for document structure.',
            filePath: '06 - Templates/02 - Project Templates/Misconfigured-Template.md',
            timestamp: new Date('2025-11-18T16:48:00Z'),
            suggestion: 'Ensure only one top-level heading (#) per document.'
        },
        {
            id: 'LNK1',
            type: 'warning',
            category: 'Links',
            message: 'Broken link detected: [[Non-Existent-Document]] points to a file that does not exist in the vault.',
            filePath: '01 - Daily Notes/02 - Journals/2025-11-18.md',
            timestamp: new Date('2025-11-18T16:45:00Z'),
            suggestion: 'Update the link to point to an existing document or create the missing file.'
        },
        {
            id: 'PERF1',
            type: 'info',
            category: 'Performance',
            message: 'Large file detected (15.4 KB). Consider splitting into smaller, more focused documents.',
            filePath: '04 - Documentation/02 - Guides/Getting-Started.md',
            timestamp: new Date('2025-11-18T16:42:00Z'),
            suggestion: 'Break down into multiple focused documents with proper cross-references.'
        }
    ];
}

function generatePerformanceMetrics(): PerformanceMetric[] {
    return [
        {
            operation: 'File Validation',
            duration: 2.3,
            nanoseconds: 2300000,
            status: 'success',
            efficiency: 107
        },
        {
            operation: 'Template Processing',
            duration: 5.7,
            nanoseconds: 5700000,
            status: 'success',
            efficiency: 146
        },
        {
            operation: 'Link Validation',
            duration: 12.1,
            nanoseconds: 12100000,
            status: 'warning',
            efficiency: 85
        },
        {
            operation: 'Structure Analysis',
            duration: 1.5,
            nanoseconds: 1500000,
            status: 'success',
            efficiency: 226
        },
        {
            operation: 'Cache Update',
            duration: 0.8,
            nanoseconds: 800000,
            status: 'success',
            efficiency: 95
        }
    ];
}

function generateTemplateUsage(): TemplateUsage[] {
    return [
        {
            templateName: 'Daily-Note',
            usageCount: 18,
            lastUsed: new Date('2025-11-18T09:00:00Z'),
            avgFileSize: 2.1,
            category: 'Personal'
        },
        {
            templateName: 'Project-Template',
            usageCount: 7,
            lastUsed: new Date('2025-11-17T14:30:00Z'),
            avgFileSize: 5.4,
            category: 'Work'
        },
        {
            templateName: 'Meeting-Template',
            usageCount: 12,
            lastUsed: new Date('2025-11-16T11:00:00Z'),
            avgFileSize: 3.2,
            category: 'Work'
        },
        {
            templateName: 'Research-Template',
            usageCount: 3,
            lastUsed: new Date('2025-11-15T16:45:00Z'),
            avgFileSize: 8.7,
            category: 'Learning'
        },
        {
            templateName: 'Code-Snippet',
            usageCount: 25,
            lastUsed: new Date('2025-11-18T16:45:00Z'),
            avgFileSize: 1.8,
            category: 'Development'
        }
    ];
}

// =============================================================================
// ADVANCED TABLE FORMATTING FUNCTIONS
// =============================================================================

function demonstrateVaultFileTable(): void {
    console.info(chalk.bold.blue('\n📁 Vault File Inventory (Advanced Formatting)'));
    console.info(chalk.gray('='.repeat(80)));

    const rawFiles = generateSampleVaultFiles();

    // Pre-process data for optimal display
    const formattedFiles = rawFiles.map(file => ({
        name: chalk.cyan(file.name),
        path: file.path.split('/').slice(-2).join('/'), // Show last 2 path segments
        size_kb: chalk.yellow((file.size / 1024).toFixed(1) + ' KB'),
        modified: file.modifiedAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }),
        tags: file.tags.map(tag => chalk.magenta(`#${tag}`)).join(', '),
        links: chalk.green(`${file.links.length} linked`),
        backlinks: chalk.blue(`${file.backlinks.length} backlinks`)
    }));

    Bun.inspect.table(
        formattedFiles,
        ['name', 'path', 'size_kb', 'modified', 'tags', 'links', 'backlinks']
    );
}

function demonstrateValidationIssuesTable(): void {
    console.info(chalk.bold.red('\n⚠️ Validation Issues Report (with maxEntryWidth)'));
    console.info(chalk.gray('='.repeat(90)));

    const issues = generateValidationIssues();

    // Pre-process with color coding and truncation
    const formattedIssues = issues.map(issue => ({
        id: chalk.bold(issue.id),
        severity: issue.type === 'error' ?
            chalk.bgRed(' ERROR ') :
            issue.type === 'warning' ?
                chalk.bgYellow(' WARNING ') :
                chalk.bgBlue(' INFO '),
        category: chalk.italic(issue.category),
        file: chalk.cyan(issue.filePath.split('/').slice(-1)[0]),
        message: issue.message,
        suggestion: chalk.gray(issue.suggestion)
    }));

    Bun.inspect.table(
        formattedIssues,
        ['id', 'severity', 'category', 'file', 'message', 'suggestion'],
        {
            maxEntryWidth: 40, // Limit text width for readability
            compact: true // Reduce padding for more content
        }
    );
}

function demonstratePerformanceMetricsTable(): void {
    console.info(chalk.bold.green('\n🚀 Performance Metrics Analysis'));
    console.info(chalk.gray('='.repeat(70)));

    const metrics = generatePerformanceMetrics();

    // Pre-process with performance indicators
    const formattedMetrics = metrics.map(metric => ({
        operation: chalk.white(metric.operation),
        duration: metric.duration < 5 ?
            chalk.green(`${metric.duration}ms`) :
            metric.duration < 10 ?
                chalk.yellow(`${metric.duration}ms`) :
                chalk.red(`${metric.duration}ms`),
        nanoseconds: chalk.gray(`${metric.nanoseconds.toLocaleString()}ns`),
        status: metric.status === 'success' ?
            chalk.green('✅') :
            metric.status === 'warning' ?
                chalk.yellow('⚠️') :
                chalk.red('❌'),
        efficiency: metric.efficiency ?
            (metric.efficiency > 150 ?
                chalk.green(`${metric.efficiency}%`) :
                metric.efficiency > 100 ?
                    chalk.yellow(`${metric.efficiency}%`) :
                    chalk.red(`${metric.efficiency}%`)) :
            'N/A'
    }));

    Bun.inspect.table(
        formattedMetrics,
        ['operation', 'duration', 'nanoseconds', 'status', 'efficiency']
    );
}

function demonstrateTemplateUsageTable(): void {
    console.info(chalk.bold.magenta('\n📋 Template Usage Analytics (with maxLines)'));
    console.info(chalk.gray('='.repeat(75)));

    const templates = generateTemplateUsage();

    // Sort by usage count and pre-process
    const sortedTemplates = templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .map(template => ({
            template: chalk.cyan(template.templateName),
            usage: chalk.bold(`${template.usageCount} times`),
            last_used: template.lastUsed.toLocaleDateString('en-US'),
            avg_size: chalk.yellow(`${template.avgFileSize} KB`),
            category: chalk.italic(template.category)
        }));

    Bun.inspect.table(
        sortedTemplates,
        ['template', 'usage', 'last_used', 'avg_size', 'category'],
        {
            maxLines: 3 // Show only top 3 most used templates
        }
    );
}

function demonstrateCompactVsFull(): void {
    console.info(chalk.bold.cyan('\n📊 Compact vs Full Table Comparison'));
    console.info(chalk.gray('='.repeat(70)));

    const sampleData = [
        { name: 'Very Long File Name That Demonstrates Truncation', size: '15.2 KB', type: 'markdown' },
        { name: 'Short Name', size: '2.1 KB', type: 'typescript' },
        { name: 'Medium Length File Name Here', size: '8.7 KB', type: 'markdown' }
    ];

    console.info(chalk.yellow('\n🔸 FULL TABLE (more spacing):'));
    Bun.inspect.table(
        sampleData,
        ['name', 'size', 'type']
    );

    console.info(chalk.yellow('\n🔸 COMPACT TABLE (less spacing):'));
    Bun.inspect.table(
        sampleData,
        ['name', 'size', 'type'],
        { compact: true }
    );
}

function demonstrateRealWorldVaultReport(): void {
    console.info(chalk.bold.blue('\n📊 Real-World Vault Status Report'));
    console.info(chalk.gray('='.repeat(80)));

    // Combine multiple data sources for a comprehensive report
    const files = generateSampleVaultFiles();
    const issues = generateValidationIssues();
    const metrics = generatePerformanceMetrics();

    // Calculate summary statistics
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const avgPerformance = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;

    // Create summary table
    const summaryData = [
        {
            metric: chalk.bold('Total Files'),
            value: chalk.cyan(files.length.toString()),
            status: chalk.green('✅')
        },
        {
            metric: chalk.bold('Total Size'),
            value: chalk.yellow((totalSize / 1024).toFixed(1) + ' KB'),
            status: chalk.green('✅')
        },
        {
            metric: chalk.bold('Errors'),
            value: chalk.red(errorCount.toString()),
            status: errorCount > 0 ? chalk.red('❌') : chalk.green('✅')
        },
        {
            metric: chalk.bold('Warnings'),
            value: chalk.yellow(warningCount.toString()),
            status: warningCount > 2 ? chalk.yellow('⚠️') : chalk.green('✅')
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

// =============================================================================
// MAIN DEMONSTRATION FUNCTION
// =============================================================================

async function main(): Promise<void> {
    console.info(chalk.bold.magenta('🎪 Enhanced Bun.inspect.table() Demonstration'));
    console.info(chalk.gray('Odds Protocol Vault - Advanced Data Visualization'));
    console.info(chalk.gray('='.repeat(80)));

    // Run all demonstrations
    demonstrateVaultFileTable();
    demonstrateValidationIssuesTable();
    demonstratePerformanceMetricsTable();
    demonstrateTemplateUsageTable();
    demonstrateCompactVsFull();
    demonstrateRealWorldVaultReport();

    console.info(chalk.bold.green('\n🎉 Enhanced Demonstration Complete!'));
    console.info(chalk.gray('Key features demonstrated:'));
    console.info(chalk.gray('• Advanced data pre-processing and formatting'));
    console.info(chalk.gray('• Color-coded status indicators with chalk'));
    console.info(chalk.gray('• maxEntryWidth for text truncation'));
    console.info(chalk.gray('• maxLines for large dataset limiting'));
    console.info(chalk.gray('• compact option for space optimization'));
    console.info(chalk.gray('• Real-world vault reporting integration'));
    console.info(chalk.gray('• Multiple data source combination'));
}

// Execute if run directly
if (import.meta.main) {
    main().catch(console.error);
}

export {
    demonstrateVaultFileTable,
    demonstrateValidationIssuesTable,
    demonstratePerformanceMetricsTable,
    generateSampleVaultFiles,
    generateValidationIssues,
    generatePerformanceMetrics
};
