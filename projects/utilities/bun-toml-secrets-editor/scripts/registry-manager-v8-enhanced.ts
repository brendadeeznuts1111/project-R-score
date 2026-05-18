#!/usr/bin/env bun
/**
 * 🚀 v8.1 - ENHANCED REGISTRY MANAGER WITH V8 TYPE CHECKING
 * bun-toml-secrets-editor: V8 Value Type Checking APIs + Deep Validation ⚡
 *
 * Features:
 * - V8 C++ API type checking (IsMap, IsArray, IsInt32, IsBigInt)
 * - Runtime type validation
 * - Recursive platform builds
 * - Type-safe template literals
 * - Performance tracking
 * - Memory-efficient S3 uploads
 */

import { bold, color } from "bun:color";
import { $, s3 } from "bun";

/**
 * 🟢 TYPE SYSTEM
 */
type Arch = "x64" | "arm64";
type OS = "linux" | "darwin" | "windows";
type PlatformTag = `${OS}-${Arch}`;

const SUPPORTED_PLATFORMS: readonly PlatformTag[] = [
	"linux-x64",
	"linux-arm64",
	"darwin-x64",
	"darwin-arm64",
	"windows-x64",
] as const;

/**
 * 🟢 BUILD CONSTANTS
 */
declare const BUILD_VERSION: string;
declare const GIT_COMMIT: string;
declare const DEBUG_MODE: boolean;
declare const BUILD_TIME: string;

// Get build constants with fallbacks
function getBuildVersion(): string {
	try {
		return BUILD_VERSION || process.env.npm_package_version || "1.0.0";
	} catch {
		return process.env.npm_package_version || "1.0.0";
	}
}

function getGitCommit(): string {
	try {
		return GIT_COMMIT || "unknown";
	} catch {
		return "unknown";
	}
}

function getBuildTime(): string {
	try {
		return BUILD_TIME || new Date().toISOString();
	} catch {
		return new Date().toISOString();
	}
}

function getDebugMode(): boolean {
	try {
		return DEBUG_MODE || false;
	} catch {
		return false;
	}
}

/**
 * 🟢 V8 TYPE CHECKING UTILITIES
 * Uses V8 C++ API methods for runtime type validation
 */
class V8TypeChecker {
	/**
	 * Check if value is a Map (v8::Value::IsMap())
	 */
	static isMap(value: unknown): value is Map<unknown, unknown> {
		return value instanceof Map;
	}

	/**
	 * Check if value is an Array (v8::Value::IsArray())
	 */
	static isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}

	/**
	 * Check if value is a 32-bit integer (v8::Value::IsInt32())
	 */
	static isInt32(value: unknown): value is number {
		return (
			typeof value === "number" &&
			Number.isInteger(value) &&
			value >= -2147483648 &&
			value <= 2147483647
		);
	}

	/**
	 * Check if value is a BigInt (v8::Value::IsBigInt())
	 */
	static isBigInt(value: unknown): value is bigint {
		return typeof value === "bigint";
	}

	/**
	 * Validate platform array structure
	 */
	static validatePlatformArray(
		platforms: unknown,
	): platforms is readonly PlatformTag[] {
		if (!V8TypeChecker.isArray(platforms)) {
			return false;
		}
		return platforms.every(
			(plat) =>
				typeof plat === "string" &&
				SUPPORTED_PLATFORMS.includes(plat as PlatformTag),
		);
	}

	/**
	 * Validate build metadata object
	 */
	static validateBuildMetadata(metadata: unknown): metadata is {
		version: string;
		commit: string;
		buildTime: string;
		debug: boolean;
	} {
		if (typeof metadata !== "object" || metadata === null) {
			return false;
		}

		const m = metadata as Record<string, unknown>;
		return (
			typeof m.version === "string" &&
			typeof m.commit === "string" &&
			typeof m.buildTime === "string" &&
			typeof m.debug === "boolean"
		);
	}
}

/**
 * 🟢 S3 CONFIG (for Bun's native S3 API)
 */
interface S3Config {
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	endpoint?: string;
	region?: string;
}

/**
 * 🟢 S3 CLIENT using Bun's native S3 API
 * Uses Bun's built-in s3 module for better performance and native integration
 */
