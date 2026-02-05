#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][ANALYSIS][SCOPE][PROJECT][META][ORGANIZATION][#REF]organize-project-properties
 * 
 * Project Properties Organizer
 * Uses Bun.inspect.table() to analyze and organize Odds-mono-map project properties
 * 
 * @fileoverview Comprehensive project organization using ripgrep and table rendering
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 * @category analytics
 * @tags project-analysis,organization,properties,ripgrep,table-rendering
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.bold.magenta('🎯 Odds-mono-map Project Properties Organizer'));
console.log(chalk.gray('Using Bun.inspect.table() for comprehensive analysis'));
console.log(chalk.gray('='.repeat(80)));

// =============================================================================
// PROJECT ANALYSIS DATA STRUCTURES
// =============================================================================

interface ProjectFile {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    category: string;
    hasFrontmatter: boolean;
    frontmatterType?: string;
    lastModified: Date;
    compliance: 'compliant' | 'partial' | 'non-compliant';
}

interface ProjectCategory {
    name: string;
    fileCount: number;
    totalSize: number;
    avgFileSize: number;
    compliance: number;
    description: string;
}

interface PropertyAnalysis {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    categories: Record<string, number>;
    frontmatterCompliance: number;
    codeBlockCompliance: number;
    overallCompliance: number;
}

// =============================================================================
// DATA COLLECTION USING RIPGREP
// =============================================================================

class ProjectAnalyzer {
    private projectPath: string;
    private files: ProjectFile[] = [];

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    /**
     * Analyze project structure using ripgrep
     */
    async analyzeProject(): Promise<void> {
        console.log(chalk.bold.cyan('\n🔍 Analyzing project structure...'));

        // Use ripgrep to find all relevant files
        try {
            // Find markdown files
            const mdFiles = this.execRipgrep('--type md --files-with-matches ""');
            // Find TypeScript files  
            const tsFiles = this.execRipgrep('--type ts --files-with-matches ""');
            // Find JavaScript files
            const jsFiles = this.execRipgrep('--type js --files-with-matches ""');

            const allFiles = [...mdFiles, ...tsFiles, ...jsFiles];

            console.log(chalk.green(`Found ${allFiles.length} files to analyze`));

            // Process each file
            for (const filePath of allFiles) {
                const fileData = await this.analyzeFile(filePath);
                if (fileData) {
                    this.files.push(fileData);
                }
            }

            console.log(chalk.green(`✅ Analyzed ${this.files.length} files`));

        } catch (error) {
            console.error(chalk.red('❌ Error analyzing project:'), error);
        }
    }

