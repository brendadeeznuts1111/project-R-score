#!/usr/bin/env bun

/**
 * 🏷️ Template Tag Fixer
 * 
 * Fixes malformed tags, ensures consistent usage, and adds missing category-specific tags
 * across all Bun-enhanced templates.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface TagFixResult {
    file: string;
    oldTags: string[];
    newTags: string[];
    fixes: string[];
}

class TemplateTagFixer {
    private templatesPath: string;

    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
    }

    async fixAllTags(): Promise<void> {
        const files = await this.getTemplateFiles();
        console.log(`🏷️ Fixing tags in ${files.length} templates...`);

        const results: TagFixResult[] = [];

        for (const file of files) {
            const result = await this.fixTemplateTags(file);
            if (result) {
                results.push(result);
            }
        }

        this.printSummary(results);
    }

    private async getTemplateFiles(): Promise<string[]> {
        const entries = await readdir(this.templatesPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
            .map(entry => join(this.templatesPath, entry.name))
            .sort();
    }

    private async fixTemplateTags(filePath: string): Promise<TagFixResult | null> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fileName = filePath.split('/').pop() || '';

            const result = this.analyzeAndFixTags(content, fileName);

            if (result.fixes.length > 0) {
                const fixedContent = this.updateTagsInContent(content, result.newTags);
                await writeFile(filePath, fixedContent, 'utf-8');
                console.log(`  ✅ Fixed: ${fileName} (${result.fixes.length} fixes)`);
                return result;
            }

            return null;
        } catch (error) {
            console.error(`  ❌ Error fixing ${filePath}:`, error);
            return null;
        }
    }

    private analyzeAndFixTags(content: string, fileName: string): TagFixResult {
        const oldTags = this.extractTags(content);
        const fixes: string[] = [];

        // Step 1: Remove malformed tags
        const cleanTags = oldTags.filter(tag => {
            if (tag.includes(':') || tag.includes('"') || tag.includes('[') || tag.includes(']') || tag.includes('<') || tag.includes('%')) {
                fixes.push(`Removed malformed tag: ${tag}`);
                return false;
            }
            return true;
        });

        // Step 2: Ensure core tags are present
        const coreTags = ['bun', 'odds-protocol', 'template', 'typescript'];
        for (const coreTag of coreTags) {
            if (!cleanTags.includes(coreTag)) {
                cleanTags.push(coreTag);
                fixes.push(`Added missing core tag: ${coreTag}`);
            }
        }

        // Step 3: Add performance tags
        const performanceTags = ['fast-startup', 'low-memory', 'native-ffi'];
        for (const perfTag of performanceTags) {
            if (!cleanTags.includes(perfTag)) {
                cleanTags.push(perfTag);
                fixes.push(`Added performance tag: ${perfTag}`);
            }
        }

        // Step 4: Add category-specific tags
        const categoryTags = this.getCategoryTags(fileName);
        for (const catTag of categoryTags) {
            if (!cleanTags.includes(catTag)) {
                cleanTags.push(catTag);
                fixes.push(`Added category tag: ${catTag}`);
            }
        }

        // Step 5: Remove duplicates and sort
        const newTags = Array.from(new Set(cleanTags)).sort();

        return {
            file: fileName,
            oldTags,
            newTags,
            fixes
        };
    }

    private extractTags(content: string): string[] {
        const tags: string[] = [];
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return tags;
        }

        const frontmatter = frontmatterMatch[1];
        const lines = frontmatter.split('\n');
        let inTagsSection = false;

        for (const line of lines) {
            if (line.trim() === 'tags:') {
                inTagsSection = true;
                continue;
            }

            if (inTagsSection) {
                if (line.startsWith('  - ')) {
                    const tag = line.replace('  - ', '').trim();
                    if (tag) {
                        tags.push(tag);
                    }
                } else if (line.trim() && !line.startsWith(' ')) {
                    // End of tags section
                    break;
                }
            }
        }

        return tags;
    }

    private getCategoryTags(fileName: string): string[] {
        const lowerFileName = fileName.toLowerCase();

        // Task Management
        if (lowerFileName.includes('task')) {
            return ['bun-task-management', 'bun-tasks', 'async-queue', 'priority-scheduling'];
        }

        // Analytics
        if (lowerFileName.includes('analytics')) {
            return ['bun-analytics', 'bun-dashboard', 'streaming', 'real-time-processing'];
        }

        // Performance
        if (lowerFileName.includes('performance') || lowerFileName.includes('native')) {
            return ['bun-performance', 'bun-optimization', 'enterprise'];
        }

        // Template System
        if (lowerFileName.includes('template') && !lowerFileName.includes('master')) {
            return ['bun-template-system', 'bun-templating'];
        }

        // Development
        if (lowerFileName.includes('development') || lowerFileName.includes('utilities')) {
            return ['bun-development', 'bun-utilities', 'enhanced'];
        }

        // Integration
        if (lowerFileName.includes('integration') || lowerFileName.includes('registry')) {
            return ['bun-integration', 'bun-api', 'zero-copy'];
        }

        // Project Management
        if (lowerFileName.includes('project') || lowerFileName.includes('dynamic')) {
            return ['bun-project-management', 'bun-workflow', 'automation'];
        }

        // System/Organization
        if (lowerFileName.includes('system') || lowerFileName.includes('organization')) {
            return ['bun-system', 'bun-architecture', 'scalable'];
        }

        // Research
        if (lowerFileName.includes('research') || lowerFileName.includes('notebook')) {
            return ['bun-research', 'bun-documentation', 'knowledge-base'];
        }

        // Web/Export
        if (lowerFileName.includes('webpage') || lowerFileName.includes('export')) {
            return ['bun-web', 'bun-export', 'static-site'];
        }

        // Default category
        return ['bun-general'];
    }

    private updateTagsInContent(content: string, newTags: string[]): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return content;
        }

        const frontmatter = frontmatterMatch[1];
        const lines = frontmatter.split('\n');
        const result: string[] = [];
        let inTagsSection = false;
        let tagsReplaced = false;

        for (const line of lines) {
            if (line.trim() === 'tags:') {
                inTagsSection = true;
                result.push('tags:');
                // Add new tags
                for (const tag of newTags) {
                    result.push(`  - ${tag}`);
                }
                tagsReplaced = true;
                continue;
            }

            if (inTagsSection) {
                if (line.startsWith('  - ') || line.startsWith('    - ')) {
                    // Skip old tag lines
                    continue;
                } else if (line.trim() && !line.startsWith(' ')) {
                    // End of tags section
                    inTagsSection = false;
                    result.push(line);
                } else {
                    // Skip empty lines in tags section
                    continue;
                }
            } else {
                result.push(line);
            }
        }

        // If tags section was never found, add it before created
        if (!tagsReplaced) {
            const createdIndex = result.findIndex(line => line.startsWith('created:'));
            if (createdIndex !== -1) {
                result.splice(createdIndex, 0, 'tags:');
                for (const tag of newTags) {
                    result.splice(createdIndex + 1, 0, `  - ${tag}`);
                }
            }
        }

        const newFrontmatter = result.join('\n');
        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
    }

    private printSummary(results: TagFixResult[]): void {
        console.log('');
        console.log('📊 Tag Fixing Summary:');
        console.log(`  Files processed: ${results.length}`);

        const totalFixes = results.reduce((sum, r) => sum + r.fixes.length, 0);
        console.log(`  Total fixes: ${totalFixes}`);

        const fixTypes = new Map<string, number>();
        for (const result of results) {
            for (const fix of result.fixes) {
                const type = fix.split(':')[0];
                fixTypes.set(type, (fixTypes.get(type) || 0) + 1);
            }
        }

        console.log('');
        console.log('🔧 Fix Types:');
        for (const [type, count] of fixTypes) {
            console.log(`  ${type}: ${count}`);
        }

        console.log('');
        console.log('🏷️ Final Tag Statistics:');
        const allTags = new Set<string>();
        for (const result of results) {
            for (const tag of result.newTags) {
                allTags.add(tag);
            }
        }
        console.log(`  Unique tags: ${allTags.size}`);
        console.log(`  Average tags per file: ${Math.round(results.reduce((sum, r) => sum + r.newTags.length, 0) / results.length)}`);

        console.log('');
        console.log('✅ All template tags fixed and standardized!');
    }
}

// CLI Interface
async function main(): Promise<void> {
    const templatesPath = process.argv[2] || join(process.cwd(), '06 - Templates');

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('🏷️ Template Tag Fixer');
        console.log('Usage: bun fix-template-tags.ts [templates-path]');
        console.log('');
        console.log('Fixes:');
        console.log('  - Removes malformed tags (priority: "high", status: "TODO", etc.)');
        console.log('  - Ensures consistent core tag usage');
        console.log('  - Adds missing category-specific tags');
        console.log('  - Standardizes tag format and ordering');
        process.exit(0);
    }

    try {
        const fixer = new TemplateTagFixer(templatesPath);
        await fixer.fixAllTags();

    } catch (error) {
        console.error('❌ Tag fixing failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { TemplateTagFixer };
