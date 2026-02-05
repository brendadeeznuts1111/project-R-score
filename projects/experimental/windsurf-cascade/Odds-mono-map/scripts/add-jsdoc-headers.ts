#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][AUTOMATION][SCOPE][SCRIPT][META][JSDOC][#REF]add-jsdoc-headers
 * 
 * JSDoc Header Addition Script
 * Adds standardized grepable/ripgrep tags to all TypeScript files
 * 
 * @fileoverview Automated JSDoc header standardization for script organization
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags jsdoc,headers,standardization,grepable,ripgrep,tags,automation
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

interface FileInfo {
    path: string;
    category: string;
    name: string;
}

class JSDocHeaderAdder {
    private categories = {
        'analytics': {
            domain: 'VAULT',
            type: 'ANALYSIS',
            scope: 'PROJECT',
            meta: 'ANALYTICS'
        },
        'demos': {
            domain: 'DEMO',
            type: 'DEMONSTRATION',
            scope: 'FEATURE',
            meta: 'EXAMPLE'
        },
        'fixes': {
            domain: 'VAULT',
            type: 'FIX',
            scope: 'AUTOMATION',
            meta: 'CORRECTION'
        },
        'maintenance': {
            domain: 'VAULT',
            type: 'MAINTENANCE',
            scope: 'OPTIMIZATION',
            meta: 'CARE'
        },
        'utils': {
            domain: 'UTILITY',
            type: 'HELPER',
            scope: 'GENERAL',
            meta: 'TOOL'
        }
    };

    async addHeadersToAll(): Promise<void> {
        console.log('🏷️ Adding standardized JSDoc headers to all TypeScript files...\n');

        const files = await this.getAllTypeScriptFiles();

        for (const file of files) {
            await this.addHeaderToFile(file);
        }

        console.log(`\n✅ Processed ${files.length} TypeScript files`);
        console.log('📊 Added standardized grepable/ripgrep tags to all files');
    }

    private async getAllTypeScriptFiles(): Promise<FileInfo[]> {
        const result: FileInfo[] = [];

        for (const category of Object.keys(this.categories)) {
            try {
                const files = execSync(`find ${category} -name "*.ts" -type f`, { encoding: 'utf8' })
                    .trim()
                    .split('\n')
                    .filter(f => f.length > 0);

                for (const file of files) {
                    const name = file.split('/').pop()?.replace('.ts', '') || '';
                    result.push({
                        path: file,
                        category,
                        name
                    });
                }
            } catch (error) {
                console.log(`⚠️ No files found in ${category}/`);
            }
        }

        return result;
    }

    private async addHeaderToFile(file: FileInfo): Promise<void> {
        try {
            const content = await readFile(file.path, 'utf8');

            // Skip if already has standardized header
            if (content.includes('[DOMAIN]') && content.includes('[#REF]')) {
                console.log(`⏭️  Skipping ${file.path} - already has header`);
                return;
            }

            const config = this.categories[file.category as keyof typeof this.categories];
            const header = this.generateHeader(file, config);
            const updatedContent = this.insertHeader(content, header);

            await writeFile(file.path, updatedContent, 'utf8');
            console.log(`✅ Added header to ${file.path}`);
        } catch (error) {
            console.log(`❌ Failed to process ${file.path}: ${error.message}`);
        }
    }

    private generateHeader(file: FileInfo, config: any): string {
        const tags = this.generateTags(file.path, file.category);

        return `#!/usr/bin/env bun
/**
 * [DOMAIN][${config.domain}][TYPE][${config.type}][SCOPE][${config.scope}][META][${config.meta}][#REF]${file.name}
 * 
 * ${this.generateTitle(file.name)}
 * ${this.generateDescription(file.path)}
 * 
 * @fileoverview ${this.generateFileOverview(file.category, file.name)}
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category ${file.category}
 * @tags ${tags}
 */`;
    }

    private generateTitle(name: string): string {
        return name
            .split(/[-_]/g)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private generateDescription(path: string): string {
        // Try to extract description from existing content or generate based on filename
        const name = path.split('/').pop()?.replace('.ts', '') || '';

        if (name.includes('demo')) return 'Demonstration script for feature showcase';
        if (name.includes('fix')) return 'Automated fixing script for common issues';
        if (name.includes('analytics')) return 'Analytics and reporting script';
        if (name.includes('organize')) return 'Organization and management script';
        if (name.includes('validate')) return 'Validation and compliance script';
        if (name.includes('mainten')) return 'Maintenance and optimization script';
        if (name.includes('template')) return 'Template management script';
        if (name.includes('color')) return 'Color system demonstration script';
        if (name.includes('bun')) return 'Bun feature demonstration script';

        return 'Specialized script for Odds-mono-map vault management';
    }

    private generateFileOverview(category: string, name: string): string {
        const overviews = {
            'analytics': 'Analytics and reporting functionality for vault insights',
            'demos': 'Feature demonstration and reference implementation',
            'fixes': 'Automated fixing and correction utilities',
            'maintenance': 'Ongoing maintenance and optimization tools',
            'utils': 'General utilities and helper functions'
        };

        return overviews[category as keyof typeof overviews] || 'Vault management functionality';
    }

    private generateTags(path: string, category: string): string {
        const name = path.split('/').pop()?.replace('.ts', '') || '';
        const tags: string[] = [category];

        // Add specific tags based on filename
        if (name.includes('demo')) tags.push('demonstration', 'example');
        if (name.includes('fix')) tags.push('automated-fix', 'correction');
        if (name.includes('analytics')) tags.push('analytics', 'reporting');
        if (name.includes('organize')) tags.push('organization', 'management');
        if (name.includes('validate')) tags.push('validation', 'compliance');
        if (name.includes('template')) tags.push('template', 'structure');
        if (name.includes('color')) tags.push('color', 'ansi', 'formatting');
        if (name.includes('bun')) tags.push('bun', 'runtime', 'performance');
        if (name.includes('canvas')) tags.push('canvas', 'integration', 'visualization');

        return tags.join(',');
    }

    private insertHeader(content: string, header: string): string {
        // Remove existing simple JSDoc if present
        const withoutOldHeader = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '');

        // Add new header at the beginning
        return header + '\n\n' + withoutOldHeader;
    }
}

// Main execution
async function main() {
    const adder = new JSDocHeaderAdder();
    await adder.addHeadersToAll();
}

if (import.meta.main) {
    main().catch(console.error);
}