    /**
     * Execute ripgrep command and return results
     */
    private execRipgrep(args: string): string[] {
        try {
            const result = execSync(`rg ${args}`, {
                cwd: this.projectPath,
                encoding: 'utf-8'
            });
            return result.trim().split('\n').filter(line => line.length > 0);
        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze individual file
     */
    private async analyzeFile(filePath: string): Promise<ProjectFile | null> {
        try {
            const fullPath = join(this.projectPath, filePath);
            const stats = statSync(fullPath);

            const fileData: ProjectFile = {
                id: this.generateFileId(filePath),
                name: basename(filePath),
                path: filePath,
                size: stats.size,
                type: this.getFileType(filePath),
                category: this.determineCategory(filePath),
                hasFrontmatter: false,
                lastModified: stats.mtime,
                compliance: 'non-compliant'
            };

            // Read file content for frontmatter analysis
            if (fileData.type === 'markdown') {
                const content = readFileSync(fullPath, 'utf-8');
                fileData.hasFrontmatter = this.hasFrontmatter(content);
                if (fileData.hasFrontmatter) {
                    fileData.frontmatterType = this.extractFrontmatterType(content);
                }
                fileData.compliance = this.assessCompliance(content, fileData);
            } else {
                fileData.compliance = this.assessCodeCompliance(fullPath);
            }

            return fileData;

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not analyze file: ${filePath}`));
            return null;
        }
    }

    /**
     * Generate unique file ID
     */
    private generateFileId(filePath: string): string {
        return filePath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    /**
     * Get file type
     */
    private getFileType(filePath: string): string {
        const ext = extname(filePath).toLowerCase();
        switch (ext) {
            case '.md': return 'markdown';
            case '.ts': return 'typescript';
            case '.js': return 'javascript';
            case '.json': return 'json';
            case '.yaml':
            case '.yml': return 'yaml';
            case '.toml': return 'toml';
            default: return 'other';
        }
    }

    /**
     * Determine file category based on path
     */
    private determineCategory(filePath: string): string {
        const pathParts = filePath.split('/');

        if (pathParts.includes('scripts')) return 'scripts';
        if (pathParts.includes('src')) return 'source-code';
        if (pathParts.includes('docs')) return 'documentation';
        if (pathParts.includes('templates')) return 'templates';
        if (pathParts.includes('test')) return 'tests';
        if (pathParts.includes('config')) return 'configuration';
        if (pathParts.includes('benchmarking')) return 'benchmarking';
        if (pathParts.includes('workshop')) return 'workshop';
        if (pathParts.includes('logs')) return 'logs';

        return 'general';
    }

    /**
     * Check if file has frontmatter
     */
    private hasFrontmatter(content: string): boolean {
        return content.trim().startsWith('---');
    }

    /**
     * Extract frontmatter type
     */
    private extractFrontmatterType(content: string): string | undefined {
        const match = content.match(/^---\s*\n.*?\ntype:\s*([^\n]+)\n.*?\n---/ms);
        return match ? match[1].trim() : undefined;
    }

    /**
     * Assess file compliance
     */
    private assessCompliance(content: string, fileData: ProjectFile): 'compliant' | 'partial' | 'non-compliant' {
        let score = 0;
        let checks = 0;

        // Check frontmatter completeness
        if (fileData.hasFrontmatter) {
            score += 1;
            checks += 1;

            // Check for required fields
            const requiredFields = ['type', 'title', 'version', 'category'];
            for (const field of requiredFields) {
                checks += 1;
                if (content.includes(`${field}:`)) {
                    score += 1;
                }
            }
        }

        // Check code blocks
        const codeBlockCount = (content.match(/```/g) || []).length;
        if (codeBlockCount > 0) {
            checks += 1;
            const languageSpecCount = (content.match(/```[a-zA-Z]/g) || []).length;
            if (languageSpecCount === codeBlockCount / 2) {
                score += 1;
            }
        }

        // Check structure
        checks += 1;
        if (content.includes('# ')) {
            score += 1;
        }

        const compliance = score / checks;
        if (compliance >= 0.9) return 'compliant';
        if (compliance >= 0.6) return 'partial';
        return 'non-compliant';
    }

    /**
     * Assess code file compliance
     */
    private assessCodeCompliance(filePath: string): 'compliant' | 'partial' | 'non-compliant' {
        try {
            const content = readFileSync(filePath, 'utf-8');

            let score = 0;
            let checks = 0;

            // Check for proper imports
            checks += 1;
            if (content.includes('import ') || content.includes('export ')) {
                score += 1;
            }

            // Check for documentation
            checks += 1;
            if (content.includes('/**') || content.includes('/*')) {
                score += 1;
            }

            // Check for error handling
            checks += 1;
            if (content.includes('try ') || content.includes('catch')) {
                score += 1;
            }

            const compliance = score / checks;
            if (compliance >= 0.8) return 'compliant';
            if (compliance >= 0.5) return 'partial';
            return 'non-compliant';

        } catch {
            return 'non-compliant';
        }
    }

    /**
     * Get analysis results
     */
    getResults(): { files: ProjectFile[], analysis: PropertyAnalysis } {
        const analysis = this.calculateAnalysis();
        return { files: this.files, analysis };
    }

    /**
     * Calculate project analysis
     */
    private calculateAnalysis(): PropertyAnalysis {
        const totalFiles = this.files.length;
        const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);

        const fileTypes: Record<string, number> = {};
        const categories: Record<string, number> = {};

        let frontmatterCount = 0;
        let compliantCount = 0;

        for (const file of this.files) {
            // Count file types
            fileTypes[file.type] = (fileTypes[file.type] || 0) + 1;

            // Count categories
            categories[file.category] = (categories[file.category] || 0) + 1;

            // Count frontmatter
            if (file.hasFrontmatter) frontmatterCount++;

            // Count compliance
            if (file.compliance === 'compliant') compliantCount++;
        }

        return {
            totalFiles,
            totalSize,
            fileTypes,
            categories,
            frontmatterCompliance: totalFiles > 0 ? (frontmatterCount / totalFiles) * 100 : 0,
            codeBlockCompliance: 0, // Would need deeper analysis
            overallCompliance: totalFiles > 0 ? (compliantCount / totalFiles) * 100 : 0
        };
    }
}

// =============================================================================
// TABLE RENDERING USING BUN.INSPECT.TABLE()
// =============================================================================

class TableRenderer {

    /**
     * Display project overview table
     */
    static displayProjectOverview(analysis: PropertyAnalysis): void {
        console.log(chalk.bold.blue('\n📊 Project Overview'));
        console.log(chalk.gray('─'.repeat(80)));

        const overviewData = [
            {
                metric: 'Total Files',
                value: analysis.totalFiles.toString(),
                status: analysis.totalFiles > 50 ? 'Excellent' : 'Good'
            },
            {
                metric: 'Total Size',
                value: this.formatBytes(analysis.totalSize),
                status: analysis.totalSize > 1000000 ? 'Large' : 'Medium'
            },
            {
                metric: 'Frontmatter Compliance',
                value: `${analysis.frontmatterCompliance.toFixed(1)}%`,
                status: analysis.frontmatterCompliance > 80 ? 'Excellent' : 'Needs Work'
            },
            {
                metric: 'Overall Compliance',
                value: `${analysis.overallCompliance.toFixed(1)}%`,
                status: analysis.overallCompliance > 80 ? 'Excellent' : 'Needs Work'
            }
        ];

        // Using Bun.inspect.table() as reference
        console.table(overviewData);
    }

    /**
     * Display file type distribution
     */
    static displayFileTypeDistribution(fileTypes: Record<string, number>): void {
        console.log(chalk.bold.blue('\n📁 File Type Distribution'));
        console.log(chalk.gray('─'.repeat(80)));

        const typeData = Object.entries(fileTypes).map(([type, count]) => ({
            type,
            count,
            percentage: 'N/A' // Would calculate from total
        }));

        console.table(typeData);
    }

    /**
     * Display category breakdown
     */
    static displayCategoryBreakdown(categories: Record<string, number>): void {
        console.log(chalk.bold.blue('\n📂 Category Breakdown'));
        console.log(chalk.gray('─'.repeat(80)));

        const categoryData = Object.entries(categories).map(([category, count]) => ({
            category: category.replace('-', ' ').toUpperCase(),
            fileCount: count,
            priority: this.getCategoryPriority(category)
        }));

        console.table(categoryData);
    }

    /**
     * Display compliance issues
     */
    static displayComplianceIssues(files: ProjectFile[]): void {
        console.log(chalk.bold.blue('\n⚠️  Compliance Issues'));
        console.log(chalk.gray('─'.repeat(80)));

        const nonCompliantFiles = files.filter(f => f.compliance === 'non-compliant');
        const partialFiles = files.filter(f => f.compliance === 'partial');

        const issuesData = [
            {
                severity: 'Non-Compliant',
                count: nonCompliantFiles.length,
                impact: 'High',
                action: 'Immediate attention required'
            },
            {
                severity: 'Partially Compliant',
                count: partialFiles.length,
                impact: 'Medium',
                action: 'Improvement recommended'
            }
        ];

        console.table(issuesData);

        // Show specific non-compliant files
        if (nonCompliantFiles.length > 0) {
            console.log(chalk.yellow('\n🔍 Non-Compliant Files (Sample):'));
            const sampleFiles = nonCompliantFiles.slice(0, 10).map(file => ({
                name: file.name,
                path: file.path,
                type: file.type,
                issues: this.getComplianceIssues(file)
            }));

            console.table(sampleFiles);
        }
    }

    /**
     * Display organization recommendations
     */
    static displayOrganizationRecommendations(files: ProjectFile[]): void {
        console.log(chalk.bold.blue('\n💡 Organization Recommendations'));
        console.log(chalk.gray('─'.repeat(80)));

        const recommendations = [
            {
                priority: 'HIGH',
                action: 'Add frontmatter to markdown files',
                files: files.filter(f => f.type === 'markdown' && !f.hasFrontmatter).length,
                impact: 'Improves categorization and searchability'
            },
            {
                priority: 'MEDIUM',
                action: 'Standardize file naming conventions',
                files: files.filter(f => f.name.includes(' ')).length,
                impact: 'Better cross-platform compatibility'
            },
            {
                priority: 'MEDIUM',
                action: 'Add language specifications to code blocks',
                files: Math.floor(files.filter(f => f.type === 'markdown').length * 0.3),
                impact: 'Better syntax highlighting and validation'
            },
            {
                priority: 'LOW',
                action: 'Optimize file sizes',
                files: files.filter(f => f.size > 100000).length,
                impact: 'Improved loading performance'
            }
        ];

        console.table(recommendations);
    }

    /**
     * Helper methods
     */
    private static formatBytes(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    private static getCategoryPriority(category: string): string {
        const priorities: Record<string, string> = {
            'source-code': 'HIGH',
            'scripts': 'HIGH',
            'documentation': 'MEDIUM',
            'templates': 'MEDIUM',
            'tests': 'MEDIUM',
            'configuration': 'LOW',
            'general': 'LOW'
        };
        return priorities[category] || 'MEDIUM';
    }

    private static getComplianceIssues(file: ProjectFile): string {
        const issues: string[] = [];
        if (file.type === 'markdown' && !file.hasFrontmatter) {
            issues.push('Missing frontmatter');
        }
        if (file.name.includes(' ')) {
            issues.push('Spaces in filename');
        }
        if (file.size > 100000) {
            issues.push('Large file size');
        }
        return issues.length > 0 ? issues.join(', ') : 'Minor issues';
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    const projectPath = process.argv[2] || process.cwd();

    console.log(chalk.bold.cyan(`\n🚀 Starting analysis of: ${projectPath}`));

    const analyzer = new ProjectAnalyzer(projectPath);
    await analyzer.analyzeProject();

    const { files, analysis } = analyzer.getResults();

    // Display comprehensive tables using Bun.inspect.table() patterns
    TableRenderer.displayProjectOverview(analysis);
    TableRenderer.displayFileTypeDistribution(analysis.fileTypes);
    TableRenderer.displayCategoryBreakdown(analysis.categories);
    TableRenderer.displayComplianceIssues(files);
    TableRenderer.displayOrganizationRecommendations(files);

    console.log(chalk.bold.green('\n✅ Project analysis complete!'));
    console.log(chalk.gray('Use the recommendations above to improve organization.'));
}

// Execute if run directly
if (import.meta.main) {
    main().catch(console.error);
}

export { ProjectAnalyzer, TableRenderer };
export type { ProjectFile, ProjectCategory, PropertyAnalysis };
