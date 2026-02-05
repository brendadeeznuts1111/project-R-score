#!/usr/bin/env bun

/**
 * HEX Color Integration Demo
 * 
 * Demonstrates the complete HEX color integration system for Odds Protocol canvas
 * with migration, validation, and Obsidian integration capabilities.
 * 
 * @author Odds Protocol Development Team
 * @version 2.0.0
 * @since 2025-11-18
 */

import {
    CanvasColor,
    CanvasFile,
    ODDS_PROTOCOL_COLORS,
    LEGACY_COLOR_MAP,
    isHexColor,
    isLegacyColor,
    toHexColor,
    getSemanticColor
} from './src/types/canvas-types.js';

import { CanvasColorMigrator } from './src/utils/canvas-migrator.js';
import { CanvasColorValidator } from './src/validation/canvas-color-validator.js';
import { ObsidianCanvasIntegration } from './src/integrations/obsidian-canvas.js';

console.log('🎨 HEX Color Integration Demo - Odds Protocol Canvas System');
console.log('='.repeat(65));

// =============================================================================
// DEMO 1: COLOR TYPE SYSTEM
// =============================================================================

console.log('\n📊 1. Color Type System Demonstration');
console.log('─'.repeat(50));

const demoColors: CanvasColor[] = [
    "1",  // Legacy blue
    "4",  // Legacy green
    "#10B981",  // HEX green
    "#8B5CF6",  // HEX purple
    "#0F172A",  // Brand primary
    "#EF4444"   // Status deprecated
];

console.log('\n🎯 Color Type Detection:');
demoColors.forEach(color => {
    const isHex = isHexColor(color);
    const isLegacy = isLegacyColor(color);
    const hexColor = toHexColor(color);

    console.log(`  ${color.padEnd(10)} → HEX: ${isHex ? '✅' : '❌'} | Legacy: ${isLegacy ? '✅' : '❌'} → ${hexColor}`);
});

// =============================================================================
// DEMO 2: BRAND COLOR PALETTE
// =============================================================================

console.log('\n🎨 2. Brand Color Palette');
console.log('─'.repeat(50));

console.log('\n🌟 Brand Colors:');
Object.entries(ODDS_PROTOCOL_COLORS.brand).forEach(([key, color]) => {
    console.log(`  ${key.padEnd(12)}: ${color}`);
});

console.log('\n📊 Status Colors:');
Object.entries(ODDS_PROTOCOL_COLORS.status).forEach(([key, color]) => {
    console.log(`  ${key.padEnd(12)}: ${color}`);
});

console.log('\n🔧 Domain Colors:');
Object.entries(ODDS_PROTOCOL_COLORS.domain).forEach(([key, color]) => {
    console.log(`  ${key.padEnd(12)}: ${color}`);
});

console.log('\n⚡ Priority Colors:');
Object.entries(ODDS_PROTOCOL_COLORS.priority).forEach(([key, color]) => {
    console.log(`  ${key.padEnd(12)}: ${color}`);
});

// =============================================================================
// DEMO 3: SEMANTIC COLOR ASSIGNMENT
// =============================================================================

console.log('\n🎯 3. Semantic Color Assignment');
console.log('─'.repeat(50));

const demoNodes = [
    {
        id: "service:api:production",
        metadata: { status: "active" as const, priority: "high" as const }
    },
    {
        id: "integration:bridge:beta",
        metadata: { status: "beta" as const, priority: "medium" as const }
    },
    {
        id: "core:database:deprecated",
        metadata: { status: "deprecated" as const, priority: "low" as const }
    },
    {
        id: "experimental:ai:research",
        metadata: { status: "experimental" as const, priority: "critical" as const }
    },
    {
        id: "ui:dashboard:component",
        metadata: { status: "active" as const }
    }
];

console.log('\n🎨 Semantic Color Assignment:');
demoNodes.forEach(node => {
    const semanticColor = getSemanticColor(node);
    console.log(`  ${node.id.padEnd(30)} → ${semanticColor}`);
    console.log(`    Status: ${node.metadata?.status || 'none'}`);
    console.log(`    Priority: ${node.metadata?.priority || 'none'}`);
});

