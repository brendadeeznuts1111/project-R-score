#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-color-rgba-hex-demonstration
 * 
 * Bun Color Rgba Hex Demonstration
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
 * RGBA Objects/Arrays & Hex Formats Demonstration
 * Shows how our canvas system uses these specific Bun.color capabilities
 */

import {
    normalizeColor,
    createColorMetadata,
    CANVAS_BRAND_COLORS
} from '../../src/types/canvas-color';

console.info('🎨 RGBA Objects/Arrays & Hex Formats Demonstration');
console.info('==================================================\n');

// Test colors for demonstration
const testColors = [
    "red",
    "hsl(0, 0%, 50%)",
    "#10B981",
    "rgba(255, 0, 0, 0.5)"
];

console.info('🎯 Testing RGBA Objects vs Arrays vs Hex Formats\n');

// 1. RGBA Objects - Component Extraction with CSS-like alpha
console.info('📋 1. RGBA Objects (CSS-like alpha: 0-1)');
console.info('─'.repeat(50));

testColors.forEach((color, index) => {
    const rgba = Bun.color(color, "{rgba}");
    const rgb = Bun.color(color, "{rgb}");

    console.info(`${index + 1}. ${color.padEnd(20)} → RGBA: ${JSON.stringify(rgba)}`);
    console.info(`    ${" ".repeat(20)} → RGB:  ${JSON.stringify(rgb)}`);

    if (rgba) {
        console.info(`    ${" ".repeat(20)} → Components: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);
    }
    console.info('');
});

// 2. RGBA Arrays - Typed Arrays with integer alpha (0-255)
console.info('📐 2. RGBA Arrays (Typed arrays: all values 0-255)');
console.info('─'.repeat(50));

testColors.forEach((color, index) => {
    const rgbaArray = Bun.color(color, "[rgba]");
    const rgbArray = Bun.color(color, "[rgb]");

    console.info(`${index + 1}. ${color.padEnd(20)} → RGBA: [${rgbaArray?.join(", ")}]`);
    console.info(`    ${" ".repeat(20)} → RGB:  [${rgbArray?.join(", ")}]`);

    if (rgbaArray) {
        console.info(`    ${" ".repeat(20)} → Alpha as integer: ${rgbaArray[3]} (0-255)`);
    }
    console.info('');
});

// 3. Hex Formats - Web Development
console.info('🌐 3. Hex Formats (Web Development)');
console.info('─'.repeat(50));

testColors.forEach((color, index) => {
    const hex = Bun.color(color, "hex");
    const hexUpper = Bun.color(color, "HEX");

    console.info(`${index + 1}. ${color.padEnd(20)} → hex: ${hex}`);
    console.info(`    ${" ".repeat(20)} → HEX: ${hexUpper}`);
    console.info('');
});

// 4. Canvas Color Analysis using RGBA Objects
console.info('🎨 4. Canvas Color Analysis (RGBA Objects)');
console.info('─'.repeat(50));

const canvasNodes = [
    { id: "service:bridge", color: "#10B981", name: "Bridge Service" },
    { id: "service:analytics", color: "#EAB308", name: "Analytics Engine" },
    { id: "service:deprecated", color: "#EF4444", name: "Legacy Service" },
    { id: "service:experimental", color: "rgba(139, 92, 246, 0.8)", name: "Experimental Feature" }
];

console.info('Analyzing canvas colors with RGBA object extraction:');
canvasNodes.forEach(node => {
    const rgba = Bun.color(node.color, "{rgba}");
    const hex = Bun.color(node.color, "hex");

    if (rgba && hex) {
        console.info(`\n${node.name} (${node.id}):`);
        console.info(`  Color: ${node.color} → ${hex}`);
        console.info(`  RGBA: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);
        console.info(`  Brightness: ${Math.round((rgba.r + rgba.g + rgba.b) / 3 * 100 / 255)}%`);
        console.info(`  Opacity: ${Math.round(rgba.a * 100)}%`);
    }
});

// 5. Image Generation using RGBA Arrays
console.info('\n📸 5. Image Generation (RGBA Arrays)');
console.info('─'.repeat(50));

console.info('Converting canvas colors to image data format:');
const imageData = canvasNodes.map(node => {
    const rgbaArray = Bun.color(node.color, "[rgba]");
    return {
        nodeId: node.id,
        pixelData: rgbaArray,
        description: `Pixel for ${node.name}`
    };
});

imageData.forEach(data => {
    if (data.pixelData) {
        console.info(`${data.nodeId.padEnd(20)}: [${data.pixelData.join(", ")}] - ${data.description}`);
    }
});

// 6. Web Component Integration using Hex
console.info('\n🌍 6. Web Component Integration (Hex Formats)');
console.info('─'.repeat(50));

