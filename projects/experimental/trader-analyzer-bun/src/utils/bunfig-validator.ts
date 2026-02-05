/**
 * ORCA – The sharpest line in the water.
 * File: src/utils/bunfig-validator.ts
 * Runtime: Bun 1.3.3+
 * Canonical IDs: UUIDv5 (namespace 6ba7b810-9dad-11d1-80b4-00c04fd430c8)
 * Zero external deps unless explicitly listed.
 */

// [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CONFIG-VALIDATION@0.1.11;instance-id=ORCA-BUNFIG-VALID-001;version=0.1.11}][PROPERTIES:{validation={value:"post-parse-strict";@root:"ROOT-TOML-V1.0";@reject:"invalid-scopes"}}][CLASS:BunfigValidator][#REF:v-0.1.11.BP.CONFIG.1.0.A.1.1.BUNFIG.1.1]]

/**
 * Scoped registry configuration (post-parse)
 */
type ScopedRegistryConfig =
	| string
	| {
			url: string;
			token?: string;
			username?: string;
			password?: string;
	  };

/**
 * Bunfig configuration structure (post-parse)
 */
interface BunfigConfig {
	install?: {
		scopes?: Record<string, ScopedRegistryConfig>;
		registry?: string;
		cafile?: string;
		prefer?: "offline" | "immutable" | "default";
		exact?: boolean;
	};
	run?: {
		executor?: string;
		args?: string[];
	};
	test?: {
		coveragePathIgnorePatterns?: string[];
		pool?: "threads" | "processes";
	};
}

/**
 * Validation result
 */
interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validate scope name format
 * Pattern: @[a-z0-9-]+
 */
function isValidScopeName(scope: string): boolean {
	if (!scope.startsWith("@")) return false;
	const name = scope.slice(1);
	return /^[a-z0-9-]+$/.test(name);
}

/**
 * Validate URL format
 */
function isValidURL(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Validate scoped registry configuration
 */
function validateScopedRegistry(
	scope: string,
	config: ScopedRegistryConfig,
): { valid: boolean; error?: string } {
	if (!isValidScopeName(scope)) {
		return {
			valid: false,
			error: `Invalid scope name: ${scope}. Must match pattern @[a-z0-9-]+`,
		};
	}

	if (typeof config === "string") {
		if (!isValidURL(config)) {
			return {
				valid: false,
				error: `Invalid registry URL for scope ${scope}: ${config}`,
			};
		}
		return { valid: true };
	}

	if (typeof config === "object" && config !== null) {
		if (typeof config.url !== "string") {
			return {
				valid: false,
				error: `Missing or invalid url for scope ${scope}`,
			};
		}

		if (!isValidURL(config.url)) {
			return {
				valid: false,
				error: `Invalid registry URL for scope ${scope}: ${config.url}`,
			};
		}

		const hasAuth =
			config.token !== undefined ||
			(config.username !== undefined && config.password !== undefined);

		if (!hasAuth) {
			return {
				valid: false,
				error: `Missing authentication for scope ${scope}. Provide token or username/password`,
			};
		}

		return { valid: true };
	}

	return {
		valid: false,
		error: `Invalid configuration type for scope ${scope}. Expected string or object`,
	};
}

/**
 * Validate bunfig configuration (post-parse)
 *
 * @param config - Parsed bunfig configuration
 * @returns Validation result with errors and warnings
 */
export function validateBunfig(config: BunfigConfig): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!config.install) {
		return { valid: true, errors: [], warnings: [] };
	}

	if (config.install.scopes) {
		for (const [scope, scopeConfig] of Object.entries(config.install.scopes)) {
			const result = validateScopedRegistry(scope, scopeConfig);
			if (!result.valid) {
				errors.push(result.error!);
			}
		}
	}

	if (config.install.registry) {
		if (!isValidURL(config.install.registry)) {
			errors.push(`Invalid global registry URL: ${config.install.registry}`);
		}
	}

	if (config.install.prefer) {
		const validPrefers = ["offline", "immutable", "default"];
		if (!validPrefers.includes(config.install.prefer)) {
			warnings.push(
				`Unknown prefer value: ${config.install.prefer}. Valid values: ${validPrefers.join(", ")}`,
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Validate scope name format
 */
export function validateScopeName(scope: string): boolean {
	return isValidScopeName(scope);
}

/**
 * Validate registry URL format
 */
export function validateRegistryURL(url: string): boolean {
	return isValidURL(url);
}
