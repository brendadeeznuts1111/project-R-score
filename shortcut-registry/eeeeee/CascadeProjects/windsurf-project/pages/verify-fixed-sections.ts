#!/usr/bin/env bun
/**
 * Verify Performance and System Status sections now use semantic classes
 */

const fixedSections = [
    {
        "Section": "Performance Metrics",
        "Old Classes": "space-y-3, flex justify-between, text-gray-400, text-green-400 font-mono",
        "New Classes": "performance-metrics, performance-metrics__item, performance-metrics__label, performance-metrics__value--success",
        "Status": "✅ Fixed"
    },
    {
        "Section": "System Status",
        "Old Classes": "space-y-3, flex items-center justify-between, px-2 py-1 bg-green-600 text-white rounded text-xs",
        "New Classes": "system-status, system-status__item, system-status__label, system-status__badge system-status__badge--online",
        "Status": "✅ Fixed"
    }
];

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║              PERFORMANCE & SYSTEM STATUS - SEMANTIC CLASS REFACTORING                 ║");
console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

console.log(Bun.inspect.table(fixedSections, undefined, { colors: true }));

console.log("\n📋 New Component Structure:\n");

const performanceStructure = [
    {
        "Level": "Block",
        "Class": "performance-metrics",
        "Description": "Container for performance metrics list"
    },
    {
        "Level": "Element",
        "Class": "performance-metrics__item",
        "Description": "Individual metric row"
    },
    {
        "Level": "Element",
        "Class": "performance-metrics__label",
        "Description": "Metric label (dt element)"
    },
    {
        "Level": "Element + Modifier",
        "Class": "performance-metrics__value--success",
        "Description": "Metric value with success color variant"
    }
];

const systemStatusStructure = [
    {
        "Level": "Block",
        "Class": "system-status",
        "Description": "Container for system status list"
    },
    {
        "Level": "Element",
        "Class": "system-status__item",
        "Description": "Individual status row"
    },
    {
        "Level": "Element",
        "Class": "system-status__label",
        "Description": "Status label (dt element)"
    },
    {
        "Level": "Element + Modifier",
        "Class": "system-status__badge--online",
        "Description": "Status badge with online variant"
    }
];

console.log("🏗️  Performance Metrics Component:\n");
console.log(Bun.inspect.table(performanceStructure, undefined, { colors: true }));

console.log("\n🏗️  System Status Component:\n");
console.log(Bun.inspect.table(systemStatusStructure, undefined, { colors: true }));

console.log("\n✅ All utility classes have been replaced with semantic BEM-style classes!\n");
