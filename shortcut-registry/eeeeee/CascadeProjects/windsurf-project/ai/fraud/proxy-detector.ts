// Ghost Shield Proxy Detector
// Advanced proxy detection with hop counting and geolocation analysis
// Multi-hop proxy identification and traffic pattern analysis

import type { FeatureVector } from "../ai/anomaly-predict";

// Proxy detection configuration
export interface ProxyDetectionConfig {
	enableHopCounting: boolean;
	enableGeoAnalysis: boolean;
	enableTrafficAnalysis: boolean;
	enableDNSTracking: boolean;
	maxAllowedHops: number;
	suspiciousASNs: string[];
	knownProxyRanges: string[];
}

// Proxy hop information
export interface ProxyHop {
	hopNumber: number;
	ipAddress: string;
	hostname?: string;
	asn?: string;
	organization?: string;
	country?: string;
	latency: number;
	isKnownProxy: boolean;
	riskScore: number;
}

// Proxy detection result
export interface ProxyDetectionResult {
	isProxyDetected: boolean;
	hopCount: number;
	proxyHops: ProxyHop[];
	proxyType: "none" | "vpn" | "tor" | "datacenter" | "residential" | "mobile";
	confidence: number;

	// Geographic analysis
	countries: string[];
	impossibleVelocity: boolean;
	distanceKm: number;

	// Risk assessment
	riskScore: number;
	riskFactors: string[];

	// Recommendations
	recommendations: string[];
	requiresAdditionalVerification: boolean;
}

// Traffic pattern analysis
export interface TrafficPattern {
	packetSizeVariation: number;
	timingConsistency: number;
	protocolDistribution: Record<string, number>;
	headerAnomalies: string[];
	isBotLike: boolean;
}

// DNS tracking information
export interface DNSTracking {
	queryPatterns: string[];
	suspiciousDomains: string[];
	dnsOverHttps: boolean;
	dnsEncryption: boolean;
	isSuspicious: boolean;
}

export class ProxyDetector {
	private config: ProxyDetectionConfig;
	private knownProxyIPs: Set<string> = new Set();
	private suspiciousASNs: Set<string> = new Set();

	constructor(
		config: ProxyDetectionConfig = {
			enableHopCounting: true,
			enableGeoAnalysis: true,
			enableTrafficAnalysis: true,
			enableDNSTracking: true,
			maxAllowedHops: 3,
			suspiciousASNs: [
				"AS16276",
				"AS13335",
				"AS396982",
				"AS209242", // Known proxy ASNs
				"AS197695",
				"AS20473",
				"AS14061",
				"AS16509", // Datacenter ASNs
			],
			knownProxyRanges: [
				"10.0.0.",
				"192.168.",
				"172.16.", // Private ranges
				"100.64.",
				"198.18.",
				"169.254.", // CGNAT and link-local
			],
		},
	) {
		this.config = config;
		this.initializeKnownProxies();
	}

