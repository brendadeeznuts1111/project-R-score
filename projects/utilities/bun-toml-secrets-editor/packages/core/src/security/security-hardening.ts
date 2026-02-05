import { unlink } from "node:fs/promises";
import { hostname } from "node:os";

export interface SecurityConfig {
	enableSecretMasking: boolean;
	maxLogLength: number;
	allowedLogLevels: string[];
	enableFileLocking: boolean;
	maxInputSize: number;
	enableAuditLogging: boolean;
}

export class SecurityManager {
	private static instance: SecurityManager;
	private config: SecurityConfig;
	private auditLog: Array<{
		timestamp: Date;
		event: string;
		details: any;
		severity: "low" | "medium" | "high" | "critical";
	}> = [];

	private constructor() {
		this.config = {
			enableSecretMasking: true,
			maxLogLength: 1000,
			allowedLogLevels: ["ERROR", "WARN", "INFO"],
			enableFileLocking: true,
			maxInputSize: 10 * 1024 * 1024, // 10MB
			enableAuditLogging: true,
		};
	}

	static getInstance(): SecurityManager {
		if (!SecurityManager.instance) {
			SecurityManager.instance = new SecurityManager();
		}
		return SecurityManager.instance;
	}

	/**
	 * Mask secrets in logs to prevent leakage
	 */
	maskSecrets(input: string): string {
		if (!this.config.enableSecretMasking) return input;

		// Pattern to match common secret patterns
		const secretPatterns = [
			/password['":\s=]+['"]?([^'"\s]{8,})['"]?/gi,
			/token['":\s=]+['"]?([^'"\s]{16,})['"]?/gi,
			/secret['":\s=]+['"]?([^'"\s]{12,})['"]?/gi,
			/key['":\s=]+['"]?([^'"\s]{16,})['"]?/gi,
			/\b[A-Za-z0-9+/]{32,}={0,2}\b/g, // Base64 strings
			/\b[A-Fa-f0-9]{32,}\b/g, // Hex strings
		];

		let masked = input;
		for (const pattern of secretPatterns) {
			masked = masked.replace(pattern, (match, secret) => {
				if (secret) {
					return match.replace(secret, this.maskValue(secret));
				}
				return match;
			});
		}

		return masked;
	}

	private maskValue(value: string): string {
		if (value.length <= 4) return "****";
		return (
			value.substring(0, 2) +
			"*".repeat(value.length - 4) +
			value.substring(value.length - 2)
		);
	}

	/**
	 * Validate input size to prevent DoS attacks
	 */
	validateInputSize(input: string | Buffer): boolean {
		const size =
			typeof input === "string"
				? Buffer.byteLength(input, "utf8")
				: input.length;
		if (size > this.config.maxInputSize) {
			this.logSecurityEvent(
				"INPUT_SIZE_EXCEEDED",
				{ size, maxSize: this.config.maxInputSize },
				"high",
			);
			return false;
		}
		return true;
	}

	/**
	 * Sanitize log output to prevent security issues
	 */
	sanitizeLogOutput(message: string, level: string = "INFO"): string {
		// Check log level
		if (!this.config.allowedLogLevels.includes(level.toUpperCase())) {
			return "";
		}

		// Mask secrets
		let sanitized = this.maskSecrets(message);

		// Truncate if too long
		if (sanitized.length > this.config.maxLogLength) {
			sanitized = `${sanitized.substring(0, this.config.maxLogLength)}... [TRUNCATED]`;
		}

		return sanitized;
	}

	/**
	 * Log security events for audit trail
	 */
	logSecurityEvent(
		event: string,
		details: any,
		severity: "low" | "medium" | "high" | "critical" = "medium",
	): void {
		if (!this.config.enableAuditLogging) return;

		const auditEntry = {
			timestamp: new Date(),
			event,
			details: this.maskSecrets(JSON.stringify(details)),
			severity,
		};

		this.auditLog.push(auditEntry);

		// Keep audit log size manageable
		if (this.auditLog.length > 10000) {
			this.auditLog = this.auditLog.slice(-5000);
		}

		// Log critical events immediately
		if (severity === "critical") {
			console.error("🚨 CRITICAL SECURITY EVENT:", event, details);
		}
	}

	/**
	 * Get audit log entries
	 */
	getAuditLog(severity?: string): Array<any> {
		if (severity) {
			return this.auditLog.filter((entry) => entry.severity === severity);
		}
		return [...this.auditLog];
	}