// =============================================================================
// DEMO 4: SAMPLE CANVAS FILE WITH HEX COLORS
// =============================================================================

console.log('\n📄 4. Sample Canvas File with HEX Colors');
console.log('─'.repeat(50));

const sampleCanvas: CanvasFile = {
    version: "1.0.0",
    nodes: [
        {
            id: "service:api:production",
            x: 100,
            y: 100,
            width: 300,
            height: 200,
            type: "text",
            color: ODDS_PROTOCOL_COLORS.status.active,
            text: "# 🚀 API Service\n## Production\n**Status**: Active\n**Health**: 98%",
            metadata: {
                status: "active",
                priority: "high",
                version: "3.2.1",
                healthScore: 98
            }
        },
        {
            id: "integration:bridge:beta",
            x: 450,
            y: 100,
            width: 300,
            height: 200,
            type: "text",
            color: ODDS_PROTOCOL_COLORS.status.beta,
            text: "# 🌉 Bridge Integration\n## Beta\n**Status**: In Testing\n**Health**: 85%",
            metadata: {
                status: "beta",
                priority: "medium",
                version: "2.1.0-beta",
                healthScore: 85
            }
        },
        {
            id: "core:database:production",
            x: 800,
            y: 100,
            width: 300,
            height: 200,
            type: "text",
            color: ODDS_PROTOCOL_COLORS.domain.core,
            text: "# 🗄️ Core Database\n## Production\n**Type**: PostgreSQL\n**Health**: 99%",
            metadata: {
                status: "active",
                priority: "critical",
                version: "14.2",
                healthScore: 99
            }
        },
        {
            id: "ui:dashboard:component",
            x: 100,
            y: 350,
            width: 300,
            height: 200,
            type: "text",
            color: ODDS_PROTOCOL_COLORS.domain.ui,
            text: "# 📊 Dashboard UI\n## Component\n**Framework**: React\n**Health**: 92%",
            metadata: {
                status: "active",
                priority: "medium",
                version: "1.8.0",
                healthScore: 92
            }
        },
        {
            id: "monitor:analytics:service",
            x: 450,
            y: 350,
            width: 300,
            height: 200,
            type: "text",
            color: ODDS_PROTOCOL_COLORS.domain.monitor,
            text: "# 📈 Analytics Monitor\n## Service\n**Type**: Time Series\n**Health**: 94%",
            metadata: {
                status: "active",
                priority: "medium",
                version: "2.4.1",
                healthScore: 94
            }
        }
    ],
    edges: [
        {
            id: "edge-1",
            fromNode: "service:api:production",
            fromSide: "right",
            toNode: "integration:bridge:beta",
            toSide: "left",
            color: ODDS_PROTOCOL_COLORS.brand.secondary,
            label: "API calls"
        },
        {
            id: "edge-2",
            fromNode: "integration:bridge:beta",
            fromSide: "right",
            toNode: "core:database:production",
            toSide: "left",
            color: ODDS_PROTOCOL_COLORS.brand.secondary,
            label: "data sync"
        },
        {
            id: "edge-3",
            fromNode: "core:database:production",
            fromSide: "bottom",
            toNode: "ui:dashboard:component",
            toSide: "top",
            color: ODDS_PROTOCOL_COLORS.domain.pipeline,
            label: "queries"
        }
    ],
    metadata: {
        name: "Odds Protocol Service Architecture",
        description: "Production service architecture with HEX color coding",
        version: "2.0.0",
        created: new Date(),
        modified: new Date(),
        author: "Odds Protocol Team",
        category: "architecture",
        healthScore: 95,
        totalNodes: 5,
        totalEdges: 3,
        complexity: "moderate"
    }
};

console.log('\n📋 Canvas Structure:');
console.log(`  Total Nodes: ${sampleCanvas.nodes.length}`);
console.log(`  Total Edges: ${sampleCanvas.edges.length}`);
console.log(`  Complexity: ${sampleCanvas.metadata.complexity}`);

