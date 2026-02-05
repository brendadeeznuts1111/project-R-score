#!/usr/bin/env ts-node

/**
 * WebSocket Real-Time Betting Workflow Demo
 *
 * This demo showcases the complete WebSocket integration for real-time
 * betting platform workflow management.
 */

import { BettingWorkflowWebSocketClient } from './websocket-client';
import { WebSocketBettingWorkflowTester } from './websocket-testing';

async function runWebSocketDemo() {
  console.log('🎯 BETTING WORKFLOW API - WEBSOCKET REAL-TIME DEMO');
  console.log('='.repeat(60));
  console.log();

  console.log('📋 This demo will test:');
  console.log('   • WebSocket connection and authentication');
  console.log('   • Real-time workflow creation notifications');
  console.log('   • Live approval status updates');
  console.log('   • Bulk operation broadcasting');
  console.log('   • Connection recovery and error handling');
  console.log();

  // Create clients
  const wsClient = new BettingWorkflowWebSocketClient();
  const tester = new WebSocketBettingWorkflowTester();

  try {
    console.log('🔌 STEP 1: Testing WebSocket Connection');
    console.log('-'.repeat(40));

    // Test basic connection
    await wsClient.connect();
    console.log('✅ WebSocket connected successfully');
    console.log();

    console.log('🎭 STEP 2: Setting up Event Listeners');
    console.log('-'.repeat(40));

    // Set up comprehensive event listeners
    wsClient.on('authenticated', (data) => {
      console.log(`🔑 WebSocket authenticated for user: ${data.userId}`);
    });

    wsClient.on('workflow.created', (workflow) => {
      console.log(`🆕 WORKFLOW CREATED: ${workflow.id}`);
      console.log(`   Status: ${workflow.status} | Step: ${workflow.currentStep}`);
      console.log(`   Time: ${workflow.updatedAt}`);
      console.log();
    });

    wsClient.on('workflow.updated', (workflow) => {
      console.log(`📝 WORKFLOW UPDATED: ${workflow.id}`);
      console.log(`   Status: ${workflow.status} | Step: ${workflow.currentStep}`);
      console.log(`   Time: ${workflow.updatedAt}`);
      console.log();
    });

    wsClient.on('workflow.approved', (approval) => {
      console.log(`✅ WORKFLOW APPROVED: ${approval.workflowId}`);
      console.log(`   Step: ${approval.stepId} | Approver: ${approval.approver}`);
      if (approval.comments) {
        console.log(`   Comments: "${approval.comments}"`);
      }
      console.log(`   Time: ${approval.approvedAt}`);
      console.log();
    });

    wsClient.on('subscribed', (data) => {
      console.log(`📡 Subscribed to workflow: ${data.workflowId}`);
    });

    wsClient.on('error', (error) => {
      console.error(`🚨 WebSocket error:`, error);
    });

    console.log('✅ Event listeners configured');
    console.log();

    console.log('🎯 STEP 3: Running Comprehensive Tests');
    console.log('-'.repeat(40));

    // Run the full test suite
    const testResults = await tester.runAllTests();

    console.log();
    console.log('📊 STEP 4: Demo Summary');
    console.log('-'.repeat(40));

    console.log(`⏱️  Demo Duration: ${(testResults.duration / 1000).toFixed(2)} seconds`);
    console.log(`🧪 Tests Run: ${testResults.total}`);
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);

    const successRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : '0';
    console.log(`📈 Success Rate: ${successRate}%`);

    if (testResults.errors.length > 0) {
      console.log();
      console.log('🚨 Issues Found:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log();
    console.log('🎉 STEP 5: Demo Complete');
    console.log('-'.repeat(40));

    if (testResults.failed === 0) {
      console.log('🎊 ALL TESTS PASSED!');
      console.log('✅ WebSocket real-time integration is working perfectly');
      console.log();
      console.log('🚀 Your betting platform now supports:');
      console.log('   • Real-time workflow notifications');
      console.log('   • Live approval status updates');
      console.log('   • Instant bulk operation feedback');
      console.log('   • Automatic connection recovery');
      console.log('   • Comprehensive error handling');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('🔧 Check the issues above and ensure:');
      console.log('   • API server is running on localhost:3000');
      console.log('   • Database and Redis are accessible');
      console.log('   • JWT tokens are valid (if using authentication)');
      console.log('   • Network connectivity is stable');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('🎯 DEMO FINISHED - WebSocket Real-Time Integration Ready!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Demo failed with error:', error);
    console.log();
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run dev');
    console.log('   2. Check database connectivity');
    console.log('   3. Verify Redis is running');
    console.log('   4. Check network firewall settings');
    console.log('   5. Review server logs for detailed errors');
  } finally {
    // Cleanup
    wsClient.disconnect();
  }
}

// ===== INTERACTIVE DEMO MODE =====

async function runInteractiveDemo() {
  console.log('🎮 INTERACTIVE WEBSOCKET DEMO MODE');
  console.log('='.repeat(50));
  console.log();
  console.log('This mode allows you to manually test WebSocket features:');
  console.log('• Connect/disconnect from WebSocket');
  console.log('• Subscribe to workflow updates');
  console.log('• Create workflows via API to see real-time updates');
  console.log('• Test authentication and error scenarios');
  console.log();

  const wsClient = new BettingWorkflowWebSocketClient();

  // Set up event listeners
  wsClient.on('authenticated', (data) => {
    console.log(`🔑 ✅ Authenticated as: ${data.userId}`);
  });

  wsClient.on('authentication_error', (error) => {
    console.log(`🔑 ❌ Authentication failed: ${error.message}`);
  });

  wsClient.on('workflow.created', (workflow) => {
    console.log(`🆕 📡 WORKFLOW CREATED: ${workflow.id} (${workflow.status})`);
  });

  wsClient.on('workflow.updated', (workflow) => {
    console.log(`📝 📡 WORKFLOW UPDATED: ${workflow.id} (${workflow.status})`);
  });

  wsClient.on('workflow.approved', (approval) => {
    console.log(`✅ 📡 WORKFLOW APPROVED: ${approval.workflowId} by ${approval.approver}`);
  });

  wsClient.on('subscribed', (data) => {
    console.log(`📡 ✅ Subscribed to: ${data.workflowId}`);
  });

  wsClient.on('unsubscribed', (data) => {
    console.log(`🚫 ✅ Unsubscribed from: ${data.workflowId}`);
  });

  console.log('Available commands:');
  console.log('  connect          - Connect to WebSocket server');
  console.log('  auth <token>     - Authenticate with JWT token');
  console.log('  subscribe <id>   - Subscribe to workflow updates');
  console.log('  unsubscribe <id> - Unsubscribe from workflow updates');
  console.log('  status          - Show connection status');
  console.log('  disconnect      - Disconnect from WebSocket');
  console.log('  quit            - Exit demo');
  console.log();

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askCommand = () => {
    rl.question('WebSocket Demo> ', async (input: string) => {
      const [command, ...args] = input.trim().split(' ');
      const param = args.join(' ');

      try {
        switch (command.toLowerCase()) {
          case 'connect':
            console.log('🔌 Connecting...');
            await wsClient.connect();
            console.log('✅ Connected!');
            break;

          case 'auth':
            if (!param) {
              console.log('❌ Please provide a JWT token: auth <token>');
            } else {
              wsClient.authenticate(param);
              console.log('🔑 Authenticating...');
            }
            break;

          case 'subscribe':
            if (!param) {
              console.log('❌ Please provide a workflow ID: subscribe <workflow-id>');
            } else {
              wsClient.subscribeToWorkflow(param);
            }
            break;

          case 'unsubscribe':
            if (!param) {
              console.log('❌ Please provide a workflow ID: unsubscribe <workflow-id>');
            } else {
              wsClient.unsubscribeFromWorkflow(param);
            }
            break;

          case 'status':
            console.log(`🔌 Connection Status: ${wsClient.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
            if (wsClient.connectionId) {
              console.log(`🆔 Connection ID: ${wsClient.connectionId}`);
            }
            break;

          case 'disconnect':
            console.log('🔌 Disconnecting...');
            wsClient.disconnect();
            console.log('✅ Disconnected!');
            break;

          case 'quit':
          case 'exit':
            console.log('👋 Goodbye!');
            rl.close();
            return;

          default:
            console.log('❓ Unknown command. Available: connect, auth, subscribe, unsubscribe, status, disconnect, quit');
        }
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }

      askCommand();
    });
  };

  askCommand();
}

// ===== MAIN EXECUTION =====

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--interactive') || args.includes('-i')) {
    await runInteractiveDemo();
  } else {
    await runWebSocketDemo();
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}
