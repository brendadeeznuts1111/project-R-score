/**
 * Financial Reporting Controller
 * Domain-Driven Design Implementation
 *
 * API endpoints for financial reporting with regulatory compliance
 */

import {
  FinancialReportingService,
  GenerateReportRequest,
} from './services/financial-reporting-service';
import {
  FinancialReportingRepository,
  FinancialReportQuery,
} from './repositories/financial-reporting-repository';
import { ReportType, ReportStatus, ComplianceStatus } from './entities/financial-report';
import { DomainLogger, LoggerFactory } from '../../core/logging/domain-logger';
import { DomainErrorFactory } from '../../core/errors/domain-errors';

export interface GenerateReportApiRequest {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  includeCollections?: boolean;
  includeSettlements?: boolean;
  includeBalances?: boolean;
  includeRevenue?: boolean;
  includeCompliance?: boolean;
}

export interface SearchReportsApiRequest {
  reportType?: ReportType;
  status?: ReportStatus;
  complianceStatus?: ComplianceStatus;
  periodStart?: string;
  periodEnd?: string;
  approvedBy?: string;
  generatedAfter?: string;
  generatedBefore?: string;
  limit?: number;
  offset?: number;
}

export interface ApproveReportApiRequest {
  reportId: string;
  approvedBy: string;
}

export interface PublishReportApiRequest {
  reportId: string;
}

export interface ComplianceCheckApiRequest {
  reportId: string;
}

export interface FinancialReportingApiResponse {
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
    timestamp: string;
  };
}

export interface FinancialReportApiData {
  id: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  status: ReportStatus;
  complianceStatus: ComplianceStatus;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  summary: {
    totalRevenue: number;
    totalCollections: number;
    totalSettlements: number;
    netProfit: number;
    totalFees: number;
    currency: string;
  };
  collections: {
    totalCollections: number;
    successfulCollections: number;
    failedCollections: number;
    totalAmount: number;
    averageAmount: number;
    collectionsByMethod: Record<string, number>;
    collectionsByCurrency: Record<string, number>;
    processingTime: {
      average: number;
      min: number;
      max: number;
    };
  };
  settlements: {
    totalSettlements: number;
    successfulSettlements: number;
    pendingSettlements: number;
    failedSettlements: number;
    totalAmount: number;
    totalFees: number;
    netAmount: number;
    settlementsByMerchant: Record<string, number>;
    averageProcessingTime: number;
    settlementSuccessRate: number;
  };
  balance: {
    totalActiveBalances: number;
    totalBalanceAmount: number;
    averageBalance: number;
    lowBalanceAlerts: number;
    frozenBalances: number;
    balanceDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    thresholdBreaches: number;
  };
  revenue: {
    grossRevenue: number;
    netRevenue: number;
    revenueBySource: Record<string, number>;
    revenueTrend: Array<{
      period: string;
      amount: number;
      growth: number;
    }>;
    topRevenueSources: Array<{
      source: string;
      amount: number;
      percentage: number;
    }>;
    revenueGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  compliance: {
    pciDssCompliant: boolean;
    amlCompliant: boolean;
    kycCompliant: boolean;
    gdprCompliant: boolean;
    auditTrailComplete: boolean;
    requiredFilings: Array<{
      filing: string;
      status: 'pending' | 'submitted' | 'approved' | 'rejected';
      dueDate: string;
      submittedDate?: string;
    }>;
    complianceIssues: Array<{
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      status: 'open' | 'investigating' | 'resolved';
      reportedAt: string;
    }>;
  };
  ageInDays: number;
  requiresAttention: boolean;
}

/**
 * Financial Reporting Domain Controller
 * Entry point for all financial reporting operations
 */
export class FinancialReportingController {
  private service: FinancialReportingService;
  private logger = LoggerFactory.create('financial-reporting-controller');
  private errorFactory = new DomainErrorFactory('financial-reporting');

  constructor(
    repository: FinancialReportingRepository,
    options?: {
      collectionsService?: any;
      settlementsService?: any;
      balanceService?: any;
    }
  ) {
    this.service = FinancialReportingService.create(repository, options);
  }

