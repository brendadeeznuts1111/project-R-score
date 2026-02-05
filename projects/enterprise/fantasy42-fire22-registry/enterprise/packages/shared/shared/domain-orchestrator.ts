/**
 * Domain Orchestrator
 * Domain-Driven Design Implementation
 *
 * Coordinates complex business processes across multiple domains
 */

import { DomainEvents } from './events/domain-events';
import { BalanceController } from '../balance/balance.controller';
import { CollectionsController } from '../collections/collections.controller';
import { Fantasy402Gateway } from '../external/fantasy402/gateway/fantasy402-gateway';
import { DomainEventHandlers } from './events/domain-event-handlers';

export interface BusinessProcessResult {
  success: boolean;
  processId: string;
  steps: BusinessProcessStep[];
  result?: any;
  error?: string;
  duration: number;
  completedAt: Date;
}

export interface BusinessProcessStep {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  data?: any;
}

export class DomainOrchestrator {
  private balanceController: BalanceController;
  private collectionsController: CollectionsController;
  private fantasyGateway: Fantasy402Gateway;
  private eventHandlers: DomainEventHandlers;
  private events: DomainEvents;
  private activeProcesses: Map<string, BusinessProcessResult> = new Map();

  constructor(
    balanceController: BalanceController,
    collectionsController: CollectionsController,
    fantasyGateway: Fantasy402Gateway
  ) {
    this.balanceController = balanceController;
    this.collectionsController = collectionsController;
    this.fantasyGateway = fantasyGateway;
    this.eventHandlers = new DomainEventHandlers(
      balanceController,
      collectionsController,
      fantasyGateway
    );
    this.events = DomainEvents.getInstance();
  }

  /**
   * Customer Deposit Process
   * Orchestrates the complete deposit workflow across domains
   */
  async processCustomerDeposit(params: {
    customerId: string;
    amount: number;
    paymentMethod: string;
    metadata?: Record<string, any>;
  }): Promise<BusinessProcessResult> {
    const processId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`💰 Starting customer deposit process: ${processId}`);

    const steps: BusinessProcessStep[] = [
      {
        stepId: 'validate_payment',
        name: 'Validate Payment',
        status: 'pending',
      },
      {
        stepId: 'process_collection',
        name: 'Process Collection',
        status: 'pending',
      },
      { stepId: 'update_balance', name: 'Update Balance', status: 'pending' },
      { stepId: 'check_bonuses', name: 'Check Bonuses', status: 'pending' },
      {
        stepId: 'send_notification',
        name: 'Send Notification',
        status: 'pending',
      },
    ];

