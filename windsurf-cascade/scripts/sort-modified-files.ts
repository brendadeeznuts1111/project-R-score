#!/usr/bin/env bun
/**
 * File Sorting Script for Modified Files
 * 
 * This script analyzes and organizes modified (unstaged) files by category,
 * providing recommendations for staging and committing.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface FileCategory {
    name: string;
    files: string[];
    description: string;
    stagingSuggestion: string;
}

interface ModifiedFileReport {
    totalModified: number;
    categories: FileCategory[];
    recommendations: string[];
    stagingStrategy: string;
}

class ModifiedFileSorter {
    private workingDir: string;

    constructor() {
        this.workingDir = process.cwd();
    }

    /**
     * Get all modified (unstaged) files
     */
    private getModifiedFiles(): string[] {
        try {
            const output = execSync('git status --porcelain', {
                encoding: 'utf8',
                cwd: this.workingDir
            });

            return output
                .split('\n')
                .filter(line => line.trim())
                .filter(line => line.startsWith(' M ') || line.startsWith(' M') || line.startsWith('MM'))
                .map(line => line.substring(2).trim());
        } catch (error) {
            console.error('Error getting modified files:', error);
            return [];
        }
    }

    /**
     * Get diff information for modified files
     */
    private getDiffInfo(file: string): { additions: number; deletions: number; changes: number } {
        try {
            const diffOutput = execSync(`git diff --numstat "${file}"`, {
                encoding: 'utf8',
                cwd: this.workingDir
            });

            const [additions, deletions] = diffOutput.trim().split('\t').map(Number);
            return {
                additions: additions || 0,
                deletions: deletions || 0,
                changes: (additions || 0) + (deletions || 0)
            };
        } catch (error) {
            return { additions: 0, deletions: 0, changes: 0 };
        }
    }

    /**
     * Categorize files based on their path and type
     */
    private categorizeFiles(files: string[]): FileCategory[] {
        const categories: Map<string, FileCategory> = new Map();

        const categoryPatterns = [
            {
                name: 'Core Package Files',
                patterns: ['packages/odds-'],
                description: 'Core odds package modifications',
                stagingSuggestion: 'git add packages/ && git commit -m "feat: update core packages"'
            },
            {
                name: 'Configuration Files',
                patterns: ['\.yml$', '\.yaml$', '\.toml$', '\.json$'],
                description: 'Configuration and build files',
                stagingSuggestion: 'git add *.yml *.yaml *.toml *.json && git commit -m "config: update build configuration"'
            },
            {
                name: 'Documentation',
                patterns: ['\.md$'],
                description: 'Documentation and README files',
                stagingSuggestion: 'git add *.md && git commit -m "docs: update documentation"'
            },
            {
                name: 'Root Files',
                patterns: ['^[^/]+$'],
                description: 'Project root level files',
                stagingSuggestion: 'git add [root-files] && git commit -m "chore: update root configuration"'
            },
            {
                name: 'Test Files',
                patterns: ['\.test\.ts$', '\.spec\.ts$'],
                description: 'Test and specification files',
                stagingSuggestion: 'git add **/*.test.ts **/*.spec.ts && git commit -m "test: update test specifications"'
            }
        ];

        files.forEach(file => {
            let categorized = false;

            for (const category of categoryPatterns) {
                if (category.patterns.some(pattern => {
                    if (pattern.includes('*')) {
                        return new RegExp(pattern.replace('*', '.*')).test(file);
                    }
                    if (pattern.startsWith('^') && pattern.endsWith('$')) {
                        return new RegExp(pattern).test(file);
                    }
                    return file.includes(pattern);
                })) {
                    if (!categories.has(category.name)) {
                        categories.set(category.name, {
                            name: category.name,
                            files: [],
                            description: category.description,
                            stagingSuggestion: category.stagingSuggestion
                        });
                    }
                    categories.get(category.name)!.files.push(file);
                    categorized = true;
                    break;
                }
            }

            if (!categorized) {
                if (!categories.has('Other Modified Files')) {
                    categories.set('Other Modified Files', {
                        name: 'Other Modified Files',
                        files: [],
                        description: 'Other modified files',
                        stagingSuggestion: 'git add [other-files] && git commit -m "chore: update miscellaneous files"'
                    });
                }
                categories.get('Other Modified Files')!.files.push(file);
            }
        });

        return Array.from(categories.values()).sort((a, b) => b.files.length - a.files.length);
    }

    /**
     * Generate staging recommendations
     */
    private generateRecommendations(categories: FileCategory[]): string[] {
        const recommendations: string[] = [];
        const totalFiles = categories.reduce((sum, cat) => sum + cat.files.length, 0);

        if (totalFiles === 0) {
            recommendations.push('✅ No modified files found. Working directory is clean!');
            return recommendations;
        }

        recommendations.push(`📝 Found ${totalFiles} modified file(s) that need attention.`);

        // Check for critical files
        const criticalFiles = categories
            .flatMap(cat => cat.files)
            .filter(file => file.includes('package.json') || file.includes('tsconfig.json') || file.includes('bun.lock'));

        if (criticalFiles.length > 0) {
            recommendations.push('⚠️  Critical configuration files modified. Review these changes carefully.');
        }

        // Check for large changes
        categories.forEach(category => {
            category.files.forEach(file => {
                const diffInfo = this.getDiffInfo(file);
                if (diffInfo.changes > 100) {
                    recommendations.push(`🔥 Large changes in \`${file}\`: ${diffInfo.changes} lines changed`);
                }
            });
        });

        return recommendations;
    }

    /**
     * Generate staging strategy
     */
    private generateStagingStrategy(categories: FileCategory[]): string {
        const strategy: string[] = [];

        strategy.push('# 🎯 Recommended Staging Strategy\n');

        if (categories.length === 0 || categories.every(cat => cat.files.length === 0)) {
            strategy.push('✅ **No files to stage** - Working directory is clean!');
            return strategy.join('\n');
        }

        strategy.push('## 📋 Staging Commands\n');

        let stepNumber = 1;

        categories.forEach(category => {
            if (category.files.length > 0) {
                strategy.push(`### ${stepNumber++}. ${category.name}`);
                strategy.push(`**Files:** ${category.files.length}`);
                strategy.push(`**Description:** ${category.description}`);
                strategy.push('');

                strategy.push('**Files to stage:**');
                category.files.forEach(file => {
                    const diffInfo = this.getDiffInfo(file);
                    strategy.push(`- \`${file}\` (+${diffInfo.additions}/-${diffInfo.deletions})`);
                });
                strategy.push('');

                strategy.push('**Command:**');
                strategy.push('```bash');
                if (category.files.length <= 5) {
                    strategy.push(`git add ${category.files.join(' ')}`);
                } else {
                    strategy.push(`git add ${category.files[0].split('/')[0]}/*`);
                }
                strategy.push('```');
                strategy.push('');
            }
        });

        strategy.push('## 🚀 Quick Stage All');
        strategy.push('```bash');
        strategy.push('# Stage all modified files');
        strategy.push('git add -A');
        strategy.push('git commit -m "feat: update project files and configuration"');
        strategy.push('```');
        strategy.push('');

        return strategy.join('\n');
    }

    /**
     * Generate and save the report
     */
    public async generateReport(): Promise<ModifiedFileReport> {
        console.log('🔍 Analyzing modified files...');

        const modifiedFiles = this.getModifiedFiles();
        const categories = this.categorizeFiles(modifiedFiles);
        const recommendations = this.generateRecommendations(categories);
        const stagingStrategy = this.generateStagingStrategy(categories);

        const report: ModifiedFileReport = {
            totalModified: modifiedFiles.length,
            categories,
            recommendations,
            stagingStrategy
        };

        // Save report to file
        const reportPath = join(this.workingDir, 'modified-files-report.md');
        writeFileSync(reportPath, this.formatReport(report));

        console.log(`📋 Report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Format the report as markdown
     */
    private formatReport(report: ModifiedFileReport): string {
        const output: string[] = [];

        output.push('# 📝 Modified Files Analysis Report');
        output.push('');
        output.push(`**Generated:** ${new Date().toISOString()}`);
        output.push(`**Total Modified Files:** ${report.totalModified}`);
        output.push('');

        if (report.totalModified === 0) {
            output.push('## ✅ Clean Working Directory');
            output.push('');
            output.push('No modified files found. Your working directory is clean!');
            return output.join('\n');
        }

        // Categories
        output.push('## 📂 Modified File Categories');
        output.push('');
        report.categories.forEach(category => {
            if (category.files.length > 0) {
                output.push(`### ${category.name} (${category.files.length} files)`);
                output.push(`**Description:** ${category.description}`);
                output.push('');

                output.push('**Files with changes:**');
                category.files.forEach(file => {
                    const diffInfo = this.getDiffInfo(file);
                    output.push(`- \`${file}\` (+${diffInfo.additions}/-${diffInfo.deletions})`);
                });
                output.push('');
            }
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

        // Staging strategy
        output.push(report.stagingStrategy);

        return output.join('\n');
    }

    /**
     * Stage files based on recommendations
     */
    public async stageFiles(strategy: 'all' | 'category' | 'interactive' = 'interactive'): Promise<void> {
        const report = await this.generateReport();

        if (report.totalModified === 0) {
            console.log('✅ No files to stage');
            return;
        }

        if (strategy === 'all') {
            console.log('🚀 Staging all modified files...');
            execSync('git add -A', { cwd: this.workingDir });
            console.log('✅ All files staged successfully');
            return;
        }

        if (strategy === 'category') {
            console.log('📂 Staging by category...');
            for (const category of report.categories) {
                if (category.files.length > 0) {
                    console.log(`Staging ${category.name}...`);
                    execSync(`git add ${category.files.join(' ')}`, { cwd: this.workingDir });
                }
            }
            console.log('✅ Files staged by category');
            return;
        }

        // Interactive mode
        console.log('🔄 Interactive staging mode');
        console.log('Select files to stage:');

        // Interactive implementation would go here
        console.log('💡 Use the staging commands from the report to stage files manually');
    }
}

