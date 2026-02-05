import axios, { AxiosInstance } from 'axios';

class BettingWorkflowAPIClient {
  private baseURL: string;
  private authToken: string | null = null;
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3000/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // ===== BETTING PLATFORM WORKFLOWS =====

  // Content Publishing Workflow
  async createContentWorkflow(contentData: any) {
    return this.client.post('/workflows', {
      workflowType: 'content_publishing',
      priority: 'high',
      data: {
        title: contentData.title,
        contentType: contentData.contentType, // 'lines', 'featured_bets', 'promotions'
        jurisdiction: contentData.jurisdiction,
        financialImpact: contentData.financialImpact || 0,
        contentId: contentData.contentId,
        metadata: contentData.metadata
      }
    });
  }

  // Line Change Approval Workflow
  async createLineChangeWorkflow(lineData: any) {
    return this.client.post('/betting/lines/change', {
      lineId: lineData.lineId,
      eventName: lineData.eventName,
      oldOdds: lineData.oldOdds,
      newOdds: lineData.newOdds,
      marketType: lineData.marketType,
      reason: lineData.reason,
      sport: lineData.sport,
      league: lineData.league
    });
  }

  // Odds Update Workflow
  async createOddsUpdateWorkflow(oddsData: any) {
    return this.client.post('/workflows', {
      workflowType: 'odds_update_approval',
      priority: 'critical',
      data: {
        title: `Odds Update: ${oddsData.eventName}`,
        eventId: oddsData.eventId,
        eventName: oddsData.eventName,
        oldOdds: oddsData.oldOdds,
        newOdds: oddsData.newOdds,
        marketType: oddsData.marketType,
        financialImpact: oddsData.financialImpact,
        reason: oddsData.reason,
        timestamp: oddsData.timestamp
      }
    });
  }

  // ===== WORKFLOW MANAGEMENT =====

  async getWorkflows(filters = {}) {
    const queryString = new URLSearchParams(filters as any).toString();
    return this.client.get(`/workflows?${queryString}`);
  }

  async getWorkflowById(id: string) {
    return this.client.get(`/workflows/${id}`);
  }

  async approveWorkflow(id: string, comments?: string) {
    return this.client.post(`/workflows/${id}/approve`, {
      comments: comments || 'Approved via API'
    });
  }

  async rejectWorkflow(id: string, comments: string) {
    return this.client.post(`/workflows/${id}/reject`, {
      comments: comments || 'Rejected via API'
    });
  }

  async cancelWorkflow(id: string, reason: string) {
    return this.client.post(`/workflows/${id}/cancel`, {
      reason
    });
  }

  // ===== BULK OPERATIONS =====

  async bulkApprove(workflowIds: string[], comments?: string) {
    return this.client.post('/workflows/bulk/approve', {
      workflowIds,
      comments: comments || 'Bulk approved via API'
    });
  }

  async exportWorkflows(format: 'json' | 'csv' | 'xlsx' = 'json', filters = {}) {
    const response = await this.client.post('/workflows/bulk/export', {
      format,
      filters
    }, {
      responseType: 'blob' // For file downloads
    });

    // Handle file download
    if (format !== 'json') {
      console.log('Export completed, file ready for download');
      return response;
    }

    return response;
  }

  // ===== MONITORING & ANALYTICS =====

  async getWorkflowStatus(id: string) {
    return this.client.get(`/workflows/${id}/status`);
  }

  async getWorkflowAnalytics(id: string, period = '7d') {
    return this.client.get(`/workflows/${id}/analytics?period=${period}`);
  }

  async getActiveBettingWorkflows(filters = {}) {
    const queryString = new URLSearchParams(filters as any).toString();
    return this.client.get(`/betting/workflows/active?${queryString}`);
  }

  // ===== ADVANCED OPERATIONS =====

  async escalateWorkflow(id: string, reason: string, priority: 'high' | 'critical') {
    return this.client.post(`/workflows/${id}/escalate`, {
      reason,
      priority,
      escalateTo: ['management', 'trading_team'],
      notificationChannels: ['email', 'slack']
    });
  }

