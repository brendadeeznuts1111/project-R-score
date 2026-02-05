/**
 * 🔗 Fantasy42 Betting Engine Integration Guide
 *
 * Comprehensive guide for integrating the Fantasy42 Betting Engine
 * with existing enterprise systems including:
 * - User management systems
 * - Payment processors
 * - Analytics platforms
 * - Compliance frameworks
 * - Notification systems
 */

import {
  Fantasy42BettingEngine,
  Fantasy42SecurityEngine,
  Fantasy42ComplianceEngine,
  Fantasy42AnalyticsEngine,
} from '@fire22-registry/betting-engine';

// ============================================================================
// INTEGRATION INTERFACES
// ============================================================================

interface UserManagementSystem {
  getUser(userId: string): Promise<User | null>;
  updateUserBalance(userId: string, amount: number): Promise<void>;
  verifyUser(userId: string): Promise<VerificationResult>;
  getUserLimits(userId: string): Promise<UserLimits>;
}

interface PaymentProcessor {
  processPayment(userId: string, amount: number, type: 'bet' | 'payout'): Promise<PaymentResult>;
  holdFunds(userId: string, amount: number): Promise<HoldResult>;
  releaseFunds(userId: string, amount: number): Promise<ReleaseResult>;
  getTransactionHistory(userId: string): Promise<Transaction[]>;
}

interface AnalyticsPlatform {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  getUserInsights(userId: string): Promise<UserInsights>;
  generateReport(type: ReportType, params: any): Promise<Report>;
  getRealTimeMetrics(): Promise<SystemMetrics>;
}

interface ComplianceFramework {
  checkCompliance(userId: string, action: string, context: any): Promise<ComplianceResult>;
  logAuditEvent(event: AuditEvent): Promise<void>;
  getComplianceReport(userId: string): Promise<ComplianceReport>;
  flagSuspiciousActivity(activity: SuspiciousActivity): Promise<void>;
}

interface NotificationSystem {
  sendNotification(userId: string, notification: Notification): Promise<void>;
  sendAdminAlert(alert: AdminAlert): Promise<void>;
  subscribeToEvents(eventType: string, callback: Function): void;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  email: string;
  balance: number;
  verified: boolean;
  limits: UserLimits;
  riskProfile: RiskProfile;
}

interface UserLimits {
  dailyBetLimit: number;
  monthlyBetLimit: number;
  maxBetAmount: number;
  maxPayoutAmount: number;
}

interface VerificationResult {
  verified: boolean;
  ageVerified: boolean;
  locationVerified: boolean;
  documentsRequired: string[];
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  fee: number;
  timestamp: Date;
}

interface HoldResult {
  success: boolean;
  holdId: string;
  amount: number;
  expiresAt: Date;
}

interface ReleaseResult {
  success: boolean;
  amount: number;
  fee: number;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'bet' | 'payout' | 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
}

interface AnalyticsEvent {
  type: string;
  userId: string;
  data: any;
  timestamp: Date;
}

interface UserInsights {
  bettingPattern: BettingPattern;
  riskScore: number;
  preferences: UserPreferences;
  engagement: EngagementMetrics;
}

type ReportType = 'financial' | 'compliance' | 'performance' | 'user-activity';

interface SystemMetrics {
  activeUsers: number;
  totalBets: number;
  totalAmount: number;
  systemLoad: number;
}

interface ComplianceResult {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
}

interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: any;
  timestamp: Date;
}

interface ComplianceReport {
  userId: string;
  complianceScore: number;
  violations: string[];
  lastAudit: Date;
  nextAudit: Date;
}

interface SuspiciousActivity {
  userId: string;
  activity: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

interface Notification {
  type: 'bet_placed' | 'bet_settled' | 'payout' | 'alert';
  title: string;
  message: string;
  data: any;
}

interface AdminAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'security' | 'compliance' | 'system' | 'financial';
  title: string;
  message: string;
  data: any;
}

interface RiskProfile {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  lastAssessment: Date;
}

interface BettingPattern {
  favoriteSports: string[];
  averageBetAmount: number;
  bettingFrequency: number;
  winRate: number;
  preferredBetTypes: string[];
}

interface UserPreferences {
  oddsFormat: 'american' | 'decimal' | 'fractional';
  notifications: NotificationPreferences;
  privacySettings: PrivacySettings;
}

