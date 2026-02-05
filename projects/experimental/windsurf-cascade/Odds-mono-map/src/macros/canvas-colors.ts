/**
 * Bun.macro for build-time color normalization
 * Converts canvas colors to CSS at bundle time
 */

import { color } from "bun" with { type: "macro" };

/**
 * Normalizes canvas color at build time
 * @example normalizeColorMacro("#f00") → "#ff0000"
 * @example normalizeColorMacro("red") → "#ff0000"
 */
export function normalizeColorMacro(input: string): string {
    return color(input, "hex") || "#808080";
}

/**
 * Generates CSS class at build time
 */
export function generateNodeCSS(nodeId: string, colorInput: string): string {
    const normalized = color(colorInput, "hex");
    const rgb = color(colorInput, "{rgb}");

    return `
        .canvas-node-${nodeId} {
            background-color: ${normalized};
            border: 2px solid ${normalized}80;
            --node-r: ${rgb?.r ?? 0};
            --node-g: ${rgb?.g ?? 0};
            --node-b: ${rgb?.b ?? 0};
        }
    `;
}

/**
 * Build-time validation of canvas colors
 */
export function validateColorMacro(input: string): boolean {
    return color(input, "hex") !== null;
}

/**
 * Generates CSS variables for brand colors at build time
 */
export function generateBrandCSS(): string {
    const brandColors = {
        primary: color("#0F172A", "hex"),
        secondary: color("#1E40AF", "hex"),
        accent: color("#F59E0B", "hex"),
        active: color("#10B981", "hex"),
        beta: color("#EAB308", "hex"),
        deprecated: color("#EF4444", "hex"),
        experimental: color("#8B5CF6", "hex")
    };

    let css = ':root {\n';
    for (const [name, value] of Object.entries(brandColors)) {
        css += `    --canvas-${name}: ${value};\n`;
    }
    css += '}';

    return css;
}

/**
 * Creates color utility functions at build time
 */
export function generateColorUtils(): string {
    return `
// Auto-generated color utilities
export const CANVAS_COLORS = {
    primary: "${color("#0F172A", "hex")}",
    secondary: "${color("#1E40AF", "hex")}",
    accent: "${color("#F59E0B", "hex")}",
    active: "${color("#10B981", "hex")}",
    beta: "${color("#EAB308", "hex")}",
    deprecated: "${color("#EF4444", "hex")}",
    experimental: "${color("#8B5CF6", "hex")}"
} as const;

export function getNodeColor(status: keyof typeof CANVAS_COLORS): string {
    return CANVAS_COLORS[status] || CANVAS_COLORS.primary;
}
`;
}
