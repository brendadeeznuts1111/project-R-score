/**
 * Settlement Controller - Domain Entry Point
 * Standardized controller pattern for settlement domain
 */

import { DomainLogger, LoggerFactory } from '../../core/logging/domain-logger';
import { DomainErrorFactory } from '../../core/errors/domain-errors';
import {
  SettlementService,
  SettlementServiceFactory,
  SettlementEvents,
} from './services/settlement-service';
import { SettlementRepositoryFactory } from './repositories/settlement-repository';
import { Settlement, SettlementSummary } from './entities/settlement';
import { FeeCalculator } from './value-objects/settlement-fees';

export interface CreateSettlementRequest {
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  settlementType?: 'automated' | 'manual';
  settlementDate?: string;
}

export interface ProcessSettlementRequest {
  settlementId: string;
  bankReference?: string;
  processingNotes?: string[];
}

export interface BatchProcessRequest {
  settlementIds: string[];
}

export interface SettlementAnalyticsRequest {
  merchantId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SettlementResponse {
  id: string;
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: string;
  settlementType: string;
  settlementDate: string;
  processingDate: string;
  completedAt?: string;
  failedAt?: string;
  fees: {
    processingFee: number;
    networkFee: number;
    interchangeFee: number;
    totalFees: number;
  };
  breakdown: {
    principalAmount: number;
    fees: {
      processingFee: number;
      networkFee: number;
      interchangeFee: number;
      totalFees: number;
    };
    netAmount: number;
    currency: string;
  };
  metadata: {
    batchId?: string;
    settlementReference: string;
    bankReference?: string;
    processingNotes?: string[];
    complianceFlags?: string[];
  };
  ageInDays: number;
}

export interface BatchProcessResponse {
  batchId: string;
  processed: number;
  successful: number;
  failed: number;
  totalAmount: number;
}

export interface AnalyticsResponse {
  totalSettlements: number;
  totalAmount: number;
  successfulSettlements: number;
  failedSettlements: number;
  pendingSettlements: number;
  averageProcessingTime: number;
  totalFees: number;
  successRate: number;
}

export interface SettlementsControllerResponse {
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
 * Settlement Domain Controller
 * Entry point for all settlement operations
 */
export class SettlementsController {
  private service: SettlementService;
  private logger = LoggerFactory.create('settlements-controller');
  private errorFactory = new DomainErrorFactory('settlements');

  constructor(dbPath?: string) {
    // Initialize repository and service
    const repository = SettlementRepositoryFactory.createSQLiteRepository(dbPath);
    this.service = SettlementServiceFactory.create(repository);
  }

  /**
   * Create a new settlement
   */
  async createSettlement(request: CreateSettlementRequest): Promise<SettlementsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Creating settlement request', {
        operation: 'createSettlement',
        paymentId: request.paymentId,
        merchantId: request.merchantId,
        amount: request.amount,
        currency: request.currency,
      });

      // Validate request
      const validationError = this.validateCreateSettlementRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Determine settlement type
      const settlementType = request.settlementType === 'manual' ? 'manual' : 'automated';

      // Parse settlement date if provided
      const settlementDate = request.settlementDate ? new Date(request.settlementDate) : undefined;

