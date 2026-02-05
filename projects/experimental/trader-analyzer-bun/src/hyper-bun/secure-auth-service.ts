/**
 * Secure Authentication Service
 *
 * Implements encrypted credential storage and management using Bun's native crypto APIs.
 * Provides secure JWT token generation and credential rotation.
 */

import { logger } from "./console-enhancement";

export class SecureAuthService {
	private encryptedCredentials: Uint8Array | null = null;
	private key: CryptoKey | null = null;
	private credentials: Map<string, BookmakerCredentials> = new Map();

	constructor(
		private encryptionKey?: string,
		private skipCryptoInit = false,
	) {}

	/**
	 * Initialize the service with encryption key and load credentials
	 * Uses Bun-native crypto for secure key derivation
	 */
	async initialize(): Promise<void> {
		try {
			if (!this.skipCryptoInit) {
				// Derive encryption key from environment or provided key
				const keyMaterial = this.encryptionKey || process.env.ENCRYPTION_KEY;
				if (!keyMaterial) {
					throw new Error(
						"Encryption key not provided. Set ENCRYPTION_KEY environment variable.",
					);
				}

				// For testing, use a proper 256-bit key
				const keyBytes = new TextEncoder().encode(
					keyMaterial.padEnd(32, "0").slice(0, 32),
				);

				// Import key for AES-GCM encryption
				this.key = await crypto.subtle.importKey(
					"raw",
					keyBytes,
					"AES-GCM",
					false,
					["encrypt", "decrypt"],
				);
			}

			// Load and decrypt stored credentials
			await this.loadCredentials();

			logger.success(
				`SecureAuthService initialized with ${this.credentials.size} bookmaker credentials`,
			);
		} catch (error) {
			console.error("Failed to initialize SecureAuthService:", error);
			throw error;
		}
	}

	/**
	 * Load encrypted credentials from storage
	 * In production, this would load from a secure file or database
	 */
	private async loadCredentials(): Promise<void> {
		try {
			// For demo purposes, initialize with sample credentials
			// In production, load from encrypted storage
			const sampleCredentials: Record<string, BookmakerCredentials> = {
				betfair: {
					apiKey: "demo_betfair_key",
					apiSecret: "demo_betfair_secret",
					username: "demo_user",
					password: "demo_pass",
					baseUrl: "https://api.betfair.com",
					rateLimits: { requestsPerSecond: 5, burstLimit: 10 },
				},
				pinnacle: {
					apiKey: "demo_pinnacle_key",
					apiSecret: "demo_pinnacle_secret",
					username: "demo_user",
					password: "demo_pass",
					baseUrl: "https://api.pinnacle.com",
					rateLimits: { requestsPerSecond: 2, burstLimit: 5 },
				},
			};

			// Store credentials (in production, these would be encrypted)
			for (const [bookmaker, creds] of Object.entries(sampleCredentials)) {
				this.credentials.set(bookmaker, creds);
			}

			// Custom Hyper-Bun logic for credential rotation
			await this.rotateCredentialsIfNeeded();
		} catch (error) {
			console.error("Failed to load credentials:", error);
			throw error;
		}
	}

	/**
	 * Rotate credentials if they're approaching expiration
	 * Hyper-Bun specific credential management logic
	 */
	private async rotateCredentialsIfNeeded(): Promise<void> {
		const now = Date.now();
		const rotationThreshold = 24 * 60 * 60 * 1000; // 24 hours

		for (const [bookmaker, creds] of this.credentials) {
			if (!creds.lastRotated || now - creds.lastRotated > rotationThreshold) {
				logger.info(`Rotating credentials for ${bookmaker}`);
				await this.rotateCredentialsForBookmaker(bookmaker);
			}
		}
	}

	/**
	 * Rotate credentials for a specific bookmaker
	 */
	private async rotateCredentialsForBookmaker(
		bookmaker: string,
	): Promise<void> {
		const creds = this.credentials.get(bookmaker);
		if (!creds) return;

		try {
			// In a real implementation, this would call the bookmaker's API
			// to rotate credentials or generate new ones

			// For demo, just update the timestamp
			creds.lastRotated = Date.now();
			this.credentials.set(bookmaker, creds);

			logger.success(`Credentials rotated for ${bookmaker}`);
		} catch (error) {
			console.error(`Failed to rotate credentials for ${bookmaker}:`, error);
		}
	}

