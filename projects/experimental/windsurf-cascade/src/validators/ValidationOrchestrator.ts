/**
 * Dependency-Aware Validation Orchestrator
 * Implements graph-aware validation with rule dependencies
 */

import { VaultNode, VaultGraph } from '../models/VaultNode';
import { file } from 'bun';
import YAML from 'yaml';
import MarkdownIt from 'markdown-it';

export interface ValidationResult {
    filePath: string;
    errors: string[];
    warnings: string[];
    metrics: {
        healthScore: number;
        validationTime: number;
    };
    affectedNodes: string[];
}

export interface Validator {
    name: string;
    priority: number;
    dependencies: string[];
    blocking: string[];
    validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult>;
}

export class ValidationOrchestrator {
    private validators: Map<string, Validator> = new Map();
    private dependencyGraph: Map<string, string[]> = new Map();
    private graph: VaultGraph;

    constructor(graph: VaultGraph) {
        this.graph = graph;
        this.registerValidators();
        this.buildDependencyGraph();
    }

    private registerValidators() {
        this.register(new YAMLValidator());
        this.register(new LinkIntegrityValidator(this.graph));
        this.register(new TagStandardizationValidator(this.graph));
        this.register(new HeadingHierarchyValidator());
        this.register(new DashboardFreshnessValidator());
        this.register(new NeighborConvergenceValidator(this.graph));
    }

    private buildDependencyGraph() {
        this.dependencyGraph.clear();

        this.validators.forEach((validator, name) => {
            this.dependencyGraph.set(name, validator.dependencies);
        });
    }

    register(validator: Validator) {
        this.validators.set(validator.name, validator);
    }

    async validateBatch(files: string[]): Promise<ValidationResult[]> {
        const startTime = Date.now();

        // Build validation pipeline respecting dependencies
        const pipeline = this.buildValidationPipeline();

        // Process files in parallel using Bun's worker pool
        const batchSize = Math.ceil(files.length / 8); // Use 8 workers
        const results: ValidationResult[] = [];

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(filePath => this.validateFile(filePath, pipeline))
            );
            results.push(...batchResults);
        }

        console.log(`🔍 Validated ${files.length} files in ${Date.now() - startTime}ms`);
        return results;
    }

    private buildValidationPipeline(): string[] {
        // Topological sort based on dependencies
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const result: string[] = [];

        const visit = (validatorName: string) => {
            if (visiting.has(validatorName)) {
                throw new Error(`Circular dependency detected: ${validatorName}`);
            }
            if (visited.has(validatorName)) return;

            visiting.add(validatorName);

            const dependencies = this.dependencyGraph.get(validatorName) || [];
            dependencies.forEach(dep => visit(dep));

            visiting.delete(validatorName);
            visited.add(validatorName);
            result.push(validatorName);
        };

        // Sort by priority first, then resolve dependencies
        const sortedValidators = Array.from(this.validators.entries())
            .sort(([, a], [, b]) => a.priority - b.priority);

        sortedValidators.forEach(([name]) => visit(name));
        return result;
    }

    private async validateFile(filePath: string, pipeline: string[]): Promise<ValidationResult> {
        const startTime = Date.now();
        const content = await file(filePath).text();

        // Parse file into VaultNode
        const node = await this.parseFileToNode(filePath, content);

        const errors: string[] = [];
        const warnings: string[] = [];

        // Run validators in dependency order
        for (const validatorName of pipeline) {
            const validator = this.validators.get(validatorName);
            if (!validator) continue;

            try {
                const result = await validator.validate(node, this.graph);
                errors.push(...result.errors);
                warnings.push(...result.warnings);
            } catch (error) {
                errors.push(`${validatorName} failed: ${error.message}`);
            }
        }

        // Calculate health score
        const healthScore = this.calculateHealthScore(errors, warnings);

        // Update node metrics
        node.metrics = {
            healthScore,
            lastValidated: new Date().toISOString(),
            validationErrors: errors,
            validationWarnings: warnings
        };

        // Save updated node to graph
        this.graph.addNode(node);

        return {
            filePath,
            errors,
            warnings,
            metrics: {
                healthScore,
                validationTime: Date.now() - startTime
            },
            affectedNodes: this.graph.getAffectedNodes(filePath)
        };
    }

    private async parseFileToNode(filePath: string, content: string): Promise<VaultNode> {
        // Extract YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        const frontmatter = frontmatterMatch ? YAML.parse(frontmatterMatch[1]) : {};

        // Parse markdown with markdown-it
        const md = new MarkdownIt();
        const tokens = md.parse(content, {});

        // Extract headings and links
        const headings: any[] = [];
        const links: any = { outbound: [], inbound: [], external: [] };

        this.extractMarkdownData(tokens, headings, links);

        // Get neighbors from graph
        const neighbors = {
            direct: this.graph.getNeighbors(filePath),
            transitive: [], // Would need more complex graph traversal
            tagPeers: this.findTagPeers(filePath, frontmatter.tags || []),
            typePeers: this.findTypePeers(filePath, frontmatter.type)
        };

        return {
            id: filePath,
            type: frontmatter.type || 'note',
            frontmatter,
            headings,
            links,
            tags: frontmatter.tags || [],
            neighbors,
            dependencies: { requires: [], requiredBy: [] },
            metrics: {
                healthScore: 0,
                lastValidated: '',
                validationErrors: [],
                validationWarnings: []
            }
        };
    }

    private extractMarkdownData(tokens: any[], headings: any[], links: any) {
        tokens.forEach(token => {
            if (token.type === 'heading_open') {
                const nextToken = tokens[tokens.indexOf(token) + 1];
                if (nextToken && nextToken.type === 'inline') {
                    headings.push({
                        level: parseInt(token.tag.slice(1)),
                        text: nextToken.content,
                        id: nextToken.content.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                    });
                }
            }

            if (token.type === 'inline') {
                // Extract wiki links [[Page Name]]
                const wikiLinks = token.content.match(/\[\[([^\]]+)\]\]/g) || [];
                links.outbound.push(...wikiLinks.map(link => link.slice(2, -2)));

                // Extract external URLs
                const urls = token.content.match(/https?:\/\/[^\s\)]+/g) || [];
                links.external.push(...urls);
            }
        });
    }

    private findTagPeers(filePath: string, tags: string[]): string[] {
        const peers: string[] = [];
        tags.forEach(tag => {
            const tagPeers = this.graph.getTagPeers(filePath, tag);
            peers.push(...tagPeers.map(peer => peer.path));
        });
        return [...new Set(peers)];
    }

    private findTypePeers(filePath: string, type: string): string[] {
        const rows = this.graph.db.query('SELECT path FROM nodes WHERE type = ? AND path != ?')
            .all(type, filePath);
        return rows.map((row: any) => row.path);
    }

    private calculateHealthScore(errors: string[], warnings: string[]): number {
        let score = 100;
        score -= errors.length * 10;  // Each error costs 10 points
        score -= warnings.length * 3; // Each warning costs 3 points
        return Math.max(0, score);
    }
}

