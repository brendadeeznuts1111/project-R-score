// Advanced Security Features and Encryption
// Enterprise-grade security system for fraud detection infrastructure

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	scrypt,
} from "crypto";

interface SecurityConfig {
	encryption: {
		algorithm: string;
		keyLength: number;
		ivLength: number;
		saltLength: number;
	};
	authentication: {
		jwtSecret: string;
		tokenExpiry: number;
		refreshTokenExpiry: number;
		maxLoginAttempts: number;
		lockoutDuration: number;
	};
	audit: {
		enabled: boolean;
		logLevel: "debug" | "info" | "warn" | "error";
		retentionDays: number;
		encryptLogs: boolean;
	};
	network: {
		allowedIPs: string[];
		rateLimiting: {
			enabled: boolean;
			requestsPerMinute: number;
			burstLimit: number;
		};
		tls: {
			enabled: boolean;
			minVersion: string;
			cipherSuites: string[];
		};
	};
}

interface SecurityEvent {
	id: string;
	type:
		| "authentication"
		| "authorization"
		| "data_access"
		| "system"
		| "network";
	severity: "low" | "medium" | "high" | "critical";
	timestamp: number;
	userId?: string;
	ipAddress: string;
	userAgent: string;
	action: string;
	resource: string;
	outcome: "success" | "failure" | "blocked";
	details: Record<string, any>;
	metadata: {
		sessionId: string;
		requestId: string;
		traceId: string;
	};
}

interface EncryptionResult {
	encrypted: string;
	iv: string;
	salt: string;
	algorithm: string;
	timestamp: number;
}

interface UserSession {
	sessionId: string;
	userId: string;
	createdAt: number;
	expiresAt: number;
	ipAddress: string;
	userAgent: string;
	isActive: boolean;
	permissions: string[];
	lastActivity: number;
}

interface SecurityPolicy {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	rules: SecurityRule[];
	actions: SecurityAction[];
}

interface SecurityRule {
	type:
		| "ip_whitelist"
		| "rate_limit"
		| "authentication"
		| "authorization"
		| "data_classification";
	conditions: Record<string, any>;
	severity: number;
}

interface SecurityAction {
	type: "block" | "alert" | "log" | "quarantine" | "escalate" | "encrypt";
	parameters: Record<string, any>;
}

class AdvancedSecuritySystem {
	private config: SecurityConfig;
	private encryptionKey: Buffer;
	private auditLog: SecurityEvent[] = [];
	private activeSessions: Map<string, UserSession> = new Map();
	private securityPolicies: Map<string, SecurityPolicy> = new Map();
	private blockedIPs: Set<string> = new Set();
	private rateLimitMap: Map<string, { count: number; resetTime: number }> =
		new Map();

	constructor(config?: Partial<SecurityConfig>) {
		this.config = {
			encryption: {
				algorithm: "aes-256-gcm",
				keyLength: 32,
				ivLength: 16,
				saltLength: 32,
			},
			authentication: {
				jwtSecret: randomBytes(64).toString("hex"),
				tokenExpiry: 3600000, // 1 hour
				refreshTokenExpiry: 86400000, // 24 hours
				maxLoginAttempts: 5,
				lockoutDuration: 900000, // 15 minutes
			},
			audit: {
				enabled: true,
				logLevel: "info",
				retentionDays: 90,
				encryptLogs: true,
			},
			network: {
				allowedIPs: [],
				rateLimiting: {
					enabled: true,
					requestsPerMinute: 60,
					burstLimit: 10,
				},
				tls: {
					enabled: true,
					minVersion: "TLSv1.2",
					cipherSuites: [
						"TLS_AES_256_GCM_SHA384",
						"TLS_CHACHA20_POLY1305_SHA256",
						"TLS_AES_128_GCM_SHA256",
					],
				},
			},
			...config,
		};

		this.initializeEncryption();
		this.initializeSecurityPolicies();
		this.startSecurityMonitoring();
	}

	private initializeEncryption(): void {
		// Generate encryption key from environment or secure source
		const keySource =
			process.env.ENCRYPTION_KEY || randomBytes(32).toString("hex");
		this.encryptionKey = Buffer.from(keySource, "hex").slice(
			0,
			this.config.encryption.keyLength,
		);
	}

