/**
 * Event Workflows
 * Domain-Driven Design Implementation
 *
 * Predefined event workflows for common business scenarios
 */

import { DomainEvents } from './domain-events';
import { DomainOrchestrator } from '../domain-orchestrator';
import { Fantasy402Gateway } from '../../external/fantasy402/gateway/fantasy402-gateway';
import { BalanceController } from '../../balance/balance.controller';
import { CollectionsController } from '../../collections/collections.controller';

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  timeout?: number; // in milliseconds
  retryAttempts?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  event: string;
  condition?: (payload: any) => boolean;
  action: (payload: any, context: WorkflowContext) => Promise<void>;
  timeout?: number;
  required: boolean;
}

export interface WorkflowContext {
  workflowId: string;
  startedAt: Date;
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];
  data: Map<string, any>;
  orchestrator: DomainOrchestrator;
}

export class EventWorkflows {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private activeWorkflows: Map<string, WorkflowContext> = new Map();
  private events: DomainEvents;

  constructor(
    private orchestrator: DomainOrchestrator,
    private balanceController: BalanceController,
    private collectionsController: CollectionsController,
    private fantasyGateway: Fantasy402Gateway
  ) {
    this.events = DomainEvents.getInstance();
    this.setupWorkflows();
    this.setupWorkflowHandlers();
  }

