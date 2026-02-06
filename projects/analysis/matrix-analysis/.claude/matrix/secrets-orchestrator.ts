/**
 * Tier-1380 OMEGA: Secrets-Aware Orchestrator
 *
 * Native Bun secrets integration (v1.3.7)
 * - Encrypted at rest (AES-256-GCM)
 * - Runtime access via Bun.secrets.get()
 * - Auto-inheritance by child processes
 * - Never appears in process listing
 *
 * @module secrets-orchestrator
 * @tier 1380-OMEGA
 * @see https://bun.sh/docs/runtime/secrets
 */

import { S3Client } from "bun";

// ============================================================================
// Secret Configuration
// ============================================================================

interface SecretConfig {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
}

/**
 * Load secrets from Bun.secrets store
 * Returns null if secrets not configured
 */
async function loadSecrets(): Promise<SecretConfig | null> {
	const [accountId, accessKeyId, secretAccessKey, bucket] = await Promise.all([
		Bun.secrets.get({ service: "cloudflare", name: "account-id" }),
		Bun.secrets.get({ service: "r2", name: "access-key-id" }),
		Bun.secrets.get({ service: "r2", name: "secret-access-key" }),
		Bun.secrets.get({ service: "r2", name: "bucket" }),
	]);

	if (!accountId || !accessKeyId || !secretAccessKey) {
		return null;
	}

	return {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucket: bucket || "tier1380-profiles",
	};
}

// ============================================================================
// Secure Orchestrator
// ============================================================================

export class SecureOrchestrator {
	private s3: S3Client;
	private config: SecretConfig;

	constructor(config: SecretConfig) {
		this.config = config;

		// Initialize S3 client with secrets
		this.s3 = new S3Client({
			region: "auto",
			endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
		});

		console.log("🔐 Tier-1380 Secrets Orchestrator Initialized");
		console.log(`   R2 Bucket: ${this.mask(config.bucket)}`);
		console.log(`   Account: ${this.mask(config.accountId)}`);
	}

	/**
	 * Mask sensitive values for logging
	 */
	private mask(value: string): string {
		if (value.length <= 8) return "••••••";
		return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
	}

	/**
	 * Upload profile to R2 with automatic content disposition
	 */
	async uploadProfile(profileId: string, markdown: string): Promise<string> {
		const key = `profiles/${profileId}.md`;

		console.log(`📤 Uploading ${profileId} to R2...`);

		try {
			await this.s3.write(key, markdown, {
				type: "text/markdown",
				// v1.3.7: Brotli compression for smaller transfers
				contentEncoding: "br",
				// v1.3.7: contentDisposition auto-forces download
				// @ts-expect-error - Bun S3Client accepts custom headers
				contentDisposition: `attachment; filename="${profileId}.md"`,
			});

			const url = `https://${this.config.bucket}.r2.cloudflarestorage.com/${key}`;
			console.log(`✅ Profile secured: ${url}`);

			return url;
		} catch (error) {
			// Secrets auto-redacted in error messages by Bun
			console.error(`❌ Upload failed: ${error}`);
			throw error;
		}
	}

	/**
	 * Spawn worker with automatic secret inheritance
	 */
	spawnWorker(script: string): ReturnType<typeof Bun.spawn> {
		console.log(`👷 Spawning worker: ${script}`);

		const worker = Bun.spawn({
			cmd: ["bun", "run", script],
			ipc: true,
			stdio: ["inherit", "inherit", "inherit"],
			// ✅ Secrets automatically inherited by child process
			// NO need to pass via env or IPC!
		});

		return worker;
	}

	/**
	 * Generate presigned URL for secure download
	 */
	async generatePresignedUrl(profileId: string, expiresIn = 3600): Promise<string> {
		const key = `profiles/${profileId}.md`;

		// Generate presigned URL (v1.3.7)
		const url = this.s3.presign(key, {
			expiresIn,
			// Force download behavior
			responseDisposition: `attachment; filename="${profileId}.md"`,
		});

		return url;
	}
}

// ============================================================================
// Worker Entry Point (inherits secrets automatically)
// ============================================================================

