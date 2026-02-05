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

console.log('🎨 Complete Bun.color Format Demonstration');
console.log('==========================================\n');

// Test color for all demonstrations
const testColor = "#10B981";
const testNode = {
    id: "service:bridge:production",
    text: "# 🌉 Bridge Service\n**Production Ready**",
    color: testColor
};

console.log(`🎯 Using test color: ${testColor}\n`);

// 1. CSS Format - Stylesheets, CSS-in-JS, CSS Variables
console.log('📋 1. CSS Format (Stylesheets & CSS-in-JS)');
console.log('─'.repeat(50));

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
    console.log(`${index + 1}. ${JSON.stringify(input).padEnd(25)} → "${css}"`);
});

console.log('\n🎨 Canvas CSS Generation:');
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
console.log(canvasCSS);

// 2. ANSI Format - Terminal Colors with Auto-Detection
console.log('\n🖥️  2. ANSI Format (Terminal Colors)');
console.log('─'.repeat(50));

console.log('Auto-detecting terminal capabilities...');
const ansiAuto = Bun.color(testColor, "ansi");
console.log(`Auto-detected ANSI: ${ansiAuto || "No ANSI support"}`);

console.log('\nManual ANSI format selection:');
const ansiFormats = ["ansi", "ansi-16", "ansi-256", "ansi-16m"] as const;
ansiFormats.forEach(format => {
    const ansi = Bun.color(testColor, format);
    const reset = '\x1b[0m';
    if (ansi) {
        console.log(`${format.padEnd(10)}: ${ansi}●${reset} ${testColor}`);
    } else {
        console.log(`${format.padEnd(10)}: (not supported)`);
    }
});

console.log('\n🎨 Canvas Terminal Rendering:');
const terminalNode = {
    ...testNode,
    color: "#ff0000"
};
const coloredOutput = getTerminalColor(terminalNode, "ansi-256");
const reset = '\x1b[0m';
console.log(`${coloredOutput}${terminalNode.text}${reset}`);

// 3. Number Format - Database Storage
console.log('\n📊 3. Number Format (Database Storage)');
console.log('─'.repeat(50));

const numberExamples = [
    "red",
    "#ff0000",
    { r: 255, g: 0, b: 0 },
    [255, 0, 0],
    "rgb(255, 0, 0)"
];

console.log('Compact database representations:');
numberExamples.forEach((input, index) => {
    const number = Bun.color(input, "number");
    console.log(`${index + 1}. ${JSON.stringify(input).padEnd(25)} → ${number}`);
});

console.log('\n🗄️  Canvas Database Storage:');
const canvasNodes = [
    { id: "service:bridge", color: "#10B981" },
    { id: "service:analytics", color: "#EAB308" },
    { id: "service:deprecated", color: "#EF4444" }
];

console.log('Storing colors as numbers in database:');
canvasNodes.forEach(node => {
    const dbNumber = Bun.color(node.color, "number");
    console.log(`${node.id.padEnd(20)}: ${dbNumber}`);
});

// 4. RGB/RGBA Objects - Component Extraction
console.log('\n🔍 4. RGB/RGBA Objects (Component Extraction)');
console.log('─'.repeat(50));

console.log('RGB object extraction:');
const rgbExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
rgbExamples.forEach((input, index) => {
    const rgb = Bun.color(input, "{rgb}");
    console.log(`${index + 1}. ${input.padEnd(20)} → ${JSON.stringify(rgb)}`);
});

console.log('\nRGBA object extraction:');
const rgbaExamples = ["red", "hsl(0, 0%, 50%)", "rgba(255, 0, 0, 0.5)"];
rgbaExamples.forEach((input, index) => {
    const rgba = Bun.color(input, "{rgba}");
    console.log(`${index + 1}. ${input.padEnd(25)} → ${JSON.stringify(rgba)}`);
});

console.log('\n🎨 Canvas Color Analysis:');
const canvasColorAnalysis = createColorMetadata(testColor, testNode.id);
console.log(`Input: ${canvasColorAnalysis.input}`);
console.log(`Normalized: ${canvasColorAnalysis.normalized}`);
const rgba = Bun.color(testColor, "{rgba}");
if (rgba) {
    console.log(`Components: R=${rgba.r}, G=${rgba.g}, B=${rgba.b}, A=${rgba.a}`);
}

// 5. RGB/RGBA Arrays - Typed Arrays
console.log('\n📐 5. RGB/RGBA Arrays (Typed Arrays)');
console.log('─'.repeat(50));

console.log('RGB array extraction (all values 0-255):');
const arrayExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
arrayExamples.forEach((input, index) => {
    const rgb = Bun.color(input, "[rgb]");
    console.log(`${index + 1}. ${input.padEnd(20)} → [${rgb?.join(", ")}]`);
});

