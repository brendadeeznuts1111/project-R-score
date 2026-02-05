// =============================================================================
// CANVAS VAULT INTEGRATION - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-18T18:06:00Z
// DESCRIPTION: Canvas nodes with metadata integration to vault types
// =============================================================================

// ✅ Connect canvas to tick-processor-types.ts
import {
    VaultDocumentType,
    VaultFile,
    Priority,
    DocumentStatus
} from '../types/tick-processor-types.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Re-export for convenience
export { VaultDocumentType, VaultFile, Priority, DocumentStatus };

// =============================================================================
// [CANVAS_NODE_TYPES] - 2025-11-18
// =============================================================================

export interface CanvasNodeWithMetadata {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'text' | 'file';
    text: string;
    color?: string;
    metadata: {
        documentType: VaultDocumentType;
        relatedFile?: VaultFile;
        tags: string[];
        priority: 'low' | 'medium' | 'high';
        status: 'active' | 'beta' | 'deprecated';
        lastValidated: Date;
        created: Date;
        modified: Date;
        version: string;
        healthScore: number;
    };
}

export interface CanvasEdgeWithMetadata {
    id: string;
    fromNode: string;
    fromSide: 'left' | 'right' | 'top' | 'bottom';
    toNode: string;
    toSide: 'left' | 'right' | 'top' | 'bottom';
    color?: string;
    label?: string;
    metadata: {
        relationshipType: 'dependency' | 'reference' | 'hierarchy' | 'dataflow';
        strength: number; // 0-1
        bidirectional: boolean;
        created: Date;
        lastValidated: Date;
    };
}

export interface CanvasWithMetadata {
    nodes: CanvasNodeWithMetadata[];
    edges: CanvasEdgeWithMetadata[];
    metadata: {
        name: string;
        description: string;
        version: string;
        created: Date;
        modified: Date;
        author: string;
        category: 'system-design' | 'architecture' | 'workflow' | 'documentation';
        healthScore: number;
        totalNodes: number;
        totalEdges: number;
        complexity: number;
    };
}

// =============================================================================
// [COLOR_MAPPING] - 2025-11-18
// =============================================================================

export const documentTypeColorMap: Record<VaultDocumentType, string> = {
    [VaultDocumentType.NOTE]: '1', // Blue
    [VaultDocumentType.API_DOC]: '2', // Green
    [VaultDocumentType.PROJECT_PLAN]: '3', // Yellow
    [VaultDocumentType.MEETING_NOTES]: '4', // Orange
    [VaultDocumentType.RESEARCH_NOTES]: '5', // Red
    [VaultDocumentType.DOCUMENTATION]: '6', // Purple
    [VaultDocumentType.SPECIFICATION]: '7', // Pink
    [VaultDocumentType.TUTORIAL]: '8', // Teal
    [VaultDocumentType.TEMPLATE]: '9', // Gray
    [VaultDocumentType.DAILY_NOTE]: '10', // Brown
    [VaultDocumentType.WEEKLY_REVIEW]: '11', // Navy
    [VaultDocumentType.PROJECT_STATUS]: '12' // Olive
};

export const priorityColorMap: Record<string, string> = {
    'low': '1', // Blue
    'medium': '3', // Yellow
    'high': '5' // Red
};

export const statusColorMap: Record<string, string> = {
    'active': '2', // Green
    'beta': '3', // Yellow
    'deprecated': '5' // Red
};

// =============================================================================
// [UTILITY_FUNCTIONS] - 2025-11-18
// =============================================================================

export function getColorForDocumentType(documentType: VaultDocumentType): string {
    return documentTypeColorMap[documentType] || '1';
}

export function getColorForPriority(priority: string): string {
    return priorityColorMap[priority] || '3';
}

export function getColorForStatus(status: string): string {
    return statusColorMap[status] || '1';
}

export function calculateComplexity(nodes: CanvasNodeWithMetadata[], edges: CanvasEdgeWithMetadata[]): number {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const connectivityRatio = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Complexity factors: node count, edge density, metadata richness
    const nodeComplexity = Math.min(nodeCount * 5, 50); // Max 50 points for nodes
    const edgeComplexity = Math.min(connectivityRatio * 30, 30); // Max 30 points for edges
    const metadataComplexity = nodes.reduce((acc, node) => {
        const metadataScore = node.metadata.tags.length * 2 +
            (node.metadata.relatedFile ? 10 : 0) +
            (node.metadata.healthScore > 80 ? 5 : 0);
        return acc + metadataScore;
    }, 0) / nodes.length; // Average metadata complexity

    return Math.round(nodeComplexity + edgeComplexity + metadataComplexity);
}

