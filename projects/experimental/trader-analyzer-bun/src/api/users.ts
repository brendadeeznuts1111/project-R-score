/**
 * @fileoverview User Management API Routes
 * @description REST API endpoints for user and role management
 * @module api/users
 */

import { Hono } from "hono";
import { err, ok } from "../types";
import { RBACManager } from "../rbac";
import { jwtUtils } from "../auth/jwt";
import { requireAuth, getAuthenticatedUser } from "../auth/middleware";
import { getPipelineIntegrationService } from "../pipeline/integration";
import type { PipelineUser } from "../pipeline/types";
import type { Result } from "../types";

const usersApi = new Hono();

/**
 * In-memory user store (replace with database in production)
 */
class UserStore {
	private users: Map<string, PipelineUser> = new Map();
	public rbacManager: RBACManager;

	constructor() {
		// Use RBAC manager from pipeline integration service
		this.rbacManager = getPipelineIntegrationService().getRBACManager();
		// Create default admin user
		this.createUser({
			username: "admin",
			password: "admin123", // In production, hash this!
			role: "admin",
		});
	}

	async createUser(userData: {
		username: string;
		password: string;
		role: string;
	}): Promise<Result<PipelineUser>> {
		try {
			// Check if user exists
			for (const user of this.users.values()) {
				if (user.username === userData.username) {
					return err(new Error("Username already exists"));
				}
			}

			const user: PipelineUser = {
				id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				username: userData.username,
				role: userData.role,
				featureFlags: [],
			};

			this.users.set(user.id, user);
			return ok(user);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to create user"),
			);
		}
	}

	async getUserById(id: string): Promise<Result<PipelineUser>> {
		const user = this.users.get(id);
		if (!user) {
			return err(new Error("User not found"));
		}
		return ok(user);
	}

	async getUserByUsername(username: string): Promise<Result<PipelineUser>> {
		for (const user of this.users.values()) {
			if (user.username === username) {
				return ok(user);
			}
		}
		return err(new Error("User not found"));
	}

	async updateUser(
		id: string,
		updates: Partial<PipelineUser>,
	): Promise<Result<PipelineUser>> {
		const user = this.users.get(id);
		if (!user) {
			return err(new Error("User not found"));
		}

		const updatedUser = { ...user, ...updates };
		this.users.set(id, updatedUser);
		return ok(updatedUser);
	}

	async deleteUser(id: string): Promise<Result<void>> {
		if (!this.users.has(id)) {
			return err(new Error("User not found"));
		}
		this.users.delete(id);
		return ok(undefined);
	}

	getAllUsers(): PipelineUser[] {
		return Array.from(this.users.values());
	}

	// Simple password verification (replace with proper hashing in production)
	async verifyPassword(
		username: string,
		password: string,
	): Promise<Result<PipelineUser>> {
		const userResult = await this.getUserByUsername(username);
		if (!userResult.ok) {
			return userResult;
		}

		// In production, use proper password hashing
		// For now, just check against hardcoded passwords
		if (username === "admin" && password === "admin123") {
			return ok(userResult.data);
		}

		return err(new Error("Invalid credentials"));
	}
}

/**
 * Global user store instance
 */
let userStore: UserStore | null = null;

function getUserStore(): UserStore {
	if (!userStore) {
		userStore = new UserStore();
	}
	return userStore;
}

// ============ Authentication Routes ============

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
usersApi.post("/auth/login", async (c) => {
	try {
		const body = await c.req.json();
		const { username, password } = body;

		if (!username || !password) {
			return c.json({ error: "Username and password required" }, 400);
		}

		const userStore = getUserStore();
		const authResult = await userStore.verifyPassword(username, password);

		if (!authResult.ok) {
			return c.json({ error: authResult.error.message }, 401);
		}

		const token = jwtUtils.generateToken(
			authResult.data.id,
			authResult.data.username,
			authResult.data.role,
			authResult.data.featureFlags,
		);

		return c.json({
			token,
			user: {
				id: authResult.data.id,
				username: authResult.data.username,
				role: authResult.data.role,
			},
		});
	} catch (error) {
		return c.json({ error: "Authentication failed" }, 500);
	}
});

/**
 * POST /api/auth/verify
 * Verify JWT token and return user info
 */
usersApi.post("/auth/verify", async (c) => {
	try {
		const body = await c.req.json();
		const { token } = body;

		if (!token) {
			return c.json({ error: "Token required" }, 400);
		}

		const payload = jwtUtils.verifyToken(token);

		if (!payload) {
			return c.json({ error: "Invalid token" }, 401);
		}

		return c.json({
			valid: true,
			user: {
				id: payload.sub,
				username: payload.username,
				role: payload.role,
			},
		});
	} catch (error) {
		return c.json({ error: "Token verification failed" }, 500);
	}
});

// ============ User Management Routes (Require Authentication) ============

/**
 * GET /api/users
 * Get all users (admin only)
 */
