#!/usr/bin/env bun
/**
 * Environment Configuration
 * Supports BUN_SECRETS_DIR and other environment variables
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface EnvConfig {
	/** Directory for secrets storage */
	secretsDir: string;
	/** Default log level */
	logLevel: string;
	/** API base URL */
	apiBaseUrl: string;
	/** Request timeout in ms */
	requestTimeout: number;
	/** Enable HTTP/2 */
	enableHttp2: boolean;
	/** Enable compression */
	enableCompression: boolean;
	/** Max retry attempts */
	maxRetries: number;
	/** Cache directory */
	cacheDir: string;
}

/**
 * Get environment configuration with defaults
 */
export function getEnvConfig(): EnvConfig {
	const homeDir = process.env.HOME || process.env.USERPROFILE || ".";

	return {
		secretsDir: Bun.env.BUN_SECRETS_DIR || join(homeDir, ".bun", "secrets"),
		logLevel: Bun.env.BUN_LOG_LEVEL || "info",
		apiBaseUrl: Bun.env.BUN_API_BASE_URL || "https://api.example.com",
		requestTimeout: parseInt(Bun.env.BUN_REQUEST_TIMEOUT || "30000", 10),
		enableHttp2: Bun.env.BUN_ENABLE_HTTP2 !== "false",
		enableCompression: Bun.env.BUN_ENABLE_COMPRESSION !== "false",
		maxRetries: parseInt(Bun.env.BUN_MAX_RETRIES || "3", 10),
		cacheDir: Bun.env.BUN_CACHE_DIR || join(homeDir, ".bun", "cache"),
	};
}

/**
 * Initialize environment directories
 */
export async function initEnv(): Promise<void> {
	const config = getEnvConfig();

	// Create directories
	await mkdir(config.secretsDir, { recursive: true });
	await mkdir(config.cacheDir, { recursive: true });
}

/**
 * Get secret path within BUN_SECRETS_DIR
 */
export function getSecretPath(service: string, key: string): string {
	const config = getEnvConfig();
	return join(config.secretsDir, service, `${key}.secret`);
}

/**
 * Load environment from .env files
 * Priority: .env.local > .env.{NODE_ENV} > .env
 */
export async function loadEnvFiles(cwd: string = process.cwd()): Promise<void> {
	const envFiles = [
		".env.local",
		`.env.${Bun.env.NODE_ENV || "development"}`,
		".env",
	];

	for (const file of envFiles) {
		const path = join(cwd, file);
		const fileInfo = await Bun.file(path).exists();

		if (fileInfo) {
			const content = await Bun.file(path).text();
			parseEnvContent(content);
			console.log(`📄 Loaded env from ${file}`);
		}
	}
}

function parseEnvContent(content: string): void {
	for (const line of content.split("\n")) {
		const trimmed = line.trim();

		// Skip comments and empty lines
		if (!trimmed || trimmed.startsWith("#")) continue;

		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
		if (match) {
			const [, key, value] = match;
			// Only set if not already in environment
			if (!Bun.env[key]) {
				Bun.env[key] = value.replace(/^["']|["']$/g, "");
			}
		}
	}
}

/**
 * Print environment configuration (sanitized)
 */
export function printEnvConfig(): void {
	const config = getEnvConfig();

	console.log("🔧 Environment Configuration:\n");
	console.log(`  BUN_SECRETS_DIR:      ${config.secretsDir}`);
	console.log(`  BUN_CACHE_DIR:        ${config.cacheDir}`);
	console.log(`  BUN_LOG_LEVEL:        ${config.logLevel}`);
	console.log(`  BUN_API_BASE_URL:     ${config.apiBaseUrl}`);
	console.log(`  BUN_REQUEST_TIMEOUT:  ${config.requestTimeout}ms`);
	console.log(`  BUN_ENABLE_HTTP2:     ${config.enableHttp2}`);
	console.log(`  BUN_ENABLE_COMPRESSION: ${config.enableCompression}`);
	console.log(`  BUN_MAX_RETRIES:      ${config.maxRetries}`);
}

// Run if called directly
if (import.meta.main) {
	const command = process.argv[2];

	switch (command) {
		case "init":
			await initEnv();
			console.log("✅ Environment initialized");
			break;

		case "show":
			printEnvConfig();
			break;

		default:
			console.log(`
Usage: bun run src/utils/env-config.ts [command]

Commands:
  init    Initialize environment directories
  show    Show current configuration

Environment Variables:
  BUN_SECRETS_DIR         Secrets storage directory
  BUN_CACHE_DIR           Cache directory
  BUN_LOG_LEVEL           Log level (debug|info|warn|error)
  BUN_API_BASE_URL        API base URL
  BUN_REQUEST_TIMEOUT     Request timeout in ms
  BUN_ENABLE_HTTP2        Enable HTTP/2 (true|false)
  BUN_ENABLE_COMPRESSION  Enable compression (true|false)
  BUN_MAX_RETRIES         Max retry attempts
`);
	}
}
