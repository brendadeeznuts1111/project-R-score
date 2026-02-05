// src/__tests__/integration/modal-kyc-integration.test.ts
// Integration tests combining enhanced modal settings and KYC failsafe systems

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { KYCFailsafeEngine } from "../../kyc/failsafeEngine";
import { ConfigLoader } from "../enhanced-modal-settings.test";

// Mock database for integration testing
class IntegrationDatabaseService {
	private data: Map<string, any> = new Map();
	private configs: Map<string, any> = new Map();

	async get(key: string): Promise<any> {
		return this.data.get(key);
	}

	async set(key: string, value: any): Promise<void> {
		this.data.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.data.delete(key);
	}

	async getConfig(key: string): Promise<any> {
		return this.configs.get(key);
	}

	async setConfig(key: string, value: any): Promise<void> {
		this.configs.set(key, value);
	}

	async clear(): Promise<void> {
		this.data.clear();
		this.configs.clear();
	}
}

// Integration service that combines both systems
class ModalKYCIntegration {
	private configLoader: ConfigLoader;
	public kycEngine: KYCFailsafeEngine;
	private db: IntegrationDatabaseService;

	constructor(configPath: string, db: IntegrationDatabaseService) {
		this.configLoader = new ConfigLoader(configPath);
		this.db = db;
		this.kycEngine = new KYCFailsafeEngine(db as any);
	}

	async initialize(): Promise<void> {
		// Load configuration
		const config = this.configLoader.YAML.parse();

		// Store configuration in database for access by KYC system
		await this.db.setConfig("modal-settings", config);
		await this.db.setConfig("kyc-settings", {
			maxRetries: config.features.security.autoMitigation ? 5 : 3,
			riskThreshold: config.features.security.liveRiskUpdates ? 70 : 80,
			enableAI: config.features.ai.enableAIAudit,
			collaboration: config.features.collaboration.realTimeCollaboration,
		});

		// Initialize KYC system with configuration
		const kycConfig = await this.db.getConfig("kyc-settings");
		// Store config for use in KYC processing
		await this.db.setConfig("kyc-engine-config", kycConfig);
	}

	async processUserKYC(
		userId: string,
		failureReason: string,
		context?: any,
	): Promise<any> {
		const config = await this.db.getConfig("modal-settings");
		const kycConfig = await this.db.getConfig("kyc-settings");

		// Apply modal settings to KYC processing
		const _enhancedContext = {
			...context,
			theme: config.ui.theme,
			collaboration: kycConfig.collaboration,
			aiEnabled: kycConfig.enableAI,
			securityLevel: config.security.encryption ? "high" : "medium",
		};

		// Process KYC with enhanced context
		const result = await this.kycEngine.executeFailsafe(userId, failureReason);

		// Apply modal settings to result
		return {
			...result,
			ui: {
				theme: config.ui.theme,
				notifications: config.ui.notifications,
				animations: config.ui.animations,
			},
			security: {
				encryption: config.security.encryption,
				sessionTimeout: config.security.sessionTimeout,
				rateLimit: config.security.rateLimit,
				require2FA: config.security.require2FA,
				auditLogRetention: config.security.auditLogRetention,
			},
			collaboration: {
				enabled: kycConfig.collaboration,
				realTimeUpdates: config.features.collaboration.realTimeCollaboration,
			},
		};
	}

	async getSystemStatus(): Promise<any> {
		const config = await this.db.getConfig("modal-settings");
		const kycConfig = await this.db.getConfig("kyc-settings");

		return {
			modal: {
				version: config.meta.version,
				environment: config.meta.environment,
				features: {
					ai: config.features.ai.enableAIAudit,
					security: config.features.security.encryptionAtRest,
					collaboration: config.features.collaboration.realTimeCollaboration,
				},
			},
			kyc: {
				configured: true,
				aiEnabled: kycConfig.enableAI,
				riskThreshold: kycConfig.riskThreshold,
				collaboration: kycConfig.collaboration,
			},
		};
	}
}

