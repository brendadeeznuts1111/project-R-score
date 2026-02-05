#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][MAINTENANCE][SCOPE][OPTIMIZATION][META][CARE][#REF]template-performance-monitor
 * 
 * Template Performance Monitor
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
 * Template Performance Monitor
 * Monitors template system performance and provides analytics
 * 
 * @fileoverview Performance monitoring for template system
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface TemplateMetrics {
    filePath: string;
    size: number;
    lineCount: number;
    wordCount: number;
    headingCount: number;
    codeBlockCount: number;
    lastModified: Date;
    complexity: number;
    processingTime: number;
}

interface PerformanceReport {
    timestamp: Date;
    totalTemplates: number;
    totalSize: number;
    averageSize: number;
    averageComplexity: number;
    slowestTemplates: TemplateMetrics[];
    largestTemplates: TemplateMetrics[];
    mostComplexTemplates: TemplateMetrics[];
    recommendations: string[];
}

class TemplatePerformanceMonitor {
    private vaultPath: string;
    private templatesDir: string;
    private metrics: TemplateMetrics[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
    }

    /**
     * Run performance analysis
     */
    async analyzePerformance(): Promise<PerformanceReport> {
        console.log(chalk.blue.bold('📊 Analyzing template system performance...'));

        try {
            const startTime = Bun.nanoseconds();

            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Found ${files.length} template files to analyze`));

            // Collect metrics for each template
            for (const filePath of files) {
                const metrics = await this.collectMetrics(filePath);
                this.metrics.push(metrics);
            }

            const endTime = Bun.nanoseconds();
            const totalTime = (endTime - startTime) / 1_000_000; // Convert to milliseconds

            const report = this.generateReport(totalTime);
            this.displayReport(report);

            // Save report for historical tracking
            await this.saveReport(report);

            return report;

        } catch (error) {
            console.error(chalk.red(`❌ Error analyzing performance: ${error.message}`));
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
     * Collect metrics for a single template
     */
    private async collectMetrics(filePath: string): Promise<TemplateMetrics> {
        const startTime = Bun.nanoseconds();

        try {
            const content = await readFile(filePath, 'utf-8');
            const fileStats = await stat(filePath);

            const metrics: TemplateMetrics = {
                filePath,
                size: content.length,
                lineCount: content.split('\n').length,
                wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
                headingCount: (content.match(/^#+/gm) || []).length,
                codeBlockCount: (content.match(/```/g) || []).length / 2,
                lastModified: fileStats.mtime,
                complexity: this.calculateComplexity(content),
                processingTime: 0 // Will be set below
            };

            const endTime = Bun.nanoseconds();
            metrics.processingTime = (endTime - startTime) / 1_000_000; // Convert to milliseconds

            return metrics;

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not analyze ${filePath}: ${error.message}`));
            return {
                filePath,
                size: 0,
                lineCount: 0,
                wordCount: 0,
                headingCount: 0,
                codeBlockCount: 0,
                lastModified: new Date(),
                complexity: 0,
                processingTime: 0
            };
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
        const links = content.match(/\[\[.*?\]\]/g) || [];
        complexity += links.length * 0.5;

        // Tables add complexity
        const tables = content.match(/\|.*\|/g) || [];
        complexity += tables.length * 0.3;

        return Math.round(complexity);
    }

    /**
     * Generate performance report
     */
    private generateReport(totalProcessingTime: number): PerformanceReport {
        const totalTemplates = this.metrics.length;
        const totalSize = this.metrics.reduce((sum, m) => sum + m.size, 0);
        const averageSize = totalSize / totalTemplates;
        const averageComplexity = this.metrics.reduce((sum, m) => sum + m.complexity, 0) / totalTemplates;

        // Find slowest templates
        const slowestTemplates = this.metrics
            .sort((a, b) => b.processingTime - a.processingTime)
            .slice(0, 5);

        // Find largest templates
        const largestTemplates = this.metrics
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

        // Find most complex templates
        const mostComplexTemplates = this.metrics
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 5);

        // Generate recommendations
        const recommendations = this.generateRecommendations();

        return {
            timestamp: new Date(),
            totalTemplates,
            totalSize,
            averageSize,
            averageComplexity,
            slowestTemplates,
            largestTemplates,
            mostComplexTemplates,
            recommendations
        };
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(): string[] {
        const recommendations: string[] = [];

        // Size recommendations
        const largeTemplates = this.metrics.filter(m => m.size > 50000);
        if (largeTemplates.length > 0) {
            recommendations.push(`🔧 ${largeTemplates.length} templates are >50KB - consider splitting them`);
        }

        // Complexity recommendations
        const complexTemplates = this.metrics.filter(m => m.complexity > 50);
        if (complexTemplates.length > 0) {
            recommendations.push(`📝 ${complexTemplates.length} templates have high complexity - consider simplification`);
        }

        // Processing time recommendations
        const slowTemplates = this.metrics.filter(m => m.processingTime > 10);
        if (slowTemplates.length > 0) {
            recommendations.push(`⚡ ${slowTemplates.length} templates are slow to process - optimize content`);
        }

        // Maintenance recommendations
        const oldTemplates = this.metrics.filter(m => {
            const daysSinceModified = (Date.now() - m.lastModified.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceModified > 90;
        });
        if (oldTemplates.length > 0) {
            recommendations.push(`🕐 ${oldTemplates.length} templates haven't been updated in 90+ days - review for relevance`);
        }

        // Overall health
        const avgComplexity = this.metrics.reduce((sum, m) => sum + m.complexity, 0) / this.metrics.length;
        if (avgComplexity > 30) {
            recommendations.push(`📊 Average template complexity (${avgComplexity.toFixed(1)}) is high - focus on simplification`);
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Template system performance is optimal!');
        }

        return recommendations;
    }

    /**
     * Display performance report
     */
    private displayReport(report: PerformanceReport): void {
        console.log(chalk.blue.bold('\n📊 Template Performance Report'));
        console.log(chalk.gray('='.repeat(60)));
        console.log(chalk.cyan(`Generated: ${report.timestamp.toISOString()}`));

        console.log(chalk.blue.bold('\n📈 Overview:'));
        console.log(chalk.gray(`Total templates: ${report.totalTemplates}`));
        console.log(chalk.gray(`Total size: ${(report.totalSize / 1024).toFixed(1)}KB`));
        console.log(chalk.gray(`Average size: ${(report.averageSize / 1024).toFixed(1)}KB`));
        console.log(chalk.gray(`Average complexity: ${report.averageComplexity.toFixed(1)}`));

        // Show slowest templates
        if (report.slowestTemplates.length > 0) {
            console.log(chalk.yellow.bold('\n⏱️  Slowest Templates:'));
            for (const template of report.slowestTemplates) {
                const fileName = template.filePath.split('/').pop() || '';
                console.log(chalk.gray(`   ${fileName}: ${template.processingTime.toFixed(2)}ms`));
            }
        }

        // Show largest templates
        if (report.largestTemplates.length > 0) {
            console.log(chalk.yellow.bold('\n📏 Largest Templates:'));
            for (const template of report.largestTemplates) {
                const fileName = template.filePath.split('/').pop() || '';
                console.log(chalk.gray(`   ${fileName}: ${(template.size / 1024).toFixed(1)}KB`));
            }
        }

        // Show most complex templates
        if (report.mostComplexTemplates.length > 0) {
            console.log(chalk.yellow.bold('\n🧩 Most Complex Templates:'));
            for (const template of report.mostComplexTemplates) {
                const fileName = template.filePath.split('/').pop() || '';
                console.log(chalk.gray(`   ${fileName}: complexity ${template.complexity}`));
            }
        }

        // Show recommendations
        console.log(chalk.blue.bold('\n💡 Recommendations:'));
        for (const recommendation of report.recommendations) {
            console.log(chalk.gray(`   ${recommendation}`));
        }
    }

    /**
     * Save performance report for historical tracking
     */
    private async saveReport(report: PerformanceReport): Promise<void> {
        try {
            const reportsDir = join(this.vaultPath, 'reports', 'template-performance');

            // Create reports directory if it doesn't exist
            try {
                await readdir(reportsDir);
            } catch {
                // Directory doesn't exist, create it
                await writeFile(join(this.vaultPath, 'reports', 'template-performance', '.gitkeep'), '');
            }

            const filename = `template-performance-${report.timestamp.toISOString().split('T')[0]}.json`;
            const filepath = join(reportsDir, filename);

            await writeFile(filepath, JSON.stringify(report, null, 2));
            console.log(chalk.green(`\n💾 Report saved to: ${filename}`));

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not save report: ${error.message}`));
        }
    }

    /**
     * Show historical performance trends
     */
    async showTrends(): Promise<void> {
        console.log(chalk.blue.bold('📈 Performance Trends Analysis'));

        try {
            const reportsDir = join(this.vaultPath, 'reports', 'template-performance');
            const files = await readdir(reportsDir);

            const reportFiles = files
                .filter(f => f.startsWith('template-performance-') && f.endsWith('.json'))
                .sort()
                .slice(-10); // Last 10 reports

            if (reportFiles.length === 0) {
                console.log(chalk.yellow('No historical reports found'));
                return;
            }

            console.log(chalk.cyan(`\nAnalyzing last ${reportFiles.length} reports...`));

            const reports: PerformanceReport[] = [];

            for (const file of reportFiles) {
                try {
                    const content = await readFile(join(reportsDir, file), 'utf-8');
                    reports.push(JSON.parse(content));
                } catch (error) {
                    console.warn(chalk.yellow(`⚠️  Could not read ${file}: ${error.message}`));
                }
            }

            if (reports.length < 2) {
                console.log(chalk.yellow('Need at least 2 reports for trend analysis'));
                return;
            }

            // Calculate trends
            const oldest = reports[0];
            const newest = reports[reports.length - 1];

            const sizeChange = ((newest.averageSize - oldest.averageSize) / oldest.averageSize) * 100;
            const complexityChange = ((newest.averageComplexity - oldest.averageComplexity) / oldest.averageComplexity) * 100;
            const templateCountChange = ((newest.totalTemplates - oldest.totalTemplates) / oldest.totalTemplates) * 100;

            console.log(chalk.blue.bold('\n📊 Trends:'));
            console.log(chalk.gray(`Template count: ${oldest.totalTemplates} → ${newest.totalTemplates} (${templateCountChange > 0 ? '+' : ''}${templateCountChange.toFixed(1)}%)`));
            console.log(chalk.gray(`Average size: ${(oldest.averageSize / 1024).toFixed(1)}KB → ${(newest.averageSize / 1024).toFixed(1)}KB (${sizeChange > 0 ? '+' : ''}${sizeChange.toFixed(1)}%)`));
            console.log(chalk.gray(`Average complexity: ${oldest.averageComplexity.toFixed(1)} → ${newest.averageComplexity.toFixed(1)} (${complexityChange > 0 ? '+' : ''}${complexityChange.toFixed(1)}%)`));

            // Performance insights
            if (sizeChange > 20) {
                console.log(chalk.yellow('⚠️  Template sizes are growing significantly'));
            } else if (sizeChange < -10) {
                console.log(chalk.green('✅ Template sizes are decreasing - good optimization!'));
            }

            if (complexityChange > 15) {
                console.log(chalk.yellow('⚠️  Template complexity is increasing'));
            } else if (complexityChange < -10) {
                console.log(chalk.green('✅ Template complexity is decreasing - good simplification!'));
            }

        } catch (error) {
            console.error(chalk.red(`❌ Error analyzing trends: ${error.message}`));
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
        console.log(chalk.blue.bold('📊 Template Performance Monitor'));
        console.log(chalk.gray('Usage: bun template-performance-monitor.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --trends     Show historical performance trends'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        process.exit(0);
    }

    try {
        const monitor = new TemplatePerformanceMonitor(vaultPath);

        if (args.includes('--trends')) {
            await monitor.showTrends();
        } else {
            await monitor.analyzePerformance();
        }

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

export { TemplatePerformanceMonitor, type TemplateMetrics, type PerformanceReport };
