/**
 * Enterprise Archive Manager - Enhanced Class-Based Architecture
 * Tier-1380 Secure Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Enterprise Team
 * @license MIT
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

// ─── Core Types & Interfaces ─────────────────────────────────────────────────────
export interface ArchiveConfiguration {
	compression?: "gzip" | "none";
	compressionLevel?: number;
	tenantId?: string;
	auditEnabled?: boolean;
	validateIntegrity?: boolean;
	outputPath?: string;
}

export interface ArchiveMetadata {
	archiveId: string;
	tenantId: string;
	createdAt: Date;
	fileCount: number;
	totalSize: number;
	compressionType: string;
	checksum: string;
	version: string;
}

export interface SecurityValidationResult {
	isValid: boolean;
	suspiciousPaths: string[];
	violations: string[];
	riskLevel: "low" | "medium" | "high" | "critical";
	recommendations: string[];
}

export interface PerformanceMetrics {
	creationTimeMs: number;
	compressionRatio: number;
	throughputMBps: number;
	memoryUsageMB: number;
}

// ─── Core Archive Manager Class ───────────────────────────────────────────────────
export class EnterpriseArchiveManager {
	private readonly dbPath: string;
	private readonly tenantId: string;
	private readonly auditDb: Database;

	constructor(
		tenantId: string = "default",
		dbPath: string = "./data/enterprise-archive.db",
	) {
		this.tenantId = tenantId;
		this.dbPath = dbPath;
		this.auditDb = new Database(dbPath, { create: true });
		this.initializeDatabase();
	}

	private initializeDatabase(): void {
		this.auditDb.exec(`
      CREATE TABLE IF NOT EXISTS archive_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        archive_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        file_count INTEGER,
        total_size INTEGER,
        compression_type TEXT,
        checksum TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        performance_metrics TEXT
      );

      CREATE TABLE IF NOT EXISTS archive_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        archive_id TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_checksum TEXT,
        security_flags TEXT,
        FOREIGN KEY (archive_id) REFERENCES archive_operations (archive_id)
      );

      CREATE TABLE IF NOT EXISTS security_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        archive_id TEXT,
        scan_timestamp TEXT NOT NULL,
        risk_level TEXT,
        suspicious_paths TEXT,
        violations TEXT,
        recommendations TEXT,
        FOREIGN KEY (archive_id) REFERENCES archive_operations (archive_id)
      );
    `);
	}

	/**
	 * Create secure enterprise archive with comprehensive validation
	 */
	async createSecureArchive(
		sourcePath: string,
		config: ArchiveConfiguration = {},
	): Promise<{
		archiveId: string;
		metadata: ArchiveMetadata;
		metrics: PerformanceMetrics;
	}> {
		const startTime = performance.now();
		const archiveId = randomUUID();
		const tenantId = config.tenantId || this.tenantId;

		console.log(`🔒 Creating secure archive: ${archiveId}`);
		console.log(`📁 Source: ${sourcePath}`);
		console.log(`🏢 Tenant: ${tenantId}`);

		try {
			// Validate source and collect files
			const fileCollection = await this.collectFiles(sourcePath);

			// Security validation
			const securityResult = await this.validateSecurity(fileCollection);
			if (securityResult.riskLevel === "critical") {
				throw new Error(
					`Critical security violations detected: ${securityResult.violations.join(", ")}`,
				);
			}

			// Create archive with compression
			const archiveOptions = this.buildArchiveOptions(config);
			const archive = new Bun.Archive(fileCollection.files, archiveOptions);

			// Generate output path
			const outputPath =
				config.outputPath || `./archives/${tenantId}/${archiveId}.tar.gz`;
			await Bun.write(outputPath, archive);

			// Calculate metrics
			const endTime = performance.now();
			const metrics = this.calculatePerformanceMetrics(
				fileCollection.totalSize,
				endTime - startTime,
			);

			// Generate metadata
			const metadata: ArchiveMetadata = {
				archiveId,
				tenantId,
				createdAt: new Date(),
				fileCount: fileCollection.fileCount,
				totalSize: fileCollection.totalSize,
				compressionType: config.compression || "none",
				checksum: await this.generateChecksum(outputPath),
				version: "2.0.0",
			};

			// Audit logging
			if (config.auditEnabled !== false) {
				await this.auditArchiveOperation(
					archiveId,
					"create",
					metadata,
					metrics,
					securityResult,
				);
			}

			console.log(`✅ Archive created: ${outputPath}`);
			console.log(
				`📊 Files: ${metadata.fileCount}, Size: ${(metadata.totalSize / 1024 / 1024).toFixed(2)}MB`,
			);
			console.log(
				`⚡ Performance: ${metrics.creationTimeMs.toFixed(2)}ms, ${metrics.throughputMBps.toFixed(1)}MB/s`,
			);

			return { archiveId, metadata, metrics };
		} catch (error) {
			console.error(
				`❌ Archive creation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Extract archive with comprehensive validation and security checks
	 */
	async extractSecureArchive(
		archivePath: string,
		outputPath: string,
		config: ArchiveConfiguration = {},
	): Promise<{ extractedFiles: number; securityResult: SecurityValidationResult }> {
		const startTime = performance.now();
		const archiveId = randomUUID();

		console.log(`📦 Extracting secure archive: ${archivePath}`);
		console.log(`📁 Target: ${outputPath}`);

		try {
			// Load and validate archive
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);

			// Security validation before extraction
			const files = await archive.files();
			const fileCollection = {
				files: Object.fromEntries(files),
				fileCount: files.size,
				totalSize: 0,
			};
			const securityResult = await this.validateSecurity(fileCollection);

			if (securityResult.riskLevel === "critical") {
				throw new Error(
					`Critical security violations detected: ${securityResult.violations.join(", ")}`,
				);
			}

			// Extract with validation
			const extractedFiles = await archive.extract(outputPath);

			// Performance metrics
			const endTime = performance.now();
			const metrics = this.calculatePerformanceMetrics(
				fileCollection.totalSize,
				endTime - startTime,
			);

			// Audit logging
			if (config.auditEnabled !== false) {
				const metadata: ArchiveMetadata = {
					archiveId,
					tenantId: config.tenantId || this.tenantId,
					createdAt: new Date(),
					fileCount: extractedFiles,
					totalSize: fileCollection.totalSize,
					compressionType: "unknown",
					checksum: await this.generateChecksum(archivePath),
					version: "2.0.0",
				};
				await this.auditArchiveOperation(
					archiveId,
					"extract",
					metadata,
					metrics,
					securityResult,
				);
			}

			console.log(`✅ Extracted ${extractedFiles} files to ${outputPath}`);
			console.log(`🔒 Security: ${securityResult.riskLevel} risk level`);

			return { extractedFiles, securityResult };
		} catch (error) {
			console.error(
				`❌ Archive extraction failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Comprehensive archive analysis and reporting
	 */
	async analyzeArchive(archivePath: string): Promise<{
		metadata: ArchiveMetadata;
		securityResult: SecurityValidationResult;
		fileAnalysis: { [key: string]: { size: number; type: string; risk: string } };
	}> {
		console.log(`🔍 Analyzing archive: ${archivePath}`);

		try {
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);
			const files = await archive.files();

			// Build file collection for analysis
			const fileCollection = {
				files: Object.fromEntries(files),
				fileCount: files.size,
				totalSize: 0,
			};

			// Security validation
			const securityResult = await this.validateSecurity(fileCollection);

			// File analysis
			const fileAnalysis: {
				[key: string]: { size: number; type: string; risk: string };
			} = {};
			let totalSize = 0;

			for (const [path, file] of files) {
				const fileType = this.getFileType(path);
				const risk = this.assessFileRisk(path, fileType);
				fileAnalysis[path] = { size: file.size, type: fileType, risk };
				totalSize += file.size;
			}

			// Generate metadata
			const metadata: ArchiveMetadata = {
				archiveId: randomUUID(),
				tenantId: this.tenantId,
				createdAt: new Date(),
				fileCount: files.size,
				totalSize,
				compressionType: "gzip", // Assume gzip for .tar.gz files
				checksum: await this.generateChecksum(archivePath),
				version: "2.0.0",
			};

			console.log(
				`📊 Analysis complete: ${files.size} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
			);
			console.log(`🔒 Security risk: ${securityResult.riskLevel}`);

			return { metadata, securityResult, fileAnalysis };
		} catch (error) {
			console.error(
				`❌ Archive analysis failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	// ─── Private Helper Methods ────────────────────────────────────────────────────
	private async collectFiles(sourcePath: string): Promise<{
		files: { [key: string]: Uint8Array };
		fileCount: number;
		totalSize: number;
	}> {
		const files: { [key: string]: Uint8Array } = {};
		let fileCount = 0;
		let totalSize = 0;

		const sourceStat = await Bun.file(sourcePath).stat();
		if (sourceStat.isFile()) {
			const content = await Bun.file(sourcePath).bytes();
			files[sourcePath.split("/").pop() || sourcePath] = content;
			fileCount = 1;
			totalSize = content.length;
		} else if (sourceStat.isDirectory()) {
			const glob = new Bun.Glob("**/*");
			for await (const path of glob.scan(sourcePath)) {
				const fullPath = `${sourcePath}/${path}`;
				const archivePath = path.replaceAll("\\", "/");

				try {
					const content = await Bun.file(fullPath).bytes();
					files[archivePath] = content;
					fileCount++;
					totalSize += content.length;
				} catch (error) {
					console.warn(
						`⚠️ Skipping ${path}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		}

		return { files, fileCount, totalSize };
	}

	private async validateSecurity(fileCollection: {
		files: { [key: string]: Uint8Array };
		fileCount: number;
		totalSize: number;
	}): Promise<SecurityValidationResult> {
		const suspiciousPaths: string[] = [];
		const violations: string[] = [];
		const recommendations: string[] = [];

		// Check for suspicious paths
		for (const path of Object.keys(fileCollection.files)) {
			if (path.startsWith("/")) {
				suspiciousPaths.push(path);
				violations.push(`Absolute path detected: ${path}`);
			}
			if (path.startsWith("../") || path.includes("..")) {
				suspiciousPaths.push(path);
				violations.push(`Path traversal attempt: ${path}`);
			}
			if (path.startsWith(".")) {
				suspiciousPaths.push(path);
				violations.push(`Hidden file detected: ${path}`);
			}
		}

		// Determine risk level
		let riskLevel: "low" | "medium" | "high" | "critical" = "low";
		if (violations.length > 5) riskLevel = "critical";
		else if (violations.length > 2) riskLevel = "high";
		else if (violations.length > 0) riskLevel = "medium";

		// Generate recommendations
		if (riskLevel !== "low") {
			recommendations.push("Review all file paths before extraction");
			recommendations.push("Consider using a sandboxed extraction environment");
		}
		if (suspiciousPaths.length > 0) {
			recommendations.push("Remove or quarantine suspicious files");
		}

		return {
			isValid: riskLevel !== "critical",
			suspiciousPaths,
			violations,
			riskLevel,
			recommendations,
		};
	}

	private buildArchiveOptions(config: ArchiveConfiguration): any {
		const options: any = {};
		if (config.compression && config.compression !== "none") {
			options.compress = config.compression;
			if (config.compressionLevel) {
				options.level = config.compressionLevel;
			}
		}
		return options;
	}

	private calculatePerformanceMetrics(
		totalSize: number,
		timeMs: number,
	): PerformanceMetrics {
		const throughputMBps = totalSize / 1024 / 1024 / (timeMs / 1000);
		return {
			creationTimeMs: timeMs,
			compressionRatio: 0.85, // Placeholder - would calculate from actual data
			throughputMBps,
			memoryUsageMB: 0, // Placeholder - would track actual memory usage
		};
	}

	private async generateChecksum(filePath: string): Promise<string> {
		const data = await Bun.file(filePath).arrayBuffer();
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	private getFileType(path: string): string {
		const ext = path.split(".").pop()?.toLowerCase();
		switch (ext) {
			case "json":
				return "application/json";
			case "js":
				return "application/javascript";
			case "ts":
				return "application/typescript";
			case "txt":
				return "text/plain";
			case "xml":
				return "application/xml";
			case "sql":
				return "application/sql";
			default:
				return "application/octet-stream";
		}
	}

	private assessFileRisk(path: string, fileType: string): string {
		if (path.includes("passwd") || path.includes("secret") || path.includes("key"))
			return "high";
		if (path.startsWith(".")) return "medium";
		if (path.includes("config") || path.includes("admin")) return "medium";
		return "low";
	}

	private async auditArchiveOperation(
		archiveId: string,
		operation: string,
		metadata: ArchiveMetadata,
		metrics: PerformanceMetrics,
		securityResult: SecurityValidationResult,
	): Promise<void> {
		const stmt = this.auditDb.prepare(`
      INSERT INTO archive_operations
      (archive_id, tenant_id, operation_type, file_count, total_size, compression_type, checksum, metadata, created_at, performance_metrics)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			archiveId,
			metadata.tenantId,
			operation,
			metadata.fileCount,
			metadata.totalSize,
			metadata.compressionType,
			metadata.checksum,
			JSON.stringify(metadata),
			metadata.createdAt.toISOString(),
			JSON.stringify(metrics),
		);

		// Log security audit if violations found
		if (securityResult.violations.length > 0) {
			const securityStmt = this.auditDb.prepare(`
        INSERT INTO security_audit
        (archive_id, scan_timestamp, risk_level, suspicious_paths, violations, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

			securityStmt.run(
				archiveId,
				new Date().toISOString(),
				securityResult.riskLevel,
				JSON.stringify(securityResult.suspiciousPaths),
				JSON.stringify(securityResult.violations),
				JSON.stringify(securityResult.recommendations),
			);
		}
	}

	/**
	 * Generate comprehensive audit report
	 */
	async generateAuditReport(tenantId?: string): Promise<string> {
		const targetTenant = tenantId || this.tenantId;
		const operations = this.auditDb
			.query(`
      SELECT * FROM archive_operations
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `)
			.all(targetTenant);

		let report = `# Enterprise Archive Audit Report\n\n`;
		report += `**Tenant**: ${targetTenant}\n`;
		report += `**Generated**: ${new Date().toISOString()}\n\n`;

		report += `## Recent Operations\n\n`;
		for (const op of operations as any[]) {
			report += `- **${op.operation_type.toUpperCase()}**: ${op.archive_id}\n`;
			report += `  - Files: ${op.file_count}, Size: ${(op.total_size / 1024 / 1024).toFixed(2)}MB\n`;
			report += `  - Created: ${op.created_at}\n`;
			report += `  - Compression: ${op.compression_type}\n\n`;
		}

		return report;
	}

	/**
	 * Cleanup and close database connections
	 */
	close(): void {
		this.auditDb.close();
	}
}

// ─── CLI Interface ─────────────────────────────────────────────────────────────
if (import.meta.main) {
	const args = process.argv.slice(2);
	const command = args[0];
	const tenantId =
		args.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "default";

	const archiveManager = new EnterpriseArchiveManager(tenantId);

	try {
		switch (command) {
			case "create": {
				const sourcePath = args[1];
				if (!sourcePath) {
					console.error("❌ Usage: create <source-path> [--tenant=<id>]");
					process.exit(1);
				}
				await archiveManager.createSecureArchive(sourcePath, {
					tenantId,
					auditEnabled: true,
				});
				break;
			}

			case "extract": {
				const archivePath = args[1];
				const extractPath = args[2];
				if (!archivePath || !extractPath) {
					console.error(
						"❌ Usage: extract <archive-path> <extract-path> [--tenant=<id>]",
					);
					process.exit(1);
				}
				await archiveManager.extractSecureArchive(archivePath, extractPath, {
					tenantId,
				});
				break;
			}

			case "analyze": {
				const analyzePath = args[1];
				if (!analyzePath) {
					console.error("❌ Usage: analyze <archive-path> [--tenant=<id>]");
					process.exit(1);
				}
				await archiveManager.analyzeArchive(analyzePath);
				break;
			}

			case "report": {
				const report = await archiveManager.generateAuditReport();
				console.log(report);
				break;
			}

			default:
				console.error("❌ Unknown command:", command);
				console.error("Available commands: create, extract, analyze, report");
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`❌ Operation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	} finally {
		archiveManager.close();
	}
}
