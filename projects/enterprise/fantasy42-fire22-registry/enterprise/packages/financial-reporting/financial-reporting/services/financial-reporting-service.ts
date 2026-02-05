/**
 * Financial Reporting Service
 * Domain-Driven Design Implementation
 *
 * Business logic for financial report generation, compliance, and analytics
 */

import {
  FinancialReport,
  ReportType,
  ReportStatus,
  ComplianceStatus,
} from '../entities/financial-report';
import { FinancialReportingRepository } from '../repositories/financial-reporting-repository';
import type { FinancialReportQuery } from '../repositories/financial-reporting-repository';
import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { CollectionsService } from '../../collections/collections.controller';
import { AccountingPeriod } from '../value-objects/accounting-period';
import { TimezoneUtils, TimezoneContext } from '../../../shared/timezone-configuration';

// 🚀 BUN 1.1.X OPTIMIZATION: Precise mathematical operations for financial calculations
import { PreciseMath } from '../utils/precise-math';

export interface GenerateReportRequest {
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  includeCollections?: boolean;
  includeSettlements?: boolean;
  includeBalances?: boolean;
  includeRevenue?: boolean;
  includeCompliance?: boolean;
}

export interface ReportGenerationResult {
  report: FinancialReport;
  processingTime: number;
  dataSources: string[];
}

export interface ComplianceCheckResult {
  reportId: string;
  isCompliant: boolean;
  issues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
  recommendations: string[];
}

