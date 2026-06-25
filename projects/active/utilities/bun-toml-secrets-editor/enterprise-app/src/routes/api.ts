/**
 * API Routes
 * Protected API endpoints with role-based access control
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
	authMiddleware,
	requirePermission,
	requireRole,
} from "../middleware/auth";
import { adminRateLimit } from "../middleware/rate-limit";
import { AuditService } from "../services/audit-service";
import { UserService } from "../services/user-service";
import { logger } from "../utils/logger";
import { createErrorResponse, createSuccessResponse } from "../utils/response";

const apiRoutes = new Hono();

// Service instances
const userService = new UserService();
const auditService = new AuditService();

// Apply authentication to all API routes
apiRoutes.use("*", authMiddleware);

// Validation schemas
const updateUserSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	role: z.enum(["admin", "user", "readonly"]).optional(),
	permissions: z.array(z.string()).optional(),
});

const createUserSchema = z.object({
	email: z.string().email("Invalid email format"),
	name: z.string().min(2, "Name must be at least 2 characters"),
	role: z.enum(["admin", "user", "readonly"]).default("user"),
});

/**
 * Get all users (admin only)
 * GET /api/users
 */
apiRoutes.get("/users", requireRole("admin"), adminRateLimit, async (c) => {
	try {
		const page = parseInt(c.req.query("page") || "1", 10);
		const limit = parseInt(c.req.query("limit") || "10", 10);
		const search = c.req.query("search") || "";

		const users = await userService.findAll({ page, limit, search });
		const total = await userService.count(search);

		// Log audit event
		await auditService.log({
			userId: c.get("user").userId,
			action: "READ_USERS",
			resource: "users",
			metadata: { page, limit, search },
		});

		return c.json(
			createSuccessResponse({
				users,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			}),
		);
	} catch (error) {
		logger.error("Failed to get users", { error: error.message });
		return c.json(createErrorResponse("Failed to get users", 500), 500);
	}
});

/**
 * Get user by ID (admin or own user)
 * GET /api/users/:id
 */
apiRoutes.get("/users/:id", requirePermission("read"), async (c) => {
	try {
		const targetId = c.req.param("id");
		const currentUser = c.get("user");

		// Check if user is admin or requesting own data
		if (currentUser.role !== "admin" && currentUser.userId !== targetId) {
			return c.json(createErrorResponse("Access denied", 403), 403);
		}

		const user = await userService.findById(targetId);
		if (!user) {
			return c.json(createErrorResponse("User not found", 404), 404);
		}

		// Remove sensitive data
		const { password, ...userWithoutPassword } = user;

		// Log audit event
		await auditService.log({
			userId: currentUser.userId,
			action: "READ_USER",
			resource: `user:${targetId}`,
			metadata: { targetId },
		});

		return c.json(createSuccessResponse(userWithoutPassword));
	} catch (error) {
		logger.error("Failed to get user", { error: error.message });
		return c.json(createErrorResponse("Failed to get user", 500), 500);
	}
});

/**
 * Create new user (admin only)
 * POST /api/users
 */
apiRoutes.post(
	"/users",
	requireRole("admin"),
	adminRateLimit,
	zValidator("json", createUserSchema),
	async (c) => {
		try {
			const { email, name, role } = c.req.valid("json");

			// Check if user already exists
			const existingUser = await userService.findByEmail(email);
			if (existingUser) {
				return c.json(
					createErrorResponse("User with this email already exists", 409),
					409,
				);
			}

			// Create user with temporary password
			const tempPassword = Math.random().toString(36).slice(-8);
			const user = await userService.create({
				email,
				password: tempPassword, // Will be hashed in service
				name,
				role,
				permissions: getDefaultPermissions(role),
				requiresPasswordChange: true,
			});

			// Log audit event
			await auditService.log({
				userId: c.get("user").userId,
				action: "CREATE_USER",
				resource: `user:${user.id}`,
				metadata: { email, name, role },
			});

			logger.info("User created by admin", {
				userId: user.id,
				email,
				role,
				createdBy: c.get("user").userId,
			});

			// Remove sensitive data
			const { password, ...userWithoutPassword } = user;

			return c.json(createSuccessResponse(userWithoutPassword, 201), 201);
		} catch (error) {
			logger.error("Failed to create user", { error: error.message });
			return c.json(createErrorResponse("Failed to create user", 500), 500);
		}
	},
);

/**
 * Update user (admin or own user)
 * PUT /api/users/:id
 */
