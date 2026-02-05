#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][MAINTENANCE][SCOPE][OPTIMIZATION][META][CARE][#REF]optimize-template-complexity-simple
 * 
 * Optimize Template Complexity Simple
 * Template management script
 * 
 * @fileoverview Ongoing maintenance and optimization tools
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category maintenance
 * @tags maintenance,template,structure
 */

#!/usr/bin/env bun

/**
 * Simple Template Complexity Optimizer
 * Reduces template complexity by applying conservative optimizations
 * 
 * @fileoverview Template complexity optimization for better performance
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface ComplexityMetrics {
    filePath: string;
    originalComplexity: number;
    optimizedComplexity: number;
    reduction: number;
}

class SimpleComplexityOptimizer {
    private vaultPath: string;
    private templatesDir: string;
    private dryRun: boolean;
    private metrics: ComplexityMetrics[] = [];

    constructor(vaultPath: string, options: { dryRun?: boolean } = {}) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.dryRun = options.dryRun ?? false;
    }

    /**
     * Optimize all template complexities
     */
    async optimizeComplexities(): Promise<void> {
        console.log(chalk.blue.bold('🔧 Optimizing template complexities...'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to analyze`));

            for (const filePath of files) {
                await this.optimizeTemplate(filePath);
            }

            this.displaySummary();

        } catch (error) {
            console.error(chalk.red(`❌ Error optimizing complexities: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get all template files recursively
     */
    private async getAllTemplateFiles(): Promise<string[]> {
        const files: string[] = [];

        async function scanDirectory(dir: string): Promise<void> {
            try {
                const entries = await readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.endsWith('.md')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Could not read directory ${dir}: ${error.message}`));
            }
        }

        await scanDirectory(this.templatesDir);
        return files;
    }

    /**
     * Optimize a single template
     */
    private async optimizeTemplate(filePath: string): Promise<void> {
        try {
            const originalContent = await readFile(filePath, 'utf-8');
            const originalComplexity = this.calculateComplexity(originalContent);

            // Skip templates with low complexity
            if (originalComplexity < 80) {
                return;
            }

            let optimizedContent = originalContent;

            // Apply simple optimizations
            optimizedContent = this.removeDuplicateHeadings(optimizedContent);
            optimizedContent = this.consolidateShortSections(optimizedContent);
            optimizedContent = this.simplifyTables(optimizedContent);

            const optimizedComplexity = this.calculateComplexity(optimizedContent);
            const reduction = originalComplexity - optimizedComplexity;

            if (reduction > 5) { // Only count significant reductions
                const metrics: ComplexityMetrics = {
                    filePath,
                    originalComplexity,
                    optimizedComplexity,
                    reduction
                };

                this.metrics.push(metrics);

                if (!this.dryRun) {
                    await writeFile(filePath, optimizedContent, 'utf-8');
                    console.log(chalk.green(`   ✅ Optimized ${filePath.split('/').pop()}: ${originalComplexity} → ${optimizedComplexity} (-${reduction})`));
                } else {
                    console.log(chalk.cyan(`   🔧 Would optimize ${filePath.split('/').pop()}: ${originalComplexity} → ${optimizedComplexity} (-${reduction})`));
                }
            }

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not optimize ${filePath}: ${error.message}`));
        }
    }

    /**
     * Calculate template complexity score
     */
    private calculateComplexity(content: string): number {
        let complexity = 0;

        // Base complexity from headings
        const headings = content.match(/^#+/gm) || [];
        complexity += headings.length * 2;

        // Code blocks add complexity
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        complexity += codeBlocks.length * 3;

        // Template variables add complexity
        const variables = content.match(/\{\{[^}]+\}\}/g) || [];
        complexity += variables.length;

        // Links add complexity
        const links = content.match(/\[\[[^\]]+\]\]/g) || [];
        complexity += links.length * 0.5;

        // Tables add complexity
        const tables = content.match(/\|.*\|/g) || [];
        complexity += tables.length * 0.3;

        return Math.round(complexity);
    }

    /**
     * Remove duplicate headings
     */
    private removeDuplicateHeadings(content: string): string {
        const lines = content.split('\n');
        const seenHeadings = new Set<string>();
        const optimizedLines: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('#')) {
                const headingText = trimmed.toLowerCase();
                if (seenHeadings.has(headingText)) {
                    // Skip duplicate heading
                    continue;
                }
                seenHeadings.add(headingText);
            }

            optimizedLines.push(line);
        }

        return optimizedLines.join('\n');
    }

    /**
     * Consolidate short sections
     */
    private consolidateShortSections(content: string): string {
        const lines = content.split('\n');
        const optimizedLines: string[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Look for very short sections that can be merged
            if (trimmed.startsWith('## ') && i + 2 < lines.length) {
                const nextLine = lines[i + 1]?.trim();
                const nextNextLine = lines[i + 2]?.trim();

                // If section has very little content, consider merging
                if (nextLine === '' && nextNextLine && nextNextLine.length < 50) {
                    // Add a note instead of the small section
                    optimizedLines.push(line);
                    optimizedLines.push(nextLine);
                    optimizedLines.push(`*Consolidated from: ${nextNextLine}*`);
                    i += 3;
                    continue;
                }
            }

            optimizedLines.push(line);
            i++;
        }

        return optimizedLines.join('\n');
    }

    /**
     * Simplify tables
     */
    private simplifyTables(content: string): string {
        const lines = content.split('\n');
        const optimizedLines: string[] = [];

        for (const line of lines) {
            // Simplify overly complex table rows
            if (line.includes('|') && line.length > 150) {
                const parts = line.split('|');
                if (parts.length > 5) {
                    // Keep only first 3 columns and add "..." 
                    const simplified = parts.slice(0, 4).join('|') + '| ... |';
                    optimizedLines.push(simplified);
                    continue;
                }
            }

            optimizedLines.push(line);
        }

        return optimizedLines.join('\n');
    }

    /**
     * Display optimization summary
     */
    private displaySummary(): void {
        if (this.metrics.length === 0) {
            console.log(chalk.green('✅ No templates needed complexity optimization!'));
            return;
        }

        const totalReduction = this.metrics.reduce((sum, m) => sum + m.reduction, 0);
        const avgReduction = totalReduction / this.metrics.length;
        const originalAvg = this.metrics.reduce((sum, m) => sum + m.originalComplexity, 0) / this.metrics.length;
        const optimizedAvg = this.metrics.reduce((sum, m) => sum + m.optimizedComplexity, 0) / this.metrics.length;

        console.log(chalk.blue.bold('\n📊 Complexity Optimization Summary:'));
        console.log(chalk.gray('='.repeat(60)));
        console.log(chalk.cyan(`Templates optimized: ${this.metrics.length}`));
        console.log(chalk.green(`Total complexity reduced: ${totalReduction}`));
        console.log(chalk.blue(`Average reduction: ${avgReduction.toFixed(1)} per template`));
        console.log(chalk.gray(`Original average complexity: ${originalAvg.toFixed(1)}`));
        console.log(chalk.gray(`Optimized average complexity: ${optimizedAvg.toFixed(1)}`));

        // Show most improved templates
        const mostImproved = this.metrics.sort((a, b) => b.reduction - a.reduction).slice(0, 5);
        if (mostImproved.length > 0) {
            console.log(chalk.yellow('\n🏆 Most Improved Templates:'));
            for (const metric of mostImproved) {
                const fileName = metric.filePath.split('/').pop() || '';
                console.log(chalk.gray(`   ${fileName}: ${metric.originalComplexity} → ${metric.optimizedComplexity} (-${metric.reduction})`));
            }
        }

        // Check if we achieved our target
        if (optimizedAvg < 80) {
            console.log(chalk.green.bold('\n🎯 TARGET ACHIEVED: Average complexity below 80!'));
        } else {
            console.log(chalk.yellow(`\n📈 PROGRESS: Average complexity ${optimizedAvg.toFixed(1)} (target: <80)`));
        }
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🔧 Template Complexity Optimizer'));
        console.log(chalk.gray('Usage: bun optimize-template-complexity.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --dry-run    Show optimizations without applying them'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const optimizer = new SimpleComplexityOptimizer(vaultPath, {
            dryRun: args.includes('--dry-run')
        });

        await optimizer.optimizeComplexities();

    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (import.meta.main) {
    main().catch(console.error);
}

export { SimpleComplexityOptimizer, type ComplexityMetrics };
