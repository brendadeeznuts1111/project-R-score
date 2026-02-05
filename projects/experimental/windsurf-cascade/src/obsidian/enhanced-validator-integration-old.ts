/**
 * Enhanced Validator Integration for Obsidian
 * Bridges Bun-native validation with Obsidian's metadata cache
 * Provides real-time validation, auto-optimization, and analytics
 */

import { App, TFile, Notice, Modal, Setting } from 'obsidian';
import { VaultGraph, VaultNode } from '../models/VaultNode';
import { EnhancedTransitiveLinkValidator, ValidationConfig, TransitiveLinkSuggestion } from '../validators/transitive-links-enhanced';
import { ValidationOrchestrator, ValidationResult } from '../validators/ValidationOrchestrator';

// Extend the EnhancedTransitiveLinkValidator interface to include missing methods
interface EnhancedTransitiveLinkValidatorExtended extends EnhancedTransitiveLinkValidator {
    getRuleAnalytics(): Promise<ValidatorAnalytics[]>;
    removeRule(ruleId: string): Promise<void>;
    updateConfig(config: ValidationConfig): void;
}

interface ObsidianNode {
    path: string;
    type: 'note' | 'canvas' | 'dashboard' | 'template' | 'documentation' | 'system-design' | 'code-snippet';
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

interface ValidatorAnalytics {
    ruleId: string;
    ruleName: string;
    triggerCount: number;
    averageConfidenceBoost: number;
    suggestions: TransitiveLinkSuggestion[];
    effectiveness: number; // 0-100 score
    lastOptimized: string;
}

interface ValidationReport {
    totalFiles: number;
    validFiles: number;
    issuesFound: number;
    warningsFound: number;
    averageHealthScore: number;
    topIssues: Array<{ type: string; count: number; description: string }>;
    recommendations: string[];
    analytics: ValidatorAnalytics[];
}

interface EnhancedValidatorSettings {
    autoOptimize: boolean;
    config: ValidationConfig;
}

interface VaultApp {
    vault: {
        getMarkdownFiles(): TFile[];
        read(file: TFile): Promise<string>;
    };
    metadataCache: {
        getFileCache(file: TFile): any;
    };
}

export class EnhancedValidatorManager {
    private app: VaultApp;
    private validator: EnhancedTransitiveLinkValidatorExtended;
    private settings: EnhancedValidatorSettings;

    constructor(app: VaultApp, settings: EnhancedValidatorSettings) {
        this.app = app;
        this.settings = settings;
        this.validator = new EnhancedTransitiveLinkValidator(settings.config) as EnhancedTransitiveLinkValidatorExtended;

        if (settings.autoOptimize) {
            this.initializeAutoOptimization();
        }
    }

    /**
     * Initialize auto-optimization system
     */
    private initializeAutoOptimization(): void {
        console.log('🤖 Initializing auto-optimization system...');
        // Set up periodic optimization checks
        setInterval(() => {
            this.performAutoOptimization();
        }, 300000); // Every 5 minutes
    }

    /**
     * Perform automatic optimization of validation rules
     */
    private async performAutoOptimization(): Promise<void> {
        try {
            console.log('🔧 Performing auto-optimization...');
            const analytics = await this.validator.getRuleAnalytics();

            // Remove underperforming rules
            const underperformingRules = analytics.filter((rule: ValidatorAnalytics) =>
                rule.effectiveness < 30 && rule.triggerCount > 10
            );

            for (const rule of underperformingRules) {
                await this.validator.removeRule(rule.ruleId);
                console.log(`🗑️ Removed underperforming rule: ${rule.ruleName}`);
            }

            console.log('✅ Auto-optimization complete');
        } catch (error) {
            console.error('❌ Auto-optimization failed:', error);
        }
    }

    /**
     * Build the vault graph from Obsidian's metadata cache
     * This is the method you referenced - it converts Obsidian files to graph nodes
     */
    private async buildVaultGraph(): Promise<VaultGraph> {
        const files = this.app.vault.getMarkdownFiles();
        const nodes = new Map<string, ObsidianNode>();
        const vaultGraph = new VaultGraph();

        console.log(`🔍 Building vault graph from ${files.length} files...`);

        // Convert all files to nodes
        for (const file of files) {
            const node = await this.fileToObsidianNode(file);
            nodes.set(file.path, node);

            // Add to graph database
            const vaultNode = await this.obsidianNodeToVaultNode(node);
            vaultGraph.addNode(vaultNode);
        }

        // Build neighbor relationships
        await this.buildNeighborRelationships(nodes);

        console.log(`✅ Vault graph built: ${nodes.size} nodes, ${this.calculateEdgeCount(vaultGraph)} edges`);
        return vaultGraph;
    }

