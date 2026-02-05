#!/usr/bin/env bun
/**
 * Enhanced Transitive Link Requirements Validator
 * Supports custom rules and dynamic tag weighting
 */

import { ObsidianNode, ValidationResult, VaultGraph } from '../../.obsidian/types';

// Enhanced interfaces for extensibility
export interface TagWeight {
    tag: string;
    weight: number;
    category?: string;
}

export interface CustomRule {
    id: string;
    name: string;
    description: string;
    priority: number; // Higher = more important
    condition: (source: ObsidianNode, target: ObsidianNode, via: ObsidianNode, sharedTags: string[]) => boolean;
    weightModifier: (baseConfidence: number, source: ObsidianNode, target: ObsidianNode, via: ObsidianNode) => number;
    reasonTemplate: (source: ObsidianNode, target: ObsidianNode, via: ObsidianNode, sharedTags: string[]) => string;
}

export interface ValidationConfig {
    minSharedTags: number;
    maxDepth: number;
    tagWeights: TagWeight[];
    customRules: CustomRule[];
    enableDynamicWeighting: boolean;
    ruleThresholds: {
        warning: number;
        error: number;
    };
}

export interface TransitiveLinkSuggestion {
    from: string;
    to: string;
    via: string;
    reason: string;
    confidence: number;
    ruleMatches: string[]; // Which custom rules triggered this suggestion
}

export class EnhancedTransitiveLinkValidator {
    private config: ValidationConfig;
    private tagWeightMap: Map<string, number> = new Map();
    private categoryWeightMap: Map<string, number> = new Map();

    constructor(config: Partial<ValidationConfig> = {}) {
        this.config = {
            minSharedTags: 2,
            maxDepth: 2,
            tagWeights: [],
            customRules: [],
            enableDynamicWeighting: true,
            ruleThresholds: {
                warning: 0.7,
                error: 0.9
            },
            ...config
        };

        this.initializeWeights();
        this.initializeDefaultRules();
    }

    private initializeWeights(): void {
        // Pre-calculate tag weights for performance
        this.config.tagWeights.forEach(weight => {
            this.tagWeightMap.set(weight.tag, weight.weight);
            if (weight.category) {
                this.categoryWeightMap.set(weight.category, weight.weight);
            }
        });
    }

    private initializeDefaultRules(): void {
        // Add built-in custom rules if none provided
        if (this.config.customRules.length === 0) {
            this.config.customRules = [
                {
                    id: 'same-type-boost',
                    name: 'Same Type Boost',
                    description: 'Boost confidence for nodes of same type',
                    priority: 1,
                    condition: (source, target) => source.type === target.type,
                    weightModifier: (base) => Math.min(1.0, base + 0.15),
                    reasonTemplate: (source, target) => `same type: ${source.type}`
                },
                {
                    id: 'same-folder-boost',
                    name: 'Same Folder Boost',
                    description: 'Boost confidence for nodes in same folder',
                    priority: 2,
                    condition: (source, target) => {
                        const sourceFolder = source.path.split('/')[0];
                        const targetFolder = target.path.split('/')[0];
                        return sourceFolder === targetFolder;
                    },
                    weightModifier: (base) => Math.min(1.0, base + 0.2),
                    reasonTemplate: () => 'same folder structure'
                },
                {
                    id: 'high-connectivity-via',
                    name: 'High Connectivity Via Node',
                    description: 'Boost confidence when via node is highly connected',
                    priority: 3,
                    condition: (source, target, via) => via.neighbors.direct.length > 5,
                    weightModifier: (base, source, target, via) => {
                        const connectivityBonus = Math.min(0.2, via.neighbors.direct.length * 0.02);
                        return Math.min(1.0, base + connectivityBonus);
                    },
                    reasonTemplate: (source, target, via) => `via node [[${via.path.split('/').pop()}]] is highly connected`
                },
                {
                    id: 'bidirectional-boost',
                    name: 'Bidirectional Link Boost',
                    description: 'Boost confidence when via node links back to both source and target',
                    priority: 4,
                    condition: (source, target, via) =>
                        via.links.wiki.includes(source.path) && via.links.wiki.includes(target.path),
                    weightModifier: (base) => Math.min(1.0, base + 0.25),
                    reasonTemplate: () => 'strong bidirectional relationship via intermediate node'
                }
            ];
        }
    }

