#!/usr/bin/env bun

/**
 * Partial Data Handling in platformAnalysis
 * Demonstrates how downstream systems handle incomplete platform data
 */

import { 
  SyntheticIdentityResult, 
  PlatformAnalysisResult,
  CrossPlatformPattern 
} from '../src/patterns/identity-resolver.js';

function demonstratePartialDataHandling() {
  console.info('🔍 Partial Data Handling in platformAnalysis');
  console.info('==========================================\n');

  // Example 1: Full Data - Complete Platform Coverage
  console.info('1. COMPLETE DATA - All Platforms Available');
  console.info('------------------------------------------');
  const completeData: SyntheticIdentityResult = {
    phone: '+15551234567',
    syntheticScore: 0.15,
    isSynthetic: false,
    connections: [],
    riskFactors: [],
    confidence: 0.95, // High confidence
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'verified',
        transactionVolume30d: 1500,
        accountAgeDays: 180,
        fraudFlags: [],
        cashtag: '$johnsmith'
      },
      venmo: {
        verificationStatus: 'verified',
        transactionCount: 45,
        friendsCount: 28,
        publicTransactions: 8,
        fraudIndicators: []
      },
      paypal: {
        accountStatus: 'verified',
        transactionHistory: 89,
        linkedAccounts: ['bank-123'],
        riskScore: 0.1,
        restrictions: []
      }
    },
    provenanceSources: [
      { platform: 'cashapp', status: 'success', confidence: 0.98, lastUpdated: Date.now() },
      { platform: 'venmo', status: 'success', confidence: 0.95, lastUpdated: Date.now() },
      { platform: 'paypal', status: 'success', confidence: 0.92, lastUpdated: Date.now() }
    ],
    crossPlatformPatterns: [] // No patterns - complete data
  };

  console.info('✅ Complete Data Characteristics:');
  console.info(`   Data Completeness: 100%`);
  console.info(`   Available Platforms: ${completeData.provenanceSources?.length || 0}/3`);
  console.info(`   Confidence Score: ${(completeData.confidence * 100).toFixed(1)}%`);
  console.info(`   Risk Patterns: ${completeData.crossPlatformPatterns?.length || 0} detected`);
  console.info(`   Downstream Action: APPROVE - High confidence decision`);

  // Example 2: Partial Data - Some Platforms Missing
  console.info('\n\n2. PARTIAL DATA - Limited Platform Coverage');
  console.info('---------------------------------------------');
  const partialData: SyntheticIdentityResult = {
    phone: '+15559876543',
    syntheticScore: 0.45,
    isSynthetic: false,
    connections: [],
    riskFactors: [
      'Limited platform data coverage (33% complete)',
      'Some platforms unavailable: venmo, paypal',
      'Results should be interpreted with caution'
    ],
    confidence: 0.6, // Reduced confidence
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'unverified',
        transactionVolume30d: 800,
        accountAgeDays: 45,
        fraudFlags: ['NEW_ACCOUNT'],
        cashtag: '$user456'
      }
      // venmo and paypal missing
    },
    provenanceSources: [
      { platform: 'cashapp', status: 'success', confidence: 0.85, lastUpdated: Date.now() },
      { platform: 'venmo', status: 'failed', confidence: 0, lastUpdated: Date.now(), errorDetails: 'User not found' },
      { platform: 'paypal', status: 'failed', confidence: 0, lastUpdated: Date.now(), errorDetails: 'No account found' }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'medium',
        description: 'Partial data available - moderate uncertainty in analysis',
        involvedPlatforms: ['venmo', 'paypal'],
        evidence: [
          'Data completeness: 33%',
          'Some platforms unavailable: venmo, paypal',
          'Results should be interpreted with caution'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  // Add metadata via type casting since it's an internal field
  (partialData.platformAnalysis as any)._collectionMetadata = {
    isPartialData: true,
    dataCompletenessRatio: 0.33,
    availablePlatforms: ['cashapp'],
    missingPlatforms: ['venmo', 'paypal']
  };

  console.info('⚠️ Partial Data Characteristics:');
  console.info(`   Data Completeness: 33%`);
  console.info(`   Available Platforms: 1/3 (cashapp only)`);
  console.info(`   Missing Platforms: venmo, paypal`);
  console.info(`   Confidence Score: ${(partialData.confidence * 100).toFixed(1)}%`);
  console.info(`   Risk Patterns: ${partialData.crossPlatformPatterns?.length || 0} detected`);
  console.info(`   Downstream Action: MANUAL REVIEW - Medium uncertainty`);

  // Example 3: Severely Limited Data - Critical Coverage Issues
  console.info('\n\n3. SEVERELY LIMITED DATA - Critical Coverage Issues');
  console.info('----------------------------------------------------');
  const severelyLimitedData: SyntheticIdentityResult = {
    phone: '+15551112222',
    syntheticScore: 0.75,
    isSynthetic: true,
    connections: [],
    riskFactors: [
      'Severely limited data - high uncertainty in analysis',
      'Data completeness: 0%',
      'All platform resolvers failed or returned invalid data'
    ],
    confidence: 0.2, // Very low confidence
    analyzedAt: Date.now(),
    
    platformAnalysis: {}, // Empty - no data available
    provenanceSources: [
      { platform: 'cashapp', status: 'failed', confidence: 0, lastUpdated: Date.now(), errorDetails: 'API timeout' },
      { platform: 'venmo', status: 'failed', confidence: 0, lastUpdated: Date.now(), errorDetails: 'Service unavailable' },
      { platform: 'paypal', status: 'failed', confidence: 0, lastUpdated: Date.now(), errorDetails: 'Account locked' }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'No platform data available for analysis',
        involvedPlatforms: [],
        evidence: ['All platform resolvers failed or returned invalid data'],
        detectedAt: Date.now()
      },
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'high',
        description: 'Severely limited data - high uncertainty in analysis',
        involvedPlatforms: ['cashapp', 'venmo', 'paypal'],
        evidence: [
          'Data completeness: 0%',
          'Available platforms: ',
          'Analysis confidence significantly reduced'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  // Add metadata via type casting
  (severelyLimitedData.platformAnalysis as any)._collectionMetadata = {
    isPartialData: true,
    dataCompletenessRatio: 0.0,
    availablePlatforms: [],
    missingPlatforms: ['cashapp', 'venmo', 'paypal']
  };

  console.info('🔴 Severely Limited Data Characteristics:');
  console.info(`   Data Completeness: 0%`);
  console.info(`   Available Platforms: 0/3`);
  console.info(`   Missing Platforms: cashapp, venmo, paypal`);
  console.info(`   Confidence Score: ${(severelyLimitedData.confidence * 100).toFixed(1)}%`);
  console.info(`   Risk Patterns: ${severelyLimitedData.crossPlatformPatterns?.length || 0} detected`);
  console.info(`   Downstream Action: BLOCK - Critical uncertainty`);

  console.info('\n🎯 Downstream System Handling Strategies:');
  console.info('========================================');

  console.info('\n1. DASHBOARD VISUALIZATION:');
  console.info('   • Complete data: Full platform analysis display');
  console.info('   • Partial data: Warning indicators + limited analysis');
  console.info('   • Severely limited: Error states + fallback messaging');

  console.info('\n2. RISK SCORING ENGINE:');
  console.info('   • 100% completeness: Full weight in risk calculation');
  console.info('   • 50-70% completeness: Reduced weight + uncertainty penalty');
  console.info('   • <30% completeness: Minimal weight + high uncertainty flag');
  console.info('   • 0% completeness: Default to high-risk (fail-safe)');

  console.info('\n3. DECISION ENGINE:');
  console.info('   • High confidence + complete data: Automated approval');
  console.info('   • Medium confidence + partial data: Escalate for review');
  console.info('   • Low confidence + limited data: Manual investigation');
  console.info('   • No data + critical patterns: Auto-block + alert');

  console.info('\n4. MONITORING & ALERTING:');
  console.info('   • Track data completeness ratios over time');
  console.info('   • Alert on sudden drops in platform availability');
  console.info('   • Monitor partial data impact on decision accuracy');
  console.info('   • Generate platform health reports');

  console.info('\n📊 Data Completeness Impact Matrix:');
  console.info('===================================');
  console.info('| Completeness | Confidence | Risk Impact | Action          |');
  console.info('|-------------|------------|-------------|-----------------|');
  console.info('| 100%        | 90-95%     | Low         | Auto-Approve    |');
  console.info('| 70-99%      | 70-85%     | Medium      | Enhanced Review |');
  console.info('| 30-69%      | 40-65%     | High        | Manual Review   |');
  console.info('| 1-29%       | 20-35%     | Very High   | Investigation  |');
  console.info('| 0%          | 0-15%      | Critical    | Block + Alert   |');

  console.info('\n🔧 Implementation Best Practices:');
  console.info('==================================');
  console.info('✅ **Always indicate partial data** in metadata');
  console.info('✅ **Reduce confidence scores** proportionally');
  console.info('✅ **Generate appropriate patterns** for data gaps');
  console.info('✅ **Provide clear evidence** of missing platforms');
  console.info('✅ **Implement fallback logic** for critical decisions');
  console.info('✅ **Monitor data quality** trends over time');
  console.info('✅ **Document partial data handling** for compliance');
  console.info('✅ **Test edge cases** in downstream systems');

  console.info('\n🚀 Production Considerations:');
  console.info('==============================');
  console.info('• **Graceful Degradation**: System functions with any data level');
  console.info('• **Fail-Safe Defaults**: Err on side of caution with limited data');
  console.info('• **Transparency**: Clear communication of data limitations');
  console.info('• **Recovery Mechanisms**: Retry failed platform queries');
  console.info('• **User Experience**: Appropriate messaging for data limitations');
  console.info('• **Compliance**: Audit trail of partial data decisions');
}

// Helper function to simulate downstream system processing
function processDownstream(result: SyntheticIdentityResult) {
  const metadata = (result.platformAnalysis as any)?._collectionMetadata;
  const completeness = metadata?.dataCompletenessRatio || 1.0;
  
  if (completeness >= 0.8) {
    return 'APPROVE';
  } else if (completeness >= 0.4) {
    return 'MANUAL_REVIEW';
  } else {
    return 'BLOCK';
  }
}

// Run the demonstration
demonstratePartialDataHandling();