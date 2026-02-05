/**
 * @fileoverview RBAC Manager
 * @description Role-based access control manager
 * @module rbac/manager
 */

import { Database } from "bun:sqlite";
import { DATABASE_PATHS } from "../pipeline/constants";
import type { DataSource, EnrichedData, PipelineUser } from "../pipeline/types";
import type { PropertyRegistry } from "../properties/registry";
import type { DataScope, Permission, Role, ScopeFilter } from "./types";

/**
 * Role-Based Access Control (RBAC) Manager
 *
 * Manages user roles, permissions, and data scopes for enterprise access control.
 * Provides methods to check access permissions and filter data based on user roles.
 */
export class RBACManager {
	private db: Database;
	private roles: Map<string, Role> = new Map();
	private userRoles: Map<string, string> = new Map(); // userId -> roleId
	private propertyRegistry?: PropertyRegistry;

	constructor(
		dbPath = DATABASE_PATHS.rbac,
		propertyRegistry?: PropertyRegistry,
	) {
		this.db = new Database(dbPath);
		this.propertyRegistry = propertyRegistry;
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		// Users table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				email TEXT UNIQUE,
				role_id TEXT NOT NULL,
				feature_flags TEXT,
				created_at INTEGER DEFAULT (unixepoch()),
				FOREIGN KEY (role_id) REFERENCES roles(id)
			)
		`);

		// Roles table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS roles (
				id TEXT PRIMARY KEY,
				name TEXT UNIQUE NOT NULL,
				permissions_json TEXT NOT NULL,
				data_scopes_json TEXT NOT NULL,
				feature_flags TEXT
			)
		`);

		// Create default roles if they don't exist
		this.createDefaultRoles();
	}

	/**
	 * Create default roles
	 */
	private createDefaultRoles(): void {
		const adminRole: Role = {
			id: "admin",
			name: "Administrator",
			permissions: [{ resource: "*", actions: ["*"] }],
			dataScopes: [
				{
					sources: ["*"],
					properties: ["*"],
					namespaces: ["*"],
				},
			],
			featureFlags: ["*"],
		};

		const traderRole: Role = {
			id: "trader",
			name: "Trader",
			permissions: [
				{ resource: "data-source", actions: ["read"] },
				{ resource: "property", actions: ["read"] },
				{ resource: "endpoint", actions: ["read"] },
			],
			dataScopes: [
				{
					sources: ["*"],
					properties: ["*"],
					namespaces: ["*"],
				},
			],
			featureFlags: [],
		};

		const analystRole: Role = {
			id: "analyst",
			name: "Analyst",
			permissions: [
				{ resource: "data-source", actions: ["read"] },
				{ resource: "property", actions: ["read"] },
			],
			dataScopes: [
				{
					sources: ["*"],
					properties: ["*"],
					namespaces: ["*"],
				},
			],
			featureFlags: [],
		};

		const readonlyRole: Role = {
			id: "readonly",
			name: "Read Only",
			permissions: [{ resource: "data-source", actions: ["read"] }],
			dataScopes: [
				{
					sources: ["*"],
					properties: ["*"],
					namespaces: ["*"],
				},
			],
			featureFlags: [],
		};

		// Register default roles
		this.registerRole(adminRole);
		this.registerRole(traderRole);
		this.registerRole(analystRole);
		this.registerRole(readonlyRole);
	}

	/**
	 * Register a role
	 */
	registerRole(role: Role): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO roles (id, name, permissions_json, data_scopes_json, feature_flags)
			VALUES (?, ?, ?, ?, ?)
		`);

		stmt.run(
			role.id,
			role.name,
			JSON.stringify(role.permissions),
			JSON.stringify(role.dataScopes),
			JSON.stringify(role.featureFlags),
		);

		this.roles.set(role.id, role);
	}

	/**
	 * Get role definition for a user
	 *
	 * @param user - User to get role for
	 * @returns Role definition (defaults to readonly if not found)
	 */
	getRole(user: PipelineUser): Role {
		// Check cache
		if (this.userRoles.has(user.id)) {
			const roleId = this.userRoles.get(user.id);
			if (roleId) {
				const cached = this.roles.get(roleId);
				if (cached) return cached;
			}
		}

		// Load from database
		const userStmt = this.db.prepare(`
			SELECT role_id FROM users WHERE id = ?
		`);
		const userRow = userStmt.get(user.id) as { role_id: string } | null;

		const roleId = userRow?.role_id || user.role || "readonly";

		// Load role from database
		const roleStmt = this.db.prepare(`
			SELECT * FROM roles WHERE id = ?
		`);
		const roleRow = roleStmt.get(roleId) as {
			id: string;
			name: string;
			permissions_json: string;
			data_scopes_json: string;
			feature_flags: string;
		} | null;

		if (!roleRow) {
			// Return default readonly role
			return (
				this.roles.get("readonly") || {
					id: "readonly",
					name: "Read Only",
					permissions: [],
					dataScopes: [],
					featureFlags: [],
				}
			);
		}

		const role: Role = {
			id: roleRow.id,
			name: roleRow.name,
			permissions: JSON.parse(roleRow.permissions_json) as Permission[],
			dataScopes: JSON.parse(roleRow.data_scopes_json) as DataScope[],
			featureFlags: JSON.parse(roleRow.feature_flags || "[]") as string[],
		};

		this.roles.set(role.id, role);
		this.userRoles.set(user.id, role.id);

		return role;
	}

	/**
	 * Check if a user can access a data source based on their role's data scopes
	 *
	 * @param user - User to check access for
	 * @param source - Data source to check access to
	 * @returns True if user's role allows access to the source
	 */
	canAccess(user: PipelineUser, source: DataSource): boolean {
		const role = this.getRole(user);
		return role.dataScopes.some(
			(scope) =>
				scope.sources.includes(source.id) || scope.sources.includes("*"),
		);
	}

	/**
	 * Check if a user can access a property based on their role permissions
	 *
	 * @param user - User to check access for
	 * @param propertyId - Property ID to check access to
	 * @param namespace - Optional namespace for the property
	 * @returns True if user's role allows access to the property
	 */
	canAccessProperty(
		user: PipelineUser,
		propertyId: string,
		namespace?: string,
	): boolean {
		const role = this.getRole(user);

		// Check role permissions
		if (
			!role.permissions.some(
				(p) => p.resource === "property" && p.actions.includes("read"),
			)
		) {
			return false;
		}

		// Check property access control if property registry is available
		if (this.propertyRegistry) {
			const property = this.propertyRegistry.getSchema(propertyId, namespace);
			if (property) {
				// Check property access control
				if (!property.accessControl.roles.includes(role.id)) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Filter enriched data based on user's RBAC scope
	 *
	 * Applies data scopes from the user's role to filter out inaccessible properties
	 * and sources. Returns null if user cannot access the data source.
	 *
	 * @param data - Enriched data to filter
	 * @param user - User whose scope to apply
	 * @returns Filtered data or null if user cannot access the source
	 */
	filterData(data: EnrichedData, user: PipelineUser): EnrichedData | null {
		const role = this.getRole(user);
		const scope = role.dataScopes[0]; // Use primary scope

		if (!scope) {
			return null;
		}

		// Filter by sources
		if (
			!scope.sources.includes(data.source.id) &&
			!scope.sources.includes("*")
		) {
			return null; // User can't access this source
		}

		// Filter properties
		const filteredProperties: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data.properties)) {
			if (scope.properties.includes(key) || scope.properties.includes("*")) {
				filteredProperties[key] = value;
			}
		}

		// Apply scope filters
		let filtered: EnrichedData = {
			...data,
			properties: filteredProperties,
		};

		for (const filter of scope.filters || []) {
			filtered = this.applyFilter(filtered, filter);
		}

		return filtered;
	}

	/**
	 * Apply a scope filter
	 */
	private applyFilter(
		data: EnrichedData,
		filter: ScopeFilter,
	): EnrichedData {
		if (!filter) return data;

		switch (filter.type) {
			case "timeRange": {
				const config = filter.config as { start: number; end: number };
				if (data.timestamp < config.start || data.timestamp > config.end) {
					return { ...data, properties: {} };
				}
				break;
			}

			case "valueRange": {
				const config = filter.config as {
					property: string;
					min: number;
					max: number;
				};
				const value = data.properties[config.property];
				if (
					typeof value !== "number" ||
					value < config.min ||
					value > config.max
				) {
					return { ...data, properties: {} };
				}
				break;
			}

			case "propertyMatch": {
				const config = filter.config as Record<string, unknown>;
				for (const [key, value] of Object.entries(config)) {
					if (data.properties[key] !== value) {
						return { ...data, properties: {} };
					}
				}
				break;
			}
		}

		return data;
	}

	/**
	 * Assign role to user
	 */
	assignRole(userId: string, roleId: string): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO users (id, username, role_id)
			VALUES (?, ?, ?)
		`);

		// Get username from existing user or use userId
		const existingStmt = this.db.prepare(`
			SELECT username FROM users WHERE id = ?
		`);
		const existing = existingStmt.get(userId) as { username: string } | null;

		stmt.run(userId, existing?.username || userId, roleId);
		this.userRoles.set(userId, roleId);
	}

	/**
	 * Get all available roles
	 */
	getAllRoles(): Role[] {
		const stmt = this.db.prepare(`
			SELECT id, name, permissions_json, data_scopes_json, feature_flags
			FROM roles
			ORDER BY name
		`);

		const roles: Role[] = [];
		for (const row of stmt.all() as any[]) {
			roles.push({
				id: row.id,
				name: row.name,
				permissions: JSON.parse(row.permissions_json),
				dataScopes: JSON.parse(row.data_scopes_json),
				featureFlags: JSON.parse(row.feature_flags || "[]"),
			});
		}

		return roles;
	}

	/**
	 * Create a new user
	 *
	 * @param userData - User creation data
	 * @returns Created user
	 */
	async createUser(userData: {
		username: string;
		password: string;
		role: string;
		email?: string;
	}): Promise<PipelineUser> {
		const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Hash password (simple for now - should use proper hashing)
		const passwordHash = await Bun.password.hash(userData.password);

		const stmt = this.db.prepare(`
			INSERT INTO users (id, username, email, role_id, feature_flags, created_at)
			VALUES (?, ?, ?, ?, ?, unixepoch())
		`);

		stmt.run(
			userId,
			userData.username,
			userData.email || null,
			userData.role,
			JSON.stringify([]), // empty feature flags
		);

		return {
			id: userId,
			username: userData.username,
			role: userData.role,
			featureFlags: [],
		};
	}

	/**
	 * Get all users
	 *
	 * @returns Array of all users
	 */
	async getAllUsers(): Promise<Array<{
		id: string;
		username: string;
		role: string;
		email?: string;
		createdAt: number;
		lastLogin?: number;
	}>> {
		const stmt = this.db.prepare(`
			SELECT id, username, email, role_id, created_at
			FROM users
			ORDER BY created_at DESC
		`);

		const rows = stmt.all() as Array<{
			id: string;
			username: string;
			email: string | null;
			role_id: string;
			created_at: number;
		}>;

		return rows.map(row => ({
			id: row.id,
			username: row.username,
			role: row.role_id,
			email: row.email || undefined,
			createdAt: row.created_at,
		}));
	}

	/**
	 * Get user by ID
	 *
	 * @param userId - User ID
	 * @returns User data or null if not found
	 */
	async getUserById(userId: string): Promise<{
		id: string;
		username: string;
		role: string;
		email?: string;
		createdAt: number;
		lastLogin?: number;
	} | null> {
		const stmt = this.db.prepare(`
			SELECT id, username, email, role_id, created_at
			FROM users
			WHERE id = ?
		`);

		const row = stmt.get(userId) as {
			id: string;
			username: string;
			email: string | null;
			role_id: string;
			created_at: number;
		} | null;

		if (!row) return null;

		return {
			id: row.id,
			username: row.username,
			role: row.role_id,
			email: row.email || undefined,
			createdAt: row.created_at,
		};
	}

	/**
	 * Update user
	 *
	 * @param userId - User ID
	 * @param updates - Fields to update
	 * @returns Updated user
	 */
	async updateUser(
		userId: string,
		updates: {
			username?: string;
			email?: string;
			role?: string;
		},
	): Promise<{
		id: string;
		username: string;
		role: string;
		email?: string;
		createdAt: number;
		lastLogin?: number;
	}> {
		const setParts: string[] = [];
		const values: any[] = [];

		if (updates.username) {
			setParts.push("username = ?");
			values.push(updates.username);
		}
		if (updates.email !== undefined) {
			setParts.push("email = ?");
			values.push(updates.email);
		}
		if (updates.role) {
			setParts.push("role_id = ?");
			values.push(updates.role);
		}

		if (setParts.length === 0) {
			throw new Error("No fields to update");
		}

		values.push(userId);

		const stmt = this.db.prepare(`
			UPDATE users
			SET ${setParts.join(", ")}
			WHERE id = ?
		`);

		stmt.run(...values);

		// Return updated user
		const user = await this.getUserById(userId);
		if (!user) {
			throw new Error("User not found after update");
		}

		return user;
	}

	/**
	 * Assign role to user
	 *
	 * @param userId - User ID
	 * @param roleId - Role ID
	 */
	async assignRoleToUser(userId: string, roleId: string): Promise<void> {
		const stmt = this.db.prepare(`
			UPDATE users
			SET role_id = ?
			WHERE id = ?
		`);

		stmt.run(roleId, userId);
	}

	/**
	 * Create a new role
	 *
	 * @param roleData - Role creation data
	 * @returns Created role
	 */
	createRole(roleData: {
		id: string;
		name: string;
		description?: string;
		permissions: Permission[];
	}): Role {
		const role: Role = {
			id: roleData.id,
			name: roleData.name,
			description: roleData.description || "",
			permissions: roleData.permissions,
			dataScopes: [],
			featureFlags: [],
		};

		this.registerRole(role);
		return role;
	}

	/**
	 * Get role by ID
	 *
	 * @param roleId - Role ID
	 * @returns Role or null if not found
	 */
	getRoleById(roleId: string): Role | null {
		// Check cache first
		if (this.roles.has(roleId)) {
			return this.roles.get(roleId)!;
		}

		// Load from database
		const stmt = this.db.prepare(`
			SELECT * FROM roles WHERE id = ?
		`);

		const row = stmt.get(roleId) as {
			id: string;
			name: string;
			permissions_json: string;
			data_scopes_json: string;
			feature_flags: string;
		} | null;

		if (!row) return null;

		const role: Role = {
			id: row.id,
			name: row.name,
			description: "", // Not stored in DB currently
			permissions: JSON.parse(row.permissions_json),
			dataScopes: JSON.parse(row.data_scopes_json),
			featureFlags: JSON.parse(row.feature_flags),
		};

		// Cache it
		this.roles.set(role.id, role);
		return role;
	}

	/**
	 * Update role
	 *
	 * @param roleId - Role ID
	 * @param updates - Fields to update
	 * @returns Updated role
	 */
	updateRole(
		roleId: string,
		updates: {
			name?: string;
			description?: string;
			permissions?: Permission[];
		},
	): Role {
		const existingRole = this.getRoleById(roleId);
		if (!existingRole) {
			throw new Error(`Role ${roleId} not found`);
		}

		const updatedRole: Role = {
			...existingRole,
			...updates,
		};

		// Update in database
		const stmt = this.db.prepare(`
			UPDATE roles
			SET name = ?, permissions_json = ?, data_scopes_json = ?, feature_flags = ?
			WHERE id = ?
		`);

		stmt.run(
			updatedRole.name,
			JSON.stringify(updatedRole.permissions),
			JSON.stringify(updatedRole.dataScopes),
			JSON.stringify(updatedRole.featureFlags),
			roleId,
		);

		// Update cache
		this.roles.set(roleId, updatedRole);
		return updatedRole;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