  /**
   * Setup predefined workflows
   */
  private setupWorkflows(): void {
    // Customer Deposit Workflow
    this.workflows.set('customer_deposit', {
      name: 'Customer Deposit',
      description: 'Complete customer deposit process with balance update and notifications',
      trigger: 'deposit.initiated',
      timeout: 300000, // 5 minutes
      retryAttempts: 3,
      steps: [
        {
          id: 'validate_payment',
          name: 'Validate Payment',
          event: 'payment.validation_required',
          action: async (payload, context) => {
            // Validate payment data
            if (!payload.amount || payload.amount <= 0) {
              throw new Error('Invalid payment amount');
            }
            context.data.set('validated_payment', payload);
          },
          required: true,
        },
        {
          id: 'process_collection',
          name: 'Process Collection',
          event: 'collection.processing_required',
          action: async (payload, context) => {
            const validatedPayment = context.data.get('validated_payment');
            const result = await this.orchestrator.processCustomerDeposit(validatedPayment);
            context.data.set('collection_result', result);
          },
          required: true,
        },
        {
          id: 'send_confirmation',
          name: 'Send Confirmation',
          event: 'notification.confirmation_required',
          action: async (payload, context) => {
            const collectionResult = context.data.get('collection_result');
            await this.events.publish('notification.payment_confirmed', {
              customerId: collectionResult.result.playerId,
              amount: collectionResult.result.amount,
              paymentId: collectionResult.result.paymentId,
            });
          },
          required: false,
        },
      ],
    });

    // High-Value Bet Approval Workflow
    this.workflows.set('high_value_bet_approval', {
      name: 'High-Value Bet Approval',
      description: 'Approval workflow for bets exceeding risk thresholds',
      trigger: 'bet.high_value_detected',
      timeout: 600000, // 10 minutes
      retryAttempts: 2,
      steps: [
        {
          id: 'risk_assessment',
          name: 'Risk Assessment',
          event: 'risk.assessment_required',
          condition: payload => payload.amount > 1000,
          action: async (payload, context) => {
            // Perform risk assessment
            const riskScore = payload.amount > 5000 ? 80 : 60;
            context.data.set('risk_score', riskScore);

            if (riskScore > 75) {
              await this.events.publish('approval.required', {
                betId: payload.betId,
                agentId: payload.agentId,
                amount: payload.amount,
                riskScore,
              });
            }
          },
          required: true,
        },
        {
          id: 'manager_approval',
          name: 'Manager Approval',
          event: 'approval.manager_review',
          action: async (payload, context) => {
            // In real implementation, this would wait for manager approval
            const approved = context.data.get('risk_score') < 90; // Auto-approve lower risk
            context.data.set('approved', approved);

            if (approved) {
              await this.events.publish('bet.approved', payload);
            } else {
              await this.events.publish('bet.rejected', {
                ...payload,
                reason: 'High risk - requires manual review',
              });
            }
          },
          required: true,
          timeout: 300000, // 5 minutes for approval
        },
      ],
    });

    // Agent Balance Synchronization Workflow
    this.workflows.set('balance_sync', {
      name: 'Balance Synchronization',
      description: 'Sync agent balances between internal and external systems',
      trigger: 'balance.sync_required',
      timeout: 180000, // 3 minutes
      retryAttempts: 3,
      steps: [
        {
          id: 'fetch_external_balance',
          name: 'Fetch External Balance',
          event: 'external.balance_fetch_required',
          action: async (payload, context) => {
            const account = await this.fantasyGateway.getAgentAccount(payload.agentId);
            context.data.set('external_balance', account?.getCurrentBalance().getAmount() || 0);
          },
          required: true,
        },
        {
          id: 'compare_balances',
          name: 'Compare Balances',
          event: 'balance.comparison_required',
          action: async (payload, context) => {
            const externalBalance = context.data.get('external_balance');
            const internalResponse = await this.balanceController.getBalanceStatus(payload.agentId);

            if (!internalResponse.success) {
              throw new Error('Internal balance not found');
            }

            const internalBalance = internalResponse.balance!.getCurrentBalance();
            const difference = externalBalance - internalBalance;

            context.data.set('balance_difference', difference);
            context.data.set('internal_balance', internalBalance);

            if (Math.abs(difference) > 0.01) {
              // Allow for small rounding differences
              await this.events.publish('balance.discrepancy_detected', {
                agentId: payload.agentId,
                externalBalance,
                internalBalance,
                difference,
              });
            }
          },
          required: true,
        },
        {
          id: 'sync_if_needed',
          name: 'Sync If Needed',
          event: 'balance.sync_action_required',
          condition: payload => Math.abs(payload.difference || 0) > 0.01,
          action: async (payload, context) => {
            const difference = context.data.get('balance_difference');

            if (Math.abs(difference) > 0.01) {
              // Sync internal balance to match external
              await this.balanceController.processBalanceChange({
                customerId: payload.agentId,
                amount: Math.abs(difference),
                changeType: difference > 0 ? 'credit' : 'debit',
                reason: 'Balance synchronization with external system',
                performedBy: 'system',
              });

              await this.events.publish('balance.sync_completed', {
                agentId: payload.agentId,
                adjustment: difference,
                syncedAt: new Date(),
              });
            }
          },
          required: false,
        },
      ],
    });

    // Bonus Award Workflow
    this.workflows.set('bonus_award', {
      name: 'Bonus Award',
      description: 'Award bonuses based on customer activity and eligibility',
      trigger: 'bonus.eligibility_checked',
      timeout: 120000, // 2 minutes
      retryAttempts: 2,
      steps: [
        {
          id: 'check_eligibility',
          name: 'Check Eligibility',
          event: 'bonus.eligibility_verification',
          condition: payload => payload.eligible === true,
          action: async (payload, context) => {
            // Additional eligibility checks
            const balanceResponse = await this.balanceController.getBalanceStatus(
              payload.customerId
            );
            const isEligible = balanceResponse.success && balanceResponse.balance!.getIsActive();

            context.data.set('bonus_eligible', isEligible);
            context.data.set('current_balance', balanceResponse.balance?.getCurrentBalance());
          },
          required: true,
        },
        {
          id: 'calculate_bonus',
          name: 'Calculate Bonus',
          event: 'bonus.calculation_required',
          condition: payload => payload.eligible === true,
          action: async (payload, context) => {
            const currentBalance = context.data.get('current_balance');
            const paymentAmount = payload.paymentAmount || 0;

            // Simple bonus calculation
            let bonusAmount = 0;
            if (paymentAmount >= 100)
              bonusAmount = paymentAmount * 0.05; // 5% bonus
            else if (paymentAmount >= 50) bonusAmount = 5; // $5 bonus

            context.data.set('bonus_amount', bonusAmount);
          },
          required: true,
        },
        {
          id: 'award_bonus',
          name: 'Award Bonus',
          event: 'bonus.award_required',
          condition: payload => (payload.bonusAmount || 0) > 0,
          action: async (payload, context) => {
            const bonusAmount = context.data.get('bonus_amount');

            if (bonusAmount > 0) {
              await this.balanceController.processBalanceChange({
                customerId: payload.customerId,
                amount: bonusAmount,
                changeType: 'credit',
                reason: 'Payment bonus reward',
                performedBy: 'system',
              });

              await this.events.publish('bonus.awarded', {
                customerId: payload.customerId,
                bonusAmount,
                reason: 'Payment bonus',
                awardedAt: new Date(),
              });
            }
          },
          required: false,
        },
      ],
    });
  }

