/**
 * Collections Controller
 *
 * Handles settlement collections, pending settlements, and settlement processing
 * Enhanced with domain-driven design and comprehensive business logic
 */

import type { ValidatedRequest } from '../../middleware/validate.middleware';
import {
  CollectionService,
  SettlementProcessor,
  MetricsCalculator,
  Logger,
} from '../../../domain/services';
import {
  CollectionFilters,
  SettlementFilters,
  MetricCalculationParams,
} from '../../../domain/models';

const logger = Logger.configure('CollectionsController');

/**
 * Get collections dashboard data with comprehensive business metrics
 */
export async function getCollectionsDashboard(request: ValidatedRequest): Promise<Response> {
  try {
    logger.info('Processing collections dashboard request');

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month'; // today, week, month, quarter
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // Calculate date range based on period
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    switch (period) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get collections data
    const collectionFilters: CollectionFilters = {
      dateFrom,
      dateTo,
    };

    const collections = await CollectionService.getAll(collectionFilters);
    const collectionSummary = await CollectionService.getSummary(collectionFilters);

    // Get settlement data
    const settlementFilters: SettlementFilters = {
      dateFrom,
      dateTo,
    };

    const settlementSummary = await SettlementProcessor.getSummary(settlementFilters);
    const settlementMetrics = await SettlementProcessor.processPending();

    // Get revenue metrics
    const metricsParams: MetricCalculationParams = {
      dateFrom,
      dateTo,
      includeInactive,
    };

    const revenueMetrics = await MetricsCalculator.calculateRevenue(metricsParams);

    // Get daily breakdown for charts
    const dailyBreakdown = await MetricsCalculator.getDailyBreakdown(dateFrom, dateTo);

    // Build comprehensive dashboard data
    const dashboardData = {
      summary: {
        totalCollections: collectionSummary.totalCollections,
        pendingCollections: collectionSummary.pendingCollections,
        pendingAmount: collectionSummary.pendingAmount,
        processedCollections: collectionSummary.processedCollections,
        processedAmount: collectionSummary.processedAmount,
        failedCollections: collectionSummary.failedCollections,
        failedAmount: collectionSummary.failedAmount,
        totalSettlementAmount: settlementSummary.totalAmount,
        pendingSettlements: settlementSummary.pendingSettlements,
        completedSettlements: settlementSummary.completedSettlements,
        failedSettlements: settlementSummary.failedSettlements,
        successRate: collectionSummary.successRate,
        averageProcessingTime: collectionSummary.averageProcessingTime,
      },
      financials: {
        totalRevenue: revenueMetrics.totalRevenue,
        netRevenue: revenueMetrics.netRevenue,
        totalFees: revenueMetrics.totalFees,
        dailyVolume: revenueMetrics.dailyVolume,
        weeklyVolume: revenueMetrics.weeklyVolume,
        monthlyVolume: revenueMetrics.monthlyVolume,
        revenueGrowthRate: revenueMetrics.revenueGrowthRate,
        volumeGrowthRate: revenueMetrics.volumeGrowthRate,
        averageTransactionValue: revenueMetrics.averageTransactionValue,
      },
      settlementMetrics: {
        pendingAmount: settlementMetrics.totalAmount,
        estimatedFees: settlementMetrics.estimatedFees,
        processingResults: settlementMetrics.processingResults.length,
        feePercentage: settlementSummary.feePercentage,
        settlementSuccessRate: settlementSummary.successRate,
        averageSettlementTime: settlementSummary.averageProcessingTime,
      },
      performance: {
        overallSuccessRate: revenueMetrics.successRate,
        averageProcessingTime: revenueMetrics.averageProcessingTime,
        customerSatisfactionScore: revenueMetrics.customerSatisfactionScore,
        onTimeSettlementRate: revenueMetrics.successRate * 0.94, // Estimated
        topAgentRevenue: revenueMetrics.topAgentRevenue,
        topAgentName: revenueMetrics.topAgentName,
        activeAgents: revenueMetrics.activeAgents,
        activeMerchants: revenueMetrics.activeMerchants,
      },
      charts: {
        dailyBreakdown: dailyBreakdown.slice(-7), // Last 7 days
        weeklyBreakdown: revenueMetrics.weeklyBreakdown,
        monthlyBreakdown: revenueMetrics.monthlyBreakdown,
        statusDistribution: {
          pending: collectionSummary.pendingCollections,
          processed: collectionSummary.processedCollections,
          failed: collectionSummary.failedCollections,
        },
        settlementStatusDistribution: {
          pending: settlementSummary.pendingSettlements,
          processing: settlementSummary.processingSettlements,
          completed: settlementSummary.completedSettlements,
          failed: settlementSummary.failedSettlements,
        },
      },
      recentCollections: collections
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(collection => ({
          id: collection.id,
          customerName: collection.customerName,
          amount: collection.amount,
          status: collection.status,
          createdAt: collection.createdAt.toISOString(),
          processedAt: collection.processedAt?.toISOString(),
        })),
      filters: {
        period,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        includeInactive,
      },
    };

    const response = {
      success: true,
      data: dashboardData,
      metadata: {
        generatedAt: new Date().toISOString(),
        period,
        totalCollections: collections.length,
        dataSource: 'Domain-Driven Collections Management System',
        apiVersion: '2.0',
        processingTime: Date.now(),
      },
    };

    logger.info('Collections dashboard data generated successfully', {
      collectionsCount: collections.length,
      period,
      processingTime: Date.now(),
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'X-Request-ID': crypto.randomUUID(),
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error: any) {
    logger.error('Failed to fetch collection metrics', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch collection metrics',
        details: error.message,
        code: 'COLLECTIONS_DASHBOARD_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '2.0',
        },
      }
    );
  }
}