	// Main proxy detection function
	async detectProxy(
		sessionId: string,
		clientIP: string,
		userAgent?: string,
		headers?: Record<string, string>,
	): Promise<ProxyDetectionResult> {
		const startTime = performance.now();

		// Perform hop counting if enabled
		const hopAnalysis = this.config.enableHopCounting
			? await this.performHopCounting(clientIP)
			: { hops: [], hopCount: 0 };

		// Geographic analysis
		const geoAnalysis = this.config.enableGeoAnalysis
			? await this.analyzeGeography(hopAnalysis.hops)
			: { countries: [], impossibleVelocity: false, distanceKm: 0 };

		// Traffic pattern analysis
		const trafficAnalysis =
			this.config.enableTrafficAnalysis && headers
				? await this.analyzeTrafficPattern(headers)
				: null;

		// DNS tracking
		const dnsAnalysis = this.config.enableDNSTracking
			? await this.trackDNSPatterns(sessionId)
			: null;

		// Determine proxy type and confidence
		const proxyAssessment = this.assessProxyType(
			hopAnalysis,
			geoAnalysis,
			trafficAnalysis,
			dnsAnalysis,
		);

		// Calculate risk score
		const riskScore = this.calculateProxyRiskScore(
			hopAnalysis,
			geoAnalysis,
			trafficAnalysis,
			dnsAnalysis,
		);

		// Generate recommendations
		const recommendations = this.generateProxyRecommendations(
			proxyAssessment,
			riskScore,
			hopAnalysis.hopCount,
		);

		const processingTime = performance.now() - startTime;

		console.log(
			`🔍 Proxy Detection: ${proxyAssessment.type} | Hops: ${hopAnalysis.hopCount} | Risk: ${riskScore.toFixed(3)} | ${processingTime.toFixed(2)}ms`,
		);

		return {
			isProxyDetected: proxyAssessment.type !== "none",
			hopCount: hopAnalysis.hopCount,
			proxyHops: hopAnalysis.hops,
			proxyType: proxyAssessment.type,
			confidence: proxyAssessment.confidence,
			countries: geoAnalysis.countries,
			impossibleVelocity: geoAnalysis.impossibleVelocity,
			distanceKm: geoAnalysis.distanceKm,
			riskScore,
			riskFactors: this.identifyRiskFactors(
				hopAnalysis,
				geoAnalysis,
				trafficAnalysis,
			),
			recommendations,
			requiresAdditionalVerification: riskScore > 0.7,
		};
	}

	// Perform hop counting (simulated traceroute)
	private async performHopCounting(clientIP: string): Promise<{
		hops: ProxyHop[];
		hopCount: number;
	}> {
		const hops: ProxyHop[] = [];

		// Simulate traceroute results (in production, this would be actual network tracing)
		const simulatedHops = this.generateSimulatedHops(clientIP);

		for (let hopIndex = 0; hopIndex < simulatedHops.length; hopIndex++) {
			const hopData = simulatedHops[hopIndex];
			const hop: ProxyHop = {
				hopNumber: hopIndex + 1,
				ipAddress: hopData?.ip || "",
				hostname: hopData?.hostname || "",
				asn: hopData?.asn || "",
				organization: hopData?.organization || "",
				country: hopData?.country || "",
				latency: hopData?.latency || 0,
				isKnownProxy: this.isKnownProxyIP(hopData?.ip || ""),
				riskScore: this.calculateHopRiskScore(hopData || {}),
			};

			hops.push(hop);
		}

		return { hops, hopCount: hops.length };
	}

	// Generate simulated hop data (for demo purposes)
	private generateSimulatedHops(clientIP: string): Array<{
		ip: string;
		hostname?: string;
		asn?: string;
		organization?: string;
		country?: string;
		latency: number;
	}> {
		const hops = [];

		// Add client as first hop
		hops.push({
			ip: clientIP,
			hostname: "client-endpoint",
			asn: "CLIENT",
			organization: "Client Network",
			country: "US",
			latency: 5,
		});

		// Simulate intermediate hops
		const hopCount = Math.floor(Math.random() * 6) + 1; // 1-6 hops

		for (let hopNumber = 1; hopNumber < hopCount; hopNumber++) {
			const ipAddress = `192.0.2.${hopNumber + 1}`; // Example IP range
			hops.push({
				ip: ipAddress,
				hostname: `hop-${hopNumber}.example.com`,
				asn: `AS${1000 + hopNumber * 100}`,
				organization: hopNumber % 2 === 0 ? "ISP Network" : "Datacenter",
				country: hopNumber % 3 === 0 ? "DE" : "US",
				latency: 10 + hopNumber * 5,
			});
		}

		return hops;
	}

