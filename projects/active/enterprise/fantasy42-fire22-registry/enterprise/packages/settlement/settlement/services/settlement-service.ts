/**
 * Settlement Domain Service - Domain-Driven Design Implementation
 * Payment settlement processing and reconciliation
 */

import {
  DomainError,
  ValidationError,
  EntityNotFoundError,
  BusinessRuleViolationError,
  ErrorBoundary,
  DomainErrorFactory,
} from '../../../core/errors/domain-errors';

import { DomainLogger, LoggerFactory, LogCategory } from '../../../core/logging/domain-logger';

import {
  Settlement,
  SettlementStatus,
  SettlementType,
  SettlementFees,
  SettlementSummary,
  SettlementFactory,
} from '../entities/settlement';

import { FeeCalculator } from '../value-objects/settlement-fees';

// Domain Events
export interface SettlementEvents {
  settlementCreated: {
    settlementId: string;
    paymentId: string;
    merchantId: string;
    amount: number;
    currency: string;
  };
  settlementProcessing: {
    settlementId: string;
    paymentId: string;
  };
  settlementCompleted: {
    settlementId: string;
    paymentId: string;
    merchantId: string;
    netAmount: number;
    bankReference?: string;
  };
  settlementFailed: {
    settlementId: string;
    paymentId: string;
    reason: string;
  };
  settlementBatchProcessed: {
    batchId: string;
    settlementCount: number;
    totalAmount: number;
    successCount: number;
    failureCount: number;
  };
}

// Business Rules
export interface SettlementRules {
  maxSettlementAmount: number;
  minSettlementAmount: number;
  maxProcessingDays: number;
  requireBankReference: boolean;
  allowWeekendProcessing: boolean;
  complianceThreshold: number;
}

// Domain Service - Business Logic
export class SettlementService {
  private readonly logger = LoggerFactory.create('settlement-service');
  private readonly errorFactory = new DomainErrorFactory('settlement');

  // Repository interface (would be injected in real implementation)
  private repository: SettlementRepository;

  // Business rules (configurable)
  private readonly rules: SettlementRules = {
    maxSettlementAmount: 50000, // $50,000 max per settlement
    minSettlementAmount: 1.0, // $1.00 min per settlement
    maxProcessingDays: 30, // 30 days max processing time
    requireBankReference: true, // Require bank reference for completion
    allowWeekendProcessing: false, // No weekend processing by default
    complianceThreshold: 10000, // $10,000 compliance review threshold
  };

  constructor(repository: SettlementRepository) {
    this.repository = repository;
  }

  /**
   * Create automated settlement for a payment
   */
  async createAutomatedSettlement(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    settlementDate?: Date
  ): Promise<Settlement> {
    return await this.logger.withTiming(
      async () => {
        return await ErrorBoundary.execute(
          async () => {
            await this.logger.business('Creating automated settlement', {
              operation: 'createAutomatedSettlement',
              paymentId,
              merchantId,
              amount,
              currency,
            });

            // Validate business rules
            await this.validateSettlementCreation(paymentId, merchantId, amount, currency);

            // Check if payment already has a settlement
            const existingSettlement = await this.repository.findByPaymentId(paymentId);
            if (existingSettlement && !existingSettlement.isFinal()) {
              throw this.errorFactory.businessRuleViolation(
                `Payment ${paymentId} already has an active settlement`,
                'duplicate_settlement'
              );
            }

            // Calculate settlement date (next business day if not specified)
            const finalSettlementDate = settlementDate || this.calculateNextSettlementDate();

            // Calculate fees based on amount and currency
            const baseFees = FeeCalculator.calculateStandardFees(amount);
            const adjustedFees = FeeCalculator.calculateCurrencyAdjustedFees(
              amount,
              currency,
              baseFees
            );

            // Check compliance threshold
            if (amount >= this.rules.complianceThreshold) {
              await this.logger.business('High-value settlement flagged for compliance review', {
                paymentId,
                amount,
                threshold: this.rules.complianceThreshold,
              });
            }

            // Create settlement entity
            const settlement = SettlementFactory.createAutomatedSettlement(
              paymentId,
              merchantId,
              amount,
              currency,
              finalSettlementDate,
              adjustedFees,
              `batch_${Date.now()}`
            );

            // Save to repository
            const savedSettlement = await this.repository.save(settlement);

            await this.logger.business(
              'Automated settlement created successfully',
              {
                operation: 'createAutomatedSettlement',
                entity: 'Settlement',
                entityId: savedSettlement.id,
                paymentId,
                merchantId,
                amount,
                currency,
                settlementDate: finalSettlementDate.toISOString(),
              },
              {
                settlementAmount: amount,
                feeAmount: adjustedFees.totalFees,
                netAmount: amount - adjustedFees.totalFees,
              }
            );

            // Publish domain event
            await this.publishEvent('settlementCreated', {
              settlementId: savedSettlement.id,
              paymentId: savedSettlement.paymentId,
              merchantId: savedSettlement.merchantId,
              amount: savedSettlement.amount,
              currency: savedSettlement.currency,
            });

            return savedSettlement;
          },
          {
            domain: 'settlement',
            operation: 'createAutomatedSettlement',
            paymentId,
            merchantId,
          }
        );
      },
      'createAutomatedSettlement',
      {
        domain: 'settlement',
        operation: 'createAutomatedSettlement',
        paymentId,
        merchantId,
      }
    );
  }