/**
 * Get pending settlements (collections) with domain-driven business logic
 */
export async function getPendingSettlements(request: ValidatedRequest): Promise<Response> {
  try {
    logger.info('Processing pending settlements request');

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || 'pending'; // pending, processing, completed, failed, all
    const priority = url.searchParams.get('priority') || 'all'; // high, medium, low, all
    const customerId = url.searchParams.get('customerId');
    const agentId = url.searchParams.get('agentId');
    const merchantId = url.searchParams.get('merchantId');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'; // createdAt, amount, priority, dueDate
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'; // asc, desc

    // Build settlement filters
    const settlementFilters: SettlementFilters = {};

    if (status !== 'all') {
      settlementFilters.status = status as any;
    }

    if (agentId) {
      settlementFilters.agentId = agentId;
    }

    if (merchantId) {
      settlementFilters.merchantId = merchantId;
    }

    // Get paginated settlements from domain service
    const paginatedResult = await SettlementProcessor.getAll(settlementFilters);

    // Get all settlements for summary calculations (in production, this would be optimized)
    const allSettlements = paginatedResult.data;

    // Apply additional filtering for customer ID (would be handled by service in production)
    let filteredSettlements = allSettlements;
    if (customerId) {
      // This is a simplified filter - in production, the service would handle this
      filteredSettlements = allSettlements.filter(
        s =>
          s.collectionId.includes(customerId) ||
          s.notes?.toLowerCase().includes(customerId.toLowerCase())
      );
    }

    // Apply priority filtering (simplified mapping from settlement data)
    if (priority !== 'all') {
      filteredSettlements = filteredSettlements.filter(s => {
        // Map settlement amount to priority levels
        if (priority === 'high' && s.amount > 1000) return true;
        if (priority === 'medium' && s.amount >= 500 && s.amount <= 1000) return true;
        if (priority === 'low' && s.amount < 500) return true;
        return false;
      });
    }

    // Sort settlements
    filteredSettlements.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'priority':
          // Sort by amount as proxy for priority
          comparison = b.amount - a.amount;
          break;
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Pagination
    const totalSettlements = filteredSettlements.length;
    const totalPages = Math.ceil(totalSettlements / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSettlements = filteredSettlements.slice(startIndex, endIndex);

    // Calculate comprehensive summary statistics
    const summary = {
      totalPending: filteredSettlements.filter(s => s.status === 'pending').length,
      totalProcessing: filteredSettlements.filter(s => s.status === 'processing').length,
      totalCompleted: filteredSettlements.filter(s => s.status === 'completed').length,
      totalFailed: filteredSettlements.filter(s => s.status === 'failed').length,
      highPriority: filteredSettlements.filter(s => s.amount > 1000).length,
      mediumPriority: filteredSettlements.filter(s => s.amount >= 500 && s.amount <= 1000).length,
      lowPriority: filteredSettlements.filter(s => s.amount < 500).length,
      overdueCount: filteredSettlements.filter(s => {
        const now = new Date();
        const dueDate = new Date(s.createdAt.getTime() + 48 * 60 * 60 * 1000); // 48 hours from creation
        return s.status === 'pending' && dueDate < now;
      }).length,
      totalAmount: filteredSettlements.reduce((sum, s) => sum + s.amount, 0),
      totalFees: filteredSettlements.reduce((sum, s) => sum + s.processingFee, 0),
      netAmount: filteredSettlements.reduce((sum, s) => sum + s.netAmount, 0),
      readyForSettlement: filteredSettlements.filter(s => s.status === 'pending').length,
      awaitingVerification: filteredSettlements.filter(s => s.status === 'processing').length,
      awaitingResult: filteredSettlements.filter(
        s => s.status === 'pending' && s.notes?.includes('awaiting')
      ).length,
    };

    // Enhanced settlement data with additional computed fields
    const enhancedSettlements = paginatedSettlements.map(settlement => ({
      id: settlement.id,
      collectionId: settlement.collectionId,
      customerName: settlement.notes?.split(' - ')[0] || 'Unknown Customer',
      merchantId: settlement.merchantId,
      merchantName: settlement.merchantName || `Merchant ${settlement.merchantId}`,
      agentId: settlement.agentId,
      agentName: settlement.agentName || `Agent ${settlement.agentId}`,
      amount: settlement.amount,
      currency: settlement.currency,
      processingFee: settlement.processingFee,
      netAmount: settlement.netAmount,
      status: settlement.status,
      priority: settlement.amount > 1000 ? 'high' : settlement.amount >= 500 ? 'medium' : 'low',
      createdAt: settlement.createdAt.toISOString(),
      processedAt: settlement.processedAt?.toISOString(),
      completedAt: settlement.completedAt?.toISOString(),
      dueDate: new Date(settlement.createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      daysOverdue: Math.max(
        0,
        Math.floor(
          (Date.now() - (settlement.createdAt.getTime() + 48 * 60 * 60 * 1000)) /
            (24 * 60 * 60 * 1000)
        )
      ),
      paymentMethod: settlement.paymentMethod || 'bank_transfer',
      notes: settlement.notes || '',
      transactionId: settlement.transactionId,
      failureReason: settlement.failureReason,
    }));

    const response = {
      success: true,
      data: {
        settlements: enhancedSettlements,
        summary,
        filters: {
          status,
          priority,
          customerId,
          agentId,
          merchantId,
          sortBy,
          sortOrder,
          page,
          limit,
        },
        pagination: {
          page,
          limit,
          totalSettlements,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'Domain-Driven Settlement Management System',
          apiVersion: '2.0',
          processingTime: Date.now(),
          totalAmount: summary.totalAmount,
          averageSettlementAmount:
            totalSettlements > 0 ? summary.totalAmount / totalSettlements : 0,
        },
      },
    };

    logger.info('Pending settlements data retrieved successfully', {
      totalSettlements,
      page,
      status,
      priority,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'X-Request-ID': crypto.randomUUID(),
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error: any) {
    logger.error('Failed to get pending settlements', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get pending settlements',
        details: error.message,
        code: 'PENDING_SETTLEMENTS_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Process settlement with domain-driven business logic and validation
 */
export async function processSettlement(request: ValidatedRequest): Promise<Response> {
  try {
    logger.info('Processing settlement request');

    const settlementData = request.validatedBody || (await request.json());

    const {
      settlementId,
      customerId,
      amount,
      notes,
      processedBy,
      paymentMethod = 'bank_transfer',
      expediteProcessing = false,
    } = settlementData;

    // Enhanced validation with domain-specific business rules
    const validationErrors: string[] = [];

    if (!settlementId || typeof settlementId !== 'string') {
      validationErrors.push('Valid settlement ID is required');
    }

    if (!customerId || typeof customerId !== 'string') {
      validationErrors.push('Valid customer ID is required');
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      validationErrors.push('Valid amount greater than 0 is required');
    }

    if (!processedBy || typeof processedBy !== 'string') {
      validationErrors.push('Processed by (agent ID) is required');
    }

    // Business rule validations
    if (amount && amount > 10000) {
      validationErrors.push('Amount exceeds maximum settlement limit of $10,000');
    }

    if (amount && amount < 10) {
      validationErrors.push('Amount below minimum settlement threshold of $10');
    }

    const validPaymentMethods = ['bank_transfer', 'wire_transfer', 'check', 'ach', 'paypal'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      validationErrors.push(
        `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      );
    }

    if (validationErrors.length > 0) {
      logger.warn('Settlement validation failed', { validationErrors, settlementId });

      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Settlement data validation failed',
          details: validationErrors,
          code: 'SETTLEMENT_VALIDATION_ERROR',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '2.0',
          },
        }
      );
    }

    // Verify settlement exists and is in correct state
    const settlementsResult = await SettlementProcessor.getAll({} as SettlementFilters);
    const settlement = settlementsResult.data.find(s => s.id === settlementId);

    if (!settlement) {
      logger.warn('Settlement not found', { settlementId });

      return new Response(
        JSON.stringify({
          error: 'Settlement Not Found',
          message: `Settlement with ID ${settlementId} not found`,
          code: 'SETTLEMENT_NOT_FOUND',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '2.0',
          },
        }
      );
    }

    if (settlement.status !== 'pending') {
      logger.warn('Settlement not in pending state', {
        settlementId,
        currentStatus: settlement.status,
      });

      return new Response(
        JSON.stringify({
          error: 'Invalid Settlement State',
          message: `Settlement is not in pending state. Current status: ${settlement.status}`,
          code: 'INVALID_SETTLEMENT_STATE',
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '2.0',
          },
        }
      );
    }

    // Verify amount matches settlement amount (business rule)
    if (Math.abs(amount - settlement.amount) > 0.01) {
      logger.warn('Settlement amount mismatch', {
        settlementId,
        requestedAmount: amount,
        settlementAmount: settlement.amount,
      });

      return new Response(
        JSON.stringify({
          error: 'Amount Mismatch',
          message: `Requested amount (${amount}) does not match settlement amount (${settlement.amount})`,
          code: 'AMOUNT_MISMATCH_ERROR',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '2.0',
          },
        }
      );
    }

    // Process the settlement using domain service
    const processingResult = await SettlementProcessor.processSettlement({
      ...settlement,
      paymentMethod,
      notes: notes || settlement.notes,
    });

    // Build enhanced response with business context
    const processedResponse = {
      settlementId,
      collectionId: settlement.collectionId,
      customerId,
      merchantId: settlement.merchantId,
      agentId: processedBy,
      amount: parseFloat(amount),
      currency: settlement.currency,
      processingFee: processingResult.fee,
      netAmount: processingResult.netAmount,
      status: processingResult.success ? 'completed' : 'failed',
      processedAt: processingResult.processedAt.toISOString(),
      processedBy,
      paymentMethod,
      expediteProcessing,
      notes: notes || '',
      transactionId: processingResult.transactionId,
      confirmationNumber: processingResult.transactionId
        ? `CONF_${processingResult.transactionId}`
        : `CONF_${settlementId}_${Date.now()}`,
      success: processingResult.success,
      errorMessage: processingResult.errorMessage,
      processingMetadata: {
        processingTime: Date.now() - processingResult.processedAt.getTime(),
        feePercentage: (processingResult.fee / amount) * 100,
        expediteProcessing,
        riskAssessment: amount > 5000 ? 'high' : amount > 1000 ? 'medium' : 'low',
      },
    };

    const response = {
      success: processingResult.success,
      data: processedResponse,
      message: processingResult.success
        ? `Settlement processed successfully. Net amount: $${processingResult.netAmount.toFixed(2)} (${paymentMethod})`
        : `Settlement processing failed: ${processingResult.errorMessage}`,
      metadata: {
        processingTime: Date.now(),
        apiVersion: '2.0',
        settlementProcessed: processingResult.success,
        feeApplied: processingResult.fee,
        netAmount: processingResult.netAmount,
      },
    };

    logger.info('Settlement processing completed', {
      settlementId,
      success: processingResult.success,
      amount: processingResult.netAmount,
      paymentMethod,
    });

    return new Response(JSON.stringify(response), {
      status: processingResult.success ? 200 : 422,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'X-Request-ID': crypto.randomUUID(),
        'X-Settlement-Status': processingResult.success ? 'completed' : 'failed',
      },
    });
  } catch (error: any) {
    logger.error('Failed to process settlement', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process settlement',
        details: error.message,
        code: 'SETTLEMENT_PROCESSING_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': '2.0',
        },
      }
    );
  }
}

/**
 * Get detailed collection information by ID
 */
export async function getCollectionDetail(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const collectionId = url.pathname.split('/').pop();

    if (!collectionId) {
      return new Response(
        JSON.stringify({
          error: 'Collection ID Required',
          message: 'Collection ID must be provided in the URL path',
          code: 'MISSING_COLLECTION_ID',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    logger.info(`Fetching collection detail for ID: ${collectionId}`);

    const collection = await CollectionService.getById(collectionId);

    if (!collection) {
      logger.warn(`Collection not found: ${collectionId}`);

      return new Response(
        JSON.stringify({
          error: 'Collection Not Found',
          message: `Collection with ID ${collectionId} not found`,
          code: 'COLLECTION_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get related settlement information
    const settlements = await SettlementProcessor.getAll({
      collectionId: collectionId,
    } as SettlementFilters);

    const enhancedCollection = {
      ...collection,
      createdAt: collection.createdAt.toISOString(),
      processedAt: collection.processedAt?.toISOString(),
      relatedSettlements: settlements.data.map(settlement => ({
        id: settlement.id,
        amount: settlement.amount,
        status: settlement.status,
        processedAt: settlement.processedAt?.toISOString(),
        agentId: settlement.agentId,
        agentName: settlement.agentName,
      })),
      settlementCount: settlements.data.length,
      totalSettledAmount: settlements.data
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.amount, 0),
      pendingSettlementAmount: settlements.data
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + s.amount, 0),
    };

    const response = {
      success: true,
      data: enhancedCollection,
      metadata: {
        generatedAt: new Date().toISOString(),
        apiVersion: '2.0',
        settlementCount: settlements.data.length,
      },
    };

    logger.info(`Collection detail retrieved successfully: ${collectionId}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'X-Request-ID': crypto.randomUUID(),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    logger.error(`Failed to fetch collection ${request.url}`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch collection details',
        details: error.message,
        code: 'COLLECTION_DETAIL_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get settlement history with comprehensive filtering and analytics
 */
export async function getSettlementHistory(request: ValidatedRequest): Promise<Response> {
  try {
    logger.info('Fetching settlement history');

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const agentId = url.searchParams.get('agentId');
    const merchantId = url.searchParams.get('merchantId');
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Build filters
    const filters: SettlementFilters = {
      dateFrom: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    };

    if (agentId) filters.agentId = agentId;
    if (merchantId) filters.merchantId = merchantId;
    if (status !== 'all') filters.status = status as any;

    const settlements = await SettlementProcessor.getAll(filters, page, limit);
    const settlementSummary = await SettlementProcessor.getSummary(filters);

    // Pagination is already handled by the service
    const totalSettlements = settlements.pagination.total;
    const totalPages = settlements.pagination.totalPages;
    const paginatedSettlements = settlements.data;

    // Enhanced settlement data with analytics
    const enhancedSettlements = paginatedSettlements.map(settlement => ({
      ...settlement,
      createdAt: settlement.createdAt.toISOString(),
      processedAt: settlement.processedAt?.toISOString(),
      completedAt: settlement.completedAt?.toISOString(),
      processingDuration:
        settlement.processedAt && settlement.completedAt
          ? settlement.completedAt.getTime() - settlement.createdAt.getTime()
          : null,
      isOverdue:
        settlement.status === 'pending' &&
        Date.now() - settlement.createdAt.getTime() > 48 * 60 * 60 * 1000,
    }));

    const response = {
      success: true,
      data: {
        settlements: enhancedSettlements,
        summary: settlementSummary,
        analytics: {
          averageProcessingTime: settlementSummary.averageProcessingTime,
          successRate: settlementSummary.successRate,
          totalVolume: settlementSummary.totalAmount,
          feePercentage: settlementSummary.feePercentage,
        },
        filters: {
          days,
          agentId,
          merchantId,
          status,
          page,
          limit,
        },
        pagination: {
          page,
          limit,
          totalSettlements,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        period: `${days} days`,
        apiVersion: '2.0',
        totalAmount: settlementSummary.totalAmount,
        totalFees: settlementSummary.totalFees,
      },
    };

    logger.info('Settlement history retrieved successfully', {
      days,
      totalSettlements,
      page,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
        'X-Request-ID': crypto.randomUUID(),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    logger.error('Failed to fetch settlement history', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch settlement history',
        details: error.message,
        code: 'SETTLEMENT_HISTORY_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