	private initializeSecurityPolicies(): void {
		const defaultPolicies: SecurityPolicy[] = [
			{
				id: "data_protection",
				name: "Data Protection Policy",
				description: "Encrypt sensitive data and enforce access controls",
				enabled: true,
				rules: [
					{
						type: "data_classification",
						conditions: { sensitivity: "high" },
						severity: 8,
					},
				],
				actions: [
					{ type: "encrypt", parameters: {} },
					{ type: "log", parameters: { level: "high" } },
				],
			},
			{
				id: "access_control",
				name: "Access Control Policy",
				description: "Enforce authentication and authorization",
				enabled: true,
				rules: [
					{
						type: "authentication",
						conditions: { required: true },
						severity: 9,
					},
					{
						type: "authorization",
						conditions: { permissions: "required" },
						severity: 7,
					},
				],
				actions: [
					{ type: "block", parameters: {} },
					{ type: "alert", parameters: { escalate: true } },
				],
			},
			{
				id: "network_security",
				name: "Network Security Policy",
				description: "Control network access and rate limiting",
				enabled: true,
				rules: [
					{
						type: "ip_whitelist",
						conditions: { whitelist: "enforced" },
						severity: 6,
					},
					{
						type: "rate_limit",
						conditions: {
							rpm: this.config.network.rateLimiting.requestsPerMinute,
						},
						severity: 5,
					},
				],
				actions: [
					{ type: "block", parameters: { temporary: true } },
					{ type: "log", parameters: {} },
				],
			},
		];

		defaultPolicies.forEach((policy) => {
			this.securityPolicies.set(policy.id, policy);
		});
	}

	private startSecurityMonitoring(): void {
		// Monitor for security events
		setInterval(() => {
			this.performSecurityChecks();
		}, 60000); // Every minute

		// Cleanup expired sessions
		setInterval(() => {
			this.cleanupExpiredSessions();
		}, 300000); // Every 5 minutes

		// Rotate audit logs
		setInterval(() => {
			this.rotateAuditLogs();
		}, 86400000); // Every day
	}

	// Encryption/Decryption
	public async encrypt(
		data: string,
		additionalData?: string,
	): Promise<EncryptionResult> {
		const salt = randomBytes(this.config.encryption.saltLength);
		const iv = randomBytes(this.config.encryption.ivLength);

		// Derive key using scrypt
		const key = await this.deriveKey(this.encryptionKey, salt);

		const cipher = createCipheriv(this.config.encryption.algorithm, key, iv);

		let encrypted = cipher.update(data, "utf8", "hex");
		encrypted += cipher.final("hex");

		const authTag = (cipher as any).getAuthTag();

		const result: EncryptionResult = {
			encrypted: encrypted + ":" + authTag.toString("hex"),
			iv: iv.toString("hex"),
			salt: salt.toString("hex"),
			algorithm: this.config.encryption.algorithm,
			timestamp: Date.now(),
		};

		// Log encryption event
		await this.logSecurityEvent({
			type: "data_access",
			severity: "low",
			action: "data_encrypted",
			resource: "sensitive_data",
			outcome: "success",
			details: {
				algorithm: this.config.encryption.algorithm,
				dataSize: data.length,
			},
		});

		return result;
	}

	public async decrypt(encryptedData: EncryptionResult): Promise<string> {
		try {
			const salt = Buffer.from(encryptedData.salt, "hex");
			const iv = Buffer.from(encryptedData.iv, "hex");
			const key = await this.deriveKey(this.encryptionKey, salt);

			const [encrypted, authTagHex] = encryptedData.encrypted.split(":");
			const authTag = Buffer.from(authTagHex, "hex");

			const decipher = createDecipheriv(encryptedData.algorithm, key, iv);
			(decipher as any).setAuthTag(authTag);

			let decrypted = decipher.update(encrypted, "hex", "utf8");
			decrypted += decipher.final("utf8");

			// Log decryption event
			await this.logSecurityEvent({
				type: "data_access",
				severity: "low",
				action: "data_decrypted",
				resource: "sensitive_data",
				outcome: "success",
				details: { algorithm: encryptedData.algorithm },
			});

			return decrypted;
		} catch (error) {
			// Log failed decryption
			await this.logSecurityEvent({
				type: "data_access",
				severity: "high",
				action: "data_decryption_failed",
				resource: "sensitive_data",
				outcome: "failure",
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
			});

			throw new Error("Decryption failed: Invalid data or key");
		}
	}

