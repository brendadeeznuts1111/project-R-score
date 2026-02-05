// Dispute analytics dashboard for admin monitoring

import { DisputeDatabase } from "./database";
import { 
  DisputeMetrics,
  Dispute,
  Merchant,
  DisputeReport,
  DisputeStatus
} from "./types";

export class DisputeAnalyticsDashboard {
  private db: DisputeDatabase;

  constructor() {
    this.db = new DisputeDatabase();
  }

  // Get comprehensive dispute metrics
  async getDisputeMetrics(timeRange: string = 'LAST_30_DAYS'): Promise<DisputeMetrics> {
    const totalDisputes = await this.db.countDisputes(timeRange);
    const resolutionRate = await this.calculateResolutionRate(timeRange);
    const averageResolutionTime = await this.calculateAverageResolutionTime(timeRange);
    const topDisputeReasons = await this.getTopDisputeReasons(timeRange);
    const highRiskMerchants = await this.identifyHighRiskMerchants(timeRange);
    const customerSatisfaction = await this.calculateCustomerSatisfaction(timeRange);
    const financialImpact = await this.calculateFinancialImpact(timeRange);

    return {
      totalDisputes,
      resolutionRate,
      averageResolutionTime,
      topDisputeReasons,
      highRiskMerchants,
      customerSatisfaction,
      financialImpact
    };
  }

  // Generate detailed dispute report
  async generateDisputeReport(disputeId: string): Promise<DisputeReport> {
    const dispute = await this.db.getDispute(disputeId);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const transaction = await this.db.getTransaction(dispute.transactionId);
    const customer = await this.db.getCustomer(dispute.customerId);
    const merchant = await this.db.getMerchant(dispute.merchantId);

    return {
      summary: {
        id: dispute.id,
        status: dispute.status,
        outcome: dispute.resolution?.outcome,
        amount: transaction?.amount || 0,
        daysToResolve: this.calculateDaysToResolve(dispute)
      },
      parties: {
        customer: customer ? this.anonymizeCustomer(customer) : null,
        merchant: merchant || null,
        moderator: 'SYSTEM' // In a real system, this would be the actual moderator
      },
      timeline: dispute.timeline,
      evidence: await this.summarizeEvidence(dispute.evidenceUrls),
      decisionFactors: dispute.resolution?.factors || [],
      compliance: {
        pciCompliant: true,
        dataRetention: '7 years as per Regulation E',
        auditTrail: await this.generateAuditTrail(dispute)
      }
    };
  }

  // Get real-time dispute statistics
  async getRealTimeStats(): Promise<{
    activeDisputes: number;
    pendingMerchantResponse: number;
    escalatedToVenmo: number;
    resolvedToday: number;
    averageResponseTime: number;
  }> {
    const activeDisputes = await this.countDisputesByStatus(['SUBMITTED', 'MERCHANT_REVIEW', 'UNDER_REVIEW', 'ESCALATED_TO_VENMO']);
    const pendingMerchantResponse = await this.countDisputesByStatus(['MERCHANT_REVIEW']);
    const escalatedToVenmo = await this.countDisputesByStatus(['ESCALATED_TO_VENMO']);
    const resolvedToday = await this.countDisputesResolvedToday();
    const averageResponseTime = await this.calculateAverageMerchantResponseTime();

    return {
      activeDisputes,
      pendingMerchantResponse,
      escalatedToVenmo,
      resolvedToday,
      averageResponseTime
    };
  }

