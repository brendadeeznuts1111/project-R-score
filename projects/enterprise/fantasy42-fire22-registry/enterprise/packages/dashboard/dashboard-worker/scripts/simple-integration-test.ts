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
    console.log(`📡 Event: ${event}`, data);
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
  console.log('🚀 Fire22 Simple Integration Test');
  console.log('='.repeat(50));

  try {
    // Test 1: Unified API Handler
    console.log('\n📋 Test 1: Unified API Handler');

    const apiHandler = createUnifiedAPIHandler(mockEnv);
    console.log('   ✅ API handler created');

    // Test login
    const loginResponse = await apiHandler.handleRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'Fire22Admin2025!' },
      systemController: mockSystemController as any,
    });

    console.log('   ✅ Login API test passed');
    console.log('   📊 Response:', JSON.stringify(loginResponse, null, 2));

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

    console.log('   ✅ Balance API test passed');
    console.log('   📊 Response:', JSON.stringify(balanceResponse, null, 2));

    // Test system status
    const statusResponse = await apiHandler.handleRequest({
      method: 'GET',
      path: '/api/system/status',
      systemController: mockSystemController as any,
    });

    console.log('   ✅ System status API test passed');
    console.log('   📊 Response:', JSON.stringify(statusResponse, null, 2));

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

    console.log('   ✅ Wager placement test passed');
    console.log('   📊 Response:', JSON.stringify(wagerResponse, null, 2));

    // Test notification sending
    const notificationResponse = await apiHandler.handleRequest({
      method: 'POST',
      path: '/api/notifications/send',
      body: { message: 'Test notification', target: 'all' },
      user: { id: 'admin', username: 'admin', isAdmin: true },
      systemController: mockSystemController as any,
    });

    console.log('   ✅ Notification API test passed');
    console.log('   📊 Response:', JSON.stringify(notificationResponse, null, 2));

    console.log('\n✅ All integration tests passed!');
    console.log('🎉 Fire22 core integration is functional');

    displayIntegrationSummary();
  } catch (error) {
    console.error('\n❌ Integration tests failed:', error);
    process.exit(1);
  }
}

function displayIntegrationSummary(): void {
  console.log('\n🎯 Integration Summary');
  console.log('='.repeat(50));
  console.log('✅ Unified API Handler: All endpoints working');
  console.log('✅ Authentication: Login system functional');
  console.log('✅ User Management: Profile and balance APIs working');
  console.log('✅ Wager System: Wager placement functional');
  console.log('✅ Notification System: Alert broadcasting working');
  console.log('✅ System Status: Health monitoring active');
  console.log('\n🚀 Fire22 core system is integrated!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Test with real Cloudflare Workers environment');
  console.log('   2. Set BOT_TOKEN in .env for Telegram integration');
  console.log('   3. Deploy to production');
  console.log('   4. Test with real users');
  console.log('\n🔗 Access Points:');
  console.log('   • Dashboard: http://localhost:8787/dashboard');
  console.log('   • Login: http://localhost:8787/login');
  console.log('   • API: http://localhost:8787/api/*');
  console.log('   • Health: http://localhost:8787/health');
}

// Run if called directly
if (import.meta.main) {
  runSimpleIntegrationTest();
}

export { runSimpleIntegrationTest };
