#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][COLOR][SCOPE][BUN][META][INTEGRATION][#REF]bun-color-demo
 * 
 * Bun.color Integration Demo
 * Demonstrates the key features of the enhanced canvas color system
 * 
 * @fileoverview Comprehensive color system demonstration with accessibility analysis
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 * @category demos
 * @tags color-demo,bun-color,ansi,hex,rgba,accessibility,canvas-integration
 */

import {
    normalizeColor,
    validateCanvasColor,
    getTerminalColor,
    createColorMetadata,
    convertAllCanvasColors,
    renderColoredNode,
    CANVAS_BRAND_COLORS,
    LEGACY_COLOR_MAP
} from '../../src/types/canvas-color.js';

console.log('🎨 Bun.color Integration Demo\n');

// Demo 1: Color Normalization
console.log('📊 1. Color Normalization (100+ formats → HEX)');
console.log('─'.repeat(60));

const testColors = [
    'red',
    '#f00',
    'rgb(255, 0, 0)',
    'hsl(0, 100%, 50%)',
    0xff0000,
    { r: 255, g: 0, b: 0 },
    [255, 0, 0]
];

testColors.forEach((color, index) => {
    const normalized = normalizeColor(color as any);
    console.log(`${index + 1}. ${JSON.stringify(color)} → ${normalized}`);
});

// Demo 2: Terminal Color Generation
console.log('\n🖥️  2. Terminal Color Generation');
console.log('─'.repeat(60));

const terminalColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
const formats = ['ansi', 'ansi-16', 'ansi-256', 'ansi-16m'] as const;

formats.forEach(format => {
    console.log(`\n${format.toUpperCase()} format:`);
    terminalColors.forEach(color => {
        const ansi = getTerminalColor({ color }, format);
        const reset = '\x1b[0m';
        console.log(`  ${ansi}●${reset} ${color} → ${ansi.replace(/\x1b\[/g, '\\x1b[')}${reset}`);
    });
});

// Demo 3: Color Validation
console.log('\n✅ 3. Color Validation & Accessibility');
console.log('─'.repeat(60));

const validationTests = [
    { color: '#10B981', name: 'Brand Green (Good)' },
    { color: '#ffff00', name: 'Yellow (Poor Contrast)' },
    { color: '#ff00ff', name: 'Magenta (Non-Brand)' },
    { color: '1', name: 'Legacy Blue' },
    { color: 'invalid-color', name: 'Invalid Color' }
];

validationTests.forEach(({ color, name }) => {
    console.log(`\n${name}:`);
    const result = validateCanvasColor(color, 'demo:node');

    if (result.valid) {
        console.log(`  ✅ Valid: ${result.normalizedColor}`);
        if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                console.log(`  ⚠️  ${warning.category}: ${warning.message}`);
            });
        }
    } else {
        console.log(`  ❌ Invalid: ${result.issues[0]?.message}`);
    }
});

// Demo 4: Enhanced Metadata
console.log('\n📋 4. Enhanced Color Metadata');
console.log('─'.repeat(60));

const metadataDemo = createColorMetadata('#10B981', 'demo:node');
console.log('Color Metadata for #10B981:');
console.log(`  Input: ${metadataDemo.input}`);
console.log(`  Normalized: ${metadataDemo.normalized}`);
console.log(`  Contrast Ratio: ${metadataDemo.metadata.contrastRatio.toFixed(1)}:1`);
console.log(`  Accessible: ${metadataDemo.metadata.isAccessible ? '✅' : '❌'}`);
console.log(`  Terminal Support:`);
console.log(`    ANSI-16: ${metadataDemo.metadata.terminalSupport.ansi16 ? '✅' : '❌'}`);
console.log(`    ANSI-256: ${metadataDemo.metadata.terminalSupport.ansi256 ? '✅' : '❌'}`);
console.log(`    ANSI-16m: ${metadataDemo.metadata.terminalSupport.ansi16m ? '✅' : '❌'}`);

// Demo 5: Canvas Node Rendering
console.log('\n🎨 5. Canvas Node Rendering');
console.log('─'.repeat(60));

const demoNodes = [
    {
        id: 'service:bridge:production',
        text: '# 🌉 Bridge Service\n**Production Ready**',
        color: '#10B981'
    },
    {
        id: 'integration:validation:system',
        text: '# 🔧 Validation System\n**Deprecated**',
        color: '#EF4444'
    },
    {
        id: 'service:analytics:engine',
        text: '# 📊 Analytics Engine\n**Beta Testing**',
        color: '#EAB308'
    }
];

console.log('Compact Rendering:');
demoNodes.forEach(node => {
    const rendered = renderColoredNode(node, { compact: true });
    console.log(`  ${rendered}`);
});

console.log('\nFull Rendering:');
demoNodes.forEach(node => {
    const rendered = renderColoredNode(node, { compact: false });
    console.log(`  ${rendered}`);
});

// Demo 6: Brand Color Palette
console.log('\n🏷️  6. Brand Color Palette');
console.log('─'.repeat(60));

console.log('Brand Colors with Terminal Output:');
Object.entries(CANVAS_BRAND_COLORS).forEach(([category, colors]) => {
    console.log(`\n${category}:`);
    if (typeof colors === 'string') {
        const ansi = getTerminalColor({ color: colors }, 'ansi-256');
        const reset = '\x1b[0m';
        console.log(`  ${ansi}●${reset} ${colors}`);
    } else {
        Object.entries(colors).forEach(([name, color]) => {
            const ansi = getTerminalColor({ color }, 'ansi-256');
            const reset = '\x1b[0m';
            console.log(`  ${ansi}●${reset} ${name}: ${color}`);
        });
    }
});

// Demo 7: Legacy Color Migration
console.log('\n🔄 7. Legacy Color Migration');
console.log('─'.repeat(60));

console.log('Legacy Color Code Mapping:');
Object.entries(LEGACY_COLOR_MAP).forEach(([legacy, modern]) => {
    const ansi = getTerminalColor({ color: modern }, 'ansi-256');
    const reset = '\x1b[0m';
    console.log(`  ${ansi}●${reset} "${legacy}" → ${modern}`);
});

// Demo 8: Batch Processing
console.log('\n⚡ 8. Batch Color Processing');
console.log('─'.repeat(60));

const demoCanvas = {
    nodes: demoNodes.map(node => ({ id: node.id, color: node.color }))
};

console.log('Converting all canvas colors to different formats:');
const formats_to_test = ['hex', 'rgb', 'hsl', 'number'] as const;

formats_to_test.forEach(format => {
    console.log(`\n${format.toUpperCase()} format:`);
    const conversions = convertAllCanvasColors(demoCanvas, format);
    conversions.forEach((converted, nodeId) => {
        if (converted) {
            console.log(`  ${nodeId}: ${converted}`);
        }
    });
});

// Performance Demo
console.log('\n🚀 9. Performance Testing');
console.log('─'.repeat(60));

const start = performance.now();

// Process 1000 colors
for (let i = 0; i < 1000; i++) {
    normalizeColor(`hsl(${i % 360}, 100%, 50%)`);
}

const duration = performance.now() - start;
console.log(`✅ Processed 1000 colors in ${duration.toFixed(2)}ms`);
console.log(`📊 Performance: ${(1000 / duration * 1000).toFixed(0)} colors/second`);

console.log('\n🎉 Bun.color Integration Demo Complete!');
console.log('📚 See docs/BUN_COLOR_INTEGRATION_GUIDE.md for full documentation');