  // Get merchant performance metrics
  async getMerchantMetrics(merchantId: string): Promise<{
    merchant: Merchant;
    disputeRate: number;
    averageResolutionTime: number;
    customerWinRate: number;
    totalDisputedAmount: number;
    riskScore: number;
    trendDirection: 'improving' | 'declining' | 'stable';
  }> {
    const merchant = await this.db.getMerchant(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const disputeRate = await this.calculateMerchantDisputeRate(merchantId);
    const averageResolutionTime = await this.calculateMerchantAverageResolutionTime(merchantId);
    const customerWinRate = await this.calculateMerchantCustomerWinRate(merchantId);
    const totalDisputedAmount = await this.calculateMerchantDisputedAmount(merchantId);
    const riskScore = await this.calculateMerchantRiskScore(merchantId);
    const trendDirection = await this.calculateMerchantTrendDirection(merchantId);

    return {
      merchant,
      disputeRate,
      averageResolutionTime,
      customerWinRate,
      totalDisputedAmount,
      riskScore,
      trendDirection
    };
  }

  // Get customer dispute patterns
  async getCustomerPatterns(customerId: string): Promise<{
    totalDisputes: number;
    winRate: number;
    averageDisputeAmount: number;
    commonReasons: Array<{ reason: string; count: number }>;
    timeBetweenDisputes: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const customer = await this.db.getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const disputes = await this.db.getCustomerDisputes(customerId, 100);
    const totalDisputes = disputes.length;
    
    const wonDisputes = disputes.filter(d => 
      d.resolution?.outcome?.includes('CUSTOMER_WINS')
    );
    const winRate = totalDisputes > 0 ? wonDisputes.length / totalDisputes : 0;

    const disputeAmounts = await Promise.all(
      disputes.map(async d => {
        const transaction = await this.db.getTransaction(d.transactionId);
        return transaction?.amount || 0;
      })
    );
    const averageDisputeAmount = disputeAmounts.reduce((sum, amount) => sum + amount, 0) / disputeAmounts.length;

    const reasonCounts = disputes.reduce((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const commonReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sortedDisputes = disputes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let timeBetweenDisputes = 0;
    if (sortedDisputes.length > 1) {
      const intervals = [];
      for (let i = 1; i < sortedDisputes.length; i++) {
        intervals.push(sortedDisputes[i].createdAt.getTime() - sortedDisputes[i-1].createdAt.getTime());
      }
      timeBetweenDisputes = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / (1000 * 60 * 60 * 24); // days
    }

    const riskLevel = this.calculateCustomerRiskLevel(totalDisputes, winRate, timeBetweenDisputes);

    return {
      totalDisputes,
      winRate,
      averageDisputeAmount,
      commonReasons,
      timeBetweenDisputes,
      riskLevel
    };
  }

  // Generate fraud detection report
  async generateFraudReport(timeRange: string = 'LAST_30_DAYS'): Promise<{
    totalFlaggedDisputes: number;
    confirmedFraud: number;
    preventedLoss: number;
    topFraudPatterns: Array<{ pattern: string; count: number; lossPrevented: number }>;
    recommendations: string[];
  }> {
    // In a real implementation, this would query fraud detection data
    // For now, return mock data
    return {
      totalFlaggedDisputes: 45,
      confirmedFraud: 12,
      preventedLoss: 15678.50,
      topFraudPatterns: [
        { pattern: 'Friendly fraud', count: 23, lossPrevented: 8450.00 },
        { pattern: 'Account takeover', count: 8, lossPrevented: 3200.00 },
        { pattern: 'Synthetic identity', count: 6, lossPrevented: 1800.00 },
        { pattern: 'Circular transactions', count: 5, lossPrevented: 1500.00 },
        { pattern: 'Coordinated attacks', count: 3, lossPrevented: 728.50 }
      ],
      recommendations: [
        'Implement enhanced verification for high-risk merchants',
        'Add behavioral analysis for customer dispute patterns',
        'Strengthen identity verification for new accounts',
        'Implement real-time fraud scoring for transactions'
      ]
    };
  }

  // Helper methods
  private async calculateResolutionRate(timeRange: string): Promise<number> {
    // In a real implementation, this would calculate actual resolution rate
    return 0.85; // 85% resolution rate
  }

  private async calculateAverageResolutionTime(timeRange: string): Promise<number> {
    // In a real implementation, this would calculate actual average time
    return 5.2; // 5.2 days average
  }

  private async getTopDisputeReasons(timeRange: string): Promise<Array<{
    reason: string;
    count: number;
    percentage: number;
  }>> {
    // Mock data - in real implementation, this would query the database
    return [
      { reason: 'Item not received', count: 145, percentage: 32.5 },
      { reason: 'Item damaged/defective', count: 98, percentage: 22.0 },
      { reason: 'Wrong item received', count: 76, percentage: 17.0 },
      { reason: 'Merchant overcharged', count: 65, percentage: 14.6 },
      { reason: 'Unauthorized transaction', count: 45, percentage: 10.1 },
      { reason: 'Other issue', count: 17, percentage: 3.8 }
    ];
  }

  private async identifyHighRiskMerchants(timeRange: string): Promise<Merchant[]> {
    // In a real implementation, this would identify actual high-risk merchants
    // For now, return empty array
    return [];
  }

  private async calculateCustomerSatisfaction(timeRange: string): Promise<number> {
    // In a real implementation, this would calculate based on surveys/resolutions
    return 4.2; // 4.2/5.0 satisfaction score
  }

  private async calculateFinancialImpact(timeRange: string): Promise<{
    totalAmountDisputed: number;
    totalRefundsIssued: number;
    fraudPreventionSavings: number;
  }> {
    // Mock financial data
    return {
      totalAmountDisputed: 125450.75,
      totalRefundsIssued: 89760.25,
      fraudPreventionSavings: 15678.50
    };
  }

  private calculateDaysToResolve(dispute: Dispute): number {
    if (!dispute.resolvedAt) return 0;
    return Math.ceil((dispute.resolvedAt.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private anonymizeCustomer(customer: any): any {
    return {
      id: customer.id,
      username: customer.username.substring(0, 3) + '***',
      email: customer.email.substring(0, 3) + '***@***.com',
      totalDisputes: customer.totalDisputes,
      disputeWinRate: customer.disputeWinRate
    };
  }

  private async summarizeEvidence(evidenceUrls: string[]): Promise<{
    totalFiles: number;
    fileTypes: { [key: string]: number };
    totalSize: number;
  }> {
    const fileTypes: { [key: string]: number } = {};
    let totalSize = 0;

    evidenceUrls.forEach(url => {
      const extension = url.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      totalSize += Math.random() * 1000000; // Mock file size
    });

    return {
      totalFiles: evidenceUrls.length,
      fileTypes,
      totalSize
    };
  }

  private async generateAuditTrail(dispute: Dispute): Promise<Array<{
    action: string;
    timestamp: Date;
    actor: string;
    details: string;
  }>> {
    return dispute.timeline.map(event => ({
      action: event.event,
      timestamp: event.timestamp,
      actor: event.actor,
      details: event.details || ''
    }));
  }

  private async countDisputesByStatus(statuses: DisputeStatus[]): Promise<number> {
    // In a real implementation, this would query the database
    return Math.floor(Math.random() * 100); // Mock count
  }

  private async countDisputesResolvedToday(): Promise<number> {
    // In a real implementation, this would count disputes resolved today
    return Math.floor(Math.random() * 20); // Mock count
  }

  private async calculateAverageMerchantResponseTime(): Promise<number> {
    // In a real implementation, this would calculate actual response time
    return 18.5; // 18.5 hours average
  }

  private async calculateMerchantDisputeRate(merchantId: string): Promise<number> {
    // In a real implementation, this would calculate actual dispute rate
    return Math.random() * 0.1; // 0-10% dispute rate
  }

  private async calculateMerchantAverageResolutionTime(merchantId: string): Promise<number> {
    // In a real implementation, this would calculate actual average time
    return Math.random() * 10 + 2; // 2-12 days
  }

  private async calculateMerchantCustomerWinRate(merchantId: string): Promise<number> {
    // In a real implementation, this would calculate actual win rate
    return Math.random() * 0.5 + 0.25; // 25-75% win rate
  }

  private async calculateMerchantDisputedAmount(merchantId: string): Promise<number> {
    // In a real implementation, this would calculate actual amount
    return Math.random() * 50000; // Up to $50,000
  }

  private async calculateMerchantRiskScore(merchantId: string): Promise<number> {
    // In a real implementation, this would calculate actual risk score
    return Math.random(); // 0-1 risk score
  }

  private async calculateMerchantTrendDirection(merchantId: string): Promise<'improving' | 'declining' | 'stable'> {
    // In a real implementation, this would analyze trends
    const rand = Math.random();
    if (rand < 0.33) return 'improving';
    if (rand < 0.67) return 'declining';
    return 'stable';
  }

  private calculateCustomerRiskLevel(totalDisputes: number, winRate: number, timeBetweenDisputes: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (totalDisputes > 10 && winRate > 0.8 && timeBetweenDisputes < 30) {
      return 'HIGH';
    } else if (totalDisputes > 5 || winRate > 0.7) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  // Export analytics data
  async exportAnalyticsData(format: 'csv' | 'json' | 'excel', timeRange: string): Promise<Buffer> {
    const metrics = await this.getDisputeMetrics(timeRange);
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(metrics, null, 2));
      
      case 'csv':
        const csvData = this.convertToCSV(metrics);
        return Buffer.from(csvData);
      
      case 'excel':
        // In a real implementation, this would use a library like xlsx
        return Buffer.from('Excel export not implemented');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(metrics: DisputeMetrics): string {
    const headers = ['Metric', 'Value', 'Details'];
    const rows = [
      ['Total Disputes', metrics.totalDisputes.toString(), ''],
      ['Resolution Rate', `${(metrics.resolutionRate * 100).toFixed(1)}%`, ''],
      ['Average Resolution Time', `${metrics.averageResolutionTime.toFixed(1)} days`, ''],
      ['Customer Satisfaction', `${metrics.customerSatisfaction.toFixed(1)}/5.0`, ''],
      ['Total Amount Disputed', `$${metrics.financialImpact.totalAmountDisputed.toFixed(2)}`, ''],
      ['Total Refunds Issued', `$${metrics.financialImpact.totalRefundsIssued.toFixed(2)}`, ''],
      ['Fraud Prevention Savings', `$${metrics.financialImpact.fraudPreventionSavings.toFixed(2)}`, '']
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Get dashboard configuration
  getDashboardConfig(): {
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      size: string;
      refreshInterval: number;
    }>;
    filters: Array<{
      id: string;
      type: string;
      label: string;
      options: string[];
    }>;
  } {
    return {
      widgets: [
        {
          id: 'dispute-overview',
          type: 'metric-cards',
          title: 'Dispute Overview',
          size: 'large',
          refreshInterval: 30000 // 30 seconds
        },
        {
          id: 'dispute-trends',
          type: 'line-chart',
          title: 'Dispute Trends',
          size: 'medium',
          refreshInterval: 60000 // 1 minute
        },
        {
          id: 'top-reasons',
          type: 'pie-chart',
          title: 'Top Dispute Reasons',
          size: 'medium',
          refreshInterval: 300000 // 5 minutes
        },
        {
          id: 'merchant-performance',
          type: 'table',
          title: 'Merchant Performance',
          size: 'large',
          refreshInterval: 120000 // 2 minutes
        },
        {
          id: 'fraud-alerts',
          type: 'alert-list',
          title: 'Fraud Alerts',
          size: 'medium',
          refreshInterval: 15000 // 15 seconds
        }
      ],
      filters: [
        {
          id: 'timeRange',
          type: 'select',
          label: 'Time Range',
          options: ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last Year']
        },
        {
          id: 'status',
          type: 'multiselect',
          label: 'Dispute Status',
          options: ['Submitted', 'Under Review', 'Escalated', 'Resolved']
        },
        {
          id: 'merchant',
          type: 'search',
          label: 'Merchant',
          options: []
        }
      ]
    };
  }
}
