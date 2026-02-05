/**
 * @fileoverview NEXUS Error Registry
 * @description Centralized error codes, references, and typed errors
 * @module errors
 */

/**
 * Error categories for grouping related errors
 */
export type ErrorCategory =
	| "GENERAL" // General server errors
	| "AUTH" // Authentication/authorization
	| "VALIDATION" // Input validation
	| "RESOURCE" // Resource not found/conflict
	| "EXTERNAL" // External service errors
	| "RATE_LIMIT" // Rate limiting
	| "DATA" // Data processing errors
	| "WEBSOCKET"; // WebSocket errors

/**
 * Error registry entry
 */
export interface ErrorDefinition {
	code: string;
	status: number;
	message: string;
	category: ErrorCategory;
	ref: string;
	recoverable: boolean;
}

/**
 * NEXUS Error Registry
 * Format: NX-{CATEGORY}-{NUMBER}
 *
 * Categories:
 * - 0xx: General
 * - 1xx: Authentication
 * - 2xx: Validation
 * - 3xx: Resources
 * - 4xx: External Services
 * - 5xx: Rate Limiting
 * - 6xx: Data Processing
 * - 7xx: WebSocket
 */
export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
	// ============ General Errors (0xx) ============
	"NX-000": {
		code: "NX-000",
		status: 500,
		message: "Internal Server Error",
		category: "GENERAL",
		ref: "/docs/errors#nx-000",
		recoverable: true,
	},
	"NX-001": {
		code: "NX-001",
		status: 404,
		message: "Not Found",
		category: "GENERAL",
		ref: "/docs/errors#nx-001",
		recoverable: false,
	},
	"NX-004": {
		code: "NX-004",
		status: 404,
		message: "Git Information Not Available",
		category: "GENERAL",
		ref: "/docs/errors#nx-004",
		recoverable: false,
	},
	"NX-005": {
		code: "NX-005",
		status: 500,
		message: "Git Information Fetch Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-005",
		recoverable: true,
	},
	"NX-002": {
		code: "NX-002",
		status: 405,
		message: "Method Not Allowed",
		category: "GENERAL",
		ref: "/docs/errors#nx-002",
		recoverable: false,
	},
	"NX-003": {
		code: "NX-003",
		status: 503,
		message: "Service Unavailable",
		category: "GENERAL",
		ref: "/docs/errors#nx-003",
		recoverable: true,
	},
	"NX-006": {
		code: "NX-006",
		status: 408,
		message: "Request Timeout",
		category: "GENERAL",
		ref: "/docs/errors#nx-006",
		recoverable: true,
	},

	// ============ Authentication Errors (1xx) ============
	"NX-100": {
		code: "NX-100",
		status: 401,
		message: "Authentication Required",
		category: "AUTH",
		ref: "/docs/errors#nx-100",
		recoverable: false,
	},
	"NX-101": {
		code: "NX-101",
		status: 401,
		message: "Invalid Credentials",
		category: "AUTH",
		ref: "/docs/errors#nx-101",
		recoverable: false,
	},
	"NX-102": {
		code: "NX-102",
		status: 401,
		message: "Token Expired",
		category: "AUTH",
		ref: "/docs/errors#nx-102",
		recoverable: true,
	},
	"NX-103": {
		code: "NX-103",
		status: 403,
		message: "Insufficient Permissions",
		category: "AUTH",
		ref: "/docs/errors#nx-103",
		recoverable: false,
	},

	// ============ Validation Errors (2xx) ============
	"NX-200": {
		code: "NX-200",
		status: 400,
		message: "Invalid Request Body",
		category: "VALIDATION",
		ref: "/docs/errors#nx-200",
		recoverable: false,
	},
	"NX-201": {
		code: "NX-201",
		status: 400,
		message: "Missing Required Field",
		category: "VALIDATION",
		ref: "/docs/errors#nx-201",
		recoverable: false,
	},
	"NX-202": {
		code: "NX-202",
		status: 400,
		message: "Invalid Field Value",
		category: "VALIDATION",
		ref: "/docs/errors#nx-202",
		recoverable: false,
	},
	"NX-203": {
		code: "NX-203",
		status: 400,
		message: "Invalid Query Parameter",
		category: "VALIDATION",
		ref: "/docs/errors#nx-203",
		recoverable: false,
	},
	"NX-204": {
		code: "NX-204",
		status: 413,
		message: "Payload Too Large",
		category: "VALIDATION",
		ref: "/docs/errors#nx-204",
		recoverable: false,
	},

	// ============ Resource Errors (3xx) ============
	"NX-300": {
		code: "NX-300",
		status: 404,
		message: "Market Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-300",
		recoverable: false,
	},
	"NX-301": {
		code: "NX-301",
		status: 404,
		message: "Trade Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-301",
		recoverable: false,
	},
	"NX-302": {
		code: "NX-302",
		status: 404,
		message: "Stream Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-302",
		recoverable: false,
	},
	"NX-303": {
		code: "NX-303",
		status: 409,
		message: "Resource Already Exists",
		category: "RESOURCE",
		ref: "/docs/errors#nx-303",
		recoverable: false,
	},
	"NX-304": {
		code: "NX-304",
		status: 410,
		message: "Resource Expired",
		category: "RESOURCE",
		ref: "/docs/errors#nx-304",
		recoverable: false,
	},

	// ============ External Service Errors (4xx) ============
	"NX-400": {
		code: "NX-400",
		status: 502,
		message: "External Service Error",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-400",
		recoverable: true,
	},
	"NX-401": {
		code: "NX-401",
		status: 502,
		message: "Polymarket API Error",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-401",
		recoverable: true,
	},
	"NX-402": {
		code: "NX-402",
		status: 502,
		message: "Kalshi API Error",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-402",
		recoverable: true,
	},
	"NX-403": {
		code: "NX-403",
		status: 502,
		message: "Exchange API Error",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-403",
		recoverable: true,
	},
	"NX-404": {
		code: "NX-404",
		status: 502,
		message: "Odds API Error",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-404",
		recoverable: true,
	},
	"NX-405": {
		code: "NX-405",
		status: 504,
		message: "External Service Timeout",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-405",
		recoverable: true,
	},

	// ============ Rate Limit Errors (5xx) ============
	"NX-500": {
		code: "NX-500",
		status: 429,
		message: "Rate Limit Exceeded",
		category: "RATE_LIMIT",
		ref: "/docs/errors#nx-500",
		recoverable: true,
	},
	"NX-501": {
		code: "NX-501",
		status: 429,
		message: "API Quota Exceeded",
		category: "RATE_LIMIT",
		ref: "/docs/errors#nx-501",
		recoverable: true,
	},

	// ============ Data Processing Errors (6xx) ============
	"NX-600": {
		code: "NX-600",
		status: 422,
		message: "Data Processing Error",
		category: "DATA",
		ref: "/docs/errors#nx-600",
		recoverable: false,
	},
	"NX-601": {
		code: "NX-601",
		status: 422,
		message: "Invalid CSV Format",
		category: "DATA",
		ref: "/docs/errors#nx-601",
		recoverable: false,
	},
	"NX-602": {
		code: "NX-602",
		status: 422,
		message: "Normalization Failed",
		category: "DATA",
		ref: "/docs/errors#nx-602",
		recoverable: false,
	},
	"NX-603": {
		code: "NX-603",
		status: 422,
		message: "Canonicalization Failed",
		category: "DATA",
		ref: "/docs/errors#nx-603",
		recoverable: false,
	},

	// ============ WebSocket Errors (7xx) ============
	"NX-700": {
		code: "NX-700",
		status: 400,
		message: "WebSocket Connection Failed",
		category: "WEBSOCKET",
		ref: "/docs/errors#nx-700",
		recoverable: true,
	},
	"NX-701": {
		code: "NX-701",
		status: 400,
		message: "Invalid WebSocket Message",
		category: "WEBSOCKET",
		ref: "/docs/errors#nx-701",
		recoverable: false,
	},
	"NX-702": {
		code: "NX-702",
		status: 400,
		message: "Subscription Failed",
		category: "WEBSOCKET",
		ref: "/docs/errors#nx-702",
		recoverable: true,
	},

	// ============ MCP Errors (8xx) ============
	// MCP Tool Execution Errors (800-809)
	"NX-MCP-001": {
		code: "NX-MCP-001",
		status: 500,
		message: "MCP Tool Execution Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-001",
		recoverable: true,
	},
	"NX-MCP-002": {
		code: "NX-MCP-002",
		status: 500,
		message: "MCP Tool Execution Timeout",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-002",
		recoverable: true,
	},
	"NX-MCP-003": {
		code: "NX-MCP-003",
		status: 500,
		message: "MCP Tool Initialization Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-003",
		recoverable: true,
	},
	// MCP Resource Errors (810-819)
	"NX-MCP-010": {
		code: "NX-MCP-010",
		status: 404,
		message: "MCP Tool Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-mcp-010",
		recoverable: false,
	},
	"NX-MCP-011": {
		code: "NX-MCP-011",
		status: 404,
		message: "MCP Resource Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-mcp-011",
		recoverable: false,
	},
	"NX-MCP-012": {
		code: "NX-MCP-012",
		status: 404,
		message: "MCP Server Not Available",
		category: "RESOURCE",
		ref: "/docs/errors#nx-mcp-012",
		recoverable: true,
	},
	// MCP Validation Errors (820-829)
	"NX-MCP-020": {
		code: "NX-MCP-020",
		status: 400,
		message: "Invalid MCP Tool Arguments",
		category: "VALIDATION",
		ref: "/docs/errors#nx-mcp-020",
		recoverable: false,
	},
	"NX-MCP-021": {
		code: "NX-MCP-021",
		status: 400,
		message: "Missing Required MCP Tool Parameter",
		category: "VALIDATION",
		ref: "/docs/errors#nx-mcp-021",
		recoverable: false,
	},
	"NX-MCP-022": {
		code: "NX-MCP-022",
		status: 400,
		message: "Invalid MCP Tool Input Schema",
		category: "VALIDATION",
		ref: "/docs/errors#nx-mcp-022",
		recoverable: false,
	},
	// MCP Server Errors (830-839)
	"NX-MCP-030": {
		code: "NX-MCP-030",
		status: 503,
		message: "MCP Server Unavailable",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-030",
		recoverable: true,
	},
	"NX-MCP-031": {
		code: "NX-MCP-031",
		status: 500,
		message: "MCP Server Initialization Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-031",
		recoverable: true,
	},
	"NX-MCP-032": {
		code: "NX-MCP-032",
		status: 500,
		message: "MCP Tool Registration Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-032",
		recoverable: true,
	},
	// Legacy numeric codes for backward compatibility
	"NX-800": {
		code: "NX-800",
		status: 500,
		message: "MCP Tool Execution Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-001",
		recoverable: true,
	},
	"NX-801": {
		code: "NX-801",
		status: 404,
		message: "MCP Tool Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-mcp-010",
		recoverable: false,
	},
	"NX-802": {
		code: "NX-802",
		status: 400,
		message: "Invalid MCP Tool Arguments",
		category: "VALIDATION",
		ref: "/docs/errors#nx-mcp-020",
		recoverable: false,
	},
	"NX-803": {
		code: "NX-803",
		status: 503,
		message: "MCP Server Unavailable",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-030",
		recoverable: true,
	},
	"NX-804": {
		code: "NX-804",
		status: 500,
		message: "MCP Tool Initialization Failed",
		category: "GENERAL",
		ref: "/docs/errors#nx-mcp-003",
		recoverable: true,
	},

	// ============ Alert Notification Errors (9xx) ============
	"NX-900": {
		code: "NX-900",
		status: 500,
		message: "Alert Notification Failed",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-900",
		recoverable: true,
	},
	"NX-901": {
		code: "NX-901",
		status: 400,
		message: "Invalid Alert Payload",
		category: "VALIDATION",
		ref: "/docs/errors#nx-901",
		recoverable: false,
	},
	"NX-902": {
		code: "NX-902",
		status: 404,
		message: "Alert Not Found",
		category: "RESOURCE",
		ref: "/docs/errors#nx-902",
		recoverable: false,
	},
	"NX-903": {
		code: "NX-903",
		status: 503,
		message: "Notification Service Unavailable",
		category: "EXTERNAL",
		ref: "/docs/errors#nx-903",
		recoverable: true,
	},
};

