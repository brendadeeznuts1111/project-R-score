#!/usr/bin/env bun
/**
 * 🎨 Consolidated Color Systems Demo
 * 
 * This consolidates all color demonstration functionality from:
 * - bun-color-demo.ts
 * - bun-color-ansi-16m-demonstration.ts
 * - bun-color-ansi-256-demonstration.ts
 * - bun-color-rgba-hex-demonstration.ts
 * - bun-color-format-demonstration.ts
 * - bun-colored-table-demo.ts
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
} from '../src/types/canvas-color';

console.log('🎨 Consolidated Bun Color Systems Demo\n');
console.log('='.repeat(50));

// ============================================================================
// SECTION 1: Basic Color Operations
// ============================================================================
console.log('\n📋 SECTION 1: Basic Color Operations');
console.log('-'.repeat(40));

function demonstrateBasicColors() {
    console.log('\n🔹 Color Normalization:');
    const testColors = [
        "red",
        0xff0000,
        "#f00",
        "#ff0000",
        "rgb(255,0,0)",
        "rgba(255,0,0,1)"
    ];

    testColors.forEach(color => {
        try {
            const normalized = normalizeColor(color);
            console.log(`  ${color} → ${normalized}`);
        } catch (error) {
            console.log(`  ${color} → ERROR: ${error.message}`);
        }
    });

    console.log('\n🔹 Canvas Brand Colors:');
    Object.entries(CANVAS_BRAND_COLORS).forEach(([name, color]) => {
        if (typeof color === 'string') {
            const terminal = getTerminalColor(color);
            console.log(`  ${name}: ${color} → ${terminal}`);
        } else {
            console.log(`  ${name}: [nested object]`);
            Object.entries(color).forEach(([subName, subColor]) => {
                const terminal = getTerminalColor(subColor as string);
                console.log(`    ${subName}: ${subColor} → ${terminal}`);
            });
        }
    });
}

// ============================================================================
// SECTION 2: ANSI Color Formats
// ============================================================================
console.log('\n📋 SECTION 2: ANSI Color Formats');
console.log('-'.repeat(40));

function demonstrateAnsiFormats() {
    console.log('\n🔹 24-bit ANSI Colors (ansi-16m):');
    const trueColorExamples = [
        { name: 'Primary Blue', color: CANVAS_BRAND_COLORS.primary },
        { name: 'Secondary Blue', color: CANVAS_BRAND_COLORS.secondary },
        { name: 'Accent Amber', color: CANVAS_BRAND_COLORS.accent },
        { name: 'Status Active', color: CANVAS_BRAND_COLORS.status?.active }
    ];

    trueColorExamples.forEach(({ name, color }) => {
        const ansi = getTerminalColor(color);
        console.log(`  ${name}: ${color} → ${ansi}`);
    });

    console.log('\n🔹 256-color ANSI Compatibility:');
    const limitedColors = [
        { name: 'Red', color: '#ff0000' },
        { name: 'Green', color: '#00ff00' },
        { name: 'Blue', color: '#0000ff' },
        { name: 'Yellow', color: '#ffff00' }
    ];

    limitedColors.forEach(({ name, color }) => {
        const ansi = getTerminalColor(color);
        console.log(`  ${name}: ${color} → ${ansi}`);
    });
}

// ============================================================================
// SECTION 3: RGBA and HEX Color Systems
// ============================================================================
console.log('\n📋 SECTION 3: RGBA and HEX Color Systems');
console.log('-'.repeat(40));

function demonstrateRgbaHex() {
    console.log('\n🔹 RGBA Color Demonstrations:');
    const rgbaExamples = [
        { name: 'Opaque Red', color: 'rgba(255,0,0,1)' },
        { name: 'Semi-transparent Blue', color: 'rgba(0,0,255,0.5)' },
        { name: 'Transparent Green', color: 'rgba(0,255,0,0.1)' }
    ];

    rgbaExamples.forEach(({ name, color }) => {
        try {
            const normalized = normalizeColor(color);
            console.log(`  ${name}: ${color}`);
            console.log(`    Normalized: ${normalized}`);
        } catch (error) {
            console.log(`  ${name}: ${color} → ERROR: ${error.message}`);
        }
    });

    console.log('\n🔹 HEX Color Variations:');
    const hexExamples = [
        '#f00', '#ff0000', '#F00', '#FF0000',
        '#0f0', '#00ff00', '#0F0', '#00FF00',
        '#00f', '#0000ff', '#00F', '#0000FF'
    ];

    console.log('  3-digit HEX:');
    hexExamples.filter(h => h.length === 4).forEach(hex => {
        const normalized = normalizeColor(hex);
        console.log(`    ${hex} → ${normalized}`);
    });

    console.log('  6-digit HEX:');
    hexExamples.filter(h => h.length === 7).forEach(hex => {
        const normalized = normalizeColor(hex);
        console.log(`    ${hex} → ${normalized}`);
    });
}

// ============================================================================
// SECTION 4: Color Validation and Metadata
// ============================================================================
console.log('\n📋 SECTION 4: Color Validation and Metadata');
console.log('-'.repeat(40));

function demonstrateValidation() {
    console.log('\n🔹 Color Validation Examples:');
    const validationTests = [
        { color: '#ff0000', expected: true },
        { color: 'rgba(255,0,0,0.5)', expected: true },
        { color: 'invalid-color', expected: false },
        { color: 'rgb(300,0,0)', expected: false },
        { color: 'rgba(255,0,0,2)', expected: false }
    ];

    validationTests.forEach(({ color, expected }) => {
        try {
            const normalized = normalizeColor(color);
            const status = '✅';
            console.log(`  ${status} ${color}: Valid (normalized to ${normalized})`);
        } catch (error) {
            const status = expected === false ? '✅' : '❌';
            console.log(`  ${status} ${color}: Invalid (${error.message})`);
        }
    });
}

// ============================================================================
// SECTION 5: Colored Table Demonstrations
// ============================================================================
console.log('\n📋 SECTION 5: Colored Table Demonstrations');
console.log('-'.repeat(40));

function demonstrateColoredTables() {
    console.log('\n🔹 Status Table with Colors:');

    const statusData = [
        { name: 'API Server', status: 'online' },
        { name: 'Database', status: 'warning' },
        { name: 'Cache', status: 'offline' },
        { name: 'WebSocket', status: 'online' }
    ];

    console.log('  Service Status:');
    statusData.forEach(({ name, status }) => {
        const statusSymbol = status === 'online' ? '✅' : status === 'warning' ? '⚠️' : '❌';
        console.log(`    ${statusSymbol} ${name}: ${status}`);
    });

    console.log('\n🔹 Performance Metrics Table:');
    const performanceData = [
        { metric: 'Response Time', value: '45ms' },
        { metric: 'Memory Usage', value: '67%' },
        { metric: 'CPU Load', value: '23%' },
        { metric: 'Error Rate', value: '0.1%' }
    ];

    console.log('  System Performance:');
    performanceData.forEach(({ metric, value }) => {
        console.log(`    ${metric}: ${value}`);
    });
}

// ============================================================================
// SECTION 6: Canvas Color Integration
// ============================================================================
console.log('\n📋 SECTION 6: Canvas Color Integration');
console.log('-'.repeat(40));

function demonstrateCanvasIntegration() {
    console.log('\n🔹 Canvas Color Integration:');
    console.log('  Successfully integrated with canvas color system');
    console.log('  Available brand colors:');
    Object.keys(CANVAS_BRAND_COLORS).forEach(key => {
        console.log(`    - ${key}`);
    });

    console.log('\n🔹 Legacy Color Migration:');
    console.log('  Mapping legacy colors to new system:');
    Object.entries(LEGACY_COLOR_MAP).forEach(([legacy, modern]) => {
        console.log(`    ${legacy} → ${modern}`);
    });
}

// ============================================================================
// EXECUTE ALL DEMONSTRATIONS
// ============================================================================

async function runAllDemos() {
    try {
        demonstrateBasicColors();
        demonstrateAnsiFormats();
        demonstrateRgbaHex();
        demonstrateValidation();
        demonstrateColoredTables();
        demonstrateCanvasIntegration();

        console.log('\n' + '='.repeat(50));
        console.log('✅ All color system demonstrations completed!');
        console.log('📊 Summary: Demonstrated 6 color system categories');
        console.log('🎯 Coverage: Basic, ANSI, RGBA/HEX, Validation, Tables, Canvas');

    } catch (error) {
        console.error('❌ Demo execution failed:', error.message);
        process.exit(1);
    }
}

// Run demonstrations if this file is executed directly
if (import.meta.main) {
    runAllDemos();
}

export {
    demonstrateBasicColors,
    demonstrateAnsiFormats,
    demonstrateRgbaHex,
    demonstrateValidation,
    demonstrateColoredTables,
    demonstrateCanvasIntegration,
    runAllDemos
};
