#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]organize
 * 
 * Vault Organization Script
 * Automatically organizes files into proper folders
 * 
 * @fileoverview Organization and management utilities
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags organize,management,files,folders,productivity
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse as parseYaml } from 'yaml';

interface OrganizationRule {
    pattern: RegExp;
    targetFolder: string;
    template?: string;
    nameTransform?: (name: string) => string;
}

interface OrganizationResult {
    moved: string[];
    renamed: string[];
    templated: string[];
    errors: string[];
}

class VaultOrganizer {
    private vaultPath: string;
    private result: OrganizationResult;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.result = {
            moved: [],
            renamed: [],
            templated: [],
            errors: []
        };
    }

    private rules: OrganizationRule[] = [
        // Daily notes
        {
            pattern: /^\d{4}-\d{2}-\d{2}\.md$/,
            targetFolder: '01 - Daily Notes/01 - Reports'
        },

        // System design documents
        {
            pattern: /(system|architecture|design|component|registry)/i,
            targetFolder: '02 - Architecture/02 - System Design',
            nameTransform: (name) => name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        },

        // Code snippets
        {
            pattern: /(example|snippet|code|implementation|test)/i,
            targetFolder: '03 - Development/01 - Code Snippets',
            nameTransform: (name) => {
                const base = name.replace(/-/g, ' ');
                return base.includes('example') ? `${base} Examples` : base;
            }
        },

        // Documentation guides
        {
            pattern: /(guide|tutorial|howto|readme|documentation)/i,
            targetFolder: '04 - Documentation/02 - Guides',
            nameTransform: (name) => name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        },

        // API documentation
        {
            pattern: /(api|endpoint|route)/i,
            targetFolder: '04 - Documentation/01 - API'
        },

        // Dashboards
        {
            pattern: /(dashboard|status|monitor)/i,
            targetFolder: '00 -',
            nameTransform: (name) => name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        },

        // Templates
        {
            pattern: /template$/i,
            targetFolder: '06 - Templates/01 - Note Templates'
        }
    ];

    async organizeAll(): Promise<OrganizationResult> {
        console.log(chalk.blue.bold('🗂️  Organizing Vault Files...'));

        try {
            // Use a simpler approach - get root markdown files
            const files = await readdir(this.vaultPath);
            const mdFiles = files.filter(file =>
                file.endsWith('.md') &&
                !file.startsWith('01 -') &&
                !file.startsWith('02 -') &&
                !file.startsWith('03 -') &&
                !file.startsWith('04 -') &&
                !file.startsWith('05 -') &&
                !file.startsWith('06 -') &&
                !file.startsWith('07 -') &&
                !file.startsWith('08 -') &&
                !file.startsWith('09 -') &&
                !file.startsWith('10 -')
            );

            console.log(chalk.gray(`Found ${mdFiles.length} files to organize`));

            for (const file of mdFiles) {
                await this.organizeFile(file);
            }

            // Save results
            this.saveOrganizationResults();

            // Display results
            this.displayResults();

            return this.result;
        } catch (error) {
            console.error(chalk.red('Error during organization:'), error);
            return this.result;
        }
    }

    private async organizeFile(filePath: string): Promise<void> {
        try {
            const fullPath = join(this.vaultPath, filePath);
            const content = readFileSync(fullPath, 'utf-8');
            const fileName = basename(filePath, '.md');

            // Determine target folder and transformation
            let targetFolder: string | null = null;
            let nameTransform: ((name: string) => string) | null = null;

            for (const rule of this.rules) {
                if (rule.pattern.test(fileName) || rule.pattern.test(content)) {
                    targetFolder = rule.targetFolder;
                    nameTransform = rule.nameTransform || null;
                    break;
                }
            }

            // If no rule matches, analyze content
            if (!targetFolder) {
                targetFolder = this.analyzeContent(fileName, content);
            }

            if (targetFolder) {
                let newFileName = fileName;

                // Apply name transformation
                if (nameTransform) {
                    newFileName = nameTransform(fileName);
                }

                const newFilePath = join(targetFolder, `${newFileName}.md`);

                // Ensure target directory exists
                const targetDir = join(this.vaultPath, targetFolder);
                if (!existsSync(targetDir)) {
                    mkdirSync(targetDir, { recursive: true });
                }

                // Move file
                if (newFilePath !== filePath) {
                    const newFullPath = join(this.vaultPath, newFilePath);
                    renameSync(fullPath, newFullPath);

                    if (targetFolder !== dirname(filePath)) {
                        this.result.moved.push(`${filePath} → ${newFilePath}`);
                    } else {
                        this.result.renamed.push(`${filePath} → ${newFilePath}`);
                    }

                    // Apply template if specified
                    if (this.rules.find(r => r.targetFolder === targetFolder)?.template) {
                        await this.applyTemplate(newFullPath, targetFolder);
                    }

                    console.log(chalk.green(`✓ Organized: ${filePath} → ${newFilePath}`));
                }
            }

        } catch (error) {
            this.result.errors.push(`${filePath}: ${error}`);
            console.log(chalk.red(`✗ Failed to organize ${filePath}: ${error}`));
        }
    }

    private analyzeContent(fileName: string, content: string): string | null {
        // Content-based analysis for uncategorized files
        const lowerContent = content.toLowerCase();

        // Check for code content
        if (lowerContent.includes('```') || lowerContent.includes('function') || lowerContent.includes('class')) {
            return '03 - Development/01 - Code Snippets';
        }

        // Check for architecture content
        if (lowerContent.includes('architecture') || lowerContent.includes('system') || lowerContent.includes('design')) {
            return '02 - Architecture/02 - System Design';
        }

        // Check for documentation
        if (lowerContent.includes('how to') || lowerContent.includes('step') || lowerContent.includes('guide')) {
            return '04 - Documentation/02 - Guides';
        }

        // Check for daily log content
        if (fileName.includes('daily') || fileName.includes('log') || lowerContent.includes('today')) {
            return '01 - Daily Notes/02 - Journals';
        }

        return null; // Keep in root if no clear category
    }

    private async applyTemplate(filePath: string, folderType: string): Promise<void> {
        try {
            const content = readFileSync(filePath, 'utf-8');

            // Check if file already has proper frontmatter
            if (content.startsWith('---')) {
                return; // Already has frontmatter
            }

            let template = '';

            // Select appropriate template
            if (folderType.includes('Daily Notes')) {
                template = await this.getDailyNoteTemplate();
            } else if (folderType.includes('Architecture')) {
                template = await this.getSystemDesignTemplate();
            } else if (folderType.includes('Development')) {
                template = await this.getCodeSnippetTemplate();
            } else if (folderType.includes('Documentation')) {
                template = await this.getGuideTemplate();
            }

            if (template) {
                const fileName = basename(filePath, '.md');
                const processedTemplate = template
                    .replace(/{{title}}/g, fileName)
                    .replace(/{{date}}/g, new Date().toISOString())
                    .replace(/{{content}}/g, content);

                writeFileSync(filePath, processedTemplate);
                this.result.templated.push(filePath);
            }

        } catch (error) {
            this.result.errors.push(`${filePath}: Template application failed - ${error}`);
        }
    }

    private async getDailyNoteTemplate(): Promise<string> {
        return `---
type: daily-note
title: Daily Note - {{date}}
tags: [daily-note, log]
created: {{date}}
updated: {{date}}
author: system
---

# 📅 Daily Note - {{date}}

## 🎯 Today's Focus

## 💻 Development Log

## 📚 Learning & Insights

## 🎯 Tomorrow's Plan

## 📊 Metrics

---
*Daily note automatically generated*
`;
    }

    private async getSystemDesignTemplate(): Promise<string> {
        return `---
type: system-design
title: {{title}}
tags: [system-design, architecture]
status: draft
created: {{date}}
updated: {{date}}
author: system
---

# {{title}}

## Overview

## Architecture

## Components

## Data Flow

## Implementation Details

## Usage Examples

## Considerations

---
*System design documentation*
`;
    }

    private async getCodeSnippetTemplate(): Promise<string> {
        return `---
type: code-snippet
title: {{title}}
tags: [code-snippet, example]
language: typescript
created: {{date}}
updated: {{date}}
author: system
---

# {{title}}

## Purpose

## Code

\`\`\`typescript
{{content}}
\`\`\`

## Usage

## Notes

---
*Code snippet for reference*
`;
    }

    private async getGuideTemplate(): Promise<string> {
        return `---
type: guide
title: {{title}}
tags: [guide, tutorial]
difficulty: intermediate
created: {{date}}
updated: {{date}}
author: system
---

# {{title}}

## Overview

## Prerequisites

## Step-by-Step Guide

## Examples

## Troubleshooting

## Related Resources

---
*Guide documentation*
`;
    }

    private saveOrganizationResults(): void {
        const statusFile = join(this.vaultPath, '.vault-status.json');
        let statusData: Record<string, any> = {};

        try {
            const existing = readFileSync(statusFile, 'utf-8');
            statusData = JSON.parse(existing);
        } catch {
            // File doesn't exist, create new
        }

        statusData.lastOrganization = new Date().toISOString();
        statusData.lastUpdate = new Date().toISOString();
        statusData.organizationStats = {
            moved: this.result.moved.length,
            renamed: this.result.renamed.length,
            templated: this.result.templated.length,
            errors: this.result.errors.length
        };

        writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
    }

    private displayResults(): void {
        console.log(chalk.blue.bold('\n📊 Organization Results:'));
        console.log(chalk.green(`✅ Files moved: ${this.result.moved.length}`));
        console.log(chalk.blue(`🔄 Files renamed: ${this.result.renamed.length}`));
        console.log(chalk.yellow(`📝 Templates applied: ${this.result.templated.length}`));

        if (this.result.errors.length > 0) {
            console.log(chalk.red(`❌ Errors: ${this.result.errors.length}`));
            this.result.errors.forEach(error => console.log(chalk.red(`   - ${error}`)));
        }

        if (this.result.moved.length > 0) {
            console.log(chalk.blue.bold('\n📁 Files Moved:'));
            this.result.moved.forEach(move => console.log(chalk.gray(`   ${move}`)));
        }

        console.log(chalk.blue.bold('\n💡 Next Steps:'));
        console.log('1. Run: bun run vault:validate - Check compliance');
        console.log('2. Run: bun run vault:monitor - Start monitoring');
        console.log('3. Review organized files and adjust as needed');
    }
}

// Run organization with proper error handling
if (import.meta.main) {
    const organizer = new VaultOrganizer('./');
    organizer.organizeAll()
        .then(result => {
            if (result.errors > 0) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Organization failed:', error);
            process.exit(1);
        });
}

export { VaultOrganizer };
