// utils/toml-backup-restore.ts
// Comprehensive backup and restore system for TOML configurations

import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { deepClone, generateId } from "./common";
import { parseTomlString, stringifyToml } from "./toml-utils";

export interface BackupOptions {
	backupDir?: string;
	compression?: boolean;
	encryption?: boolean;
	encryptionKey?: string;
	maxBackups?: number;
	includeMetadata?: boolean;
	includeHashes?: boolean;
	timestampFormat?: "iso" | "unix" | "readable";
}

export interface BackupMetadata {
	id: string;
	originalPath: string;
	backupPath: string;
	timestamp: number;
	timestampFormatted: string;
	size: number;
	hash: string;
	schemaType?: string;
	version?: string;
	compressed: boolean;
	encrypted: boolean;
	tags?: string[];
	description?: string;
	createdBy: string;
	environment?: string;
}

export interface RestoreOptions {
	validateOnRestore?: boolean;
	expandEnvVars?: boolean;
	preserveTimestamps?: boolean;
	createBackup?: boolean;
	overwriteExisting?: boolean;
}

export interface BackupStats {
	totalBackups: number;
	totalSize: number;
	oldestBackup?: Date;
	newestBackup?: Date;
	schemasBackedUp: Record<string, number>;
	environmentsBackedUp: Record<string, number>;
}

class TomlBackupRestore {
	private defaultOptions: Required<BackupOptions> = {
		backupDir: "./backups/toml",
		compression: false,
		encryption: false,
		encryptionKey: "",
		maxBackups: 50,
		includeMetadata: true,
		includeHashes: true,
		timestampFormat: "iso",
	};

	constructor(private options: BackupOptions = {}) {
		this.options = { ...this.defaultOptions, ...options };
		this.ensureBackupDirectory();
	}

	/**
	 * Create backup of TOML configuration
	 */
	async createBackup(
		filePath: string,
		options: Partial<BackupOptions> & {
			tags?: string[];
			description?: string;
			environment?: string;
		} = {},
	): Promise<BackupMetadata> {
		const mergedOptions = { ...this.options, ...options };

		try {
			// Read and parse TOML file
			const content = readFileSync(filePath, "utf-8");
			const config = parseTomlString(content);

			// Generate backup metadata
			const metadata: BackupMetadata = {
				id: generateId("backup"),
				originalPath: filePath,
				backupPath: "",
				timestamp: Date.now(),
				timestampFormatted: this.formatTimestamp(
					Date.now(),
					mergedOptions.timestampFormat!,
				),
				size: content.length,
				hash: this.calculateHash(content),
				schemaType: this.detectSchemaType(config),
				compressed: mergedOptions.compression!,
				encrypted: mergedOptions.encryption!,
				tags: options.tags || [],
				description: options.description,
				createdBy: "toml-backup-system",
				environment:
					options.environment || process.env.NODE_ENV || "development",
			};

			// Prepare backup content
			let backupContent = content;

			// Add metadata if requested
			if (mergedOptions.includeMetadata) {
				const configWithMetadata = deepClone(config);
				configWithMetadata._backup = {
					id: metadata.id,
					timestamp: metadata.timestamp,
					originalPath: filePath,
					hash: metadata.hash,
				};
				backupContent = stringifyToml(configWithMetadata);
			}

			// Apply compression if requested
			if (mergedOptions.compression) {
				backupContent = this.compressContent(backupContent);
			}

			// Apply encryption if requested
			if (mergedOptions.encryption && mergedOptions.encryptionKey) {
				backupContent = this.encryptContent(
					backupContent,
					mergedOptions.encryptionKey,
				);
			}

			// Generate backup filename
			const filename = this.generateBackupFilename(filePath, metadata);
			metadata.backupPath = join(mergedOptions.backupDir!, filename);

			// Write backup file
			writeFileSync(metadata.backupPath, backupContent, "utf-8");

			// Write metadata file
			if (mergedOptions.includeMetadata) {
				const metadataPath = metadata.backupPath.replace(".toml", ".meta.json");
				writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
			}

			// Cleanup old backups
			await this.cleanupOldBackups(filePath, mergedOptions.maxBackups!);

			return metadata;
		} catch (error) {
			throw new Error(`Failed to create backup for ${filePath}: ${error}`);
		}
	}

