/**
 * Other Controller
 *
 * Handles miscellaneous operations that don't fit other categories
 */
import type { ValidatedRequest } from '../middleware/validate.middleware';
/**
 * Get settlement history
 */
export declare function settlementHistory(request: ValidatedRequest): Promise<Response>;
/**
 * Get dashboard data
 */
export declare function dashboard(request: ValidatedRequest): Promise<Response>;
/**
 * Get live data stream
 */
export declare function live(request: ValidatedRequest): Promise<Response>;
/**
 * Generic placeholder handler for unimplemented endpoints
 */
export declare function placeholder(request: ValidatedRequest): Promise<Response>;
export declare const defaultHandler: typeof placeholder;
export declare const getAnalytics: typeof placeholder;
export declare const getReports: typeof placeholder;
export declare const getAuditLogs: typeof placeholder;
export declare const getSystemLogs: typeof placeholder;
export declare const getNotifications: typeof placeholder;
export declare const getAlerts: typeof placeholder;
export declare const getConfigurations: typeof placeholder;
export declare const updateConfigurations: typeof placeholder;
export declare const exportData: typeof placeholder;
export declare const importData: typeof placeholder;
export declare const backup: typeof placeholder;
export declare const restore: typeof placeholder;
export declare const maintenance: typeof placeholder;
export declare const cache: typeof placeholder;
export declare const sync: typeof placeholder;
export declare const webhook: typeof placeholder;
export declare const callback: typeof placeholder;
export declare const proxy: typeof placeholder;
export declare const redirect: typeof placeholder;
export declare const upload: typeof placeholder;
export declare const download: typeof placeholder;
export declare const search: typeof placeholder;
export declare const filter: typeof placeholder;
export declare const sort: typeof placeholder;
export declare const paginate: typeof placeholder;
export declare const aggregate: typeof placeholder;
export declare const transform: typeof placeholder;
export declare const validate: typeof placeholder;
export declare const process: typeof placeholder;
export declare const queue: typeof placeholder;
export declare const schedule: typeof placeholder;
export declare const monitor: typeof placeholder;
export declare const debug: typeof placeholder;
export declare const test: typeof placeholder;
export declare const mock: typeof placeholder;
//# sourceMappingURL=other.controller.d.ts.map