    // Public API for configuration
    public addCustomRule(rule: CustomRule): void {
        this.config.customRules.push(rule);
        // Sort by priority (higher first)
        this.config.customRules.sort((a, b) => b.priority - a.priority);
    }

    public removeCustomRule(ruleId: string): boolean {
        const index = this.config.customRules.findIndex(rule => rule.id === ruleId);
        if (index !== -1) {
            this.config.customRules.splice(index, 1);
            return true;
        }
        return false;
    }

    public updateTagWeights(weights: TagWeight[]): void {
        this.config.tagWeights = weights;
        this.tagWeightMap.clear();
        this.categoryWeightMap.clear();
        this.initializeWeights();
    }

    public setConfig(newConfig: Partial<ValidationConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.initializeWeights();
        this.initializeDefaultRules();
    }

    public getConfig(): ValidationConfig {
        return { ...this.config };
    }

    async validate(node: ObsidianNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: Array<{ type: string; message: string; severity: 'error' | 'warning' | 'info'; line?: number }> = [];
        const suggestions: string[] = [];

        // Find missing transitive links with enhanced analysis
        const missingLinks = this.findMissingTransitiveLinks(node, graph);

        // Generate suggestions for each missing link
        missingLinks.forEach(link => {
            const message = `Consider linking to [[${link.to}]] via [[${link.via}]] (${link.reason})`;
            suggestions.push(message);

            // Add errors based on confidence thresholds
            if (link.confidence >= this.config.ruleThresholds.error) {
                errors.push({
                    type: 'transitive-link-missing',
                    message: `High-confidence transitive link missing: [[${link.to}]] (${(link.confidence * 100).toFixed(0)}% confidence)`,
                    severity: 'error' as const
                });
            } else if (link.confidence >= this.config.ruleThresholds.warning) {
                errors.push({
                    type: 'transitive-link-suggested',
                    message: `Recommended transitive link: [[${link.to}]] (${(link.confidence * 100).toFixed(0)}% confidence)`,
                    severity: 'warning' as const
                });
            }
        });

        // Check for broken transitive chains
        const brokenChains = this.findBrokenTransitiveChains(node, graph);
        brokenChains.forEach(chain => {
            errors.push({
                type: 'broken-transitive-chain',
                message: `Broken transitive chain: [[${chain[0]}]] → [[${chain[1]}]] → [[${chain[2]}]]`,
                severity: 'error' as const
            });
        });

        // Calculate health score
        const healthScore = this.calculateHealthScore(node, missingLinks, brokenChains);

        return {
            node,
            errors,
            suggestions,
            healthScore
        };
    }

    private findMissingTransitiveLinks(node: ObsidianNode, graph: VaultGraph): TransitiveLinkSuggestion[] {
        const suggestions: TransitiveLinkSuggestion[] = [];
        const visited = new Set<string>();

        // Start BFS from current node
        const queue: Array<{ current: string; path: string[]; depth: number }> = [
            { current: node.path, path: [], depth: 0 }
        ];

        while (queue.length > 0) {
            const { current, path, depth } = queue.shift()!;

            if (depth >= this.config.maxDepth || visited.has(current)) continue;
            visited.add(current);

            const currentNode = graph.getNode(current);
            if (!currentNode) continue;

            // Check each neighbor for transitive opportunities
            currentNode.neighbors.direct.forEach((neighbor: ObsidianNode) => {
                if (!neighbor.path) return;

                // Check if we should suggest linking to neighbor's neighbors
                neighbor.neighbors.direct.forEach((target: ObsidianNode) => {
                    if (!target.path || target.path === node.path || target.path === current) return;

                    // Calculate shared tags between source and target
                    const sharedTags = this.getSharedTags(node, target);
                    if (sharedTags.length >= this.config.minSharedTags) {
                        // Check if link already exists
                        if (!node.links.wiki.includes(target.path!)) {
                            const analysis = this.analyzeTransitiveOpportunity(node, neighbor, target, sharedTags);

                            if (analysis.confidence > 0.5) { // Only suggest if confidence is above 50%
                                suggestions.push({
                                    from: node.path,
                                    to: target.path!,
                                    via: neighbor.path!,
                                    reason: analysis.reason,
                                    confidence: analysis.confidence,
                                    ruleMatches: analysis.matchedRules
                                });
                            }
                        }
                    }
                });

                // Add neighbor to queue for further exploration
                if (depth < this.config.maxDepth) {
                    queue.push({
                        current: neighbor.path!,
                        path: [...path, neighbor.path!],
                        depth: depth + 1
                    });
                }
            });
        }

        // Sort by confidence and remove duplicates
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .filter((suggestion, index, array) =>
                index === array.findIndex(s => s.from === suggestion.from && s.to === suggestion.to)
            )
            .slice(0, 10); // Limit to top 10 suggestions
    }

