/**
 * Unified Dashboard Integration Manager
 * Connects all dashboard components with Fantasy42 integrations
 * Provides real-time data synchronization and unified API endpoints
 */

import { Fantasy42CustomerInfo, CustomerProfile } from './fantasy42-customer-info';
import { Fantasy42AlertIntegration } from './fantasy42-alert-integration';
import { Fantasy42P2PAutomation, P2PTransferRequest } from './fantasy42-p2p-automation';
import { Fantasy42InterfaceIntegration } from './fantasy42-interface-integration';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { P2PPaymentMatching } from '../payments/p2p-payment-matching';
import { EnhancedCashierSystem } from '../cashier/enhanced-cashier-system';
import { Fantasy42ClosingLines } from './fantasy42-closing-lines';
import { Fantasy42TelegramAlerts } from './fantasy42-telegram-alerts';

export interface DashboardDataConfig {
  ipTracker: {
    enabled: boolean;
    realTimeUpdates: boolean;
    riskThreshold: number;
  };
  transactionHistory: {
    enabled: boolean;
    realTimeUpdates: boolean;
    maxRecords: number;
  };
  collections: {
    enabled: boolean;
    realTimeUpdates: boolean;
    autoSettlement: boolean;
  };
  sportsbookLines: {
    enabled: boolean;
    realTimeUpdates: boolean;
    autoRefresh: boolean;
  };
  analysis: {
    enabled: boolean;
    realTimeUpdates: boolean;
    predictiveEnabled: boolean;
  };
}

export interface UnifiedDashboardData {
  ipTracker: {
    activeConnections: Array<{
      ip: string;
      customerId: string;
      customerName: string;
      location: {
        country: string;
        region: string;
        city: string;
        isp: string;
      };
      riskScore: number;
      lastSeen: string;
      sessionCount: number;
    }>;
    suspiciousActivity: Array<{
      ip: string;
      activity: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: string;
    }>;
  };
  transactionHistory: {
    transactions: Array<{
      id: string;
      customerId: string;
      customerName: string;
      type: 'deposit' | 'withdrawal' | 'transfer' | 'bonus' | 'fee';
      amount: number;
      status: 'completed' | 'pending' | 'failed';
      paymentMethod: string;
      timestamp: string;
      reference: string;
    }>;
    summary: {
      totalTransactions: number;
      totalVolume: number;
      pendingCount: number;
      successRate: number;
    };
  };
  collections: {
    pendingSettlements: Array<{
      wagerNumber: string;
      customerId: string;
      customerName: string;
      amount: number;
      type: 'win' | 'loss' | 'push' | 'void';
      status: 'pending' | 'completed';
      createdAt: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    settlementStats: {
      totalPending: number;
      totalCompleted: number;
      houseProfit: number;
      winRate: number;
    };
  };
  sportsbookLines: {
    activeLines: Array<{
      id: string;
      sport: string;
      eventName: string;
      marketType: 'moneyline' | 'spread' | 'total';
      odds: any;
      volume: number;
      lastUpdate: string;
      status: 'active' | 'suspended';
    }>;
    sportsStats: {
      [sport: string]: {
        activeLines: number;
        totalVolume: number;
        avgMovement: number;
      };
    };
  };
  analysis: {
    kpis: {
      totalRevenue: number;
      totalCustomers: number;
      averageOrderValue: number;
      customerRetentionRate: number;
      profitMargin: number;
      monthlyGrowthRate: number;
    };
    predictions: {
      revenueForecast: number;
      customerGrowth: number;
      marketShare: number;
    };
    risks: {
      [category: string]: 'low' | 'medium' | 'high';
    };
  };
}

export class UnifiedDashboardIntegration {
  private customerInfo: Fantasy42CustomerInfo;
  private alertIntegration: Fantasy42AlertIntegration;
  private p2pAutomation: Fantasy42P2PAutomation;
  private interfaceIntegration: Fantasy42InterfaceIntegration;
  private closingLines: Fantasy42ClosingLines;
  private telegramAlerts: Fantasy42TelegramAlerts;

  private fantasyClient: Fantasy42AgentClient;
  private p2pMatching: P2PPaymentMatching;
  private cashierSystem: EnhancedCashierSystem;

