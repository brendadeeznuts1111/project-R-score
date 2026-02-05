import { validateCanvasColor, createColorMetadata, getTerminalColor, CanvasColorValidation } from '../types/canvas-color';
import { ValidationResult, ValidationIssue } from '../types/canvas-color';

/**
 * Enhanced canvas node validator with Bun.color integration
 */
export class EnhancedCanvasNodeValidator {
    private readonly vaultRoot: string;

    constructor(vaultRoot: string) {
        this.vaultRoot = vaultRoot;
    }

    /**
     * Full validation including Bun.color checks
     */
    async validateNode(node: any): Promise<ValidationResult> {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        // 1️⃣ Validate core properties (id, x, y, etc.)
        const coreValidation = this.validateCoreProperties(node);
        issues.push(...coreValidation.issues);
        warnings.push(...coreValidation.warnings);

        // 2️⃣ Bun.color validation for color property
        if (node.color !== undefined) {
            const colorValidation = validateCanvasColor(node.color, node.id);

            if (colorValidation.normalizedColor) {
                // Auto-normalize the color
                node.color = colorValidation.normalizedColor;

                // Create enhanced metadata
                node.metadata = node.metadata || {};
                node.metadata.color = createColorMetadata(
                    colorValidation.normalizedColor,
                    node.id
                );
            }

            issues.push(...colorValidation.issues);
            warnings.push(...colorValidation.warnings);
        }

        // 3️⃣ Validate metadata with enhanced color info
        if (node.metadata?.color) {
            const metaColorValidation = validateCanvasColor(
                node.metadata.color.input,
                node.id
            );

            if (metaColorValidation.normalizedColor) {
                node.metadata.color.normalized = metaColorValidation.normalizedColor;
            }

            issues.push(...metaColorValidation.issues);
            warnings.push(...metaColorValidation.warnings);
        }

        // 4️⃣ Validate terminal color output
        const terminalColor = getTerminalColor(node, "ansi");
        if (!terminalColor && node.color) {
            warnings.push({
                severity: 'info',
                category: 'terminal',
                message: `Terminal may not support color for ${node.color}`,
                suggestion: 'Use ansi-16 format for broader compatibility',
                metadata: { nodeId: node.id, color: node.color }
            });
        }

        // 5️⃣ Validate text content
        const textValidation = this.validateTextContent(node);
        issues.push(...textValidation.issues);
        warnings.push(...textValidation.warnings);

        // 6️⃣ Validate metadata structure
        const metadataValidation = this.validateMetadata(node);
        issues.push(...metadataValidation.issues);
        warnings.push(...metadataValidation.warnings);

        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            warnings
        };
    }

    /**
     * Validates core node properties
     */
    private validateCoreProperties(node: any): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        // Validate ID
        if (!node.id || typeof node.id !== 'string') {
            issues.push({
                severity: 'error',
                category: 'structure',
                message: 'Node ID is required and must be a string',
                suggestion: 'Add a unique identifier like "service:bridge:production"',
                metadata: { nodeId: node.id }
            });
        }

        // Validate position
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
            issues.push({
                severity: 'error',
                category: 'structure',
                message: 'Node position (x, y) must be numbers',
                suggestion: 'Add x and y coordinates for canvas positioning',
                metadata: { nodeId: node.id, x: node.x, y: node.y }
            });
        }

        // Validate dimensions
        if (typeof node.width !== 'number' || typeof node.height !== 'number') {
            warnings.push({
                severity: 'warning',
                category: 'layout',
                message: 'Node dimensions (width, height) should be numbers',
                suggestion: 'Add width and height for better canvas layout',
                metadata: { nodeId: node.id, width: node.width, height: node.height }
            });
        }

        // Validate type
        if (node.type && typeof node.type !== 'string') {
            issues.push({
                severity: 'error',
                category: 'structure',
                message: 'Node type must be a string',
                suggestion: 'Use valid node types like "text", "group", "component"',
                metadata: { nodeId: node.id, type: node.type }
            });
        }

        return { valid: issues.length === 0, issues, warnings };
    }

    /**
     * Validates text content
     */
    private validateTextContent(node: any): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        if (!node.text || typeof node.text !== 'string') {
            issues.push({
                severity: 'error',
                category: 'content',
                message: 'Node text is required and must be a string',
                suggestion: 'Add descriptive text content for the node',
                metadata: { nodeId: node.id }
            });
            return { valid: false, issues, warnings };
        }

        // Check text length
        if (node.text.length < 10) {
            warnings.push({
                severity: 'warning',
                category: 'content',
                message: 'Node text is very short',
                suggestion: 'Add more descriptive content (minimum 10 characters)',
                metadata: { nodeId: node.id, length: node.text.length }
            });
        }

        if (node.text.length > 1000) {
            warnings.push({
                severity: 'info',
                category: 'content',
                message: 'Node text is quite long',
                suggestion: 'Consider splitting long content into multiple nodes',
                metadata: { nodeId: node.id, length: node.text.length }
            });
        }

        // Check for markdown structure
        const hasMarkdown = /^#|^##|^###|^\*\*|^\*|^```/.test(node.text);
        if (!hasMarkdown && node.text.length > 50) {
            warnings.push({
                severity: 'info',
                category: 'formatting',
                message: 'Consider using markdown formatting for better readability',
                suggestion: 'Add headers, bold text, or lists using markdown syntax',
                metadata: { nodeId: node.id }
            });
        }

        return { valid: issues.length === 0, issues, warnings };
    }

    /**
     * Validates metadata structure
     */
    private validateMetadata(node: any): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        if (!node.metadata) {
            warnings.push({
                severity: 'info',
                category: 'metadata',
                message: 'Node has no metadata',
                suggestion: 'Add metadata for better organization and tracking',
                metadata: { nodeId: node.id }
            });
            return { valid: true, issues, warnings };
        }

        // Validate document type
        if (node.metadata.documentType && typeof node.metadata.documentType !== 'string') {
            warnings.push({
                severity: 'warning',
                category: 'metadata',
                message: 'Document type should be a string',
                suggestion: 'Use standard document types like "api-doc", "component", "service"',
                metadata: { nodeId: node.id, documentType: node.metadata.documentType }
            });
        }

        // Validate status
        if (node.metadata.status && typeof node.metadata.status !== 'string') {
            warnings.push({
                severity: 'warning',
                category: 'metadata',
                message: 'Status should be a string',
                suggestion: 'Use standard statuses like "active", "beta", "deprecated"',
                metadata: { nodeId: node.id, status: node.metadata.status }
            });
        }

        // Validate priority
        if (node.metadata.priority && !['low', 'medium', 'high'].includes(node.metadata.priority)) {
            warnings.push({
                severity: 'warning',
                category: 'metadata',
                message: 'Priority should be one of: low, medium, high',
                suggestion: 'Use standard priority levels',
                metadata: { nodeId: node.id, priority: node.metadata.priority }
            });
        }

        // Validate version format
        if (node.metadata.version && typeof node.metadata.version !== 'string') {
            warnings.push({
                severity: 'warning',
                category: 'metadata',
                message: 'Version should be a string',
                suggestion: 'Use semantic versioning like "1.2.3"',
                metadata: { nodeId: node.id, version: node.metadata.version }
            });
        }

        return { valid: issues.length === 0, issues, warnings };
    }

    /**
     * Validates a complete canvas with all nodes and edges
     */
    async validateCanvas(canvas: any): Promise<ValidationResult> {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        // Validate canvas structure
        if (!canvas.nodes || !Array.isArray(canvas.nodes)) {
            issues.push({
                severity: 'error',
                category: 'structure',
                message: 'Canvas must have a nodes array',
                suggestion: 'Add a nodes array to the canvas structure'
            });
            return { valid: false, issues, warnings };
        }

        // Validate each node
        for (const node of canvas.nodes) {
            const nodeValidation = await this.validateNode(node);
            issues.push(...nodeValidation.issues);
            warnings.push(...nodeValidation.warnings);
        }

        // Validate edges if they exist
        if (canvas.edges && Array.isArray(canvas.edges)) {
            const edgeValidation = this.validateEdges(canvas.edges, canvas.nodes);
            issues.push(...edgeValidation.issues);
            warnings.push(...edgeValidation.warnings);
        }

        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            warnings
        };
    }

    /**
     * Validates canvas edges
     */
    private validateEdges(edges: any[], nodes: any[]): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        const nodeIds = new Set(nodes.map(n => n.id));

        for (const edge of edges) {
            // Check required properties
            if (!edge.fromNode || !edge.toNode) {
                issues.push({
                    severity: 'error',
                    category: 'structure',
                    message: 'Edge must have fromNode and toNode properties',
                    metadata: { edge }
                });
                continue;
            }

            // Check if nodes exist
            if (!nodeIds.has(edge.fromNode)) {
                issues.push({
                    severity: 'error',
                    category: 'reference',
                    message: `Edge references non-existent node: ${edge.fromNode}`,
                    metadata: { edge, fromNode: edge.fromNode }
                });
            }

            if (!nodeIds.has(edge.toNode)) {
                issues.push({
                    severity: 'error',
                    category: 'reference',
                    message: `Edge references non-existent node: ${edge.toNode}`,
                    metadata: { edge, toNode: edge.toNode }
                });
            }

            // Check label
            if (!edge.label || typeof edge.label !== 'string') {
                warnings.push({
                    severity: 'warning',
                    category: 'content',
                    message: 'Edge should have a descriptive label',
                    metadata: { edge }
                });
            }
        }

        return { valid: issues.length === 0, issues, warnings };
    }
}