/**
 * NEXUS API Error
 * Typed error with code, reference, and metadata
 */
export class NexusError extends Error {
	readonly code: string;
	readonly status: number;
	readonly category: ErrorCategory;
	readonly ref: string;
	readonly recoverable: boolean;
	readonly details?: Record<string, unknown>;
	readonly timestamp: string;

	constructor(
		code: keyof typeof ERROR_REGISTRY | string,
		details?: Record<string, unknown>,
		originalError?: Error,
	) {
		const def = ERROR_REGISTRY[code] ?? ERROR_REGISTRY["NX-000"];

		super((details?.message as string) ?? def.message);
		this.name = "NexusError";
		this.code = def.code;
		this.status = def.status;
		this.category = def.category;
		this.ref = def.ref;
		this.recoverable = def.recoverable;
		this.details = details;
		this.timestamp = new Date().toISOString();

		// Preserve original stack if available
		if (originalError?.stack) {
			this.stack = originalError.stack;
		}
	}

	/**
	 * Convert to JSON response format
	 */
	toJSON() {
		return {
			error: true,
			code: this.code,
			status: this.status,
			message: this.message,
			category: this.category,
			ref: this.ref,
			recoverable: this.recoverable,
			timestamp: this.timestamp,
			...(this.details && { details: this.details }),
		};
	}
}

/**
 * Helper to create typed errors
 */
export function createError(
	code: keyof typeof ERROR_REGISTRY,
	details?: Record<string, unknown>,
	originalError?: Error,
): NexusError {
	return new NexusError(code, details, originalError);
}

/**
 * Helper to wrap unknown errors
 */
export function wrapError(error: unknown, fallbackCode = "NX-000"): NexusError {
	if (error instanceof NexusError) {
		return error;
	}

	if (error instanceof Error) {
		return new NexusError(
			fallbackCode,
			{ originalMessage: error.message },
			error,
		);
	}

	return new NexusError(fallbackCode, { originalError: String(error) });
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
	if (error instanceof NexusError) {
		return error.recoverable;
	}
	return false;
}

/**
 * Get error by HTTP status code
 */
export function getErrorByStatus(status: number): ErrorDefinition | undefined {
	return Object.values(ERROR_REGISTRY).find((e) => e.status === status);
}

/**
 * Get all errors in a category
 */
export function getErrorsByCategory(
	category: ErrorCategory,
): ErrorDefinition[] {
	return Object.values(ERROR_REGISTRY).filter((e) => e.category === category);
}
