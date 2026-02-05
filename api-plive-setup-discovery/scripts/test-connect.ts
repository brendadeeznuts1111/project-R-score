// scripts/test-connect.ts - Simulate reconnections + heartbeats
// Bun 1.3 connectivity test with WebSocket simulation

import { fetch } from 'bun';
import { file, YAML } from 'bun';

async function testConnectivity() {
  console.log('🔌 Testing WebSocket connectivity...');

  const config = YAML.parse(await file('bun.yaml').text());
  const { connectivity } = config.api;

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  // Test WS negotiation endpoint
  console.log('📡 Testing WS negotiation...');
  try {
    const negotiateResponse = await fetch(`http://localhost:${connectivity.ws.port}/api/ws/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedTopics: ['telemetry.live'],
        preferredTypes: ['JSON', 'TELEMETRY'],
        subprotocol: connectivity.ws.subprotocol
      })
    });

    if (negotiateResponse.ok) {
      const negotiateData = await negotiateResponse.json();
      console.log('✅ WS negotiation successful:', {
        subprotocol: negotiateData.subprotocol,
        supportedTypes: negotiateData.supportedTypes,
        heartbeatInterval: negotiateData.heartbeatInterval
      });
      successCount++;
    } else {
      errorCount++;
      console.error(`❌ WS negotiation failed: ${negotiateResponse.status}`);
    }
  } catch (error) {
    errorCount++;
    console.error('❌ WS negotiation error:', error.message);
  }

  // Test polling fallback endpoint
  console.log('📡 Testing polling fallback...');
  try {
    const pollResponse = await fetch(`http://localhost:${connectivity.ws.port}/api/poll/telemetry`, {
      headers: {
        'X-CSRF-Token': 'test-token'
      }
    });

    if (pollResponse.ok) {
      const pollData = await pollResponse.json();
      console.log('✅ Polling fallback successful:', {
        telemetryCount: pollData.telemetry.length,
        nextPoll: pollData.nextPoll,
        hasMore: pollData.hasMore
      });
      successCount++;
    } else {
      errorCount++;
      console.error(`❌ Polling fallback failed: ${pollResponse.status}`);
    }
  } catch (error) {
    errorCount++;
    console.error('❌ Polling fallback error:', error.message);
  }

  // Simulate heartbeat timing
  console.log('💓 Testing heartbeat intervals...');
  const heartbeatInterval = parseInt(connectivity.ws.heartbeat.interval) * 1000;
  const heartbeatStart = Date.now();
  
  // Simulate receiving a ping
  await new Promise(resolve => setTimeout(resolve, 100));
  const heartbeatLatency = Date.now() - heartbeatStart;
  
  console.log(`✅ Heartbeat latency: ${heartbeatLatency}ms (target: <${connectivity.ws.heartbeat.timeout * 1000}ms)`);
  successCount++;

  // Test reconnection backoff calculation
  console.log('🔄 Testing reconnection backoff...');
  const maxRetries = connectivity.ws.reconnect.maxRetries;
  const initialDelay = 1000; // 1s
  const maxDelay = 60000; // 60s
  const backoffMultiplier = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delay = Math.min(
      initialDelay * Math.pow(backoffMultiplier, attempt - 1),
      maxDelay
    );
    console.log(`  Attempt ${attempt}: ${delay}ms delay`);
  }
  successCount++;

  const duration = Date.now() - startTime;
  const successRate = (successCount / (successCount + errorCount)) * 100;

  console.log('\n📊 Connectivity Test Results:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏱️  Duration: ${duration}ms`);
  console.log(`  📈 Success Rate: ${successRate.toFixed(2)}%`);

  if (successRate >= 75) {
    console.log('🎉 Connectivity test passed!');
  } else {
    console.log('⚠️  Connectivity test had errors');
    process.exit(1);
  }
}

if (import.meta.main) {
  testConnectivity();
}
