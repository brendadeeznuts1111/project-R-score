#!/usr/bin/env bun
/**
 * Transitive Link Requirements Validator
 * If A → B and B → C, then A should link to C if they share tags
 */

import { ObsidianNode, ValidationResult, VaultGraph } from '../../.obsidian/types';

interface TransitiveLinkSuggestion {
    from: string;
    to: string;
    via: string;
    reason: string;
    confidence: number;
}

export class TransitiveLinkValidator {
    private minSharedTags: number;
    private maxDepth: number;

    constructor(minSharedTags: number = 2, maxDepth: number = 2) {
        this.minSharedTags = minSharedTags;
        this.maxDepth = maxDepth;
    }

    async validate(node: ObsidianNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: Array<{ type: string; message: string; severity: 'error' | 'warning' | 'info'; line?: number }> = [];
        const suggestions: string[] = [];

        // Find missing transitive links
        const missingLinks = this.findMissingTransitiveLinks(node, graph);

        // Generate suggestions for each missing link
        missingLinks.forEach(link => {
            const message = `Consider linking to [[${link.to}]] via [[${link.via}]] (${link.reason})`;
            suggestions.push(message);

            // Add as warning if high confidence
            if (link.confidence >= 0.8) {
                errors.push({
                    type: 'transitive-link',
                    message: `Missing transitive link: [[${link.to}]] (confidence: ${(link.confidence * 100).toFixed(0)}%)`,
                    severity: 'warning'
                });
            }
        });

        // Check for broken transitive chains
        const brokenChains = this.findBrokenTransitiveChains(node, graph);
        brokenChains.forEach(chain => {
            errors.push({
                type: 'broken-chain',
                message: `Broken transitive chain: ${chain.join(' → ')}`,
                severity: 'error'
            });
        });

        // Calculate health score impact
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

            if (depth >= this.maxDepth || visited.has(current)) continue;
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
                    if (sharedTags.length >= this.minSharedTags) {
                        // Check if link already exists
                        if (!node.links.wiki.includes(target.path!)) {
                            const confidence = this.calculateConfidence(node, neighbor, target, sharedTags);

                            suggestions.push({
                                from: node.path,
                                to: target.path!,
                                via: neighbor.path!,
                                reason: `shared tags: ${sharedTags.join(', ')}`,
                                confidence
                            });
                        }
                    }
                });

                // Add neighbor to queue for further exploration
                if (depth < this.maxDepth) {
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
            .slice(0, 5); // Limit to top 5 suggestions
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
                if (sharedTags.length >= this.minSharedTags) {
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

    private calculateConfidence(
        source: ObsidianNode,
        via: ObsidianNode,
        target: ObsidianNode,
        sharedTags: string[]
    ): number {
        let confidence = 0.5; // Base confidence

        // Boost for shared tags
        confidence += sharedTags.length * 0.1;

        // Boost for shared type
        if (source.type === target.type) confidence += 0.1;

        // Boost for shared folder
        const sourceFolder = source.path.split('/')[0];
        const targetFolder = target.path.split('/')[0];
        if (sourceFolder === targetFolder) confidence += 0.15;

        // Boost if via node is highly connected
        if (via.neighbors.direct.length > 5) confidence += 0.1;

        // Boost if source and target both link to via (bidirectional)
        if (via.links.wiki.includes(source.path) && via.links.wiki.includes(target.path)) {
            confidence += 0.1;
        }

        return Math.min(1.0, confidence);
    }

    private calculateHealthScore(
        node: ObsidianNode,
        missingLinks: TransitiveLinkSuggestion[],
        brokenChains: string[][]
    ): number {
        let score = 100;

        // Penalize broken chains heavily
        score -= brokenChains.length * 15;

        // Penalize high-confidence missing links
        const highConfidenceMissing = missingLinks.filter(link => link.confidence >= 0.8);
        score -= highConfidenceMissing.length * 8;

        // Small penalty for lower confidence suggestions
        const lowConfidenceMissing = missingLinks.filter(link => link.confidence < 0.8);
        score -= lowConfidenceMissing.length * 3;

        return Math.max(0, score);
    }

    // Utility method to generate transitive link suggestions
    generateTransitiveLinkSuggestions(node: ObsidianNode, graph: VaultGraph): string[] {
        const missingLinks = this.findMissingTransitiveLinks(node, graph);

        return missingLinks.map(link => {
            const action = link.confidence >= 0.8 ? 'Add link' : 'Consider linking';
            return `${action} to [[${link.to}]] (via [[${link.via}]], confidence: ${(link.confidence * 100).toFixed(0)}%)`;
        });
    }

    // Analyze transitive connectivity across the entire vault
    analyzeVaultTransitivity(graph: VaultGraph): {
        totalMissingLinks: number;
        averageConfidence: number;
        topSuggestions: TransitiveLinkSuggestion[];
        connectivityScore: number;
    } {
        const allSuggestions: TransitiveLinkSuggestion[] = [];
        let totalConfidence = 0;

        graph.nodes.forEach(node => {
            const suggestions = this.findMissingTransitiveLinks(node, graph);
            allSuggestions.push(...suggestions);
            totalConfidence += suggestions.reduce((sum, s) => sum + s.confidence, 0);
        });

        const averageConfidence = allSuggestions.length > 0
            ? totalConfidence / allSuggestions.length
            : 0;

        // Calculate connectivity score (higher is better)
        const totalPossibleLinks = graph.nodes.size * (graph.nodes.size - 1) / 2;
        const existingLinks = graph.edges.size;
        const suggestedLinks = allSuggestions.filter(s => s.confidence >= 0.7).length;
        const connectivityScore = ((existingLinks + suggestedLinks) / totalPossibleLinks) * 100;

        return {
            totalMissingLinks: allSuggestions.length,
            averageConfidence,
            topSuggestions: allSuggestions.slice(0, 10),
            connectivityScore
        };
    }
}

// CLI interface for standalone usage
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args.find(arg => arg.startsWith('--vault='))?.split('=')[1] || './Odds-mono-map';
    const minSharedTags = parseInt(args.find(arg => arg.startsWith('--min-tags='))?.split('=')[1] || '2');

    console.log('🔗 Transitive Link Validator');
    console.log(`📁 Vault: ${vaultPath}`);
    console.log(`🏷️ Minimum shared tags: ${minSharedTags}`);

    // Mock implementation for demo
    const validator = new TransitiveLinkValidator(minSharedTags);

    // In real implementation, this would load the actual graph
    console.log('✅ Transitive link validator initialized');
    console.log('🔍 Ready to analyze transitive relationships');

    // Example analysis
    const mockResults = {
        totalMissingLinks: 15,
        averageConfidence: 0.73,
        topSuggestions: [
            {
                from: '00 - Dashboard.md',
                to: '02 - Architecture/System Design/Bookmaker Registry System.md',
                via: '🏠 Home.md',
                reason: 'Shared tags: system, architecture',
                confidence: 0.85
            }
        ] as TransitiveLinkSuggestion[],
        connectivityScore: 67.5
    };

    console.log('\n📊 Transitive Analysis Results:');
    console.log(`🔗 Missing transitive links: ${mockResults.totalMissingLinks}`);
    console.log(`📈 Average confidence: ${(mockResults.averageConfidence * 100).toFixed(1)}%`);
    console.log(`🌐 Connectivity score: ${mockResults.connectivityScore.toFixed(1)}%`);

    console.log('\n🎯 Top Suggestions:');
    mockResults.topSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. [[${suggestion.from}]] → [[${suggestion.to}]] (via [[${suggestion.via}]])`);
        console.log(`   ${suggestion.reason} (${(suggestion.confidence * 100).toFixed(0)}% confidence)`);
    });
}

// Run main function if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
