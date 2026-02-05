// src/scripts/compare-bench.ts - Compare benchmark results

interface BenchmarkResult {
  [key: string]: number;
}

async function compareBenchmarks(
  baselinePath: string,
  prPath: string,
  toleranceNs: number = 0.1
): Promise<void> {
  const baselineFile = Bun.file(baselinePath);
  const prFile = Bun.file(prPath);

  if (!(await baselineFile.exists())) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }

  if (!(await prFile.exists())) {
    throw new Error(`PR file not found: ${prPath}`);
  }

  const baselineText = await baselineFile.text();
  const prText = await prFile.text();

  let baseline: BenchmarkResult;
  let pr: BenchmarkResult;

  try {
    baseline = JSON.parse(baselineText);
  } catch (e) {
    throw new Error(`Failed to parse baseline JSON: ${e}`);
  }

  try {
    pr = JSON.parse(prText);
  } catch (e) {
    throw new Error(`Failed to parse PR JSON: ${e}`);
  }

  const regressions: Array<{ key: string; baseline: number; pr: number; diff: number }> = [];
  const improvements: Array<{ key: string; baseline: number; pr: number; diff: number }> = [];

  // Compare all keys from baseline
  for (const [key, baselineValue] of Object.entries(baseline)) {
    const prValue = pr[key] ?? baselineValue;
    const diff = prValue - baselineValue;

    if (diff > toleranceNs) {
      regressions.push({
        key,
        baseline: baselineValue,
        pr: prValue,
        diff: Number(diff.toFixed(2)),
      });
    } else if (diff < -toleranceNs) {
      improvements.push({
        key,
        baseline: baselineValue,
        pr: prValue,
        diff: Number(Math.abs(diff).toFixed(2)),
      });
    }
  }

  // Report results
  console.log("📊 Benchmark Comparison\n");

  if (regressions.length > 0) {
    console.error("🚨 Performance regressions detected:\n");
    regressions.forEach(({ key, baseline, pr, diff }) => {
      console.error(`  ${key}:`);
      console.error(`    Baseline: ${baseline}ns`);
      console.error(`    PR:       ${pr}ns`);
      console.error(`    Change:   +${diff}ns (> ${toleranceNs}ns tolerance)\n`);
    });
    process.exit(1);
  }

  if (improvements.length > 0) {
    console.log("✅ Performance improvements:\n");
    improvements.forEach(({ key, baseline, pr, diff }) => {
      console.log(`  ${key}:`);
      console.log(`    Baseline: ${baseline}ns`);
      console.log(`    PR:       ${pr}ns`);
      console.log(`    Change:   -${diff}ns\n`);
    });
  }

  if (regressions.length === 0 && improvements.length === 0) {
    console.log("✅ No significant changes detected (within tolerance)\n");
    console.log("Tolerance:", toleranceNs, "ns");
  }
}

// CLI
const args = Bun.argv.slice(2);
const baselineIndex = args.indexOf("--baseline");
const prIndex = args.indexOf("--pr");
const toleranceIndex = args.indexOf("--tolerance-ns");

if (baselineIndex === -1 || prIndex === -1) {
  console.error("Usage: bun compare-bench.ts --baseline <file> --pr <file> [--tolerance-ns <number>]");
  process.exit(1);
}

const baselinePath = args[baselineIndex + 1];
const prPath = args[prIndex + 1];
const toleranceNs = toleranceIndex !== -1 ? parseFloat(args[toleranceIndex + 1]) : 0.1;

compareBenchmarks(baselinePath, prPath, toleranceNs).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

