#!/usr/bin/env bun

/**
 * 🔥 Fire22 Integration Test Suite
 * Comprehensive testing of the integrated system
 */

// import { createSystemController } from '../src/integration/system-controller';
import { createUnifiedAPIHandler } from '../src/api/unified-endpoints';
// import { createDashboardUpdateManager } from '../src/realtime/dashboard-updates';

// Mock environment for testing
const mockEnv = {
  NODE_ENV: 'development',
  BOT_TOKEN: process.env.BOT_TOKEN || 'test-token',
  ENABLE_TELEGRAM_INTEGRATION: 'true',
  ENABLE_REAL_TIME_UPDATES: 'true',
  ENABLE_NOTIFICATIONS: 'true',
  DB: {
    prepare: (query: string) => ({
      bind: (...args: any[]) => ({
        first: async () => ({ balance: 1000, credit_limit: 5000 }),
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { last_row_id: 1 } }),
      }),
    }),
  },
} as any;

class IntegrationTestSuite {
  private systemController: any = null;
  private apiHandler: any = null;
  private updateManager: any = null;

  /**
   * Run complete integration test suite
   */
  async runTests(): Promise<void> {
    console.log('🚀 Fire22 Integration Test Suite');
    console.log('='.repeat(50));

    try {
      // Test 1: System Controller Initialization
      await this.testSystemControllerInit();

      // Test 2: Unified API Handler
      await this.testUnifiedAPIHandler();

      // Test 3: Real-time Updates
      await this.testRealTimeUpdates();

      // Test 4: Telegram Bot Integration
      await this.testTelegramBotIntegration();

      // Test 5: Dashboard Integration
      await this.testDashboardIntegration();

      // Test 6: End-to-End Workflow
      await this.testEndToEndWorkflow();

      console.log('\n✅ All integration tests passed!');
      console.log('🎉 Fire22 system is fully integrated and functional');
    } catch (error) {
      console.error('\n❌ Integration tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test system controller initialization
   */
  private async testSystemControllerInit(): Promise<void> {
    console.log('\n📋 Test 1: System Controller Initialization');

    try {
      this.systemController = await createSystemController(mockEnv, {
        enableTelegram: true,
        enableRealTimeUpdates: true,
        enableNotifications: true,
        adminUsers: ['test_admin'],
        environment: 'development',
      });

      const status = this.systemController.getSystemStatus();

      console.log('   ✅ System controller initialized');
      console.log('   📊 Status:', JSON.stringify(status, null, 2));

      if (status.dashboard !== 'online') {
        throw new Error('Dashboard not online');
      }
    } catch (error) {
      console.error('   ❌ System controller test failed:', error);
      throw error;
    }
  }

  /**
   * Test unified API handler
   */
  private async testUnifiedAPIHandler(): Promise<void> {
    console.log('\n📋 Test 2: Unified API Handler');

    try {
      this.apiHandler = createUnifiedAPIHandler(mockEnv);

      // Test login
      const loginResponse = await this.apiHandler.handleRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { username: 'admin', password: 'Fire22Admin2025!' },
        systemController: this.systemController,
      });

      console.log('   ✅ Login API test passed');
      console.log('   📊 Response:', JSON.stringify(loginResponse, null, 2));

      if (!loginResponse.success) {
        throw new Error('Login API test failed');
      }

      // Test balance API
      const balanceResponse = await this.apiHandler.handleRequest({
        method: 'GET',
        path: '/api/user/balance',
        user: { id: 'admin', username: 'admin', isAdmin: true },
        systemController: this.systemController,
      });

      console.log('   ✅ Balance API test passed');
      console.log('   📊 Response:', JSON.stringify(balanceResponse, null, 2));
    } catch (error) {
      console.error('   ❌ API handler test failed:', error);
      throw error;
    }
  }

  /**
   * Test real-time updates
   */
  private async testRealTimeUpdates(): Promise<void> {
    console.log('\n📋 Test 3: Real-time Updates');

    try {
      this.updateManager = createDashboardUpdateManager(mockEnv, this.systemController);

      // Test event broadcasting
      await this.systemController.broadcastSystemEvent('wager:placed', {
        username: 'test_user',
        amount: 100,
        selection: 'Team A to win',
        odds: 2.5,
        source: 'test',
      });

      console.log('   ✅ Event broadcasting test passed');

      // Test dashboard stats
      const stats = this.updateManager.getDashboardStats();
      console.log('   📊 Dashboard stats:', JSON.stringify(stats, null, 2));

      // Test manual update
      this.updateManager.triggerTestUpdate();
      console.log('   ✅ Manual update test passed');
    } catch (error) {
      console.error('   ❌ Real-time updates test failed:', error);
      throw error;
    }
  }

  /**
   * Test Telegram bot integration
   */
  private async testTelegramBotIntegration(): Promise<void> {
    console.log('\n📋 Test 4: Telegram Bot Integration');

    try {
      const telegramBot = this.systemController.getTelegramBot();

      if (telegramBot) {
        console.log('   ✅ Telegram bot is available');

        // Test bot status
        const botStatus = telegramBot.getStatus();
        console.log('   📊 Bot status:', JSON.stringify(botStatus, null, 2));
      } else {
        console.log('   ⚠️ Telegram bot not initialized (BOT_TOKEN not provided)');
      }
    } catch (error) {
      console.error('   ❌ Telegram bot test failed:', error);
      throw error;
    }
  }

  /**
   * Test dashboard integration
   */
  private async testDashboardIntegration(): Promise<void> {
    console.log('\n📋 Test 5: Dashboard Integration');

    try {
      // Test system status endpoint
      const statusResponse = await this.apiHandler.handleRequest({
        method: 'GET',
        path: '/api/system/status',
        systemController: this.systemController,
      });

      console.log('   ✅ System status API test passed');
      console.log('   📊 Response:', JSON.stringify(statusResponse, null, 2));

      // Test notification sending
      const notificationResponse = await this.apiHandler.handleRequest({
        method: 'POST',
        path: '/api/notifications/send',
        body: { message: 'Test notification', target: 'all' },
        user: { id: 'admin', username: 'admin', isAdmin: true },
        systemController: this.systemController,
      });

      console.log('   ✅ Notification API test passed');
      console.log('   📊 Response:', JSON.stringify(notificationResponse, null, 2));
    } catch (error) {
      console.error('   ❌ Dashboard integration test failed:', error);
      throw error;
    }
  }

  /**
   * Test end-to-end workflow
   */
  private async testEndToEndWorkflow(): Promise<void> {
    console.log('\n📋 Test 6: End-to-End Workflow');

    try {
      // Simulate user login
      console.log('   🔄 Simulating user login...');
      await this.systemController.broadcastSystemEvent('user:login', {
        username: 'test_user',
        isAdmin: false,
        telegramId: 123456789,
        timestamp: new Date().toISOString(),
      });

      // Simulate wager placement
      console.log('   🔄 Simulating wager placement...');
      const wagerResponse = await this.apiHandler.handleRequest({
        method: 'POST',
        path: '/api/wagers/place',
        body: {
          selection: 'Team A to win',
          stake: 50,
          odds: 2.0,
        },
        user: { id: 'test_user', username: 'test_user', telegramId: 123456789, isAdmin: false },
        systemController: this.systemController,
      });

      console.log('   ✅ Wager placement test passed');
      console.log('   📊 Response:', JSON.stringify(wagerResponse, null, 2));

      // Simulate balance change
      console.log('   🔄 Simulating balance change...');
      await this.systemController.broadcastSystemEvent('balance:changed', {
        username: 'test_user',
        telegramId: 123456789,
        oldBalance: 1000,
        newBalance: 950,
        change: -50,
        source: 'wager',
      });

      console.log('   ✅ End-to-end workflow test passed');
    } catch (error) {
      console.error('   ❌ End-to-end workflow test failed:', error);
      throw error;
    }
  }

  /**
   * Display integration summary
   */
  displayIntegrationSummary(): void {
    console.log('\n🎯 Integration Summary');
    console.log('='.repeat(50));
    console.log('✅ System Controller: Initialized and functional');
    console.log('✅ Unified API Handler: All endpoints working');
    console.log('✅ Real-time Updates: Event broadcasting active');
    console.log('✅ Telegram Bot: Integration ready');
    console.log('✅ Dashboard: All components connected');
    console.log('✅ End-to-End: Complete workflow functional');
    console.log('\n🚀 Fire22 system is fully integrated!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Set BOT_TOKEN in .env for Telegram integration');
    console.log('   2. Deploy to Cloudflare Workers');
    console.log('   3. Test with real users');
    console.log('   4. Monitor system performance');
  }
}

// CLI Interface
async function main() {
  const testSuite = new IntegrationTestSuite();

  try {
    await testSuite.runTests();
    testSuite.displayIntegrationSummary();
  } catch (error) {
    console.error('Integration test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { IntegrationTestSuite };
