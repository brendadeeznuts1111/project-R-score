/**
 * Collections Controller - Domain Entry Point
 * Standardized controller pattern for payment collection domain
 */

import { DomainLogger, LoggerFactory } from '../../core/logging/domain-logger';
import { DomainErrorFactory } from '../../core/errors/domain-errors';
import {
  CollectionsService,
  CollectionsServiceFactory,
  CollectionMetrics,
} from './collections-service';
import { CollectionsRepositoryFactory } from './collections-repository';

export interface ProcessPaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'bank_transfer' | 'wallet' | 'crypto';
  customerId: string;
  merchantId: string;
  reference: string;
  metadata?: Record<string, any>;
}

export interface ReconcileSettlementRequest {
  paymentId: string;
  amount: number;
  currency: string;
  settlementDate: string;
  bankReference?: string;
  fees: number;
  netAmount: number;
}

export interface RevenueQuery {
  startDate: string;
  endDate: string;
}

export interface PaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  customerId: string;
  reference: string;
  createdAt: string;
  processedAt?: string;
}

export interface SettlementResponse {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  settlementDate: string;
  bankReference?: string;
  fees: number;
  netAmount: number;
  createdAt: string;
}

export interface CollectionsControllerResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    correlationId: string;
  };
  metadata?: {
    processingTime: number;
    domain: string;
    operation: string;
  };
}

/**
 * Collections Domain Controller
 * Entry point for all payment collection operations
 */
export class CollectionsController {
  private service: CollectionsService;
  private logger = LoggerFactory.create('collections-controller');
  private errorFactory = new DomainErrorFactory('collections');

  constructor(dbPath?: string) {
    // Initialize repository and service
    const repository = CollectionsRepositoryFactory.createSQLiteRepository(dbPath);
    this.service = CollectionsServiceFactory.create(repository);
  }

