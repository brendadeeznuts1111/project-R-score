#!/usr/bin/env bun
/**
 * File Sorting Script for Untracked Files
 * 
 * This script analyzes and organizes untracked files by category,
 * providing recommendations for adding to git or removing.
 */

import { execSync } from 'child_process';
import { writeFileSync, statSync } from 'fs';
import { join } from 'path';

interface FileInfo {
    path: string;
    size: number;
    type: 'file' | 'directory';
    lastModified: Date;
}

interface FileCategory {
    name: string;
    files: FileInfo[];
    description: string;
    action: 'add' | 'review' | 'ignore' | 'remove';
    suggestion: string;
}

interface UntrackedFileReport {
    totalUntracked: number;
    totalSize: number;
    categories: FileCategory[];
    recommendations: string[];
    actionStrategy: string;
}

class UntrackedFileSorter {
    private workingDir: string;

    constructor() {
        this.workingDir = process.cwd();
    }

    /**
     * Get all untracked files
     */
    private getUntrackedFiles(): string[] {
        try {
            const output = execSync('git status --porcelain', {
                encoding: 'utf8',
                cwd: this.workingDir
            });

            return output
                .split('\n')
                .filter(line => line.trim())
                .filter(line => line.startsWith('??'))
                .map(line => line.substring(2).trim());
        } catch (error) {
            console.error('Error getting untracked files:', error);
            return [];
        }
    }

    /**
     * Get file information
     */
    private getFileInfo(filePath: string): FileInfo {
        try {
            const fullPath = join(this.workingDir, filePath);
            const stats = statSync(fullPath);

            return {
                path: filePath,
                size: stats.size,
                type: stats.isDirectory() ? 'directory' : 'file',
                lastModified: stats.mtime
            };
        } catch (error) {
            return {
                path: filePath,
                size: 0,
                type: 'file',
                lastModified: new Date()
            };
        }
    }

