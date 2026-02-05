// utils/toml-encryption.ts
// Encryption utilities for sensitive TOML configuration values
import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import { parseTomlString, stringifyToml } from "./toml-utils";

export interface EncryptionOptions {
	algorithm?: string;
	keyLength?: number;
	ivLength?: number;
	tagLength?: number;
	encoding?: "base64" | "hex";
}

export interface EncryptedValue {
	encrypted: boolean;
	algorithm: string;
	iv: string;
	tag?: string;
	data: string;
	encoding: string;
}

export interface EncryptionMetadata {
	encrypted: string[];
	algorithm: string;
	timestamp: string;
	keyId?: string;
}

export class TomlEncryption {
	private options: Required<EncryptionOptions>;
	private masterKey: Buffer;

	constructor(masterKey: string | Buffer, options: EncryptionOptions = {}) {
		this.options = {
			algorithm: options.algorithm || "aes-256-gcm",
			keyLength: options.keyLength || 32,
			ivLength: options.ivLength || 16,
			tagLength: options.tagLength || 16,
			encoding: options.encoding || "base64",
		};

		this.masterKey =
			typeof masterKey === "string"
				? createHash("sha256").update(masterKey).digest()
				: masterKey;
	}

	/**
	 * Encrypt sensitive values in TOML configuration
	 */
	encryptValues(
		config: any,
		sensitivePaths: string[] = [],
	): { config: any; metadata: EncryptionMetadata } {
		const encryptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
		const encryptedPaths: string[] = [];

		// Default sensitive paths
		const defaultSensitivePaths = [
			"database.password",
			"api.key",
			"api.secret",
			"redis.password",
			"security.jwt_secret",
			"security.encryption_key",
			"*.password",
			"*.secret",
			"*.key",
			"*.token",
		];

		const allSensitivePaths = [...defaultSensitivePaths, ...sensitivePaths];

		// Encrypt matching values
		this.encryptMatchingPaths(
			encryptedConfig,
			"",
			allSensitivePaths,
			encryptedPaths,
		);

		// Add encryption metadata
		encryptedConfig._encryption = {
			encrypted: true,
			algorithm: this.options.algorithm,
			timestamp: new Date().toISOString(),
			encryptedPaths,
		};

		return {
			config: encryptedConfig,
			metadata: {
				encrypted: encryptedPaths,
				algorithm: this.options.algorithm,
				timestamp: new Date().toISOString(),
			},
		};
	}

	/**
	 * Decrypt sensitive values in TOML configuration
	 */
	decryptValues(config: any): any {
		if (!config._encryption?.encrypted) {
			return config;
		}

		const decryptedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
		const encryptedPaths = config._encryption.encryptedPaths || [];

		// Decrypt each encrypted path
		for (const path of encryptedPaths) {
			const encryptedValue = this.getNestedValue(decryptedConfig, path);
			if (
				encryptedValue &&
				typeof encryptedValue === "object" &&
				encryptedValue.encrypted
			) {
				try {
					const decryptedValue = this.decrypt(encryptedValue);
					this.setNestedValue(decryptedConfig, path, decryptedValue);
				} catch (error) {
					throw new Error(`Failed to decrypt value at ${path}: ${error}`);
				}
			}
		}

		// Remove encryption metadata
		delete decryptedConfig._encryption;

		return decryptedConfig;
	}

	/**
	 * Encrypt a single value
	 */
	encrypt(value: string): EncryptedValue {
		if (typeof value !== "string") {
			throw new Error("Only string values can be encrypted");
		}

		const iv = randomBytes(this.options.ivLength);
		const cipher = createCipheriv(this.options.algorithm, this.masterKey, iv);

		let encrypted = cipher.update(value, "utf8", this.options.encoding);
		encrypted += cipher.final(this.options.encoding);

		const result: EncryptedValue = {
			encrypted: true,
			algorithm: this.options.algorithm,
			iv: iv.toString(this.options.encoding),
			data: encrypted,
			encoding: this.options.encoding,
		};

		// Add authentication tag for authenticated encryption
		if (this.options.algorithm.includes("gcm") && "getAuthTag" in cipher) {
			result.tag = (cipher as any).getAuthTag().toString(this.options.encoding);
		}

		return result;
	}

	/**
	 * Decrypt a single value
	 */
	decrypt(encryptedValue: EncryptedValue): string {
		if (!encryptedValue.encrypted) {
			throw new Error("Value is not encrypted");
		}

		const iv = Buffer.from(
			encryptedValue.iv,
			encryptedValue.encoding as BufferEncoding,
		);
		const decipher = createDecipheriv(
			encryptedValue.algorithm,
			this.masterKey,
			iv,
		);

		// Set authentication tag for authenticated encryption
		if (
			encryptedValue.tag &&
			encryptedValue.algorithm.includes("gcm") &&
			"setAuthTag" in decipher
		) {
			(decipher as any).setAuthTag(
				Buffer.from(
					encryptedValue.tag,
					encryptedValue.encoding as BufferEncoding,
				),
			);
		}

		let decrypted = decipher.update(
			encryptedValue.data,
			encryptedValue.encoding as BufferEncoding,
			"utf8",
		);
		decrypted += decipher.final("utf8");

		return decrypted;
	}

