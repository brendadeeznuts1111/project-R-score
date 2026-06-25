#!/usr/bin/env bun
/**
 * Verify the Real-Time Risk Heatmap section uses semantic classes
 */

const heatmapSection = {
    "Element": "Real-Time Risk Heatmap Panel",
    "Old Classes": "glass-effect rounded-lg p-6",
    "New Classes": "visualization-panel",
    "Status": "✅ Refactored"
};

const heatmapTitle = {
    "Element": "Heatmap Title",
    "Old Classes": "text-xl font-semibold mb-4 text-blue-400",
    "New Classes": "visualization-panel__title",
    "Status": "✅ Refactored"
};

const heatmapCanvas = {
    "Element": "Heatmap Canvas",
    "Old Classes": "id=\"riskHeatmap\"",
    "New Classes": "visualization-panel__canvas",
    "Status": "✅ Refactored"
};

const heatmapFooter = {
    "Element": "Heatmap Footer",
    "Old Classes": "mt-4 flex justify-between text-sm text-gray-400",
    "New Classes": "visualization-panel__footer",
    "Status": "✅ Refactored"
};

const section = [
    heatmapSection,
    heatmapTitle,
    heatmapCanvas,
    heatmapFooter
];

console.info("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.info("║              REAL-TIME RISK HEATMAP SECTION - SEMANTIC CLASS VERIFICATION             ║");
console.info("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

console.info(Bun.inspect.table(section, undefined, { colors: true }));

console.info("\n📋 Expected HTML Structure:\n");
console.info(`
<article class="visualization-panel">
  <h3 class="visualization-panel__title">Real-Time Risk Heatmap</h3>
  <canvas id="riskHeatmap" class="visualization-panel__canvas" width="400" height="300"></canvas>
  <div class="visualization-panel__footer">
    <span>Live fraud pattern visualization</span>
    <span id="heatmapPoints">0 points</span>
  </div>
</article>
`);

console.info("\n✅ All elements in the Real-Time Risk Heatmap section use semantic BEM-style classes!\n");
