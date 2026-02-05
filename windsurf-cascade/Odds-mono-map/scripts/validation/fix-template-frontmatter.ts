#!/usr/bin/env bun

/**
 * 🔧 Template Frontmatter & Properties Fixer
 * 
 * Standardizes frontmatter, properties, and tags across all templates
 * to ensure compliance with vault standards.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface FrontmatterFix {
    type: string;
    title: string;
    section: string;
    category: string;
    priority: string;
    status: string;
    tags: string[];
    created: string;
    updated: string;
    author: string;
    version: string;
}

class TemplateFrontmatterFixer {
    private templatesPath: string;

    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
    }

    async fixAllTemplates(): Promise<void> {
        const files = await this.getTemplateFiles();
        console.log(`🔧 Found ${files.length} template files to fix...`);

        for (const file of files) {
            await this.fixTemplateFile(file);
        }

        console.log('✅ All template files fixed successfully!');
    }

    private async getTemplateFiles(): Promise<string[]> {
        const entries = await readdir(this.templatesPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
            .map(entry => join(this.templatesPath, entry.name));
    }

    private async fixTemplateFile(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fixedContent = this.fixFrontmatter(content);

            if (fixedContent !== content) {
                await writeFile(filePath, fixedContent, 'utf-8');
                const fileName = filePath.split('/').pop();
                console.log(`  ✅ Fixed: ${fileName}`);
            }
        } catch (error) {
            console.error(`  ❌ Error fixing ${filePath}:`, error);
        }
    }

    private fixFrontmatter(content: string): string {
        // Extract existing frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return this.addStandardFrontmatter(content);
        }

        const existingFrontmatter = frontmatterMatch[1];
        const fixedFrontmatter = this.standardizeFrontmatter(existingFrontmatter);

        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${fixedFrontmatter}\n---`);
    }

    private standardizeFrontmatter(frontmatter: string): string {
        const lines = frontmatter.split('\n');
        const data: any = {};

        // Parse existing frontmatter
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();

                if (key.trim() === 'tags') {
                    // Handle tags array
                    if (value.startsWith('[') && value.endsWith(']')) {
                        data[key.trim()] = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
                    } else {
                        data[key.trim()] = value.split('-').map(t => t.trim()).filter(t => t);
                    }
                } else {
                    data[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            }
        }

        // Standardize fields
        const fileName = this.getFileNameFromPath();
        const standardized: FrontmatterFix = {
            type: 'template',
            title: this.cleanTitle(data.title || fileName),
            section: '06 - Templates',
            category: this.standardizeCategory(data.category),
            priority: this.standardizePriority(data.priority),
            status: 'active',
            tags: this.standardizeTags(data.tags || []),
            created: data.created || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            author: 'template-generator',
            version: '1.0.0'
        };

        // Generate new frontmatter
        const frontmatterLines = [
            `type: ${standardized.type}`,
            `title: "${standardized.title}"`,
            `section: "${standardized.section}"`,
            `category: ${standardized.category}`,
            `priority: ${standardized.priority}`,
            `status: ${standardized.status}`,
            'tags:',
            ...standardized.tags.map(tag => `  - ${tag}`),
            `created: ${standardized.created}`,
            `updated: ${standardized.updated}`,
            `author: ${standardized.author}`,
            `version: ${standardized.version}`
        ];

        return frontmatterLines.join('\n');
    }

    private cleanTitle(title: string): string {
        return title
            .replace(/^[0-9]{2} - /, '') // Remove number prefix
            .replace(/📋|🔧|⚡|🎯|📊|🏆|🚀/g, '') // Remove emojis
            .replace(/&/g, 'and') // Replace & with and
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    private standardizeCategory(category: string): string {
        if (!category) return 'general';

        const categoryMap: Record<string, string> = {
            'configuration': 'configuration',
            'template': 'template',
            'integration': 'integration',
            'utility': 'utility',
            'automation': 'automation'
        };

        return categoryMap[category.toLowerCase()] || category.toLowerCase();
    }

    private standardizePriority(priority: string): string {
        if (!priority) return 'medium';

        const priorityMap: Record<string, string> = {
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        };

        return priorityMap[priority.toLowerCase()] || 'medium';
    }

    private standardizeTags(tags: string[]): string[] {
        const standardTags = new Set<string>();

        for (const tag of tags) {
            if (tag && typeof tag === 'string') {
                const cleanTag = tag
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                if (cleanTag) {
                    standardTags.add(cleanTag);
                }
            }
        }

        // Ensure core tags
        standardTags.add('template');
        standardTags.add('odds-protocol');

        return Array.from(standardTags).sort();
    }

    private addStandardFrontmatter(content: string): string {
        const fileName = this.getFileNameFromPath();
        const standardFrontmatter = `type: template
title: "${fileName}"
section: "06 - Templates"
category: general
priority: medium
status: active
tags:
  - template
  - odds-protocol
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString()}
author: template-generator
version: 1.0.0`;

        return `${standardFrontmatter}\n---\n\n${content}`;
    }

    private getFileNameFromPath(): string {
        // This would be implemented based on context
        return 'Template';
    }
}

// CLI Interface
async function main(): Promise<void> {
    const templatesPath = process.argv[2] || join(process.cwd(), '06 - Templates');

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('🔧 Template Frontmatter Fixer');
        console.log('Usage: bun fix-template-frontmatter.ts [templates-path]');
        process.exit(0);
    }

    try {
        const fixer = new TemplateFrontmatterFixer(templatesPath);
        await fixer.fixAllTemplates();
    } catch (error) {
        console.error('❌ Frontmatter fixing failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { TemplateFrontmatterFixer };