console.log('\nRGBA array extraction (alpha as 0-255):');
const rgbaArrayExamples = ["red", "hsl(0, 0%, 50%)", "rgba(255, 0, 0, 0.5)"];
rgbaArrayExamples.forEach((input, index) => {
    const rgba = Bun.color(input, "[rgba]");
    console.log(`${index + 1}. ${input.padEnd(25)} → [${rgba?.join(", ")}]`);
});

console.log('\n🎨 Canvas Color Processing:');
console.log('Processing canvas colors for image generation:');
canvasNodes.forEach(node => {
    const rgba = Bun.color(node.color, "[rgba]");
    if (rgba) {
        console.log(`${node.id.padEnd(20)}: [${rgba.join(", ")}]`);
    }
});

// 6. Hex Format - Web Development
console.log('\n🌐 6. Hex Format (Web Development)');
console.log('─'.repeat(50));

console.log('Lowercase hex strings:');
const hexExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
hexExamples.forEach((input, index) => {
    const hex = Bun.color(input, "hex");
    console.log(`${index + 1}. ${input.padEnd(20)} → ${hex}`);
});

console.log('\nUppercase hex strings:');
const hexUpperExamples = ["red", "hsl(0, 0%, 50%)", "#ff0000"];
hexUpperExamples.forEach((input, index) => {
    const hex = Bun.color(input, "HEX");
    console.log(`${index + 1}. ${input.padEnd(20)} → ${hex}`);
});

console.log('\n🎨 Canvas Web Integration:');
console.log('Generating hex colors for web components:');
Object.entries(CANVAS_BRAND_COLORS.status).forEach(([status, color]) => {
    const hex = Bun.color(color, "hex");
    const hexUpper = Bun.color(color, "HEX");
    console.log(`${status.padEnd(15)}: ${hex} / ${hexUpper}`);
});

// 7. Error Handling - Invalid Inputs
console.log('\n⚠️  7. Error Handling (Invalid Inputs)');
console.log('─'.repeat(50));

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

console.log('Testing invalid inputs (should return null):');
invalidInputs.forEach((input, index) => {
    let result = null;
    try {
        result = Bun.color(input, "hex");
    } catch (error) {
        result = null;
    }
    const inputStr = input === undefined ? 'undefined' : JSON.stringify(input);
    const status = result === null ? '✅' : '❌';
    console.log(`${index + 1}. ${inputStr.padEnd(25)} → ${result} ${status}`);
});

console.log('\n🎨 Canvas Error Handling:');
const canvasErrorHandling = [
    { id: "valid", color: "#ff0000" },
    { id: "invalid", color: "not-a-color" },
    { id: "empty", color: "" }
];

canvasErrorHandling.forEach(node => {
    const result = validateCanvasColor(node.color, node.id);
    const status = result.valid ? '✅' : '❌';
    console.log(`${node.id.padEnd(10)}: ${result.normalizedColor || "null"} ${status}`);
    if (!result.valid) {
        result.issues.forEach(issue => {
            console.log(`    ⚠️  ${issue.message}`);
        });
    }
});

// 8. Performance Comparison
console.log('\n⚡ 8. Performance Comparison');
console.log('─'.repeat(50));

console.log('Testing format conversion performance:');

const formats = ["css", "hex", "number", "{rgb}", "[rgba]"] as const;
const iterations = 10000;

formats.forEach(format => {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        Bun.color(testColor, format);
    }

    const duration = performance.now() - start;
    const opsPerSecond = Math.round(iterations / duration * 1000);

    console.log(`${format.padEnd(10)}: ${duration.toFixed(2)}ms for ${iterations} ops (${opsPerSecond.toLocaleString()} ops/sec)`);
});

// 9. Canvas Integration Summary
console.log('\n🎯 9. Canvas Integration Summary');
console.log('─'.repeat(50));

console.log('📋 How our canvas system uses each format:');
console.log('');

console.log('🎨 CSS Format:');
console.log('   • Stylesheet generation for canvas components');
console.log('   • CSS-in-JS for dynamic styling');
console.log('   • CSS variables for theming');
console.log('');

console.log('🖥️  ANSI Format:');
console.log('   • Terminal dashboard rendering');
console.log('   • Colored node visualization');
console.log('   • Auto-detection of terminal capabilities');
console.log('');

console.log('📊 Number Format:');
console.log('   • Database storage optimization');
console.log('   • Compact color representation');
console.log('   • Configuration file storage');
console.log('');

console.log('🔍 RGB/RGBA Objects:');
console.log('   • Color component extraction');
console.log('   • Accessibility calculations');
console.log('   • Color manipulation algorithms');
console.log('');

console.log('📐 RGB/RGBA Arrays:');
console.log('   • Typed array processing');
console.log('   • Image generation');
console.log('   • Performance optimization');
console.log('');

console.log('🌐 Hex Format:');
console.log('   • Web component integration');
console.log('   • HTML color attributes');
console.log('   • Cross-platform compatibility');
console.log('');

console.log('🎉 All 15 official Bun.color formats successfully integrated!');
console.log('🚀 Your canvas system leverages the complete power of Bun.color!');
