/**
 * Collections Domain Service Tests
 * Comprehensive testing following DDD patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CollectionsService, CollectionsServiceFactory, Payment } from './collections-service';
import {
  SQLiteCollectionsRepository,
  CollectionsRepositoryFactory,
} from './collections-repository';

// Mock repository for testing
class MockCollectionsRepository {
  private payments: Payment[] = [];
  private settlements: any[] = [];

  async savePayment(payment: Payment): Promise<Payment> {
    this.payments.push(payment);
    return payment;
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.payments.find(p => p.id === id) || null;
  }

  async findPaymentByReference(reference: string): Promise<Payment | null> {
    return this.payments.find(p => p.reference === reference) || null;
  }

  async findPaymentsInRange(timeRange: { start: Date; end: Date }): Promise<Payment[]> {
    return this.payments.filter(
      p => p.createdAt >= timeRange.start && p.createdAt <= timeRange.end
    );
  }

  async updatePaymentStatus(id: string, status: Payment['status']): Promise<void> {
    const payment = this.payments.find(p => p.id === id);
    if (payment) {
      payment.status = status;
      payment.updatedAt = new Date();
    }
  }

  async saveSettlement(settlement: any): Promise<any> {
    this.settlements.push(settlement);
    return settlement;
  }

  async findSettlementById(id: string): Promise<any | null> {
    return this.settlements.find(s => s.id === id) || null;
  }

  async findSettlementsInRange(timeRange: { start: Date; end: Date }): Promise<any[]> {
    return this.settlements.filter(
      s => s.settlementDate >= timeRange.start && s.settlementDate <= timeRange.end
    );
  }

  async findSettlementsByPaymentId(paymentId: string): Promise<any[]> {
    return this.settlements.filter(s => s.paymentId === paymentId);
  }

  // Test helper methods
  getAllPayments(): Payment[] {
    return [...this.payments];
  }

  getAllSettlements(): any[] {
    return [...this.settlements];
  }

  clear(): void {
    this.payments = [];
    this.settlements = [];
  }
}

describe('CollectionsService', () => {
  let service: CollectionsService;
  let mockRepo: MockCollectionsRepository;

  beforeEach(() => {
    mockRepo = new MockCollectionsRepository();
    service = new CollectionsService(mockRepo as any);
  });

  afterEach(() => {
    mockRepo.clear();
  });

  describe('processPayment', () => {
    it('should successfully process a valid payment', async () => {
      const paymentData = {
        amount: 100.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_789',
        metadata: { orderId: 'order_123' },
      };

      const result = await service.processPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^pay_/);
      expect(result.amount).toBe(100.0);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('completed');
      expect(result.customerId).toBe('cust_123');
      expect(result.reference).toBe('ref_789');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should reject payment with invalid amount', async () => {
      const paymentData = {
        amount: -50.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_789',
      };

      await expect(service.processPayment(paymentData)).rejects.toThrow('Amount must be positive');
    });

    it('should reject payment with unsupported currency', async () => {
      const paymentData = {
        amount: 100.0,
        currency: 'BTC' as any,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_789',
      };

      await expect(service.processPayment(paymentData)).rejects.toThrow('Unsupported currency');
    });

    it('should reject payment with duplicate reference', async () => {
      const paymentData = {
        amount: 100.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_789',
      };

      // Process first payment
      await service.processPayment(paymentData);

      // Try to process duplicate
      await expect(service.processPayment(paymentData)).rejects.toThrow(
        'Payment with this reference already exists'
      );
    });

    it('should handle different payment methods', async () => {
      const paymentMethods = ['card', 'bank_transfer', 'wallet', 'crypto'] as const;

      for (const method of paymentMethods) {
        const paymentData = {
          amount: 50.0,
          currency: 'USD' as const,
          paymentMethod: method,
          customerId: `cust_${method}`,
          merchantId: 'merc_456',
          reference: `ref_${method}_${Date.now()}`,
        };

        const result = await service.processPayment(paymentData);
        expect(result.paymentMethod).toBe(method);
        expect(result.status).toBe('completed');
      }
    });
  });

  describe('reconcileSettlement', () => {
    let payment: Payment;

    beforeEach(async () => {
      // Create a completed payment first
      const paymentData = {
        amount: 100.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_789',
      };

      payment = await service.processPayment(paymentData);
    });

    it('should successfully reconcile a settlement', async () => {
      const settlementData = {
        amount: 100.0,
        currency: 'USD' as const,
        status: 'completed' as const,
        settlementDate: new Date(),
        bankReference: 'bank_ref_123',
        fees: 2.5,
        netAmount: 97.5,
      };

      const result = await service.reconcileSettlement(payment.id, settlementData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^stl_/);
      expect(result.paymentId).toBe(payment.id);
      expect(result.amount).toBe(100.0);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('completed');
      expect(result.fees).toBe(2.5);
      expect(result.netAmount).toBe(97.5);
    });

    it('should reject settlement for non-existent payment', async () => {
      const settlementData = {
        amount: 100.0,
        currency: 'USD' as const,
        status: 'completed' as const,
        settlementDate: new Date(),
        fees: 2.5,
        netAmount: 97.5,
      };

      await expect(service.reconcileSettlement('non_existent_id', settlementData)).rejects.toThrow(
        'not found'
      );
    });

    it('should reject settlement with mismatched amount', async () => {
      const settlementData = {
        amount: 150.0, // Different from payment amount
        currency: 'USD' as const,
        status: 'completed' as const,
        settlementDate: new Date(),
        fees: 2.5,
        netAmount: 147.5,
      };

      await expect(service.reconcileSettlement(payment.id, settlementData)).rejects.toThrow(
        'Settlement amount 150 does not match payment amount 100'
      );
    });

    it('should reject settlement with mismatched currency', async () => {
      const settlementData = {
        amount: 100.0,
        currency: 'EUR' as const, // Different from payment currency
        status: 'completed' as const,
        settlementDate: new Date(),
        fees: 2.5,
        netAmount: 97.5,
      };

      await expect(service.reconcileSettlement(payment.id, settlementData)).rejects.toThrow(
        'Settlement currency EUR does not match payment currency USD'
      );
    });

    it('should reject settlement with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const settlementData = {
        amount: 100.0,
        currency: 'USD' as const,
        status: 'completed' as const,
        settlementDate: futureDate,
        fees: 2.5,
        netAmount: 97.5,
      };

      await expect(service.reconcileSettlement(payment.id, settlementData)).rejects.toThrow(
        'Settlement date cannot be in the future'
      );
    });
  });

  describe('calculateRevenue', () => {
    beforeEach(async () => {
      // Create some test payments
      const payments = [
        { amount: 100, customerId: 'cust_1', reference: 'ref_1' },
        { amount: 200, customerId: 'cust_2', reference: 'ref_2' },
        { amount: 150, customerId: 'cust_3', reference: 'ref_3' },
      ];

      for (const p of payments) {
        await service.processPayment({
          amount: p.amount,
          currency: 'USD' as const,
          paymentMethod: 'card' as const,
          customerId: p.customerId,
          merchantId: 'merc_456',
          reference: p.reference,
        });
      }
    });

    it('should calculate revenue metrics correctly', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        end: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      };

      const metrics = await service.calculateRevenue(timeRange);

      expect(metrics).toBeDefined();
      expect(metrics.totalCollections).toBe(3);
      expect(metrics.totalAmount).toBe(450); // 100 + 200 + 150
      expect(metrics.successRate).toBe(100); // All payments completed
      expect(metrics.revenueByMethod).toBeDefined();
      expect(metrics.revenueByMethod.card).toBe(450);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.dailyVolume).toBeGreaterThan(0);
    });

    it('should handle empty date range', async () => {
      const timeRange = {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        end: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      };

      const metrics = await service.calculateRevenue(timeRange);

      expect(metrics.totalCollections).toBe(0);
      expect(metrics.totalAmount).toBe(0);
      expect(metrics.successRate).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete payment to settlement workflow', async () => {
      // 1. Process payment
      const paymentData = {
        amount: 250.0,
        currency: 'USD' as const,
        paymentMethod: 'bank_transfer' as const,
        customerId: 'cust_workflow',
        merchantId: 'merc_workflow',
        reference: 'workflow_test_123',
      };

      const payment = await service.processPayment(paymentData);
      expect(payment.status).toBe('completed');

      // 2. Reconcile settlement
      const settlementData = {
        amount: 250.0,
        currency: 'USD' as const,
        status: 'completed' as const,
        settlementDate: new Date(),
        bankReference: 'bank_workflow_123',
        fees: 5.0,
        netAmount: 245.0,
      };

      const settlement = await service.reconcileSettlement(payment.id, settlementData);
      expect(settlement.status).toBe('completed');
      expect(settlement.paymentId).toBe(payment.id);

      // 3. Verify in metrics
      const timeRange = {
        start: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      const metrics = await service.calculateRevenue(timeRange);
      expect(metrics.totalCollections).toBeGreaterThanOrEqual(1);
      expect(metrics.totalAmount).toBeGreaterThanOrEqual(250);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Create a service with a broken repository
      const brokenRepo = {
        ...mockRepo,
        findPaymentById: () => Promise.reject(new Error('Database connection failed')),
      };

      const brokenService = new CollectionsService(brokenRepo as any);

      const paymentData = {
        amount: 100.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        customerId: 'cust_123',
        merchantId: 'merc_456',
        reference: 'ref_error_test',
      };

      await expect(brokenService.processPayment(paymentData)).rejects.toThrow();
    });

    it('should validate all required fields', async () => {
      const invalidPaymentData = {
        amount: 100.0,
        currency: 'USD' as const,
        paymentMethod: 'card' as const,
        // Missing customerId, merchantId, reference
      };

      await expect(service.processPayment(invalidPaymentData as any)).rejects.toThrow();
    });
  });
});

// Performance tests
describe('CollectionsService Performance', () => {
  let service: CollectionsService;
  let mockRepo: MockCollectionsRepository;

  beforeEach(() => {
    mockRepo = new MockCollectionsRepository();
    service = new CollectionsService(mockRepo as any);
  });

  it('should handle multiple concurrent payments', async () => {
    const paymentPromises = Array(10)
      .fill(null)
      .map((_, i) =>
        service.processPayment({
          amount: 100.0,
          currency: 'USD' as const,
          paymentMethod: 'card' as const,
          customerId: `cust_${i}`,
          merchantId: 'merc_test',
          reference: `ref_perf_${i}_${Date.now()}`,
        })
      );

    const startTime = Date.now();
    const results = await Promise.all(paymentPromises);
    const endTime = Date.now();

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.status).toBe('completed');
    });

    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
  });
});

console.log('✅ Collections Domain Tests Loaded');
console.log('Run tests with: bun test collections-service.test.ts');