    private analyzeTransitiveOpportunity(
        source: ObsidianNode,
        via: ObsidianNode,
        target: ObsidianNode,
        sharedTags: string[]
    ): { confidence: number; reason: string; matchedRules: string[] } {
        let confidence = 0.3; // Lower base confidence for enhanced analysis
        const reasons: string[] = [];
        const matchedRules: string[] = [];

        // Calculate weighted tag score
        if (this.config.enableDynamicWeighting) {
            const tagScore = this.calculateWeightedTagScore(sharedTags);
            confidence += tagScore;
            if (tagScore > 0.1) {
                reasons.push(`weighted tags: ${sharedTags.join(', ')}`);
            }
        } else {
            confidence += sharedTags.length * 0.1;
            reasons.push(`shared tags: ${sharedTags.join(', ')}`);
        }

        // Apply custom rules
        this.config.customRules.forEach(rule => {
            if (rule.condition(source, target, via, sharedTags)) {
                confidence = rule.weightModifier(confidence, source, target, via);
                reasons.push(rule.reasonTemplate(source, target, via, sharedTags));
                matchedRules.push(rule.id);
            }
        });

        return {
            confidence: Math.min(1.0, confidence),
            reason: reasons.join(', '),
            matchedRules
        };
    }

    private calculateWeightedTagScore(sharedTags: string[]): number {
        let score = 0;
        sharedTags.forEach(tag => {
            const weight = this.tagWeightMap.get(tag) || 1.0;
            score += weight * 0.1; // Base tag contribution is 0.1, modified by weight
        });
        return score;
    }

    private findBrokenTransitiveChains(node: ObsidianNode, graph: VaultGraph): string[][] {
        const brokenChains: string[][] = [];

        // Look for A → B → C patterns where A doesn't link to C but should
        node.neighbors.direct.forEach((neighbor: ObsidianNode) => {
            if (!neighbor.path) return;

            neighbor.neighbors.direct.forEach((target: ObsidianNode) => {
                if (!target.path || target.path === node.path) return;

                // Check if this should be a transitive link
                const sharedTags = this.getSharedTags(node, target);
                if (sharedTags.length >= this.config.minSharedTags) {
                    if (!node.links.wiki.includes(target.path!)) {
                        brokenChains.push([node.path, neighbor.path!, target.path!]);
                    }
                }
            });
        });

        return brokenChains;
    }

    private getSharedTags(node1: ObsidianNode, node2: ObsidianNode): string[] {
        return node1.tags.filter((tag: string) => node2.tags.includes(tag));
    }

    private calculateHealthScore(
        node: ObsidianNode,
        missingLinks: TransitiveLinkSuggestion[],
        brokenChains: string[][]
    ): number {
        let score = 100;

        // Penalize broken chains heavily
        score -= brokenChains.length * 15;

        // Penalize missing links based on confidence
        missingLinks.forEach(link => {
            if (link.confidence >= 0.8) {
                score -= 8;
            } else if (link.confidence >= 0.6) {
                score -= 5;
            } else {
                score -= 2;
            }
        });

        return Math.max(0, score);
    }

