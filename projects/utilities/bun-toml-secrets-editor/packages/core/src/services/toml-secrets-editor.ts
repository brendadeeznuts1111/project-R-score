// services/toml-secrets-editor.ts

import { BunSecretsSync } from "../integrations/bun-secrets-sync";
import { PatternExtractor } from "../integrations/pattern-extractor";
import { AuditLogger } from "./audit-logger";
import { CICDIntegration, type CIValidationResult } from "./ci-cd-integration";
import { DatabaseService } from "./database-service";
import { type Alert, MonitoringService } from "./monitoring-service";
import { SecretLifecycleManager } from "./secret-lifecycle-manager";
import { SecurityValidator } from "./security-validator";
import { TomlOptimizer } from "./toml-optimizer";
import type {
	EditResult,
	RiskPatternChain,
	TomlSecret,
	TomlSecretsEditorOptions,
	ValidationResult,
} from "./types/toml-secrets";
import { parseTomlFile, parseTomlString } from "./utils/toml-utils";

// Type-safe mutations interface
export interface TOMLMutations {
	[key: string]: {
		value: string | number | boolean | null;
		operation?: "set" | "delete" | "append";
		metadata?: {
			source?: string;
			confidence?: number;
			riskLevel?: "low" | "medium" | "high";
		};
	};
}

import { ErrorCode, FileIOError, retryWithBackoff } from "../errors/app-errors";
import { logger } from "./utils/logger";
import {
	metrics,
	OPERATION_COUNT,
	OPERATION_DURATION,
	OPERATION_ERRORS,
} from "./utils/metrics";
import { generateTraceId, tracer } from "./utils/tracing";

// Feature flag utilities
// Note: bun:bundle feature() can only be used directly in if/ternary statements
// So we keep a runtime wrapper for dynamic checks, but use feature() directly where possible
export const hasFeature = (name: string) => {
	// Runtime check - for dynamic feature name checking
	// For compile-time DCE, use feature() directly in code
	return (globalThis as any).feature?.(name) ?? false;
};

// Premium features compiled out in community build
const premiumCheck = hasFeature("PREMIUM")
	? () =>
			import("./premium-validator")
				.then((m) => m.validateAdvanced)
				.catch(() => ({ valid: true }))
	: () => Promise.resolve({ valid: true });

export class TomlSecretsEditor {
	private optimizer: TomlOptimizer;
	private security: SecurityValidator;
	private patternExtractor: PatternExtractor;
	private audit: AuditLogger;
	private secretsSync: BunSecretsSync;
	private database: DatabaseService;
	private lifecycleManager: SecretLifecycleManager;
	private monitoring: MonitoringService;
	private ciIntegration: CICDIntegration;
	private policyPath?: string;

	constructor(
		private configPath: string,
		private options: TomlSecretsEditorOptions = {},
	) {
		this.optimizer = new TomlOptimizer(options.policyPath);
		this.security = new SecurityValidator();
		this.patternExtractor = new PatternExtractor(configPath);
		this.audit = new AuditLogger(options.cacheDb);
		this.secretsSync = new BunSecretsSync(
			options.serviceName || "observatory-toml",
		);
		this.database = new DatabaseService(options.cacheDb || ":memory:");
		this.lifecycleManager = new SecretLifecycleManager(this.database);
		this.monitoring = new MonitoringService({
			enableRealTimeScanning: true,
			scanIntervalMs: 60000, // 1 minute for demo
			notificationChannels: ["console"],
		});
		this.ciIntegration = new CICDIntegration();

		// Set up monitoring callbacks
		this.setupMonitoringCallbacks();

		// Set logger context
		logger.setContext({ file: configPath });

		// Store policy path for lazy loading (can't use await in constructor)
		if (options.policyPath) {
			this.policyPath = options.policyPath;
		}
	}