  /**
   * Setup workflow event handlers
   */
  private setupWorkflowHandlers(): void {
    // Handle workflow triggers
    this.workflows.forEach((workflow, workflowName) => {
      this.events.subscribe(workflow.trigger, async event => {
        await this.startWorkflow(workflowName, event.payload);
      });
    });
  }

  /**
   * Start a workflow
   */
  public async startWorkflow(workflowName: string, initialPayload: any): Promise<string> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 Starting workflow: ${workflowName} (${workflowId})`);

    const context: WorkflowContext = {
      workflowId,
      startedAt: new Date(),
      currentStep: 0,
      completedSteps: [],
      failedSteps: [],
      data: new Map(),
      orchestrator: this.orchestrator,
    };

    this.activeWorkflows.set(workflowId, context);

    try {
      await this.executeWorkflow(workflow, context, initialPayload);
      console.log(`✅ Workflow completed: ${workflowName} (${workflowId})`);
    } catch (error) {
      console.error(`❌ Workflow failed: ${workflowName} (${workflowId})`, error);
      context.failedSteps.push(`workflow_error: ${error.message}`);
    }

    return workflowId;
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    initialPayload: any
  ): Promise<void> {
    let currentPayload = initialPayload;

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      context.currentStep = i;

      try {
        console.log(`📋 Executing step: ${step.name} (${step.id})`);

        // Check condition if specified
        if (step.condition && !step.condition(currentPayload)) {
          console.log(`⏭️ Skipping step: ${step.name} (condition not met)`);
          continue;
        }

        // Publish step event
        await this.events.publish(step.event, currentPayload);

        // Execute step action
        const result = await step.action(currentPayload, context);

        // Mark step as completed
        context.completedSteps.push(step.id);
        console.log(`✅ Step completed: ${step.name} (${step.id})`);
      } catch (error) {
        context.failedSteps.push(step.id);

        if (step.required) {
          throw new Error(`Required step failed: ${step.name} - ${error.message}`);
        } else {
          console.warn(`⚠️ Optional step failed: ${step.name} - ${error.message}`);
        }
      }
    }
  }

  /**
   * Get workflow status
   */
  public getWorkflowStatus(workflowId: string): WorkflowContext | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Get all active workflows
   */
  public getActiveWorkflows(): WorkflowContext[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get available workflows
   */
  public getAvailableWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Get workflow definition
   */
  public getWorkflowDefinition(workflowName: string): WorkflowDefinition | null {
    return this.workflows.get(workflowName) || null;
  }

  /**
   * Manually trigger a workflow
   */
  public async triggerWorkflow(workflowName: string, payload: any): Promise<string> {
    return await this.startWorkflow(workflowName, payload);
  }

  /**
   * Clean up completed workflows
   */
  public cleanupCompletedWorkflows(olderThanMinutes: number = 60): number {
    const cutoffTime = Date.now() - olderThanMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [workflowId, context] of this.activeWorkflows.entries()) {
      const totalSteps = context.completedSteps.length + context.failedSteps.length;
      const isCompleted = totalSteps > 0; // Simplified completion check

      if (isCompleted && context.startedAt.getTime() < cutoffTime) {
        this.activeWorkflows.delete(workflowId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get workflow statistics
   */
  public getStats(): {
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
  } {
    const workflows = Array.from(this.activeWorkflows.values());
    const completedWorkflows = workflows.filter(
      w => w.completedSteps.length > 0 && w.failedSteps.length === 0
    );
    const failedWorkflows = workflows.filter(w => w.failedSteps.length > 0);

    return {
      totalWorkflows: this.workflows.size,
      activeWorkflows: workflows.length,
      completedWorkflows: completedWorkflows.length,
      failedWorkflows: failedWorkflows.length,
    };
  }
}
