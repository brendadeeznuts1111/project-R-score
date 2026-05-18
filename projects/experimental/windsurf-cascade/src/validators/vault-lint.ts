#!/usr/bin/env bun
/**
 * Enhanced Vault Lint Script
 * Bun-native validation with graph-aware analysis
 */

import { ValidationOrchestrator } from './ValidationOrchestrator';
import { VaultGraph } from '../models/VaultNode';
import { glob } from 'bun';

interface LintOptions {
    fix?: boolean;
    watch?: boolean;
    exclude?: string[];
    output?: 'json' | 'text' | 'summary';
    maxWorkers?: number;
}

async function main() {
    const args = process.argv.slice(2);
    const options: LintOptions = {
        fix: args.includes('--fix'),
        watch: args.includes('--watch'),
        exclude: [],
        output: 'summary',
        maxWorkers: 8
    };

    // Parse output format
    const outputIndex = args.findIndex(arg => arg.startsWith('--output='));
    if (outputIndex !== -1) {
        options.output = args[outputIndex].split('=')[1] as 'json' | 'text' | 'summary';
    }

    // Parse exclude patterns
    const excludeIndex = args.findIndex(arg => arg.startsWith('--exclude='));
    if (excludeIndex !== -1) {
        options.exclude = args[excludeIndex].split('=')[1].split(',');
    }

    console.info('🔍 Enhanced Vault Lint - Bun Native Edition');
    console.info(`📊 Options: ${JSON.stringify(options, null, 2)}`);

    // Initialize graph and orchestrator
    const graph = new VaultGraph();
    const orchestrator = new ValidationOrchestrator(graph);

    try {
        if (options.watch) {
            await startWatchMode(orchestrator, options);
        } else {
            await runLint(orchestrator, options);
        }
    } catch (error) {
        console.error('❌ Lint failed:', error.message);
        process.exit(1);
    }
}

async function runLint(orchestrator: ValidationOrchestrator, options: LintOptions) {
    const startTime = Date.now();

    // Discover markdown files
    const excludePatterns = [
        '**/.git/**',
        '**/.obsidian/**',
        '**/node_modules/**',
        '**/07 - Archive/**',
        ...options.exclude!
    ];

    const files = await glob('**/*.md', {
        cwd: './Odds-mono-map',
        ignore: excludePatterns
    });

    if (files.length === 0) {
        console.info('⚠️ No markdown files found');
        return;
    }

    console.info(`📁 Found ${files.length} files to validate`);

    // Run validation
    const filePaths = files.map(file => `./Odds-mono-map/${file}`);
    const results = await orchestrator.validateBatch(filePaths);

    // Generate report
    const report = generateReport(results, Date.now() - startTime);

    // Output report
    switch (options.output) {
        case 'json':
            console.info(JSON.stringify(report, null, 2));
            break;
        case 'text':
            console.info(formatTextReport(report));
            break;
        case 'summary':
        default:
            console.info(formatSummaryReport(report));
            break;
    }

    // Exit with error code if issues found
    if (report.totalErrors > 0) {
        process.exit(1);
    }
}

async function startWatchMode(orchestrator: ValidationOrchestrator, options: LintOptions) {
    console.info('👀 Starting watch mode...');

    // Import and start the vault watcher
    const { VaultWatcher } = await import('../watchers/vault-watcher');

    const watcher = new VaultWatcher({
        vaultPath: './Odds-mono-map',
        debounceMs: 500,
        enableHotReload: true,
        maxConcurrentValidations: options.maxWorkers
    });

    await watcher.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.info('\n🛑 Shutting down watch mode...');
        await watcher.stop();
        process.exit(0);
    });

    // Keep process alive
    console.info('⏳ Watching for changes... (Press Ctrl+C to stop)');
}

function generateReport(results: any[], duration: number) {
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalFiles = results.length;
    const passedFiles = results.filter(r => r.errors.length === 0).length;
    const avgHealth = results.reduce((sum, r) => sum + r.metrics.healthScore, 0) / totalFiles;

    const issuesByType = new Map<string, number>();
    const warningsByType = new Map<string, number>();

    results.forEach(result => {
        result.errors.forEach(error => {
            const type = error.split(':')[0];
            issuesByType.set(type, (issuesByType.get(type) || 0) + 1);
        });

        result.warnings.forEach(warning => {
            const type = warning.split(':')[0];
            warningsByType.set(type, (warningsByType.get(type) || 0) + 1);
        });
    });

    return {
        summary: {
            totalFiles,
            passedFiles,
            failedFiles: totalFiles - passedFiles,
            totalErrors,
            totalWarnings,
            complianceRate: (passedFiles / totalFiles) * 100,
            averageHealth: avgHealth,
            duration
        },
        issuesByType: Object.fromEntries(issuesByType),
        warningsByType: Object.fromEntries(warningsByType),
        files: results.map(r => ({
            path: r.filePath,
            errors: r.errors,
            warnings: r.warnings,
            healthScore: r.metrics.healthScore,
            affectedNodes: r.affectedNodes.length
        }))
    };
}

function formatSummaryReport(report: any) {
    const { summary } = report;

    return `
📊 Enhanced Vault Validation Report
====================================
📁 Files checked: ${summary.totalFiles}
✅ Files passed: ${summary.passedFiles}
❌ Files failed: ${summary.failedFiles}
🚨 Errors: ${summary.totalErrors}
⚠️ Warnings: ${summary.totalWarnings}
📈 Compliance Rate: ${summary.complianceRate.toFixed(1)}%
💚 Average Health: ${summary.averageHealth.toFixed(1)}%
⏱️ Duration: ${summary.duration}ms

${summary.totalErrors > 0 ? '🚨 Critical Issues Found:' : '✅ No Critical Issues'}
${Object.entries(report.issuesByType)
            .map(([type, count]) => `  • ${type}: ${count}`)
            .join('\n')}

${summary.totalWarnings > 0 ? '⚠️ Warnings:' : '✅ No Warnings'}
${Object.entries(report.warningsByType)
            .map(([type, count]) => `  • ${type}: ${count}`)
            .join('\n')}

💡 Recommendations:
${summary.complianceRate < 50 ? '  • Priority: Address critical errors first' : ''}
${summary.totalWarnings > summary.totalErrors ? '  • Focus on reducing warnings to improve quality' : ''}
${summary.averageHealth < 70 ? '  • Consider running with --fix to auto-resolve issues' : ''}
  • Use --watch for continuous monitoring
  • Check individual files for detailed issue descriptions
`;
}

function formatTextReport(report: any) {
    const { summary, files } = report;

    let output = formatSummaryReport(report);

    // Add detailed file information
    output += '\n\n📋 Detailed File Results:\n';
    output += '='.repeat(50) + '\n';

    files
        .filter(f => f.errors.length > 0 || f.warnings.length > 0)
        .forEach(file => {
            output += `\n📄 ${file.path}\n`;
            output += `   Health: ${file.healthScore}% | Affected: ${file.affectedNodes} nodes\n`;

            if (file.errors.length > 0) {
                output += '   🚨 Errors:\n';
                file.errors.forEach(error => {
                    output += `     • ${error}\n`;
                });
            }

            if (file.warnings.length > 0) {
                output += '   ⚠️ Warnings:\n';
                file.warnings.forEach(warning => {
                    output += `     • ${warning}\n`;
                });
            }
        });

    return output;
}

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}
