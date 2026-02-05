// [csrf]
// Bun 1.3 native CSRF protection
// Uses Bun.CSRF for cross-site request forgery protection

import type { MiddlewareHandler } from "hono";
import { CSRF_CONSTANTS } from "../security/constants";
import { csrfLogger } from "../utils/logger";

/**
 * CSRF Secret Key
 *
 * In production, use a secure secret stored in Bun.secrets:
 * ```typescript
 * import { secrets } from "bun";
 * const CSRF_SECRET = await secrets.get({ service: "nexus", name: "csrf-secret" }) || crypto.randomUUID();
 * ```
 */
async function getCSRFSecret(): Promise<string> {
	// Try Bun.secrets first (Bun 1.3+)
	try {
		const { secrets } = await import("bun");
		const secret = await secrets.get({
			service: CSRF_CONSTANTS.SERVICE_NAME,
			name: CSRF_CONSTANTS.SECRET_NAME,
		});
		if (secret) {
			return secret;
		}
	} catch {
		// Bun.secrets not available - fall back to environment variable
	}

	// Fall back to environment variable or generate UUID
	return process.env.CSRF_SECRET || crypto.randomUUID();
}

// Initialize secret (will be set on first use)
let CSRF_SECRET: string | null = null;
const getSecret = async (): Promise<string> => {
	if (!CSRF_SECRET) {
		CSRF_SECRET = await getCSRFSecret();
	}
	return CSRF_SECRET;
};

const TOKEN_EXPIRY = CSRF_CONSTANTS.TOKEN_EXPIRY_MS;

/**
 * Generate CSRF token using Bun.CSRF (Bun 1.3+)
 *
 * Bun.CSRF provides secure token generation and verification:
 * - Generates XSRF/CSRF tokens
 * - Supports expiration
 * - Multiple encoding formats (hex, base64)
 *
 * @see {@link https://bun.com/docs/runtime/bun-apis|Bun.CSRF API}
 */
async function generateCSRFToken(): Promise<string> {
	const secret = await getSecret();

	// Use Bun.CSRF if available (Bun 1.3+)
	try {
		if (typeof Bun !== "undefined" && (Bun as any).CSRF) {
			const CSRF = (Bun as any).CSRF;
			return CSRF.generate({
				secret,
				encoding: "hex",
				expiresIn: TOKEN_EXPIRY,
			});
		}
	} catch (error) {
		// Bun.CSRF not available or error - use fallback
		csrfLogger.debug("Bun.CSRF not available, using fallback", error);
	}

	// Fallback for older Bun versions or non-Bun environments
	const timestamp = Date.now().toString(36);
	const random = crypto.randomUUID().slice(0, 8);
	return `${timestamp}.${random}`;
}

/**
 * Verify CSRF token using Bun.CSRF (Bun 1.3+)
 *
 * @see {@link https://bun.com/docs/runtime/bun-apis|Bun.CSRF API}
 */
async function verifyCSRFToken(token: string): Promise<boolean> {
	if (!token) return false;

	const secret = await getSecret();

	// Use Bun.CSRF if available (Bun 1.3+)
	try {
		if (typeof Bun !== "undefined" && (Bun as any).CSRF) {
			const CSRF = (Bun as any).CSRF;
			return CSRF.verify(token, {
				secret,
			});
		}
	} catch (error) {
		// Bun.CSRF not available or error - use fallback
		csrfLogger.debug("Bun.CSRF not available, using fallback", error);
	}

	// Fallback: basic timestamp check (1 hour expiry)
	const parts = token.split(".");
	if (parts.length !== 2) return false;
	const timestamp = parseInt(parts[0], 36);
	if (isNaN(timestamp)) return false;
	return Date.now() - timestamp < TOKEN_EXPIRY;
}

export const csrf: MiddlewareHandler = async (c, next) => {
	const method = c.req.method;
	const path = c.req.path;

	// Dev mode bypass for localhost testing
	const isDev = process.env.NODE_ENV !== "production";
	const isLocalhost = c.req.header("host")?.startsWith("localhost");
	if (isDev && isLocalhost && c.req.header("X-Dev-Bypass") === "true") {
		return next();
	}

	// Bypass CSRF for MCP tools endpoints (they use their own authentication)
	if (path.startsWith("/api/mcp/tools/")) {
		return next();
	}

	// Safe methods: generate token
	if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
		const token = await generateCSRFToken();
		c.header("X-CSRF-Token", token);
		return next();
	}

	// Mutation methods: validate token
	const token = c.req.header("X-CSRF-Token");
	if (!token || !(await verifyCSRFToken(token))) {
		return c.json(
			{
				error: "NX-403",
				message: "Invalid or missing CSRF token",
				hint: "Fetch X-CSRF-Token from GET request first",
			},
			403,
		);
	}

	return next();
};

// Utility exports (wrapped for async compatibility)
export const generateToken = generateCSRFToken;
export const verifyToken = verifyCSRFToken;
