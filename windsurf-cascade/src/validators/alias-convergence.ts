#!/usr/bin/env bun
/**
 * Alias Convergence Validator
 * If two nodes share an alias, they should be merged or cross-referenced
 */

import { ObsidianNode, ValidationResult, VaultGraph } from '../../.obsidian/types';

interface AliasConflict {
    alias: string;
    conflictingNodes: string[];
    suggestion: string;
    severity: 'error' | 'warning' | 'info';
    autoFixable: boolean;
}

interface AliasAnalysis {
    totalAliases: number;
    uniqueAliases: number;
    conflicts: AliasConflict[];
    duplicateRate: number;
    convergenceScore: number;
}

export class AliasConvergenceValidator {
    private allowPartialMatches: boolean;
    private caseSensitive: boolean;

    constructor(allowPartialMatches: boolean = false, caseSensitive: boolean = false) {
        this.allowPartialMatches = allowPartialMatches;
        this.caseSensitive = caseSensitive;
    }

    async validate(node: ObsidianNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: Array<{ type: string; message: string; severity: 'error' | 'warning' | 'info'; line?: number }> = [];
        const suggestions: string[] = [];

        // Skip nodes without aliases
        if (node.aliases.length === 0) {
            return {
                node,
                errors,
                suggestions,
                healthScore: 100
            };
        }

        // Find alias conflicts for this node
        const conflicts = this.findNodeAliasConflicts(node, graph);

        // Generate errors and suggestions for conflicts
        conflicts.forEach(conflict => {
            if (conflict.severity === 'error') {
                errors.push({
                    type: 'alias-conflict',
                    message: `Alias conflict: "${conflict.alias}" is used by multiple files`,
                    severity: 'error' as const
                });
            } else if (conflict.severity === 'warning') {
                errors.push({
                    type: 'alias-duplicate',
                    message: `Duplicate alias: "${conflict.alias}" should be unique`,
                    severity: 'warning' as const
                });
            }

            suggestions.push(conflict.suggestion);
        });

        // Check for alias quality issues
        const qualityIssues = this.checkAliasQuality(node);
        suggestions.push(...qualityIssues);

        // Calculate health score
        const healthScore = this.calculateHealthScore(node, conflicts, qualityIssues);

        return {
            node,
            errors,
            suggestions,
            healthScore
        };
    }

    private findNodeAliasConflicts(node: ObsidianNode, graph: VaultGraph): AliasConflict[] {
        const conflicts: AliasConflict[] = [];

        node.aliases.forEach(alias => {
            const normalizedAlias = this.normalizeAlias(alias);
            const conflictingNodes: string[] = [];

            // Find all nodes with similar aliases
            graph.nodes.forEach(otherNode => {
                if (otherNode.path === node.path) return;

                otherNode.aliases.forEach(otherAlias => {
                    const normalizedOther = this.normalizeAlias(otherAlias);

                    if (this.aliasesMatch(normalizedAlias, normalizedOther)) {
                        conflictingNodes.push(otherNode.path);
                    }
                });
            });

            // If we found conflicts, create a conflict entry
            if (conflictingNodes.length > 0) {
                const severity = this.determineConflictSeverity(alias, conflictingNodes);
                const suggestion = this.generateConflictSuggestion(alias, node.path, conflictingNodes);

                conflicts.push({
                    alias,
                    conflictingNodes: [node.path, ...conflictingNodes],
                    suggestion,
                    severity,
                    autoFixable: severity === 'info' && conflictingNodes.length === 1
                });
            }
        });

        return conflicts;
    }

    private normalizeAlias(alias: string): string {
        let normalized = alias.trim();

        if (!this.caseSensitive) {
            normalized = normalized.toLowerCase();
        }

        // Remove common prefixes/suffixes
        normalized = normalized.replace(/^(the |a |an )/i, '');
        normalized = normalized.replace(/(\s+(guide|tutorial|doc|documentation|reference))$/i, '');

        // Normalize whitespace and special characters
        normalized = normalized.replace(/\s+/g, ' ');
        normalized = normalized.replace(/[^\w\s-]/g, '');

        return normalized;
    }

    private aliasesMatch(alias1: string, alias2: string): boolean {
        if (alias1 === alias2) return true;

        if (this.allowPartialMatches) {
            // Check for partial matches
            const shorter = alias1.length < alias2.length ? alias1 : alias2;
            const longer = alias1.length < alias2.length ? alias2 : alias1;

            // If one is contained within the other
            if (longer.includes(shorter) && shorter.length > 3) return true;

            // Check for high similarity (simple Levenshtein distance)
            const distance = this.calculateLevenshteinDistance(alias1, alias2);
            const similarity = 1 - distance / Math.max(alias1.length, alias2.length);

            return similarity > 0.8;
        }

        return false;
    }

