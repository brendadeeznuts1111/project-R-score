#!/usr/bin/env bun
/**
 * Anomaly Detection Example
 * 
 * Demonstrates ML-based threat detection for session security
 * Usage: bun run ai/anomaly-predict.ts
 */

import { anomalyDetector, AnomalyFeatures } from '../src/compliance/anomalyDetector';
import { sessionManager } from '../src/compliance/sessionManager';

/**
 * Example 1: Direct anomaly prediction
 */
async function exampleDirectPrediction() {
  console.info('\n📊 Example 1: Direct Anomaly Prediction\n');

  const features: AnomalyFeatures = {
    root_detected: 1,           // Device is rooted
    vpn_active: 1,              // VPN is active
    thermal_spike: 18,          // 18°C temperature spike
    biometric_fail: 4,          // 4 failed biometric attempts
    proxy_hop_count: 3,         // 3 proxy hops
    location_change: 2000,      // 2000 km from last location
    time_anomaly: 0.8,          // Unusual access time
    device_fingerprint_mismatch: 1,
    unusual_transaction_pattern: 1,
    rapid_api_calls: 150,       // 150 requests/minute
  };

  const score = await anomalyDetector.predict(features);

  console.info(`Risk Score: ${(score.score * 100).toFixed(1)}%`);
  console.info(`Risk Level: ${score.level.toUpperCase()}`);
  console.info(`Block Session: ${score.blockSession ? '🚫 YES' : '✅ NO'}`);
  console.info(`\nRecommendation: ${score.recommendation}`);

  console.info('\nTop Risk Factors:');
  score.factors.slice(0, 5).forEach((factor, i) => {
    console.info(`  ${i + 1}. ${factor.name}: ${(factor.contribution * 100).toFixed(1)}%`);
  });
}

/**
 * Example 2: Session creation with anomaly check
 */
async function exampleSessionCreation() {
  console.info('\n\n🔐 Example 2: Session Creation with Anomaly Check\n');

  const features: AnomalyFeatures = {
    root_detected: 0,
    vpn_active: 0,
    thermal_spike: 5,
    biometric_fail: 0,
    proxy_hop_count: 0,
    location_change: 10,
    time_anomaly: 0.1,
    device_fingerprint_mismatch: 0,
    unusual_transaction_pattern: 0,
    rapid_api_calls: 20,
  };

  const result = await sessionManager.createSession(
    'user_12345',
    '192.168.1.100',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    'device_fp_abc123',
    features
  );

  console.info(`Session ID: ${result.sessionId}`);
  console.info(`Allowed: ${result.allowed ? '✅ YES' : '🚫 NO'}`);
  console.info(`Risk Score: ${(result.anomalyScore.score * 100).toFixed(1)}%`);
  console.info(`Requires Challenge: ${result.requiresChallenge ? '⚠️  YES' : '✅ NO'}`);
  console.info(`Message: ${result.message}`);
}

/**
 * Example 3: Session validation with periodic checks
 */
async function exampleSessionValidation() {
  console.info('\n\n✔️  Example 3: Session Validation\n');

  // Create session first
  const createResult = await sessionManager.createSession(
    'user_67890',
    '192.168.1.101',
    'Mozilla/5.0 (Android 14)',
    'device_fp_xyz789',
    {
      root_detected: 0,
      vpn_active: 0,
      thermal_spike: 3,
      biometric_fail: 0,
      proxy_hop_count: 0,
    }
  );

  const sessionId = createResult.sessionId;
  console.info(`Created session: ${sessionId}`);
  console.info(`Initial risk: ${(createResult.anomalyScore.score * 100).toFixed(1)}%\n`);

  // Validate session with normal features
  console.info('Validating with normal features...');
  const normalValidation = await sessionManager.validateSession(sessionId, {
    root_detected: 0,
    vpn_active: 0,
    thermal_spike: 2,
    biometric_fail: 0,
    proxy_hop_count: 0,
  });

  console.info(`Allowed: ${normalValidation.allowed ? '✅ YES' : '🚫 NO'}`);
  console.info(`Risk: ${(normalValidation.anomalyScore.score * 100).toFixed(1)}%\n`);

  // Validate with suspicious features
  console.info('Validating with suspicious features...');
  const suspiciousValidation = await sessionManager.validateSession(sessionId, {
    root_detected: 1,
    vpn_active: 1,
    thermal_spike: 20,
    biometric_fail: 5,
    proxy_hop_count: 4,
    location_change: 5000,
    rapid_api_calls: 200,
  });

  console.info(`Allowed: ${suspiciousValidation.allowed ? '✅ YES' : '🚫 NO'}`);
  console.info(`Risk: ${(suspiciousValidation.anomalyScore.score * 100).toFixed(1)}%`);
  console.info(`Message: ${suspiciousValidation.message}`);
}

/**
 * Example 4: Batch prediction
 */
async function exampleBatchPrediction() {
  console.info('\n\n📈 Example 4: Batch Prediction\n');

  const sessions = [
    {
      id: 'session_1',
      features: {
        root_detected: 0,
        vpn_active: 0,
        thermal_spike: 5,
        biometric_fail: 0,
        proxy_hop_count: 0,
      } as AnomalyFeatures,
    },
    {
      id: 'session_2',
      features: {
        root_detected: 1,
        vpn_active: 1,
        thermal_spike: 25,
        biometric_fail: 6,
        proxy_hop_count: 5,
      } as AnomalyFeatures,
    },
    {
      id: 'session_3',
      features: {
        root_detected: 0,
        vpn_active: 0,
        thermal_spike: 8,
        biometric_fail: 1,
        proxy_hop_count: 1,
      } as AnomalyFeatures,
    },
  ];

  const results = await anomalyDetector.predictBatch(sessions);

  console.info('Batch Results:');
  results.forEach((score, sessionId) => {
    console.info(`\n  ${sessionId}:`);
    console.info(`    Risk: ${(score.score * 100).toFixed(1)}% (${score.level})`);
    console.info(`    Block: ${score.blockSession ? '🚫' : '✅'}`);
  });
}

/**
 * Run all examples
 */
async function main() {
  console.info('═'.repeat(60));
  console.info('🤖 Anomaly Detection System - Examples');
  console.info('═'.repeat(60));

  try {
    await exampleDirectPrediction();
    await exampleSessionCreation();
    await exampleSessionValidation();
    await exampleBatchPrediction();

    console.info('\n' + '═'.repeat(60));
    console.info('✅ All examples completed successfully!');
    console.info('═'.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

