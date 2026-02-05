#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ANALYTICS][#REF]enhanced-template-analytics
 * 
 * Enhanced Template Analytics
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
 * Enhanced Template Analytics with Bun.inspect.table()
 * Beautiful tabular output for template usage analytics and recommendations
 * 
 * @fileoverview Enhanced template analytics with Bun table formatting
 * @author Odds Protocol Team
 * @version 2.0.0
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

class EnhancedTemplateAnalytics {
    private vaultPath: string;
    private templatesDir: string;
    private metrics: TemplateUsageMetrics[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
    }

    /**
     * Run comprehensive template usage analytics with beautiful table output
     */
    async runEnhancedAnalytics(): Promise<AnalyticsReport> {
        console.log(chalk.blue.bold('📊 Enhanced Template Usage Analytics'));
        console.log(chalk.gray('Powered by Bun.inspect.table() for beautiful formatting\n'));

        try {
            const files = await this.getAllTemplateFiles();
            console.log(chalk.cyan(`🔍 Analyzing ${files.length} templates for usage patterns...`));

            for (const filePath of files) {
                await this.analyzeTemplate(filePath);
            }

            const report = this.generateReport();
            this.displayEnhancedReport(report);

            return report;

        } catch (error) {
            console.error(chalk.red(`❌ Error running analytics: ${error.message}`));
            throw error;
        }
    }

    /**
     * Display beautiful tables using Bun.inspect.table()
     */
    private displayTable(title: string, data: any[], properties: string[] | object = {}): void {
        console.log(chalk.blue.bold(`\n${title}`));
        console.log(chalk.gray('─'.repeat(80)));

        const tableOutput = Bun.inspect.table(data, properties, {
            colors: true,
            depth: 2,
            maxStringLength: 50
        });

        console.log(tableOutput);
    }

    /**
     * Display enhanced report with beautiful tables
     */
    private displayEnhancedReport(report: AnalyticsReport): void {
        // Overview table
        this.displayTable('📈 System Overview', [
            {
                'Metric': 'Total Templates',
                'Value': report.totalTemplates,
                'Status': this.getStatusEmoji(report.totalTemplates > 30)
            },
            {
                'Metric': 'Average Usage Score',
                'Value': `${report.averageUsageScore.toFixed(1)}/100`,
                'Status': this.getStatusEmoji(report.averageUsageScore > 60)
            },
            {
                'Metric': 'Health Score',
                'Value': `${this.calculateHealthScore(report)}/100`,
                'Status': this.getStatusEmoji(this.calculateHealthScore(report) > 80)
            },
            {
                'Metric': 'Generated',
                'Value': report.timestamp.toLocaleString(),
                'Status': '🕐'
            }
        ]);

        // Most used templates table
        const mostUsedData = report.mostUsedTemplates.map((template, index) => ({
            'Rank': `#${index + 1}`,
            'Template': template.name.length > 25 ? template.name.substring(0, 22) + '...' : template.name,
            'Usage Score': `${template.usageScore}/100`,
            'Backlinks': template.backlinks,
            'Complexity': template.complexity,
            'Size': `${(template.size / 1024).toFixed(1)}KB`,
            'Status': this.getUsageScoreEmoji(template.usageScore)
        }));

        this.displayTable('🏆 Most Used Templates', mostUsedData, [
            'Rank', 'Template', 'Usage Score', 'Backlinks', 'Complexity', 'Size', 'Status'
        ]);

        // Least used templates table
        const leastUsedData = report.leastUsedTemplates.map((template, index) => ({
            'Rank': `#${index + 1}`,
            'Template': template.name.length > 25 ? template.name.substring(0, 22) + '...' : template.name,
            'Usage Score': `${template.usageScore}/100`,
            'Backlinks': template.backlinks,
            'Complexity': template.complexity,
            'Size': `${(template.size / 1024).toFixed(1)}KB`,
            'Status': this.getUsageScoreEmoji(template.usageScore)
        }));

        this.displayTable('📉 Least Used Templates', leastUsedData, [
            'Rank', 'Template', 'Usage Score', 'Backlinks', 'Complexity', 'Size', 'Status'
        ]);

        // Category analysis table
        const categoryData = this.analyzeCategories();
        this.displayTable('📂 Category Analysis', categoryData, [
            'Category', 'Templates', 'Avg Usage', 'Avg Complexity', 'Health', 'Recommendations'
        ]);

        // Optimization opportunities table
        const opportunitiesData = report.optimizationOpportunities.map((opportunity, index) => ({
            'Priority': this.getPriorityEmoji(index),
            'Opportunity': opportunity,
            'Impact': this.estimateImpact(opportunity),
            'Effort': this.estimateEffort(opportunity)
        }));

        this.displayTable('🎯 Optimization Opportunities', opportunitiesData);

        // Usage score distribution table
        const distributionData = this.getUsageDistribution();
        this.displayTable('📊 Usage Score Distribution', distributionData);

        // Recommendations summary
        console.log(chalk.blue.bold('\n💡 Recommendations Summary'));
        console.log(chalk.gray('─'.repeat(80)));

        for (const [category, recommendations] of Object.entries(report.recommendationsByCategory)) {
            if (recommendations.length > 0) {
                console.log(chalk.cyan(`\n📂 ${category} (${recommendations.length} recommendations):`));
                const uniqueRecommendations = [...new Set(recommendations)].slice(0, 3);
                for (const rec of uniqueRecommendations) {
                    console.log(chalk.gray(`   ${rec}`));
                }
            }
        }
    }

