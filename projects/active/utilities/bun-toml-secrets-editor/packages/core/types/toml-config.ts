// types/toml-config.ts
// Centralized TOML configuration schemas with native TypeScript validation

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
	host: string;
	port: number;
	name: string;
	user: string;
	password: string;
	ssl?: boolean;
	poolSize?: number;
}

/**
 * API configuration interface
 */
export interface ApiConfig {
	key: string;
	secret: string;
	url: string;
	timeout: number;
	retries?: number;
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
	url: string;
	password?: string;
	db?: number;
	ttl?: number;
}

/**
 * Security configuration interface
 */
export interface SecurityConfig {
	jwt_secret: string;
	encryption_key: string;
	bcrypt_rounds?: number;
	session_timeout?: number;
}

/**
 * Public configuration interface
 */
export interface PublicConfig {
	app_name: string;
	version: string;
	environment?: "development" | "staging" | "production";
	debug?: boolean;
}

/**
 * UI configuration interface
 */
export interface UiConfig {
	animationSpeed: string;
	maxWidth: "sm" | "md" | "lg" | "xl" | "2xl";
	compactMode: boolean;
	theme?: "light" | "dark" | "auto";
}

/**
 * Features configuration interface
 */
export interface FeaturesConfig {
	showPerformanceMetrics: boolean;
	showInternalExplanation: boolean;
	showAIAudit: boolean;
	enableFeedback: boolean;
	enableHotReload?: boolean;
	enableDebugMode?: boolean;
}

/**
 * Colors configuration interface
 */
export interface ColorsConfig {
	background: string;
	border: string;
	textPrimary: string;
	textSecondary: string;
	accent?: string;
}

/**
 * Shortcuts configuration interface
 */
export interface ShortcutsConfig {
	close: string;
	sendFeedback: string;
	save?: string;
	refresh?: string;
	help?: string;
}

/**
 * Audit configuration interface
 */
export interface AuditConfig {
	defaultProvider: string;
	timeoutMs: number;
	enabled?: boolean;
	logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * Modal configuration interface
 */
export interface ModalConfig {
	ui: UiConfig;
	features: FeaturesConfig;
	colors: ColorsConfig;
	shortcuts: ShortcutsConfig;
	audit: AuditConfig;
}

/**
 * Main secrets configuration interface
 */
export interface SecretsConfig {
	database: DatabaseConfig;
	api: ApiConfig;
	redis?: RedisConfig;
	security: SecurityConfig;
	public: PublicConfig;
}

/**
 * Configuration validator class
 */
export class ConfigValidator {
	/**
	 * Validate database configuration
	 */
	static validateDatabase(config: unknown): DatabaseConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Database config must be an object");
		}

		const db = config as any;

		if (typeof db.host !== "string" || !db.host.trim()) {
			throw new Error(
				"Database host is required and must be a non-empty string",
			);
		}

		if (typeof db.port !== "number" || db.port < 1 || db.port > 65535) {
			throw new Error("Database port must be a number between 1 and 65535");
		}

		if (typeof db.name !== "string" || !db.name.trim()) {
			throw new Error(
				"Database name is required and must be a non-empty string",
			);
		}

		if (typeof db.user !== "string" || !db.user.trim()) {
			throw new Error(
				"Database user is required and must be a non-empty string",
			);
		}

		if (typeof db.password !== "string" || !db.password.trim()) {
			throw new Error(
				"Database password is required and must be a non-empty string",
			);
		}