apiRoutes.put(
	"/users/:id",
	requirePermission("write"),
	zValidator("json", updateUserSchema),
	async (c) => {
		try {
			const targetId = c.req.param("id");
			const updateData = c.req.valid("json");
			const currentUser = c.get("user");

			// Check if user is admin or updating own data
			if (currentUser.role !== "admin" && currentUser.userId !== targetId) {
				return c.json(createErrorResponse("Access denied", 403), 403);
			}

			// Non-admin users can only update their name
			if (currentUser.role !== "admin") {
				const allowedFields = ["name"];
				const updates = Object.keys(updateData).filter((key) =>
					allowedFields.includes(key),
				);
				if (updates.length !== Object.keys(updateData).length) {
					return c.json(
						createErrorResponse("Only name can be updated", 400),
						400,
					);
				}
			}

			const user = await userService.update(targetId, updateData);
			if (!user) {
				return c.json(createErrorResponse("User not found", 404), 404);
			}

			// Log audit event
			await auditService.log({
				userId: currentUser.userId,
				action: "UPDATE_USER",
				resource: `user:${targetId}`,
				metadata: { updateData },
			});

			logger.info("User updated", {
				userId: targetId,
				updatedBy: currentUser.userId,
				changes: Object.keys(updateData),
			});

			// Remove sensitive data
			const { password, ...userWithoutPassword } = user;

			return c.json(createSuccessResponse(userWithoutPassword));
		} catch (error) {
			logger.error("Failed to update user", { error: error.message });
			return c.json(createErrorResponse("Failed to update user", 500), 500);
		}
	},
);

/**
 * Delete user (admin only)
 * DELETE /api/users/:id
 */
apiRoutes.delete(
	"/users/:id",
	requireRole("admin"),
	adminRateLimit,
	async (c) => {
		try {
			const targetId = c.req.param("id");
			const currentUser = c.get("user");

			// Prevent self-deletion
			if (currentUser.userId === targetId) {
				return c.json(
					createErrorResponse("Cannot delete your own account", 400),
					400,
				);
			}

			const success = await userService.delete(targetId);
			if (!success) {
				return c.json(createErrorResponse("User not found", 404), 404);
			}

			// Log audit event
			await auditService.log({
				userId: currentUser.userId,
				action: "DELETE_USER",
				resource: `user:${targetId}`,
				metadata: { deletedUserId: targetId },
			});

			logger.info("User deleted by admin", {
				deletedUserId: targetId,
				deletedBy: currentUser.userId,
			});

			return c.json(
				createSuccessResponse({ message: "User deleted successfully" }),
			);
		} catch (error) {
			logger.error("Failed to delete user", { error: error.message });
			return c.json(createErrorResponse("Failed to delete user", 500), 500);
		}
	},
);

/**
 * Get audit logs (admin only)
 * GET /api/audit
 */
apiRoutes.get("/audit", requireRole("admin"), adminRateLimit, async (c) => {
	try {
		const page = parseInt(c.req.query("page") || "1", 10);
		const limit = parseInt(c.req.query("limit") || "50", 10);
		const userId = c.req.query("userId");
		const action = c.req.query("action");
		const resource = c.req.query("resource");

		const logs = await auditService.findAll({
			page,
			limit,
			filters: { userId, action, resource },
		});
		const total = await auditService.count({ userId, action, resource });

		return c.json(
			createSuccessResponse({
				logs,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
				},
			}),
		);
	} catch (error) {
		logger.error("Failed to get audit logs", { error: error.message });
		return c.json(createErrorResponse("Failed to get audit logs", 500), 500);
	}
});

/**
 * Get system metrics (admin only)
 * GET /api/metrics
 */
apiRoutes.get("/metrics", requireRole("admin"), async (c) => {
	try {
		const metrics = await userService.getMetrics();

		return c.json(
			createSuccessResponse({
				timestamp: new Date().toISOString(),
				metrics,
			}),
		);
	} catch (error) {
		logger.error("Failed to get metrics", { error: error.message });
		return c.json(createErrorResponse("Failed to get metrics", 500), 500);
	}
});

/**
 * Helper function to get default permissions for a role
 */
function getDefaultPermissions(role: string): string[] {
	switch (role) {
		case "admin":
			return ["read", "write", "delete", "admin"];
		case "user":
			return ["read", "write"];
		case "readonly":
			return ["read"];
		default:
			return ["read"];
	}
}

export { apiRoutes };