interface NotificationPreferences {
  betConfirmations: boolean;
  payoutNotifications: boolean;
  marketingEmails: boolean;
  smsAlerts: boolean;
}

interface PrivacySettings {
  shareBettingHistory: boolean;
  publicProfile: boolean;
  analyticsOptIn: boolean;
}

interface EngagementMetrics {
  lastLogin: Date;
  sessionDuration: number;
  pageViews: number;
  conversionRate: number;
}

// ============================================================================
// INTEGRATION IMPLEMENTATION
// ============================================================================

class BettingEngineIntegrator {
  private bettingEngine: Fantasy42BettingEngine;
  private userSystem: UserManagementSystem;
  private paymentSystem: PaymentProcessor;
  private analyticsSystem: AnalyticsPlatform;
  private complianceSystem: ComplianceFramework;
  private notificationSystem: NotificationSystem;

  constructor(
    bettingEngine: Fantasy42BettingEngine,
    userSystem: UserManagementSystem,
    paymentSystem: PaymentProcessor,
    analyticsSystem: AnalyticsPlatform,
    complianceSystem: ComplianceFramework,
    notificationSystem: NotificationSystem
  ) {
    this.bettingEngine = bettingEngine;
    this.userSystem = userSystem;
    this.paymentSystem = paymentSystem;
    this.analyticsSystem = analyticsSystem;
    this.complianceSystem = complianceSystem;
    this.notificationSystem = notificationSystem;

    this.setupEventHandlers();
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  private setupEventHandlers(): void {
    // Bet placement events
    this.notificationSystem.subscribeToEvents('bet_placed', this.handleBetPlaced.bind(this));
    this.notificationSystem.subscribeToEvents('bet_settled', this.handleBetSettled.bind(this));
    this.notificationSystem.subscribeToEvents(
      'payout_processed',
      this.handlePayoutProcessed.bind(this)
    );

    // System events
    this.notificationSystem.subscribeToEvents(
      'suspicious_activity',
      this.handleSuspiciousActivity.bind(this)
    );
    this.notificationSystem.subscribeToEvents(
      'compliance_violation',
      this.handleComplianceViolation.bind(this)
    );
  }

  // ============================================================================
  // ENHANCED BET PLACEMENT
  // ============================================================================

  async placeBet(
    userId: string,
    gameId: string,
    type: string,
    amount: number,
    odds: any,
    selection: string,
    metadata: any = {}
  ): Promise<any> {
    try {
      // 1. User verification
      const user = await this.userSystem.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Compliance check
      const complianceResult = await this.complianceSystem.checkCompliance(userId, 'place_bet', {
        amount,
        gameId,
        type,
      });

      if (!complianceResult.compliant) {
        await this.notificationSystem.sendNotification(userId, {
          type: 'alert',
          title: 'Betting Restricted',
          message: 'Your account has compliance restrictions. Please contact support.',
          data: { violations: complianceResult.violations },
        });
        throw new Error('Compliance check failed');
      }

      // 3. Balance verification
      if (user.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // 4. Payment hold
      const holdResult = await this.paymentSystem.holdFunds(userId, amount);
      if (!holdResult.success) {
        throw new Error('Failed to hold funds');
      }

      // 5. Place bet with enhanced metadata
      const bet = await this.bettingEngine.placeBet(userId, gameId, type, amount, odds, selection, {
        ...metadata,
        holdId: holdResult.holdId,
        userVerification: user.verified,
        complianceCheck: complianceResult,
        riskProfile: user.riskProfile,
      });

      // 6. Update user balance
      await this.userSystem.updateUserBalance(userId, -amount);

      // 7. Analytics tracking
      await this.analyticsSystem.trackEvent({
        type: 'bet_placed',
        userId,
        data: {
          betId: bet.id,
          amount,
          gameId,
          type,
          odds: bet.odds,
          potentialPayout: bet.potentialPayout,
        },
        timestamp: new Date(),
      });

      // 8. Send confirmation notification
      await this.notificationSystem.sendNotification(userId, {
        type: 'bet_placed',
        title: 'Bet Placed Successfully',
        message: `Your $${amount} bet on ${selection} has been placed.`,
        data: {
          betId: bet.id,
          potentialPayout: bet.potentialPayout,
          gameId,
        },
      });

      // 9. Audit logging
      await this.complianceSystem.logAuditEvent({
        userId,
        action: 'place_bet',
        resource: 'betting_engine',
        result: 'success',
        details: {
          betId: bet.id,
          amount,
          gameId,
          type,
        },
        timestamp: new Date(),
      });

      return bet;
    } catch (error) {
      // Error handling with notifications
      await this.notificationSystem.sendNotification(userId, {
        type: 'alert',
        title: 'Bet Placement Failed',
        message: error.message,
        data: { error: error.message },
      });

      // Audit failure
      await this.complianceSystem.logAuditEvent({
        userId,
        action: 'place_bet',
        resource: 'betting_engine',
        result: 'failure',
        details: { error: error.message },
        timestamp: new Date(),
      });

      throw error;
    }
  }

  // ============================================================================
  // ENHANCED BET SETTLEMENT
  // ============================================================================

  async settleBet(betId: string, outcome: string, result: any): Promise<any> {
    try {
      // 1. Get bet details
      const bet = this.bettingEngine.getBet(betId);
      if (!bet) {
        throw new Error('Bet not found');
      }

      // 2. Settle bet in engine
      const settledBet = await this.bettingEngine.settleBet(betId, outcome, result);

      // 3. Process payout if won
      if (settledBet.status === 'WIN' && settledBet.metadata.settlement?.payout > 0) {
        const payoutAmount = settledBet.metadata.settlement.payout;

        // Process payment
        const paymentResult = await this.paymentSystem.processPayment(
          bet.userId,
          payoutAmount,
          'payout'
        );

        if (paymentResult.success) {
          // Update user balance
          await this.userSystem.updateUserBalance(bet.userId, payoutAmount);

          // Send payout notification
          await this.notificationSystem.sendNotification(bet.userId, {
            type: 'payout',
            title: 'Payout Processed',
            message: `$${payoutAmount} has been added to your account.`,
            data: {
              betId,
              amount: payoutAmount,
              transactionId: paymentResult.transactionId,
            },
          });
        }
      }

      // 4. Analytics tracking
      await this.analyticsSystem.trackEvent({
        type: 'bet_settled',
        userId: bet.userId,
        data: {
          betId,
          outcome,
          payout: settledBet.metadata.settlement?.payout || 0,
          gameId: bet.gameId,
        },
        timestamp: new Date(),
      });

      // 5. Audit logging
      await this.complianceSystem.logAuditEvent({
        userId: bet.userId,
        action: 'settle_bet',
        resource: 'betting_engine',
        result: 'success',
        details: {
          betId,
          outcome,
          payout: settledBet.metadata.settlement?.payout || 0,
        },
        timestamp: new Date(),
      });

      return settledBet;
    } catch (error) {
      // Handle settlement errors
      console.error('Settlement error:', error);

      // Send admin alert
      await this.notificationSystem.sendAdminAlert({
        level: 'error',
        category: 'system',
        title: 'Bet Settlement Failed',
        message: `Failed to settle bet ${betId}: ${error.message}`,
        data: { betId, error: error.message },
      });

      throw error;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private async handleBetPlaced(event: any): Promise<void> {
    // Additional processing for bet placement events
    console.log('Bet placed event:', event);

    // Risk assessment
    const riskScore = await this.assessBettingRisk(event.userId, event.data);

    if (riskScore > 0.8) {
      await this.complianceSystem.flagSuspiciousActivity({
        userId: event.userId,
        activity: 'high_risk_bet',
        severity: 'high',
        details: event.data,
      });
    }
  }

  private async handleBetSettled(event: any): Promise<void> {
    // Process settlement notifications
    console.log('Bet settled event:', event);

    // Update user insights
    await this.analyticsSystem.getUserInsights(event.userId);
  }

  private async handlePayoutProcessed(event: any): Promise<void> {
    // Handle payout confirmations
    console.log('Payout processed event:', event);
  }

  private async handleSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    // Handle suspicious activity alerts
    console.log('Suspicious activity detected:', activity);

    // Send admin alert
    await this.notificationSystem.sendAdminAlert({
      level: activity.severity === 'critical' ? 'critical' : 'warning',
      category: 'security',
      title: 'Suspicious Activity Detected',
      message: `Suspicious activity flagged for user ${activity.userId}`,
      data: activity,
    });
  }

  private async handleComplianceViolation(violation: any): Promise<void> {
    // Handle compliance violations
    console.log('Compliance violation:', violation);

    // Send admin alert
    await this.notificationSystem.sendAdminAlert({
      level: 'error',
      category: 'compliance',
      title: 'Compliance Violation',
      message: `Compliance violation detected: ${violation.details}`,
      data: violation,
    });
  }

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  private async assessBettingRisk(userId: string, betData: any): Promise<number> {
    const userInsights = await this.analyticsSystem.getUserInsights(userId);

    let riskScore = 0;

    // High amount relative to user history
    if (betData.amount > userInsights.bettingPattern.averageBetAmount * 5) {
      riskScore += 0.3;
    }

    // Unusual betting pattern
    if (userInsights.bettingPattern.bettingFrequency > 10) {
      riskScore += 0.2;
    }

    // Low win rate with high frequency
    if (
      userInsights.bettingPattern.winRate < 0.3 &&
      userInsights.bettingPattern.bettingFrequency > 5
    ) {
      riskScore += 0.3;
    }

    // Large payout potential
    const payoutRatio = betData.potentialPayout / betData.amount;
    if (payoutRatio > 10) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  // ============================================================================
  // SYSTEM HEALTH MONITORING
  // ============================================================================

  async getSystemHealth(): Promise<any> {
    const [bettingHealth, userHealth, paymentHealth, analyticsHealth] = await Promise.all([
      this.bettingEngine.getHealthStatus(),
      this.checkUserSystemHealth(),
      this.checkPaymentSystemHealth(),
      this.analyticsSystem.getRealTimeMetrics(),
    ]);

    return {
      overall: this.calculateOverallHealth({
        betting: bettingHealth,
        user: userHealth,
        payment: paymentHealth,
        analytics: analyticsHealth,
      }),
      components: {
        betting: bettingHealth,
        user: userHealth,
        payment: paymentHealth,
        analytics: analyticsHealth,
      },
      timestamp: new Date(),
    };
  }

  private calculateOverallHealth(components: any): string {
    const statuses = Object.values(components).map((c: any) => c.status || c.overall || 'unknown');

    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.every(s => s === 'healthy' || s === 'ok')) return 'healthy';

    return 'unknown';
  }

  private async checkUserSystemHealth(): Promise<any> {
    try {
      // Simulate user system health check
      return { status: 'healthy', responseTime: 45 };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkPaymentSystemHealth(): Promise<any> {
    try {
      // Simulate payment system health check
      return { status: 'healthy', responseTime: 67 };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// ============================================================================
// INTEGRATION SETUP EXAMPLE
// ============================================================================

async function setupBettingEngineIntegration() {
  console.log('🔗 Setting up Fantasy42 Betting Engine Integration...');

  // Initialize core systems (mock implementations for example)
  const userSystem: UserManagementSystem = {
    getUser: async userId => ({
      id: userId,
      email: `${userId}@example.com`,
      balance: 1000,
      verified: true,
      limits: {
        dailyBetLimit: 5000,
        monthlyBetLimit: 20000,
        maxBetAmount: 1000,
        maxPayoutAmount: 50000,
      },
      riskProfile: {
        score: 0.2,
        level: 'low',
        factors: [],
        lastAssessment: new Date(),
      },
    }),
    updateUserBalance: async (userId, amount) => {
      console.log(`Updated balance for ${userId}: ${amount}`);
    },
    verifyUser: async userId => ({
      verified: true,
      ageVerified: true,
      locationVerified: true,
      documentsRequired: [],
    }),
    getUserLimits: async userId => ({
      dailyBetLimit: 5000,
      monthlyBetLimit: 20000,
      maxBetAmount: 1000,
      maxPayoutAmount: 50000,
    }),
  };

  const paymentSystem: PaymentProcessor = {
    processPayment: async (userId, amount, type) => ({
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount,
      fee: amount * 0.029,
      timestamp: new Date(),
    }),
    holdFunds: async (userId, amount) => ({
      success: true,
      holdId: `hold_${Date.now()}`,
      amount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }),
    releaseFunds: async (userId, amount) => ({
      success: true,
      amount,
      fee: 0,
    }),
    getTransactionHistory: async userId => [],
  };

  const analyticsSystem: AnalyticsPlatform = {
    trackEvent: async event => {
      console.log('Analytics event:', event.type, event.userId);
    },
    getUserInsights: async userId => ({
      bettingPattern: {
        favoriteSports: ['NFL', 'NBA'],
        averageBetAmount: 50,
        bettingFrequency: 3,
        winRate: 0.55,
        preferredBetTypes: ['MONEYLINE', 'SPREAD'],
      },
      riskScore: 0.2,
      preferences: {
        oddsFormat: 'american',
        notifications: {
          betConfirmations: true,
          payoutNotifications: true,
          marketingEmails: false,
          smsAlerts: false,
        },
        privacySettings: {
          shareBettingHistory: false,
          publicProfile: false,
          analyticsOptIn: true,
        },
      },
      engagement: {
        lastLogin: new Date(),
        sessionDuration: 1800,
        pageViews: 25,
        conversionRate: 0.15,
      },
    }),
    generateReport: async (type, params) => ({
      type,
      generatedAt: new Date(),
      data: {},
    }),
    getRealTimeMetrics: async () => ({
      activeUsers: 1250,
      totalBets: 5432,
      totalAmount: 125000,
      systemLoad: 0.65,
    }),
  };

  const complianceSystem: ComplianceFramework = {
    checkCompliance: async (userId, action, context) => ({
      compliant: true,
      violations: [],
      recommendations: [],
    }),
    logAuditEvent: async event => {
      console.log('Audit event logged:', event.action);
    },
    getComplianceReport: async userId => ({
      userId,
      complianceScore: 0.95,
      violations: [],
      lastAudit: new Date(),
      nextAudit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    flagSuspiciousActivity: async activity => {
      console.log('Suspicious activity flagged:', activity.activity);
    },
  };

  const notificationSystem: NotificationSystem = {
    sendNotification: async (userId, notification) => {
      console.log(`Notification sent to ${userId}:`, notification.title);
    },
    sendAdminAlert: async alert => {
      console.log('Admin alert:', alert.title, alert.level);
    },
    subscribeToEvents: (eventType, callback) => {
      console.log(`Subscribed to ${eventType} events`);
    },
  };

  // Initialize engines
  const securityEngine = new Fantasy42SecurityEngine();
  const complianceEngine = new Fantasy42ComplianceEngine();
  const analyticsEngine = new Fantasy42AnalyticsEngine();

  const bettingEngine = new Fantasy42BettingEngine(
    securityEngine,
    complianceEngine,
    analyticsEngine,
    {
      minBetAmount: 1,
      maxBetAmount: 10000,
      enableRiskManagement: true,
    }
  );

  await bettingEngine.initialize();

  // Create integrator
  const integrator = new BettingEngineIntegrator(
    bettingEngine,
    userSystem,
    paymentSystem,
    analyticsSystem,
    complianceSystem,
    notificationSystem
  );

  console.log('✅ Betting Engine Integration setup complete');

  // Example usage
  try {
    // Add a test game
    bettingEngine.addGame({
      id: 'test-game-1',
      sport: 'NFL',
      homeTeam: { id: 'home', name: 'Home Team', abbreviation: 'HOM' },
      awayTeam: { id: 'away', name: 'Away Team', abbreviation: 'AWY' },
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
    });

    // Place bet through integrator
    const bet = await integrator.placeBet(
      'user-123',
      'test-game-1',
      'MONEYLINE',
      100,
      { american: -150, decimal: 1.667, fractional: '2/3', impliedProbability: 0.6 },
      'home',
      { source: 'integration-test' }
    );

    console.log('✅ Integration test bet placed:', bet.id);

    // Get system health
    const health = await integrator.getSystemHealth();
    console.log('🏥 System health:', health.overall);
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }

  return integrator;
}

// ============================================================================
// RUN INTEGRATION EXAMPLE
// ============================================================================

if (import.meta.main) {
  setupBettingEngineIntegration()
    .then(integrator => {
      console.log('\n🎉 Betting Engine Integration example completed!');
      console.log('🔗 All systems successfully integrated');
    })
    .catch(error => {
      console.error('\n💥 Integration setup failed:', error);
      process.exit(1);
    });
}

export { BettingEngineIntegrator, setupBettingEngineIntegration };
