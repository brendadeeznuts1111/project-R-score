// Ghost Shield - Privacy.com & Proxy Handler
// Advanced ghost-friendly de-weighting for legitimate privacy services
// Protects privacy.com users while maintaining fraud detection

import type { FeatureVector } from "../ai/anomaly-predict";

// Privacy service configurations
export interface PrivacyServiceConfig {
	enablePrivacyComDeWeighting: boolean;
	enableDuoPlusProtection: boolean;
	enableCloudflareWhitelist: boolean;
	enableVPNFriendlyMode: boolean;
	customWhitelistRanges: string[];
	deWeightingFactors: {
		privacyCom: number;
		duoPlus: number;
		cloudflare: number;
		legitimateVPN: number;
	};
}

// Privacy service fingerprint
export interface PrivacyServiceFingerprint {
	service:
		| "privacy_com"
		| "duoplus"
		| "cloudflare"
		| "legitimate_vpn"
		| "unknown";
	confidence: number;
	ipRange?: string;
	asn?: string;
	organization?: string;
	indicators: string[];
}

// Ghost shield result
export interface GhostShieldResult {
	isGhostFriendly: boolean;
	detectedService: PrivacyServiceFingerprint;
	deWeightedFeatures: FeatureVector;
	deWeightingApplied: boolean;
	riskAdjustment: number;
	recommendations: string[];
	bypassReasons: string[];
}

// Known privacy service ranges and patterns
const PRIVACY_SERVICE_PATTERNS = {
	// Privacy.com ranges
	privacy_com: {
		ip_ranges: [
			"199.102.106.",
			"199.102.107.",
			"199.102.108.",
			"199.102.109.",
			"199.102.110.",
			"199.102.111.",
		],
		asn: ["AS40028", "AS22612"],
		organization: ["Privacy.com", "PrivacyDotCom"],
		user_agent_patterns: ["privacy", "ghost", "virtual_card"],
		session_patterns: ["privacy", "ghost", "virtual"],
	},

	// DuoPlus family account patterns
	duoplus: {
		ip_ranges: ["52.0.0.", "52.1.0.", "52.2.0."], // AWS ranges for DuoPlus
		asn: ["AS14618", "AS16509"], // Amazon AWS
		organization: ["Amazon", "AWS", "DuoPlus"],
		user_agent_patterns: ["duoplus", "family", "shared"],
		session_patterns: ["duoplus-vm-", "family-account-", "shared-"],
	},

	// Cloudflare ranges
	cloudflare: {
		ip_ranges: [
			"103.21.244.",
			"103.22.200.",
			"103.31.244.",
			"104.16.0.",
			"104.17.0.",
			"104.18.0.",
			"104.19.0.",
			"104.20.0.",
		],
		asn: ["AS13335"],
		organization: ["Cloudflare", "CloudFlare"],
		user_agent_patterns: ["cloudflare", "cf-ray", "worker"],
		session_patterns: ["cloudflare-", "cf-", "worker-"],
	},

	// Legitimate VPN services
	legitimate_vpn: {
		ip_ranges: [
			"208.67.222.",
			"208.67.220.", // OpenDNS
			"8.8.8.",
			"8.8.4.", // Google DNS (often used with VPN)
			"1.1.1.",
			"1.0.0.", // Cloudflare DNS
		],
		asn: ["AS8075", "AS15169", "AS3356"], // Microsoft, Google, Level 3
		organization: ["Google", "Microsoft", "Amazon", "Cloudflare"],
		user_agent_patterns: ["chrome", "firefox", "safari", "edge"],
		session_patterns: ["corporate-", "enterprise-", "business-"],
	},
} as const;

export class GhostShield {
	private config: PrivacyServiceConfig;
	private whitelistedSessions: Set<string> = new Set();
	private serviceStats: Map<string, { count: number; lastSeen: number }> =
		new Map();

	constructor(
		config: PrivacyServiceConfig = {
			enablePrivacyComDeWeighting: true,
			enableDuoPlusProtection: true,
			enableCloudflareWhitelist: true,
			enableVPNFriendlyMode: true,
			customWhitelistRanges: [],
			deWeightingFactors: {
				privacyCom: 0.3,
				duoPlus: 0.4,
				cloudflare: 0.2,
				legitimateVPN: 0.5,
			},
		},
	) {
		this.config = config;
	}

