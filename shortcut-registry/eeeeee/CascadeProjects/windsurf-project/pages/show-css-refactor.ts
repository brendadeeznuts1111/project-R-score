#!/usr/bin/env bun
/**
 * Display CSS Refactoring Summary using Bun.inspect.table()
 */

const refactoringSummary = [
    {
        "Component": "Dashboard Header",
        "Old Class": "site-header bg-gray-800",
        "New Class": "dashboard-header",
        "Type": "Component"
    },
    {
        "Component": "Header Navigation",
        "Old Class": "flex items-center justify-between",
        "New Class": "dashboard-header__navigation",
        "Type": "Component"
    },
    {
        "Component": "Header Branding",
        "Old Class": "flex items-center space-x-4",
        "New Class": "dashboard-header__branding",
        "Type": "Component"
    },
    {
        "Component": "Header Title",
        "Old Class": "text-2xl font-bold text-blue-400",
        "New Class": "dashboard-header__title",
        "Type": "Component"
    },
    {
        "Component": "Version Badge",
        "Old Class": "px-2 py-1 text-white rounded text-xs",
        "New Class": "badge badge--version",
        "Type": "Component"
    },
    {
        "Component": "Cookie Badge",
        "Old Class": "px-2 py-1 text-white rounded text-xs",
        "New Class": "badge badge--cookie",
        "Type": "Component"
    },
    {
        "Component": "Connection Status",
        "Old Class": "px-3 py-1 bg-green-600 rounded-full",
        "New Class": "badge badge--status badge--status--connected",
        "Type": "Component"
    },
    {
        "Component": "Last Update",
        "Old Class": "text-gray-400 text-sm",
        "New Class": "timestamp-display",
        "Type": "Component"
    },
    {
        "Component": "Metric Card",
        "Old Class": "glass-effect rounded-lg p-6",
        "New Class": "metric-card",
        "Type": "Component"
    },
    {
        "Component": "Metric Card Value",
        "Old Class": "text-3xl font-bold text-white",
        "New Class": "metric-card__value metric-card__value--primary",
        "Type": "Element"
    },
    {
        "Component": "Metric Card Icon",
        "Old Class": "text-blue-400 text-4xl",
        "New Class": "metric-card__icon metric-card__icon--primary",
        "Type": "Element"
    },
    {
        "Component": "Visualization Panel",
        "Old Class": "glass-effect rounded-lg p-6",
        "New Class": "visualization-panel",
        "Type": "Component"
    },
    {
        "Component": "Visualization Title",
        "Old Class": "text-xl font-semibold mb-4 text-blue-400",
        "New Class": "visualization-panel__title",
        "Type": "Element"
    },
    {
        "Component": "Alert List",
        "Old Class": "space-y-2 max-h-64 overflow-y-auto",
        "New Class": "alert-list",
        "Type": "Component"
    },
    {
        "Component": "Alert Item",
        "Old Class": "p-3 rounded-lg border-l-4",
        "New Class": "alert-item alert-item--critical",
        "Type": "Component"
    },
    {
        "Component": "Timeline",
        "Old Class": "space-y-2 max-h-64 overflow-y-auto",
        "New Class": "timeline",
        "Type": "Component"
    },
    {
        "Component": "Timeline Item",
        "Old Class": "p-2 rounded border-l-2",
        "New Class": "timeline-item timeline-item--blocked",
        "Type": "Component"
    },
    {
        "Component": "Geographic Distribution",
        "Old Class": "space-y-2",
        "New Class": "geographic-distribution",
        "Type": "Component"
    },
    {
        "Component": "Transaction Card",
        "Old Class": "p-4 bg-gray-800 rounded-lg",
        "New Class": "transaction-card",
        "Type": "Component"
    },
    {
        "Component": "Transaction Value",
        "Old Class": "text-2xl font-bold text-green-400",
        "New Class": "transaction-card__value transaction-card__value--success",
        "Type": "Element"
    },
    {
        "Component": "Button",
        "Old Class": "btn btn-secondary btn-sm",
        "New Class": "button button--small button--secondary",
        "Type": "Component"
    },
    {
        "Component": "Grid Layout",
        "Old Class": "grid grid-cols-1 lg:grid-cols-4",
        "New Class": "layout-grid layout-grid--columns-1 layout-grid--lg-columns-4",
        "Type": "Utility"
    },
    {
        "Component": "Typography Size",
        "Old Class": "text-sm",
        "New Class": "typography--size-sm",
        "Type": "Utility"
    },
    {
        "Component": "Typography Color",
        "Old Class": "text-gray-400",
        "New Class": "typography--color-gray-medium",
        "Type": "Utility"
    },
    {
        "Component": "Spacing Padding",
        "Old Class": "p-6",
        "New Class": "spacing--padding-xlarge",
        "Type": "Utility"
    },
    {
        "Component": "Spacing Margin",
        "Old Class": "mb-8",
        "New Class": "spacing--margin-bottom-xlarge",
        "Type": "Utility"
    }
];

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    CSS REFACTORING SUMMARY - SEMANTIC NAMING                          ║");
console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

