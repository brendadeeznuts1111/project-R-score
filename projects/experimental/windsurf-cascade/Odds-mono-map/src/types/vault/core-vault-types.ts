// =============================================================================
// VAULT CORE TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Core vault type definitions extracted from monolithic file
// =============================================================================

// =============================================================================
// [DOCUMENT_TYPES] - 2025-11-19
// =============================================================================

export enum VaultDocumentType {
    NOTE = 'note',
    API_DOC = 'api-doc',
    PROJECT_PLAN = 'project-plan',
    MEETING_NOTES = 'meeting-notes',
    RESEARCH_NOTES = 'research-notes',
    DOCUMENTATION = 'documentation',
    SPECIFICATION = 'specification',
    TUTORIAL = 'tutorial',
    TEMPLATE = 'template',
    DAILY_NOTE = 'daily-note',
    WEEKLY_REVIEW = 'weekly-review',
    PROJECT_STATUS = 'project-status'
}

export const typeHeadingMap: Record<VaultDocumentType, string> = {
    [VaultDocumentType.NOTE]: 'Note',
    [VaultDocumentType.API_DOC]: 'API Documentation',
    [VaultDocumentType.PROJECT_PLAN]: 'Project Plan',
    [VaultDocumentType.MEETING_NOTES]: 'Meeting Notes',
    [VaultDocumentType.RESEARCH_NOTES]: 'Research Notes',
    [VaultDocumentType.DOCUMENTATION]: 'Documentation',
    [VaultDocumentType.SPECIFICATION]: 'Specification',
    [VaultDocumentType.TUTORIAL]: 'Tutorial',
    [VaultDocumentType.TEMPLATE]: 'Template',
    [VaultDocumentType.DAILY_NOTE]: 'Daily Note',
    [VaultDocumentType.WEEKLY_REVIEW]: 'Weekly Review',
    [VaultDocumentType.PROJECT_STATUS]: 'Project Status'
} as const;

// =============================================================================
// [CORE_VAULT_TYPES] - 2025-11-19
// =============================================================================

export interface VaultFile {
    path: string;
    name: string;
    extension: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    content: string;
    frontmatter?: Record<string, unknown>;
    tags: string[];
    links: string[];
    backlinks: string[];
}

export interface VaultFolder {
    path: string;
    name: string;
    files: VaultFile[];
    subfolders: VaultFolder[];
    fileCount: number;
    totalSize: number;
}

export interface VaultNode {
    id: string;
    path: string;
    type: 'file' | 'folder';
    metadata: Record<string, unknown>;
    relationships: VaultRelationship[];
    healthScore: number;
    lastValidated: Date;
}

export interface VaultRelationship {
    source: string;
    target: string;
    type: 'link' | 'dependency' | 'tag' | 'reference';
    strength: number;
    metadata?: Record<string, unknown>;
}

export interface VaultGraph {
    nodes: Map<string, VaultNode>;
    edges: Map<string, VaultRelationship>;
    lastUpdated: Date;
    metrics: VaultMetrics;
}

export interface VaultMetrics {
    totalFiles: number;
    totalFolders: number;
    totalLinks: number;
    averageFileAge: number;
    healthScore: number;
    lastAnalyzed: Date;
}

// =============================================================================
// [FILE_SYSTEM_TYPES] - 2025-11-19
// =============================================================================

export interface FileSystemStats {
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    largestFile: string;
    oldestFile: string;
    newestFile: string;
}

export interface FileOperation {
    type: 'create' | 'update' | 'delete' | 'move' | 'rename';
    path: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface FileSystemWatcher {
    active: boolean;
    watchedPaths: string[];
    lastEvent: Date;
    eventsProcessed: number;
}

// =============================================================================
// [VAULT_OPERATIONS_TYPES] - 2025-11-19
// =============================================================================

export interface VaultOperation {
    id: string;
    type: 'scan' | 'validate' | 'organize' | 'cleanup' | 'backup';
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    result?: VaultOperationResult;
}

export interface VaultOperationResult {
    success: boolean;
    filesProcessed: number;
    errors: string[];
    warnings: string[];
    metrics: Record<string, number>;
}

export interface VaultSearchOptions {
    query: string;
    path?: string;
    tags?: string[];
    fileType?: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
    includeContent?: boolean;
}

export interface VaultSearchResult {
    file: VaultFile;
    score: number;
    matches: {
        path: boolean;
        content: boolean;
        tags: boolean;
        frontmatter: boolean;
    };
}

// =============================================================================
// [EXPORTS] - 2025-11-19
// =============================================================================
// Note: These will be imported after the files are created
// export * from '../config/vault-config-types';
// export * from '../validation/vault-validation-types';
