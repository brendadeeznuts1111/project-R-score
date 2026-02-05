/**
 * Controllers Index
 * Unified controller exports and routing for all domain controllers
 */

// Settlement Controllers
export * from './settlement/settlement-controller';

// Adjustment Controllers
export * from './adjustment/adjustment-controller';

// Balance Controllers
export * from './balance/balance-controller';

// Collections Controllers
export * from './collections/collections.controller';

// Distributions Controllers
export * from './distributions/distributions.controller';

// Free Play Controllers
export * from './free-play/free-play.controller';

// Re-export types
export type * from '../../../core/types/controllers';

// Legacy controller functions (for backward compatibility)
// These will be gradually migrated to domain-specific controllers

/**
 * Legacy settlement history function (now handled by settlement controller)
 */
export async function settlementHistory(request: any): Promise<Response> {
  console.warn(
    '⚠️ Using legacy settlementHistory function. Please migrate to settlement controller.'
  );
  const { getSettlementHistory } = await import('./settlement/settlement-controller');
  return getSettlementHistory(request, {});
}

/**
 * Legacy adjustment history function (now handled by adjustment controller)
 */
export async function getAdjustmentsHistory(request: any): Promise<Response> {
  console.warn(
    '⚠️ Using legacy getAdjustmentsHistory function. Please migrate to adjustment controller.'
  );
  const { getAdjustmentHistory } = await import('./adjustment/adjustment-controller');
  return getAdjustmentHistory(request, {});
}

/**
 * Legacy customer balances function (now handled by balance controller)
 */
export async function getCustomerBalances(request: any): Promise<Response> {
  console.warn(
    '⚠️ Using legacy getCustomerBalances function. Please migrate to balance controller.'
  );
  const { getCustomerBalances } = await import('./balance/balance-controller');
  return getCustomerBalances(request, {});
}

/**
 * Placeholder functions for future implementation
 */
export async function placeholder(request: any): Promise<Response> {
  const response = {
    status: 'info',
    message: 'This endpoint is under development',
    timestamp: new Date().toISOString(),
    requestId: `placeholder_${Date.now()}`,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Export placeholder functions for compatibility
export const getAnalytics = placeholder;
export const getReports = placeholder;
export const getAuditLogs = placeholder;
export const getSystemLogs = placeholder;
export const getNotifications = placeholder;
export const getAlerts = placeholder;
export const getConfigurations = placeholder;
export const updateConfigurations = placeholder;
export const exportData = placeholder;
export const importData = placeholder;
export const backup = placeholder;
export const restore = placeholder;
export const maintenance = placeholder;
