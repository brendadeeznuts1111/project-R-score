// dashboard.types.ts - Enhanced type safety with global rules integration
// Note: Bun terminal types are defined inline since bun:terminal may not be available in all environments

// Enhanced Dashboard Panel Types with Security & Performance Features
interface DashboardPanel {
	id: string;
	title: string;
	position: { x: number; y: number; width: number; height: number };
	render: () => string;
	update: (data: any) => void;

	// Security & Compliance Fields
	securityLevel: "public" | "internal" | "confidential" | "restricted";
	complianceTags: string[];
	auditRequired: boolean;

	// Performance & Monitoring
	performanceMetrics: {
		renderTime: number;
		memoryUsage: number;
		updateFrequency: number;
	};

	// Accessibility & UI Consistency
	accessibilityFeatures: {
		highContrast: boolean;
		screenReaderSupport: boolean;
		keyboardNavigation: boolean;
	};

	// Color Scheme Compliance
	colorScheme: {
		primary: string; // #3b82f6 for enterprise
		success: string; // #22c55e for success
		warning: string; // #f59e0b for warning
		error: string; // #ef4444 for error
		background: string; // #1f2937 for background
	};
}

// Enhanced Dashboard Configuration with Global Rules Integration
interface DashboardConfig {
	theme:
		| "dark"
		| "light"
		| "high-contrast"
		| "enterprise-blue"
		| "family-purple";
	refreshRate: number;
	panels: DashboardPanel[];
	shortcuts: Record<string, string>;

	// Security Configuration
	security: {
		mTLS: boolean;
		jwtExpiryMinutes: number;
		biometricRequired: boolean;
		sessionTimeoutMinutes: number;
		rateLimiting: {
			enabled: boolean;
			maxRequests: number;
			windowMs: number;
		};
	};

	// Performance Optimization (28-second rule compliance)
	performance: {
		targetOnboardingTime: number; // 28 seconds
		maxRenderTime: number; // 200ms
		enableCaching: boolean;
		enableLazyLoading: boolean;
		enableParallelChecks: boolean;
		optimizeBundleSize: boolean;
	};

	// Compliance & Regulatory
	compliance: {
		pciDss: boolean;
		gdpr: boolean;
		ccpa: boolean;
		sox: boolean;
		dataRetentionDays: number;
		auditLogging: boolean;
	};

	// ROI & Analytics Configuration
	analytics: {
		trackUserEngagement: boolean;
		calculateMRRImpact: boolean;
		predictChurn: boolean;
		measureCustomerLifetimeValue: boolean;
		trackFeatureAdoption: boolean;
	};

	// Device Health Monitoring
	deviceHealth: {
		enableHealthChecks: boolean;
		checkIntervalMinutes: number;
		requiredChecks: string[];
		failThreshold: number;
	};

	// AI Monitoring Features
	aiMonitoring: {
		anomalyDetection: boolean;
		predictiveAlerts: boolean;
		selfHealing: boolean;
		intelligentRouting: boolean;
	};

	// Workspace-Specific Configuration
	workspace: {
		domain: "factory-wager.com" | "duoplus.com" | "ascii-dashboard";
		merchantType: "enterprise" | "family" | "standard";
		tier: "basic" | "premium" | "enterprise";
	};
}

// Enhanced Terminal Types with Advanced Features
declare global {
	namespace Terminal {
		interface Size {
			columns: number;
			rows: number;
			pixelWidth?: number;
			pixelHeight?: number;
			scaleFactor?: number;
		}

		interface Color {
			rgb: [number, number, number];
			ansi: number;
			hex: string;
			hsl: [number, number, number];
		}

		// Enhanced Terminal Capabilities
		interface Capabilities {
			colors: boolean;
			unicode: boolean;
			mouse: boolean;
			resize: boolean;
			clipboard: boolean;
			notifications: boolean;
		}

		// Performance Metrics
		interface Performance {
			renderTime: number;
			frameRate: number;
			memoryUsage: number;
			cpuUsage: number;
		}

		// Security Context
		interface SecurityContext {
			userId: string;
			sessionId: string;
			permissions: string[];
			auditTrail: AuditEntry[];
		}

		interface AuditEntry {
			timestamp: Date;
			action: string;
			userId: string;
			sessionId: string;
			ipAddress: string;
			userAgent: string;
			success: boolean;
		}
	}
}

// Device Health Check Types
interface DeviceHealthCheck {
	name: string;
	status: "pass" | "fail" | "warning";
	duration: number;
	details: Record<string, any>;
	timestamp: Date;
}

