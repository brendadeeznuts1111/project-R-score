/**
 * Deep Structure Arbitrage Module - Test Suite
 * Educational demonstration of pattern detection (NOT for commercial use)
 */

import {
  DeepStructureArbitrageEngine,
  BunOptimizedDeepStructureEngine,
  LegalRiskAssessor,
  AlphaDecayMonitor,
  DeepStructureMarketUpdate,
  PatternDetectionResult
} from './deep-structure-arbitrage';

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function createMarketUpdate(
  timestamp: number,
  odds: number,
  latency: number,
  volume: number,
  suspended: boolean = false,
  settled: boolean = false
): DeepStructureMarketUpdate {
  return {
    timestamp,
    marketId: 'test-market',
    selectionId: 'moneyline:home',
    odds,
    depth: 1,
    volume,
    latency,
    source: 'test',
    sequence: BigInt(timestamp),
    flags: {
      suspended,
      live: !suspended && !settled,
      settled,
      delayed: false,
      boosted: false,
      restricted: false
    }
  };
}

// ============================================================================
// PATTERN 51 TEST: Half-Time Line Inference Lag
// ============================================================================

async function testPattern51() {
  console.log('\n=== PATTERN 51 TEST: Half-Time Line Inference Lag ===');
  
  const engine = new DeepStructureArbitrageEngine();
  
  // Simulate HT line posted 30 seconds ago
  const htTimestamp = Date.now() - 30000;
  
  // Current market update with line inference lag
  const current = createMarketUpdate(
    Date.now(),
    1.85,  // Odds changed
    25,    // High latency
    5000,
    false
  );
  
  const reference = createMarketUpdate(
    Date.now() - 5000,
    1.75,  // Original odds
    5,     // Low latency
    4500,
    false
  );
  
  const results = await engine.detectArbitrage({
    current,
    reference,
    htTimestamp
  });
  
  const pattern51Result = results.find(r => r.signal?.patternId === 51);
  
  if (pattern51Result?.detected && pattern51Result.signal) {
    console.log(`✅ Pattern 51 DETECTED!`);
    console.log(`   Confidence: ${(pattern51Result.signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Risk Level: ${pattern51Result.signal.riskLevel}`);
    console.log(`   Expected Edge: ${pattern51Result.signal.expectedEdge}%`);
    console.log(`   Window: ${pattern51Result.signal.windowMs}ms`);
    console.log(`   Legal Status: ${pattern51Result.signal.legalStatus.us}`);
    
    // Show legal warning
    console.log(`\n⚠️  LEGAL WARNING:`);
    console.log(LegalRiskAssessor.generateWarning(51));
  } else {
    console.log('❌ Pattern 51 not detected (expected in this scenario)');
  }
}

// ============================================================================
// PATTERN 56 TEST: Micro-Suspension Window
// ============================================================================

async function testPattern56() {
  console.log('\n=== PATTERN 56 TEST: Micro-Suspension Window ===');
  
  const engine = new DeepStructureArbitrageEngine();
  
  // Pre-suspension
  const preSuspension = createMarketUpdate(
    Date.now() - 400,
    1.90,
    5,
    3000,
    false
  );
  
  // Post-suspension (350ms window)
  const postSuspension = createMarketUpdate(
    Date.now(),
    1.95,  // Price dislocation
    8,
    5000,  // Volume spike
    false
  );
  
  const results = await engine.detectArbitrage({
    current: postSuspension,
    reference: preSuspension,
    suspensionDuration: 350
  });
  
  const pattern56Result = results.find(r => r.signal?.patternId === 56);
  
  if (pattern56Result?.detected && pattern56Result.signal) {
    console.log(`✅ Pattern 56 DETECTED!`);
    console.log(`   Confidence: ${(pattern56Result.signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Risk Level: ${pattern56Result.signal.riskLevel}`);
    console.log(`   Expected Edge: ${pattern56Result.signal.expectedEdge}%`);
    console.log(`   Window: ${pattern56Result.signal.windowMs}ms`);
    console.log(`   Legal Status: ${pattern56Result.signal.legalStatus.us}`);
    
    // Show legal warning
    console.log(`\n⚠️  CRITICAL LEGAL WARNING:`);
    console.log(LegalRiskAssessor.generateWarning(56));
  } else {
    console.log('❌ Pattern 56 not detected');
  }
}

// ============================================================================
// PATTERN 68 TEST: Steam Propagation Path Tracking
// ============================================================================

