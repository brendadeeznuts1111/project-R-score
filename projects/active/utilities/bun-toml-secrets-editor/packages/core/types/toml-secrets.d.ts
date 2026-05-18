// types/toml-secrets.d.ts
export interface TomlSecret {
	name: string;
	value: string;
	hasDefault: boolean;
	defaultValue?: string;
	classification: "public" | "private" | "secret" | "trusted" | "dangerous";
	isDangerous: boolean;
	location: { file: string; keyPath: string };
}

export interface ExtractedPattern {
	pattern: string;
	keyPath: string;
	envVars: string[];
	isDynamic: boolean;
	location: { file: string; keyPath: string };
	// Cross-reference fields
	secrets?: TomlSecret[];
	risk?: number;
}

export interface SecretVar {
	name: string;
	hasDefault: boolean;
	defaultValue?: string;
	classification: "public" | "private" | "secret" | "trusted" | "dangerous";
	isDangerous: boolean;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	variables: SecretVar[];
	riskScore: number;
}

export interface EditResult {
	path: string;
	originalHash: string;
	optimizedHash: string;
	secretsCount: number;
	riskScore: number;
	patterns: ExtractedPattern[];
	changes: string[];
}

export interface SyncResult {
	synced: Array<{ name: string; action: string }>;
	failed: Array<{ name: string; error: string }>;
}

export interface SecretPatternChain {
	[secretName: string]: ExtractedPattern[];
}

export interface RiskPatternChain {
	patterns: ExtractedPattern[];
	secretChain: SecretPatternChain;
	deduplicated: ExtractedPattern[];
}

export interface TomlPolicy {
	secrets: {
		allowedPrefixes: string[];
		blockedPatterns: string[];
		requireDefaults: boolean;
		maxPerFile: number;
	};
	validation: {
		scanUrlPatterns: boolean;
		failOnRisk: "low" | "medium" | "high" | "critical";
	};
}

export interface TomlSecretsEditorOptions {
	policyPath?: string;
	cacheDb?: string;
	syncWithBunSecrets?: boolean;
	serviceName?: string;
}

export interface SecretLifecycle {
	created: Date;
	lastRotated: Date;
	expiresAt?: Date;
	rotationPolicy: "manual" | "automatic" | "never";
	rotationIntervalDays?: number;
	lastUsed?: Date;
	usageCount: number;
	status: "active" | "expired" | "pending-rotation" | "deprecated";
}

export interface SecretPolicy {
	maxAgeDays: number;
	minEntropyBits: number;
	requireRotation: boolean;
	rotationIntervalDays: number;
	allowedClassifications: string[];
	blockedPatterns: string[];
	requireMFA: boolean;
	auditLevel: "none" | "basic" | "detailed" | "comprehensive";
}

// env.d.ts augmentation
declare module "bun" {
	interface Secrets {
		get(options: { service: string; name: string }): Promise<string | null>;
		set(options: {
			service: string;
			name: string;
			value: string;
		}): Promise<void>;
		delete(options: { service: string; name: string }): Promise<boolean>;
	}
}
