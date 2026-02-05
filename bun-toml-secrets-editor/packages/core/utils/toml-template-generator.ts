// utils/toml-template-generator.ts
// Generate TOML configuration templates with customizable schemas and defaults

import { stringifyToml } from "./toml-utils";

export interface TemplateOptions {
	includeComments?: boolean;
	includeExamples?: boolean;
	includeEnvVars?: boolean;
	prettyFormat?: boolean;
	customValues?: Record<string, any>;
}

export interface TemplateSchema {
	name: string;
	description: string;
	version: string;
	sections: TemplateSection[];
}

export interface TemplateSection {
	name: string;
	description?: string;
	required?: boolean;
	fields: TemplateField[];
}

export interface TemplateField {
	name: string;
	type: "string" | "number" | "boolean" | "array" | "object";
	description?: string;
	required?: boolean;
	default?: any;
	example?: any;
	envVar?: string;
	validation?: {
		min?: number;
		max?: number;
		pattern?: string;
		options?: any[];
	};
}

class TomlTemplateGenerator {
	private schemas: Map<string, TemplateSchema> = new Map();

	constructor() {
		this.registerDefaultSchemas();
	}

	/**
	 * Register a custom template schema
	 */
	registerSchema(schema: TemplateSchema): void {
		this.schemas.set(schema.name, schema);
	}

	/**
	 * Generate TOML template from schema
	 */
	generateTemplate(schemaName: string, options: TemplateOptions = {}): string {
		const schema = this.schemas.get(schemaName);
		if (!schema) {
			throw new Error(`Schema '${schemaName}' not found`);
		}

		const template = this.buildTemplateFromSchema(schema, options);
		return this.formatTemplate(template, options);
	}

	/**
	 * Generate all available templates
	 */
	generateAllTemplates(options: TemplateOptions = {}): Record<string, string> {
		const templates: Record<string, string> = {};

		for (const [name] of this.schemas) {
			templates[name] = this.generateTemplate(name, options);
		}

		return templates;
	}

	/**
	 * Get list of available schemas
	 */
	getAvailableSchemas(): string[] {
		return Array.from(this.schemas.keys());
	}

	/**
	 * Get schema details
	 */
	getSchema(name: string): TemplateSchema | undefined {
		return this.schemas.get(name);
	}