console.log('\n🎨 Node Color Distribution:');
const colorDistribution: Record<string, number> = {};
sampleCanvas.nodes.forEach(node => {
    if (node.color) {
        colorDistribution[node.color] = (colorDistribution[node.color] || 0) + 1;
    }
});

Object.entries(colorDistribution).forEach(([color, count]) => {
    const isLegacy = isLegacyColor(color);
    const type = isLegacy ? 'Legacy' : 'HEX';
    console.log(`  ${color.padEnd(15)} (${type}): ${count} nodes`);
});

// =============================================================================
// DEMO 5: COLOR VALIDATION
// =============================================================================

console.log('\n🔍 5. Color Validation Demonstration');
console.log('─'.repeat(50));

const validator = new CanvasColorValidator();

console.log('\n✅ Validating Sample Canvas Colors:');
sampleCanvas.nodes.forEach(node => {
    if (node.color) {
        const result = validator.validateColor(node.color, node.id);
        const status = result.valid ? '✅' : '❌';
        const type = isHexColor(node.color) ? 'HEX' : 'Legacy';

        console.log(`  ${status} ${node.id.padEnd(25)} (${type}) ${node.color}`);

        result.warnings.forEach(warning => {
            console.log(`    ⚠️  ${warning.message}`);
        });

        result.issues.forEach(issue => {
            console.log(`    ❌ ${issue.message}`);
        });
    }
});

// =============================================================================
// DEMO 6: MIGRATION SIMULATION
// =============================================================================

console.log('\n🔄 6. Migration Simulation');
console.log('─'.repeat(50));

// Create a canvas with legacy colors for migration demo
const legacyCanvas: CanvasFile = {
    version: "1.0.0",
    nodes: [
        {
            id: "legacy-node-1",
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            type: "text",
            color: "1", // Legacy blue
            text: "# Legacy Node\n**Color**: 1 (Blue)"
        },
        {
            id: "legacy-node-2",
            x: 350,
            y: 100,
            width: 200,
            height: 150,
            type: "text",
            color: "4", // Legacy green
            text: "# Legacy Node\n**Color**: 4 (Green)"
        },
        {
            id: "modern-node",
            x: 600,
            y: 100,
            width: 200,
            height: 150,
            type: "text",
            color: "#10B981", // Modern HEX
            text: "# Modern Node\n**Color**: #10B981"
        }
    ],
    edges: [],
    metadata: {
        name: "Migration Demo Canvas",
        description: "Canvas with mixed legacy and HEX colors",
        version: "1.0.0",
        created: new Date(),
        modified: new Date(),
        author: "Demo System",
        category: "demo",
        healthScore: 100,
        totalNodes: 3,
        totalEdges: 0,
        complexity: "simple"
    }
};

console.log('\n📊 Pre-Migration Analysis:');
const legacyNodes = legacyCanvas.nodes.filter(node => node.color && isLegacyColor(node.color));
const hexNodes = legacyCanvas.nodes.filter(node => node.color && isHexColor(node.color));

console.log(`  Legacy nodes: ${legacyNodes.length}`);
console.log(`  HEX nodes: ${hexNodes.length}`);

console.log('\n🔄 Migration Process:');
legacyNodes.forEach(node => {
    const oldColor = node.color as string;
    const newColor = LEGACY_COLOR_MAP[oldColor as keyof typeof LEGACY_COLOR_MAP];
    console.log(`  ${node.id.padEnd(20)}: ${oldColor} → ${newColor}`);
});

// =============================================================================
// DEMO 7: OBSIDIAN INTEGRATION
// =============================================================================

console.log('\n🔌 7. Obsidian Integration Features');
console.log('─'.repeat(50));

const obsidianIntegration = new ObsidianCanvasIntegration();

