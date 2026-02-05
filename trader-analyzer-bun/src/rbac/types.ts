/**
 * @fileoverview RBAC Types
 * @description Role-based access control type definitions
 * @module rbac/types
 */

import type { PipelineUser } from "../pipeline/types";

/**
 * Role definition for RBAC system
 */
export interface Role {
	/** Role identifier (e.g., "admin", "trader", "analyst", "readonly") */
	id: string;
	/** Human-readable role name */
	name: string;
	/** Role description */
	description?: string;
	/** Permissions granted to this role */
	permissions: Permission[];
	/** Data scopes defining what data sources can be accessed */
	dataScopes: DataScope[];
	/** Feature flags enabled for this role */
	featureFlags: string[];
}

/**
 * Permission definition for resource access control
 */
export interface Permission {
	/** Resource type (e.g., "data-source", "property", "endpoint") */
	resource: string;
	/** Actions allowed (e.g., ["read", "write", "delete"]) */
	actions: string[];
	/** Optional conditions for permission */
	conditions?: PermissionCondition[];
}

/**
 * Permission condition for fine-grained access control
 */
export interface PermissionCondition {
	/** Condition type */
	type: "equals" | "in" | "matches" | "custom";
	/** Field to check */
	field: string;
	/** Value to match against */
	value: unknown;
}

/**
 * Data scope definition for role-based data filtering
 */
export interface DataScope {
	/** Allowed data source IDs (use "*" for all) */
	sources: string[];
	/** Allowed property IDs (use "*" for all) */
	properties: string[];
	/** Allowed namespaces (use "*" for all) */
	namespaces: string[];
	/** Additional filters to apply */
	filters?: ScopeFilter[];
}

/**
 * Scope filter for additional data filtering
 */
export interface ScopeFilter {
	/** Filter type */
	type: "timeRange" | "valueRange" | "propertyMatch";
	/** Filter configuration */
	config: Record<string, unknown>;
}

/**
 * User with role information
 */
export interface UserWithRole extends PipelineUser {
	/** User's role definition */
	roleDefinition: Role;
}