export function calculateHealthScore(nodes: CanvasNodeWithMetadata[]): number {
    if (nodes.length === 0) return 50; // Empty canvas gets 50%

    const totalHealth = nodes.reduce((acc, node) => {
        let nodeHealth = 50; // Base health

        // Metadata completeness
        if (node.metadata.documentType) nodeHealth += 10;
        if (node.metadata.tags.length > 0) nodeHealth += 10;
        if (node.metadata.relatedFile) nodeHealth += 15;
        if (node.metadata.lastValidated) nodeHealth += 10;

        // Content quality
        if (node.text && node.text.length > 50) nodeHealth += 5;
        if (node.type === 'file' && node.metadata.relatedFile) nodeHealth += 10;

        return Math.min(acc + nodeHealth, 100);
    }, 0);

    return Math.round(totalHealth / nodes.length);
}

// =============================================================================
// [NODE_GENERATION] - 2025-11-18
// =============================================================================

// Auto-generate from vault file
export function createNodeFromVaultFile(file: VaultFile): CanvasNodeWithMetadata {
    const now = new Date();

    return {
        id: `file:${file.path.replace(/\//g, ':').replace('.md', '')}`,
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        type: 'text',
        text: `# 📄 ${file.name}\n---\n${file.content.substring(0, 150)}...`,
        color: getColorForDocumentType(file.frontmatter?.type as VaultDocumentType),
        metadata: {
            documentType: file.frontmatter?.type as VaultDocumentType || VaultDocumentType.NOTE,
            relatedFile: file,
            tags: file.tags,
            priority: (file.frontmatter?.priority as string) || 'medium',
            status: (file.frontmatter?.status as string) || 'active',
            lastValidated: file.frontmatter?.validatedAt as Date || now,
            created: file.createdAt,
            modified: file.modifiedAt,
            version: file.frontmatter?.version as string || '1.0.0',
            healthScore: 85 // Default health score
        }
    };
}

export function createNodeFromMetadata(
    id: string,
    title: string,
    content: string,
    documentType: VaultDocumentType,
    options: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        tags?: string[];
        priority?: 'low' | 'medium' | 'high';
        status?: 'active' | 'beta' | 'deprecated';
        relatedFile?: VaultFile;
    } = {}
): CanvasNodeWithMetadata {
    const now = new Date();

    return {
        id,
        x: options.x || 100,
        y: options.y || 100,
        width: options.width || 400,
        height: options.height || 200,
        type: 'text',
        text: `# ${title}\n\n${content}`,
        color: getColorForDocumentType(documentType),
        metadata: {
            documentType,
            relatedFile: options.relatedFile,
            tags: options.tags || [],
            priority: options.priority || 'medium',
            status: options.status || 'active',
            lastValidated: now,
            created: now,
            modified: now,
            version: '1.0.0',
            healthScore: 90
        }
    };
}

// =============================================================================
// [EDGE_GENERATION] - 2025-11-18
// =============================================================================

export function createEdgeFromNodes(
    fromNodeId: string,
    toNodeId: string,
    relationshipType: 'dependency' | 'reference' | 'hierarchy' | 'dataflow',
    options: {
        label?: string;
        strength?: number;
        bidirectional?: boolean;
        fromSide?: 'left' | 'right' | 'top' | 'bottom';
        toSide?: 'left' | 'right' | 'top' | 'bottom';
    } = {}
): CanvasEdgeWithMetadata {
    const now = new Date();

    return {
        id: `edge:${fromNodeId}->${toNodeId}`,
        fromNode: fromNodeId,
        fromSide: options.fromSide || 'right',
        toNode: toNodeId,
        toSide: options.toSide || 'left',
        color: getColorForPriority(options.strength && options.strength > 0.7 ? 'high' : options.strength && options.strength > 0.3 ? 'medium' : 'low'),
        label: options.label || relationshipType,
        metadata: {
            relationshipType,
            strength: options.strength || 0.5,
            bidirectional: options.bidirectional || false,
            created: now,
            lastValidated: now
        }
    };
}

