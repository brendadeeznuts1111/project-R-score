/**
 * Settlement Processor Service
 * Business logic for processing financial settlements
 */

import {
  Settlement,
  SettlementStatus,
  SettlementFilters,
  SettlementSummary,
  SettlementResult,
  PaginatedResult,
  CollectionFilters,
} from '../models';
import { Logger } from './Logger';

export class SettlementProcessor {
  private static logger = Logger.configure('SettlementProcessor');

  /**
   * Process pending settlements
   */
  static async processPending(): Promise<{
    pending: number;
    processed: number;
    failed: number;
    totalAmount: number;
    estimatedFees: number;
    processingResults: SettlementResult[];
  }> {
    try {
      Logger.info('Processing pending settlements');

      const pendingSettlements = await this.getByStatus(SettlementStatus.PENDING);
      const processingResults: SettlementResult[] = [];

      let processed = 0;
      let failed = 0;
      let totalAmount = 0;
      let totalFees = 0;

      for (const settlement of pendingSettlements) {
        try {
          const result = await this.processSettlement(settlement);
          processingResults.push(result);

          if (result.success) {
            processed++;
            totalFees += result.fee;
          } else {
            failed++;
          }

          totalAmount += settlement.amount;
        } catch (error) {
          Logger.error(`Failed to process settlement ${settlement.id}`, error);
          failed++;
          processingResults.push({
            settlementId: settlement.id,
            success: false,
            processedAt: new Date(),
            fee: 0,
            netAmount: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const result = {
        pending: pendingSettlements.length,
        processed,
        failed,
        totalAmount,
        estimatedFees: totalFees,
        processingResults,
      };

      Logger.info('Settlement processing completed', result);
      return result;
    } catch (error) {
      Logger.error('Error processing settlements', error);
      throw new Error('Failed to process settlements');
    }
  }

  /**
   * Process a single settlement
   */
  static async processSettlement(settlement: Settlement): Promise<SettlementResult> {
    try {
      Logger.info(`Processing settlement ${settlement.id}`);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      // Calculate fees
      const fee = this.calculateFees(settlement.amount);
      const netAmount = settlement.amount - fee;

      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1;

      const result: SettlementResult = {
        settlementId: settlement.id,
        success,
        processedAt: new Date(),
        fee,
        netAmount,
        transactionId: success ? `txn_${Date.now()}_${settlement.id}` : undefined,
        errorMessage: success ? undefined : 'Payment processing failed',
        metadata: {
          processingTime: Math.random() * 1000 + 500,
          paymentMethod: settlement.paymentMethod || 'bank_transfer',
        },
      };

      if (success) {
        Logger.info(`Settlement ${settlement.id} processed successfully`, result);
      } else {
        Logger.warn(`Settlement ${settlement.id} failed to process`, result);
      }

      return result;
    } catch (error) {
      Logger.error(`Error processing settlement ${settlement.id}`, error);
      throw error;
    }
  }

  /**
   * Calculate processing fees
   */
  static calculateFees(amount: number): number {
    try {
      Logger.info(`Calculating fees for amount: ${amount}`);

      // Fee structure: 2.9% + $0.30
      const percentageFee = amount * 0.029;
      const fixedFee = 0.3;
      const totalFee = percentageFee + fixedFee;

      Logger.debug(`Fee calculation: ${percentageFee} + ${fixedFee} = ${totalFee}`);
      return Math.round(totalFee * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      Logger.error('Error calculating fees', error);
      throw new Error('Failed to calculate fees');
    }
  }

  /**
   * Get settlement history with date range
   */
  static async getSettlementHistory(days: number = 30): Promise<Settlement[]> {
    try {
      Logger.info(`Fetching settlement history for ${days} days`);

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const result = await this.getAll({
        dateFrom,
      });

      Logger.info(`Retrieved ${result.data.length} settlements from last ${days} days`);
      return result.data;
    } catch (error) {
      Logger.error('Error fetching settlement history', error);
      throw new Error('Failed to retrieve settlement history');
    }
  }

  /**
   * Get settlements by status
   */
  static async getByStatus(status: SettlementStatus): Promise<Settlement[]> {
    try {
      Logger.info(`Fetching settlements with status: ${status}`);
      const result = await this.getAll({ status });
      return result.data;
    } catch (error) {
      Logger.error(`Error fetching settlements with status ${status}`, error);
      throw new Error(`Failed to retrieve settlements with status ${status}`);
    }
  }

  /**
   * Get settlements by agent
   */
  static async getByAgent(agentId: string): Promise<Settlement[]> {
    try {
      Logger.info(`Fetching settlements for agent: ${agentId}`);
      const result = await this.getAll({ agentId });
      return result.data;
    } catch (error) {
      Logger.error(`Error fetching settlements for agent ${agentId}`, error);
      throw new Error(`Failed to retrieve settlements for agent ${agentId}`);
    }
  }

  /**
   * Get all settlements with optional filtering
   */
  static async getAll(
    filters?: SettlementFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<Settlement>> {
    try {
      Logger.info('Fetching all settlements', { filters, page, limit });

      const mockSettlements = this.getMockSettlements();
      let filteredSettlements = mockSettlements;

      // Apply filters
      if (filters) {
        if (filters.status) {
          filteredSettlements = filteredSettlements.filter(s => s.status === filters.status);
        }
        if (filters.agentId) {
          filteredSettlements = filteredSettlements.filter(s => s.agentId === filters.agentId);
        }
        if (filters.merchantId) {
          filteredSettlements = filteredSettlements.filter(
            s => s.merchantId === filters.merchantId
          );
        }
        if (filters.dateFrom) {
          filteredSettlements = filteredSettlements.filter(s => s.createdAt >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          filteredSettlements = filteredSettlements.filter(s => s.createdAt <= filters.dateTo!);
        }
        if (filters.amountMin) {
          filteredSettlements = filteredSettlements.filter(s => s.amount >= filters.amountMin!);
        }
        if (filters.amountMax) {
          filteredSettlements = filteredSettlements.filter(s => s.amount <= filters.amountMax!);
        }
        if (filters.currency) {
          filteredSettlements = filteredSettlements.filter(s => s.currency === filters.currency);
        }
        if (filters.collectionId) {
          filteredSettlements = filteredSettlements.filter(
            s => s.collectionId === filters.collectionId
          );
        }
      }

      // Apply pagination
      const total = filteredSettlements.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredSettlements.slice(startIndex, endIndex);

      const result: PaginatedResult<Settlement> = {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      Logger.info(`Retrieved ${paginatedData.length} settlements (page ${page}/${totalPages})`);
      return result;
    } catch (error) {
      Logger.error('Error fetching settlements', error);
      throw new Error('Failed to retrieve settlements');
    }
  }

  /**
   * Get settlement summary statistics
   */
  static async getSummary(filters?: SettlementFilters): Promise<SettlementSummary> {
    try {
      Logger.info('Calculating settlement summary', { filters });

      const result = await this.getAll(filters);
      const settlements = result.data;
      const totalSettlements = settlements.length;

      const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
      const totalFees = settlements.reduce((sum, s) => sum + s.processingFee, 0);
      const netAmount = totalAmount - totalFees;

      const pendingSettlements = settlements.filter(
        s => s.status === SettlementStatus.PENDING
      ).length;
      const pendingAmount = settlements
        .filter(s => s.status === SettlementStatus.PENDING)
        .reduce((sum, s) => sum + s.amount, 0);

      const processingSettlements = settlements.filter(
        s => s.status === SettlementStatus.PROCESSING
      ).length;
      const processingAmount = settlements
        .filter(s => s.status === SettlementStatus.PROCESSING)
        .reduce((sum, s) => sum + s.amount, 0);

      const completedSettlements = settlements.filter(
        s => s.status === SettlementStatus.COMPLETED
      ).length;
      const completedAmount = settlements
        .filter(s => s.status === SettlementStatus.COMPLETED)
        .reduce((sum, s) => sum + s.amount, 0);

      const failedSettlements = settlements.filter(
        s => s.status === SettlementStatus.FAILED
      ).length;
      const failedAmount = settlements
        .filter(s => s.status === SettlementStatus.FAILED)
        .reduce((sum, s) => sum + s.amount, 0);

      // Calculate success rate
      const successRate =
        totalSettlements > 0 ? (completedSettlements / totalSettlements) * 100 : 0;

      // Calculate average processing time
      const completedWithTime = settlements.filter(
        s => s.status === SettlementStatus.COMPLETED && s.processedAt && s.completedAt
      );
      const averageProcessingTime =
        completedWithTime.length > 0
          ? completedWithTime.reduce((sum, s) => {
              const processingTime = s.completedAt!.getTime() - s.createdAt.getTime();
              return sum + processingTime;
            }, 0) /
            completedWithTime.length /
            (1000 * 60 * 60) // Convert to hours
          : undefined;

      // Calculate fee percentage
      const feePercentage = totalAmount > 0 ? (totalFees / totalAmount) * 100 : 0;

      const summary: SettlementSummary = {
        totalSettlements,
        totalAmount,
        totalFees,
        netAmount,
        pendingSettlements,
        pendingAmount,
        processingSettlements,
        processingAmount,
        completedSettlements,
        completedAmount,
        failedSettlements,
        failedAmount,
        averageProcessingTime,
        successRate,
        feePercentage,
      };

      Logger.info('Settlement summary calculated', summary);
      return summary;
    } catch (error) {
      Logger.error('Error calculating settlement summary', error);
      throw new Error('Failed to calculate settlement summary');
    }
  }

  /**
   * Mock data for development/testing
   */
  private static getMockSettlements(): Settlement[] {
    return [
      {
        id: 'settle_001',
        collectionId: 'coll_001',
        amount: 1500.0,
        currency: 'USD',
        status: SettlementStatus.COMPLETED,
        processingFee: 43.5,
        netAmount: 1456.5,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        processedAt: new Date('2024-01-16T14:30:00Z'),
        completedAt: new Date('2024-01-16T14:35:00Z'),
        agentId: 'agent_123',
        agentName: 'John Smith',
        merchantId: 'merch_123',
        merchantName: 'TechCorp Inc',
        transactionId: 'txn_1642343400000_settle_001',
        paymentMethod: 'bank_transfer',
        notes: 'VIP customer - expedited processing',
      },
      {
        id: 'settle_002',
        collectionId: 'coll_002',
        amount: 2500.5,
        currency: 'USD',
        status: SettlementStatus.PENDING,
        processingFee: 72.76,
        netAmount: 2427.74,
        createdAt: new Date('2024-01-16T09:15:00Z'),
        agentId: 'agent_456',
        agentName: 'Sarah Johnson',
        merchantId: 'merch_456',
        merchantName: 'RetailPlus',
        paymentMethod: 'wire_transfer',
        notes: 'Monthly subscription payment',
      },
      {
        id: 'settle_003',
        collectionId: 'coll_004',
        amount: 3200.0,
        currency: 'USD',
        status: SettlementStatus.COMPLETED,
        processingFee: 92.8,
        netAmount: 3107.2,
        createdAt: new Date('2024-01-13T11:30:00Z'),
        processedAt: new Date('2024-01-13T16:20:00Z'),
        completedAt: new Date('2024-01-13T16:25:00Z'),
        agentId: 'agent_789',
        agentName: 'Mike Davis',
        merchantId: 'merch_789',
        merchantName: 'BulkSupplies Ltd',
        transactionId: 'txn_1642081200000_settle_003',
        paymentMethod: 'ach',
        notes: 'Bulk order settlement',
      },
      {
        id: 'settle_004',
        collectionId: 'coll_005',
        amount: 425.75,
        currency: 'USD',
        status: SettlementStatus.FAILED,
        processingFee: 12.35,
        netAmount: 413.4,
        createdAt: new Date('2024-01-17T08:00:00Z'),
        processedAt: new Date('2024-01-17T10:15:00Z'),
        agentId: 'agent_456',
        agentName: 'Sarah Johnson',
        merchantId: 'merch_456',
        merchantName: 'RetailPlus',
        paymentMethod: 'check',
        failureReason: 'Insufficient funds',
        notes: 'Payment returned - insufficient funds',
      },
    ];
  }
}
