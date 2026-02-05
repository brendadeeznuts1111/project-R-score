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
    console.log(
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
    console.log(`📈 Getting collection metrics for ${period}`);
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
    console.log(`💰 Getting settlement analytics for period`);

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
    console.log('📅 Getting settlement schedule');
    return {
      nextSettlement: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pendingAmount: 15000,
      scheduledSettlements: 12,
    };
  }
}

class MockBalanceService {
  async getSystemBalanceSummary() {
    console.log('🏦 Getting system balance summary');

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
    console.log(`📊 Getting balance trends for ${period}`);
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
  console.log('\n📊 Example 1: Generate Monthly Financial Report');
  console.log('='.repeat(50));

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

    console.log(
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
      console.log('✅ Report generated successfully!');
      console.log(`📄 Report ID: ${report.id}`);
      console.log(`📊 Total Revenue: $${report.summary.totalRevenue.toLocaleString()}`);
      console.log(`💰 Net Profit: $${report.summary.netProfit.toLocaleString()}`);
      console.log(`📈 Collections: ${report.summary.totalCollections}`);
      console.log(`💳 Settlements: ${report.summary.totalSettlements}`);
      console.log(`⚖️ Compliance Status: ${report.complianceStatus}`);
      console.log(`📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`);

      // Demonstrate compliance checking
      console.log('\n🔍 Performing compliance check...');
      const complianceResponse = await controller.checkCompliance({
        reportId: report.id,
      });

      if (complianceResponse.success) {
        console.log(
          `✅ Compliance Check: ${complianceResponse.data.isCompliant ? 'PASSED' : 'ISSUES FOUND'}`
        );
        if (complianceResponse.data.issues.length > 0) {
          console.log('⚠️ Issues found:');
          complianceResponse.data.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue.issue} (${issue.severity})`);
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
  console.log('\n🔍 Example 2: Comprehensive Compliance Monitoring');
  console.log('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Get analytics with compliance focus
    const analyticsResponse = await controller.getAnalytics();

    if (analyticsResponse.success) {
      const analytics = analyticsResponse.data.analytics;
      console.log('📊 Compliance Analytics:');
      console.log(`   Total Reports: ${analytics.summary.totalReports}`);
      console.log(`   Compliance Rate: ${analytics.summary.complianceRate}%`);
      console.log(`   Pending Reviews: ${analytics.summary.reportsByStatus.pending_review || 0}`);
      console.log(`   Overdue Reports: ${analytics.summary.reportsByStatus.draft || 0}`);

      // Check for alerts
      if (analytics.alerts.length > 0) {
        console.log('\n🚨 Active Alerts:');
        analytics.alerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.message} (${alert.severity})`);
        });
      } else {
        console.log('\n✅ No active alerts');
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
  console.log('\n🔄 Example 3: Automated Report Approval Workflow');
  console.log('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // 1. Generate report
    console.log('📝 Step 1: Generating report...');
    const generateResponse = await controller.generateReport({
      reportType: ReportType.WEEKLY,
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    if (!generateResponse.success) {
      throw new Error('Failed to generate report');
    }

    const reportId = generateResponse.data.report.id;
    console.log(`✅ Report generated: ${reportId}`);

    // 2. Check compliance
    console.log('🔍 Step 2: Checking compliance...');
    const complianceResponse = await controller.checkCompliance({
      reportId,
    });

    if (complianceResponse.success && complianceResponse.data.isCompliant) {
      console.log('✅ Compliance check passed');

      // 3. Approve report
      console.log('👨‍💼 Step 3: Approving report...');
      const approvalResponse = await controller.approveReport({
        reportId,
        approvedBy: 'compliance_officer@company.com',
      });

      if (approvalResponse.success) {
        console.log('✅ Report approved successfully');
        const approvedReport = approvalResponse.data.report;

        // 4. Publish report
        console.log('📤 Step 4: Publishing report...');
        const publishResponse = await controller.publishReport({
          reportId,
        });

        if (publishResponse.success) {
          console.log('✅ Report published successfully');
          console.log(`📊 Final Status: ${approvedReport.status}`);
          console.log(`📅 Published: ${new Date(approvedReport.publishedAt).toLocaleString()}`);

          return approvedReport;
        }
      }
    } else {
      console.log('❌ Compliance check failed');
      if (complianceResponse.data.issues.length > 0) {
        console.log('Issues:');
        complianceResponse.data.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.issue}`);
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
  console.log('\n🔍 Example 4: Advanced Search and Filtering');
  console.log('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Generate multiple reports for demonstration
    console.log('📝 Generating sample reports...');
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

    console.log('✅ Generated 10 sample reports');

    // Search by type
    console.log('\n📊 Searching by report type...');
    const monthlyReports = await controller.searchReports({
      reportType: ReportType.MONTHLY,
    });

    if (monthlyReports.success) {
      console.log(`📈 Found ${monthlyReports.data.reports.length} monthly reports`);
    }

    // Search with date range
    console.log('\n📅 Searching by date range...');
    const dateRangeReports = await controller.searchReports({
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    if (dateRangeReports.success) {
      console.log(`📊 Found ${dateRangeReports.data.reports.length} reports in last 30 days`);
    }

    // Search with pagination
    console.log('\n📄 Searching with pagination...');
    const paginatedReports = await controller.searchReports({
      limit: 5,
      offset: 5,
    });

    if (paginatedReports.success) {
      console.log(`📋 Page results: ${paginatedReports.data.reports.length} reports`);
      console.log(`📊 Total available: ${paginatedReports.data.total}`);
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
  console.log('\n📊 Example 5: Real-time Monitoring Dashboard');
  console.log('='.repeat(50));

  const repository = FinancialReportingRepositoryFactory.createInMemoryRepository();
  const controller = FinancialReportingControllerFactory.create(repository);

  try {
    // Health check
    console.log('🏥 System Health Check:');
    const healthResponse = await controller.healthCheck();

    if (healthResponse.success) {
      const health = healthResponse.data;
      console.log(`   Status: ${health.status}`);
      console.log(`   Uptime: ${health.uptime}s`);
      console.log(`   Reports: ${health.statistics.totalReports}`);
      console.log(`   Features: ${health.features.length} active`);
    }

    // Get analytics
    console.log('\n📈 Current Analytics:');
    const analyticsResponse = await controller.getAnalytics();

    if (analyticsResponse.success) {
      const analytics = analyticsResponse.data.analytics;
      console.log(
        `   Period: ${analytics.period.start.split('T')[0]} to ${analytics.period.end.split('T')[0]}`
      );
      console.log(`   Total Reports: ${analytics.summary.totalReports}`);
      console.log(`   Compliance Rate: ${analytics.summary.complianceRate}%`);
      console.log(`   Average Processing: ${analytics.summary.averageProcessingTime}ms`);

      // Revenue trends
      if (analytics.trends.revenue.length > 0) {
        console.log('\n💰 Recent Revenue:');
        analytics.trends.revenue.slice(-3).forEach(trend => {
          console.log(`   ${trend.date}: $${trend.amount.toLocaleString()}`);
        });
      }
    }

    // Check for attention items
    console.log('\n🚨 Reports Requiring Attention:');
    const attentionResponse = await controller.getReportsRequiringAttention();

    if (attentionResponse.success) {
      if (attentionResponse.data.reports.length > 0) {
        attentionResponse.data.reports.forEach((report, index) => {
          console.log(
            `   ${index + 1}. ${report.id} - ${report.status} (${report.complianceStatus})`
          );
        });
      } else {
        console.log('   ✅ No reports require attention');
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
  console.log('🚀 Financial Reporting Domain - Complete Usage Examples');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Run all examples
    await exampleMonthlyReport();
    await exampleComplianceMonitoring();
    await exampleApprovalWorkflow();
    await exampleAdvancedSearch();
    await exampleMonitoringDashboard();

    console.log('\n🎉 All examples completed successfully!');
    console.log('='.repeat(70));
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
