#!/usr/bin/env bun
/**
 * File Sorting Script for Staged Files
 * 
 * This script analyzes and organizes staged files by category,
 * providing recommendations for commit organization.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface FileCategory {
    name: string;
    files: string[];
    description: string;
    commitSuggestion: string;
}

interface SortingReport {
    totalStaged: number;
    categories: FileCategory[];
    recommendations: string[];
    commitStrategy: string;
}

class StagedFileSorter {
    private workingDir: string;

    constructor() {
        this.workingDir = process.cwd();
    }

    /**
     * Get all staged files
     */
    private getStagedFiles(): string[] {
        try {
            const output = execSync('git status --porcelain', {
                encoding: 'utf8',
                cwd: this.workingDir
            });

            return output
                .split('\n')
                .filter(line => line.trim())
                .filter(line => line.startsWith('A ') || line.startsWith('AM '))
                .map(line => line.substring(2).trim());
        } catch (error) {
            console.error('Error getting staged files:', error);
            return [];
        }
    }

    /**
     * Categorize files based on their path and type
     */
    private categorizeFiles(files: string[]): FileCategory[] {
        const categories: Map<string, FileCategory> = new Map();

        // Define category patterns
        const categoryPatterns = [
            {
                name: 'Obsidian Plugins',
                patterns: ['\.obsidian/plugins/'],
                description: 'Obsidian plugin files and configurations',
                commitSuggestion: 'feat: add and configure Obsidian plugins'
            },
            {
                name: 'Obsidian Configuration',
                patterns: ['\.obsidian/snippets/', '\.obsidian/'],
                description: 'Obsidian snippets and core configuration',
                commitSuggestion: 'config: update Obsidian vault configuration'
            },
            {
                name: 'Daily Notes & Reports',
                patterns: ['01 - Daily Notes/'],
                description: 'Daily notes, journals, and reports',
                commitSuggestion: 'docs: add daily notes and reports'
            },
            {
                name: 'Architecture Documentation',
                patterns: ['02 - Architecture/'],
                description: 'System architecture and data models',
                commitSuggestion: 'docs: update architecture documentation'
            },
            {
                name: 'Development Documentation',
                patterns: ['03 - Development/'],
                description: 'Development guides and code snippets',
                commitSuggestion: 'docs: add development documentation'
            },
            {
                name: 'Workshop Content',
                patterns: ['11 - Workshop/'],
                description: 'Workshop materials and scripts',
                commitSuggestion: 'feat: add workshop materials and utilities'
            },
            {
                name: 'Vault Scripts',
                patterns: ['Odds-mono-map/scripts/'],
                description: 'Automation and utility scripts',
                commitSuggestion: 'feat: add vault automation scripts'
            },
            {
                name: 'Source Code',
                patterns: ['Odds-mono-map/src/'],
                description: 'TypeScript source code and utilities',
                commitSuggestion: 'feat: implement vault source code modules'
            },
            {
                name: 'Core Packages',
                patterns: ['packages/'],
                description: 'Core package files and utilities',
                commitSuggestion: 'feat: update core packages and utilities'
            },
            {
                name: 'Test Files',
                patterns: ['\.test\.ts$', '\.spec\.ts$', 'test/'],
                description: 'Test files and specifications',
                commitSuggestion: 'test: add and update test files'
            },
            {
                name: 'Configuration Files',
                patterns: ['\.json$', '\.toml$', '\.yaml$', '\.yml$'],
                description: 'Configuration and metadata files',
                commitSuggestion: 'config: update project configuration'
            },
            {
                name: 'Documentation',
                patterns: ['\.md$', 'docs/'],
                description: 'Markdown documentation files',
                commitSuggestion: 'docs: update project documentation'
            }
        ];

        files.forEach(file => {
            let categorized = false;

            for (const category of categoryPatterns) {
                if (category.patterns.some(pattern => {
                    if (pattern.includes('*')) {
                        return new RegExp(pattern.replace('*', '.*')).test(file);
                    }
                    return file.includes(pattern);
                })) {
                    if (!categories.has(category.name)) {
                        categories.set(category.name, {
                            name: category.name,
                            files: [],
                            description: category.description,
                            commitSuggestion: category.commitSuggestion
                        });
                    }
                    categories.get(category.name)!.files.push(file);
                    categorized = true;
                    break;
                }
            }

            if (!categorized) {
                if (!categories.has('Other Files')) {
                    categories.set('Other Files', {
                        name: 'Other Files',
                        files: [],
                        description: 'Files that don\'t fit other categories',
                        commitSuggestion: 'chore: add miscellaneous files'
                    });
                }
                categories.get('Other Files')!.files.push(file);
            }
        });

        return Array.from(categories.values()).sort((a, b) => b.files.length - a.files.length);
    }

    /**
     * Generate commit strategy recommendations
     */
    private generateRecommendations(categories: FileCategory[]): string[] {
        const recommendations: string[] = [];
        const totalFiles = categories.reduce((sum, cat) => sum + cat.files.length, 0);

        if (totalFiles > 100) {
            recommendations.push('🔥 Large number of files staged. Consider splitting into multiple commits.');
        }

        // Check for large categories
        const largeCategories = categories.filter(cat => cat.files.length > 20);
        if (largeCategories.length > 0) {
            recommendations.push(`📊 Large categories detected: ${largeCategories.map(c => c.name).join(', ')}`);
            recommendations.push('💡 Consider splitting these into separate commits for better history tracking.');
        }

        // Check for mixed content types
        const codeCategories = categories.filter(cat =>
            cat.name.includes('Source Code') || cat.name.includes('Core Packages') || cat.name.includes('Test Files')
        );
        const docCategories = categories.filter(cat =>
            cat.name.includes('Documentation') || cat.name.includes('Daily Notes') || cat.name.includes('Architecture')
        );

        if (codeCategories.length > 0 && docCategories.length > 0) {
            recommendations.push('🔄 Mixed code and documentation detected. Consider separating code changes from docs.');
        }

        // Check for plugin files
        const pluginCategories = categories.filter(cat => cat.name.includes('Obsidian'));
        if (pluginCategories.length > 0) {
            recommendations.push('🔌 Obsidian plugin files detected. These can be committed together as configuration.');
        }

        return recommendations;
    }

    /**
     * Generate commit strategy
     */
    private generateCommitStrategy(categories: FileCategory[]): string {
        const strategy: string[] = [];

        strategy.push('# 🎯 Recommended Commit Strategy\n');

        // Prioritize categories by size and importance
        const prioritizedCategories = categories
            .filter(cat => cat.files.length > 0)
            .sort((a, b) => {
                // Prioritize code changes
                const aIsCode = a.name.includes('Source Code') || a.name.includes('Core Packages');
                const bIsCode = b.name.includes('Source Code') || b.name.includes('Core Packages');

                if (aIsCode && !bIsCode) return -1;
                if (!aIsCode && bIsCode) return 1;

                // Then sort by size
                return b.files.length - a.files.length;
            });

        let commitNumber = 1;

        prioritizedCategories.forEach(category => {
            if (category.files.length > 0) {
                strategy.push(`## ${commitNumber++}. ${category.name}`);
                strategy.push(`**Message:** \`${category.commitSuggestion}\``);
                strategy.push(`**Files:** ${category.files.length} files`);
                strategy.push(`**Description:** ${category.description}`);
                strategy.push('');

                if (category.files.length <= 10) {
                    strategy.push('```bash');
                    strategy.push(`git add ${category.files.join(' ')}`);
                    strategy.push(`git commit -m "${category.commitSuggestion}"`);
                    strategy.push('```');
                } else {
                    strategy.push('```bash');
                    strategy.push(`# Add ${category.files.length} files from ${category.name.toLowerCase()}`);
                    strategy.push(`git commit -m "${category.commitSuggestion}"`);
                    strategy.push('```');
                }
                strategy.push('');
            }
        });

        return strategy.join('\n');
    }

    /**
     * Generate and save the sorting report
     */
    public async generateReport(): Promise<SortingReport> {
        console.log('🔍 Analyzing staged files...');

        const stagedFiles = this.getStagedFiles();
        const categories = this.categorizeFiles(stagedFiles);
        const recommendations = this.generateRecommendations(categories);
        const commitStrategy = this.generateCommitStrategy(categories);

        const report: SortingReport = {
            totalStaged: stagedFiles.length,
            categories,
            recommendations,
            commitStrategy
        };

        // Save report to file
        const reportPath = join(this.workingDir, 'staged-files-report.md');
        writeFileSync(reportPath, this.formatReport(report));

        console.log(`📋 Report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Format the report as markdown
     */
    private formatReport(report: SortingReport): string {
        const output: string[] = [];

        output.push('# 📊 Staged Files Analysis Report');
        output.push('');
        output.push(`**Generated:** ${new Date().toISOString()}`);
        output.push(`**Total Staged Files:** ${report.totalStaged}`);
        output.push('');

        // Categories summary
        output.push('## 📂 File Categories');
        output.push('');
        report.categories.forEach(category => {
            output.push(`### ${category.name} (${category.files.length} files)`);
            output.push(`**Description:** ${category.description}`);
            output.push(`**Suggested Commit:** \`${category.commitSuggestion}\``);
            output.push('');

            if (category.files.length <= 10) {
                output.push('**Files:**');
                category.files.forEach(file => {
                    output.push(`- \`${file}\``);
                });
            } else {
                output.push(`**Files:** ${category.files.length} files (too many to list)`);
                output.push('**Sample files:**');
                category.files.slice(0, 5).forEach(file => {
                    output.push(`- \`${file}\``);
                });
                output.push(`- ... and ${category.files.length - 5} more`);
            }
            output.push('');
        });

        // Recommendations
        if (report.recommendations.length > 0) {
            output.push('## 💡 Recommendations');
            output.push('');
            report.recommendations.forEach(rec => {
                output.push(`- ${rec}`);
            });
            output.push('');
        }

        // Commit strategy
        output.push(report.commitStrategy);

        return output.join('\n');
    }

    /**
     * Execute commits based on recommendations
     */
    public async executeCommits(dryRun: boolean = true): Promise<void> {
        const report = await this.generateReport();

        if (dryRun) {
            console.log('🔍 DRY RUN MODE - No commits will be executed');
            console.log('\n' + report.commitStrategy);
            return;
        }

        console.log('🚀 EXECUTING COMMITS - This will modify your git history');

        // Execute commits by category (starting with largest categories)
        const prioritizedCategories = report.categories
            .filter(cat => cat.files.length > 0)
            .sort((a, b) => {
                // Prioritize code changes
                const aIsCode = a.name.includes('Source Code') || a.name.includes('Core Packages');
                const bIsCode = b.name.includes('Source Code') || b.name.includes('Core Packages');

                if (aIsCode && !bIsCode) return -1;
                if (!aIsCode && bIsCode) return 1;

                // Then sort by size
                return b.files.length - a.files.length;
            });

        for (const category of prioritizedCategories) {
            if (category.files.length > 0) {
                console.log(`\n📝 Committing ${category.name} (${category.files.length} files)...`);

                try {
                    // Stage files for this category
                    if (category.files.length <= 20) {
                        execSync(`git add ${category.files.join(' ')}`, { cwd: this.workingDir });
                    } else {
                        // For large categories, stage by pattern
                        const firstFile = category.files[0];
                        const pathParts = firstFile.split('/');
                        if (pathParts.length > 1) {
                            execSync(`git add ${pathParts[0]}/*`, { cwd: this.workingDir });
                        } else {
                            execSync('git add .', { cwd: this.workingDir });
                        }
                    }

                    // Commit with suggested message
                    execSync(`git commit -m "${category.commitSuggestion}"`, { cwd: this.workingDir });
                    console.log(`✅ Committed: ${category.commitSuggestion}`);

                } catch (error) {
                    console.error(`❌ Error committing ${category.name}:`, error);
                }
            }
        }

        console.log('\n🎉 Commit execution completed!');
        console.log('Run `git log --oneline -10` to see the recent commits.');
    }
}

// Main execution
async function main() {
    const sorter = new StagedFileSorter();

    try {
        const report = await sorter.generateReport();

        console.log('\n📈 Summary:');
        console.log(`- Total staged files: ${report.totalStaged}`);
        console.log(`- Categories: ${report.categories.length}`);
        console.log(`- Recommendations: ${report.recommendations.length}`);

        // Show top categories
        console.log('\n🏆 Top Categories:');
        report.categories.slice(0, 5).forEach((cat, i) => {
            console.log(`${i + 1}. ${cat.name}: ${cat.files.length} files`);
        });

        if (report.recommendations.length > 0) {
            console.log('\n💡 Key Recommendations:');
            report.recommendations.slice(0, 3).forEach(rec => {
                console.log(`  ${rec}`);
            });
        }

        console.log('\n📋 Full report saved to: staged-files-report.md');
        console.log('\n💻 To execute commits, run:');
        console.log('  bun run sort-staged-files --execute');

    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

// Check if execution flag is passed
if (process.argv.includes('--execute')) {
    const sorter = new StagedFileSorter();
    sorter.executeCommits(false); // Pass false for actual execution
} else {
    main();
}
