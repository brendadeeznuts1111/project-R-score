#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][FIX][SCOPE][AUTOMATION][META][CORRECTION][#REF]fix-vault-naming
 * 
 * Fix Vault Naming
 * Automated fixing script for common issues
 * 
 * @fileoverview Automated fixing and correction utilities
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category fixes
 * @tags fixes,automated-fix,correction
 */

#!/usr/bin/env bun
/**
 * Fix Vault Naming - Bun Best Practices Implementation
 * 
 * Automatically renames files to follow Bun kebab-case standards
 * and updates all internal links to maintain integrity
 */

import { readdir, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname, basename, extname, relative } from 'path';

interface RenameOperation {
    oldPath: string;
    newPath: string;
    reason: string;
}

interface LinkUpdate {
    filePath: string;
    oldLink: string;
    newLink: string;
}

class VaultNamingFixer {
    private readonly vaultPath: string;
    private readonly dryRun: boolean;
    private readonly renames: RenameOperation[] = [];
    private readonly linkUpdates: LinkUpdate[] = [];

    constructor(vaultPath: string, dryRun: boolean = true) {
        this.vaultPath = vaultPath;
        this.dryRun = dryRun;
    }

    /**
     * Convert filename to Bun kebab-case standards
     */
    private toKebabCase(filename: string): string {
        const nameWithoutExt = basename(filename, extname(filename));

        // Convert various patterns to kebab-case
        const kebabCase = nameWithoutExt
            // Replace underscores with hyphens
            .replace(/_/g, '-')
            // Insert hyphens before uppercase letters (camelCase/PascalCase)
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            // Handle consecutive uppercase letters (acronyms)
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
            // Replace multiple spaces/hyphens with single hyphen
            .replace(/[\s-]+/g, '-')
            // Remove leading/trailing hyphens
            .replace(/^-+|-+$/g, '')
            // Convert to lowercase
            .toLowerCase();

        return `${kebabCase}${extname(filename)}`;
    }

    /**
     * Check if filename follows Bun standards
     */
    private isBunStandard(filename: string): boolean {
        const nameWithoutExt = basename(filename, extname(filename));

        // Allow numbered directories (01 - Daily Notes, etc.)
        if (/^\d{2} - /.test(filename)) {
            return true;
        }

        // Check for kebab-case pattern
        return /^[a-z0-9-]+\.md$/.test(filename);
    }

    /**
     * Generate new filename following Bun standards
     */
    private generateStandardFilename(oldPath: string): string {
        const dir = dirname(oldPath);
        const filename = basename(oldPath);

        if (this.isBunStandard(filename)) {
            return oldPath; // Already compliant
        }

        const newFilename = this.toKebabCase(filename);
        return join(dir, newFilename);
    }

