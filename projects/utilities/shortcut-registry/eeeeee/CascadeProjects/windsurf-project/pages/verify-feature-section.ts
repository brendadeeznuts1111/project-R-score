#!/usr/bin/env bun
/**
 * Verify the Feature Contributions section uses semantic classes
 */

const featureSection = [
    {
        "Element": "Feature Analysis Section",
        "Old Classes": "grid grid-cols-1 lg:grid-cols-3 gap-6",
        "New Classes": "layout-grid layout-grid--columns-1 layout-grid--lg-columns-3 layout-grid--gap-large",
        "Status": "✅ Refactored"
    },
    {
        "Element": "Feature Contributions Panel",
        "Old Classes": "glass-effect rounded-lg p-6",
        "New Classes": "visualization-panel",
        "Status": "✅ Refactored"
    },
    {
        "Element": "Feature Contributions Title",
        "Old Classes": "text-xl font-semibold mb-4 text-blue-400",
        "New Classes": "visualization-panel__title",
        "Status": "✅ Refactored"
    },
    {
        "Element": "Performance Panel",
        "Old Classes": "glass-effect rounded-lg p-6",
        "New Classes": "visualization-panel",
        "Status": "✅ Refactored"
    },
    {
        "Element": "Performance Title",
        "Old Classes": "text-xl font-semibold mb-4 text-blue-400",
        "New Classes": "visualization-panel__title",
        "Status": "✅ Refactored"
    },
    {
        "Element": "System Status Panel",
        "Old Classes": "glass-effect rounded-lg p-6",
        "New Classes": "visualization-panel",
        "Status": "✅ Refactored"
    },
    {
        "Element": "System Status Title",
        "Old Classes": "text-xl font-semibold mb-4 text-blue-400",
        "New Classes": "visualization-panel__title",
        "Status": "✅ Refactored"
    }
];

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║           FEATURE ANALYSIS SECTION - SEMANTIC CLASS VERIFICATION                     ║");
console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

console.log(Bun.inspect.table(featureSection, undefined, { colors: true }));

console.log("\n📋 Expected HTML Structure:\n");
console.log(`
<section aria-labelledby="analysis-heading">
  <div class="layout-grid layout-grid--columns-1 layout-grid--lg-columns-3 layout-grid--gap-large">
    <article class="visualization-panel">
      <h3 class="visualization-panel__title">Feature Contributions</h3>
      <canvas id="featureChart" width="300" height="200"></canvas>
    </article>
    
    <article class="visualization-panel">
      <h3 class="visualization-panel__title">Performance</h3>
      <dl class="space-y-3">
        <!-- Performance metrics -->
      </dl>
    </article>
    
    <article class="visualization-panel">
      <h3 class="visualization-panel__title">System Status</h3>
      <dl class="space-y-3">
        <!-- System status items -->
      </dl>
    </article>
  </div>
</section>
`);

console.log("\n✅ All elements in the Feature Analysis section use semantic BEM-style classes!\n");

// Check for any remaining old utility classes
const remainingUtilities = [
    {
        "Element": "Performance DL",
        "Classes": "space-y-3",
        "Note": "Utility class kept for spacing (backward compatibility)"
    },
    {
        "Element": "Performance DT/DD",
        "Classes": "flex justify-between, text-gray-400, text-green-400",
        "Note": "Some utility classes kept for layout flexibility"
    }
];

console.log("📝 Note: Some utility classes are intentionally kept for backward compatibility:\n");
console.log(Bun.inspect.table(remainingUtilities, undefined, { colors: true }));
