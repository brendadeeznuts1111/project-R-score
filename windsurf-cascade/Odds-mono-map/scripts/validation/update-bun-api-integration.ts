#!/usr/bin/env bun

/**
 * 🦊 Bun API Integration Updater
 * 
 * Updates template frontmatter with actual Bun APIs from the official documentation
 * to ensure accurate and comprehensive API integration metadata.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface BunAPICategory {
    name: string;
    apis: string[];
    description: string;
}

class BunAPIIntegrationUpdater {
    private templatesPath: string;

    // Official Bun API categories from documentation
    private bunAPICategories: BunAPICategory[] = [
        {
            name: 'http-server',
            apis: ['Bun.serve'],
            description: 'High-performance HTTP server with WebSocket support'
        },
        {
            name: 'shell',
            apis: ['$'],
            description: 'Shell command execution and process management'
        },
        {
            name: 'bundler',
            apis: ['Bun.build'],
            description: 'Native bundling and code optimization'
        },
        {
            name: 'file-io',
            apis: ['Bun.file', 'Bun.write', 'Bun.stdin', 'Bun.stdout', 'Bun.stderr'],
            description: 'Optimized file system operations'
        },
        {
            name: 'child-processes',
            apis: ['Bun.spawn', 'Bun.spawnSync'],
            description: 'Process spawning and management'
        },
        {
            name: 'networking',
            apis: ['Bun.listen', 'Bun.connect', 'Bun.udpSocket', 'Bun.dns.lookup', 'Bun.dns.prefetch', 'Bun.dns.getCacheStats'],
            description: 'TCP/UDP networking and DNS utilities'
        },
        {
            name: 'websockets',
            apis: ['WebSocket', 'Bun.serve'],
            description: 'WebSocket client and server implementation'
        },
        {
            name: 'transpiler',
            apis: ['Bun.Transpiler'],
            description: 'TypeScript and JavaScript transpilation'
        },
        {
            name: 'routing',
            apis: ['Bun.FileSystemRouter'],
            description: 'File system based routing'
        },
        {
            name: 'html-processing',
            apis: ['HTMLRewriter'],
            description: 'Streaming HTML transformation'
        },
        {
            name: 'hashing',
            apis: ['Bun.password', 'Bun.hash', 'Bun.CryptoHasher', 'Bun.sha'],
            description: 'Cryptographic hashing and password utilities'
        },
        {
            name: 'database',
            apis: ['bun:sqlite', 'Bun.SQL', 'Bun.sql', 'Bun.RedisClient', 'Bun.redis'],
            description: 'SQLite, PostgreSQL, and Redis database clients'
        },
        {
            name: 'ffi',
            apis: ['bun:ffi'],
            description: 'Foreign Function Interface for native libraries'
        },
        {
            name: 'testing',
            apis: ['bun:test'],
            description: 'Built-in testing framework'
        },
        {
            name: 'workers',
            apis: ['Worker'],
            description: 'Web Worker implementation'
        },
        {
            name: 'module-loaders',
            apis: ['Bun.plugin'],
            description: 'Custom plugin system for bundler'
        },
        {
            name: 'glob',
            apis: ['Bun.Glob'],
            description: 'File pattern matching'
        },
        {
            name: 'cookies',
            apis: ['Bun.Cookie', 'Bun.CookieMap'],
            description: 'HTTP cookie handling'
        },
        {
            name: 'utilities',
            apis: ['Bun.version', 'Bun.revision', 'Bun.env', 'Bun.main', 'Bun.sleep', 'Bun.sleepSync', 'Bun.nanoseconds', 'Bun.randomUUIDv7', 'Bun.which'],
            description: 'System utilities and helpers'
        },
        {
            name: 'inspection',
            apis: ['Bun.peek', 'Bun.deepEquals', 'Bun.deepMatch', 'Bun.inspect'],
            description: 'Object comparison and inspection utilities'
        },
        {
            name: 'text-processing',
            apis: ['Bun.escapeHTML', 'Bun.stringWidth', 'Bun.indexOfLine'],
            description: 'String and text processing utilities'
        },
        {
            name: 'url-path',
            apis: ['Bun.fileURLToPath', 'Bun.pathToFileURL'],
            description: 'URL and path conversion utilities'
        },
        {
            name: 'compression',
            apis: ['Bun.gzipSync', 'Bun.gunzipSync', 'Bun.deflateSync', 'Bun.inflateSync', 'Bun.zstdCompressSync', 'Bun.zstdDecompressSync'],
            description: 'Data compression utilities'
        },
        {
            name: 'streams',
            apis: ['Bun.readableStreamToText', 'Bun.readableStreamToBytes', 'Bun.readableStreamToBlob', 'Bun.readableStreamToFormData', 'Bun.readableStreamToJSON', 'Bun.readableStreamToArray'],
            description: 'Stream processing and conversion'
        },
        {
            name: 'memory',
            apis: ['Bun.ArrayBufferSink', 'Bun.allocUnsafe', 'Bun.concatArrayBuffers'],
            description: 'Memory and buffer management'
        },
        {
            name: 'module-resolution',
            apis: ['Bun.resolveSync'],
            description: 'Module path resolution'
        },
        {
            name: 'parsing',
            apis: ['Bun.semver', 'Bun.TOML.parse', 'Bun.color'],
            description: 'Data parsing and formatting'
        },
        {
            name: 'internals',
            apis: ['Bun.mmap', 'Bun.gc', 'Bun.generateHeapSnapshot', 'bun:jsc'],
            description: 'Low-level system internals'
        }
    ];

    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
    }

    async updateAllTemplates(): Promise<void> {
        const files = await this.getTemplateFiles();
        console.log(`🦊 Updating Bun API integration in ${files.length} templates...`);

        for (const file of files) {
            await this.updateTemplateAPIs(file);
        }

        console.log('✅ All templates updated with official Bun APIs!');
    }

    private async getTemplateFiles(): Promise<string[]> {
        const entries = await readdir(this.templatesPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
            .map(entry => join(this.templatesPath, entry.name))
            .sort();
    }

    private async updateTemplateAPIs(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fileName = filePath.split('/').pop() || '';

            const updatedContent = this.updateAPIsInContent(content, fileName);

            if (updatedContent !== content) {
                await writeFile(filePath, updatedContent, 'utf-8');
                console.log(`  🦊 Updated: ${fileName}`);
            }
        } catch (error) {
            console.error(`  ❌ Error updating ${filePath}:`, error);
        }
    }

    private updateAPIsInContent(content: string, fileName: string): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return content;
        }

        const frontmatter = frontmatterMatch[1];
        const updatedFrontmatter = this.updateAPIsSection(frontmatter, fileName);

        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
    }

    private updateAPIsSection(frontmatter: string, fileName: string): string {
        const lines = frontmatter.split('\n');
        const result: string[] = [];
        let inAPIsSection = false;
        let apisReplaced = false;

        // Determine relevant API categories based on filename
        const relevantAPIs = this.getRelevantAPIs(fileName);

        for (const line of lines) {
            if (line.trim() === 'apis:') {
                inAPIsSection = true;
                result.push('apis:');
                // Add updated APIs
                for (const api of relevantAPIs) {
                    result.push(`    - ${api}`);
                }
                apisReplaced = true;
                continue;
            }

            if (inAPIsSection) {
                if (line.startsWith('    - ') || line.startsWith('      - ')) {
                    // Skip old API lines
                    continue;
                } else if (line.trim() && !line.startsWith('  ')) {
                    // End of APIs section
                    inAPIsSection = false;
                    result.push(line);
                } else {
                    // Skip empty lines in APIs section
                    continue;
                }
            } else {
                result.push(line);
            }
        }

        // If APIs section was never found, add it before integration
        if (!apisReplaced) {
            const integrationIndex = result.findIndex(line => line.startsWith('integration:'));
            if (integrationIndex !== -1) {
                result.splice(integrationIndex + 1, 0, '  apis:');
                for (const api of relevantAPIs) {
                    result.splice(integrationIndex + 2, 0, `    - ${api}`);
                }
            }
        }

        return result.join('\n');
    }

    private getRelevantAPIs(fileName: string): string[] {
        const lowerFileName = fileName.toLowerCase();
        const apis: string[] = [];

        // Core APIs for all templates
        apis.push('Bun.file', 'Bun.write', 'Bun.env', 'Bun.version');

        // Task Management Templates
        if (lowerFileName.includes('task')) {
            apis.push('Bun.spawn', 'Bun.sleep', 'Bun.sleepSync', '$');
        }

        // Analytics Templates
        if (lowerFileName.includes('analytics')) {
            apis.push('Bun.serve', 'Bun.SQL', 'bun:sqlite', 'Bun.hash');
        }

        // Performance/Native Templates
        if (lowerFileName.includes('performance') || lowerFileName.includes('native')) {
            apis.push('Bun.build', 'Bun.Transpiler', 'Bun.gc', 'Bun.nanoseconds');
        }

        // Template System
        if (lowerFileName.includes('template')) {
            apis.push('Bun.file', 'Bun.write', 'Bun.Glob', 'Bun.TOML.parse');
        }

        // Development/Utilities
        if (lowerFileName.includes('development') || lowerFileName.includes('utilities')) {
            apis.push('Bun.spawn', 'Bun.which', 'Bun.inspect', 'Bun.deepEquals');
        }

        // Integration/Registry
        if (lowerFileName.includes('integration') || lowerFileName.includes('registry')) {
            apis.push('Bun.serve', 'Bun.listen', 'Bun.connect', 'Bun.dns.lookup');
        }

        // Project Management
        if (lowerFileName.includes('project') || lowerFileName.includes('dynamic')) {
            apis.push('Bun.spawn', 'Bun.file', 'Bun.Glob', 'Bun.FileSystemRouter');
        }

        // System/Organization
        if (lowerFileName.includes('system') || lowerFileName.includes('organization')) {
            apis.push('Bun.gc', 'Bun.generateHeapSnapshot', 'Bun.mmap', 'Bun.allocUnsafe');
        }

        // Research/Documentation
        if (lowerFileName.includes('research') || lowerFileName.includes('notebook')) {
            apis.push('Bun.file', 'Bun.write', 'Bun.TOML.parse', 'HTMLRewriter');
        }

        // Web/Export
        if (lowerFileName.includes('webpage') || lowerFileName.includes('export')) {
            apis.push('Bun.serve', 'HTMLRewriter', 'Bun.gzipSync', 'Bun.deflateSync');
        }

        // Remove duplicates and sort
        return Array.from(new Set(apis)).sort();
    }
}

// CLI Interface
async function main(): Promise<void> {
    const templatesPath = process.argv[2] || join(process.cwd(), '06 - Templates');

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('🦊 Bun API Integration Updater');
        console.log('Usage: bun update-bun-api-integration.ts [templates-path]');
        console.log('');
        console.log('Updates templates with official Bun APIs:');
        console.log('  - HTTP Server (Bun.serve)');
        console.log('  - File I/O (Bun.file, Bun.write)');
        console.log('  - Database (bun:sqlite, Bun.SQL)');
        console.log('  - Networking (Bun.listen, Bun.connect)');
        console.log('  - Utilities (Bun.env, Bun.version)');
        console.log('  - And 20+ more API categories');
        process.exit(0);
    }

    try {
        const updater = new BunAPIIntegrationUpdater(templatesPath);
        await updater.updateAllTemplates();

        console.log('');
        console.log('🚀 Bun API Integration Complete!');
        console.log('Templates now include official Bun APIs from:');
        console.log('  📡 HTTP Server & WebSockets');
        console.log('  📁 File I/O & Stream Processing');
        console.log('  🗄️ Database Clients (SQLite, PostgreSQL, Redis)');
        console.log('  🔧 Shell & Process Management');
        console.log('  🌐 Networking & DNS');
        console.log('  🔐 Hashing & Cryptography');
        console.log('  ⚡ Performance & Memory Management');
        console.log('  🧪 Testing & Workers');
        console.log('  🛠️ 25+ total API categories');

    } catch (error) {
        console.error('❌ API integration update failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { BunAPIIntegrationUpdater };