// =============================================================================
// [CANVAS_GENERATION] - 2025-11-18
// =============================================================================

export function createCanvasFromVaultFiles(
    files: VaultFile[],
    canvasName: string,
    options: {
        description?: string;
        author?: string;
        category?: 'system-design' | 'architecture' | 'workflow' | 'documentation';
        autoLayout?: boolean;
    } = {}
): CanvasWithMetadata {
    const now = new Date();

    // Create nodes from files
    const nodes: CanvasNodeWithMetadata[] = files.map((file, index) => {
        const node = createNodeFromVaultFile(file);

        // Auto-layout: arrange in a grid
        if (options.autoLayout) {
            const cols = Math.ceil(Math.sqrt(files.length));
            node.x = (index % cols) * 500 + 100;
            node.y = Math.floor(index / cols) * 250 + 100;
        }

        return node;
    });

    // Create edges based on file relationships
    const edges: CanvasEdgeWithMetadata[] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const node1 = nodes[i];
            const node2 = nodes[j];

            // Create edge if files reference each other
            if (node1.metadata.relatedFile?.links.includes(node2.metadata.relatedFile?.path || '') ||
                node2.metadata.relatedFile?.links.includes(node1.metadata.relatedFile?.path || '')) {

                edges.push(createEdgeFromNodes(
                    node1.id,
                    node2.id,
                    'reference',
                    {
                        label: 'References',
                        strength: 0.7,
                        bidirectional: node1.metadata.relatedFile?.links.includes(node2.metadata.relatedFile?.path || '') &&
                            node2.metadata.relatedFile?.links.includes(node1.metadata.relatedFile?.path || '')
                    }
                ));
            }

            // Create edge if files share tags
            const sharedTags = node1.metadata.tags.filter(tag => node2.metadata.tags.includes(tag));
            if (sharedTags.length > 0) {
                edges.push(createEdgeFromNodes(
                    node1.id,
                    node2.id,
                    'dependency',
                    {
                        label: `Shared: ${sharedTags.join(', ')}`,
                        strength: 0.5
                    }
                ));
            }
        }
    }

    const complexity = calculateComplexity(nodes, edges);
    const healthScore = calculateHealthScore(nodes);

    return {
        nodes,
        edges,
        metadata: {
            name: canvasName,
            description: options.description || `Canvas generated from ${files.length} vault files`,
            version: '1.0.0',
            created: now,
            modified: now,
            author: options.author || 'System',
            category: options.category || 'documentation',
            healthScore,
            totalNodes: nodes.length,
            totalEdges: edges.length,
            complexity
        }
    };
}

// =============================================================================
// [CANVAS_OPERATIONS] - 2025-11-18
// =============================================================================

