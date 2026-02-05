#!/usr/bin/env bun
/**
 * Quick test for P2P Proxy
 * Tests both the original and Bun-native versions
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3002';

async function testEndpoint(name: string, url: string, init?: RequestInit): Promise<boolean> {
  process.stdout.write(`Testing ${name}... `);
  try {
    const res = await fetch(url, init);
    if (res.ok) {
      console.log(`✅ HTTP ${res.status}`);
      return true;
    } else {
      console.log(`❌ HTTP ${res.status}`);
      return false;
    }
  } catch (err: any) {
    if (err.code === 'ConnectionRefused') {
      console.log(`⚠️  Server not running at ${url}`);
    } else {
      console.log(`❌ ${err.message}`);
    }
    return false;
  }
}

async function testProxy() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💈 P2P Proxy Quick Test                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Proxy URL: ${PROXY_URL}\n`);
  
  const results = [];
  
  // Test 1: Health check
  results.push(await testEndpoint(
    'Health check',
    `${PROXY_URL}/health`
  ));
  
  // Test 2: Payment page
  results.push(await testEndpoint(
    'Payment page',
    `${PROXY_URL}/pay?amount=25`
  ));
  
  // Test 3: Webhook (PayPal simulation)
  results.push(await testEndpoint(
    'PayPal webhook',
    `${PROXY_URL}/webhook/proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'paypal-transmission-sig': 'v1=test',
      },
      body: JSON.stringify({
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          amount: { total: '25.00' },
          sender_email: 'test@example.com',
        },
      }),
    }
  ));
  
  // Test 4: Webhook (Venmo simulation)
  results.push(await testEndpoint(
    'Venmo webhook',
    `${PROXY_URL}/webhook/proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-venmo-signature': 'v1=test',
      },
      body: JSON.stringify({
        type: 'payment.created',
        data: {
          actor: { username: 'testuser' },
          amount: '15.00',
        },
      }),
    }
  ));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed}/${total} tests passed                        ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (passed === 0) {
    console.log('\n⚠️  Server not running. Start it with:');
    console.log('   bun run start:p2p-proxy:bun');
    console.log('   # or');
    console.log('   bun run start:p2p-proxy:v2');
  } else if (passed < total) {
    console.log('\n⚠️  Some tests failed. Check server logs.');
  } else {
    console.log('\n✨ All tests passed!');
  }
  
  process.exit(passed === total ? 0 : 1);
}

testProxy().catch(console.error);