interface DeviceHealthReport {
	deviceId: string;
	overallStatus: "healthy" | "degraded" | "critical";
	checks: DeviceHealthCheck[];
	score: number; // 0-100
	recommendations: string[];
	nextCheckTime: Date;
}

// ROI Metrics Types
interface ROIMetrics {
	mrrImpact: number;
	churnProbability: number;
	customerLifetimeValue: number;
	featureAdoptionRate: number;
	userSatisfactionScore: number;
	netPromoterScore: number;
	supportTicketImpact: number;
	conversionFunnelMetrics: {
		awareness: number;
		interest: number;
		consideration: number;
		conversion: number;
		retention: number;
	};
}

// Compliance Report Types
interface ComplianceReport {
	framework: string;
	status: "compliant" | "non-compliant" | "pending";
	lastAudit: Date;
	nextAudit: Date;
	violations: ComplianceViolation[];
	score: number; // 0-100
}

interface ComplianceViolation {
	rule: string;
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	remediation: string;
	dueDate: Date;
}

// Enhanced Configuration with Factory Wager Defaults
const defaultConfig: DashboardConfig = {
	theme: "enterprise-blue",
	refreshRate: 60,
	panels: [],
	shortcuts: {
		"ctrl+r": "refresh",
		"ctrl+q": "quit",
		"ctrl+s": "save",
		"ctrl+d": "toggle-debug",
		"ctrl+h": "show-health",
		"ctrl+a": "show-analytics",
	},

	security: {
		mTLS: true,
		jwtExpiryMinutes: 5,
		biometricRequired: true,
		sessionTimeoutMinutes: 30,
		rateLimiting: {
			enabled: true,
			maxRequests: 100,
			windowMs: 60000,
		},
	},

	performance: {
		targetOnboardingTime: 28,
		maxRenderTime: 200,
		enableCaching: true,
		enableLazyLoading: true,
		enableParallelChecks: true,
		optimizeBundleSize: true,
	},

	compliance: {
		pciDss: true,
		gdpr: true,
		ccpa: true,
		sox: true,
		dataRetentionDays: 2555, // 7 years
		auditLogging: true,
	},

	analytics: {
		trackUserEngagement: true,
		calculateMRRImpact: true,
		predictChurn: true,
		measureCustomerLifetimeValue: true,
		trackFeatureAdoption: true,
	},

	deviceHealth: {
		enableHealthChecks: true,
		checkIntervalMinutes: 5,
		requiredChecks: [
			"os_version_check",
			"browser_compatibility",
			"network_performance",
			"security_posture",
			"webauthn_validation",
		],
		failThreshold: 80,
	},

	aiMonitoring: {
		anomalyDetection: true,
		predictiveAlerts: true,
		selfHealing: true,
		intelligentRouting: true,
	},

	workspace: {
		domain: "factory-wager.com",
		merchantType: "enterprise",
		tier: "enterprise",
	},
};

// Type-safe configuration factory
function createDashboardConfig(
	overrides: Partial<DashboardConfig> = {},
): DashboardConfig {
	return {
		...defaultConfig,
		...overrides,
		security: { ...defaultConfig.security, ...overrides.security },
		performance: { ...defaultConfig.performance, ...overrides.performance },
		compliance: { ...defaultConfig.compliance, ...overrides.compliance },
		analytics: { ...defaultConfig.analytics, ...overrides.analytics },
		deviceHealth: { ...defaultConfig.deviceHealth, ...overrides.deviceHealth },
		aiMonitoring: { ...defaultConfig.aiMonitoring, ...overrides.aiMonitoring },
		workspace: { ...defaultConfig.workspace, ...overrides.workspace },
	};
}

// Validation utilities
function validateConfig(config: DashboardConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Security validations
	if (config.security.jwtExpiryMinutes > 15) {
		errors.push("JWT expiry should not exceed 15 minutes for security");
	}

	// Performance validations
	if (config.performance.targetOnboardingTime > 60) {
		errors.push("Target onboarding time should be under 60 seconds");
	}

	// Compliance validations
	if (config.compliance.dataRetentionDays < 365 && config.compliance.sox) {
		errors.push("SOX compliance requires at least 1 year data retention");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export type {
	DashboardPanel,
	DashboardConfig,
	DeviceHealthCheck,
	DeviceHealthReport,
	ROIMetrics,
	ComplianceReport,
	ComplianceViolation,
};

export { defaultConfig, createDashboardConfig, validateConfig };
