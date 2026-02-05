// security/hardening.ts

import { secrets } from "bun";
import { validateSecretValue } from "../validators/secrets-syntax";

export class SecretsHardening {
	// Encrypt PRIVATE_ and SECRET_ variables before writing to TOML
	async encryptSecrets(toml: any, encryptionKey: string): Promise<any> {
		const encrypted = { ...toml };

		this.walkObject(encrypted, async (value, keyPath) => {
			if (typeof value === "string" && this.isSecretValue(value)) {
				const validation = validateSecretValue(value);
				const secretVar = validation.variables[0];

				if (
					secretVar.classification === "secret" ||
					secretVar.classification === "private"
				) {
					// Get the actual secret value from environment or keychain
					const plaintext =
						process.env[secretVar.name] ||
						(await secrets.get({
							service: "observatory-toml",
							name: secretVar.name,
						}));

					if (plaintext) {
						const _encryptedValue = await this.encrypt(
							plaintext,
							encryptionKey,
						);

						// Replace with encrypted placeholder
						this.setNestedValue(
							encrypted,
							keyPath,
							`\${${secretVar.name}:-encrypted}`,
						);
					}
				}
			}
		});

		return encrypted;
	}

	// Decrypt secrets when loading TOML
	async decryptSecrets(toml: any, encryptionKey: string): Promise<any> {
		const decrypted = { ...toml };

		this.walkObject(decrypted, async (value, keyPath) => {
			if (typeof value === "string" && value.includes("encrypted")) {
				const validation = validateSecretValue(value);
				const secretVar = validation.variables[0];

				if (
					secretVar.classification === "secret" ||
					secretVar.classification === "private"
				) {
					// Get encrypted value from keychain and decrypt
					const encryptedValue = await secrets.get({
						service: "observatory-toml",
						name: secretVar.name,
					});

					if (encryptedValue) {
						try {
							const decryptedValue = await this.decrypt(
								encryptedValue,
								encryptionKey,
							);
							this.setNestedValue(
								decrypted,
								keyPath,
								`\${${secretVar.name}:-${decryptedValue}}`,
							);
						} catch (error) {
							console.warn(`Failed to decrypt ${secretVar.name}:`, error);
						}
					}
				}
			}
		});

		return decrypted;
	}

	private async encrypt(data: string, key: string): Promise<string> {
		// Use Web Crypto API (available in Bun)
		const iv = crypto.getRandomValues(new Uint8Array(16));
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(key),
			"PBKDF2",
			false,
			["deriveKey"],
		);

		const derivedKey = await crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: crypto.getRandomValues(new Uint8Array(16)),
				iterations: 100000,
				hash: "SHA-256",
			},
			keyMaterial,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt"],
		);

		const encrypted = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			derivedKey,
			new TextEncoder().encode(data),
		);

		// Combine IV and encrypted data
		const combined = new Uint8Array(iv.length + encrypted.byteLength);
		combined.set(iv);
		combined.set(new Uint8Array(encrypted), iv.length);

		return btoa(String.fromCharCode(...combined));
	}

	private async decrypt(encryptedData: string, key: string): Promise<string> {
		const combined = new Uint8Array(
			atob(encryptedData)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);
		const iv = combined.slice(0, 16);
		const encrypted = combined.slice(16);

		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(key),
			"PBKDF2",
			false,
			["deriveKey"],
		);

		const derivedKey = await crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: crypto.getRandomValues(new Uint8Array(16)), // This should be stored with the encrypted data
				iterations: 100000,
				hash: "SHA-256",
			},
			keyMaterial,
			{ name: "AES-GCM", length: 256 },
			false,
			["decrypt"],
		);

		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			derivedKey,
			encrypted,
		);

		return new TextDecoder().decode(decrypted);
	}

	private isSecretValue(value: string): boolean {
		return /^\$\{.*\}/.test(value);
	}

	private walkObject(
		obj: any,
		callback: (value: any, keyPath: string) => void,
		keyPath = "",
	) {
		for (const [key, value] of Object.entries(obj)) {
			const currentPath = keyPath ? `${keyPath}.${key}` : key;
			callback(value, currentPath);

			if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				this.walkObject(value, callback, currentPath);
			}
		}
	}

	private setNestedValue(obj: any, keyPath: string, value: any): void {
		const keys = keyPath.split(".");
		let current = obj;

		for (let i = 0; i < keys.length - 1; i++) {
			if (!(keys[i] in current)) {
				current[keys[i]] = {};
			}
			current = current[keys[i]];
		}

		current[keys[keys.length - 1]] = value;
	}

	// Additional security features
	validateSecurityPolicy(toml: any, policy: any): { violations: string[] } {
		const violations: string[] = [];

		this.walkObject(toml, (value, keyPath) => {
			if (typeof value === "string") {
				const validation = validateSecretValue(value);
				const secretVar = validation.variables[0];

				// Check against policy
				if (policy.blockedPatterns) {
					for (const pattern of policy.blockedPatterns) {
						if (keyPath.includes(pattern)) {
							violations.push(
								`Blocked pattern "${pattern}" found in ${keyPath}`,
							);
						}
					}
				}

				if (policy.requireDefaults && !secretVar.hasDefault) {
					violations.push(`Secret ${secretVar.name} requires a default value`);
				}

				if (
					policy.maxPerFile &&
					validation.variables.length > policy.maxPerFile
				) {
					violations.push(
						`Too many secrets in file (${validation.variables.length} > ${policy.maxPerFile})`,
					);
				}
			}
		});

		return { violations };
	}

	// Sanitize TOML for logging (remove sensitive values)
	sanitizeForLogging(toml: any): any {
		const sanitized = { ...toml };

		this.walkObject(sanitized, (value, keyPath) => {
			if (typeof value === "string" && this.isSecretValue(value)) {
				this.setNestedValue(sanitized, keyPath, "[REDACTED]");
			}
		});

		return sanitized;
	}
}
