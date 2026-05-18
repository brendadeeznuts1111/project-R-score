/**
 * Admin Controller
 *
 * Handles admin-level operations for Fire22 dashboard
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * Settle wager
 */
export declare function settleWager(request: ValidatedRequest): Promise<Response>;
/**
 * Bulk settle wagers
 */
export declare function bulkSettle(request: ValidatedRequest): Promise<Response>;
/**
 * Get pending settlements
 */
export declare function pendingSettlements(request: ValidatedRequest): Promise<Response>;
/**
 * Void wager
 */
export declare function voidWager(request: ValidatedRequest): Promise<Response>;
/**
 * Create customer
 */
export declare function createCustomer(request: ValidatedRequest): Promise<Response>;
/**
 * Process deposit
 */
export declare function processDeposit(request: ValidatedRequest): Promise<Response>;
/**
 * Get agent configs dashboard
 */
export declare function agentConfigsDashboard(request: ValidatedRequest): Promise<Response>;
/**
 * Import customers
 */
export declare function importCustomers(request: ValidatedRequest): Promise<Response>;
/**
 * Sync Fire22 data
 */
export declare function syncFire22(request: ValidatedRequest): Promise<Response>;
/**
 * Get debug cache stats
 */
export declare function debugCacheStats(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=admin.controller.d.ts.map