  async delegateWorkflow(id: string, delegateTo: string, reason: string) {
    return this.client.post(`/workflows/${id}/delegate`, {
      delegateTo,
      reason,
      permissions: ['approve', 'reject'],
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  }
}

// ===== USAGE EXAMPLES =====

// Example 1: Complete content publishing workflow
async function contentPublishingExample(client: BettingWorkflowAPIClient) {
  try {
    // Step 1: Create content workflow
    const workflow = await client.createContentWorkflow({
      title: 'New Premier League Featured Bets',
      contentType: 'featured_bets',
      jurisdiction: 'UK',
      financialImpact: 25000,
      contentId: 'pl-featured-bets-matchday-1',
      metadata: {
        competition: 'Premier League',
        matchday: 1,
        teams: ['Manchester United', 'Liverpool', 'Chelsea']
      }
    });

    console.log('✅ Content workflow created:', workflow.data.data.id);

    // Step 2: Monitor status
    const status = await client.getWorkflowStatus(workflow.data.data.id);
    console.log('📊 Current status:', status.data.data.status);

    // Step 3: Get all active workflows
    const activeWorkflows = await client.getActiveBettingWorkflows({
      contentType: 'featured_bets',
      status: 'in_progress'
    });
    console.log(`📋 Found ${activeWorkflows.data.data.total} active content workflows`);

    return workflow.data.data;

  } catch (error: any) {
    console.error('❌ Content workflow failed:', error.message);
    throw error;
  }
}

// Example 2: Line change approval workflow
async function lineChangeExample(client: BettingWorkflowAPIClient) {
  try {
    // Create line change workflow
    const workflow = await client.createLineChangeWorkflow({
      lineId: 'line-manutd-liv-12345',
      eventName: 'Manchester United vs Liverpool',
      oldOdds: '2.50',
      newOdds: '2.20',
      marketType: 'match_winner',
      reason: 'Injury to key player',
      sport: 'football',
      league: 'Premier League'
    });

    console.log('✅ Line change workflow created:', workflow.data.data.id);
    console.log('💰 Financial impact:', workflow.data.metadata?.financialImpact);
    console.log('⚠️ Risk level:', workflow.data.metadata?.riskLevel);

    return workflow.data.data;

  } catch (error: any) {
    console.error('❌ Line change workflow failed:', error.message);
    throw error;
  }
}

// Example 3: Bulk operations
async function bulkOperationsExample(client: BettingWorkflowAPIClient) {
  try {
    // Get workflows that need approval
    const pendingWorkflows = await client.getWorkflows({
      status: 'in_progress',
      limit: 10
    });

    const workflowIds = pendingWorkflows.data.data.items.map((w: any) => w.id);

    if (workflowIds.length > 0) {
      // Bulk approve
      const result = await client.bulkApprove(workflowIds, 'Bulk approved for weekend matches');
      console.log(`✅ Bulk approval completed: ${result.data.data.successful} successful, ${result.data.data.failed} failed`);

      // Export workflows for reporting
      await client.exportWorkflows('csv', {
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      console.log('📊 Workflows exported successfully');
    }

  } catch (error: any) {
    console.error('❌ Bulk operations failed:', error.message);
    throw error;
  }
}

// Example 4: Escalation and delegation
async function advancedOperationsExample(client: BettingWorkflowAPIClient, workflowId: string) {
  try {
    // Escalate high-priority workflow
    await client.escalateWorkflow(
      workflowId,
      'Urgent line change requires immediate attention',
      'critical'
    );
    console.log('🚨 Workflow escalated successfully');

    // Delegate workflow to another user
    await client.delegateWorkflow(
      workflowId,
      'senior-trader@example.com',
      'Delegating for specialized review'
    );
    console.log('👤 Workflow delegated successfully');

  } catch (error: any) {
    console.error('❌ Advanced operations failed:', error.message);
    throw error;
  }
}

// ===== MAIN EXECUTION =====

async function runAllExamples() {
  console.log('🚀 Starting API examples...\n');

  // Initialize client
  const client = new BettingWorkflowAPIClient();
  // Note: Set auth token before running examples
  // client.setAuthToken('your-jwt-token-here');

  try {
    // Run content publishing example
    const contentWorkflow = await contentPublishingExample(client);
    console.log('\n' + '='.repeat(50) + '\n');

    // Run line change example
    const lineWorkflow = await lineChangeExample(client);
    console.log('\n' + '='.repeat(50) + '\n');

    // Run bulk operations example
    await bulkOperationsExample(client);
    console.log('\n' + '='.repeat(50) + '\n');

    // Run advanced operations on one of the created workflows
    if (contentWorkflow?.id) {
      await advancedOperationsExample(client, contentWorkflow.id);
    }

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Examples failed:', error);
    process.exit(1);
  }
}

// Export for use in other files
export { BettingWorkflowAPIClient };

// Uncomment to run examples
// runAllExamples();