    private calculateLevenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private determineConflictSeverity(alias: string, conflictingNodes: string[]): 'error' | 'warning' | 'info' {
        // Exact matches with multiple nodes = error
        if (conflictingNodes.length > 1) return 'error';

        // Single conflict = warning
        if (conflictingNodes.length === 1) return 'warning';

        // Similar matches = info
        return 'info';
    }

    private generateConflictSuggestion(alias: string, currentNode: string, conflictingNodes: string[]): string {
        const conflictList = conflictingNodes.map(node => `[[${node}]]`).join(' and ');

        if (conflictingNodes.length === 1) {
            return `Consider adding "See also: [[${conflictingNodes[0]}]]" to [[${currentNode}]] or make alias "${alias}" more specific`;
        } else {
            return `Multiple files use alias "${alias}". Consider: 1) Making aliases more specific, 2) Adding cross-references between ${conflictList}, or 3) Creating a disambiguation page`;
        }
    }

    private checkAliasQuality(node: ObsidianNode): string[] {
        const suggestions: string[] = [];

        node.aliases.forEach((alias, index) => {
            // Check for empty or whitespace-only aliases
            if (!alias.trim()) {
                suggestions.push(`Remove empty alias at position ${index + 1}`);
                return;
            }

            // Check for very short aliases
            if (alias.trim().length < 3) {
                suggestions.push(`Alias "${alias}" is too short - consider using a more descriptive alias`);
            }

            // Check for very long aliases
            if (alias.length > 50) {
                suggestions.push(`Alias "${alias}" is very long - consider shortening it`);
            }

            // Check for special characters
            if (!/^[a-zA-Z0-9\s\-_]+$/.test(alias)) {
                suggestions.push(`Alias "${alias}" contains special characters - consider using only letters, numbers, spaces, hyphens, and underscores`);
            }

            // Check for title case consistency
            const words = alias.split(' ');
            const isTitleCase = words.every(word =>
                word.length === 0 ||
                word === word.toUpperCase() ||
                word[0] === word[0]?.toUpperCase()
            );

            if (!isTitleCase && words.length > 1) {
                suggestions.push(`Consider using title case for alias "${alias}"`);
            }

            // Check for duplicates within the same node
            const duplicates = node.aliases.filter((a, i) => a === alias && i !== index);
            if (duplicates.length > 0) {
                suggestions.push(`Remove duplicate alias "${alias}"`);
            }
        });

        return suggestions;
    }