	// Main edit method with security validation
	async edit(mutations: TOMLMutations): Promise<EditResult> {
		const traceId = generateTraceId();
		logger.setContext({
			traceId,
			operation: "edit",
			resource: this.configPath,
		});

		return await tracer.trace(
			"edit",
			async (span) => {
				return await metrics.timeOperation(
					OPERATION_DURATION,
					async () => {
						try {
							metrics.incrementCounter(OPERATION_COUNT, { operation: "edit" });

							// Read original file with retry
							const original = await retryWithBackoff(async () => {
								try {
									return await Bun.file(this.configPath).text();
								} catch (error) {
									throw new FileIOError(
										`Failed to read file ${this.configPath}`,
										ErrorCode.FILE_READ_ERROR,
										{ resource: this.configPath },
										error instanceof Error ? error : undefined,
									);
								}
							});

							const parsed = parseTomlString(original);

							// Apply mutations
							const modified = this.deepMerge(parsed, mutations);

							// Extract secrets and validate syntax
							const secrets = this.extractAllSecrets(modified);
							const validation = this.validateSecrets(secrets);

							// Extract URL patterns from secret values
							const patterns = this.patternExtractor.extractFromToml(modified);
							const _patternValidation = await this.validatePatterns(patterns);

							// Optimize structure
							const optimized = this.optimizer.optimize(modified);

							// Sync to Bun.secrets if enabled
							if (this.options.syncWithBunSecrets) {
								try {
									await this.secretsSync.syncToKeychain(secrets);
									logger.debug("Synced secrets to keychain", {
										count: secrets.length,
									});
								} catch (error) {
									logger.warn(
										"Failed to sync secrets to keychain",
										{},
										error instanceof Error ? error : undefined,
									);
									// Continue even if sync fails - don't block the edit operation
								}
							}

							// Audit log
							const result = {
								path: this.configPath,
								originalHash: this.hashString(original),
								optimizedHash: this.hashString(optimized.content),
								secretsCount: secrets.length,
								riskScore: validation.riskScore,
								patterns,
								changes: this.generateDiff(original, optimized.content),
							};

							await this.audit.logEdit(result);

							logger.info("Edit operation completed", {
								secretsCount: secrets.length,
								riskScore: validation.riskScore,
								patternsCount: patterns.length,
							});

							tracer.logToSpan(span.spanId, {
								secretsCount: secrets.length,
								riskScore: validation.riskScore,
							});

							return result;
						} catch (error) {
							metrics.incrementCounter(OPERATION_ERRORS, { operation: "edit" });
							logger.error(
								"Edit operation failed",
								{},
								error instanceof Error ? error : undefined,
							);
							throw error;
						}
					},
					{ operation: "edit" },
				);
			},
			traceId,
		);
	}

	async validate(): Promise<ValidationResult> {
		const parsed = await parseTomlFile(Bun.file(this.configPath));
		return this.security.validateToml(parsed, this.configPath);
	}

	async syncToBunSecrets(): Promise<any> {
		const parsed = await parseTomlFile(Bun.file(this.configPath));
		const secrets = this.extractAllSecrets(parsed);
		return await this.secretsSync.syncToKeychain(secrets);
	}

	async optimize(): Promise<{ content: string; stats: any }> {
		const parsed = await parseTomlFile(Bun.file(this.configPath));
		return this.optimizer.optimize(parsed);
	}

	extractAllSecrets(toml: any): TomlSecret[] {
		const secrets: TomlSecret[] = [];

		this.walkObject(toml, (value, keyPath) => {
			if (typeof value === "string" && value.includes("${")) {
				const validation = this.security.validateToml(
					{ temp: value },
					this.configPath,
				);
				validation.variables.forEach((variable) => {
					secrets.push({
						name: variable.name,
						value,
						hasDefault: variable.hasDefault,
						defaultValue: variable.defaultValue,
						classification: variable.classification,
						isDangerous: variable.isDangerous,
						location: { file: this.configPath, keyPath },
					});
				});
			}
		});

		return secrets;
	}