  /**
   * Generate a new financial report
   */
  async generateReport(request: GenerateReportApiRequest): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Generating financial report', {
        operation: 'generateReport',
        reportType: request.reportType,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
      });

      // Validate request
      const validationError = this.validateGenerateReportRequest(request);
      if (validationError) {
        return this.createErrorResponse(validationError, startTime);
      }

      // Convert string dates to Date objects
      const generateRequest: GenerateReportRequest = {
        reportType: request.reportType,
        periodStart: new Date(request.periodStart),
        periodEnd: new Date(request.periodEnd),
        includeCollections: request.includeCollections,
        includeSettlements: request.includeSettlements,
        includeBalances: request.includeBalances,
        includeRevenue: request.includeRevenue,
        includeCompliance: request.includeCompliance,
      };

      // Generate report
      const result = await this.service.generateReport(generateRequest);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Financial report generated successfully',
        {
          operation: 'generateReport',
          entityId: result.report.getId(),
          reportType: request.reportType,
          processingTime: result.processingTime,
        },
        {
          dataSources: result.dataSources.join(', '),
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          report: this.mapReportToApiData(result.report),
          processingTime: result.processingTime,
          dataSources: result.dataSources,
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'generateReport', startTime);
    }
  }

  /**
   * Get financial report by ID
   */
  async getReport(reportId: string): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Retrieving financial report', {
        operation: 'getReport',
        reportId,
      });

      const report = await this.service
        .searchReports({} as FinancialReportQuery)
        .then(reports => reports.find(r => r.getId() === reportId));

      if (!report) {
        return this.createErrorResponse('Financial report not found', startTime);
      }

      const processingTime = Date.now() - startTime;

      return this.createSuccessResponse(
        {
          report: this.mapReportToApiData(report),
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'getReport', startTime);
    }
  }

  /**
   * Search financial reports
   */
  async searchReports(request: SearchReportsApiRequest): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Searching financial reports', {
        operation: 'searchReports',
        filters: Object.keys(request).length,
      });

      // Convert string dates to Date objects
      const query: FinancialReportQuery = {
        reportType: request.reportType,
        status: request.status,
        complianceStatus: request.complianceStatus,
        periodStart: request.periodStart ? new Date(request.periodStart) : undefined,
        periodEnd: request.periodEnd ? new Date(request.periodEnd) : undefined,
        approvedBy: request.approvedBy,
        generatedAfter: request.generatedAfter ? new Date(request.generatedAfter) : undefined,
        generatedBefore: request.generatedBefore ? new Date(request.generatedBefore) : undefined,
        limit: request.limit || 50,
        offset: request.offset || 0,
      };

      const reports = await this.service.searchReports(query);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Financial reports search completed',
        {
          operation: 'searchReports',
          resultCount: reports.length,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          reports: reports.map(report => this.mapReportToApiData(report)),
          total: reports.length,
          filters: request,
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'searchReports', startTime);
    }
  }

  /**
   * Approve a financial report
   */
  async approveReport(request: ApproveReportApiRequest): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Approving financial report', {
        operation: 'approveReport',
        reportId: request.reportId,
        approvedBy: request.approvedBy,
      });

      // Validate request
      if (!request.reportId || !request.approvedBy) {
        return this.createErrorResponse('Report ID and approver are required', startTime);
      }

      const report = await this.service.approveReport(request.reportId, request.approvedBy);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Financial report approved successfully',
        {
          operation: 'approveReport',
          entityId: request.reportId,
          approvedBy: request.approvedBy,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          report: this.mapReportToApiData(report),
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'approveReport', startTime);
    }
  }

  /**
   * Publish a financial report
   */
  async publishReport(request: PublishReportApiRequest): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Publishing financial report', {
        operation: 'publishReport',
        reportId: request.reportId,
      });

      // Validate request
      if (!request.reportId) {
        return this.createErrorResponse('Report ID is required', startTime);
      }

      const report = await this.service.publishReport(request.reportId);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Financial report published successfully',
        {
          operation: 'publishReport',
          entityId: request.reportId,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          report: this.mapReportToApiData(report),
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'publishReport', startTime);
    }
  }

  /**
   * Check compliance for a financial report
   */
  async checkCompliance(
    request: ComplianceCheckApiRequest
  ): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Checking compliance for financial report', {
        operation: 'checkCompliance',
        reportId: request.reportId,
      });

      // Validate request
      if (!request.reportId) {
        return this.createErrorResponse('Report ID is required', startTime);
      }

      const report = await this.service
        .searchReports({} as FinancialReportQuery)
        .then(reports => reports.find(r => r.getId() === request.reportId));

      if (!report) {
        return this.createErrorResponse('Financial report not found', startTime);
      }

      const complianceResult = await this.service.checkCompliance(report);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Compliance check completed',
        {
          operation: 'checkCompliance',
          entityId: request.reportId,
          isCompliant: complianceResult.isCompliant,
          issuesCount: complianceResult.issues.length,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(complianceResult, processingTime);
    } catch (error) {
      return this.handleError(error, 'checkCompliance', startTime);
    }
  }

  /**
   * Get financial reporting analytics
   */
  async getAnalytics(
    periodStart?: string,
    periodEnd?: string
  ): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Retrieving financial reporting analytics', {
        operation: 'getAnalytics',
        periodStart,
        periodEnd,
      });

      const start = periodStart ? new Date(periodStart) : undefined;
      const end = periodEnd ? new Date(periodEnd) : undefined;

      const analytics = await this.service.getAnalytics(start, end);

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Financial reporting analytics retrieved',
        {
          operation: 'getAnalytics',
          totalReports: analytics.summary.totalReports,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          analytics: {
            ...analytics,
            period: {
              start: analytics.period.start.toISOString(),
              end: analytics.period.end.toISOString(),
            },
            trends: {
              revenue: analytics.trends.revenue.map(item => ({
                ...item,
                date: item.date,
              })),
              compliance: analytics.trends.compliance.map(item => ({
                ...item,
                date: item.date,
              })),
              volume: analytics.trends.volume.map(item => ({
                ...item,
                date: item.date,
              })),
            },
          },
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'getAnalytics', startTime);
    }
  }

  /**
   * Get reports requiring attention
   */
  async getReportsRequiringAttention(): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      await this.logger.business('Retrieving reports requiring attention', {
        operation: 'getReportsRequiringAttention',
      });

      const reports = await this.service.getReportsRequiringAttention();

      const processingTime = Date.now() - startTime;

      await this.logger.business(
        'Reports requiring attention retrieved',
        {
          operation: 'getReportsRequiringAttention',
          count: reports.length,
        },
        {
          processingTime,
        }
      );

      return this.createSuccessResponse(
        {
          reports: reports.map(report => this.mapReportToApiData(report)),
          count: reports.length,
        },
        processingTime
      );
    } catch (error) {
      return this.handleError(error, 'getReportsRequiringAttention', startTime);
    }
  }

  /**
   * Health check endpoint for financial reporting domain
   */
  async healthCheck(): Promise<FinancialReportingApiResponse> {
    const startTime = Date.now();

    try {
      // Get basic statistics
      const summary = await this.service.getAnalytics();

      const healthData = {
        domain: 'financial-reporting',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        statistics: {
          totalReports: summary.summary.totalReports,
          complianceRate: summary.summary.complianceRate,
          reportsByStatus: summary.summary.reportsByType,
        },
        features: [
          'Automated report generation',
          'Regulatory compliance checking',
          'Multi-domain data aggregation',
          'Real-time analytics',
          'Enterprise audit trails',
        ],
      };

      const processingTime = Date.now() - startTime;

      return this.createSuccessResponse(healthData, processingTime);
    } catch (error) {
      return this.handleError(error, 'healthCheck', startTime);
    }
  }

  // Private helper methods

  private validateGenerateReportRequest(request: GenerateReportApiRequest): string | null {
    if (!request.reportType || !Object.values(ReportType).includes(request.reportType)) {
      return 'Valid report type is required';
    }

    if (!request.periodStart || !request.periodEnd) {
      return 'Period start and end dates are required';
    }

    const startDate = new Date(request.periodStart);
    const endDate = new Date(request.periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Invalid date format';
    }

    if (startDate >= endDate) {
      return 'Period start must be before period end';
    }

    const periodDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const maxPeriodDays = request.reportType === ReportType.ANNUAL ? 366 : 31;

    if (periodDays > maxPeriodDays) {
      return `Period cannot exceed ${maxPeriodDays} days for ${request.reportType} reports`;
    }

    return null;
  }

  private mapReportToApiData(report: any): FinancialReportApiData {
    return {
      id: report.getId(),
      reportType: report.getReportType(),
      periodStart: report.getPeriodStart().toISOString(),
      periodEnd: report.getPeriodEnd().toISOString(),
      generatedAt: report.getGeneratedAt().toISOString(),
      status: report.getStatus(),
      complianceStatus: report.getComplianceStatus(),
      approvedBy: report.getApprovedBy(),
      approvedAt: report.getApprovedAt()?.toISOString(),
      publishedAt: report.getPublishedAt()?.toISOString(),
      summary: report.getSummary(),
      collections: report.getCollections(),
      settlements: report.getSettlements(),
      balance: report.getBalance(),
      revenue: report.getRevenue(),
      compliance: {
        ...report.getCompliance(),
        requiredFilings: report.getCompliance().requiredFilings.map((filing: any) => ({
          ...filing,
          dueDate: filing.dueDate.toISOString(),
          submittedDate: filing.submittedDate?.toISOString(),
        })),
        complianceIssues: report.getCompliance().complianceIssues.map((issue: any) => ({
          ...issue,
          reportedAt: issue.reportedAt.toISOString(),
        })),
      },
      ageInDays: report.getPeriodDays(),
      requiresAttention: report.requiresAttention(),
    };
  }

  private createSuccessResponse(data: any, processingTime: number): FinancialReportingApiResponse {
    return {
      success: true,
      data,
      metadata: {
        processingTime,
        domain: 'financial-reporting',
        operation: 'success',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private createErrorResponse(
    message: string,
    processingTime: number
  ): FinancialReportingApiResponse {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        correlationId: `err_${Date.now()}`,
      },
      metadata: {
        processingTime,
        domain: 'financial-reporting',
        operation: 'validation_error',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private handleError(
    error: any,
    operation: string,
    startTime: number
  ): FinancialReportingApiResponse {
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
        domain: 'financial-reporting',
        operation,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Factory for creating controllers
export class FinancialReportingControllerFactory {
  static create(
    repository: FinancialReportingRepository,
    options?: {
      collectionsService?: any;
      settlementsService?: any;
      balanceService?: any;
    }
  ): FinancialReportingController {
    return new FinancialReportingController(repository, options);
  }

  static createWithInMemoryDb(options?: {
    collectionsService?: any;
    settlementsService?: any;
    balanceService?: any;
  }): FinancialReportingController {
    const repository = FinancialReportingRepository.createInMemoryRepository();
    return new FinancialReportingController(repository, options);
  }
}
