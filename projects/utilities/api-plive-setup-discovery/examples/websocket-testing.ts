import { BettingWorkflowWebSocketClient } from './websocket-client';
import { BettingWorkflowAPIClient } from './api-integration';

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  duration: number;
  errors: string[];
}

class WebSocketBettingWorkflowTester {
  private apiClient: BettingWorkflowAPIClient;
  private wsClient: BettingWorkflowWebSocketClient;
  private results: TestResults;
  private createdWorkflows: string[] = [];

  constructor(
    private apiBaseUrl: string = 'http://localhost:3000/api/v1',
    private wsUrl: string = 'http://localhost:3000'
  ) {
    this.apiClient = new BettingWorkflowAPIClient(apiBaseUrl);
    this.wsClient = new BettingWorkflowWebSocketClient(wsUrl);
    this.results = { passed: 0, failed: 0, total: 0, duration: 0, errors: [] };
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const prefix = {
      info: 'ℹ️ ',
      success: '✅ ',
      error: '❌ ',
      warning: '⚠️ '
    }[type];

    console.log(`${prefix}${message}`);
  }

  private recordResult(passed: boolean, error?: string): void {
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
      if (error) {
        this.results.errors.push(error);
      }
    }
  }

  async runAllTests(): Promise<TestResults> {
    const startTime = Date.now();

    try {
      this.log('🚀 Starting WebSocket Betting Workflow Integration Tests\n');

      // Test 1: Basic WebSocket Connection
      await this.testBasicConnection();

      // Test 2: WebSocket Authentication
      await this.testAuthentication();

      // Test 3: Workflow Subscription
      await this.testWorkflowSubscription();

      // Test 4: Real-time Workflow Creation
      await this.testWorkflowCreation();

      // Test 5: Real-time Workflow Approval
      await this.testWorkflowApproval();

      // Test 6: Bulk Operations Real-time Updates
      await this.testBulkOperations();

      // Test 7: Connection Recovery
      await this.testConnectionRecovery();

      // Test 8: Performance Test
      await this.testPerformance();

      // Cleanup
      await this.cleanup();

    } catch (error) {
      this.log(`Test suite failed: ${error}`, 'error');
      this.recordResult(false, `Test suite error: ${error}`);
    } finally {
      this.results.duration = Date.now() - startTime;
      this.printResults();
    }

    return this.results;
  }

  private async testBasicConnection(): Promise<void> {
    this.log('Testing basic WebSocket connection...');

    try {
      await this.wsClient.connect();
      this.recordResult(true);
      this.log('Basic connection test passed', 'success');
    } catch (error) {
      this.recordResult(false, `Basic connection failed: ${error}`);
      this.log(`Basic connection test failed: ${error}`, 'error');
      throw error; // Stop further tests if basic connection fails
    }
  }

  private async testAuthentication(): Promise<void> {
    this.log('Testing WebSocket authentication...');

    return new Promise((resolve) => {
      let authenticated = false;
      let authError = false;

      this.wsClient.on('authenticated', () => {
        authenticated = true;
        this.recordResult(true);
        this.log('Authentication test passed', 'success');
        resolve();
      });

      this.wsClient.on('authentication_error', (error) => {
        authError = true;
        this.recordResult(false, `Authentication error: ${error.message}`);
        this.log(`Authentication test failed: ${error.message}`, 'error');
        resolve();
      });

      // Wait a bit for events, then timeout
      setTimeout(() => {
        if (!authenticated && !authError) {
          this.recordResult(false, 'Authentication timeout');
          this.log('Authentication test failed: timeout', 'error');
          resolve();
        }
      }, 5000);
    });
  }

  private async testWorkflowSubscription(): Promise<void> {
    this.log('Testing workflow subscription...');

    return new Promise((resolve) => {
      const testWorkflowId = 'test-workflow-subscription';
      let subscribed = false;

      this.wsClient.on('subscribed', (data) => {
        if (data.workflowId === testWorkflowId) {
          subscribed = true;
          this.recordResult(true);
          this.log('Workflow subscription test passed', 'success');
          resolve();
        }
      });

      this.wsClient.subscribeToWorkflow(testWorkflowId);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!subscribed) {
          this.recordResult(false, 'Subscription timeout');
          this.log('Workflow subscription test failed: timeout', 'error');
          resolve();
        }
      }, 5000);
    });
  }

  private async testWorkflowCreation(): Promise<void> {
    this.log('Testing real-time workflow creation...');

    return new Promise(async (resolve) => {
      let workflowCreated = false;

      this.wsClient.on('workflow.created', (workflow) => {
        workflowCreated = true;
        this.recordResult(true);
        this.log(`Workflow creation real-time update received: ${workflow.id}`, 'success');
        this.createdWorkflows.push(workflow.id);
        resolve();
      });

      try {
        // Create a workflow via API
        const workflow = await this.apiClient.createContentWorkflow({
          title: 'WebSocket Test Content',
          contentType: 'featured_bets',
          jurisdiction: 'UK',
          financialImpact: 10000,
          contentId: 'ws-test-content'
        });

        this.log(`Created workflow via API: ${workflow.data.id}`);

        // Wait for WebSocket event or timeout
        setTimeout(() => {
          if (!workflowCreated) {
            this.recordResult(false, 'Workflow creation event not received');
            this.log('Workflow creation test failed: event not received', 'error');
            resolve();
          }
        }, 10000);

      } catch (error) {
        this.recordResult(false, `API workflow creation failed: ${error}`);
        this.log(`Workflow creation test failed: ${error}`, 'error');
        resolve();
      }
    });
  }

  private async testWorkflowApproval(): Promise<void> {
    if (this.createdWorkflows.length === 0) {
      this.log('Skipping approval test - no workflows created', 'warning');
      return;
    }

    this.log('Testing real-time workflow approval...');

    return new Promise(async (resolve) => {
      const workflowId = this.createdWorkflows[0];
      let approvalReceived = false;

      this.wsClient.on('workflow.approved', (approval) => {
        if (approval.workflowId === workflowId) {
          approvalReceived = true;
          this.recordResult(true);
          this.log(`Workflow approval real-time update received: ${approval.workflowId}`, 'success');
          resolve();
        }
      });

      try {
        // Approve the workflow via API
        await this.apiClient.approveWorkflow(workflowId, 'WebSocket test approval');
        this.log(`Approved workflow via API: ${workflowId}`);

        // Wait for WebSocket event or timeout
        setTimeout(() => {
          if (!approvalReceived) {
            this.recordResult(false, 'Workflow approval event not received');
            this.log('Workflow approval test failed: event not received', 'error');
            resolve();
          }
        }, 10000);

      } catch (error) {
        this.recordResult(false, `API workflow approval failed: ${error}`);
        this.log(`Workflow approval test failed: ${error}`, 'error');
        resolve();
      }
    });
  }

  private async testBulkOperations(): Promise<void> {
    this.log('Testing bulk operations real-time updates...');

    if (this.createdWorkflows.length < 2) {
      this.log('Skipping bulk test - need at least 2 workflows', 'warning');
      return;
    }

    return new Promise(async (resolve) => {
      const workflowIds = this.createdWorkflows.slice(0, 2);
      let approvalCount = 0;

      this.wsClient.on('workflow.approved', (approval) => {
        if (workflowIds.includes(approval.workflowId)) {
          approvalCount++;
          if (approvalCount === workflowIds.length) {
            this.recordResult(true);
            this.log(`Bulk approval real-time updates received (${approvalCount}/${workflowIds.length})`, 'success');
            resolve();
          }
        }
      });

      try {
        // Bulk approve workflows via API
        await this.apiClient.bulkApprove(workflowIds, 'Bulk WebSocket test approval');
        this.log(`Bulk approved ${workflowIds.length} workflows via API`);

        // Wait for WebSocket events or timeout
        setTimeout(() => {
          if (approvalCount < workflowIds.length) {
            this.recordResult(false, `Only ${approvalCount}/${workflowIds.length} approval events received`);
            this.log(`Bulk approval test partial failure: ${approvalCount}/${workflowIds.length} events`, 'error');
            resolve();
          }
        }, 15000);

      } catch (error) {
        this.recordResult(false, `API bulk approval failed: ${error}`);
        this.log(`Bulk approval test failed: ${error}`, 'error');
        resolve();
      }
    });
  }

  private async testConnectionRecovery(): Promise<void> {
    this.log('Testing connection recovery...');

    // This test simulates connection loss and recovery
    // In a real implementation, you might temporarily disconnect the server

    // For now, just test that reconnection logic works
    const initialConnectionId = this.wsClient.connectionId;

    // Force disconnect and reconnect
    this.wsClient.disconnect();

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      await this.wsClient.connect();
      const newConnectionId = this.wsClient.connectionId;

      if (newConnectionId && newConnectionId !== initialConnectionId) {
        this.recordResult(true);
        this.log('Connection recovery test passed', 'success');
      } else {
        this.recordResult(false, 'Connection recovery failed - same or no connection ID');
        this.log('Connection recovery test failed', 'error');
      }
    } catch (error) {
      this.recordResult(false, `Connection recovery failed: ${error}`);
      this.log(`Connection recovery test failed: ${error}`, 'error');
    }
  }

  private async testPerformance(): Promise<void> {
    this.log('Testing WebSocket performance...');

    const messageCount = 50;
    let receivedCount = 0;
    const startTime = Date.now();

    // Subscribe to a test workflow
    const testWorkflowId = 'performance-test-workflow';
    this.wsClient.subscribeToWorkflow(testWorkflowId);

    // In a real test, you'd send messages from another client
    // For now, we'll just measure connection stability

    await new Promise(resolve => {
      this.wsClient.on('workflow.updated', () => {
        receivedCount++;
        if (receivedCount >= messageCount) {
          const duration = Date.now() - startTime;
          const avgLatency = duration / messageCount;
          this.log(`Performance test: ${messageCount} messages in ${duration}ms (avg: ${avgLatency.toFixed(2)}ms)`, 'success');
          this.recordResult(true);
          resolve(void 0);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (receivedCount < messageCount) {
          this.recordResult(false, `Performance test timeout: ${receivedCount}/${messageCount} messages`);
          this.log(`Performance test timeout: ${receivedCount}/${messageCount} messages`, 'warning');
          resolve(void 0);
        }
      }, 30000);
    });
  }

  private async cleanup(): Promise<void> {
    this.log('Cleaning up test resources...');

    try {
      this.wsClient.disconnect();

      // Clean up created workflows (optional - comment out if you want to keep test data)
      /*
      for (const workflowId of this.createdWorkflows) {
        try {
          await this.apiClient.cancelWorkflow(workflowId, 'Test cleanup');
        } catch (error) {
          this.log(`Failed to cleanup workflow ${workflowId}: ${error}`, 'warning');
        }
      }
      */

      this.log('Cleanup completed', 'success');
    } catch (error) {
      this.log(`Cleanup failed: ${error}`, 'warning');
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 WEB SOCKET BETTING WORKFLOW TEST RESULTS');
    console.log('='.repeat(60));

    console.log(`📊 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${(this.results.duration / 1000).toFixed(2)}s`);

    const successRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) : '0';
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('='.repeat(60));

    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! WebSocket integration is working correctly.');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Check the errors above and fix issues before production.');
    }

    console.log('='.repeat(60) + '\n');
  }
}

// ===== USAGE =====

async function runWebSocketTests() {
  const tester = new WebSocketBettingWorkflowTester();

  // Optional: Set JWT token for authenticated tests
  // tester.apiClient.setAuthToken('your-jwt-token');

  const results = await tester.runAllTests();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runWebSocketTests().catch(console.error);
}

export { WebSocketBettingWorkflowTester };