  private config: DashboardDataConfig;
  private dataCache: Map<string, any> = new Map();
  private subscribers: Map<string, Function[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DashboardDataConfig) {
    this.config = config;
    this.initializeIntegrations();
  }

  private async initializeIntegrations(): Promise<void> {
    try {
      console.log('🚀 Initializing Unified Dashboard Integration...');

      // Initialize core systems
      this.fantasyClient = new Fantasy42AgentClient(
        process.env.FANTASY42_USERNAME || 'default',
        process.env.FANTASY42_PASSWORD || 'default'
      );
      this.p2pMatching = new P2PPaymentMatching();
      this.cashierSystem = new EnhancedCashierSystem();

      // Initialize Fantasy42 client
      await this.fantasyClient.initialize();

      // Initialize integrations
      this.customerInfo = new Fantasy42CustomerInfo({
        xpathHandler: null, // Will be set by integration
        fantasyClient: this.fantasyClient,
        database: null, // Will be injected
        p2pAutomation: null, // Will be set later
        config: {
          cityFieldXPath: '//input[@data-field="city"]',
          stateFieldXPath: '//select[@data-field="state"]',
          emailFieldXPath: '//input[@type="email"]',
          phoneFieldXPath: '//input[@data-field="phone"]',
          altPhoneFieldXPath: '//input[@data-field="alt-phone"]',
          telegramAlertXPath: '//input[@data-field="telegram-alerts"]',
          thirdPartyIdXPath: '//input[@data-field="third-party-id"]',
          autoValidate: true,
          autoSave: true,
          realTimeSync: true,
          validationRules: {
            emailRequired: true,
            phoneRequired: true,
            stateRequired: true,
            thirdPartyValidation: true,
          },
        },
      });

      this.alertIntegration = new Fantasy42AlertIntegration();
      this.interfaceIntegration = new Fantasy42InterfaceIntegration();
      this.closingLines = new Fantasy42ClosingLines();
      this.telegramAlerts = new Fantasy42TelegramAlerts({
        wagerAlertXPath: '//label[@data-language="L-1144"]',
        alertThresholds: {
          highAmount: 1000,
          vipCustomer: true,
          riskLevel: 'medium',
          unusualPattern: true,
        },
        notificationChannels: {
          telegram: true,
          signal: false,
          email: false,
          sms: false,
        },
        autoSendEnabled: true,
        escalationRules: {
          highRisk: true,
          largeAmount: true,
          vipCustomer: true,
          unusualActivity: true,
        },
      });

      // Initialize P2P Automation with dependencies
      const p2pConfig = {
        passwordFieldXPath: '//span[@data-language="L-214"]/following::input[@type="password"][1]',
        agentSelectXPath: '//select[@data-field="agent-parent"][@data-column="agent"]',
        thirdPartyIdXPath: '//span[@data-language="L-1145"]/following::input[1]',
        autoTransferEnabled: true,
        minTransferAmount: 10,
        maxTransferAmount: 5000,
        supportedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
        riskThreshold: 0.7,
      };

      this.p2pAutomation = new Fantasy42P2PAutomation(
        this.p2pMatching,
        this.fantasyClient,
        this.cashierSystem,
        p2pConfig
      );

      // Set cross-references
      this.customerInfo.setP2PAutomation(this.p2pAutomation);

      // Initialize all integrations
      await Promise.all([
        this.alertIntegration.initialize(),
        this.interfaceIntegration.initialize(),
        this.closingLines.initialize(),
        this.telegramAlerts.initialize(),
      ]);

      console.log('✅ Unified Dashboard Integration initialized successfully');

      // Start real-time updates based on config
      this.startRealTimeUpdates();
    } catch (error) {
      console.error('❌ Failed to initialize Unified Dashboard Integration:', error);
      throw error;
    }
  }

