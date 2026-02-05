#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]cleanup
 * 
 * Cleanup
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

#!/usr/bin/env bun

/**
 * Vault Cleanup Script
 * Performs deep cleanup and archiving operations
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext } from '../../src/core/error-handler.js';
import { join } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse as parseYaml } from 'yaml';

interface CleanupResult {
    archived: string[];
    cleaned: string[];
    errors: string[];
    spaceSaved: number;
}

class VaultCleanup {
    private vaultPath: string;
    private result: CleanupResult;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.result = {
            archived: [],
            cleaned: [],
            errors: [],
            spaceSaved: 0
        };
    }

    async cleanupAll(): Promise<CleanupResult> {
        console.log(chalk.blue.bold('🧹 Starting Vault Deep Cleanup...'));

        // Archive old files
        await this.archiveOldFiles();

        // Clean up empty files
        await this.cleanupEmptyFiles();

        // Clean up orphaned files
        await this.cleanupOrphanedFiles();

        // Clean up duplicates
        await this.cleanupDuplicates();

        // Update status
        this.updateStatus();

        this.displayResults();
        return this.result;
    }

    private async archiveOldFiles(): Promise<void> {
        console.log(chalk.blue('📦 Archiving old files...'));

        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**', '**/scripts/**']
        });

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

        for (const file of files) {
            try {
                const fullPath = join(this.vaultPath, file);
                const stats = statSync(fullPath);

                // Skip if recently modified
                if (stats.mtime > cutoffDate) continue;

                // Skip important files
                if (this.isImportantFile(file)) continue;

                // Archive the file
                const archivePath = join(this.vaultPath, '07 - Archive', file);
                const archiveDir = join(this.vaultPath, '07 - Archive', file.split('/').slice(0, -1).join('/'));

                if (!existsSync(archiveDir)) {
                    mkdirSync(archiveDir, { recursive: true });
                }

                renameSync(fullPath, archivePath);
                this.result.archived.push(file);
                this.result.spaceSaved += stats.size;

                console.log(chalk.green(`  ✓ Archived: ${file}`));

            } catch (error) {
                this.result.errors.push(`${file}: ${error}`);
            }
        }
    }

    private async cleanupEmptyFiles(): Promise<void> {
        console.log(chalk.blue('🗑️  Cleaning up empty files...'));

        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**', '**/scripts/**']
        });

        for (const file of files) {
            try {
                const fullPath = join(this.vaultPath, file);
                const content = readFileSync(fullPath, 'utf-8').trim();

                // Skip if file has meaningful content
                if (content.length > 200) continue;
                if (content.includes('```') || content.includes('#')) continue;

                // Archive empty files
                const archivePath = join(this.vaultPath, '07 - Archive', 'empty', file);
                const archiveDir = join(this.vaultPath, '07 - Archive', 'empty');

                if (!existsSync(archiveDir)) {
                    mkdirSync(archiveDir, { recursive: true });
                }

                renameSync(fullPath, archivePath);
                this.result.cleaned.push(file);
                this.result.spaceSaved += statSync(archivePath).size;

                console.log(chalk.green(`  ✓ Archived empty: ${file}`));

            } catch (error) {
                this.result.errors.push(`${file}: ${error}`);
            }
        }
    }

    private async cleanupOrphanedFiles(): Promise<void> {
        console.log(chalk.blue('🔍 Cleaning up orphaned files...'));

        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**', '**/scripts/**']
        });

        // Get all links from all files
        const allLinks = new Set<string>();

        for (const file of files) {
            try {
                const fullPath = join(this.vaultPath, file);
                const content = readFileSync(fullPath, 'utf-8');

                // Extract wiki links
                const linkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
                for (const match of linkMatches) {
                    const linkMatch = match.match(/\[\[([^\]]+)\]\]/);
                    if (linkMatch) {
                        const link = linkMatch[1];
                        // Handle display text format [[Display|File]]
                        const actualFile = link.includes('|') ? link.split('|')[1] : link;
                        allLinks.add(actualFile);
                    }
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Find orphaned files (not linked by any other file)
        for (const file of files) {
            try {
                const fileName = file.replace('.md', '');

                // Skip if file is linked elsewhere
                if (allLinks.has(fileName)) continue;

                // Skip important files
                if (this.isImportantFile(file)) continue;

                const fullPath = join(this.vaultPath, file);
                const stats = statSync(fullPath);

                // Archive orphaned files
                const archivePath = join(this.vaultPath, '07 - Archive', 'orphaned', file);
                const archiveDir = join(this.vaultPath, '07 - Archive', 'orphaned');

                if (!existsSync(archiveDir)) {
                    mkdirSync(archiveDir, { recursive: true });
                }

                renameSync(fullPath, archivePath);
                this.result.cleaned.push(file);
                this.result.spaceSaved += stats.size;

                console.log(chalk.green(`  ✓ Archived orphaned: ${file}`));

            } catch (error) {
                this.result.errors.push(`${file}: ${error}`);
            }
        }
    }

    private async cleanupDuplicates(): Promise<void> {
        console.log(chalk.blue('🔄 Cleaning up duplicates...'));

        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**', '**/scripts/**']
        });

        const contentHashes = new Map<string, string[]>();

        // Group files by content hash
        for (const file of files) {
            try {
                const fullPath = join(this.vaultPath, file);
                const content = readFileSync(fullPath, 'utf-8');

                // Simple hash (in production, use crypto)
                const hash = this.simpleHash(content);

                if (!contentHashes.has(hash)) {
                    contentHashes.set(hash, []);
                }
                contentHashes.get(hash)!.push(file);
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Find and archive duplicates
        for (const [hash, duplicateFiles] of contentHashes) {
            if (duplicateFiles.length > 1) {
                // Keep the first file, archive the rest
                const [keep, ...archive] = duplicateFiles;

                for (const file of archive) {
                    try {
                        const fullPath = join(this.vaultPath, file);
                        const stats = statSync(fullPath);

                        const archivePath = join(this.vaultPath, '07 - Archive', 'duplicates', file);
                        const archiveDir = join(this.vaultPath, '07 - Archive', 'duplicates');

                        if (!existsSync(archiveDir)) {
                            mkdirSync(archiveDir, { recursive: true });
                        }

                        renameSync(fullPath, archivePath);
                        this.result.cleaned.push(file);
                        this.result.spaceSaved += stats.size;

                        console.log(chalk.green(`  ✓ Archived duplicate: ${file} (kept: ${keep})`));

                    } catch (error) {
                        this.result.errors.push(`${file}: ${error}`);
                    }
                }
            }
        }
    }

    private isImportantFile(file: string): boolean {
        const importantFiles = [
            'README.md',
            'STANDARDS.md',
            '🏠 Home.md',
            '00 - Dashboard.md',
            'package.json',
            '.vault-config.json',
            '.vault-status.json'
        ];

        const importantPatterns = [
            /^06 - Templates\//,  // Never archive templates
            /^00 -/,              // Never archive dashboards
            /Template\.md$/       // Never archive template files
        ];

        return importantFiles.includes(file) ||
            importantPatterns.some(pattern => pattern.test(file));
    }

    private simpleHash(content: string): string {
        // Simple hash function (in production, use crypto)
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private updateStatus(): void {
        const statusFile = join(this.vaultPath, '.vault-status.json');

        try {
            let statusData: any = {};

            if (existsSync(statusFile)) {
                statusData = JSON.parse(readFileSync(statusFile, 'utf-8'));
            }

            statusData.lastCleanup = new Date().toISOString();
            statusData.lastUpdate = new Date().toISOString();
            statusData.cleanupStats = {
                archived: this.result.archived.length,
                cleaned: this.result.cleaned.length,
                spaceSaved: this.result.spaceSaved,
                errors: this.result.errors.length
            };

            writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
        } catch (error) {
            console.warn(chalk.yellow(`Status update failed: ${error}`));
        }
    }

    private displayResults(): void {
        console.log(chalk.blue.bold('\n📊 Cleanup Results:'));
        console.log(chalk.green(`✅ Files archived: ${this.result.archived.length}`));
        console.log(chalk.blue(`🧹 Files cleaned: ${this.result.cleaned.length}`));
        console.log(chalk.cyan(`💾 Space saved: ${(this.result.spaceSaved / 1024).toFixed(1)} KB`));

        if (this.result.errors.length > 0) {
            console.log(chalk.red(`❌ Errors: ${this.result.errors.length}`));
            this.result.errors.forEach(error => console.log(chalk.red(`   - ${error}`)));
        }

        console.log(chalk.blue.bold('\n💡 Next Steps:'));
        console.log('1. Run: bun run vault:organize - Reorganize remaining files');
        console.log('2. Run: bun run vault:validate - Check vault compliance');
        console.log('3. Review archived files in 07 - Archive folder');
        console.log('4. Empty archive folder if satisfied with cleanup');

        if (this.result.archived.length > 0) {
            console.log(chalk.blue.bold('\n📦 Archived Files:'));
            this.result.archived.slice(0, 10).forEach(file =>
                console.log(chalk.gray(`   ${file}`))
            );
            if (this.result.archived.length > 10) {
                console.log(chalk.gray(`   ... and ${this.result.archived.length - 10} more`));
            }
        }
    }
}

// Run cleanup with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            const cleanup = new VaultCleanup();
            await cleanup.cleanupAll();
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('cleanup.ts')
            .function('cleanupAll')
            .build()
    );
}

export { VaultCleanup };