	private async deriveKey(password: Buffer, salt: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			scrypt(
				password,
				salt,
				this.config.encryption.keyLength,
				(err, derivedKey) => {
					if (err) reject(err);
					else resolve(derivedKey);
				},
			);
		});
	}

	// Authentication & Authorization
	public async authenticateUser(credentials: {
		username: string;
		password: string;
		ipAddress: string;
		userAgent: string;
	}): Promise<{
		success: boolean;
		token?: string;
		session?: UserSession;
		error?: string;
	}> {
		// Check rate limiting
		if (this.config.network.rateLimiting.enabled) {
			const rateLimitResult = this.checkRateLimit(
				credentials.ipAddress,
				"auth",
			);
			if (!rateLimitResult.allowed) {
				await this.logSecurityEvent({
					type: "authentication",
					severity: "medium",
					action: "rate_limit_exceeded",
					resource: "auth_endpoint",
					outcome: "blocked",
					details: { ipAddress: credentials.ipAddress },
				});

				return { success: false, error: "Rate limit exceeded" };
			}
		}

		// Check IP whitelist
		if (this.config.network.allowedIPs.length > 0) {
			if (!this.config.network.allowedIPs.includes(credentials.ipAddress)) {
				await this.logSecurityEvent({
					type: "authentication",
					severity: "high",
					action: "ip_not_allowed",
					resource: "auth_endpoint",
					outcome: "blocked",
					details: { ipAddress: credentials.ipAddress },
				});

				return { success: false, error: "IP address not allowed" };
			}
		}

		// Simulate authentication (in real implementation, would verify against database)
		const isValidCredentials = await this.verifyCredentials(
			credentials.username,
			credentials.password,
		);

		if (isValidCredentials) {
			const session = await this.createUserSession(credentials);
			const token = await this.generateJWT(session);

			await this.logSecurityEvent({
				type: "authentication",
				severity: "low",
				action: "user_login",
				resource: "auth_system",
				outcome: "success",
				userId: credentials.username,
				details: { sessionId: session.sessionId },
			});

			return { success: true, token, session };
		} else {
			await this.logSecurityEvent({
				type: "authentication",
				severity: "medium",
				action: "login_failed",
				resource: "auth_system",
				userId: credentials.username,
				outcome: "failure",
				details: { reason: "invalid_credentials" },
			});

			return { success: false, error: "Invalid credentials" };
		}
	}

	private async verifyCredentials(
		username: string,
		password: string,
	): Promise<boolean> {
		// Simulate credential verification
		// In real implementation, would check against secure database
		return username.length > 0 && password.length >= 8;
	}

	private async createUserSession(credentials: {
		username: string;
		ipAddress: string;
		userAgent: string;
	}): Promise<UserSession> {
		const sessionId = (randomBytes(32) as any).toString("hex");
		const now = Date.now();

		const session: UserSession = {
			sessionId,
			userId: credentials.username,
			createdAt: now,
			expiresAt: now + this.config.authentication.tokenExpiry,
			ipAddress: credentials.ipAddress,
			userAgent: credentials.userAgent,
			isActive: true,
			permissions: await this.getUserPermissions(credentials.username),
			lastActivity: now,
		};

		this.activeSessions.set(sessionId, session);
		return session;
	}

	private async getUserPermissions(username: string): Promise<string[]> {
		// Simulate permission retrieval
		// In real implementation, would fetch from database or authorization service
		return ["read:fraud_data", "write:reports", "admin:users"];
	}

	private async generateJWT(session: UserSession): Promise<string> {
		// Simulate JWT generation
		// In real implementation, would use proper JWT library
		const payload = {
			sessionId: session.sessionId,
			userId: session.userId,
			permissions: session.permissions,
			exp: Math.floor(session.expiresAt / 1000),
		};

		return (Buffer.from(JSON.stringify(payload)) as any).toString("base64");
	}

	public async validateToken(
		token: string,
	): Promise<{ valid: boolean; session?: UserSession; error?: string }> {
		try {
			// Decode token (simplified)
			const payload = JSON.parse(
				(Buffer.from(token, "base64") as any).toString(),
			);

			// Check if session exists and is valid
			const session = this.activeSessions.get(payload.sessionId);
			if (!session || !session.isActive || session.expiresAt < Date.now()) {
				return { valid: false, error: "Invalid or expired token" };
			}

			// Update last activity
			session.lastActivity = Date.now();

			return { valid: true, session };
		} catch (error) {
			return { valid: false, error: "Invalid token format" };
		}
	}

	public async authorizeAction(
		session: UserSession,
		action: string,
		resource: string,
	): Promise<boolean> {
		// Check if user has required permission
		const requiredPermission = `${action}:${resource}`;
		const hasPermission =
			session.permissions.includes(requiredPermission) ||
			session.permissions.includes(`${action}:*`) ||
			session.permissions.includes(`*:${resource}`) ||
			session.permissions.includes("*");

		await this.logSecurityEvent({
			type: "authorization",
			severity: hasPermission ? "low" : "medium",
			action: "access_check",
			resource: resource,
			userId: session.userId,
			outcome: hasPermission ? "success" : "failure",
			details: { requestedAction: action, hasPermission },
		});

		return hasPermission;
	}

	// Rate Limiting
	private checkRateLimit(
		identifier: string,
		window: string,
	): { allowed: boolean; remaining: number; resetTime: number } {
		const key = `${identifier}:${window}`;
		const now = Date.now();
		const windowMs = 60000; // 1 minute
		const limit = this.config.network.rateLimiting.requestsPerMinute;

		let rateLimitData = this.rateLimitMap.get(key);

		if (!rateLimitData || now > rateLimitData.resetTime) {
			rateLimitData = {
				count: 0,
				resetTime: now + windowMs,
			};
			this.rateLimitMap.set(key, rateLimitData);
		}

		const allowed = rateLimitData.count < limit;
		if (allowed) {
			rateLimitData.count++;
		}

		return {
			allowed,
			remaining: Math.max(0, limit - rateLimitData.count),
			resetTime: rateLimitData.resetTime,
		};
	}

	// Security Event Logging
	public async logSecurityEvent(event: Partial<SecurityEvent>): Promise<void> {
		const securityEvent: SecurityEvent = {
			id: (randomBytes(16) as any).toString("hex"),
			type: event.type || "system",
			severity: event.severity || "low",
			timestamp: Date.now(),
			ipAddress: event.ipAddress || "unknown",
			userAgent: event.userAgent || "unknown",
			action: event.action || "unknown",
			resource: event.resource || "unknown",
			outcome: event.outcome || "success",
			details: event.details || {},
			metadata: {
				sessionId: event.metadata?.sessionId || "unknown",
				requestId:
					event.metadata?.requestId || (randomBytes(8) as any).toString("hex"),
				traceId:
					event.metadata?.traceId || (randomBytes(16) as any).toString("hex"),
			},
			...event,
		};

		this.auditLog.push(securityEvent);

		// Maintain log size
		if (this.auditLog.length > 10000) {
			this.auditLog.shift();
		}

		// Log to console (in real implementation, would log to secure audit system)
		if (this.config.audit.enabled) {
			const logLevel = this.getLogLevel(securityEvent.severity);
			if (this.shouldLog(logLevel)) {
				console.log(
					`[SECURITY-${securityEvent.severity.toUpperCase()}] ${securityEvent.action}: ${securityEvent.resource} - ${securityEvent.outcome}`,
				);
			}
		}

		// Trigger alerts for critical events
		if (securityEvent.severity === "critical") {
			await this.triggerSecurityAlert(securityEvent);
		}
	}

	private getLogLevel(severity: SecurityEvent["severity"]): string {
		switch (severity) {
			case "critical":
				return "error";
			case "high":
				return "warn";
			case "medium":
				return "info";
			case "low":
				return "debug";
			default:
				return "info";
		}
	}

	private shouldLog(level: string): boolean {
		const levels = ["debug", "info", "warn", "error"];
		const currentLevelIndex = levels.indexOf(this.config.audit.logLevel);
		const messageLevelIndex = levels.indexOf(level);
		return messageLevelIndex >= currentLevelIndex;
	}

	private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
		// In real implementation, would send to alerting system
		console.log(
			`🚨 SECURITY ALERT: ${event.type.toUpperCase()} - ${event.action}`,
		);
		console.log(`   Severity: ${event.severity}`);
		console.log(`   Resource: ${event.resource}`);
		console.log(`   IP: ${event.ipAddress}`);
		console.log(`   Details:`, event.details);
	}

	// Security Monitoring
	private performSecurityChecks(): Promise<void> {
		return new Promise((resolve) => {
			// Check for anomalous patterns
			this.detectAnomalousPatterns();

			// Check for expired sessions
			this.cleanupExpiredSessions();

			// Check rate limit cleanup
			this.cleanupRateLimits();

			resolve();
		});
	}

	private detectAnomalousPatterns(): void {
		// Detect multiple failed logins from same IP
		const failedLogins = this.auditLog.filter(
			(event) =>
				event.type === "authentication" &&
				event.action === "login_failed" &&
				event.timestamp > Date.now() - 300000, // Last 5 minutes
		);

		const ipFailureCounts = new Map<string, number>();
		failedLogins.forEach((event) => {
			const count = ipFailureCounts.get(event.ipAddress) || 0;
			ipFailureCounts.set(event.ipAddress, count + 1);
		});

		// Block IPs with too many failures
		for (const [ip, count] of ipFailureCounts) {
			if (count >= this.config.authentication.maxLoginAttempts) {
				this.blockIP(ip, "Multiple failed login attempts");
			}
		}
	}

	private blockIP(ipAddress: string, reason: string): void {
		this.blockedIPs.add(ipAddress);

		this.logSecurityEvent({
			type: "network",
			severity: "high",
			action: "ip_blocked",
			resource: "network_access",
			outcome: "blocked",
			details: { ipAddress, reason },
		});
	}

	private cleanupExpiredSessions(): void {
		const now = Date.now();
		const expiredSessions: string[] = [];

		for (const [sessionId, session] of this.activeSessions) {
			if (session.expiresAt < now || !session.isActive) {
				expiredSessions.push(sessionId);
			}
		}

		expiredSessions.forEach((sessionId) => {
			this.activeSessions.delete(sessionId);
		});

		if (expiredSessions.length > 0) {
			console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
		}
	}

	private cleanupRateLimits(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, data] of this.rateLimitMap) {
			if (now > data.resetTime) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => {
			this.rateLimitMap.delete(key);
		});
	}

	private rotateAuditLogs(): void {
		// In real implementation, would archive old logs and start new ones
		const cutoff =
			Date.now() - this.config.audit.retentionDays * 24 * 60 * 60 * 1000;
		const initialSize = this.auditLog.length;

		this.auditLog = this.auditLog.filter((event) => event.timestamp > cutoff);

		const removed = initialSize - this.auditLog.length;
		if (removed > 0) {
			console.log(`🗂️  Rotated audit logs: removed ${removed} old entries`);
		}
	}

	// Public API Methods
	public getSecurityEvents(
		options: {
			type?: SecurityEvent["type"];
			severity?: SecurityEvent["severity"];
			userId?: string;
			timeRange?: number;
			limit?: number;
		} = {},
	): SecurityEvent[] {
		let filtered = [...this.auditLog];

		if (options.type) {
			filtered = filtered.filter((e) => e.type === options.type);
		}
		if (options.severity) {
			filtered = filtered.filter((e) => e.severity === options.severity);
		}
		if (options.userId) {
			filtered = filtered.filter((e) => e.userId === options.userId);
		}
		if (options.timeRange) {
			const cutoff = Date.now() - options.timeRange;
			filtered = filtered.filter((e) => e.timestamp >= cutoff);
		}

		// Sort by timestamp (newest first)
		filtered.sort((a, b) => b.timestamp - a.timestamp);

		// Apply limit
		if (options.limit) {
			filtered = filtered.slice(0, options.limit);
		}

		return filtered;
	}

	public getActiveSessions(): UserSession[] {
		return Array.from(this.activeSessions.values()).filter((s) => s.isActive);
	}

	public revokeSession(sessionId: string): boolean {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.isActive = false;
			this.logSecurityEvent({
				type: "authentication",
				severity: "medium",
				action: "session_revoked",
				resource: "user_session",
				userId: session.userId,
				outcome: "success",
				details: { sessionId },
			});
			return true;
		}
		return false;
	}

	public isIPBlocked(ipAddress: string): boolean {
		return this.blockedIPs.has(ipAddress);
	}

	public unblockIP(ipAddress: string): boolean {
		if (this.blockedIPs.has(ipAddress)) {
			this.blockedIPs.delete(ipAddress);
			this.logSecurityEvent({
				type: "network",
				severity: "low",
				action: "ip_unblocked",
				resource: "network_access",
				outcome: "success",
				details: { ipAddress },
			});
			return true;
		}
		return false;
	}

	public getSecurityStatus(): {
		activeSessions: number;
		blockedIPs: number;
		auditLogSize: number;
		rateLimitEntries: number;
		enabledPolicies: number;
	} {
		const enabledPolicies = Array.from(this.securityPolicies.values()).filter(
			(p) => p.enabled,
		).length;

		return {
			activeSessions: this.activeSessions.size,
			blockedIPs: this.blockedIPs.size,
			auditLogSize: this.auditLog.length,
			rateLimitEntries: this.rateLimitMap.size,
			enabledPolicies,
		};
	}

	public updateSecurityConfig(updates: Partial<SecurityConfig>): void {
		Object.assign(this.config, updates);
		console.log("✅ Security configuration updated");
	}

	public getSecurityConfig(): SecurityConfig {
		return { ...this.config };
	}
}

// Export the advanced security system
export {
	AdvancedSecuritySystem,
	type SecurityConfig,
	type SecurityEvent,
	type EncryptionResult,
	type UserSession,
	type SecurityPolicy,
};