	/**
	 * Register default schemas
	 */
	private registerDefaultSchemas(): void {
		// Secrets configuration schema
		this.registerSchema({
			name: "secrets",
			description:
				"Production secrets configuration with environment variables",
			version: "1.0.0",
			sections: [
				{
					name: "database",
					description: "Database connection configuration",
					required: true,
					fields: [
						{
							name: "host",
							type: "string",
							description: "Database host",
							required: true,
							default: "${DB_HOST:-localhost}",
							example: "localhost",
						},
						{
							name: "port",
							type: "number",
							description: "Database port",
							required: true,
							default: 5432,
							validation: { min: 1, max: 65535 },
						},
						{
							name: "name",
							type: "string",
							description: "Database name",
							required: true,
							default: "${DB_NAME:-myapp}",
							example: "myapp",
						},
						{
							name: "user",
							type: "string",
							description: "Database user",
							required: true,
							default: "${DB_USER:-postgres}",
							example: "postgres",
						},
						{
							name: "password",
							type: "string",
							description: "Database password",
							required: true,
							default: "${DB_PASSWORD}",
							example: "your-password-here",
						},
						{
							name: "ssl",
							type: "boolean",
							description: "Enable SSL connection",
							required: false,
							default: false,
						},
					],
				},
				{
					name: "api",
					description: "API service configuration",
					required: true,
					fields: [
						{
							name: "url",
							type: "string",
							description: "API base URL",
							required: true,
							default: "${API_URL:-https://api.example.com}",
							example: "https://api.example.com",
						},
						{
							name: "key",
							type: "string",
							description: "API authentication key",
							required: true,
							default: "${API_KEY}",
							example: "your-api-key-here",
						},
						{
							name: "secret",
							type: "string",
							description: "API secret",
							required: true,
							default: "${API_SECRET}",
							example: "your-api-secret-here",
						},
						{
							name: "timeout",
							type: "number",
							description: "Request timeout in milliseconds",
							required: false,
							default: 30000,
							validation: { min: 1000, max: 300000 },
						},
					],
				},
				{
					name: "redis",
					description: "Redis cache configuration",
					required: false,
					fields: [
						{
							name: "url",
							type: "string",
							description: "Redis connection URL",
							default: "${REDIS_URL:-redis://localhost:6379}",
							example: "redis://localhost:6379",
						},
						{
							name: "password",
							type: "string",
							description: "Redis password",
							default: "${REDIS_PASSWORD}",
							example: "your-redis-password",
						},
						{
							name: "db",
							type: "number",
							description: "Redis database number",
							default: 0,
							validation: { min: 0, max: 15 },
						},
						{
							name: "ttl",
							type: "number",
							description: "Default TTL in seconds",
							default: 3600,
							validation: { min: 1 },
						},
					],
				},
				{
					name: "security",
					description: "Security configuration",
					required: true,
					fields: [
						{
							name: "jwt_secret",
							type: "string",
							description: "JWT signing secret",
							required: true,
							default: "${JWT_SECRET}",
							example: "your-jwt-secret-here-min-32-chars",
						},
						{
							name: "encryption_key",
							type: "string",
							description: "Data encryption key",
							required: true,
							default: "${ENCRYPTION_KEY}",
							example: "your-encryption-key-here-min-32-chars",
						},
						{
							name: "bcrypt_rounds",
							type: "number",
							description: "Password hashing rounds",
							default: 12,
							validation: { min: 10, max: 15 },
						},
					],
				},
			],
		});

		// Modal configuration schema
		this.registerSchema({
			name: "modal",
			description: "UI modal and feature configuration",
			version: "1.0.0",
			sections: [
				{
					name: "ui",
					description: "User interface settings",
					required: true,
					fields: [
						{
							name: "animationSpeed",
							type: "string",
							description: "Animation duration",
							default: "300ms",
							validation: { options: ["100ms", "200ms", "300ms", "500ms"] },
						},
						{
							name: "maxWidth",
							type: "string",
							description: "Maximum modal width",
							default: "2xl",
							validation: { options: ["sm", "md", "lg", "xl", "2xl", "full"] },
						},
						{
							name: "compactMode",
							type: "boolean",
							description: "Enable compact layout",
							default: false,
						},
					],
				},
				{
					name: "features",
					description: "Feature flags",
					required: true,
					fields: [
						{
							name: "showPerformanceMetrics",
							type: "boolean",
							description: "Show performance metrics",
							default: true,
						},
						{
							name: "showInternalExplanation",
							type: "boolean",
							description: "Show internal explanations",
							default: true,
						},
						{
							name: "showAIAudit",
							type: "boolean",
							description: "Show AI audit features",
							default: true,
						},
						{
							name: "enableFeedback",
							type: "boolean",
							description: "Enable user feedback",
							default: true,
						},
						{
							name: "enableHotReload",
							type: "boolean",
							description: "Enable configuration hot reload",
							default: false,
						},
						{
							name: "enableDebugMode",
							type: "boolean",
							description: "Enable debug mode",
							default: false,
						},
					],
				},
				{
					name: "colors",
					description: "Color scheme configuration",
					required: false,
					fields: [
						{
							name: "background",
							type: "string",
							description: "Background color",
							default: "#0f172a",
							example: "#0f172a",
						},
						{
							name: "border",
							type: "string",
							description: "Border color",
							default: "#1e293b",
							example: "#1e293b",
						},
						{
							name: "textPrimary",
							type: "string",
							description: "Primary text color",
							default: "#f1f5f9",
							example: "#f1f5f9",
						},
						{
							name: "textSecondary",
							type: "string",
							description: "Secondary text color",
							default: "#94a3b8",
							example: "#94a3b8",
						},
					],
				},
				{
					name: "shortcuts",
					description: "Keyboard shortcuts",
					required: false,
					fields: [
						{
							name: "close",
							type: "string",
							description: "Close modal shortcut",
							default: "Escape",
							example: "Escape",
						},
						{
							name: "sendFeedback",
							type: "string",
							description: "Send feedback shortcut",
							default: "Ctrl+Enter",
							example: "Ctrl+Enter",
						},
					],
				},
				{
					name: "audit",
					description: "Audit configuration",
					required: false,
					fields: [
						{
							name: "defaultProvider",
							type: "string",
							description: "Default audit provider",
							default: "gemini-flash",
							validation: { options: ["gemini-flash", "claude", "gpt-4"] },
						},
						{
							name: "timeoutMs",
							type: "number",
							description: "Audit timeout in milliseconds",
							default: 10000,
							validation: { min: 1000, max: 60000 },
						},
						{
							name: "provider",
							type: "string",
							description: "Audit provider override",
							default: "gemini-flash",
						},
					],
				},
			],
		});
	}