	/**
	 * Restore TOML configuration from backup
	 */
	async restoreBackup(
		backupId: string,
		targetPath?: string,
		options: RestoreOptions = {},
	): Promise<{ restoredPath: string; metadata: BackupMetadata }> {
		try {
			// Find backup file
			const backupFile = await this.findBackupFile(backupId);
			if (!backupFile) {
				throw new Error(`Backup with ID ${backupId} not found`);
			}

			// Load metadata
			const metadata = await this.loadBackupMetadata(backupFile);

			// Read backup content
			let content = readFileSync(backupFile, "utf-8");

			// Decrypt if needed
			if (metadata.encrypted && this.options.encryptionKey) {
				content = this.decryptContent(content, this.options.encryptionKey);
			}

			// Decompress if needed
			if (metadata.compressed) {
				content = this.decompressContent(content);
			}

			// Parse and validate configuration
			let config = parseTomlString(content);

			// Remove backup metadata from config if present
			if (config._backup) {
				delete config._backup;
				content = stringifyToml(config);
			}

			// Validate if requested
			if (options.validateOnRestore) {
				await this.validateConfiguration(config, metadata.schemaType);
			}

			// Expand environment variables if requested
			if (options.expandEnvVars) {
				config = this.expandEnvironmentVariables(config);
				content = stringifyToml(config);
			}

			// Determine target path
			const restoredPath = targetPath || metadata.originalPath;

			// Create backup of existing file if requested
			if (options.createBackup && existsSync(restoredPath)) {
				await this.createBackup(restoredPath, {
					tags: ["auto-backup-before-restore"],
					description: `Auto backup before restoring ${backupId}`,
				});
			}

			// Ensure target directory exists
			const targetDir = dirname(restoredPath);
			if (!existsSync(targetDir)) {
				mkdirSync(targetDir, { recursive: true });
			}

			// Write restored file
			writeFileSync(restoredPath, content, "utf-8");

			// Preserve timestamps if requested
			if (options.preserveTimestamps) {
				// This would require additional file system operations
				// For now, we'll skip timestamp preservation
			}

			return { restoredPath, metadata };
		} catch (error) {
			throw new Error(`Failed to restore backup ${backupId}: ${error}`);
		}
	}

