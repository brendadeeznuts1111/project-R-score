#!/usr/bin/env bun

/**
 * Multi-Platform Identity Analysis Example
 * Demonstrates extended SyntheticIdentityResult with support for multiple payment platforms
 */

import { 
  SyntheticIdentityResult, 
  PlatformAnalysisResult,
  IdentitySource,
  CrossPlatformPattern,
  CrossPlatformIdentityResolver 
} from '../src/patterns/identity-resolver.js';

function demonstrateMultiPlatformAnalysis() {
  console.log('🌐 Enhanced Multi-Platform Identity Analysis Demo');
  console.log('================================================\n');

  // Example 1: Sophisticated Synthetic Identity with Multiple Platforms
  console.log('1. SCENARIO: Sophisticated Synthetic Identity');
  console.log('--------------------------------------------');
  const sophisticatedSynthetic: SyntheticIdentityResult = {
    phone: '+15551234567',
    syntheticScore: 0.89, // Very high risk
    isSynthetic: true,
    connections: [
      {
        type: 'PAYMENT',
        value: 'cashapp-$johnsmith',
        strength: 0.8,
        verified: false,
        discoveredAt: Date.now() - 86400000,
        metadata: { 
          paymentType: 'cashapp',
          cashtag: '$johnsmith',
          verificationStatus: 'unverified',
          transactionVolume30d: 25000, // Very high for new account
          fraudFlags: ['HIGH_VOLUME', 'NEW_ACCOUNT', 'RAPID_GROWTH'],
          accountAgeDays: 12, // Very new account
          linkedBank: null,
          kycStatus: 'partial'
        }
      },
      {
        type: 'PAYMENT', 
        value: 'venmo-john-smith-2024',
        strength: 0.7,
        verified: true,
        discoveredAt: Date.now() - 172800000,
        metadata: { 
          paymentType: 'venmo',
          displayName: 'John Smith',
          verificationStatus: 'verified',
          transactionCount: 89, // High activity
          riskScore: 0.7
        }
      },
      {
        type: 'PAYMENT',
        value: 'paypal-john.smith.biz',
        strength: 0.6,
        verified: false,
        discoveredAt: Date.now() - 259200000,
        metadata: { 
          paymentType: 'paypal',
          verificationStatus: 'unverified',
          transactionCount: 203,
          riskScore: 0.8
        }
      },
      {
        type: 'DEVICE',
        value: 'iphone-14-pro-max-virtual',
        strength: 0.4, // Low confidence - possibly virtual device
        verified: false,
        discoveredAt: Date.now() - 1209600000,
        metadata: { 
          paymentType: 'bank',
          lastTransaction: Date.now() - 3600000,
          riskScore: 0.6
        }
      },
      {
        type: 'EMAIL',
        value: 'john.smith.biz2024@gmail.com',
        strength: 0.3,
        verified: false,
        discoveredAt: Date.now() - 604800000,
        metadata: { 
          verificationStatus: 'unverified'
        }
      }
    ],
    riskFactors: [
      'CashApp account unverified with high volume',
      'New account with $25,000 in 30 days',
      'Multiple payment platforms with inconsistent identities',
      'Low social graph on Venmo despite high activity',
      'PayPal account with sending restrictions',
      'Virtual device detected',
      'Recently created email domain',
      'Name variations across platforms: John Smith vs john.smith.biz'
    ],
    confidence: 0.92, // High confidence in synthetic assessment
    analyzedAt: Date.now(),
    
    // Enhanced multi-platform data
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'unverified',
        transactionVolume30d: 25000,
        accountAgeDays: 12,
        fraudFlags: ['HIGH_VOLUME', 'NEW_ACCOUNT', 'RAPID_GROWTH'],
        cashtag: '$johnsmith'
      },
      venmo: {
        verificationStatus: 'verified',
        transactionCount: 89,
        friendsCount: 3,
        publicTransactions: 0,
        fraudIndicators: ['LOW_SOCIAL_GRAPH', 'HIGH_TRANSACTION_FREQUENCY']
      },
      paypal: {
        accountStatus: 'unverified',
        transactionHistory: 203,
        linkedAccounts: ['bank-123', 'card-456', 'card-789'],
        riskScore: 0.8,
        restrictions: ['SENDING_LIMITED', 'VERIFICATION_REQUIRED']
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.95,
        lastUpdated: Date.now() - 1000
      },
      {
        platform: 'venmo',
        status: 'success', 
        confidence: 0.88,
        lastUpdated: Date.now() - 2000
      },
      {
        platform: 'paypal',
        status: 'success',
        confidence: 0.82,
        lastUpdated: Date.now() - 1500
      },
      {
        platform: 'device',
        status: 'partial',
        confidence: 0.4,
        lastUpdated: Date.now() - 500,
        errorDetails: 'Virtual device detected'
      },
      {
        platform: 'email',
        status: 'success',
        confidence: 0.6,
        lastUpdated: Date.now() - 800
      }
    ],
    crossPlatformPatterns: [
      {
        patternType: 'INCONSISTENT_IDENTITIES',
        severity: 'critical',
        description: 'Multiple name variations and identity fragments across platforms',
        involvedPlatforms: ['cashapp', 'venmo', 'paypal'],
        evidence: [
          'CashApp: $johnsmith (unverified)',
          'Venmo: John Smith (verified, but low social graph)',
          'PayPal: john.smith.biz (business account, restricted)',
          'Email: john.smith.biz2024@gmail.com (recently created)'
        ],
        detectedAt: Date.now()
      },
      {
        patternType: 'TEMPORAL_ANOMALIES',
        severity: 'high',
        description: 'New accounts with unusually high transaction volumes',
        involvedPlatforms: ['cashapp', 'venmo'],
        evidence: [
          'CashApp: 12 days old, $25,000 volume',
          'Venmo: High transaction frequency with only 3 friends',
          'Rapid account establishment across multiple platforms'
        ],
        detectedAt: Date.now()
      },
      {
        patternType: 'RAPID_ACCOUNT_CREATION',
        severity: 'high',
        description: 'Multiple payment accounts created in short timeframe',
        involvedPlatforms: ['cashapp', 'venmo', 'paypal'],
        evidence: [
          'All accounts created within 30 days',
          'Sequential account establishment pattern',
          'Progressively higher transaction volumes'
        ],
        detectedAt: Date.now()
      },
      {
        patternType: 'UNUSUAL_CORRELATIONS',
        severity: 'medium',
        description: 'Virtual device combined with high-risk payment behavior',
        involvedPlatforms: ['device', 'cashapp', 'paypal'],
        evidence: [
          'Virtual device detected',
          'High transaction volumes from virtual device',
          'Multiple payment platforms linked to suspicious device'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('📊 Sophisticated Synthetic Identity Analysis:');
  console.log('===========================================');
  console.log(`Phone: ${sophisticatedSynthetic.phone}`);
  console.log(`Synthetic Score: ${(sophisticatedSynthetic.syntheticScore * 100).toFixed(1)}%`);
  console.log(`Is Synthetic: ${sophisticatedSynthetic.isSynthetic}`);
  console.log(`Overall Confidence: ${(sophisticatedSynthetic.confidence * 100).toFixed(1)}%\n`);

  console.log('🔍 Platform-Specific Analysis:');
  console.log('------------------------------');
  if (sophisticatedSynthetic.platformAnalysis) {
    Object.entries(sophisticatedSynthetic.platformAnalysis).forEach(([platform, data]) => {
      console.log(`\n${platform.toUpperCase()}:`);
      console.log(`  Status: ${(data as any)?.verificationStatus || (data as any)?.accountStatus || 'N/A'}`);
      console.log(`  Risk Score: ${(data as any)?.riskScore || 'N/A'}`);
      console.log(`  Activity: ${(data as any)?.transactionVolume30d ? `$${(data as any).transactionVolume30d.toLocaleString()}/30d` : (data as any)?.transactionCount ? `${(data as any).transactionCount} transactions` : 'N/A'}`);
      console.log(`  Account Age: ${(data as any)?.accountAgeDays ? `${(data as any).accountAgeDays} days` : 'N/A'}`);
      console.log(`  Flags: ${JSON.stringify((data as any)?.fraudFlags || (data as any)?.fraudIndicators || (data as any)?.restrictions || [])}`);
    });
  }

  console.log('\n📡 Data Sources Status:');
  console.log('----------------------');
  sophisticatedSynthetic.provenanceSources?.forEach(source => {
    const status = source.status === 'success' ? '✅' : source.status === 'partial' ? '⚠️' : '❌';
    console.log(`${status} ${source.platform}: ${(source.confidence * 100).toFixed(1)}% confidence${source.errorDetails ? ` (${source.errorDetails})` : ''}`);
  });

  console.log('\n🚨 Cross-Platform Patterns:');
  console.log('---------------------------');
  sophisticatedSynthetic.crossPlatformPatterns?.forEach((pattern, index) => {
    const severity = pattern.severity === 'critical' ? '🔴' : 
                    pattern.severity === 'high' ? '🟠' : 
                    pattern.severity === 'medium' ? '🟡' : '🟢';
    console.log(`${index + 1}. ${severity} ${pattern.patternType}: ${pattern.description}`);
    console.log(`   Platforms: ${pattern.involvedPlatforms.join(', ')}`);
    console.log(`   Evidence: ${pattern.evidence.slice(0, 2).join('; ')}${pattern.evidence.length > 2 ? '...' : ''}`);
  });

  console.log('\n🎯 Risk Assessment Summary:');
  console.log('===========================');
  console.log(`Risk Level: ${sophisticatedSynthetic.syntheticScore > 0.8 ? 'CRITICAL' : sophisticatedSynthetic.syntheticScore > 0.6 ? 'HIGH' : sophisticatedSynthetic.syntheticScore > 0.4 ? 'MEDIUM' : 'LOW'}`);
  console.log(`Primary Concerns: ${sophisticatedSynthetic.riskFactors?.slice(0, 3).join(', ') || 'None identified'}`);
  console.log(`Recommended Action: ${sophisticatedSynthetic.isSynthetic ? 'BLOCK AND INVESTIGATE' : 'MONITOR'}`);

  // Example 2: Legitimate User with Consistent Identity
  console.log('\n\n2. SCENARIO: Legitimate User with Consistent Identity');
  console.log('---------------------------------------------------');
  const legitimateUser: SyntheticIdentityResult = {
    phone: '+15559876543',
    syntheticScore: 0.12, // Very low risk
    isSynthetic: false,
    connections: [
      {
        type: 'PAYMENT',
        value: 'cashapp-$sarahjohnson',
        strength: 0.95,
        verified: true,
        discoveredAt: Date.now() - 31536000000, // 1 year ago
        metadata: { 
          paymentType: 'cashapp',
          cashtag: '$sarahjohnson',
          verificationStatus: 'verified',
          transactionVolume30d: 1500, // Normal volume
          fraudFlags: [],
          accountAgeDays: 365,
          linkedBank: 'chase-123',
          kycStatus: 'complete'
        }
      },
      {
        type: 'PAYMENT', 
        value: 'venmo-sarah-johnson',
        strength: 0.92,
        verified: true,
        discoveredAt: Date.now() - 25920000000,
        metadata: { 
          paymentType: 'venmo',
          displayName: 'Sarah Johnson',
          verificationStatus: 'verified',
          transactionCount: 156,
          riskScore: 0.05,
          lastTransaction: Date.now() - 86400000
        }
      },
      {
        type: 'DEVICE',
        value: 'iphone-15-pro',
        strength: 0.98,
        verified: true,
        discoveredAt: Date.now() - 63072000000,
        metadata: { 
          paymentType: 'bank',
          lastTransaction: Date.now() - 86400000,
          riskScore: 0.05
        }
      }
    ],
    riskFactors: [], // No risk factors
    confidence: 0.96,
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'verified',
        transactionVolume30d: 1500,
        accountAgeDays: 365,
        fraudFlags: [],
        cashtag: '$sarahjohnson'
      },
      venmo: {
        verificationStatus: 'verified',
        transactionCount: 156,
        friendsCount: 48,
        publicTransactions: 12,
        fraudIndicators: []
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.98,
        lastUpdated: Date.now() - 1000
      },
      {
        platform: 'venmo',
        status: 'success', 
        confidence: 0.95,
        lastUpdated: Date.now() - 2000
      },
      {
        platform: 'device',
        status: 'success',
        confidence: 0.99,
        lastUpdated: Date.now() - 500
      }
    ],
    crossPlatformPatterns: [] // No patterns detected
  };

  console.log('Legitimate User Analysis:');
  console.log('========================');
  console.log(`Synthetic Score: ${(legitimateUser.syntheticScore * 100).toFixed(1)}%`);
  console.log(`Risk Level: LOW ✅`);
  console.log(`Identity Consistency: ${legitimateUser.provenanceSources?.every((s: any) => s.status === 'success') ? 'CONSISTENT' : 'INCONSISTENT'}`);
  console.log(`Account History: ${Math.min(...legitimateUser.connections.map(c => Math.floor((Date.now() - c.discoveredAt) / 86400000)))}+ days`);

  // Example 3: Edge Case - Partial Data with Inconclusive Results
  console.log('\n\n3. SCENARIO: Partial Data with Inconclusive Results');
  console.log('--------------------------------------------------');
  const inconclusiveCase: SyntheticIdentityResult = {
    phone: '+15551112222',
    syntheticScore: 0.45, // Medium risk - inconclusive
    isSynthetic: false, // Default to legitimate when uncertain
    connections: [
      {
        type: 'PAYMENT',
        value: 'cashapp-$mysteryuser',
        strength: 0.6,
        verified: false,
        discoveredAt: Date.now() - 7776000000,
        metadata: { 
          paymentType: 'cashapp',
          verificationStatus: 'pending',
          transactionVolume30d: 800,
          accountAgeDays: 90,
          fraudFlags: []
        }
      }
    ],
    riskFactors: [
      'Limited platform data available',
      'CashApp verification pending',
      'Insufficient cross-platform data for confident assessment'
    ],
    confidence: 0.35, // Low confidence due to limited data
    analyzedAt: Date.now(),
    
    platformAnalysis: {
      cashApp: {
        verificationStatus: 'pending',
        transactionVolume30d: 800,
        accountAgeDays: 90,
        fraudFlags: [],
        cashtag: '$mysteryuser'
      }
    },
    provenanceSources: [
      {
        platform: 'cashapp',
        status: 'success',
        confidence: 0.6,
        lastUpdated: Date.now() - 1000
      },
      {
        platform: 'venmo',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now() - 2000,
        errorDetails: 'User not found'
      },
      {
        platform: 'paypal',
        status: 'failed',
        confidence: 0,
        lastUpdated: Date.now() - 1500,
        errorDetails: 'No account found'
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
          'Insufficient data for comprehensive analysis'
        ],
        detectedAt: Date.now()
      }
    ]
  };

  console.log('Inconclusive Case Analysis:');
  console.log('===========================');
  console.log(`Synthetic Score: ${(inconclusiveCase.syntheticScore * 100).toFixed(1)}%`);
  console.log(`Risk Level: MEDIUM ⚠️`);
  console.log(`Confidence: ${(inconclusiveCase.confidence * 100).toFixed(1)}%`);
  console.log(`Available Data: ${inconclusiveCase.provenanceSources?.filter((s: any) => s.status === 'success').length}/${inconclusiveCase.provenanceSources?.length} platforms`);
  console.log(`Recommended Action: ADDITIONAL VERIFICATION REQUIRED`);

  console.log('\n🎯 Key Multi-Platform Analysis Benefits:');
  console.log('==========================================');
  console.log('✅ **Pattern Recognition**: Detects sophisticated synthetic identities');
  console.log('✅ **Cross-Platform Correlation**: Identifies inconsistencies across services');
  console.log('✅ **Temporal Analysis**: Flags unusual timing patterns');
  console.log('✅ **Source Reliability**: Tracks data quality and availability');
  console.log('✅ **Risk-Based Decisions**: Provides actionable intelligence');
  console.log('✅ **Audit Trail**: Complete evidence for compliance');
  
  console.log('\n📈 Implementation Maturity:');
  console.log('===========================');
  console.log('🔴 **Critical Detection**: Sophisticated synthetic patterns');
  console.log('🟡 **Medium Risk**: Partial data or inconsistencies');
  console.log('🟢 **Low Risk**: Consistent, legitimate identities');
  console.log('⚪ **Inconclusive**: Insufficient data - requires manual review');
}

// Run the demonstration
demonstrateMultiPlatformAnalysis();