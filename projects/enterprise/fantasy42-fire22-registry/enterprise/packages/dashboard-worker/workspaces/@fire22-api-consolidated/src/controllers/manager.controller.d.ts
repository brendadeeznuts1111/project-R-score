/**
 * Manager Controller
 *
 * Handles manager-level operations for Fire22 dashboard
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * Get weekly figures by agent
 */
export declare function getWeeklyFigureByAgent(request: ValidatedRequest): Promise<Response>;
/**
 * Get pending operations
 */
export declare function getPending(request: ValidatedRequest): Promise<Response>;
/**
 * Get transactions
 */
export declare function getTransactions(request: ValidatedRequest): Promise<Response>;
/**
 * Get customers
 */
export declare function getCustomers(request: ValidatedRequest): Promise<Response>;
/**
 * Get live activity
 */
export declare function getLiveActivity(request: ValidatedRequest): Promise<Response>;
/**
 * Get live wagers
 */
export declare function getLiveWagers(request: ValidatedRequest): Promise<Response>;
/**
 * Get agent performance
 */
export declare function getAgentPerformance(request: ValidatedRequest): Promise<Response>;
/**
 * Get wager alerts
 */
export declare function getWagerAlerts(request: ValidatedRequest): Promise<Response>;
/**
 * Get VIP customers
 */
export declare function getVIPCustomers(request: ValidatedRequest): Promise<Response>;
/**
 * Get bet ticker
 */
export declare function getBetTicker(request: ValidatedRequest): Promise<Response>;
/**
 * Get sports analytics
 */
export declare function getSportAnalytics(request: ValidatedRequest): Promise<Response>;
/**
 * Get customer details
 */
export declare function getCustomerDetails(request: ValidatedRequest): Promise<Response>;
/**
 * Get settings
 */
export declare function getSettings(request: ValidatedRequest): Promise<Response>;
/**
 * Get agent KPI
 */
export declare function getAgentKPI(request: ValidatedRequest): Promise<Response>;
/**
 * Get customers by agent
 */
export declare function getCustomersByAgent(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=manager.controller.d.ts.map
