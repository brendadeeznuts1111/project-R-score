#!/usr/bin/env bun

/**
 * Profile Terminal Launcher with AsyncLocalStorage Context
 *
 * Launches Bun.Terminal with implicit context propagation for:
 * - Profile metadata (name, team, role, tier)
 * - R2 bucket streaming
 * - Inlined public environment variables
 *
 * @module team/profile-terminal
 * @tier 1380-OMEGA
 * @requires bun >=1.3.7 (for Bun.Terminal + AsyncLocalStorage fix)
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import {
	createR2BatchStreamer,
	getInlinedPublicEnv,
	getTerminalContext,
	registerSession,
	requireTerminalContext,
	streamToR2,
	type TerminalContext,
	terminalStorage,
	unregisterSession,
} from "./terminal-context.ts";
import { ROLE_TIER_MAP, type TeamRole } from "./types.ts";

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

interface LaunchOptions {
	profileName: string;
	teamId: string;
	role: TeamRole;
	email?: string;
	r2Bucket?: R2Bucket;
	env?: Record<string, string>;
	cols?: number;
	rows?: number;
	shell?: string;
	shellArgs?: string[];
	/** Enable R2 streaming for audit logs */
	enableR2Streaming?: boolean;
	/** Flush interval for R2 batch uploads (ms) */
	r2FlushInterval?: number;
}

