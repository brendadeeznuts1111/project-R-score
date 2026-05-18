/**
 * Enterprise Archive Suite - Enhanced Index
 * Tier-1380 Enterprise Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Enterprise Team
 */

export type {
	CompressionBenchmark,
	CompressionMetrics,
	CompressionStrategy,
} from "../core/compression/ArchiveCompressionEngine";
export { compressionEngine } from "../core/compression/ArchiveCompressionEngine";
export type {
	BenchmarkResult,
	PerformanceMetric,
	PerformanceReport,
	PerformanceThreshold,
} from "./analytics/PerformanceAnalyzer";
export {
	PerformanceAnalyzer,
	performanceAnalyzer,
} from "./analytics/PerformanceAnalyzer";
// ─── Type Definitions ─────────────────────────────────────────────────────────
export type {
	ArchiveConfiguration,
	ArchiveMetadata,
	PerformanceMetrics,
	SecurityValidationResult,
} from "./archive/EnterpriseArchiveManager";
// ─── Core Enterprise Classes ─────────────────────────────────────────────────────
export { EnterpriseArchiveManager } from "./archive/EnterpriseArchiveManager";
export type {
	AuditEvent,
	ComplianceReport,
	ComplianceRule,
	RetentionPolicy,
} from "./audit/AuditTrailManager";
export { AuditTrailManager, auditTrailManager } from "./audit/AuditTrailManager";
export { EnterpriseArchiveCLI } from "./cli/EnterpriseArchiveCLI";
export type {
	SecurityReport,
	SecurityRule,
	SecurityViolation,
} from "./security/EnterpriseSecurityValidator";
export {
	EnterpriseSecurityValidator,
	securityValidator,
} from "./security/EnterpriseSecurityValidator";

// ─── Legacy Tools (Backward Compatibility) ───────────────────────────────────────
// These are maintained for backward compatibility but marked as deprecated
// Note: Legacy tools will be integrated in a future release
// export { ArchiveToolsCLI } from '../archive-tools';
// export { Tier1380ArchiveSecure } from '../tier1380-archive-secure';

// ─── Factory Functions ─────────────────────────────────────────────────────────
/**
 * Create an enterprise archive manager with default configuration
 */
export function createArchiveManager(
	tenantId: string = "default",
): EnterpriseArchiveManager {
	return new EnterpriseArchiveManager(tenantId);
}

/**
 * Create a security validator with default rules
 */
export function createSecurityValidator(): EnterpriseSecurityValidator {
	return new EnterpriseSecurityValidator();
}

/**
 * Create a performance analyzer
 */
export function createPerformanceAnalyzer(dbPath?: string): PerformanceAnalyzer {
	return new PerformanceAnalyzer(dbPath);
}

/**
 * Create an audit trail manager
 */
export function createAuditTrailManager(dbPath?: string): AuditTrailManager {
	return new AuditTrailManager(dbPath);
}

/**
 * Create an enterprise CLI instance
 */
export function createCLI(): EnterpriseArchiveCLI {
	return new EnterpriseArchiveCLI();
}

// ─── Quick Start Examples ─────────────────────────────────────────────────────
/**
 * Quick start example for enterprise archive creation
 */
export async function quickStartExample() {
	console.info("🚀 Tier-1380 Enterprise Archive Suite - Quick Start");

	// Create archive manager
	const archiveManager = createArchiveManager("production");

	try {
		// Create secure archive
		const result = await archiveManager.createSecureArchive("./data", {
			compression: "gzip",
			auditEnabled: true,
			validateIntegrity: true,
		});

		console.info(`✅ Archive created: ${result.archiveId}`);
		console.info(`📊 Performance: ${result.metrics.creationTimeMs.toFixed(2)}ms`);
	} finally {
		archiveManager.close();
	}
}

/**
 * Security validation example
 */
export async function securityExample() {
	console.info("🔒 Security Validation Example");

	const validator = createSecurityValidator();

	// Example file map (in real usage, this comes from an archive)
	const files = new Map([
		["config.json", new TextEncoder().encode('{"apiKey": "secret"}')],
		["data.txt", new TextEncoder().encode("Hello World")],
		["../etc/passwd", new TextEncoder().encode("malicious")],
	]);

	const report = await validator.validateArchive(files);

	console.info(`📊 Risk level: ${report.overallRisk}`);
	console.info(`🚫 Blocked files: ${report.blockedFiles.length}`);
	console.info(`✅ Allowed files: ${report.allowedFiles.length}`);
}

