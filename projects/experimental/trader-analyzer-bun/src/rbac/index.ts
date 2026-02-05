/**
 * @fileoverview RBAC Module
 * @description Role-based access control exports
 * @module rbac
 */

export { RBACManager } from "./manager";
export type {
	DataScope,
	Permission,
	PermissionCondition,
	Role,
	ScopeFilter,
	UserWithRole,
} from "./types";
