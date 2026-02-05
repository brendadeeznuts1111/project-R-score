#!/usr/bin/env bun

/**
 * Data Validation Demo for platformAnalysis
 * Demonstrates how data is validated before being trusted for fraud detection
 */

import { 
  SyntheticIdentityResult, 
  PlatformAnalysisResult,
  CrossPlatformPattern 
} from '../src/patterns/identity-resolver.js';

function demonstrateDataValidation() {
  console.log('🔍 Data Validation for platformAnalysis Demo');
  console.log('===========================================\n');

  // Example 1: Valid Data That Passes Validation
  console.log('1. VALID DATA - Passes All Validation Checks');
  console.log('--------------------------------------------');
  const validData: SyntheticIdentityResult = {
    phone: '+15551234567',
    syntheticScore: 0.15,
    isSynthetic: false,
    connections: [],
    riskFactors: [],
    confidence: 0.95,
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'verified',
        transactionVolume30d: 1500,
        accountAgeDays: 180,
        fraudFlags: [],
        cashtag: '$johnsmith'
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.98,
        lastUpdated: Date.now()
      }
    ],
    crossPlatformPatterns: [] // No patterns - data is clean
  };

  console.log('✅ Validation Results:');
  console.log(`   Verification Status: ${validData.platformAnalysis?.cashApp?.verificationStatus || 'N/A'} (Valid)`);
  console.log(`   Transaction Volume: $${validData.platformAnalysis?.cashApp?.transactionVolume30d?.toLocaleString() || '0'} (Within limits)`);
  console.log(`   Account Age: ${validData.platformAnalysis?.cashApp?.accountAgeDays || 0} days (Realistic)`);
  console.log(`   Cashtag: ${validData.platformAnalysis?.cashApp?.cashtag || 'N/A'} (Valid format)`);
  console.log(`   Data Source: ${validData.provenanceSources?.[0]?.status || 'N/A'} (${(validData.provenanceSources?.[0]?.confidence || 0) * 100}% confidence)`);
  console.log(`   Risk Patterns: ${validData.crossPlatformPatterns?.length || 0} detected`);

  // Example 2: Invalid Data That Fails Validation
  console.log('\n\n2. INVALID DATA - Fails Multiple Validation Checks');
  console.log('----------------------------------------------------');
  const invalidData: SyntheticIdentityResult = {
    phone: '+15559876543',
    syntheticScore: 0.85, // High risk due to validation failures
    isSynthetic: true,
    connections: [],
    riskFactors: [
      'Platform data validation failed',
      'Unrealistic transaction volumes detected',
      'Invalid account characteristics'
    ],
    confidence: 0.3, // Low confidence due to data quality issues
    analyzedAt: Date.now(),
    
    platformAnalysis: {}, // Empty - validation failed
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now(),
        errorDetails: 'Data validation failed: Transaction volume exceeds realistic limits, Account age exceeds realistic limits, Cashtag contains invalid characters'
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'Platform data validation failures detected',
        involvedPlatforms: ['cashapp'],
        evidence: [
          'cashapp: Data validation failed: Transaction volume exceeds realistic limits, Account age exceeds realistic limits, Cashtag contains invalid characters'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('❌ Validation Failures:');
  console.log(`   Status: ${invalidData.provenanceSources?.[0]?.status || 'N/A'}`);
  console.log(`   Error: ${invalidData.provenanceSources?.[0]?.errorDetails || 'No error details'}`);
  console.log(`   Severity: ${invalidData.crossPlatformPatterns?.[0]?.severity || 'unknown'} 🔴`);
  console.log(`   Impact: Synthetic score increased to ${(invalidData.syntheticScore * 100).toFixed(1)}%`);

  // Example 3: Edge Case - Partial Validation Failure
  console.log('\n\n3. EDGE CASE - Partial Validation with Warnings');
  console.log('-----------------------------------------------');
  const partialData: SyntheticIdentityResult = {
    phone: '+15551112222',
    syntheticScore: 0.45,
    isSynthetic: false,
    connections: [],
    riskFactors: [
      'Data quality concerns detected',
      'Some validation warnings present'
    ],
    confidence: 0.6,
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'unverified',
        transactionVolume30d: 8000,
        accountAgeDays: 15,
        fraudFlags: ['NEW_ACCOUNT'],
        cashtag: '$user123'
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.7, // Reduced confidence due to warnings
        lastUpdated: Date.now()
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'TEMPORAL_ANOMALIES',
        severity: 'high',
        description: 'High transaction volume on new account',
        involvedPlatforms: ['cashapp'],
        evidence: [
          'Account age: 15 days',
          '30-day volume: $8,000',
          'New account with unusual activity level'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('⚠️ Partial Validation Results:');
  console.log(`   Account Status: ${partialData.platformAnalysis?.cashApp?.verificationStatus || 'N/A'}`);
  console.log(`   Risk Flag: ${partialData.platformAnalysis?.cashApp?.fraudFlags?.join(', ') || 'None'}`);
  console.log(`   Velocity Warning: $${partialData.platformAnalysis?.cashApp?.transactionVolume30d?.toLocaleString() || '0'} in ${partialData.platformAnalysis?.cashApp?.accountAgeDays || 0} days`);
  console.log(`   Pattern Detected: ${partialData.crossPlatformPatterns?.[0]?.severity || 'unknown'} 🟠`);

  console.log('\n🛡️ Validation Layers Summary:');
  console.log('=============================');
  console.log('1. **Structure Validation**: Ensures data is proper object format');
  console.log('2. **Type Validation**: Validates data types (number, string, array)');
  console.log('3. **Range Validation**: Checks realistic limits (age, volume, etc.)');
  console.log('4. **Format Validation**: Validates formats (cashtag, statuses)');
  console.log('5. **Consistency Validation**: Cross-field validation (velocity checks)');
  console.log('6. **Freshness Validation**: Ensures data is recent enough');
  console.log('7. **Enum Validation**: Validates against allowed values');
  console.log('8. **Pattern Validation**: Regex format checking');

  console.log('\n🎯 Validation Impact on Fraud Detection:');
  console.log('=======================================');
  console.log('✅ **Valid Data**: Low risk scores, high confidence');
  console.log('⚠️ **Warnings**: Medium risk, reduced confidence');
  console.log('❌ **Invalid Data**: High risk, critical patterns triggered');
  console.log('🔴 **Validation Failures**: Treated as fraud indicators');

  console.log('\n📊 Business Rules Applied:');
  console.log('=========================');
  console.log('• Transaction volume > $1M: Automatic rejection');
  console.log('• Account age > 100 years: Automatic rejection');
  console.log('• Daily average > $10K: Velocity warning');
  console.log('• Data older than 24 hours: Freshness warning');
  console.log('• Invalid cashtag format: Format error');
  console.log('• Unknown verification status: Status error');

  console.log('\n🚀 Production Benefits:');
  console.log('=======================');
  console.log('🛡️ **Prevents False Positives**: Bad data doesn\'t trigger legitimate fraud alerts');
  console.log('🎯 **Improves Accuracy**: Only validated data influences fraud scores');
  console.log('📈 **Builds Trust**: System reliability through data quality gates');
  console.log('🔍 **Enhanced Detection**: Validation failures become fraud signals');
  console.log('⚡ **Performance**: Fails fast on invalid data');
  console.log('🔍 **Audit Trail**: Complete validation error tracking');
}

// Run the demonstration
demonstrateDataValidation();