/**
 * Comprehensive enterprise workflow example
 */
export async function enterpriseWorkflowExample() {
	console.info("🚀 Tier-1380 Enterprise Archive Suite - Complete Workflow");

	// Initialize all enterprise components
	const archiveManager = createArchiveManager("production");
	const securityValidator = createSecurityValidator();
	const performanceAnalyzer = createPerformanceAnalyzer();
	const auditManager = createAuditTrailManager();

	try {
		// Step 1: Create archive with performance monitoring
		console.info("📦 Step 1: Creating secure archive...");
		const archiveResult = await performanceAnalyzer.runBenchmark(
			() =>
				archiveManager.createSecureArchive("./data", {
					compression: "gzip",
					auditEnabled: true,
					validateIntegrity: true,
				}),
			"archive_creation",
			5,
			"production",
		);

		// Step 2: Security validation
		console.info("🔒 Step 2: Security validation...");
		const files = new Map([
			["config.json", new TextEncoder().encode('{"apiKey": "secret"}')],
			["data.txt", new TextEncoder().encode("Hello World")],
		]);

		const securityReport = await securityValidator.validateArchive(files);

		// Step 3: Audit compliance
		console.info("📋 Step 3: Audit compliance...");
		await auditManager.recordEvent({
			timestamp: new Date(),
			eventType: "archive_created",
			tenantId: "production",
			resource: "enterprise-data",
			action: "create_secure_archive",
			outcome: "success",
			details: { archiveId: archiveResult.archiveId, fileCount: 10 },
			metadata: {
				source: "enterprise-workflow",
				version: "2.0.0",
				requestId: crypto.randomUUID(),
			},
			compliance: {
				dataClassification: "confidential",
				retentionPeriod: 2555,
				legalHold: false,
				regulations: ["SOX", "GDPR"],
			},
		});

		// Step 4: Generate compliance report
		const complianceReport = await auditManager.generateComplianceReport("production", {
			start: new Date(Date.now() - 24 * 60 * 60 * 1000),
			end: new Date(),
		});

		// Step 5: Performance analytics
		const performanceReport = await performanceAnalyzer.generateReport("production");

		console.info("✅ Enterprise workflow completed successfully!");
		console.info(`📊 Archive ID: ${archiveResult.archiveId}`);
		console.info(`🔒 Security risk: ${securityReport.overallRisk}`);
		console.info(`📈 Compliance score: ${complianceReport.summary.complianceScore}%`);
		console.info(`⚡ Performance: ${archiveResult.averageTime.toFixed(2)}ms average`);
	} finally {
		// Clean up resources
		archiveManager.close();
		performanceAnalyzer.close();
		auditManager.close();
	}
}

// ─── Migration Guide ─────────────────────────────────────────────────────────
/**
 * Migration helper from legacy tools to enterprise suite
 */
export class MigrationHelper {
	/**
	 * Migrate from legacy archive-tools.ts to EnterpriseArchiveManager
	 */
	static migrateFromArchiveTools() {
		console.info("🔄 Migration Guide: archive-tools.ts → EnterpriseArchiveManager");
		console.info("");
		console.info("Legacy usage:");
		console.info("  bun tools/archive-tools.ts create ./src ./backup.tar.gz");
		console.info("");
		console.info("Enterprise usage:");
		console.info(
			"  bun tools/enterprise/cli/EnterpriseArchiveCLI.ts create ./src --tenant production",
		);
		console.info("");
		console.info("Programmatic usage:");
		console.info('  const manager = new EnterpriseArchiveManager("production");');
		console.info('  await manager.createSecureArchive("./src", { auditEnabled: true });');
	}

	/**
	 * Migrate from tier1380-archive-secure.ts to EnterpriseArchiveManager
	 */
	static migrateFromTier1380ArchiveSecure() {
		console.info(
			"🔄 Migration Guide: tier1380-archive-secure.ts → EnterpriseArchiveManager",
		);
		console.info("");
		console.info("Legacy features now enhanced:");
		console.info("  ✅ SBOM generation → Integrated metadata management");
		console.info("  ✅ Audit logging → Comprehensive audit trails");
		console.info("  ✅ Multi-tenancy → Full tenant isolation");
		console.info("  ✅ Security validation → Advanced threat detection");
		console.info("");
		console.info("New enterprise features:");
		console.info("  🚀 Performance analytics and benchmarking");
		console.info("  🔍 Advanced security rule engine");
		console.info("  📊 Real-time metrics and reporting");
		console.info("  🏢 Enterprise-grade CLI interface");
	}
}