    /**
     * Analyze categories for table display
     */
    private analyzeCategories(): any[] {
        const categoryStats: { [category: string]: { count: number; totalUsage: number; totalComplexity: number } } = {};

        for (const metric of this.metrics) {
            if (!categoryStats[metric.category]) {
                categoryStats[metric.category] = { count: 0, totalUsage: 0, totalComplexity: 0 };
            }
            categoryStats[metric.category].count++;
            categoryStats[metric.category].totalUsage += metric.usageScore;
            categoryStats[metric.category].totalComplexity += metric.complexity;
        }

        return Object.entries(categoryStats).map(([category, stats]) => ({
            'Category': category,
            'Templates': stats.count,
            'Avg Usage': `${(stats.totalUsage / stats.count).toFixed(1)}/100`,
            'Avg Complexity': Math.round(stats.totalComplexity / stats.count),
            'Health': this.getHealthEmoji((stats.totalUsage / stats.count)),
            'Recommendations': this.getCategoryRecommendations(category).length
        })).sort((a, b) => b.Templates - a.Templates);
    }

    /**
     * Get usage score distribution for table
     */
    private getUsageDistribution(): any[] {
        const distribution = {
            '80-100 (Excellent)': this.metrics.filter(m => m.usageScore >= 80).length,
            '60-79 (Good)': this.metrics.filter(m => m.usageScore >= 60 && m.usageScore < 80).length,
            '40-59 (Fair)': this.metrics.filter(m => m.usageScore >= 40 && m.usageScore < 60).length,
            '20-39 (Poor)': this.metrics.filter(m => m.usageScore >= 20 && m.usageScore < 40).length,
            '0-19 (Critical)': this.metrics.filter(m => m.usageScore < 20).length
        };

        return Object.entries(distribution).map(([range, count]) => {
            const percentage = ((count / this.metrics.length) * 100).toFixed(1);
            const bar = '█'.repeat(Math.ceil(parseFloat(percentage) / 5));
            return {
                'Score Range': range,
                'Templates': count,
                'Percentage': `${percentage}%`,
                'Distribution': bar.padEnd(20),
                'Status': this.getRangeStatus(parseFloat(percentage))
            };
        });
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
        // Simulated backlink count - in real implementation would scan vault
        return Math.floor(Math.random() * 10);
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

        if (metrics.usageScore < 20) {
            recommendations.push('🔍 Low usage - consider promoting or improving documentation');
        } else if (metrics.usageScore > 80) {
            recommendations.push('📈 High usage - ensure maintenance and consider optimization');
        }

        if (metrics.complexity > 150) {
            recommendations.push('🔧 High complexity - consider simplification or splitting');
        }

        if (metrics.backlinks === 0) {
            recommendations.push('🔗 No backlinks - add references from other templates');
        }

        if (metrics.outboundLinks < 5) {
            recommendations.push('➕ Few outbound links - add more references and connections');
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

        const lowUsageCount = this.metrics.filter(m => m.usageScore < 20).length;
        if (lowUsageCount > 0) {
            opportunities.push(`📉 ${lowUsageCount} templates have low usage - consider consolidation or improvement`);
        }

        const highComplexityCount = this.metrics.filter(m => m.complexity > 150).length;
        if (highComplexityCount > 0) {
            opportunities.push(`🔧 ${highComplexityCount} templates have high complexity - optimization needed`);
        }

        const unlinkedCount = this.metrics.filter(m => m.backlinks === 0).length;
        if (unlinkedCount > 0) {
            opportunities.push(`🔗 ${unlinkedCount} templates have no backlinks - improve integration`);
        }

        if (opportunities.length === 0) {
            opportunities.push('✅ Template system is well-optimized - maintain current standards');
        }

        return opportunities;
    }

    // =============================================================================
    // UTILITY METHODS FOR TABLE DISPLAY
    // =============================================================================

    private calculateHealthScore(report: AnalyticsReport): number {
        return Math.min(100, Math.round(report.averageUsageScore * 1.2));
    }

    private getStatusEmoji(condition: boolean): string {
        return condition ? '✅' : '⚠️';
    }

    private getUsageScoreEmoji(score: number): string {
        if (score >= 80) return '🟢';
        if (score >= 60) return '🟡';
        if (score >= 40) return '🟠';
        return '🔴';
    }

    private getHealthEmoji(score: number): string {
        if (score >= 80) return '🟢';
        if (score >= 60) return '🟡';
        if (score >= 40) return '🟠';
        return '🔴';
    }

    private getPriorityEmoji(index: number): string {
        if (index === 0) return '🔴';
        if (index === 1) return '🟡';
        if (index === 2) return '🟠';
        return '🔵';
    }

    private estimateImpact(opportunity: string): string {
        if (opportunity.includes('high complexity')) return 'High';
        if (opportunity.includes('low usage')) return 'Medium';
        if (opportunity.includes('no backlinks')) return 'Medium';
        return 'Low';
    }

    private estimateEffort(opportunity: string): string {
        if (opportunity.includes('high complexity')) return 'High';
        if (opportunity.includes('consolidation')) return 'Medium';
        return 'Low';
    }

    private getRangeStatus(percentage: number): string {
        if (percentage > 40) return '🟢 Healthy';
        if (percentage > 20) return '🟡 Balanced';
        return '🔴 Needs Attention';
    }

    private getCategoryRecommendations(category: string): string[] {
        return this.metrics
            .filter(m => m.category === category)
            .flatMap(m => m.recommendations);
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('📊 Enhanced Template Analytics (Bun.inspect.table())'));
        console.log(chalk.gray('Usage: bun enhanced-template-analytics.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('\nFeatures beautiful tabular output powered by Bun.inspect.table()'));
        process.exit(0);
    }

    try {
        const analytics = new EnhancedTemplateAnalytics(vaultPath);
        await analytics.runEnhancedAnalytics();

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

export { EnhancedTemplateAnalytics, type TemplateUsageMetrics, type AnalyticsReport };
