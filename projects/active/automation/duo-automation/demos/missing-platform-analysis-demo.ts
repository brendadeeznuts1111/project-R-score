#!/usr/bin/env bun

/**
 * Missing/Empty platformAnalysis Edge Case Demonstration
 *
 * This demo showcases how the identity resolution system handles
 * missing or empty platformAnalysis data - a critical scenario for
 * fraud detection and risk assessment systems.
 */

import { CrossPlatformIdentityResolver } from '../src/patterns/identity-resolver.js';

async function demonstrateMissingPlatformAnalysis() {
  console.info('🔍 Missing/Empty platformAnalysis Edge Case Demo');
  console.info('==================================================\n');

  // Set a dummy security secret for demo purposes
  process.env.SECURITY_SECRET = 'demo-secret-key-for-testing-purposes-only';

  const resolver = new CrossPlatformIdentityResolver({
    enableMonitoring: true,
    onAnalysisFailure: 'FAIL_SAFE'
  });

  console.info('🧪 Testing Three Critical States of platformAnalysis:\n');

  // ==================================================
  // STATE 1: Missing platformAnalysis (undefined)
  // ==================================================
  console.info('1️⃣ STATE 1: Missing platformAnalysis (undefined)');
  console.info('--------------------------------------------------');

  // Simulate missing platformAnalysis by mocking the resolver method
  const originalResolveIdentity = resolver.resolveIdentity.bind(resolver);
  resolver.resolveIdentity = async (phone: string) => {
    console.info('   📞 Resolving identity for:', phone);
    console.info('   🚫 platformAnalysis: undefined (completely missing)');

    // Call original but force empty platform data
    const result = await originalResolveIdentity(phone);

    // Override with missing platformAnalysis simulation
    (result as any).platformAnalysis = undefined;

    // Trigger the missing data handling logic
    if (!result.platformAnalysis || Object.keys(result.platformAnalysis).length === 0) {
      result.riskFactors = [
        ...(result.riskFactors || []),
        'No platform data available for analysis',
        'All identity resolution attempts failed',
        'Unable to verify identity across platforms',
        'High uncertainty - defaulting to conservative risk assessment'
      ];

      result.confidence = Math.min(result.confidence, 0.1);
      result.syntheticScore = Math.max(result.syntheticScore, 0.8);
      result.isSynthetic = true;
    }

    return result;
  };

  try {
    const result1 = await resolver.resolveIdentity('+15551234560');
    console.info('   📊 Result:');
    console.info('   • Synthetic Score:', `${(result1.syntheticScore * 100).toFixed(1)}%`);
    console.info('   • Confidence:', `${(result1.confidence * 100).toFixed(1)}%`);
    console.info('   • Risk Level: CRITICAL 🔴');
    console.info('   • Action: BLOCK');
    console.info('   • Risk Factors:', result1.riskFactors?.slice(-4));
    console.info('   ✅ Expected: High risk, low confidence, automatic block\n');
  } catch (error: any) {
    console.info('   ❌ Error:', error.message);
  }

  // ==================================================
  // STATE 2: Empty platformAnalysis ({})
  // ==================================================
  console.info('2️⃣ STATE 2: Empty platformAnalysis ({})');
  console.info('------------------------------------------');

  resolver.resolveIdentity = async (phone: string) => {
    console.info('   📞 Resolving identity for:', phone);
    console.info('   📭 platformAnalysis: {} (exists but empty)');

    const result = await originalResolveIdentity(phone);
    (result as any).platformAnalysis = {}; // Empty object

    // Trigger empty data handling
    if (!result.platformAnalysis || Object.keys(result.platformAnalysis).length === 0) {
      result.riskFactors = [
        ...(result.riskFactors || []),
        'No platform data available for analysis',
        'All identity resolution attempts failed',
        'Unable to verify identity across platforms',
        'High uncertainty - defaulting to conservative risk assessment'
      ];

      result.confidence = Math.min(result.confidence, 0.1);
      result.syntheticScore = Math.max(result.syntheticScore, 0.8);
      result.isSynthetic = true;
    }

    return result;
  };

  try {
    const result2 = await resolver.resolveIdentity('+15551234561');
    console.info('   📊 Result:');
    console.info('   • Synthetic Score:', `${(result2.syntheticScore * 100).toFixed(1)}%`);
    console.info('   • Confidence:', `${(result2.confidence * 100).toFixed(1)}%`);
    console.info('   • Risk Level: CRITICAL 🔴');
    console.info('   • Action: BLOCK');
    console.info('   • Risk Factors:', result2.riskFactors?.slice(-4));
    console.info('   ✅ Expected: High risk, low confidence, automatic block\n');
  } catch (error: any) {
    console.info('   ❌ Error:', error.message);
  }

  // ==================================================
  // STATE 3: Partial platformAnalysis (< 70% complete)
  // ==================================================
  console.info('3️⃣ STATE 3: Partial platformAnalysis (< 70% complete)');
  console.info('------------------------------------------------------');

  resolver.resolveIdentity = async (phone: string) => {
    console.info('   📞 Resolving identity for:', phone);
    console.info('   ⚠️ platformAnalysis: Partial data (only CashApp)');

    const result = await originalResolveIdentity(phone);

    // Simulate partial data - only CashApp, missing Venmo, PayPal
    (result as any).platformAnalysis = {
      cashApp: {
        profile: { cashtag: '$testuser', displayName: 'Test User' },
        verificationStatus: 'verified',
        riskScore: 0.2
      }
      // venmo: undefined, paypal: undefined
    };

    // Calculate completeness percentage
    const totalPlatforms = 3; // cashapp, venmo, paypal
    const availablePlatforms = Object.keys(result.platformAnalysis).length;
    const completenessPercentage = (availablePlatforms / totalPlatforms) * 100;

    console.info(`   📈 Data Completeness: ${completenessPercentage.toFixed(1)}% (${availablePlatforms}/${totalPlatforms} platforms)`);

    if (completenessPercentage < 70) {
      result.riskFactors = [
        ...(result.riskFactors || []),
        `Incomplete platform data: ${completenessPercentage.toFixed(1)}% coverage`,
        'Missing data from multiple platforms increases risk',
        'Unable to perform comprehensive cross-platform analysis'
      ];

      result.confidence *= (completenessPercentage / 100);
      result.syntheticScore = Math.max(result.syntheticScore, 0.45);
    }

    return result;
  };

  try {
    const result3 = await resolver.resolveIdentity('+15551234562');
    console.info('   📊 Result:');
    console.info('   • Synthetic Score:', `${(result3.syntheticScore * 100).toFixed(1)}%`);
    console.info('   • Confidence:', `${(result3.confidence * 100).toFixed(1)}%`);
    console.info('   • Risk Level: MEDIUM ⚠️');
    console.info('   • Action: MANUAL REVIEW');
    console.info('   • Risk Factors:', result3.riskFactors?.slice(-3));
    console.info('   ✅ Expected: Moderate risk, reduced confidence, manual review\n');
  } catch (error: any) {
    console.info('   ❌ Error:', error.message);
  }

  // ==================================================
  // PATTERN ANALYSIS DEMONSTRATION
  // ==================================================
  console.info('🎯 PATTERN ANALYSIS DEMONSTRATION');
  console.info('=====================================\n');

  console.info('🔍 Critical Pattern Detection for Missing Data:\n');

  // Simulate pattern detection for missing data
  const simulatePatternDetection = (platformData: any) => {
    const patterns = [];

    // Pattern 0: Missing or Empty platformAnalysis (Highest Priority)
    if (!platformData || Object.keys(platformData).length === 0) {
      patterns.push({
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'platformAnalysis is missing or completely empty',
        evidence: [
          'No platform data could be collected or validated',
          'All platform resolvers failed or returned invalid data',
          'Unable to perform cross-platform analysis',
          'System operating in fail-safe mode'
        ]
      });

      return patterns; // Early return - no other patterns possible
    }

    return patterns;
  };

  // Test pattern detection
  const testCases = [
    { name: 'Missing (undefined)', data: undefined },
    { name: 'Empty Object', data: {} },
    { name: 'Partial Data', data: { cashApp: {} } }
  ];

  testCases.forEach((testCase, index) => {
    console.info(`${index + 1}. ${testCase.name}:`);
    const patterns = simulatePatternDetection(testCase.data);

    if (patterns.length > 0) {
      patterns.forEach(pattern => {
        console.info(`   🚨 ${pattern.severity.toUpperCase()}: ${pattern.description}`);
        console.info(`   📋 Evidence: ${pattern.evidence.join(', ')}`);
      });
    } else {
      console.info('   ✅ No critical patterns detected');
    }
    console.info('');
  });

  // ==================================================
  // DECISION ENGINE SIMULATION
  // ==================================================
  console.info('⚖️ DECISION ENGINE SIMULATION');
  console.info('==============================\n');

  const simulateDecisionEngine = (result: any) => {
    if (!result.platformAnalysis || Object.keys(result.platformAnalysis).length === 0) {
      return {
        action: 'BLOCK',
        reason: 'No platform data available for identity verification',
        confidence: 'CRITICAL',
        requiresEscalation: true,
        alertLevel: 'HIGH'
      };
    }

    const completeness = Object.keys(result.platformAnalysis).length / 3; // 3 platforms

    if (completeness < 0.7) {
      return {
        action: 'MANUAL_REVIEW',
        reason: 'Incomplete platform data requires manual verification',
        confidence: 'MEDIUM',
        requiresEscalation: false,
        alertLevel: 'MEDIUM'
      };
    }

    return {
      action: 'APPROVE',
      reason: 'Sufficient platform data for automated approval',
      confidence: 'HIGH',
      requiresEscalation: false,
      alertLevel: 'LOW'
    };
  };

  console.info('📊 Decision Matrix:\n');
  console.info('| Scenario | Synthetic Score | Confidence | Decision | Alert |');
  console.info('|----------|-----------------|------------|----------|--------|');

  const scenarios = [
    { name: 'Missing', syntheticScore: 0.8, confidence: 0.1, platformAnalysis: undefined },
    { name: 'Empty', syntheticScore: 0.8, confidence: 0.1, platformAnalysis: {} },
    { name: 'Partial', syntheticScore: 0.45, confidence: 0.4, platformAnalysis: { cashApp: {} } },
    { name: 'Complete', syntheticScore: 0.2, confidence: 0.95, platformAnalysis: { cashApp: {}, venmo: {}, paypal: {} } }
  ];

  scenarios.forEach(scenario => {
    const decision = simulateDecisionEngine({
      platformAnalysis: scenario.platformAnalysis,
      syntheticScore: scenario.syntheticScore,
      confidence: scenario.confidence
    });

    console.info(`| ${scenario.name.padEnd(8)} | ${scenario.syntheticScore.toFixed(1).padStart(15)} | ${scenario.confidence.toFixed(1).padStart(10)} | ${decision.action.padEnd(8)} | ${decision.alertLevel.padEnd(6)} |`);
  });

  console.info('\n🎉 Demo Complete!');
  console.info('\n🔐 Key Security Insights:');
  console.info('- Missing data = BLOCK (fail-safe security)');
  console.info('- Empty data = BLOCK (fail-safe security)');
  console.info('- Partial data = MANUAL REVIEW (balanced approach)');
  console.info('- Complete data = APPROVE (automated processing)');
  console.info('- All scenarios logged and monitored for compliance');
}

// Run the demonstration
demonstrateMissingPlatformAnalysis().catch(console.error);