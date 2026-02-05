/**
 * Enhanced Obsidian Node Types for Vault Standards
 * Graph-aware data structures with Bun integration
 */

export interface ObsidianNode {
    path: string;
    type: 'note' | 'canvas' | 'dashboard' | 'template' | 'moc';

    // Obsidian-specific links
    links: {
        wiki: string[];        // [[Page]] or [[Page|Alias]]
        block: string[];       // [[Page#^block-id]]
        heading: string[];     // [[Page#Heading]]
        embed: string[];       // ![[Image.png]]
        unresolved: string[];  // Broken links
    };

    // Metadata Cache Integration
    properties: Record<string, any>; // From frontmatter + Dataview
    tags: string[];                  // Inherits from properties.tags + inline #tags
    aliases: string[];               // From YAML aliases: []

    // Neighbor Taxonomy
    neighbors: {
        direct: ObsidianNode[];        // Direct wiki-links
        backlink: ObsidianNode[];      // Links TO this node
        tagPeers: ObsidianNode[];      // Share >=1 tag
        aliasPeers: ObsidianNode[];    // Share aliases
        canvasPeers: ObsidianNode[];   // Co-exist in same canvas
    };

    // Dependency Graph
    dependencies: {
        requires: string[];            // Links marked as required
        requiredBy: string[];          // Nodes that depend on this
        template: string | null;       // Applied template
    };

    // Health Metrics
    health: {
        score: number;
        issues: string[];
        warnings: string[];
        lastValidated: string;
    };

    // Position Data (for canvas files)
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    // Content Analysis
    content?: {
        wordCount: number;
        headingCount: number;
        linkCount: number;
        tagCount: number;
    };
}

export interface ValidationResult {
    node: ObsidianNode;
    errors: Array<{
        type: string;
        message: string;
        line?: number;
        severity: 'error' | 'warning' | 'info';
    }>;
    suggestions: string[];
    healthScore: number;
}

export interface GraphMetrics {
    totalNodes: number;
    totalEdges: number;
    orphanCount: number;
    orphanRate: number;
    averageDegree: number;
    clusteringCoefficient: number;
    modularity: number;
    largestComponent: number;
}

export interface ValidationRule {
    name: string;
    priority: number;
    dependencies: string[];
    blocking: string[];
    validate(node: ObsidianNode, graph: VaultGraph): Promise<ValidationResult>;
}

export interface VaultGraph {
    nodes: Map<string, ObsidianNode>;
    edges: Map<string, Array<{ target: string; type: string; weight: number }>>;
    metadata: {
        lastUpdated: string;
        version: string;
        totalValidations: number;
    };

    getNode(path: string): ObsidianNode | null;
    addNode(node: ObsidianNode): void;
    removeNode(path: string): void;
    getNeighbors(path: string, depth?: number): ObsidianNode[];
    getShortestPath(from: string, to: string): string[] | null;
    calculateMetrics(): GraphMetrics;
}

export interface BridgeMessage {
    command: 'notice' | 'reload' | 'update-cache' | 'highlight' | 'navigate' | 'validate';
    args: any;
    timestamp: string;
}

export interface NoticeArgs {
    severity: 'info' | 'warning' | 'error';
    message: string;
    timeout?: number;
    actions?: Array<{
        label: string;
        action: string;
    }>;
}

export interface HighlightArgs {
    filePath: string;
    lineNumbers?: number[];
    ranges?: Array<{ start: number; end: number }>;
    className?: string;
}

export interface NavigateArgs {
    filePath: string;
    line?: number;
    scroll?: boolean;
    highlight?: boolean;
}

// Canvas-specific types
export interface CanvasNode {
    id: string;
    type: 'text' | 'file' | 'image' | 'group';
    file?: string;
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

export interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toSide: 'top' | 'right' | 'bottom' | 'left';
    color?: string;
    label?: string;
}

export interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

// Dataview integration types
export interface DataviewQuery {
    type: 'table' | 'list' | 'task' | 'inline';
    query: string;
    fields?: string[];
    headers?: string[];
}

export interface DataviewResult {
    type: 'table' | 'list' | 'task' | 'inline';
    data: any[][];
    headers?: string[];
    effective: boolean;
}

// Plugin settings types
export interface VaultStandardsSettings {
    vaultPath: string;
    bunExecutable: string;
    autoValidate: boolean;
    showHealthIndicator: boolean;
    validationInterval: number;
    strictMode: boolean;
    enableBridge: boolean;
    bridgePort: number;

    // Enhanced settings
    enableDataviewIntegration: boolean;
    enableCanvasValidation: boolean;
    enableTransitiveLinking: boolean;
    enableAliasConvergence: boolean;
    maxNeighborDepth: number;
    healthThresholds: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };

    // Performance settings
    maxConcurrentValidations: number;
    enableCaching: boolean;
    cacheTTL: number;
    enableMobileOptimizations: boolean;

    // Visual settings
    highlightIssues: boolean;
    showGraphOverlay: boolean;
    enableLivePreview: boolean;
}

// Validation worker types
export interface ValidationWorkerMessage {
    type: 'validate' | 'result' | 'error';
    payload: {
        filePath?: string;
        content?: string;
        cache?: any;
        result?: ValidationResult;
        error?: string;
    };
}

// Health dashboard types
export interface HealthMetrics {
    overall: {
        score: number;
        grade: 'A' | 'B' | 'C' | 'D' | 'F';
        trend: 'improving' | 'stable' | 'declining';
    };
    categories: {
        yaml: { score: number; issues: number };
        links: { score: number; issues: number };
        tags: { score: number; issues: number };
        structure: { score: number; issues: number };
        freshness: { score: number; issues: number };
    };
    recommendations: string[];
    lastUpdated: string;
}

// Sync configuration types
export interface SyncConfig {
    keepInGit: string[];
    keepInObsidianSync: string[];
    ignore: string[];
    preSyncHooks: string[];
    postSyncHooks: string[];
}

// Export all types for external use
export type {
    ObsidianNode as Node,
    ValidationResult as Result,
    GraphMetrics as Metrics,
    ValidationRule as Rule,
    VaultGraph as Graph,
    BridgeMessage as Message,
    NoticeArgs as Notice,
    HighlightArgs as Highlight,
    NavigateArgs as Navigate,
    CanvasNode as CanvasFileNode,
    CanvasEdge as CanvasLink,
    CanvasData as Canvas,
    DataviewQuery as Query,
    DataviewResult as QueryResult,
    VaultStandardsSettings as Settings,
    ValidationWorkerMessage as WorkerMessage,
    HealthMetrics as Health,
    SyncConfig as Sync
};
