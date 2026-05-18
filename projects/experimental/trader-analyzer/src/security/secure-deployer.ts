/**
 * @fileoverview Secure Deployment with Digital Signatures
 * @module security/secure-deployer
 *
 * Sign binaries with Ed25519 keys before deployment and verify on startup.
 */

import { spawn } from "bun";

export class SecureDeployer {
	private privateKeyPath: string;
	private publicKeyPath: string;

	constructor(
		privateKeyPath: string = "./keys/deploy-key.pem",
		publicKeyPath: string = "./keys/deploy-key.pub",
	) {
		this.privateKeyPath = privateKeyPath;
		this.publicKeyPath = publicKeyPath;
	}

	/**
	 * Sign binary with Ed25519 key before deployment
	 */
	async signBinary(binaryPath: string): Promise<string> {
		try {
			// Read private key
			const privateKeyFile = Bun.file(this.privateKeyPath);
			if (!(await privateKeyFile.exists())) {
				throw new Error(`Private key not found: ${this.privateKeyPath}`);
			}
			const privateKey = await privateKeyFile.text();

			// Read binary content
			const binaryFile = Bun.file(binaryPath);
			if (!(await binaryFile.exists())) {
				throw new Error(`Binary not found: ${binaryPath}`);
			}
			const binary = await binaryFile.arrayBuffer();

			// Sign with native crypto (using openssl for Ed25519)
			// Note: Bun's crypto API doesn't directly support Ed25519 signing
			// Using openssl via Bun.spawn as fallback
			const signProc = spawn(
				[
					"openssl",
					["dgst", "-sha256", "-sign", this.privateKeyPath, binaryPath],
				],
				{
					stdout: "pipe",
				},
			);

			// Bun provides native .arrayBuffer() method on stdout stream
			const signature = await (signProc.stdout as any).arrayBuffer();

			// Store signature alongside binary
			const signaturePath = `${binaryPath}.sig`;
			await Bun.write(signaturePath, signature);

			// Generate hash of signature for verification
			const sigHash = Bun.hash(signature).toString(36);

			console.info(`✅ Binary signed: ${sigHash}`);
			return sigHash;
		} catch (error) {
			console.error(`❌ Signing failed: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * Verify signature on startup (prevents tampering)
	 */
	async verifyBinary(binaryPath: string): Promise<boolean> {
		try {
			const signaturePath = `${binaryPath}.sig`;
			const signatureFile = Bun.file(signaturePath);
			const publicKeyFile = Bun.file(this.publicKeyPath);

			if (!(await signatureFile.exists())) {
				console.error(`❌ Signature file not found: ${signaturePath}`);
				return false;
			}

			if (!(await publicKeyFile.exists())) {
				console.error(`❌ Public key not found: ${this.publicKeyPath}`);
				return false;
			}

			// Verify signature using openssl
			const verifyProc = spawn(
				[
					"openssl",
					[
						"dgst",
						"-sha256",
						"-verify",
						this.publicKeyPath,
						"-signature",
						signaturePath,
						binaryPath,
					],
				],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			// Bun provides native .text() method on stdout/stderr streams
			const output = await (verifyProc.stdout as any).text();
			const errorOutput = await (verifyProc.stderr as any).text();

			if (verifyProc.exitCode === 0 && output.includes("Verified OK")) {
				console.info("✅ Binary signature verified");
				return true;
			}

			console.error(`❌ Binary signature verification failed: ${errorOutput}`);
			return false;
		} catch (error) {
			console.error(`❌ Verification error: ${(error as Error).message}`);
			return false;
		}
	}

	/**
	 * Deploy with integrity verification
	 */
	async deployToProduction(
		localPath: string,
		remoteHost: string,
	): Promise<void> {
		// Sign binary
		const sigHash = await this.signBinary(localPath);

		// Copy with Bun's native SCP (requires ssh/scp to be available)
		console.info(`📦 Copying binary to ${remoteHost}...`);
		const scpProc = spawn(
			[
				"scp",
				[localPath, `${localPath}.sig`, `sports@${remoteHost}:/opt/hyper-bun/`],
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		// Bun provides native .text() method on stdout/stderr streams
		const scpOutput = await (scpProc.stdout as any).text();
		const scpError = await (scpProc.stderr as any).text();

		if (scpProc.exitCode !== 0) {
			throw new Error(`SCP failed: ${scpError}`);
		}

		// Remote verification
		console.info(`🔍 Verifying binary on remote host...`);
		const sshProc = spawn(
			[
				"ssh",
				[`sports@${remoteHost}`, `bun /opt/hyper-bun/verify-and-start.js`],
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		// Bun provides native .text() method on stdout/stderr streams
		const sshOutput = await (sshProc.stdout as any).text();
		const sshError = await (sshProc.stderr as any).text();

		if (sshProc.exitCode !== 0) {
			throw new Error(`Remote verification failed: ${sshError}`);
		}

		console.info(`🚀 Deployed ${sigHash} to ${remoteHost}`);
		console.info(sshOutput);
	}

	/**
	 * Generate Ed25519 key pair (if keys don't exist)
	 */
	async generateKeyPair(): Promise<void> {
		try {
			// Check if keys already exist
			const privateKeyFile = Bun.file(this.privateKeyPath);
			const publicKeyFile = Bun.file(this.publicKeyPath);

			if ((await privateKeyFile.exists()) && (await publicKeyFile.exists())) {
				console.info("✅ Key pair already exists");
				return;
			}

			// Generate private key
			console.info("🔑 Generating Ed25519 key pair...");
			const genKeyProc = spawn(
				[
					"openssl",
					["genpkey", "-algorithm", "ED25519", "-out", this.privateKeyPath],
				],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			await genKeyProc.exited;

			if (genKeyProc.exitCode !== 0) {
				throw new Error("Failed to generate private key");
			}

			// Extract public key
			const pubKeyProc = spawn(
				[
					"openssl",
					[
						"pkey",
						"-in",
						this.privateKeyPath,
						"-pubout",
						"-out",
						this.publicKeyPath,
					],
				],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			await pubKeyProc.exited;

			if (pubKeyProc.exitCode !== 0) {
				throw new Error("Failed to extract public key");
			}

			console.info(`✅ Key pair generated:`);
			console.info(`   Private: ${this.privateKeyPath}`);
			console.info(`   Public: ${this.publicKeyPath}`);
		} catch (error) {
			console.error(`❌ Key generation failed: ${(error as Error).message}`);
			throw error;
		}
	}
}