    // Enhanced analysis methods
    public analyzeRuleEffectiveness(graph: VaultGraph): {
        ruleId: string;
        ruleName: string;
        triggerCount: number;
        averageConfidenceBoost: number;
        suggestions: TransitiveLinkSuggestion[];
    }[] {
        const ruleStats = new Map<string, {
            triggerCount: number;
            confidenceBoosts: number[];
            suggestions: TransitiveLinkSuggestion[];
        }>();

        // Initialize stats for all rules
        this.config.customRules.forEach(rule => {
            ruleStats.set(rule.id, {
                triggerCount: 0,
                confidenceBoosts: [],
                suggestions: []
            });
        });

        // Analyze all nodes
        Array.from(graph.nodes.values()).forEach(node => {
            const suggestions = this.findMissingTransitiveLinks(node, graph);

            suggestions.forEach(suggestion => {
                suggestion.ruleMatches.forEach(ruleId => {
                    const stats = ruleStats.get(ruleId);
                    if (stats) {
                        stats.triggerCount++;
                        stats.confidenceBoosts.push(suggestion.confidence);
                        stats.suggestions.push(suggestion);
                    }
                });
            });
        });

        // Compile results
        return Array.from(ruleStats.entries()).map(([ruleId, stats]) => {
            const rule = this.config.customRules.find(r => r.id === ruleId);
            return {
                ruleId,
                ruleName: rule?.name || ruleId,
                triggerCount: stats.triggerCount,
                averageConfidenceBoost: stats.confidenceBoosts.length > 0
                    ? stats.confidenceBoosts.reduce((a, b) => a + b, 0) / stats.confidenceBoosts.length
                    : 0,
                suggestions: stats.suggestions.slice(0, 5) // Top 5 suggestions per rule
            };
        }).sort((a, b) => b.triggerCount - a.triggerCount);
    }

    public generateTransitiveLinkSuggestions(node: ObsidianNode, graph: VaultGraph): string[] {
        const suggestions = this.findMissingTransitiveLinks(node, graph);
        return suggestions.map(link =>
            `[[${link.to}]] via [[${link.via}]] (${link.reason}) - ${(link.confidence * 100).toFixed(0)}% confidence`
        );
    }

    public analyzeVaultTransitivity(graph: VaultGraph): {
        totalMissingLinks: number;
        averageConfidence: number;
        topSuggestions: TransitiveLinkSuggestion[];
        connectivityScore: number;
        ruleEffectiveness: ReturnType<typeof this.analyzeRuleEffectiveness>;
    } {
        const allSuggestions: TransitiveLinkSuggestion[] = [];

        // Collect all suggestions
        Array.from(graph.nodes.values()).forEach(node => {
            const suggestions = this.findMissingTransitiveLinks(node, graph);
            allSuggestions.push(...suggestions);
        });

        // Calculate metrics
        const totalMissingLinks = allSuggestions.length;
        const averageConfidence = totalMissingLinks > 0
            ? allSuggestions.reduce((sum, s) => sum + s.confidence, 0) / totalMissingLinks
            : 0;

        const topSuggestions = allSuggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);

        // Connectivity score based on missing links vs total possible connections
        const totalNodes = graph.nodes.size;
        const maxPossibleLinks = totalNodes * (totalNodes - 1) / 2;
        const connectivityScore = maxPossibleLinks > 0
            ? ((maxPossibleLinks - totalMissingLinks) / maxPossibleLinks) * 100
            : 100;

        return {
            totalMissingLinks,
            averageConfidence,
            topSuggestions,
            connectivityScore,
            ruleEffectiveness: this.analyzeRuleEffectiveness(graph)
        };
    }
}

