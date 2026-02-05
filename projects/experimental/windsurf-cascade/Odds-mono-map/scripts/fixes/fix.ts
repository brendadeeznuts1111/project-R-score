#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][FIX][SCOPE][AUTOMATION][META][CORRECTION][#REF]fix
 * 
 * Fix
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
 * Vault Fix Script
 * Automatically fixes common validation issues
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext, logger } from '../../src/core/error-handler.js';
import { SIZE_CONSTANTS } from '../../src/constants/vault-constants.js';
import chalk from 'chalk';
import { YAML } from "bun";

interface FixResult {
    fixed: string[];
    errors: string[];
    skipped: string[];
}

class VaultFixer {
    private vaultPath: string;
    private result: FixResult;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.result = {
            fixed: [],
            errors: [],
            skipped: []
        };
    }

    async fixAll(): Promise<FixResult> {
        console.log(chalk.blue.bold('🔧 Fixing Common Vault Issues...'));

        // Get all markdown files
        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**']
        });

        console.log(chalk.gray(`Found ${files.length} files to fix`));

        for (const file of files) {
            await this.fixFile(file);
        }

        this.displayResults();
        return this.result;
    }

    private async fixFile(filePath: string): Promise<void> {
        try {
            const fullPath = join(this.vaultPath, filePath);
            let content = readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Fix 1: Add missing YAML frontmatter
            if (!content.startsWith('---')) {
                content = await this.addFrontmatter(content, filePath);
                modified = true;
            }

            // Fix 2: Fix YAML frontmatter issues
            content = await this.fixFrontmatter(content, filePath);
            if (content !== readFileSync(fullPath, 'utf-8')) {
                modified = true;
            }

            // Fix 3: Fix heading issues
            const headingFixes = await this.fixHeadings(content);
            if (headingFixes.fixed) {
                content = headingFixes.content;
                modified = true;
            }

            // Fix 4: Fix line length issues
            const lineLengthFixes = await this.fixLineLength(content);
            if (lineLengthFixes.fixed) {
                content = lineLengthFixes.content;
                modified = true;
            }

            // Fix 5: Add missing sections
            const sectionFixes = await this.fixSections(content, filePath);
            if (sectionFixes.fixed) {
                content = sectionFixes.content;
                modified = true;
            }

            if (modified) {
                writeFileSync(fullPath, content);
                this.result.fixed.push(filePath);
                console.log(chalk.green(`✓ Fixed: ${filePath}`));
            } else {
                this.result.skipped.push(filePath);
            }

        } catch (error) {
            this.result.errors.push(`${filePath}: ${error}`);
            console.log(chalk.red(`✗ Failed to fix ${filePath}: ${error}`));
        }
    }

    private async addFrontmatter(content: string, filePath: string): Promise<string> {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Untitled';
        const now = new Date().toISOString();

        const frontmatter = `---
type: note
title: ${fileName}
tags: []
created: ${now}
updated: ${now}
author: system
---

`;

        return frontmatter + content;
    }

    private async fixFrontmatter(content: string, filePath: string): Promise<string> {
        if (!content.startsWith('---')) return content;

        const lines = content.split('\n');
        const frontmatterEnd = lines.indexOf('---', 1);

        if (frontmatterEnd === -1) return content;

        const frontmatterLines = lines.slice(1, frontmatterEnd);
        const frontmatterContent = frontmatterLines.join('\n');

        try {
            const frontmatter = parseYaml(frontmatterContent);
            let modified = false;

            // Add missing required fields
            if (!frontmatter.type) {
                frontmatter.type = 'note';
                modified = true;
            }

            if (!frontmatter.title) {
                const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Untitled';
                frontmatter.title = fileName;
                modified = true;
            }

            if (!frontmatter.tags) {
                frontmatter.tags = [];
                modified = true;
            }

            if (!frontmatter.created) {
                frontmatter.created = new Date().toISOString();
                modified = true;
            }

            if (!frontmatter.updated) {
                frontmatter.updated = new Date().toISOString();
                modified = true;
            }

            if (!frontmatter.author) {
                frontmatter.author = 'system';
                modified = true;
            }

            // Fix tag format
            if (Array.isArray(frontmatter.tags)) {
                frontmatter.tags = frontmatter.tags.map((tag: string) => {
                    if (typeof tag === 'string') {
                        return tag.replace(/\s+/g, '-').toLowerCase();
                    }
                    return tag;
                });
                modified = true;
            }

            if (modified) {
                const newFrontmatter = stringifyYaml(frontmatter);
                const bodyLines = lines.slice(frontmatterEnd + 1);
                return `---\n${newFrontmatter}---\n\n${bodyLines.join('\n')}`;
            }

        } catch (error) {
            // Invalid YAML, leave it as is
        }

        return content;
    }

    private async fixHeadings(content: string): Promise<{ content: string; fixed: boolean }> {
        const lines = content.split('\n');
        let modified = false;
        let inFrontmatter = false;
        let frontmatterEnded = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Track frontmatter
            if (line === '---' && !inFrontmatter) {
                inFrontmatter = true;
                continue;
            }
            if (line === '---' && inFrontmatter) {
                inFrontmatter = false;
                frontmatterEnded = true;
                continue;
            }

            // Skip frontmatter
            if (inFrontmatter) continue;

            // Fix heading capitalization
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                let text = headingMatch[2];

                // Skip if it has code formatting
                if (text.includes('`')) continue;

                // Apply title case for H1, sentence case for others
                if (level === 1) {
                    // Title case for H1
                    text = this.titleCase(text);
                } else {
                    // Sentence case for H2+
                    text = this.sentenceCase(text);
                }

                if (text !== headingMatch[2]) {
                    lines[i] = `${headingMatch[1]} ${text}`;
                    modified = true;
                }
            }
        }

        return { content: lines.join('\n'), fixed: modified };
    }

    private async fixLineLength(content: string): Promise<{ content: string; fixed: boolean }> {
        const lines = content.split('\n');
        let modified = false;
        let inFrontmatter = false;
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Track frontmatter and code blocks
            if (line === '---' && !inFrontmatter) {
                inFrontmatter = true;
                continue;
            }
            if (line === '---' && inFrontmatter) {
                inFrontmatter = false;
                continue;
            }
            if (line.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }

            // Skip frontmatter and code blocks
            if (inFrontmatter || inCodeBlock) continue;

            // Fix long lines
            if (line.length > SIZE_CONSTANTS.MAX_LINE_LENGTH && !line.startsWith('http')) {
                // Simple word wrap
                const words = line.split(' ');
                let newLine = '';
                let currentLength = 0;

                for (const word of words) {
                    if (currentLength === 0) {
                        newLine = word;
                        currentLength = word.length;
                    } else if (currentLength + word.length + 1 <= SIZE_CONSTANTS.MAX_LINE_LENGTH) {
                        newLine += ` ${word}`;
                        currentLength += word.length + 1;
                    } else {
                        lines[i] = newLine;
                        lines.splice(i + 1, 0, `    ${word}`);
                        modified = true;
                        break;
                    }
                }
            }
        }

        return { content: lines.join('\n'), fixed: modified };
    }

    private async fixSections(content: string, filePath: string): Promise<{ content: string; fixed: boolean }> {
        // Skip certain file types
        if (filePath.includes('Dashboard') || filePath.includes('Daily Note')) {
            return { content, fixed: false };
        }

        const lines = content.split('\n');
        let modified = false;
        let inFrontmatter = false;

        // Find where frontmatter ends
        let contentStart = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === '---' && inFrontmatter) {
                contentStart = i + 1;
                break;
            }
            if (lines[i] === '---') {
                inFrontmatter = true;
            }
        }

        // Look for Overview section
        const hasOverview = lines.some((line, index) =>
            index > contentStart && line.trim().startsWith('## Overview')
        );

        if (!hasOverview) {
            // Find first H1 or H2 to insert after
            let insertIndex = contentStart;
            for (let i = contentStart; i < lines.length; i++) {
                if (lines[i].match(/^#{1,2}\s/)) {
                    insertIndex = i + 1;
                    break;
                }
            }

            // Insert Overview section
            lines.splice(insertIndex, 0, '', '## Overview', '', 'Brief description of this content.', '');
            modified = true;
        }

        return { content: lines.join('\n'), fixed: modified };
    }

    private titleCase(text: string): string {
        // Skip emoji prefixes
        const emojiMatch = text.match(/^[\p{Emoji}\u200D]+/u);
        const prefix = emojiMatch ? emojiMatch[0] : '';
        const rest = emojiMatch ? text.substring(emojiMatch[0].length).trim() : text;

        const titleCased = rest.replace(/\b\w/g, l => l.toUpperCase());
        return prefix + (prefix ? ' ' : '') + titleCased;
    }

    private sentenceCase(text: string): string {
        // Skip emoji prefixes
        const emojiMatch = text.match(/^[\p{Emoji}\u200D]+/u);
        const prefix = emojiMatch ? emojiMatch[0] : '';
        const rest = emojiMatch ? text.substring(emojiMatch[0].length).trim() : text;

        // Capitalize first letter, keep others lowercase (except for proper nouns)
        const sentenceCased = rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
        return prefix + (prefix ? ' ' : '') + sentenceCased;
    }

    private displayResults(): void {
        console.log(chalk.blue.bold('\n📊 Fix Results:'));
        console.log(chalk.green(`✅ Files fixed: ${this.result.fixed.length}`));
        console.log(chalk.gray(`⏭️  Files skipped: ${this.result.skipped.length}`));

        if (this.result.errors.length > 0) {
            console.log(chalk.red(`❌ Errors: ${this.result.errors.length}`));
            this.result.errors.forEach(error => console.log(chalk.red(`   - ${error}`)));
        }

        if (this.result.fixed.length > 0) {
            console.log(chalk.blue.bold('\n🔧 Files Fixed:'));
            this.result.fixed.forEach(file => console.log(chalk.gray(`   ${file}`)));
        }

        console.log(chalk.blue.bold('\n💡 Next Steps:'));
        console.log('1. Run: bun run vault:validate - Verify fixes');
        console.log('2. Run: bun run vault:organize - Organize any remaining files');
        console.log('3. Review fixed files and adjust as needed');
    }
}

// Run fix
// Run fix with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            const fixer = new VaultFixer();
            await fixer.fixAll();
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('fix.ts')
            .function('fixAll')
            .build()
    );
}

export { VaultFixer };