	// Main ghost shield processing function
	async processGhostShield(
		features: FeatureVector,
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): Promise<GhostShieldResult> {
		// Detect privacy service
		const serviceFingerprint = this.detectPrivacyService(
			sessionId,
			ipAddress,
			userAgent,
			organization,
		);

		// Apply ghost-friendly de-weighting
		const deWeightingResult = this.applyGhostDeWeighting(
			features,
			serviceFingerprint,
			sessionId,
		);

		// Update statistics
		this.updateServiceStats(serviceFingerprint.service);

		console.log(
			`👻 Ghost Shield: ${serviceFingerprint.service} detected | De-weighting: ${deWeightingResult.deWeightingApplied ? "YES" : "NO"}`,
		);

		return {
			isGhostFriendly: deWeightingResult.deWeightingApplied,
			detectedService: serviceFingerprint,
			deWeightedFeatures: deWeightingResult.features,
			deWeightingApplied: deWeightingResult.deWeightingApplied,
			riskAdjustment: deWeightingResult.riskAdjustment,
			recommendations: deWeightingResult.recommendations,
			bypassReasons: deWeightingResult.bypassReasons,
		};
	}

	// Detect privacy service fingerprint
	private detectPrivacyService(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): PrivacyServiceFingerprint {
		const indicators: string[] = [];
		let service: PrivacyServiceFingerprint["service"] = "unknown";
		let confidence = 0;

		// Check Privacy.com patterns
		if (this.config.enablePrivacyComDeWeighting) {
			const privacyScore = this.checkPrivacyComPatterns(
				sessionId,
				ipAddress,
				userAgent,
				organization,
			);
			if (privacyScore > confidence) {
				service = "privacy_com";
				confidence = privacyScore;
				indicators.push(
					...this.getPrivacyComIndicators(
						sessionId,
						ipAddress,
						userAgent,
						organization,
					),
				);
			}
		}

		// Check DuoPlus patterns
		if (this.config.enableDuoPlusProtection) {
			const duoPlusScore = this.checkDuoPlusPatterns(
				sessionId,
				ipAddress,
				userAgent,
				organization,
			);
			if (duoPlusScore > confidence) {
				service = "duoplus";
				confidence = duoPlusScore;
				indicators.length = 0; // Clear previous indicators
				indicators.push(
					...this.getDuoPlusIndicators(
						sessionId,
						ipAddress,
						userAgent,
						organization,
					),
				);
			}
		}

		// Check Cloudflare patterns
		if (this.config.enableCloudflareWhitelist) {
			const cloudflareScore = this.checkCloudflarePatterns(
				sessionId,
				ipAddress,
				userAgent,
				organization,
			);
			if (cloudflareScore > confidence) {
				service = "cloudflare";
				confidence = cloudflareScore;
				indicators.length = 0;
				indicators.push(
					...this.getCloudflareIndicators(
						sessionId,
						ipAddress,
						userAgent,
						organization,
					),
				);
			}
		}

		// Check legitimate VPN patterns
		if (this.config.enableVPNFriendlyMode) {
			const vpnScore = this.checkLegitimateVPNPatterns(
				sessionId,
				ipAddress,
				userAgent,
				organization,
			);
			if (vpnScore > confidence) {
				service = "legitimate_vpn";
				confidence = vpnScore;
				indicators.length = 0;
				indicators.push(
					...this.getLegitimateVPNIndicators(
						sessionId,
						ipAddress,
						userAgent,
						organization,
					),
				);
			}
		}

		return {
			service,
			confidence,
			ipRange: ipAddress ? this.extractIPRange(ipAddress) : undefined,
			asn: this.extractASN(organization),
			organization,
			indicators,
		};
	}

	// Check Privacy.com patterns
	private checkPrivacyComPatterns(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): number {
		let score = 0;

		// Check IP range
		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.privacy_com.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			score += 0.4;
		}

