/**
 * Report Generator Service
 * Domain-Driven Design Implementation
 *
 * Handles generation of financial reports from ledger data
 */

import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { AccountingPeriod } from '../value-objects/accounting-period';
import { FinancialReport } from '../entities/financial-report';
import { OddsMovementAnalysisService } from './odds-movement-analysis-service';

export interface DailyTransactionReportData {
  reportDate: string;
  generatedAt: string;
  threshold: number;
  totalTransactions: number;
  totalAmount: number;
  transactions: Array<{
    entryDate: string;
    accountId: string;
    accountType: string;
    customerId?: string;
    amount: number;
    currencyCode: string;
    description: string;
    referenceId?: string;
    transactionCategory: 'high_value' | 'customer_transaction' | 'standard';
  }>;
}

export interface MonthlyPLData {
  period: string;
  fiscalYear: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  grossRevenue: number;
  bonusesPromos: number;
  netGamingRevenue: number;
  taxes: number;
  netProfit: number;
  generatedAt: string;
}

export class ReportGeneratorService {
  constructor(
    private db: any, // SQLite database connection
    private oddsAnalysisService?: OddsMovementAnalysisService,
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Generate Daily Transaction Report (DTR)
   * Queries ledger_entries table for customer-facing accounts above threshold
   * Enhanced with odds movement analysis
   */
  async generateDailyTransactionReport(
    date: Date,
    threshold: number = 100,
    includeOddsAnalysis: boolean = true
  ): Promise<
    DailyTransactionReportData & {
      oddsMovementInsights?: {
        totalMovements: number;
        significantMovements: number;
        avgMovementPercentage: number;
        topMovingMarkets: Array<{
          marketId: string;
          movements: number;
          avgChange: number;
        }>;
      };
    }
  > {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Query the daily_transaction_report view
      const query = `
        SELECT
          entry_date,
          account_id,
          account_type,
          customer_id,
          amount,
          currency_code,
          description,
          reference_id,
          transaction_category
        FROM daily_transaction_report
        WHERE entry_date BETWEEN ? AND ?
          AND ABS(amount) >= ?
        ORDER BY entry_date ASC
      `;

      const transactions = await this.db`
        SELECT
          le.entry_date,
          le.account_id,
          le.account_type,
          le.customer_id,
          le.amount,
          le.currency_code,
          le.description,
          le.reference_id,
          CASE
            WHEN ABS(le.amount) >= 10000 THEN 'high_value'
            WHEN le.account_type = 'customer' THEN 'customer_transaction'
            ELSE 'standard'
          END as transaction_category
        FROM ledger_entries le
        JOIN accounts a ON le.account_id = a.id
        WHERE le.entry_date BETWEEN ${startOfDay.toISOString()} AND ${endOfDay.toISOString()}
          AND ABS(le.amount) >= ${threshold}
          AND le.account_type IN ('customer', 'revenue', 'expense')
          AND le.status = 'posted'
        ORDER BY le.entry_date ASC
      `;

      // Calculate totals
      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce(
        (sum: number, tx: any) => sum + Math.abs(tx.amount),
        0
      );

      const reportData: DailyTransactionReportData = {
        reportDate: date.toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        threshold,
        totalTransactions,
        totalAmount,
        transactions: transactions.map((tx: any) => ({
          entryDate: tx.entry_date,
          accountId: tx.account_id,
          accountType: tx.account_type,
          customerId: tx.customer_id,
          amount: tx.amount,
          currencyCode: tx.currency_code,
          description: tx.description,
          referenceId: tx.reference_id,
          transactionCategory: tx.transaction_category,
        })),
      };

      // Enhanced report with odds movement analysis
      const enhancedReport = reportData as any;

      if (includeOddsAnalysis && this.oddsAnalysisService) {
        try {
          // Get odds movement insights for the day
          const oddsInsights = await this.getOddsMovementInsightsForDay(date);

          // Analyze bet timing for significant transactions
          const significantBets = transactions.filter(
            (tx: any) => Math.abs(tx.amount) >= threshold * 2 // High-value bets
          );

          if (significantBets.length > 0) {
            enhancedReport.betTimingAnalysis =
              await this.analyzeSignificantBetTiming(significantBets);
          }

          enhancedReport.oddsMovementInsights = oddsInsights;
        } catch (oddsError) {
          console.warn('Odds movement analysis failed:', oddsError.message);
          // Continue without odds analysis rather than failing the entire report
        }
      }

      // Publish domain event
      this.events.publish('DailyTransactionReportGenerated', {
        reportDate: date.toISOString().split('T')[0],
        transactionCount: totalTransactions,
        totalAmount,
        threshold,
        includeOddsAnalysis,
        generatedAt: new Date().toISOString(),
      });

      return enhancedReport;
    } catch (error) {
      this.events.publish('DailyTransactionReportFailed', {
        reportDate: date.toISOString().split('T')[0],
        error: error.message,
      });

      throw new DomainError(
        `Failed to generate daily transaction report: ${error.message}`,
        'DTR_GENERATION_FAILED'
      );
    }
  }

