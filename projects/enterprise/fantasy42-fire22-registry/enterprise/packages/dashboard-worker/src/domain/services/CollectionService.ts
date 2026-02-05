/**
 * Collection Service
 * Business logic for managing financial collections
 */

import {
  Collection,
  CollectionStatus,
  CollectionFilters,
  CollectionSummary,
  PaginatedResult,
} from '../models';
import { Logger } from './Logger';

export class CollectionService {
  private static logger = Logger.configure('CollectionService');

  /**
   * Get all collections with optional filtering
   */
  static async getAll(filters?: CollectionFilters): Promise<Collection[]> {
    try {
      Logger.info('Fetching all collections', { filters });

      // In a real implementation, this would query the database
      const mockCollections = this.getMockCollections();

      let filteredCollections = mockCollections;

      // Apply filters
      if (filters) {
        if (filters.status) {
          filteredCollections = filteredCollections.filter(c => c.status === filters.status);
        }
        if (filters.merchantId) {
          filteredCollections = filteredCollections.filter(
            c => c.merchantId === filters.merchantId
          );
        }
        if (filters.customerName) {
          filteredCollections = filteredCollections.filter(c =>
            c.customerName.toLowerCase().includes(filters.customerName!.toLowerCase())
          );
        }
        if (filters.dateFrom) {
          filteredCollections = filteredCollections.filter(c => c.createdAt >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          filteredCollections = filteredCollections.filter(c => c.createdAt <= filters.dateTo!);
        }
        if (filters.amountMin) {
          filteredCollections = filteredCollections.filter(c => c.amount >= filters.amountMin!);
        }
        if (filters.amountMax) {
          filteredCollections = filteredCollections.filter(c => c.amount <= filters.amountMax!);
        }
        if (filters.currency) {
          filteredCollections = filteredCollections.filter(c => c.currency === filters.currency);
        }
        if (filters.tags && filters.tags.length > 0) {
          filteredCollections = filteredCollections.filter(
            c => c.tags && filters.tags!.some(tag => c.tags!.includes(tag))
          );
        }
      }

      Logger.info(`Retrieved ${filteredCollections.length} collections`);
      return filteredCollections;
    } catch (error) {
      Logger.error('Error fetching collections', error);
      throw new Error('Failed to retrieve collections');
    }
  }

  /**
   * Get collection by ID
   */
  static async getById(id: string): Promise<Collection | null> {
    try {
      Logger.info(`Fetching collection with ID: ${id}`);

      const collections = await this.getAll();
      const collection = collections.find(c => c.id === id);

      if (collection) {
        Logger.info(`Found collection ${id}`);
      } else {
        Logger.warn(`Collection ${id} not found`);
      }

      return collection || null;
    } catch (error) {
      Logger.error(`Error fetching collection ${id}`, error);
      throw new Error(`Failed to retrieve collection ${id}`);
    }
  }

  /**
   * Get collections by status
   */
  static async getByStatus(status: CollectionStatus): Promise<Collection[]> {
    try {
      Logger.info(`Fetching collections with status: ${status}`);
      return await this.getAll({ status });
    } catch (error) {
      Logger.error(`Error fetching collections with status ${status}`, error);
      throw new Error(`Failed to retrieve collections with status ${status}`);
    }
  }

  /**
   * Get collections by merchant
   */
  static async getByMerchant(merchantId: string): Promise<Collection[]> {
    try {
      Logger.info(`Fetching collections for merchant: ${merchantId}`);
      return await this.getAll({ merchantId });
    } catch (error) {
      Logger.error(`Error fetching collections for merchant ${merchantId}`, error);
      throw new Error(`Failed to retrieve collections for merchant ${merchantId}`);
    }
  }

  /**
   * Get paginated collections
   */
  static async getPaginated(
    page: number = 1,
    limit: number = 20,
    filters?: CollectionFilters
  ): Promise<PaginatedResult<Collection>> {
    try {
      Logger.info('Fetching paginated collections', { page, limit, filters });

      const allCollections = await this.getAll(filters);
      const total = allCollections.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedData = allCollections.slice(startIndex, endIndex);

      const result: PaginatedResult<Collection> = {
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

      Logger.info(`Retrieved ${paginatedData.length} collections (page ${page}/${totalPages})`);
      return result;
    } catch (error) {
      Logger.error('Error fetching paginated collections', error);
      throw new Error('Failed to retrieve paginated collections');
    }
  }

  /**
   * Get collection summary statistics
   */
  static async getSummary(filters?: CollectionFilters): Promise<CollectionSummary> {
    try {
      Logger.info('Calculating collection summary', { filters });

      const collections = await this.getAll(filters);
      const totalCollections = collections.length;
      const totalAmount = collections.reduce((sum, c) => sum + c.amount, 0);

      const pendingCollections = collections.filter(
        c => c.status === CollectionStatus.PENDING
      ).length;
      const pendingAmount = collections
        .filter(c => c.status === CollectionStatus.PENDING)
        .reduce((sum, c) => sum + c.amount, 0);

      const processedCollections = collections.filter(
        c => c.status === CollectionStatus.PROCESSED
      ).length;
      const processedAmount = collections
        .filter(c => c.status === CollectionStatus.PROCESSED)
        .reduce((sum, c) => sum + c.amount, 0);

      const failedCollections = collections.filter(
        c => c.status === CollectionStatus.FAILED
      ).length;
      const failedAmount = collections
        .filter(c => c.status === CollectionStatus.FAILED)
        .reduce((sum, c) => sum + c.amount, 0);

      // Calculate success rate
      const successRate =
        totalCollections > 0 ? (processedCollections / totalCollections) * 100 : 0;

      // Calculate average processing time for processed collections
      const processedWithTime = collections.filter(
        c => c.status === CollectionStatus.PROCESSED && c.processedAt
      );
      const averageProcessingTime =
        processedWithTime.length > 0
          ? processedWithTime.reduce((sum, c) => {
              const processingTime = c.processedAt!.getTime() - c.createdAt.getTime();
              return sum + processingTime;
            }, 0) /
            processedWithTime.length /
            (1000 * 60 * 60) // Convert to hours
          : undefined;

      const summary: CollectionSummary = {
        totalCollections,
        totalAmount,
        pendingCollections,
        pendingAmount,
        processedCollections,
        processedAmount,
        failedCollections,
        failedAmount,
        averageProcessingTime,
        successRate,
      };

      Logger.info('Collection summary calculated', summary);
      return summary;
    } catch (error) {
      Logger.error('Error calculating collection summary', error);
      throw new Error('Failed to calculate collection summary');
    }
  }

  /**
   * Mock data for development/testing
   * In production, this would be replaced with database queries
   */
  private static getMockCollections(): Collection[] {
    return [
      {
        id: 'coll_001',
        merchantId: 'merch_123',
        amount: 1500.0,
        currency: 'USD',
        status: CollectionStatus.PROCESSED,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        processedAt: new Date('2024-01-16T14:30:00Z'),
        customerName: 'John Doe',
        referenceId: 'ref_123456',
        settlementId: 'settle_789',
        description: 'Payment for services',
        metadata: { source: 'web', priority: 'high' },
        tags: ['vip', 'recurring'],
      },
      {
        id: 'coll_002',
        merchantId: 'merch_456',
        amount: 2500.5,
        currency: 'USD',
        status: CollectionStatus.PENDING,
        createdAt: new Date('2024-01-16T09:15:00Z'),
        customerName: 'Jane Smith',
        referenceId: 'ref_789012',
        description: 'Monthly subscription',
        metadata: { source: 'api', priority: 'medium' },
        tags: ['subscription', 'monthly'],
      },
      {
        id: 'coll_003',
        merchantId: 'merch_123',
        amount: 750.25,
        currency: 'USD',
        status: CollectionStatus.FAILED,
        createdAt: new Date('2024-01-14T16:45:00Z'),
        customerName: 'Bob Wilson',
        referenceId: 'ref_345678',
        description: 'Product purchase',
        metadata: { source: 'mobile', error: 'insufficient_funds' },
        tags: ['purchase', 'failed'],
      },
      {
        id: 'coll_004',
        merchantId: 'merch_789',
        amount: 3200.0,
        currency: 'USD',
        status: CollectionStatus.PROCESSED,
        createdAt: new Date('2024-01-13T11:30:00Z'),
        processedAt: new Date('2024-01-13T16:20:00Z'),
        customerName: 'Alice Brown',
        referenceId: 'ref_901234',
        settlementId: 'settle_456',
        description: 'Bulk order payment',
        metadata: { source: 'web', priority: 'high' },
        tags: ['bulk', 'priority'],
      },
      {
        id: 'coll_005',
        merchantId: 'merch_456',
        amount: 425.75,
        currency: 'USD',
        status: CollectionStatus.PENDING,
        createdAt: new Date('2024-01-17T08:00:00Z'),
        customerName: 'Charlie Davis',
        referenceId: 'ref_567890',
        description: 'Service fee',
        metadata: { source: 'api', priority: 'low' },
        tags: ['fee', 'service'],
      },
    ];
  }
}