    /**
     * Convert Obsidian TFile to ObsidianNode
     */
    private async fileToObsidianNode(file: TFile): Promise<ObsidianNode> {
        const content = await this.app.vault.read(file);
        const cache = this.app.metadataCache.getFileCache(file);

        // Extract frontmatter properties
        const properties = cache?.frontmatter || {};

        // Extract tags from content and frontmatter
        const tags = this.extractTags(content, cache);

        // Extract aliases from frontmatter
        const aliases = properties.aliases || [];

        // Extract links from cache
        const links = this.extractLinks(cache);

        // Determine file type
        const type = this.determineFileType(file, properties);

        // Extract dependencies
        const dependencies = this.extractDependencies(properties, content);

        // Calculate initial health score
        const health = this.calculateInitialHealth(file, cache);

        return {
            path: file.path,
            type,
            links,
            properties,
            tags,
            aliases,
            neighbors: {
                direct: links.wiki,
                backlink: [], // Will be populated by buildNeighborRelationships
                tagPeers: [], // Will be populated by buildNeighborRelationships
                aliasPeers: [], // Will be populated by buildNeighborRelationships
                canvasPeers: [] // Will be populated by buildNeighborRelationships
            },
            dependencies,
            health
        };
    }

    /**
     * Convert ObsidianNode to VaultNode for graph database
     */
    private async obsidianNodeToVaultNode(node: ObsidianNode): Promise<VaultNode> {
        return {
            id: node.path,
            type: node.type,
            frontmatter: node.properties,
            headings: this.extractHeadings(node.path),
            links: {
                outbound: node.links.wiki,
                inbound: node.neighbors.backlink,
                external: node.links.unresolved.filter(link => link.startsWith('http'))
            },
            tags: node.tags,
            neighbors: {
                direct: node.neighbors.direct,
                transitive: [], // Will be calculated
                tagPeers: node.neighbors.tagPeers,
                typePeers: [] // Will be calculated
            },
            dependencies: node.dependencies,
            metrics: {
                healthScore: node.health.score,
                lastValidated: new Date().toISOString(),
                validationErrors: node.health.issues,
                validationWarnings: node.health.warnings
            }
        };
    }

    /**
     * Build neighbor relationships between nodes
     */
    private async buildNeighborRelationships(nodes: Map<string, ObsidianNode>): Promise<void> {
        console.log('🔗 Building neighbor relationships...');

        // Build backlink relationships
        for (const [path, node] of nodes) {
            node.links.wiki.forEach(targetPath => {
                const targetNode = nodes.get(targetPath);
                if (targetNode) {
                    targetNode.neighbors.backlink.push(path);
                }
            });
        }

        // Build tag peer relationships
        for (const [path, node] of nodes) {
            for (const [otherPath, otherNode] of nodes) {
                if (path !== otherPath) {
                    const sharedTags = node.tags.filter(tag => otherNode.tags.includes(tag));
                    if (sharedTags.length >= 2) { // Minimum 2 shared tags to be peers
                        node.neighbors.tagPeers.push(otherPath);
                    }
                }
            }
        }

        // Build alias peer relationships
        for (const [path, node] of nodes) {
            for (const [otherPath, otherNode] of nodes) {
                if (path !== otherPath) {
                    const sharedAliases = node.aliases.filter(alias =>
                        otherNode.aliases.includes(alias)
                    );
                    if (sharedAliases.length > 0) {
                        node.neighbors.aliasPeers.push(otherPath);
                    }
                }
            }
        }

        console.log('✅ Neighbor relationships built');
    }

    /**
     * Validate the vault and return comprehensive results
     */
    async validateVault(): Promise<ValidationReport> {
        console.log('🔍 Starting vault validation...');

        // Build the vault graph
        const graph = await this.buildVaultGraph();

        // Validate each file using the enhanced transitive validator
        const files = this.app.vault.getMarkdownFiles();
        const results: ValidationResult[] = [];
        let totalIssues = 0;
        let totalWarnings = 0;
        let totalHealthScore = 0;

        for (const file of files) {
            const obsidianNode = await this.fileToObsidianNode(file);
            const result = await this.validator.validate(obsidianNode, graph);

            results.push(result);
            totalIssues += result.errors.length;
            totalWarnings += result.warnings.length;
            totalHealthScore += result.healthScore;
        }

        // Generate report
        const report: ValidationReport = {
            totalFiles: files.length,
            validFiles: results.filter(r => r.errors.length === 0).length,
            issuesFound: totalIssues,
            warningsFound: totalWarnings,
            averageHealthScore: totalHealthScore / files.length,
            topIssues: this.getTopIssues(results),
            recommendations: this.generateRecommendations(results),
            analytics: await this.validator.getRuleAnalytics()
        };

        console.log('✅ Validation complete:', report);
        return report;
    }

    /**
     * Generate transitive link suggestions for a specific file
     */
    async generateSuggestions(filePath: string): Promise<string[]> {
        const file = this.app.vault.getMarkdownFiles().find(f => f.path === filePath);
        if (!file) return [];

        const obsidianNode = await this.fileToObsidianNode(file);
        const graph = await this.buildVaultGraph();

        return this.validator.generateTransitiveLinkSuggestions(obsidianNode, graph);
    }

