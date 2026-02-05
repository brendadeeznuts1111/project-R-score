/**
 * Financial Reporting Service Tests
 * Comprehensive testing following DDD patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  FinancialReportingService,
  FinancialReportingServiceFactory,
} from './services/financial-reporting-service';
import {
  FinancialReportingRepositoryFactory,
  SQLiteFinancialReportingRepository,
} from './repositories/financial-reporting-repository';
import { ReportType, ReportStatus, ComplianceStatus } from './entities/financial-report';

// Enhanced Mock services for testing
class MockCollectionsService {
  async calculateRevenue(timeRange: any) {
    return {
      totalCollections: 150,
      successfulCollections: 145,
      failedCollections: 5,
      totalAmount: 75000,
      averageAmount: 500,
      collectionsByMethod: { card: 100, bank_transfer: 45, wallet: 5 },
      collectionsByCurrency: { USD: 150 },
      processingTime: { average: 1200, min: 800, max: 2500 },
    };
  }
}

class MockSettlementsService {
  async getSettlementAnalytics(merchantId: any, dateRange: any) {
    return {
      totalSettlements: 145,
      successfulSettlements: 140,
      pendingSettlements: 3,
      failedSettlements: 2,
      totalAmount: 72500,
      totalFees: 725,
      netAmount: 71775,
      settlementsByMerchant: { merchant_1: 100, merchant_2: 45 },
      averageProcessingTime: 1800,
      settlementSuccessRate: 96.55,
    };
  }
}

class MockBalanceService {
  async getSystemBalanceSummary() {
    return {
      totalActiveBalances: 1000,
      totalBalanceAmount: 500000,
      averageBalance: 500,
      lowBalanceAlerts: 50,
      frozenBalances: 5,
      balanceDistribution: { low: 200, medium: 600, high: 200 },
      thresholdBreaches: 25,
    };
  }
}

// Mock database for testing
class MockDatabase {
  private reports: any[] = [];
  private settlements: any[] = [];
  private nextId = 1;

  run(sql: string, params?: any[]): any {
    if (sql.includes('INSERT INTO financial_reports')) {
      const report = {
        id: params?.[0],
        report_type: params?.[1],
        period_start: params?.[2],
        period_end: params?.[3],
        generated_at: params?.[4],
        status: params?.[5] || 'draft',
        compliance_status: params?.[6] || 'pending_review',
        approved_by: params?.[7] || null,
        approved_at: params?.[8] || null,
        published_at: params?.[9] || null,
        summary_data: params?.[10],
        collections_data: params?.[11],
        settlements_data: params?.[12],
        balance_data: params?.[13],
        revenue_data: params?.[14],
        compliance_data: params?.[15],
        created_at: params?.[16] || new Date().toISOString(),
        updated_at: params?.[17] || new Date().toISOString(),
        deleted_at: null,
      };
      this.reports.push(report);
      return { changes: 1 };
    }
    if (sql.includes('UPDATE financial_reports')) {
      const reportId = params?.[params.length - 1];
      const report = this.reports.find(r => r.id === reportId);
      if (report) {
        if (params?.[1]) report.status = params[1];
        if (params?.[3]) report.approved_by = params[3];
        if (params?.[5]) report.published_at = params[5];
        report.updated_at = new Date().toISOString();
      }
      return { changes: report ? 1 : 0 };
    }
    return { changes: 0 };
  }

  query(sql: string, params?: any[]): any {
    if (sql.includes('SELECT * FROM financial_reports WHERE id = ?')) {
      const report = this.reports.find(r => r.id === params?.[0] && !r.deleted_at);
      return {
        get: () => (report ? this.mapToRow(report) : null),
      };
    }
    if (sql.includes('SELECT * FROM financial_reports')) {
      const filteredReports = this.reports.filter(r => !r.deleted_at);
      return {
        all: () => filteredReports.map(r => this.mapToRow(r)),
      };
    }
    return {
      get: () => null,
      all: () => [],
    };
  }

  private mapToRow(report: any) {
    return {
      id: report.id,
      report_type: report.report_type,
      period_start: report.period_start,
      period_end: report.period_end,
      generated_at: report.generated_at,
      status: report.status,
      compliance_status: report.compliance_status,
      approved_by: report.approved_by,
      approved_at: report.approved_at,
      published_at: report.published_at,
      summary_data: report.summary_data,
      collections_data: report.collections_data,
      settlements_data: report.settlements_data,
      balance_data: report.balance_data,
      revenue_data: report.revenue_data,
      compliance_data: report.compliance_data,
      created_at: report.created_at,
      updated_at: report.updated_at,
    };
  }

  clear() {
    this.reports = [];
    this.settlements = [];
    this.nextId = 1;
  }
}

// Global mock database instance for testing
let globalMockDb = new MockDatabase();

describe('FinancialReportingService', () => {
  let service: FinancialReportingService;
  let mockCollectionsService: MockCollectionsService;
  let mockSettlementsService: MockSettlementsService;
  let mockBalanceService: MockBalanceService;

  beforeEach(() => {
    mockCollectionsService = new MockCollectionsService();
    mockSettlementsService = new MockSettlementsService();
    mockBalanceService = new MockBalanceService();

    // Reset global mock database for each test
    globalMockDb.clear();

    // Create a repository with mock database
    const repository = FinancialReportingRepositoryFactory.createWithMockDatabase(globalMockDb);

    service = FinancialReportingServiceFactory.create(repository, {
      collectionsService: mockCollectionsService,
      settlementsService: mockSettlementsService,
      balanceService: mockBalanceService,
    });
  });

  describe('generateReport', () => {
    it('should successfully generate a comprehensive financial report', async () => {
      const request = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        includeCollections: true,
        includeSettlements: true,
        includeBalances: true,
        includeRevenue: true,
        includeCompliance: true,
      };

      const result = await service.generateReport(request);

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.report.getId()).toMatch(/^report_/);
      expect(result.report.getReportType()).toBe(ReportType.MONTHLY);
      expect(result.report.getStatus()).toBe(ReportStatus.DRAFT);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.dataSources).toContain('collections');
      expect(result.dataSources).toContain('settlements');
      expect(result.dataSources).toContain('balance');
      expect(result.dataSources).toContain('compliance');

      // Verify aggregated data
      const summary = result.report.getSummary();
      expect(summary.totalCollections).toBe(150);
      expect(summary.totalSettlements).toBe(145);
      expect(summary.totalRevenue).toBe(75000);
      expect(summary.netProfit).toBe(74275); // 75000 - 725
    });

    it('should reject report generation with invalid period', async () => {
      const request = {
        reportType: ReportType.WEEKLY,
        periodStart: new Date('2024-01-31'),
        periodEnd: new Date('2024-01-01'), // End before start
      };

      await expect(service.generateReport(request)).rejects.toThrow(
        'Period start must be before period end'
      );
    });

    it('should reject report generation with invalid report type', async () => {
      const request = {
        reportType: 'invalid_type' as any,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      await expect(service.generateReport(request)).rejects.toThrow('Invalid report type');
    });

    it('should handle missing optional services gracefully', async () => {
      const serviceWithoutServices = FinancialReportingServiceFactory.create(
        FinancialReportingRepositoryFactory.createWithMockDatabase(new MockDatabase())
      );

      const request = {
        reportType: ReportType.DAILY,
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() - 12 * 60 * 60 * 1000),
        includeCollections: false,
        includeSettlements: false,
        includeBalances: false,
      };

      const result = await serviceWithoutServices.generateReport(request);

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.dataSources).not.toContain('collections');
      expect(result.dataSources).not.toContain('settlements');
      expect(result.dataSources).not.toContain('balance');
    });

    it('should generate reports with different types', async () => {
      const reportTypes = [
        ReportType.DAILY,
        ReportType.WEEKLY,
        ReportType.MONTHLY,
        ReportType.QUARTERLY,
      ];

      for (let i = 0; i < reportTypes.length; i++) {
        const reportType = reportTypes[i];
        const baseDate = new Date('2024-09-01');
        const startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() + i * 10); // Space out by 10 days each
        const endDate = new Date(startDate);

        if (reportType === ReportType.DAILY) {
          // Keep same day for daily
        } else if (reportType === ReportType.WEEKLY) {
          endDate.setDate(startDate.getDate() + 6);
        } else if (reportType === ReportType.MONTHLY) {
          endDate.setMonth(startDate.getMonth() + 1);
          endDate.setDate(0); // Last day of month
        } else if (reportType === ReportType.QUARTERLY) {
          endDate.setMonth(startDate.getMonth() + 3);
          endDate.setDate(0);
        }

        const request = {
          reportType,
          periodStart: startDate,
          periodEnd: endDate,
        };

        const result = await service.generateReport(request);
        expect(result.report.getReportType()).toBe(reportType);
      }
    });
  });

  describe('approveReport', () => {
    let reportId: string;

    beforeEach(async () => {
      const request = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-02-01'), // Different period to avoid conflicts
        periodEnd: new Date('2024-02-28'),
      };

      const result = await service.generateReport(request);
      reportId = result.report.getId();

      // Mark report for review (simulate business process)
      const reports = await service.searchReports({});
      const report = reports.find(r => r.getId() === reportId);
      if (report) {
        report.markForReview();
        // Update the mock database directly
        const dbReport = globalMockDb['reports'].find(r => r.id === reportId);
        if (dbReport) {
          dbReport.status = 'pending_review';
        }
      }
    });

    it('should successfully approve a pending review report', async () => {
      const approvedReport = await service.approveReport(reportId, 'test_approver');

      expect(approvedReport.getStatus()).toBe(ReportStatus.APPROVED);
      expect(approvedReport.getApprovedBy()).toBe('test_approver');
      expect(approvedReport.getApprovedAt()).toBeInstanceOf(Date);
    });

    it('should reject approval of non-pending-review report', async () => {
      // First approve the report
      await service.approveReport(reportId, 'test_approver');

      // Try to approve again
      await expect(service.approveReport(reportId, 'another_approver')).rejects.toThrow(
        'Cannot approve report with status: approved'
      );
    });

    it('should reject approval of non-existent report', async () => {
      await expect(service.approveReport('non_existent_id', 'test_approver')).rejects.toThrow(
        'Financial report not found'
      );
    });
  });

  describe('publishReport', () => {
    it('should reject publishing of draft report', async () => {
      // Create a new draft report
      const request = {
        reportType: ReportType.WEEKLY,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-07'),
      };

      const result = await service.generateReport(request);

      await expect(service.publishReport(result.report.getId())).rejects.toThrow(
        'Cannot publish report with status: draft'
      );
    });
  });

  describe('checkCompliance', () => {
    let reportId: string;

    beforeEach(async () => {
      const request = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      const result = await service.generateReport(request);
      reportId = result.report.getId();
    });

    it('should perform comprehensive compliance check', async () => {
      const reports = await service.searchReports({});
      const report = reports.find(r => r.getId() === reportId)!;

      const complianceResult = await service.checkCompliance(report);

      expect(complianceResult).toBeDefined();
      expect(complianceResult.reportId).toBe(reportId);
      expect(complianceResult.isCompliant).toBe(true);
      expect(complianceResult.issues).toBeDefined();
      expect(complianceResult.recommendations).toBeDefined();
    });

    it('should identify critical compliance issues', async () => {
      // Create a new report with a different period to avoid conflicts
      const request = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
      };

      const result = await service.generateReport(request);
      const report = result.report;

      // Create a mock report with critical issues by accessing the private methods
      const mockReport = {
        getId: () => report.getId(),
        getSummary: () => ({
          totalRevenue: -1000,
          totalCollections: 0,
          totalSettlements: 0,
          netProfit: -1000,
          totalFees: 0,
          currency: 'USD',
        }),
        getCollections: () => ({
          totalCollections: 0,
          successfulCollections: 0,
          failedCollections: 0,
          totalAmount: 0,
          averageAmount: 0,
          collectionsByMethod: {},
          collectionsByCurrency: {},
          processingTime: { average: 0, min: 0, max: 0 },
        }),
        getSettlements: () => ({
          totalSettlements: 0,
          successfulSettlements: 0,
          pendingSettlements: 0,
          failedSettlements: 0,
          totalAmount: 0,
          totalFees: 0,
          netAmount: 0,
          settlementsByMerchant: {},
          averageProcessingTime: 0,
          settlementSuccessRate: 0,
        }),
        getBalance: () => ({
          totalActiveBalances: 0,
          totalBalanceAmount: 0,
          averageBalance: 0,
          lowBalanceAlerts: 0,
          frozenBalances: 0,
          balanceDistribution: { low: 0, medium: 0, high: 0 },
          thresholdBreaches: 0,
        }),
        getRevenue: () => ({
          grossRevenue: -1000,
          netRevenue: -1000,
          revenueBySource: {},
          revenueTrend: [],
          topRevenueSources: [],
          revenueGrowth: { daily: 0, weekly: 0, monthly: 0 },
        }),
        getCompliance: () => ({
          pciDssCompliant: false,
          amlCompliant: true,
          kycCompliant: true,
          gdprCompliant: true,
          auditTrailComplete: true,
          requiredFilings: [],
          complianceIssues: [],
        }),
      };

      const complianceResult = await service.checkCompliance(mockReport as any);

      expect(complianceResult.isCompliant).toBe(false);
      expect(complianceResult.issues.length).toBeGreaterThan(0);
      expect(complianceResult.issues.some(issue => issue.severity === 'critical')).toBe(true);
    });
  });

  describe('getAnalytics', () => {
    beforeEach(async () => {
      // Generate multiple reports for analytics with different periods
      const reportTypes = [ReportType.DAILY, ReportType.WEEKLY, ReportType.MONTHLY];
      const periods = [
        { start: '2024-09-01', end: '2024-09-01' },
        { start: '2024-09-02', end: '2024-09-08' },
        { start: '2024-09-01', end: '2024-09-30' },
      ];

      for (let i = 0; i < reportTypes.length; i++) {
        const request = {
          reportType: reportTypes[i],
          periodStart: new Date(periods[i].start),
          periodEnd: new Date(periods[i].end),
        };

        await service.generateReport(request);
      }
    });

    it('should generate comprehensive analytics', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.period).toBeDefined();
      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalReports).toBeGreaterThan(0);
      expect(analytics.trends).toBeDefined();
      expect(analytics.trends.revenue).toBeDefined();
      expect(analytics.trends.compliance).toBeDefined();
      expect(analytics.trends.volume).toBeDefined();
      expect(analytics.alerts).toBeDefined();
    });

    it('should calculate compliance rate correctly', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics.summary.complianceRate).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.complianceRate).toBeLessThanOrEqual(100);
    });

    it('should generate alerts for issues', async () => {
      // Create an overdue report
      const overdueRequest = {
        reportType: ReportType.DAILY,
        periodStart: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        periodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      await service.generateReport(overdueRequest);

      const analytics = await service.getAnalytics();

      expect(analytics.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('searchReports', () => {
    beforeEach(async () => {
      // Generate test reports with different periods
      const reports = [
        {
          type: ReportType.DAILY,
          period: { start: '2024-10-01', end: '2024-10-01' },
          status: ReportStatus.DRAFT,
        },
        {
          type: ReportType.WEEKLY,
          period: { start: '2024-10-02', end: '2024-10-08' },
          status: ReportStatus.PENDING_REVIEW,
        },
        {
          type: ReportType.MONTHLY,
          period: { start: '2024-10-01', end: '2024-10-31' },
          status: ReportStatus.APPROVED,
        },
        {
          type: ReportType.QUARTERLY,
          period: { start: '2024-10-01', end: '2024-12-31' },
          status: ReportStatus.PUBLISHED,
        },
      ];

      for (const report of reports) {
        const request = {
          reportType: report.type,
          periodStart: new Date(report.period.start),
          periodEnd: new Date(report.period.end),
        };

        const result = await service.generateReport(request);

        // Note: Status updates would be handled by business processes in real implementation
      }
    });

    it('should search reports by type', async () => {
      const dailyReports = await service.searchReports({
        reportType: ReportType.DAILY,
      });
      const weeklyReports = await service.searchReports({
        reportType: ReportType.WEEKLY,
      });

      expect(dailyReports.length).toBeGreaterThan(0);
      expect(weeklyReports.length).toBeGreaterThan(0);

      dailyReports.forEach(report => {
        expect(report.getReportType()).toBe(ReportType.DAILY);
      });

      weeklyReports.forEach(report => {
        expect(report.getReportType()).toBe(ReportType.WEEKLY);
      });
    });

    it('should search reports by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const reports = await service.searchReports({
        periodStart: startDate,
        periodEnd: endDate,
      });

      expect(reports.length).toBeGreaterThan(0);

      reports.forEach(report => {
        expect(report.getPeriodStart().getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(report.getPeriodEnd().getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle pagination', async () => {
      const allReports = await service.searchReports({ limit: 100 });
      const paginatedReports = await service.searchReports({
        limit: 2,
        offset: 1,
      });

      expect(paginatedReports.length).toBeLessThanOrEqual(2);
      expect(allReports.length).toBeGreaterThanOrEqual(paginatedReports.length);
    });
  });

  describe('getReportsRequiringAttention', () => {
    beforeEach(async () => {
      // Generate reports with different periods and statuses
      const reports = [
        {
          type: ReportType.DAILY,
          period: { start: '2024-11-01', end: '2024-11-01' },
          overdue: true,
        },
        {
          type: ReportType.WEEKLY,
          period: { start: '2024-11-02', end: '2024-11-08' },
          complianceIssue: true,
        },
        {
          type: ReportType.MONTHLY,
          period: { start: '2024-11-01', end: '2024-11-30' },
          pendingReview: true,
        },
      ];

      for (const report of reports) {
        const periodEnd = report.overdue
          ? new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
          : new Date(report.period.end);

        const request = {
          reportType: report.type,
          periodStart: new Date(report.period.start),
          periodEnd,
        };

        await service.generateReport(request);
      }
    });

    it('should identify reports requiring attention', async () => {
      const attentionReports = await service.getReportsRequiringAttention();

      expect(attentionReports.length).toBeGreaterThan(0);

      // All returned reports should require attention
      attentionReports.forEach(report => {
        expect(report.requiresAttention()).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // Create service with broken dependencies
      const brokenService = FinancialReportingServiceFactory.create(
        FinancialReportingRepositoryFactory.createWithMockDatabase(new MockDatabase()),
        {
          collectionsService: {
            calculateRevenue: () => Promise.reject(new Error('Service unavailable')),
          },
          settlementsService: mockSettlementsService,
          balanceService: mockBalanceService,
        }
      );

      const request = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-07-01'), // Different period to avoid conflicts
        periodEnd: new Date('2024-07-31'),
        includeCollections: true,
      };

      // Should not throw, but should handle the error gracefully
      const result = await brokenService.generateReport(request);
      expect(result).toBeDefined();
      expect(result.report).toBeDefined();
      // Data sources should not include collections due to error
      expect(result.dataSources).not.toContain('collections');
    });

    it('should validate all required parameters', async () => {
      const invalidRequests = [
        { reportType: null, periodStart: new Date(), periodEnd: new Date() },
        {
          reportType: ReportType.MONTHLY,
          periodStart: null,
          periodEnd: new Date(),
        },
        {
          reportType: ReportType.MONTHLY,
          periodStart: new Date(),
          periodEnd: null,
        },
        {
          reportType: ReportType.MONTHLY,
          periodStart: new Date('2024-01-31'),
          periodEnd: new Date('2024-01-01'),
        },
      ];

      for (const request of invalidRequests) {
        await expect(service.generateReport(request as any)).rejects.toThrow();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent report generations', async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, i) => ({
          reportType: ReportType.DAILY,
          periodStart: new Date(`2024-08-${String(i + 1).padStart(2, '0')}`),
          periodEnd: new Date(`2024-08-${String(i + 1).padStart(2, '0')}`),
        }));

      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => service.generateReport(req)));
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.report).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large date ranges efficiently', async () => {
      const request = {
        reportType: ReportType.CUSTOM,
        periodStart: new Date('2024-08-01'),
        periodEnd: new Date('2024-08-31'), // One month period
      };

      const startTime = Date.now();
      const result = await service.generateReport(request);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.report).toBeDefined();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Integration Tests', () => {
    it('should complete full report lifecycle', async () => {
      // 1. Generate report
      const generateRequest = {
        reportType: ReportType.MONTHLY,
        periodStart: new Date('2024-12-01'), // Different period to avoid conflicts
        periodEnd: new Date('2024-12-31'),
      };

      const generateResult = await service.generateReport(generateRequest);
      expect(generateResult.report.getStatus()).toBe(ReportStatus.DRAFT);

      // 2. Mark for review (business process step)
      const reports = await service.searchReports({});
      const report = reports.find(r => r.getId() === generateResult.report.getId());
      if (report) {
        report.markForReview();
        // Update the mock database directly
        const dbReport = globalMockDb['reports'].find(r => r.id === report.getId());
        if (dbReport) {
          dbReport.status = 'pending_review';
        }
      }

      // 3. Check compliance
      const complianceResult = await service.checkCompliance(report!);
      expect(complianceResult).toBeDefined();

      // 4. Approve report
      const approvedReport = await service.approveReport(
        generateResult.report.getId(),
        'test_approver'
      );
      expect(approvedReport.getStatus()).toBe(ReportStatus.APPROVED);

      // 5. Publish report (requires approved status)
      const publishedReport = await service.publishReport(approvedReport.getId());
      expect(publishedReport.getStatus()).toBe(ReportStatus.PUBLISHED);

      // 6. Verify in search results
      const publishedReports = await service.searchReports({
        status: ReportStatus.PUBLISHED,
      });
      expect(publishedReports.some(r => r.getId() === generateResult.report.getId())).toBe(true);
    });
  });
});

console.log('✅ Financial Reporting Domain Tests Loaded');
console.log('Run tests with: bun test financial-reporting-service.test.ts');
