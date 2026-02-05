#!/usr/bin/env bun

/**
 * Missing and Inconsistent Data Handling Example
 * Demonstrates how SyntheticIdentityResult handles platform data issues
 */

import { 
  SyntheticIdentityResult, 
  PlatformAnalysisResult,
  CrossPlatformPattern,
  IdentitySource 
} from '../src/patterns/identity-resolver.js';

function demonstrateMissingDataHandling() {
  console.log('🔍 Missing & Inconsistent Data Handling Demo');
  console.log('==========================================\n');

  // Example 1: Complete Platform Failure
  console.log('1. SCENARIO: Complete Platform Failure');
  console.log('--------------------------------------');
  const completeFailureResult: SyntheticIdentityResult = {
    phone: '+15551234567',
    syntheticScore: 0.9, // High risk due to no data
    isSynthetic: true,
    connections: [],
    riskFactors: [
      'Identity resolution failed',
      'System error - fail-safe mode activated',
      'All platform resolvers failed'
    ],
    confidence: 0, // No confidence without data
    analyzedAt: Date.now(),
    
    // Enhanced multi-platform data showing failure
    platformAnalysis: {}, // Empty - no platforms succeeded
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now(),
        errorDetails: 'API timeout after 30 seconds'
      },
      {
        platform: 'venmo',
        status: 'failed', 
        confidence: 0,
        lastUpdated: Date.now(),
        errorDetails: 'Service unavailable'
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'critical',
        description: 'No platform data available for analysis',
        involvedPlatforms: ['cashapp', 'venmo'],
        evidence: [
          'cashapp: API timeout after 30 seconds',
          'venmo: Service unavailable',
          'All platform resolvers failed or returned no data'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('Result:', {
    syntheticScore: completeFailureResult.syntheticScore,
    isSynthetic: completeFailureResult.isSynthetic,
    confidence: completeFailureResult.confidence,
    riskLevel: completeFailureResult.syntheticScore > 0.8 ? 'CRITICAL' : 'HIGH'
  });
  console.log('Pattern Detected:', completeFailureResult.crossPlatformPatterns?.[0]?.description || 'No patterns detected');

  // Example 2: Partial Platform Success
  console.log('\n2. SCENARIO: Partial Platform Success');
  console.log('------------------------------------');
  const partialSuccessResult: SyntheticIdentityResult = {
    phone: '+15551234568',
    syntheticScore: 0.6, // Medium risk
    isSynthetic: true,
    connections: [
      {
        type: 'PAYMENT',
        value: 'cashapp-$user',
        strength: 0.8,
        verified: false,
        discoveredAt: Date.now(),
        metadata: {
          paymentType: 'cashapp',
          verificationStatus: 'unverified',
          transactionVolume30d: 5000,
          accountAgeDays: 45
        }
      }
    ],
    riskFactors: [
      'CashApp account unverified',
      'Limited platform data coverage'
    ],
    confidence: 0.4, // Low confidence due to limited data
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'unverified',
        transactionVolume30d: 5000,
        accountAgeDays: 45,
        fraudFlags: [],
        cashtag: '$user'
      }
      // venmo, paypal missing
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.9,
        lastUpdated: Date.now()
      },
      {
        platform: 'venmo',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now(),
        errorDetails: 'User not found'
      },
      {
        platform: 'paypal',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now(),
        errorDetails: 'Account suspended'
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'medium',
        description: 'Limited platform data coverage',
        involvedPlatforms: ['venmo', 'paypal'],
        evidence: [
          'Only 1/3 platforms available',
          'Insufficient data for comprehensive analysis',
          'venmo: User not found',
          'paypal: Account suspended'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('Result:', {
    syntheticScore: partialSuccessResult.syntheticScore,
    isSynthetic: partialSuccessResult.isSynthetic,
    confidence: partialSuccessResult.confidence,
    availablePlatforms: 1,
    totalPlatforms: 3,
    riskLevel: partialSuccessResult.syntheticScore > 0.5 ? 'MEDIUM-HIGH' : 'MEDIUM'
  });

  // Example 3: Inconsistent Verification Statuses
  console.log('\n3. SCENARIO: Inconsistent Verification Statuses');
  console.log('----------------------------------------------');
  const inconsistentResult: SyntheticIdentityResult = {
    phone: '+15551234569',
    syntheticScore: 0.75, // High risk due to inconsistencies
    isSynthetic: true,
    connections: [
      {
        type: 'PAYMENT',
        value: 'cashapp-$verified',
        strength: 0.9,
        verified: true,
        discoveredAt: Date.now(),
        metadata: {
          paymentType: 'cashapp',
          verificationStatus: 'verified',
          transactionVolume30d: 2000
        }
      },
      {
        type: 'PAYMENT',
        value: 'venmo-unverified',
        strength: 0.7,
        verified: false,
        discoveredAt: Date.now(),
        metadata: {
          paymentType: 'venmo',
          verificationStatus: 'unverified',
          transactionCount: 10
        }
      }
    ],
    riskFactors: [
      'Different verification statuses across platforms',
      'CashApp verified but Venmo unverified',
      'Potential identity fragmentation'
    ],
    confidence: 0.7, // Higher confidence due to data availability
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'verified',
        transactionVolume30d: 2000,
        accountAgeDays: 180,
        fraudFlags: [],
        cashtag: '$verified'
      },
      venmo: {
        verificationStatus: 'unverified',
        transactionCount: 10,
        friendsCount: 5,
        publicTransactions: 2,
        fraudIndicators: ['NEW_ACCOUNT']
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.95,
        lastUpdated: Date.now()
      },
      {
        platform: 'venmo',
        status: 'success',
        confidence: 0.8,
        lastUpdated: Date.now()
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'INCONSISTENT_IDENTITIES',
        severity: 'high',
        description: 'Different verification statuses across platforms',
        involvedPlatforms: ['cashapp', 'venmo'],
        evidence: [
          'cashapp: verified',
          'venmo: unverified',
          'Identity verification mismatch detected'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('Result:', {
    syntheticScore: inconsistentResult.syntheticScore,
    isSynthetic: inconsistentResult.isSynthetic,
    confidence: inconsistentResult.confidence,
    inconsistencyDetected: true,
    riskLevel: inconsistentResult.syntheticScore > 0.7 ? 'HIGH' : 'MEDIUM'
  });

  console.log('\n🎯 Data Handling Strategies Summary:');
  console.log('===================================');
  console.log('✅ **Complete Failure**: High risk (0.9), zero confidence, critical patterns');
  console.log('✅ **Partial Success**: Medium risk (0.6), low confidence, coverage warnings');
  console.log('✅ **Inconsistent Data**: High risk (0.75), medium confidence, inconsistency patterns');
  console.log('✅ **Graceful Degradation**: System always returns structured results');
  console.log('✅ **Risk-Based Scoring**: Missing data increases synthetic scores');
  console.log('✅ **Pattern Detection**: Automatically identifies data quality issues');
  console.log('✅ **Source Tracking**: Full visibility into data collection success/failure');
}

// Run the demonstration
demonstrateMissingDataHandling();