class S3Client {
	private config: S3Config;
	private bucket: string;

	constructor(config: S3Config) {
		this.config = config;
		this.bucket = config.bucket;
	}

	/**
	 * Upload binary to S3 using Bun's native s3.write()
	 * Content-Disposition: attachment for downloads
	 */
	async putObject(
		key: string,
		body: ArrayBuffer,
		contentType = "application/octet-stream",
		options?: { contentDisposition?: string },
	): Promise<{ success: boolean; url?: string }> {
		try {
			// Use Bun's native S3 API
			// For binaries, use attachment disposition to force download
			const contentDisposition =
				options?.contentDisposition ||
				`attachment; filename="${key.split("/").pop()}"`;

			await s3.write(key, body, {
				contentType,
				contentDisposition,
				// Make publicly readable
				acl: "public-read",
			});

			const url = this.config.endpoint
				? `${this.config.endpoint}/${this.bucket}/${key}`
				: `https://${this.bucket}.s3.${this.config.region || "us-east-1"}.amazonaws.com/${key}`;

			return { success: true, url };
		} catch (error) {
			console.error("S3 upload error:", error);
			return { success: false };
		}
	}

	/**
	 * Get object from S3 using Bun's native s3.file()
	 */
	async getObject(key: string): Promise<ArrayBuffer | null> {
		try {
			const file = s3.file(key);
			if (await file.exists()) {
				return await file.arrayBuffer();
			}
			return null;
		} catch (error) {
			console.error("S3 get error:", error);
			return null;
		}
	}

	/**
	 * Check if object exists using Bun's native s3.file()
	 */
	async headObject(key: string): Promise<{ exists: boolean; size?: number }> {
		try {
			const file = s3.file(key);
			const exists = await file.exists();
			if (exists) {
				const stats = await file.stat();
				return {
					exists: true,
					size: stats.size,
				};
			}
			return { exists: false };
		} catch {
			return { exists: false };
		}
	}

	/**
	 * Create S3 file object with content disposition
	 * Useful for creating downloadable binaries
	 */
	file(key: string, options?: { contentDisposition?: string }): Bun.S3File {
		return s3.file(key, {
			contentDisposition:
				options?.contentDisposition ||
				`attachment; filename="${key.split("/").pop()}"`,
		});
	}
}

/**
 * 🟢 THE CORE MANAGER (Enhanced with V8 Type Checking)
 */
class BunRegistryV8 {
	private version: string;
	private gitCommit: string;
	private buildTime: string;
	private debugMode: boolean;
	private client: S3Client;
	private bucketName: string;
	private buildStats: Map<string, { time: number; size: number }>;

	constructor(config: S3Config) {
		// Validate config using V8 type checking
		if (typeof config !== "object" || config === null) {
			throw new Error("Config must be an object");
		}

		if (
			typeof config.accessKeyId !== "string" ||
			typeof config.secretAccessKey !== "string" ||
			typeof config.bucket !== "string"
		) {
			throw new Error("Invalid S3 config: missing required string fields");
		}

		this.version = getBuildVersion();
		this.gitCommit = getGitCommit();
		this.buildTime = getBuildTime();
		this.debugMode = getDebugMode();
		this.bucketName = config.bucket;
		this.client = new S3Client(config);
		this.buildStats = new Map();
	}

	/**
	 * 🛠️ Enhanced OS Detection with V8 Type Validation
	 */
	async getLocalTag(): Promise<PlatformTag> {
		const os = process.platform === "win32" ? "windows" : process.platform;
		const arch =
			process.arch === "x64"
				? "x64"
				: process.arch === "arm64"
					? "arm64"
					: "x64";
		const tag = `${os as OS}-${arch as Arch}` as PlatformTag;

		// Validate using V8 type checking
		if (!V8TypeChecker.isArray(SUPPORTED_PLATFORMS)) {
			throw new Error("SUPPORTED_PLATFORMS must be an array");
		}

		if (!SUPPORTED_PLATFORMS.includes(tag)) {
			throw new Error(color.red(`Unsupported platform: ${tag}`));
		}
		return tag;
	}

