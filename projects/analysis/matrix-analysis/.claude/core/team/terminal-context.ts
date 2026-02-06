#!/usr/bin/env bun
/**
 * Terminal Context Management with AsyncLocalStorage
 *
 * Provides implicit context propagation for profile terminals,
 * R2 bucket references, and inlined public environment variables.
 *
 * @module team/terminal-context
 * @tier 1380-OMEGA
 * @requires bun >=1.3.7
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { R2Bucket } from "@cloudflare/workers-types";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface TerminalContext {
	/** Profile identifier */
	profileName: string;
	/** Team membership */
	teamId: string;
	/** Role-based tier */
	role: string;
	tier: number;
	/** R2 bucket for streaming logs/artifacts */
	r2Bucket?: R2Bucket;
	/** Public env vars inlined at build time */
	publicEnv: Record<string, string>;
	/** Session tracking */
	sessionId: string;
	/** Terminal dimensions */
	cols: number;
	rows: number;
	/** Creation timestamp */
	createdAt: number;
}

export interface TerminalSession {
	context: TerminalContext;
	terminal: unknown; // Bun.Terminal instance
	proc: ReturnType<typeof import("bun").spawn>;
	startTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// AsyncLocalStorage Instance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Terminal context storage for implicit propagation through async calls.
 *
 * Usage:
 * ```typescript
 * const context = { profileName: "omega", ... };
 * await terminalStorage.run(context, async () => {
 *   // Inside callbacks, access via terminalStorage.getStore()
 *   const ctx = terminalStorage.getStore();
 * });
 * ```
 */
export const terminalStorage = new AsyncLocalStorage<TerminalContext>();

// ═══════════════════════════════════════════════════════════════════════════
// Context Access Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current terminal context from AsyncLocalStorage.
 * Returns null if not inside a terminalStorage.run() block.
 */
export function getTerminalContext(): TerminalContext | null {
	return terminalStorage.getStore() ?? null;
}

/**
 * Require terminal context - throws if not available.
 */
export function requireTerminalContext(): TerminalContext {
	const ctx = getTerminalContext();
	if (!ctx) {
		throw new Error(
			"TerminalContext not available - must be inside terminalStorage.run()",
		);
	}
	return ctx;
}

/**
 * Check if currently inside a terminal context.
 */
export function hasTerminalContext(): boolean {
	return terminalStorage.getStore() !== undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// R2 Streaming Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stream data to R2 with automatic session metadata.
 * Must be called within terminalStorage.run() context.
 */
export async function streamToR2(
	data: Uint8Array | string,
	options?: {
		suffix?: string;
		contentType?: string;
	},
): Promise<void> {
	const ctx = requireTerminalContext();
	if (!ctx.r2Bucket) {
		throw new Error("R2 bucket not configured in terminal context");
	}

	const timestamp = Date.now();
	const suffix = options?.suffix ?? "log";
	const key = `terminal-sessions/${ctx.sessionId}/${timestamp}.${suffix}`;

	const body = typeof data === "string" ? new TextEncoder().encode(data) : data;

	await ctx.r2Bucket.put(key, body, {
		httpMetadata: {
			contentType: options?.contentType ?? "text/plain",
		},
		customMetadata: {
			sessionId: ctx.sessionId,
			profileName: ctx.profileName,
			teamId: ctx.teamId,
			role: ctx.role,
			tier: String(ctx.tier),
			createdAt: String(ctx.createdAt),
		},
	});
}

/**
 * Batch stream chunks for efficient R2 uploads.
 */
export function createR2BatchStreamer(
	flushIntervalMs: number = 5000,
	maxBatchSize: number = 64 * 1024, // 64KB
): {
	write: (data: Uint8Array) => void;
	flush: () => Promise<void>;
	close: () => Promise<void>;
} {
	const chunks: Uint8Array[] = [];
	let currentSize = 0;
	let flushTimer: Timer | null = null;

	const flush = async (): Promise<void> => {
		if (chunks.length === 0) return;

		// Concatenate chunks
		const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
		const batch = new Uint8Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
			batch.set(chunk, offset);
			offset += chunk.length;
		}

		// Clear buffer
		chunks.length = 0;
		currentSize = 0;

		// Upload to R2
		await streamToR2(batch, { suffix: "batch.log" });
	};

	const write = (data: Uint8Array): void => {
		chunks.push(data);
		currentSize += data.length;

		// Schedule flush
		if (!flushTimer) {
			flushTimer = setTimeout(() => {
				flushTimer = null;
				flush().catch(console.error);
			}, flushIntervalMs);
		}

		// Immediate flush if buffer full
		if (currentSize >= maxBatchSize) {
			if (flushTimer) {
				clearTimeout(flushTimer);
				flushTimer = null;
			}
			flush().catch(console.error);
		}
	};

	const close = async (): Promise<void> => {
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		await flush();
	};

	return { write, flush, close };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public Env Inlining
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract public environment variables (inlined at build time).
 * These are safe to expose to the terminal session.
 */
export function getInlinedPublicEnv(): Record<string, string> {
	return {
		// Build-time constants (from bunfig.toml [define])
		ENVIRONMENT: process.env.ENVIRONMENT ?? "development",
		TIER: process.env.TIER ?? "1380",
		PROTOCOL_VERSION: process.env.PROTOCOL_VERSION ?? "3.9",
		MATRIX_VERSION: process.env.MATRIX_VERSION ?? "90",
		API_VERSION: process.env.API_VERSION ?? "v1",
		ARTIFACT_VERSION: process.env.ARTIFACT_VERSION ?? "1.0.0",
		CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",

		// Terminal config
		TERMINAL_COLUMNS: process.env.TERMINAL_COLUMNS ?? "89",
		TERMINAL_ROWS: process.env.TERMINAL_ROWS ?? "24",
		DASHBOARD_THEME: process.env.DASHBOARD_THEME ?? "matrix",

		// Infrastructure
		SUPPORTED_REGIONS: process.env.SUPPORTED_REGIONS ?? "us-east-1,us-west-2",

		// Feature flags
		ENABLE_STREAMING: process.env.ENABLE_STREAMING ?? "true",
		ENABLE_R2_AUDIT: process.env.ENABLE_R2_AUDIT ?? "true",
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Tracking
// ═══════════════════════════════════════════════════════════════════════════

const activeSessions = new Map<string, TerminalSession>();

export function registerSession(sessionId: string, session: TerminalSession): void {
	activeSessions.set(sessionId, session);
}

export function getSession(sessionId: string): TerminalSession | undefined {
	return activeSessions.get(sessionId);
}

export function unregisterSession(sessionId: string): void {
	activeSessions.delete(sessionId);
}

export function getActiveSessions(): TerminalSession[] {
	return Array.from(activeSessions.values());
}

export function getSessionStats(): {
	total: number;
	byTier: Record<number, number>;
	byRole: Record<string, number>;
} {
	const stats = {
		total: activeSessions.size,
		byTier: {} as Record<number, number>,
		byRole: {} as Record<string, number>,
	};

	for (const session of activeSessions.values()) {
		const { tier, role } = session.context;
		stats.byTier[tier] = (stats.byTier[tier] ?? 0) + 1;
		stats.byRole[role] = (stats.byRole[role] ?? 0) + 1;
	}

	return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cleanup on exit
// ═══════════════════════════════════════════════════════════════════════════

async function cleanupSessions(signal: string) {
	console.log(`🛑 ${signal}: Closing ${activeSessions.size} terminal sessions...`);
	for (const [id, session] of activeSessions) {
		try {
			await session.proc.kill();
			unregisterSession(id);
		} catch (err) {
			console.error(`Failed to kill session ${id}:`, err);
		}
	}
}

process.on("SIGTERM", () => cleanupSessions("SIGTERM"));
process.on("SIGINT", async () => {
	await cleanupSessions("SIGINT");
	process.exit(0);
});