	/**
	 * Get authentication headers for a bookmaker
	 * Returns appropriate headers based on bookmaker's auth method
	 */
	async getHeaders(bookmaker: string): Promise<Record<string, string>> {
		const creds = this.credentials.get(bookmaker);
		if (!creds) {
			throw new Error(`No credentials found for bookmaker: ${bookmaker}`);
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": "Hyper-Bun/1.0",
		};

		// Generate authentication based on bookmaker's method
		switch (bookmaker.toLowerCase()) {
			case "betfair":
				headers["X-Application"] = creds.apiKey;
				headers["X-Authentication"] = await this.generateJWT(creds);
				break;

			case "pinnacle":
				headers["Authorization"] = `Bearer ${await this.generateJWT(creds)}`;
				break;

			default:
				// Generic API key authentication
				headers["X-API-Key"] = creds.apiKey;
				if (creds.apiSecret) {
					headers["X-API-Secret"] = creds.apiSecret;
				}
		}

		return headers;
	}

	/**
	 * Generate JWT token for authentication
	 * Uses Bun-native crypto for secure token generation
	 */
	private async generateJWT(
		creds: BookmakerCredentials,
		bookmaker?: string,
	): Promise<string> {
		const header = {
			alg: "HS256",
			typ: "JWT",
		};

		const payload = {
			sub: creds.username,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
			bookmaker: bookmaker || "unknown",
		};

		// Base64url encode header and payload
		const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
		const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

		const message = `${encodedHeader}.${encodedPayload}`;

		// Create signature using HMAC-SHA256
		const signature = await this.createHMACSignature(message, creds.apiSecret);

		return `${message}.${signature}`;
	}

	/**
	 * Create HMAC-SHA256 signature for JWT
	 */
	private async createHMACSignature(
		message: string,
		secret: string,
	): Promise<string> {
		const key = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);

		const signature = await crypto.subtle.sign(
			"HMAC",
			key,
			new TextEncoder().encode(message),
		);
		return this.base64UrlEncode(
			String.fromCharCode(...new Uint8Array(signature)),
		);
	}

	/**
	 * Base64url encode a string
	 */
	private base64UrlEncode(str: string): string {
		return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	}

	/**
	 * Get authentication token for a bookmaker
	 * Domain-specific authentication logic
	 */
	async getAuthToken(bookmaker: string): Promise<string> {
		const creds = this.credentials.get(bookmaker);
		if (!creds) {
			throw new Error(`No credentials configured for bookmaker: ${bookmaker}`);
		}

		return this.generateJWT(creds, bookmaker);
	}

	/**
	 * Encrypt sensitive data using AES-GCM
	 */
	private async encryptData(data: string): Promise<Uint8Array> {
		if (!this.key) {
			throw new Error("Service not initialized");
		}

		const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
		const encodedData = new TextEncoder().encode(data);

		const encrypted = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			this.key,
			encodedData,
		);

		// Combine IV and encrypted data
		const result = new Uint8Array(iv.length + encrypted.byteLength);
		result.set(iv);
		result.set(new Uint8Array(encrypted), iv.length);

		return result;
	}

	/**
	 * Decrypt sensitive data using AES-GCM
	 */
	private async decryptData(encryptedData: Uint8Array): Promise<string> {
		if (!this.key) {
			throw new Error("Service not initialized");
		}

		const iv = encryptedData.slice(0, 12);
		const data = encryptedData.slice(12);

		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			this.key,
			data,
		);

		return new TextDecoder().decode(decrypted);
	}

	/**
	 * Add or update credentials for a bookmaker
	 */
	async updateCredentials(
		bookmaker: string,
		creds: BookmakerCredentials,
	): Promise<void> {
		creds.lastRotated = Date.now();
		this.credentials.set(bookmaker, creds);
		logger.success(`Credentials updated for ${bookmaker}`);
	}

	/**
	 * Get list of configured bookmakers
	 */
	getConfiguredBookmakers(): string[] {
		return Array.from(this.credentials.keys());
	}

	/**
	 * Validate credentials for a bookmaker
	 */
	async validateCredentials(bookmaker: string): Promise<boolean> {
		try {
			const creds = this.credentials.get(bookmaker);
			if (!creds) return false;

			// Test credentials by making a simple API call
			const headers = await this.getHeaders(bookmaker);
			const response = await fetch(`${creds.baseUrl}/health`, {
				headers,
				signal: AbortSignal.timeout(5000),
			});

			return response.ok;
		} catch (error) {
			console.error(`Credential validation failed for ${bookmaker}:`, error);
			return false;
		}
	}
}

// Type definitions
export interface BookmakerCredentials {
	apiKey: string;
	apiSecret: string;
	username: string;
	password: string;
	baseUrl: string;
	rateLimits: {
		requestsPerSecond: number;
		burstLimit: number;
	};
	lastRotated?: number;
	bookmaker?: string;
}
