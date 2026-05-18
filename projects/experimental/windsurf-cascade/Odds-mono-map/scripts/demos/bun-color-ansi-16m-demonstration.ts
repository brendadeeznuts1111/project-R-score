#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-color-ansi-16m-demonstration
 * 
 * Bun Color Ansi 16m Demonstration
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
 * 24-bit ANSI Colors (ansi-16m) Format Demonstration
 * Shows how our canvas system uses the ansi-16m format for true color terminal applications
 */

import {
    CANVAS_BRAND_COLORS
} from '../../src/types/canvas-color';

console.info('🌈 24-bit ANSI Colors (ansi-16m) Format Demonstration');
console.info('====================================================\n');

// Test colors from official documentation
const officialExamples = [
    "red",
    0xff0000,
    "#f00",
    "#ff0000"
];

console.info('🎯 Testing Official ansi-16m Examples\n');

// 1. Official Examples Validation
console.info('📋 1. Official Examples Validation');
console.info('─'.repeat(50));

officialExamples.forEach((color, index) => {
    const ansi16m = Bun.color(color, "ansi-16m");
    const expected = "\\x1b[38;2;255;0;0m"; // Red should be RGB 255,0,0

    console.info(`${index + 1}. Input: ${JSON.stringify(color).padEnd(15)} → ${JSON.stringify(ansi16m)}`);

    // Verify it's the correct ANSI-16m format (24-bit true color)
    if (typeof ansi16m === 'string' && ansi16m.includes('[38;2;')) {
        const rgbMatch = ansi16m.match(/\[38;2;(\d+);(\d+);(\d+)m/);
        if (rgbMatch) {
            const [_, r, g, b] = rgbMatch;
            console.info(`    └─ RGB Values: (${r}, ${g}, ${b}) - True Color ✅`);
        }
    }
    console.info('');
});

// 2. Canvas Brand Colors in True Color (ansi-16m)
console.info('🎨 2. Canvas Brand Colors in True Color (ansi-16m)');
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

console.info('Canvas brand colors in 24-bit true color:');
canvasBrandColors.forEach((item, index) => {
    const ansi16m = Bun.color(item.color, "ansi-16m");
    const rgba = Bun.color(item.color, "{rgba}");
    const ansi256 = Bun.color(item.color, "ansi-256"); // For comparison

    console.info(`${index + 1}. ${item.name.padEnd(12)}: ${item.color}`);
    console.info(`    ANSI-16m: ${JSON.stringify(ansi16m)}`);
    console.info(`    RGBA: ${JSON.stringify(rgba)}`);
    console.info(`    ANSI-256: ${JSON.stringify(ansi256)} (256-color reference)`);

    if (typeof ansi16m === 'string') {
        const rgbMatch = ansi16m.match(/\[38;2;(\d+);(\d+);(\d+)m/);
        if (rgbMatch) {
            const [_, r, g, b] = rgbMatch;
            console.info(`    └─ True Color RGB: (${r}, ${g}, ${b})`);
        }
    }
    console.info('');
});

// 3. True Color Precision Analysis
console.info('🔍 3. True Color Precision Analysis');
console.info('─'.repeat(50));

// Test various colors to show true color precision
const precisionTestColors = [
    { name: "Pure Red", hex: "#FF0000", expected: [255, 0, 0] },
    { name: "Pure Green", hex: "#00FF00", expected: [0, 255, 0] },
    { name: "Pure Blue", hex: "#0000FF", expected: [0, 0, 255] },
    { name: "Canvas Green", hex: "#10B981", expected: [16, 185, 129] },
    { name: "Canvas Yellow", hex: "#EAB308", expected: [234, 179, 8] },
    { name: "Canvas Red", hex: "#EF4444", expected: [239, 68, 68] },
    { name: "Canvas Purple", hex: "#8B5CF6", expected: [139, 92, 246] },
    { name: "Subtle Gray", hex: "#6B7280", expected: [107, 114, 128] },
    { name: "Bright Orange", hex: "#FB923C", expected: [251, 146, 60] },
    { name: "Deep Blue", hex: "#1E3A8A", expected: [30, 58, 138] }
];

console.info('True color precision validation:');
precisionTestColors.forEach((test, index) => {
    const ansi16m = Bun.color(test.hex, "ansi-16m");

    if (typeof ansi16m === 'string') {
        const rgbMatch = ansi16m.match(/\[38;2;(\d+);(\d+);(\d+)m/);
        if (rgbMatch) {
            const [_, r, g, b] = rgbMatch;
            const actual = [parseInt(r), parseInt(g), parseInt(b)];
            const matches = JSON.stringify(actual) === JSON.stringify(test.expected);

            console.info(`${index + 1}. ${test.name.padEnd(15)} ${test.hex.padEnd(10)} → (${r}, ${g}, ${b}) ${matches ? '✅' : '❌'}`);
        }
    }
});

// 4. Canvas Terminal Dashboard with True Color
console.info('\n🖥️ 4. Canvas Terminal Dashboard with True Color');
console.info('─'.repeat(50));

// Simulate a canvas status dashboard using true color ANSI-16m
const canvasServices = [
    { name: "Bridge Service", status: "active", color: "#10B981", description: "Core communication layer" },
    { name: "Analytics Engine", status: "beta", color: "#EAB308", description: "Data processing pipeline" },
    { name: "Legacy Service", status: "deprecated", color: "#EF4444", description: "Legacy compatibility layer" },
    { name: "Experimental Feature", status: "experimental", color: "#8B5CF6", description: "Next-generation features" },
    { name: "API Gateway", status: "active", color: "#3B82F6", description: "External API interface" },
    { name: "Database", status: "active", color: "#10B981", description: "Primary data storage" },
    { name: "Cache Layer", status: "beta", color: "#F97316", description: "High-performance caching" },
    { name: "Monitor Service", status: "active", color: "#06B6D4", description: "System health monitoring" }
];

console.info('🌈 Canvas System Status Dashboard (24-bit True Color)');
console.info(''.padEnd(80, '═'));

canvasServices.forEach((service, index) => {
    const statusColor = Bun.color(service.color, "ansi-16m");
    const resetColor = "\u001b[0m";
    const dimColor = "\u001b[2m";
    const resetDim = "\u001b[22m";

    // Create status indicator with true color
    const indicator = `${statusColor}●${resetColor}`;

    // Format status line with true color
    const statusLine = `${index + 1}. ${indicator} ${service.name.padEnd(20)} ${service.status.padEnd(12)} ${service.color}`;
    const descLine = `    ${dimColor}${service.description}${resetDim}`;

    console.info(statusLine);
    console.info(descLine);
});

console.info(''.padEnd(80, '═'));

// 5. ANSI-16m vs Other Formats Comparison
console.info('\n🔍 5. ANSI-16m vs Other Formats Comparison');
console.info('─'.repeat(50));

const comparisonColors = ["#10B981", "#EAB308", "#EF4444", "#8B5CF6"];

console.info('Format comparison for canvas colors (showing true color advantage):');
comparisonColors.forEach((color, index) => {
    const ansi16m = Bun.color(color, "ansi-16m");
    const ansi = Bun.color(color, "ansi");
    const ansi256 = Bun.color(color, "ansi-256");
    const ansi16 = Bun.color(color, "ansi-16");

    console.info(`${index + 1}. ${color}:`);
    console.info(`    ANSI-16m (24-bit): ${JSON.stringify(ansi16m)} ⭐ True Color`);
    console.info(`    ANSI (24-bit):   ${JSON.stringify(ansi)} ⭐ True Color`);
    console.info(`    ANSI-256 (256):   ${JSON.stringify(ansi256)}   Approximated`);
    console.info(`    ANSI-16 (16):     ${JSON.stringify(ansi16)}     Limited`);
    console.info('');
});

// 6. Performance Test
console.info('⚡ 6. ANSI-16m Performance Test');
console.info('─'.repeat(50));

const iterations = 50000;
const testColor = "#10B981";

console.info(`Testing ANSI-16m format performance (${iterations} conversions):`);

const formats = [
    { name: "ANSI-16m (True Color)", format: "ansi-16m" },
    { name: "General ANSI (24-bit)", format: "ansi" },
    { name: "ANSI-256 (256-color)", format: "ansi-256" }
];

formats.forEach(format => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        Bun.color(testColor, format.format as any);
    }

    const duration = performance.now() - start;
    const opsPerSecond = Math.round(iterations / duration * 1000);

    console.info(`${format.name.padEnd(25)}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
});

// 7. True Color Applications
console.info('\n🎨 7. True Color Applications in Canvas');
console.info('─'.repeat(50));

console.info('📋 Real-world applications of ANSI-16m true color in canvas:');

// 7.1 Gradient Effects
console.info('✅ 1. Gradient Effects');
console.info('   • Smooth color transitions for progress bars');
console.info('   • Visual heat maps for performance metrics');
console.info('   • Beautiful status indicators with subtle variations');
console.info('');

// 7.2 Brand Consistency
console.info('✅ 2. Brand Consistency');
console.info('   • Exact brand color reproduction');
console.info('   • Corporate identity preservation');
console.info('   • Professional appearance across terminals');
console.info('');

// 7.3 Data Visualization
console.info('✅ 3. Data Visualization');
console.info('   • Precise color coding for data categories');
console.info('   • Accurate chart colors in terminal');
console.info('   • Scientific visualization with exact colors');
console.info('');

// 7.4 Accessibility
console.info('✅ 4. Accessibility');
console.info('   • High contrast ratios for readability');
console.info('   • Color-blind friendly palettes');
console.info('   • WCAG compliance in terminal output');
console.info('');

// 8. True Color RGB Analysis
console.info('🔬 8. True Color RGB Analysis');
console.info('─'.repeat(50));

// Analyze RGB precision for complex colors
const complexColors = [
    { name: "Canvas Green", hex: "#10B981", analysis: "Subtle green with blue tint" },
    { name: "Canvas Yellow", hex: "#EAB308", analysis: "Golden yellow with warmth" },
    { name: "Canvas Red", hex: "#EF4444", analysis: "Soft red with slight orange" },
    { name: "Canvas Purple", hex: "#8B5CF6", analysis: "Vibrant purple with blue dominance" },
    { name: "Sky Blue", hex: "#06B6D4", analysis: "Bright cyan with green undertones" },
    { name: "Amber", hex: "#F59E0B", analysis: "Warm amber with orange highlights" }
];

console.info('RGB precision analysis for complex canvas colors:');
complexColors.forEach((color, index) => {
    const ansi16m = Bun.color(color.hex, "ansi-16m");
    const rgba = Bun.color(color.hex, "{rgba}");

    if (typeof ansi16m === 'string' && rgba) {
        const rgbMatch = ansi16m.match(/\[38;2;(\d+);(\d+);(\d+)m/);
        if (rgbMatch) {
            const [_, r, g, b] = rgbMatch;
            console.info(`${index + 1}. ${color.name.padEnd(15)} ${color.hex.padEnd(8)} → RGB(${r}, ${g}, ${b})`);
            console.info(`    └─ ${color.analysis}`);
            console.info(`    └─ Brightness: ${Math.round((parseInt(r) + parseInt(g) + parseInt(b)) / 3 * 100 / 255)}%`);
        }
    }
    console.info('');
});

// 9. Terminal Compatibility for True Color
console.info('💻 9. Terminal Compatibility for True Color');
console.info('─'.repeat(50));

const terminalCompatibility = [
    { name: "Modern Terminal", support: "Full 24-bit true color", examples: "iTerm2, Windows Terminal, GNOME Terminal" },
    { name: "VS Code Terminal", support: "Full 24-bit true color", examples: "Integrated terminal support" },
    { name: "macOS Terminal.app", support: "Full 24-bit true color", examples: "Native macOS terminal" },
    { name: "Linux Terminal", support: "Most support 24-bit", examples: "Konsole, Tilix, Alacritty" },
    { name: "Windows Console", support: "Limited support", examples: "Legacy cmd.exe (fallback needed)" },
    { name: "SSH Sessions", support: "Depends on client", examples: "Client-dependent true color" }
];

console.info('True color compatibility across different terminals:');
terminalCompatibility.forEach((terminal, index) => {
    const supportLevel = terminal.support.includes("Full") ? "✅" :
        terminal.support.includes("Most") ? "⚠️" : "❌";

    console.info(`${index + 1}. ${supportLevel} ${terminal.name.padEnd(20)} ${terminal.support.padEnd(25)}`);
    console.info(`    └─ Examples: ${terminal.examples}`);
    console.info('');
});

// 10. Best Practices for True Color
console.info('🎯 10. Best Practices for True Color (ansi-16m)');
console.info('─'.repeat(50));

console.info('📋 Best practices for using ANSI-16m true color in canvas applications:');
console.info('');

console.info('✅ 1. Color Selection Strategy');
console.info('   • Use exact brand colors for consistency');
console.info('   • Ensure sufficient contrast for readability');
console.info('   • Test on multiple terminals for compatibility');
console.info('');

console.info('✅ 2. Performance Optimization');
console.info('   • Cache true color conversions for repeated use');
console.info('   • Use progressive enhancement (ansi-16m → ansi-256 → ansi-16)');
console.info('   • Batch color operations for efficiency');
console.info('');

console.info('✅ 3. Accessibility Considerations');
console.info('   • Verify WCAG contrast ratios');
console.info('   • Provide color-blind friendly alternatives');
console.info('   • Include non-color indicators (symbols, text)');
console.info('');

console.info('✅ 4. Fallback Strategy');
console.info('   • Detect terminal capabilities automatically');
console.info('   • Provide graceful degradation to 256-color');
console.info('   • Always functional with plain text fallback');
console.info('');

console.info('🎉 ANSI-16m True Color Format Demonstration Complete!');
console.info('🌈 Your canvas system perfectly leverages 24-bit true color terminal capabilities!');
