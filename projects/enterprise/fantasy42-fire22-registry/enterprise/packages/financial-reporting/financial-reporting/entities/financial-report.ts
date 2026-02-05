/**
 * Financial Report Entity
 * Domain-Driven Design Implementation
 *
 * Represents a comprehensive financial report with regulatory compliance
 */

import { DomainEntity, DomainError } from '../../shared/domain-entity';
import { BaseDomainEvent } from '../../shared/events/domain-events';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PENDING_REVIEW = 'pending_review',
  REQUIRES_ATTENTION = 'requires_attention',
  NON_COMPLIANT = 'non_compliant',
}

export class FinancialReport extends DomainEntity {
  private readonly _id: string;
  private readonly _reportType: ReportType;
  private readonly _periodStart: Date;
  private readonly _periodEnd: Date;
  private readonly _generatedAt: Date;
  private _status: ReportStatus;
  private _complianceStatus: ComplianceStatus;
  private _approvedBy?: string;
  private _approvedAt?: Date;
  private _publishedAt?: Date;

  // Version and Amendment fields
  private readonly _version: number;
  private readonly _parentReportId?: string;
  private readonly _amendmentReason?: string;
  private readonly _amendedBy?: string;
  private readonly _amendedAt?: Date;

  // Financial Data
  private readonly _summary: ReportSummary;
  private readonly _collections: CollectionMetrics;
  private readonly _settlements: SettlementMetrics;
  private readonly _balance: BalanceMetrics;
  private readonly _revenue: RevenueMetrics;
  private readonly _compliance: ComplianceMetrics;

  constructor(params: FinancialReportParams) {
    super(params.id, new Date(), new Date()); // DomainEntity requires id, createdAt, updatedAt
    this._id = params.id;
    this._reportType = params.reportType;
    this._periodStart = new Date(params.periodStart);
    this._periodEnd = new Date(params.periodEnd);
    this._generatedAt = new Date(params.generatedAt);
    this._status = params.status || ReportStatus.DRAFT;
    this._complianceStatus = params.complianceStatus || ComplianceStatus.PENDING_REVIEW;
    this._approvedBy = params.approvedBy;
    this._approvedAt = params.approvedAt ? new Date(params.approvedAt) : undefined;
    this._publishedAt = params.publishedAt ? new Date(params.publishedAt) : undefined;

    // Version and Amendment fields
    this._version = params.version || 1;
    this._parentReportId = params.parentReportId;
    this._amendmentReason = params.amendmentReason;
    this._amendedBy = params.amendedBy;
    this._amendedAt = params.amendedAt ? new Date(params.amendedAt) : undefined;

    this._summary = params.summary;
    this._collections = params.collections;
    this._settlements = params.settlements;
    this._balance = params.balance;
    this._revenue = params.revenue;
    this._compliance = params.compliance;
  }

  // Getters
  getId(): string {
    return this._id;
  }
  getReportType(): ReportType {
    return this._reportType;
  }
  getPeriodStart(): Date {
    return new Date(this._periodStart);
  }
  getPeriodEnd(): Date {
    return new Date(this._periodEnd);
  }
  getGeneratedAt(): Date {
    return new Date(this._generatedAt);
  }
  getStatus(): ReportStatus {
    return this._status;
  }
  getComplianceStatus(): ComplianceStatus {
    return this._complianceStatus;
  }
  getApprovedBy(): string | undefined {
    return this._approvedBy;
  }
  getApprovedAt(): Date | undefined {
    return this._approvedAt ? new Date(this._approvedAt) : undefined;
  }
  getPublishedAt(): Date | undefined {
    return this._publishedAt ? new Date(this._publishedAt) : undefined;
  }

  // Version and Amendment getters
  getVersion(): number {
    return this._version;
  }
  getParentReportId(): string | undefined {
    return this._parentReportId;
  }
  getAmendmentReason(): string | undefined {
    return this._amendmentReason;
  }
  getAmendedBy(): string | undefined {
    return this._amendedBy;
  }
  getAmendedAt(): Date | undefined {
    return this._amendedAt ? new Date(this._amendedAt) : undefined;
  }

  // Business Logic Methods
  isAmendment(): boolean {
    return this._version > 1 && !!this._parentReportId;
  }
  canBeAmended(): boolean {
    return this._status === ReportStatus.PUBLISHED || this._status === ReportStatus.APPROVED;
  }