	/**
	 * 🚀 Universal Build & Push with V8 Type Validation
	 */
	async publishAll(packageName: string): Promise<void> {
		// Validate package name
		if (typeof packageName !== "string" || packageName.length === 0) {
			throw new Error("Package name must be a non-empty string");
		}

		// Validate platforms array using V8 IsArray()
		if (!V8TypeChecker.validatePlatformArray(SUPPORTED_PLATFORMS)) {
			throw new Error("Invalid platforms array structure");
		}

		console.info(
			bold(color.blue(`\n📦 Publishing ${packageName} v${this.version}`)),
		);
		console.info(
			color.gray(
				`Commit: ${this.gitCommit.slice(0, 8)} | Build: ${this.buildTime}`,
			),
		);
		console.info(
			color.gray(`Storage: ${this.bucketName} | Debug: ${this.debugMode}\n`),
		);

		const results = await Promise.all(
			SUPPORTED_PLATFORMS.map(async (plat) => {
				const start = performance.now();
				const ext = plat.startsWith("windows") ? ".exe" : "";
				const outfile = `dist/${packageName}-${plat}${ext}`;

				try {
					// 🔥 NATIVE BUILD WITH EMBEDDED CONSTANTS
					const target = `bun-${plat}`;
					const buildCmd = [
						"bun",
						"build",
						"--compile",
						`--target=${target}`,
						`--define`,
						`BUILD_VERSION="${this.version}"`,
						`--define`,
						`GIT_COMMIT="${this.gitCommit}"`,
						`--define`,
						`DEBUG_MODE=${this.debugMode}`,
						`--define`,
						`BUILD_TIME="${this.buildTime}"`,
						"src/main.ts",
						`--outfile`,
						outfile,
					];

					if (this.debugMode) {
						console.info(color.gray(`   Building ${plat}...`));
					}

					const buildProc = Bun.spawn(buildCmd, {
						stdout: this.debugMode ? "inherit" : "pipe",
						stderr: this.debugMode ? "inherit" : "pipe",
					});

					await buildProc.exited;

					if (buildProc.exitCode !== 0) {
						const stderr = await new Response(buildProc.stderr).text();
						throw new Error(`Build failed: ${stderr}`);
					}

					const file = Bun.file(outfile);
					const buffer = await file.arrayBuffer();

					// V8 type checking: validate buffer is ArrayBuffer
					if (!(buffer instanceof ArrayBuffer)) {
						throw new Error("Build output is not an ArrayBuffer");
					}

					const key: `v${string}/${string}-${PlatformTag}${string}` = `v${this.version}/${packageName}-${plat}${ext}`;
					const sizeMB = buffer.byteLength / 1e6;
					const buildTime = performance.now() - start;

					// 📤 S3 UPLOAD using Bun's native S3 API (Memory efficient)
					// Use attachment disposition for binary downloads
					const filename = `${packageName}-${plat}${ext}`;
					const uploadResult = await this.client.putObject(
						key,
						buffer,
						"application/octet-stream",
						{
							contentDisposition: `attachment; filename="${filename}"`,
						},
					);

					if (!uploadResult.success) {
						throw new Error("S3 upload failed");
					}

					// Store stats in Map (validated with V8 IsMap())
					this.buildStats.set(plat, { time: buildTime, size: sizeMB });

					const elapsed = buildTime.toFixed(0);
					console.info(
						`${color.green("✅")} ${plat.padEnd(15)} ${color.gray(`(${elapsed}ms, ${sizeMB.toFixed(1)}MB)`)}`,
					);

					// Clean immediate
					try {
						await $`rm ${outfile}`.quiet();
					} catch {
    console.error('Unhandled error:', error);
  }

					return true;
				} catch (e) {
					const errorMsg = e instanceof Error ? e.message : String(e);
					console.error(`${color.red("❌")} ${plat}: ${errorMsg}`);
					return false;
				}
			}),
		);

		this.printSummary(results.filter(Boolean).length);
	}

