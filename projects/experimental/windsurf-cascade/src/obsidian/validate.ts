#!/usr/bin/env bun
/**
 * Obsidian-Native Vault Validation
 * Bridges Bun performance with Obsidian's metadata cache
 */

import { spawn } from 'bun';
import { readFileSync, writeFileSync } from 'fs';

interface ObsidianValidationOptions {
    vaultPath: string;
    pluginPath?: string;
    graphCheck?: boolean;
    neighborDepth?: number;
    strict?: boolean;
    fix?: boolean;
    exportGraph?: string;
}

interface ObsidianNode {
    path: string;
    type: 'note' | 'canvas' | 'dashboard';
    links: {
        wiki: string[];
        block: string[];
        heading: string[];
        embed: string[];
        unresolved: string[];
    };
    properties: Record<string, any>;
    tags: string[];
    aliases: string[];
    neighbors: {
        direct: string[];
        backlink: string[];
        tagPeers: string[];
        aliasPeers: string[];
        canvasPeers: string[];
    };
    dependencies: {
        requires: string[];
        requiredBy: string[];
        template: string | null;
    };
    health: {
        score: number;
        issues: string[];
        warnings: string[];
        lastValidated: string;
    };
}

class ObsidianValidator {
    private vaultPath: string;
    private pluginPath: string;
    private graphDb: any; // Bun SQLite instance

    constructor(options: ObsidianValidationOptions) {
        this.vaultPath = options.vaultPath;
        this.pluginPath = options.pluginPath || `${this.vaultPath}/.obsidian/plugins/vault-standards`;
        this.graphDb = this.initializeGraphDb();
    }

    private initializeGraphDb() {
        const dbPath = `${this.vaultPath}/.obsidian/graph.db`;

        // Mock SQLite implementation for demo
        // In production, this would use Bun.sqlite(dbPath)
        const mockDb = {
            run: (query: string, ...params: any[]) => {
                console.log(`🗄️ SQL: ${query}`, params);
            },
            query: (query: string) => ({
                get: (...params: any[]) => ({ count: 21, avg_score: 65 }),
                all: (...params: any[]) => [
                    { source: '00 - Dashboard.md', target: '🏠 Home.md', type: 'wiki' },
                    { source: '🏠 Home.md', target: 'STANDARDS.md', type: 'wiki' }
                ]
            })
        };

        // Initialize schema (mock)
        mockDb.run(`
          CREATE TABLE IF NOT EXISTS obsidian_nodes (
            path TEXT PRIMARY KEY,
            type TEXT,
            links TEXT,
            properties TEXT,
            tags TEXT,
            aliases TEXT,
            neighbors TEXT,
            dependencies TEXT,
            health TEXT,
            lastValidated TIMESTAMP
          )
        `);

        mockDb.run(`
          CREATE TABLE IF NOT EXISTS obsidian_edges (
            source TEXT,
            target TEXT,
            type TEXT,
            weight REAL DEFAULT 1.0,
            PRIMARY KEY (source, target, type)
          )
        `);

        return mockDb;
    }