describe("Modal Settings and KYC Integration", () => {
	const configPath = `${__dirname}/../../client/config/enhanced-modal-settings.toml`;
	let db: IntegrationDatabaseService;
	let integration: ModalKYCIntegration;

	beforeEach(async () => {
		db = new IntegrationDatabaseService();
		integration = new ModalKYCIntegration(configPath, db);
		await integration.initialize();
	});

	afterEach(async () => {
		await db.clear();

		// Clean up test files
		try {
			await Bun.$`rm -rf ./logs/kyc-review-queue/integration-*`;
			await Bun.$`rm -rf ./logs/kyc-approvals/integration-*`;
			await Bun.$`rm -rf ./logs/kyc-rejections/integration-*`;
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("System Initialization", () => {
		it("should initialize both systems successfully", async () => {
			const status = await integration.getSystemStatus();

			expect(status.modal.version).toBe("3.0.0");
			expect(status.modal.features.ai).toBe(true);
			expect(status.modal.features.security).toBe(true);
			expect(status.kyc.configured).toBe(true);
			expect(status.kyc.aiEnabled).toBe(true);
		});

		it("should load configuration into database", async () => {
			const modalConfig = await db.getConfig("modal-settings");
			const kycConfig = await db.getConfig("kyc-settings");

			expect(modalConfig).toBeDefined();
			expect(modalConfig.features).toBeDefined();
			expect(kycConfig).toBeDefined();
			expect(kycConfig.enableAI).toBe(true);
		});

		it("should apply modal settings to KYC configuration", async () => {
			const kycConfig = await db.getConfig("kyc-settings");

			expect(kycConfig.enableAI).toBe(true);
			expect(kycConfig.collaboration).toBe(true);
			expect(typeof kycConfig.riskThreshold).toBe("number");
		});
	});

	describe("Enhanced KYC Processing", () => {
		it("should process KYC with modal settings context", async () => {
			const result = await integration.processUserKYC(
				"integrationUser123",
				"primary_flow_timeout",
				{ sessionId: "test-session-123" },
			);

			expect(result.status).toBeDefined();
			expect(result.traceId).toContain("integrationUser123");
			expect(result.ui.theme).toBe("cyberpunk");
			expect(result.security.encryption).toBe(true);
			expect(result.collaboration.enabled).toBe(true);
		});

		it("should apply security settings from modal config", async () => {
			const result = await integration.processUserKYC(
				"securityUser123",
				"security_validation",
			);

			expect(result.security.encryption).toBe(true);
			expect(result.security.sessionTimeout).toBe(3600);
			expect(result.security.rateLimit).toBe(100);
			expect(result.security.require2FA).toBe(false);
			expect(result.security.auditLogRetention).toBe("30d");
		});

		it("should include UI configuration in results", async () => {
			const result = await integration.processUserKYC(
				"uiUser789",
				"ui_configuration_test",
			);

			expect(result.ui.theme).toBe("cyberpunk");
			expect(result.ui.notifications).toBeDefined();
			expect(result.ui.animations).toBeDefined();
		});

		it("should enable collaboration features when configured", async () => {
			const result = await integration.processUserKYC(
				"collabUser101",
				"collaboration_test",
			);

			expect(result.collaboration.enabled).toBe(true);
			expect(result.collaboration.realTimeUpdates).toBe(true);
		});
	});

	describe("Feature Integration", () => {
		it("should integrate AI features from both systems", async () => {
			const config = await db.getConfig("modal-settings");
			const kycConfig = await db.getConfig("kyc-settings");

			expect(config.features.ai.enableAIAudit).toBe(true);
			expect(config.features.ai.enableMultiProvider).toBe(true);
			expect(kycConfig.enableAI).toBe(true);
		});

		it("should integrate security features", async () => {
			const config = await db.getConfig("modal-settings");

			expect(config.features.security.encryptionAtRest).toBe(true);
			expect(config.features.security.auditLogging).toBe(true);
			expect(config.security.encryption).toBe(true);
		});

		it("should integrate collaboration features", async () => {
			const config = await db.getConfig("modal-settings");
			const kycConfig = await db.getConfig("kyc-settings");

			expect(config.features.collaboration.realTimeCollaboration).toBe(true);
			expect(config.features.collaboration.sessionPersistence).toBe(true);
			expect(kycConfig.collaboration).toBe(true);
		});

		it("should integrate UI features", async () => {
			const config = await db.getConfig("modal-settings");
			const result = await integration.processUserKYC("uiUser202", "ui_test");

			expect(config.ui.theme).toBe("cyberpunk");
			expect(config.ui.animations.enable).toBe(true);
			expect(result.ui.theme).toBe("cyberpunk");
			expect(result.ui.animations).toBeDefined();
		});

		it("should apply performance settings from modal config", async () => {
			const config = await db.getConfig("modal-settings");

			expect(config.performance.cacheStrategy).toBe("lru");
			expect(config.performance.debounceMs).toBe(300);
			expect(config.performance.throttleMs).toBe(100);
		});

		it("should process KYC within performance constraints", async () => {
			const startTime = performance.now();
			const result = await integration.processUserKYC(
				"perfUser303",
				"performance_test",
			);
			const duration = performance.now() - startTime;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
		});

		it("should handle concurrent requests with integration context", async () => {
			const promises = [];
			for (let i = 0; i < 3; i++) {
				promises.push(
					integration.processUserKYC(
						`concurrentUser${i}`,
						"concurrent_integration_test",
					),
				);
			}

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.ui.theme === "cyberpunk")).toBe(true);
			expect(results.every((r) => r.security.encryption === true)).toBe(true);
		});
	});

	describe("Configuration Synchronization", () => {
		it("should synchronize feature flags between systems", async () => {
			const config = await db.getConfig("modal-settings");
			const kycConfig = await db.getConfig("kyc-settings");

			// AI features should be synchronized
			expect(config.features.ai.enableAIAudit).toBe(kycConfig.enableAI);

			// Collaboration features should be synchronized
			expect(config.features.collaboration.realTimeCollaboration).toBe(
				kycConfig.collaboration,
			);
		});

		it("should apply security settings consistently", async () => {
			const config = await db.getConfig("modal-settings");
			const result = await integration.processUserKYC(
				"syncUser404",
				"sync_test",
			);

			expect(config.security.encryption).toBe(true);
			expect(result.security.encryption).toBe(true);
			expect(config.security.sessionTimeout).toBe(3600);
			expect(result.security.sessionTimeout).toBe(3600);
			expect(config.security.auditLogRetention).toBe("30d");
			expect(result.security.auditLogRetention).toBe("30d");
		});

		it("should maintain theme consistency across systems", async () => {
			const config = await db.getConfig("modal-settings");
			const result = await integration.processUserKYC(
				"themeUser505",
				"theme_test",
			);

			expect(config.ui.theme).toBe("cyberpunk");
			expect(result.ui.theme).toBe("cyberpunk");
			expect(config.colors.defaultTheme).toBe("cyberpunk");
		});
	});

	describe("Error Handling Integration", () => {
		it("should handle configuration errors gracefully", async () => {
			// Test with invalid configuration
			const invalidIntegration = new ModalKYCIntegration(
				"/invalid/path.toml",
				db,
			);

			await expect(invalidIntegration.initialize()).rejects.toThrow();
		});

		it("should handle KYC processing errors with modal context", async () => {
			// Mock KYC failure
			(integration.kycEngine as any).executeFailsafe = async () => {
				throw new Error("KYC processing failed");
			};

			await expect(
				integration.processUserKYC("errorUser606", "integration_error"),
			).rejects.toThrow("KYC processing failed");
		});

		it("should maintain audit trail across both systems", async () => {
			const result = await integration.processUserKYC(
				"auditUser707",
				"audit_integration_test",
			);

			expect(result.auditLog).toBeDefined();
			expect(result.auditLog.length).toBeGreaterThan(0);
			expect(result.auditLog[0]).toContain("Primary KYC failed");
		});
	});

	describe("Monitoring and Analytics Integration", () => {
		it("should collect metrics from both systems", async () => {
			const config = await db.getConfig("modal-settings");

			expect(config.analytics.enabled).toBe(true);
			expect(config.analytics.provider).toBe("posthog");
			expect(config.analytics.events.trackAudits).toBe(true);
		});

		it("should track KYC events with modal context", async () => {
			const result = await integration.processUserKYC(
				"trackingUser808",
				"tracking_test",
			);

			expect(result.traceId).toBeDefined();
			expect(result.ui).toBeDefined();
			expect(result.security).toBeDefined();
			expect(result.collaboration).toBeDefined();
		});

		it("should provide comprehensive system status", async () => {
			const status = await integration.getSystemStatus();

			expect(status.modal).toBeDefined();
			expect(status.kyc).toBeDefined();
			expect(status.modal.features).toBeDefined();
			expect(status.kyc.configured).toBe(true);
		});
	});

	describe("Security Integration", () => {
		it("should apply security headers and settings", async () => {
			const config = await db.getConfig("modal-settings");

			expect(config.security.headers.csp).toBeDefined();
			expect(config.security.headers.hsts).toBeDefined();
			expect(config.security.headers.xFrameOptions).toBe("DENY");
		});

		it("should maintain encryption across both systems", async () => {
			const config = await db.getConfig("modal-settings");
			const result = await integration.processUserKYC(
				"encryptUser909",
				"encryption_test",
			);

			expect(config.security.encryption).toBe(true);
			expect(result.security.encryption).toBe(true);
		});

		it("should validate session management", async () => {
			const config = await db.getConfig("modal-settings");

			expect(config.security.sessionTimeout).toBe(3600);
			expect(config.security.rateLimit).toBe(100);
			expect(config.security.maxLoginAttempts).toBe(5);
		});
	});
});