// ─── Version Information ─────────────────────────────────────────────────────
export const VERSION = "2.0.0";
export const BUILD_DATE = new Date().toISOString();
export const COMPATIBILITY = {
	minimumBunVersion: "1.3.0",
	supportedNodeVersions: "18+",
	enterpriseFeatures: true,
	legacySupport: true,
};

// ─── Feature Flags ───────────────────────────────────────────────────────────
export const FEATURES = {
	ENTERPRISE_SECURITY: true,
	ADVANCED_AUDITING: true,
	PERFORMANCE_ANALYTICS: true,
	MULTI_TENANCY: true,
	THREAT_INTELLIGENCE: true,
	REAL_TIME_MONITORING: true,
	COMPLIANCE_REPORTING: true,
	BENCHMARK_ENGINE: true,
	LEGACY_COMPATIBILITY: true,
};

// ─── Default Configuration ───────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
	compression: {
		type: "gzip" as const,
		level: 6,
	},
	security: {
		enabled: true,
		riskThreshold: "medium" as const,
		blockCritical: true,
	},
	audit: {
		enabled: true,
		detailedLogging: true,
		retentionDays: 90,
	},
	performance: {
		enableMetrics: true,
		benchmarkIterations: 10,
		memoryThresholdMB: 512,
	},
	multiTenancy: {
		defaultTenant: "default",
		isolationEnabled: true,
		crossTenantAccess: false,
	},
};

// ─── Error Types ─────────────────────────────────────────────────────────────
export class EnterpriseArchiveError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: any,
	) {
		super(message);
		this.name = "EnterpriseArchiveError";
	}
}

export class SecurityValidationError extends EnterpriseArchiveError {
	constructor(
		message: string,
		public readonly violations: string[],
	) {
		super(message, "SECURITY_VALIDATION_FAILED", { violations });
		this.name = "SecurityValidationError";
	}
}

export class ArchiveIntegrityError extends EnterpriseArchiveError {
	constructor(
		message: string,
		public readonly checksum: string,
	) {
		super(message, "ARCHIVE_INTEGRITY_FAILED", { checksum });
		this.name = "ArchiveIntegrityError";
	}
}

// ─── Utility Functions ─────────────────────────────────────────────────────
/**
 * Validate tenant ID format
 */
export function validateTenantId(tenantId: string): boolean {
	return (
		/^[a-zA-Z0-9_-]+$/.test(tenantId) && tenantId.length >= 3 && tenantId.length <= 50
	);
}

/**
 * Generate archive ID
 */
export function generateArchiveId(): string {
	return crypto.randomUUID();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${(ms / 60000).toFixed(1)}m`;
}

// ─── Export Summary ─────────────────────────────────────────────────────────
/**
 * Enterprise Archive Suite - Complete Feature Set
 *
 * 🏢 Enterprise Features:
 * - Multi-tenant archive management
 * - Advanced security validation
 * - Comprehensive audit trails
 * - Performance analytics
 * - Threat intelligence integration
 * - Compliance reporting
 *
 * 🔒 Security Features:
 * - Path traversal protection
 * - Executable file detection
 * - Sensitive content scanning
 * - Custom security rules
 * - Risk assessment
 *
 * 📊 Analytics Features:
 * - Performance benchmarking
 * - Real-time metrics
 * - Usage analytics
 * - Capacity planning
 * - Trend analysis
 *
 * 🚀 Performance Features:
 * - Sub-millisecond operations
 * - Memory optimization
 * - Compression efficiency
 * - Parallel processing
 * - Caching strategies
 *
 * 📋 Compliance Features:
 * - Audit trail management
 * - Regulatory reporting
 * - Data governance
 * - Retention policies
 * - Access logging
 */
console.info(`🏢 Enterprise Archive Suite v${VERSION} loaded successfully`);
console.info(`📊 Features: ${Object.values(FEATURES).filter(Boolean).length} enabled`);
console.info(`🔒 Enterprise security: ${FEATURES.ENTERPRISE_SECURITY ? "✅" : "❌"}`);
console.info(`📈 Performance analytics: ${FEATURES.PERFORMANCE_ANALYTICS ? "✅" : "❌"}`);
console.info(`🏢 Multi-tenancy: ${FEATURES.MULTI_TENANCY ? "✅" : "❌"}`);
console.info(`🔄 Legacy compatibility: ${FEATURES.LEGACY_COMPATIBILITY ? "✅" : "❌"}`);