  private startRealTimeUpdates(): void {
    // Start real-time updates for enabled dashboards
    if (this.config.ipTracker.enabled && this.config.ipTracker.realTimeUpdates) {
      this.startDataUpdates('ipTracker', 30000); // 30 seconds
    }

    if (this.config.transactionHistory.enabled && this.config.transactionHistory.realTimeUpdates) {
      this.startDataUpdates('transactionHistory', 60000); // 1 minute
    }

    if (this.config.collections.enabled && this.config.collections.realTimeUpdates) {
      this.startDataUpdates('collections', 30000); // 30 seconds
    }

    if (this.config.sportsbookLines.enabled && this.config.sportsbookLines.realTimeUpdates) {
      this.startDataUpdates('sportsbookLines', 15000); // 15 seconds
    }

    if (this.config.analysis.enabled && this.config.analysis.realTimeUpdates) {
      this.startDataUpdates('analysis', 120000); // 2 minutes
    }
  }

  private startDataUpdates(dataType: string, interval: number): void {
    const updateInterval = setInterval(async () => {
      try {
        await this.updateDataCache(dataType);
        this.notifySubscribers(dataType);
      } catch (error) {
        console.error(`❌ Failed to update ${dataType}:`, error);
      }
    }, interval);

    this.updateIntervals.set(dataType, updateInterval);
  }

  private async updateDataCache(dataType: string): Promise<void> {
    switch (dataType) {
      case 'ipTracker':
        const ipData = await this.getIPTrackerData();
        this.dataCache.set('ipTracker', ipData);
        break;
      case 'transactionHistory':
        const transactionData = await this.getTransactionHistoryData();
        this.dataCache.set('transactionHistory', transactionData);
        break;
      case 'collections':
        const collectionsData = await this.getCollectionsData();
        this.dataCache.set('collections', collectionsData);
        break;
      case 'sportsbookLines':
        const linesData = await this.getSportsbookLinesData();
        this.dataCache.set('sportsbookLines', linesData);
        break;
      case 'analysis':
        const analysisData = await this.getAnalysisData();
        this.dataCache.set('analysis', analysisData);
        break;
    }
  }

  // IP Tracker Data Integration
  private async getIPTrackerData(): Promise<UnifiedDashboardData['ipTracker']> {
    try {
      // Get active connections from customer info system
      const activeConnections = await this.customerInfo.getActiveConnections();

      // Get suspicious activity from alert integration
      const suspiciousActivity = await this.alertIntegration.getSuspiciousActivity();

      return {
        activeConnections: activeConnections.map(conn => ({
          ip: conn.ip,
          customerId: conn.customerId,
          customerName: conn.customerName,
          location: {
            country: conn.location?.country || 'Unknown',
            region: conn.location?.region || 'Unknown',
            city: conn.location?.city || 'Unknown',
            isp: conn.location?.isp || 'Unknown',
          },
          riskScore: conn.riskScore || 0,
          lastSeen: conn.lastSeen,
          sessionCount: conn.sessionCount || 1,
        })),
        suspiciousActivity: suspiciousActivity.map(activity => ({
          ip: activity.ip,
          activity: activity.description,
          severity: activity.severity,
          timestamp: activity.timestamp,
        })),
      };
    } catch (error) {
      console.error('Failed to get IP tracker data:', error);
      return { activeConnections: [], suspiciousActivity: [] };
    }
  }

  // Transaction History Data Integration
  private async getTransactionHistoryData(): Promise<UnifiedDashboardData['transactionHistory']> {
    try {
      // Get transactions from P2P automation and cashier system
      const p2pTransactions = await this.p2pAutomation.getTransactionHistory();
      const cashierTransactions = await this.cashierSystem.getTransactionHistory();

      const allTransactions = [...p2pTransactions, ...cashierTransactions]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.config.transactionHistory.maxRecords);

      const summary = {
        totalTransactions: allTransactions.length,
        totalVolume: allTransactions.reduce((sum, t) => sum + t.amount, 0),
        pendingCount: allTransactions.filter(t => t.status === 'pending').length,
        successRate:
          allTransactions.length > 0
            ? (allTransactions.filter(t => t.status === 'completed').length /
                allTransactions.length) *
              100
            : 0,
      };

      return {
        transactions: allTransactions.map(t => ({
          id: t.id,
          customerId: t.customerId,
          customerName: t.customerName || `Customer ${t.customerId}`,
          type: t.type,
          amount: t.amount,
          status: t.status,
          paymentMethod: t.paymentMethod,
          timestamp: t.timestamp,
          reference: t.reference || '',
        })),
        summary,
      };
    } catch (error) {
      console.error('Failed to get transaction history data:', error);
      return {
        transactions: [],
        summary: { totalTransactions: 0, totalVolume: 0, pendingCount: 0, successRate: 0 },
      };
    }
  }

