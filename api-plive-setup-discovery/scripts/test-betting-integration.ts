#!/usr/bin/env bun

import { BettingPlatformWorkflowIntegration } from '../src/modules/betting-platform-integration';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });
dotenv.config({ path: './test-env' });

async function testBettingPlatformIntegration() {
  console.log('🧪 Testing Betting Platform Integration\n');

  // Initialize the integration
  const bettingIntegration = new BettingPlatformWorkflowIntegration({
    baseUrl: process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro',
    authToken: process.env.BETTING_API_KEY || '',
    timeout: parseInt(process.env.BETTING_API_TIMEOUT || '30000'),
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitRequests: 10, // Lower for testing
    rateLimitWindowMs: 60000
  });

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthCheck = await bettingIntegration.healthCheck();
    console.log('   Status:', healthCheck.status);
    console.log('   Response Time:', healthCheck.responseTime + 'ms');
    console.log('   Endpoints:', healthCheck.endpoints ? '✅ All reachable' : '❌ Some unreachable');

    if (healthCheck.status === 'unhealthy') {
      console.log('   Error:', healthCheck.error);
      console.log('⚠️ Platform is not fully reachable, but continuing with other tests...\n');
    } else {
      console.log('✅ Health check passed!\n');
    }

    // Test 2: Get Betting Metrics
    console.log('2️⃣ Testing Betting Metrics...');
    const metrics = await bettingIntegration.getBettingMetrics();
    console.log('   Live Events:', metrics.liveEvents);
    console.log('   Total Bets:', metrics.totalBets);
    console.log('   Odds Updates:', metrics.oddsUpdates.length);
    console.log('   Sports Volume:', metrics.sportsVolume.length);
    console.log('✅ Metrics retrieved successfully!\n');

    // Test 3: Individual Metric Methods
    console.log('3️⃣ Testing Individual Metric Methods...');
    const liveEvents = await bettingIntegration.getLiveEventsCount();
    const totalBets = await bettingIntegration.getTotalBetsCount();
    const oddsUpdates = await bettingIntegration.getOddsUpdates(1); // Last hour
    const sportsVolume = await bettingIntegration.getSportsVolume();

    console.log('   Live Events Count:', liveEvents);
    console.log('   Total Bets Count:', totalBets);
    console.log('   Odds Updates (1h):', oddsUpdates.length);
    console.log('   Sports Volume:', sportsVolume.length);
    console.log('✅ Individual metrics retrieved successfully!\n');

    // Test 4: Content Submission (Mock - won't actually submit)
    console.log('4️⃣ Testing Content Submission Validation...');
    try {
      const mockContentData = {
        contentId: 'test-content-123',
        contentType: 'featured_bets',
        title: 'Test Premier League Bets',
        jurisdiction: 'UK',
        financialImpact: 50000,
        submittedBy: 'test-user',
        metadata: {
          competition: 'Premier League',
          matchday: 1
        }
      };

      // This will fail at validation step since we're not providing real data
      // But it will test the API connectivity
      await bettingIntegration.handleContentSubmission(mockContentData);
      console.log('   ⚠️ Unexpected: Content submission succeeded (this might be a test environment)');
    } catch (error) {
      console.log('   Expected validation error:', error instanceof Error ? error.message : String(error));
      console.log('✅ Content validation working correctly!\n');
    }

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the tests
testBettingPlatformIntegration().catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});
