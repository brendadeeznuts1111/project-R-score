/**
 * Anomaly Detection Engine - Usage Examples
 * Real-time fraud/anomaly detection for transaction scoring
 */

import {
  AnomalyEngine,
  createAnomalyEngine,
  createSignal,
  formatScore,
} from "../src/ai/index";

async function main() {
  console.info("🔍 Anomaly Detection Engine - Usage Examples\n");

  // Initialize the engine
  const engine = createAnomalyEngine();
  await engine.initialize();

  console.info("✅ Engine initialized\n");

  // Example 1: Low-risk transaction
  console.info("📊 Example 1: Low-Risk Transaction");
  const lowRiskSignal = createSignal("device-001", {
    deviceAgeDays: 365,
    accountAgeDays: 180,
    legAmount: 100,
    legVelocity: 0.5,
    ipJumpCount: 0,
    ctrProximity: 0.1,
    chargebackHistory: false,
    vpnDetected: false,
  });

  const lowRiskScore = await engine.scoreSignal(lowRiskSignal);
  console.info(`  Score: ${formatScore(lowRiskScore.score)}`);
  console.info(`  Risk Level: ${lowRiskScore.riskLevel}`);
  console.info(`  Action: ${engine.getAction(lowRiskScore).type}`);
  console.info(`  Nebula Code: ${lowRiskScore.nebulaCode}\n`);

  // Example 2: Medium-risk transaction
  console.info("📊 Example 2: Medium-Risk Transaction");
  const mediumRiskSignal = createSignal("device-002", {
    deviceAgeDays: 10,
    accountAgeDays: 30,
    legAmount: 500,
    legVelocity: 5,
    ipJumpCount: 2,
    ctrProximity: 0.7,
    chargebackHistory: false,
    vpnDetected: false,
  });

  const mediumRiskScore = await engine.scoreSignal(mediumRiskSignal);
  console.info(`  Score: ${formatScore(mediumRiskScore.score)}`);
  console.info(`  Risk Level: ${mediumRiskScore.riskLevel}`);
  console.info(`  Action: ${engine.getAction(mediumRiskScore).type}`);
  console.info(`  Nebula Code: ${mediumRiskScore.nebulaCode}`);
  console.info(`  Reasons: ${mediumRiskScore.reasons.join(", ")}\n`);

  // Example 3: High-risk transaction
  console.info("📊 Example 3: High-Risk Transaction");
  const highRiskSignal = createSignal("device-003", {
    deviceAgeDays: 1,
    accountAgeDays: 1,
    legAmount: 5000,
    legVelocity: 8,
    ipJumpCount: 3,
    ctrProximity: 0.95,
    chargebackHistory: true,
    vpnDetected: true,
  });

  const highRiskScore = await engine.scoreSignal(highRiskSignal);
  console.info(`  Score: ${formatScore(highRiskScore.score)}`);
  console.info(`  Risk Level: ${highRiskScore.riskLevel}`);
  console.info(`  Action: ${engine.getAction(highRiskScore).type}`);
  console.info(`  Nebula Code: ${highRiskScore.nebulaCode}`);
  console.info(`  Reasons: ${highRiskScore.reasons.join(", ")}\n`);

  // Example 4: Engine state
  console.info("📈 Engine State");
  const state = engine.getState();
  console.info(`  Total Scores: ${state.totalScores}`);
  console.info(`  Average Latency: ${state.averageLatency.toFixed(2)}ms`);
  console.info(`  Model Loaded: ${state.modelLoaded}\n`);

  console.info("✨ Anomaly detection examples complete!");
}

main().catch(console.error);

