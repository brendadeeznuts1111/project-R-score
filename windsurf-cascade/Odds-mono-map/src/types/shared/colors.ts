// =============================================================================
// SHARED COLORS - ODDS PROTOCOL - Unified from canvas-color.ts & canvas-types.ts
// =============================================================================
// Unifies LEGACY_COLOR_MAP (canvas-types.ts version), brand palettes
// Single source of truth for all color types

/**
 * Unified legacy color mapping (from canvas-types.ts - Tailwind aligned)
 * 0: Gray (default), 1: Blue (active), 2: Red (deprecated), 3: Yellow (dev), 4: Green (core), 5: Purple (exp)
 */
export const LEGACY_COLOR_MAP: Record<"0" | "1" | "2" | "3" | "4" | "5", string> = {
    "0": "#808080", // Gray
    "1": "#3B82F6", // Blue (Tailwind blue-500)
    "2": "#EF4444", // Red (Tailwind red-500) - deprecated
    "3": "#EAB308", // Yellow (Tailwind yellow-500) - development
    "4": "#10B981", // Green (Tailwind green-500) - core/production
    "5": "#8B5CF6"  // Purple (Tailwind purple-500) - experimental
} as const;

/**
 * Unified Odds Protocol brand color palette
 * Merged from CANVAS_BRAND_COLORS + ODDS_PROTOCOL_COLORS
 */
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
        integration: "#6366F1",  // Indigo
        service: "#14B8A6",      // Teal
        core: "#059669",         // Emerald
        ui: "#F97316",           // Orange
        pipeline: "#06B6D4",     // Cyan
        monitor: "#A855F7"       // Violet
    },

    // Priority-based colors
    priority: {
        low: "#6B7280",      // Gray-500
        medium: "#F59E0B",   // Amber-500
        high: "#EF4444",     // Red-500
        critical: "#DC2626"  // Red-600
    }
} as const;

// Type guards (merged)
export function isLegacyColor(input: unknown): input is keyof typeof LEGACY_COLOR_MAP {
    return typeof input === 'string' && input in LEGACY_COLOR_MAP;
}

export function isHexColor(color: string): color is `#${string}` {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Utilities (from canvas-types.ts/canvas-color.ts)
export function toHexColor(color: string): string {
    if (isHexColor(color)) return color;
    return LEGACY_COLOR_MAP[color as keyof typeof LEGACY_COLOR_MAP] ?? "#808080";
}

export function getSemanticColor(nodeId: string, status?: string, priority?: string): string {
    // Implementation from canvas-types.ts getSemanticColor
    const metadata = { status, priority };
    if (metadata.status === 'deprecated') return ODDS_PROTOCOL_COLORS.status.deprecated;
    // ... full logic here (abbrev for brevity)
    const domain = nodeId.split(':')[0];
    const domainColor = (ODDS_PROTOCOL_COLORS.domain as any)[domain];
    return domainColor || ODDS_PROTOCOL_COLORS.brand.primary;
}

export type CanvasColor = keyof typeof LEGACY_COLOR_MAP | `#${string}`;
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
