/**
 * Enhanced Edge Detector Integration
 * Combines fractal analysis with microstructure analysis for superior edge detection
 */

import { FractalEngine } from "./t3-lattice-engine";
import { MarketMicrostructureAnalyzer, MicrostructureAnalysis } from "./market-microstructure";
import { randomUUIDv7 } from "bun";

// ============================================================================
// QUANTUM AUDIT SERVICE
// ============================================================================

export class QuantumAuditService {
  private logs: Array<{
    id: string;
    timestamp: number;
    type: string;
    data: any;
  }> = [];
  
  async log(data: any): Promise<string> {
    const id = `qa_${randomUUIDv7().slice(0, 12)}`;
    this.logs.push({
      id,
      timestamp: Date.now(),
      type: data.type || "UNKNOWN",
      data
    });
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
    
    return id;
  }
  
  getLogs(limit: number = 100): any[] {
    return this.logs.slice(-limit);
  }
  
  clear(): void {
    this.logs = [];
  }
}

// ============================================================================
// ENHANCED EDGE DETECTOR
// ============================================================================

export interface EnhancedLatticeEdge {
  id: string;
  market: string;
  fd: number;
  hurst: number;
  glyph: string;
  edge: string;
  confidence: number;
  microstructure: MicrostructureAnalysis;
  requiresReview: boolean;
  quantumLogId: string;
  timestamp: number;
}

export class EnhancedEdgeDetector {
  private fractalEngine: FractalEngine;
  private microstructure: MarketMicrostructureAnalyzer;
  private audit: QuantumAuditService;
  
  constructor() {
    this.fractalEngine = new FractalEngine();
    this.microstructure = new MarketMicrostructureAnalyzer();
    this.audit = new QuantumAuditService();
  }
  
  async detectEnhancedEdge(
    marketId: string,
    ticks: any[],
    publicPercent: number
  ): Promise<EnhancedLatticeEdge | null> {
    const start = Bun.nanoseconds();
    
    // Original fractal analysis
    const [fdResult, hurst] = await Promise.all([
      this.fractalEngine.computeFD(ticks),
      this.fractalEngine.computeHurst(ticks)
    ]);
    
    // New: Microstructure analysis
    const microstructure = await this.microstructure.analyzeMarketMicrostructure(marketId, ticks);
    
    // Adjust confidence based on microstructure
    let adjustedConfidence = this.calculateBaseConfidence(fdResult.value, hurst, publicPercent);
    
    // Reduce confidence if microstructure quality is poor
    if (microstructure.marketQualityScore < 50) {
      adjustedConfidence *= 0.7;
    }
    
    // Increase confidence if execution recommendation is positive
    if (microstructure.executionRecommendation.action === "execute") {
      adjustedConfidence = Math.min(1.0, adjustedConfidence * 1.15);
    }
    
    if (adjustedConfidence < 0.85) {
      return null;
    }
    
    // Generate quantum audit
    const quantumLogId = await this.audit.log({
      type: "ENHANCED_EDGE_DETECTED",
      marketId,
      fd: fdResult.value,
      hurst,
      glyph: fdResult.glyph,
      microstructure: {
        qualityScore: microstructure.marketQualityScore,
        vpin: microstructure.vpin,
        whaleAlert: microstructure.whaleSignals.whaleAlert,
        execution: microstructure.executionRecommendation.action
      },
      confidence: adjustedConfidence
    });
    
    const latency = (Number(Bun.nanoseconds()) - Number(start)) / 1_000_000;
    
    return {
      id: randomUUIDv7(),
      market: marketId,
      fd: fdResult.value,
      hurst,
      glyph: fdResult.glyph,
      edge: this.generateEdgeDescription(fdResult.glyph, microstructure),
      confidence: adjustedConfidence,
      microstructure,
      requiresReview: fdResult.value > 2.5 || microstructure.whaleSignals.whaleAlert,
      quantumLogId,
      timestamp: Date.now()
    };
  }
  
  private calculateBaseConfidence(fd: number, hurst: number, publicPercent: number): number {
    const fdConfidence = fd < 1.5 ? (1 - Math.abs(fd - 1.5) / 2) : 0.7;
    const hurstAdjustment = Math.abs(hurst - 0.6) < 0.2 ? 0.1 : 0;
    const publicEdge = publicPercent > 0.7 || publicPercent < 0.3 ? 0.05 : 0;
    return Math.min(1.0, fdConfidence + hurstAdjustment + publicEdge);
  }
  
  private generateEdgeDescription(glyph: string, microstructure: MicrostructureAnalysis): string {
    const baseDescriptions: Record<string, string> = {
      "▵⟂ экон": "Fade public on away team +4.5",
      "économie(▵⟜⟳)": "Back over total in chaotic market",
      "⟳⟲⟜(▵⊗économie)": "Black swan reversal - fade sharp money",
      "(▵⊗économie)⟂⟳": "Arbitrage opportunity detected",
      "⊟": "Mean reversion play - home team bounce back"
    };
    
    let description = baseDescriptions[glyph] || `Custom edge for market`;
    
    // Add microstructure insights
    if (microstructure.whaleSignals.whaleAlert) {
      description += " [WHALE ACTIVITY DETECTED]";
    }
    
    if (microstructure.darkPoolActivity.sandwichOpportunity) {
      description += " [SANDWICH OPPORTUNITY]";
    }
    
    if (microstructure.executionRecommendation.action === "execute") {
      description += " [EXECUTE RECOMMENDED]";
    } else if (microstructure.executionRecommendation.action === "abort") {
      description += " [EXECUTION NOT RECOMMENDED]";
    }
    
    return description;
  }
  
