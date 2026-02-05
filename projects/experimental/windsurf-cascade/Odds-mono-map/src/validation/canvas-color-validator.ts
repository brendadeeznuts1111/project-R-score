// =============================================================================
// CANVAS COLOR VALIDATOR - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 2.0.0
// LAST_UPDATED: 2025-11-18T19:50:00Z
// DESCRIPTION: Enhanced color validation with HEX support and accessibility
// =============================================================================

import {
    CanvasColor,
    CanvasFile,
    ValidationResult,
    ValidationIssue,
    ColorValidationReport,
    ColorNodeReport,
    ODDS_PROTOCOL_COLORS,
    HEX_COLOR_REGEX,
    isHexColor,
    isLegacyColor,
    LEGACY_COLOR_MAP,
    toHexColor
} from '../types/canvas-types.js';
import { readFile } from 'fs/promises';

/**
 * Enhanced color validator supporting both legacy and HEX colors
 */
export class CanvasColorValidator {

    /**
     * Validates color property supports both legacy and HEX
     */
    validateColor(
        color: unknown,
        nodeId: string
    ): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        // Type check
        if (color !== undefined && typeof color !== 'string') {
            issues.push({
                severity: 'error',
                category: 'metadata',
                message: `color must be string, got ${typeof color}`,
                metadata: { nodeId, colorType: typeof color }
            });
            return { valid: false, issues, warnings };
        }

        // If no color, it's optional - allow
        if (color === undefined) {
            warnings.push({
                severity: 'info',
                category: 'style',
                message: 'No color specified - will use default',
                suggestion: 'Consider adding semantic color for better visualization',
                metadata: { nodeId }
            });
            return { valid: true, issues, warnings };
        }

        const colorStr = color as string;

        // Validate legacy color
        if (isLegacyColor(colorStr)) {
            warnings.push({
                severity: 'warning',
                category: 'style',
                message: `Legacy color enum "${colorStr}" should be migrated to HEX`,
                suggestion: `Use ${LEGACY_COLOR_MAP[colorStr]} for better tooling`,
                metadata: { nodeId, hexEquivalent: LEGACY_COLOR_MAP[colorStr] }
            });
            return { valid: true, issues, warnings };
        }

        // Validate HEX color
        if (isHexColor(colorStr)) {
            // Additional HEX validation (optional but recommended)
            const hexValidation = this.validateHexQuality(colorStr);
            if (hexValidation.contrastWarning) {
                warnings.push({
                    severity: 'info',
                    category: 'accessibility',
                    message: hexValidation.contrastWarning,
                    suggestion: 'Consider higher contrast for readability',
                    metadata: { nodeId, contrastRatio: hexValidation.contrastRatio }
                });
            }

            if (hexValidation.brandWarning) {
                warnings.push({
                    severity: 'info',
                    category: 'brand',
                    message: hexValidation.brandWarning,
                    suggestion: 'Consider using official brand colors for consistency',
                    metadata: { nodeId, brandColors: Object.values(ODDS_PROTOCOL_COLORS).flat() }
                });
            }

            return { valid: true, issues, warnings };
        }

        // Invalid color format
        issues.push({
            severity: 'error',
            category: 'metadata',
            message: `Invalid color format: "${colorStr}"`,
            suggestion: 'Use HEX (#RRGGBB) or legacy enum (0-5)',
            metadata: { nodeId, validFormats: ['#RRGGBB', '0-5'], providedValue: colorStr }
        });

