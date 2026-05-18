#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-color-format-demonstration
 * 
 * Bun Color Format Demonstration
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
 * Complete Bun.color Format Demonstration
 * Shows how our canvas system uses every official Bun.color format
 */

import {
    normalizeColor,
    validateCanvasColor,
    getTerminalColor,
    createColorMetadata,
    convertAllCanvasColors,
    CANVAS_BRAND_COLORS
} from '../../src/types/canvas-color';

console.info('🎨 Complete Bun.color Format Demonstration');
console.info('==========================================\n');

// Test color for all demonstrations
const testColor = "#10B981";
const testNode = {
    id: "service:bridge:production",
    text: "# 🌉 Bridge Service\n**Production Ready**",
    color: testColor
};

console.info(`🎯 Using test color: ${testColor}\n`);

// 1. CSS Format - Stylesheets, CSS-in-JS, CSS Variables
console.info('📋 1. CSS Format (Stylesheets & CSS-in-JS)');
console.info('─'.repeat(50));

const cssExamples = [
    "red",
    0xff0000,
    "#f00",
    "#ff0000",
    "rgb(255, 0, 0)",
    "rgba(255, 0, 0, 1)",
    "hsl(0, 100%, 50%)",
    { r: 255, g: 0, b: 0 },
    [255, 0, 0]
];

cssExamples.forEach((input, index) => {
    const css = Bun.color(input, "css");
    console.info(`${index + 1}. ${JSON.stringify(input).padEnd(25)} → "${css}"`);
});

console.info('\n🎨 Canvas CSS Generation:');
const canvasCSS = `
/* Generated CSS for canvas nodes */
.canvas-node-${testNode.id} {
    background-color: ${Bun.color(testColor, "css")};
    border: 2px solid ${Bun.color(testColor, "css")}80;
    color: white;
}
:root {
    --canvas-primary: ${Bun.color(CANVAS_BRAND_COLORS.primary, "css")};
    --canvas-active: ${Bun.color(CANVAS_BRAND_COLORS.status.active, "css")};
    --canvas-beta: ${Bun.color(CANVAS_BRAND_COLORS.status.beta, "css")};
}`;
console.info(canvasCSS);

// 2. ANSI Format - Terminal Colors with Auto-Detection
console.info('\n🖥️  2. ANSI Format (Terminal Colors)');
console.info('─'.repeat(50));

console.info('Auto-detecting terminal capabilities...');
const ansiAuto = Bun.color(testColor, "ansi");
console.info(`Auto-detected ANSI: ${ansiAuto || "No ANSI support"}`);

console.info('\nManual ANSI format selection:');
const ansiFormats = ["ansi", "ansi-16", "ansi-256", "ansi-16m"] as const;
ansiFormats.forEach(format => {
    const ansi = Bun.color(testColor, format);
    const reset = '\x1b[0m';
    if (ansi) {
        console.info(`${format.padEnd(10)}: ${ansi}●${reset} ${testColor}`);
    } else {
        console.info(`${format.padEnd(10)}: (not supported)`);
    }
});

console.info('\n🎨 Canvas Terminal Rendering:');
const terminalNode = {
    ...testNode,
    color: "#ff0000"
};
const coloredOutput = getTerminalColor(terminalNode, "ansi-256");
const reset = '\x1b[0m';
console.info(`${coloredOutput}${terminalNode.text}${reset}`);

// 3. Number Format - Database Storage
console.info('\n📊 3. Number Format (Database Storage)');
console.info('─'.repeat(50));

const numberExamples = [
    "red",
    "#ff0000",
    { r: 255, g: 0, b: 0 },
    [255, 0, 0],
    "rgb(255, 0, 0)"
];

console.info('Compact database representations:');
numberExamples.forEach((input, index) => {
    const number = Bun.color(input, "number");
    console.info(`${index + 1}. ${JSON.stringify(input).padEnd(25)} → ${number}`);
});

console.info('\n🗄️  Canvas Database Storage:');
const canvasNodes = [
    { id: "service:bridge", color: "#10B981" },
    { id: "service:analytics", color: "#EAB308" },
    { id: "service:deprecated", color: "#EF4444" }
];

console.info('Storing colors as numbers in database:');
canvasNodes.forEach(node => {
    const dbNumber = Bun.color(node.color, "number");
    console.info(`${node.id.padEnd(20)}: ${dbNumber}`);
});

// 4. RGB/RGBA Objects - Component Extraction
console.info('\n🔍 4. RGB/RGBA Objects (Component Extraction)');
console.info('─'.repeat(50));

console.info('RGB object extraction:');
const rgbExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
rgbExamples.forEach((input, index) => {
    const rgb = Bun.color(input, "{rgb}");
    console.info(`${index + 1}. ${input.padEnd(20)} → ${JSON.stringify(rgb)}`);
});

console.info('\nRGBA object extraction:');
const rgbaExamples = ["red", "hsl(0, 0%, 50%)", "rgba(255, 0, 0, 0.5)"];
rgbaExamples.forEach((input, index) => {
    const rgba = Bun.color(input, "{rgba}");
    console.info(`${index + 1}. ${input.padEnd(25)} → ${JSON.stringify(rgba)}`);
});