	// Analyze geographic information
	private async analyzeGeography(hops: ProxyHop[]): Promise<{
		countries: string[];
		impossibleVelocity: boolean;
		distanceKm: number;
	}> {
		const countries = new Set<string>();
		let totalDistance = 0;
		let impossibleVelocity = false;

		for (let hopIndex = 0; hopIndex < hops.length; hopIndex++) {
			const currentHop = hops[hopIndex];
			if (currentHop?.country) {
				countries.add(currentHop.country);
			}

			// Calculate distance between consecutive hops
			if (hopIndex > 0) {
				const previousHop = hops[hopIndex - 1];
				if (previousHop?.country && currentHop?.country) {
					const distance = this.calculateDistance(
						previousHop.country || "US",
						currentHop.country || "US",
					);
					totalDistance += distance;

					// Check for impossible velocity
					const timeDiff = (currentHop.latency - previousHop.latency) / 1000; // Convert to seconds
					if (timeDiff > 0 && distance / timeDiff > 800) {
						// 800 km/h threshold
						impossibleVelocity = true;
					}
				}
			}
		}

		return {
			countries: Array.from(countries),
			impossibleVelocity,
			distanceKm: totalDistance,
		};
	}

	// Calculate distance between countries (simplified)
	private calculateDistance(country1: string, country2: string): number {
		// Simplified distance calculation (would use actual coordinates in production)
		if (country1 === country2) return 0;

		const distances: Record<string, Record<string, number>> = {
			US: { DE: 7500, GB: 5800, FR: 6200, JP: 8800 },
			DE: { US: 7500, GB: 900, FR: 800, JP: 8900 },
			GB: { US: 5800, DE: 900, FR: 350, JP: 9500 },
			FR: { US: 6200, DE: 800, GB: 350, JP: 9700 },
			JP: { US: 8800, DE: 8900, GB: 9500, FR: 9700 },
		};

		return distances[country1]?.[country2] || 5000; // Default distance
	}

	// Analyze traffic patterns from headers
	private async analyzeTrafficPattern(
		headers: Record<string, string>,
	): Promise<TrafficPattern> {
		const packetSizeVariation = this.analyzePacketSizeVariation(headers);
		const timingConsistency = this.analyzeTimingConsistency(headers);
		const protocolDistribution = this.analyzeProtocolDistribution(headers);
		const headerAnomalies = this.detectHeaderAnomalies(headers);
		const isBotLike = this.detectBotLikeBehavior(headers);

		return {
			packetSizeVariation,
			timingConsistency,
			protocolDistribution,
			headerAnomalies,
			isBotLike,
		};
	}

	// Analyze packet size variation (simplified)
	private analyzePacketSizeVariation(headers: Record<string, string>): number {
		const contentLength = headers["content-length"];
		if (!contentLength) return 0;

		const size = parseInt(contentLength);
		// Return variation score based on size ranges
		if (size < 1000) return 0.1;
		if (size < 5000) return 0.3;
		if (size < 20000) return 0.6;
		return 0.9;
	}

	// Analyze timing consistency
	private analyzeTimingConsistency(headers: Record<string, string>): number {
		// Simplified timing analysis based on request headers
		const hasCacheControl = headers["cache-control"];
		const hasPragma = headers["pragma"];

		let consistency = 0.5; // Default

		if (hasCacheControl && hasPragma) {
			consistency = 0.8; // Consistent caching behavior
		} else if (!hasCacheControl && !hasPragma) {
			consistency = 0.2; // Inconsistent behavior
		}

		return consistency;
	}

	// Analyze protocol distribution
	private analyzeProtocolDistribution(
		headers: Record<string, string>,
	): Record<string, number> {
		const distribution: Record<string, number> = {
			http: 1,
			https: headers["x-forwarded-proto"] === "https" ? 1 : 0,
			websocket: headers["upgrade"] === "websocket" ? 1 : 0,
		};

		return distribution;
	}

	// Detect header anomalies
	private detectHeaderAnomalies(headers: Record<string, string>): string[] {
		const anomalies: string[] = [];

		// Check for missing standard headers
		if (!headers["user-agent"]) {
			anomalies.push("Missing User-Agent header");
		}

		if (!headers["accept"]) {
			anomalies.push("Missing Accept header");
		}

		// Check for suspicious headers
		if (
			headers["x-forwarded-for"] &&
			headers["x-forwarded-for"].split(",").length > 3
		) {
			anomalies.push("Multiple proxy hops detected");
		}

		if (headers["via"] && headers["via"].includes("proxy")) {
			anomalies.push("Explicit proxy header detected");
		}

		return anomalies;
	}

