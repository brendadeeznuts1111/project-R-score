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
  console.info('🎯 BETTING WORKFLOW API - WEBSOCKET REAL-TIME DEMO');
  console.info('='.repeat(60));
  console.info();

  console.info('📋 This demo will test:');
  console.info('   • WebSocket connection and authentication');
  console.info('   • Real-time workflow creation notifications');
  console.info('   • Live approval status updates');
  console.info('   • Bulk operation broadcasting');
  console.info('   • Connection recovery and error handling');
  console.info();

  // Create clients
  const wsClient = new BettingWorkflowWebSocketClient();
  const tester = new WebSocketBettingWorkflowTester();

  try {
    console.info('🔌 STEP 1: Testing WebSocket Connection');
    console.info('-'.repeat(40));

    // Test basic connection
    await wsClient.connect();
    console.info('✅ WebSocket connected successfully');
    console.info();

    console.info('🎭 STEP 2: Setting up Event Listeners');
    console.info('-'.repeat(40));

    // Set up comprehensive event listeners
    wsClient.on('authenticated', (data) => {
      console.info(`🔑 WebSocket authenticated for user: ${data.userId}`);
    });

    wsClient.on('workflow.created', (workflow) => {
      console.info(`🆕 WORKFLOW CREATED: ${workflow.id}`);
      console.info(`   Status: ${workflow.status} | Step: ${workflow.currentStep}`);
      console.info(`   Time: ${workflow.updatedAt}`);
      console.info();
    });

    wsClient.on('workflow.updated', (workflow) => {
      console.info(`📝 WORKFLOW UPDATED: ${workflow.id}`);
      console.info(`   Status: ${workflow.status} | Step: ${workflow.currentStep}`);
      console.info(`   Time: ${workflow.updatedAt}`);
      console.info();
    });

    wsClient.on('workflow.approved', (approval) => {
      console.info(`✅ WORKFLOW APPROVED: ${approval.workflowId}`);
      console.info(`   Step: ${approval.stepId} | Approver: ${approval.approver}`);
      if (approval.comments) {
        console.info(`   Comments: "${approval.comments}"`);
      }
      console.info(`   Time: ${approval.approvedAt}`);
      console.info();
    });

    wsClient.on('subscribed', (data) => {
      console.info(`📡 Subscribed to workflow: ${data.workflowId}`);
    });

    wsClient.on('error', (error) => {
      console.error(`🚨 WebSocket error:`, error);
    });

    console.info('✅ Event listeners configured');
    console.info();

    console.info('🎯 STEP 3: Running Comprehensive Tests');
    console.info('-'.repeat(40));

    // Run the full test suite
    const testResults = await tester.runAllTests();

    console.info();
    console.info('📊 STEP 4: Demo Summary');
    console.info('-'.repeat(40));

    console.info(`⏱️  Demo Duration: ${(testResults.duration / 1000).toFixed(2)} seconds`);
    console.info(`🧪 Tests Run: ${testResults.total}`);
    console.info(`✅ Tests Passed: ${testResults.passed}`);
    console.info(`❌ Tests Failed: ${testResults.failed}`);

    const successRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : '0';
    console.info(`📈 Success Rate: ${successRate}%`);

    if (testResults.errors.length > 0) {
      console.info();
      console.info('🚨 Issues Found:');
      testResults.errors.forEach((error, index) => {
        console.info(`   ${index + 1}. ${error}`);
      });
    }

    console.info();
    console.info('🎉 STEP 5: Demo Complete');
    console.info('-'.repeat(40));

    if (testResults.failed === 0) {
      console.info('🎊 ALL TESTS PASSED!');
      console.info('✅ WebSocket real-time integration is working perfectly');
      console.info();
      console.info('🚀 Your betting platform now supports:');
      console.info('   • Real-time workflow notifications');
      console.info('   • Live approval status updates');
      console.info('   • Instant bulk operation feedback');
      console.info('   • Automatic connection recovery');
      console.info('   • Comprehensive error handling');
    } else {
      console.info('⚠️  SOME TESTS FAILED');
      console.info('🔧 Check the issues above and ensure:');
      console.info('   • API server is running on localhost:3000');
      console.info('   • Database and Redis are accessible');
      console.info('   • JWT tokens are valid (if using authentication)');
      console.info('   • Network connectivity is stable');
    }

    console.info();
    console.info('='.repeat(60));
    console.info('🎯 DEMO FINISHED - WebSocket Real-Time Integration Ready!');
    console.info('='.repeat(60));

  } catch (error) {
    console.error('❌ Demo failed with error:', error);
    console.info();
    console.info('🔧 Troubleshooting:');
    console.info('   1. Ensure API server is running: npm run dev');
    console.info('   2. Check database connectivity');
    console.info('   3. Verify Redis is running');
    console.info('   4. Check network firewall settings');
    console.info('   5. Review server logs for detailed errors');
  } finally {
    // Cleanup
    wsClient.disconnect();
  }
}