		return {
			host: db.host,
			port: db.port,
			name: db.name,
			user: db.user,
			password: db.password,
			ssl: typeof db.ssl === "boolean" ? db.ssl : false,
			poolSize: typeof db.poolSize === "number" ? db.poolSize : 10,
		};
	}

	/**
	 * Validate API configuration
	 */
	static validateApi(config: unknown): ApiConfig {
		if (!config || typeof config !== "object") {
			throw new Error("API config must be an object");
		}

		const api = config as any;

		if (typeof api.key !== "string" || !api.key.trim()) {
			throw new Error("API key is required and must be a non-empty string");
		}

		if (typeof api.secret !== "string" || !api.secret.trim()) {
			throw new Error("API secret is required and must be a non-empty string");
		}

		if (typeof api.url !== "string" || !api.url.trim()) {
			throw new Error("API URL is required and must be a non-empty string");
		}

		if (typeof api.timeout !== "number" || api.timeout < 0) {
			throw new Error("API timeout must be a positive number");
		}

		return {
			key: api.key,
			secret: api.secret,
			url: api.url,
			timeout: api.timeout,
			retries: typeof api.retries === "number" ? api.retries : 3,
		};
	}

	/**
	 * Validate Redis configuration
	 */
	static validateRedis(config: unknown): RedisConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Redis config must be an object");
		}

		const redis = config as any;

		if (typeof redis.url !== "string" || !redis.url.trim()) {
			throw new Error("Redis URL is required and must be a non-empty string");
		}

		return {
			url: redis.url,
			password: redis.password,
			db: typeof redis.db === "number" ? redis.db : 0,
			ttl: typeof redis.ttl === "number" ? redis.ttl : 3600,
		};
	}

	/**
	 * Validate security configuration
	 */
	static validateSecurity(config: unknown): SecurityConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Security config must be an object");
		}

		const security = config as any;

		if (
			typeof security.jwt_secret !== "string" ||
			!security.jwt_secret.trim()
		) {
			throw new Error(
				"Security JWT secret is required and must be a non-empty string",
			);
		}

		if (
			typeof security.encryption_key !== "string" ||
			!security.encryption_key.trim()
		) {
			throw new Error(
				"Security encryption key is required and must be a non-empty string",
			);
		}

		return {
			jwt_secret: security.jwt_secret,
			encryption_key: security.encryption_key,
			bcrypt_rounds:
				typeof security.bcrypt_rounds === "number"
					? security.bcrypt_rounds
					: 12,
			session_timeout:
				typeof security.session_timeout === "number"
					? security.session_timeout
					: 3600,
		};
	}

	/**
	 * Validate public configuration
	 */
	static validatePublic(config: unknown): PublicConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Public config must be an object");
		}

		const publicConfig = config as any;

		if (
			typeof publicConfig.app_name !== "string" ||
			!publicConfig.app_name.trim()
		) {
			throw new Error(
				"Public app name is required and must be a non-empty string",
			);
		}

		if (
			typeof publicConfig.version !== "string" ||
			!publicConfig.version.trim()
		) {
			throw new Error(
				"Public version is required and must be a non-empty string",
			);
		}

		return {
			app_name: publicConfig.app_name,
			version: publicConfig.version,
			environment: publicConfig.environment || "development",
			debug:
				typeof publicConfig.debug === "boolean" ? publicConfig.debug : false,
		};
	}

	/**
	 * Validate UI configuration
	 */
	static validateUi(config: unknown): UiConfig {
		if (!config || typeof config !== "object") {
			throw new Error("UI config must be an object");
		}

		const ui = config as any;

		if (typeof ui.animationSpeed !== "string" || !ui.animationSpeed.trim()) {
			throw new Error(
				"UI animation speed is required and must be a non-empty string",
			);
		}

		if (!["sm", "md", "lg", "xl", "2xl"].includes(ui.maxWidth)) {
			throw new Error("UI max width must be one of: sm, md, lg, xl, 2xl");
		}

		if (typeof ui.compactMode !== "boolean") {
			throw new Error("UI compact mode must be a boolean");
		}

		return {
			animationSpeed: ui.animationSpeed,
			maxWidth: ui.maxWidth,
			compactMode: ui.compactMode,
			theme: ui.theme || "auto",
		};
	}

	/**
	 * Validate features configuration
	 */
	static validateFeatures(config: unknown): FeaturesConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Features config must be an object");
		}

		const features = config as any;

		return {
			showPerformanceMetrics:
				typeof features.showPerformanceMetrics === "boolean"
					? features.showPerformanceMetrics
					: false,
			showInternalExplanation:
				typeof features.showInternalExplanation === "boolean"
					? features.showInternalExplanation
					: false,
			showAIAudit:
				typeof features.showAIAudit === "boolean"
					? features.showAIAudit
					: false,
			enableFeedback:
				typeof features.enableFeedback === "boolean"
					? features.enableFeedback
					: false,
			enableHotReload:
				typeof features.enableHotReload === "boolean"
					? features.enableHotReload
					: false,
			enableDebugMode:
				typeof features.enableDebugMode === "boolean"
					? features.enableDebugMode
					: false,
		};
	}

	/**
	 * Validate colors configuration
	 */
	static validateColors(config: unknown): ColorsConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Colors config must be an object");
		}

		const colors = config as any;

		if (typeof colors.background !== "string" || !colors.background.trim()) {
			throw new Error(
				"Colors background is required and must be a non-empty string",
			);
		}

		if (typeof colors.border !== "string" || !colors.border.trim()) {
			throw new Error(
				"Colors border is required and must be a non-empty string",
			);
		}

		if (typeof colors.textPrimary !== "string" || !colors.textPrimary.trim()) {
			throw new Error(
				"Colors text primary is required and must be a non-empty string",
			);
		}

		if (
			typeof colors.textSecondary !== "string" ||
			!colors.textSecondary.trim()
		) {
			throw new Error(
				"Colors text secondary is required and must be a non-empty string",
			);
		}

		return {
			background: colors.background,
			border: colors.border,
			textPrimary: colors.textPrimary,
			textSecondary: colors.textSecondary,
			accent: colors.accent,
		};
	}

	/**
	 * Validate shortcuts configuration
	 */
	static validateShortcuts(config: unknown): ShortcutsConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Shortcuts config must be an object");
		}

		const shortcuts = config as any;

		if (typeof shortcuts.close !== "string" || !shortcuts.close.trim()) {
			throw new Error(
				"Shortcuts close is required and must be a non-empty string",
			);
		}

		if (
			typeof shortcuts.sendFeedback !== "string" ||
			!shortcuts.sendFeedback.trim()
		) {
			throw new Error(
				"Shortcuts send feedback is required and must be a non-empty string",
			);
		}

		return {
			close: shortcuts.close,
			sendFeedback: shortcuts.sendFeedback,
			save: shortcuts.save,
			refresh: shortcuts.refresh,
			help: shortcuts.help,
		};
	}

	/**
	 * Validate audit configuration
	 */
	static validateAudit(config: unknown): AuditConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Audit config must be an object");
		}

		const audit = config as any;

		if (
			typeof audit.defaultProvider !== "string" ||
			!audit.defaultProvider.trim()
		) {
			throw new Error(
				"Audit default provider is required and must be a non-empty string",
			);
		}

		if (typeof audit.timeoutMs !== "number" || audit.timeoutMs < 0) {
			throw new Error("Audit timeout must be a positive number");
		}

		return {
			defaultProvider: audit.defaultProvider,
			timeoutMs: audit.timeoutMs,
			enabled: audit.enabled,
			logLevel: audit.logLevel,
		};
	}

	/**
	 * Validate modal configuration
	 */
	static validateModal(config: unknown): ModalConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Modal config must be an object");
		}

		const modal = config as any;

		return {
			ui: ConfigValidator.validateUi(modal.ui),
			features: ConfigValidator.validateFeatures(modal.features),
			colors: ConfigValidator.validateColors(modal.colors),
			shortcuts: ConfigValidator.validateShortcuts(modal.shortcuts),
			audit: ConfigValidator.validateAudit(modal.audit),
		};
	}

	/**
	 * Validate secrets configuration
	 */
	static validateSecrets(config: unknown): SecretsConfig {
		if (!config || typeof config !== "object") {
			throw new Error("Secrets config must be an object");
		}

		const secrets = config as any;

		return {
			database: ConfigValidator.validateDatabase(secrets.database),
			api: ConfigValidator.validateApi(secrets.api),
			redis: secrets.redis
				? ConfigValidator.validateRedis(secrets.redis)
				: undefined,
			security: ConfigValidator.validateSecurity(secrets.security),
			public: ConfigValidator.validatePublic(secrets.public),
		};
	}

	/**
	 * Safe validation methods for error handling
	 */
	static safeValidateSecrets(
		config: unknown,
	):
		| { success: true; data: SecretsConfig }
		| { success: false; error: string } {
		try {
			const data = ConfigValidator.validateSecrets(config);
			return { success: true, data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	static safeValidateModal(
		config: unknown,
	): { success: true; data: ModalConfig } | { success: false; error: string } {
		try {
			const data = ConfigValidator.validateModal(config);
			return { success: true, data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}

/**
 * Environment variable pattern for expansion
 */
export const EnvVarPattern = /\$\{([^}]+)\}/;