    /**
     * Categorize untracked files
     */
    private categorizeFiles(files: string[]): FileCategory[] {
        const categories: Map<string, FileCategory> = new Map();

        const categoryPatterns = [
            {
                name: 'Build Artifacts',
                patterns: ['dist/', 'build/', '.next/', 'node_modules/', '.cache/'],
                description: 'Build output and dependencies',
                action: 'ignore' as const,
                suggestion: 'Add to .gitignore if not already present'
            },
            {
                name: 'IDE Files',
                patterns: ['.vscode/', '.idea/', '*.swp', '*.swo', '.DS_Store'],
                description: 'IDE configuration and temporary files',
                action: 'ignore' as const,
                suggestion: 'Add to .gitignore'
            },
            {
                name: 'Log Files',
                patterns: ['.log', 'logs/', '*.log'],
                description: 'Log files and output',
                action: 'ignore' as const,
                suggestion: 'Add to .gitignore'
            },
            {
                name: 'Documentation',
                patterns: ['\.md$', 'docs/', 'README.*'],
                description: 'Documentation and readme files',
                action: 'add' as const,
                suggestion: 'Add to version control'
            },
            {
                name: 'Configuration Files',
                patterns: ['\.json$', '\.toml$', '\.yaml$', '\.yml$', '\.env\.example$'],
                description: 'Configuration and environment files',
                action: 'review' as const,
                suggestion: 'Review for sensitive data before adding'
            },
            {
                name: 'Source Code',
                patterns: ['\.ts$', '\.js$', '\.tsx$', '\.jsx$', 'src/', 'packages/'],
                description: 'Source code files',
                action: 'add' as const,
                suggestion: 'Add to version control'
            },
            {
                name: 'Test Files',
                patterns: ['\.test\.', '\.spec\.', 'test/', '__tests__/'],
                description: 'Test and specification files',
                action: 'add' as const,
                suggestion: 'Add to version control'
            },
            {
                name: 'Obsidian Files',
                patterns: ['\.obsidian/', 'Odds-mono-map/'],
                description: 'Obsidian vault files and notes',
                action: 'review' as const,
                suggestion: 'Review personal content before adding'
            },
            {
                name: 'Scripts',
                patterns: ['scripts/', '\.sh$', '\.py$'],
                description: 'Utility scripts and tools',
                action: 'add' as const,
                suggestion: 'Add to version control'
            },
            {
                name: 'Temporary Files',
                patterns: ['\.tmp', '\.temp', 'tmp/', 'temp/', '*~'],
                description: 'Temporary files',
                action: 'ignore' as const,
                suggestion: 'Add to .gitignore'
            },
            {
                name: 'Large Files',
                patterns: [], // Will be determined by size
                description: 'Large files that should be reviewed',
                action: 'review' as const,
                suggestion: 'Consider using Git LFS or external storage'
            }
        ];

        const categorizedFiles: FileInfo[] = files.map(file => this.getFileInfo(file));
        let largeFiles: FileInfo[] = [];

        categorizedFiles.forEach(fileInfo => {
            // Check for large files (>10MB)
            if (fileInfo.size > 10 * 1024 * 1024) {
                largeFiles.push(fileInfo);
                return;
            }

            let categorized = false;

            for (const category of categoryPatterns) {
                if (category.patterns.some(pattern => {
                    if (pattern.includes('*')) {
                        return new RegExp(pattern.replace('*', '.*')).test(fileInfo.path);
                    }
                    return fileInfo.path.includes(pattern);
                })) {
                    if (!categories.has(category.name)) {
                        categories.set(category.name, {
                            name: category.name,
                            files: [],
                            description: category.description,
                            action: category.action,
                            suggestion: category.suggestion
                        });
                    }
                    categories.get(category.name)!.files.push(fileInfo);
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
                        action: 'review',
                        suggestion: 'Review manually to determine action'
                    });
                }
                categories.get('Other Files')!.files.push(fileInfo);
            }
        });

        // Add large files category if any exist
        if (largeFiles.length > 0) {
            categories.set('Large Files', {
                name: 'Large Files',
                files: largeFiles,
                description: 'Large files (>10MB)',
                action: 'review',
                suggestion: 'Consider using Git LFS or external storage'
            });
        }

        return Array.from(categories.values()).sort((a, b) => b.files.length - a.files.length);
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(categories: FileCategory[]): string[] {
        const recommendations: string[] = [];
        const totalFiles = categories.reduce((sum, cat) => sum + cat.files.length, 0);
        const totalSize = categories.reduce((sum, cat) =>
            sum + cat.files.reduce((fileSum, file) => fileSum + file.size, 0), 0
        );

        if (totalFiles === 0) {
            recommendations.push('✅ No untracked files found. Working directory is clean!');
            return recommendations;
        }

        recommendations.push(`📁 Found ${totalFiles} untracked file(s) totaling ${this.formatSize(totalSize)}.`);

        // Check for files that should be ignored
        const ignoreCategories = categories.filter(cat => cat.action === 'ignore');
        if (ignoreCategories.length > 0) {
            const ignoreCount = ignoreCategories.reduce((sum, cat) => sum + cat.files.length, 0);
            recommendations.push(`🚫 ${ignoreCount} file(s) should be added to .gitignore`);
        }

        // Check for files that should be added
        const addCategories = categories.filter(cat => cat.action === 'add');
        if (addCategories.length > 0) {
            const addCount = addCategories.reduce((sum, cat) => sum + cat.files.length, 0);
            recommendations.push(`➕ ${addCount} file(s) are good candidates for version control`);
        }

        // Check for files that need review
        const reviewCategories = categories.filter(cat => cat.action === 'review');
        if (reviewCategories.length > 0) {
            const reviewCount = reviewCategories.reduce((sum, cat) => sum + cat.files.length, 0);
            recommendations.push(`👁️ ${reviewCount} file(s) require manual review before adding`);
        }

        // Check for large files
        const largeFiles = categories.find(cat => cat.name === 'Large Files');
        if (largeFiles && largeFiles.files.length > 0) {
            recommendations.push(`⚠️  Found ${largeFiles.files.length} large file(s). Consider Git LFS.`);
        }

        return recommendations;
    }

    /**
     * Generate action strategy
     */
    private generateActionStrategy(categories: FileCategory[]): string {
        const strategy: string[] = [];

        strategy.push('# 🎯 Recommended Action Strategy\n');

        if (categories.length === 0 || categories.every(cat => cat.files.length === 0)) {
            strategy.push('✅ **No untracked files** - Working directory is clean!');
            return strategy.join('\n');
        }

        // Group by action type
        const addAction = categories.filter(cat => cat.action === 'add' && cat.files.length > 0);
        const ignoreAction = categories.filter(cat => cat.action === 'ignore' && cat.files.length > 0);
        const reviewAction = categories.filter(cat => cat.action === 'review' && cat.files.length > 0);

        if (addAction.length > 0) {
            strategy.push('## ➕ Files to Add to Git\n');
            addAction.forEach(category => {
                strategy.push(`### ${category.name}`);
                strategy.push(`**Description:** ${category.description}`);
                strategy.push(`**Files:** ${category.files.length}`);
                strategy.push('');

                strategy.push('```bash');
                if (category.files.length <= 10) {
                    strategy.push(`git add ${category.files.map(f => f.path).join(' ')}`);
                } else {
                    strategy.push(`# Add ${category.name.toLowerCase()} files`);
                    category.files.slice(0, 3).forEach(file => {
                        strategy.push(`git add ${file.path}`);
                    });
                    strategy.push(`# ... and ${category.files.length - 3} more files`);
                }
                strategy.push('```');
                strategy.push('');
            });
        }

        if (ignoreAction.length > 0) {
            strategy.push('## 🚫 Files to Add to .gitignore\n');
            ignoreAction.forEach(category => {
                strategy.push(`### ${category.name}`);
                strategy.push(`**Description:** ${category.description}`);
                strategy.push(`**Files:** ${category.files.length}`);
                strategy.push('');

                strategy.push('**Add to .gitignore:**');
                category.files.forEach(file => {
                    strategy.push(`- \`${file.path}\``);
                });
                strategy.push('');
            });
        }

        if (reviewAction.length > 0) {
            strategy.push('## 👁️ Files Requiring Review\n');
            reviewAction.forEach(category => {
                strategy.push(`### ${category.name}`);
                strategy.push(`**Description:** ${category.description}`);
                strategy.push(`**Suggestion:** ${category.suggestion}`);
                strategy.push(`**Files:** ${category.files.length}`);
                strategy.push('');

                if (category.files.length <= 10) {
                    category.files.forEach(file => {
                        strategy.push(`- \`${file.path}\` (${this.formatSize(file.size)})`);
                    });
                } else {
                    strategy.push(`**Sample files:**`);
                    category.files.slice(0, 5).forEach(file => {
                        strategy.push(`- \`${file.path}\` (${this.formatSize(file.size)})`);
                    });
                    strategy.push(`- ... and ${category.files.length - 5} more`);
                }
                strategy.push('');
            });
        }

        strategy.push('## 🚀 Quick Actions\n');
        strategy.push('```bash');
        strategy.push('# Add all recommended files');
        strategy.push('git add [recommended-files]');
        strategy.push('');
        strategy.push('# Add all files (use with caution)');
        strategy.push('git add .');
        strategy.push('');
        strategy.push('# Update .gitignore');
        strategy.push('echo "[ignore-patterns]" >> .gitignore');
        strategy.push('```');

        return strategy.join('\n');
    }

    /**
     * Format file size
     */
    private formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate and save the report
     */
    public async generateReport(): Promise<UntrackedFileReport> {
        console.log('🔍 Analyzing untracked files...');

        const untrackedFiles = this.getUntrackedFiles();
        const categories = this.categorizeFiles(untrackedFiles);
        const recommendations = this.generateRecommendations(categories);
        const actionStrategy = this.generateActionStrategy(categories);

        const totalSize = categories.reduce((sum, cat) =>
            sum + cat.files.reduce((fileSum, file) => fileSum + file.size, 0), 0
        );

        const report: UntrackedFileReport = {
            totalUntracked: untrackedFiles.length,
            totalSize,
            categories,
            recommendations,
            actionStrategy
        };

        // Save report to file
        const reportPath = join(this.workingDir, 'untracked-files-report.md');
        writeFileSync(reportPath, this.formatReport(report));

        console.log(`📋 Report saved to: ${reportPath}`);
        return report;
    }

    /**
     * Format the report as markdown
     */
    private formatReport(report: UntrackedFileReport): string {
        const output: string[] = [];

        output.push('# 📁 Untracked Files Analysis Report');
        output.push('');
        output.push(`**Generated:** ${new Date().toISOString()}`);
        output.push(`**Total Untracked Files:** ${report.totalUntracked}`);
        output.push(`**Total Size:** ${this.formatSize(report.totalSize)}`);
        output.push('');

        if (report.totalUntracked === 0) {
            output.push('## ✅ Clean Working Directory');
            output.push('');
            output.push('No untracked files found. Your working directory is clean!');
            return output.join('\n');
        }

        // Categories summary
        output.push('## 📂 File Categories');
        output.push('');
        report.categories.forEach(category => {
            if (category.files.length > 0) {
                const actionEmoji = {
                    add: '➕',
                    ignore: '🚫',
                    review: '👁️',
                    remove: '🗑️'
                }[category.action];

                output.push(`### ${actionEmoji} ${category.name} (${category.files.length} files)`);
                output.push(`**Action:** ${category.action.toUpperCase()}`);
                output.push(`**Description:** ${category.description}`);
                output.push(`**Suggestion:** ${category.suggestion}`);
                output.push('');

                if (category.files.length <= 10) {
                    output.push('**Files:**');
                    category.files.forEach(file => {
                        output.push(`- \`${file.path}\` (${this.formatSize(file.size)})`);
                    });
                } else {
                    output.push(`**Files:** ${category.files.length} files (too many to list)`);
                    output.push('**Sample files:**');
                    category.files.slice(0, 5).forEach(file => {
                        output.push(`- \`${file.path}\` (${this.formatSize(file.size)})`);
                    });
                    output.push(`- ... and ${category.files.length - 5} more`);
                }
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

        // Action strategy
        output.push(report.actionStrategy);

        return output.join('\n');
    }

    /**
     * Execute actions based on recommendations
     */
    public async executeActions(action: 'add-recommended' | 'add-all' | 'update-gitignore' = 'add-recommended'): Promise<void> {
        const report = await this.generateReport();

        if (report.totalUntracked === 0) {
            console.log('✅ No untracked files to process');
            return;
        }

        if (action === 'add-all') {
            console.log('🚀 Adding all untracked files...');
            execSync('git add .', { cwd: this.workingDir });
            console.log('✅ All files added to git');
            return;
        }

        if (action === 'update-gitignore') {
            console.log('📝 Updating .gitignore...');
            const ignoreCategories = report.categories.filter(cat => cat.action === 'ignore');
            const ignorePatterns = ignoreCategories.flatMap(cat => cat.files.map(f => f.path));

            if (ignorePatterns.length > 0) {
                const gitignorePath = join(this.workingDir, '.gitignore');
                execSync(`echo "${ignorePatterns.join('\\n')}" >> ${gitignorePath}`, { cwd: this.workingDir });
                console.log(`✅ Added ${ignorePatterns.length} patterns to .gitignore`);
            }
            return;
        }

        // Add recommended files
        console.log('➕ Adding recommended files...');
        const addCategories = report.categories.filter(cat => cat.action === 'add');
        const addFiles = addCategories.flatMap(cat => cat.files.map(f => f.path));

        if (addFiles.length > 0) {
            execSync(`git add ${addFiles.join(' ')}`, { cwd: this.workingDir });
            console.log(`✅ Added ${addFiles.length} files to git`);
        }
    }
}

// Main execution
async function main() {
    const sorter = new UntrackedFileSorter();

    try {
        const report = await sorter.generateReport();

        console.log('\n📈 Summary:');
        console.log(`- Total untracked files: ${report.totalUntracked}`);
        console.log(`- Total size: ${sorter.formatSize(report.totalSize)}`);
        console.log(`- Categories: ${report.categories.filter(c => c.files.length > 0).length}`);

        if (report.totalUntracked > 0) {
            console.log('\n🏆 Top Categories:');
            report.categories
                .filter(cat => cat.files.length > 0)
                .slice(0, 5)
                .forEach((cat, i) => {
                    const actionEmoji = {
                        add: '➕',
                        ignore: '🚫',
                        review: '👁️',
                        remove: '🗑️'
                    }[cat.action];
                    console.log(`${i + 1}. ${actionEmoji} ${cat.name}: ${cat.files.length} files`);
                });

            console.log('\n💡 Recommendations:');
            report.recommendations.slice(0, 3).forEach(rec => {
                console.log(`  ${rec}`);
            });

            console.log('\n📋 Full report saved to: untracked-files-report.md');
            console.log('\n💻 To take action, run:');
            console.log('  bun run sort-untracked-files --add-recommended');
            console.log('  bun run sort-untracked-files --add-all');
            console.log('  bun run sort-untracked-files --update-gitignore');
        }

    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

// Check command line flags
const args = process.argv.slice(2);

if (args.includes('--add-recommended')) {
    const sorter = new UntrackedFileSorter();
    sorter.executeActions('add-recommended');
} else if (args.includes('--add-all')) {
    const sorter = new UntrackedFileSorter();
    sorter.executeActions('add-all');
} else if (args.includes('--update-gitignore')) {
    const sorter = new UntrackedFileSorter();
    sorter.executeActions('update-gitignore');
} else {
    main();
}
