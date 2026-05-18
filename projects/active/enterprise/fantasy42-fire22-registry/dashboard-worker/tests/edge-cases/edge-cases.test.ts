#!/usr/bin/env bun

/**
 * Edge case testing for Fire22 endpoints
 */

const BASE_URL = 'https://dashboard-worker.nolarose1968-806.workers.dev';

async function testEdgeCase(name: string, test: () => Promise<void>) {
  console.info(`\n🧪 Testing: ${name}`);
  try {
    await test();
  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

async function runEdgeCaseTests() {
  console.info('='.repeat(60));
  console.info('Fire22 API Edge Case Testing');
  console.info('='.repeat(60));

  // Test 1: Large date range
  await testEdgeCase('Agent Performance - Large Date Range', async () => {
    const response = await fetch(`${BASE_URL}/Manager/getAgentPerformance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'agentID=BLAKEPPH&start=2024-01-01&end=2025-12-31&type=CP',
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Success:', data.success);
    if (data.data?.metrics) {
      console.info('Total Volume:', data.data.metrics.totalVolume);
      console.info('Total Wagers:', data.data.metrics.totalWagers);
    }
  });

  // Test 2: Invalid date format
  await testEdgeCase('Agent Performance - Invalid Date Format', async () => {
    const response = await fetch(`${BASE_URL}/Manager/getAgentPerformance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'agentID=BLAKEPPH&start=invalid-date&end=also-invalid&type=CP',
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Response:', JSON.stringify(data).substring(0, 100));
  });

  // Test 3: Very large week number
  await testEdgeCase('Weekly Figures - Week 52', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'agentID=BLAKEPPH&week=52&type=A&layout=byDay',
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Week:', data.data?.week);
    console.info('Summary:', data.data?.summary);
  });

  // Test 4: Negative week number
  await testEdgeCase('Weekly Figures - Negative Week', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'agentID=BLAKEPPH&week=-1&type=A&layout=byDay',
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Response:', JSON.stringify(data).substring(0, 100));
  });

  // Test 5: Missing required parameters
  await testEdgeCase('Weekly Figures - Missing AgentID', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'week=0&type=A',
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('AgentID in response:', data.data?.agentID);
  });

  // Test 6: SQL Injection attempt
  await testEdgeCase('SQL Injection Test', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: "agentID='; DROP TABLE bets; --&week=0",
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Response success:', data.success);
  });

  // Test 7: XSS attempt
  await testEdgeCase('XSS Test', async () => {
    const response = await fetch(`${BASE_URL}/api/fire22/player-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: '<script>alert("XSS")</script>',
        agentId: 'BLAKEPPH',
      }),
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Error message:', data.error);
  });

  // Test 8: Oversized request
  await testEdgeCase('Large Request Body', async () => {
    const largeString = 'A'.repeat(10000);
    const response = await fetch(`${BASE_URL}/api/fire22/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: largeString,
        agentId: 'BLAKEPPH',
        limit: 1000,
      }),
    });

    console.info('Status:', response.status);
    if (!response.ok) {
      const text = await response.text();
      console.info('Error:', text.substring(0, 100));
    }
  });

  // Test 9: Special characters in parameters
  await testEdgeCase('Special Characters', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: encodeURI('agentID=BLAKE!@#$%^&*()PPH&week=0&type=A&layout=byDay'),
    });

    const data = await response.json();
    console.info('Status:', response.status);
    console.info('Success:', data.success);
  });

  // Test 10: Concurrent requests
  await testEdgeCase('Concurrent Requests (10 simultaneous)', async () => {
    const requests = Array(10)
      .fill(null)
      .map(() =>
        fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'agentID=BLAKEPPH&week=0&type=A',
        })
      );

    const startTime = performance.now();
    const responses = await Promise.all(requests);
    const endTime = performance.now();

    const statuses = responses.map(r => r.status);
    console.info('All status codes:', statuses);
    console.info(
      'All successful:',
      statuses.every(s => s === 200)
    );
    console.info(`Total time for 10 requests: ${(endTime - startTime).toFixed(2)}ms`);
    console.info(`Average time per request: ${((endTime - startTime) / 10).toFixed(2)}ms`);
  });

  // Test 11: CORS preflight
  await testEdgeCase('OPTIONS Request (CORS Preflight)', async () => {
    const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    console.info('Status:', response.status);
    console.info('CORS Headers:');
    console.info('  Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.info('  Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    console.info('  Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
  });

  // Test 12: Different agent IDs
  await testEdgeCase('Different Agent IDs', async () => {
    const agents = ['AGENT001', 'AGENT002', 'TESTUSER', '123456', ''];

    for (const agentID of agents) {
      const response = await fetch(`${BASE_URL}/api/manager/getWeeklyFigureByAgentLite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `agentID=${agentID}&week=0`,
      });

      const data = await response.json();
      console.info(`  Agent "${agentID}": Status ${response.status}, Success: ${data.success}`);
    }
  });

  console.info('\n' + '='.repeat(60));
  console.info('Edge case testing completed');
  console.info('='.repeat(60));
}

// Run the tests
runEdgeCaseTests().catch(console.error);
