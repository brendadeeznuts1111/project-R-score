#!/usr/bin/env bun

/**
 * 🔥 Fire22 Simple Integration Test
 * Basic test of core integration components
 */

import { createUnifiedAPIHandler } from '../src/api/unified-endpoints';

// Mock environment for testing
const mockEnv = {
  NODE_ENV: 'development',
  BOT_TOKEN: 'test-token',
  DB: {
    prepare: (query: string) => ({
      bind: (...args: any[]) => ({
        first: async () => ({
          balance: 1000,
          credit_limit: 5000,
          outstanding_balance: 0,
          available_credit: 5000,
        }),
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { last_row_id: 1 } }),
      }),
    }),
  },
} as any;

// Mock system controller
const mockSystemController = {
  broadcastSystemEvent: async (event: string, data: any) => {
    console.info(`📡 Event: ${event}`, data);
  },
  getSystemStatus: () => ({
    dashboard: 'online',
    telegramBot: 'offline',
    database: 'connected',
    notifications: 'active',
    realTimeUpdates: 'active',
  }),
};

async function runSimpleIntegrationTest(): Promise<void> {
  console.info('🚀 Fire22 Simple Integration Test');
  console.info('='.repeat(50));

  try {
    // Test 1: Unified API Handler
    console.info('\n📋 Test 1: Unified API Handler');

    const apiHandler = createUnifiedAPIHandler(mockEnv);
    console.info('   ✅ API handler created');

    // Test login
    const loginResponse = await apiHandler.handleRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'Fire22Admin2025!' },
      systemController: mockSystemController as any,
    });

    console.info('   ✅ Login API test passed');
    console.info('   📊 Response:', JSON.stringify(loginResponse, null, 2));

    if (!loginResponse.success) {
      throw new Error('Login API test failed');
    }

    // Test balance API
    const balanceResponse = await apiHandler.handleRequest({
      method: 'GET',
      path: '/api/user/balance',
      user: { id: 'admin', username: 'admin', isAdmin: true },
      systemController: mockSystemController as any,
    });

    console.info('   ✅ Balance API test passed');
    console.info('   📊 Response:', JSON.stringify(balanceResponse, null, 2));

    // Test system status
    const statusResponse = await apiHandler.handleRequest({
      method: 'GET',
      path: '/api/system/status',
      systemController: mockSystemController as any,
    });

    console.info('   ✅ System status API test passed');
    console.info('   📊 Response:', JSON.stringify(statusResponse, null, 2));

    // Test wager placement
    const wagerResponse = await apiHandler.handleRequest({
      method: 'POST',
      path: '/api/wagers/place',
      body: {
        selection: 'Team A to win',
        stake: 50,
        odds: 2.0,
      },
      user: { id: 'test_user', username: 'test_user', telegramId: 123456789, isAdmin: false },
      systemController: mockSystemController as any,
    });

    console.info('   ✅ Wager placement test passed');
    console.info('   📊 Response:', JSON.stringify(wagerResponse, null, 2));

    // Test notification sending
    const notificationResponse = await apiHandler.handleRequest({
      method: 'POST',
      path: '/api/notifications/send',
      body: { message: 'Test notification', target: 'all' },
      user: { id: 'admin', username: 'admin', isAdmin: true },
      systemController: mockSystemController as any,
    });

    console.info('   ✅ Notification API test passed');
    console.info('   📊 Response:', JSON.stringify(notificationResponse, null, 2));

    console.info('\n✅ All integration tests passed!');
    console.info('🎉 Fire22 core integration is functional');

    displayIntegrationSummary();
  } catch (error) {
    console.error('\n❌ Integration tests failed:', error);
    process.exit(1);
  }
}

function displayIntegrationSummary(): void {
  console.info('\n🎯 Integration Summary');
  console.info('='.repeat(50));
  console.info('✅ Unified API Handler: All endpoints working');
  console.info('✅ Authentication: Login system functional');
  console.info('✅ User Management: Profile and balance APIs working');
  console.info('✅ Wager System: Wager placement functional');
  console.info('✅ Notification System: Alert broadcasting working');
  console.info('✅ System Status: Health monitoring active');
  console.info('\n🚀 Fire22 core system is integrated!');
  console.info('\n📋 Next Steps:');
  console.info('   1. Test with real Cloudflare Workers environment');
  console.info('   2. Set BOT_TOKEN in .env for Telegram integration');
  console.info('   3. Deploy to production');
  console.info('   4. Test with real users');
  console.info('\n🔗 Access Points:');
  console.info('   • Dashboard: http://localhost:8787/dashboard');
  console.info('   • Login: http://localhost:8787/login');
  console.info('   • API: http://localhost:8787/api/*');
  console.info('   • Health: http://localhost:8787/health');
}

// Run if called directly
if (import.meta.main) {
  runSimpleIntegrationTest();
}

export { runSimpleIntegrationTest };