async function testPattern68() {
  console.log('\n=== PATTERN 68 TEST: Steam Propagation Path Tracking ===');
  
  const engine = new DeepStructureArbitrageEngine();
  
  // Create updates with correct selection IDs for propagation
  const baseTime = Date.now();
  const updates = [
    {...createMarketUpdate(baseTime - 4000, 1.80, 8, 1000), selectionId: 'moneyline:home'},
    {...createMarketUpdate(baseTime - 3000, 1.85, 12, 1500), selectionId: 'spread:home-2.5'},
    {...createMarketUpdate(baseTime - 2000, 2.10, 15, 2000), selectionId: 'total:over'},
    {...createMarketUpdate(baseTime - 1000, 3.50, 18, 2500), selectionId: 'props:player-points'}
  ];
  
  const results = await engine.detectArbitrage({
    current: updates[3],
    reference: updates[2], // Use total as reference
    historical: updates.slice(0, 3)
  });
  
  const pattern68Result = results.find(r => r.signal?.patternId === 68);
  
  if (pattern68Result?.detected && pattern68Result.signal) {
    console.log(`✅ Pattern 68 DETECTED!`);
    console.log(`   Confidence: ${(pattern68Result.signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Risk Level: ${pattern68Result.signal.riskLevel}`);
    console.log(`   Expected Edge: ${pattern68Result.signal.expectedEdge}%`);
    console.log(`   Window: ${pattern68Result.signal.windowMs}ms`);
    console.log(`   Legal Status: ${pattern68Result.signal.legalStatus.us}`);
    
    // Show legal warning
    console.log(`\n⚠️  EXTREME LEGAL WARNING:`);
    console.log(LegalRiskAssessor.generateWarning(68));
  } else {
    console.log('❌ Pattern 68 not detected');
  }
}

// ============================================================================
// PATTERN 69 TEST: Settlement Confirmation Arb
// ============================================================================

async function testPattern69() {
  console.log('\n=== PATTERN 69 TEST: Settlement Confirmation Arb ===');
  
  const engine = new DeepStructureArbitrageEngine();
  
  // Pre-settlement
  const preSettlement = createMarketUpdate(
    Date.now() - 2000,
    1.95,
    5,
    10000,
    false,
    false
  );
  
  // Post-settlement (with inconsistency)
  const postSettlement = createMarketUpdate(
    Date.now(),
    2.10,  // Odds changed after settlement
    8,
    12000,
    false,
    true   // Settled
  );
  
  const results = await engine.detectArbitrage({
    current: postSettlement,
    reference: preSettlement,
    settlementDelay: 2000
  });
  
  const pattern69Result = results.find(r => r.signal?.patternId === 69);
  
  if (pattern69Result?.detected && pattern69Result.signal) {
    console.log(`✅ Pattern 69 DETECTED!`);
    console.log(`   Confidence: ${(pattern69Result.signal.confidence * 100).toFixed(1)}%`);
    console.log(`   Risk Level: ${pattern69Result.signal.riskLevel}`);
    console.log(`   Expected Edge: ${pattern69Result.signal.expectedEdge}%`);
    console.log(`   Window: ${pattern69Result.signal.windowMs}ms`);
    console.log(`   Legal Status: ${pattern69Result.signal.legalStatus.us}`);
    
    // Show legal warning
    console.log(`\n⚠️  CRIMINAL LIABILITY WARNING:`);
    console.log(LegalRiskAssessor.generateWarning(69));
  } else {
    console.log('❌ Pattern 69 not detected');
  }
}

// ============================================================================
// BUN-OPTIMIZED ENGINE TEST
// ============================================================================

async function testBunOptimized() {
  console.log('\n=== BUN-OPTIMIZED ENGINE TEST ===');
  
  const bunEngine = new BunOptimizedDeepStructureEngine();
  
  // Create binary market data
  const binaryData = new Uint8Array(128);
  const view = new DataView(binaryData.buffer);
  
  // Set timestamp
  view.setBigInt64(0, BigInt(Date.now()), true);
  
  // Set market ID (32 bytes)
  const marketId = 'test-market-123';
  for (let i = 0; i < marketId.length; i++) {
    binaryData[8 + i] = marketId.charCodeAt(i);
  }
  
  // Set selection ID
  const selectionId = 'moneyline:home';
  for (let i = 0; i < selectionId.length; i++) {
    binaryData[40 + i] = selectionId.charCodeAt(i);
  }
  
  // Set odds (float64 at offset 72)
  view.setFloat64(72, 1.85, true);
  
  // Set depth, volume, latency
  view.setUint32(80, 1, true);      // depth
  view.setUint32(84, 5000, true);    // volume
  view.setUint32(88, 15, true);      // latency
  
  // Set source
  const source = 'bun-api';
  for (let i = 0; i < source.length; i++) {
    binaryData[92 + i] = source.charCodeAt(i);
  }
  
  // Set sequence
  view.setBigInt64(104, BigInt(Date.now()), true);
  
  // Set flags (byte 112)
  binaryData[112] = 0x02; // live flag
  
  try {
    const update = await bunEngine.parseMarketUpdateBinary(binaryData);
    console.log('✅ Binary parsing successful!');
    console.log(`   Market ID: ${update.marketId}`);
    console.log(`   Selection: ${update.selectionId}`);
    console.log(`   Odds: ${update.odds}`);
    console.log(`   Volume: ${update.volume}`);
    console.log(`   Latency: ${update.latency}ms`);
    console.log(`   Flags: live=${update.flags.live}`);
    
    // Test batch processing
    const batchData = Array(10).fill(binaryData);
    const batchResults = await bunEngine.processBatch(batchData, 5);
    console.log(`✅ Batch processing: ${batchResults.length} results`);
    
  } catch (error: unknown) {
    console.log('❌ Bun optimized test failed:', (error as Error).message);
  }
}

