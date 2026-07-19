#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Payment Server + Profile Dashboard Integration Test
 * 
 * Tests the full flow:
 * 1. Payment webhook server receives payment
 * 2. Publishes to Redis
 * 3. Dashboard receives via WebSocket
 */

const PAYMENT_URL = Bun.env.PAYMENT_URL ?? 'http://localhost:3001';
const DASHBOARD_URL = Bun.env.DASHBOARD_URL ?? 'http://localhost:3006';

console.info('╔════════════════════════════════════════════════════════════╗');
console.info('║  Payment + Dashboard Integration Test                      ║');
console.info('╚════════════════════════════════════════════════════════════╝');
console.info(`\nPayment Server: ${PAYMENT_URL}`);
console.info(`Dashboard: ${DASHBOARD_URL}\n`);

// Test 1: Check payment server health
async function testPaymentHealth(): Promise<boolean> {
  process.stdout.write('1. Payment server health... ');
  try {
    const res = await fetch(`${PAYMENT_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      console.info(`✅ (${data.redis})`);
      return true;
    }
    console.info('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.info(`❌ ${err.message}`);
    return false;
  }
}

// Test 2: Check dashboard health
async function testDashboardHealth(): Promise<boolean> {
  process.stdout.write('2. Dashboard server health... ');
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/status`);
    if (res.ok) {
      const data = await res.json();
      console.info(`✅ (${data.clients} clients, ${data.redis})`);
      return true;
    }
    console.info('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.info(`❌ ${err.message}`);
    return false;
  }
}

// Test 3: Send test payment
async function testPaymentFlow(): Promise<boolean> {
  process.stdout.write('3. Sending test payment... ');
  try {
    const res = await fetch(`${PAYMENT_URL}/test/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '@test_user_123',
        amount: 50.00,
        source: 'integration_test'
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.info(`✅ (${data.status}, risk: ${data.risk.risk})`);
      return true;
    }
    console.info('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.info(`❌ ${err.message}`);
    return false;
  }
}

// Test 4: WebSocket connection test
async function testWebSocket(): Promise<boolean> {
  process.stdout.write('4. WebSocket connection... ');
  
  return new Promise((resolve) => {
    const wsUrl = DASHBOARD_URL.replace('http', 'ws') + '/ws/telemetry-3d';
    
    try {
      const ws = new WebSocket(wsUrl);
      let receivedMessage = false;
      
      ws.addEventListener('open', () => {
        // Wait for welcome message
        setTimeout(() => {
          if (!receivedMessage) {
            console.info('⚠️  connected but no message');
            ws.close();
            resolve(false);
          }
        }, 2000);
      });
      
      ws.addEventListener('message', (event) => {
        if (!receivedMessage) {
          receivedMessage = true;
          const data = JSON.parse(event.data);
          console.info(`✅ (received: ${data.tag})`);
          ws.close();
          resolve(true);
        }
      });
      
      ws.addEventListener('error', () => {
        console.info('❌ connection failed');
        resolve(false);
      });
      
      ws.addEventListener('close', () => {
        if (!receivedMessage) {
          console.info('❌ closed before message');
          resolve(false);
        }
      });
      
      // Timeout
      setTimeout(() => {
        ws.close();
        if (!receivedMessage) {
          console.info('❌ timeout');
          resolve(false);
        }
      }, 5000);
      
    } catch (err: any) {
      console.info(`❌ ${err.message}`);
      resolve(false);
    }
  });
}

// Run all tests
async function main() {
  const results = [];
  
  results.push(await testPaymentHealth());
  results.push(await testDashboardHealth());
  results.push(await testPaymentFlow());
  results.push(await testWebSocket());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.info('\n╔════════════════════════════════════════════════════════════╗');
  console.info(`║  Results: ${passed}/${total} tests passed                        ║`);
  console.info('╚════════════════════════════════════════════════════════════╝');
  
  if (passed === total) {
    console.info('\n✨ All systems integrated and running!');
    console.info('\nNext steps:');
    console.info('  1. Open dashboard: open ' + DASHBOARD_URL);
    console.info('  2. Send test payment: curl -X POST ' + PAYMENT_URL + '/test/payment ...');
    console.info('  3. Watch events appear in dashboard in real-time!');
  } else {
    console.info('\n⚠️  Some tests failed. Check:');
    console.info('  • Is Redis running? redis-cli ping');
    console.info('  • Payment server: bun run start:payments');
    console.info('  • Dashboard: bun run start:profile-dash:live');
    process.exit(1);
  }
}

main().catch(console.error);
