// utils/toml-versioning.ts
// Versioning system for TOML configurations
import { readFileSync, writeFileSync } from "node:fs";
import { deepClone } from "./common";
import { parseTomlString, stringifyToml } from "./toml-utils";

export interface VersionInfo {
	version: string;
	timestamp: number;
	description?: string;
	author?: string;
	changes: string[];
	breaking: boolean;
}

export interface VersionedConfig {
	config: any;
	versions: VersionInfo[];
	currentVersion: string;
	metadata: {
		created: number;
		modified: number;
		schemaType?: string;
	};
}

export interface MigrationRule {
	from: string;
	to: string;
	description: string;
	breaking: boolean;
	migrate: (config: any) => any;
	rollback?: (config: any) => any;
}

class TomlVersioning {
	private migrations: Map<string, MigrationRule> = new Map();

	constructor() {
		this.registerDefaultMigrations();
	}

	/**
	 * Create versioned configuration
	 */
	createVersionedConfig(
		config: any,
		initialVersion: string = "1.0.0",
		metadata?: Partial<VersionedConfig["metadata"]>,
	): VersionedConfig {
		return {
			config: deepClone(config),
			versions: [
				{
					version: initialVersion,
					timestamp: Date.now(),
					description: "Initial version",
					author: "system",
					changes: ["Created configuration"],
					breaking: false,
				},
			],
			currentVersion: initialVersion,
			metadata: {
				created: Date.now(),
				modified: Date.now(),
				schemaType: this.detectSchemaType(config),
				...metadata,
			},
		};
	}

	/**
	 * Add new version
	 */
	addVersion(
		versionedConfig: VersionedConfig,
		newVersion: string,
		changes: string[],
		options: {
			description?: string;
			author?: string;
			breaking?: boolean;
		} = {},
	): VersionedConfig {
		const versionInfo: VersionInfo = {
			version: newVersion,
			timestamp: Date.now(),
			description: options.description || `Version ${newVersion}`,
			author: options.author || "system",
			changes,
			breaking: options.breaking || false,
		};

		const updated = deepClone(versionedConfig);
		updated.versions.push(versionInfo);
		updated.currentVersion = newVersion;
		updated.metadata.modified = Date.now();

		return updated;
	}

	/**
	 * Migrate configuration to new version
	 */
	migrate(
		versionedConfig: VersionedConfig,
		targetVersion: string,
	): VersionedConfig {
		const migrationPath = this.findMigrationPath(
			versionedConfig.currentVersion,
			targetVersion,
		);

		if (!migrationPath.length) {
			throw new Error(
				`No migration path from ${versionedConfig.currentVersion} to ${targetVersion}`,
			);
		}

		let config = deepClone(versionedConfig.config);
		const appliedMigrations: string[] = [];

		for (const migration of migrationPath) {
			config = migration.migrate(config);
			appliedMigrations.push(`${migration.from} -> ${migration.to}`);
		}

		return {
			...versionedConfig,
			config,
			currentVersion: targetVersion,
			metadata: {
				...versionedConfig.metadata,
				modified: Date.now(),
			},
		};
	}

	/**
	 * Register migration rule
	 */
	registerMigration(rule: MigrationRule): void {
		const key = `${rule.from}->${rule.to}`;
		this.migrations.set(key, rule);
	}

	/**
	 * Get version history
	 */
	getVersionHistory(versionedConfig: VersionedConfig): VersionInfo[] {
		return versionedConfig.versions.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Compare versions
	 */
	compareVersions(v1: string, v2: string): number {
		const parts1 = v1.split(".").map(Number);
		const parts2 = v2.split(".").map(Number);

		for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
			const part1 = parts1[i] || 0;
			const part2 = parts2[i] || 0;

			if (part1 < part2) return -1;
			if (part1 > part2) return 1;
		}

		return 0;
	}

	/**
	 * Save versioned configuration
	 */
	saveVersionedConfig(
		versionedConfig: VersionedConfig,
		filePath: string,
	): void {
		const content = stringifyToml(versionedConfig);
		writeFileSync(filePath, content, "utf-8");
	}

	/**
	 * Load versioned configuration
	 */
	loadVersionedConfig(filePath: string): VersionedConfig {
		const content = readFileSync(filePath, "utf-8");
		return parseTomlString(content);
	}

	/**
	 * Private methods
	 */
	private detectSchemaType(config: any): string | undefined {
		if (config.database && config.api) return "secrets";
		if (config.ui && config.features) return "modal";
		return undefined;
	}

	private findMigrationPath(from: string, to: string): MigrationRule[] {
		const path: MigrationRule[] = [];
		let current = from;

		while (current !== to) {
			const migration = this.findNextMigration(current, to);
			if (!migration) break;

			path.push(migration);
			current = migration.to;
		}

		return path;
	}

	private findNextMigration(
		from: string,
		target: string,
	): MigrationRule | null {
		// Find direct migration
		const directKey = `${from}->${target}`;
		if (this.migrations.has(directKey)) {
			return this.migrations.get(directKey)!;
		}

		// Find next step migration
		for (const [_key, migration] of this.migrations) {
			if (migration.from === from) {
				if (this.compareVersions(migration.to, target) <= 0) {
					return migration;
				}
			}
		}

		return null;
	}

	private registerDefaultMigrations(): void {
		// Example migrations
		this.registerMigration({
			from: "1.0.0",
			to: "1.1.0",
			description: "Add SSL settings to database",
			breaking: false,
			migrate: (config) => {
				if (config.database) {
					config.database.ssl = config.database.ssl || false;
				}
				return config;
			},
			rollback: (config) => {
				if (config.database && config.database.ssl === false) {
					delete config.database.ssl;
				}
				return config;
			},
		});

		this.registerMigration({
			from: "1.1.0",
			to: "2.0.0",
			description: "Restructure API configuration",
			breaking: true,
			migrate: (config) => {
				if (config.api) {
					config.api = {
						endpoints: {
							main: config.api.url || "",
							timeout: config.api.timeout || 5000,
						},
						auth: {
							key: config.api.key || "",
							secret: config.api.secret || "",
						},
					};
				}
				return config;
			},
		});
	}
}

// Global versioning instance
export const globalTOMLVersioning = new TomlVersioning();

// Convenience functions
export const createVersionedConfig = (
	config: any,
	version?: string,
	metadata?: any,
) => globalTOMLVersioning.createVersionedConfig(config, version, metadata);

export const migrateConfigVersion = (
	versionedConfig: any,
	targetVersion: string,
) => globalTOMLVersioning.migrate(versionedConfig, targetVersion);

export const registerConfigMigration = (rule: MigrationRule) =>
	globalTOMLVersioning.registerMigration(rule);
