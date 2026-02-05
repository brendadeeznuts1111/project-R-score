/**
 * Domain Event Handlers
 * Domain-Driven Design Implementation
 *
 * Centralized event handlers for cross-domain communication
 */

import { DomainEvents } from './domain-events';
import { BalanceController } from '../../balance/balance.controller';
import { CollectionsController } from '../../collections/collections.controller';
import { Fantasy402Gateway } from '../../external/fantasy402/gateway/fantasy402-gateway';
import { ExternalEventMapper } from '../../external/shared/external-event-mapper';

export class DomainEventHandlers {
  private balanceController: BalanceController;
  private collectionsController: CollectionsController;
  private fantasyGateway: Fantasy402Gateway;
  private eventMapper: ExternalEventMapper;
  private events: DomainEvents;

  constructor(
    balanceController: BalanceController,
    collectionsController: CollectionsController,
    fantasyGateway: Fantasy402Gateway
  ) {
    this.balanceController = balanceController;
    this.collectionsController = collectionsController;
    this.fantasyGateway = fantasyGateway;
    this.eventMapper = new ExternalEventMapper(DomainEvents.getInstance());
    this.events = DomainEvents.getInstance();

    this.setupEventHandlers();
  }

  /**
   * Set up all domain event handlers
   */
  private setupEventHandlers(): void {
    console.log('🔄 Setting up domain event handlers...');

    // Collections Domain Event Handlers
    this.setupCollectionsEventHandlers();

    // Balance Domain Event Handlers
    this.setupBalanceEventHandlers();

    // External Integration Event Handlers
    this.setupExternalEventHandlers();

    // Cross-domain Business Process Handlers
    this.setupBusinessProcessHandlers();

    console.log('✅ Domain event handlers configured successfully');
  }

