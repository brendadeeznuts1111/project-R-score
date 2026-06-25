/**
 * Sports Betting Fractal Dashboard with Bun.color Integration
 * Main entry point for real-time visualization system
 */

import { startWebSocketServer } from "./websocket-server";
import { runComprehensiveBenchmark, printBenchmarkResults } from "./performance-benchmark";
import { MarketMicrostructureAnalyzer, runMicrostructureBenchmarks, MICROSTRUCTURE_COMPONENTS } from "./market-microstructure";
import { EnhancedEdgeDetector, runEnhancedDetectorBenchmarks } from "./enhanced-edge-detector";

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.info("🎯 Sports Betting Fractal Dashboard");
  console.info("=====================================\n");

  if (command === "benchmark") {
    console.info("Running performance benchmark...\n");
    const metrics = await runComprehensiveBenchmark();
    printBenchmarkResults(metrics);
    
    // Export benchmark data
    const fs = require("fs");
    const path = require("path");
    const exportData = JSON.stringify({
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
      metrics,
      system: {
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    }, null, 2);
    
    const exportPath = path.join(process.cwd(), "benchmark-results.json");
    fs.writeFileSync(exportPath, exportData);
    console.info(`📊 Benchmark results exported to: ${exportPath}\n`);
    
    process.exit(0);
  }

  if (command === "server") {
    const port = parseInt(args[1]) || parseInt(process.env.PORT || '3000', 10);
    const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
    console.info(`🚀 Starting T3-LATTICE v3.4 servers on port ${port}...`);
    console.info(`📊 HTTP API: http://${SERVER_HOST}:${port}/health`);
    console.info(`📡 WebSocket: ws://${SERVER_HOST}:${port}/ws`);
    console.info("💡 Press Ctrl+C to stop\n");
    
    // Start HTTP server
    const { createHTTPServer } = await import("./server");
    const httpServer = createHTTPServer(port);
    
    // Start WebSocket server
    const wsServer = startWebSocketServer(port);
    
    // Graceful shutdown
    process.on("SIGINT", () => {
      console.info("\n🛑 Shutting down servers...");
      httpServer.stop();
      wsServer.stop();
      process.exit(0);
    });
    
    return;
  }

  if (command === "demo") {
    console.info("🎨 Running visualization demo...\n");
    await runDemo();
    return;
  }

  if (command === "microstructure") {
    console.info("📊 Running microstructure benchmarks...\n");
    await runMicrostructureBenchmarks();
    return;
  }

  if (command === "enhanced") {
    console.info("🚀 Running enhanced edge detector benchmarks...\n");
    await runEnhancedDetectorBenchmarks();
    return;
  }

  if (command === "components") {
    console.info("\n📋 T3-LATTICE v3.4 COMPONENT REGISTRY\n");
    console.info("═".repeat(80));
    
    const analyzer = new MarketMicrostructureAnalyzer();
    const components = analyzer.getAllComponents();
    
    console.info("\n🎨 FRACTAL COMPONENTS:");
    console.info("   ID  Name                    Hex       Slot                  Performance");
    console.info("   ──  ──────────────────────  ────────  ────────────────────  ───────────");
    console.info(`   01  Fractal Dimension       #FF6B6B   /slots/fd             <1ms/1000 ticks`);
    console.info(`   02  Hurst Exponent          #4ECDC4   /slots/hurst          <1ms/1000 ticks`);
    
    console.info("\n📊 MICROSTRUCTURE COMPONENTS (25-31):");
    console.info("   ID  Name                    Hex       Slot                  Performance");
    console.info("   ──  ──────────────────────  ────────  ────────────────────  ───────────");
    
    components.forEach((comp: any) => {
      const idStr = comp.id.toString().padStart(2, "0");
      const nameStr = comp.name.padEnd(21, " ");
      const hexStr = comp.hex.padEnd(9, " ");
      const slotStr = comp.slot.padEnd(20, " ");
      const perfStr = comp.performanceMetric;
      console.info(`   ${idStr}  ${nameStr}  ${hexStr}  ${slotStr}  ${perfStr}`);
    });
    
    console.info("\n🎯 INTEGRATED FEATURES:");
    console.info("   • Enhanced Edge Detector (combines fractal + microstructure)");
    console.info("   • Quantum Audit Service (traceable decision logging)");
    console.info("   • Multi-level cache (fractal + microstructure)");
    console.info("   • Real-time WebSocket streaming");
    console.info("   • Bun.native APIs (nanoseconds, hash, compression)");
    
    console.info("\n💡 USAGE:");
    console.info("   bun start components    - Show this registry");
    console.info("   bun start microstructure - Run microstructure benchmarks");
    console.info("   bun start enhanced      - Run enhanced detector");
    console.info("   bun start server        - Start WebSocket server");
    console.info("   bun start benchmark     - Run full system benchmark");
    console.info("   bun start demo          - Run visualization demo");
    
    console.info("\n" + "═".repeat(80) + "\n");
    return;
  }

  // Default: Show help
  console.info("Usage:");
  console.info("  bun start server [port]    - Start WebSocket server");
  console.info("  bun start benchmark        - Run performance benchmarks");
  console.info("  bun start demo             - Run visualization demo");
  console.info("  bun start microstructure   - Run microstructure benchmarks");
  console.info("  bun start enhanced         - Run enhanced edge detector");
  console.info("  bun start components       - Show component registry");
  console.info("\nExamples:");
  console.info("  bun start server 3000");
  console.info("  bun start benchmark");
  console.info("  bun start demo");
  console.info("  bun start components\n");
}

