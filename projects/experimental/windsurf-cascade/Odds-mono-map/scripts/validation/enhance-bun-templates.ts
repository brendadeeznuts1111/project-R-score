#!/usr/bin/env bun

/**
 * 🦊 Bun-Enhanced Template System
 * 
 * Enhances template naming and properties with Bun-specific conventions
 * and Odds Protocol standards for optimal performance and type safety.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface BunEnhancedFrontmatter {
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
    // Bun-specific properties
    runtime: string;
    target: string;
    bundler: string;
    typeScript: boolean;
    optimizations: string[];
    performance: {
        startup: string;
        memory: string;
        build: string;
    };
    integration: {
        apis: string[];
        plugins: string[];
        dependencies: string[];
    };
}

class BunTemplateEnhancer {
    private templatesPath: string;

    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
    }

    async enhanceAllTemplates(): Promise<void> {
        const files = await this.getTemplateFiles();
        console.log(`🦊 Enhancing ${files.length} templates with Bun conventions...`);

        for (const file of files) {
            await this.enhanceTemplateFile(file);
        }

        console.log('✅ All templates enhanced with Bun standards!');
    }

    private async getTemplateFiles(): Promise<string[]> {
        const entries = await readdir(this.templatesPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
            .map(entry => join(this.templatesPath, entry.name))
            .sort();
    }

    private async enhanceTemplateFile(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const enhancedContent = this.enhanceFrontmatter(content);

            if (enhancedContent !== content) {
                await writeFile(filePath, enhancedContent, 'utf-8');
                const fileName = filePath.split('/').pop();
                console.log(`  🦊 Enhanced: ${fileName}`);
            }
        } catch (error) {
            console.error(`  ❌ Error enhancing ${filePath}:`, error);
        }
    }

    private enhanceFrontmatter(content: string): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return this.addBunEnhancedFrontmatter(content);
        }

        const existingFrontmatter = frontmatterMatch[1];
        const enhancedFrontmatter = this.createBunEnhancedFrontmatter(existingFrontmatter);

        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${enhancedFrontmatter}\n---`);
    }

    private createBunEnhancedFrontmatter(existingFrontmatter: string): string {
        const lines = existingFrontmatter.split('\n');
        const data: any = {};

        // Parse existing frontmatter
        for (const line of lines) {
            if (line.includes(':') && !line.startsWith(' ')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();

                if (key.trim() === 'tags') {
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

        const fileName = this.getFileNameFromPath(existingFrontmatter);
        const category = this.determineBunCategory(data.category, fileName);

        // Bun-enhanced frontmatter
        const enhanced: BunEnhancedFrontmatter = {
            type: 'bun-template',
            title: this.createBunTitle(data.title, fileName),
            section: '06 - Templates',
            category,
            priority: data.priority || 'medium',
            status: 'active',
            tags: this.createBunTags(data.tags || [], category, fileName),
            created: data.created || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            author: 'bun-template-generator',
            version: '1.0.0',

            // Bun-specific properties
            runtime: 'bun',
            target: 'bun',
            bundler: 'bun',
            typeScript: true,
            optimizations: this.getBunOptimizations(category),
            performance: {
                startup: '<100ms',
                memory: '<50MB',
                build: '<5s'
            },
            integration: {
                apis: this.getBunAPIs(category),
                plugins: this.getBunPlugins(category),
                dependencies: this.getBunDependencies(category)
            }
        };

        // Generate enhanced frontmatter
        const frontmatterLines = [
            `type: ${enhanced.type}`,
            `title: "${enhanced.title}"`,
            `section: "${enhanced.section}"`,
            `category: ${enhanced.category}`,
            `priority: ${enhanced.priority}`,
            `status: ${enhanced.status}`,
            'tags:',
            ...enhanced.tags.map(tag => `  - ${tag}`),
            `created: ${enhanced.created}`,
            `updated: ${enhanced.updated}`,
            `author: ${enhanced.author}`,
            `version: ${enhanced.version}`,
            '',
            '# Bun Runtime Configuration',
            `runtime: ${enhanced.runtime}`,
            `target: ${enhanced.target}`,
            `bundler: ${enhanced.bundler}`,
            `typeScript: ${enhanced.typeScript}`,
            'optimizations:',
            ...enhanced.optimizations.map(opt => `  - ${opt}`),
            'performance:',
            `  startup: ${enhanced.performance.startup}`,
            `  memory: ${enhanced.performance.memory}`,
            `  build: ${enhanced.performance.build}`,
            'integration:',
            '  apis:',
            ...enhanced.integration.apis.map(api => `    - ${api}`),
            '  plugins:',
            ...enhanced.integration.plugins.map(plugin => `    - ${plugin}`),
            '  dependencies:',
            ...enhanced.integration.dependencies.map(dep => `    - ${dep}`)
        ];

        return frontmatterLines.join('\n');
    }

    private createBunTitle(existingTitle: string, fileName: string): string {
        const cleanName = fileName
            .replace(/^\d{2} - /, '') // Remove number prefix
            .replace(/ Template\.md$/, '') // Remove Template suffix
            .replace(/&/g, 'and')
            .replace(/\s+/g, ' ')
            .trim();

        return `${cleanName} (Bun Template)`;
    }

    private determineBunCategory(existingCategory: string, fileName: string): string {
        const categoryMap: Record<string, string> = {
            'configuration': 'bun-config',
            'integration': 'bun-integration',
            'template': 'bun-template',
            'utility': 'bun-utility',
            'automation': 'bun-automation',
            'analytics': 'bun-analytics',
            'development': 'bun-development'
        };

        // Determine category from filename if needed
        if (fileName.toLowerCase().includes('task')) return 'bun-task-management';
        if (fileName.toLowerCase().includes('template')) return 'bun-template-system';
        if (fileName.toLowerCase().includes('analytics')) return 'bun-analytics';
        if (fileName.toLowerCase().includes('bun')) return 'bun-core';
        if (fileName.toLowerCase().includes('development')) return 'bun-development';

        return categoryMap[existingCategory?.toLowerCase()] || 'bun-general';
    }

    private createBunTags(existingTags: string[], category: string, fileName: string): string[] {
        const bunTags = new Set<string>(['bun', 'odds-protocol', 'template', 'typescript']);

        // Add category-specific tags
        bunTags.add(category);

        // Add existing tags (cleaned)
        for (const tag of existingTags) {
            if (tag && typeof tag === 'string') {
                const cleanTag = tag
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                if (cleanTag && !cleanTag.startsWith('bun')) {
                    bunTags.add(`bun-${cleanTag}`);
                }
            }
        }

        // Add filename-specific tags
        if (fileName.toLowerCase().includes('task')) bunTags.add('bun-tasks');
        if (fileName.toLowerCase().includes('performance')) bunTags.add('bun-performance');
        if (fileName.toLowerCase().includes('validation')) bunTags.add('bun-validation');
        if (fileName.toLowerCase().includes('automation')) bunTags.add('bun-automation');

        return Array.from(bunTags).sort();
    }

    private getBunOptimizations(category: string): string[] {
        const baseOptimizations = ['fast-startup', 'low-memory', 'native-ffi'];

        const categoryOptimizations: Record<string, string[]> = {
            'bun-analytics': ['streaming', 'real-time-processing'],
            'bun-task-management': ['async-queue', 'priority-scheduling'],
            'bun-integration': ['zero-copy', 'direct-api'],
            'bun-development': ['hot-reload', 'fast-compile'],
            'bun-automation': ['batch-processing', 'parallel-execution']
        };

        return [...baseOptimizations, ...(categoryOptimizations[category] || [])];
    }

    private getBunAPIs(category: string): string[] {
        const baseAPIs = ['fs', 'path', 'crypto'];

        const categoryAPIs: Record<string, string[]> = {
            'bun-analytics': ['SQLite', 'file-watcher', 'performance'],
            'bun-task-management': ['spawn', 'serve', 'WebSocket'],
            'bun-integration': ['http', 'ffi', 'tls'],
            'bun-development': ['build', 'test', 'lint'],
            'bun-automation': ['exec', 'file-watcher', 'glob']
        };

        return [...baseAPIs, ...(categoryAPIs[category] || [])];
    }

    private getBunPlugins(category: string): string[] {
        const basePlugins = ['typescript', 'linter'];

        const categoryPlugins: Record<string, string[]> = {
            'bun-analytics': ['sqlite', 'metrics'],
            'bun-task-management': ['scheduler', 'queue'],
            'bun-integration': ['api-client', 'websocket'],
            'bun-development': ['hot-reload', 'debugger'],
            'bun-automation': ['cron', 'workflow']
        };

        return [...basePlugins, ...(categoryPlugins[category] || [])];
    }

    private getBunDependencies(category: string): string[] {
        const baseDeps = ['typescript', '@types/node'];

        const categoryDeps: Record<string, string[]> = {
            'bun-analytics': ['bun-sqlite', 'bun-metrics'],
            'bun-task-management': ['bun-cron', 'bun-queue'],
            'bun-integration': ['bun-ffi', 'bun-http'],
            'bun-development': ['bun-build', 'bun-test'],
            'bun-automation': ['bun-exec', 'bun-glob']
        };

        return [...baseDeps, ...(categoryDeps[category] || [])];
    }

    private getFileNameFromPath(frontmatter: string): string {
        const titleMatch = frontmatter.match(/title:\s*["']([^"']+)["']/);
        return titleMatch ? titleMatch[1] : 'Template';
    }

    private addBunEnhancedFrontmatter(content: string): string {
        const fileName = 'Default Template';
        const enhancedFrontmatter = `type: bun-template
title: "${fileName} (Bun Template)"
section: "06 - Templates"
category: bun-general
priority: medium
status: active
tags:
  - bun
  - odds-protocol
  - template
  - typescript
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString()}
author: bun-template-generator
version: 1.0.0

# Bun Runtime Configuration
runtime: bun
target: bun
bundler: bun
typeScript: true
optimizations:
  - fast-startup
  - low-memory
  - native-ffi
performance:
  startup: <100ms
  memory: <50MB
  build: <5s
integration:
  apis:
    - fs
    - path
    - crypto
  plugins:
    - typescript
    - linter
  dependencies:
    - typescript
    - @types/node`;

        return `${enhancedFrontmatter}\n---\n\n${content}`;
    }
}

// CLI Interface
async function main(): Promise<void> {
    const templatesPath = process.argv[2] || join(process.cwd(), '06 - Templates');

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('🦊 Bun Template Enhancer');
        console.log('Usage: bun enhance-bun-templates.ts [templates-path]');
        console.log('');
        console.log('Enhances templates with:');
        console.log('  - Bun-specific runtime configuration');
        console.log('  - Performance optimization tags');
        console.log('  - Bun API integration details');
        console.log('  - Enhanced naming conventions');
        process.exit(0);
    }

    try {
        const enhancer = new BunTemplateEnhancer(templatesPath);
        await enhancer.enhanceAllTemplates();

        console.log('');
        console.log('🚀 Bun Enhancement Complete!');
        console.log('All templates now include:');
        console.log('  ✅ Bun runtime configuration');
        console.log('  ✅ Performance specifications');
        console.log('  ✅ API and plugin integration');
        console.log('  ✅ Enhanced naming conventions');

    } catch (error) {
        console.error('❌ Bun enhancement failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { BunTemplateEnhancer };
