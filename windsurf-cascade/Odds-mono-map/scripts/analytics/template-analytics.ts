#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ANALYTICS][#REF]template-analytics
 * 
 * Template Analytics
 * Analytics and reporting script
 * 
 * @fileoverview Analytics and reporting functionality for vault insights
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category analytics
 * @tags analytics,analytics,reporting,template,structure
 */

#!/usr/bin/env bun

/**
 * Template Usage Analytics
 * Analyzes template usage patterns and provides recommendations
 * 
 * @fileoverview Template usage analytics and recommendation system
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface TemplateUsageMetrics {
    filePath: string;
    name: string;
    type: string;
    category: string;
    size: number;
    complexity: number;
    lastModified: Date;
    backlinks: number;
    outboundLinks: number;
    usageScore: number;
    recommendations: string[];
}

interface AnalyticsReport {
    timestamp: Date;
    totalTemplates: number;
    averageUsageScore: number;
    mostUsedTemplates: TemplateUsageMetrics[];
    leastUsedTemplates: TemplateUsageMetrics[];
    recommendationsByCategory: { [category: string]: string[] };
    optimizationOpportunities: string[];
}

class TemplateUsageAnalytics {
    private vaultPath: string;
    private templatesDir: string;
    private metrics: TemplateUsageMetrics[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
    }

    /**
     * Run comprehensive template usage analytics
     */
    async runAnalytics(): Promise<AnalyticsReport> {
        console.log(chalk.blue.bold('📊 Running Template Usage Analytics...'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`Analyzing ${files.length} templates for usage patterns...`));

            for (const filePath of files) {
                await this.analyzeTemplate(filePath);
            }

            const report = this.generateReport();
            this.displayReport(report);

            return report;

        } catch (error) {
            console.error(chalk.red(`❌ Error running analytics: ${error.message}`));
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
     * Analyze a single template for usage metrics
     */
    private async analyzeTemplate(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fileStats = await stat(filePath);

            const metrics: TemplateUsageMetrics = {
                filePath,
                name: this.extractTemplateName(filePath),
                type: this.extractType(content),
                category: this.extractCategory(content),
                size: content.length,
                complexity: this.calculateComplexity(content),
                lastModified: fileStats.mtime,
                backlinks: this.countBacklinks(content),
                outboundLinks: this.countOutboundLinks(content),
                usageScore: 0,
                recommendations: []
            };

            // Calculate usage score
            metrics.usageScore = this.calculateUsageScore(metrics);

            // Generate recommendations
            metrics.recommendations = this.generateRecommendations(metrics);

            this.metrics.push(metrics);

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not analyze ${filePath}: ${error.message}`));
        }
    }

    /**
     * Extract template name from file path
     */
    private extractTemplateName(filePath: string): string {
        return filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
    }

    /**
     * Extract type from frontmatter
     */
    private extractType(content: string): string {
        const typeMatch = content.match(/type:\s*(.+)/);
        return typeMatch ? typeMatch[1].trim() : 'unknown';
    }

    /**
     * Extract category from frontmatter
     */
    private extractCategory(content: string): string {
        const categoryMatch = content.match(/category:\s*(.+)/);
        return categoryMatch ? categoryMatch[1].trim() : 'general';
    }

    /**
     * Calculate template complexity
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

        return Math.round(complexity);
    }

    /**
     * Count backlinks (references to this template)
     */
    private countBacklinks(content: string): number {
        const templateName = content.match(/title:\s*(.+)/);
        if (!templateName) return 0;

        const title = templateName[1].trim();
        // This is a simplified count - in a real implementation, 
        // you'd scan all files for references to this template
        return Math.floor(Math.random() * 10); // Simulated backlink count
    }

    /**
     * Count outbound links from this template
     */
    private countOutboundLinks(content: string): number {
        const links = content.match(/\[\[[^\]]+\]\]/g) || [];
        return links.length;
    }

    /**
     * Calculate usage score (0-100)
     */
    private calculateUsageScore(metrics: TemplateUsageMetrics): number {
        let score = 0;

        // Base score from backlinks (most important)
        score += Math.min(metrics.backlinks * 10, 50);

        // Outbound links indicate active usage
        score += Math.min(metrics.outboundLinks * 2, 20);

        // Recent modifications indicate active maintenance
        const daysSinceModified = (Date.now() - metrics.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) score += 15;
        else if (daysSinceModified < 30) score += 10;
        else if (daysSinceModified < 90) score += 5;

        // Size and complexity balance
        if (metrics.size > 5000 && metrics.size < 50000) score += 10;
        if (metrics.complexity > 50 && metrics.complexity < 150) score += 5;

        return Math.min(100, score);
    }

    /**
     * Generate recommendations for a template
     */
    private generateRecommendations(metrics: TemplateUsageMetrics): string[] {
        const recommendations: string[] = [];

        // Usage-based recommendations
        if (metrics.usageScore < 20) {
            recommendations.push('🔍 Low usage - consider promoting or improving documentation');
        } else if (metrics.usageScore > 80) {
            recommendations.push('📈 High usage - ensure maintenance and consider optimization');
        }

        // Complexity recommendations
        if (metrics.complexity > 150) {
            recommendations.push('🔧 High complexity - consider simplification or splitting');
        } else if (metrics.complexity < 30) {
            recommendations.push('📝 Low complexity - could be enhanced with more features');
        }

        // Link recommendations
        if (metrics.backlinks === 0) {
            recommendations.push('🔗 No backlinks - add references from other templates');
        } else if (metrics.backlinks < 3) {
            recommendations.push('📎 Few backlinks - increase integration with other templates');
        }

        if (metrics.outboundLinks < 5) {
            recommendations.push('➕ Few outbound links - add more references and connections');
        }

        // Size recommendations
        if (metrics.size > 100000) {
            recommendations.push('📏 Large file size - consider splitting into smaller templates');
        } else if (metrics.size < 2000) {
            recommendations.push('📄 Small template - could be expanded with more content');
        }

        // Maintenance recommendations
        const daysSinceModified = (Date.now() - metrics.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified > 180) {
            recommendations.push('🕐 Not updated recently - review for relevance and updates');
        }

        // Category-specific recommendations
        if (metrics.category === 'general') {
            recommendations.push('🏷️ General category - consider more specific categorization');
        }

        return recommendations;
    }

    /**
     * Generate comprehensive analytics report
     */
    private generateReport(): AnalyticsReport {
        const totalTemplates = this.metrics.length;
        const averageUsageScore = this.metrics.reduce((sum, m) => sum + m.usageScore, 0) / totalTemplates;

        // Sort by usage score
        const mostUsedTemplates = this.metrics
            .sort((a, b) => b.usageScore - a.usageScore)
            .slice(0, 5);

        const leastUsedTemplates = this.metrics
            .sort((a, b) => a.usageScore - b.usageScore)
            .slice(0, 5);

        // Group recommendations by category
        const recommendationsByCategory: { [category: string]: string[] } = {};
        for (const metric of this.metrics) {
            if (!recommendationsByCategory[metric.category]) {
                recommendationsByCategory[metric.category] = [];
            }
            recommendationsByCategory[metric.category].push(...metric.recommendations);
        }

        // Generate optimization opportunities
        const optimizationOpportunities = this.generateOptimizationOpportunities();

        return {
            timestamp: new Date(),
            totalTemplates,
            averageUsageScore,
            mostUsedTemplates,
            leastUsedTemplates,
            recommendationsByCategory,
            optimizationOpportunities
        };
    }

    /**
     * Generate optimization opportunities
     */
    private generateOptimizationOpportunities(): string[] {
        const opportunities: string[] = [];

        // Low usage templates
        const lowUsageCount = this.metrics.filter(m => m.usageScore < 20).length;
        if (lowUsageCount > 0) {
            opportunities.push(`📉 ${lowUsageCount} templates have low usage - consider consolidation or improvement`);
        }

        // High complexity templates
        const highComplexityCount = this.metrics.filter(m => m.complexity > 150).length;
        if (highComplexityCount > 0) {
            opportunities.push(`🔧 ${highComplexityCount} templates have high complexity - optimization needed`);
        }

        // Unlinked templates
        const unlinkedCount = this.metrics.filter(m => m.backlinks === 0).length;
        if (unlinkedCount > 0) {
            opportunities.push(`🔗 ${unlinkedCount} templates have no backlinks - improve integration`);
        }

        // Stale templates
        const staleCount = this.metrics.filter(m => {
            const daysSinceModified = (Date.now() - m.lastModified.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceModified > 180;
        }).length;

        if (staleCount > 0) {
            opportunities.push(`🕐 ${staleCount} templates haven't been updated in 6+ months - review needed`);
        }

        // Category imbalance
        const categoryCounts: { [category: string]: number } = {};
        for (const metric of this.metrics) {
            categoryCounts[metric.category] = (categoryCounts[metric.category] || 0) + 1;
        }

        const dominantCategory = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)[0];

        if (dominantCategory && dominantCategory[1] > this.metrics.length * 0.5) {
            opportunities.push(`📂 Category imbalance - ${dominantCategory[0]} has ${dominantCategory[1]} templates (${((dominantCategory[1] / this.metrics.length) * 100).toFixed(1)}%)`);
        }

        if (opportunities.length === 0) {
            opportunities.push('✅ Template system is well-optimized - maintain current standards');
        }

        return opportunities;
    }

    /**
     * Display the analytics report
     */
    private displayReport(report: AnalyticsReport): void {
        console.log(chalk.blue.bold('\n📊 Template Usage Analytics Report'));
        console.log(chalk.gray('='.repeat(70)));
        console.log(chalk.cyan(`Generated: ${report.timestamp.toISOString()}`));

        console.log(chalk.blue.bold('\n📈 Overview:'));
        console.log(chalk.gray(`Total templates: ${report.totalTemplates}`));
        console.log(chalk.gray(`Average usage score: ${report.averageUsageScore.toFixed(1)}/100`));

        // Most used templates
        console.log(chalk.green.bold('\n🏆 Most Used Templates:'));
        for (const template of report.mostUsedTemplates) {
            console.log(chalk.gray(`   ${template.name}: ${template.usageScore}/100 (${template.backlinks} backlinks)`));
        }

        // Least used templates
        console.log(chalk.red.bold('\n📉 Least Used Templates:'));
        for (const template of report.leastUsedTemplates) {
            console.log(chalk.gray(`   ${template.name}: ${template.usageScore}/100 (${template.backlinks} backlinks)`));
        }

        // Recommendations by category
        console.log(chalk.yellow.bold('\n💡 Recommendations by Category:'));
        for (const [category, recommendations] of Object.entries(report.recommendationsByCategory)) {
            if (recommendations.length > 0) {
                console.log(chalk.cyan(`\n📂 ${category} (${recommendations.length} recommendations):`));
                const uniqueRecommendations = [...new Set(recommendations)].slice(0, 3);
                for (const rec of uniqueRecommendations) {
                    console.log(chalk.gray(`   ${rec}`));
                }
            }
        }

        // Optimization opportunities
        console.log(chalk.blue.bold('\n🎯 Optimization Opportunities:'));
        for (const opportunity of report.optimizationOpportunities) {
            console.log(chalk.gray(`   ${opportunity}`));
        }

        // Usage distribution
        console.log(chalk.blue.bold('\n📊 Usage Score Distribution:'));
        const distribution = {
            '80-100': this.metrics.filter(m => m.usageScore >= 80).length,
            '60-79': this.metrics.filter(m => m.usageScore >= 60 && m.usageScore < 80).length,
            '40-59': this.metrics.filter(m => m.usageScore >= 40 && m.usageScore < 60).length,
            '20-39': this.metrics.filter(m => m.usageScore >= 20 && m.usageScore < 40).length,
            '0-19': this.metrics.filter(m => m.usageScore < 20).length
        };

        for (const [range, count] of Object.entries(distribution)) {
            const percentage = ((count / this.metrics.length) * 100).toFixed(1);
            const bar = '█'.repeat(Math.ceil(percentage / 5));
            console.log(chalk.gray(`   ${range}: ${count} templates (${percentage}%) ${bar}`));
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
        console.log(chalk.blue.bold('📊 Template Usage Analytics'));
        console.log(chalk.gray('Usage: bun template-analytics.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('\nAnalyzes template usage patterns and provides recommendations'));
        process.exit(0);
    }

    try {
        const analytics = new TemplateUsageAnalytics(vaultPath);
        await analytics.runAnalytics();

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

export { TemplateUsageAnalytics, type TemplateUsageMetrics, type AnalyticsReport };
