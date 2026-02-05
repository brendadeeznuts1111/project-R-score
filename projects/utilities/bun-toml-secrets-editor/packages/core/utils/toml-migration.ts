// utils/toml-migration.ts
// Configuration migration utility for version upgrades and schema changes
import { readFileSync, writeFileSync } from "node:fs";
import { ConfigValidator } from "../types/toml-config";
import { parseTomlString, stringifyToml } from "./toml-utils";

export interface MigrationRule {
	version: string;
	description: string;
	up: (config: any) => any;
	down: (config: any) => any;
}

export interface MigrationOptions {
	backup?: boolean;
	dryRun?: boolean;
	validate?: boolean;
	backupPath?: string;
}

export class TomlMigrator {
	private migrations: MigrationRule[] = [];

	constructor(initialVersion: string = "1.0.0") {
		this.currentVersion = initialVersion;
		this.registerDefaultMigrations();
	}

	/**
	 * Register a new migration rule
	 */
	addMigration(rule: MigrationRule): void {
		this.migrations.push(rule);
		this.migrations.sort((a, b) => a.version.localeCompare(b.version));
	}

	/**
	 * Register default migrations for common scenarios
	 */
	private registerDefaultMigrations(): void {
		// Migration 1.0.0 -> 1.1.0: Add new audit provider field
		this.addMigration({
			version: "1.1.0",
			description: "Add audit.provider field with default value",
			up: (config) => {
				if (config.audit && !config.audit.provider) {
					config.audit.provider =
						config.audit.defaultProvider || "gemini-flash";
				}
				return config;
			},
			down: (config) => {
				if (config.audit) {
					delete config.audit.provider;
				}
				return config;
			},
		});

		// Migration 1.1.0 -> 1.2.0: Add database SSL configuration
		this.addMigration({
			version: "1.2.0",
			description: "Add database SSL configuration",
			up: (config) => {
				if (config.database && !config.database.ssl) {
					config.database.ssl = false;
				}
				return config;
			},
			down: (config) => {
				if (config.database) {
					delete config.database.ssl;
				}
				return config;
			},
		});

		// Migration 1.2.0 -> 1.3.0: Add Redis configuration
		this.addMigration({
			version: "1.3.0",
			description: "Add Redis configuration section",
			up: (config) => {
				if (!config.redis) {
					config.redis = {
						url: "${REDIS_URL:-redis://localhost:6379}",
						password: "${REDIS_PASSWORD}",
						db: 0,
						ttl: 3600,
					};
				}
				return config;
			},
			down: (config) => {
				delete config.redis;
				return config;
			},
		});

		// Migration 1.3.0 -> 1.4.0: Add feature flags
		this.addMigration({
			version: "1.4.0",
			description: "Add feature flags to configuration",
			up: (config) => {
				if (config.features && !config.features.enableHotReload) {
					config.features.enableHotReload = false;
					config.features.enableDebugMode = false;
				}
				return config;
			},
			down: (config) => {
				if (config.features) {
					delete config.features.enableHotReload;
					delete config.features.enableDebugMode;
				}
				return config;
			},
		});
	}

	/**
	 * Get current configuration version from file
	 */
	getCurrentVersion(filePath: string): string {
		try {
			const content = readFileSync(filePath, "utf-8");
			const config = parseTomlString(content);
			return config.version || config._version || "1.0.0";
		} catch {
			return "1.0.0";
		}
	}

	/**
	 * Get all available migration versions
	 */
	getAvailableVersions(): string[] {
		return this.migrations.map((m) => m.version);
	}

	/**
	 * Get pending migrations for a given version
	 */
	getPendingMigrations(fromVersion: string): MigrationRule[] {
		return this.migrations.filter((m) => m.version > fromVersion);
	}

	/**
	 * Create backup of configuration file
	 */
	private createBackup(filePath: string, backupPath?: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const defaultBackupPath = `${filePath}.backup.${timestamp}`;
		const finalBackupPath = backupPath || defaultBackupPath;

		const content = readFileSync(filePath, "utf-8");
		writeFileSync(finalBackupPath, content);

		return finalBackupPath;
	}