interface LaunchResult {
	sessionId: string;
	exitCode: number;
	duration: number;
	bytesStreamed: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terminal Launcher
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Launch a profile-aware terminal with AsyncLocalStorage context.
 *
 * This function wraps Bun.Terminal creation inside AsyncLocalStorage.run(),
 * enabling implicit context access in all callbacks. The Bun v1.3.7+ fix
 * ensures Terminal callbacks (data, exit, drain) fire correctly.
 *
 * @example
 * ```typescript
 * const result = await launchProfileTerminal({
 *   profileName: "omega-prod",
 *   teamId: "platform",
 *   role: "admin",
 *   r2Bucket: env.PROFILES_BUCKET,
 *   enableR2Streaming: true,
 * });
 * ```
 */
export async function launchProfileTerminal(
	options: LaunchOptions,
): Promise<LaunchResult> {
	const sessionId = crypto.randomUUID();
	const publicEnv = getInlinedPublicEnv();
	const tier = ROLE_TIER_MAP[options.role] ?? 1380;

	// Build terminal context
	const context: TerminalContext = {
		profileName: options.profileName,
		teamId: options.teamId,
		role: options.role,
		tier,
		r2Bucket: options.r2Bucket,
		publicEnv: { ...publicEnv, ...options.env },
		sessionId,
		cols: options.cols ?? parseInt(publicEnv.TERMINAL_COLUMNS),
		rows: options.rows ?? parseInt(publicEnv.TERMINAL_ROWS),
		createdAt: Date.now(),
	};

	// Run terminal inside AsyncLocalStorage context
	return terminalStorage.run(context, async () => {
		return runTerminalSession(options, context, sessionId);
	});
}

async function runTerminalSession(
	options: LaunchOptions,
	context: TerminalContext,
	sessionId: string,
): Promise<LaunchResult> {
	const startTime = Date.now();
	let bytesStreamed = 0;

	// Initialize R2 batch streamer if enabled
	const r2Streamer =
		options.enableR2Streaming && context.r2Bucket
			? createR2BatchStreamer(options.r2FlushInterval ?? 5000)
			: null;

	// Theme based on role/tier
	const theme = getRoleTheme(context.role, context.tier);

	// Terminal instance reference
	let terminal: any;

	try {
		// Create terminal WITHIN AsyncLocalStorage context
		// This is the pattern enabled by Bun v1.3.7 fix
		terminal = new Bun.Terminal({
			cols: context.cols,
			rows: context.rows,

			// Data callback - has access to terminalStorage.getStore()
			data: async (_term, data: Uint8Array) => {
				// Access context implicitly via AsyncLocalStorage
				const ctx = requireTerminalContext();

				bytesStreamed += data.length;

				// Apply role-based theming to output
				const themedData = applyTheme(data, theme);
				process.stdout.write(themedData);

				// Stream to R2 if enabled
				if (r2Streamer) {
					r2Streamer.write(data);
				}

				// Audit logging for high-tier roles
				if (ctx.tier >= 1380 && ctx.publicEnv.ENABLE_R2_AUDIT === "true") {
					await auditLog(ctx, "data", { bytes: data.length });
				}
			},

			// Exit callback - also has context access
			exit: (_term, code: number) => {
				const ctx = requireTerminalContext();
				console.log(
					`\n${theme.dim}[${ctx.profileName}]${theme.reset} ` +
						`Session ${ctx.sessionId.slice(0, 8)} exited with code ${code}`,
				);
			},

			// Drain callback - context available
			drain: () => {
				const ctx = getTerminalContext();
				if (ctx && ctx.tier >= 1380) {
					console.log(`${theme.dim}[drain]${theme.reset} Buffer flushed`);
				}
			},
		});

		// Prepare environment with inlined public vars
		const shellEnv = {
			...Bun.env,
			...context.publicEnv,
			// Terminal session identifiers
			TERMINAL_SESSION_ID: sessionId,
			TERMINAL_PROFILE: context.profileName,
			TERMINAL_TEAM: context.teamId,
			TERMINAL_ROLE: context.role,
			TERMINAL_TIER: String(context.tier),
			// Shell config
			TERM: "xterm-256color",
			COLORTERM: "truecolor",
			// Theme
			PS1: `${theme.color}[${context.role}:${context.tier}]${theme.reset} \\W \\$ `,
		};

		// Spawn shell with stdio piped
		const shell = options.shell ?? Bun.env.SHELL ?? "/bin/zsh";
		const shellArgs = options.shellArgs ?? ["-l"];

		const proc = Bun.spawn([shell, ...shellArgs], {
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
			env: shellEnv,
		});

		// Note: Full PTY integration with Bun.Terminal requires additional
		// piping logic. This simplified version inherits stdio directly.
		// The AsyncLocalStorage context is still available in callbacks.

		// Register session for tracking
		registerSession(sessionId, {
			context,
			terminal,
			proc,
			startTime,
		});

		// Wait for shell to exit
		const exitCode = await proc.exited;

		// Cleanup
		if (r2Streamer) {
			await r2Streamer.close();
		}
		unregisterSession(sessionId);

		// Final audit log
		await auditLog(context, "session_end", {
			exitCode,
			duration: Date.now() - startTime,
			bytesStreamed,
		});

		return {
			sessionId,
			exitCode,
			duration: Date.now() - startTime,
			bytesStreamed,
		};
	} catch (error) {
		// Ensure cleanup on error
		if (r2Streamer) {
			await r2Streamer.close().catch(() => {});
		}
		unregisterSession(sessionId);
		throw error;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Theming
// ═══════════════════════════════════════════════════════════════════════════

interface RoleTheme {
	color: string;
	dim: string;
	reset: string;
	prefix: string;
}

const ANSI = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	orange: "\x1b[38;2;255;107;53m",
};

function getRoleTheme(role: string, tier: number): RoleTheme {
	// Tier-based coloring (higher = more vibrant)
	if (tier >= 1380) {
		return {
			color: ANSI.orange,
			dim: ANSI.dim,
			reset: ANSI.reset,
			prefix: "[OMEGA]",
		};
	}
	if (tier >= 1000) {
		return {
			color: ANSI.magenta,
			dim: ANSI.dim,
			reset: ANSI.reset,
			prefix: "[ALPHA]",
		};
	}

	// Role-based fallback
	const roleColors: Record<string, string> = {
		admin: ANSI.red,
		moderator: ANSI.yellow,
		member: ANSI.green,
		viewer: ANSI.blue,
	};

	return {
		color: roleColors[role] ?? ANSI.cyan,
		dim: ANSI.dim,
		reset: ANSI.reset,
		prefix: `[${role.toUpperCase()}]`,
	};
}

function applyTheme(data: Uint8Array, theme: RoleTheme): Uint8Array {
	// For now, pass through raw data
	// Future: Apply role-based color injection to prompt lines
	return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

async function auditLog(
	ctx: TerminalContext,
	event: string,
	data: Record<string, unknown>,
): Promise<void> {
	if (!ctx.r2Bucket || ctx.publicEnv.ENABLE_R2_AUDIT !== "true") {
		return;
	}

	const logEntry = {
		timestamp: new Date().toISOString(),
		sessionId: ctx.sessionId,
		profileName: ctx.profileName,
		teamId: ctx.teamId,
		role: ctx.role,
		tier: ctx.tier,
		event,
		data,
	};

	try {
		await streamToR2(JSON.stringify(logEntry) + "\n", {
			suffix: "audit.jsonl",
			contentType: "application/x-ndjson",
		});
	} catch (err) {
		// Audit failures shouldn't break the terminal
		console.error("Audit log failed:", err);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Integration
// ═══════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "launch": {
			const profileName = args[1] ?? "default";
			const teamId = args[2] ?? "test";
			const role = (args[3] ?? "member") as TeamRole;

			console.log(`🚀 Launching terminal for ${profileName}...`);
			console.log(`   Team: ${teamId}, Role: ${role}`);

			const result = await launchProfileTerminal({
				profileName,
				teamId,
				role,
				enableR2Streaming: false, // CLI mode - no R2
			});

			console.log(`\n✅ Session complete: ${result.sessionId.slice(0, 8)}`);
			console.log(`   Duration: ${result.duration}ms`);
			console.log(`   Bytes: ${result.bytesStreamed}`);
			process.exit(result.exitCode);
		}

		default: {
			console.log("Usage: bun core/team/profile-terminal.ts <command>");
			console.log("");
			console.log("Commands:");
			console.log("  launch <profile> <team> <role>  Launch profile terminal");
			console.log("");
			console.log("Examples:");
			console.log(
				"  bun core/team/profile-terminal.ts launch omega-prod platform admin",
			);
		}
	}
}
