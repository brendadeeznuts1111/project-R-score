#!/usr/bin/env bun
/**
 * Payment Flow Demo & Test Script
 * 
 * Tests the payment webhook server with various scenarios:
 * - No profile (auto-approve)
 * - Low risk (auto-approve)
 * - Medium risk (review)
 * - High risk (block)
 */

const PAYMENT_SERVER_URL = Bun.env.PAYMENT_SERVER_URL ?? 'http://localhost:3001';

interface TestCase {
  name: string;
  userId: string;
  amount: number;
  expectedStatus: 'approved' | 'review' | 'blocked';
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'New User (No Profile)',
    userId: '@newuser123',
    amount: 25.00,
    expectedStatus: 'approved',
    description: 'Should auto-approve when no super-profile exists (optional fusion)',
  },
  {
    name: 'Trusted User',
    userId: '@trusted_user',
    amount: 100.00,
    expectedStatus: 'approved',
    description: 'Should auto-approve for users with high score and low drift',
  },
  {
    name: 'Suspicious Drift',
    userId: '@suspicious',
    amount: 50.00,
    expectedStatus: 'blocked',
    description: 'Should block when drift indicates possible account takeover',
  },
  {
    name: 'Medium Risk',
    userId: '@review_needed',
    amount: 75.00,
    expectedStatus: 'review',
    description: 'Should flag for manual review',
  },
];

async function testPaymentFlow(testCase: TestCase): Promise<boolean> {
  console.info(`\n🧪 ${testCase.name}`);
  console.info(`   ${testCase.description}`);
  
  try {
    const response = await fetch(`${PAYMENT_SERVER_URL}/test/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testCase.userId,
        amount: testCase.amount,
        source: 'demo',
      }),
    });
    
    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status}: ${await response.text()}`);
      return false;
    }
    
    const result = await response.json();
    
    const statusMatch = result.status === testCase.expectedStatus;
    const icon = statusMatch ? '✅' : '❌';
    
    console.info(`   ${icon} Status: ${result.status} (expected: ${testCase.expectedStatus})`);
    console.info(`   📊 Risk: ${result.risk.risk} - ${result.risk.reason}`);
    console.info(`   💰 Amount: $${result.amount} | User: ${result.userId}`);
    
    return statusMatch;
  } catch (err: any) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PAYMENT_SERVER_URL}/health`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error(`❌ Health check failed: HTTP ${response.status}`);
      return false;
    }
    
    const health = await response.json();
    console.info('✅ Server is healthy');
    console.info(`   Pinecone: ${health.pinecone}`);
    console.info(`   Redis: ${health.redis}`);
    console.info(`   Timestamp: ${health.timestamp}`);
    return true;
  } catch (err: any) {
    console.error(`❌ Cannot connect to server at ${PAYMENT_SERVER_URL}`);
    console.error(`   ${err.message}`);
    console.error(`\n🚀 Start the server with: bun run server/payment-webhook-server.ts`);
    return false;
  }
}

async function testWebhooks(): Promise<void> {
  console.info('\n📡 Testing Webhook Endpoints...\n');
  
  // Test PayPal webhook (will fail signature but tests endpoint)
  console.info('Testing PayPal webhook endpoint...');
  try {
    const paypalResponse = await fetch(`${PAYMENT_SERVER_URL}/webhook/paypal`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'paypal-transmission-sig': 'primary=test',
      },
      body: JSON.stringify({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          amount: { total: '10.00' },
          sender_email: 'test@example.com',
        },
      }),
    });
    console.info(`   PayPal webhook: HTTP ${paypalResponse.status}`);
  } catch (err: any) {
    console.error(`   PayPal webhook error: ${err.message}`);
  }
  
  // Test Venmo webhook
  console.info('Testing Venmo webhook endpoint...');
  try {
    const venmoResponse = await fetch(`${PAYMENT_SERVER_URL}/webhook/venmo`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-venmo-signature': 'v1=test',
      },
      body: JSON.stringify({
        type: 'payment.created',
        data: {
          actor: { username: 'testuser' },
          amount: '5.00',
        },
      }),
    });
    console.info(`   Venmo webhook: HTTP ${venmoResponse.status}`);
  } catch (err: any) {
    console.error(`   Venmo webhook error: ${err.message}`);
  }
}

async function main(): Promise<void> {
  console.info('╔════════════════════════════════════════════════════════════╗');
  console.info('║     🦘 Payment Flow Demo & Test Suite                      ║');
  console.info('╚════════════════════════════════════════════════════════════╝');
  console.info(`\nServer URL: ${PAYMENT_SERVER_URL}\n`);
  
  // Check health first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    process.exit(1);
  }
  
  // Test webhook endpoints
  await testWebhooks();
  
  // Run test cases
  console.info('\n╔════════════════════════════════════════════════════════════╗');
  console.info('║     Running Test Cases                                     ║');
  console.info('╚════════════════════════════════════════════════════════════╝');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of TEST_CASES) {
    const success = await testPaymentFlow(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Summary
  console.info('\n╔════════════════════════════════════════════════════════════╗');
  console.info('║     Test Summary                                           ║');
  console.info('╠════════════════════════════════════════════════════════════╣');
  console.info(`║  Total:  ${TEST_CASES.length.toString().padStart(3)}                                           ║`);
  console.info(`║  Passed: ${passed.toString().padStart(3)} ${'✅'.repeat(passed).padEnd(35)} ║`);
  console.info(`║  Failed: ${failed.toString().padStart(3)} ${'❌'.repeat(failed).padEnd(35)} ║`);
  console.info('╚════════════════════════════════════════════════════════════╝');
  
  // Redis monitoring hint
  console.info('\n💡 Monitor Redis events with:');
  console.info('   redis-cli monitor | grep -E "(DEPOSIT_SUCCESS|FRAUD_ALERT|PROFILE_FUSE)"');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