console.info('Generating CSS variables for web components:');
const cssVariables = `
:root {
    /* Canvas brand colors as CSS variables */
    --canvas-primary: ${Bun.color(CANVAS_BRAND_COLORS.primary, "hex")};
    --canvas-secondary: ${Bun.color(CANVAS_BRAND_COLORS.secondary, "hex")};
    --canvas-accent: ${Bun.color(CANVAS_BRAND_COLORS.accent, "hex")};
    
    /* Status colors */
    --canvas-active: ${Bun.color(CANVAS_BRAND_COLORS.status.active, "hex")};
    --canvas-beta: ${Bun.color(CANVAS_BRAND_COLORS.status.beta, "hex")};
    --canvas-deprecated: ${Bun.color(CANVAS_BRAND_COLORS.status.deprecated, "hex")};
    --canvas-experimental: ${Bun.color(CANVAS_BRAND_COLORS.status.experimental, "hex")};
    
    /* Dynamic node colors */
${canvasNodes.map(node => {
    const hex = Bun.color(node.color, "hex");
    return `    --node-${node.id.replace(/[:]/g, '-')}: ${hex};`;
}).join('\n')}
}`;

console.info(cssVariables);

// 7. Accessibility Analysis using RGBA Objects
console.info('\n♿ 7. Accessibility Analysis (RGBA Objects)');
console.info('─'.repeat(50));

console.info('WCAG contrast ratio calculations:');

function calculateLuminance(rgba: { r: number, g: number, b: number }): number {
    // Convert RGB to relative luminance (WCAG formula)
    const rsRGB = rgba.r / 255;
    const gsRGB = rgba.g / 255;
    const bsRGB = rgba.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrast(color1: string, color2: string): number {
    const rgba1 = Bun.color(color1, "{rgba}");
    const rgba2 = Bun.color(color2, "{rgba}");

    if (!rgba1 || !rgba2) return 0;

    const lum1 = calculateLuminance(rgba1);
    const lum2 = calculateLuminance(rgba2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

canvasNodes.forEach(node => {
    const rgba = Bun.color(node.color, "{rgba}");
    if (rgba) {
        const whiteContrast = calculateContrast(node.color, "#ffffff");
        const blackContrast = calculateContrast(node.color, "#000000");

        console.info(`\n${node.name}:`);
        console.info(`  Color: ${node.color} (${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`);
        console.info(`  vs White: ${whiteContrast.toFixed(1)}:1 ${whiteContrast >= 4.5 ? '✅' : '❌'}`);
        console.info(`  vs Black: ${blackContrast.toFixed(1)}:1 ${blackContrast >= 4.5 ? '✅' : '❌'}`);
        console.info(`  Recommended text: ${whiteContrast > blackContrast ? 'Black' : 'White'}`);
    }
});

// 8. Performance Comparison
console.info('\n⚡ 8. Performance Comparison');
console.info('─'.repeat(50));

const iterations = 50000;
const testColor = "#10B981";

console.info(`Testing format conversion performance (${iterations} iterations):`);

const formats = [
    { name: "{rgba}", desc: "RGBA Object" },
    { name: "{rgb}", desc: "RGB Object" },
    { name: "[rgba]", desc: "RGBA Array" },
    { name: "[rgb]", desc: "RGB Array" },
    { name: "hex", desc: "Hex String" },
    { name: "HEX", desc: "HEX String" }
];

formats.forEach(format => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        Bun.color(testColor, format.name as any);
    }

    const duration = performance.now() - start;
    const opsPerSecond = Math.round(iterations / duration * 1000);

    console.info(`${format.desc.padEnd(15)}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
});

// 9. Canvas Integration Summary
console.info('\n🎯 9. Canvas Integration Summary');
console.info('─'.repeat(50));

console.info('📋 How our canvas system uses RGBA/Hex formats:');
console.info('');

console.info('🎨 RGBA Objects:');
console.info('   • Color component extraction for analysis');
console.info('   • WCAG accessibility calculations');
console.info('   • Brightness and opacity computations');
console.info('   • Color manipulation algorithms');
console.info('');

console.info('📐 RGBA Arrays:');
console.info('   • Image data generation for canvas rendering');
console.info('   • Typed array processing for performance');
console.info('   • Pixel manipulation for visual effects');
console.info('   • Buffer operations for file I/O');
console.info('');

console.info('🌐 Hex Formats:');
console.info('   • CSS variable generation for web components');
console.info('   • HTML color attributes for UI elements');
console.info('   • Cross-platform color compatibility');
console.info('   • Configuration file storage');
console.info('');

console.info('🎉 All RGBA and hex formats fully integrated into canvas system!');
console.info('🚀 Your canvas leverages the complete power of Bun.color component extraction!');