      // Create settlement
      const settlement =
        settlementType === 'automated'
          ? await this.service.createAutomatedSettlement(
              request.paymentId,
              request.merchantId,
              request.amount,
              request.currency,
              settlementDate
            )
          : await this.service.createAutomatedSettlement(
              request.paymentId,
              request.merchantId,
              request.amount,
              request.currency,
              settlementDate
            ); // For now, both use same logic

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Settlement created successfully',
        {
          operation: 'createSettlement',
          entityId: settlement.id,
          paymentId: settlement.paymentId,
          merchantId: settlement.merchantId,
        },
        {
          settlementAmount: settlement.amount,
          processingTime,
        }
      );

      return this.createSuccessResponse(this.mapSettlementToResponse(settlement), processingTime);
    } catch (error) {
      return this.handleError(error, 'createSettlement', startTime);
    }
  }

  /**
   * Process settlement batch
   */
  async processSettlementBatch(
    request: BatchProcessRequest
  ): Promise<SettlementsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Processing settlement batch request', {
        operation: 'processSettlementBatch',
        settlementCount: request.settlementIds.length,
      });

      // Validate request
      const validationError = this.validateBatchProcessRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Process batch
      const result = await this.service.processSettlementBatch(request.settlementIds);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Settlement batch processed successfully',
        {
          operation: 'processSettlementBatch',
          settlementCount: request.settlementIds.length,
          successCount: result.successful,
          failureCount: result.failed,
        },
        {
          totalAmount: result.totalAmount,
          processingTime,
        }
      );

      const response: BatchProcessResponse = {
        batchId: `batch_${Date.now()}`,
        ...result,
      };

      return this.createSuccessResponse(response, processingTime);
    } catch (error) {
      return this.handleError(error, 'processSettlementBatch', startTime);
    }
  }

  /**
   * Complete a settlement
   */
  async completeSettlement(
    request: ProcessSettlementRequest
  ): Promise<SettlementsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Completing settlement request', {
        operation: 'completeSettlement',
        settlementId: request.settlementId,
        bankReference: request.bankReference,
      });

      // Validate request
      const validationError = this.validateProcessSettlementRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Complete settlement
      const settlement = await this.service.completeSettlement(
        request.settlementId,
        request.bankReference || `BANK_REF_${Date.now()}`,
        request.processingNotes
      );

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Settlement completed successfully',
        {
          operation: 'completeSettlement',
          entityId: settlement.id,
          bankReference: settlement.metadata.bankReference,
        },
        {
          netAmount: settlement.breakdown.netAmount,
          processingTime,
        }
      );

      return this.createSuccessResponse(this.mapSettlementToResponse(settlement), processingTime);
    } catch (error) {
      return this.handleError(error, 'completeSettlement', startTime);
    }
  }

  /**
   * Get settlement analytics
   */
  async getSettlementAnalytics(
    request: SettlementAnalyticsRequest = {}
  ): Promise<SettlementsControllerResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Getting settlement analytics request', {
        operation: 'getSettlementAnalytics',
        merchantId: request.merchantId,
        dateRange:
          request.startDate && request.endDate
            ? {
                start: request.startDate,
                end: request.endDate,
              }
            : undefined,
      });

      // Parse date range if provided
      const dateRange =
        request.startDate && request.endDate
          ? {
              start: new Date(request.startDate),
              end: new Date(request.endDate),
            }
          : undefined;

      // Get analytics
      const analytics = await this.service.getSettlementAnalytics(request.merchantId, dateRange);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Settlement analytics retrieved successfully',
        {
          operation: 'getSettlementAnalytics',
          totalSettlements: analytics.totalSettlements,
          successRate: analytics.successRate,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(analytics, processingTime);
    } catch (error) {
      return this.handleError(error, 'getSettlementAnalytics', startTime);
    }
  }

  /**
   * Health check endpoint for settlements domain
   */
  async healthCheck(): Promise<SettlementsControllerResponse> {
    const startTime = Date.now();

    try {
      // Simple health check - could be enhanced with actual database checks
      const healthData = {
        domain: 'settlements',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        features: [
          'Automated settlement processing',
          'Batch settlement operations',
          'Real-time analytics',
          'Multi-currency support',
          'Compliance monitoring',
        ],
      };

      const processingTime = Date.now() - startTime;

      return this.createSuccessResponse(healthData, processingTime);
    } catch (error) {
      return this.handleError(error, 'healthCheck', startTime);
    }
  }

  // Private helper methods

  private validateCreateSettlementRequest(request: CreateSettlementRequest): string | null {
    if (!request.paymentId || !request.merchantId) {
      return 'Payment ID and Merchant ID are required';
    }

    if (!request.amount || request.amount <= 0) {
      return 'Amount must be positive';
    }

    if (!request.currency || !['USD', 'EUR', 'GBP', 'CAD'].includes(request.currency)) {
      return 'Invalid currency';
    }

    if (request.settlementDate) {
      const settlementDate = new Date(request.settlementDate);
      if (isNaN(settlementDate.getTime())) {
        return 'Invalid settlement date format';
      }
      if (settlementDate <= new Date()) {
        return 'Settlement date must be in the future';
      }
    }

    return null;
  }

  private validateBatchProcessRequest(request: BatchProcessRequest): string | null {
    if (!request.settlementIds || !Array.isArray(request.settlementIds)) {
      return 'Settlement IDs must be provided as an array';
    }

    if (request.settlementIds.length === 0) {
      return 'At least one settlement ID is required';
    }

    if (request.settlementIds.length > 100) {
      return 'Maximum 100 settlements can be processed in a single batch';
    }

    // Check for duplicates
    const uniqueIds = new Set(request.settlementIds);
    if (uniqueIds.size !== request.settlementIds.length) {
      return 'Duplicate settlement IDs are not allowed';
    }

    return null;
  }

  private validateProcessSettlementRequest(request: ProcessSettlementRequest): string | null {
    if (!request.settlementId) {
      return 'Settlement ID is required';
    }

    return null;
  }

  private mapSettlementToResponse(settlement: Settlement): SettlementResponse {
    return {
      id: settlement.id,
      paymentId: settlement.paymentId,
      merchantId: settlement.merchantId,
      amount: settlement.amount,
      currency: settlement.currency,
      status: settlement.status,
      settlementType: settlement.settlementType,
      settlementDate: settlement.settlementDate.toISOString(),
      processingDate: settlement.processingDate.toISOString(),
      completedAt: settlement.completedAt?.toISOString(),
      failedAt: settlement.failedAt?.toISOString(),
      fees: {
        processingFee: settlement.fees.processingFee,
        networkFee: settlement.fees.networkFee,
        interchangeFee: settlement.fees.interchangeFee,
        totalFees: settlement.fees.totalFees,
      },
      breakdown: {
        principalAmount: settlement.breakdown.principalAmount,
        fees: {
          processingFee: settlement.breakdown.fees.processingFee,
          networkFee: settlement.breakdown.fees.networkFee,
          interchangeFee: settlement.breakdown.fees.interchangeFee,
          totalFees: settlement.breakdown.fees.totalFees,
        },
        netAmount: settlement.breakdown.netAmount,
        currency: settlement.breakdown.currency,
      },
      metadata: {
        batchId: settlement.metadata.batchId,
        settlementReference: settlement.metadata.settlementReference,
        bankReference: settlement.metadata.bankReference,
        processingNotes: settlement.metadata.processingNotes,
        complianceFlags: settlement.metadata.complianceFlags,
      },
      ageInDays: settlement.getAgeInDays(),
    };
  }

  private createSuccessResponse(data: any, processingTime: number): SettlementsControllerResponse {
    return {
      success: true,
      data,
      metadata: {
        processingTime,
        domain: 'settlements',
        operation: 'success',
      },
    };
  }

  private createErrorResponse(
    message: string,
    processingTime: number
  ): SettlementsControllerResponse {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        correlationId: `err_${Date.now()}`,
      },
      metadata: {
        processingTime,
        domain: 'settlements',
        operation: 'validation_error',
      },
    };
  }

  private handleError(
    error: any,
    operation: string,
    startTime: number
  ): SettlementsControllerResponse {
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
        domain: 'settlements',
        operation,
      },
    };
  }
}

// Factory for creating settlement controllers
export class SettlementsControllerFactory {
  static create(dbPath?: string): SettlementsController {
    return new SettlementsController(dbPath);
  }

  static createWithInMemoryDb(): SettlementsController {
    return new SettlementsController(':memory:');
  }
}