    async validateVault(options: Partial<ObsidianValidationOptions> = {}): Promise<{
        summary: any;
        nodes: ObsidianNode[];
        graphMetrics: any;
    }> {
        console.log('🔍 Starting Obsidian-native vault validation...');

        const startTime = Date.now();

        // Step 1: Scan vault for markdown and canvas files
        const files = await this.scanVault();
        console.log(`📁 Found ${files.length} files to validate`);

        // Step 2: Parse each file into ObsidianNode
        const nodes: ObsidianNode[] = [];
        for (const file of files) {
            const node = await this.parseFile(file);
            nodes.push(node);
            this.graphDb.run(`
        INSERT OR REPLACE INTO obsidian_nodes 
        (path, type, links, properties, tags, aliases, neighbors, dependencies, health, lastValidated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                node.path,
                node.type,
                JSON.stringify(node.links),
                JSON.stringify(node.properties),
                JSON.stringify(node.tags),
                JSON.stringify(node.aliases),
                JSON.stringify(node.neighbors),
                JSON.stringify(node.dependencies),
                JSON.stringify(node.health),
                new Date().toISOString()
            ]);
        }

        // Step 3: Build neighbor relationships
        await this.buildNeighborGraph(nodes);

        // Step 4: Run validation rules
        const validationResults = await this.runValidationRules(nodes, options);

        // Step 5: Calculate graph metrics
        const graphMetrics = this.calculateGraphMetrics();

        // Step 6: Export graph if requested
        if (options.exportGraph) {
            await this.exportGraph(options.exportGraph, nodes, graphMetrics);
        }

        const duration = Date.now() - startTime;

        return {
            summary: {
                totalFiles: files.length,
                totalNodes: nodes.length,
                totalErrors: validationResults.totalErrors,
                totalWarnings: validationResults.totalWarnings,
                averageHealth: validationResults.averageHealth,
                complianceRate: validationResults.complianceRate,
                duration
            },
            nodes,
            graphMetrics
        };
    }

    private async scanVault(): Promise<string[]> {
        const files: string[] = [];

        // Mock file scanning for demo
        // In production, this would use Bun.glob or filesystem scanning
        const mockFiles = [
            `${this.vaultPath}/00 - Dashboard.md`,
            `${this.vaultPath}/🏠 Home.md`,
            `${this.vaultPath}/STANDARDS.md`,
            `${this.vaultPath}/01 - Daily Notes/2025-11-18.md`,
            `${this.vaultPath}/02 - Architecture/System Design/Bookmaker Registry System.md`,
            `${this.vaultPath}/03 - Development/Code Snippets/Registry Integration Examples.md`,
            `${this.vaultPath}/04 - Documentation/Guides/Dashboard.md`,
            `${this.vaultPath}/06 - Templates/Daily Note Template.md`,
            `${this.vaultPath}/06 - Templates/System Design Template.md`,
            `${this.vaultPath}/06 - Templates/Code Snippet Template.md`,
            `${this.vaultPath}/06 - Templates/Guide Template.md`,
            `${this.vaultPath}/06 - Templates/Dashboard Template.md`
        ];

        // Filter out excluded paths
        const filteredFiles = mockFiles.filter(file =>
            !file.includes('.obsidian') &&
            !file.includes('07 - Archive')
        );

        return filteredFiles;
    }

    private async parseFile(filePath: string): Promise<ObsidianNode> {
        const content = await Bun.file(filePath).text();
        const isCanvas = filePath.endsWith('.canvas');

        if (isCanvas) {
            return this.parseCanvasFile(filePath, content);
        } else {
            return this.parseMarkdownFile(filePath, content);
        }
    }

    private parseMarkdownFile(filePath: string, content: string): ObsidianNode {
        // Extract YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        const properties = frontmatterMatch ? this.parseYAML(frontmatterMatch[1]) : {};

        // Extract links using regex (in real implementation, use markdown-it)
        const wikiLinks = (content.match(/\[\[([^\]]+)\]\]/g) || [])
            .map(link => link.slice(2, -2));

        const blockLinks = (content.match(/\[\[([^\]]+)#(\^[^\]]+)\]\]/g) || [])
            .map(link => link.slice(2, -2));

        const headingLinks = (content.match(/\[\[([^\]]+)#([^\]]+)\]\]/g) || [])
            .map(link => link.slice(2, -2));

        const embeds = (content.match(/!\[\[([^\]]+)\]\]/g) || [])
            .map(link => link.slice(3, -2));

        // Extract tags from properties and inline
        const propertyTags = properties.tags || [];
        const inlineTags = (content.match(/#([a-zA-Z0-9-]+)/g) || [])
            .map(tag => tag.slice(1));
        const tags = [...new Set([...propertyTags, ...inlineTags])];

        // Extract aliases
        const aliases = properties.aliases || [];

        const node: ObsidianNode = {
            path: filePath.replace(this.vaultPath + '/', ''),
            type: this.determineNodeType(filePath, properties),
            links: {
                wiki: wikiLinks.filter(link => !link.includes('#')),
                block: blockLinks,
                heading: headingLinks.filter(link => !link.includes('^')),
                embed: embeds,
                unresolved: [] // Would be populated by checking if targets exist
            },
            properties,
            tags,
            aliases,
            neighbors: {
                direct: [],
                backlink: [],
                tagPeers: [],
                aliasPeers: [],
                canvasPeers: []
            },
            dependencies: {
                requires: [],
                requiredBy: [],
                template: properties.template || null
            },
            health: {
                score: 100,
                issues: [],
                warnings: [],
                lastValidated: new Date().toISOString()
            }
        };

        return node;
    }

    private parseCanvasFile(filePath: string, content: string): ObsidianNode {
        const canvas = JSON.parse(content);
        const embeddedFiles = canvas.nodes
            .filter((node: any) => node.type === 'file')
            .map((node: any) => node.file);

        return {
            path: filePath.replace(this.vaultPath + '/', ''),
            type: 'canvas',
            links: {
                wiki: embeddedFiles,
                block: [],
                heading: [],
                embed: embeddedFiles,
                unresolved: []
            },
            properties: { type: 'canvas' },
            tags: ['canvas'],
            aliases: [],
            neighbors: {
                direct: embeddedFiles,
                backlink: [],
                tagPeers: [],
                aliasPeers: [],
                canvasPeers: embeddedFiles
            },
            dependencies: {
                requires: embeddedFiles,
                requiredBy: [],
                template: null
            },
            health: {
                score: 100,
                issues: [],
                warnings: [],
                lastValidated: new Date().toISOString()
            }
        };
    }

    private determineNodeType(filePath: string, properties: any): 'note' | 'canvas' | 'dashboard' {
        if (filePath.includes('00 -') || properties.type === 'dashboard') return 'dashboard';
        if (filePath.includes('06 - Templates')) return 'note'; // Templates are notes
        return properties.type || 'note';
    }

    private parseYAML(yamlString: string): Record<string, any> {
        try {
            // Simple YAML parser for basic structures
            const lines = yamlString.split('\n');
            const result: Record<string, any> = {};

            lines.forEach(line => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match) {
                    const [, key, value] = match;
                    if (value.startsWith('[') && value.endsWith(']')) {
                        result[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
                    } else {
                        result[key] = value.replace(/['"]/g, '');
                    }
                }
            });

            return result;
        } catch {
            return {};
        }
    }

    private async buildNeighborGraph(nodes: ObsidianNode[]): Promise<void> {
        console.log('🔗 Building neighbor relationships...');

        nodes.forEach(node => {
            // Direct neighbors (wiki links)
            node.neighbors.direct = node.links.wiki;

            // Find backlinks (nodes that link to this one)
            node.neighbors.backlink = nodes
                .filter(other => other.links.wiki.includes(node.path))
                .map(other => other.path);

            // Tag peers (nodes sharing tags)
            node.neighbors.tagPeers = nodes
                .filter(other =>
                    other.path !== node.path &&
                    other.tags.some(tag => node.tags.includes(tag))
                )
                .map(other => other.path);

            // Alias peers (nodes sharing aliases)
            node.neighbors.aliasPeers = nodes
                .filter(other =>
                    other.path !== node.path &&
                    other.aliases.some(alias => node.aliases.includes(alias))
                )
                .map(other => other.path);
        });

        // Update database with neighbor relationships
        nodes.forEach(node => {
            this.graphDb.run(`
        UPDATE obsidian_nodes SET neighbors = ? WHERE path = ?
      `, [JSON.stringify(node.neighbors), node.path]);

            // Update edges table
            this.graphDb.run('DELETE FROM obsidian_edges WHERE source = ? OR target = ?', [node.path, node.path]);

            node.neighbors.direct.forEach(target => {
                this.graphDb.run('INSERT INTO obsidian_edges (source, target, type) VALUES (?, ?, ?)',
                    [node.path, target, 'wiki']);
            });

            node.neighbors.backlink.forEach(source => {
                this.graphDb.run('INSERT INTO obsidian_edges (source, target, type) VALUES (?, ?, ?)',
                    [source, node.path, 'backlink']);
            });

            node.neighbors.tagPeers.forEach(peer => {
                this.graphDb.run('INSERT INTO obsidian_edges (source, target, type, weight) VALUES (?, ?, ?, ?)',
                    [node.path, peer, 'tag-peer', 0.8]);
            });
        });
    }

    private async runValidationRules(nodes: ObsidianNode[], options: any): Promise<{
        totalErrors: number;
        totalWarnings: number;
        averageHealth: number;
        complianceRate: number;
    }> {
        let totalErrors = 0;
        let totalWarnings = 0;
        let totalHealth = 0;

        for (const node of nodes) {
            // Rule 1: YAML frontmatter completeness
            if (node.type !== 'canvas') {
                const requiredFields = ['type', 'title', 'tags', 'created', 'updated', 'author'];
                requiredFields.forEach(field => {
                    if (!node.properties[field]) {
                        node.health.issues.push(`Missing required field: ${field}`);
                        totalErrors++;
                    }
                });
            }

            // Rule 2: Link integrity
            node.links.wiki.forEach(target => {
                const targetNode = nodes.find(n => n.path === target);
                if (!targetNode) {
                    node.health.issues.push(`Broken wiki link: [[${target}]]`);
                    totalErrors++;
                }
            });

            // Rule 3: Tag standardization
            node.tags.forEach(tag => {
                if (!/^[a-z0-9-]+$/.test(tag)) {
                    node.health.warnings.push(`Non-standard tag format: ${tag}`);
                    totalWarnings++;
                }
            });

            // Rule 4: Neighbor quality
            if (node.type !== 'dashboard' && node.neighbors.direct.length < 2) {
                node.health.warnings.push(`Low connectivity: only ${node.neighbors.direct.length} direct links`);
                totalWarnings++;
            }

            // Calculate health score
            node.health.score = Math.max(0, 100 - (node.health.issues.length * 10) - (node.health.warnings.length * 3));
            totalHealth += node.health.score;
        }

        const averageHealth = totalHealth / nodes.length;
        const compliantNodes = nodes.filter(n => n.health.issues.length === 0).length;
        const complianceRate = (compliantNodes / nodes.length) * 100;

        return {
            totalErrors,
            totalWarnings,
            averageHealth,
            complianceRate
        };
    }

    private calculateGraphMetrics(): any {
        const totalNodes = this.graphDb.query('SELECT COUNT(*) as count FROM obsidian_nodes').get().count;
        const totalEdges = this.graphDb.query('SELECT COUNT(*) as count FROM obsidian_edges').get().count;
        const orphanCount = this.graphDb.query(`
      SELECT COUNT(*) as count FROM obsidian_nodes 
      WHERE path NOT IN (
        SELECT DISTINCT source FROM obsidian_edges
        UNION
        SELECT DISTINCT target FROM obsidian_edges
      )
      AND type != 'dashboard'
    `).get().count;

        return {
            totalNodes,
            totalEdges,
            orphanCount,
            orphanRate: (orphanCount / totalNodes) * 100,
            averageDegree: (totalEdges * 2) / totalNodes
        };
    }

    private async exportGraph(filePath: string, nodes: ObsidianNode[], metrics: any): Promise<void> {
        const graphData = {
            metadata: {
                generated: new Date().toISOString(),
                vaultPath: this.vaultPath,
                totalNodes: nodes.length,
                metrics
            },
            nodes: nodes.map(node => ({
                id: node.path,
                label: node.properties.title || node.path,
                type: node.type,
                tags: node.tags,
                health: node.health.score,
                neighbors: node.neighbors
            })),
            edges: this.graphDb.query('SELECT source, target, type FROM obsidian_edges').all()
        };

        await Bun.write(filePath, JSON.stringify(graphData, null, 2));
        console.log(`📊 Graph exported to: ${filePath}`);
    }

    async pushNotice(severity: 'info' | 'warning' | 'error', message: string): Promise<void> {
        // In real implementation, this would send to Obsidian via local API
        console.log(`📢 [${severity.toUpperCase()}] ${message}`);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    const options: ObsidianValidationOptions = {
        vaultPath: './Odds-mono-map',
        graphCheck: args.includes('--graph-check'),
        neighborDepth: parseInt(args.find(arg => arg.startsWith('--neighbor-depth='))?.split('=')[1] || '2'),
        strict: args.includes('--strict'),
        fix: args.includes('--fix'),
        exportGraph: args.find(arg => arg.startsWith('--export-graph='))?.split('=')[1]
    };

    console.log('🔍 Obsidian-Native Vault Validator');
    console.log(`📁 Vault: ${options.vaultPath}`);

    const validator = new ObsidianValidator(options);
    const results = await validator.validateVault(options);

    console.log('\n📊 Validation Results:');
    console.log('='.repeat(40));
    console.log(`📁 Files processed: ${results.summary.totalFiles}`);
    console.log(`❌ Errors: ${results.summary.totalErrors}`);
    console.log(`⚠️ Warnings: ${results.summary.totalWarnings}`);
    console.log(`💚 Average health: ${results.summary.averageHealth.toFixed(1)}%`);
    console.log(`📈 Compliance rate: ${results.summary.complianceRate.toFixed(1)}%`);
    console.log(`⏱️ Duration: ${results.summary.duration}ms`);

    console.log('\n🔗 Graph Metrics:');
    console.log(`📊 Nodes: ${results.graphMetrics.totalNodes}`);
    console.log(`🔗 Edges: ${results.graphMetrics.totalEdges}`);
    console.log(`🏝️ Orphans: ${results.graphMetrics.orphanCount} (${results.graphMetrics.orphanRate.toFixed(1)}%)`);
    console.log(`📊 Average degree: ${results.graphMetrics.averageDegree.toFixed(2)}`);

    if (results.summary.totalErrors > 0) {
        console.log('\n🚨 Critical Issues Found:');
        results.nodes
            .filter(node => node.health.issues.length > 0)
            .forEach(node => {
                console.log(`\n📄 ${node.path}:`);
                node.health.issues.forEach(issue => console.log(`  ❌ ${issue}`));
            });
    }

    if (options.strict && results.summary.totalErrors > 0) {
        process.exit(1);
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export { ObsidianValidator, type ObsidianNode, type ObsidianValidationOptions };
