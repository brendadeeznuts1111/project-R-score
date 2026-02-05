/**
 * Financial Reporting Domain Integration Tests
 * Tests the complete integration with other domains
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FinancialReportingControllerFactory } from './financial-reporting-controller';
import { FinancialReportingRepositoryFactory } from './repositories/financial-reporting-repository';
import { ReportType, ReportStatus, ComplianceStatus } from './entities/financial-report';

// Mock integrated domain services
class IntegratedCollectionsService {
  private collections: any[] = [];

  async processPayment(paymentData: any) {
    const payment = {
      id: `pay_${Date.now()}`,
      ...paymentData,
      status: 'completed',
      processedAt: new Date(),
    };
    this.collections.push(payment);
    return payment;
  }

  async calculateRevenue(timeRange: { start: Date; end: Date }) {
    // Simulate revenue calculation from actual collections
    const relevantCollections = this.collections.filter(
      c =>
        new Date(c.createdAt) >= timeRange.start &&
        new Date(c.createdAt) <= timeRange.end &&
        c.status === 'completed'
    );

    return {
      totalCollections: relevantCollections.length,
      successfulCollections: relevantCollections.length,
      failedCollections: 0,
      totalAmount: relevantCollections.reduce((sum, c) => sum + c.amount, 0),
      averageAmount:
        relevantCollections.length > 0
          ? relevantCollections.reduce((sum, c) => sum + c.amount, 0) / relevantCollections.length
          : 0,
      collectionsByMethod: this.groupByMethod(relevantCollections),
      collectionsByCurrency: this.groupByCurrency(relevantCollections),
      processingTime: { average: 1200, min: 800, max: 2500 },
    };
  }

  private groupByMethod(collections: any[]) {
    return collections.reduce((acc, c) => {
      acc[c.paymentMethod] = (acc[c.paymentMethod] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByCurrency(collections: any[]) {
    return collections.reduce((acc, c) => {
      acc[c.currency] = (acc[c.currency] || 0) + 1;
      return acc;
    }, {});
  }
}

class IntegratedSettlementsService {
  private settlements: any[] = [];

  async processSettlement(settlementData: any) {
    const settlement = {
      id: `stl_${Date.now()}`,
      ...settlementData,
      status: 'completed',
      processedAt: new Date(),
    };
    this.settlements.push(settlement);
    return settlement;
  }

  async getSettlementAnalytics(
    merchantId: string | undefined,
    dateRange: { start: Date; end: Date }
  ) {
    const relevantSettlements = this.settlements.filter(
      s =>
        new Date(s.settlementDate) >= dateRange.start &&
        new Date(s.settlementDate) <= dateRange.end &&
        s.status === 'completed'
    );

    return {
      totalSettlements: relevantSettlements.length,
      successfulSettlements: relevantSettlements.length,
      pendingSettlements: 0,
      failedSettlements: 0,
      totalAmount: relevantSettlements.reduce((sum, s) => sum + s.amount, 0),
      totalFees: relevantSettlements.reduce((sum, s) => sum + s.fees, 0),
      netAmount: relevantSettlements.reduce((sum, s) => sum + s.netAmount, 0),
      settlementsByMerchant: this.groupByMerchant(relevantSettlements),
      averageProcessingTime: 1800,
      settlementSuccessRate: 100,
    };
  }

  private groupByMerchant(settlements: any[]) {
    return settlements.reduce((acc, s) => {
      acc[s.merchantId] = (acc[s.merchantId] || 0) + 1;
      return acc;
    }, {});
  }
}

class IntegratedBalanceService {
  private balances: Map<string, any> = new Map();

  async createBalance(balanceData: any) {
    const balance = {
      id: `bal_${Date.now()}`,
      ...balanceData,
      currentBalance: balanceData.initialBalance || 0,
      isActive: true,
      lastActivity: new Date(),
    };
    this.balances.set(balance.customerId, balance);
    return balance;
  }

  async updateBalance(customerId: string, amount: number, type: 'credit' | 'debit') {
    const balance = this.balances.get(customerId);
    if (balance) {
      balance.currentBalance += type === 'credit' ? amount : -amount;
      balance.lastActivity = new Date();
    }
    return balance;
  }

  async getSystemBalanceSummary() {
    const balances = Array.from(this.balances.values());

    return {
      totalActiveBalances: balances.filter(b => b.isActive).length,
      totalBalanceAmount: balances.reduce((sum, b) => sum + b.currentBalance, 0),
      averageBalance:
        balances.length > 0
          ? balances.reduce((sum, b) => sum + b.currentBalance, 0) / balances.length
          : 0,
      lowBalanceAlerts: balances.filter(b => b.currentBalance < 100).length,
      frozenBalances: balances.filter(b => !b.isActive).length,
      balanceDistribution: {
        low: balances.filter(b => b.currentBalance < 100).length,
        medium: balances.filter(b => b.currentBalance >= 100 && b.currentBalance < 1000).length,
        high: balances.filter(b => b.currentBalance >= 1000).length,
      },
      thresholdBreaches: balances.filter(b => b.currentBalance < 50).length,
    };
  }
}

describe('Financial Reporting Domain Integration', () => {
  let controller: any;
  let collectionsService: IntegratedCollectionsService;
  let settlementsService: IntegratedSettlementsService;
  let balanceService: IntegratedBalanceService;

  beforeEach(() => {
    collectionsService = new IntegratedCollectionsService();
    settlementsService = new IntegratedSettlementsService();
    balanceService = new IntegratedBalanceService();

    const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
    controller = FinancialReportingControllerFactory.create(repository, {
      collectionsService,
      settlementsService,
      balanceService,
    });
  });

  describe('End-to-End Payment to Report Flow', () => {
    it('should track complete payment lifecycle through to financial reporting', async () => {
      // 1. Setup initial data
      console.log('🏗️ Setting up test data...');

      // Create customer balances
      await balanceService.createBalance({
        customerId: 'customer_1',
        agentId: 'agent_1',
        initialBalance: 1000,
      });

      await balanceService.createBalance({
        customerId: 'customer_2',
        agentId: 'agent_1',
        initialBalance: 500,
      });

      // Process payments
      console.log('💳 Processing payments...');
      const payments = [
        await collectionsService.processPayment({
          amount: 200,
          currency: 'USD',
          paymentMethod: 'card',
          customerId: 'customer_1',
          merchantId: 'merchant_1',
          reference: 'payment_1',
        }),
        await collectionsService.processPayment({
          amount: 150,
          currency: 'USD',
          paymentMethod: 'bank_transfer',
          customerId: 'customer_2',
          merchantId: 'merchant_1',
          reference: 'payment_2',
        }),
        await collectionsService.processPayment({
          amount: 300,
          currency: 'EUR',
          paymentMethod: 'card',
          customerId: 'customer_1',
          merchantId: 'merchant_2',
          reference: 'payment_3',
        }),
      ];

      // Process settlements
      console.log('💰 Processing settlements...');
      const settlements = [
        await settlementsService.processSettlement({
          paymentId: payments[0].id,
          merchantId: 'merchant_1',
          amount: 200,
          currency: 'USD',
          settlementDate: new Date(),
          fees: 4,
          netAmount: 196,
        }),
        await settlementsService.processSettlement({
          paymentId: payments[1].id,
          merchantId: 'merchant_1',
          amount: 150,
          currency: 'USD',
          settlementDate: new Date(),
          fees: 3,
          netAmount: 147,
        }),
      ];

      // Update balances
      console.log('🏦 Updating balances...');
      await balanceService.updateBalance('customer_1', 200, 'debit');
      await balanceService.updateBalance('customer_2', 150, 'debit');

      // 2. Generate financial report
      console.log('📊 Generating financial report...');
      const reportResponse = await controller.generateReport({
        reportType: ReportType.DAILY,
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        includeCollections: true,
        includeSettlements: true,
        includeBalances: true,
        includeRevenue: true,
        includeCompliance: true,
      });

      expect(reportResponse.success).toBe(true);
      const report = reportResponse.data.report;

      // 3. Verify report accuracy
      console.log('✅ Verifying report data...');

      // Collections data
      expect(report.collections.totalCollections).toBe(3);
      expect(report.collections.totalAmount).toBe(650); // 200 + 150 + 300
      expect(report.collections.collectionsByMethod.card).toBe(2);
      expect(report.collections.collectionsByMethod.bank_transfer).toBe(1);
      expect(report.collections.collectionsByCurrency.USD).toBe(2);
      expect(report.collections.collectionsByCurrency.EUR).toBe(1);

      // Settlements data
      expect(report.settlements.totalSettlements).toBe(2);
      expect(report.settlements.totalAmount).toBe(350); // 200 + 150
      expect(report.settlements.totalFees).toBe(7); // 4 + 3
      expect(report.settlements.netAmount).toBe(343); // 196 + 147

      // Balance data
      expect(report.balance.totalActiveBalances).toBe(2);
      expect(report.balance.totalBalanceAmount).toBe(1150); // 1000 - 200 + 500 - 150

      // Revenue summary
      expect(report.summary.totalRevenue).toBe(650);
      expect(report.summary.totalCollections).toBe(3);
      expect(report.summary.totalSettlements).toBe(2);
      expect(report.summary.netProfit).toBe(643); // 650 - 7

      console.log('🎉 End-to-end flow verification complete!');
    });
  });

  describe('Multi-Domain Data Consistency', () => {
    it('should maintain data consistency across domains', async () => {
      // Create test scenario with known data
      const testScenario = {
        payments: [
          { amount: 1000, currency: 'USD', customer: 'cust_1' },
          { amount: 500, currency: 'EUR', customer: 'cust_2' },
          { amount: 750, currency: 'USD', customer: 'cust_1' },
        ],
        settlements: [
          { amount: 1000, fees: 10, merchant: 'merc_1' },
          { amount: 750, fees: 7.5, merchant: 'merc_1' },
        ],
        expected: {
          totalRevenue: 2250, // 1000 + 500 + 750
          totalFees: 17.5, // 10 + 7.5
          netRevenue: 2232.5, // 2250 - 17.5
          totalCollections: 3,
          totalSettlements: 2,
        },
      };

      // Process payments
      for (const payment of testScenario.payments) {
        await collectionsService.processPayment({
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: 'card',
          customerId: payment.customer,
          merchantId: 'merc_1',
          reference: `ref_${Date.now()}`,
        });
      }

      // Process settlements
      for (const settlement of testScenario.settlements) {
        await settlementsService.processSettlement({
          paymentId: `pay_${Date.now()}`,
          merchantId: settlement.merchant,
          amount: settlement.amount,
          currency: 'USD',
          settlementDate: new Date(),
          fees: settlement.fees,
          netAmount: settlement.amount - settlement.fees,
        });
      }

      // Generate report
      const reportResponse = await controller.generateReport({
        reportType: ReportType.MONTHLY,
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
      });

      expect(reportResponse.success).toBe(true);
      const report = reportResponse.data.report;

      // Verify data consistency
      expect(report.summary.totalRevenue).toBe(testScenario.expected.totalRevenue);
      expect(report.summary.totalFees).toBe(testScenario.expected.totalFees);
      expect(report.summary.netProfit).toBe(testScenario.expected.netRevenue);
      expect(report.summary.totalCollections).toBe(testScenario.expected.totalCollections);
      expect(report.summary.totalSettlements).toBe(testScenario.expected.totalSettlements);

      // Verify collections breakdown
      expect(report.collections.totalCollections).toBe(testScenario.expected.totalCollections);
      expect(report.collections.totalAmount).toBe(testScenario.expected.totalRevenue);

      // Verify settlements breakdown
      expect(report.settlements.totalSettlements).toBe(testScenario.expected.totalSettlements);
      expect(report.settlements.totalFees).toBe(testScenario.expected.totalFees);
    });
  });

  describe('Real-time Data Integration', () => {
    it('should reflect real-time changes in financial reports', async () => {
      // Generate initial report
      const initialReport = await controller.generateReport({
        reportType: ReportType.DAILY,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      });

      expect(initialReport.success).toBe(true);
      const initialData = initialReport.data.report;

      // Process new payment
      await collectionsService.processPayment({
        amount: 500,
        currency: 'USD',
        paymentMethod: 'card',
        customerId: 'new_customer',
        merchantId: 'merchant_1',
        reference: 'real_time_test',
      });

      // Generate updated report
      const updatedReport = await controller.generateReport({
        reportType: ReportType.DAILY,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      });

      expect(updatedReport.success).toBe(true);
      const updatedData = updatedReport.data.report;

      // Verify real-time data inclusion
      expect(updatedData.collections.totalCollections).toBe(
        initialData.collections.totalCollections + 1
      );
      expect(updatedData.collections.totalAmount).toBe(initialData.collections.totalAmount + 500);
      expect(updatedData.summary.totalRevenue).toBe(initialData.summary.totalRevenue + 500);
    });
  });

  describe('Cross-Domain Event Propagation', () => {
    it('should handle domain events from integrated services', async () => {
      // This test would verify that events from collections/settlements/balance
      // domains are properly captured and reflected in financial reports

      // Generate report
      const reportResponse = await controller.generateReport({
        reportType: ReportType.WEEKLY,
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
      });

      expect(reportResponse.success).toBe(true);

      // In a real implementation, we would verify that domain events
      // were published and handled correctly
      const report = reportResponse.data.report;

      // Verify report contains expected data from all domains
      expect(report.collections).toBeDefined();
      expect(report.settlements).toBeDefined();
      expect(report.balance).toBeDefined();
      expect(report.compliance).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-volume data efficiently', async () => {
      // Generate high volume of test data
      const numPayments = 100;
      const payments = [];

      console.log(`📊 Generating ${numPayments} test payments...`);

      for (let i = 0; i < numPayments; i++) {
        const payment = await collectionsService.processPayment({
          amount: Math.floor(Math.random() * 1000) + 100,
          currency: 'USD',
          paymentMethod: i % 2 === 0 ? 'card' : 'bank_transfer',
          customerId: `customer_${i % 10}`,
          merchantId: `merchant_${i % 5}`,
          reference: `load_test_${i}`,
        });
        payments.push(payment);
      }

      // Measure report generation time
      const startTime = Date.now();

      const reportResponse = await controller.generateReport({
        reportType: ReportType.MONTHLY,
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
      });

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      expect(reportResponse.success).toBe(true);
      expect(generationTime).toBeLessThan(5000); // Should complete within 5 seconds

      const report = reportResponse.data.report;

      // Verify all payments are included
      expect(report.collections.totalCollections).toBe(numPayments);

      // Calculate expected total
      const expectedTotal = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(report.collections.totalAmount).toBe(expectedTotal);

      console.log(`⚡ Generated report with ${numPayments} payments in ${generationTime}ms`);
    });
  });

  describe('Data Quality and Validation', () => {
    it('should validate data integrity across domains', async () => {
      // Process payments and settlements
      const payments = [];
      const settlements = [];

      for (let i = 0; i < 5; i++) {
        const payment = await collectionsService.processPayment({
          amount: 100 * (i + 1),
          currency: 'USD',
          paymentMethod: 'card',
          customerId: `customer_${i}`,
          merchantId: 'merchant_1',
          reference: `validation_test_${i}`,
        });
        payments.push(payment);

        // Create corresponding settlement
        if (i < 3) {
          // Only settle first 3 payments
          const settlement = await settlementsService.processSettlement({
            paymentId: payment.id,
            merchantId: 'merchant_1',
            amount: payment.amount,
            currency: 'USD',
            settlementDate: new Date(),
            fees: payment.amount * 0.02, // 2% fee
            netAmount: payment.amount * 0.98,
          });
          settlements.push(settlement);
        }
      }

      // Generate report
      const reportResponse = await controller.generateReport({
        reportType: ReportType.DAILY,
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
      });

      expect(reportResponse.success).toBe(true);
      const report = reportResponse.data.report;

      // Validate data consistency
      const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
      const totalFees = settlements.reduce((sum, s) => sum + s.fees, 0);

      expect(report.collections.totalAmount).toBe(totalPaymentAmount);
      expect(report.settlements.totalAmount).toBe(totalSettlementAmount);
      expect(report.settlements.totalFees).toBe(totalFees);
      expect(report.summary.totalRevenue).toBe(totalPaymentAmount);
      expect(report.summary.totalFees).toBe(totalFees);
      expect(report.summary.netProfit).toBe(totalPaymentAmount - totalFees);
    });
  });
});

console.log('🔗 Financial Reporting Domain Integration Tests Loaded');
console.log('Run tests with: bun test financial-reporting-integration.test.ts');
