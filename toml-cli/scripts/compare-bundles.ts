/**
 * Bundle Comparison Script
 * Generates markdown report comparing PR vs main branch
 * Run: bun run scripts/compare-bundles.ts
 */

import { BundleMatrixAnalyzer } from "../src/analyzers/BundleMatrix";

async function generateComparisonReport() {
  try {
    const pr = await BundleMatrixAnalyzer.loadMetrics("./metrics/bundle-pr.json");
    const baseline = await BundleMatrixAnalyzer.loadMetrics("./metrics/bundle-baseline.json");

    if (!pr || !baseline) {
      console.log("No metrics to compare");
      return;
    }

    const comparison = BundleMatrixAnalyzer.compareAnalyses(baseline, pr);

    // Generate markdown report
    const report = `# 📦 Bundle Analysis Report

## Summary
${comparison.summary}

## Metrics Comparison

| Metric | Main | PR | Change |
|--------|------|----|----|
| Total Size | ${formatBytes(baseline.summary.totalSize)} | ${formatBytes(pr.summary.totalSize)} | ${formatChange(comparison.sizeChange)} |
| Gzipped Size | ${formatBytes(baseline.summary.gzippedSize)} | ${formatBytes(pr.summary.gzippedSize)} | ${formatChange(Math.round(pr.summary.gzippedSize - baseline.summary.gzippedSize))} |
| Files | ${baseline.summary.fileCount} | ${pr.summary.fileCount} | ${formatChange(comparison.fileCountChange)} |
| Health | ${baseline.summary.bundleHealth}/100 | ${pr.summary.bundleHealth}/100 | ${formatChange(comparison.healthChange)} |

## Top Files (PR)
${pr.summary.largestFiles
  .slice(0, 5)
  .map(
    (f, i) =>
      `${i + 1}. **${f.path}** - ${formatBytes(f.size)}`
  )
  .join("\n")}

## Compliance Status
${pr.compliance
  .map(c => `- ${c.passed ? "✅" : "❌"} ${c.rule} - ${c.details}`)
  .join("\n")}

## Recommendations
${pr.recommendations.map(r => `- ${r}`).join("\n")}

## Impact Assessment
${getImpactAssessment(comparison)}
`;

    // Write report
    await Bun.write("./metrics/comparison-report.md", report);
    console.log("✓ Comparison report generated");

    // Print to console
    console.log(report);
  } catch (error) {
    console.error("Failed to generate comparison:", error);
  }
}

function formatBytes(bytes: number): string {
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatChange(change: number): string {
  if (change === 0) return "—";
  const symbol = change > 0 ? "+" : "";
  return `${symbol}${change}`;
}

function getImpactAssessment(comparison: any): string {
  let assessment = "";

  if (comparison.sizeChange > 50000) {
    assessment += "⚠️ **Size increased significantly** - Review new dependencies\n";
  } else if (comparison.sizeChange < -50000) {
    assessment += "🎉 **Great! Size decreased** - Good optimization\n";
  }

  if (comparison.healthChange < -5) {
    assessment += "⚠️ **Health degraded** - Check largest files and imports\n";
  } else if (comparison.healthChange > 5) {
    assessment += "🎉 **Health improved** - Great optimization work!\n";
  }

  if (comparison.fileCountChange > 2) {
    assessment += "📝 **More files in bundle** - Consider code splitting\n";
  }

  return assessment || "✅ **No significant changes** - Bundle looks stable";
}

generateComparisonReport();