  // Collections Data Integration
  private async getCollectionsData(): Promise<UnifiedDashboardData['collections']> {
    try {
      // Get pending settlements from Fantasy42 client
      const pendingSettlements = await this.fantasyClient.getPendingSettlements();

      const settlementStats = {
        totalPending: pendingSettlements.length,
        totalCompleted: pendingSettlements.filter(s => s.status === 'completed').length,
        houseProfit: pendingSettlements.reduce((sum, s) => {
          if (s.type === 'win') return sum - s.amount;
          return sum + s.amount;
        }, 0),
        winRate:
          pendingSettlements.length > 0
            ? (pendingSettlements.filter(s => s.type === 'win').length /
                pendingSettlements.length) *
              100
            : 0,
      };

      return {
        pendingSettlements: pendingSettlements.map(s => ({
          wagerNumber: s.wagerNumber,
          customerId: s.customerId,
          customerName: s.customerName || `Customer ${s.customerId}`,
          amount: s.amount,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt,
          riskLevel: s.riskLevel || 'low',
        })),
        settlementStats,
      };
    } catch (error) {
      console.error('Failed to get collections data:', error);
      return {
        pendingSettlements: [],
        settlementStats: { totalPending: 0, totalCompleted: 0, houseProfit: 0, winRate: 0 },
      };
    }
  }

  // Sportsbook Lines Data Integration
  private async getSportsbookLinesData(): Promise<UnifiedDashboardData['sportsbookLines']> {
    try {
      // Get active lines from closing lines system
      const activeLines = await this.closingLines.getActiveLines();

      // Calculate sports statistics
      const sportsStats: { [sport: string]: any } = {};
      activeLines.forEach(line => {
        if (!sportsStats[line.sport]) {
          sportsStats[line.sport] = { activeLines: 0, totalVolume: 0, avgMovement: 0 };
        }
        sportsStats[line.sport].activeLines++;
        sportsStats[line.sport].totalVolume += line.volume || 0;
      });

      return {
        activeLines: activeLines.map(line => ({
          id: line.id,
          sport: line.sport,
          eventName: line.eventName,
          marketType: line.marketType,
          odds: line.odds,
          volume: line.volume || 0,
          lastUpdate: line.lastUpdate,
          status: line.status,
        })),
        sportsStats,
      };
    } catch (error) {
      console.error('Failed to get sportsbook lines data:', error);
      return { activeLines: [], sportsStats: {} };
    }
  }

  // Analysis Data Integration
  private async getAnalysisData(): Promise<UnifiedDashboardData['analysis']> {
    try {
      // Get analytics from multiple sources
      const customerAnalytics = await this.customerInfo.getAnalytics();
      const transactionAnalytics = await this.cashierSystem.getAnalytics();
      const settlementAnalytics = await this.fantasyClient.getSettlementAnalytics();

      // Combine and calculate KPIs
      const kpis = {
        totalRevenue: transactionAnalytics.totalRevenue || 0,
        totalCustomers: customerAnalytics.totalCustomers || 0,
        averageOrderValue: transactionAnalytics.averageOrderValue || 0,
        customerRetentionRate: customerAnalytics.retentionRate || 0,
        profitMargin: settlementAnalytics.profitMargin || 0,
        monthlyGrowthRate: transactionAnalytics.monthlyGrowth || 0,
      };

      // Generate predictions
      const predictions = {
        revenueForecast: kpis.totalRevenue * 1.15, // 15% growth prediction
        customerGrowth: Math.floor(kpis.totalCustomers * 1.08), // 8% growth prediction
        marketShare: 15.2, // Mock market share
      };

      // Assess risks
      const risks = {
        churnRisk:
          customerAnalytics.retentionRate < 70
            ? 'high'
            : customerAnalytics.retentionRate < 80
              ? 'medium'
              : 'low',
        marketVolatility:
          settlementAnalytics.volatility > 0.7
            ? 'high'
            : settlementAnalytics.volatility > 0.4
              ? 'medium'
              : 'low',
        operationalEfficiency:
          transactionAnalytics.successRate < 95
            ? 'high'
            : transactionAnalytics.successRate < 98
              ? 'medium'
              : 'low',
      };

      return { kpis, predictions, risks };
    } catch (error) {
      console.error('Failed to get analysis data:', error);
      return {
        kpis: {
          totalRevenue: 0,
          totalCustomers: 0,
          averageOrderValue: 0,
          customerRetentionRate: 0,
          profitMargin: 0,
          monthlyGrowthRate: 0,
        },
        predictions: { revenueForecast: 0, customerGrowth: 0, marketShare: 0 },
        risks: { churnRisk: 'medium', marketVolatility: 'medium', operationalEfficiency: 'medium' },
      };
    }
  }