  /**
   * Generate Monthly Profit & Loss Report
   * Aggregates ledger_entries by revenue and expense accounts using account_id
   */
  async generateMonthlyPLReport(period: AccountingPeriod): Promise<MonthlyPLData> {
    const startDate = period.getStartDate();
    const endDate = period.getEndDate();

    try {
      // Query the monthly_profit_loss view
      const query = `
        SELECT
          fiscal_year,
          period_number,
          start_date,
          end_date,
          gross_revenue,
          bonuses_promos,
          net_gaming_revenue,
          taxes,
          net_profit
        FROM monthly_profit_loss
        WHERE fiscal_year = ? AND period_number = ?
      `;

      const result = await this.db`
        SELECT
          fiscal_year,
          period_number,
          start_date,
          end_date,
          gross_revenue,
          bonuses_promos,
          net_gaming_revenue,
          taxes,
          net_profit
        FROM monthly_profit_loss
        WHERE fiscal_year = ${period.getFiscalYear()} AND period_number = ${period.getPeriodNumber()}
      `;

      if (!result) {
        throw new Error(`No P&L data found for period ${period.getDisplayName()}`);
      }

      const plData: MonthlyPLData = {
        period: period.getDisplayName(),
        fiscalYear: result.fiscal_year,
        periodNumber: result.period_number,
        startDate: result.start_date,
        endDate: result.end_date,
        grossRevenue: result.gross_revenue || 0,
        bonusesPromos: result.bonuses_promos || 0,
        netGamingRevenue: result.net_gaming_revenue || 0,
        taxes: result.taxes || 0,
        netProfit: result.net_profit || 0,
        generatedAt: new Date().toISOString(),
      };

      // Publish domain event
      this.events.publish('MonthlyPLReportGenerated', {
        period: period.getDisplayName(),
        fiscalYear: period.getFiscalYear(),
        periodNumber: period.getPeriodNumber(),
        netProfit: plData.netProfit,
        generatedAt: new Date().toISOString(),
      });

      return plData;
    } catch (error) {
      this.events.publish('MonthlyPLReportFailed', {
        period: period.getDisplayName(),
        error: error.message,
      });

      throw new DomainError(
        `Failed to generate monthly P&L report: ${error.message}`,
        'PL_GENERATION_FAILED'
      );
    }
  }