  /**
   * Process settlement batch
   */
  async processSettlementBatch(settlementIds: string[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    totalAmount: number;
  }> {
    return await ErrorBoundary.execute(
      async () => {
        const batchId = `batch_${Date.now()}`;
        let processed = 0;
        let successful = 0;
        let failed = 0;
        let totalAmount = 0;

        await this.logger.business('Starting settlement batch processing', {
          operation: 'processSettlementBatch',
          batchId,
          settlementCount: settlementIds.length,
        });

        for (const settlementId of settlementIds) {
          try {
            const settlement = await this.repository.findById(settlementId);
            if (!settlement) {
              await this.logger.business('Settlement not found, skipping', {
                settlementId,
                batchId,
              });
              failed++;
              continue;
            }

            if (settlement.status !== SettlementStatus.PENDING) {
              await this.logger.business('Settlement not in pending state, skipping', {
                settlementId,
                status: settlement.status,
                batchId,
              });
              continue;
            }

            // Process individual settlement
            await this.processIndividualSettlement(settlement);
            processed++;
            successful++;
            totalAmount += settlement.amount;
          } catch (error) {
            await this.logger.business('Settlement processing failed', {
              settlementId,
              batchId,
              error: error.message,
            });
            failed++;
            processed++;
          }
        }

        await this.logger.business('Settlement batch processing completed', {
          operation: 'processSettlementBatch',
          batchId,
          processed,
          successful,
          failed,
          totalAmount,
        });

        // Publish batch completion event
        await this.publishEvent('settlementBatchProcessed', {
          batchId,
          settlementCount: settlementIds.length,
          totalAmount,
          successCount: successful,
          failureCount: failed,
        });

        return { processed, successful, failed, totalAmount };
      },
      {
        domain: 'settlement',
        operation: 'processSettlementBatch',
      }
    );
  }

  /**
   * Complete settlement with bank reference
   */
  async completeSettlement(
    settlementId: string,
    bankReference: string,
    processingNotes?: string[]
  ): Promise<Settlement> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Completing settlement', {
          operation: 'completeSettlement',
          settlementId,
          bankReference,
        });

        const settlement = await this.repository.findById(settlementId);
        if (!settlement) {
          throw this.errorFactory.entityNotFound('Settlement', settlementId);
        }

        if (settlement.status !== SettlementStatus.PROCESSING) {
          throw this.errorFactory.businessRuleViolation(
            `Settlement ${settlementId} is not in processing state`,
            'invalid_settlement_status'
          );
        }

        // Add processing notes if provided
        if (processingNotes) {
          processingNotes.forEach(note => {
            if (!settlement.metadata.processingNotes) {
              settlement.metadata.processingNotes = [];
            }
            settlement.metadata.processingNotes.push(note);
          });
        }

        // Complete the settlement
        settlement.complete(bankReference);

        // Save updated settlement
        const updatedSettlement = await this.repository.save(settlement);

        await this.logger.business(
          'Settlement completed successfully',
          {
            operation: 'completeSettlement',
            entity: 'Settlement',
            entityId: settlementId,
            bankReference,
          },
          {
            netAmount: settlement.breakdown.netAmount,
            processingTime: Date.now() - settlement.createdAt.getTime(),
          }
        );

        // Publish completion event
        await this.publishEvent('settlementCompleted', {
          settlementId: updatedSettlement.id,
          paymentId: updatedSettlement.paymentId,
          merchantId: updatedSettlement.merchantId,
          netAmount: updatedSettlement.breakdown.netAmount,
          bankReference,
        });

        return updatedSettlement;
      },
      {
        domain: 'settlement',
        operation: 'completeSettlement',
        settlementId,
      }
    );
  }

  /**
   * Get settlement analytics and metrics
   */
  async getSettlementAnalytics(
    merchantId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalSettlements: number;
    totalAmount: number;
    successfulSettlements: number;
    failedSettlements: number;
    pendingSettlements: number;
    averageProcessingTime: number;
    totalFees: number;
    successRate: number;
  }> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Calculating settlement analytics', {
          operation: 'getSettlementAnalytics',
          merchantId,
          dateRange,
        });

        const settlements = await this.repository.findSettlements(merchantId, dateRange);

        const analytics = this.calculateAnalytics(settlements);

        await this.logger.business('Settlement analytics calculated', {
          operation: 'getSettlementAnalytics',
          totalSettlements: analytics.totalSettlements,
          successRate: analytics.successRate,
        });

        return analytics;
      },
      {
        domain: 'settlement',
        operation: 'getSettlementAnalytics',
      }
    );
  }

  // Private helper methods

  private async validateSettlementCreation(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    // Validate amount limits
    if (amount < this.rules.minSettlementAmount) {
      throw this.errorFactory.validationError(
        `Settlement amount ${amount} is below minimum ${this.rules.minSettlementAmount}`,
        'amount',
        amount
      );
    }

    if (amount > this.rules.maxSettlementAmount) {
      throw this.errorFactory.validationError(
        `Settlement amount ${amount} exceeds maximum ${this.rules.maxSettlementAmount}`,
        'amount',
        amount
      );
    }

    // Validate currency
    if (!['USD', 'EUR', 'GBP', 'CAD'].includes(currency)) {
      throw this.errorFactory.validationError(
        `Unsupported currency: ${currency}`,
        'currency',
        currency
      );
    }

    await this.logger.business('Settlement creation validation passed', {
      operation: 'validateSettlementCreation',
      paymentId,
      merchantId,
      amount,
      currency,
    });
  }

  private calculateNextSettlementDate(): Date {
    const now = new Date();
    let settlementDate = new Date(now);

    // Add 1 day for standard processing
    settlementDate.setDate(now.getDate() + 1);

    // Skip weekends if not allowed
    if (!this.rules.allowWeekendProcessing) {
      const dayOfWeek = settlementDate.getDay();
      if (dayOfWeek === 0) {
        // Sunday
        settlementDate.setDate(settlementDate.getDate() + 1); // Move to Monday
      } else if (dayOfWeek === 6) {
        // Saturday
        settlementDate.setDate(settlementDate.getDate() + 2); // Move to Monday
      }
    }

    return settlementDate;
  }

  private async processIndividualSettlement(settlement: Settlement): Promise<void> {
    // Mark as processing
    settlement.markAsProcessing();
    await this.repository.save(settlement);

    // Publish processing event
    await this.publishEvent('settlementProcessing', {
      settlementId: settlement.id,
      paymentId: settlement.paymentId,
    });

    // Simulate processing time (in real implementation, this would integrate with payment processors)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate success/failure (95% success rate)
    const isSuccessful = Math.random() > 0.05;

    if (isSuccessful) {
      // Generate mock bank reference
      const bankReference = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      settlement.complete(bankReference);
    } else {
      settlement.fail('Payment processor timeout');
    }

    await this.repository.save(settlement);
  }

  private calculateAnalytics(settlements: Settlement[]): {
    totalSettlements: number;
    totalAmount: number;
    successfulSettlements: number;
    failedSettlements: number;
    pendingSettlements: number;
    averageProcessingTime: number;
    totalFees: number;
    successRate: number;
  } {
    const totalSettlements = settlements.length;
    const successfulSettlements = settlements.filter(
      s => s.status === SettlementStatus.COMPLETED
    ).length;
    const failedSettlements = settlements.filter(s => s.status === SettlementStatus.FAILED).length;
    const pendingSettlements = settlements.filter(
      s => s.status === SettlementStatus.PENDING || s.status === SettlementStatus.PROCESSING
    ).length;

    const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
    const totalFees = settlements.reduce((sum, s) => sum + s.fees.totalFees, 0);

    const completedSettlements = settlements.filter(s => s.completedAt);
    const averageProcessingTime =
      completedSettlements.length > 0
        ? completedSettlements.reduce(
            (sum, s) => sum + (s.completedAt!.getTime() - s.createdAt.getTime()),
            0
          ) /
          completedSettlements.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    const successRate = totalSettlements > 0 ? (successfulSettlements / totalSettlements) * 100 : 0;

    return {
      totalSettlements,
      totalAmount,
      successfulSettlements,
      failedSettlements,
      pendingSettlements,
      averageProcessingTime,
      totalFees,
      successRate,
    };
  }

  private async publishEvent(eventType: keyof SettlementEvents, data: any): Promise<void> {
    // In a real implementation, this would use an event bus
    await this.logger.business(`Event published: ${eventType}`, {
      operation: 'publishEvent',
      eventType,
      data,
    });
  }
}

// Repository Interface (for dependency injection)
export interface SettlementRepository {
  save(settlement: Settlement): Promise<Settlement>;
  findById(id: string): Promise<Settlement | null>;
  findByPaymentId(paymentId: string): Promise<Settlement | null>;
  findByMerchantId(merchantId: string): Promise<Settlement[]>;
  findSettlements(
    merchantId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<Settlement[]>;
  findPendingSettlements(): Promise<Settlement[]>;
  updateStatus(id: string, status: SettlementStatus): Promise<void>;
}

// Factory for creating settlement services
export class SettlementServiceFactory {
  static create(repository: SettlementRepository): SettlementService {
    return new SettlementService(repository);
  }
}
