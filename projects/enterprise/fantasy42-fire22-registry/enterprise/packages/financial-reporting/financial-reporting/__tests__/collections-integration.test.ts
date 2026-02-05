/**
 * Collections Domain Integration Tests
 * Tests cross-domain integration between Collections and Financial Reporting
 */

import { describe, test, expect } from 'bun:test';
import { CollectionsService } from '../../collections/collections.controller';
import {
  FinancialReportingService,
  FinancialReportingServiceFactory,
} from '../services/financial-reporting-service';
import { FinancialReportingRepository } from '../repositories/financial-reporting-repository';

// Mock repository for testing
class MockFinancialReportingRepository {
  private reports: any[] = [];

  async save(report: any): Promise<void> {
    this.reports.push(report);
  }

  async findById(id: string): Promise<any | null> {
    return this.reports.find(r => r.getId() === id) || null;
  }

  async findByQuery(query: any): Promise<any[]> {
    return this.reports.filter(report => {
      if (query.reportType && report.getReportType() !== query.reportType) return false;
      if (query.periodStart && report.getPeriodStart() < query.periodStart) return false;
      if (query.periodEnd && report.getPeriodEnd() > query.periodEnd) return false;
      return true;
    });
  }

  async findByPeriod(start: Date, end: Date): Promise<any[]> {
    return this.reports.filter(
      report => report.getPeriodStart() >= start && report.getPeriodEnd() <= end
    );
  }

  async getSummary(): Promise<any> {
    return {
      totalReports: this.reports.length,
      reportsByType: {},
      reportsByStatus: {},
      reportsByCompliance: {},
    };
  }

  async findReportsRequiringAttention(): Promise<any[]> {
    return [];
  }
}

describe('Collections-Financial Reporting Integration', () => {
  test('FinancialReportingService can be created with CollectionsService dependency', () => {
    const collectionsService = new CollectionsService();
    const repository = new MockFinancialReportingRepository() as any;

    const financialService = FinancialReportingServiceFactory.create(repository, {
      collectionsService,
    });

    expect(financialService).toBeDefined();
    expect(financialService).toBeInstanceOf(FinancialReportingService);
  });

  test('CollectionsService provides revenue data for financial reporting', async () => {
    const collectionsService = new CollectionsService();
    const repository = new MockFinancialReportingRepository() as any;
    const financialService = FinancialReportingServiceFactory.create(repository, {
      collectionsService,
    });

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    // Test that we can gather collections data (even if it's placeholder data)
    const collectionsData = await collectionsService.calculateRevenue({
      start: startDate,
      end: endDate,
    });

    expect(collectionsData).toBeDefined();
    expect(typeof collectionsData.totalCollections).toBe('number');
    expect(typeof collectionsData.successfulCollections).toBe('number');
    expect(typeof collectionsData.totalAmount).toBe('number');
    expect(typeof collectionsData.collectionsByMethod).toBe('object');
    expect(typeof collectionsData.collectionsByCurrency).toBe('object');
  });

  test('FinancialReportingService fails without CollectionsService dependency', () => {
    const repository = new MockFinancialReportingRepository() as any;

    expect(() => {
      FinancialReportingServiceFactory.create(repository);
    }).toThrow('CollectionsService is required for FinancialReportingService');
  });

  test('CollectionsService can process payments that contribute to financial reports', async () => {
    const collectionsService = new CollectionsService();

    // Process a payment
    const paymentRequest = {
      id: 'integration_test_payment',
      playerId: 'integration_test_player',
      amount: 500,
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    // Mock low risk score to ensure payment succeeds
    const originalRandom = Math.random;
    Math.random = () => 0.1; // Low risk score

    try {
      const result = await collectionsService.processPayment(paymentRequest);

      expect(result).toBeDefined();
      expect(result.paymentId).toBe('integration_test_payment');
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(500);

      // This payment would now contribute to financial reporting calculations
      const revenueData = await collectionsService.calculateRevenue({
        start: new Date(Date.now() - 86400000), // 1 day ago
        end: new Date(),
      });

      expect(revenueData).toBeDefined();
      // Note: Current implementation returns placeholder data
      // In a real implementation, this would include the processed payment
    } finally {
      Math.random = originalRandom;
    }
  });

  test('Cross-domain data flow from Collections to Financial Reporting', async () => {
    const collectionsService = new CollectionsService();
    const repository = new MockFinancialReportingRepository() as any;
    const financialService = FinancialReportingServiceFactory.create(repository, {
      collectionsService,
    });

    // Get collections data
    const collectionsData = await collectionsService.calculateRevenue({
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    });

    // This data would be used by FinancialReportingService in gatherReportData
    expect(collectionsData).toHaveProperty('totalCollections');
    expect(collectionsData).toHaveProperty('totalAmount');
    expect(collectionsData).toHaveProperty('successfulCollections');

    // Verify the data structure matches what FinancialReportingService expects
    const expectedProperties = [
      'totalCollections',
      'successfulCollections',
      'failedCollections',
      'totalAmount',
      'averageAmount',
      'collectionsByMethod',
      'collectionsByCurrency',
      'processingTime',
    ];

    expectedProperties.forEach(prop => {
      expect(collectionsData).toHaveProperty(prop);
    });
  });
});