	// Detect bot-like behavior
	private detectBotLikeBehavior(headers: Record<string, string>): boolean {
		const userAgent = headers["user-agent"]?.toLowerCase() || "";

		const botPatterns = [
			"bot",
			"crawler",
			"spider",
			"scraper",
			"automated",
			"python",
			"curl",
			"wget",
			"java",
			"go-http",
		];

		return botPatterns.some((pattern) => userAgent.includes(pattern));
	}

	// Track DNS patterns
	private async trackDNSPatterns(sessionId: string): Promise<DNSTracking> {
		// Simulated DNS tracking (would integrate with DNS monitoring in production)
		const queryPatterns = [
			`session-${sessionId}`,
			`api-${sessionId}`,
			`auth-${sessionId}`,
		];
		const suspiciousDomains: string[] = [];
		const dnsOverHttps = Math.random() > 0.7;
		const dnsEncryption = Math.random() > 0.6;
		const isSuspicious = suspiciousDomains.length > 0 || !dnsEncryption;

		return {
			queryPatterns,
			suspiciousDomains,
			dnsOverHttps,
			dnsEncryption,
			isSuspicious,
		};
	}

	// Assess proxy type and confidence
	private assessProxyType(
		hopAnalysis: { hops: ProxyHop[]; hopCount: number },
		geoAnalysis: { countries: string[]; impossibleVelocity: boolean },
		trafficAnalysis: TrafficPattern | null,
		dnsAnalysis: DNSTracking | null,
	): { type: ProxyDetectionResult["proxyType"]; confidence: number } {
		const hopCount = hopAnalysis.hopCount;
		const knownProxyHops = hopAnalysis.hops.filter(
			(hop) => hop.isKnownProxy,
		).length;
		const countryCount = geoAnalysis.countries.length;

		// Determine proxy type
		if (hopCount === 0) {
			return { type: "none", confidence: 0.9 };
		}

		if (hopCount > this.config.maxAllowedHops) {
			if (countryCount > 3) {
				return { type: "tor", confidence: 0.8 };
			} else {
				return { type: "datacenter", confidence: 0.7 };
			}
		}

		if (knownProxyHops > 0) {
			if (trafficAnalysis?.isBotLike) {
				return { type: "datacenter", confidence: 0.8 };
			} else {
				return { type: "vpn", confidence: 0.7 };
			}
		}

		if (countryCount > 1) {
			return { type: "residential", confidence: 0.6 };
		}

		if (hopAnalysis.hops.some((hop) => hop.organization?.includes("mobile"))) {
			return { type: "mobile", confidence: 0.5 };
		}

		return { type: "none", confidence: 0.4 };
	}

	// Calculate proxy risk score
	private calculateProxyRiskScore(
		hopAnalysis: { hops: ProxyHop[]; hopCount: number },
		geoAnalysis: { countries: string[]; impossibleVelocity: boolean },
		trafficAnalysis: TrafficPattern | null,
		dnsAnalysis: DNSTracking | null,
	): number {
		let riskScore = 0;

		// Hop count risk
		if (hopAnalysis.hopCount > this.config.maxAllowedHops) {
			riskScore += 0.3;
		} else if (hopAnalysis.hopCount > 2) {
			riskScore += 0.1;
		}

		// Geographic risk
		if (geoAnalysis.impossibleVelocity) {
			riskScore += 0.4;
		} else if (geoAnalysis.countries.length > 3) {
			riskScore += 0.2;
		}

		// Known proxy risk
		const knownProxyHops = hopAnalysis.hops.filter(
			(hop) => hop.isKnownProxy,
		).length;
		riskScore += knownProxyHops * 0.1;

		// Traffic pattern risk
		if (trafficAnalysis) {
			if (trafficAnalysis.isBotLike) riskScore += 0.3;
			if (trafficAnalysis.headerAnomalies.length > 2) riskScore += 0.2;
		}

		// DNS risk
		if (dnsAnalysis?.isSuspicious) {
			riskScore += 0.2;
		}

		return Math.min(1, riskScore);
	}