	/**
	 * Validate file path to prevent directory traversal
	 */
	validateFilePath(filePath: string): boolean {
		// Normalize path
		const normalized = filePath.replace(/\\/g, "/");

		// Check for directory traversal attempts
		if (normalized.includes("../") || normalized.includes("..\\")) {
			this.logSecurityEvent(
				"DIRECTORY_TRAVERSAL_ATTEMPT",
				{ filePath },
				"high",
			);
			return false;
		}

		// Check for absolute paths (should be relative to project)
		if (normalized.startsWith("/")) {
			this.logSecurityEvent("ABSOLUTE_PATH_ATTEMPT", { filePath }, "medium");
			return false;
		}

		return true;
	}

	/**
	 * Create secure file lock
	 */
	async createFileLock(filePath: string): Promise<boolean> {
		if (!this.config.enableFileLocking) return true;

		try {
			const lockFile = `${filePath}.lock`;
			const lockContent = {
				pid: process.pid,
				timestamp: new Date().toISOString(),
				hostname: hostname(),
			};

			await Bun.write(lockFile, JSON.stringify(lockContent));
			this.logSecurityEvent("FILE_LOCK_CREATED", { filePath, lockFile }, "low");
			return true;
		} catch (error) {
			this.logSecurityEvent(
				"FILE_LOCK_FAILED",
				{ filePath, error: error instanceof Error ? error.message : "Unknown" },
				"medium",
			);
			return false;
		}
	}

	/**
	 * Release file lock
	 */
	async releaseFileLock(filePath: string): Promise<boolean> {
		if (!this.config.enableFileLocking) return true;

		try {
			const lockFile = `${filePath}.lock`;
			await unlink(lockFile);
			this.logSecurityEvent(
				"FILE_LOCK_RELEASED",
				{ filePath, lockFile },
				"low",
			);
			return true;
		} catch (error) {
			this.logSecurityEvent(
				"FILE_LOCK_RELEASE_FAILED",
				{ filePath, error: error instanceof Error ? error.message : "Unknown" },
				"medium",
			);
			return false;
		}
	}

	/**
	 * Check if file is locked
	 */
	async isFileLocked(filePath: string): Promise<boolean> {
		if (!this.config.enableFileLocking) return false;

		try {
			const lockFile = `${filePath}.lock`;
			const lockContent = await Bun.file(lockFile).text();
			const lock = JSON.parse(lockContent);

			// Check if lock is stale (older than 5 minutes)
			const lockTime = new Date(lock.timestamp);
			const now = new Date();
			const staleThreshold = 5 * 60 * 1000; // 5 minutes

			if (now.getTime() - lockTime.getTime() > staleThreshold) {
				// Lock is stale, remove it
				await this.releaseFileLock(filePath);
				return false;
			}

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Generate security report
	 */
	generateSecurityReport(): {
		totalEvents: number;
		criticalEvents: number;
		highEvents: number;
		recentEvents: Array<any>;
		recommendations: string[];
	} {
		const criticalEvents = this.auditLog.filter(
			(e) => e.severity === "critical",
		).length;
		const highEvents = this.auditLog.filter(
			(e) => e.severity === "high",
		).length;
		const recentEvents = this.auditLog.slice(-10);

		const recommendations: string[] = [];

		if (criticalEvents > 0) {
			recommendations.push("Address critical security events immediately");
		}
		if (highEvents > 5) {
			recommendations.push("Review high-severity security events");
		}
		if (this.auditLog.length > 1000) {
			recommendations.push("Consider implementing log rotation");
		}

		return {
			totalEvents: this.auditLog.length,
			criticalEvents,
			highEvents,
			recentEvents,
			recommendations,
		};
	}

	/**
	 * Update security configuration
	 */
	updateConfig(newConfig: Partial<SecurityConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.logSecurityEvent("SECURITY_CONFIG_UPDATED", { newConfig }, "low");
	}

	/**
	 * Get current configuration
	 */
	getConfig(): SecurityConfig {
		return { ...this.config };
	}
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

// Secure console logging wrapper
export const secureConsole = {
	log: (message: string, level: string = "INFO") => {
		const sanitized = securityManager.sanitizeLogOutput(message, level);
		if (sanitized) {
			console.log(`[${level}] ${sanitized}`);
		}
	},

	error: (message: string) => {
		const sanitized = securityManager.sanitizeLogOutput(message, "ERROR");
		if (sanitized) {
			console.error(`[ERROR] ${sanitized}`);
		}
	},

	warn: (message: string) => {
		const sanitized = securityManager.sanitizeLogOutput(message, "WARN");
		if (sanitized) {
			console.warn(`[WARN] ${sanitized}`);
		}
	},
};
