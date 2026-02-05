/**
 * Collections Domain Service - Domain-Driven Design Implementation
 * Payment collection and settlement processing
 */

import {
  DomainError,
  ValidationError,
  EntityNotFoundError,
  BusinessRuleViolationError,
  ErrorBoundary,
  DomainErrorFactory,
} from '../../core/errors/domain-errors';

import { DomainLogger, LoggerFactory, LogCategory } from '../../core/logging/domain-logger';

// Domain Entities
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'card' | 'bank_transfer' | 'wallet' | 'crypto';
  customerId: string;
  merchantId: string;
  reference: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface Settlement {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  settlementDate: Date;
  bankReference?: string;
  fees: number;
  netAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionMetrics {
  totalCollections: number;
  totalAmount: number;
  successRate: number;
  averageProcessingTime: number;
  revenueByMethod: Record<string, number>;
  dailyVolume: number;
}

// Domain Service - Business Logic
export class CollectionsService {
  private readonly logger = LoggerFactory.create('collections');
  private readonly errorFactory = new DomainErrorFactory('collections');

  // Repository interface (would be injected in real implementation)
  private repository: CollectionsRepository;

  constructor(repository: CollectionsRepository) {
    this.repository = repository;
  }

  /**
   * Process a payment collection
   */
  async processPayment(
    paymentData: Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Payment> {
    return await this.logger.withTiming(
      async () => {
        return await ErrorBoundary.execute(
          async () => {
            await this.logger.business('Processing payment collection', {
              operation: 'processPayment',
              customerId: paymentData.customerId,
              amount: paymentData.amount,
              currency: paymentData.currency,
              paymentMethod: paymentData.paymentMethod,
            });

            // Validate business rules
            await this.validatePaymentData(paymentData);

            // Create payment entity
            const payment: Payment = {
              ...paymentData,
              id: this.generatePaymentId(),
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Process the payment
            const processedPayment = await this.processPaymentTransaction(payment);

            await this.logger.business(
              'Payment processed successfully',
              {
                operation: 'processPayment',
                entity: 'Payment',
                entityId: processedPayment.id,
                customerId: paymentData.customerId,
              },
              {
                amount: processedPayment.amount,
                processingTime: Date.now() - payment.createdAt.getTime(),
              }
            );

            // Publish domain event
            await this.publishEvent('collections.payment.processed', {
              paymentId: processedPayment.id,
              customerId: processedPayment.customerId,
              amount: processedPayment.amount,
              status: processedPayment.status,
            });

            return processedPayment;
          },
          {
            domain: 'collections',
            operation: 'processPayment',
            customerId: paymentData.customerId,
          }
        );
      },
      'processPayment',
      {
        domain: 'collections',
        operation: 'processPayment',
        customerId: paymentData.customerId,
      }
    );
  }

  /**
   * Reconcile payment with settlement
   */
  async reconcileSettlement(
    paymentId: string,
    settlementData: Omit<Settlement, 'id' | 'paymentId' | 'createdAt' | 'updatedAt'>
  ): Promise<Settlement> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Reconciling payment settlement', {
          operation: 'reconcileSettlement',
          paymentId,
          settlementAmount: settlementData.amount,
        });

        // Find the payment
        const payment = await this.repository.findPaymentById(paymentId);
        if (!payment) {
          throw this.errorFactory.entityNotFound('Payment', paymentId);
        }

        if (payment.status !== 'completed') {
          throw this.errorFactory.businessRuleViolation(
            'Cannot reconcile settlement for non-completed payment',
            'payment_not_completed'
          );
        }

        // Validate settlement data
        await this.validateSettlementData(payment, settlementData);

        // Create settlement entity
        const settlement: Settlement = {
          ...settlementData,
          id: this.generateSettlementId(),
          paymentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save settlement
        const savedSettlement = await this.repository.saveSettlement(settlement);

        // Update payment status
        await this.repository.updatePaymentStatus(paymentId, 'completed');

        await this.logger.audit('Payment settlement reconciled', {
          operation: 'reconcileSettlement',
          paymentId,
          settlementId: savedSettlement.id,
          metadata: {
            settlementAmount: settlementData.amount,
            reconciledBy: 'system',
          },
        });

        // Publish settlement event
        await this.publishEvent('collections.settlement.reconciled', {
          paymentId,
          settlementId: savedSettlement.id,
          amount: savedSettlement.amount,
        });

        return savedSettlement;
      },
      {
        domain: 'collections',
        operation: 'reconcileSettlement',
        paymentId,
      }
    );
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenue(timeRange: { start: Date; end: Date }): Promise<CollectionMetrics> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Calculating collection revenue metrics', {
          operation: 'calculateRevenue',
          timeRange,
        });

        const payments = await this.repository.findPaymentsInRange(timeRange);
        const settlements = await this.repository.findSettlementsInRange(timeRange);

        const metrics = this.computeRevenueMetrics(payments, settlements);

        await this.logger.business(
          'Revenue metrics calculated',
          {
            operation: 'calculateRevenue',
          },
          {
            totalCollections: metrics.totalCollections,
            totalAmount: metrics.totalAmount,
            successRate: metrics.successRate,
          }
        );

        return metrics;
      },
      {
        domain: 'collections',
        operation: 'calculateRevenue',
      }
    );
  }

  // Private helper methods

  private async validatePaymentData(
    paymentData: Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Validate amount
    if (paymentData.amount <= 0) {
      throw this.errorFactory.validationError(
        'Payment amount must be positive',
        'amount',
        paymentData.amount
      );
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
    if (!supportedCurrencies.includes(paymentData.currency)) {
      throw this.errorFactory.validationError(
        `Unsupported currency: ${paymentData.currency}`,
        'currency',
        paymentData.currency
      );
    }

    // Validate payment method
    const supportedMethods = ['card', 'bank_transfer', 'wallet', 'crypto'];
    if (!supportedMethods.includes(paymentData.paymentMethod)) {
      throw this.errorFactory.validationError(
        `Unsupported payment method: ${paymentData.paymentMethod}`,
        'paymentMethod',
        paymentData.paymentMethod
      );
    }

    // Check for duplicate reference
    const existingPayment = await this.repository.findPaymentByReference(paymentData.reference);
    if (existingPayment) {
      throw this.errorFactory.businessRuleViolation(
        'Payment with this reference already exists',
        'duplicate_reference'
      );
    }

    await this.logger.business('Payment data validation passed', {
      operation: 'validatePaymentData',
      customerId: paymentData.customerId,
      amount: paymentData.amount,
    });
  }

  private async validateSettlementData(
    payment: Payment,
    settlementData: Omit<Settlement, 'id' | 'paymentId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Validate amounts match
    if (Math.abs(settlementData.amount - payment.amount) > 0.01) {
      throw this.errorFactory.validationError(
        `Settlement amount ${settlementData.amount} does not match payment amount ${payment.amount}`,
        'amount',
        settlementData.amount
      );
    }

    // Validate currency matches
    if (settlementData.currency !== payment.currency) {
      throw this.errorFactory.validationError(
        `Settlement currency ${settlementData.currency} does not match payment currency ${payment.currency}`,
        'currency',
        settlementData.currency
      );
    }

    // Validate settlement date is not in future
    if (settlementData.settlementDate > new Date()) {
      throw this.errorFactory.validationError(
        'Settlement date cannot be in the future',
        'settlementDate',
        settlementData.settlementDate
      );
    }

    await this.logger.business('Settlement data validation passed', {
      operation: 'validateSettlementData',
      paymentId: payment.id,
      settlementAmount: settlementData.amount,
    });
  }

  private async processPaymentTransaction(payment: Payment): Promise<Payment> {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time

    const success = Math.random() > 0.05; // 95% success rate

    if (success) {
      return {
        ...payment,
        status: 'completed',
        processedAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      return {
        ...payment,
        status: 'failed',
        processedAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  private computeRevenueMetrics(payments: Payment[], settlements: Settlement[]): CollectionMetrics {
    const totalCollections = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed');
    const totalAmount = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const successRate =
      totalCollections > 0 ? (successfulPayments.length / totalCollections) * 100 : 0;

    const revenueByMethod = successfulPayments.reduce(
      (acc, payment) => {
        acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalFees = settlements.reduce((sum, s) => sum + s.fees, 0);
    const netRevenue = totalAmount - totalFees;

    return {
      totalCollections,
      totalAmount,
      successRate,
      averageProcessingTime: 150, // Mock average processing time
      revenueByMethod,
      dailyVolume: totalAmount / 30, // Mock daily volume calculation
    };
  }

  private generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSettlementId(): string {
    return `stl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async publishEvent(eventType: string, payload: any): Promise<void> {
    // In a real implementation, this would use an event bus
    await this.logger.business(`Event published: ${eventType}`, {
      operation: 'publishEvent',
      metadata: { eventType, payload },
    });
  }
}

// Repository Interface (for dependency injection)
export interface CollectionsRepository {
  savePayment(payment: Payment): Promise<Payment>;
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByReference(reference: string): Promise<Payment | null>;
  findPaymentsInRange(timeRange: { start: Date; end: Date }): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: Payment['status']): Promise<void>;

  saveSettlement(settlement: Settlement): Promise<Settlement>;
  findSettlementById(id: string): Promise<Settlement | null>;
  findSettlementsInRange(timeRange: { start: Date; end: Date }): Promise<Settlement[]>;
  findSettlementsByPaymentId(paymentId: string): Promise<Settlement[]>;
}

// Factory for creating collections services
export class CollectionsServiceFactory {
  static create(repository: CollectionsRepository): CollectionsService {
    return new CollectionsService(repository);
  }
}