	/**
	 * Migrate configuration to target version
	 */
	async migrate(
		filePath: string,
		targetVersion?: string,
		options: MigrationOptions = {},
	): Promise<{
		success: boolean;
		backupPath?: string;
		migrations: string[];
		errors: string[];
	}> {
		const errors: string[] = [];
		const appliedMigrations: string[] = [];
		let backupPath: string | undefined;

		try {
			// Read current configuration
			const content = readFileSync(filePath, "utf-8");
			let config = parseTomlString(content);
			const currentVersion = this.getCurrentVersion(filePath);

			// Determine target version
			const finalVersion =
				targetVersion ||
				this.migrations[this.migrations.length - 1]?.version ||
				currentVersion;

			if (currentVersion === finalVersion) {
				return { success: true, migrations: [], errors: [] };
			}

			// Create backup if requested
			if (options.backup !== false) {
				backupPath = this.createBackup(filePath, options.backupPath);
			}

			// Get pending migrations
			const pendingMigrations = this.getPendingMigrations(
				currentVersion,
			).filter((m) => m.version <= finalVersion);

			// Apply migrations
			for (const migration of pendingMigrations) {
				try {
					config = migration.up(config);
					appliedMigrations.push(
						`${migration.version}: ${migration.description}`,
					);
				} catch (error) {
					errors.push(`Migration ${migration.version} failed: ${error}`);
				}
			}

			// Update version
			config._version = finalVersion;
			if (config.public) {
				config.public.version = finalVersion;
			}

			// Validate if requested
			if (options.validate) {
				const validation = this.validateConfig(config);
				if (!validation.success) {
					errors.push(`Validation failed: ${validation.error}`);
				}
			}

			// Write migrated configuration
			if (errors.length === 0 && !options.dryRun) {
				const migratedContent = stringifyToml(config);
				writeFileSync(filePath, migratedContent);
			}

			return {
				success: errors.length === 0,
				backupPath,
				migrations: appliedMigrations,
				errors,
			};
		} catch (error) {
			errors.push(`Migration failed: ${error}`);
			return {
				success: false,
				backupPath,
				migrations: appliedMigrations,
				errors,
			};
		}
	}

	/**
	 * Rollback migration to previous version
	 */
	async rollback(
		filePath: string,
		targetVersion: string,
		options: MigrationOptions = {},
	): Promise<{
		success: boolean;
		backupPath?: string;
		migrations: string[];
		errors: string[];
	}> {
		const errors: string[] = [];
		const appliedMigrations: string[] = [];
		let backupPath: string | undefined;

		try {
			const content = readFileSync(filePath, "utf-8");
			let config = parseTomlString(content);
			const currentVersion = this.getCurrentVersion(filePath);

			// Create backup
			if (options.backup !== false) {
				backupPath = this.createBackup(filePath, options.backupPath);
			}

			// Get migrations to rollback
			const migrationsToRollback = this.migrations
				.filter((m) => m.version > targetVersion && m.version <= currentVersion)
				.reverse();

			// Apply rollback migrations
			for (const migration of migrationsToRollback) {
				try {
					config = migration.down(config);
					appliedMigrations.push(
						`${migration.version}: ${migration.description}`,
					);
				} catch (error) {
					errors.push(`Rollback ${migration.version} failed: ${error}`);
				}
			}

			// Update version
			config._version = targetVersion;
			if (config.public) {
				config.public.version = targetVersion;
			}

			// Write rollback configuration
			if (errors.length === 0 && !options.dryRun) {
				const rolledBackContent = stringifyToml(config);
				writeFileSync(filePath, rolledBackContent);
			}

			return {
				success: errors.length === 0,
				backupPath,
				migrations: appliedMigrations,
				errors,
			};
		} catch (error) {
			errors.push(`Rollback failed: ${error}`);
			return {
				success: false,
				backupPath,
				migrations: appliedMigrations,
				errors,
			};
		}
	}

	/**
	 * Validate configuration against available schemas
	 */
	private validateConfig(config: any): { success: boolean; error?: string } {
		// Try modal schema first
		const modalValidation = ConfigValidator.safeValidateModal(config);
		if (modalValidation.success) {
			return { success: true };
		}

		// Try secrets schema
		const secretsValidation = ConfigValidator.safeValidateSecrets(config);
		if (secretsValidation.success) {
			return { success: true };
		}

		return {
			success: false,
			error: "Configuration does not match any known schema",
		};
	}

	/**
	 * Generate migration report
	 */
	generateReport(filePath: string): void {
		const currentVersion = this.getCurrentVersion(filePath);
		const pendingMigrations = this.getPendingMigrations(currentVersion);

		console.log(`📋 Migration Report for ${filePath}`);
		console.log(`📍 Current Version: ${currentVersion}`);
		console.log(
			`📦 Available Versions: ${this.getAvailableVersions().join(", ")}`,
		);
		console.log(`⏳ Pending Migrations: ${pendingMigrations.length}`);

		if (pendingMigrations.length > 0) {
			console.log("\n🔄 Pending Migrations:");
			pendingMigrations.forEach((m) => {
				console.log(`   ${m.version}: ${m.description}`);
			});
		}
	}
}