    /**
     * Update validator settings
     */
    updateSettings(newSettings: Partial<EnhancedValidatorSettings>): void {
        this.settings = { ...this.settings, ...newSettings };

        if (newSettings.config) {
            this.validator.updateConfig(newSettings.config);
        }

        if (newSettings.autoOptimize && !this.settings.autoOptimize) {
            this.initializeAutoOptimization();
        }
    }

    // Helper methods
    private extractTags(content: string, cache: any): string[] {
        const tags = new Set<string>();

        // Extract from content
        const tagMatches = content.matchAll(/#([a-zA-Z0-9-_]+)/g);
        for (const match of tagMatches) {
            tags.add(match[1]);
        }

        // Extract from frontmatter
        if (cache?.frontmatter?.tags) {
            const frontmatterTags = Array.isArray(cache.frontmatter.tags)
                ? cache.frontmatter.tags
                : [cache.frontmatter.tags];
            frontmatterTags.forEach((tag: string) => tags.add(tag));
        }

        return Array.from(tags);
    }

    private extractLinks(cache: any): ObsidianNode['links'] {
        const links = {
            wiki: [] as string[],
            block: [] as string[],
            heading: [] as string[],
            embed: [] as string[],
            unresolved: [] as string[]
        };

        if (!cache?.links) return links;

        cache.links.forEach((link: any) => {
            if (link.link.includes('#^')) {
                links.block.push(link.link);
            } else if (link.link.includes('#')) {
                links.heading.push(link.link);
            } else if (link.displayText?.includes('!') || link.link.includes('!')) {
                links.embed.push(link.link.replace('!', ''));
            } else {
                links.wiki.push(link.link);
            }

            if (link.position?.start?.offset < 0) {
                links.unresolved.push(link.link);
            }
        });

        return links;
    }

    private determineFileType(file: TFile, properties: any): ObsidianNode['type'] {
        const path = file.path.toLowerCase();

        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('template')) return 'template';
        if (path.includes('documentation') || path.includes('docs')) return 'documentation';
        if (path.includes('system-design') || path.includes('architecture')) return 'system-design';
        if (path.includes('code') || path.includes('snippet')) return 'code-snippet';
        if (path.endsWith('.canvas')) return 'canvas';

        return 'note';
    }

    private extractDependencies(properties: any, content: string): ObsidianNode['dependencies'] {
        return {
            requires: properties.requires || [],
            requiredBy: [], // Will be populated by other analysis
            template: properties.template || null
        };
    }

    private calculateInitialHealth(file: TFile, cache: any): ObsidianNode['health'] {
        const issues: string[] = [];
        const warnings: string[] = [];

        // Check for frontmatter
        if (!cache?.frontmatter) {
            issues.push('Missing frontmatter');
        }

        // Check for headings
        if (!cache?.headings || cache.headings.length === 0) {
            warnings.push('No headings found');
        }

        // Check for links
        if (!cache?.links || cache.links.length === 0) {
            warnings.push('No links found - consider connecting to other notes');
        }

        const baseScore = 100;
        const issuePenalty = issues.length * 10;
        const warningPenalty = warnings.length * 5;
        const score = Math.max(0, baseScore - issuePenalty - warningPenalty);

        return {
            score,
            issues,
            warnings,
            lastValidated: new Date().toISOString()
        };
    }

    private extractHeadings(filePath: string): any[] {
        const cache = this.app.metadataCache.getFileCache(this.app.vault.getMarkdownFiles().find(f => f.path === filePath));
        return cache?.headings || [];
    }

    private calculateEdgeCount(vaultGraph: VaultGraph): number {
        const metrics = vaultGraph.calculateGraphMetrics();
        return metrics.totalEdges;
    }

    private getTopIssues(results: ValidationResult[]): Array<{ type: string; count: number; description: string }> {
        const issueMap = new Map<string, number>();

        results.forEach(result => {
            result.errors.forEach((error: string) => {
                issueMap.set(error, (issueMap.get(error) || 0) + 1);
            });
        });

        return Array.from(issueMap.entries())
            .map(([type, count]: [string, number]) => ({ type, count, description: type }))
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 5);
    }

    private generateRecommendations(results: ValidationResult[]): string[] {
        const recommendations: string[] = [];

        const lowHealthFiles = results.filter(r => r.healthScore < 70).length;
        if (lowHealthFiles > 0) {
            recommendations.push(`Improve ${lowHealthFiles} files with low health scores`);
        }

        const filesWithoutLinks = results.filter(r =>
            r.suggestions.some(s => s.includes('No links found'))
        ).length;
        if (filesWithoutLinks > 0) {
            recommendations.push(`Add connections to ${filesWithoutLinks} isolated files`);
        }

        return recommendations;
    }
}

export { EnhancedValidatorManager as default };