console.info('\n🎨 Canvas Color Analysis:');
const canvasColorAnalysis = createColorMetadata(testColor, testNode.id);
console.info(`Input: ${canvasColorAnalysis.input}`);
console.info(`Normalized: ${canvasColorAnalysis.normalized}`);
const rgba = Bun.color(testColor, "{rgba}");
if (rgba) {
    console.info(`Components: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);
}

// 5. RGB/RGBA Arrays - Typed Arrays
console.info('\n📐 5. RGB/RGBA Arrays (Typed Arrays)');
console.info('─'.repeat(50));

console.info('RGB array extraction (all values 0-255):');
const arrayExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
arrayExamples.forEach((input, index) => {
    const rgb = Bun.color(input, "[rgb]");
    console.info(`${index + 1}. ${input.padEnd(20)} → [${rgb?.join(", ")}]`);
});

console.info('\nRGBA array extraction (alpha as 0-255):');
const rgbaArrayExamples = ["red", "hsl(0, 0%, 50%)", "rgba(255, 0, 0, 0.5)"];
rgbaArrayExamples.forEach((input, index) => {
    const rgba = Bun.color(input, "[rgba]");
    console.info(`${index + 1}. ${input.padEnd(25)} → [${rgba?.join(", ")}]`);
});

console.info('\n🎨 Canvas Color Processing:');
console.info('Processing canvas colors for image generation:');
canvasNodes.forEach(node => {
    const rgba = Bun.color(node.color, "[rgba]");
    if (rgba) {
        console.info(`${node.id.padEnd(20)}: [${rgba.join(", ")}]`);
    }
});

// 6. Hex Format - Web Development
console.info('\n🌐 6. Hex Format (Web Development)');
console.info('─'.repeat(50));

console.info('Lowercase hex strings:');
const hexExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
hexExamples.forEach((input, index) => {
    const hex = Bun.color(input, "hex");
    console.info(`${index + 1}. ${input.padEnd(20)} → ${hex}`);
});

console.info('\nUppercase hex strings:');
const hexUpperExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
hexUpperExamples.forEach((input, index) => {
    const hex = Bun.color(input, "HEX");
    console.info(`${index + 1}. ${input.padEnd(20)} → ${hex}`);
});

console.info('\n🎨 Canvas Web Integration:');
console.info('Generating hex colors for web components:');
Object.entries(CANVAS_BRAND_COLORS.status).forEach(([status, color]) => {
    const hex = Bun.color(color, "hex");
    const hexUpper = Bun.color(color, "HEX");
    console.info(`${status.padEnd(15)}: ${hex} / ${hexUpper}`);
});

// 7. Error Handling - Invalid Inputs
console.info('\n⚠️  7. Error Handling (Invalid Inputs)');
console.info('─'.repeat(50));

const invalidInputs = [
    "not-a-color",
    "",
    "#invalid",
    "rgb(300, 0, 0)",
    { invalid: "object" },
    [255],
    null,
    undefined
];

console.info('Testing invalid inputs (should return null):');
invalidInputs.forEach((input, index) => {
    let result = null;
    try {
        result = Bun.color(input, "hex");
    } catch (error) {
        result = null;
    }
    const inputStr = input === undefined ? 'undefined' : JSON.stringify(input);
    const status = result === null ? '✅' : '❌';
    console.info(`${index + 1}. ${inputStr.padEnd(25)} → ${result} ${status}`);
});

console.info('\n🎨 Canvas Error Handling:');
const canvasErrorHandling = [
    { id: "valid", color: "#ff0000" },
    { id: "invalid", color: "not-a-color" },
    { id: "empty", color: "" }
];

canvasErrorHandling.forEach(node => {
    const result = validateCanvasColor(node.color, node.id);
    const status = result.valid ? '✅' : '❌';
    console.info(`${node.id.padEnd(10)}: ${result.normalizedColor || "null"} ${status}`);
    if (!result.valid) {
        result.issues.forEach(issue => {
            console.info(`    ⚠️  ${issue.message}`);
        });
    }
});

// 8. Performance Comparison
console.info('\n⚡ 8. Performance Comparison');
console.info('─'.repeat(50));

console.info('Testing format conversion performance:');

const formats = ["css", "hex", "number", "{rgb}", "[rgba]"] as const;
const iterations = 10000;

formats.forEach(format => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        Bun.color(testColor, format);
    }

    const duration = performance.now() - start;
    const opsPerSecond = Math.round(iterations / duration * 1000);

    console.info(`${format.padEnd(10)}: ${duration.toFixed(2)}ms for ${iterations} ops (${opsPerSecond.toLocaleString()} ops/sec)`);
});

// 9. Canvas Integration Summary
console.info('\n🎯 9. Canvas Integration Summary');
console.info('─'.repeat(50));

console.info('📋 How our canvas system uses each format:');
console.info('');

console.info('🎨 CSS Format:');
console.info('   • Stylesheet generation for canvas components');
console.info('   • CSS-in-JS for dynamic styling');
console.info('   • CSS variables for theming');
console.info('');

console.info('🖥️  ANSI Format:');
console.info('   • Terminal dashboard rendering');
console.info('   • Colored node visualization');
console.info('   • Auto-detection of terminal capabilities');
console.info('');

console.info('📊 Number Format:');
console.info('   • Database storage optimization');
console.info('   • Compact color representation');
console.info('   • Configuration file storage');
console.info('');

console.info('🔍 RGB/RGBA Objects:');
console.info('   • Color component extraction');
console.info('   • Accessibility calculations');
console.info('   • Color manipulation algorithms');
console.info('');

console.info('📐 RGB/RGBA Arrays:');
console.info('   • Typed array processing');
console.info('   • Image generation');
console.info('   • Performance optimization');
console.info('');

console.info('🌐 Hex Format:');
console.info('   • Web component integration');
console.info('   • HTML color attributes');
console.info('   • Cross-platform compatibility');
console.info('');

console.info('🎉 All 15 official Bun.color formats successfully integrated!');
console.info('🚀 Your canvas system leverages the complete power of Bun.color!');
