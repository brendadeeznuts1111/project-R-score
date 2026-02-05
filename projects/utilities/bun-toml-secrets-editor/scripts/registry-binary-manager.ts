#!/usr/bin/env bun
/**
 * 🚀 Registry Binary Manager - bunx --package compatible
 *
 * Features:
 * - Build-time embedded metadata (BUILD_VERSION, BUILD_TIME, GIT_COMMIT)
 * - Dynamic OS/target detection (no rebuilds!)
 * - Upload all platforms to registry
 * - Download and run binaries from registry
 * - bunx --package workflow support
 *
 * Usage:
 *   bun scripts/registry-binary-manager.ts [package-name] [action]
 *   bun scripts/registry-binary-manager.ts bun-toml-secrets-editor upload
 *   bun scripts/registry-binary-manager.ts bun-toml-secrets-editor version
 *   bun scripts/registry-binary-manager.ts bun-toml-secrets-editor run
 */

import { bold, color } from "bun:color";
import { $ } from "bun";

// 🟢 BUILD-TIME EMBEDDED METADATA (set via --define flags)
declare const BUILD_VERSION: string;
declare const BUILD_TIME: string;
declare const GIT_COMMIT: string;

// Get metadata with fallbacks
const getVersion = () => {
	try {
		return BUILD_VERSION || process.env.npm_package_version || "1.0.0";
	} catch {
		return process.env.npm_package_version || "1.0.0";
	}
};

const getBuildTime = () => {
	try {
		return BUILD_TIME || new Date().toISOString();
	} catch {
		return new Date().toISOString();
	}
};

const getGitCommit = async () => {
	try {
		return GIT_COMMIT || (await $`git rev-parse HEAD`.text()).trim();
	} catch {
		try {
			return (await $`git rev-parse HEAD`.text()).trim();
		} catch {
			return "unknown";
		}
	}
};

// 🟢 bunx --package COMPATIBLE
const PACKAGE_NAME =
	process.argv[2] || process.env.npm_package_name || "bun-toml-secrets-editor";
const ACTION = process.argv[3] as
	| "upload"
	| "version"
	| "presign"
	| "run"
	| undefined;

// 🛠️ DYNAMIC OS/TARGET DETECTION (no rebuilds!)
async function detectTargetOS(): Promise<string> {
	try {
		const os = process.platform;
		const arch = process.arch;

		const osMap: Record<string, string> = {
			linux: "linux",
			darwin: "darwin",
			win32: "windows",
		};

		const archMap: Record<string, string> = {
			x64: "x64",
			arm64: "arm64",
			ia32: "x64", // Map ia32 to x64
		};

		return `${osMap[os] || os}-${archMap[arch] || arch}`;
	} catch {
		return "linux-x64"; // Fallback
	}
}

// 🟢 S3 Client (using Bun's native capabilities)
class S3Client {
	private accessKeyId: string;
	private secretAccessKey: string;
	private bucket: string;
	private endpoint?: string;
	private region: string;

	constructor(config: {
		accessKeyId: string;
		secretAccessKey: string;
		bucket: string;
		endpoint?: string;
		region?: string;
	}) {
		this.accessKeyId = config.accessKeyId;
		this.secretAccessKey = config.secretAccessKey;
		this.bucket = config.bucket;
		this.endpoint = config.endpoint;
		this.region = config.region || "us-east-1";
	}

	async putObject(
		key: string,
		body: ArrayBuffer,
		contentType = "application/octet-stream",
	): Promise<void> {
		const url = this.endpoint
			? `${this.endpoint}/${this.bucket}/${key}`
			: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

		// Use Bun's fetch with AWS signature (simplified - in production use AWS SDK)
		const response = await fetch(url, {
			method: "PUT",
			body: body,
			headers: {
				"Content-Type": contentType,
				"x-amz-acl": "public-read",
			},
		});

		if (!response.ok) {
			throw new Error(`S3 upload failed: ${response.statusText}`);
		}
	}

	async getObject(key: string): Promise<ArrayBuffer | null> {
		const url = this.endpoint
			? `${this.endpoint}/${this.bucket}/${key}`
			: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

		try {
			const response = await fetch(url);
			if (response.ok) {
				return await response.arrayBuffer();
			}
			return null;
		} catch {
			return null;
		}
	}

	async headObject(key: string): Promise<{ exists: boolean; size?: number }> {
		const url = this.endpoint
			? `${this.endpoint}/${this.bucket}/${key}`
			: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

		try {
			const response = await fetch(url, { method: "HEAD" });
			return {
				exists: response.ok,
				size: response.headers.get("content-length")
					? parseInt(response.headers.get("content-length")!, 10)
					: undefined,
			};
		} catch {
			return { exists: false };
		}
	}
}

// 🟢 REGISTRY-FROM BUCKET (bunx -p style)
async function getBinaryFromRegistry(
	packageName: string,
	targetOS: string,
	version: string,
	client: S3Client,
) {
	const key = `v${version}/${packageName}-${targetOS}${targetOS.startsWith("windows") ? ".exe" : ""}`;
	console.log(
		color.gray(`📦 Fetching ${packageName}-${targetOS} from registry...`),
	);

	const exists = await client.headObject(key);
	if (exists.exists) {
		const binary = await client.getObject(key);
		if (binary) {
			console.log(
				color.green("✅"),
				`Downloaded ${packageName}-${targetOS} (${Math.round(binary.byteLength / 1e6)}MB)`,
			);
			return { binary, filename: `${packageName}-${targetOS}`, key };
		}
	}

	throw new Error(
		`Binary not found in registry: ${packageName}-${targetOS} (v${version})`,
	);
}