        return { valid: false, issues, warnings };
    }

    /**
     * Advanced HEX validation (accessibility, brand compliance, etc.)
     */
    private validateHexQuality(hex: string): {
        valid: boolean;
        contrastWarning?: string;
        brandWarning?: string;
        contrastRatio?: number;
    } {
        const issues: string[] = [];

        // Check if it's a brand color (should be in official palette)
        const isBrandColor = this.isBrandColor(hex);

        if (!isBrandColor) {
            return {
                valid: true,
                brandWarning: `Color ${hex} not in brand palette`
            };
        }

        // Check contrast ratio (simplified WCAG check)
        const contrast = this.calculateContrastRatio(hex, '#FFFFFF');
        if (contrast < 4.5) {
            return {
                valid: true,
                contrastWarning: `Low contrast ratio (${contrast.toFixed(1)}:1) against white`,
                contrastRatio: contrast
            };
        }

        return { valid: true, contrastRatio: contrast };
    }

    /**
     * Calculates luminance for contrast checking
     */
    private calculateContrastRatio(hex1: string, hex2: string): number {
        const lum1 = this.getLuminance(hex1);
        const lum2 = this.getLuminance(hex2);

        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);

        return (brightest + 0.05) / (darkest + 0.05);
    }

    /**
     * Converts HEX to luminance
     */
    private getLuminance(hex: string): number {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;

        // Convert to sRGB
        const rSRGB = rgb.r / 255;
        const gSRGB = rgb.g / 255;
        const bSRGB = rgb.b / 255;

        // Calculate luminance
        const r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
        const g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
        const b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Converts HEX to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            }
            : null;
    }

    /**
     * Bulk validate colors in entire canvas
     */
    async validateAllColors(canvasPath: string): Promise<ColorValidationReport> {
        console.log(`🔍 Validating colors in: ${canvasPath}`);

        const content = await readFile(canvasPath, 'utf8');
        const canvas: CanvasFile = JSON.parse(content);

        const report: ColorValidationReport = {
            canvasPath,
            totalNodes: canvas.nodes.length,
            coloredNodes: 0,
            legacyColors: 0,
            hexColors: 0,
            brandColors: 0,
            accessibilityIssues: 0,
            details: []
        };

        console.log(`📊 Analyzing ${canvas.nodes.length} nodes...`);

        for (const node of canvas.nodes) {
            if (!node.color) {
                // Add report for uncolored nodes
                report.details.push({
                    nodeId: node.id,
                    color: 'none',
                    type: 'hex',
                    valid: true,
                    issues: [],
                    warnings: [{
                        severity: 'info',
                        category: 'style',
                        message: 'Node has no color assigned',
                        suggestion: 'Consider adding semantic color for better visualization'
                    }]
                });
                continue;
            }

            report.coloredNodes++;
            const result = this.validateColor(node.color, node.id);

            const detail: ColorNodeReport = {
                nodeId: node.id,
                color: node.color,
                type: isHexColor(node.color) ? 'hex' : 'legacy',
                valid: result.valid,
                issues: result.issues,
                warnings: result.warnings
            };

            if (isLegacyColor(node.color)) report.legacyColors++;
            if (isHexColor(node.color)) {
                report.hexColors++;
                if (this.isBrandColor(node.color)) report.brandColors++;
                if (result.warnings.some(w => w.category === 'accessibility')) {
                    report.accessibilityIssues++;
                }
            }

            report.details.push(detail);

            // Log validation result
            const status = result.valid ? '✅' : '❌';
            const colorType = isHexColor(node.color) ? 'HEX' : 'Legacy';
            console.log(`  ${status} ${node.id}: ${colorType} ${node.color}`);
        }

        console.log(`📈 Validation Summary:`);
        console.log(`   Total nodes: ${report.totalNodes}`);
        console.log(`   Colored nodes: ${report.coloredNodes}`);
        console.log(`   Legacy colors: ${report.legacyColors}`);
        console.log(`   HEX colors: ${report.hexColors}`);
        console.log(`   Brand colors: ${report.brandColors}`);
        console.log(`   Accessibility issues: ${report.accessibilityIssues}`);

        return report;
    }

    /**
     * Validates color consistency across canvas
     */
    async validateColorConsistency(canvasPath: string): Promise<{
        consistent: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const content = await readFile(canvasPath, 'utf8');
        const canvas: CanvasFile = JSON.parse(content);

        const issues: string[] = [];
        const recommendations: string[] = [];

        // Analyze color usage patterns
        const colorUsage = new Map<string, number>();
        const statusColors = new Map<string, string>();

        for (const node of canvas.nodes) {
            if (!node.color) continue;

            const hexColor = toHexColor(node.color);
            colorUsage.set(hexColor, (colorUsage.get(hexColor) || 0) + 1);

            // Check status-color consistency
            if (node.metadata?.status) {
                const status = node.metadata.status as string;
                const existingColor = statusColors.get(status);
                if (existingColor && existingColor !== hexColor) {
                    issues.push(`Inconsistent color for status "${status}": ${existingColor} vs ${hexColor}`);
                }
                statusColors.set(status, hexColor);
            }
        }

        // Check for too many different colors
        if (colorUsage.size > 8) {
            issues.push(`Too many different colors (${colorUsage.size}). Consider using a consistent palette.`);
            recommendations.push('Limit color palette to 8-10 colors for better visual consistency');
        }

        // Check for rarely used colors
        const rareColors = Array.from(colorUsage.entries())
            .filter(([, count]) => count === 1)
            .map(([color]) => color);

        if (rareColors.length > 0) {
            recommendations.push(`Consider consolidating rarely used colors: ${rareColors.join(', ')}`);
        }

        // Check brand compliance
        const nonBrandColors = Array.from(colorUsage.keys())
            .filter(color => !this.isBrandColor(color));

        if (nonBrandColors.length > 0) {
            recommendations.push(`Consider using brand colors instead of: ${nonBrandColors.join(', ')}`);
        }

        return {
            consistent: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * Generates color palette recommendations
     */
    generatePaletteRecommendations(canvasPath: string): {
        recommendedPalette: string[];
        migrationPlan: string[];
        benefits: string[];
    } {
        // This would analyze the canvas content and recommend optimal colors
        return {
            recommendedPalette: [
                ODDS_PROTOCOL_COLORS.brand.primary,
                ODDS_PROTOCOL_COLORS.status.active,
                ODDS_PROTOCOL_COLORS.status.beta,
                ODDS_PROTOCOL_COLORS.status.deprecated,
                ODDS_PROTOCOL_COLORS.status.experimental,
                ODDS_PROTOCOL_COLORS.priority.high,
                ODDS_PROTOCOL_COLORS.priority.medium,
                ODDS_PROTOCOL_COLORS.priority.low
            ],
            migrationPlan: [
                '1. Backup existing canvas files',
                '2. Run color migration script',
                '3. Validate new color assignments',
                '4. Update documentation with new color meanings'
            ],
            benefits: [
                'Improved visual consistency',
                'Better accessibility with optimized contrast',
                'Brand compliance and professional appearance',
                'Enhanced semantic meaning through color coding',
                'Easier maintenance and updates'
            ]
        };
    }

    /**
     * Checks if color is in brand palette
     */
    private isBrandColor(hex: string): boolean {
        const upperHex = hex.toUpperCase();
        return Object.values(ODDS_PROTOCOL_COLORS)
            .some(section => Object.values(section).includes(upperHex));
    }

    /**
     * Validates edge colors (relationships)
     */
    validateEdgeColors(canvas: CanvasFile): ValidationResult {
        const issues: ValidationIssue[] = [];
        const warnings: ValidationIssue[] = [];

        for (const edge of canvas.edges) {
            if (edge.color) {
                const result = this.validateColor(edge.color, edge.id);
                issues.push(...result.issues);
                warnings.push(...result.warnings);
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            warnings
        };
    }

    /**
     * Gets color statistics for reporting
     */
    getColorStatistics(canvas: CanvasFile): {
        totalNodes: number;
        coloredNodes: number;
        colorDistribution: Record<string, number>;
        mostUsedColor: string;
        colorTypes: {
            legacy: number;
            hex: number;
            brand: number;
        };
    } {
        const colorDistribution: Record<string, number> = {};
        let legacyCount = 0;
        let hexCount = 0;
        let brandCount = 0;

        for (const node of canvas.nodes) {
            if (!node.color) continue;

            const hexColor = toHexColor(node.color);
            colorDistribution[hexColor] = (colorDistribution[hexColor] || 0) + 1;

            if (isLegacyColor(node.color)) legacyCount++;
            if (isHexColor(node.color)) {
                hexCount++;
                if (this.isBrandColor(hexColor)) brandCount++;
            }
        }

        const mostUsedColor = Object.entries(colorDistribution)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

        return {
            totalNodes: canvas.nodes.length,
            coloredNodes: Object.values(colorDistribution).reduce((sum, count) => sum + count, 0),
            colorDistribution,
            mostUsedColor,
            colorTypes: {
                legacy: legacyCount,
                hex: hexCount,
                brand: brandCount
            }
        };
    }
}
