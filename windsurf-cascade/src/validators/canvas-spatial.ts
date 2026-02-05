#!/usr/bin/env bun
/**
 * Canvas Spatial Consistency Validator
 * Nodes close in canvas should be cross-linked
 */

import { ObsidianNode, ValidationResult, VaultGraph, CanvasData, CanvasNode } from '../../.obsidian/types';

interface SpatialSuggestion {
    file1: string;
    file2: string;
    distance: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

interface CanvasAnalysis {
    file: string;
    totalNodes: number;
    linkedNodes: number;
    spatiallyCloseNodes: number;
    missingLinks: SpatialSuggestion[];
    spatialEfficiency: number;
}

export class CanvasSpatialValidator {
    private proximityThreshold: number;
    private minNodeSize: number;

    constructor(proximityThreshold: number = 300, minNodeSize: number = 50) {
        this.proximityThreshold = proximityThreshold;
        this.minNodeSize = minNodeSize;
    }

    async validate(node: ObsidianNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: Array<{ type: string; message: string; severity: 'error' | 'warning' | 'info'; line?: number }> = [];
        const suggestions: string[] = [];

        // Only validate canvas files
        if (node.type !== 'canvas') {
            return {
                node,
                errors,
                suggestions,
                healthScore: 100
            };
        }

        try {
            // Load and parse canvas data
            const canvasData = await this.loadCanvasData(node.path);
            if (!canvasData) {
                errors.push({
                    type: 'canvas-parse',
                    message: 'Could not parse canvas file',
                    severity: 'error' as const
                });
                return {
                    node,
                    errors,
                    suggestions,
                    healthScore: 0
                };
            }

            // Analyze spatial relationships
            const analysis = this.analyzeCanvasSpatialRelationships(node, canvasData, graph);

            // Generate suggestions for missing links
            analysis.missingLinks.forEach(suggestion => {
                const message = `Spatially close but not linked: [[${suggestion.file2}]] is ${Math.round(suggestion.distance)}px from [[${suggestion.file1}]]`;
                suggestions.push(message);

                if (suggestion.priority === 'high') {
                    errors.push({
                        type: 'spatial-link',
                        message: `High-priority spatial link missing: [[${suggestion.file2}]] (${Math.round(suggestion.distance)}px)`,
                        severity: 'warning' as const
                    });
                }
            });

            // Check canvas efficiency
            if (analysis.spatialEfficiency < 50) {
                errors.push({
                    type: 'canvas-efficiency',
                    message: `Low spatial efficiency: ${analysis.spatialEfficiency.toFixed(1)}% of nearby nodes are linked`,
                    severity: 'warning' as const
                });
            }

            // Calculate health score
            const healthScore = this.calculateHealthScore(analysis);

            return {
                node,
                errors,
                suggestions,
                healthScore
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push({
                type: 'canvas-validation',
                message: `Canvas validation failed: ${errorMessage}`,
                severity: 'error' as const
            });

            return {
                node,
                errors,
                suggestions,
                healthScore: 0
            };
        }
    }

    private async loadCanvasData(canvasPath: string): Promise<CanvasData | null> {
        try {
            const content = await Bun.file(canvasPath).text();
            return JSON.parse(content) as CanvasData;
        } catch (error) {
            console.error(`Failed to load canvas ${canvasPath}:`, error);
            return null;
        }
    }

    private analyzeCanvasSpatialRelationships(
        node: ObsidianNode,
        canvasData: CanvasData,
        graph: VaultGraph
    ): CanvasAnalysis {
        const fileNodes = canvasData.nodes.filter((n: CanvasNode) => n.type === 'file' && n.file);
        const missingLinks: SpatialSuggestion[] = [];

        let linkedNodes = 0;
        let spatiallyCloseNodes = 0;

        // Analyze each file node
        fileNodes.forEach((node1: CanvasNode, index: number) => {
            if (!node1.file) return;

            const node1Data = graph.getNode(node1.file);
            if (!node1Data) return;

            // Check proximity to other nodes
            fileNodes.forEach((node2: CanvasNode, otherIndex: number) => {
                if (index === otherIndex || !node2.file) return;

                const distance = this.calculateDistance(node1, node2);

                if (distance < this.proximityThreshold) {
                    spatiallyCloseNodes++;

                    // Check if they're linked
                    if (node1Data.links.wiki.includes(node2.file!)) {
                        linkedNodes++;
                    } else {
                        // Suggest linking spatially close nodes
                        const priority = this.calculatePriority(node1, node2, distance, graph);
                        const reason = this.generateReason(node1, node2, distance, graph);

                        missingLinks.push({
                            file1: node1.file!,
                            file2: node2.file!,
                            distance,
                            reason,
                            priority
                        });
                    }
                }
            });
        });

        // Calculate spatial efficiency
        const spatialEfficiency = spatiallyCloseNodes > 0
            ? (linkedNodes / spatiallyCloseNodes) * 100
            : 100;

        return {
            file: node.path,
            totalNodes: fileNodes.length,
            linkedNodes,
            spatiallyCloseNodes,
            missingLinks: missingLinks.sort((a, b) => a.distance - b.distance),
            spatialEfficiency
        };
    }

    private calculateDistance(node1: CanvasNode, node2: CanvasNode): number {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private calculatePriority(
        node1: CanvasNode,
        node2: CanvasNode,
        distance: number,
        graph: VaultGraph
    ): 'high' | 'medium' | 'low' {
        let score = 0;

        // Distance-based scoring (closer = higher priority)
        if (distance < 100) score += 3;
        else if (distance < 200) score += 2;
        else score += 1;

        // Size-based scoring (larger nodes = higher priority)
        const node1Size = node1.width * node1.height;
        const node2Size = node2.width * node2.height;
        if (node1Size > this.minNodeSize * 10 || node2Size > this.minNodeSize * 10) score += 1;

        // Content-based scoring
        if (node1.file && node2.file) {
            const node1Data = graph.getNode(node1.file);
            const node2Data = graph.getNode(node2.file);

            if (node1Data && node2Data) {
                // Shared tags increase priority
                const sharedTags = node1Data.tags.filter((tag: string) => node2Data.tags.includes(tag));
                score += sharedTags.length;

                // Same type increases priority
                if (node1Data.type === node2Data.type) score += 1;
            }
        }

        if (score >= 5) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    private generateReason(
        node1: CanvasNode,
        node2: CanvasNode,
        distance: number,
        graph: VaultGraph
    ): string {
        const reasons: string[] = [];

        // Distance-based reason
        if (distance < 100) reasons.push('very close proximity');
        else if (distance < 200) reasons.push('close proximity');
        else reasons.push('moderate proximity');

        // Content-based reasons
        if (node1.file && node2.file) {
            const node1Data = graph.getNode(node1.file);
            const node2Data = graph.getNode(node2.file);

            if (node1Data && node2Data) {
                const sharedTags = node1Data.tags.filter((tag: string) => node2Data.tags.includes(tag));
                if (sharedTags.length > 0) {
                    reasons.push(`shared tags: ${sharedTags.join(', ')}`);
                }

                if (node1Data.type === node2Data.type) {
                    reasons.push(`same type: ${node1Data.type}`);
                }
            }
        }

        // Visual-based reasons
        const node1Size = node1.width * node1.height;
        const node2Size = node2.width * node2.height;
        if (node1Size > this.minNodeSize * 10 || node2Size > this.minNodeSize * 10) {
            reasons.push('large node size');
        }

        return reasons.join(', ');
    }

    private calculateHealthScore(analysis: CanvasAnalysis): number {
        let score = 100;

        // Penalize low spatial efficiency
        if (analysis.spatialEfficiency < 30) score -= 30;
        else if (analysis.spatialEfficiency < 50) score -= 20;
        else if (analysis.spatialEfficiency < 70) score -= 10;

        // Penalize high-priority missing links
        const highPriorityMissing = analysis.missingLinks.filter(link => link.priority === 'high').length;
        score -= highPriorityMissing * 8;

        // Penalize medium-priority missing links
        const mediumPriorityMissing = analysis.missingLinks.filter(link => link.priority === 'medium').length;
        score -= mediumPriorityMissing * 4;

        // Small penalty for low-priority missing links
        const lowPriorityMissing = analysis.missingLinks.filter(link => link.priority === 'low').length;
        score -= lowPriorityMissing * 2;

        return Math.max(0, score);
    }

    // Analyze all canvas files in the vault
    async analyzeAllCanvases(graph: VaultGraph): Promise<{
        totalCanvases: number;
        averageEfficiency: number;
        totalMissingLinks: number;
        canvasAnalyses: CanvasAnalysis[];
    }> {
        const canvasNodes = Array.from(graph.nodes.values()).filter((node: ObsidianNode) => node.type === 'canvas');
        const analyses: CanvasAnalysis[] = [];

        for (const canvasNode of canvasNodes) {
            const result = await this.validate(canvasNode, graph);
            const canvasData = await this.loadCanvasData(canvasNode.path);

            if (canvasData) {
                const analysis = this.analyzeCanvasSpatialRelationships(canvasNode, canvasData, graph);
                analyses.push(analysis);
            }
        }

        const averageEfficiency = analyses.length > 0
            ? analyses.reduce((sum, a) => sum + a.spatialEfficiency, 0) / analyses.length
            : 100;

        const totalMissingLinks = analyses.reduce((sum, a) => sum + a.missingLinks.length, 0);

        return {
            totalCanvases: canvasNodes.length,
            averageEfficiency,
            totalMissingLinks,
            canvasAnalyses: analyses
        };
    }

    // Generate visual representation of canvas analysis
    generateCanvasVisualization(analysis: CanvasAnalysis): string {
        const lines: string[] = [];

        lines.push(`## 🎨 Canvas Spatial Analysis: ${analysis.file}`);
        lines.push('');
        lines.push(`📊 Efficiency: ${analysis.spatialEfficiency.toFixed(1)}%`);
        lines.push(`🔗 Linked nodes: ${analysis.linkedNodes}/${analysis.spatiallyCloseNodes}`);
        lines.push('');

        if (analysis.missingLinks.length > 0) {
            lines.push('### 🚨 Missing Spatial Links');
            analysis.missingLinks.slice(0, 10).forEach(link => {
                const priority = link.priority === 'high' ? '🔴' : link.priority === 'medium' ? '🟡' : '🟢';
                lines.push(`${priority} [[${link.file1}]] ↔ [[${link.file2}]] (${Math.round(link.distance)}px)`);
                lines.push(`   ${link.reason}`);
            });
        }

        return lines.join('\n');
    }
}

// CLI interface for standalone usage
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args.find(arg => arg.startsWith('--vault='))?.split('=')[1] || './Odds-mono-map';
    const threshold = parseInt(args.find(arg => arg.startsWith('--threshold='))?.split('=')[1] || '300');

    console.log('🎨 Canvas Spatial Validator');
    console.log(`📁 Vault: ${vaultPath}`);
    console.log(`📏 Proximity threshold: ${threshold}px`);

    const validator = new CanvasSpatialValidator(threshold);

    // Mock analysis for demo
    const mockAnalysis: CanvasAnalysis = {
        file: 'System Architecture.canvas',
        totalNodes: 12,
        linkedNodes: 6,
        spatiallyCloseNodes: 10,
        spatialEfficiency: 60.0,
        missingLinks: [
            {
                file1: 'Bookmaker Registry System.md',
                file2: 'API Gateway.md',
                distance: 120,
                reason: 'close proximity, shared tags: system, architecture',
                priority: 'high'
            },
            {
                file1: 'Database Schema.md',
                file2: 'Cache Layer.md',
                distance: 180,
                reason: 'moderate proximity, same type: documentation',
                priority: 'medium'
            }
        ]
    };

    console.log('\n📊 Canvas Analysis Results:');
    console.log(`📁 Total nodes: ${mockAnalysis.totalNodes}`);
    console.log(`🔗 Spatially close: ${mockAnalysis.spatiallyCloseNodes}`);
    console.log(`✅ Actually linked: ${mockAnalysis.linkedNodes}`);
    console.log(`📈 Spatial efficiency: ${mockAnalysis.spatialEfficiency.toFixed(1)}%`);

    if (mockAnalysis.missingLinks.length > 0) {
        console.log('\n🚨 Missing Spatial Links:');
        mockAnalysis.missingLinks.forEach((link, index) => {
            const priority = link.priority === 'high' ? '🔴' : link.priority === 'medium' ? '🟡' : '🟢';
            console.log(`${index + 1}. ${priority} [[${link.file1}]] ↔ [[${link.file2}]] (${Math.round(link.distance)}px)`);
            console.log(`   ${link.reason}`);
        });
    }

    console.log('\n💡 Suggestions:');
    console.log('• Link spatially close nodes to improve visual coherence');
    console.log('• Consider grouping related nodes in canvas layout');
    console.log('• Use canvas edges to show explicit relationships');
}

// Run main function if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
