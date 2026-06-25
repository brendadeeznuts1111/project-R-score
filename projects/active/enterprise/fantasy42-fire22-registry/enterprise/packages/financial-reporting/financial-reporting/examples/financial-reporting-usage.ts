/**
 * Financial Reporting Domain Usage Examples
 * Practical examples of how to use the Financial Reporting domain
 */

import { FinancialReportingControllerFactory } from '../financial-reporting-controller';
import { FinancialReportingRepositoryFactory } from '../repositories/financial-reporting-repository';
import { ReportType } from '../entities/financial-report';

// Mock domain services for demonstration
class MockCollectionsService {
  async calculateRevenue(timeRange: { start: Date; end: Date }) {
    console.info(
      `📊 Calculating revenue from ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`
    );

    return {
      totalCollections: 250,
      successfulCollections: 245,
      failedCollections: 5,
      totalAmount: 125000,
      averageAmount: 500,
      collectionsByMethod: { card: 150, bank_transfer: 80, wallet: 20 },
      collectionsByCurrency: { USD: 200, EUR: 45, GBP: 5 },
      processingTime: { average: 1200, min: 800, max: 2500 },
    };
  }

  async getCollectionMetrics(period: string) {
    console.info(`📈 Getting collection metrics for ${period}`);
    return {
      volume: 125000,
      successRate: 98,
      averageTransaction: 500,
      peakHours: ['14:00', '16:00', '18:00'],
    };
  }
}

class MockSettlementsService {
  async getSettlementAnalytics(
    merchantId: string | undefined,
    dateRange: { start: Date; end: Date }
  ) {
    console.info(`💰 Getting settlement analytics for period`);

    return {
      totalSettlements: 245,
      successfulSettlements: 240,
      pendingSettlements: 3,
      failedSettlements: 2,
      totalAmount: 122500,
      totalFees: 1225,
      netAmount: 121275,
      settlementsByMerchant: {
        merchant_1: 150,
        merchant_2: 80,
        merchant_3: 15,
      },
      averageProcessingTime: 1800,
      settlementSuccessRate: 97.96,
    };
  }

  async getSettlementSchedule() {
    console.info('📅 Getting settlement schedule');
    return {
      nextSettlement: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pendingAmount: 15000,
      scheduledSettlements: 12,
    };
  }
}

class MockBalanceService {
  async getSystemBalanceSummary() {
    console.info('🏦 Getting system balance summary');

    return {
      totalActiveBalances: 1500,
      totalBalanceAmount: 750000,
      averageBalance: 500,
      lowBalanceAlerts: 75,
      frozenBalances: 8,
      balanceDistribution: { low: 300, medium: 900, high: 300 },
      thresholdBreaches: 35,
    };
  }

  async getBalanceTrends(period: string) {
    console.info(`📊 Getting balance trends for ${period}`);
    return {
      growth: 12.5,
      volatility: 3.2,
      topDepositors: ['user_123', 'user_456', 'user_789'],
    };
  }
}

/**
 * Example 1: Generate a Monthly Financial Report
 */
