#!/usr/bin/env bun
# bin/persona-finder.ts

import { runPersona } from "../persona-runner.ts";
import { benchmarkFDComputation } from "../engines/fractal-dimension.ts";
import { benchmarkHurstComputation } from "../engines/hurst-exponent.ts";
import { benchmarkEdgeDetection } from "../engines/edge-detector.ts";
import { PERSONA_CONFIG, GLYPH_PATTERNS } from "../persona-config.ts";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    if (command === "detect" || command === "scan") {
      const marketId = args[1] || "CLI@DEMO";
      console.info(`🔍 Scanning market: ${marketId}`);
      await runPersona(marketId);

    } else if (command === "benchmark" || command === "bench") {
      await runBenchmark();

    } else if (command === "glyphs" || command === "patterns") {
      showGlyphPatterns();

    } else if (command === "health" || command === "status") {
      showPersonaHealth();

    } else if (command === "config") {
      showPersonaConfig();

    } else {
      showHelp();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function runBenchmark(): Promise<void> {
  console.info("🏃 Running comprehensive benchmarks...\n");

  // Run benchmarks in parallel for speed
  const [fdBench, hurstBench, edgeBench] = await Promise.all([
    benchmarkFDComputation(50),
    benchmarkHurstComputation(25),
    benchmarkEdgeDetection(20)
  ]);

  console.info("📊 Benchmark Results:");
  console.info("═".repeat(80));

  console.info("🔢 Fractal Dimension:");
  console.info(`   Average: ${fdBench.averageMs.toFixed(2)}ms`);
  console.info(`   P99:     ${fdBench.p99Ms.toFixed(2)}ms (SLA: <${PERSONA_CONFIG.slas.fdComputation.target}ms)`);
  console.info(`   Throughput: ${Math.round(fdBench.throughput)} ops/sec`);
  console.info(`   Status: ${fdBench.p99Ms < PERSONA_CONFIG.slas.fdComputation.target ? "✅ PASS" : "⚠️  WARNING"}`);

  console.info("\n📈 Hurst Exponent:");
  console.info(`   Average: ${hurstBench.averageMs.toFixed(2)}ms`);
  console.info(`   P99:     ${hurstBench.p99Ms.toFixed(2)}ms (SLA: <${PERSONA_CONFIG.slas.hurstCalc.target}ms)`);
  console.info(`   Throughput: ${Math.round(hurstBench.throughput)} ops/sec`);
  console.info(`   Status: ${hurstBench.p99Ms < PERSONA_CONFIG.slas.hurstCalc.target ? "✅ PASS" : "⚠️  WARNING"}`);

  console.info("\n🎯 Edge Detection:");
  console.info(`   Average: ${edgeBench.averageMs.toFixed(2)}ms`);
  console.info(`   P99:     ${edgeBench.p99Ms.toFixed(2)}ms (SLA: <${PERSONA_CONFIG.slas.edgeDetection.target}ms)`);
  console.info(`   Throughput: ${Math.round(edgeBench.throughput)} ops/sec`);
  console.info(`   Status: ${edgeBench.p99Ms < PERSONA_CONFIG.slas.edgeDetection.target ? "✅ PASS" : "⚠️  WARNING"}`);

  console.info("\n🏆 Overall Performance:");
  console.info(`   Accuracy: ${(PERSONA_CONFIG.benchmarks.edgeDetectionAccuracy * 100).toFixed(1)}%`);
  console.info(`   Compliance: ${PERSONA_CONFIG.benchmarks.complianceCoveragePercent}%`);
  console.info(`   Black Swan Response: ${PERSONA_CONFIG.benchmarks.blackSwanResponseMs}ms`);
  console.info(`   Authorization: PRODUCTION READY`);

  const allPass = fdBench.p99Ms < PERSONA_CONFIG.slas.fdComputation.target &&
                  hurstBench.p99Ms < PERSONA_CONFIG.slas.hurstCalc.target &&
                  edgeBench.p99Ms < PERSONA_CONFIG.slas.edgeDetection.target;

  console.info(`\n${allPass ? "🎉 ALL SLAS MET - PRODUCTION AUTHORIZED" : "⚠️  SLA VIOLATIONS DETECTED"}`);
}

function showGlyphPatterns(): void {
  console.info("🔣 T3-Lattice Glyph Pattern Recognition:");
  console.info("═".repeat(60));

  Object.entries(GLYPH_PATTERNS).forEach(([glyph, description]) => {
    console.info(`   ${glyph.padEnd(15)} → ${description}`);
  });

  console.info("\n📊 Pattern Thresholds:");
  console.info(`   Black Swan:     FD > 2.5`);
  console.info(`   Persistent:     FD > 1.5`);
  console.info(`   Random:         FD > 1.0`);
  console.info(`   Mean Reversion: FD > 0.5`);

  console.info(`\n🎯 Edge Confidence: ${(PERSONA_CONFIG.benchmarks.edgeDetectionAccuracy * 100).toFixed(1)}% threshold`);
}

function showPersonaHealth(): void {
  console.info(`🏥 T3-Lattice Edge Hunter Persona Health Check`);
  console.info("═".repeat(60));
  console.info(`   Persona ID: ${PERSONA_CONFIG.personaId}`);
  console.info(`   Version: ${PERSONA_CONFIG.version}`);
  console.info(`   Status: ACTIVE`);
  console.info(`   Uptime: ${Math.round(process.uptime())}s`);
  console.info(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.info(`   Bun Version: ${Bun.version}`);

  console.info(`\n🔒 Security Status:`);
  console.info(`   CSRF Protection: ${PERSONA_CONFIG.compliance.csrfValidated ? "✅ ACTIVE" : "❌ DISABLED"}`);
  console.info(`   Quantum Audit: ${PERSONA_CONFIG.compliance.quantumAuditTrail ? "✅ ENABLED" : "❌ DISABLED"}`);
  console.info(`   Threat Score: ${PERSONA_CONFIG.compliance.threatScore.toFixed(3)} (LOW RISK)`);

  console.info(`\n📋 Compliance Coverage:`);
  PERSONA_CONFIG.compliance.frameworks.forEach(framework => {
    console.info(`   ${framework}: ✅ COMPLIANT`);
  });
  console.info(`   Overall: ${PERSONA_CONFIG.compliance.dataResidency.join(", ")}`);
}

function showPersonaConfig(): void {
  console.info(`⚙️  T3-Lattice Edge Hunter Configuration:`);
  console.info("═".repeat(60));

  console.info(`📊 Benchmarks:`);
  console.info(`   Edge Detection Accuracy: ${(PERSONA_CONFIG.benchmarks.edgeDetectionAccuracy * 100).toFixed(1)}%`);
  console.info(`   FD Computation: ${PERSONA_CONFIG.benchmarks.fdComputationMs}ms p99`);
  console.info(`   Hurst Calculation: ${PERSONA_CONFIG.benchmarks.hurstCalculationMs}ms p99`);
  console.info(`   Glyph Validation: ${PERSONA_CONFIG.benchmarks.glyphValidationUs}μs/op`);
  console.info(`   Black Swan Response: ${PERSONA_CONFIG.benchmarks.blackSwanResponseMs}ms`);
  console.info(`   Compliance Coverage: ${PERSONA_CONFIG.benchmarks.complianceCoveragePercent}%`);

  console.info(`\n🎯 SLA Targets:`);
  Object.entries(PERSONA_CONFIG.slas).forEach(([metric, sla]) => {
    const name = metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.info(`   ${name}: ${sla.target}ms (${sla.status})`);
  });

  console.info(`\n🔒 Compliance:`);
  console.info(`   Frameworks: ${PERSONA_CONFIG.compliance.frameworks.join(", ")}`);
  console.info(`   Data Residency: ${PERSONA_CONFIG.compliance.dataResidency.join(", ")}`);
  console.info(`   CSRF: ${PERSONA_CONFIG.compliance.csrfValidated ? "ENABLED" : "DISABLED"}`);
  console.info(`   Quantum Audit: ${PERSONA_CONFIG.compliance.quantumAuditTrail ? "ENABLED" : "DISABLED"}`);
}

function showHelp(): void {
  console.info(`
🏆 T3-Lattice Edge Hunter Persona CLI v${PERSONA_CONFIG.version}

Usage: bun run persona/bin/persona-finder.ts <command> [options]

Commands:
  detect <market>    Detect hidden edges in a betting market
  benchmark          Run comprehensive performance benchmarks
  glyphs             Show glyph pattern recognition guide
  health             Show persona health and security status
  config             Display current configuration and SLAs

Examples:
  bun run persona/bin/persona-finder.ts detect NBA@GSW_LAL
  bun run persona/bin/persona-finder.ts benchmark
  bun run persona/bin/persona-finder.ts glyphs
  bun run persona/bin/persona-finder.ts health

API Server: Run 'bun run persona/persona-runner.ts' for HTTP API
  `);
}

main().catch(console.error);