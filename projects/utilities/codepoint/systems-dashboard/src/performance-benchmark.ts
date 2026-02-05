#!/usr/bin/env bun
// quick-grade.ts - Reliable Bun runtime performance benchmark

import { tmpdir } from "node:os";
import { join } from "node:path";

// Grade thresholds (in nanoseconds per operation)
const GRADES = {
  "A+": { stringWidth: 50, fileWrite: 1000, build: 3000, spawn: 5000 },
  A: { stringWidth: 100, fileWrite: 5000, build: 10000, spawn: 20000 },
  B: { stringWidth: 500, fileWrite: 20000, build: 50000, spawn: 100000 },
  C: { stringWidth: 1000, fileWrite: 50000, build: 100000, spawn: 200000 },
} as const;

// Helper: high-resolution time in nanoseconds
function hrtimeNs(): bigint {
  return process.hrtime.bigint();
}

// Helper: safely clean up temp files
async function cleanup(paths: string[]) {
  for (const path of paths) {
    try {
      await Bun.file(path).delete();
    } catch {}
  }
}

async function gradePerformance() {
  const results: Record<string, number> = {};
  const tempFiles: string[] = [];

  try {
    // 🔹 Test 1: Bun.stringWidth (10k iterations for stability)
    const swStart = hrtimeNs();
    for (let i = 0; i < 10_000; i++) {
      Bun.stringWidth("🇺🇸🚀✨");
    }
    const swElapsed = Number(hrtimeNs() - swStart);
    const swPerOp = swElapsed / 10_000; // ns/op
    results.stringWidth = swPerOp;

    // 🔹 Test 2: File Write (73 bytes = typical line length)
    const testFile = join(tmpdir(), `bun-grade-${Date.now()}.txt`);
    tempFiles.push(testFile);

    const fwStart = hrtimeNs();
    await Bun.write(testFile, "x".repeat(73));
    const fwElapsed = Number(hrtimeNs() - fwStart);
    results.fileWrite = fwElapsed;

    // 🔹 Test 3: Build (minimal entrypoint)
    const buildFile = join(tmpdir(), `build-grade-${Date.now()}.ts`);
    const outDir = join(tmpdir(), `build-out-${Date.now()}`);
    tempFiles.push(buildFile, outDir);

    await Bun.write(buildFile, 'console.log("graded");');
    const bStart = hrtimeNs();
    const buildResult = await Bun.build({
      entrypoints: [buildFile],
      outdir: outDir,
      minify: true,
      target: "bun",
    });
    if (!buildResult.success) throw new Error("Build failed");
    const bElapsed = Number(hrtimeNs() - bStart);
    results.build = bElapsed;

    // 🔹 Test 4: Spawn (use lightweight 'echo' instead of 'true')
    const sStart = hrtimeNs();
    const proc = Bun.spawn(["echo", "-n", ""], { stdout: "pipe" });
    await proc.exited;
    const sElapsed = Number(hrtimeNs() - sStart);
    results.spawn = sElapsed;

    // 📊 Determine grade
    let finalGrade = "C";
    for (const grade of ["A+", "A", "B", "C"] as const) {
      const thresholds = GRADES[grade];
      if (
        results.stringWidth <= thresholds.stringWidth &&
        results.fileWrite <= thresholds.fileWrite &&
        results.build <= thresholds.build &&
        results.spawn <= thresholds.spawn
      ) {
        finalGrade = grade;
        break;
      }
    }

    // 🖨️ Output with Bun.inspect.table for beautiful formatting
    console.log(`\n🏆 BUN PERFORMANCE GRADE: ${finalGrade}\n`);

    const tableData = [
      {
        Operation: "StringWidth",
        Time: `${results.stringWidth.toFixed(1)} ns/op`,
        Grade: getSubGrade(results.stringWidth, "stringWidth"),
      },
      {
        Operation: "File Write",
        Time: `${results.fileWrite.toFixed(0)} ns`,
        Grade: getSubGrade(results.fileWrite, "fileWrite"),
      },
      {
        Operation: "Build",
        Time: `${results.build.toFixed(0)} ns`,
        Grade: getSubGrade(results.build, "build"),
      },
      {
        Operation: "Spawn",
        Time: `${results.spawn.toFixed(0)} ns`,
        Grade: getSubGrade(results.spawn, "spawn"),
      },
    ];

    console.log(
      Bun.inspect.table(tableData, {
        columns: ["Operation", "Time", "Grade"],
        headerColor: "green",
        borderColor: "gray",
        padding: 1,
      })
    );

    return { grade: finalGrade, results };
  } finally {
    // 🧹 Always clean up
    await cleanup(tempFiles);
  }
}

// Helper: get sub-grade for individual metric
function getSubGrade(
  value: number,
  metric: keyof (typeof GRADES)["A+"]
): string {
  for (const grade of ["A+", "A", "B", "C"]) {
    if (value <= GRADES[grade as keyof typeof GRADES][metric]) {
      return grade;
    }
  }
  return "F";
}

// Calculate overall performance score (0-100) using enhanced calculator
function calculateOverallScore(results: Record<string, number>): number {
  try {
    // Convert nanoseconds to normalized scores (lower is better, so invert)
    const normalizedResults: Record<string, number> = {};

    for (const [metric, value] of Object.entries(results)) {
      // Normalize to 0-1 scale (lower time = higher score)
      const maxExpected = getMaxExpected(metric);
      normalizedResults[metric] = Math.max(
        0.001,
        Math.min(1, 1 - value / maxExpected)
      );
    }

    // Use enhanced geometric mean calculator
    const geometricMean = GeometricMeanCalculator.calculate(normalizedResults, {
      handleInvalid: "clamp",
      minValidValue: 0.001,
      maxValidValue: 1.0,
      precision: 4,
    });

    // Convert to 0-100 scale
    return Math.round(geometricMean * 100);
  } catch (error) {
    if (error instanceof ScoreCalculationError) {
      console.error("Score calculation failed:", error.message);
      return 0; // Safe fallback
    }
    throw error;
  }
}

// Helper to get maximum expected value for each metric
function getMaxExpected(metric: string): number {
  const thresholds = {
    stringWidth: 1000, // C grade threshold
    fileWrite: 50000, // C grade threshold
    build: 100000, // C grade threshold
    spawn: 200000, // C grade threshold
  };
  return thresholds[metric as keyof typeof thresholds] || 100000;
}

// Run if called directly
if (import.meta.main) {
  await gradePerformance();
}

// Export for use in health monitoring
export { GRADES, calculateOverallScore, gradePerformance };
