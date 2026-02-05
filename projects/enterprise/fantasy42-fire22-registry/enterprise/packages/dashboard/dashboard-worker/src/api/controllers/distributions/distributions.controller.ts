/**
 * Distributions Controller
 *
 * Handles revenue distribution, commission payments, and distribution analytics
 */

import type { ValidatedRequest } from '../../middleware/validate.middleware';

/**
 * Get distribution overview and summary
 */
export async function getDistributionsOverview(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'current_month'; // current_month, last_month, current_year, last_year
    const includeDetails = url.searchParams.get('includeDetails') === 'true';

    // Mock distribution data
    const mockDistributions = {
      overview: {
        totalRevenue: 125000.0,
        totalDistributed: 87500.0,
        pendingDistribution: 25000.0,
        distributionRate: 70.0,
        period: period,
        lastUpdated: '2025-01-26T10:00:00Z',
      },
      breakdown: {
        affiliateCommissions: 25000.0,
        agentCommissions: 18750.0,
        partnerShares: 15000.0,
        referralBonuses: 8750.0,
        performanceBonuses: 12500.0,
        platformFees: 12500.0,
        operationalCosts: 12500.0,
      },
      recipients: [
        {
          id: 'AFF_001',
          name: 'Premium Affiliates LLC',
          type: 'affiliate',
          totalEarned: 18750.0,
          pendingPayment: 6250.0,
          lastPayment: '2025-01-20T15:30:00Z',
          paymentMethod: 'wire_transfer',
          status: 'active',
        },
        {
          id: 'AGT_002',
          name: 'Sarah Johnson',
          type: 'agent',
          totalEarned: 12500.0,
          pendingPayment: 4200.0,
          lastPayment: '2025-01-22T09:15:00Z',
          paymentMethod: 'paypal',
          status: 'active',
        },
        {
          id: 'PRT_003',
          name: 'SportsBook Partners Inc',
          type: 'partner',
          totalEarned: 15000.0,
          pendingPayment: 0.0,
          lastPayment: '2025-01-25T11:45:00Z',
          paymentMethod: 'bank_transfer',
          status: 'active',
        },
      ],
      recentTransactions: [
        {
          id: 'DIST_001',
          recipientId: 'AFF_001',
          recipientName: 'Premium Affiliates LLC',
          amount: 6250.0,
          type: 'commission',
          period: '2025-01',
          paymentMethod: 'wire_transfer',
          status: 'completed',
          processedAt: '2025-01-20T15:30:00Z',
          reference: 'AFF_COM_202501',
        },
        {
          id: 'DIST_002',
          recipientId: 'AGT_002',
          recipientName: 'Sarah Johnson',
          amount: 4200.0,
          type: 'commission',
          period: '2025-01',
          paymentMethod: 'paypal',
          status: 'pending',
          scheduledFor: '2025-01-30T10:00:00Z',
          reference: 'AGT_COM_202501',
        },
      ],
    };

    const response = {
      success: true,
      data: {
        ...mockDistributions.overview,
        ...(includeDetails
          ? {
              breakdown: mockDistributions.breakdown,
              recipients: mockDistributions.recipients,
              recentTransactions: mockDistributions.recentTransactions,
            }
          : {}),
      },
      metadata: {
        period,
        generatedAt: new Date().toISOString(),
        dataSource: 'Distribution Management System',
        version: '1.0',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get distributions overview',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get distribution history with filtering
 */
export async function getDistributionHistory(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const recipientId = url.searchParams.get('recipientId');
    const type = url.searchParams.get('type') || 'all'; // all, commission, bonus, partner, affiliate, agent
    const status = url.searchParams.get('status') || 'all'; // all, pending, completed, failed, cancelled
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Mock distribution history data
    const mockHistory = [
      {
        id: 'DIST_001',
        recipientId: 'AFF_001',
        recipientName: 'Premium Affiliates LLC',
        recipientType: 'affiliate',
        amount: 6250.0,
        type: 'commission',
        period: '2025-01',
        paymentMethod: 'wire_transfer',
        status: 'completed',
        processedAt: '2025-01-20T15:30:00Z',
        reference: 'AFF_COM_202501',
        notes: 'Monthly affiliate commission payment',
      },
      {
        id: 'DIST_002',
        recipientId: 'AGT_002',
        recipientName: 'Sarah Johnson',
        recipientType: 'agent',
        amount: 4200.0,
        type: 'commission',
        period: '2025-01',
        paymentMethod: 'paypal',
        status: 'pending',
        scheduledFor: '2025-01-30T10:00:00Z',
        reference: 'AGT_COM_202501',
        notes: 'Agent performance bonus',
      },
      {
        id: 'DIST_003',
        recipientId: 'PRT_003',
        recipientName: 'SportsBook Partners Inc',
        recipientType: 'partner',
        amount: 5000.0,
        type: 'revenue_share',
        period: '2025-01',
        paymentMethod: 'bank_transfer',
        status: 'completed',
        processedAt: '2025-01-25T11:45:00Z',
        reference: 'PRT_REV_202501',
        notes: 'Monthly revenue share distribution',
      },
      {
        id: 'DIST_004',
        recipientId: 'REF_004',
        recipientName: 'Mike Chen',
        recipientType: 'referral',
        amount: 250.0,
        type: 'bonus',
        period: '2025-01',
        paymentMethod: 'paypal',
        status: 'completed',
        processedAt: '2025-01-15T14:20:00Z',
        reference: 'REF_BON_202501',
        notes: 'Referral bonus for new customer acquisition',
      },
      {
        id: 'DIST_005',
        recipientId: 'AGT_002',
        recipientName: 'Sarah Johnson',
        recipientType: 'agent',
        amount: 1800.0,
        type: 'commission',
        period: '2024-12',
        paymentMethod: 'paypal',
        status: 'completed',
        processedAt: '2025-01-05T16:30:00Z',
        reference: 'AGT_COM_202412',
        notes: 'December agent commission',
      },
    ];

    // Apply filters
    let filteredHistory = mockHistory;

    if (recipientId) {
      filteredHistory = filteredHistory.filter(h => h.recipientId === recipientId);
    }

    if (type !== 'all') {
      filteredHistory = filteredHistory.filter(h => h.type === type);
    }

    if (status !== 'all') {
      filteredHistory = filteredHistory.filter(h => h.status === status);
    }

    if (dateFrom || dateTo) {
      filteredHistory = filteredHistory.filter(h => {
        const processedDate = h.processedAt || h.scheduledFor;
        if (!processedDate) return false;

        const entryDate = new Date(processedDate);
        const fromDate = dateFrom ? new Date(dateFrom) : new Date('2020-01-01');
        const toDate = dateTo ? new Date(dateTo) : new Date();

        return entryDate >= fromDate && entryDate <= toDate;
      });
    }

    // Sort by processed date (newest first)
    filteredHistory.sort((a, b) => {
      const dateA = new Date(a.processedAt || a.scheduledFor || '2020-01-01');
      const dateB = new Date(b.processedAt || b.scheduledFor || '2020-01-01');
      return dateB.getTime() - dateA.getTime();
    });

    // Pagination
    const totalRecords = filteredHistory.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    // Calculate summary statistics
    const summary = {
      totalDistributed: filteredHistory.reduce((sum, h) => sum + h.amount, 0),
      pendingAmount: filteredHistory
        .filter(h => h.status === 'pending')
        .reduce((sum, h) => sum + h.amount, 0),
      completedAmount: filteredHistory
        .filter(h => h.status === 'completed')
        .reduce((sum, h) => sum + h.amount, 0),
      totalRecords,
      byType: {
        commission: filteredHistory
          .filter(h => h.type === 'commission')
          .reduce((sum, h) => sum + h.amount, 0),
        bonus: filteredHistory
          .filter(h => h.type === 'bonus')
          .reduce((sum, h) => sum + h.amount, 0),
        revenue_share: filteredHistory
          .filter(h => h.type === 'revenue_share')
          .reduce((sum, h) => sum + h.amount, 0),
      },
      byStatus: {
        pending: filteredHistory.filter(h => h.status === 'pending').length,
        completed: filteredHistory.filter(h => h.status === 'completed').length,
        failed: filteredHistory.filter(h => h.status === 'failed').length,
      },
    };

    const response = {
      success: true,
      data: {
        distributions: paginatedHistory,
        summary,
        filters: {
          recipientId,
          type,
          status,
          dateFrom,
          dateTo,
          page,
          limit,
        },
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'Distribution Management System',
        version: '1.0',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get distribution history',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Process distribution payment
 */
export async function processDistributionPayment(request: ValidatedRequest): Promise<Response> {
  try {
    const paymentData = request.validatedBody || (await request.json());

    const { recipientId, amount, paymentMethod, reference, notes, processedBy } = paymentData;

    // Validate required fields
    if (!recipientId || !amount || !paymentMethod || !processedBy) {
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Recipient ID, amount, payment method, and processed by are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Mock payment processing
    const mockResponse = {
      distributionId: `DIST_${Date.now()}`,
      recipientId,
      amount: parseFloat(amount),
      paymentMethod,
      reference: reference || `DIST_${Date.now()}`,
      status: 'completed',
      processedAt: new Date().toISOString(),
      processedBy,
      transactionId: `TXN_${Date.now()}`,
      notes: notes || '',
    };

    const response = {
      success: true,
      data: mockResponse,
      message: `Distribution payment of $${mockResponse.amount.toFixed(2)} processed successfully`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to process distribution payment',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get distribution settings and configuration
 */
export async function getDistributionSettings(request: ValidatedRequest): Promise<Response> {
  try {
    const settings = {
      distributionRules: {
        affiliateCommission: 20.0, // 20% of revenue
        agentCommission: 15.0, // 15% of revenue
        partnerShare: 12.0, // 12% of revenue
        referralBonus: 7.0, // 7% of revenue
        performanceBonus: 10.0, // 10% of revenue
        platformFee: 10.0, // 10% of revenue
        operationalReserve: 10.0, // 10% operational reserve
      },
      paymentSchedule: {
        affiliatePayments: 'monthly', // monthly, weekly, biweekly
        agentPayments: 'monthly',
        partnerPayments: 'monthly',
        minimumPayout: 50.0,
        maximumDelay: 30, // days
      },
      paymentMethods: {
        wire_transfer: { enabled: true, fee: 25.0, processingDays: 1 },
        paypal: { enabled: true, fee: 0.0, processingDays: 1 },
        bank_transfer: { enabled: true, fee: 15.0, processingDays: 2 },
        check: { enabled: false, fee: 5.0, processingDays: 7 },
      },
      automationSettings: {
        autoProcessSmallPayments: true,
        smallPaymentThreshold: 100.0,
        autoSchedulePayments: true,
        paymentReminders: true,
        reminderDays: 7,
      },
      complianceSettings: {
        requireTaxForms: true,
        taxFormTypes: ['W9', 'W8BEN'],
        requireIdVerification: true,
        minimumAge: 18,
        restrictedCountries: [],
      },
    };

    const response = {
      success: true,
      data: settings,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get distribution settings',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get distribution analytics and reports
 */
export async function getDistributionAnalytics(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'last_12_months';
    const groupBy = url.searchParams.get('groupBy') || 'month'; // month, quarter, year

    // Mock analytics data
    const mockAnalytics = {
      period,
      totalRevenue: 1500000.0,
      totalDistributed: 1050000.0,
      distributionEfficiency: 70.0,
      averageDistributionTime: 15, // days
      topPerformers: [
        {
          recipientId: 'AFF_001',
          recipientName: 'Premium Affiliates LLC',
          totalEarned: 187500.0,
          distributionCount: 12,
          averageAmount: 15625.0,
          paymentReliability: 100.0,
        },
        {
          recipientId: 'PRT_003',
          recipientName: 'SportsBook Partners Inc',
          totalEarned: 180000.0,
          distributionCount: 12,
          averageAmount: 15000.0,
          paymentReliability: 95.8,
        },
      ],
      distributionTrends: [
        { period: '2024-01', amount: 75000.0, recipients: 25 },
        { period: '2024-02', amount: 82000.0, recipients: 28 },
        { period: '2024-03', amount: 91000.0, recipients: 32 },
        { period: '2024-04', amount: 98000.0, recipients: 35 },
        { period: '2024-05', amount: 105000.0, recipients: 38 },
        { period: '2024-06', amount: 112000.0, recipients: 40 },
      ],
      paymentMethodUsage: {
        wire_transfer: { count: 45, totalAmount: 562500.0, percentage: 53.6 },
        paypal: { count: 32, totalAmount: 375000.0, percentage: 35.7 },
        bank_transfer: { count: 18, totalAmount: 112500.0, percentage: 10.7 },
      },
      geographicDistribution: {
        'United States': { recipients: 45, totalAmount: 675000.0 },
        Canada: { recipients: 15, totalAmount: 225000.0 },
        'United Kingdom': { recipients: 12, totalAmount: 180000.0 },
        Australia: { recipients: 8, totalAmount: 120000.0 },
      },
    };

    const response = {
      success: true,
      data: mockAnalytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'Distribution Analytics System',
        version: '1.0',
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get distribution analytics',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
