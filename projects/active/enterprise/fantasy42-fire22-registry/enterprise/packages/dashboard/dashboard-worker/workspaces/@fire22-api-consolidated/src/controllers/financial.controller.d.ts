/**
 * Fire22 Financial Controller
 *
 * Handles all financial operations including deposits, withdrawals, and reporting
 */
import type { ValidatedRequest } from '../types/request';
/**
 * Process withdrawal request
 */
export declare function processWithdrawal(request: ValidatedRequest): Promise<Response>;
/**
 * Process deposit request
 */
export declare function processDeposit(request: ValidatedRequest): Promise<Response>;
/**
 * Get transaction history
 */
export declare function getTransactionHistory(request: ValidatedRequest): Promise<Response>;
/**
 * Get withdrawal history
 */
export declare function getWithdrawalHistory(request: ValidatedRequest): Promise<Response>;
/**
 * Get deposit history
 */
export declare function getDepositHistory(request: ValidatedRequest): Promise<Response>;
/**
 * Get queue status
 */
export declare function getQueueStatus(request: ValidatedRequest): Promise<Response>;
/**
 * Get financial summary
 */
export declare function getFinancialSummary(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=financial.controller.d.ts.map
