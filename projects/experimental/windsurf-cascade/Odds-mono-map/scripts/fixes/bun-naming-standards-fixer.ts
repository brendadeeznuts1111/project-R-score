#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][FIX][SCOPE][AUTOMATION][META][CORRECTION][#REF]bun-naming-standards-fixer
 * 
 * Bun Naming Standards Fixer
 * Automated fixing script for common issues
 * 
 * @fileoverview Automated fixing and correction utilities
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category fixes
 * @tags fixes,automated-fix,correction,bun,runtime,performance
 */

#!/usr/bin/env bun
/**
 * Bun Naming Standards Fixer
 * 
 * Corrects file naming and templating to follow Bun best practices
 * Ensures consistency with kebab-case naming and proper templates
 */

import { readdir, writeFile, rename } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';

interface NamingRule {
    pattern: RegExp;
    replacement: string;
    description: string;
}

interface FileRename {
    oldPath: string;
    newPath: string;
    reason: string;
}

class BunNamingStandardsFixer {
    private readonly vaultPath: string;
    private readonly dryRun: boolean;
    private readonly renames: FileRename[] = [];

    // Bun best practice naming rules
    private readonly namingRules: NamingRule[] = [
        {
            pattern: /^[A-Z][A-Z_]*-.*\.md$/,
            replacement: (match: string) => this.convertToKebabCase(match),
            description: "Convert UPPER_CASE to kebab-case"
        },
        {
            pattern: /^[A-Z][a-zA-Z]*-.*\.md$/,
            replacement: (match: string) => this.convertToKebabCase(match),
            description: "Convert PascalCase to kebab-case"
        },
        {
            pattern: /_+/g,
            replacement: '-',
            description: "Replace underscores with hyphens"
        },
        {
            pattern: /-+/g,
            replacement: '-',
            description: "Replace multiple hyphens with single hyphen"
        }
    ];

    constructor(vaultPath: string, dryRun: boolean = true) {
        this.vaultPath = vaultPath;
        this.dryRun = dryRun;
    }

    /**
     * Convert various naming conventions to kebab-case
     */
    private convertToKebabCase(filename: string): string {
        const nameWithoutExt = basename(filename, extname(filename));

        // Convert UPPER_CASE to kebab-case
        const kebabCase = nameWithoutExt
            .replace(/^[A-Z][A-Z_]*/, (match) => {
                return match.toLowerCase().replace(/_/g, '-');
            })
            .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
            .replace(/^-/, '') // Remove leading hyphen
            .replace(/-+/g, '-') // Replace multiple hyphens
            .toLowerCase();

        return `${kebabCase}.md`;
    }

    /**
     * Check if filename follows Bun kebab-case standards
     */
    private isBunStandardNaming(filename: string): boolean {
        const nameWithoutExt = basename(filename, extname(filename));

        // Bun naming standards:
        // 1. kebab-case (preferred)
        // 2. lowercase with hyphens
        // 3. No underscores
        // 4. No spaces
        // 5. No uppercase letters except for numbered directories

        return /^[0-9]*[a-z][a-z0-9-]*\.md$/.test(filename) ||
            /^\d{2} - /.test(filename); // Allow numbered directories
    }

    /**
     * Generate new filename following Bun standards
     */
    private generateBunStandardFilename(oldPath: string): string {
        const dir = dirname(oldPath);
        const filename = basename(oldPath);

        if (this.isBunStandardNaming(filename)) {
            return oldPath; // Already compliant
        }

        const newFilename = this.convertToKebabCase(filename);
        return join(dir, newFilename);
    }

    /**
     * Scan directory for files that need renaming
     */
    private async scanDirectory(dirPath: string): Promise<void> {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);

                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    await this.scanDirectory(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    const newPath = this.generateBunStandardFilename(fullPath);

                    if (newPath !== fullPath) {
                        this.renames.push({
                            oldPath: fullPath,
                            newPath: newPath,
                            reason: "Convert to Bun kebab-case naming standard"
                        });
                    }
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not scan directory ${dirPath}: ${(error as Error).message}`);
        }
    }

    /**
     * Apply template frontmatter fixes
     */
    private async fixTemplateFrontmatter(filePath: string): Promise<void> {
        try {
            const content = await Bun.file(filePath).text();

            // Check if file has proper frontmatter
            if (!content.startsWith('---')) {
                console.info(`📝 Adding frontmatter to: ${filePath}`);

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
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not fix frontmatter for ${filePath}: ${(error as Error).message}`);
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
     * Execute the renaming process
     */
    async execute(): Promise<void> {
        console.info('🔧 Bun Naming Standards Fixer');
        console.info('================================');
        console.info(`📁 Vault path: ${this.vaultPath}`);
        console.info(`🧪 Dry run: ${this.dryRun ? 'YES' : 'NO'}`);
        console.info('');

        // Scan for files that need renaming
        console.info('🔍 Scanning for files that need renaming...');
        await this.scanDirectory(this.vaultPath);

        if (this.renames.length === 0) {
            console.info('✅ All files already follow Bun naming standards!');
            return;
        }

        // Display planned renames
        console.info(`📋 Found ${this.renames.length} files to rename:`);
        console.info('');

        this.renames.forEach((rename, index) => {
            const oldName = basename(rename.oldPath);
            const newName = basename(rename.newPath);
            console.info(`${index + 1}. ${oldName} → ${newName}`);
            console.info(`   Reason: ${rename.reason}`);
            console.info('');
        });

        // Execute renames if not dry run
        if (!this.dryRun) {
            console.info('🚀 Executing renames...');

            for (const rename of this.renames) {
                try {
                    await rename(rename.oldPath, rename.newPath);
                    console.info(`✅ Renamed: ${basename(rename.oldPath)} → ${basename(rename.newPath)}`);

                    // Fix frontmatter
                    await this.fixTemplateFrontmatter(rename.newPath);
                } catch (error) {
                    console.error(`❌ Failed to rename ${rename.oldPath}: ${(error as Error).message}`);
                }
            }
        } else {
            console.info('🧪 Dry run complete. Use --execute to apply changes.');
        }

        console.info('');
        console.info('🎯 Bun Naming Standards Summary:');
        console.info(`   • Files to rename: ${this.renames.length}`);
        console.info(`   • Naming convention: kebab-case (Bun standard)`);
        console.info(`   • Template compliance: Frontmatter added where missing`);
        console.info(`   • Best practices: No underscores, lowercase, hyphen-separated`);
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();
    const execute = args.includes('--execute');

    const fixer = new BunNamingStandardsFixer(vaultPath, !execute);
    await fixer.execute();
}

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}

export { BunNamingStandardsFixer };