    /**
     * Add proper Bun frontmatter to file
     */
    private async addBunFrontmatter(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');

            // Check if file already has frontmatter
            if (content.startsWith('---')) {
                return; // Already has frontmatter
            }

            const filename = basename(filePath, '.md');
            const title = this.generateTitleFromFilename(filename);

            const frontmatter = `---
type: documentation
title: ${title}
version: "1.0.0"
category: general
priority: medium
status: active
tags:
  - documentation
  - odds-protocol
  - bun-integration
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
author: system
template_version: "1.0.0"
validation_rules:
  - required-frontmatter
  - naming-structure
  - bun-standards
---

`;

            if (!this.dryRun) {
                await writeFile(filePath, frontmatter + content);
                console.log(`✅ Added frontmatter to: ${basename(filePath)}`);
            } else {
                console.log(`📝 Would add frontmatter to: ${basename(filePath)}`);
            }
        } catch (error) {
            console.warn(`⚠️  Could not add frontmatter to ${filePath}: ${(error as Error).message}`);
        }
    }

    /**
     * Generate proper title from kebab-case filename
     */
    private generateTitleFromFilename(filename: string): string {
        return filename
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Find all markdown files in directory
     */
    private async findMarkdownFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);

                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    files.push(...await this.findMarkdownFiles(fullPath));
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not read directory ${dirPath}: ${(error as Error).message}`);
        }

        return files;
    }

    /**
     * Scan for files that need renaming
     */
    private async scanForRenames(): Promise<void> {
        console.log('🔍 Scanning for files that need renaming...');

        const files = await this.findMarkdownFiles(this.vaultPath);

        for (const filePath of files) {
            const newPath = this.generateStandardFilename(filePath);

            if (newPath !== filePath) {
                this.renames.push({
                    oldPath: filePath,
                    newPath: newPath,
                    reason: "Convert to Bun kebab-case naming standard"
                });
            }
        }

        console.log(`📋 Found ${this.renames.length} files to rename`);
    }

    /**
     * Update internal links in all files
     */
    private async updateInternalLinks(): Promise<void> {
        console.log('🔗 Updating internal links...');

        // Create mapping of old names to new names
        const nameMap = new Map<string, string>();
        for (const rename of this.renames) {
            const oldName = basename(rename.oldPath, '.md');
            const newName = basename(rename.newPath, '.md');
            nameMap.set(oldName, newName);
            nameMap.set(oldName + '.md', newName + '.md');
        }

        // Update all files
        const files = await this.findMarkdownFiles(this.vaultPath);

        for (const filePath of files) {
            try {
                const content = await readFile(filePath, 'utf-8');
                let updatedContent = content;
                let hasUpdates = false;

                // Check for any internal links that need updating
                for (const [oldName, newName] of nameMap) {
                    // Update markdown links [text](filename.md)
                    const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
                    if (linkPattern.test(updatedContent)) {
                        updatedContent = updatedContent.replace(linkPattern, `[$1](${newName})`);
                        hasUpdates = true;
                    }

                    // Update wiki links [[filename]]
                    const wikiPattern = new RegExp(`\\[\\[${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'g');
                    if (wikiPattern.test(updatedContent)) {
                        updatedContent = updatedContent.replace(wikiPattern, `[[${newName}]]`);
                        hasUpdates = true;
                    }
                }

                if (hasUpdates && !this.dryRun) {
                    await writeFile(filePath, updatedContent);
                    console.log(`🔗 Updated links in: ${basename(filePath)}`);
                }
            } catch (error) {
                console.warn(`⚠️  Could not update links in ${filePath}: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Execute the naming fix process
     */
    async execute(): Promise<void> {
        console.log('🔧 Bun Vault Naming Fixer');
        console.log('============================');
        console.log(`📁 Vault path: ${this.vaultPath}`);
        console.log(`🧪 Dry run: ${this.dryRun ? 'YES' : 'NO'}`);
        console.log('');

        // Scan for files that need renaming
        await this.scanForRenames();

        if (this.renames.length === 0) {
            console.log('✅ All files already follow Bun naming standards!');
            return;
        }

        // Display planned renames
        console.log('📋 Planned renames:');
        console.log('');

        this.renames.forEach((rename, index) => {
            const oldName = basename(rename.oldPath);
            const newName = basename(rename.newPath);
            console.log(`${index + 1}. ${oldName} → ${newName}`);
            console.log(`   Reason: ${rename.reason}`);
            console.log('');
        });

        // Execute renames if not dry run
        if (!this.dryRun) {
            console.log('🚀 Executing renaming process...');

            // First, update internal links
            await this.updateInternalLinks();

            // Then rename files
            for (const rename of this.renames) {
                try {
                    await Bun.write(rename.newPath, await Bun.file(rename.oldPath).text());
                    await Bun.write(rename.oldPath, ''); // Clear old file
                    console.log(`✅ Renamed: ${basename(rename.oldPath)} → ${basename(rename.newPath)}`);

                    // Add frontmatter
                    await this.addBunFrontmatter(rename.newPath);
                } catch (error) {
                    console.error(`❌ Failed to rename ${rename.oldPath}: ${(error as Error).message}`);
                }
            }
        } else {
            console.log('🧪 Dry run complete. Use --execute to apply changes.');
            console.log('');
            console.log('💡 To execute the changes, run:');
            console.log(`   bun run scripts/fix-vault-naming.ts --execute`);
        }

        console.log('');
        console.log('🎯 Naming Fix Summary:');
        console.log(`   • Files to rename: ${this.renames.length}`);
        console.log(`   • Naming convention: kebab-case (Bun standard)`);
        console.log(`   • Link updates: Automatic`);
        console.log(`   • Frontmatter: Added where missing`);
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();
    const execute = args.includes('--execute');

    const fixer = new VaultNamingFixer(vaultPath, !execute);
    await fixer.execute();
}

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}

export { VaultNamingFixer };