  getSummary(): ReportSummary {
    return { ...this._summary };
  }
  getCollections(): CollectionMetrics {
    return { ...this._collections };
  }
  getSettlements(): SettlementMetrics {
    return { ...this._settlements };
  }
  getBalance(): BalanceMetrics {
    return { ...this._balance };
  }
  getRevenue(): RevenueMetrics {
    return { ...this._revenue };
  }
  getCompliance(): ComplianceMetrics {
    return { ...this._compliance };
  }

  // Business Logic Methods
  approve(approvedBy: string): void {
    if (this._status !== ReportStatus.PENDING_REVIEW) {
      throw new Error(`Cannot approve report with status: ${this._status}`);
    }

    this._approvedBy = approvedBy;
    this._approvedAt = new Date();
    this._status = ReportStatus.APPROVED;

    this.addDomainEvent(
      new BaseDomainEvent('FinancialReportApproved', this._id, 'FinancialReport', {
        reportId: this._id,
        approvedBy,
        approvedAt: this._approvedAt,
      })
    );
  }

  publish(): void {
    if (this._status !== ReportStatus.APPROVED) {
      throw new Error(`Cannot publish report with status: ${this._status}`);
    }

    this._publishedAt = new Date();
    this._status = ReportStatus.PUBLISHED;

    this.addDomainEvent(
      new BaseDomainEvent('FinancialReportPublished', this._id, 'FinancialReport', {
        reportId: this._id,
        publishedAt: this._publishedAt,
      })
    );
  }

  markForReview(): void {
    this._status = ReportStatus.PENDING_REVIEW;

    this.addDomainEvent(
      new BaseDomainEvent('FinancialReportMarkedForReview', this._id, 'FinancialReport', {
        reportId: this._id,
      })
    );
  }

  archive(): void {
    if (this._status === ReportStatus.PUBLISHED) {
      this._status = ReportStatus.ARCHIVED;

      this.addDomainEvent(
        new BaseDomainEvent('FinancialReportArchived', this._id, 'FinancialReport', {
          reportId: this._id,
        })
      );
    }
  }

  /**
   * Create an amendment to this report
   * Does not delete the old report; creates a new version linked to the original
   */
  createAmendment(
    reason: string,
    amendedBy: string,
    updatedData?: {
      summary?: Partial<ReportSummary>;
      collections?: Partial<CollectionMetrics>;
      settlements?: Partial<SettlementMetrics>;
      balance?: Partial<BalanceMetrics>;
      revenue?: Partial<RevenueMetrics>;
      compliance?: Partial<ComplianceMetrics>;
    }
  ): FinancialReportParams {
    if (!this.canBeAmended()) {
      throw new Error(`Cannot amend report with status: ${this._status}`);
    }

    const amendmentId = `${this._id}_v${this._version + 1}`;
    const now = new Date();

    // Merge updated data with existing data
    const amendedSummary = updatedData?.summary
      ? { ...this._summary, ...updatedData.summary }
      : this._summary;
    const amendedCollections = updatedData?.collections
      ? { ...this._collections, ...updatedData.collections }
      : this._collections;
    const amendedSettlements = updatedData?.settlements
      ? { ...this._settlements, ...updatedData.settlements }
      : this._settlements;
    const amendedBalance = updatedData?.balance
      ? { ...this._balance, ...updatedData.balance }
      : this._balance;
    const amendedRevenue = updatedData?.revenue
      ? { ...this._revenue, ...updatedData.revenue }
      : this._revenue;
    const amendedCompliance = updatedData?.compliance
      ? { ...this._compliance, ...updatedData.compliance }
      : this._compliance;

    // Publish amendment event for the original report
    this.addDomainEvent(
      new BaseDomainEvent('FinancialReportAmendmentCreated', this._id, 'FinancialReport', {
        amendmentId,
        amendmentReason: reason,
        amendedBy,
        amendedAt: now,
        newVersion: this._version + 1,
      })
    );

    // Return parameters for creating the new amendment report
    return {
      id: amendmentId,
      reportType: this._reportType,
      periodStart: this._periodStart,
      periodEnd: this._periodEnd,
      generatedAt: now,
      status: ReportStatus.DRAFT,
      complianceStatus: ComplianceStatus.PENDING_REVIEW,
      version: this._version + 1,
      parentReportId: this._id,
      amendmentReason: reason,
      amendedBy,
      amendedAt: now,
      summary: amendedSummary,
      collections: amendedCollections,
      settlements: amendedSettlements,
      balance: amendedBalance,
      revenue: amendedRevenue,
      compliance: amendedCompliance,
    };
  }