	private async validatePatterns(patterns: any[]): Promise<any> {
		// Basic URL pattern validation
		const results = patterns.map((pattern) => ({
			pattern: pattern.pattern,
			isValid: this.isValidUrlPattern(pattern.pattern),
			envVars: pattern.envVars,
		}));

		return {
			patterns: results,
			valid: results.every((r) => r.isValid),
		};
	}

	private isValidUrlPattern(pattern: string): boolean {
		try {
			// Check if it's a valid URL or pattern
			new URL(pattern.replace(/\$\{[^}]+\}/g, "placeholder"));
			return true;
		} catch {
			// Allow patterns with * or starting with /
			return pattern.includes("*") || pattern.startsWith("/");
		}
	}

	private validateSecrets(secrets: TomlSecret[]): ValidationResult {
		return this.security.validateToml(
			secrets.reduce((acc, secret) => {
				this.setNestedValue(acc, secret.location.keyPath, secret.value);
				return acc;
			}, {}),
			this.configPath,
		);
	}

	// High-performance validation using SIMD acceleration
	async validateSecretsHighPerformance(secrets: TomlSecret[]): Promise<{
		dangerous: TomlSecret[];
		validationResults: ValidationResult[];
		allValid: boolean;
		vulnerabilities?: any[];
	}> {
		const patterns = this.patternExtractor.extractFromToml(
			await parseTomlFile(Bun.file(this.configPath)),
		);
		return await this.security.validateWithPerformance(secrets, patterns);
	}

	// Premium advanced validation (DCE'd in community builds)
	async validateSecretsPremium(secrets: TomlSecret[]): Promise<{
		basic: ValidationResult;
		premium?: any;
		advancedChecks: string[];
		vulnerabilities?: any[];
	}> {
		const basic = await this.validate();
		const _patterns = this.patternExtractor.extractFromToml(
			await parseTomlFile(Bun.file(this.configPath)),
		);
		const _guardedPatterns = new Set<string>(); // Initialize guarded patterns

		let premium;
		let vulnerabilities;

		if (hasFeature("PREMIUM")) {
			const premiumValidator = await premiumCheck();
			if (typeof premiumValidator === "function") {
				premium = await premiumValidator(secrets);
				// Note: patternVulnerabilities doesn't exist on the return type
				// Using empty array for now until premium validator is enhanced
				vulnerabilities = [];
			}
		}

		const advancedChecks = [];
		if (hasFeature("PREMIUM")) {
			advancedChecks.push(
				"entropy-analysis",
				"pattern-recognition",
				"compliance-checks",
				"vulnerability-scanning",
			);
		}

		return {
			basic,
			premium,
			advancedChecks,
			vulnerabilities,
		};
	}

	// Comprehensive pattern analysis with secret cross-referencing
	async analyzePatternsWithSecrets(): Promise<RiskPatternChain> {
		const parsed = await parseTomlFile(Bun.file(this.configPath));
		const secrets = this.extractAllSecrets(parsed);
		return this.patternExtractor.analyzePatternsWithSecrets(secrets, parsed);
	}

	// Store secrets and patterns in database for analysis
	async persistAnalysis(): Promise<void> {
		const startTime = performance.now();

		try {
			const parsed = await parseTomlFile(Bun.file(this.configPath));
			const secrets = this.extractAllSecrets(parsed);
			const riskChain = this.patternExtractor.analyzePatternsWithSecrets(
				secrets,
				parsed,
			);

			// Create secret map for relationships
			const secretMap = new Map(secrets.map((s) => [s.name, s]));

			// Batch insert secrets and patterns
			await this.database.batchInsertSecrets(secrets);
			await this.database.batchInsertPatterns(riskChain.patterns, secretMap);

			const execTime = performance.now() - startTime;
			console.log(
				`✓ Persisted ${secrets.length} secrets and ${riskChain.patterns.length} patterns in ${(execTime).toFixed(2)}ms`,
			);
		} catch (error) {
			console.error("Failed to persist analysis:", error);
			throw error;
		}
	}

	// Query critical patterns
	getCriticalPatterns(): any[] {
		return this.database.getCriticalPatterns();
	}

	// Get secrets with their pattern relationships
	getSecretsWithPatterns(): any[] {
		return this.database.getSecretsWithPatterns();
	}

	// Database maintenance
	async optimizeDatabase(): Promise<void> {
		await this.database.optimize();
		await this.database.vacuum();
	}

	// Parallel compression with level 12 (smallest size)
	// Updated for Bun v1.3.7: Uses Bun.Glob and Bun.Archive
	async createCompressedArchive(
		pattern: string = "config/*.toml",
		outputPath?: string,
	): Promise<void> {
		// Bun v1.3.7: Use Bun.Glob for fast file matching
		let files: string[];
		try {
			const glob = new Bun.Glob(pattern);
			files = [];
			for await (const file of glob.scan()) {
				files.push(file);
			}
		} catch {
			// Fallback for systems without glob access
			files = [pattern]; // Single file
		}

		if (files.length === 0) {
			console.log(`No files found matching pattern: ${pattern}`);
			return;
		}

		// Parallel compression with maximum compression level
		const fileEntries = await Promise.all(
			files.map(
				async (filePath) =>
					[filePath, await Bun.file(filePath).bytes()] as [string, Uint8Array],
			),
		);

		const archive = new Bun.Archive(Object.fromEntries(fileEntries), {
			compress: "gzip",
			level: 12,
		});

		const archiveBytes = await archive.bytes();
		const defaultOutput = outputPath || `config-backup-${Date.now()}.tar.gz`;
		await Bun.write(defaultOutput, archiveBytes);

		const originalSize = fileEntries.reduce(
			(sum, [, bytes]) => sum + bytes.length,
			0,
		);
		const compressedSize = archiveBytes.length;
		const ratio =
			originalSize > 0
				? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1)
				: "0.0";

		console.log(`✓ Created compressed archive: ${defaultOutput}`);
		console.log(`  Files archived: ${fileEntries.length}`);
		console.log(`  Original: ${(originalSize / 1024).toFixed(1)}KB`);
		console.log(`  Compressed: ${(compressedSize / 1024).toFixed(1)}KB`);
		console.log(`  Ratio: ${ratio}% reduction`);
	}

	// Deduplicated archive using CRC32 keys
	async createDeduplicatedSecretsArchive(outputPath?: string): Promise<void> {
		const secrets = this.extractAllSecrets(
			await parseTomlFile(Bun.file(this.configPath)),
		);

		// Deduplicated archive using CRC32 keys
		const dedupedEntries = secrets.reduce(
			(archive, secret) => {
				const key = `${Bun.hash.crc32(secret.name)}.json`;
				archive[key] = JSON.stringify(secret);
				return archive;
			},
			{} as Record<string, string>,
		);

		const archive = new Bun.Archive(dedupedEntries, {
			compress: "gzip",
			level: 12,
		});

		const archiveBytes = await archive.bytes();
		const defaultOutput = outputPath || `secrets-archive-${Date.now()}.tar.gz`;
		await Bun.write(defaultOutput, archiveBytes);

		console.log(`✓ Created deduplicated secrets archive: ${defaultOutput}`);
		console.log(`  Secrets archived: ${secrets.length}`);
		console.log(`  Archive size: ${(archiveBytes.length / 1024).toFixed(1)}KB`);
	}

	// Comprehensive backup with secrets, patterns, and audit log
	async createFullBackup(outputPath?: string): Promise<void> {
		const timestamp = Date.now();
		const defaultOutput = outputPath || `full-backup-${timestamp}.tar.gz`;

		// Collect all data
		const backupData: Record<string, string> = {};

		// Configuration files
		// Bun v1.3.7: Use Bun.Glob for fast config discovery
		let configFiles: string[];
		try {
			const glob = new Bun.Glob("config/*.toml");
			configFiles = [];
			for await (const file of glob.scan()) {
				configFiles.push(file);
			}
		} catch {
			configFiles = ["config/secrets.toml"]; // Fallback
		}

		for (const file of configFiles) {
			try {
				backupData[`config/${file.split("/").pop()}`] =
					await Bun.file(file).text();
			} catch {
				// Skip files that can't be read
			}
		}

		// Secrets data (deduplicated)
		const secrets = this.extractAllSecrets(
			await parseTomlFile(Bun.file(this.configPath)),
		);
		const secretsJson = JSON.stringify(secrets, null, 2);
		backupData["data/secrets.json"] = secretsJson;

		// Pattern analysis
		const riskChain = await this.analyzePatternsWithSecrets();
		backupData["data/patterns.json"] = JSON.stringify(riskChain, null, 2);

		// Audit log (last 1000 entries)
		const auditLog = await this.audit.getAuditLog(undefined, 1000);
		backupData["data/audit-log.json"] = JSON.stringify(auditLog, null, 2);

		// Database export (if available)
		try {
			const secretsWithPatterns = this.getSecretsWithPatterns();
			backupData["data/secrets-patterns.json"] = JSON.stringify(
				secretsWithPatterns,
				null,
				2,
			);
		} catch (_error) {
			// Database might not be available
		}

		// Metadata
		const metadata = {
			timestamp: new Date(timestamp).toISOString(),
			version: "1.0.0",
			configFiles: configFiles.length,
			secretsCount: secrets.length,
			patternsCount: riskChain.patterns.length,
			auditEntries: auditLog.length,
		};
		backupData["metadata.json"] = JSON.stringify(metadata, null, 2);

		// Create compressed archive
		const archive = new Bun.Archive(backupData, {
			compress: "gzip",
			level: 12,
		});

		const archiveBytes = await archive.bytes();
		await Bun.write(defaultOutput, archiveBytes);

		console.log(`✓ Created full backup: ${defaultOutput}`);
		console.log(`  Configuration files: ${configFiles.length}`);
		console.log(`  Secrets: ${secrets.length}`);
		console.log(`  Patterns: ${riskChain.patterns.length}`);
		console.log(`  Audit entries: ${auditLog.length}`);
		console.log(`  Archive size: ${(archiveBytes.length / 1024).toFixed(1)}KB`);
	}

	// Secret lifecycle management
	async registerSecretLifecycle(secret: TomlSecret): Promise<void> {
		try {
			await this.lifecycleManager.registerSecret(secret);
			logger.debug("Registered secret lifecycle", { secret: secret.name });
		} catch (error) {
			logger.error(
				"Failed to register secret lifecycle",
				{ secret: secret.name },
				error instanceof Error ? error : undefined,
			);
			throw error;
		}
	}

	async checkSecretLifecycle(secretName: string): Promise<{
		needsRotation: boolean;
		isExpired: boolean;
		status: string;
		daysUntilExpiration?: number;
	}> {
		const needsRotation = await this.lifecycleManager.needsRotation(secretName);
		const isExpired = await this.lifecycleManager.isExpired(secretName);
		const lifecycle = await this.lifecycleManager.getLifecycle(secretName);

		let daysUntilExpiration: number | undefined;
		if (lifecycle?.expiresAt) {
			daysUntilExpiration = Math.ceil(
				(lifecycle.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
			);
		}

		return {
			needsRotation,
			isExpired,
			status: lifecycle?.status || "unknown",
			daysUntilExpiration,
		};
	}

	async rotateSecret(secretName: string, newValue?: string): Promise<boolean> {
		const success = await this.lifecycleManager.rotateSecret(
			secretName,
			newValue || "",
		);
		if (success) {
			await this.audit.logEdit({
				path: this.configPath,
				originalHash: "rotated",
				optimizedHash: "rotated",
				secretsCount: 1,
				riskScore: 0,
				patterns: [],
				changes: [`Rotated secret: ${secretName}`],
			});
		}
		return success;
	}

	async rotateAllExpiredSecrets(): Promise<string[]> {
		const rotatedSecrets = await this.lifecycleManager.rotateExpiredSecrets();
		if (rotatedSecrets.length > 0) {
			await this.audit.logEdit({
				path: this.configPath,
				originalHash: "bulk-rotation",
				optimizedHash: "bulk-rotation",
				secretsCount: rotatedSecrets.length,
				riskScore: 0,
				patterns: [],
				changes: [`Bulk rotation: ${rotatedSecrets.join(", ")}`],
			});
		}
		return rotatedSecrets;
	}

	async getSecretsRequiringAttention(): Promise<{
		expired: string[];
		pendingRotation: string[];
		unused: string[];
		highUsage: string[];
	}> {
		return await this.lifecycleManager.getSecretsRequiringAttention();
	}

	async getLifecycleStats(): Promise<{
		totalSecrets: number;
		activeSecrets: number;
		expiredSecrets: number;
		pendingRotation: number;
		averageAgeDays: number;
		averageUsageCount: number;
	}> {
		return await this.lifecycleManager.getLifecycleStats();
	}

	// Record secret usage (call this when secrets are accessed)
	async recordSecretUsage(secretName: string): Promise<void> {
		await this.lifecycleManager.recordUsage(secretName);
	}

	// Export lifecycle data for backup
	async exportLifecycleData(): Promise<Record<string, any>> {
		return await this.lifecycleManager.exportLifecycleData();
	}

	// Import lifecycle data from backup
	async importLifecycleData(data: Record<string, any>): Promise<void> {
		await this.lifecycleManager.importLifecycleData(data);
	}

	// Set up monitoring callbacks
	private setupMonitoringCallbacks(): void {
		this.monitoring.onAlert((alert) => {
			// Log security alerts to audit system
			this.audit.logEdit({
				path: alert.file,
				originalHash: "alert",
				optimizedHash: "alert",
				secretsCount: alert.secret ? 1 : 0,
				riskScore:
					alert.type === "critical" ? 100 : alert.type === "high" ? 75 : 50,
				patterns: alert.pattern
					? [
							{
								pattern: alert.pattern,
								keyPath: alert.file,
								envVars: [],
								isDynamic: false,
								location: { file: alert.file, keyPath: "alert" },
							},
						]
					: [],
				changes: [`Security alert: ${alert.title}`],
			});
		});
	}

	// Trigger security scan and return alerts
	async performSecurityScan(): Promise<Alert[]> {
		const secrets = this.extractAllSecrets(
			await parseTomlFile(Bun.file(this.configPath)),
		);
		const patterns = this.patternExtractor.extractFromToml(
			await parseTomlFile(Bun.file(this.configPath)),
		);
		const validation = await this.validate();

		return await this.monitoring.performSecurityScan(
			secrets,
			patterns,
			validation,
		);
	}

	// Get active alerts
	getActiveAlerts(): Alert[] {
		return this.monitoring.getActiveAlerts();
	}

	// Get alerts by type
	getAlertsByType(type: Alert["type"]): Alert[] {
		return this.monitoring.getAlertsByType(type);
	}

	// Get alert statistics
	getAlertStats(): {
		total: number;
		active: number;
		acknowledged: number;
		resolved: number;
		byType: Record<string, number>;
	} {
		return this.monitoring.getAlertStats();
	}

	// Acknowledge alert
	acknowledgeAlert(alertId: string): boolean {
		return this.monitoring.acknowledgeAlert(alertId);
	}

	// Resolve alert
	resolveAlert(alertId: string): boolean {
		return this.monitoring.resolveAlert(alertId);
	}

	// Start real-time monitoring
	startMonitoring(): void {
		// Monitoring is already started in constructor
		console.log("🔍 Real-time security monitoring is active");
	}

	// Stop real-time monitoring
	stopMonitoring(): void {
		this.monitoring.stopRealTimeScanning();
		console.log("⏹️ Real-time security monitoring stopped");
	}

	// Export monitoring data for backup
	exportMonitoringData(): { alerts: Alert[] } {
		return {
			alerts: this.monitoring.exportAlerts(),
		};
	}

	// Import monitoring data from backup
	importMonitoringData(data: { alerts: Alert[] }): void {
		this.monitoring.importAlerts(data.alerts);
	}

	// Clean up old alerts
	cleanupOldAlerts(): number {
		return this.monitoring.cleanupOldAlerts();
	}

	// CI/CD integration methods
	async validateForCI(
		files: string[],
		branch?: string,
		commit?: string,
	): Promise<CIValidationResult> {
		return await this.ciIntegration.validatePipeline(files, branch, commit);
	}

	async validatePreCommit(
		files: string[],
	): Promise<{ allowed: boolean; message: string; violations: string[] }> {
		return await this.ciIntegration.validatePreCommit(files);
	}

	generateGitHubActionsWorkflow(): string {
		return this.ciIntegration.generateGitHubActionsWorkflow();
	}

	generatePreCommitHook(): string {
		return this.ciIntegration.generatePreCommitHook();
	}

	generateDockerfile(): string {
		return this.ciIntegration.generateDockerfile();
	}

	// Setup CI/CD for this project
	async setupCIIntegration(): Promise<void> {
		console.log("🔧 Setting up CI/CD integration...");

		// Generate GitHub Actions workflow
		const workflowContent = this.generateGitHubActionsWorkflow();
		const workflowPath = ".github/workflows/secrets-validation.yml";

		try {
			// Create directory if it doesn't exist
			await Bun.write(workflowPath, workflowContent);
			console.log(`✅ Created GitHub Actions workflow: ${workflowPath}`);
		} catch (error) {
			console.log(`⚠️ Could not create GitHub Actions workflow: ${error}`);
		}

		// Generate pre-commit hook
		const hookContent = this.generatePreCommitHook();
		const hookPath = ".git/hooks/pre-commit";

		try {
			await Bun.write(hookPath, hookContent);
			// Make executable on Unix-like systems
			if (process.platform !== "win32") {
				await Bun.spawn(["chmod", "+x", hookPath]).exited;
			}
			console.log(`✅ Created pre-commit hook: ${hookPath}`);
		} catch (error) {
			console.log(`⚠️ Could not create pre-commit hook: ${error}`);
		}

		// Generate Dockerfile
		const dockerfileContent = this.generateDockerfile();
		const dockerfilePath = "Dockerfile.validation";

		try {
			await Bun.write(dockerfilePath, dockerfileContent);
			console.log(`✅ Created validation Dockerfile: ${dockerfilePath}`);
		} catch (error) {
			console.log(`⚠️ Could not create Dockerfile: ${error}`);
		}

		console.log("\n🎉 CI/CD integration setup complete!");
		console.log("Next steps:");
		console.log("1. Review and commit the generated files");
		console.log("2. Push to enable GitHub Actions");
		console.log('3. Test the pre-commit hook with: git commit -m "test"');
	}

	// Close all connections
	close(): void {
		this.monitoring.stopRealTimeScanning();
		this.audit.close();
		this.database.close();
	}

	private deepMerge(target: any, source: any): any {
		const result = { ...target };

		for (const key in source) {
			if (
				source[key] &&
				typeof source[key] === "object" &&
				!Array.isArray(source[key])
			) {
				result[key] = this.deepMerge(target[key] || {}, source[key]);
			} else {
				result[key] = source[key];
			}
		}

		return result;
	}

	private walkObject(
		obj: any,
		callback: (value: any, keyPath: string) => void,
		keyPath = "",
	): void {
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

	private hashString(str: string): string {
		// Simple hash for demo - in production use crypto
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(16);
	}

	private generateDiff(original: string, modified: string): string[] {
		const originalLines = original.split("\n");
		const modifiedLines = modified.split("\n");
		const changes: string[] = [];

		for (
			let i = 0;
			i < Math.max(originalLines.length, modifiedLines.length);
			i++
		) {
			const orig = originalLines[i] || "";
			const mod = modifiedLines[i] || "";

			if (orig !== mod) {
				changes.push(`Line ${i + 1}: ${orig} -> ${mod}`);
			}
		}

		return changes;
	}
}