	/**
	 * List all available backups
	 */
	listBackups(filter?: {
		schemaType?: string;
		environment?: string;
		tags?: string[];
		dateRange?: { start: Date; end: Date };
	}): BackupMetadata[] {
		const backups: BackupMetadata[] = [];

		if (!existsSync(this.options.backupDir)) {
			return backups;
		}

		const files = readdirSync(this.options.backupDir!, {
			withFileTypes: true,
		}).filter((dirent) => dirent.isFile() && dirent.name.endsWith(".toml"));

		for (const file of files) {
			try {
				const filePath = join(this.options.backupDir!, file.name);
				const metadata = this.loadBackupMetadataSync(filePath);

				if (this.matchesFilter(metadata, filter)) {
					backups.push(metadata);
				}
			} catch {}
		}

		return backups.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Get backup statistics
	 */
	getBackupStats(): BackupStats {
		const backups = this.listBackups();
		const schemas: Record<string, number> = {};
		const environments: Record<string, number> = {};
		let totalSize = 0;

		for (const backup of backups) {
			totalSize += backup.size;

			if (backup.schemaType) {
				schemas[backup.schemaType] = (schemas[backup.schemaType] || 0) + 1;
			}

			if (backup.environment) {
				environments[backup.environment] =
					(environments[backup.environment] || 0) + 1;
			}
		}

		return {
			totalBackups: backups.length,
			totalSize,
			oldestBackup:
				backups.length > 0
					? new Date(backups[backups.length - 1].timestamp)
					: undefined,
			newestBackup:
				backups.length > 0 ? new Date(backups[0].timestamp) : undefined,
			schemasBackedUp: schemas,
			environmentsBackedUp: environments,
		};
	}

	/**
	 * Delete backup
	 */
	async deleteBackup(backupId: string): Promise<boolean> {
		try {
			const backupFile = await this.findBackupFile(backupId);
			if (!backupFile) {
				return false;
			}

			// Delete backup file
			unlinkSync(backupFile);

			// Delete metadata file if exists
			const metadataFile = backupFile.replace(".toml", ".meta.json");
			if (existsSync(metadataFile)) {
				unlinkSync(metadataFile);
			}

			return true;
		} catch (error) {
			throw new Error(`Failed to delete backup ${backupId}: ${error}`);
		}
	}

	/**
	 * Cleanup old backups
	 */
	async cleanupOldBackups(
		filePath?: string,
		maxBackups?: number,
	): Promise<void> {
		const max = maxBackups || this.options.maxBackups!;
		const backups = this.listBackups(
			filePath
				? {
						/* filter by original path */
					}
				: undefined,
		);

		if (backups.length <= max) {
			return;
		}

		// Delete oldest backups
		const toDelete = backups.slice(max);
		for (const backup of toDelete) {
			await this.deleteBackup(backup.id);
		}
	}

	/**
	 * Export backup to external location
	 */
	async exportBackup(backupId: string, exportPath: string): Promise<void> {
		const backupFile = await this.findBackupFile(backupId);
		if (!backupFile) {
			throw new Error(`Backup ${backupId} not found`);
		}

		const content = readFileSync(backupFile, "utf-8");
		writeFileSync(exportPath, content, "utf-8");
	}

	/**
	 * Import backup from external location
	 */
	async importBackup(
		importPath: string,
		options: { validate?: boolean } = {},
	): Promise<BackupMetadata> {
		const content = readFileSync(importPath, "utf-8");

		// Validate TOML format if requested
		if (options.validate) {
			try {
				parseTomlString(content);
			} catch (error) {
				throw new Error(`Invalid TOML format: ${error}`);
			}
		}

		// Generate new backup metadata
		const metadata: BackupMetadata = {
			id: generateId("backup"),
			originalPath: basename(importPath),
			backupPath: join(
				this.options.backupDir!,
				`imported-${generateId()}.toml`,
			),
			timestamp: Date.now(),
			timestampFormatted: this.formatTimestamp(
				Date.now(),
				this.options.timestampFormat!,
			),
			size: content.length,
			hash: this.calculateHash(content),
			compressed: false,
			encrypted: false,
			createdBy: "toml-import-system",
		};

		// Write imported backup
		writeFileSync(metadata.backupPath, content, "utf-8");
		writeFileSync(
			metadata.backupPath.replace(".toml", ".meta.json"),
			JSON.stringify(metadata, null, 2),
		);

		return metadata;
	}

	/**
	 * Private helper methods
	 */
	private ensureBackupDirectory(): void {
		if (!existsSync(this.options.backupDir!)) {
			mkdirSync(this.options.backupDir!, { recursive: true });
		}
	}

	private formatTimestamp(timestamp: number, format: string): string {
		const date = new Date(timestamp);

		switch (format) {
			case "iso":
				return date.toISOString();
			case "unix":
				return timestamp.toString();
			case "readable":
				return date.toLocaleString();
			default:
				return date.toISOString();
		}
	}

	private calculateHash(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	private detectSchemaType(config: any): string | undefined {
		if (config.database && config.api) {
			return "secrets";
		}
		if (config.ui && config.features) {
			return "modal";
		}
		return undefined;
	}

	private generateBackupFilename(
		filePath: string,
		metadata: BackupMetadata,
	): string {
		const baseName = basename(filePath, ".toml");
		const timestamp = metadata.timestamp;
		return `${baseName}-${timestamp}-${metadata.id}.toml`;
	}

	private compressContent(content: string): string {
		// Simple compression placeholder - in real implementation, use gzip/zlib
		return content; // No compression for now
	}

	private decompressContent(content: string): string {
		// Simple decompression placeholder
		return content; // No decompression for now
	}

	private encryptContent(content: string, _key: string): string {
		// Simple encryption placeholder - in real implementation, use proper encryption
		return Buffer.from(content).toString("base64");
	}

	private decryptContent(content: string, _key: string): string {
		// Simple decryption placeholder
		return Buffer.from(content, "base64").toString();
	}

	private async findBackupFile(backupId: string): Promise<string | null> {
		const backups = this.listBackups();
		const backup = backups.find((b) => b.id === backupId);
		return backup ? backup.backupPath : null;
	}

	private async loadBackupMetadata(
		backupPath: string,
	): Promise<BackupMetadata> {
		const metadataPath = backupPath.replace(".toml", ".meta.json");

		if (existsSync(metadataPath)) {
			const content = readFileSync(metadataPath, "utf-8");
			return JSON.parse(content);
		}

		// Generate metadata from filename if metadata file doesn't exist
		const filename = basename(backupPath);
		const parts = filename.replace(".toml", "").split("-");
		const timestamp = parseInt(parts[parts.length - 2], 10) || Date.now();
		const id = parts[parts.length - 1] || generateId();

		return {
			id,
			originalPath: "unknown",
			backupPath,
			timestamp,
			timestampFormatted: this.formatTimestamp(
				timestamp,
				this.options.timestampFormat!,
			),
			size: 0,
			hash: "",
			compressed: false,
			encrypted: false,
			createdBy: "toml-backup-system",
		};
	}

	private loadBackupMetadataSync(backupPath: string): BackupMetadata {
		// Synchronous version for listBackups
		const metadataPath = backupPath.replace(".toml", ".meta.json");

		if (existsSync(metadataPath)) {
			const content = readFileSync(metadataPath, "utf-8");
			return JSON.parse(content);
		}

		// Generate minimal metadata
		const filename = basename(backupPath);
		return {
			id: filename.replace(".toml", ""),
			originalPath: "unknown",
			backupPath,
			timestamp: Date.now(),
			timestampFormatted: new Date().toISOString(),
			size: 0,
			hash: "",
			compressed: false,
			encrypted: false,
			createdBy: "toml-backup-system",
		};
	}

	private matchesFilter(metadata: BackupMetadata, filter?: any): boolean {
		if (!filter) return true;

		if (filter.schemaType && metadata.schemaType !== filter.schemaType) {
			return false;
		}

		if (filter.environment && metadata.environment !== filter.environment) {
			return false;
		}

		if (filter.tags && filter.tags.length > 0) {
			if (
				!metadata.tags ||
				!filter.tags.some((tag: string) => metadata.tags?.includes(tag))
			) {
				return false;
			}
		}

		if (filter.dateRange) {
			const date = new Date(metadata.timestamp);
			if (date < filter.dateRange.start || date > filter.dateRange.end) {
				return false;
			}
		}

		return true;
	}

	private async validateConfiguration(
		_config: any,
		schemaType?: string,
	): Promise<void> {
		// Use ConfigValidator for validation
		if (schemaType === "secrets") {
			// Validate secrets configuration
		} else if (schemaType === "modal") {
			// Validate modal configuration
		}
		// Add more validation as needed
	}

	private expandEnvironmentVariables(config: any): any {
		// Use existing environment variable expansion
		return config; // Placeholder
	}
}

// Global backup instance
export const globalTOMLBackup = new TomlBackupRestore();

// Convenience functions
export const createTOMLBackup = (filePath: string, options?: any) =>
	globalTOMLBackup.createBackup(filePath, options);

export const restoreTOMLBackup = (
	backupId: string,
	targetPath?: string,
	options?: any,
) => globalTOMLBackup.restoreBackup(backupId, targetPath, options);

export const listTOMLBackups = (filter?: any) =>
	globalTOMLBackup.listBackups(filter);

export const getTOMLBackupStats = () => globalTOMLBackup.getBackupStats();

// Export main class for advanced usage
export { TomlBackupRestore };