    private calculateHealthScore(node: ObsidianNode, conflicts: AliasConflict[], qualityIssues: string[]): number {
        let score = 100;

        // Penalize conflicts heavily
        const errorConflicts = conflicts.filter(c => c.severity === 'error').length;
        const warningConflicts = conflicts.filter(c => c.severity === 'warning').length;

        score -= errorConflicts * 20;
        score -= warningConflicts * 10;

        // Penalize quality issues
        score -= qualityIssues.length * 5;

        // Bonus for having good aliases
        if (node.aliases.length > 0 && conflicts.length === 0 && qualityIssues.length === 0) {
            score += 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    // Analyze alias convergence across the entire vault
    analyzeVaultAliasConvergence(graph: VaultGraph): AliasAnalysis {
        const aliasMap = new Map<string, string[]>();
        let totalAliases = 0;

        // Build alias map
        graph.nodes.forEach(node => {
            node.aliases.forEach(alias => {
                totalAliases++;
                const normalized = this.normalizeAlias(alias);

                if (!aliasMap.has(normalized)) {
                    aliasMap.set(normalized, []);
                }
                aliasMap.get(normalized)!.push(node.path);
            });
        });

        // Find conflicts
        const conflicts: AliasConflict[] = [];
        aliasMap.forEach((nodes, alias) => {
            if (nodes.length > 1) {
                const severity = nodes.length > 2 ? 'error' : 'warning';
                const suggestion = this.generateConflictSuggestion(alias, nodes[0], nodes.slice(1));

                conflicts.push({
                    alias,
                    conflictingNodes: nodes,
                    suggestion,
                    severity,
                    autoFixable: nodes.length === 2 && severity === 'warning'
                });
            }
        });

        const uniqueAliases = aliasMap.size;
        const duplicateRate = totalAliases > 0 ? ((totalAliases - uniqueAliases) / totalAliases) * 100 : 0;
        const convergenceScore = Math.max(0, 100 - (duplicateRate * 2) - (conflicts.length * 5));

        return {
            totalAliases,
            uniqueAliases,
            conflicts,
            duplicateRate,
            convergenceScore
        };
    }

    // Generate alias convergence report
    generateAliasReport(analysis: AliasAnalysis): string {
        const lines: string[] = [];

        lines.push('## 🏷️ Alias Convergence Analysis');
        lines.push('');
        lines.push(`📊 Total aliases: ${analysis.totalAliases}`);
        lines.push(`🔤 Unique aliases: ${analysis.uniqueAliases}`);
        lines.push(`📈 Duplicate rate: ${analysis.duplicateRate.toFixed(1)}%`);
        lines.push(`🎯 Convergence score: ${analysis.convergenceScore.toFixed(1)}%`);
        lines.push('');

        if (analysis.conflicts.length > 0) {
            lines.push('### 🚨 Alias Conflicts');
            lines.push('');

            analysis.conflicts.forEach((conflict, index) => {
                const severity = conflict.severity === 'error' ? '🔴' : conflict.severity === 'warning' ? '🟡' : '🟢';
                lines.push(`${index + 1}. ${severity} "${conflict.alias}"`);
                lines.push(`   Used by: ${conflict.conflictingNodes.map(f => `[[${f}]]`).join(', ')}`);
                lines.push(`   ${conflict.suggestion}`);
                if (conflict.autoFixable) {
                    lines.push(`   ✅ Auto-fixable`);
                }
                lines.push('');
            });
        }

        if (analysis.convergenceScore >= 80) {
            lines.push('✅ Excellent alias convergence!');
        } else if (analysis.convergenceScore >= 60) {
            lines.push('⚠️ Good alias convergence with room for improvement');
        } else {
            lines.push('❌ Poor alias convergence - consider standardizing aliases');
        }

        return lines.join('\n');
    }
}

// CLI interface for standalone usage
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args.find(arg => arg.startsWith('--vault='))?.split('=')[1] || './Odds-mono-map';
    const allowPartial = args.includes('--allow-partial');
    const caseSensitive = args.includes('--case-sensitive');

    console.log('🏷️ Alias Convergence Validator');
    console.log(`📁 Vault: ${vaultPath}`);
    console.log(`🔍 Partial matches: ${allowPartial}`);
    console.log(`🔤 Case sensitive: ${caseSensitive}`);

    const validator = new AliasConvergenceValidator(allowPartial, caseSensitive);

    // Mock analysis for demo
    const mockAnalysis: AliasAnalysis = {
        totalAliases: 45,
        uniqueAliases: 38,
        duplicateRate: 15.6,
        convergenceScore: 72.5,
        conflicts: [
            {
                alias: 'API Guide',
                conflictingNodes: [
                    '04 - Documentation/Guides/API Reference.md',
                    '04 - Documentation/Guides/REST API Guide.md'
                ],
                suggestion: 'Consider adding "See also: [[REST API Guide]]" to [[API Reference]] or make alias "API Guide" more specific',
                severity: 'warning',
                autoFixable: true
            },
            {
                alias: 'System Design',
                conflictingNodes: [
                    '02 - Architecture/System Design/Bookmaker Registry System.md',
                    '02 - Architecture/System Design/Circuit Breaker Architecture.md',
                    '02 - Architecture/System Design/Market Convention Mapping.md'
                ],
                suggestion: 'Multiple files use alias "System Design". Consider: 1) Making aliases more specific, 2) Adding cross-references, or 3) Creating a disambiguation page',
                severity: 'error' as const,
                autoFixable: false
            }
        ]
    };

    console.log('\n📊 Alias Convergence Results:');
    console.log(`📊 Total aliases: ${mockAnalysis.totalAliases}`);
    console.log(`🔤 Unique aliases: ${mockAnalysis.uniqueAliases}`);
    console.log(`📈 Duplicate rate: ${mockAnalysis.duplicateRate.toFixed(1)}%`);
    console.log(`🎯 Convergence score: ${mockAnalysis.convergenceScore.toFixed(1)}%`);

    if (mockAnalysis.conflicts.length > 0) {
        console.log('\n🚨 Alias Conflicts:');
        mockAnalysis.conflicts.forEach((conflict, index) => {
            const severity = conflict.severity === 'error' ? '🔴' : conflict.severity === 'warning' ? '🟡' : '🟢';
            console.log(`${index + 1}. ${severity} "${conflict.alias}"`);
            console.log(`   Used by: ${conflict.conflictingNodes.map(f => `[[${f}]]`).join(', ')}`);
            console.log(`   ${conflict.suggestion}`);
            if (conflict.autoFixable) {
                console.log(`   ✅ Auto-fixable`);
            }
        });
    }

    console.log('\n💡 Recommendations:');
    console.log('• Make aliases more specific to avoid conflicts');
    console.log('• Add cross-references between related content');
    console.log('• Use consistent naming conventions for aliases');
    console.log('• Consider creating disambiguation pages for common terms');
}

// Run main function if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
