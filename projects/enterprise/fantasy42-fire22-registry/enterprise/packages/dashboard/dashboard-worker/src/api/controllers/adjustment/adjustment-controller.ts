/**
 * Adjustment Controller
 * Handles account adjustments, approvals, and adjustment history
 */

import type {
  ControllerRequest,
  AdjustmentRecord,
  AdjustmentType,
  ApiResponse,
  PaginationParams,
  DateRangeParams,
  FilterParams,
} from '../../../../core/types/controllers';

/**
 * Get adjustment history with filtering and pagination
 */
export async function getAdjustmentHistory(
  request: ControllerRequest,
  params: PaginationParams & DateRangeParams & FilterParams
): Promise<Response> {
  try {
    const { page = 1, limit = 10, status, customerId, dateFrom, dateTo } = params;

    // Mock adjustment data
    const mockAdjustments: AdjustmentRecord[] = [
      {
        id: 'adj_001',
        adjustmentId: 'ADJ_001',
        customerId: 'CUST_001',
        agentId: 'AGENT_001',
        adjustmentType: 'bonus_credit',
        amount: 50.0,
        reason: 'Loyalty bonus',
        description: 'Monthly loyalty bonus for active customer',
        status: 'approved',
        requestedBy: 'Agent Smith',
        approvedBy: 'Supervisor Johnson',
        processedBy: 'System',
        approvedAt: new Date('2025-01-24T10:30:00Z'),
        processedAt: new Date('2025-01-24T10:35:00Z'),
        notes: 'Approved for customer retention',
        createdAt: new Date('2025-01-24T09:00:00Z'),
        updatedAt: new Date('2025-01-24T10:35:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
      {
        id: 'adj_002',
        adjustmentId: 'ADJ_002',
        customerId: 'CUST_002',
        agentId: 'AGENT_002',
        adjustmentType: 'account_correction',
        amount: -25.0,
        reason: 'Processing error correction',
        description: 'Correcting duplicate charge from wager processing',
        status: 'pending',
        requestedBy: 'Agent Johnson',
        notes: 'Awaiting supervisor approval',
        createdAt: new Date('2025-01-25T14:00:00Z'),
        updatedAt: new Date('2025-01-25T14:00:00Z'),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      },
    ];

    // Apply filters
    let filteredAdjustments = mockAdjustments;

    if (status) {
      filteredAdjustments = filteredAdjustments.filter(a => a.status === status);
    }

    if (customerId) {
      filteredAdjustments = filteredAdjustments.filter(a => a.customerId === customerId);
    }

    if (dateFrom) {
      filteredAdjustments = filteredAdjustments.filter(a => a.createdAt >= dateFrom);
    }

    if (dateTo) {
      filteredAdjustments = filteredAdjustments.filter(a => a.createdAt <= dateTo);
    }

    // Sort by creation date (newest first)
    filteredAdjustments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const total = filteredAdjustments.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAdjustments = filteredAdjustments.slice(startIndex, startIndex + limit);

    const response: ApiResponse<{
      adjustments: AdjustmentRecord[];
      pendingCount: number;
      approvedToday: number;
    }> = {
      status: 'success',
      message: 'Adjustment history retrieved successfully',
      data: {
        adjustments: paginatedAdjustments,
        pendingCount: mockAdjustments.filter(a => a.status === 'pending').length,
        approvedToday: mockAdjustments.filter(
          a =>
            a.status === 'approved' &&
            a.approvedAt &&
            a.approvedAt.toDateString() === new Date().toDateString()
        ).length,
      },
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_history_${Date.now()}`,
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
      message: 'Failed to retrieve adjustment history',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_history_error_${Date.now()}`,
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
 * Create a new adjustment
 */
export async function createAdjustment(
  request: ControllerRequest,
  adjustmentData: {
    customerId: string;
    agentId: string;
    adjustmentType: string;
    amount: number;
    reason: string;
    description: string;
    notes?: string;
  }
): Promise<Response> {
  try {
    // Validate adjustment data
    if (
      !adjustmentData.customerId ||
      !adjustmentData.adjustmentType ||
      adjustmentData.amount === 0
    ) {
      const errorResponse: ApiResponse = {
        status: 'error',
        message: 'Invalid adjustment data',
        errors: ['Customer ID, adjustment type, and non-zero amount are required'],
        metadata: {
          timestamp: new Date(),
          requestId: `create_adjustment_error_${Date.now()}`,
          processingTime: 0,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if approval is required based on amount
    const requiresApproval = Math.abs(adjustmentData.amount) >= 100; // $100 threshold
    const initialStatus = requiresApproval ? 'pending' : 'approved';

    const newAdjustment: AdjustmentRecord = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adjustmentId: `ADJ_${Date.now()}`,
      customerId: adjustmentData.customerId,
      agentId: adjustmentData.agentId,
      adjustmentType: adjustmentData.adjustmentType,
      amount: adjustmentData.amount,
      reason: adjustmentData.reason,
      description: adjustmentData.description,
      status: initialStatus,
      requestedBy: 'Current User', // Would get from request context
      notes: adjustmentData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const response: ApiResponse<AdjustmentRecord> = {
      status: 'success',
      message: requiresApproval
        ? 'Adjustment created and pending approval'
        : 'Adjustment created and approved',
      data: newAdjustment,
      metadata: {
        timestamp: new Date(),
        requestId: `create_adjustment_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to create adjustment',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `create_adjustment_error_${Date.now()}`,
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
 * Approve or reject an adjustment
 */
export async function approveAdjustment(
  request: ControllerRequest,
  adjustmentId: string,
  action: 'approve' | 'reject',
  notes?: string
): Promise<Response> {
  try {
    // In real implementation, validate user permissions and adjustment exists
    const mockAdjustment: AdjustmentRecord = {
      id: adjustmentId,
      adjustmentId: `ADJ_${adjustmentId}`,
      customerId: 'CUST_001',
      agentId: 'AGENT_001',
      adjustmentType: 'bonus_credit',
      amount: 50.0,
      reason: 'Loyalty bonus',
      description: 'Monthly loyalty bonus',
      status: action === 'approve' ? 'approved' : 'rejected',
      requestedBy: 'Agent Smith',
      approvedBy: 'Current User', // Would get from request context
      rejectionReason: action === 'reject' ? notes : undefined,
      approvedAt: action === 'approve' ? new Date() : undefined,
      notes,
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const response: ApiResponse<AdjustmentRecord> = {
      status: 'success',
      message: `Adjustment ${action}d successfully`,
      data: mockAdjustment,
      metadata: {
        timestamp: new Date(),
        requestId: `approve_adjustment_${Date.now()}`,
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
      message: 'Failed to process adjustment approval',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `approve_adjustment_error_${Date.now()}`,
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
 * Get available adjustment types
 */
export async function getAdjustmentTypes(request: ControllerRequest): Promise<Response> {
  try {
    const adjustmentTypes: AdjustmentType[] = [
      {
        id: 'bonus_credit',
        name: 'Bonus Credit',
        description: 'Add bonus funds to customer account',
        category: 'bonus',
        requiresApproval: false,
        maxAmount: 1000,
        minAmount: 1,
        active: true,
        createdBy: 'system',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'account_correction',
        name: 'Account Correction',
        description: 'Correct account balance errors',
        category: 'correction',
        requiresApproval: true,
        maxAmount: 5000,
        minAmount: -5000,
        active: true,
        createdBy: 'system',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'loyalty_reward',
        name: 'Loyalty Reward',
        description: 'Reward for customer loyalty',
        category: 'reward',
        requiresApproval: false,
        maxAmount: 500,
        minAmount: 10,
        active: true,
        createdBy: 'system',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'vip_upgrade_bonus',
        name: 'VIP Upgrade Bonus',
        description: 'Bonus for VIP account upgrade',
        category: 'vip',
        requiresApproval: true,
        maxAmount: 2500,
        minAmount: 100,
        active: true,
        createdBy: 'system',
        createdAt: new Date('2025-01-01'),
      },
    ];

    const response: ApiResponse<AdjustmentType[]> = {
      status: 'success',
      message: 'Adjustment types retrieved successfully',
      data: adjustmentTypes,
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_types_${Date.now()}`,
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
      message: 'Failed to retrieve adjustment types',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_types_error_${Date.now()}`,
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
 * Get adjustment statistics
 */
export async function getAdjustmentStats(
  request: ControllerRequest,
  params: DateRangeParams
): Promise<Response> {
  try {
    // Mock statistics
    const mockStats = {
      totalAdjustments: 145,
      pendingCount: 12,
      approvedCount: 118,
      rejectedCount: 15,
      totalAmount: 45670.5,
      averageAmount: 315.66,
      adjustmentsByType: {
        bonus_credit: 45,
        account_correction: 32,
        loyalty_reward: 68,
      },
      approvalRate: 88.7,
      averageProcessingTime: 2.4, // hours
    };

    const response: ApiResponse<typeof mockStats> = {
      status: 'success',
      message: 'Adjustment statistics retrieved successfully',
      data: mockStats,
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_stats_${Date.now()}`,
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
      message: 'Failed to retrieve adjustment statistics',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `adjustment_stats_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