// Individual Validators
class YAMLValidator implements Validator {
    name = 'yaml';
    priority = 1;
    dependencies = [];
    blocking = ['tag-standardization', 'timestamp-mgmt'];

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields
        const requiredFields = ['type', 'title', 'tags', 'created', 'updated', 'author'];
        requiredFields.forEach(field => {
            if (!node.frontmatter[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // ISO timestamp validation
        ['created', 'updated'].forEach(field => {
            const value = node.frontmatter[field];
            if (value && !this.isValidISODate(value)) {
                errors.push(`Invalid ISO timestamp in ${field}: ${value}`);
            }
        });

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }

    private isValidISODate(dateString: string): boolean {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        return isoRegex.test(dateString) && !isNaN(Date.parse(dateString));
    }
}

class LinkIntegrityValidator implements Validator {
    name = 'link-integrity';
    priority = 2;
    dependencies = ['yaml'];
    blocking = [];

    constructor(private graph: VaultGraph) { }

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        node.links.outbound.forEach(target => {
            const targetNode = graph.getNode(target);
            if (!targetNode) {
                errors.push(`Broken link: [[${target}]]`);
            } else if (!targetNode.links.inbound.includes(node.id)) {
                warnings.push(`Asymmetric link: ${node.id} → ${target}`);
            }
        });

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }
}

class TagStandardizationValidator implements Validator {
    name = 'tag-standardization';
    priority = 3;
    dependencies = ['yaml'];
    blocking = [];

    constructor(private graph: VaultGraph) { }

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        node.tags.forEach(tag => {
            if (!/^[a-z0-9-]+$/.test(tag)) {
                errors.push(`Invalid tag format: ${tag} (must be kebab-case)`);
            }
        });

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }
}

class HeadingHierarchyValidator implements Validator {
    name = 'heading-hierarchy';
    priority = 4;
    dependencies = [];
    blocking = [];

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const h1Count = node.headings.filter(h => h.level === 1).length;
        if (h1Count !== 1) {
            errors.push(`Expected exactly 1 H1 heading, found ${h1Count}`);
        }

        // Check for hierarchy jumps
        for (let i = 1; i < node.headings.length; i++) {
            const current = node.headings[i];
            const previous = node.headings[i - 1];
            if (current.level > previous.level + 1) {
                errors.push(`Heading hierarchy jump: H${previous.level} → H${current.level} in "${current.text}"`);
            }
        }

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }
}

class DashboardFreshnessValidator implements Validator {
    name = 'dashboard-freshness';
    priority = 5;
    dependencies = ['yaml'];
    blocking = [];

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (node.type === 'dashboard') {
            const lastUpdated = new Date(node.frontmatter.updated || 0);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (Date.now() - lastUpdated.getTime() > maxAge) {
                const hoursOld = Math.floor((Date.now() - lastUpdated.getTime()) / 3600000);
                warnings.push(`Dashboard stale: ${hoursOld}h since last update`);
            }
        }

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }
}

class NeighborConvergenceValidator implements Validator {
    name = 'neighbor-convergence';
    priority = 6;
    dependencies = ['link-integrity', 'tag-standardization'];
    blocking = [];

    constructor(private graph: VaultGraph) { }

    async validate(node: VaultNode, graph: VaultGraph): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const highConvergencePeers = node.neighbors.tagPeers.filter(peer => {
            const peerNode = graph.getNode(peer);
            if (!peerNode) return false;

            const sharedTags = node.tags.filter(tag => peerNode.tags.includes(tag));
            return sharedTags.length >= 3;
        });

        if (highConvergencePeers.length > 0 && node.links.outbound.length === 0) {
            warnings.push(
                `High tag convergence (${highConvergencePeers.length} peers) but no outbound links. Consider linking to: ${highConvergencePeers.slice(0, 3).join(', ')}`
            );
        }

        return {
            filePath: node.id,
            errors,
            warnings,
            metrics: { healthScore: 0, validationTime: 0 },
            affectedNodes: []
        };
    }
}