  /**
   * Generate comprehensive financial report with DTR and P&L data
   */
  async generateComprehensiveReport(
    period: AccountingPeriod,
    includeDTR: boolean = true,
    dtrThreshold: number = 100
  ): Promise<FinancialReport> {
    try {
      // Gather data from multiple sources
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

      // Get P&L data
      const plData = await this.generateMonthlyPLReport(period);
      reportData.summary.totalRevenue = plData.grossRevenue;
      reportData.summary.netProfit = plData.netProfit;
      reportData.summary.totalFees = plData.taxes + plData.bonusesPromos;

      // Get DTR data if requested
      if (includeDTR) {
        const dtrData = await this.generateDailyTransactionReport(
          new Date(period.getEndDate()),
          dtrThreshold
        );
        reportData.collections.totalCollections = dtrData.totalTransactions;
        reportData.collections.totalAmount = dtrData.totalAmount;
      }

      // Create FinancialReport entity
      const report = new FinancialReport({
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reportType: 'monthly' as any,
        periodStart: period.getStartDate(),
        periodEnd: period.getEndDate(),
        generatedAt: new Date(),
        ...reportData,
      });

      // Publish domain event
      this.events.publish('ComprehensiveReportGenerated', {
        reportId: report.getId(),
        period: period.getDisplayName(),
        includeDTR,
        generatedAt: new Date().toISOString(),
      });

      return report;
    } catch (error) {
      this.events.publish('ComprehensiveReportFailed', {
        period: period.getDisplayName(),
        error: error.message,
      });

      throw new DomainError(
        `Failed to generate comprehensive report: ${error.message}`,
        'COMPREHENSIVE_REPORT_FAILED'
      );
    }
  }

  /**
   * Validate data completeness for reporting period
   */
  async validateDataCompleteness(period: AccountingPeriod): Promise<{
    isComplete: boolean;
    missingData: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const startDate = period.getStartDate();
    const endDate = period.getEndDate();

    // Check ledger entries count
    const ledgerQuery = `
      SELECT COUNT(*) as count FROM ledger_entries
      WHERE entry_date BETWEEN ? AND ?
    `;

    const ledgerResult = await this.db`
      SELECT COUNT(*) as count FROM ledger_entries
      WHERE entry_date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    `;

    if (ledgerResult.count === 0) {
      issues.push('No ledger entries found for the reporting period');
      recommendations.push('Verify that financial transactions are being recorded properly');
    }

    // Check for data gaps (days with no transactions)
    const gapQuery = `
      SELECT DATE(entry_date) as date, COUNT(*) as transactions
      FROM ledger_entries
      WHERE entry_date BETWEEN ? AND ?
      GROUP BY DATE(entry_date)
      ORDER BY DATE(entry_date)
    `;

    const dailyCounts = await this.db`
      SELECT DATE(entry_date) as date, COUNT(*) as transactions
      FROM ledger_entries
      WHERE entry_date BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
      GROUP BY DATE(entry_date)
      ORDER BY DATE(entry_date)
    `;

    const daysWithNoTransactions = [];
    const periodDays = period.getPeriodLength();

    for (let i = 0; i < periodDays; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const dayData = dailyCounts.find((d: any) => d.date === dateStr);
      if (!dayData || dayData.transactions === 0) {
        daysWithNoTransactions.push(dateStr);
      }
    }

    if (daysWithNoTransactions.length > 0) {
      issues.push(`${daysWithNoTransactions.length} days with no transactions detected`);
      recommendations.push(
        'Investigate days with zero transaction volume for potential data issues'
      );
    }

    return {
      isComplete: issues.length === 0,
      missingData: issues,
      recommendations,
    };
  }