	/**
	 * Encrypt entire TOML file
	 */
	encryptFile(tomlContent: string, sensitivePaths?: string[]): string {
		const config = parseTomlString(tomlContent);
		const { config: encryptedConfig } = this.encryptValues(
			config,
			sensitivePaths,
		);
		return stringifyToml(encryptedConfig);
	}

	/**
	 * Decrypt entire TOML file
	 */
	decryptFile(encryptedTomlContent: string): string {
		const config = parseTomlString(encryptedTomlContent);
		const decryptedConfig = this.decryptValues(config);
		return stringifyToml(decryptedConfig);
	}

	/**
	 * Generate encryption key from environment variable or password
	 */
	static generateKey(source: string, length: number = 32): Buffer {
		return createHash("sha256").update(source).digest().slice(0, length);
	}

	/**
	 * Generate random encryption key
	 */
	static generateRandomKey(length: number = 32): Buffer {
		return randomBytes(length);
	}

	/**
	 * Check if configuration contains encrypted values
	 */
	hasEncryptedValues(config: any): boolean {
		return config._encryption?.encrypted === true;
	}

	/**
	 * Get encryption metadata
	 */
	getEncryptionMetadata(config: any): EncryptionMetadata | null {
		if (!this.hasEncryptedValues(config)) {
			return null;
		}

		return {
			encrypted: config._encryption.encryptedPaths || [],
			algorithm: config._encryption.algorithm,
			timestamp: config._encryption.timestamp,
		};
	}

	/**
	 * Rotate encryption key (decrypt with old key, encrypt with new key)
	 */
	rotateKey(
		oldConfig: any,
		newMasterKey: string | Buffer,
	): { config: any; metadata: EncryptionMetadata } {
		// Decrypt with current key
		const decryptedConfig = this.decryptValues(oldConfig);

		// Create new encryptor with new key
		const newEncryptor = new TomlEncryption(newMasterKey, this.options);

		// Get encrypted paths from metadata
		const encryptedPaths = oldConfig._encryption?.encryptedPaths || [];

		// Re-encrypt with new key
		return newEncryptor.encryptValues(decryptedConfig, encryptedPaths);
	}

	/**
	 * Recursively encrypt matching paths
	 */
	private encryptMatchingPaths(
		obj: any,
		currentPath: string,
		sensitivePaths: string[],
		encryptedPaths: string[],
	): void {
		if (typeof obj !== "object" || obj === null) {
			return;
		}

		for (const [key, value] of Object.entries(obj)) {
			const fullPath = currentPath ? `${currentPath}.${key}` : key;

			if (
				typeof value === "string" &&
				this.shouldEncrypt(fullPath, sensitivePaths)
			) {
				obj[key] = this.encrypt(value);
				encryptedPaths.push(fullPath);
			} else if (typeof value === "object" && value !== null) {
				this.encryptMatchingPaths(
					value,
					fullPath,
					sensitivePaths,
					encryptedPaths,
				);
			}
		}
	}

	/**
	 * Check if a path should be encrypted
	 */
	private shouldEncrypt(path: string, sensitivePaths: string[]): boolean {
		for (const sensitivePath of sensitivePaths) {
			if (this.pathMatches(path, sensitivePath)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if path matches pattern (supports wildcards)
	 */
	private pathMatches(path: string, pattern: string): boolean {
		if (pattern === path) {
			return true;
		}

		if (pattern.includes("*")) {
			const regex = new RegExp(pattern.replace(/\*/g, ".*"));
			return regex.test(path);
		}

		return false;
	}

	/**
	 * Get nested value using dot notation
	 */
	private getNestedValue(obj: any, path: string): any {
		const keys = path.split(".");
		let current = obj;

		for (const key of keys) {
			if (current === null || current === undefined || !(key in current)) {
				return undefined;
			}
			current = current[key];
		}

		return current;
	}

	/**
	 * Set nested value using dot notation
	 */
	private setNestedValue(obj: any, path: string, value: any): void {
		const keys = path.split(".");
		let current = obj;

		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (!(key in current) || typeof current[key] !== "object") {
				current[key] = {};
			}
			current = current[key];
		}

		current[keys[keys.length - 1]] = value;
	}
}

// Default encryptor instance
export const defaultTOMLEncryptor = new TomlEncryption(
	process.env.TOML_ENCRYPTION_KEY || "default-key-change-in-production",
);

// Convenience functions
export const encryptTOMLValues = (config: any, sensitivePaths?: string[]) =>
	defaultTOMLEncryptor.encryptValues(config, sensitivePaths);

export const decryptTOMLValues = (config: any) =>
	defaultTOMLEncryptor.decryptValues(config);

export const encryptTOMLFile = (content: string, sensitivePaths?: string[]) =>
	defaultTOMLEncryptor.encryptFile(content, sensitivePaths);

export const decryptTOMLFile = (content: string) =>
	defaultTOMLEncryptor.decryptFile(content);
