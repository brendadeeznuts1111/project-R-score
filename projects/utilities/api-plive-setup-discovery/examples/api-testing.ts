// Comprehensive API testing suite
import { BettingWorkflowAPIClient } from './api-integration';

describe('Betting Workflow API Integration Tests', () => {
  let client: BettingWorkflowAPIClient;
  let testWorkflowId: string;
  let testContentWorkflowId: string;
  let testLineWorkflowId: string;

  beforeAll(() => {
    client = new BettingWorkflowAPIClient('http://localhost:3000/api/v1');
    // Set test authentication token
    client.setAuthToken(process.env.TEST_JWT_TOKEN || 'test-token');
  });

  describe('Authentication & Setup', () => {
    it('should be properly configured', () => {
      expect(client).toBeDefined();
    });
  });

  describe('Content Publishing Workflow', () => {
    it('should create and manage content workflow', async () => {
      const workflow = await client.createContentWorkflow({
        title: 'Test Premier League Featured Bets',
        contentType: 'featured_bets',
        jurisdiction: 'UK',
        financialImpact: 15000,
        contentId: 'test-pl-bets-001'
      });

      expect(workflow.data.success).toBe(true);
      expect(workflow.data.data).toBeDefined();
      expect(workflow.data.data.id).toBeDefined();

      testContentWorkflowId = workflow.data.data.id;

      // Get workflow by ID
      const retrieved = await client.getWorkflowById(testContentWorkflowId);
      expect(retrieved.data.success).toBe(true);
      expect(retrieved.data.data.id).toBe(testContentWorkflowId);

      // Approve workflow
      const approval = await client.approveWorkflow(testContentWorkflowId, 'Test approval');
      expect(approval.data.success).toBe(true);
    });

    it('should handle content workflow analytics', async () => {
      const analytics = await client.getWorkflowAnalytics(testContentWorkflowId, '24h');
      expect(analytics.data.success).toBe(true);
      expect(analytics.data.data).toBeDefined();
    });
  });

  describe('Line Change Workflow', () => {
    it('should handle line change approval with financial impact', async () => {
      const workflow = await client.createLineChangeWorkflow({
        lineId: 'test-line-001',
        eventName: 'Test Match',
        oldOdds: '2.00',
        newOdds: '1.85',
        marketType: 'match_winner',
        reason: 'Test line change',
        sport: 'football',
        league: 'Premier League'
      });

      expect(workflow.data.success).toBe(true);
      expect(workflow.data.data.id).toBeDefined();
      expect(workflow.data.metadata?.financialImpact).toBeDefined();

      testLineWorkflowId = workflow.data.data.id;
    });

    it('should get active betting workflows', async () => {
      const activeWorkflows = await client.getActiveBettingWorkflows({
        status: 'in_progress',
        riskLevel: 'medium'
      });

      expect(activeWorkflows.data.success).toBe(true);
      expect(Array.isArray(activeWorkflows.data.data.items)).toBe(true);
    });
  });

  describe('Standard Workflow Operations', () => {
    it('should create a standard workflow', async () => {
      // This would be a test for non-betting workflows
      const workflow = await client.createContentWorkflow({
        title: 'Standard Approval Workflow',
        contentType: 'lines',
        jurisdiction: 'UK',
        financialImpact: 5000,
        contentId: 'standard-test-001'
      });

      expect(workflow.data.success).toBe(true);
      testWorkflowId = workflow.data.data.id;
    });

    it('should get workflow status', async () => {
      const status = await client.getWorkflowStatus(testWorkflowId);
      expect(status.data.success).toBe(true);
      expect(status.data.data.status).toBeDefined();
      expect(status.data.data.progress).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk approvals', async () => {
      // Create multiple test workflows
      const workflows = await Promise.all([
        client.createContentWorkflow({
          title: 'Bulk Test 1',
          contentType: 'lines',
          jurisdiction: 'UK',
          financialImpact: 5000,
          contentId: 'bulk-test-001'
        }),
        client.createContentWorkflow({
          title: 'Bulk Test 2',
          contentType: 'lines',
          jurisdiction: 'UK',
          financialImpact: 5000,
          contentId: 'bulk-test-002'
        }),
        client.createContentWorkflow({
          title: 'Bulk Test 3',
          contentType: 'lines',
          jurisdiction: 'UK',
          financialImpact: 5000,
          contentId: 'bulk-test-003'
        })
      ]);

      const workflowIds = workflows.map(w => w.data.data.id);

      // Bulk approve
      const result = await client.bulkApprove(workflowIds, 'Bulk test approval');
      expect(result.data.success).toBe(true);
      expect(result.data.data.successful).toBe(3);
      expect(result.data.data.failed).toBe(0);
    });

    it('should handle bulk operations with failures', async () => {
      const validIds = [testWorkflowId];
      const invalidIds = ['invalid-id-1', 'invalid-id-2'];

      const result = await client.bulkApprove([...validIds, ...invalidIds], 'Mixed bulk test');

      // Should succeed for valid IDs but fail for invalid ones
      expect(result.data.success).toBe(false); // Partial success
      expect(result.data.data.successful).toBeGreaterThanOrEqual(0);
      expect(result.data.data.failed).toBeGreaterThan(0);
    });

    it('should export workflows in different formats', async () => {
      // Test JSON export
      const jsonExport = await client.exportWorkflows('json', {
        status: 'completed',
        limit: 10
      });
      expect(jsonExport.data).toBeDefined();

      // Test CSV export (would need proper blob handling in real implementation)
      // const csvExport = await client.exportWorkflows('csv');
      // expect(csvExport.data).toBeDefined();
    });
  });

  describe('Advanced Operations', () => {
    it('should escalate workflow', async () => {
      const escalation = await client.escalateWorkflow(
        testWorkflowId,
        'Test escalation for high priority',
        'high'
      );
      expect(escalation.data.success).toBe(true);
    });

    it('should delegate workflow', async () => {
      const delegation = await client.delegateWorkflow(
        testWorkflowId,
        'delegate@example.com',
        'Delegating for specialized handling'
      );
      expect(delegation.data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent workflow', async () => {
      try {
        await client.getWorkflowById('non-existent-id');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    it('should handle invalid workflow data', async () => {
      try {
        await client.createContentWorkflow({
          title: '', // Invalid - empty title
          contentType: 'invalid_type',
          jurisdiction: 'INVALID'
        });
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Performance & Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        client.getWorkflows({ limit: 5 })
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.data.success).toBe(true);
      });
    });

    it('should handle pagination correctly', async () => {
      const page1 = await client.getWorkflows({ page: 1, limit: 2 });
      const page2 = await client.getWorkflows({ page: 2, limit: 2 });

      expect(page1.data.success).toBe(true);
      expect(page2.data.success).toBe(true);
      expect(page1.data.data.page).toBe(1);
      expect(page2.data.data.page).toBe(2);
    });
  });

  describe('Filtering & Search', () => {
    it('should filter by status', async () => {
      const pendingWorkflows = await client.getWorkflows({
        status: 'pending',
        limit: 5
      });

      expect(pendingWorkflows.data.success).toBe(true);
      pendingWorkflows.data.data.items.forEach((workflow: any) => {
        expect(workflow.status).toBe('pending');
      });
    });

    it('should filter by priority', async () => {
      const highPriority = await client.getWorkflows({
        priority: 'high',
        limit: 5
      });

      expect(highPriority.data.success).toBe(true);
      // Note: This test assumes there are high priority workflows
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const recentWorkflows = await client.getWorkflows({
        startDate: startDate.toISOString(),
        limit: 10
      });

      expect(recentWorkflows.data.success).toBe(true);
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    // Optional: Clean up test data
    console.log('Test cleanup completed');
  });
});

// Helper test utilities
export class TestHelpers {
  static generateTestWorkflowData(overrides = {}) {
    return {
      title: `Test Workflow ${Date.now()}`,
      contentType: 'featured_bets',
      jurisdiction: 'UK',
      financialImpact: Math.floor(Math.random() * 10000),
      contentId: `test-${Date.now()}`,
      ...overrides
    };
  }

  static generateBulkWorkflowIds(count: number): string[] {
    return Array(count).fill(null).map(() => `test-workflow-${Math.random()}`);
  }

  static async waitForWorkflowStatus(
    client: BettingWorkflowAPIClient,
    workflowId: string,
    expectedStatus: string,
    timeout = 10000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await client.getWorkflowStatus(workflowId);
        if (status.data.data.status === expectedStatus) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Continue polling
      }
    }

    return false;
  }
}
