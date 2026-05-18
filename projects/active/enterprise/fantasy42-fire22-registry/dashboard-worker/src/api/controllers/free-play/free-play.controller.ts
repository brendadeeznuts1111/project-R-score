/**
 * Free Play Controller
 *
 * Handles bonus transactions, free play management, and promotion tracking
 */

import type { ValidatedRequest } from '../../middleware/validate.middleware';

/**
 * Get free play transactions overview and summary
 */
export async function getFreePlayOverview(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'current_month'; // current_month, last_month, current_year, last_year
    const includeDetails = url.searchParams.get('includeDetails') === 'true';

    // Mock free play data
    const mockFreePlay = {
      overview: {
        totalFreePlayIssued: 150000.0,
        totalFreePlayRedeemed: 87500.0,
        totalFreePlayExpired: 12500.0,
        remainingFreePlay: 50000.0,
        redemptionRate: 58.3,
        averageBonusPerCustomer: 125.0,
        period: period,
        lastUpdated: '2025-01-26T10:00:00Z',
      },
      breakdown: {
        welcomeBonuses: 45000.0,
        depositMatchBonuses: 37500.0,
        freeBets: 25000.0,
        loyaltyRewards: 18750.0,
        referralBonuses: 12500.0,
        tournamentPrizes: 6250.0,
        specialPromotions: 5000.0,
      },
      customers: [
        {
          customerId: 'CUST_001',
          customerName: 'John Doe',
          totalFreePlay: 2500.0,
          redeemedFreePlay: 1800.0,
          availableFreePlay: 700.0,
          expiredFreePlay: 0.0,
          lastActivity: '2025-01-26T14:30:00Z',
          vipLevel: 'Gold',
        },
        {
          customerId: 'CUST_002',
          customerName: 'Jane Smith',
          totalFreePlay: 1250.0,
          redeemedFreePlay: 950.0,
          availableFreePlay: 300.0,
          expiredFreePlay: 0.0,
          lastActivity: '2025-01-25T16:45:00Z',
          vipLevel: 'Silver',
        },
        {
          customerId: 'CUST_003',
          customerName: 'Bob Wilson',
          totalFreePlay: 750.0,
          redeemedFreePlay: 250.0,
          availableFreePlay: 500.0,
          expiredFreePlay: 0.0,
          lastActivity: '2025-01-24T12:20:00Z',
          vipLevel: 'Bronze',
        },
      ],
      recentTransactions: [
        {
          id: 'FP_001',
          customerId: 'CUST_001',
          customerName: 'John Doe',
          type: 'free_bet',
          amount: 100.0,
          status: 'redeemed',
          redeemedAt: '2025-01-26T14:30:00Z',
          expiresAt: '2025-02-26T14:30:00Z',
          reference: 'WELCOME_BONUS_2025',
        },
        {
          id: 'FP_002',
          customerId: 'CUST_002',
          customerName: 'Jane Smith',
          type: 'deposit_match',
          amount: 50.0,
          status: 'available',
          issuedAt: '2025-01-25T16:45:00Z',
          expiresAt: '2025-02-25T16:45:00Z',
          reference: 'DEPOSIT_MATCH_50PCT',
        },
      ],
    };

    const response = {
      success: true,
      data: {
        ...mockFreePlay.overview,
        ...(includeDetails
          ? {
              breakdown: mockFreePlay.breakdown,
              customers: mockFreePlay.customers,
              recentTransactions: mockFreePlay.recentTransactions,
            }
          : {}),
      },
      metadata: {
        period,
        generatedAt: new Date().toISOString(),
        dataSource: 'Free Play Management System',
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
        error: 'Failed to get free play overview',
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
 * Get free play transactions history with filtering
 */
export async function getFreePlayHistory(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const type = url.searchParams.get('type') || 'all'; // all, welcome_bonus, deposit_match, free_bet, loyalty, referral, tournament, promotion
    const status = url.searchParams.get('status') || 'all'; // all, available, redeemed, expired, cancelled
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Mock free play history data
    const mockHistory = [
      {
        id: 'FP_001',
        customerId: 'CUST_001',
        customerName: 'John Doe',
        type: 'welcome_bonus',
        amount: 500.0,
        status: 'redeemed',
        issuedAt: '2025-01-20T10:00:00Z',
        redeemedAt: '2025-01-26T14:30:00Z',
        expiresAt: '2025-02-20T10:00:00Z',
        reference: 'WELCOME_BONUS_2025',
        wageringRequirement: 10,
        wageringCompleted: 10,
        notes: 'Welcome bonus for new customer',
      },
      {
        id: 'FP_002',
        customerId: 'CUST_002',
        customerName: 'Jane Smith',
        type: 'deposit_match',
        amount: 250.0,
        status: 'available',
        issuedAt: '2025-01-25T16:45:00Z',
        expiresAt: '2025-02-25T16:45:00Z',
        reference: 'DEPOSIT_MATCH_50PCT',
        wageringRequirement: 15,
        wageringCompleted: 8.5,
        notes: '50% deposit match bonus',
      },
      {
        id: 'FP_003',
        customerId: 'CUST_003',
        customerName: 'Bob Wilson',
        type: 'free_bet',
        amount: 100.0,
        status: 'expired',
        issuedAt: '2024-12-26T12:20:00Z',
        expiresAt: '2025-01-26T12:20:00Z',
        reference: 'FREE_BET_WEEKLY',
        wageringRequirement: 1,
        wageringCompleted: 0,
        notes: 'Weekly free bet promotion',
      },
      {
        id: 'FP_004',
        customerId: 'CUST_001',
        customerName: 'John Doe',
        type: 'loyalty',
        amount: 50.0,
        status: 'redeemed',
        issuedAt: '2025-01-15T09:30:00Z',
        redeemedAt: '2025-01-22T11:15:00Z',
        expiresAt: '2025-02-15T09:30:00Z',
        reference: 'LOYALTY_REWARD_Q1',
        wageringRequirement: 5,
        wageringCompleted: 5,
        notes: 'Loyalty reward for continued play',
      },
      {
        id: 'FP_005',
        customerId: 'CUST_004',
        customerName: 'Alice Brown',
        type: 'referral',
        amount: 75.0,
        status: 'available',
        issuedAt: '2025-01-20T14:45:00Z',
        expiresAt: '2025-02-20T14:45:00Z',
        reference: 'REFERRAL_BONUS_NEW',
        wageringRequirement: 8,
        wageringCompleted: 3.2,
        notes: 'Referral bonus for bringing new customer',
      },
    ];

    // Apply filters
    let filteredHistory = mockHistory;

    if (customerId) {
      filteredHistory = filteredHistory.filter(h => h.customerId === customerId);
    }

    if (type !== 'all') {
      filteredHistory = filteredHistory.filter(h => h.type === type);
    }

    if (status !== 'all') {
      filteredHistory = filteredHistory.filter(h => h.status === status);
    }

    if (dateFrom || dateTo) {
      filteredHistory = filteredHistory.filter(h => {
        const issuedDate = new Date(h.issuedAt);
        const fromDate = dateFrom ? new Date(dateFrom) : new Date('2020-01-01');
        const toDate = dateTo ? new Date(dateTo) : new Date();

        return issuedDate >= fromDate && issuedDate <= toDate;
      });
    }

    // Sort by issued date (newest first)
    filteredHistory.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    // Pagination
    const totalRecords = filteredHistory.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    // Calculate summary statistics
    const summary = {
      totalFreePlay: filteredHistory.reduce((sum, h) => sum + h.amount, 0),
      redeemedAmount: filteredHistory
        .filter(h => h.status === 'redeemed')
        .reduce((sum, h) => sum + h.amount, 0),
      availableAmount: filteredHistory
        .filter(h => h.status === 'available')
        .reduce((sum, h) => sum + h.amount, 0),
      expiredAmount: filteredHistory
        .filter(h => h.status === 'expired')
        .reduce((sum, h) => sum + h.amount, 0),
      totalRecords,
      byType: {
        welcome_bonus: filteredHistory
          .filter(h => h.type === 'welcome_bonus')
          .reduce((sum, h) => sum + h.amount, 0),
        deposit_match: filteredHistory
          .filter(h => h.type === 'deposit_match')
          .reduce((sum, h) => sum + h.amount, 0),
        free_bet: filteredHistory
          .filter(h => h.type === 'free_bet')
          .reduce((sum, h) => sum + h.amount, 0),
        loyalty: filteredHistory
          .filter(h => h.type === 'loyalty')
          .reduce((sum, h) => sum + h.amount, 0),
      },
      byStatus: {
        available: filteredHistory.filter(h => h.status === 'available').length,
        redeemed: filteredHistory.filter(h => h.status === 'redeemed').length,
        expired: filteredHistory.filter(h => h.status === 'expired').length,
        cancelled: filteredHistory.filter(h => h.status === 'cancelled').length,
      },
    };

    const response = {
      success: true,
      data: {
        transactions: paginatedHistory,
        summary,
        filters: {
          customerId,
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
        dataSource: 'Free Play Management System',
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
        error: 'Failed to get free play history',
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
 * Create new free play transaction
 */
export async function createFreePlayTransaction(request: ValidatedRequest): Promise<Response> {
  try {
    const transactionData = request.validatedBody || (await request.json());

    const {
      customerId,
      type,
      amount,
      description,
      wageringRequirement,
      expiresInDays,
      reference,
      notes,
      processedBy,
    } = transactionData;

    // Validate required fields
    if (!customerId || !type || !amount || !processedBy) {
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Customer ID, type, amount, and processed by are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Mock transaction creation
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + (expiresInDays || 30));

    const mockResponse = {
      transactionId: `FP_${Date.now()}`,
      customerId,
      type,
      amount: parseFloat(amount),
      description: description || '',
      wageringRequirement: wageringRequirement || 1,
      status: 'available',
      issuedAt: new Date().toISOString(),
      expiresAt: expirationDate.toISOString(),
      reference: reference || `FP_${Date.now()}`,
      processedBy,
      notes: notes || '',
    };

    const response = {
      success: true,
      data: mockResponse,
      message: `Free play transaction of $${mockResponse.amount.toFixed(2)} created successfully for customer ${customerId}`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to create free play transaction',
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
 * Redeem free play transaction
 */
export async function redeemFreePlayTransaction(request: ValidatedRequest): Promise<Response> {
  try {
    const redemptionData = request.validatedBody || (await request.json());

    const { transactionId, customerId, redemptionAmount, wagerAmount, processedBy } =
      redemptionData;

    // Validate required fields
    if (!transactionId || !customerId || !redemptionAmount || !processedBy) {
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Transaction ID, customer ID, redemption amount, and processed by are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Mock redemption processing
    const mockResponse = {
      transactionId,
      customerId,
      originalAmount: 100.0,
      redemptionAmount: parseFloat(redemptionAmount),
      wagerAmount: parseFloat(wagerAmount || 0),
      remainingAmount: 100.0 - parseFloat(redemptionAmount),
      status: parseFloat(redemptionAmount) >= 100.0 ? 'fully_redeemed' : 'partially_redeemed',
      redeemedAt: new Date().toISOString(),
      processedBy,
      reference: `REDEEM_${transactionId}_${Date.now()}`,
    };

    const response = {
      success: true,
      data: mockResponse,
      message: `Free play transaction redeemed successfully. $${mockResponse.redemptionAmount.toFixed(2)} credited to customer account.`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to redeem free play transaction',
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
 * Get free play settings and configuration
 */
export async function getFreePlaySettings(request: ValidatedRequest): Promise<Response> {
  try {
    const settings = {
      bonusTypes: {
        welcome_bonus: { enabled: true, maxAmount: 500.0, defaultWageringReq: 10 },
        deposit_match: { enabled: true, maxPercentage: 50, defaultWageringReq: 15 },
        free_bet: { enabled: true, maxAmount: 100.0, defaultWageringReq: 1 },
        loyalty: { enabled: true, monthlyLimit: 200.0, defaultWageringReq: 5 },
        referral: {
          enabled: true,
          referrerAmount: 75.0,
          refereeAmount: 25.0,
          defaultWageringReq: 8,
        },
        tournament: { enabled: true, prizePoolPercentage: 10, defaultWageringReq: 3 },
        promotion: { enabled: true, customRules: true, defaultWageringReq: 1 },
      },
      expirationSettings: {
        defaultExpirationDays: 30,
        maxExpirationDays: 90,
        autoExpire: true,
        expirationWarningDays: 7,
      },
      wageringRequirements: {
        minRequirement: 1,
        maxRequirement: 50,
        progressiveRequirements: true,
        requirementTypes: ['deposit', 'wager', 'loss'],
      },
      limits: {
        maxBonusPerCustomer: 1000.0,
        maxBonusPerDay: 50000.0,
        maxBonusPerMonth: 200000.0,
        dailyCustomerLimit: 500.0,
      },
      complianceSettings: {
        responsibleGamingChecks: true,
        bonusAbuseDetection: true,
        jurisdictionCompliance: true,
        taxReporting: true,
      },
      automationSettings: {
        autoIssueWelcomeBonuses: true,
        autoIssueDepositMatches: true,
        autoExpireBonuses: true,
        autoSendExpirationWarnings: true,
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
        error: 'Failed to get free play settings',
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
 * Get free play analytics and reports
 */
export async function getFreePlayAnalytics(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'last_30_days';
    const groupBy = url.searchParams.get('groupBy') || 'day'; // day, week, month

    // Mock analytics data
    const mockAnalytics = {
      period,
      totalBonusValue: 250000.0,
      totalRedeemed: 145000.0,
      totalExpired: 25000.0,
      redemptionRate: 58.0,
      averageBonusPerCustomer: 185.5,
      topBonusTypes: [
        {
          type: 'welcome_bonus',
          totalValue: 75000.0,
          redemptionCount: 450,
          redemptionRate: 67.5,
        },
        {
          type: 'deposit_match',
          totalValue: 62500.0,
          redemptionCount: 380,
          redemptionRate: 61.2,
        },
        {
          type: 'free_bet',
          totalValue: 50000.0,
          redemptionCount: 320,
          redemptionRate: 64.0,
        },
      ],
      bonusTrends: [
        { period: '2025-01-20', issued: 12500.0, redeemed: 8200.0 },
        { period: '2025-01-21', issued: 15800.0, redeemed: 9200.0 },
        { period: '2025-01-22', issued: 14200.0, redeemed: 8800.0 },
        { period: '2025-01-23', issued: 16900.0, redeemed: 10100.0 },
        { period: '2025-01-24', issued: 13500.0, redeemed: 7900.0 },
        { period: '2025-01-25', issued: 15200.0, redeemed: 9100.0 },
      ],
      customerSegments: {
        newCustomers: { count: 150, averageBonus: 300.0, redemptionRate: 72.5 },
        regularCustomers: { count: 280, averageBonus: 150.0, redemptionRate: 58.2 },
        vipCustomers: { count: 45, averageBonus: 500.0, redemptionRate: 85.3 },
      },
      performanceMetrics: {
        bonusEffectiveness: 3.2, // Revenue multiplier
        customerRetention: 68.5, // Percentage
        averageSessionLength: 25, // Minutes
        conversionRate: 12.3, // Percentage
      },
    };

    const response = {
      success: true,
      data: mockAnalytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'Free Play Analytics System',
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
        error: 'Failed to get free play analytics',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
