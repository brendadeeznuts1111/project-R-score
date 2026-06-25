/**
 * Authentication Middleware
 * JWT-based authentication with role-based access control
 */

import type { Context, Next } from "hono";
import { verify } from "jsonwebtoken";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { createErrorResponse } from "../utils/response";

export interface AuthPayload {
	userId: string;
	email: string;
	role: "admin" | "user" | "readonly";
	permissions: string[];
	iat: number;
	exp: number;
}

export interface AuthContext extends Context {
	get: (key: "user") => AuthPayload;
}

/**
 * JWT Authentication Middleware
 */
export async function authMiddleware(c: Context, next: Next) {
	try {
		const authHeader = c.req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json(createErrorResponse("Authentication required", 401), 401);
		}

		const token = authHeader.substring(7);

		if (!token) {
			return c.json(createErrorResponse("Token required", 401), 401);
		}

		// Verify JWT token
		const decoded = verify(token, config.jwt.secret) as AuthPayload;

		// Check if token is expired
		if (Date.now() >= decoded.exp * 1000) {
			return c.json(createErrorResponse("Token expired", 401), 401);
		}

		// Attach user to context
		c.set("user", decoded);

		logger.info("User authenticated", {
			userId: decoded.userId,
			email: decoded.email,
			role: decoded.role,
		});

		await next();
	} catch (error) {
		logger.error("Authentication failed", { error: error.message });
		return c.json(createErrorResponse("Invalid token", 401), 401);
	}
}

/**
 * Role-based access control middleware
 */
export function requireRole(requiredRole: "admin" | "user" | "readonly") {
	return async (c: AuthContext, next: Next) => {
		const user = c.get("user");

		if (!user) {
			return c.json(createErrorResponse("Authentication required", 401), 401);
		}

		// Role hierarchy: admin > user > readonly
		const roleHierarchy = {
			admin: 3,
			user: 2,
			readonly: 1,
		};

		const userRoleLevel = roleHierarchy[user.role];
		const requiredRoleLevel = roleHierarchy[requiredRole];

		if (userRoleLevel < requiredRoleLevel) {
			logger.warn("Insufficient permissions", {
				userId: user.userId,
				userRole: user.role,
				requiredRole,
			});

			return c.json(createErrorResponse("Insufficient permissions", 403), 403);
		}

		await next();
	};
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(permission: string) {
	return async (c: AuthContext, next: Next) => {
		const user = c.get("user");

		if (!user) {
			return c.json(createErrorResponse("Authentication required", 401), 401);
		}

		if (!user.permissions.includes(permission)) {
			logger.warn("Permission denied", {
				userId: user.userId,
				userPermissions: user.permissions,
				requiredPermission: permission,
			});

			return c.json(createErrorResponse("Permission denied", 403), 403);
		}

		await next();
	};
}

/**
 * Optional authentication middleware
 * Attaches user if token is present but doesn't require it
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
	try {
		const authHeader = c.req.header("Authorization");

		if (authHeader?.startsWith("Bearer ")) {
			const token = authHeader.substring(7);

			if (token) {
				const decoded = verify(token, config.jwt.secret) as AuthPayload;

				if (Date.now() < decoded.exp * 1000) {
					c.set("user", decoded);
				}
			}
		}
	} catch (error) {
		// Optional auth - don't fail if token is invalid
		logger.debug("Optional authentication failed", { error: error.message });
	}

	await next();
}