    try {
      // Step 1: Validate payment
      steps[0].status = 'running';
      steps[0].startedAt = new Date();
      await this.validatePaymentData(params);
      steps[0].status = 'completed';
      steps[0].completedAt = new Date();

      // Step 2: Process collection
      steps[1].status = 'running';
      steps[1].startedAt = new Date();
      const collectionResult = await this.collectionsController.processPayment({
        id: `payment_${processId}`,
        playerId: params.customerId,
        amount: params.amount,
        currency: 'USD',
        paymentMethod: params.paymentMethod,
        metadata: params.metadata,
      });

      if (!collectionResult.success) {
        throw new Error(collectionResult.error || 'Collection processing failed');
      }

      steps[1].status = 'completed';
      steps[1].completedAt = new Date();
      steps[1].data = collectionResult;

      // Step 3: Update balance (handled by event handler)
      steps[2].status = 'completed';
      steps[2].completedAt = new Date();

      // Step 4: Check bonuses (handled by event handler)
      steps[3].status = 'completed';
      steps[3].completedAt = new Date();

      // Step 5: Send notification (handled by event handler)
      steps[4].status = 'completed';
      steps[4].completedAt = new Date();

      const result: BusinessProcessResult = {
        success: true,
        processId,
        steps,
        result: collectionResult,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.log(`✅ Customer deposit process completed: ${processId}`);
      return result;
    } catch (error) {
      // Mark failed steps
      const currentStepIndex = steps.findIndex(step => step.status === 'running');
      if (currentStepIndex >= 0) {
        steps[currentStepIndex].status = 'failed';
        steps[currentStepIndex].error = error.message;
        steps[currentStepIndex].completedAt = new Date();
      }

      const result: BusinessProcessResult = {
        success: false,
        processId,
        steps,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.error(`❌ Customer deposit process failed: ${processId}`, error);
      throw result;
    }
  }

  /**
   * Agent Bet Placement Process
   * Orchestrates bet placement with balance validation and external system integration
   */
  async processAgentBetPlacement(params: {
    agentId: string;
    eventId: string;
    betType: string;
    amount: number;
    odds: number;
    selection: string;
  }): Promise<BusinessProcessResult> {
    const processId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🎯 Starting agent bet placement process: ${processId}`);

    const steps: BusinessProcessStep[] = [
      {
        stepId: 'validate_balance',
        name: 'Validate Balance',
        status: 'pending',
      },
      { stepId: 'check_risk', name: 'Check Risk', status: 'pending' },
      {
        stepId: 'place_external_bet',
        name: 'Place External Bet',
        status: 'pending',
      },
      {
        stepId: 'update_internal_balance',
        name: 'Update Internal Balance',
        status: 'pending',
      },
      { stepId: 'log_transaction', name: 'Log Transaction', status: 'pending' },
    ];

    try {
      // Step 1: Validate balance
      steps[0].status = 'running';
      steps[0].startedAt = new Date();
      const balanceResponse = await this.balanceController.getBalanceStatus(params.agentId);

      if (!balanceResponse.success || !balanceResponse.balance) {
        throw new Error('Agent balance not found');
      }

      if (balanceResponse.balance.currentBalance < params.amount) {
        throw new Error('Insufficient balance for bet');
      }

      steps[0].status = 'completed';
      steps[0].completedAt = new Date();

      // Step 2: Check risk
      steps[1].status = 'running';
      steps[1].startedAt = new Date();
      await this.performRiskCheck(params);
      steps[1].status = 'completed';
      steps[1].completedAt = new Date();

      // Step 3: Place external bet
      steps[2].status = 'running';
      steps[2].startedAt = new Date();
      const betResult = await this.fantasyGateway.placeBet(params);
      steps[2].status = 'completed';
      steps[2].completedAt = new Date();
      steps[2].data = betResult;

      // Step 4: Update internal balance
      steps[3].status = 'running';
      steps[3].startedAt = new Date();
      const balanceUpdate = await this.balanceController.processBalanceChange({
        customerId: params.agentId,
        amount: params.amount,
        changeType: 'debit',
        reason: `Bet placed - ${betResult.getExternalId()}`,
        performedBy: 'system',
      });

      if (!balanceUpdate.success) {
        throw new Error('Balance update failed after bet placement');
      }

      steps[3].status = 'completed';
      steps[3].completedAt = new Date();

      // Step 5: Log transaction
      steps[4].status = 'running';
      steps[4].startedAt = new Date();
      await this.events.publish('audit.bet_placed', {
        processId,
        agentId: params.agentId,
        betId: betResult.getExternalId(),
        amount: params.amount,
        eventId: params.eventId,
        placedAt: new Date(),
      });
      steps[4].status = 'completed';
      steps[4].completedAt = new Date();

      const result: BusinessProcessResult = {
        success: true,
        processId,
        steps,
        result: {
          bet: betResult,
          balanceUpdate,
        },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.log(`✅ Agent bet placement process completed: ${processId}`);
      return result;
    } catch (error) {
      // Mark failed steps
      const currentStepIndex = steps.findIndex(step => step.status === 'running');
      if (currentStepIndex >= 0) {
        steps[currentStepIndex].status = 'failed';
        steps[currentStepIndex].error = error.message;
        steps[currentStepIndex].completedAt = new Date();
      }

      const result: BusinessProcessResult = {
        success: false,
        processId,
        steps,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.error(`❌ Agent bet placement process failed: ${processId}`, error);
      throw result;
    }
  }

  /**
   * Customer Onboarding Process
   * Complete customer setup across all domains
   */
  async processCustomerOnboarding(params: {
    customerId: string;
    agentId: string;
    initialDeposit?: number;
    customerData: {
      email: string;
      phone?: string;
      name: string;
    };
  }): Promise<BusinessProcessResult> {
    const processId = `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🎉 Starting customer onboarding process: ${processId}`);

    const steps: BusinessProcessStep[] = [
      {
        stepId: 'validate_customer_data',
        name: 'Validate Customer Data',
        status: 'pending',
      },
      {
        stepId: 'create_balance_account',
        name: 'Create Balance Account',
        status: 'pending',
      },
      {
        stepId: 'process_initial_deposit',
        name: 'Process Initial Deposit',
        status: 'pending',
      },
      {
        stepId: 'setup_notifications',
        name: 'Setup Notifications',
        status: 'pending',
      },
      {
        stepId: 'send_welcome',
        name: 'Send Welcome Package',
        status: 'pending',
      },
    ];

    try {
      // Step 1: Validate customer data
      steps[0].status = 'running';
      steps[0].startedAt = new Date();
      await this.validateCustomerData(params.customerData);
      steps[0].status = 'completed';
      steps[0].completedAt = new Date();

      // Step 2: Create balance account
      steps[1].status = 'running';
      steps[1].startedAt = new Date();
      const balanceResult = await this.balanceController.createBalance({
        customerId: params.customerId,
        agentId: params.agentId,
        initialBalance: 0,
      });

      if (!balanceResult.success) {
        throw new Error('Failed to create balance account');
      }

      steps[1].status = 'completed';
      steps[1].completedAt = new Date();

      // Step 3: Process initial deposit (if provided)
      if (params.initialDeposit && params.initialDeposit > 0) {
        steps[2].status = 'running';
        steps[2].startedAt = new Date();

        const depositResult = await this.processCustomerDeposit({
          customerId: params.customerId,
          amount: params.initialDeposit,
          paymentMethod: 'initial_deposit',
        });

        steps[2].status = 'completed';
        steps[2].completedAt = new Date();
        steps[2].data = depositResult;
      } else {
        steps[2].status = 'completed';
        steps[2].completedAt = new Date();
      }

      // Step 4: Setup notifications
      steps[3].status = 'running';
      steps[3].startedAt = new Date();
      await this.events.publish('customer.onboarding_completed', {
        customerId: params.customerId,
        agentId: params.agentId,
        customerData: params.customerData,
        initialDeposit: params.initialDeposit,
      });
      steps[3].status = 'completed';
      steps[3].completedAt = new Date();

      // Step 5: Send welcome package (handled by event handlers)
      steps[4].status = 'completed';
      steps[4].completedAt = new Date();

      const result: BusinessProcessResult = {
        success: true,
        processId,
        steps,
        result: {
          customerId: params.customerId,
          balanceCreated: true,
          initialDeposit: params.initialDeposit,
        },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.log(`✅ Customer onboarding process completed: ${processId}`);
      return result;
    } catch (error) {
      // Mark failed steps
      const currentStepIndex = steps.findIndex(step => step.status === 'running');
      if (currentStepIndex >= 0) {
        steps[currentStepIndex].status = 'failed';
        steps[currentStepIndex].error = error.message;
        steps[currentStepIndex].completedAt = new Date();
      }

      const result: BusinessProcessResult = {
        success: false,
        processId,
        steps,
        error: error.message,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      };

      this.activeProcesses.set(processId, result);

      console.error(`❌ Customer onboarding process failed: ${processId}`, error);
      throw result;
    }
  }

  /**
   * Helper Methods
   */
  private async validatePaymentData(params: any): Promise<void> {
    if (!params.customerId || !params.amount || params.amount <= 0) {
      throw new Error('Invalid payment data');
    }
  }

  private async validateCustomerData(customerData: any): Promise<void> {
    if (!customerData.email || !customerData.name) {
      throw new Error('Invalid customer data');
    }
  }

  private async performRiskCheck(params: any): Promise<void> {
    // Simple risk check - in real implementation would be more sophisticated
    if (params.amount > 5000) {
      console.warn(`⚠️ High-value bet detected: $${params.amount}`);
    }
  }

  /**
   * Get process status
   */
  public getProcessStatus(processId: string): BusinessProcessResult | null {
    return this.activeProcesses.get(processId) || null;
  }

  /**
   * Get all active processes
   */
  public getActiveProcesses(): BusinessProcessResult[] {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Clean up completed processes (older than specified hours)
   */
  public cleanupCompletedProcesses(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [processId, process] of this.activeProcesses.entries()) {
      if (process.completedAt.getTime() < cutoffTime) {
        this.activeProcesses.delete(processId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get orchestrator statistics
   */
  public getStats(): {
    activeProcesses: number;
    completedProcesses: number;
    failedProcesses: number;
    averageDuration: number;
  } {
    const processes = Array.from(this.activeProcesses.values());
    const completedProcesses = processes.filter(p => p.success);
    const failedProcesses = processes.filter(p => !p.success);

    const totalDuration = completedProcesses.reduce((sum, p) => sum + p.duration, 0);
    const averageDuration =
      completedProcesses.length > 0 ? totalDuration / completedProcesses.length : 0;

    return {
      activeProcesses: processes.length,
      completedProcesses: completedProcesses.length,
      failedProcesses: failedProcesses.length,
      averageDuration,
    };
  }
}