  /**
   * Collections Domain Event Handlers
   */
  private setupCollectionsEventHandlers(): void {
    // When a payment is processed, update balance and send notifications
    this.events.subscribe('payment.processed', async event => {
      console.log('💳 Processing payment event:', event.payload);

      try {
        // Update customer balance
        await this.handlePaymentBalanceUpdate(event.payload);

        // Send payment confirmation
        await this.handlePaymentNotification(event.payload);

        // Check for bonus eligibility
        await this.handleBonusEligibilityCheck(event.payload);
      } catch (error) {
        console.error('❌ Failed to process payment event:', error);
        await this.events.publish('payment.processing_failed', {
          paymentId: event.payload.paymentId,
          error: error.message,
          originalEvent: event.payload,
        });
      }
    });

    // Handle payment failures
    this.events.subscribe('payment.failed', async event => {
      console.log('❌ Processing payment failure:', event.payload);

      // Log failure for audit
      await this.events.publish('audit.payment_failure_logged', {
        paymentId: event.payload.paymentId,
        error: event.payload.error,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Balance Domain Event Handlers
   */
  private setupBalanceEventHandlers(): void {
    // Handle low balance alerts
    this.events.subscribe('balance.threshold.exceeded', async event => {
      console.log('⚠️ Processing low balance alert:', event.payload);

      // Send balance warning notification
      await this.events.publish('notification.balance_warning', {
        customerId: event.payload.customerId,
        currentBalance: event.payload.currentBalance,
        threshold: event.payload.threshold,
        severity: event.payload.severity || 'warning',
      });
    });

    // Handle balance freeze/unfreeze events
    this.events.subscribe('balance.frozen', async event => {
      console.log('🧊 Processing balance freeze:', event.payload);

      // Notify relevant parties
      await this.events.publish('notification.account_frozen', {
        customerId: event.payload.customerId,
        reason: event.payload.reason,
        performedBy: event.payload.performedBy,
      });
    });

    this.events.subscribe('balance.unfrozen', async event => {
      console.log('🧊 Processing balance unfreeze:', event.payload);

      await this.events.publish('notification.account_unfrozen', {
        customerId: event.payload.customerId,
        performedBy: event.payload.performedBy,
      });
    });
  }

  /**
   * External Integration Event Handlers
   */
  private setupExternalEventHandlers(): void {
    // Handle external sport events
    this.events.subscribe('external.sport_event.live', async event => {
      console.log('🏈 Processing live sport event:', event.payload);

      // Update any relevant internal state
      await this.events.publish('internal.sport_event_available', {
        externalId: event.payload.externalId,
        sport: event.payload.sport,
        league: event.payload.league,
        teams: `${event.payload.homeTeam} vs ${event.payload.awayTeam}`,
        startTime: event.payload.startTime,
      });
    });

    // Handle external bet placements
    this.events.subscribe('external.bet.received', async event => {
      console.log('🎯 Processing external bet:', event.payload);

      // Validate agent balance
      await this.validateBetBalance(event.payload);

      // Update internal bet tracking
      await this.events.publish('internal.bet_recorded', {
        externalBetId: event.payload.externalId,
        agentId: event.payload.agentId,
        eventId: event.payload.eventId,
        amount: event.payload.amount,
        odds: event.payload.odds,
      });
    });

    // Handle external bet settlements
    this.events.subscribe('external.bet.settled', async event => {
      console.log('💰 Processing bet settlement:', event.payload);

      // Update agent balance based on settlement
      if (event.payload.result === 'won') {
        await this.handleBetWin(event.payload);
      } else if (event.payload.result === 'lost') {
        await this.handleBetLoss(event.payload);
      }
    });

    // Handle external balance updates
    this.events.subscribe('external.agent.balance_updated', async event => {
      console.log('💵 Processing external balance update:', event.payload);

      // Sync internal balance with external system
      await this.syncAgentBalance(event.payload);
    });
  }

  /**
   * Business Process Event Handlers
   */
  private setupBusinessProcessHandlers(): void {
    // Handle customer onboarding completion
    this.events.subscribe('customer.onboarding_completed', async event => {
      console.log('🎉 Processing customer onboarding:', event.payload);

      // Create initial balance account
      await this.createInitialBalance(event.payload);

      // Send welcome notifications
      await this.sendWelcomePackage(event.payload);

      // Check for signup bonuses
      await this.processSignupBonuses(event.payload);
    });

    // Handle bonus eligibility
    this.events.subscribe('bonus.eligibility_checked', async event => {
      console.log('🎁 Processing bonus eligibility:', event.payload);

      if (event.payload.eligible) {
        await this.awardBonus(event.payload);
      }
    });

    // Handle risk assessment triggers
    this.events.subscribe('risk.assessment_required', async event => {
      console.log('🔍 Processing risk assessment:', event.payload);

      // Perform risk assessment
      const riskScore = await this.performRiskAssessment(event.payload);

      // Publish risk assessment result
      await this.events.publish('risk.assessment_completed', {
        customerId: event.payload.customerId,
        riskScore,
        assessmentDate: new Date(),
        factors: event.payload.factors,
      });
    });
  }

  /**
   * Business Logic Handlers
   */
  private async handlePaymentBalanceUpdate(payment: any): Promise<void> {
    // Update customer balance
    const balanceResponse = await this.balanceController.processBalanceChange({
      customerId: payment.playerId,
      amount: payment.amount,
      changeType: 'credit',
      reason: 'Payment processed',
      performedBy: 'system',
    });

    if (!balanceResponse.success) {
      throw new Error(`Balance update failed: ${balanceResponse.error}`);
    }
  }

  private async handlePaymentNotification(payment: any): Promise<void> {
    await this.events.publish('notification.payment_confirmation', {
      customerId: payment.playerId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      timestamp: new Date(),
    });
  }

  private async handleBonusEligibilityCheck(payment: any): Promise<void> {
    // Check if customer is eligible for bonuses based on payment history
    const eligibilityResponse = await this.balanceController.getBalanceStatus(payment.playerId);

    if (eligibilityResponse.success && eligibilityResponse.balance) {
      await this.events.publish('bonus.eligibility_checked', {
        customerId: payment.playerId,
        paymentAmount: payment.amount,
        balance: eligibilityResponse.balance.currentBalance,
        eligible: payment.amount >= 50, // Example: $50+ payments eligible for bonus
      });
    }
  }

  private async validateBetBalance(bet: any): Promise<void> {
    const balanceResponse = await this.balanceController.getBalanceStatus(bet.agentId);

    if (!balanceResponse.success || !balanceResponse.balance) {
      throw new Error(`Agent balance not found: ${bet.agentId}`);
    }

    if (balanceResponse.balance.currentBalance < bet.amount) {
      await this.events.publish('bet.rejected_insufficient_funds', {
        betId: bet.externalId,
        agentId: bet.agentId,
        requiredAmount: bet.amount,
        availableBalance: balanceResponse.balance.currentBalance,
      });
      throw new Error('Insufficient funds for bet');
    }
  }

  private async handleBetWin(settlement: any): Promise<void> {
    const payout = settlement.payout || 0;

    await this.balanceController.processBalanceChange({
      customerId: settlement.agentId,
      amount: payout,
      changeType: 'credit',
      reason: `Bet win settlement - ${settlement.externalId}`,
      performedBy: 'system',
    });
  }

  private async handleBetLoss(settlement: any): Promise<void> {
    // Loss already deducted when bet was placed
    // Just log the settlement for audit
    await this.events.publish('audit.bet_loss_settled', {
      betId: settlement.externalId,
      agentId: settlement.agentId,
      amount: settlement.payout || 0,
      settledAt: settlement.settledAt,
    });
  }

  private async syncAgentBalance(balanceUpdate: any): Promise<void> {
    // Sync external balance changes with internal system
    await this.events.publish('internal.balance_synced', {
      agentId: balanceUpdate.agentId,
      externalBalance: balanceUpdate.newBalance,
      internalBalance: balanceUpdate.newBalance, // Would compare with internal
      syncedAt: new Date(),
    });
  }

  private async createInitialBalance(customer: any): Promise<void> {
    const balanceResponse = await this.balanceController.createBalance({
      customerId: customer.customerId,
      agentId: customer.agentId || 'SYSTEM',
      initialBalance: 0,
      limits: {
        minBalance: -100,
        maxBalance: 10000,
        warningThreshold: 50,
        criticalThreshold: 10,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      },
    });

    if (!balanceResponse.success) {
      throw new Error(`Failed to create initial balance: ${balanceResponse.error}`);
    }
  }

  private async sendWelcomePackage(customer: any): Promise<void> {
    await this.events.publish('notification.welcome_package', {
      customerId: customer.customerId,
      welcomeBonus: 10, // Example welcome bonus
      timestamp: new Date(),
    });
  }

  private async processSignupBonuses(customer: any): Promise<void> {
    // Process any signup bonuses or promotions
    await this.events.publish('bonus.signup_processed', {
      customerId: customer.customerId,
      bonusAmount: 10,
      bonusType: 'welcome_bonus',
      processedAt: new Date(),
    });
  }

  private async awardBonus(bonusData: any): Promise<void> {
    await this.balanceController.processBalanceChange({
      customerId: bonusData.customerId,
      amount: 10, // Example bonus amount
      changeType: 'credit',
      reason: 'Payment bonus reward',
      performedBy: 'system',
    });
  }

  private async performRiskAssessment(data: any): Promise<number> {
    // Simple risk assessment logic
    let riskScore = 0;

    // Example risk factors
    if (data.paymentAmount > 1000) riskScore += 20;
    if (data.dailyTransactions > 10) riskScore += 15;
    if (data.balance < 100) riskScore += 25;

    return Math.min(riskScore, 100);
  }

  /**
   * Get event handler statistics
   */
  public getHandlerStats(): {
    registeredHandlers: number;
    processedEvents: number;
    failedEvents: number;
  } {
    // This would track actual event processing stats
    return {
      registeredHandlers: 15, // Approximate count
      processedEvents: 0, // Would be tracked in real implementation
      failedEvents: 0,
    };
  }

  /**
   * Health check for event handlers
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
  }> {
    try {
      // Test event publishing
      await this.events.publish('health.check.test', {
        timestamp: new Date(),
        test: true,
      });

      return {
        status: 'healthy',
        message: 'Event handlers are functioning correctly',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Event handlers failed: ${error.message}`,
      };
    }
  }
}