export async function exampleMonthlyReport() {
  console.info('\n📊 Example 1: Generate Monthly Financial Report');
  console.info('='.repeat(50));

  // Initialize services
  const collectionsService = new MockCollectionsService();
  const settlementsService = new MockSettlementsService();
  const balanceService = new MockBalanceService();

  // Create controller with integrated services
  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository, {
    collectionsService,
    settlementsService,
    balanceService,
  });

  try {
    // Generate monthly report
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    console.info(
      `📅 Generating report for: ${firstDayOfMonth.toISOString().split('T')[0]} to ${lastDayOfMonth.toISOString().split('T')[0]}`
    );

    const response = await controller.generateReport({
      reportType: ReportType.MONTHLY,
      periodStart: firstDayOfMonth.toISOString(),
      periodEnd: lastDayOfMonth.toISOString(),
      includeCollections: true,
      includeSettlements: true,
      includeBalances: true,
      includeRevenue: true,
      includeCompliance: true,
    });

    if (response.success) {
      const report = response.data.report;
      console.info('✅ Report generated successfully!');
      console.info(`📄 Report ID: ${report.id}`);
      console.info(`📊 Total Revenue: $${report.summary.totalRevenue.toLocaleString()}`);
      console.info(`💰 Net Profit: $${report.summary.netProfit.toLocaleString()}`);
      console.info(`📈 Collections: ${report.summary.totalCollections}`);
      console.info(`💳 Settlements: ${report.summary.totalSettlements}`);
      console.info(`⚖️ Compliance Status: ${report.complianceStatus}`);
      console.info(`📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`);

      // Demonstrate compliance checking
      console.info('\n🔍 Performing compliance check...');
      const complianceResponse = await controller.checkCompliance({
        reportId: report.id,
      });

      if (complianceResponse.success) {
        console.info(
          `✅ Compliance Check: ${complianceResponse.data.isCompliant ? 'PASSED' : 'ISSUES FOUND'}`
        );
        if (complianceResponse.data.issues.length > 0) {
          console.info('⚠️ Issues found:');
          complianceResponse.data.issues.forEach((issue, index) => {
            console.info(`   ${index + 1}. ${issue.issue} (${issue.severity})`);
          });
        }
      }

      return response.data.report;
    } else {
      console.error('❌ Failed to generate report:', response.error.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: Comprehensive Compliance Monitoring
 */
export async function exampleComplianceMonitoring() {
  console.info('\n🔍 Example 2: Comprehensive Compliance Monitoring');
  console.info('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Get analytics with compliance focus
    const analyticsResponse = await controller.getAnalytics();

    if (analyticsResponse.success) {
      const analytics = analyticsResponse.data.analytics;
      console.info('📊 Compliance Analytics:');
      console.info(`   Total Reports: ${analytics.summary.totalReports}`);
      console.info(`   Compliance Rate: ${analytics.summary.complianceRate}%`);
      console.info(`   Pending Reviews: ${analytics.summary.reportsByStatus.pending_review || 0}`);
      console.info(`   Overdue Reports: ${analytics.summary.reportsByStatus.draft || 0}`);

      // Check for alerts
      if (analytics.alerts.length > 0) {
        console.info('\n🚨 Active Alerts:');
        analytics.alerts.forEach((alert, index) => {
          console.info(`   ${index + 1}. ${alert.message} (${alert.severity})`);
        });
      } else {
        console.info('\n✅ No active alerts');
      }

      return analytics;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: Automated Report Approval Workflow
 */
export async function exampleApprovalWorkflow() {
  console.info('\n🔄 Example 3: Automated Report Approval Workflow');
  console.info('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // 1. Generate report
    console.info('📝 Step 1: Generating report...');
    const generateResponse = await controller.generateReport({
      reportType: ReportType.WEEKLY,
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    if (!generateResponse.success) {
      throw new Error('Failed to generate report');
    }

    const reportId = generateResponse.data.report.id;
    console.info(`✅ Report generated: ${reportId}`);

    // 2. Check compliance
    console.info('🔍 Step 2: Checking compliance...');
    const complianceResponse = await controller.checkCompliance({
      reportId,
    });

    if (complianceResponse.success && complianceResponse.data.isCompliant) {
      console.info('✅ Compliance check passed');

      // 3. Approve report
      console.info('👨‍💼 Step 3: Approving report...');
      const approvalResponse = await controller.approveReport({
        reportId,
        approvedBy: 'compliance_officer@company.com',
      });

      if (approvalResponse.success) {
        console.info('✅ Report approved successfully');
        const approvedReport = approvalResponse.data.report;

        // 4. Publish report
        console.info('📤 Step 4: Publishing report...');
        const publishResponse = await controller.publishReport({
          reportId,
        });

        if (publishResponse.success) {
          console.info('✅ Report published successfully');
          console.info(`📊 Final Status: ${approvedReport.status}`);
          console.info(`📅 Published: ${new Date(approvedReport.publishedAt).toLocaleString()}`);

          return approvedReport;
        }
      }
    } else {
      console.info('❌ Compliance check failed');
      if (complianceResponse.data.issues.length > 0) {
        console.info('Issues:');
        complianceResponse.data.issues.forEach((issue, index) => {
          console.info(`   ${index + 1}. ${issue.issue}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Workflow error:', error.message);
  }
}

/**
 * Example 4: Advanced Search and Filtering
 */
export async function exampleAdvancedSearch() {
  console.info('\n🔍 Example 4: Advanced Search and Filtering');
  console.info('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Generate multiple reports for demonstration
    console.info('📝 Generating sample reports...');
    const reportTypes = [ReportType.DAILY, ReportType.WEEKLY, ReportType.MONTHLY];
    const statuses = ['draft', 'pending_review', 'approved', 'published'];

    for (let i = 0; i < 10; i++) {
      const reportType = reportTypes[i % reportTypes.length];
      const daysBack = (i + 1) * 7; // Spread over weeks

      await controller.generateReport({
        reportType,
        periodStart: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() - (daysBack - 7) * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    console.info('✅ Generated 10 sample reports');

    // Search by type
    console.info('\n📊 Searching by report type...');
    const monthlyReports = await controller.searchReports({
      reportType: ReportType.MONTHLY,
    });

    if (monthlyReports.success) {
      console.info(`📈 Found ${monthlyReports.data.reports.length} monthly reports`);
    }

    // Search with date range
    console.info('\n📅 Searching by date range...');
    const dateRangeReports = await controller.searchReports({
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    if (dateRangeReports.success) {
      console.info(`📊 Found ${dateRangeReports.data.reports.length} reports in last 30 days`);
    }

    // Search with pagination
    console.info('\n📄 Searching with pagination...');
    const paginatedReports = await controller.searchReports({
      limit: 5,
      offset: 5,
    });

    if (paginatedReports.success) {
      console.info(`📋 Page results: ${paginatedReports.data.reports.length} reports`);
      console.info(`📊 Total available: ${paginatedReports.data.total}`);
    }

    return {
      monthlyReports: monthlyReports.success ? monthlyReports.data.reports : [],
      dateRangeReports: dateRangeReports.success ? dateRangeReports.data.reports : [],
      paginatedReports: paginatedReports.success ? paginatedReports.data.reports : [],
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: Real-time Monitoring Dashboard
 */
export async function exampleMonitoringDashboard() {
  console.info('\n📊 Example 5: Real-time Monitoring Dashboard');
  console.info('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Health check
    console.info('🏥 System Health Check:');
    const healthResponse = await controller.healthCheck();

    if (healthResponse.success) {
      const health = healthResponse.data;
      console.info(`   Status: ${health.status}`);
      console.info(`   Uptime: ${health.uptime}s`);
      console.info(`   Reports: ${health.statistics.totalReports}`);
      console.info(`   Features: ${health.features.length} active`);
    }

    // Get analytics
    console.info('\n📈 Current Analytics:');
    const analyticsResponse = await controller.getAnalytics();

    if (analyticsResponse.success) {
      const analytics = analyticsResponse.data.analytics;
      console.info(
        `   Period: ${analytics.period.start.split('T')[0]} to ${analytics.period.end.split('T')[0]}`
      );
      console.info(`   Total Reports: ${analytics.summary.totalReports}`);
      console.info(`   Compliance Rate: ${analytics.summary.complianceRate}%`);
      console.info(`   Average Processing: ${analytics.summary.averageProcessingTime}ms`);

      // Revenue trends
      if (analytics.trends.revenue.length > 0) {
        console.info('\n💰 Recent Revenue:');
        analytics.trends.revenue.slice(-3).forEach(trend => {
          console.info(`   ${trend.date}: $${trend.amount.toLocaleString()}`);
        });
      }
    }

    // Check for attention items
    console.info('\n🚨 Reports Requiring Attention:');
    const attentionResponse = await controller.getReportsRequiringAttention();

    if (attentionResponse.success) {
      if (attentionResponse.data.reports.length > 0) {
        attentionResponse.data.reports.forEach((report, index) => {
          console.info(
            `   ${index + 1}. ${report.id} - ${report.status} (${report.complianceStatus})`
          );
        });
      } else {
        console.info('   ✅ No reports require attention');
      }
    }

    return {
      health: healthResponse.success ? healthResponse.data : null,
      analytics: analyticsResponse.success ? analyticsResponse.data.analytics : null,
      attentionItems: attentionResponse.success ? attentionResponse.data.reports : [],
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Main demonstration runner
 */
export async function runAllExamples() {
  console.info('🚀 Financial Reporting Domain - Complete Usage Examples');
  console.info('='.repeat(70));
  console.info('');

  try {
    // Run all examples
    await exampleMonthlyReport();
    await exampleComplianceMonitoring();
    await exampleApprovalWorkflow();
    await exampleAdvancedSearch();
    await exampleMonitoringDashboard();

    console.info('\n🎉 All examples completed successfully!');
    console.info('='.repeat(70));
  } catch (error) {
    console.error('❌ Example execution failed:', error.message);
  }
}

// Export for use in other files
export { MockCollectionsService, MockSettlementsService, MockBalanceService };

// Run examples if called directly
if (import.meta.main) {
  runAllExamples();
}
