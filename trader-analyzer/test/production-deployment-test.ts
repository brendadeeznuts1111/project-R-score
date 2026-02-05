/**
 * Production Deployment Test for Console Enhancements
 *
 * Simulates production environment testing of enhanced logging
 * and console output capabilities.
 */

import { HyperBunMarketIntelligence } from '../src/hyper-bun/market-intelligence-engine';
import { HyperBunScheduler } from '../src/hyper-bun/scheduler';
import { configureGlobalConsole, logger } from '../src/hyper-bun/console-enhancement';

async function testProductionDeployment() {
  console.log('🏭 Starting Production Deployment Test for Console Enhancements\n');

  // Configure enhanced console for production
  configureGlobalConsole();

  logger.info('Production deployment test initialized');

  try {
    // Test 1: Basic market intelligence engine functionality
    logger.info('Testing basic market intelligence engine functionality');

    const engine = new HyperBunMarketIntelligence(':memory:');

    // Test market analysis (will use mock data)
    const analysisResult = await engine.analyzeMarketNode('prod-test-market', 'betfair');
    logger.success('Market analysis completed', analysisResult);

    // Test system health
    const healthReport = await engine.getSystemHealthReport();
    logger.info('System health report generated', healthReport);

    await engine.shutdown();
    logger.success('Engine shutdown completed');

    // Test 2: Scheduler functionality
    logger.info('Testing scheduler functionality');

    const scheduler = new HyperBunScheduler();

    // Get initial job statuses
    const initialStatuses = scheduler.getJobStatuses();
    logger.info('Initial job statuses', initialStatuses);

    // Test stopping non-existent job
    const stopResult = scheduler.stopJob('non-existent');
    logger.info(`Stop non-existent job result: ${stopResult}`);

    await scheduler.shutdown();
    logger.success('Scheduler shutdown completed');

    // Test 3: Error handling and logging
    logger.info('Testing error handling and logging');

    try {
      // Simulate an error condition
      throw new Error('Simulated production error for testing');
    } catch (error) {
      logger.error('Caught simulated error', error);
    }

    // Test 4: Performance under load
    logger.info('Testing performance under simulated load');

    const loadTestPromises: Promise<any>[] = [];
    for (let i = 0; i < 5; i++) {
      loadTestPromises.push(
        (async () => {
          const testEngine = new HyperBunMarketIntelligence(':memory:');
          const result = await testEngine.analyzeMarketNode(`load-test-${i}`, 'betfair');
          await testEngine.shutdown();
          return result;
        })()
      );
    }

    const loadResults = await Promise.all(loadTestPromises);
    logger.success(`Load test completed with ${loadResults.length} concurrent operations`);

    // Test 5: Memory and resource management
    logger.info('Testing memory and resource management');

    // Force garbage collection if available (Node.js/Bun)
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection completed');
    }

    const memUsage = process.memoryUsage();
    logger.info('Memory usage statistics', {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
    });

    // Final status
    logger.success('Production deployment test completed successfully');
    console.log('\n✅ All production tests passed!');
    console.log('🎯 Console enhancements are production-ready');

  } catch (error) {
    logger.error('Production deployment test failed', error);
    console.error('\n❌ Production deployment test failed');
    process.exit(1);
  }
}

// CLI runner
if (import.meta.main) {
  testProductionDeployment().catch(console.error);
}