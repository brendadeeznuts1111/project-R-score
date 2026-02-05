/**
 * Authentication Routes
 * Secure authentication with JWT and rate limiting
 */

import { zValidator } from "@hono/zod-validator";
import { compare, hash } from "bcrypt";
import { Hono } from "hono";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config/config";
import type { AuthPayload } from "../middleware/auth";
import { loginRateLimit } from "../middleware/rate-limit";
import { UserService } from "../services/user-service";
import { logger } from "../utils/logger";
import { createErrorResponse, createSuccessResponse } from "../utils/response";

const authRoutes = new Hono();

// Validation schemas
const registerSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(2, "Name must be at least 2 characters"),
	role: z.enum(["admin", "user", "readonly"]).default("user"),
});

const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1, "Refresh token is required"),
});

// User service instance
const userService = new UserService();

/**
 * Register new user
 * POST /auth/register
 */
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
	try {
		const { email, password, name, role } = c.req.valid("json");

		// Check if user already exists
		const existingUser = await userService.findByEmail(email);
		if (existingUser) {
			return c.json(
				createErrorResponse("User with this email already exists", 409),
				409,
			);
		}

		// Hash password
		const hashedPassword = await hash(password, config.security.bcryptRounds);

		// Create user
		const user = await userService.create({
			email,
			password: hashedPassword,
			name,
			role,
			permissions: getDefaultPermissions(role),
		});

		logger.info("User registered", { userId: user.id, email, role });

		// Generate tokens
		const tokens = await generateTokens(user);

		return c.json(
			createSuccessResponse(
				{
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						permissions: user.permissions,
						createdAt: user.createdAt,
					},
					tokens,
				},
				201,
			),
			201,
		);
	} catch (error) {
		logger.error("Registration failed", { error: error.message });
		return c.json(createErrorResponse("Registration failed", 500), 500);
	}
});

/**
 * User login
 * POST /auth/login
 */
authRoutes.post(
	"/login",
	loginRateLimit,
	zValidator("json", loginSchema),
	async (c) => {
		try {
			const { email, password } = c.req.valid("json");

			// Find user
			const user = await userService.findByEmail(email);
			if (!user) {
				return c.json(createErrorResponse("Invalid credentials", 401), 401);
			}

			// Check if account is locked
			if (user.lockedUntil && user.lockedUntil > new Date()) {
				return c.json(
					createErrorResponse("Account is temporarily locked", 423),
					423,
				);
			}

			// Verify password
			const isPasswordValid = await compare(password, user.password);
			if (!isPasswordValid) {
				// Increment failed attempts
				await userService.incrementFailedAttempts(user.id);

				return c.json(createErrorResponse("Invalid credentials", 401), 401);
			}

			// Reset failed attempts on successful login
			await userService.resetFailedAttempts(user.id);

			// Update last login
			await userService.updateLastLogin(user.id);

			logger.info("User logged in", { userId: user.id, email });

			// Generate tokens
			const tokens = await generateTokens(user);

			return c.json(
				createSuccessResponse({
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						permissions: user.permissions,
						lastLoginAt: user.lastLoginAt,
					},
					tokens,
				}),
			);
		} catch (error) {
			logger.error("Login failed", { error: error.message });
			return c.json(createErrorResponse("Login failed", 500), 500);
		}
	},
);

/**
 * Refresh access token
 * POST /auth/refresh
 */
authRoutes.post(
	"/refresh",
	zValidator("json", refreshTokenSchema),
	async (c) => {
		try {
			const { refreshToken } = c.req.valid("json");

			// Verify refresh token
			const decoded = verify(refreshToken, config.jwt.secret) as AuthPayload;

			// Find user
			const user = await userService.findById(decoded.userId);
			if (!user) {
				return c.json(createErrorResponse("Invalid refresh token", 401), 401);
			}

			// Generate new tokens
			const tokens = await generateTokens(user);

			logger.info("Token refreshed", { userId: user.id });

			return c.json(createSuccessResponse({ tokens }));
		} catch (error) {
			logger.error("Token refresh failed", { error: error.message });
			return c.json(createErrorResponse("Invalid refresh token", 401), 401);
		}
	},
);

/**
 * Logout user
 * POST /auth/logout
 */
authRoutes.post("/logout", async (c) => {
	try {
		// In a real implementation, you would invalidate the token
		// For now, we'll just log the logout
		const authHeader = c.req.header("Authorization");
		if (authHeader) {
			const token = authHeader.substring(7);
			const decoded = verify(token, config.jwt.secret) as AuthPayload;

			logger.info("User logged out", { userId: decoded.userId });
		}

		return c.json(
			createSuccessResponse({ message: "Logged out successfully" }),
		);
	} catch (error) {
		logger.error("Logout failed", { error: error.message });
		return c.json(createErrorResponse("Logout failed", 500), 500);
	}
});

/**
 * Get current user profile
 * GET /auth/me
 */
authRoutes.get("/me", async (c) => {
	try {
		const user = c.get("user");

		if (!user) {
			return c.json(createErrorResponse("Authentication required", 401), 401);
		}

		const userProfile = await userService.findById(user.userId);
		if (!userProfile) {
			return c.json(createErrorResponse("User not found", 404), 404);
		}

		return c.json(
			createSuccessResponse({
				id: userProfile.id,
				email: userProfile.email,
				name: userProfile.name,
				role: userProfile.role,
				permissions: userProfile.permissions,
				createdAt: userProfile.createdAt,
				lastLoginAt: userProfile.lastLoginAt,
			}),
		);
	} catch (error) {
		logger.error("Get profile failed", { error: error.message });
		return c.json(createErrorResponse("Failed to get profile", 500), 500);
	}
});

/**
 * Helper function to generate JWT tokens
 */
async function generateTokens(
	user: any,
): Promise<{ accessToken: string; refreshToken: string }> {
	const payload: AuthPayload = {
		userId: user.id,
		email: user.email,
		role: user.role,
		permissions: user.permissions,
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
	};

	const refreshTokenPayload = {
		userId: user.id,
		type: "refresh",
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
	};

	const accessToken = sign(payload, config.jwt.secret);
	const refreshToken = sign(refreshTokenPayload, config.jwt.secret);

	return { accessToken, refreshToken };
}

/**
 * Get default permissions for a role
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

export { authRoutes };