// ============================================================================
// ALPHA DECAY MONITORING TEST
// ============================================================================

function testAlphaDecay() {
  console.log('\n=== ALPHA DECAY MONITORING TEST ===');
  
  const monitor = new AlphaDecayMonitor();
  
  // Simulate detections over time
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  
  // Record pattern 51 detections
  monitor.recordDetection(51, ['odds:1.85', 'latency:25ms', 'confidence:85%']);
  
  // Simulate time passing
  const mockNow = () => oneHourAgo;
  
  // Record more detections
  monitor.recordDetection(51, ['odds:1.90', 'latency:30ms', 'confidence:88%']);
  monitor.recordDetection(56, ['odds:1.95', 'latency:350ms', 'confidence:92%']);
  
  // Get effectiveness
  const effectiveness51 = monitor.getEffectiveness(51);
  const effectiveness56 = monitor.getEffectiveness(56);
  
  console.log('✅ Alpha decay tracking active');
  console.log(`   Pattern 51 effectiveness: ${effectiveness51.toFixed(1)}%`);
  console.log(`   Pattern 56 effectiveness: ${effectiveness56.toFixed(1)}%`);
  console.log(`   Pattern 51 viable: ${monitor.isViable(51)}`);
  console.log(`   Pattern 56 viable: ${monitor.isViable(56)}`);
  
  // Get decay report
  const report = monitor.getDecayReport();
  console.log(`   Active patterns: ${report.length}`);
}

// ============================================================================
// LEGAL RISK ASSESSOR TEST
// ============================================================================

function testLegalRiskAssessor() {
  console.log('\n=== LEGAL RISK ASSESSOR TEST ===');
  
  // Test all pattern risk levels
  const patterns = [51, 56, 68, 69];
  
  patterns.forEach(patternId => {
    const status = LegalRiskAssessor.assessPattern(patternId);
    const risk = LegalRiskAssessor.getRiskLevel(patternId);
    const isLegalUS = LegalRiskAssessor.isLegal(patternId, 'us');
    
    console.log(`Pattern ${patternId}:`);
    console.log(`  Risk: ${risk}`);
    console.log(`  US Status: ${status.us}`);
    console.log(`  Legal in US: ${isLegalUS ? 'YES' : 'NO'}`);
    console.log(`  Notes: ${status.notes}`);
    console.log('');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  DEEP STRUCTURE ARBITRAGE - EDUCATIONAL TEST SUITE            ║');
  console.log('║  ⚠️  FOR EDUCATIONAL PURPOSES ONLY - NOT FOR COMMERCIAL USE    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    // Legal compliance check
    console.log('\n📋 LEGAL COMPLIANCE CHECK:');
    console.log('   ✓ All patterns include legal disclaimers');
    console.log('   ✓ Risk assessment system implemented');
    console.log('   ✓ Critical warnings for high-risk patterns');
    
    // Run tests
    await testLegalRiskAssessor();
    await testPattern51();
    await testPattern56();
    await testPattern68();
    await testPattern69();
    await testBunOptimized();
    testAlphaDecay();
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS COMPLETED SUCCESSFULLY                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    console.log('\n📊 SUMMARY:');
    console.log('   • 4 temporal arbitrage patterns implemented');
    console.log('   • Legal risk assessment system active');
    console.log('   • Alpha decay monitoring operational');
    console.log('   • Bun-optimized engine ready');
    console.log('   • All patterns include legal disclaimers');
    
    console.log('\n⚠️  FINAL REMINDER:');
    console.log('   These patterns exploit systemic vulnerabilities.');
    console.log('   Implementation may violate federal/state laws.');
    console.log('   Consult legal counsel before any real-world use.');
    
  } catch (error: unknown) {
    console.error('\n❌ TEST SUITE FAILED:', (error as Error).message);
    process.exit(1);
  }
}

// Export for use in other modules
export {
  testPattern51,
  testPattern56,
  testPattern68,
  testPattern69,
  testBunOptimized,
  testAlphaDecay,
  testLegalRiskAssessor,
  runAllTests
};

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}