export interface AnalyticsResult {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalReports: number;
    complianceRate: number;
    averageProcessingTime: number;
    reportsByType: Record<ReportType, number>;
  };
  trends: {
    revenue: Array<{ date: string; amount: number }>;
    compliance: Array<{ date: string; rate: number }>;
    volume: Array<{ date: string; count: number }>;
  };
  alerts: Array<{
    type: 'overdue' | 'compliance' | 'performance';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export class FinancialReportingService {
  constructor(
    private repository: FinancialReportingRepository,
    private collectionsService: CollectionsService,
    private settlementsService?: any, // Will be injected from Settlements domain when available
    private balanceService?: any, // Will be injected from Balance domain when available
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Generate daily transaction report (DTR)
   * Queries ledger_entries for customer-facing accounts above threshold
   */
  async generateDailyTransactionReport(date: Date, threshold: number = 100): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query ledger_entries for the period
    const ledgerEntries = await this.queryLedgerEntries(startOfDay, endOfDay, threshold);

    // Filter for customer-facing accounts
    const customerTransactions = ledgerEntries.filter(
      entry =>
        entry.account_type === 'customer' ||
        entry.account_type === 'revenue' ||
        entry.account_type === 'expense'
    );

    // Format data for CSV/XML export
    const formattedData = {
      reportDate: date.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      threshold: threshold,
      totalTransactions: customerTransactions.length,
      // 🚀 BUN 1.1.X OPTIMIZATION: Using PreciseMath for accurate financial calculations
      totalAmount: PreciseMath.sumPrecise(customerTransactions.map(tx => Math.abs(tx.amount))).value,
      transactions: customerTransactions.map(tx => ({
        date: tx.entry_date,
        accountId: tx.account_id,
        accountType: tx.account_type,
        customerId: tx.customer_id,
        amount: tx.amount,
        currency: tx.currency_code,
        description: tx.description,
        referenceId: tx.reference_id,
      })),
    };

    return formattedData;
  }

  /**
   * Generate monthly P&L report
   * Aggregates ledger_entries by revenue and expense accounts
   */
  async generateMonthlyPLReport(period: AccountingPeriod): Promise<any> {
    const startDate = period.getStartDate();
    const endDate = period.getEndDate();

    // Query aggregated data from monthly_profit_loss view
    const plData = await this.queryMonthlyPLData(startDate, endDate);

    const reportData = {
      period: period.getDisplayName(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      generatedAt: new Date().toISOString(),
      summary: {
        grossRevenue: plData.gross_revenue || 0,
        bonusesPromos: plData.bonuses_promos || 0,
        netGamingRevenue: plData.net_gaming_revenue || 0,
        taxes: plData.taxes || 0,
        netProfit: plData.net_profit || 0,
      },
      metadata: {
        dataSource: 'ledger_entries',
        aggregationMethod: 'monthly_profit_loss_view',
        currency: 'USD',
      },
    };

    return reportData;
  }

  /**
   * Generate a comprehensive financial report
   */
  async generateReport(request: GenerateReportRequest): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate request
      this.validateGenerateReportRequest(request);

      // Check if report already exists for this period
      const existingReports = await this.repository.findByQuery({
        reportType: request.reportType,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
      });

      if (existingReports.length > 0) {
        throw new DomainError('Report already exists for this period', 'REPORT_ALREADY_EXISTS');
      }

      // Gather data from different domains
      const dataSources: string[] = [];
      const reportData = await this.gatherReportData(request, dataSources);

      // Create financial report entity with timezone-aware timestamp
      const generatedAt = TimezoneUtils.createTimezoneAwareDate(
        TimezoneContext.FINANCIAL_REPORTING
      );
      const report = new FinancialReport({
        id: reportId,
        reportType: request.reportType,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        generatedAt,
        ...reportData,
      });

      // Save report
      await this.repository.save(report);

      // Publish domain event with timezone-aware timestamp and metadata
      const eventTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.DOMAIN_EVENTS);
      this.events.publish('FinancialReportGenerated', {
        eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'FinancialReportGenerated',
        aggregateId: report.getId(),
        aggregateType: 'FinancialReport',
        timestamp: eventTime,
        version: 1,
        payload: {
          reportId: report.getId(),
          reportType: request.reportType,
          periodStart: request.periodStart,
          periodEnd: request.periodEnd,
          generatedAt: eventTime,
        },
        metadata: {
          timezone: TimezoneUtils.getCurrentContextInfo().timezone,
          timezoneContext: TimezoneContext.DOMAIN_EVENTS,
        },
      });

      const processingTime = Date.now() - startTime;

      return {
        report,
        processingTime,
        dataSources,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new DomainError(
        `Failed to generate financial report: ${errorMessage}`,
        'REPORT_GENERATION_FAILED',
        { processingTime, request }
      );
    }
  }

  /**
   * Approve a financial report
   */
  async approveReport(reportId: string, approvedBy: string): Promise<FinancialReport> {
    const report = await this.getReportById(reportId);

    if (report.getStatus() !== ReportStatus.PENDING_REVIEW) {
      throw new DomainError(
        `Cannot approve report with status: ${report.getStatus()}`,
        'INVALID_REPORT_STATUS'
      );
    }

    // Perform final compliance check before approval
    const complianceResult = await this.checkCompliance(report);

    if (
      !complianceResult.isCompliant &&
      complianceResult.issues.some(i => i.severity === 'critical')
    ) {
      throw new DomainError(
        'Critical compliance issues must be resolved before approval',
        'COMPLIANCE_VIOLATION'
      );
    }

    report.approve(approvedBy);
    await this.repository.save(report);

    return report;
  }

  /**
   * Publish a financial report
   */
  async publishReport(reportId: string): Promise<FinancialReport> {
    const report = await this.getReportById(reportId);

    if (report.getStatus() !== ReportStatus.APPROVED) {
      throw new DomainError(
        `Cannot publish report with status: ${report.getStatus()}`,
        'INVALID_REPORT_STATUS'
      );
    }

    report.publish();
    await this.repository.save(report);

    return report;
  }

  /**
   * Check compliance for a financial report
   */
  async checkCompliance(report: FinancialReport): Promise<ComplianceCheckResult> {
    const issues: Array<{
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }> = [];

    const recommendations: string[] = [];

    // Check data completeness
    const collections = report.getCollections();
    const settlements = report.getSettlements();
    const balance = report.getBalance();

    if (collections.totalCollections === 0) {
      issues.push({
        issue: 'No collection data found for reporting period',
        severity: 'high',
        recommendation: 'Verify collections data source and period coverage',
      });
    }

    if (settlements.totalSettlements === 0) {
      issues.push({
        issue: 'No settlement data found for reporting period',
        severity: 'medium',
        recommendation: 'Check settlement processing and data availability',
      });
    }

    // Check for unusual patterns
    const revenue = report.getRevenue();
    if (revenue.grossRevenue < 0) {
      issues.push({
        issue: 'Negative revenue detected',
        severity: 'critical',
        recommendation: 'Investigate negative revenue transactions immediately',
      });
    }

    // Check balance consistency
    if (balance.totalBalanceAmount < 0) {
      issues.push({
        issue: 'Negative total balance amount',
        severity: 'high',
        recommendation: 'Review balance calculations and negative balance policies',
      });
    }

    // Check compliance requirements
    const compliance = report.getCompliance();

    if (!compliance.pciDssCompliant) {
      issues.push({
        issue: 'PCI DSS compliance not confirmed',
        severity: 'critical',
        recommendation: 'Complete PCI DSS compliance audit and certification',
      });
    }

    if (!compliance.amlCompliant) {
      issues.push({
        issue: 'AML compliance not confirmed',
        severity: 'high',
        recommendation: 'Review AML procedures and complete compliance checklist',
      });
    }

    if (!compliance.kycCompliant) {
      issues.push({
        issue: 'KYC compliance not confirmed',
        severity: 'high',
        recommendation: 'Verify KYC processes and documentation completeness',
      });
    }

    // Check for overdue filings
    const overdueFilings = compliance.requiredFilings.filter(
      filing => filing.status === 'pending' && filing.dueDate < new Date()
    );

    if (overdueFilings.length > 0) {
      issues.push({
        issue: `${overdueFilings.length} regulatory filings are overdue`,
        severity: 'critical',
        recommendation: 'Submit overdue regulatory filings immediately',
      });
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('All compliance checks passed successfully');
      recommendations.push('Consider implementing automated compliance monitoring');
    } else {
      recommendations.push('Address identified issues in priority order');
      recommendations.push('Implement preventive measures to avoid future issues');
      recommendations.push('Schedule regular compliance reviews');
    }

    return {
      reportId: report.getId(),
      isCompliant: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get analytics for financial reporting
   */
  async getAnalytics(periodStart?: Date, periodEnd?: Date): Promise<AnalyticsResult> {
    const start = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = periodEnd || new Date();

    const reports = await this.repository.findByPeriod(start, end);
    const summary = await this.repository.getSummary();

    // Calculate trends
    const revenueTrend = this.calculateRevenueTrend(reports);
    const complianceTrend = this.calculateComplianceTrend(reports);
    const volumeTrend = this.calculateVolumeTrend(reports);

    // Generate alerts
    const alerts = await this.generateAlerts(reports, summary);

    return {
      period: { start, end },
      summary: {
        totalReports: summary.totalReports,
        complianceRate: this.calculateComplianceRate(reports),
        averageProcessingTime: this.calculateAverageProcessingTime(reports),
        reportsByType: summary.reportsByType,
      },
      trends: {
        revenue: revenueTrend,
        compliance: complianceTrend,
        volume: volumeTrend,
      },
      alerts,
    };
  }

  /**
   * Get reports requiring attention
   */
  async getReportsRequiringAttention(): Promise<FinancialReport[]> {
    return await this.repository.findReportsRequiringAttention();
  }

  /**
   * Search reports by criteria
   */
  async searchReports(query: FinancialReportQuery): Promise<FinancialReport[]> {
    return await this.repository.findByQuery(query);
  }

  /**
   * Get report by ID with validation
   */
  private async getReportById(id: string): Promise<FinancialReport> {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new DomainError('Financial report not found', 'REPORT_NOT_FOUND');
    }
    return report;
  }

  /**
   * Gather data from various domains for report generation
   */
  private async gatherReportData(
    request: GenerateReportRequest,
    dataSources: string[]
  ): Promise<any> {
    const reportData: any = {
      summary: {
        totalRevenue: 0,
        totalCollections: 0,
        totalSettlements: 0,
        netProfit: 0,
        totalFees: 0,
        currency: 'USD',
      },
      collections: {
        totalCollections: 0,
        successfulCollections: 0,
        failedCollections: 0,
        totalAmount: 0,
        averageAmount: 0,
        collectionsByMethod: {},
        collectionsByCurrency: {},
        processingTime: { average: 0, min: 0, max: 0 },
      },
      settlements: {
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
      },
      balance: {
        totalActiveBalances: 0,
        totalBalanceAmount: 0,
        averageBalance: 0,
        lowBalanceAlerts: 0,
        frozenBalances: 0,
        balanceDistribution: { low: 0, medium: 0, high: 0 },
        thresholdBreaches: 0,
      },
      revenue: {
        grossRevenue: 0,
        netRevenue: 0,
        revenueBySource: {},
        revenueTrend: [],
        topRevenueSources: [],
        revenueGrowth: { daily: 0, weekly: 0, monthly: 0 },
      },
      compliance: {
        pciDssCompliant: true,
        amlCompliant: true,
        kycCompliant: true,
        gdprCompliant: true,
        auditTrailComplete: true,
        requiredFilings: [],
        complianceIssues: [],
      },
    };

    // Gather collections data
    if (request.includeCollections !== false && this.collectionsService) {
      try {
        const collectionsData = await this.collectionsService.calculateRevenue({
          start: request.periodStart,
          end: request.periodEnd,
        });
        reportData.collections = collectionsData;
        reportData.summary.totalCollections = collectionsData.totalCollections;
        reportData.summary.totalRevenue += collectionsData.totalAmount;
        dataSources.push('collections');
      } catch (error) {
        console.warn('Failed to gather collections data:', error);
        // Collections data gathering failed, but continue with other data sources
      }
    } else if (request.includeCollections !== false) {
      console.log('Collections service not available, skipping collections data');
    }

    // Gather settlements data
    if (request.includeSettlements !== false && this.settlementsService) {
      try {
        const settlementsData = await this.settlementsService.getSettlementAnalytics(undefined, {
          start: request.periodStart,
          end: request.periodEnd,
        });
        reportData.settlements = settlementsData;
        reportData.summary.totalSettlements = settlementsData.totalSettlements;
        reportData.summary.totalFees += settlementsData.totalFees;
        dataSources.push('settlements');
      } catch (error) {
        console.warn('Failed to gather settlements data:', error);
      }
    }

    // Gather balance data
    if (request.includeBalances !== false && this.balanceService) {
      try {
        const balanceData = await this.balanceService.getSystemBalanceSummary();
        reportData.balance = balanceData;
        dataSources.push('balance');
      } catch (error) {
        console.warn('Failed to gather balance data:', error);
      }
    }

    // Calculate derived metrics
    reportData.summary.netProfit = reportData.summary.totalRevenue - reportData.summary.totalFees;
    reportData.revenue.grossRevenue = reportData.summary.totalRevenue;
    reportData.revenue.netRevenue = reportData.summary.netProfit;

    // Include compliance data
    if (request.includeCompliance !== false) {
      reportData.compliance = await this.gatherComplianceData(
        request.periodStart,
        request.periodEnd
      );
      dataSources.push('compliance');
    }

    return reportData;
  }

  /**
   * Gather compliance data for the reporting period
   */
  private async gatherComplianceData(startDate: Date, endDate: Date): Promise<any> {
    // This would integrate with actual compliance systems
    // For now, return mock compliance data
    return {
      pciDssCompliant: true,
      amlCompliant: true,
      kycCompliant: true,
      gdprCompliant: true,
      auditTrailComplete: true,
      requiredFilings: [
        {
          filing: 'Monthly Financial Report',
          status: 'submitted',
          dueDate: new Date(endDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after period end
          submittedDate: new Date(),
        },
      ],
      complianceIssues: [],
    };
  }

  /**
   * Validate generate report request
   */
  private validateGenerateReportRequest(request: GenerateReportRequest): void {
    if (!request.reportType || !Object.values(ReportType).includes(request.reportType)) {
      throw new DomainError('Invalid report type', 'INVALID_REPORT_TYPE');
    }

    if (!request.periodStart || !request.periodEnd) {
      throw new DomainError('Period start and end dates are required', 'INVALID_PERIOD');
    }

    if (request.periodStart >= request.periodEnd) {
      throw new DomainError('Period start must be before period end', 'INVALID_PERIOD_RANGE');
    }

    const maxPeriodDays = request.reportType === ReportType.ANNUAL ? 366 : 31;
    const periodDays =
      (request.periodEnd.getTime() - request.periodStart.getTime()) / (1000 * 60 * 60 * 24);

    if (periodDays > maxPeriodDays) {
      throw new DomainError(
        `Period cannot exceed ${maxPeriodDays} days for ${request.reportType} reports`,
        'PERIOD_TOO_LONG'
      );
    }
  }

  // Helper methods for analytics
  private calculateRevenueTrend(
    reports: FinancialReport[]
  ): Array<{ date: string; amount: number }> {
    return reports
      .filter(r => r.getStatus() === ReportStatus.PUBLISHED)
      .map(r => ({
        date: r.getPeriodEnd().toISOString().split('T')[0],
        amount: r.getSummary().totalRevenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateComplianceTrend(
    reports: FinancialReport[]
  ): Array<{ date: string; rate: number }> {
    return reports
      .filter(r => r.getStatus() === ReportStatus.PUBLISHED)
      .map(r => ({
        date: r.getPeriodEnd().toISOString().split('T')[0],
        rate:
          r.getCompliance().pciDssCompliant &&
          r.getCompliance().amlCompliant &&
          r.getCompliance().kycCompliant
            ? 100
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateVolumeTrend(reports: FinancialReport[]): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};

    reports.forEach(r => {
      const date = r.getPeriodEnd().toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateComplianceRate(reports: FinancialReport[]): number {
    const publishedReports = reports.filter(r => r.getStatus() === ReportStatus.PUBLISHED);
    if (publishedReports.length === 0) return 0;

    const compliantReports = publishedReports.filter(r => {
      const compliance = r.getCompliance();
      return compliance.pciDssCompliant && compliance.amlCompliant && compliance.kycCompliant;
    });

    return Math.round((compliantReports.length / publishedReports.length) * 100);
  }

  private calculateAverageProcessingTime(reports: FinancialReport[]): number {
    const publishedReports = reports.filter(r => r.getStatus() === ReportStatus.PUBLISHED);
    if (publishedReports.length === 0) return 0;

    // This would require storing processing time in the report entity
    // For now, return a mock value
    return 1500; // 1.5 seconds average
  }

  private async generateAlerts(
    reports: FinancialReport[],
    summary: any
  ): Promise<
    Array<{
      type: 'overdue' | 'compliance' | 'performance';
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>
  > {
    const alerts: Array<{
      type: 'overdue' | 'compliance' | 'performance';
      message: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Overdue reports alert
    if (summary.overdueReports > 0) {
      alerts.push({
        type: 'overdue',
        message: `${summary.overdueReports} reports are overdue and need immediate attention`,
        severity: summary.overdueReports > 5 ? 'high' : 'medium',
      });
    }

    // Compliance alerts
    if (summary.reportsByCompliance[ComplianceStatus.NON_COMPLIANT] > 0) {
      alerts.push({
        type: 'compliance',
        message: `${summary.reportsByCompliance[ComplianceStatus.NON_COMPLIANT]} reports have critical compliance issues`,
        severity: 'high',
      });
    }

    // Performance alerts
    const pendingReviews = summary.reportsByStatus[ReportStatus.PENDING_REVIEW] || 0;
    if (pendingReviews > 10) {
      alerts.push({
        type: 'performance',
        message: `${pendingReviews} reports are pending review - consider increasing review capacity`,
        severity: 'medium',
      });
    }

    return alerts;
  }

  /**
   * Query ledger entries for daily transaction report
   */
  private async queryLedgerEntries(
    startDate: Date,
    endDate: Date,
    threshold: number
  ): Promise<any[]> {
    // This would query the ledger_entries table
    // Implementation depends on actual database schema
    // For now, return mock data structure

    const mockEntries = [
      {
        entry_date: '2024-01-15T10:30:00Z',
        account_id: 'acc_001',
        account_type: 'customer',
        customer_id: 'cust_001',
        amount: 500.0,
        currency_code: 'USD',
        description: 'Bet placement',
        reference_id: 'bet_12345',
      },
      {
        entry_date: '2024-01-15T11:15:00Z',
        account_id: 'acc_002',
        account_type: 'revenue',
        customer_id: null,
        amount: -500.0,
        currency_code: 'USD',
        description: 'Revenue from bet',
        reference_id: 'rev_12345',
      },
    ];

    return mockEntries.filter(entry => Math.abs(entry.amount) >= threshold);
  }

  /**
   * Query monthly P&L data from view
   */
  private async queryMonthlyPLData(startDate: Date, endDate: Date): Promise<any> {
    // This would query the monthly_profit_loss view
    // Implementation depends on actual database schema
    // For now, return mock aggregated data

    return {
      gross_revenue: 125000.0,
      bonuses_promos: 12500.0,
      net_gaming_revenue: 112500.0,
      taxes: 22500.0,
      net_profit: 90000.0,
    };
  }
}

// Factory for creating services
export class FinancialReportingServiceFactory {
  static create(
    repository: FinancialReportingRepository,
    options?: {
      collectionsService?: CollectionsService;
      settlementsService?: any;
      balanceService?: any;
    }
  ): FinancialReportingService {
    if (!options?.collectionsService) {
      throw new DomainError(
        'CollectionsService is required for FinancialReportingService',
        'MISSING_DEPENDENCY'
      );
    }

    return new FinancialReportingService(
      repository,
      options.collectionsService,
      options?.settlementsService,
      options?.balanceService
    );
  }
}
