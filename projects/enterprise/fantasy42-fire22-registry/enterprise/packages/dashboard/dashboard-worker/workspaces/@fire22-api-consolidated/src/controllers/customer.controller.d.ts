/**
 * Customer Controller
 *
 * Handles customer-level operations for Fire22 dashboard
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * Get customer hierarchy
 */
export declare function getHierarchy(request: ValidatedRequest): Promise<Response>;
/**
 * Get customer profile
 */
export declare function getProfile(request: ValidatedRequest): Promise<Response>;
/**
 * Update customer profile
 */
export declare function updateProfile(request: ValidatedRequest): Promise<Response>;
/**
 * Get customer betting history
 */
export declare function getBettingHistory(request: ValidatedRequest): Promise<Response>;
/**
 * Get customer balance
 */
export declare function getBalance(request: ValidatedRequest): Promise<Response>;
//# sourceMappingURL=customer.controller.d.ts.map