// Main execution
async function main() {
    const sorter = new ModifiedFileSorter();

    try {
        const report = await sorter.generateReport();

        console.log('\n📈 Summary:');
        console.log(`- Total modified files: ${report.totalModified}`);
        console.log(`- Categories: ${report.categories.filter(c => c.files.length > 0).length}`);

        if (report.totalModified > 0) {
            console.log('\n🏆 Modified Categories:');
            report.categories
                .filter(cat => cat.files.length > 0)
                .forEach((cat, i) => {
                    console.log(`${i + 1}. ${cat.name}: ${cat.files.length} files`);
                });

            console.log('\n💡 Recommendations:');
            report.recommendations.slice(0, 3).forEach(rec => {
                console.log(`  ${rec}`);
            });

            console.log('\n📋 Full report saved to: modified-files-report.md');
            console.log('\n💻 To stage files, run:');
            console.log('  bun run sort-modified-files --stage-all');
            console.log('  bun run sort-modified-files --stage-category');
        }

    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

// Check command line flags
const args = process.argv.slice(2);

if (args.includes('--stage-all')) {
    const sorter = new ModifiedFileSorter();
    sorter.stageFiles('all');
} else if (args.includes('--stage-category')) {
    const sorter = new ModifiedFileSorter();
    sorter.stageFiles('category');
} else {
    main();
}
