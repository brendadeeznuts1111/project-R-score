/**
 * Comprehensive test suite for Bun.color Canvas Integration
 */

import { describe, test, expect } from 'bun:test';
import {
    normalizeColor,
    validateCanvasColor,
    getTerminalColor,
    CANVAS_BRAND_COLORS,
    LEGACY_COLOR_MAP,
    isLegacyColor,
    calculateContrastRatio,
    createColorMetadata,
    convertAllCanvasColors,
    renderColoredNode,
    CanvasColorInput
} from '../src/types/canvas-color';

describe('Bun.color Canvas Integration', () => {

    describe('Color Normalization', () => {
        test('normalizes CSS color names to HEX', () => {
            expect(normalizeColor("red")).toBe("#ff0000");
            expect(normalizeColor("BLUE")).toBe("#0000ff");
            expect(normalizeColor("ReD")).toBe("#ff0000");
            expect(normalizeColor("green")).toBe("#008000");
            expect(normalizeColor("purple")).toBe("#800080");
        });

        test('normalizes HEX colors to standardized format', () => {
            expect(normalizeColor("#f00")).toBe("#ff0000");
            expect(normalizeColor("#FF0000")).toBe("#ff0000");
            expect(normalizeColor("#abc")).toBe("#aabbcc");
            expect(normalizeColor("#ABCDEF")).toBe("#abcdef");
        });

        test('normalizes RGB colors to HEX', () => {
            expect(normalizeColor("rgb(255, 0, 0)")).toBe("#ff0000");
            expect(normalizeColor("rgb(0, 128, 255)")).toBe("#0080ff");
            expect(normalizeColor("rgba(255, 0, 0, 0.5)")).toBe("#ff0000");
        });

        test('normalizes HSL colors to HEX', () => {
            expect(normalizeColor("hsl(0, 100%, 50%)")).toBe("#ff0000");
            expect(normalizeColor("hsl(120, 100%, 50%)")).toBe("#00ff00");
        });

        test('normalizes number colors to HEX', () => {
            expect(normalizeColor(0xff0000)).toBe("#ff0000");
            expect(normalizeColor(16711680)).toBe("#ff0000"); // 0xff0000 in decimal
        });

        test('normalizes RGB objects to HEX', () => {
            expect(normalizeColor({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
            expect(normalizeColor({ r: 0, g: 128, b: 255 })).toBe("#0080ff");
            expect(normalizeColor({ r: 255, g: 0, b: 0, a: 0.5 })).toBe("#ff0000");
        });

        test('normalizes RGB arrays to HEX', () => {
            expect(normalizeColor([255, 0, 0])).toBe("#ff0000");
            expect(normalizeColor([0, 128, 255])).toBe("#0080ff");
            expect(normalizeColor([255, 0, 0, 128])).toBe("#ff0000");
        });

        test('handles invalid colors gracefully', () => {
            expect(normalizeColor("not-a-color")).toBe("#808080");
            expect(normalizeColor("")).toBe("#808080");
            expect(normalizeColor("#invalid")).toBe("#808080");
        });
    });

    describe('Legacy Color Detection', () => {
        test('detects legacy color codes', () => {
            expect(isLegacyColor("0")).toBe(true);
            expect(isLegacyColor("1")).toBe(true);
            expect(isLegacyColor("2")).toBe(true);
            expect(isLegacyColor("3")).toBe(true);
            expect(isLegacyColor("4")).toBe(true);
            expect(isLegacyColor("5")).toBe(true);
        });

        test('rejects non-legacy colors', () => {
            expect(isLegacyColor("6")).toBe(false);
            expect(isLegacyColor("#ff0000")).toBe(false);
            expect(isLegacyColor("red")).toBe(false);
            expect(isLegacyColor(123)).toBe(false);
        });
    });

    describe('Color Validation', () => {
        test('validates and converts legacy colors', () => {
            const result = validateCanvasColor("1", "test:node");
            expect(result.valid).toBe(true);
            expect(result.normalizedColor).toBe("#3b82f6");
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0].category).toBe('legacy');
        });

        test('validates brand colors without warnings', () => {
            const result = validateCanvasColor(CANVAS_BRAND_COLORS.status.active, "service:test");
            expect(result.valid).toBe(true);
            expect(result.warnings).toHaveLength(0); // Brand color = no warning
        });

        test('warns about non-brand colors', () => {
            const result = validateCanvasColor("#ff00ff", "node:magenta");
            expect(result.valid).toBe(true);
            expect(result.warnings.some(w => w.category === 'style')).toBe(true);
        });

        test('detects accessibility issues', () => {
            const result = validateCanvasColor("#ffff00", "node:poor-contrast"); // Yellow on white
            expect(result.valid).toBe(true);
            expect(result.warnings.some(w => w.category === 'accessibility')).toBe(true);
        });

        test('handles invalid colors', () => {
            const result = validateCanvasColor("not-a-color", "node:invalid");
            expect(result.valid).toBe(false);
            expect(result.bunColorError).toBeDefined();
            expect(result.issues.some(i => i.category === 'color')).toBe(true);
        });

        test('validates color types correctly', () => {
            const validTypes = [
                "#ff0000", "red", "rgb(255,0,0)",
                0xff0000, { r: 255, g: 0, b: 0 },
                [255, 0, 0]
            ];

            validTypes.forEach((color, index) => {
                const result = validateCanvasColor(color, `test:node:${index}`);
                expect(result.valid).toBe(true);
            });
        });

        test('rejects invalid color types', () => {
            const invalidTypes = [
                {}, [], true, null, undefined,
                new Date(), () => { }, Symbol()
            ];

            invalidTypes.forEach((color, index) => {
                const result = validateCanvasColor(color, `test:node:${index}`);
                if (color !== undefined) {
                    expect(result.valid).toBe(false);
                }
            });
        });
    });

    describe('Terminal Color Generation', () => {
        test('generates ANSI colors', () => {
            const ansi = getTerminalColor({ color: "#ff0000" }, "ansi");
            expect(ansi).toBe("\x1b[38;2;255;0;0m");
        });

        test('generates ANSI-16 colors', () => {
            const ansi16 = getTerminalColor({ color: "#ff0000" }, "ansi-16");
            expect(ansi16).toBe("\x1b[38;5;1m");
        });

        test('generates ANSI-256 colors', () => {
            const ansi256 = getTerminalColor({ color: "#ff0000" }, "ansi-256");
            expect(ansi256).toBe("\x1b[38;5;196m");
        });

        test('generates ANSI-16m colors', () => {
            const ansi16m = getTerminalColor({ color: "#ff0000" }, "ansi-16m");
            expect(ansi16m).toBe("\x1b[38;2;255;0;0m");
        });

        test('handles legacy colors in terminal output', () => {
            const ansi = getTerminalColor({ color: "1" }, "ansi");
            expect(ansi).toBe("\x1b[38;2;59;130;246m"); // Blue from legacy map
        });

        test('returns empty string for no color', () => {
            const ansi = getTerminalColor({ color: undefined }, "ansi");
            expect(ansi).toBe("");
        });
    });

    describe('Contrast Ratio Calculation', () => {
        test('calculates contrast ratios correctly', () => {
            // High contrast (black on white)
            const blackContrast = calculateContrastRatio("#000000", "#ffffff");
            expect(blackContrast).toBeCloseTo(21, 0);

            // Low contrast (light gray on white)
            const grayContrast = calculateContrastRatio("#cccccc", "#ffffff");
            expect(grayContrast).toBeLessThan(4.5);

            // Good contrast (blue on white)
            const blueContrast = calculateContrastRatio("#0000ff", "#ffffff");
            expect(blueContrast).toBeGreaterThan(4.5);
        });
    });

    describe('Color Metadata Creation', () => {
        test('creates comprehensive color metadata', () => {
            const metadata = createColorMetadata("#ff0000", "test:node");

            expect(metadata.input).toBe("#ff0000");
            expect(metadata.normalized).toBe("#ff0000");
            expect(metadata.metadata.originalInput).toBe("#ff0000");
            expect(metadata.metadata.contrastRatio).toBeGreaterThan(4);
            expect(metadata.metadata.isAccessible).toBe(true);
            expect(metadata.metadata.terminalSupport).toEqual({
                ansi16: true,
                ansi256: true,
                ansi16m: true
            });
        });

        test('detects accessibility issues in metadata', () => {
            const metadata = createColorMetadata("#ffff00", "test:node"); // Yellow
            expect(metadata.metadata.isAccessible).toBe(false);
            expect(metadata.metadata.contrastRatio).toBeLessThan(4.5);
        });
    });

    describe('Canvas Color Conversion', () => {
        test('converts all canvas colors to target format', () => {
            const canvas = {
                nodes: [
                    { id: "node1", color: "#ff0000" },
                    { id: "node2", color: "blue" },
                    { id: "node3", color: "1" }, // Legacy
                    { id: "node4" } // No color
                ]
            };

            const conversions = convertAllCanvasColors(canvas, "hex");

            expect(conversions.get("node1")).toBe("#ff0000");
            expect(conversions.get("node2")).toBe("#0000ff");
            expect(conversions.get("node3")).toBe("#3b82f6"); // Legacy conversion
            expect(conversions.get("node4")).toBeNull();
        });

        test('handles empty canvas', () => {
            const canvas = { nodes: [] };
            const conversions = convertAllCanvasColors(canvas, "hex");
            expect(conversions.size).toBe(0);
        });
    });

    describe('Colored Node Rendering', () => {
        test('renders colored nodes in compact mode', () => {
            const node = {
                id: "test:node",
                text: "# Test Node\nThis is a test",
                color: "#ff0000"
            };

            const rendered = renderColoredNode(node, { compact: true });
            expect(rendered).toContain("\x1b[38;2;255;0;0m");
            expect(rendered).toContain("[test:node]");
            expect(rendered).toContain("\x1b[0m");
        });

        test('renders colored nodes in full mode', () => {
            const node = {
                id: "test:node",
                text: "# Test Node\nThis is a test",
                color: "#ff0000"
            };

            const rendered = renderColoredNode(node, { compact: false });
            expect(rendered).toContain("\x1b[38;2;255;0;0m");
            expect(rendered).toContain("# Test Node");
            expect(rendered).toContain("\x1b[0m");
        });

        test('renders uncolored nodes', () => {
            const node = {
                id: "test:node",
                text: "# Test Node\nThis is a test"
            };

            const compact = renderColoredNode(node, { compact: true });
            const full = renderColoredNode(node, { compact: false });

            expect(compact).toBe("[test:node]");
            expect(full).toContain("Node: test:node");
        });

        test('shows metadata when requested', () => {
            const node = {
                id: "test:node",
                text: "# Test Node\nThis is a longer text that should be truncated when metadata is shown",
                color: "#ff0000"
            };

            const rendered = renderColoredNode(node, {
                compact: false,
                showMetadata: true
            });

            expect(rendered).toContain("# Test Node");
            expect(rendered.length).toBeGreaterThan(50);
            expect(rendered.length).toBeLessThan(200); // Should be truncated
        });
    });

    describe('Brand Colors', () => {
        test('brand colors are properly normalized', () => {
            expect(CANVAS_BRAND_COLORS.primary).toBe("#0f172a");
            expect(CANVAS_BRAND_COLORS.secondary).toBe("#1e40af");
            expect(CANVAS_BRAND_COLORS.accent).toBe("#f59e0b");
            expect(CANVAS_BRAND_COLORS.status.active).toBe("#10b981");
            expect(CANVAS_BRAND_COLORS.status.beta).toBe("#eab308");
            expect(CANVAS_BRAND_COLORS.status.deprecated).toBe("#ef4444");
            expect(CANVAS_BRAND_COLORS.status.experimental).toBe("#8b5cf6");
        });

        test('domain colors are properly normalized', () => {
            expect(CANVAS_BRAND_COLORS.domain.integration).toBe("#6366f1");
            expect(CANVAS_BRAND_COLORS.domain.service).toBe("#14b8a6");
            expect(CANVAS_BRAND_COLORS.domain.core).toBe("#059669");
            expect(CANVAS_BRAND_COLORS.domain.ui).toBe("#f97316");
            expect(CANVAS_BRAND_COLORS.domain.pipeline).toBe("#06b6d4");
            expect(CANVAS_BRAND_COLORS.domain.monitor).toBe("#a855f7");
        });
    });

    describe('Legacy Color Map', () => {
        test('legacy color mappings are correct', () => {
            expect(LEGACY_COLOR_MAP["0"]).toBe("#808080");
            expect(LEGACY_COLOR_MAP["1"]).toBe("#3b82f6");
            expect(LEGACY_COLOR_MAP["2"]).toBe("#10b981");
            expect(LEGACY_COLOR_MAP["3"]).toBe("#f59e0b");
            expect(LEGACY_COLOR_MAP["4"]).toBe("#ef4444");
            expect(LEGACY_COLOR_MAP["5"]).toBe("#8b5cf6");
        });
    });

    describe('Error Handling', () => {
        test('handles Bun.color errors gracefully', () => {
            // Test with problematic input that might cause Bun.color to throw
            const result = validateCanvasColor({ invalid: 'object' }, 'test:node');
            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });

        test('handles edge cases in normalization', () => {
            expect(normalizeColor(null as any)).toBe("#808080");
            expect(normalizeColor(undefined as any)).toBe("#808080");
            expect(normalizeColor("")).toBe("#808080");
        });
    });

    describe('Performance', () => {
        test('handles bulk color processing efficiently', () => {
            const start = performance.now();

            // Process 1000 colors
            for (let i = 0; i < 1000; i++) {
                normalizeColor(`hsl(${i % 360}, 100%, 50%)`);
            }

            const duration = performance.now() - start;
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        test('handles large canvas conversion efficiently', () => {
            const largeCanvas = {
                nodes: Array.from({ length: 100 }, (_, i) => ({
                    id: `node${i}`,
                    color: `hsl(${i * 3.6}, 100%, 50%)`
                }))
            };

            const start = performance.now();
            const conversions = convertAllCanvasColors(largeCanvas, "hex");
            const duration = performance.now() - start;

            expect(conversions.size).toBe(100);
            expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
        });
    });
});