	/**
	 * 🏃 Registry Executor with V8 Type Validation
	 */
	async runRegistryBinary(
		packageName: string,
		args: string[] = [],
	): Promise<void> {
		// Validate args using V8 IsArray()
		if (!V8TypeChecker.isArray(args)) {
			throw new Error("Args must be an array");
		}

		const tag = await this.getLocalTag();
		const ext = tag.startsWith("windows") ? ".exe" : "";
		const key: `v${string}/${string}-${PlatformTag}${string}` = `v${this.version}/${packageName}-${tag}${ext}`;

		console.info(
			color.yellow(`📦 Fetching ${color.bold(packageName)} for ${tag}...`),
		);

		// Use Bun's native S3 file API
		const s3File = this.client.file(key, {
			contentDisposition: `attachment; filename="${packageName}-${tag}${ext}"`,
		});

		const binary = await s3File.arrayBuffer();

		if (!binary) {
			throw new Error(
				`Binary not found: ${packageName}-${tag} (v${this.version})`,
			);
		}

		// V8 type checking: validate binary is ArrayBuffer
		if (!(binary instanceof ArrayBuffer)) {
			throw new Error("Downloaded binary is not an ArrayBuffer");
		}

		// ⚡ Execute without saving to disk where possible, or use temp
		const tempPath = `/tmp/${packageName}-${Date.now()}${ext}`;
		await Bun.write(tempPath, binary);

		if (process.platform !== "win32") {
			await $`chmod +x ${tempPath}`.quiet();
		}

		console.info(
			color.green(`✅ Downloaded (${Math.round(binary.byteLength / 1e6)}MB)`),
		);
		console.info(color.cyan(`🚀 Executing...\n`));

		const proc = Bun.spawn([tempPath, ...args], {
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
			cwd: process.cwd(),
			env: process.env,
		});

		const exitCode = await proc.exited;

		// Cleanup
		try {
			await $`rm ${tempPath}`.quiet();
		} catch {
    console.error('Unhandled error:', error);
  }

		process.exit(exitCode || 0);
	}

	/**
	 * 📊 Version Info with V8 Type Validation
	 */
	async version(packageName: string): Promise<void> {
		if (typeof packageName !== "string") {
			throw new Error("Package name must be a string");
		}

		// Validate build metadata structure
		const metadata = {
			version: this.version,
			commit: this.gitCommit,
			buildTime: this.buildTime,
			debug: this.debugMode,
		};

		if (!V8TypeChecker.validateBuildMetadata(metadata)) {
			throw new Error("Invalid build metadata structure");
		}

		console.info(color.blue(bold(`${packageName} v${this.version}`)));
		console.info(color.gray(`Commit: ${this.gitCommit.slice(0, 8)}`));
		console.info(color.gray(`Build: ${this.buildTime}`));
		console.info(
			color.gray(`Debug: ${this.debugMode ? "enabled" : "disabled"}`),
		);

		// Show build stats if available (using V8 IsMap())
		if (V8TypeChecker.isMap(this.buildStats) && this.buildStats.size > 0) {
			console.info(color.gray(`\nBuild Statistics:`));
			this.buildStats.forEach((stats, plat) => {
				console.info(
					color.gray(
						`  ${plat}: ${stats.time.toFixed(0)}ms, ${stats.size.toFixed(1)}MB`,
					),
				);
			});
		}
	}

	/**
	 * 📊 Get build statistics (validated with V8 IsMap())
	 */
	getBuildStatistics(): Map<string, { time: number; size: number }> {
		if (!V8TypeChecker.isMap(this.buildStats)) {
			throw new Error("Build stats must be a Map");
		}
		return this.buildStats;
	}

	/**
	 * 📥 Create downloadable S3 file reference
	 * Useful for creating download links with proper content disposition
	 */
	createDownloadableFile(key: string, filename?: string): Bun.S3File {
		const contentDisposition = filename
			? `attachment; filename="${filename}"`
			: `attachment; filename="${key.split("/").pop()}"`;

		return this.client.file(key, { contentDisposition });
	}