  /**
   * Process a payment collection
   */
  async processPayment(request: ProcessPaymentRequest): Promise<CollectionsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Processing payment collection request', {
        operation: 'processPayment',
        customerId: request.customerId,
        amount: request.amount,
        paymentMethod: request.paymentMethod,
      });

      // Validate request
      const validationError = this.validateProcessPaymentRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Process payment
      const payment = await this.service.processPayment({
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        customerId: request.customerId,
        merchantId: request.merchantId,
        reference: request.reference,
        metadata: request.metadata || {},
      });

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Payment processed successfully',
        {
          operation: 'processPayment',
          entityId: payment.id,
          customerId: payment.customerId,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          customerId: payment.customerId,
          reference: payment.reference,
          createdAt: payment.createdAt.toISOString(),
          processedAt: payment.processedAt?.toISOString(),
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'processPayment', startTime);
    }
  }

  /**
   * Reconcile payment settlement
   */
  async reconcileSettlement(
    request: ReconcileSettlementRequest
  ): Promise<CollectionsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Processing settlement reconciliation request', {
        operation: 'reconcileSettlement',
        paymentId: request.paymentId,
        amount: request.amount,
      });

      // Validate request
      const validationError = this.validateReconcileSettlementRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Reconcile settlement
      const settlement = await this.service.reconcileSettlement(request.paymentId, {
        amount: request.amount,
        currency: request.currency,
        status: 'completed',
        settlementDate: new Date(request.settlementDate),
        bankReference: request.bankReference,
        fees: request.fees,
        netAmount: request.netAmount,
      });

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Settlement reconciled successfully',
        {
          operation: 'reconcileSettlement',
          paymentId: settlement.paymentId,
          settlementId: settlement.id,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          id: settlement.id,
          paymentId: settlement.paymentId,
          amount: settlement.amount,
          currency: settlement.currency,
          status: settlement.status,
          settlementDate: settlement.settlementDate.toISOString(),
          bankReference: settlement.bankReference,
          fees: settlement.fees,
          netAmount: settlement.netAmount,
          createdAt: settlement.createdAt.toISOString(),
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'reconcileSettlement', startTime);
    }
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenue(query: RevenueQuery): Promise<CollectionsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Processing revenue calculation request', {
        operation: 'calculateRevenue',
        startDate: query.startDate,
        endDate: query.endDate,
      });

      // Validate query
      const validationError = this.validateRevenueQuery(query);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Calculate revenue
      const metrics = await this.service.calculateRevenue({
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      });

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Revenue calculated successfully',
        {
          operation: 'calculateRevenue',
        },
        {
          totalCollections: metrics.totalCollections,
          totalAmount: metrics.totalAmount,
          processingTime,
        }
      );

      return this.createSuccessResponse(metrics, processingTime);
    } catch (error) {
      return this.handleError(error, 'calculateRevenue', startTime);
    }
  }

  /**
   * Health check endpoint for collections domain
   */
  async healthCheck(): Promise<CollectionsControllerResponse> {
    const startTime = Date.now();

    try {
      // Simple health check - could be enhanced with actual database checks
      const healthData = {
        domain: 'collections',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
      };

      const processingTime = Date.now() - startTime;

      return this.createSuccessResponse(healthData, processingTime);
    } catch (error) {
      return this.handleError(error, 'healthCheck', startTime);
    }
  }

  // Private helper methods

  private validateProcessPaymentRequest(request: ProcessPaymentRequest): string | null {
    if (!request.amount || request.amount <= 0) {
      return 'Amount must be positive';
    }

    if (!request.currency || !['USD', 'EUR', 'GBP', 'CAD'].includes(request.currency)) {
      return 'Invalid currency';
    }

    if (
      !request.paymentMethod ||
      !['card', 'bank_transfer', 'wallet', 'crypto'].includes(request.paymentMethod)
    ) {
      return 'Invalid payment method';
    }

    if (!request.customerId || !request.merchantId || !request.reference) {
      return 'Missing required fields: customerId, merchantId, or reference';
    }

    return null;
  }

  private validateReconcileSettlementRequest(request: ReconcileSettlementRequest): string | null {
    if (!request.paymentId) {
      return 'Payment ID is required';
    }

    if (!request.amount || request.amount <= 0) {
      return 'Amount must be positive';
    }

    if (!request.settlementDate || isNaN(Date.parse(request.settlementDate))) {
      return 'Valid settlement date is required';
    }

    if (new Date(request.settlementDate) > new Date()) {
      return 'Settlement date cannot be in the future';
    }

    return null;
  }

  private validateRevenueQuery(query: RevenueQuery): string | null {
    if (!query.startDate || !query.endDate) {
      return 'Both startDate and endDate are required';
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Invalid date format';
    }

    if (startDate > endDate) {
      return 'Start date cannot be after end date';
    }

    return null;
  }

  private createSuccessResponse(data: any, processingTime: number): CollectionsControllerResponse {
    return {
      success: true,
      data,
      metadata: {
        processingTime,
        domain: 'collections',
        operation: 'success',
      },
    };
  }

  private createErrorResponse(
    message: string,
    processingTime: number
  ): CollectionsControllerResponse {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        correlationId: `err_${Date.now()}`,
      },
      metadata: {
        processingTime,
        domain: 'collections',
        operation: 'validation_error',
      },
    };
  }

  private handleError(
    error: any,
    operation: string,
    startTime: number
  ): CollectionsControllerResponse {
    const processingTime = Date.now() - startTime;

    // Log the error
    this.logger.infrastructureError(`Error in ${operation}`, error, {
      operation,
      processingTime,
    });

    // Return standardized error response
    return {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        correlationId: error.context?.correlationId || `err_${Date.now()}`,
      },
      metadata: {
        processingTime,
        domain: 'collections',
        operation,
      },
    };
  }
}

// Factory for creating collections controllers
export class CollectionsControllerFactory {
  static create(dbPath?: string): CollectionsController {
    return new CollectionsController(dbPath);
  }

  static createWithInMemoryDb(): CollectionsController {
    return new CollectionsController(':memory:');
  }
}