// Show all refactorings
console.log("📋 Complete Refactoring Map:\n");
console.log(Bun.inspect.table(refactoringSummary, undefined, { colors: true }));

// Group by type
const byType = {
    "Component": refactoringSummary.filter(r => r.Type === "Component"),
    "Element": refactoringSummary.filter(r => r.Type === "Element"),
    "Utility": refactoringSummary.filter(r => r.Type === "Utility")
};

console.log("\n\n📊 Summary by Type:\n");
const typeSummary = [
    {
        "Type": "Component",
        "Count": byType.Component.length,
        "Examples": byType.Component.slice(0, 3).map(c => c["New Class"]).join(", ")
    },
    {
        "Type": "Element",
        "Count": byType.Element.length,
        "Examples": byType.Element.slice(0, 3).map(c => c["New Class"]).join(", ")
    },
    {
        "Type": "Utility",
        "Count": byType.Utility.length,
        "Examples": byType.Utility.slice(0, 3).map(c => c["New Class"]).join(", ")
    }
];
console.log(Bun.inspect.table(typeSummary, undefined, { colors: true }));

// Show component hierarchy
console.log("\n\n🏗️  Component Hierarchy Examples:\n");
const hierarchy = [
    {
        "Level": "Block",
        "Example": "metric-card",
        "Description": "Main component container"
    },
    {
        "Level": "Element",
        "Example": "metric-card__value",
        "Description": "Child element of block"
    },
    {
        "Level": "Modifier",
        "Example": "metric-card__value--success",
        "Description": "Variant of element"
    },
    {
        "Level": "Block",
        "Example": "dashboard-header",
        "Description": "Main component container"
    },
    {
        "Level": "Element",
        "Example": "dashboard-header__navigation",
        "Description": "Child element of block"
    },
    {
        "Level": "Element",
        "Example": "dashboard-header__branding",
        "Description": "Another child element"
    }
];
console.log(Bun.inspect.table(hierarchy, undefined, { colors: true }));

// Show naming patterns
console.log("\n\n📝 Naming Patterns:\n");
const patterns = [
    {
        "Pattern": "Component Block",
        "Format": "component-name",
        "Example": "dashboard-header, metric-card, alert-list",
        "Usage": "Main container for a component"
    },
    {
        "Pattern": "Component Element",
        "Format": "component-name__element-name",
        "Example": "metric-card__value, alert-item__header",
        "Usage": "Child element within a component"
    },
    {
        "Pattern": "Component Modifier",
        "Format": "component-name--modifier",
        "Example": "badge--version, button--secondary",
        "Usage": "Variant of a component"
    },
    {
        "Pattern": "Element Modifier",
        "Format": "component-name__element-name--modifier",
        "Example": "metric-card__value--success",
        "Usage": "Variant of an element"
    },
    {
        "Pattern": "Utility Class",
        "Format": "category--property-value",
        "Example": "typography--size-sm, spacing--padding-large",
        "Usage": "Reusable utility classes"
    }
];
console.log(Bun.inspect.table(patterns, undefined, { colors: true }));

console.log("\n✅ CSS refactoring complete! All classes now use semantic, BEM-style naming.\n");
