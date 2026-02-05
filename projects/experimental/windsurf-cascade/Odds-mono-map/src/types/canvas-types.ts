// =============================================================================
// CANVAS TYPES - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 2.0.0
// LAST_UPDATED: 2025-11-18T19:50:00Z
// DESCRIPTION: Enhanced canvas types with HEX color support
// =============================================================================

// =============================================================================
// [EXTENDED_COLOR_TYPE_SYSTEM] - 2025-11-18
// =============================================================================

/**
 * Extended color system supporting both legacy enum and modern HEX
 * Maintains backward compatibility while enabling full color palette
 */
export type CanvasColor =
    // Legacy Obsidian enum values (backward compatibility)
    | "0"  // Gray (default)
    | "1"  // Blue (active services)
    | "2"  // Red (deprecated)
    | "3"  // Yellow (development)
    | "4"  // Green (core/production)
    | "5"  // Purple (experimental)

    // NEW: HEX color values
    | `#${string}`;  // Any valid HEX color (#RRGGBB)

// HEX color validation regex
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Utility type guard
export function isHexColor(color: string): color is `#${string}` {
    return HEX_COLOR_REGEX.test(color);
}

// Utility type guard for legacy colors
export function isLegacyColor(color: string): color is "0" | "1" | "2" | "3" | "4" | "5" {
    return /^[0-5]$/.test(color);
}

// Semantic color mapping for legacy values
export const LEGACY_COLOR_MAP: Record<"0" | "1" | "2" | "3" | "4" | "5", string> = {
    "0": "#808080", // Gray
    "1": "#3B82F6", // Blue (Tailwind blue-500)
    "2": "#EF4444", // Red (Tailwind red-500)
    "3": "#EAB308", // Yellow (Tailwind yellow-500)
    "4": "#10B981", // Green (Tailwind green-500)
    "5": "#8B5CF6"  // Purple (Tailwind purple-500)
};

// Brand color palette for Odds Protocol
export const ODDS_PROTOCOL_COLORS = {
    // Primary brand colors
    brand: {
        primary: "#0F172A",    // Deep blue (slate-900)
        secondary: "#1E40AF",  // Medium blue (blue-800)
        accent: "#F59E0B",     // Amber (amber-500)
    },

    // Service status colors
    status: {
        active: "#10B981",     // Green
        beta: "#EAB308",       // Yellow
        deprecated: "#EF4444", // Red
        experimental: "#8B5CF6" // Purple
    },

    // Domain-specific colors
    domain: {
        integration: "#6366F1",  // Indigo (integrations)
        service: "#14B8A6",      // Teal (services)
        core: "#059669",         // Emerald (core systems)
        ui: "#F97316",           // Orange (UI components)
        pipeline: "#06B6D4",     // Cyan (data pipelines)
        monitor: "#A855F7"       // Violet (monitoring)
    },

    // Priority-based colors
    priority: {
        low: "#6B7280",      // Gray-500
        medium: "#F59E0B",   // Amber-500
        high: "#EF4444",     // Red-500
        critical: "#DC2626"  // Red-600
    }
} as const;

// Helper to convert any color to HEX
export function toHexColor(color: CanvasColor): string {
    if (isHexColor(color)) return color;
    return LEGACY_COLOR_MAP[color as "0" | "1" | "2" | "3" | "4" | "5"];
}

// Helper to get semantic color for node
export function getSemanticColor(
    node: {
        id: string;
        metadata?: {
            status?: 'active' | 'beta' | 'deprecated' | 'experimental';
            priority?: 'low' | 'medium' | 'high' | 'critical';
        }
    }
): string {
    const metadata = node.metadata;

    // Status-based color (highest priority)
    if (metadata?.status === 'deprecated') return ODDS_PROTOCOL_COLORS.status.deprecated;
    if (metadata?.status === 'experimental') return ODDS_PROTOCOL_COLORS.status.experimental;
    if (metadata?.status === 'beta') return ODDS_PROTOCOL_COLORS.status.beta;
    if (metadata?.status === 'active') return ODDS_PROTOCOL_COLORS.status.active;

    // Priority-based color
    if (metadata?.priority === 'critical') return ODDS_PROTOCOL_COLORS.priority.critical;
    if (metadata?.priority === 'high') return ODDS_PROTOCOL_COLORS.priority.high;
    if (metadata?.priority === 'medium') return ODDS_PROTOCOL_COLORS.priority.medium;
    if (metadata?.priority === 'low') return ODDS_PROTOCOL_COLORS.priority.low;

    // Domain-based color from node ID
    const domain = node.id.split(':')[0];
    const domainColor = ODDS_PROTOCOL_COLORS.domain[domain as keyof typeof ODDS_PROTOCOL_COLORS.domain];
    if (domainColor) return domainColor;

    // Default to brand primary
    return ODDS_PROTOCOL_COLORS.brand.primary;
}

// =============================================================================
// [ENHANCED_CANVAS_NODE_TYPES] - 2025-11-18
// =============================================================================

export interface CanvasNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'text' | 'file' | 'image' | 'group';

    // Enhanced color support
    color?: CanvasColor;

    text?: string;
    metadata?: Record<string, unknown>;
    relationships?: CanvasRelationship[];
    healthScore?: number;
    lastValidated?: Date;
}

export interface CanvasRelationship {
    id: string;
    fromNode: string;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toNode: string;
    toSide: 'top' | 'right' | 'bottom' | 'left';
    color?: CanvasColor;
    label?: string;
    strength?: number;
}

export interface CanvasFile {
    version: string;
    nodes: CanvasNode[];
    edges: CanvasRelationship[];
    metadata: {
        name: string;
        description?: string;
        version: string;
        created: Date;
        modified: Date;
        author: string;
        teamMember?: string;
        category: string;
        healthScore: number;
        totalNodes: number;
        totalEdges: number;
        complexity: 'simple' | 'moderate' | 'complex';
    };
}

// =============================================================================
// [MIGRATION_TYPES] - 2025-11-18
// =============================================================================

export interface MigrationResult {
    canvasPath: string;
    nodesProcessed: number;
    nodesMigrated: number;
    errors: Array<{ nodeId: string; message: string }>;
    warnings: Array<{ nodeId: string; message: string; oldColor?: string; newColor?: string }>;
    timestamp: string;
    summary: {
        successRate: number;
        backupLocation: string;
    };
}

export interface ColorValidationReport {
    canvasPath: string;
    totalNodes: number;
    coloredNodes: number;
    legacyColors: number;
    hexColors: number;
    brandColors: number;
    accessibilityIssues: number;
    details: ColorNodeReport[];
}

export interface ColorNodeReport {
    nodeId: string;
    color: string;
    type: 'hex' | 'legacy';
    valid: boolean;
    issues: ValidationIssue[];
    warnings: ValidationIssue[];
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    suggestion?: string;
    metadata?: Record<string, unknown>;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    warnings: ValidationIssue[];
}

// =============================================================================
// [UTILITY_TYPES] - 2025-11-18
// =============================================================================

export type ColorCategory =
    | 'brand'
    | 'status'
    | 'domain'
    | 'priority';

export type NodeStatus = 'active' | 'beta' | 'deprecated' | 'experimental';
export type NodePriority = 'low' | 'medium' | 'high' | 'critical';

export interface ColorPalette {
    name: string;
    colors: Record<string, string>;
    description: string;
}

export interface ColorTheme {
    id: string;
    name: string;
    palette: ColorPalette[];
    metadata: {
        created: Date;
        version: string;
        author: string;
    };
}
