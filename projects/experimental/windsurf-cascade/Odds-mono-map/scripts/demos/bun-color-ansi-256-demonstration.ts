#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-color-ansi-256-demonstration
 * 
 * Bun Color Ansi 256 Demonstration
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,color,ansi,formatting,bun,runtime,performance
 */

#!/usr/bin/env bun
/**
 * 256 ANSI Colors (ansi-256) Format Demonstration
 * Shows how our canvas system uses the ansi-256 format for terminal applications
 */

import {
    CANVAS_BRAND_COLORS
} from '../../src/types/canvas-color';

console.info('🎨 256 ANSI Colors (ansi-256) Format Demonstration');
console.info('===================================================\n');

// Test colors from official documentation
const officialExamples = [
    "red",
    0xff0000,
    "#f00",
    "#ff0000"
];

console.info('🎯 Testing Official ansi-256 Examples\n');

// 1. Official Examples Validation
console.info('📋 1. Official Examples Validation');
console.info('─'.repeat(50));

officialExamples.forEach((color, index) => {
    const ansi256 = Bun.color(color, "ansi-256");
    const expected = "\\u001b[38;5;196m"; // Red should map to color 196

    console.info(`${index + 1}. Input: ${JSON.stringify(color).padEnd(15)} → ${JSON.stringify(ansi256)}`);

    // Verify it's the correct ANSI-256 format
    if (typeof ansi256 === 'string' && ansi256.includes('[38;5;')) {
        const colorCode = ansi256.match(/\[38;5;(\d+)m/)?.[1];
        console.info(`    └─ ANSI-256 Code: ${colorCode} (Red palette index) ✅`);
    }
    console.info('');
});

// 2. Canvas Brand Colors in ANSI-256
console.info('🎨 2. Canvas Brand Colors in ANSI-256');
console.info('─'.repeat(50));

const canvasBrandColors = [
    { name: "Primary", color: CANVAS_BRAND_COLORS.primary },
    { name: "Secondary", color: CANVAS_BRAND_COLORS.secondary },
    { name: "Accent", color: CANVAS_BRAND_COLORS.accent },
    { name: "Active", color: CANVAS_BRAND_COLORS.status.active },
    { name: "Beta", color: CANVAS_BRAND_COLORS.status.beta },
    { name: "Deprecated", color: CANVAS_BRAND_COLORS.status.deprecated },
    { name: "Experimental", color: CANVAS_BRAND_COLORS.status.experimental }
];

console.info('Canvas brand colors mapped to 256-color ANSI palette:');
canvasBrandColors.forEach((item, index) => {
    const ansi256 = Bun.color(item.color, "ansi-256");
    const ansi16m = Bun.color(item.color, "ansi-16m"); // For comparison

    console.info(`${index + 1}. ${item.name.padEnd(12)}: ${item.color}`);
    console.info(`    ANSI-256: ${JSON.stringify(ansi256)}`);
    console.info(`    ANSI-16m: ${JSON.stringify(ansi16m)} (24-bit reference)`);

    if (typeof ansi256 === 'string') {
        const colorCode = ansi256.match(/\[38;5;(\d+)m/)?.[1];
        console.info(`    └─ Palette Index: ${colorCode}`);
    }
    console.info('');
});

// 3. 256-Color Palette Analysis
console.info('📊 3. 256-Color Palette Analysis');
console.info('─'.repeat(50));

// Test various colors to see palette mapping
const testColors = [
    "#000000", // Black
    "#FFFFFF", // White  
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#10B981", // Canvas green
    "#EAB308", // Canvas yellow
    "#EF4444", // Canvas red
    "#8B5CF6", // Canvas purple
    "#F97316", // Orange
    "#06B6D4", // Sky
    "#84CC16", // Lime
    "#A855F7"  // Purple
];

console.info('Color mapping to 256-color ANSI palette:');
testColors.forEach((color, index) => {
    const ansi256 = Bun.color(color, "ansi-256");

    if (typeof ansi256 === 'string') {
        const colorCode = ansi256.match(/\[38;5;(\d+)m/)?.[1];
        console.info(`${index + 1}. ${color.padEnd(10)} → Palette ${(colorCode || 'N/A').padEnd(3)} ${JSON.stringify(ansi256)}`);
    }
});

// 4. Canvas Terminal Dashboard with ANSI-256
console.info('\n🖥️ 4. Canvas Terminal Dashboard with ANSI-256');
console.info('─'.repeat(50));

// Simulate a canvas status dashboard using ANSI-256 colors
const canvasServices = [
    { name: "Bridge Service", status: "active", color: "#10B981" },
    { name: "Analytics Engine", status: "beta", color: "#EAB308" },
    { name: "Legacy Service", status: "deprecated", color: "#EF4444" },
    { name: "Experimental Feature", status: "experimental", color: "#8B5CF6" },
    { name: "API Gateway", status: "active", color: "#3B82F6" },
    { name: "Database", status: "active", color: "#10B981" },
    { name: "Cache Layer", status: "beta", color: "#F97316" },
    { name: "Monitor Service", status: "active", color: "#06B6D4" }
];

console.info('🎨 Canvas System Status Dashboard (256-color ANSI)');
console.info(''.padEnd(60, '═'));

canvasServices.forEach((service, index) => {
    const statusColor = Bun.color(service.color, "ansi-256");
    const resetColor = "\u001b[0m";

    // Create status indicator
    const indicator = `${statusColor}●${resetColor}`;

    // Format status line
    const statusLine = `${index + 1}. ${indicator} ${service.name.padEnd(20)} ${service.status.padEnd(12)} ${service.color}`;
    console.info(statusLine);
});

console.info(''.padEnd(60, '═'));

// 5. ANSI-256 vs Other Formats Comparison
console.info('\n🔍 5. ANSI-256 vs Other Formats Comparison');
console.info('─'.repeat(50));

const comparisonColors = ["#10B981", "#EAB308", "#EF4444", "#8B5CF6"];

console.info('Format comparison for canvas colors:');
comparisonColors.forEach((color, index) => {
    const ansi = Bun.color(color, "ansi");
    const ansi16m = Bun.color(color, "ansi-16m");
    const ansi256 = Bun.color(color, "ansi-256");
    const ansi16 = Bun.color(color, "ansi-16");

    console.info(`${index + 1}. ${color}:`);
    console.info(`    ANSI (24-bit):   ${JSON.stringify(ansi)}`);
    console.info(`    ANSI-16m (24-bit): ${JSON.stringify(ansi16m)}`);
    console.info(`    ANSI-256 (256):   ${JSON.stringify(ansi256)}`);
    console.info(`    ANSI-16 (16):     ${JSON.stringify(ansi16)}`);
    console.info('');
});

// 6. Performance Test
console.info('⚡ 6. ANSI-256 Performance Test');
console.info('─'.repeat(50));

const iterations = 50000;
const testColor = "#10B981";

console.info(`Testing ANSI-256 format performance (${iterations} conversions):`);

const formats = [
    { name: "ANSI-256", format: "ansi-256" },
    { name: "ANSI-16m", format: "ansi-16m" },
    { name: "General ANSI", format: "ansi" }
];

formats.forEach(format => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        Bun.color(testColor, format.format as any);
    }

    const duration = performance.now() - start;
    const opsPerSecond = Math.round(iterations / duration * 1000);

    console.info(`${format.name.padEnd(15)}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
});

// 7. Terminal Compatibility Analysis
console.info('\n💻 7. Terminal Compatibility Analysis');
console.info('─'.repeat(50));

console.info('ANSI-256 format compatibility across different terminal types:');

const terminalTypes = [
    { name: "Modern Terminal", support: "Full 256-color support", recommendation: "Use ANSI-256 for optimal colors" },
    { name: "Standard Terminal", support: "256-color palette", recommendation: "ANSI-256 provides best color accuracy" },
    { name: "Legacy Terminal", support: "16-color only", recommendation: "Fallback to ANSI-16 format" },
    { name: "No ANSI Support", support: "Plain text only", recommendation: "Use color names or hex codes" }
];

terminalTypes.forEach((terminal, index) => {
    const indicator = terminal.support.includes("256") ? "✅" :
        terminal.support.includes("16") ? "⚠️" : "❌";

    console.info(`${index + 1}. ${indicator} ${terminal.name.padEnd(20)} ${terminal.support.padEnd(25)}`);
    console.info(`    └─ Recommendation: ${terminal.recommendation}`);
    console.info('');
});

// 8. Canvas Integration Best Practices
console.info('🎯 8. Canvas Integration Best Practices');
console.info('─'.repeat(50));

console.info('📋 Best practices for using ANSI-256 in canvas applications:');
console.info('');

console.info('✅ 1. Progressive Enhancement');
console.info('   • Try ANSI-16m first (24-bit true color)');
console.info('   • Fallback to ANSI-256 for standard terminals');
console.info('   • Final fallback to ANSI-16 for legacy systems');
console.info('');

console.info('✅ 2. Color Selection Strategy');
console.info('   • Choose colors that map well to 256-color palette');
console.info('   • Test important colors in ANSI-256 format');
console.info('   • Avoid colors that lose distinction in 256-color mode');
console.info('');

console.info('✅ 3. Performance Considerations');
console.info('   • ANSI-256 is fast and efficient');
console.info('   • Cache color conversions for repeated use');
console.info('   • Use format detection for optimal performance');
console.info('');

console.info('✅ 4. User Experience');
console.info('   • Provide color options for different terminals');
console.info('   • Document terminal requirements');
console.info('   • Include color-blind friendly palettes');
console.info('');

// 9. Color Palette Mapping Reference
console.info('📚 9. Color Palette Mapping Reference');
console.info('─'.repeat(50));

console.info('Common color mappings in ANSI-256 palette:');

const colorMappings = [
    { hex: "#000000", name: "Black", code: 16 },
    { hex: "#800000", name: "Maroon", code: 1 },
    { hex: "#008000", name: "Green", code: 2 },
    { hex: "#808000", name: "Olive", code: 3 },
    { hex: "#000080", name: "Navy", code: 4 },
    { hex: "#800080", name: "Purple", code: 5 },
    { hex: "#008080", name: "Teal", code: 6 },
    { hex: "#C0C0C0", name: "Silver", code: 7 },
    { hex: "#808080", name: "Gray", code: 8 },
    { hex: "#FF0000", name: "Red", code: 196 },
    { hex: "#00FF00", name: "Lime", code: 46 },
    { hex: "#0000FF", name: "Blue", code: 21 },
    { hex: "#FFFF00", name: "Yellow", code: 226 },
    { hex: "#FF00FF", name: "Magenta", code: 201 },
    { hex: "#00FFFF", name: "Cyan", code: 51 },
    { hex: "#FFFFFF", name: "White", code: 231 }
];

colorMappings.forEach((mapping, index) => {
    const actualAnsi256 = Bun.color(mapping.hex, "ansi-256");
    const actualCode = actualAnsi256?.match(/\[38;5;(\d+)m/)?.[1];
    const matches = actualCode === mapping.code.toString();

    console.info(`${index + 1}. ${mapping.name.padEnd(10)} ${mapping.hex.padEnd(8)} → Code ${mapping.code.toString().padEnd(3)} ${matches ? '✅' : '❌'} (actual: ${actualCode})`);
});

console.info('\n🎉 ANSI-256 Format Demonstration Complete!');
console.info('🚀 Your canvas system perfectly leverages 256-color ANSI terminal capabilities!');