  /**
   * Get the amendment history for this report chain
   */
  getAmendmentHistory(): Array<{
    version: number;
    reportId: string;
    amendmentReason?: string;
    amendedBy?: string;
    amendedAt?: Date;
  }> {
    const history = [
      {
        version: this._version,
        reportId: this._id,
        amendmentReason: this._amendmentReason,
        amendedBy: this._amendedBy,
        amendedAt: this._amendedAt,
      },
    ];

    // Note: In a real implementation, you would query the database
    // to get the full amendment chain from parentReportId relationships
    // This is a simplified version showing the current report's info

    return history;
  }

  /**
   * Check if this report has been amended (has newer versions)
   */
  hasBeenAmended(): boolean {
    // Note: In a real implementation, you would check the database
    // for reports that have this report's ID as their parentReportId
    // This is a placeholder that would need database integration
    return false;
  }

  updateComplianceStatus(status: ComplianceStatus, notes?: string): void {
    this._complianceStatus = status;

    this.addDomainEvent(
      new BaseDomainEvent('FinancialReportComplianceUpdated', this._id, 'FinancialReport', {
        reportId: this._id,
        complianceStatus: status,
        notes,
      })
    );
  }

  // Utility Methods
  getPeriodDays(): number {
    return Math.ceil(
      (this._periodEnd.getTime() - this._periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  isOverdue(): boolean {
    const now = new Date();
    return this._status === ReportStatus.DRAFT && now > this._periodEnd;
  }

  requiresAttention(): boolean {
    return (
      this._complianceStatus === ComplianceStatus.REQUIRES_ATTENTION ||
      this._complianceStatus === ComplianceStatus.NON_COMPLIANT ||
      this.isOverdue()
    );
  }

  toJSON() {
    return {
      id: this._id,
      reportType: this._reportType,
      periodStart: this._periodStart.toISOString(),
      periodEnd: this._periodEnd.toISOString(),
      generatedAt: this._generatedAt.toISOString(),
      status: this._status,
      complianceStatus: this._complianceStatus,
      approvedBy: this._approvedBy,
      approvedAt: this._approvedAt?.toISOString(),
      publishedAt: this._publishedAt?.toISOString(),

      // Version and Amendment fields
      version: this._version,
      parentReportId: this._parentReportId,
      amendmentReason: this._amendmentReason,
      amendedBy: this._amendedBy,
      amendedAt: this._amendedAt?.toISOString(),
      isAmendment: this.isAmendment(),

      summary: this._summary,
      collections: this._collections,
      settlements: this._settlements,
      balance: this._balance,
      revenue: this._revenue,
      compliance: this._compliance,
    };
  }
}

// Supporting Interfaces
export interface FinancialReportParams {
  id: string;
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  status?: ReportStatus;
  complianceStatus?: ComplianceStatus;
  approvedBy?: string;
  approvedAt?: Date;
  publishedAt?: Date;

  // Version and Amendment fields
  version?: number;
  parentReportId?: string;
  amendmentReason?: string;
  amendedBy?: string;
  amendedAt?: Date;

  summary: ReportSummary;
  collections: CollectionMetrics;
  settlements: SettlementMetrics;
  balance: BalanceMetrics;
  revenue: RevenueMetrics;
  compliance: ComplianceMetrics;
}

export interface ReportSummary {
  totalRevenue: number;
  totalCollections: number;
  totalSettlements: number;
  netProfit: number;
  totalFees: number;
  currency: string;
}

export interface CollectionMetrics {
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
}

export interface SettlementMetrics {
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
}

export interface BalanceMetrics {
  totalActiveBalances: number;
  totalBalanceAmount: number;
  averageBalance: number;
  lowBalanceAlerts: number;
  frozenBalances: number;
  balanceDistribution: {
    low: number; // <$100
    medium: number; // $100-$1000
    high: number; // >$1000
  };
  thresholdBreaches: number;
}

export interface RevenueMetrics {
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
}

export interface ComplianceMetrics {
  pciDssCompliant: boolean;
  amlCompliant: boolean;
  kycCompliant: boolean;
  gdprCompliant: boolean;
  auditTrailComplete: boolean;
  requiredFilings: Array<{
    filing: string;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    dueDate: Date;
    submittedDate?: Date;
  }>;
  complianceIssues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved';
    reportedAt: Date;
  }>;
}
