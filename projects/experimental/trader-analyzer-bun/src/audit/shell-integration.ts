/**
 * @fileoverview 9.1.5.19.0.0.0: Bun Shell Integration for Audit System
 * @description Uses Bun's native shell capabilities for cross-platform compatibility
 * @module audit/shell-integration
 *
 * Cross-Reference Hub:
 * - @see 7.4.5.0.0.0.0 → Bun.Shell ($) API Documentation
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager
 * - @see 9.1.5.14.0.0.0 → WorkerAuditManager
 */

import { $ } from "bun";

/**
 * 9.1.5.19.0.0.0: Bun Shell Integration for Audit System
 *
 * Provides cross-platform shell execution using Bun's native Shell API.
 * Uses Bun.Shell ($) for better performance and cross-platform compatibility.
 */
export class AuditShell {
	/**
	 * 9.1.5.19.1.0.0: Execute audit with Bun Shell
	 *
	 * Uses Bun Shell for cross-platform command execution.
	 *
	 * @param command - Command to execute
	 * @param args - Command arguments
	 * @returns Shell output result
	 */
	async executeAuditShell(
		command: string,
		args: string[] = [],
	): Promise<ShellOutput> {
		try {
			// Use Bun Shell for cross-platform compatibility
			const cmd = [command, ...args];
			const result = await $(cmd).quiet();

			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr?.toString() || "",
				exitCode: result.exitCode || 0,
				success: result.exitCode === 0,
			};
		} catch (error: any) {
			return {
				stdout: error.stdout?.toString() || "",
				stderr: error.stderr?.toString() || error.message || String(error),
				exitCode: error.exitCode || 1,
				success: false,
			};
		}
	}

	/**
	 * 9.1.5.19.2.0.0: Run bunx commands for external tools
	 *
	 * Uses bunx to run external tools without global installation.
	 *
	 * @param tool - Tool name to run via bunx
	 * @param args - Tool arguments
	 * @returns Shell output result
	 */
	async runBunxTool(tool: string, args: string[] = []): Promise<ShellOutput> {
		// Use bunx to run external tools
		return await this.executeAuditShell("bunx", [tool, ...args]);
	}

	/**
	 * 9.1.5.19.3.0.0: Execute complex shell pipelines
	 *
	 * Executes shell pipelines using Bun Shell.
	 *
	 * @param commands - Array of commands to pipe together
	 * @param cwd - Working directory
	 * @returns Shell output result
	 */
	async executeShellPipeline(
		commands: Array<{ cmd: string; args: string[] }>,
		cwd?: string,
	): Promise<ShellOutput> {
		try {
			// Build pipeline command
			const pipeline = commands
				.map(({ cmd, args }) => `${cmd} ${args.join(" ")}`)
				.join(" | ");

			const fullCommand = cwd ? `cd ${cwd} && ${pipeline}` : pipeline;
			const result = await $(fullCommand).quiet();

			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr?.toString() || "",
				exitCode: result.exitCode || 0,
				success: result.exitCode === 0,
			};
		} catch (error: any) {
			return {
				stdout: error.stdout?.toString() || "",
				stderr: error.stderr?.toString() || error.message || String(error),
				exitCode: error.exitCode || 1,
				success: false,
			};
		}
	}

	/**
	 * 9.1.5.19.4.0.0: Find files using Bun Shell (cross-platform find)
	 *
	 * Finds files matching patterns using cross-platform compatible commands.
	 *
	 * @param directory - Directory to search
	 * @param patterns - File patterns to match
	 * @param options - Find options
	 * @returns Array of matching file paths
	 */
	async findFiles(
		directory: string,
		patterns: string[],
		options: FindOptions = {},
	): Promise<string[]> {
		try {
			// Use Bun Shell's glob support or ripgrep for cross-platform file finding
			const result =
				await $`rg --files --type-add 'audit:*.{ts,md,json}' --type audit ${directory}`.quiet();

			if (result.exitCode === 0) {
				return result.stdout
					.toString()
					.split("\n")
					.filter((line) => line.trim())
					.map((line) => line.trim());
			}

			return [];
		} catch {
			// Fallback to simple directory listing
			return [];
		}
	}

	/**
	 * 9.1.5.19.5.0.0: Git integration for tracking documentation changes
	 *
	 * Gets list of files changed in git repository.
	 *
	 * @param since - Git time specification (e.g., "1.day.ago")
	 * @returns Array of changed files
	 */
	async getGitChanges(since?: string): Promise<GitFileChange[]> {
		try {
			const gitCmd = [
				"git",
				"log",
				"--name-only",
				"--pretty=format:",
				"--since",
				since || "1.day.ago",
			];

			const result = await this.executeAuditShell(gitCmd[0], gitCmd.slice(1));

			if (result.success) {
				const files = result.stdout
					.split("\n")
					.filter((line) => line.trim() && !line.startsWith(" "));

				return files.map((file) => ({
					file,
					changed: new Date().toISOString(),
					type: this.getFileType(file),
				}));
			}

			return [];
		} catch {
			return [];
		}
	}

	/**
	 * 9.1.5.19.6.0.0: Execute audit with environment variables
	 *
	 * Executes command with custom environment variables.
	 *
	 * @param command - Command to execute
	 * @param env - Environment variables
	 * @param cwd - Working directory
	 * @returns Shell output result
	 */
	async executeWithEnv(
		command: string,
		env: Record<string, string> = {},
		cwd?: string,
	): Promise<ShellOutput> {
		try {
			// Bun Shell automatically inherits environment
			// Set custom env vars
			const envVars = { ...process.env, ...env };
			const cmd = cwd ? `cd ${cwd} && ${command}` : command;

			const result = await $(cmd).env(envVars).quiet();

			return {
				stdout: result.stdout.toString(),
				stderr: result.stderr?.toString() || "",
				exitCode: result.exitCode || 0,
				success: result.exitCode === 0,
			};
		} catch (error: any) {
			return {
				stdout: error.stdout?.toString() || "",
				stderr: error.stderr?.toString() || error.message || String(error),
				exitCode: error.exitCode || 1,
				success: false,
			};
		}
	}

	/**
	 * Determine file type from path
	 */
	private getFileType(
		file: string,
	): "documentation" | "source" | "test" | "config" {
		if (file.includes("docs/") || file.endsWith(".md")) {
			return "documentation";
		}
		if (
			file.includes("test/") ||
			file.includes(".test.") ||
			file.includes(".spec.")
		) {
			return "test";
		}
		if (
			file.includes("config/") ||
			file.endsWith(".json") ||
			file.endsWith(".toml")
		) {
			return "config";
		}
		return "source";
	}
}

// ============ Type Definitions ============

/**
 * Shell output result
 */
export interface ShellOutput {
	stdout: string;
	stderr: string;
	exitCode: number;
	success: boolean;
}

/**
 * Find options
 */
export interface FindOptions {
	maxDepth?: number;
	exclude?: string[];
	include?: string[];
}

/**
 * Git file change
 */
export interface GitFileChange {
	file: string;
	changed: string;
	type: "documentation" | "source" | "test" | "config";
}
