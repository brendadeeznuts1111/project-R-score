#!/usr/bin/env bun
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

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Payment + Dashboard Integration Test                      ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`\nPayment Server: ${PAYMENT_URL}`);
console.log(`Dashboard: ${DASHBOARD_URL}\n`);

// Test 1: Check payment server health
async function testPaymentHealth(): Promise<boolean> {
  process.stdout.write('1. Payment server health... ');
  try {
    const res = await fetch(`${PAYMENT_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ (${data.redis})`);
      return true;
    }
    console.log('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.log(`❌ ${err.message}`);
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
      console.log(`✅ (${data.clients} clients, ${data.redis})`);
      return true;
    }
    console.log('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.log(`❌ ${err.message}`);
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
      console.log(`✅ (${data.status}, risk: ${data.risk.risk})`);
      return true;
    }
    console.log('❌ HTTP ' + res.status);
    return false;
  } catch (err: any) {
    console.log(`❌ ${err.message}`);
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
            console.log('⚠️  connected but no message');
            ws.close();
            resolve(false);
          }
        }, 2000);
      });
      
      ws.addEventListener('message', (event) => {
        if (!receivedMessage) {
          receivedMessage = true;
          const data = JSON.parse(event.data);
          console.log(`✅ (received: ${data.tag})`);
          ws.close();
          resolve(true);
        }
      });
      
      ws.addEventListener('error', () => {
        console.log('❌ connection failed');
        resolve(false);
      });
      
      ws.addEventListener('close', () => {
        if (!receivedMessage) {
          console.log('❌ closed before message');
          resolve(false);
        }
      });
      
      // Timeout
      setTimeout(() => {
        ws.close();
        if (!receivedMessage) {
          console.log('❌ timeout');
          resolve(false);
        }
      }, 5000);
      
    } catch (err: any) {
      console.log(`❌ ${err.message}`);
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
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed}/${total} tests passed                        ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (passed === total) {
    console.log('\n✨ All systems integrated and running!');
    console.log('\nNext steps:');
    console.log('  1. Open dashboard: open ' + DASHBOARD_URL);
    console.log('  2. Send test payment: curl -X POST ' + PAYMENT_URL + '/test/payment ...');
    console.log('  3. Watch events appear in dashboard in real-time!');
  } else {
    console.log('\n⚠️  Some tests failed. Check:');
    console.log('  • Is Redis running? redis-cli ping');
    console.log('  • Payment server: bun run start:payments');
    console.log('  • Dashboard: bun run start:profile-dash:live');
    process.exit(1);
  }
}

main().catch(console.error);