export class CanvasVaultIntegration {
    private vaultPath: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
    }

    /**
     * Generate a canvas from a specific folder in the vault
     */
    generateCanvasFromFolder(
        folderPath: string,
        canvasName: string,
        options: {
            includeSubfolders?: boolean;
            filePattern?: RegExp;
            autoLayout?: boolean;
        } = {}
    ): CanvasWithMetadata {
        // This would integrate with your vault file system
        // For now, return a sample implementation
        const files: VaultFile[] = []; // Would be populated from actual vault scan

        return createCanvasFromVaultFiles(files, canvasName, {
            ...options,
            category: 'documentation'
        });
    }

    /**
     * Save canvas to file
     */
    saveCanvasToFile(canvas: CanvasWithMetadata, filePath: string): void {
        const canvasData = {
            nodes: canvas.nodes.map(node => ({
                id: node.id,
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
                type: node.type,
                text: node.text,
                color: node.color
            })),
            edges: canvas.edges.map(edge => ({
                id: edge.id,
                fromNode: edge.fromNode,
                fromSide: edge.fromSide,
                toNode: edge.toNode,
                toSide: edge.toSide,
                color: edge.color,
                label: edge.label
            })),
            metadata: canvas.metadata
        };

        const fullPath = join(this.vaultPath, filePath);
        writeFileSync(fullPath, JSON.stringify(canvasData, null, 2), 'utf-8');
    }

    /**
     * Load canvas from file and enhance with metadata
     */
    loadCanvasWithMetadata(filePath: string): CanvasWithMetadata {
        const fullPath = join(this.vaultPath, filePath);
        const content = readFileSync(fullPath, 'utf-8');
        const canvasData = JSON.parse(content);

        // Enhance with metadata (would integrate with actual vault files)
        const nodes: CanvasNodeWithMetadata[] = canvasData.nodes.map((node: any) => ({
            ...node,
            metadata: {
                documentType: VaultDocumentType.NOTE,
                relatedFile: undefined,
                tags: [],
                priority: 'medium',
                status: 'active',
                lastValidated: new Date(),
                created: new Date(),
                modified: new Date(),
                version: '1.0.0',
                healthScore: 85
            }
        }));

        const edges: CanvasEdgeWithMetadata[] = canvasData.edges.map((edge: any) => ({
            ...edge,
            metadata: {
                relationshipType: 'reference',
                strength: 0.5,
                bidirectional: false,
                created: new Date(),
                lastValidated: new Date()
            }
        }));

        return {
            nodes,
            edges,
            metadata: canvasData.metadata || {
                name: 'Untitled Canvas',
                description: 'Canvas loaded from file',
                version: '1.0.0',
                created: new Date(),
                modified: new Date(),
                author: 'System',
                category: 'documentation',
                healthScore: calculateHealthScore(nodes),
                totalNodes: nodes.length,
                totalEdges: edges.length,
                complexity: calculateComplexity(nodes, edges)
            }
        };
    }

    /**
     * Update canvas metadata based on current vault state
     */
    updateCanvasMetadata(canvas: CanvasWithMetadata): CanvasWithMetadata {
        const now = new Date();

        // Update node metadata
        const updatedNodes = canvas.nodes.map(node => ({
            ...node,
            metadata: {
                ...node.metadata,
                lastValidated: now,
                healthScore: this.calculateNodeHealth(node)
            }
        }));

        // Update edge metadata
        const updatedEdges = canvas.edges.map(edge => ({
            ...edge,
            metadata: {
                ...edge.metadata,
                lastValidated: now
            }
        }));

        // Update canvas metadata
        const updatedMetadata = {
            ...canvas.metadata,
            modified: now,
            healthScore: calculateHealthScore(updatedNodes),
            totalNodes: updatedNodes.length,
            totalEdges: updatedEdges.length,
            complexity: calculateComplexity(updatedNodes, updatedEdges)
        };

        return {
            nodes: updatedNodes,
            edges: updatedEdges,
            metadata: updatedMetadata
        };
    }

    private calculateNodeHealth(node: CanvasNodeWithMetadata): number {
        let health = 50;

        if (node.metadata.documentType) health += 10;
        if (node.metadata.tags.length > 0) health += 10;
        if (node.metadata.relatedFile) health += 15;
        if (node.text && node.text.length > 50) health += 5;
        if (node.type === 'file' && node.metadata.relatedFile) health += 10;

        return Math.min(health, 100);
    }
}

// =============================================================================
// [EXPORTS] - 2025-11-18
// =============================================================================

export default CanvasVaultIntegration;

// =============================================================================
// [USAGE_EXAMPLES] - 2025-11-18
// =============================================================================

/*
// Example usage:

// 1. Create integration instance
const integration = new CanvasVaultIntegration('/path/to/vault');

// 2. Generate canvas from vault files
const files: VaultFile[] = [
    // ... your vault files
];

const canvas = createCanvasFromVaultFiles(files, 'System Architecture', {
    description: 'Complete system architecture overview',
    author: 'Architecture Team',
    category: 'system-design',
    autoLayout: true
});

// 3. Save canvas to file
integration.saveCanvasToFile(canvas, 'architecture/system-overview.canvas');

// 4. Load and enhance existing canvas
const loadedCanvas = integration.loadCanvasWithMetadata('architecture/system-overview.canvas');

// 5. Update metadata
const updatedCanvas = integration.updateCanvasMetadata(loadedCanvas);

// 6. Create custom nodes
const customNode = createNodeFromMetadata(
    'custom:api-gateway',
    'API Gateway',
    'Central API gateway for all services',
    VaultDocumentType.API_DOC,
    {
        x: 500,
        y: 300,
        tags: ['api', 'gateway', 'microservices'],
        priority: 'high',
        status: 'active'
    }
);

// 7. Create relationships
const edge = createEdgeFromNodes(
    'file:services:user-service',
    'custom:api-gateway',
    'dependency',
    {
        label: 'API Calls',
        strength: 0.8,
        bidirectional: false
    }
);
*/