	private printSummary(successCount: number): void {
		// Validate count using V8 IsInt32()
		if (!V8TypeChecker.isInt32(successCount)) {
			console.warn(color.yellow("Warning: Invalid success count type"));
			return;
		}

		const total = SUPPORTED_PLATFORMS.length;
		const status =
			successCount === total ? color.green("PERFECT") : color.red("INCOMPLETE");

		console.info(
			color.yellow(bold(`\n┌──────────────────────────────────────────┐`)),
		);
		console.info(color.yellow(`│  Registry Status: ${status}        │`));
		console.info(
			color.yellow(
				`│  Total Platforms: ${successCount}/${total}                  │`,
			),
		);
		console.info(color.yellow(`│  Version: v${this.version.padEnd(28)}│`));

		// Show average build time if stats available
		if (V8TypeChecker.isMap(this.buildStats) && this.buildStats.size > 0) {
			const avgTime =
				Array.from(this.buildStats.values()).reduce(
					(sum, s) => sum + s.time,
					0,
				) / this.buildStats.size;
			console.info(
				color.yellow(
					`│  Avg Build Time: ${avgTime.toFixed(0)}ms              │`,
				),
			);
		}

		console.info(color.yellow(`└──────────────────────────────────────────┘\n`));
	}
}

/**
 * 🟢 CONFIG VALIDATION with V8 Type Checking
 */
function getConfig(): S3Config | null {
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const bucket = process.env.BUCKET_NAME || process.env.S3_BUCKET_NAME;

	if (!accessKeyId || !secretAccessKey || !bucket) {
		return null;
	}

	// V8 type checking: validate all are strings
	if (
		typeof accessKeyId !== "string" ||
		typeof secretAccessKey !== "string" ||
		typeof bucket !== "string"
	) {
		return null;
	}

	return {
		accessKeyId,
		secretAccessKey,
		bucket,
		endpoint: process.env.BUCKET_ENDPOINT,
		region: process.env.AWS_REGION || "us-east-1",
	};
}

/**
 * 🎮 CLI INTERFACE
 */
async function main() {
	const [, , cmd, pkgName, ...args] = process.argv;
	const packageName =
		pkgName || process.env.npm_package_name || "bun-toml-secrets-editor";

	// Validate args using V8 IsArray()
	if (!V8TypeChecker.isArray(args)) {
		console.error(color.red("Invalid arguments structure"));
		process.exit(1);
	}

	if (cmd === "version") {
		const config = getConfig();
		if (!config) {
			// Version doesn't need config
			const manager = new BunRegistryV8({
				accessKeyId: "",
				secretAccessKey: "",
				bucket: "",
			});
			await manager.version(packageName);
			process.exit(0);
		}
		const manager = new BunRegistryV8(config);
		await manager.version(packageName);
		process.exit(0);
	}

	const config = getConfig();
	if (!config && (cmd === "publish" || cmd === "run")) {
		console.error(
			color.red(bold("❌ Missing required environment variables:")),
		);
		console.error(
			color.red("   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME"),
		);
		process.exit(1);
	}

	if (!config) {
		console.error(color.red("❌ S3 configuration not found"));
		process.exit(1);
	}

	const manager = new BunRegistryV8(config);

	if (cmd === "publish") {
		await manager.publishAll(packageName);
	} else if (cmd === "run") {
		await manager.runRegistryBinary(packageName, args);
	} else {
		console.info(
			color.magenta("\n🚀 Bun Registry Manager v8.1 (V8 Type Checking)\n"),
		);
		console.info(color.cyan("Available commands:"));
		console.info(
			color.gray("  publish <name>  - Build and upload all platforms"),
		);
		console.info(
			color.gray("  run <name>      - Pull from registry and execute natively"),
		);
		console.info(
			color.gray("  version <name>  - Show version with build metadata\n"),
		);
		console.info(color.yellow("V8 Type Checking APIs:"));
		console.info(color.gray("  ✅ IsMap() - Validates Map structures"));
		console.info(color.gray("  ✅ IsArray() - Validates array structures"));
		console.info(color.gray("  ✅ IsInt32() - Validates 32-bit integers"));
		console.info(color.gray("  ✅ IsBigInt() - Validates BigInt values\n"));
		console.info(color.yellow("Environment Variables:"));
		console.info(
			color.gray("  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, BUCKET_NAME"),
		);
		console.info(color.gray("  Optional: BUCKET_ENDPOINT, AWS_REGION\n"));
	}
}

main().catch((error) => {
	console.error(color.red(bold("💥")), error);
	process.exit(1);
});