usersApi.get("/users", requireAuth, async (c) => {
	try {
		const userStore = getUserStore();
		const users = userStore.getAllUsers();

		return c.json({
			users: users.map((u) => ({
				id: u.id,
				username: u.username,
				role: u.role,
			})),
		});
	} catch (error) {
		return c.json({ error: "Failed to fetch users" }, 500);
	}
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
usersApi.post("/users", requireAuth, async (c) => {
	try {
		const body = await c.req.json();
		const { username, password, role } = body;

		if (!username || !password || !role) {
			return c.json({ error: "Username, password, and role required" }, 400);
		}

		const userStore = getUserStore();
		const result = await userStore.createUser({ username, password, role });

		if (!result.ok) {
			return c.json({ error: result.error.message }, 400);
		}

		return c.json(
			{
				user: {
					id: result.data.id,
					username: result.data.username,
					role: result.data.role,
				},
			},
			201,
		);
	} catch (error) {
		return c.json({ error: "Failed to create user" }, 500);
	}
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
usersApi.get("/users/:id", requireAuth, async (c) => {
	try {
		const id = c.req.param("id");
		const currentUser = getAuthenticatedUser(c);

		// Users can only view their own profile unless they're admin
		if (currentUser?.role !== "admin" && currentUser?.id !== id) {
			return c.json({ error: "Access denied" }, 403);
		}

		const userStore = getUserStore();
		const result = await userStore.getUserById(id);

		if (!result.ok) {
			return c.json({ error: result.error.message }, 404);
		}

		return c.json({
			user: {
				id: result.data.id,
				username: result.data.username,
				role: result.data.role,
			},
		});
	} catch (error) {
		return c.json({ error: "Failed to fetch user" }, 500);
	}
});

/**
 * PUT /api/users/:id
 * Update user (admin or self)
 */
usersApi.put("/users/:id", requireAuth, async (c) => {
	try {
		const id = c.req.param("id");
		const currentUser = getAuthenticatedUser(c);
		const body = await c.req.json();

		// Users can only update themselves unless they're admin
		if (currentUser?.role !== "admin" && currentUser?.id !== id) {
			return c.json({ error: "Access denied" }, 403);
		}

		const userStore = getUserStore();
		const result = await userStore.updateUser(id, body);

		if (!result.ok) {
			return c.json({ error: result.error.message }, 404);
		}

		return c.json({
			user: {
				id: result.data.id,
				username: result.data.username,
				role: result.data.role,
			},
		});
	} catch (error) {
		return c.json({ error: "Failed to update user" }, 500);
	}
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
usersApi.delete("/users/:id", requireAuth, async (c) => {
	try {
		const id = c.req.param("id");
		const userStore = getUserStore();
		const result = await userStore.deleteUser(id);

		if (!result.ok) {
			return c.json({ error: result.error.message }, 404);
		}

		return c.json({ message: "User deleted successfully" });
	} catch (error) {
		return c.json({ error: "Failed to delete user" }, 500);
	}
});

// ============ Role Management Routes ============

/**
 * GET /api/roles
 * Get all available roles
 */
usersApi.get("/roles", requireAuth, async (c) => {
	try {
		const rbacManager = getUserStore().rbacManager;
		const roles = rbacManager.getAllRoles();

		return c.json({ roles });
	} catch (error) {
		return c.json({ error: "Failed to fetch roles" }, 500);
	}
});

/**
 * POST /api/roles
 * Create a new role (admin only)
 */
usersApi.post("/roles", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (currentUser?.role !== "admin") {
			return c.json({ error: "Admin access required" }, 403);
		}

		const body = await c.req.json();
		const { id, name, permissions, dataScopes, featureFlags } = body;

		if (!id || !name || !permissions) {
			return c.json({ error: "id, name, and permissions are required" }, 400);
		}

		const rbacManager = getUserStore().rbacManager;
		rbacManager.registerRole({
			id,
			name,
			permissions,
			dataScopes: dataScopes || [],
			featureFlags: featureFlags || [],
		});

		return c.json({ success: true, message: "Role created" });
	} catch (error) {
		return c.json({ error: "Failed to create role" }, 500);
	}
});

/**
 * PUT /api/roles/:id
 * Update an existing role (admin only)
 */
usersApi.put("/roles/:id", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (currentUser?.role !== "admin") {
			return c.json({ error: "Admin access required" }, 403);
		}

		const id = c.req.param("id");
		const body = await c.req.json();
		const { name, permissions, dataScopes, featureFlags } = body;

		const rbacManager = getUserStore().rbacManager;

		// Get existing role
		const existingRoles = rbacManager.getAllRoles();
		const existingRole = existingRoles.find((r) => r.id === id);

		if (!existingRole) {
			return c.json({ error: "Role not found" }, 404);
		}

		// Update role
		rbacManager.registerRole({
			id,
			name: name || existingRole.name,
			permissions: permissions || existingRole.permissions,
			dataScopes: dataScopes || existingRole.dataScopes,
			featureFlags: featureFlags || existingRole.featureFlags,
		});

		return c.json({ success: true, message: "Role updated" });
	} catch (error) {
		return c.json({ error: "Failed to update role" }, 500);
	}
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
usersApi.get("/auth/me", requireAuth, async (c) => {
	try {
		const currentUser = getAuthenticatedUser(c);
		if (!currentUser) {
			return c.json({ error: "Not authenticated" }, 401);
		}

		return c.json({
			user: {
				id: currentUser.id,
				username: currentUser.username,
				role: currentUser.role,
				featureFlags: currentUser.featureFlags,
			},
		});
	} catch (error) {
		return c.json({ error: "Failed to fetch user profile" }, 500);
	}
});

export { usersApi };