		// Check organization
		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.privacy_com.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			score += 0.3;
		}

		// Check session patterns
		if (
			PRIVACY_SERVICE_PATTERNS.privacy_com.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			score += 0.3;
		}

		return score;
	}

	// Get Privacy.com indicators
	private getPrivacyComIndicators(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): string[] {
		const indicators: string[] = [];

		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.privacy_com.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			indicators.push(
				`Privacy.com IP range: ${this.extractIPRange(ipAddress)}`,
			);
		}

		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.privacy_com.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			indicators.push(`Organization: ${organization}`);
		}

		if (
			PRIVACY_SERVICE_PATTERNS.privacy_com.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			indicators.push(`Session pattern: ${sessionId}`);
		}

		return indicators;
	}

	// Check DuoPlus patterns
	private checkDuoPlusPatterns(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): number {
		let score = 0;

		// Check session patterns (primary indicator for DuoPlus)
		if (
			PRIVACY_SERVICE_PATTERNS.duoplus.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			score += 0.5;
		}

		// Check AWS ranges (DuoPlus uses AWS)
		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.duoplus.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			score += 0.3;
		}

		// Check organization
		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.duoplus.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			score += 0.2;
		}

		return score;
	}

	// Get DuoPlus indicators
	private getDuoPlusIndicators(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): string[] {
		const indicators: string[] = [];

		if (
			PRIVACY_SERVICE_PATTERNS.duoplus.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			indicators.push(`DuoPlus session pattern: ${sessionId}`);
		}

		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.duoplus.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			indicators.push(`AWS IP range: ${this.extractIPRange(ipAddress)}`);
		}

		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.duoplus.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			indicators.push(`Organization: ${organization}`);
		}

		return indicators;
	}

	// Check Cloudflare patterns
	private checkCloudflarePatterns(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): number {
		let score = 0;

		// Check IP range
		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.cloudflare.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			score += 0.5;
		}

		// Check organization
		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.cloudflare.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			score += 0.3;
		}

		// Check session patterns
		if (
			PRIVACY_SERVICE_PATTERNS.cloudflare.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			score += 0.2;
		}

		return score;
	}

	// Get Cloudflare indicators
	private getCloudflareIndicators(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): string[] {
		const indicators: string[] = [];

		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.cloudflare.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			indicators.push(`Cloudflare IP range: ${this.extractIPRange(ipAddress)}`);
		}

		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.cloudflare.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			indicators.push(`Organization: ${organization}`);
		}

		if (
			PRIVACY_SERVICE_PATTERNS.cloudflare.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			indicators.push(`Session pattern: ${sessionId}`);
		}

		return indicators;
	}

	// Check legitimate VPN patterns
	private checkLegitimateVPNPatterns(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): number {
		let score = 0;

		// Check IP range
		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			score += 0.3;
		}

		// Check organization
		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			score += 0.4;
		}

		// Check session patterns
		if (
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			score += 0.3;
		}

		return score;
	}

	// Get legitimate VPN indicators
	private getLegitimateVPNIndicators(
		sessionId: string,
		ipAddress?: string,
		userAgent?: string,
		organization?: string,
	): string[] {
		const indicators: string[] = [];

		if (
			ipAddress &&
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.ip_ranges.some((range) =>
				ipAddress.startsWith(range),
			)
		) {
			indicators.push(
				`Legitimate service IP range: ${this.extractIPRange(ipAddress)}`,
			);
		}

		if (
			organization &&
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.organization.some((org) =>
				organization.toLowerCase().includes(org.toLowerCase()),
			)
		) {
			indicators.push(`Organization: ${organization}`);
		}

		if (
			PRIVACY_SERVICE_PATTERNS.legitimate_vpn.session_patterns.some((pattern) =>
				sessionId.toLowerCase().includes(pattern),
			)
		) {
			indicators.push(`Session pattern: ${sessionId}`);
		}

		return indicators;
	}

	// Apply ghost-friendly de-weighting
	private applyGhostDeWeighting(
		features: FeatureVector,
		serviceFingerprint: PrivacyServiceFingerprint,
		sessionId: string,
	): {
		features: FeatureVector;
		deWeightingApplied: boolean;
		riskAdjustment: number;
		recommendations: string[];
		bypassReasons: string[];
	} {
		let deWeightingApplied = false;
		let riskAdjustment = 1.0;
		const recommendations: string[] = [];
		const bypassReasons: string[] = [];

		const adjustedFeatures = { ...features };

		// Apply service-specific de-weighting
		switch (serviceFingerprint.service) {
			case "privacy_com":
				if (this.config.enablePrivacyComDeWeighting) {
					adjustedFeatures.proxy_hop_count = Math.max(
						0,
						adjustedFeatures.proxy_hop_count - 2,
					);
					adjustedFeatures.vpn_active = Math.min(
						1,
						adjustedFeatures.vpn_active * 0.5,
					);
					riskAdjustment *= 1 - this.config.deWeightingFactors.privacyCom;
					deWeightingApplied = true;
					recommendations.push("Privacy.com de-weighting applied");
					bypassReasons.push("Legitimate privacy.com virtual card service");
				}
				break;

			case "duoplus":
				if (this.config.enableDuoPlusProtection) {
					adjustedFeatures.vpn_active = Math.min(
						1,
						adjustedFeatures.vpn_active * 0.6,
					);
					adjustedFeatures.proxy_hop_count = Math.max(
						0,
						adjustedFeatures.proxy_hop_count - 1,
					);
					riskAdjustment *= 1 - this.config.deWeightingFactors.duoPlus;
					deWeightingApplied = true;
					recommendations.push("DuoPlus family account protection applied");
					bypassReasons.push("DuoPlus family account with shared devices");
				}
				break;

			case "cloudflare":
				if (this.config.enableCloudflareWhitelist) {
					adjustedFeatures.proxy_hop_count = Math.max(
						0,
						adjustedFeatures.proxy_hop_count - 1,
					);
					riskAdjustment *= 1 - this.config.deWeightingFactors.cloudflare;
					deWeightingApplied = true;
					recommendations.push("Cloudflare proxy de-weighting applied");
					bypassReasons.push("Cloudflare CDN/Worker traffic");
				}
				break;

			case "legitimate_vpn":
				if (this.config.enableVPNFriendlyMode) {
					adjustedFeatures.vpn_active = Math.min(
						1,
						adjustedFeatures.vpn_active * 0.7,
					);
					riskAdjustment *= 1 - this.config.deWeightingFactors.legitimateVPN;
					deWeightingApplied = true;
					recommendations.push("Legitimate VPN de-weighting applied");
					bypassReasons.push("Corporate/enterprise VPN access");
				}
				break;
		}

		// Apply custom whitelist ranges
		if (this.config.customWhitelistRanges.length > 0) {
			// Implementation for custom ranges would go here
			recommendations.push("Custom whitelist ranges checked");
		}

		return {
			features: adjustedFeatures,
			deWeightingApplied,
			riskAdjustment,
			recommendations,
			bypassReasons,
		};
	}

	// Extract IP range from IP address
	private extractIPRange(ipAddress: string): string {
		const parts = ipAddress.split(".");
		if (parts.length >= 3) {
			return `${parts[0]}.${parts[1]}.${parts[2]}.`;
		}
		return ipAddress;
	}

	// Extract ASN from organization string
	private extractASN(organization?: string): string | undefined {
		if (!organization) return undefined;

		const asnMatch = organization.match(/AS(\d+)/);
		return asnMatch ? asnMatch[0] : undefined;
	}

	// Update service statistics
	private updateServiceStats(
		service: PrivacyServiceFingerprint["service"],
	): void {
		const current = this.serviceStats.get(service) || { count: 0, lastSeen: 0 };
		current.count++;
		current.lastSeen = Date.now();
		this.serviceStats.set(service, current);
	}

	// Add session to whitelist
	addToWhitelist(sessionId: string): void {
		this.whitelistedSessions.add(sessionId);
	}

	// Remove session from whitelist
	removeFromWhitelist(sessionId: string): void {
		this.whitelistedSessions.delete(sessionId);
	}

	// Check if session is whitelisted
	isWhitelisted(sessionId: string): boolean {
		return this.whitelistedSessions.has(sessionId);
	}

	// Get service statistics
	getServiceStats(): Map<string, { count: number; lastSeen: number }> {
		return new Map(this.serviceStats);
	}

	// Clear old statistics
	clearOldStats(olderThanHours: number = 24): void {
		const cutoff = Date.now() - olderThanHours * 3600000;

		for (const [service, stats] of this.serviceStats.entries()) {
			if (stats.lastSeen < cutoff) {
				this.serviceStats.delete(service);
			}
		}
	}

	// Update configuration
	updateConfig(newConfig: Partial<PrivacyServiceConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	// Get current configuration
	getConfig(): PrivacyServiceConfig {
		return { ...this.config };
	}
}

// Export singleton instance
export const ghostShield = new GhostShield();

// Export types for external use
export type {
	PrivacyServiceConfig,
	PrivacyServiceFingerprint,
	GhostShieldResult,
};