	// Identify risk factors
	private identifyRiskFactors(
		hopAnalysis: { hops: ProxyHop[]; hopCount: number },
		geoAnalysis: { countries: string[]; impossibleVelocity: boolean },
		trafficAnalysis: TrafficPattern | null,
	): string[] {
		const factors: string[] = [];

		if (hopAnalysis.hopCount > this.config.maxAllowedHops) {
			factors.push(`Excessive hop count: ${hopAnalysis.hopCount}`);
		}

		if (geoAnalysis.impossibleVelocity) {
			factors.push("Impossible travel velocity detected");
		}

		if (geoAnalysis.countries.length > 3) {
			factors.push(`Multiple countries: ${geoAnalysis.countries.join(", ")}`);
		}

		const knownProxyHops = hopAnalysis.hops.filter(
			(hop) => hop.isKnownProxy,
		).length;
		if (knownProxyHops > 0) {
			factors.push(`${knownProxyHops} known proxy hops`);
		}

		if (trafficAnalysis?.isBotLike) {
			factors.push("Bot-like traffic patterns");
		}

		if (trafficAnalysis?.headerAnomalies?.length > 0) {
			factors.push(
				`${trafficAnalysis.headerAnomalies.length} header anomalies`,
			);
		}

		return factors;
	}

	// Generate proxy recommendations
	private generateProxyRecommendations(
		proxyAssessment: {
			type: ProxyDetectionResult["proxyType"];
			confidence: number;
		},
		riskScore: number,
		hopCount: number,
	): string[] {
		const recommendations: string[] = [];

		if (proxyAssessment.type === "tor") {
			recommendations.push("BLOCK_SESSION", "HIGH_RISK_TOR_DETECTED");
		} else if (proxyAssessment.type === "datacenter") {
			recommendations.push(
				"REQUIRE_ADDITIONAL_VERIFICATION",
				"DATACENTER_PROXY_DETECTED",
			);
		} else if (proxyAssessment.type === "vpn") {
			recommendations.push("MONITOR_CLOSELY", "VPN_USAGE_DETECTED");
		}

		if (hopCount > this.config.maxAllowedHops) {
			recommendations.push("MULTIHOP_PROXY_DETECTED");
		}

		if (riskScore > 0.8) {
			recommendations.push("IMMEDIATE_SECURITY_REVIEW");
		} else if (riskScore > 0.6) {
			recommendations.push("ENHANCED_MONITORING");
		}

		return recommendations;
	}

	// Check if IP is known proxy
	private isKnownProxyIP(ip: string): boolean {
		return (
			this.knownProxyIPs.has(ip) ||
			this.config.knownProxyRanges.some((range) => ip.startsWith(range))
		);
	}

	// Calculate hop risk score
	private calculateHopRiskScore(hopData: any): number {
		let risk = 0;

		if (this.config.suspiciousASNs.includes(hopData.asn)) {
			risk += 0.3;
		}

		if (
			hopData.organization?.includes("proxy") ||
			hopData.organization?.includes("vpn")
		) {
			risk += 0.2;
		}

		if (hopData.latency > 200) {
			risk += 0.1;
		}

		return Math.min(1, risk);
	}

	// Initialize known proxy IPs
	private initializeKnownProxies(): void {
		// Add suspicious ASNs
		this.config.suspiciousASNs.forEach((asn) => {
			this.suspiciousASNs.add(asn);
		});

		console.log(
			`🔍 Proxy Detector initialized with ${this.suspiciousASNs.size} suspicious ASNs`,
		);
	}

	// Add known proxy IP
	addKnownProxyIP(ip: string): void {
		this.knownProxyIPs.add(ip);
	}

	// Remove known proxy IP
	removeKnownProxyIP(ip: string): void {
		this.knownProxyIPs.delete(ip);
	}

	// Update configuration
	updateConfig(newConfig: Partial<ProxyDetectionConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	// Get current configuration
	getConfig(): ProxyDetectionConfig {
		return { ...this.config };
	}
}

// Export singleton instance
export const proxyDetector = new ProxyDetector();
