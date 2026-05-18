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

console.info('🎨 Bun.color Integration Demo\n');

// Demo 1: Color Normalization
console.info('📊 1. Color Normalization (100+ formats → HEX)');
console.info('─'.repeat(60));

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
    console.info(`${index + 1}. ${JSON.stringify(color)} → ${normalized}`);
});

// Demo 2: Terminal Color Generation
console.info('\n🖥️  2. Terminal Color Generation');
console.info('─'.repeat(60));

const terminalColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
const formats = ['ansi', 'ansi-16', 'ansi-256', 'ansi-16m'] as const;

formats.forEach(format => {
    console.info(`\n${format.toUpperCase()} format:`);
    terminalColors.forEach(color => {
        const ansi = getTerminalColor({ color }, format);
        const reset = '\x1b[0m';
        console.info(`  ${ansi}●${reset} ${color} → ${ansi.replace(/\x1b\[/g, '\\x1b[')}${reset}`);
    });
});

// Demo 3: Color Validation
console.info('\n✅ 3. Color Validation & Accessibility');
console.info('─'.repeat(60));

const validationTests = [
    { color: '#10B981', name: 'Brand Green (Good)' },
    { color: '#ffff00', name: 'Yellow (Poor Contrast)' },
    { color: '#ff00ff', name: 'Magenta (Non-Brand)' },
    { color: '1', name: 'Legacy Blue' },
    { color: 'invalid-color', name: 'Invalid Color' }
];

validationTests.forEach(({ color, name }) => {
    console.info(`\n${name}:`);
    const result = validateCanvasColor(color, 'demo:node');

    if (result.valid) {
        console.info(`  ✅ Valid: ${result.normalizedColor}`);
        if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                console.info(`  ⚠️  ${warning.category}: ${warning.message}`);
            });
        }
    } else {
        console.info(`  ❌ Invalid: ${result.issues[0]?.message}`);
    }
});

// Demo 4: Enhanced Metadata
console.info('\n📋 4. Enhanced Color Metadata');
console.info('─'.repeat(60));

const metadataDemo = createColorMetadata('#10B981', 'demo:node');
console.info('Color Metadata for #10B981:');
console.info(`  Input: ${metadataDemo.input}`);
console.info(`  Normalized: ${metadataDemo.normalized}`);
console.info(`  Contrast Ratio: ${metadataDemo.metadata.contrastRatio.toFixed(1)}:1`);
console.info(`  Accessible: ${metadataDemo.metadata.isAccessible ? '✅' : '❌'}`);
console.info(`  Terminal Support:`);
console.info(`    ANSI-16: ${metadataDemo.metadata.terminalSupport.ansi16 ? '✅' : '❌'}`);
console.info(`    ANSI-256: ${metadataDemo.metadata.terminalSupport.ansi256 ? '✅' : '❌'}`);
console.info(`    ANSI-16m: ${metadataDemo.metadata.terminalSupport.ansi16m ? '✅' : '❌'}`);

// Demo 5: Canvas Node Rendering
console.info('\n🎨 5. Canvas Node Rendering');
console.info('─'.repeat(60));

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

console.info('Compact Rendering:');
demoNodes.forEach(node => {
    const rendered = renderColoredNode(node, { compact: true });
    console.info(`  ${rendered}`);
});

console.info('\nFull Rendering:');
demoNodes.forEach(node => {
    const rendered = renderColoredNode(node, { compact: false });
    console.info(`  ${rendered}`);
});

// Demo 6: Brand Color Palette
console.info('\n🏷️  6. Brand Color Palette');
console.info('─'.repeat(60));

console.info('Brand Colors with Terminal Output:');
Object.entries(CANVAS_BRAND_COLORS).forEach(([category, colors]) => {
    console.info(`\n${category}:`);
    if (typeof colors === 'string') {
        const ansi = getTerminalColor({ color: colors }, 'ansi-256');
        const reset = '\x1b[0m';
        console.info(`  ${ansi}●${reset} ${colors}`);
    } else {
        Object.entries(colors).forEach(([name, color]) => {
            const ansi = getTerminalColor({ color }, 'ansi-256');
            const reset = '\x1b[0m';
            console.info(`  ${ansi}●${reset} ${name}: ${color}`);
        });
    }
});

// Demo 7: Legacy Color Migration
console.info('\n🔄 7. Legacy Color Migration');
console.info('─'.repeat(60));

console.info('Legacy Color Code Mapping:');
Object.entries(LEGACY_COLOR_MAP).forEach(([legacy, modern]) => {
    const ansi = getTerminalColor({ color: modern }, 'ansi-256');
    const reset = '\x1b[0m';
    console.info(`  ${ansi}●${reset} "${legacy}" → ${modern}`);
});

// Demo 8: Batch Processing
console.info('\n⚡ 8. Batch Color Processing');
console.info('─'.repeat(60));

const demoCanvas = {
    nodes: demoNodes.map(node => ({ id: node.id, color: node.color }))
};

console.info('Converting all canvas colors to different formats:');
const formats_to_test = ['hex', 'rgb', 'hsl', 'number'] as const;

formats_to_test.forEach(format => {
    console.info(`\n${format.toUpperCase()} format:`);
    const conversions = convertAllCanvasColors(demoCanvas, format);
    conversions.forEach((converted, nodeId) => {
        if (converted) {
            console.info(`  ${nodeId}: ${converted}`);
        }
    });
});

// Performance Demo
console.info('\n🚀 9. Performance Testing');
console.info('─'.repeat(60));

const start = performance.now();

// Process 1000 colors
for (let i = 0; i < 1000; i++) {
    normalizeColor(`hsl(${i % 360}, 100%, 50%)`);
}

const duration = performance.now() - start;
console.info(`✅ Processed 1000 colors in ${duration.toFixed(2)}ms`);
console.info(`📊 Performance: ${(1000 / duration * 1000).toFixed(0)} colors/second`);

console.info('\n🎉 Bun.color Integration Demo Complete!');
console.info('📚 See docs/BUN_COLOR_INTEGRATION_GUIDE.md for full documentation');