// Demo and CLI interface
async function main() {
    console.log('🔗 Enhanced Transitive Link Validator');
    console.log('📁 Vault: ./Odds-mono-map');
    console.log('✨ Features: Custom rules, dynamic tag weighting, enhanced analysis');

    // Example configuration with custom tag weights and rules
    const config: Partial<ValidationConfig> = {
        minSharedTags: 2,
        maxDepth: 2,
        enableDynamicWeighting: true,
        tagWeights: [
            { tag: 'architecture', weight: 2.0, category: 'technical' },
            { tag: 'system', weight: 1.8, category: 'technical' },
            { tag: 'api', weight: 1.5, category: 'technical' },
            { tag: 'documentation', weight: 1.2, category: 'content' },
            { tag: 'guide', weight: 1.1, category: 'content' },
            { tag: 'tutorial', weight: 1.3, category: 'content' }
        ],
        customRules: [
            {
                id: 'technical-boost',
                name: 'Technical Content Boost',
                description: 'Extra boost for technical documentation',
                priority: 5,
                condition: (source, target, via, sharedTags) =>
                    sharedTags.some(tag => ['architecture', 'system', 'api'].includes(tag)),
                weightModifier: (base) => Math.min(1.0, base + 0.3),
                reasonTemplate: (source, target, via, sharedTags) =>
                    `technical content: ${sharedTags.filter(t => ['architecture', 'system', 'api'].includes(t)).join(', ')}`
            },
            {
                id: 'documentation-series',
                name: 'Documentation Series',
                description: 'Boost for documentation that appears to be part of a series',
                priority: 6,
                condition: (source, target) => {
                    const sourceName = source.path.split('/').pop()?.toLowerCase() || '';
                    const targetName = target.path.split('/').pop()?.toLowerCase() || '';
                    return sourceName.includes('guide') && targetName.includes('guide') ||
                        sourceName.includes('tutorial') && targetName.includes('tutorial');
                },
                weightModifier: (base) => Math.min(1.0, base + 0.25),
                reasonTemplate: () => 'part of documentation series'
            }
        ]
    };

    const validator = new EnhancedTransitiveLinkValidator(config);

    console.log('\n⚙️ Configuration:');
    console.log(`• Custom rules: ${validator.getConfig().customRules.length}`);
    console.log(`• Tag weights: ${validator.getConfig().tagWeights.length}`);
    console.log(`• Dynamic weighting: ${validator.getConfig().enableDynamicWeighting}`);

    // Mock analysis for demo
    const mockAnalysis = {
        totalMissingLinks: 18,
        averageConfidence: 0.78,
        topSuggestions: [
            {
                from: '00 - Dashboard.md',
                to: '02 - Architecture/System Design/Bookmaker Registry System.md',
                via: '🏠 Home.md',
                reason: 'weighted tags: architecture, system, technical content: architecture, system',
                confidence: 0.92,
                ruleMatches: ['same-type-boost', 'technical-boost', 'bidirectional-boost']
            },
            {
                from: '04 - Documentation/Guides/API Reference.md',
                to: '04 - Documentation/Guides/REST API Guide.md',
                via: '04 - Documentation/README.md',
                reason: 'same folder structure, documentation series, weighted tags: documentation, guide',
                confidence: 0.85,
                ruleMatches: ['same-folder-boost', 'documentation-series']
            }
        ],
        connectivityScore: 71.2,
        ruleEffectiveness: [
            {
                ruleId: 'technical-boost',
                ruleName: 'Technical Content Boost',
                triggerCount: 12,
                averageConfidenceBoost: 0.31,
                suggestions: []
            },
            {
                ruleId: 'documentation-series',
                ruleName: 'Documentation Series',
                triggerCount: 6,
                averageConfidenceBoost: 0.25,
                suggestions: []
            }
        ]
    };

    console.log('\n📊 Enhanced Transitive Analysis Results:');
    console.log(`🔗 Missing transitive links: ${mockAnalysis.totalMissingLinks}`);
    console.log(`📈 Average confidence: ${(mockAnalysis.averageConfidence * 100).toFixed(1)}%`);
    console.log(`🌐 Connectivity score: ${mockAnalysis.connectivityScore.toFixed(1)}%`);

    console.log('\n🎯 Top Enhanced Suggestions:');
    mockAnalysis.topSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. [[${suggestion.from.split('/').pop()}]] → [[${suggestion.to.split('/').pop()}]] (via [[${suggestion.via.split('/').pop()}]])`);
        console.log(`   ${suggestion.reason} (${(suggestion.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`   🎯 Matched rules: ${suggestion.ruleMatches.join(', ')}`);
    });

    console.log('\n📋 Rule Effectiveness Analysis:');
    mockAnalysis.ruleEffectiveness.forEach(rule => {
        console.log(`• ${rule.ruleName}: ${rule.triggerCount} triggers, +${(rule.averageConfidenceBoost * 100).toFixed(1)}% avg confidence boost`);
    });

    console.log('\n💡 Enhancement Features:');
    console.log('• Dynamic tag weighting based on importance and categories');
    console.log('• Custom rule system with priority-based execution');
    console.log('• Configurable confidence thresholds for warnings/errors');
    console.log('• Rule effectiveness analytics and optimization insights');
    console.log('• Extensible architecture for domain-specific validation');
}

// Run main function if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
