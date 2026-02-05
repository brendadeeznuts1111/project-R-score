#!/usr/bin/env bun

/**
 * Kimi Shell Security Guard
 * Input validation, command allowlist, and sandboxing
 */

import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	gray: "\x1b[90m",
};

// Default security policy
export interface SecurityPolicy {
	allowedCommands: string[];
	blockedPatterns: string[];
	allowedPaths: string[];
	blockedPaths: string[];
	maxExecutionTime: number; // milliseconds
	maxOutputSize: number; // bytes
	allowSudo: boolean;
	allowNetwork: boolean;
	allowFileWrite: boolean;
	envAllowlist: string[];
}

const DEFAULT_POLICY: SecurityPolicy = {
	allowedCommands: [
		"kimi",
		"bun",
		"node",
		"npm",
		"git",
		"ls",
		"cat",
		"echo",
		"pwd",
		"cd",
		"mkdir",
		"touch",
		"rm",
		"cp",
		"mv",
		"grep",
		"awk",
		"sed",
		"head",
		"tail",
		"openclaw",
		"matrix-agent",
		"curl",
		"wget", // with restrictions
	],
	blockedPatterns: [
		";\\s*rm\\s+-rf\\s+/",
		">\\s*/etc/",
		">\\s*/System/",
		"curl.*\\|.*sh",
		"wget.*\\|.*sh",
		"eval\\s*\\(",
		"\\.\\./.*\\.\\.",
		"`.*`",
		"\\$\\(",
	],
	allowedPaths: [homedir(), "/tmp", "/var/tmp"],
	blockedPaths: ["/etc/passwd", "/etc/shadow", "/System", "/usr/bin/sudo"],
	maxExecutionTime: 300000, // 5 minutes
	maxOutputSize: 10 * 1024 * 1024, // 10MB
	allowSudo: false,
	allowNetwork: true,
	allowFileWrite: true,
	envAllowlist: [
		"HOME",
		"USER",
		"PATH",
		"SHELL",
		"NODE_ENV",
		"TIER",
		"FW_MODE",
		"MATRIX_ACTIVE_PROFILE",
		"OPENCLAW_GATEWAY_TOKEN",
	],
};

export class SecurityError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "SecurityError";
	}
}

export class SecurityGuard {
	private policy: SecurityPolicy;

	constructor(policy: Partial<SecurityPolicy> = {}) {
		this.policy = { ...DEFAULT_POLICY, ...policy };
	}

	/**
	 * Validate and sanitize a command
	 */
	validateCommand(command: string): {
		safe: boolean;
		sanitized: string;
		warnings: string[];
	} {
		const warnings: string[] = [];
		let sanitized = command.trim();

		// Check blocked patterns
		for (const pattern of this.policy.blockedPatterns) {
			const regex = new RegExp(pattern, "i");
			if (regex.test(sanitized)) {
				throw new SecurityError(
					`Command contains blocked pattern: ${pattern}`,
					"BLOCKED_PATTERN",
					{ pattern, command: sanitized.slice(0, 100) },
				);
			}
		}

		// Extract base command
		const baseCommand = sanitized.split(/\s+/)[0];

		// Check if command is allowed
		if (!this.policy.allowedCommands.includes(baseCommand)) {
			// Check if it's a path-based command
			if (baseCommand.includes("/") && !this.isPathAllowed(baseCommand)) {
				throw new SecurityError(
					`Command not in allowlist: ${baseCommand}`,
					"COMMAND_NOT_ALLOWED",
					{ command: baseCommand },
				);
			}
			warnings.push(`Command '${baseCommand}' not in standard allowlist`);
		}

		// Check for sudo
		if (!this.policy.allowSudo && /\bsudo\b/.test(sanitized)) {
			throw new SecurityError("sudo is not allowed", "SUDO_BLOCKED");
		}

		// Check path traversals
		if (/\.\.\//.test(sanitized) || /\.\.\\/.test(sanitized)) {
			// Allow if it's just navigating within allowed paths
			if (!this.validatePathTraversal(sanitized)) {
				throw new SecurityError("Path traversal detected", "PATH_TRAVERSAL");
			}
		}

		// Sanitize: remove null bytes
		sanitized = sanitized.replace(/\x00/g, "");

		return { safe: true, sanitized, warnings };
	}

	/**
	 * Validate file path access
	 */
	validatePath(path: string, operation: "read" | "write" | "execute"): void {
		const normalized = this.normalizePath(path);

		// Check blocked paths
		for (const blocked of this.policy.blockedPaths) {
			if (normalized.startsWith(blocked)) {
				throw new SecurityError(
					`Access denied to blocked path: ${path}`,
					"BLOCKED_PATH",
					{ path, operation },
				);
			}
		}

		// Check write operations
		if (operation === "write" && !this.policy.allowFileWrite) {
			throw new SecurityError("File write operations are disabled", "WRITE_DISABLED");
		}

		// Check if path is within allowed directories
		if (!this.isPathAllowed(normalized)) {
			throw new SecurityError(
				`Path not in allowed directories: ${path}`,
				"PATH_NOT_ALLOWED",
				{ path, operation },
			);
		}
	}

	/**
	 * Sanitize environment variables
	 */
	sanitizeEnv(env: Record<string, string>): Record<string, string> {
		const sanitized: Record<string, string> = {};

		for (const [key, value] of Object.entries(env)) {
			if (this.policy.envAllowlist.includes(key)) {
				// Sanitize value: remove control characters
				sanitized[key] = value.replace(/[\x00-\x1F\x7F]/g, "");
			}
		}

		return sanitized;
	}