// ===== INTERACTIVE DEMO MODE =====

async function runInteractiveDemo() {
  console.info('🎮 INTERACTIVE WEBSOCKET DEMO MODE');
  console.info('='.repeat(50));
  console.info();
  console.info('This mode allows you to manually test WebSocket features:');
  console.info('• Connect/disconnect from WebSocket');
  console.info('• Subscribe to workflow updates');
  console.info('• Create workflows via API to see real-time updates');
  console.info('• Test authentication and error scenarios');
  console.info();

  const wsClient = new BettingWorkflowWebSocketClient();

  // Set up event listeners
  wsClient.on('authenticated', (data) => {
    console.info(`🔑 ✅ Authenticated as: ${data.userId}`);
  });

  wsClient.on('authentication_error', (error) => {
    console.info(`🔑 ❌ Authentication failed: ${error.message}`);
  });

  wsClient.on('workflow.created', (workflow) => {
    console.info(`🆕 📡 WORKFLOW CREATED: ${workflow.id} (${workflow.status})`);
  });

  wsClient.on('workflow.updated', (workflow) => {
    console.info(`📝 📡 WORKFLOW UPDATED: ${workflow.id} (${workflow.status})`);
  });

  wsClient.on('workflow.approved', (approval) => {
    console.info(`✅ 📡 WORKFLOW APPROVED: ${approval.workflowId} by ${approval.approver}`);
  });

  wsClient.on('subscribed', (data) => {
    console.info(`📡 ✅ Subscribed to: ${data.workflowId}`);
  });

  wsClient.on('unsubscribed', (data) => {
    console.info(`🚫 ✅ Unsubscribed from: ${data.workflowId}`);
  });

  console.info('Available commands:');
  console.info('  connect          - Connect to WebSocket server');
  console.info('  auth <token>     - Authenticate with JWT token');
  console.info('  subscribe <id>   - Subscribe to workflow updates');
  console.info('  unsubscribe <id> - Unsubscribe from workflow updates');
  console.info('  status          - Show connection status');
  console.info('  disconnect      - Disconnect from WebSocket');
  console.info('  quit            - Exit demo');
  console.info();

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
            console.info('🔌 Connecting...');
            await wsClient.connect();
            console.info('✅ Connected!');
            break;

          case 'auth':
            if (!param) {
              console.info('❌ Please provide a JWT token: auth <token>');
            } else {
              wsClient.authenticate(param);
              console.info('🔑 Authenticating...');
            }
            break;

          case 'subscribe':
            if (!param) {
              console.info('❌ Please provide a workflow ID: subscribe <workflow-id>');
            } else {
              wsClient.subscribeToWorkflow(param);
            }
            break;

          case 'unsubscribe':
            if (!param) {
              console.info('❌ Please provide a workflow ID: unsubscribe <workflow-id>');
            } else {
              wsClient.unsubscribeFromWorkflow(param);
            }
            break;

          case 'status':
            console.info(`🔌 Connection Status: ${wsClient.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
            if (wsClient.connectionId) {
              console.info(`🆔 Connection ID: ${wsClient.connectionId}`);
            }
            break;

          case 'disconnect':
            console.info('🔌 Disconnecting...');
            wsClient.disconnect();
            console.info('✅ Disconnected!');
            break;

          case 'quit':
          case 'exit':
            console.info('👋 Goodbye!');
            rl.close();
            return;

          default:
            console.info('❓ Unknown command. Available: connect, auth, subscribe, unsubscribe, status, disconnect, quit');
        }
      } catch (error) {
        console.info(`❌ Error: ${error}`);
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