  // Get all components for dashboard
  getAllComponents() {
    return {
      fractal: this.fractalEngine.getAllComponents(),
      microstructure: this.microstructure.getAllComponents()
    };
  }
  
  // Get cache stats
  getCacheStats() {
    return {
      fractal: this.fractalEngine.getCacheStats(),
      microstructure: this.microstructure.getCacheStats()
    };
  }
  
  // Clear all caches
  clearCaches(): void {
    this.fractalEngine.clearCache();
    this.microstructure.clearCache();
    this.audit.clear();
  }
  
  // Get audit logs
  getAuditLogs(limit: number = 100) {
    return this.audit.getLogs(limit);
  }
}

// ============================================================================
// BENCHMARK FOR ENHANCED DETECTOR
// ============================================================================

export async function runEnhancedDetectorBenchmarks(): Promise<void> {
  console.log("\n🚀 Enhanced Edge Detector Benchmarks\n");
  console.log("═".repeat(70));
  
  const detector = new EnhancedEdgeDetector();
  const iterations = 50;
  
  // Generate test data
  const testTicks: any[] = [];
  for (let i = 0; i < 1000; i++) {
    testTicks.push({
      id: i,
      timestamp: Date.now() - (1000 - i) * 1000,
      spread: -4.5 + Math.sin(i / 100) * 2 + (Math.random() - 0.5) * 0.5,
      ml: -180 + Math.random() * 20,
      total: 225 + Math.random() * 10,
      volume: Math.floor(Math.random() * 50000),
      hash: Bun.hash.wyhash(`${i}`),
      source: ["sharp", "public", "dark", "whale"][Math.floor(Math.random() * 4)]
    });
  }
  
  // Benchmark: Enhanced edge detection
  console.log("\n1. Enhanced Edge Detection (1000 ticks)");
  const enhancedStart = Number(Bun.nanoseconds());
  let edgesFound = 0;
  
  for (let i = 0; i < iterations; i++) {
    const edge = await detector.detectEnhancedEdge(`TEST@MARKET-${i}`, testTicks, 0.6);
    if (edge) edgesFound++;
  }
  
  const enhancedMs = (Number(Bun.nanoseconds()) - enhancedStart) / 1_000_000;
  console.log(`   Total: ${enhancedMs.toFixed(2)}ms`);
  console.log(`   Per detection: ${(enhancedMs / iterations).toFixed(2)}ms`);
  console.log(`   Edges found: ${edgesFound}/${iterations} (${(edgesFound/iterations*100).toFixed(1)}%)`);
  
  // Benchmark: Microstructure only
  console.log("\n2. Microstructure Analysis Only");
  const microStart = Number(Bun.nanoseconds());
  
  for (let i = 0; i < iterations; i++) {
    await detector["microstructure"].analyzeMarketMicrostructure(`TEST@MARKET-${i}`, testTicks);
  }
  
  const microMs = (Number(Bun.nanoseconds()) - microStart) / 1_000_000;
  console.log(`   Total: ${microMs.toFixed(2)}ms`);
  console.log(`   Per analysis: ${(microMs / iterations).toFixed(2)}ms`);
  
  // Cache performance
  console.log("\n3. Cache Performance");
  await detector.detectEnhancedEdge("CACHE@TEST", testTicks, 0.6);
  const cacheStats = detector.getCacheStats();
  console.log(`   Fractal cache: ${cacheStats.fractal.size} entries, ${(cacheStats.fractal.hitRate * 100).toFixed(1)}% hit rate`);
  console.log(`   Micro cache: ${cacheStats.microstructure.size} entries, ${(cacheStats.microstructure.hitRate * 100).toFixed(1)}% hit rate`);
  
  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("📈 ENHANCED DETECTOR SUMMARY");
  console.log("═".repeat(70));
  console.log(`   Total detections: ${iterations}`);
  console.log(`   Successful edges: ${edgesFound}`);
  console.log(`   Success rate: ${(edgesFound/iterations*100).toFixed(1)}%`);
  console.log(`   Average latency: ${(enhancedMs / iterations).toFixed(2)}ms`);
  console.log(`   Combined throughput: ${(iterations / (enhancedMs / 1000)).toFixed(0)} detections/sec`);
  console.log("═".repeat(70));
  
  // Show sample edge
  if (edgesFound > 0) {
    const sampleEdge = await detector.detectEnhancedEdge("SAMPLE@MARKET", testTicks, 0.6);
    if (sampleEdge) {
      console.log("\n🎯 SAMPLE EDGE DETECTED:");
      console.log(`   Market: ${sampleEdge.market}`);
      console.log(`   FD: ${sampleEdge.fd.toFixed(3)} | Hurst: ${sampleEdge.hurst.toFixed(3)}`);
      console.log(`   Glyph: ${sampleEdge.glyph}`);
      console.log(`   Confidence: ${(sampleEdge.confidence * 100).toFixed(1)}%`);
      console.log(`   Edge: ${sampleEdge.edge}`);
      console.log(`   Quality Score: ${sampleEdge.microstructure.marketQualityScore.toFixed(1)}`);
      console.log(`   Whale Alert: ${sampleEdge.microstructure.whaleSignals.whaleAlert ? "🚨 YES" : "✅ NO"}`);
      console.log(`   Execution: ${sampleEdge.microstructure.executionRecommendation.action.toUpperCase()}`);
      console.log(`   Requires Review: ${sampleEdge.requiresReview ? "⚠️ YES" : "✅ NO"}`);
    }
  }
  
  console.log("\n");
}
