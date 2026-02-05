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
  console.log('🔍 Partial Data Handling in platformAnalysis');
  console.log('==========================================\n');

  // Example 1: Full Data - Complete Platform Coverage
  console.log('1. COMPLETE DATA - All Platforms Available');
  console.log('------------------------------------------');
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

  console.log('✅ Complete Data Characteristics:');
  console.log(`   Data Completeness: 100%`);
  console.log(`   Available Platforms: ${completeData.provenanceSources?.length || 0}/3`);
  console.log(`   Confidence Score: ${(completeData.confidence * 100).toFixed(1)}%`);
  console.log(`   Risk Patterns: ${completeData.crossPlatformPatterns?.length || 0} detected`);
  console.log(`   Downstream Action: APPROVE - High confidence decision`);

  // Example 2: Partial Data - Some Platforms Missing
  console.log('\n\n2. PARTIAL DATA - Limited Platform Coverage');
  console.log('---------------------------------------------');
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

  console.log('⚠️ Partial Data Characteristics:');
  console.log(`   Data Completeness: 33%`);
  console.log(`   Available Platforms: 1/3 (cashapp only)`);
  console.log(`   Missing Platforms: venmo, paypal`);
  console.log(`   Confidence Score: ${(partialData.confidence * 100).toFixed(1)}%`);
  console.log(`   Risk Patterns: ${partialData.crossPlatformPatterns?.length || 0} detected`);
  console.log(`   Downstream Action: MANUAL REVIEW - Medium uncertainty`);

  // Example 3: Severely Limited Data - Critical Coverage Issues
  console.log('\n\n3. SEVERELY LIMITED DATA - Critical Coverage Issues');
  console.log('----------------------------------------------------');
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

  console.log('🔴 Severely Limited Data Characteristics:');
  console.log(`   Data Completeness: 0%`);
  console.log(`   Available Platforms: 0/3`);
  console.log(`   Missing Platforms: cashapp, venmo, paypal`);
  console.log(`   Confidence Score: ${(severelyLimitedData.confidence * 100).toFixed(1)}%`);
  console.log(`   Risk Patterns: ${severelyLimitedData.crossPlatformPatterns?.length || 0} detected`);
  console.log(`   Downstream Action: BLOCK - Critical uncertainty`);

  console.log('\n🎯 Downstream System Handling Strategies:');
  console.log('========================================');

  console.log('\n1. DASHBOARD VISUALIZATION:');
  console.log('   • Complete data: Full platform analysis display');
  console.log('   • Partial data: Warning indicators + limited analysis');
  console.log('   • Severely limited: Error states + fallback messaging');

  console.log('\n2. RISK SCORING ENGINE:');
  console.log('   • 100% completeness: Full weight in risk calculation');
  console.log('   • 50-70% completeness: Reduced weight + uncertainty penalty');
  console.log('   • <30% completeness: Minimal weight + high uncertainty flag');
  console.log('   • 0% completeness: Default to high-risk (fail-safe)');

  console.log('\n3. DECISION ENGINE:');
  console.log('   • High confidence + complete data: Automated approval');
  console.log('   • Medium confidence + partial data: Escalate for review');
  console.log('   • Low confidence + limited data: Manual investigation');
  console.log('   • No data + critical patterns: Auto-block + alert');

  console.log('\n4. MONITORING & ALERTING:');
  console.log('   • Track data completeness ratios over time');
  console.log('   • Alert on sudden drops in platform availability');
  console.log('   • Monitor partial data impact on decision accuracy');
  console.log('   • Generate platform health reports');

  console.log('\n📊 Data Completeness Impact Matrix:');
  console.log('===================================');
  console.log('| Completeness | Confidence | Risk Impact | Action          |');
  console.log('|-------------|------------|-------------|-----------------|');
  console.log('| 100%        | 90-95%     | Low         | Auto-Approve    |');
  console.log('| 70-99%      | 70-85%     | Medium      | Enhanced Review |');
  console.log('| 30-69%      | 40-65%     | High        | Manual Review   |');
  console.log('| 1-29%       | 20-35%     | Very High   | Investigation  |');
  console.log('| 0%          | 0-15%      | Critical    | Block + Alert   |');

  console.log('\n🔧 Implementation Best Practices:');
  console.log('==================================');
  console.log('✅ **Always indicate partial data** in metadata');
  console.log('✅ **Reduce confidence scores** proportionally');
  console.log('✅ **Generate appropriate patterns** for data gaps');
  console.log('✅ **Provide clear evidence** of missing platforms');
  console.log('✅ **Implement fallback logic** for critical decisions');
  console.log('✅ **Monitor data quality** trends over time');
  console.log('✅ **Document partial data handling** for compliance');
  console.log('✅ **Test edge cases** in downstream systems');

  console.log('\n🚀 Production Considerations:');
  console.log('==============================');
  console.log('• **Graceful Degradation**: System functions with any data level');
  console.log('• **Fail-Safe Defaults**: Err on side of caution with limited data');
  console.log('• **Transparency**: Clear communication of data limitations');
  console.log('• **Recovery Mechanisms**: Retry failed platform queries');
  console.log('• **User Experience**: Appropriate messaging for data limitations');
  console.log('• **Compliance**: Audit trail of partial data decisions');
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