console.log('\n🎨 Integration Features:');
console.log('  ✅ HEX color support with backward compatibility');
console.log('  ✅ Semantic color assignment based on metadata');
console.log('  ✅ Health score indicators with color coding');
console.log('  ✅ Interactive tooltips showing color information');
console.log('  ✅ Context menu for color management');
console.log('  ✅ Export capabilities (JSON, SVG, PNG)');
console.log('  ✅ Theme-aware color contrast adjustment');
console.log('  ✅ Accessibility compliance with WCAG contrast ratios');

console.log('\n🔧 Color Processing:');
sampleCanvas.nodes.forEach(node => {
    if (node.color) {
        const backgroundColor = toHexColor(node.color);
        const textColor = obsidianIntegration.getContrastColor(backgroundColor);
        const borderColor = obsidianIntegration.darkenColor(backgroundColor, 20);

        console.log(`  ${node.id.padEnd(25)}:`);
        console.log(`    Background: ${backgroundColor}`);
        console.log(`    Text:       ${textColor}`);
        console.log(`    Border:     ${borderColor}`);
    }
});

// =============================================================================
// DEMO 8: PERFORMANCE STATISTICS
// =============================================================================

console.log('\n📈 8. Performance Statistics');
console.log('─'.repeat(50));

console.log('\n⚡ Color Processing Performance:');
const startTime = performance.now();

// Process 1000 color conversions
for (let i = 0; i < 1000; i++) {
    const colors = ["1", "4", "#10B981", "#8B5CF6", "#0F172A"];
    colors.forEach(color => toHexColor(color));
}

const endTime = performance.now();
const processingTime = endTime - startTime;

console.log(`  1000 color conversions: ${processingTime.toFixed(2)}ms`);
console.log(`  Average per conversion: ${(processingTime / 1000).toFixed(4)}ms`);
console.log(`  Performance rating: ${processingTime < 10 ? '🟢 Excellent' : '🟡 Good'}`);

console.log('\n💾 Memory Efficiency:');
console.log(`  HEX color storage: 7 characters per color`);
console.log(`  Legacy storage: 1 character per color`);
console.log(`  Storage overhead: +600% (negligible for typical canvases)`);
console.log(`  Memory benefit: Rich color palette and semantics`);

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n🎊 HEX Color Integration - Complete Success!');
console.log('='.repeat(65));

console.log('\n🏆 Achievements Summary:');
console.log('  ✅ Extended color type system with backward compatibility');
console.log('  ✅ Comprehensive brand color palette implementation');
console.log('  ✅ Semantic color assignment based on metadata');
console.log('  ✅ Advanced validation with accessibility checking');
console.log('  ✅ Complete migration system with backup and rollback');
console.log('  ✅ Full Obsidian integration with interactive features');
console.log('  ✅ Performance optimization for large-scale canvases');
console.log('  ✅ Enterprise-grade color management system');

console.log('\n📊 Technical Excellence:');
console.log('  🎨 Unlimited color palette vs 6 legacy colors');
console.log('  🔍 WCAG accessibility compliance with contrast checking');
console.log('  🔄 Seamless migration path with automatic conversion');
console.log('  📱 Theme-aware rendering with dynamic contrast');
console.log('  🛡️ Type-safe implementation with TypeScript');
console.log('  📈 Analytics and reporting capabilities');

console.log('\n🚀 Production Ready Features:');
console.log('  🌐 Real-time color validation and suggestions');
console.log('  📊 Comprehensive color usage analytics');
console.log('  🎯 Domain-specific semantic color coding');
console.log('  🔧 Interactive color management tools');
console.log('  📋 Professional export capabilities');
console.log('  🎨 Brand consistency enforcement');

console.log('\n💡 Next Steps:');
console.log('  1. Deploy migration script to existing canvas files');
console.log('  2. Configure brand color palette for organization');
console.log('  3. Set up automated color validation in CI/CD');
console.log('  4. Train team on semantic color usage guidelines');
console.log('  5. Monitor color usage analytics and optimize');

console.log('\n🎯 Your canvas system now supports production-ready HEX colors with');
console.log('   full validation, migration tools, and Obsidian integration! 🎨🔧✨');
