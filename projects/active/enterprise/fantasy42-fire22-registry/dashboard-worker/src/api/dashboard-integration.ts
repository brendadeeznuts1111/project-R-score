/**
 * Dashboard Integration API Routes
 * Provides unified endpoints for all dashboard data
 * Integrates with Fantasy42 systems and provides real-time data
 */

import { UnifiedDashboardIntegration } from '../../core/integrations/unified-dashboard-integration';
import { Fantasy42AgentClient } from './fantasy42-agent-client';

export class DashboardIntegrationAPI {
  private unifiedIntegration: UnifiedDashboardIntegration;
  private fantasyClient: Fantasy42AgentClient;

  constructor() {
    this.fantasyClient = new Fantasy42AgentClient(
      process.env.FANTASY42_USERNAME || 'default',
      process.env.FANTASY42_PASSWORD || 'default'
    );
    this.unifiedIntegration = new UnifiedDashboardIntegration({
      ipTracker: {
        enabled: true,
        realTimeUpdates: true,
        riskThreshold: 70,
      },
      transactionHistory: {
        enabled: true,
        realTimeUpdates: true,
        maxRecords: 1000,
      },
      collections: {
        enabled: true,
        realTimeUpdates: true,
        autoSettlement: false,
      },
      sportsbookLines: {
        enabled: true,
        realTimeUpdates: true,
        autoRefresh: true,
      },
      analysis: {
        enabled: true,
        realTimeUpdates: true,
        predictiveEnabled: true,
      },
    });
  }

