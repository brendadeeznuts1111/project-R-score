/**
 * Enhanced Player Management Interface
 * Comprehensive player dashboard with integrated cashier, P2P, peer networks, and advanced analytics
 */

import {
  CustomerDatabaseManagement,
  CustomerProfile,
} from '../customers/customer-database-management';
import {
  EnhancedCashierSystem,
  CashierSession,
  CashierTransaction,
} from '../cashier/enhanced-cashier-system';
import { PeerGroupManager, PeerGroup, PeerRelationship } from '../peer-network/peer-group-manager';
import { P2PPaymentMatching, P2PPaymentRequest } from '../payments/p2p-payment-matching';
import { CustomerPaymentValidation } from '../payments/customer-payment-validation';

export interface PlayerManagementSession {
  sessionId: string;
  agentId: string;
  customerId: string;
  startTime: string;
  endTime?: string;
  actions: PlayerAction[];
  cashierSession?: CashierSession;
  ipTracking: IPTrackingData;
  status: 'active' | 'completed' | 'suspended';
}

export interface PlayerAction {
  actionId: string;
  type:
    | 'view_profile'
    | 'update_limits'
    | 'process_transaction'
    | 'send_message'
    | 'update_permissions'
    | 'risk_assessment'
    | 'peer_network_action';
  timestamp: string;
  details: Record<string, any>;
  agentId: string;
  ipAddress: string;
  success: boolean;
  notes?: string;
}

export interface IPTrackingData {
  currentIP: string;
  previousIPs: Array<{
    ip: string;
    firstSeen: string;
    lastSeen: string;
    sessionCount: number;
  }>;
  suspiciousActivity: Array<{
    ip: string;
    activity: string;
    timestamp: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    isp: string;
  };
  riskScore: number;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  transactions: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  volume: {
    total: number;
    deposits: number;
    withdrawals: number;
    p2pMatches: number;
  };
  customers: {
    totalServed: number;
    newCustomers: number;
    repeatCustomers: number;
    vipCustomers: number;
  };
  performance: {
    averageSessionTime: number;
    averageTransactionTime: number;
    customerSatisfaction: number;
    efficiencyScore: number;
  };
  peerNetwork: {
    groupsCreated: number;
    successfulMatches: number;
    networkStrength: number;
  };
}

export interface CollectionsData {
  customerId: string;
  outstandingBalance: number;
  dueDate: string;
  paymentPlan: {
    totalAmount: number;
    installments: Array<{
      amount: number;
      dueDate: string;
      status: 'pending' | 'paid' | 'overdue';
    }>;
    nextPayment: {
      amount: number;
      dueDate: string;
    };
  };
  paymentHistory: Array<{
    amount: number;
    date: string;
    method: string;
    status: 'paid' | 'failed' | 'pending';
  }>;
  riskAssessment: {
    collectionRisk: 'low' | 'medium' | 'high' | 'critical';
    paymentReliability: number;
    recommendedActions: string[];
  };
}

export class EnhancedPlayerInterface {
  private customerManager: CustomerDatabaseManagement;
  private cashierSystem: EnhancedCashierSystem;
  private peerGroupManager: PeerGroupManager;
  private p2pMatching: P2PPaymentMatching;
  private paymentValidation: CustomerPaymentValidation;

  private activeSessions: Map<string, PlayerManagementSession> = new Map();
  private ipTrackingData: Map<string, IPTrackingData> = new Map();

  constructor(
    customerManager: CustomerDatabaseManagement,
    cashierSystem: EnhancedCashierSystem,
    peerGroupManager: PeerGroupManager,
    p2pMatching: P2PPaymentMatching,
    paymentValidation: CustomerPaymentValidation
  ) {
    this.customerManager = customerManager;
    this.cashierSystem = cashierSystem;
    this.peerGroupManager = peerGroupManager;
    this.p2pMatching = p2pMatching;
    this.paymentValidation = paymentValidation;
  }

