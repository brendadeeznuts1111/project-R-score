/**
 * @fileoverview Bun.secrets Type Definitions with Version Control
 * @description Extended type definitions for Bun.secrets with version control support
 * @module types/bun-secrets
 * 
 * [DoD][CLASS:SecretManagement][SCOPE:FullLifecycle]
 */

/**
 * Extended Bun.SecretsOptions with version control
 * 
 * Extends the base Bun.secrets interface to include version tracking
 */
declare namespace Bun {
	interface SecretsOptions {
		service: string; // ✅ Service isolation (nexus, github, sports-api)
		name: string;    // ✅ Scoped naming (mcp.bun.apiKey)
		value?: string;  // ✅ Value (for set operations)
		version?: number; // ✅ Version control for secret rotation (optional)
	}

	interface Secrets {
		/**
		 * Get secret value
		 * @param options - Secret options (service, name, optional version)
		 * @returns Secret value or null if not found
		 */
		get(options: SecretsOptions): Promise<string | null>;

		/**
		 * Set secret value
		 * 
		 * Bun v1.3.4+ API: set() takes two parameters (options, value)
		 * Format: await Bun.secrets.set({ service, name }, value)
		 * 
		 * Note: TypeScript types may show value in options, but runtime API uses two parameters
		 * 
		 * @param options - Secret options (service, name) - WITHOUT value property
		 * @param value - Secret value to store (second parameter)
		 */
		set(options: Omit<SecretsOptions, "value">, value: string): Promise<void>;

		/**
		 * Delete secret
		 * @param options - Secret options (service, name)
		 * @returns true if deleted, false if not found
		 */
		delete(options: SecretsOptions): Promise<boolean>;
	}

	const secrets: Secrets;
}

/**
 * Version-aware secret options
 * 
 * Extends Bun.SecretsOptions with version control metadata
 */
export interface VersionedSecretOptions extends Bun.SecretsOptions {
	version?: number; // Optional: specify version to retrieve
}

/**
 * Secret version metadata
 */
export interface SecretVersion {
	version: number;
	timestamp: number;
	operatorId?: string;
	reason?: "rotation" | "manual" | "emergency" | "rollback";
	fingerprint: string; // Hash of secret value (for verification)
}

/**
 * Secret version history
 */
export interface SecretVersionHistory {
	currentVersion: number;
	versions: SecretVersion[];
	lastRotation: number | null;
}