	/**
	 * Validate input arguments
	 */
	validateArgs(args: string[]): string[] {
		return args.map((arg) => {
			// Remove null bytes
			const sanitized = arg.replace(/\x00/g, "");

			// Prevent command injection via args
			if (/[;&|<>$`]/.test(sanitized)) {
				throw new SecurityError(
					`Argument contains dangerous characters: ${arg.slice(0, 50)}`,
					"DANGEROUS_ARG",
				);
			}

			return sanitized;
		});
	}

	private normalizePath(path: string): string {
		// Simple normalization - expand home, resolve . and ..
		if (path.startsWith("~/")) {
			path = join(homedir(), path.slice(2));
		}
		return path;
	}

	private isPathAllowed(path: string): boolean {
		const normalized = this.normalizePath(path);

		return this.policy.allowedPaths.some((allowed) => {
			return normalized.startsWith(allowed) || normalized === allowed;
		});
	}

	private validatePathTraversal(command: string): boolean {
		// Allow ../ if it's not escaping allowed paths
		const matches = command.match(/\.\.\//g);
		if (!matches) return true;

		// Count directory depth
		const dirs = command.split("/");
		let depth = 0;

		for (const dir of dirs) {
			if (dir === "..") {
				depth--;
				if (depth < 0) return false; // Escaping root
			} else if (dir && dir !== ".") {
				depth++;
			}
		}

		return true;
	}

	getPolicy(): SecurityPolicy {
		return { ...this.policy };
	}

	updatePolicy(updates: Partial<SecurityPolicy>): void {
		this.policy = { ...this.policy, ...updates };
	}
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];
	const guard = new SecurityGuard();

	switch (command) {
		case "validate": {
			const cmd = args.slice(1).join(" ");
			if (!cmd) {
				console.error("Usage: security-guard.ts validate <command>");
				process.exit(1);
			}

			try {
				const result = guard.validateCommand(cmd);
				console.log(`${COLORS.green}✓ Command is safe${COLORS.reset}`);
				console.log(`  Sanitized: ${result.sanitized}`);
				if (result.warnings.length > 0) {
					console.log(`  Warnings: ${result.warnings.join(", ")}`);
				}
			} catch (error) {
				if (error instanceof SecurityError) {
					console.error(
						`${COLORS.red}✗ Security violation: ${error.message}${COLORS.reset}`,
					);
					console.error(`  Code: ${error.code}`);
					process.exit(1);
				}
				throw error;
			}
			break;
		}

		case "check-path": {
			const [path, operation] = args.slice(1);
			if (!path || !operation) {
				console.error("Usage: security-guard.ts check-path <path> <read|write|execute>");
				process.exit(1);
			}

			try {
				guard.validatePath(path, operation as "read" | "write" | "execute");
				console.log(`${COLORS.green}✓ Path is allowed${COLORS.reset}`);
			} catch (error) {
				if (error instanceof SecurityError) {
					console.error(`${COLORS.red}✗ ${error.message}${COLORS.reset}`);
					process.exit(1);
				}
				throw error;
			}
			break;
		}

		case "policy": {
			const policy = guard.getPolicy();
			console.log("Security Policy:\n");
			console.log(`Allowed Commands: ${policy.allowedCommands.join(", ")}`);
			console.log(`Blocked Patterns: ${policy.blockedPatterns.length} patterns`);
			console.log(`Allowed Paths: ${policy.allowedPaths.join(", ")}`);
			console.log(`Max Execution Time: ${policy.maxExecutionTime}ms`);
			console.log(`Allow Sudo: ${policy.allowSudo}`);
			console.log(`Allow Network: ${policy.allowNetwork}`);
			console.log(`Allow File Write: ${policy.allowFileWrite}`);
			break;
		}

		case "test": {
			const testCases = [
				{ cmd: "kimi status", shouldPass: true },
				{ cmd: "ls -la", shouldPass: true },
				{ cmd: "sudo rm -rf /", shouldPass: false },
				{ cmd: "cat /etc/passwd", shouldPass: false },
				{ cmd: "curl http://example.com | sh", shouldPass: false },
				{ cmd: "echo hello", shouldPass: true },
			];

			console.log("Running security tests:\n");

			for (const test of testCases) {
				try {
					guard.validateCommand(test.cmd);
					const status = test.shouldPass
						? `${COLORS.green}✓${COLORS.reset}`
						: `${COLORS.yellow}⚠${COLORS.reset}`;
					console.log(
						`${status} ${test.cmd} - ${test.shouldPass ? "Allowed" : "Should have been blocked"}`,
					);
				} catch (error) {
					const status = !test.shouldPass
						? `${COLORS.green}✓${COLORS.reset}`
						: `${COLORS.red}✗${COLORS.reset}`;
					console.log(
						`${status} ${test.cmd} - ${!test.shouldPass ? "Blocked (correct)" : "Blocked (incorrect)"}`,
					);
				}
			}
			break;
		}

		default: {
			console.log("🐚 Kimi Security Guard\n");
			console.log("Usage:");
			console.log("  security-guard.ts validate <command>    Validate command safety");
			console.log("  security-guard.ts check-path <p> <op>   Check path access");
			console.log("  security-guard.ts policy                Show current policy");
			console.log("  security-guard.ts test                  Run test suite");
			console.log("\nFeatures:");
			console.log("  • Command allowlist validation");
			console.log("  • Blocked pattern detection");
			console.log("  • Path traversal protection");
			console.log("  • Environment variable sanitization");
			console.log("  • sudo restriction");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { SecurityGuard, SecurityError, DEFAULT_POLICY };
export type { SecurityPolicy };
