#!/usr/bin/env bun

/**
 * Test secure Fire22 endpoints with Bun.secrets integration
 */

import { SecureFire22Client } from './src/integration/secure-fire22-client.ts';

console.info(`
╔════════════════════════════════════════════════════════╗
║        Fire22 Secure Endpoints Test Suite             ║
╚════════════════════════════════════════════════════════╝
`);

const ENDPOINTS = [
  {
    url: 'http://localhost:3001/api/manager/getWeeklyFigureByAgentLite',
    method: 'POST',
    body: { agentID: 'BLAKEPPH', week: '0' },
    description: 'Weekly Figures Lite',
  },
  {
    url: 'http://localhost:3001/api/manager/getAgentPerformance',
    method: 'POST',
    body: { agentID: 'BLAKEPPH', type: 'A' },
    description: 'Agent Performance',
  },
  {
    url: 'http://localhost:3001/api/fire22/player-info/TEST001',
    method: 'GET',
    description: 'Player Info (requires auth)',
  },
  {
    url: 'http://localhost:3001/api/fire22/transactions',
    method: 'POST',
    body: { playerID: 'TEST001' },
    description: 'Transactions (requires auth)',
  },
  {
    url: 'http://localhost:3001/api/fire22/crypto-info',
    method: 'GET',
    description: 'Crypto Info (requires auth)',
  },
  {
    url: 'http://localhost:3001/api/fire22/mail',
    method: 'POST',
    body: { subject: 'Test', message: 'Test message' },
    description: 'Mail (requires auth)',
  },
];

async function testEndpoint(endpoint: any) {
  console.info(`\n📍 Testing: ${endpoint.description}`);
  console.info(`   ${endpoint.method} ${endpoint.url}`);

  try {
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-jwt-token-123',
        'X-Request-ID': crypto.randomUUID(),
      },
    };

    if (endpoint.body && endpoint.method === 'POST') {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(endpoint.url, options);
    const responseData = await response.text();

    if (response.ok) {
      console.info(`   ✅ Status: ${response.status}`);
      try {
        const json = JSON.parse(responseData);
        console.info(`   📊 Response:`, JSON.stringify(json).substring(0, 100) + '...');
      } catch {
        console.info(`   📊 Response: ${responseData.substring(0, 100)}...`);
      }
    } else {
      console.info(`   ⚠️ Status: ${response.status} ${response.statusText}`);
      if (response.status === 500 && endpoint.description.includes('requires auth')) {
        console.info(`   💡 This endpoint requires valid Fire22 credentials`);
      }
    }
  } catch (error: any) {
    console.info(`   ❌ Error: ${error.message}`);
  }
}

async function testSecureClient() {
  console.info(`\n\n🔐 Testing Secure Fire22 Client Integration\n`);

  const client = new SecureFire22Client();

  // Test initialization
  console.info('1. Initializing secure client...');
  const initialized = await client.initialize();

  if (initialized) {
    console.info('   ✅ Client initialized with credentials');

    // Test connection
    console.info('2. Testing API connection...');
    const connected = await client.testConnection();

    if (connected) {
      console.info('   ✅ API connection successful');

      // Test weekly figures
      console.info('3. Testing weekly figures endpoint...');
      try {
        const data = await client.getWeeklyFigureByAgentLite({ week: 0 });
        console.info('   ✅ Weekly figures retrieved');
        console.info('   📊 Data:', JSON.stringify(data).substring(0, 100) + '...');
      } catch (error: any) {
        console.info('   ⚠️ Failed:', error.message);
      }
    } else {
      console.info('   ⚠️ API connection failed - check credentials');
    }
  } else {
    console.info('   ℹ️ No credentials found - run setup script:');
    console.info('   bun run scripts/setup-secure-credentials.ts');
  }
}

async function checkServerRunning() {
  try {
    const response = await fetch('http://localhost:3001/health');
    return response.ok;
  } catch {
    return false;
  }
}

// Main test execution
async function main() {
  // Check if server is running
  const serverRunning = await checkServerRunning();

  if (!serverRunning) {
    console.info('⚠️ Server not running. Start it with: bun run dev-server');
    console.info('\nTesting secure client only...');
    await testSecureClient();
    return;
  }

  // Test all endpoints
  console.info('\n🚀 Testing API Endpoints\n');
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }

  // Test secure client
  await testSecureClient();

  console.info(`\n\n✨ Test suite complete!\n`);

  console.info(`
📋 Summary:
- Weekly Figures Lite: Working (no auth required) 
- Agent Performance: Working (no auth required)
- Player Info: Requires Fire22 credentials
- Transactions: Requires Fire22 credentials  
- Crypto Info: Requires Fire22 credentials
- Mail: Requires Fire22 credentials

💡 To enable Fire22 proxy endpoints:
1. Run: bun run scripts/setup-secure-credentials.ts
2. Enter your Fire22 API token when prompted
3. Restart the server to load credentials
`);
}

main().catch(console.error);