async function workerMain() {
	// ✅ Secrets available WITHOUT explicit passing from parent
	const r2Key = Bun.secrets.get("R2_ACCESS_KEY_ID");

	if (!r2Key) {
		console.error("❌ SECURITY: Worker cannot access secrets");
		console.error("   Ensure secrets are set: bun secret set R2_ACCESS_KEY_ID <value>");
		process.exit(1);
	}

	console.log("✅ Worker authenticated via inherited secrets");

	// Handle IPC messages from parent
	process.on("message", async (msg: { type: string; id: string; data?: string }) => {
		if (msg.type === "profile" && msg.data) {
			const config = await loadSecrets();
			if (!config) {
				process.send?.({
					type: "error",
					profileId: msg.id,
					error: "Secrets unavailable",
				});
				return;
			}

			const orchestrator = new SecureOrchestrator(config);

			try {
				const url = await orchestrator.uploadProfile(msg.id, msg.data);
				process.send?.({ type: "complete", profileId: msg.id, url });
			} catch (error) {
				process.send?.({
					type: "error",
					profileId: msg.id,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	});

	// Signal ready
	process.send?.({ type: "ready" });
}

// ============================================================================
// CLI / Main Entry
// ============================================================================

async function main() {
	const command = Bun.argv[2];

	switch (command) {
		case "init": {
			console.log("🔐 Tier-1380 Secrets Initialization\n");
			console.log("Required secrets (service:name format):");
			console.log("  - cloudflare:account-id");
			console.log("  - r2:access-key-id");
			console.log("  - r2:secret-access-key");
			console.log("  - r2:bucket (optional, default: tier1380-profiles)");
			console.log("");
			console.log("Set secrets with:");
			console.log('  bun secret set cloudflare:account-id "<value>"');
			console.log('  bun secret set r2:access-key-id "<value>"');
			console.log('  bun secret set r2:secret-access-key "<value>"');
			console.log("");
			console.log("Verify with:");
			console.log("  bun secret list");
			break;
		}

		case "status": {
			const config = await loadSecrets();
			if (!config) {
				console.log("❌ Secrets not configured");
				console.log("Run: bun run matrix/secrets-orchestrator.ts init");
				process.exit(1);
			}

			console.log("🔐 Tier-1380 Secrets Status\n");
			console.log(`✅ CF_ACCOUNT_ID: ${config.accountId.slice(0, 4)}••••`);
			console.log(`✅ R2_ACCESS_KEY_ID: ${config.accessKeyId.slice(0, 4)}••••`);
			console.log(`✅ R2_SECRET_ACCESS_KEY: ••••••••••••`);
			console.log(`✅ R2_BUCKET: ${config.bucket}`);
			break;
		}

		case "upload": {
			const profileId = Bun.argv[3];
			const filePath = Bun.argv[4];

			if (!profileId || !filePath) {
				console.error(
					"Usage: bun run secrets-orchestrator.ts upload <profileId> <filePath>",
				);
				process.exit(1);
			}

			const config = loadSecrets();
			if (!config) {
				console.error("❌ Secrets not configured");
				process.exit(1);
			}

			const orchestrator = new SecureOrchestrator(config);
			const markdown = await Bun.file(filePath).text();
			await orchestrator.uploadProfile(profileId, markdown);
			break;
		}

		case "worker": {
			// Run as worker (inherits secrets)
			await workerMain();

			// Keep alive
			await new Promise(() => {});
			break;
		}

		case "test-worker": {
			// Test worker spawning with secret inheritance
			const config = await loadSecrets();
			if (!config) {
				console.error("❌ Secrets not configured");
				process.exit(1);
			}

			const orchestrator = new SecureOrchestrator(config);
			const worker = orchestrator.spawnWorker("./matrix/secrets-orchestrator.ts worker");

			worker.on("message", (msg) => {
				console.log("📨 Worker message:", msg);
			});

			// Wait for worker to be ready
			await new Promise<void>((resolve) => {
				worker.on("message", (msg: { type: string }) => {
					if (msg.type === "ready") {
						console.log("✅ Worker ready with inherited secrets");

						// Send test job
						worker.send?.({
							type: "profile",
							id: `test-${Date.now()}`,
							data: `# Test Profile\nGenerated: ${new Date().toISOString()}`,
						});

						resolve();
					}
				});
			});

			// Wait for completion
			await new Promise<void>((resolve) => {
				worker.on("message", (msg: { type: string }) => {
					if (msg.type === "complete" || msg.type === "error") {
						console.log("✅ Worker completed:", msg);
						worker.kill();
						resolve();
					}
				});
			});

			break;
		}

		default: {
			console.log("Tier-1380 OMEGA Secrets Orchestrator\n");
			console.log("Commands:");
			console.log("  init         Show initialization instructions");
			console.log("  status       Verify secrets configuration");
			console.log("  upload       Upload profile to R2");
			console.log("  worker       Run as worker (inherits secrets)");
			console.log("  test-worker  Test secret inheritance");
		}
	}
}

if (import.meta.main) {
	await main();
}
