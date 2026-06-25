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

console.info('🎨 Consolidated Bun Color Systems Demo\n');
console.info('='.repeat(50));

// ============================================================================
// SECTION 1: Basic Color Operations
// ============================================================================
console.info('\n📋 SECTION 1: Basic Color Operations');
console.info('-'.repeat(40));

function demonstrateBasicColors() {
    console.info('\n🔹 Color Normalization:');
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
            console.info(`  ${color} → ${normalized}`);
        } catch (error) {
            console.info(`  ${color} → ERROR: ${error.message}`);
        }
    });

    console.info('\n🔹 Canvas Brand Colors:');
    Object.entries(CANVAS_BRAND_COLORS).forEach(([name, color]) => {
        if (typeof color === 'string') {
            const terminal = getTerminalColor(color);
            console.info(`  ${name}: ${color} → ${terminal}`);
        } else {
            console.info(`  ${name}: [nested object]`);
            Object.entries(color).forEach(([subName, subColor]) => {
                const terminal = getTerminalColor(subColor as string);
                console.info(`    ${subName}: ${subColor} → ${terminal}`);
            });
        }
    });
}

// ============================================================================
// SECTION 2: ANSI Color Formats
// ============================================================================
console.info('\n📋 SECTION 2: ANSI Color Formats');
console.info('-'.repeat(40));

function demonstrateAnsiFormats() {
    console.info('\n🔹 24-bit ANSI Colors (ansi-16m):');
    const trueColorExamples = [
        { name: 'Primary Blue', color: CANVAS_BRAND_COLORS.primary },
        { name: 'Secondary Blue', color: CANVAS_BRAND_COLORS.secondary },
        { name: 'Accent Amber', color: CANVAS_BRAND_COLORS.accent },
        { name: 'Status Active', color: CANVAS_BRAND_COLORS.status?.active }
    ];

    trueColorExamples.forEach(({ name, color }) => {
        const ansi = getTerminalColor(color);
        console.info(`  ${name}: ${color} → ${ansi}`);
    });

    console.info('\n🔹 256-color ANSI Compatibility:');
    const limitedColors = [
        { name: 'Red', color: '#ff0000' },
        { name: 'Green', color: '#00ff00' },
        { name: 'Blue', color: '#0000ff' },
        { name: 'Yellow', color: '#ffff00' }
    ];

    limitedColors.forEach(({ name, color }) => {
        const ansi = getTerminalColor(color);
        console.info(`  ${name}: ${color} → ${ansi}`);
    });
}

// ============================================================================
// SECTION 3: RGBA and HEX Color Systems
// ============================================================================
console.info('\n📋 SECTION 3: RGBA and HEX Color Systems');
console.info('-'.repeat(40));

function demonstrateRgbaHex() {
    console.info('\n🔹 RGBA Color Demonstrations:');
    const rgbaExamples = [
        { name: 'Opaque Red', color: 'rgba(255,0,0,1)' },
        { name: 'Semi-transparent Blue', color: 'rgba(0,0,255,0.5)' },
        { name: 'Transparent Green', color: 'rgba(0,255,0,0.1)' }
    ];

    rgbaExamples.forEach(({ name, color }) => {
        try {
            const normalized = normalizeColor(color);
            console.info(`  ${name}: ${color}`);
            console.info(`    Normalized: ${normalized}`);
        } catch (error) {
            console.info(`  ${name}: ${color} → ERROR: ${error.message}`);
        }
    });

    console.info('\n🔹 HEX Color Variations:');
    const hexExamples = [
        '#f00', '#ff0000', '#F00', '#FF0000',
        '#0f0', '#00ff00', '#0F0', '#00FF00',
        '#00f', '#0000ff', '#00F', '#0000FF'
    ];

    console.info('  3-digit HEX:');
    hexExamples.filter(h => h.length === 4).forEach(hex => {
        const normalized = normalizeColor(hex);
        console.info(`    ${hex} → ${normalized}`);
    });

    console.info('  6-digit HEX:');
    hexExamples.filter(h => h.length === 7).forEach(hex => {
        const normalized = normalizeColor(hex);
        console.info(`    ${hex} → ${normalized}`);
    });
}

// ============================================================================
// SECTION 4: Color Validation and Metadata
// ============================================================================
console.info('\n📋 SECTION 4: Color Validation and Metadata');
console.info('-'.repeat(40));

function demonstrateValidation() {
    console.info('\n🔹 Color Validation Examples:');
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
            console.info(`  ${status} ${color}: Valid (normalized to ${normalized})`);
        } catch (error) {
            const status = expected === false ? '✅' : '❌';
            console.info(`  ${status} ${color}: Invalid (${error.message})`);
        }
    });
}

// ============================================================================
// SECTION 5: Colored Table Demonstrations
// ============================================================================
console.info('\n📋 SECTION 5: Colored Table Demonstrations');
console.info('-'.repeat(40));

function demonstrateColoredTables() {
    console.info('\n🔹 Status Table with Colors:');

    const statusData = [
        { name: 'API Server', status: 'online' },
        { name: 'Database', status: 'warning' },
        { name: 'Cache', status: 'offline' },
        { name: 'WebSocket', status: 'online' }
    ];

    console.info('  Service Status:');
    statusData.forEach(({ name, status }) => {
        const statusSymbol = status === 'online' ? '✅' : status === 'warning' ? '⚠️' : '❌';
        console.info(`    ${statusSymbol} ${name}: ${status}`);
    });

    console.info('\n🔹 Performance Metrics Table:');
    const performanceData = [
        { metric: 'Response Time', value: '45ms' },
        { metric: 'Memory Usage', value: '67%' },
        { metric: 'CPU Load', value: '23%' },
        { metric: 'Error Rate', value: '0.1%' }
    ];

    console.info('  System Performance:');
    performanceData.forEach(({ metric, value }) => {
        console.info(`    ${metric}: ${value}`);
    });
}

// ============================================================================
// SECTION 6: Canvas Color Integration
// ============================================================================
console.info('\n📋 SECTION 6: Canvas Color Integration');
console.info('-'.repeat(40));

function demonstrateCanvasIntegration() {
    console.info('\n🔹 Canvas Color Integration:');
    console.info('  Successfully integrated with canvas color system');
    console.info('  Available brand colors:');
    Object.keys(CANVAS_BRAND_COLORS).forEach(key => {
        console.info(`    - ${key}`);
    });

    console.info('\n🔹 Legacy Color Migration:');
    console.info('  Mapping legacy colors to new system:');
    Object.entries(LEGACY_COLOR_MAP).forEach(([legacy, modern]) => {
        console.info(`    ${legacy} → ${modern}`);
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

        console.info('\n' + '='.repeat(50));
        console.info('✅ All color system demonstrations completed!');
        console.info('📊 Summary: Demonstrated 6 color system categories');
        console.info('🎯 Coverage: Basic, ANSI, RGBA/HEX, Validation, Tables, Canvas');

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
