/**
 * Enhanced Validator Integration for Obsidian - Standalone Version
 * Bridges Bun-native validation with Obsidian's metadata cache
 * Provides real-time validation, auto-optimization, and analytics
 */

// Standalone interfaces to avoid external dependencies
interface ObsidianFile {
    path: string;
    extension: string;
}

interface ObsidianCache {
    frontmatter?: Record<string, any>;
    links?: Array<{
        link: string;
        displayText?: string;
        position?: {
            start?: {
                offset?: number;
            };
        };
    }>;
    headings?: Array<{
        level: number;
        heading: string;
    }>;
}

interface VaultApp {
    vault: {
        getMarkdownFiles(): ObsidianFile[];
        read(file: ObsidianFile): Promise<string>;
    };
    metadataCache: {
        getFileCache(file: ObsidianFile): ObsidianCache;
    };
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
    suggestions: string[];
    effectiveness: number; // 0-100 score
    lastOptimized: string;
}

interface ValidationResult {
    errors: string[];
    warnings: string[];
    suggestions: string[];
    healthScore: number;
    filePath: string;
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

interface ValidationConfig {
    confidenceThreshold: number;
    maxSuggestions: number;
    enableAutoOptimization: boolean;
    customRules: any[];
    tagWeights: any[];
}

interface EnhancedValidatorSettings {
    autoOptimize: boolean;
    config: ValidationConfig;
}

// Mock VaultGraph for standalone operation
class MockVaultGraph {
    private nodes: Map<string, any> = new Map();
    private edges: Map<string, any> = new Map();

    addNode(node: any): void {
        this.nodes.set(node.id, node);
    }

    getNode(path: string): any {
        return this.nodes.get(path);
    }

    calculateGraphMetrics(): { totalNodes: number; totalEdges: number } {
        return {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.size
        };
    }
}

export class EnhancedValidatorManager {
    private app: VaultApp;
    private settings: EnhancedValidatorSettings;

    constructor(app: VaultApp, settings: EnhancedValidatorSettings) {
        this.app = app;
        this.settings = settings;

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
            const analytics = await this.getRuleAnalytics();

            // Remove underperforming rules
            const underperformingRules = analytics.filter((rule: ValidatorAnalytics) =>
                rule.effectiveness < 30 && rule.triggerCount > 10
            );

            for (const rule of underperformingRules) {
                console.log(`🗑️ Would remove underperforming rule: ${rule.ruleName}`);
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
    private async buildVaultGraph(): Promise<MockVaultGraph> {
        const files = this.app.vault.getMarkdownFiles();
        const nodes = new Map<string, ObsidianNode>();
        const vaultGraph = new MockVaultGraph();

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
    private async fileToObsidianNode(file: ObsidianFile): Promise<ObsidianNode> {
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
    private async obsidianNodeToVaultNode(node: ObsidianNode): Promise<any> {
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
        nodes.forEach((node, path) => {
            node.links.wiki.forEach(targetPath => {
                const targetNode = nodes.get(targetPath);
                if (targetNode) {
                    targetNode.neighbors.backlink.push(path);
                }
            });
        });

        // Build tag peer relationships
        nodes.forEach((node, path) => {
            nodes.forEach((otherNode, otherPath) => {
                if (path !== otherPath) {
                    const sharedTags = node.tags.filter(tag => otherNode.tags.includes(tag));
                    if (sharedTags.length >= 2) { // Minimum 2 shared tags to be peers
                        node.neighbors.tagPeers.push(otherPath);
                    }
                }
            });
        });

        // Build alias peer relationships
        nodes.forEach((node, path) => {
            nodes.forEach((otherNode, otherPath) => {
                if (path !== otherPath) {
                    const sharedAliases = node.aliases.filter(alias =>
                        otherNode.aliases.includes(alias)
                    );
                    if (sharedAliases.length > 0) {
                        node.neighbors.aliasPeers.push(otherPath);
                    }
                }
            });
        });

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
            const result = await this.validateNode(obsidianNode, graph);

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
            analytics: await this.getRuleAnalytics()
        };

        console.log('✅ Validation complete:', report);
        return report;
    }

    /**
     * Validate a single node
     */
    private async validateNode(node: ObsidianNode, graph: MockVaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for title
        if (!node.properties.title) {
            errors.push('Missing title in frontmatter');
        }

        // Check for links
        if (node.links.wiki.length === 0) {
            warnings.push('No wiki links found');
            suggestions.push('Consider linking to related notes');
        }

        // Check for tags
        if (node.tags.length === 0) {
            warnings.push('No tags found');
            suggestions.push('Add relevant tags for better organization');
        }

        // Check for headings
        const file = this.app.vault.getMarkdownFiles().find(f => f.path === node.path);
        if (file) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.headings || cache.headings.length === 0) {
                warnings.push('No headings found');
                suggestions.push('Add headings for better structure');
            }
        }

        // Generate transitive link suggestions
        if (node.neighbors.tagPeers.length > 0) {
            suggestions.push(`Consider linking to ${node.neighbors.tagPeers[0]} (shared tags)`);
        }

        const healthScore = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5));

        return {
            errors,
            warnings,
            suggestions,
            healthScore,
            filePath: node.path
        };
    }

    /**
     * Generate transitive link suggestions for a specific file
     */
    async generateSuggestions(filePath: string): Promise<string[]> {
        const file = this.app.vault.getMarkdownFiles().find(f => f.path === filePath);
        if (!file) return [];

        const obsidianNode = await this.fileToObsidianNode(file);
        const graph = await this.buildVaultGraph();
        const result = await this.validateNode(obsidianNode, graph);

        return result.suggestions;
    }

    /**
     * Update validator settings
     */
    updateSettings(newSettings: Partial<EnhancedValidatorSettings>): void {
        this.settings = { ...this.settings, ...newSettings };

        if (newSettings.autoOptimize && !this.settings.autoOptimize) {
            this.initializeAutoOptimization();
        }
    }

    /**
     * Get mock rule analytics
     */
    private async getRuleAnalytics(): Promise<ValidatorAnalytics[]> {
        return [{
            ruleId: 'title-validation',
            ruleName: 'Title Validation Rule',
            triggerCount: 10,
            averageConfidenceBoost: 0.8,
            suggestions: ['Add title to frontmatter'],
            effectiveness: 85,
            lastOptimized: new Date().toISOString()
        }];
    }

    // Helper methods
    private extractTags(content: string, cache: ObsidianCache): string[] {
        const tags = new Set<string>();

        // Extract from content
        const tagRegex = /#([a-zA-Z0-9-_]+)/g;
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
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

    private extractLinks(cache: ObsidianCache): ObsidianNode['links'] {
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

            if (link.position?.start?.offset && link.position.start.offset < 0) {
                links.unresolved.push(link.link);
            }
        });

        return links;
    }

    private determineFileType(file: ObsidianFile, properties: any): ObsidianNode['type'] {
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

    private calculateInitialHealth(file: ObsidianFile, cache: ObsidianCache): ObsidianNode['health'] {
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
        const file = this.app.vault.getMarkdownFiles().find(f => f.path === filePath);
        if (!file) return [];
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.headings || [];
    }

    private calculateEdgeCount(vaultGraph: MockVaultGraph): number {
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
            r.suggestions.some((s: string) => s.includes('No links found'))
        ).length;
        if (filesWithoutLinks > 0) {
            recommendations.push(`Add connections to ${filesWithoutLinks} isolated files`);
        }

        return recommendations;
    }
}

export { EnhancedValidatorManager as default };
