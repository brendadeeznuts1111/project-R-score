/**
 * @fileoverview Bun-Native Utilities
 * @description Zero-dependency utilities using Bun's built-in APIs
 * @module utils/bun-native
 * 
 * Replaces external dependencies with Bun-native alternatives:
 * - js-yaml → Bun.file().yaml() / Bun.YAML.parse()
 * - dotenv → Bun.env (auto-loaded)
 * - fs-extra → Bun.file().* / Bun.write() / Bun.glob()
 * - crypto-js → crypto.subtle (Web Crypto API)
 * - rimraf → Bun.file().delete() / Bun.glob()
 */

/**
 * Load YAML config file (zero-dependency)
 * Uses Bun.file().yaml() directly if available, falls back to Bun.YAML.parse()
 */
export async function loadYAMLConfig<T = any>(path: string): Promise<T | null> {
	try {
		const file = Bun.file(path);
		if (!(await file.exists())) {
			return null;
		}
		// Try Bun.file().yaml() first - fastest, zero-dependency method (Bun 1.3+)
		if (typeof file.yaml === "function") {
			return await file.yaml<T>();
		}
		// Fallback to Bun.YAML.parse() with file.text()
		const text = await file.text();
		return Bun.YAML.parse(text) as T;
	} catch (error) {
		console.error(`Failed to load YAML config from ${path}:`, error);
		return null;
	}
}

/**
 * Write YAML config file (zero-dependency)
 */
export async function writeYAMLConfig(path: string, data: any): Promise<void> {
	try {
		const yamlString = Bun.YAML.stringify(data);
		await Bun.write(path, yamlString);
	} catch (error) {
		throw new Error(`Failed to write YAML config to ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Zero-dependency environment validator
 * Validates and parses environment variables with schema
 */
export function createEnvValidator<T extends Record<string, (v?: string) => any>>(
	schema: T,
): Record<keyof T, ReturnType<T[keyof T]>> {
	return Object.fromEntries(
		Object.entries(schema).map(([key, parse]) => [
			key,
			parse(Bun.env[key]),
		]),
	) as Record<keyof T, ReturnType<T[keyof T]>>;
}

/**
 * Check if database file exists and has content (zero-dependency)
 * Uses Bun.file().size instead of fs.stat
 */
export async function databaseExists(dbPath: string): Promise<boolean> {
	try {
		const dbFile = Bun.file(dbPath);
		if (!(await dbFile.exists())) {
			return false;
		}
		// Check if file has content (size > 0)
		return dbFile.size > 0;
	} catch {
		return false;
	}
}

/**
 * Initialize database if it doesn't exist (zero-dependency)
 */
export async function initializeDatabaseIfNeeded(
	dbPath: string,
	schema: string,
): Promise<boolean> {
	const { Database } = await import("bun:sqlite");
	const dbFile = Bun.file(dbPath);
	
	// Check if database exists and has content
	if (await dbFile.exists() && dbFile.size > 0) {
		return false; // Already exists
	}

	// Create database with schema
	const db = new Database(dbPath, { create: true });
	db.exec(schema);
	db.close();
	
	return true; // Created
}

/**
 * Delete files matching glob pattern (zero-dependency)
 * Replaces rimraf with Bun.Glob
 */
export async function deleteFilesByGlob(pattern: string): Promise<number> {
	let deleted = 0;
	const glob = new Bun.Glob(pattern);
	for await (const file of glob.scan(".")) {
		try {
			await Bun.file(file).delete();
			deleted++;
		} catch (error) {
			console.warn(`Failed to delete ${file}:`, error);
		}
	}
	return deleted;
}

/**
 * Generate HMAC signature using Web Crypto API (zero-dependency)
 * Replaces crypto-js with crypto.subtle
 */
export async function signHMAC(
	secret: string,
	payload: string,
	algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: algorithm },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);

	// Convert to hex string
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generate hash using Web Crypto API (zero-dependency)
 */
export async function hashString(
	data: string,
	algorithm: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
): Promise<string> {
	const hashBuffer = await crypto.subtle.digest(
		algorithm,
		new TextEncoder().encode(data),
	);

	return Array.from(new Uint8Array(hashBuffer) as Uint8Array)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generate ETag from content (zero-dependency)
 */
export async function generateETag(content: string | Uint8Array): Promise<string> {
	const data = typeof content === "string" 
		? new TextEncoder().encode(content)
		: content;
	
	const hash = await crypto.subtle.digest("SHA-256", data as BufferSource);
	const hashArray = Array.from(new Uint8Array(hash) as Uint8Array);
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	
	// ETag format: "hash-length"
	return `"${hashHex.substring(0, 16)}-${data.length}"`;
}

/**
 * Hot-reloadable YAML config (for --hot mode)
 * Import this module to get live-reloading config
 * Uses Bun.file().yaml() directly for optimal performance
 */
export async function createHotConfig<T = any>(path: string): Promise<T> {
	const file = Bun.file(path);
	// Use Bun.file().yaml() directly if available (Bun 1.3+)
	if (typeof file.yaml === "function") {
		return await file.yaml<T>();
	}
	// Fallback to Bun.YAML.parse() with file.text()
	const text = await file.text();
	return Bun.YAML.parse(text) as T;
}