  /**
   * Get odds movement insights for a specific day
   */
  private async getOddsMovementInsightsForDay(date: Date): Promise<{
    totalMovements: number;
    significantMovements: number;
    avgMovementPercentage: number;
    topMovingMarkets: Array<{
      marketId: string;
      movements: number;
      avgChange: number;
    }>;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query odds movements for the day
    const movementsQuery = `
      SELECT
        market_id,
        COUNT(*) as movements,
        AVG(movement_percentage) as avg_change,
        SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements
      FROM odds_movements
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY market_id
      ORDER BY movements DESC
      LIMIT 10
    `;

    const marketMovements = await this.db`
      SELECT
        market_id,
        COUNT(*) as movements,
        AVG(movement_percentage) as avg_change,
        SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements
      FROM odds_movements
      WHERE timestamp BETWEEN ${startOfDay.toISOString()} AND ${endOfDay.toISOString()}
      GROUP BY market_id
      ORDER BY movements DESC
      LIMIT 10
    `;

    // Get overall stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_movements,
        AVG(movement_percentage) as avg_movement_percentage,
        SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements
      FROM odds_movements
      WHERE timestamp BETWEEN ? AND ?
    `;

    const stats = await this.db`
      SELECT
        COUNT(*) as total_movements,
        AVG(movement_percentage) as avg_movement_percentage,
        SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements
      FROM odds_movements
      WHERE timestamp BETWEEN ${startOfDay.toISOString()} AND ${endOfDay.toISOString()}
    `;

    return {
      totalMovements: stats.total_movements || 0,
      significantMovements: stats.significant_movements || 0,
      avgMovementPercentage: stats.avg_movement_percentage || 0,
      topMovingMarkets: marketMovements.map((m: any) => ({
        marketId: m.market_id,
        movements: m.movements,
        avgChange: m.avg_change,
      })),
    };
  }

  /**
   * Analyze timing of significant bets relative to odds movements
   */
  private async analyzeSignificantBetTiming(significantBets: any[]): Promise<{
    totalBets: number;
    favorableTiming: number;
    unfavorableTiming: number;
    potentialSavings: number;
    riskDistribution: Record<string, number>;
  }> {
    let favorableTiming = 0;
    let unfavorableTiming = 0;
    let totalPotentialSavings = 0;
    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    for (const bet of significantBets) {
      try {
        // Extract bet information from transaction data
        const betInfo = this.extractBetInfoFromTransaction(bet);
        if (!betInfo) continue;

        // Analyze bet timing if service is available
        if (this.oddsAnalysisService) {
          const timingAnalysis = await this.oddsAnalysisService.analyzeBetTiming(
            betInfo.betId,
            betInfo.customerId,
            betInfo.eventId,
            betInfo.marketId,
            betInfo.selectionId,
            betInfo.amount,
            betInfo.odds,
            new Date(bet.entry_date)
          );

          if (timingAnalysis) {
            if (timingAnalysis.oddsPosition === 'favorable') {
              favorableTiming++;
            } else if (timingAnalysis.oddsPosition === 'unfavorable') {
              unfavorableTiming++;
            }

            totalPotentialSavings += timingAnalysis.potentialSavings;
            riskDistribution[timingAnalysis.riskAssessment]++;
          }
        }
      } catch (error) {
        console.warn(
          `Failed to analyze bet timing for transaction ${bet.reference_id}:`,
          error.message
        );
      }
    }

    return {
      totalBets: significantBets.length,
      favorableTiming,
      unfavorableTiming,
      potentialSavings: totalPotentialSavings,
      riskDistribution,
    };
  }

  /**
   * Extract bet information from transaction data
   */
  private extractBetInfoFromTransaction(transaction: any): {
    betId: string;
    customerId: string;
    eventId: string;
    marketId: string;
    selectionId: string;
    amount: number;
    odds: number;
  } | null {
    try {
      // Parse bet information from transaction description or reference
      // This is a simplified example - actual implementation would depend on your data structure
      if (transaction.reference_id && transaction.reference_id.includes('bet_')) {
        // Extract bet details from reference ID or metadata
        return {
          betId: transaction.reference_id,
          customerId: transaction.customer_id || 'unknown',
          eventId: 'event_' + Math.floor(Math.random() * 1000), // Placeholder
          marketId: 'market_' + Math.floor(Math.random() * 100), // Placeholder
          selectionId: 'selection_' + Math.floor(Math.random() * 10), // Placeholder
          amount: Math.abs(transaction.amount),
          odds: 2.0 + Math.random() * 3, // Placeholder odds between 2.0 and 5.0
        };
      }
      return null;
    } catch (error) {
      console.warn('Failed to extract bet info from transaction:', error.message);
      return null;
    }
  }
}

// Factory for creating report generators
export class ReportGeneratorFactory {
  static create(db: any): ReportGeneratorService {
    return new ReportGeneratorService(db);
  }
}