  // Public API methods for dashboards
  public async getDashboardData(dashboardType: keyof DashboardDataConfig): Promise<any> {
    if (this.dataCache.has(dashboardType)) {
      return this.dataCache.get(dashboardType);
    }

    await this.updateDataCache(dashboardType);
    return this.dataCache.get(dashboardType);
  }

  public subscribeToUpdates(dashboardType: string, callback: Function): void {
    if (!this.subscribers.has(dashboardType)) {
      this.subscribers.set(dashboardType, []);
    }
    this.subscribers.get(dashboardType)!.push(callback);
  }

  public unsubscribeFromUpdates(dashboardType: string, callback: Function): void {
    const subscribers = this.subscribers.get(dashboardType);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  private notifySubscribers(dashboardType: string): void {
    const subscribers = this.subscribers.get(dashboardType);
    const data = this.dataCache.get(dashboardType);

    if (subscribers && data) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in subscriber callback for ${dashboardType}:`, error);
        }
      });
    }
  }

  // Automation and control methods
  public async triggerIPBlock(ip: string, reason: string): Promise<boolean> {
    try {
      await this.alertIntegration.blockIP(ip, reason);
      console.log(`🚫 IP ${ip} blocked: ${reason}`);
      return true;
    } catch (error) {
      console.error(`Failed to block IP ${ip}:`, error);
      return false;
    }
  }

  public async processSettlement(
    wagerNumber: string,
    settlementType: 'win' | 'loss' | 'push' | 'void',
    notes?: string
  ): Promise<boolean> {
    try {
      await this.fantasyClient.settleWager(wagerNumber, settlementType, 'system', notes);
      console.log(`✅ Settlement processed for wager ${wagerNumber}: ${settlementType}`);
      return true;
    } catch (error) {
      console.error(`Failed to process settlement for ${wagerNumber}:`, error);
      return false;
    }
  }

  public async updateLineOdds(lineId: string, newOdds: any): Promise<boolean> {
    try {
      await this.closingLines.updateLineOdds(lineId, newOdds);
      console.log(`📊 Line odds updated for ${lineId}`);
      return true;
    } catch (error) {
      console.error(`Failed to update line odds for ${lineId}:`, error);
      return false;
    }
  }

  public async sendAlert(
    customerId: string,
    message: string,
    severity: 'low' | 'medium' | 'high'
  ): Promise<boolean> {
    try {
      await this.telegramAlerts.sendAlert(customerId, message, severity);
      console.log(`📢 Alert sent to customer ${customerId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send alert to ${customerId}:`, error);
      return false;
    }
  }

  // Configuration management
  public updateConfig(newConfig: Partial<DashboardDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Dashboard configuration updated');
  }

  public getConfig(): DashboardDataConfig {
    return { ...this.config };
  }

  // Cleanup method
  public async destroy(): Promise<void> {
    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();

    // Clear subscribers
    this.subscribers.clear();

    // Clear cache
    this.dataCache.clear();

    console.log('🧹 Unified Dashboard Integration cleaned up');
  }
}

// Export singleton instance
export const unifiedDashboardIntegration = new UnifiedDashboardIntegration({
  ipTracker: {
    enabled: true,
    realTimeUpdates: true,
    riskThreshold: 0.7,
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