  /**
   * Start a player management session
   */
  async startPlayerSession(
    agentId: string,
    customerId: string,
    ipAddress: string
  ): Promise<PlayerManagementSession> {
    const sessionId = this.generateSessionId();

    // Validate customer exists
    const customer = this.customerManager.getCustomerProfile(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Track IP activity
    await this.trackIPAddress(customerId, ipAddress);

    // Start cashier session if needed
    const cashierSession = await this.cashierSystem.startCashierSession({
      customerId,
      agentId,
      ipAddress,
      deviceInfo: {
        userAgent: 'PlayerManagementInterface/1.0',
        platform: 'web',
        language: 'en-US',
      },
      enablePeerMatching: true,
      enableAutoApproval: false,
      maxTransactionAmount: 5000,
      requireValidation: true,
    });

    const session: PlayerManagementSession = {
      sessionId,
      agentId,
      customerId,
      startTime: new Date().toISOString(),
      actions: [],
      cashierSession,
      ipTracking: this.getIPTrackingData(customerId),
      status: 'active',
    };

    this.activeSessions.set(sessionId, session);

    // Log initial action
    await this.logPlayerAction(
      sessionId,
      'view_profile',
      {
        customerId,
        agentId,
        action: 'session_started',
      },
      agentId,
      ipAddress,
      true
    );

    return session;
  }

  /**
   * Get comprehensive player dashboard
   */
  async getPlayerDashboard(sessionId: string): Promise<{
    session: PlayerManagementSession;
    customer: CustomerProfile;
    cashier: any;
    peerNetwork: any;
    ipTracking: IPTrackingData;
    collections: CollectionsData;
    agentPerformance: AgentPerformanceMetrics;
    alerts: Array<{
      type: 'risk' | 'transaction' | 'peer' | 'security';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      actionRequired: boolean;
    }>;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const customer = this.customerManager.getCustomerProfile(session.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get all dashboard data
    const cashier = this.cashierSystem.getCashierDashboard(session.cashierSession!.sessionId);
    const peerNetwork = this.peerGroupManager.getPeerNetworkDashboard(session.customerId);
    const ipTracking = this.getIPTrackingData(session.customerId);
    const collections = await this.getCollectionsData(session.customerId);
    const agentPerformance = await this.getAgentPerformanceMetrics(session.agentId);
    const alerts = await this.generateAlerts(session.customerId, session.agentId);

    return {
      session,
      customer,
      cashier,
      peerNetwork,
      ipTracking,
      collections,
      agentPerformance,
      alerts,
    };
  }

  /**
   * Process a transaction through the enhanced interface
   */
  async processPlayerTransaction(
    sessionId: string,
    transactionType: 'deposit' | 'withdrawal',
    amount: number,
    paymentMethod: string,
    paymentDetails: any,
    options: {
      usePeerMatching?: boolean;
      priority?: 'normal' | 'high' | 'urgent';
      notes?: string;
    } = {}
  ): Promise<CashierTransaction> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Log the action
    await this.logPlayerAction(
      sessionId,
      'process_transaction',
      {
        transactionType,
        amount,
        paymentMethod,
        options,
      },
      session.agentId,
      session.ipTracking.currentIP,
      true
    );

    if (transactionType === 'deposit') {
      return await this.cashierSystem.processDeposit(
        session.cashierSession!.sessionId,
        amount,
        paymentMethod,
        paymentDetails,
        {
          preferPeerMatching: options.usePeerMatching,
          maxWaitTime: 30,
          autoApprove: false,
        }
      );
    } else {
      return await this.cashierSystem.processWithdrawal(
        session.cashierSession!.sessionId,
        amount,
        paymentMethod,
        paymentDetails
      );
    }
  }

  /**
   * Approve or reject pending transactions
   */
  async manageTransactionApproval(
    sessionId: string,
    transactionId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (action === 'approve') {
      await this.cashierSystem.approveTransaction(
        session.cashierSession!.sessionId,
        transactionId,
        session.agentId,
        notes
      );
    } else {
      await this.cashierSystem.rejectTransaction(
        session.cashierSession!.sessionId,
        transactionId,
        session.agentId,
        notes || 'Rejected via player interface'
      );
    }

    // Log the action
    await this.logPlayerAction(
      sessionId,
      'update_permissions',
      {
        transactionId,
        action,
        notes,
      },
      session.agentId,
      session.ipTracking.currentIP,
      true
    );
  }

  /**
   * Create or manage peer groups for the player
   */
  async managePeerGroups(
    sessionId: string,
    action: 'create' | 'join' | 'leave',
    groupData?: {
      name?: string;
      type?: PeerGroup['type'];
      members?: string[];
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Log the action
    await this.logPlayerAction(
      sessionId,
      'peer_network_action',
      {
        action,
        groupData,
      },
      session.agentId,
      session.ipTracking.currentIP,
      true
    );

    if (action === 'create' && groupData) {
      await this.peerGroupManager.createPeerGroup(
        session.customerId,
        groupData.name!,
        groupData.type!,
        groupData.members || [],
        {}
      );
    }
  }

  /**
   * Get agent performance metrics
   */
  private async getAgentPerformanceMetrics(agentId: string): Promise<AgentPerformanceMetrics> {
    // Calculate metrics for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // This would query actual transaction data
    // For now, return mock data
    return {
      agentId,
      period: {
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      },
      transactions: {
        total: 245,
        successful: 238,
        failed: 4,
        pending: 3,
        successRate: 0.97,
      },
      volume: {
        total: 125000,
        deposits: 75000,
        withdrawals: 35000,
        p2pMatches: 15000,
      },
      customers: {
        totalServed: 89,
        newCustomers: 23,
        repeatCustomers: 66,
        vipCustomers: 12,
      },
      performance: {
        averageSessionTime: 1800, // seconds
        averageTransactionTime: 45, // seconds
        customerSatisfaction: 4.7,
        efficiencyScore: 92,
      },
      peerNetwork: {
        groupsCreated: 5,
        successfulMatches: 34,
        networkStrength: 88,
      },
    };
  }

  /**
   * Get collections data for the player
   */
  private async getCollectionsData(customerId: string): Promise<CollectionsData> {
    // This would query actual collections data
    // For now, return mock data
    return {
      customerId,
      outstandingBalance: 250.0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      paymentPlan: {
        totalAmount: 250.0,
        installments: [
          {
            amount: 125.0,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
          {
            amount: 125.0,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          },
        ],
        nextPayment: {
          amount: 125.0,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      paymentHistory: [
        {
          amount: 500.0,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          method: 'venmo',
          status: 'paid',
        },
      ],
      riskAssessment: {
        collectionRisk: 'low',
        paymentReliability: 94,
        recommendedActions: ['Monitor payment due date', 'Send reminder notification'],
      },
    };
  }

  /**
   * Track IP address activity for the player
   */
  private async trackIPAddress(customerId: string, currentIP: string): Promise<void> {
    let trackingData = this.ipTrackingData.get(customerId);

    if (!trackingData) {
      trackingData = {
        currentIP,
        previousIPs: [],
        suspiciousActivity: [],
        riskScore: 0,
      };
      this.ipTrackingData.set(customerId, trackingData);
    }

    // Update current IP
    trackingData.currentIP = currentIP;

    // Check if this is a new IP
    const existingIP = trackingData.previousIPs.find(ip => ip.ip === currentIP);
    if (!existingIP) {
      trackingData.previousIPs.push({
        ip: currentIP,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        sessionCount: 1,
      });

      // Check for suspicious activity
      if (trackingData.previousIPs.length > 3) {
        trackingData.suspiciousActivity.push({
          ip: currentIP,
          activity: 'New IP address detected',
          timestamp: new Date().toISOString(),
          riskLevel: 'medium',
        });
        trackingData.riskScore += 15;
      }
    } else {
      existingIP.lastSeen = new Date().toISOString();
      existingIP.sessionCount++;
    }

    // Get geolocation data (mock)
    trackingData.geoLocation = {
      country: 'US',
      region: 'California',
      city: 'Los Angeles',
      isp: 'Comcast',
    };

    // Calculate overall risk score
    trackingData.riskScore = Math.min(
      trackingData.suspiciousActivity.length * 15 +
        (trackingData.previousIPs.length > 5 ? 20 : 0) +
        (this.isSuspiciousIP(currentIP) ? 30 : 0),
      100
    );
  }

  /**
   * Get IP tracking data for a customer
   */
  private getIPTrackingData(customerId: string): IPTrackingData {
    return (
      this.ipTrackingData.get(customerId) || {
        currentIP: 'unknown',
        previousIPs: [],
        suspiciousActivity: [],
        riskScore: 0,
      }
    );
  }

  /**
   * Generate alerts for the player dashboard
   */
  private async generateAlerts(customerId: string, agentId: string): Promise<Array<any>> {
    const alerts: Array<any> = [];

    // IP-based alerts
    const ipData = this.getIPTrackingData(customerId);
    if (ipData.suspiciousActivity.length > 0) {
      alerts.push({
        type: 'security',
        severity: 'high',
        message: `${ipData.suspiciousActivity.length} suspicious IP activities detected`,
        actionRequired: true,
      });
    }

    // Transaction alerts
    const cashierAnalytics = this.cashierSystem.getCashierAnalytics();
    if (cashierAnalytics.activeSessions > 10) {
      alerts.push({
        type: 'transaction',
        severity: 'medium',
        message: 'High transaction volume detected',
        actionRequired: false,
      });
    }

    // Peer network alerts
    const peerNetwork = this.peerGroupManager.getPeerNetworkDashboard(customerId);
    if (peerNetwork.networkStats.networkStrength < 50) {
      alerts.push({
        type: 'peer',
        severity: 'low',
        message: 'Peer network strength is low - consider joining more groups',
        actionRequired: false,
      });
    }

    // Risk alerts
    if (ipData.riskScore > 50) {
      alerts.push({
        type: 'risk',
        severity: 'high',
        message: `High risk score detected: ${ipData.riskScore}`,
        actionRequired: true,
      });
    }

    return alerts;
  }

  /**
   * Log player management actions
   */
  private async logPlayerAction(
    sessionId: string,
    actionType: PlayerAction['type'],
    details: Record<string, any>,
    agentId: string,
    ipAddress: string,
    success: boolean,
    notes?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const action: PlayerAction = {
      actionId: this.generateActionId(),
      type: actionType,
      timestamp: new Date().toISOString(),
      details,
      agentId,
      ipAddress,
      success,
      notes,
    };

    session.actions.push(action);
  }

  /**
   * End player management session
   */
  async endPlayerSession(sessionId: string): Promise<PlayerManagementSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // End cashier session
    if (session.cashierSession) {
      await this.cashierSystem.endCashierSession(session.cashierSession.sessionId);
    }

    session.endTime = new Date().toISOString();
    session.status = 'completed';

    // Log final action
    await this.logPlayerAction(
      sessionId,
      'update_permissions',
      { action: 'session_ended' },
      session.agentId,
      session.ipTracking.currentIP,
      true,
      'Session completed successfully'
    );

    this.activeSessions.delete(sessionId);
    return session;
  }

  // Helper methods

  private isSuspiciousIP(ipAddress: string): boolean {
    // This would integrate with IP reputation services
    // For now, check against known suspicious patterns
    const suspiciousPatterns = ['192.168.', '10.0.', '172.16.'];
    return suspiciousPatterns.some(pattern => ipAddress.startsWith(pattern));
  }

  private generateSessionId(): string {
    return `player_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateActionId(): string {
    return `player_action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get system-wide analytics for the player management system
   */
  getSystemAnalytics(): {
    activeSessions: number;
    totalAgents: number;
    totalCustomers: number;
    systemPerformance: {
      averageSessionTime: number;
      transactionSuccessRate: number;
      peerMatchRate: number;
    };
    securityMetrics: {
      suspiciousIPCount: number;
      riskAlertsTriggered: number;
      blockedTransactions: number;
    };
  } {
    const activeSessions = this.activeSessions.size;
    const totalAgents = new Set(Array.from(this.activeSessions.values()).map(s => s.agentId)).size;
    const totalCustomers = new Set(Array.from(this.activeSessions.values()).map(s => s.customerId))
      .size;

    // Calculate security metrics
    const suspiciousIPCount = Array.from(this.ipTrackingData.values()).reduce(
      (count, data) => count + data.suspiciousActivity.length,
      0
    );

    return {
      activeSessions,
      totalAgents,
      totalCustomers,
      systemPerformance: {
        averageSessionTime: 1800, // seconds
        transactionSuccessRate: 0.96,
        peerMatchRate: 0.78,
      },
      securityMetrics: {
        suspiciousIPCount,
        riskAlertsTriggered: suspiciousIPCount,
        blockedTransactions: Math.floor(suspiciousIPCount * 0.1),
      },
    };
  }
}