async function runDemo() {
  const { processOddsStream } = await import("./websocket-server");
  const { generateFractalLattice } = await import("./lattice-visualization");
  const { exportVisualizationData } = await import("./lattice-visualization");
  
  // Import type separately
  type LatticeConfig = import("./lattice-visualization").LatticeConfig;

  // Generate sample data (use empty packets to trigger simulation)
  console.info("📊 Generating sample odds data...");
  const packets = [new Uint8Array(0)]; // Empty packet triggers simulation
  
  // Process stream
  console.info("🧮 Processing fractal dimensions...");
  const nodes = await processOddsStream(packets);
  
  // Generate lattice
  const config: LatticeConfig = {
    width: 800,
    height: 600,
    nodeCount: nodes.length,
    connectionRadius: 120,
    animationSpeed: 1
  };
  
  const fdValues = nodes.map(n => n.fd);
  const lattice = generateFractalLattice(config, fdValues);
  
  // Export data
  const exportData = exportVisualizationData(lattice);
  
  console.info("\n✅ Demo Results:");
  console.info(`   - Processed ${packets.length} simulated packets`);
  console.info(`   - Generated ${nodes.length} fractal nodes`);
  console.info(`   - Created lattice with ${lattice.length} visual nodes`);
  console.info(`   - Average FD: ${exportData.summary.avgFD.toFixed(3)}`);
  console.info(`   - Chaotic nodes: ${exportData.summary.chaoticNodes}`);
  console.info(`   - High intensity: ${exportData.summary.highIntensity}`);
  
  // Show sample node details
  console.info("\n🔍 Sample Nodes:");
  lattice.slice(0, 3).forEach((node, i) => {
    console.info(`   Node ${i + 1}: FD=${node.fd.toFixed(2)}, Color=${node.color}, Glyph=${node.glyph}`);
  });
  
  console.info("\n💡 Key Insights:");
  if (exportData.summary.chaoticNodes > 0) {
    console.info("   🚨 Chaotic nodes detected - potential black swan events!");
  }
  if (exportData.summary.highIntensity > 0) {
    console.info("   ⚡ High volatility clusters found - watch for arbitrage!");
  }
  if (exportData.summary.avgFD < 1.2) {
    console.info("   🟢 Mostly stable patterns - predictable trends");
  }
  
  console.info("\n🎨 Visualization ready for Canvas/WebGL rendering");
}

// Run main
main().catch(console.error);