	/**
	 * Build template object from schema
	 */
	private buildTemplateFromSchema(
		schema: TemplateSchema,
		options: TemplateOptions,
	): any {
		const template: any = {};

		// Add metadata
		template._metadata = {
			generated: new Date().toISOString(),
			schema: schema.name,
			version: schema.version,
			description: schema.description,
		};

		// Build sections
		for (const section of schema.sections) {
			if (options.includeComments && section.description) {
				template[`# ${section.name}`] = section.description;
			}

			template[section.name] = this.buildSectionFromFields(
				section.fields,
				options,
			);
		}

		// Apply custom values
		if (options.customValues) {
			this.applyCustomValues(template, options.customValues);
		}

		return template;
	}

	/**
	 * Build section from field definitions
	 */
	private buildSectionFromFields(
		fields: TemplateField[],
		options: TemplateOptions,
	): any {
		const section: any = {};

		for (const field of fields) {
			let value: any;

			// Determine value based on options
			if (options.includeExamples && field.example !== undefined) {
				value = field.example;
			} else if (field.default !== undefined) {
				value = field.default;
			} else if (field.type === "boolean") {
				value = false;
			} else if (field.type === "number") {
				value = field.validation?.min || 0;
			} else if (field.type === "array") {
				value = [];
			} else if (field.type === "object") {
				value = {};
			} else {
				value = "";
			}

			// Add comments if enabled
			if (options.includeComments) {
				let comment = "";
				if (field.required) comment += "[REQUIRED] ";
				if (field.description) comment += field.description;
				if (field.envVar && options.includeEnvVars)
					comment += ` (Env: ${field.envVar})`;

				if (comment) {
					section[`# ${field.name}`] = comment;
				}
			}

			section[field.name] = value;
		}

		return section;
	}

	/**
	 * Apply custom values to template
	 */
	private applyCustomValues(
		template: any,
		customValues: Record<string, any>,
	): void {
		for (const [key, value] of Object.entries(customValues)) {
			if (key.includes(".")) {
				// Handle nested keys
				const keys = key.split(".");
				let current = template;

				for (let i = 0; i < keys.length - 1; i++) {
					if (!(keys[i] in current)) {
						current[keys[i]] = {};
					}
					current = current[keys[i]];
				}

				current[keys[keys.length - 1]] = value;
			} else {
				template[key] = value;
			}
		}
	}

	/**
	 * Format template as TOML string
	 */
	private formatTemplate(template: any, options: TemplateOptions): string {
		// Remove metadata if not needed
		if (!options.includeComments) {
			delete template._metadata;
		}

		return stringifyToml(template);
	}
}

// Global instance
export const templateGenerator = new TomlTemplateGenerator();

/**
 * Convenience functions
 */
export const generateTomlTemplate = (
	schemaName: string,
	options?: TemplateOptions,
) => templateGenerator.generateTemplate(schemaName, options);

export const generateAllTomlTemplates = (options?: TemplateOptions) =>
	templateGenerator.generateAllTemplates(options);

export const getAvailableTomlSchemas = () =>
	templateGenerator.getAvailableSchemas();