  // IP Tracker API
  async getIPTrackerData(req: Request): Promise<Response> {
    try {
      const data = await this.unifiedIntegration.getDashboardData('ipTracker');

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('IP Tracker API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch IP tracker data',
        }),
        { status: 500 }
      );
    }
  }

  // Transaction History API
  async getTransactionHistoryData(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const data = await this.unifiedIntegration.getDashboardData('transactionHistory');

      // Apply pagination
      const paginatedTransactions = data.transactions.slice(offset, offset + limit);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactions: paginatedTransactions,
            summary: data.summary,
            pagination: {
              total: data.transactions.length,
              limit,
              offset,
              hasMore: offset + limit < data.transactions.length,
            },
          },
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Transaction History API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch transaction history data',
        }),
        { status: 500 }
      );
    }
  }

  // Collections API
  async getCollectionsData(req: Request): Promise<Response> {
    try {
      const data = await this.unifiedIntegration.getDashboardData('collections');

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Collections API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch collections data',
        }),
        { status: 500 }
      );
    }
  }

  // Sportsbook Lines API
  async getSportsbookLinesData(req: Request): Promise<Response> {
    try {
      const data = await this.unifiedIntegration.getDashboardData('sportsbookLines');

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Sportsbook Lines API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch sportsbook lines data',
        }),
        { status: 500 }
      );
    }
  }

  // Analysis API
  async getAnalysisData(req: Request): Promise<Response> {
    try {
      const data = await this.unifiedIntegration.getDashboardData('analysis');

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Analysis API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch analysis data',
        }),
        { status: 500 }
      );
    }
  }

  // Control and Automation APIs
  async blockIP(req: Request): Promise<Response> {
    try {
      const { ip, reason } = await req.json();

      if (!ip) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'IP address is required',
          }),
          { status: 400 }
        );
      }

      const success = await this.unifiedIntegration.triggerIPBlock(ip, reason || 'Manual block');

      return new Response(
        JSON.stringify({
          success,
          message: success ? `IP ${ip} blocked successfully` : `Failed to block IP ${ip}`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Block IP API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to block IP',
        }),
        { status: 500 }
      );
    }
  }

  async processSettlement(req: Request): Promise<Response> {
    try {
      const { wagerNumber, settlementType, notes } = await req.json();

      if (!wagerNumber || !settlementType) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Wager number and settlement type are required',
          }),
          { status: 400 }
        );
      }

      if (!['win', 'loss', 'push', 'void'].includes(settlementType)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid settlement type',
          }),
          { status: 400 }
        );
      }

      const success = await this.unifiedIntegration.processSettlement(
        wagerNumber,
        settlementType,
        notes
      );

      return new Response(
        JSON.stringify({
          success,
          message: success
            ? `Settlement processed for wager ${wagerNumber}`
            : `Failed to process settlement for ${wagerNumber}`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Process Settlement API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process settlement',
        }),
        { status: 500 }
      );
    }
  }

  async updateLineOdds(req: Request): Promise<Response> {
    try {
      const { lineId, newOdds } = await req.json();

      if (!lineId || !newOdds) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Line ID and new odds are required',
          }),
          { status: 400 }
        );
      }

      const success = await this.unifiedIntegration.updateLineOdds(lineId, newOdds);

      return new Response(
        JSON.stringify({
          success,
          message: success
            ? `Line odds updated for ${lineId}`
            : `Failed to update line odds for ${lineId}`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Update Line Odds API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update line odds',
        }),
        { status: 500 }
      );
    }
  }

  async sendAlert(req: Request): Promise<Response> {
    try {
      const { customerId, message, severity } = await req.json();

      if (!customerId || !message) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Customer ID and message are required',
          }),
          { status: 400 }
        );
      }

      const success = await this.unifiedIntegration.sendAlert(
        customerId,
        message,
        severity || 'medium'
      );

      return new Response(
        JSON.stringify({
          success,
          message: success
            ? `Alert sent to customer ${customerId}`
            : `Failed to send alert to ${customerId}`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Send Alert API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send alert',
        }),
        { status: 500 }
      );
    }
  }

  // Bulk operations
  async bulkSettleWagers(req: Request): Promise<Response> {
    try {
      const { settlements, notes } = await req.json();

      if (!settlements || !Array.isArray(settlements)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Settlements array is required',
          }),
          { status: 400 }
        );
      }

      const results = [];
      for (const settlement of settlements) {
        try {
          const success = await this.unifiedIntegration.processSettlement(
            settlement.wagerNumber,
            settlement.settlementType,
            settlement.notes || notes
          );
          results.push({
            wagerNumber: settlement.wagerNumber,
            success,
            message: success ? 'Processed' : 'Failed',
          });
        } catch (error) {
          results.push({
            wagerNumber: settlement.wagerNumber,
            success: false,
            message: error.message,
          });
        }
      }

      const successful = results.filter(r => r.success).length;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total: settlements.length,
            successful,
            failed: settlements.length - successful,
            results,
          },
          message: `Bulk settlement completed: ${successful}/${settlements.length} successful`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Bulk Settle API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process bulk settlement',
        }),
        { status: 500 }
      );
    }
  }

  // Dashboard configuration
  async getDashboardConfig(req: Request): Promise<Response> {
    try {
      const config = this.unifiedIntegration.getConfig();

      return new Response(
        JSON.stringify({
          success: true,
          data: config,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Dashboard Config API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get dashboard configuration',
        }),
        { status: 500 }
      );
    }
  }

  async updateDashboardConfig(req: Request): Promise<Response> {
    try {
      const newConfig = await req.json();
      this.unifiedIntegration.updateConfig(newConfig);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Dashboard configuration updated successfully',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Update Dashboard Config API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update dashboard configuration',
        }),
        { status: 500 }
      );
    }
  }

  // System health and monitoring
  async getSystemHealth(req: Request): Promise<Response> {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        integrations: {
          customerInfo: true, // These would be actual health checks
          alertIntegration: true,
          p2pAutomation: true,
          interfaceIntegration: true,
          closingLines: true,
          telegramAlerts: true,
        },
        dashboards: {
          ipTracker: true,
          transactionHistory: true,
          collections: true,
          sportsbookLines: true,
          analysis: true,
        },
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          responseTime: Date.now(), // This would be measured
        },
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: health,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('System Health API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get system health',
        }),
        { status: 500 }
      );
    }
  }
}

// Export singleton instance
export const dashboardIntegrationAPI = new DashboardIntegrationAPI();