// 🟢 CONFIG + VALIDATION
const config = {
	accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	bucket: process.env.BUCKET_NAME || process.env.S3_BUCKET_NAME!,
	endpoint: process.env.BUCKET_ENDPOINT as string | undefined,
	region: process.env.AWS_REGION || "us-east-1",
};

const requiredEnvVars = [
	"AWS_ACCESS_KEY_ID",
	"AWS_SECRET_ACCESS_KEY",
	"BUCKET_NAME",
];
const missing = requiredEnvVars.filter(
	(k) =>
		!process.env[k] && !(k === "BUCKET_NAME" && process.env.S3_BUCKET_NAME),
);

if (missing.length > 0 && ACTION === "upload") {
	console.error(
		color.red(
			bold(`❌ Missing required environment variables: ${missing.join(", ")}`),
		),
	);
	process.exit(1);
}

let client: S3Client | null = null;
if (ACTION === "upload" || ACTION === "run") {
	if (!config.bucket) {
		console.error(color.red(bold("❌ BUCKET_NAME or S3_BUCKET_NAME required")));
		process.exit(1);
	}
	client = new S3Client(config);
}

// 🔥 MAIN REGISTRY MANAGER
class RegistryBinaryManager {
	private version: string;
	private buildTime: string;
	private gitCommit: string;

	constructor() {
		this.version = getVersion();
		this.buildTime = getBuildTime();
		this.gitCommit = "unknown";
	}

	async init() {
		this.gitCommit = await getGitCommit();
	}

	async version() {
		await this.init();
		console.log(color.blue(bold(PACKAGE_NAME)));
		console.log(
			color.gray(
				`v${this.version} (${this.gitCommit.slice(0, 8)}) | ${this.buildTime}`,
			),
		);
	}

	async upload() {
		await this.init();
		if (!client) {
			console.error(color.red("❌ S3 client not initialized"));
			process.exit(1);
		}

		this.version();
		console.log(color.gray(`${getProvider()} → ${config.bucket}`));

		// 🛠️ Build ALL platforms → Upload (single command!)
		await this.buildAndUploadAll();
	}

	async run() {
		await this.init();
		if (!client) {
			console.error(color.red("❌ S3 client not initialized"));
			process.exit(1);
		}

		const targetOS = await detectTargetOS();
		const { binary, filename } = await getBinaryFromRegistry(
			PACKAGE_NAME,
			targetOS,
			this.version,
			client,
		);

		// Save to temp file and execute
		const tempPath = `/tmp/${filename}`;
		await Bun.write(tempPath, binary);

		// Make executable (Unix-like)
		if (process.platform !== "win32") {
			await $`chmod +x ${tempPath}`;
		}

		// 🔥 Execute downloaded binary!
		console.log(color.cyan(`🚀 Executing ${filename}...\n`));
		const proc = Bun.spawn([tempPath, ...process.argv.slice(4)], {
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});

		const exitCode = await proc.exited;

		// Cleanup
		try {
			await $`rm ${tempPath}`;
		} catch {}

		process.exit(exitCode || 0);
	}

	private async buildAndUploadAll() {
		if (!client) {
			throw new Error("S3 client not initialized");
		}

		const platforms = [
			{ target: "bun-linux-x64", name: "linux-x64" },
			{ target: "bun-linux-arm64", name: "linux-arm64" },
			{ target: "bun-darwin-x64", name: "darwin-x64" },
			{ target: "bun-darwin-arm64", name: "darwin-arm64" },
			{ target: "bun-windows-x64", name: "windows-x64" },
		];

		console.log(
			color.blue(bold(`🚀 Building ${platforms.length} platforms...\n`)),
		);

		for (const { target, name } of platforms) {
			console.log(color.cyan(`🔨 Building ${name}...`));

			// 🟢 Single bun build command per platform
			const outfile = `dist/${PACKAGE_NAME}-${name}${name.startsWith("windows") ? ".exe" : ""}`;

			try {
				await $`bun build --compile --target=${target} --define BUILD_VERSION='"${this.version}"' --define BUILD_TIME='"${this.buildTime}"' --define GIT_COMMIT='"${this.gitCommit}"' src/main.ts --outfile ${outfile}`.quiet();

				// 📤 Upload immediately
				await this.uploadBinary(outfile, name);

				// Clean up
				try {
					await $`rm ${outfile}`.quiet();
				} catch {}

				console.log(color.green(`✅ ${name} built and uploaded\n`));
			} catch (error) {
				console.error(color.red(`❌ Failed to build ${name}:`), error);
			}
		}
	}

	private async uploadBinary(filePath: string, _platform: string) {
		if (!client) {
			throw new Error("S3 client not initialized");
		}

		const filename = filePath.split("/").pop()!;
		const key = `v${this.version}/${filename}`;
		const file = Bun.file(filePath);
		const body = await file.arrayBuffer();

		console.log(
			color.cyan(`📤 [${Math.round(body.byteLength / 1e6)}MB] ${filename}`),
		);

		await client.putObject(key, body);
		console.log(color.gray(`   → s3://${config.bucket}/${key}`));
	}
}

const manager = new RegistryBinaryManager();

// 🎮 bunx --package STYLE USAGE
if (ACTION === "version") {
	manager.version();
	process.exit(0);
}

if (ACTION === "upload") {
	manager.upload().catch((e) => {
		console.error(color.red(bold("💥")), e);
		process.exit(1);
	});
} else if (ACTION === "run") {
	manager.run().catch((e) => {
		console.error(color.red(bold("💥")), e);
		process.exit(1);
	});
} else {
	// 🟢 DEFAULT: Show version
	manager.version();
}

function getProvider(): string {
	return config.endpoint ? "🟦 S3-Compatible" : "🟦 S3";
}
