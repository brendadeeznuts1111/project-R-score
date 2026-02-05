/**
 * Balance Controller
 * Handles customer balance operations, updates, and settings
 */

import type {
  ControllerRequest,
  CustomerBalance,
  BalanceUpdate,
  BalanceSettings,
  ApiResponse,
  PaginationParams,
  FilterParams,
} from '../../../../core/types/controllers';

/**
 * Get customer balances with filtering and pagination
 */
export async function getCustomerBalances(
  request: ControllerRequest,
  params: PaginationParams & FilterParams
): Promise<Response> {
  try {
    const { page = 1, limit = 20, customerId, status } = params;

    // Mock customer balance data
    const mockBalances: CustomerBalance[] = [
      {
        id: 'bal_001',
        customerId: 'CUST_001',
        currentBalance: 1250.75,
        availableBalance: 1200.75,
        pendingWagers: 50.0,
        creditLimit: 5000.0,
        lastUpdated: new Date('2025-01-25T10:30:00Z'),
        currency: 'USD',
        status: 'active',
        accountType: 'vip',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-25T10:30:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
      {
        id: 'bal_002',
        customerId: 'CUST_002',
        currentBalance: 350.25,
        availableBalance: 350.25,
        pendingWagers: 0,
        creditLimit: 2000.0,
        lastUpdated: new Date('2025-01-25T09:15:00Z'),
        currency: 'USD',
        status: 'active',
        accountType: 'regular',
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-25T09:15:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
      {
        id: 'bal_003',
        customerId: 'CUST_003',
        currentBalance: -50.0,
        availableBalance: -50.0,
        pendingWagers: 0,
        creditLimit: 1000.0,
        lastUpdated: new Date('2025-01-25T11:45:00Z'),
        currency: 'USD',
        status: 'active',
        accountType: 'regular',
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-25T11:45:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
    ];

    // Apply filters
    let filteredBalances = mockBalances;

    if (customerId) {
      filteredBalances = filteredBalances.filter(b => b.customerId === customerId);
    }

    if (status) {
      filteredBalances = filteredBalances.filter(b => b.status === status);
    }

    // Sort by balance (highest first)
    filteredBalances.sort((a, b) => b.currentBalance - a.currentBalance);

    // Apply pagination
    const total = filteredBalances.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedBalances = filteredBalances.slice(startIndex, startIndex + limit);

    const response: ApiResponse<{
      balances: CustomerBalance[];
      summary: {
        totalCustomers: number;
        totalBalance: number;
        averageBalance: number;
        negativeBalances: number;
      };
    }> = {
      status: 'success',
      message: 'Customer balances retrieved successfully',
      data: {
        balances: paginatedBalances,
        summary: calculateBalanceSummary(filteredBalances),
      },
      metadata: {
        timestamp: new Date(),
        requestId: `customer_balances_${Date.now()}`,
        processingTime: 0,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to retrieve customer balances',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `customer_balances_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get balance summary for all customers
 */
export async function getAllBalancesSummary(request: ControllerRequest): Promise<Response> {
  try {
    // Mock comprehensive balance summary
    const mockSummary = {
      totalCustomers: 1250,
      activeCustomers: 1185,
      totalBalance: 2456789.5,
      availableBalance: 2389456.75,
      pendingWagers: 67332.75,
      averageBalance: 1965.43,
      medianBalance: 875.25,
      balanceDistribution: {
        '0-100': 245,
        '100-500': 380,
        '500-1000': 295,
        '1000-5000': 285,
        '5000+': 45,
      },
      negativeBalances: 23,
      creditUtilization: 67.8,
      topBalances: [
        { customerId: 'CUST_001', balance: 50000.0, name: 'John Doe' },
        { customerId: 'CUST_002', balance: 45000.0, name: 'Jane Smith' },
        { customerId: 'CUST_003', balance: 42000.0, name: 'Bob Wilson' },
      ],
      recentActivity: {
        deposits24h: 45670.5,
        withdrawals24h: 38950.25,
        adjustments24h: 1250.75,
        netChange24h: 6970.0,
      },
    };

    const response: ApiResponse<typeof mockSummary> = {
      status: 'success',
      message: 'Balance summary retrieved successfully',
      data: mockSummary,
      metadata: {
        timestamp: new Date(),
        requestId: `balance_summary_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to retrieve balance summary',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `balance_summary_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update customer balance
 */
export async function updateCustomerBalance(
  request: ControllerRequest,
  customerId: string,
  updateData: {
    amount: number;
    changeType: 'deposit' | 'withdrawal' | 'adjustment' | 'wager' | 'settlement';
    reason: string;
    notes?: string;
  }
): Promise<Response> {
  try {
    // Validate input
    if (!customerId || updateData.amount === 0) {
      const errorResponse: ApiResponse = {
        status: 'error',
        message: 'Invalid balance update data',
        errors: ['Customer ID and non-zero amount are required'],
        metadata: {
          timestamp: new Date(),
          requestId: `update_balance_error_${Date.now()}`,
          processingTime: 0,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mock current balance
    const currentBalance = 1000.0;
    const newBalance = currentBalance + updateData.amount;

    // Create balance update record
    const balanceUpdate: BalanceUpdate = {
      id: `bal_update_${Date.now()}`,
      customerId,
      previousBalance: currentBalance,
      newBalance,
      changeAmount: updateData.amount,
      changeType: updateData.changeType,
      reference: `REF_${Date.now()}`,
      performedBy: 'Current User', // Would get from request context
      notes: updateData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const response: ApiResponse<BalanceUpdate> = {
      status: 'success',
      message: 'Customer balance updated successfully',
      data: balanceUpdate,
      metadata: {
        timestamp: new Date(),
        requestId: `update_balance_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to update customer balance',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `update_balance_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get balance settings and thresholds
 */
export async function getBalanceSettings(request: ControllerRequest): Promise<Response> {
  try {
    const mockSettings: BalanceSettings = {
      minBalance: -1000.0,
      maxBalance: 100000.0,
      warningThreshold: 100.0,
      criticalThreshold: 25.0,
      requireApprovalThreshold: 5000.0,
      autoSettlementEnabled: true,
      settlementDelayHours: 24,
    };

    const response: ApiResponse<BalanceSettings> = {
      status: 'success',
      message: 'Balance settings retrieved successfully',
      data: mockSettings,
      metadata: {
        timestamp: new Date(),
        requestId: `balance_settings_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to retrieve balance settings',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `balance_settings_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update balance settings
 */
export async function updateBalanceSettings(
  request: ControllerRequest,
  settings: Partial<BalanceSettings>
): Promise<Response> {
  try {
    // Validate settings
    if (settings.minBalance !== undefined && settings.maxBalance !== undefined) {
      if (settings.minBalance >= settings.maxBalance) {
        const errorResponse: ApiResponse = {
          status: 'error',
          message: 'Invalid balance settings',
          errors: ['Minimum balance must be less than maximum balance'],
          metadata: {
            timestamp: new Date(),
            requestId: `update_balance_settings_error_${Date.now()}`,
            processingTime: 0,
          },
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const updatedSettings: BalanceSettings = {
      minBalance: -1000.0,
      maxBalance: 100000.0,
      warningThreshold: 100.0,
      criticalThreshold: 25.0,
      requireApprovalThreshold: 5000.0,
      autoSettlementEnabled: true,
      settlementDelayHours: 24,
      ...settings,
    };

    const response: ApiResponse<BalanceSettings> = {
      status: 'success',
      message: 'Balance settings updated successfully',
      data: updatedSettings,
      metadata: {
        timestamp: new Date(),
        requestId: `update_balance_settings_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to update balance settings',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `update_balance_settings_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get balance change history for a customer
 */
export async function getBalanceHistory(
  request: ControllerRequest,
  customerId: string,
  params: PaginationParams & DateRangeParams
): Promise<Response> {
  try {
    const { page = 1, limit = 10, dateFrom, dateTo } = params;

    // Mock balance change history
    const mockHistory: BalanceUpdate[] = [
      {
        id: 'hist_001',
        customerId,
        previousBalance: 1000.0,
        newBalance: 1050.0,
        changeAmount: 50.0,
        changeType: 'deposit',
        reference: 'DEP_001',
        performedBy: 'Agent Smith',
        notes: 'Cash deposit',
        createdAt: new Date('2025-01-25T10:00:00Z'),
        updatedAt: new Date('2025-01-25T10:00:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
      {
        id: 'hist_002',
        customerId,
        previousBalance: 1050.0,
        newBalance: 1000.0,
        changeAmount: -50.0,
        changeType: 'wager',
        reference: 'WAGER_001',
        performedBy: 'System',
        notes: 'NFL moneyline bet',
        createdAt: new Date('2025-01-25T11:00:00Z'),
        updatedAt: new Date('2025-01-25T11:00:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
    ];

    // Apply date filters
    let filteredHistory = mockHistory;

    if (dateFrom) {
      filteredHistory = filteredHistory.filter(h => h.createdAt >= dateFrom);
    }

    if (dateTo) {
      filteredHistory = filteredHistory.filter(h => h.createdAt <= dateTo);
    }

    // Sort by date (newest first)
    filteredHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const total = filteredHistory.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + limit);

    const response: ApiResponse<{
      history: BalanceUpdate[];
      currentBalance: number;
    }> = {
      status: 'success',
      message: 'Balance history retrieved successfully',
      data: {
        history: paginatedHistory,
        currentBalance: 1000.0, // Would get from actual balance
      },
      metadata: {
        timestamp: new Date(),
        requestId: `balance_history_${Date.now()}`,
        processingTime: 0,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to retrieve balance history',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `balance_history_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper functions

function calculateBalanceSummary(balances: CustomerBalance[]) {
  const totalBalance = balances.reduce((sum, b) => sum + b.currentBalance, 0);
  const negativeBalances = balances.filter(b => b.currentBalance < 0).length;

  return {
    totalCustomers: balances.length,
    totalBalance,
    averageBalance: balances.length > 0 ? totalBalance / balances.length : 0,
    negativeBalances,
  };
}
