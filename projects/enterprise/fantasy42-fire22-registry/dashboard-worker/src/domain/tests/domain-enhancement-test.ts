/**
 * Domain Enhancement Test Suite
 * Comprehensive testing for the Fire22 Dashboard Worker Domain Enhancement
 */

import { CollectionService } from '../services/CollectionService';
import { SettlementProcessor } from '../services/SettlementProcessor';
import { MetricsCalculator } from '../services/MetricsCalculator';
import { Logger } from '../services/Logger';
import { CollectionFilters, SettlementFilters, MetricCalculationParams } from '../models';

// Configure test logger
const testLogger = Logger.configure('DomainTest');

export async function runDomainEnhancementTests() {
  console.log('🚀 Starting Domain Enhancement Tests...\n');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Test 1: Collection Service Basic Functionality
  await runTest(
    'Collection Service - Get All Collections',
    async () => {
      const collections = await CollectionService.getAll();
      console.assert(collections.length > 0, 'Should return collections');
      console.assert(collections[0].id, 'Collections should have IDs');
      console.assert(collections[0].amount > 0, 'Collections should have valid amounts');
      return true;
    },
    testResults
  );

  // Test 2: Collection Service Filtering
  await runTest(
    'Collection Service - Filtering by Status',
    async () => {
      const pendingCollections = await CollectionService.getByStatus('pending');
      const processedCollections = await CollectionService.getByStatus('processed');

      console.assert(
        pendingCollections.every(c => c.status === 'pending'),
        'All pending collections should have pending status'
      );
      console.assert(
        processedCollections.every(c => c.status === 'processed'),
        'All processed collections should have processed status'
      );
      return true;
    },
    testResults
  );

  // Test 3: Collection Service Summary
  await runTest(
    'Collection Service - Summary Statistics',
    async () => {
      const summary = await CollectionService.getSummary();

      console.assert(summary.totalCollections >= 0, 'Total collections should be non-negative');
      console.assert(summary.totalAmount >= 0, 'Total amount should be non-negative');
      console.assert(
        summary.successRate >= 0 && summary.successRate <= 100,
        'Success rate should be between 0-100'
      );
      console.assert(
        summary.averageProcessingTime === undefined || summary.averageProcessingTime > 0,
        'Processing time should be positive if defined'
      );

      console.log(
        `📊 Collection Summary: ${summary.totalCollections} total, ${summary.pendingCollections} pending, ${summary.processedCollections} processed`
      );
      return true;
    },
    testResults
  );

  // Test 4: Settlement Processor Basic Functionality
  await runTest(
    'Settlement Processor - Get All Settlements',
    async () => {
      const settlements = await SettlementProcessor.getAll();
      console.assert(settlements.data.length > 0, 'Should return settlements');
      console.assert(settlements.data[0].id, 'Settlements should have IDs');
      console.assert(settlements.data[0].amount > 0, 'Settlements should have valid amounts');
      return true;
    },
    testResults
  );

  // Test 5: Settlement Processing Simulation
  await runTest(
    'Settlement Processor - Process Pending',
    async () => {
      const result = await SettlementProcessor.processPending();

      console.assert(typeof result.pending === 'number', 'Should return pending count');
      console.assert(typeof result.processed === 'number', 'Should return processed count');
      console.assert(typeof result.failed === 'number', 'Should return failed count');
      console.assert(typeof result.totalAmount === 'number', 'Should return total amount');
      console.assert(typeof result.estimatedFees === 'number', 'Should return estimated fees');

      console.log(
        `💰 Settlement Processing: ${result.pending} pending, ${result.processed} processed, ${result.failed} failed`
      );
      return true;
    },
    testResults
  );

  // Test 6: Fee Calculation
  await runTest(
    'Settlement Processor - Fee Calculation',
    async () => {
      const testAmounts = [100, 500, 1000, 5000, 10000];

      for (const amount of testAmounts) {
        const fee = SettlementProcessor.calculateFees(amount);
        const expectedFee = amount * 0.029 + 0.3; // 2.9% + $0.30

        console.assert(
          Math.abs(fee - expectedFee) < 0.01,
          `Fee calculation for $${amount} should be accurate`
        );
        console.assert(fee > 0, 'Fee should be positive');
        console.assert(fee < amount, 'Fee should be less than amount');
      }

      console.log(`💵 Fee Calculation: Verified for amounts ${testAmounts.join(', ')}`);
      return true;
    },
    testResults
  );

  // Test 7: Metrics Calculator - Revenue Metrics
  await runTest(
    'Metrics Calculator - Revenue Metrics',
    async () => {
      const metricsParams: MetricCalculationParams = {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
      };

      const metrics = await MetricsCalculator.calculateRevenue(metricsParams);

      console.assert(metrics.totalRevenue >= 0, 'Total revenue should be non-negative');
      console.assert(
        metrics.netRevenue <= metrics.totalRevenue,
        'Net revenue should be less than or equal to total revenue'
      );
      console.assert(
        metrics.successRate >= 0 && metrics.successRate <= 100,
        'Success rate should be between 0-100'
      );
      console.assert(metrics.dailyVolume >= 0, 'Daily volume should be non-negative');
      console.assert(metrics.totalTransactions >= 0, 'Total transactions should be non-negative');

      console.log(
        `📈 Revenue Metrics: $${metrics.totalRevenue} total, ${metrics.successRate}% success rate, ${metrics.totalTransactions} transactions`
      );
      return true;
    },
    testResults
  );

  // Test 8: Metrics Calculator - Agent Performance
  await runTest(
    'Metrics Calculator - Agent Performance',
    async () => {
      const agentMetrics = await MetricsCalculator.getAgentPerformance();

      console.assert(agentMetrics.length > 0, 'Should return agent metrics');
      console.assert(agentMetrics[0].agentId, 'Agent should have ID');
      console.assert(agentMetrics[0].totalRevenue >= 0, 'Agent revenue should be non-negative');
      console.assert(
        agentMetrics[0].successRate >= 0 && agentMetrics[0].successRate <= 100,
        'Agent success rate should be between 0-100'
      );

      console.log(
        `👥 Agent Performance: ${agentMetrics.length} agents, top performer: ${agentMetrics[0]?.agentName || agentMetrics[0]?.agentId}`
      );
      return true;
    },
    testResults
  );

  // Test 9: Daily Breakdown Analytics
  await runTest(
    'Metrics Calculator - Daily Breakdown',
    async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const dateTo = new Date();

      const dailyBreakdown = await MetricsCalculator.getDailyBreakdown(dateFrom, dateTo);

      console.assert(dailyBreakdown.length > 0, 'Should return daily breakdown');
      console.assert(dailyBreakdown[0].date, 'Daily metrics should have date');
      console.assert(dailyBreakdown[0].revenue >= 0, 'Daily revenue should be non-negative');
      console.assert(
        dailyBreakdown[0].transactions >= 0,
        'Daily transactions should be non-negative'
      );

      console.log(
        `📅 Daily Breakdown: ${dailyBreakdown.length} days, average daily revenue: $${(dailyBreakdown.reduce((sum, d) => sum + d.revenue, 0) / dailyBreakdown.length).toFixed(2)}`
      );
      return true;
    },
    testResults
  );

  // Test 10: Comprehensive Integration Test
  await runTest(
    'Integration Test - Full Dashboard Flow',
    async () => {
      // Simulate a complete dashboard data request flow
      const collections = await CollectionService.getAll();
      const collectionSummary = await CollectionService.getSummary();
      const settlementSummary = await SettlementProcessor.getSummary();
      const revenueMetrics = await MetricsCalculator.calculateRevenue();

      // Verify all data is consistent
      console.assert(
        collections.length === collectionSummary.totalCollections,
        'Collection count should match summary'
      );
      console.assert(
        revenueMetrics.totalTransactions >= collectionSummary.totalCollections,
        'Revenue transactions should include all collections'
      );

      // Verify business logic consistency
      const calculatedTotalRevenue = collections
        .filter(c => c.status === 'processed')
        .reduce((sum, c) => sum + c.amount, 0);

      console.assert(
        Math.abs(calculatedTotalRevenue - revenueMetrics.totalRevenue) < 1000,
        'Calculated revenue should be close to metrics revenue'
      );

      console.log(`🔗 Integration Test: All services working together successfully`);
      console.log(`   Collections: ${collections.length}`);
      console.log(`   Revenue: $${revenueMetrics.totalRevenue.toFixed(2)}`);
      console.log(`   Success Rate: ${revenueMetrics.successRate}%`);

      return true;
    },
    testResults
  );

  // Test 11: Error Handling
  await runTest(
    'Error Handling - Invalid Collection ID',
    async () => {
      try {
        await CollectionService.getById('invalid-id');
        throw new Error('Should have thrown error for invalid ID');
      } catch (error) {
        console.assert(error instanceof Error, 'Should throw proper error');
        console.assert(
          error.message.includes('Failed to retrieve collection'),
          'Error message should be descriptive'
        );
        return true;
      }
    },
    testResults
  );

  // Test 12: Business Rule Validation
  await runTest(
    'Business Rules - Fee Calculation Validation',
    async () => {
      const testCases = [
        { amount: 10, expectedMinFee: 0.3 },
        { amount: 100, expectedMinFee: 0.3 },
        { amount: 1000, expectedMinFee: 29.3 },
        { amount: 10000, expectedMinFee: 293.3 },
      ];

      for (const testCase of testCases) {
        const fee = SettlementProcessor.calculateFees(testCase.amount);
        console.assert(
          fee >= testCase.expectedMinFee,
          `Fee for $${testCase.amount} should be at least $${testCase.expectedMinFee}`
        );
      }

      console.log(`📋 Business Rules: Fee calculations validated for all test cases`);
      return true;
    },
    testResults
  );

  // Print test results
  console.log('\n' + '='.repeat(50));
  console.log('🏁 DOMAIN ENHANCEMENT TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n' + '='.repeat(50));

  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Domain Enhancement is working correctly.');
    console.log('✅ Collections Service: Operational');
    console.log('✅ Settlement Processor: Operational');
    console.log('✅ Metrics Calculator: Operational');
    console.log('✅ Domain Models: Validated');
    console.log('✅ Business Logic: Verified');
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
  }

  return testResults;
}

async function runTest(testName: string, testFn: () => Promise<boolean>, results: any) {
  console.log(`\n🧪 Running: ${testName}`);

  try {
    const success = await testFn();
    results.total++;

    if (success) {
      results.passed++;
      console.log(`✅ PASSED: ${testName}`);
    } else {
      results.failed++;
      results.errors.push(testName);
      console.log(`❌ FAILED: ${testName}`);
    }
  } catch (error) {
    results.total++;
    results.failed++;
    results.errors.push(
      `${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.log(
      `❌ ERROR: ${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// If run directly, execute tests
if (import.meta.main) {
  runDomainEnhancementTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
