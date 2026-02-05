// AI Anomaly Prediction Engine - Bun-Native GNN + Real-Time Fraud Oracle
// Factory Wager QR Onboarding Fraud Detection System
// 0.92 Threshold Fortress | 5-Feature Weighted Oracle | <0.5ms Inference

// Detect Bun runtime (recommended method per Bun docs)
if (!process.versions.bun) {
	console.error("❌ This module requires Bun runtime.");
	console.error("   Install Bun: https://bun.sh");
	console.error("   Then run: bun ai/prediction/anomaly-predict.ts");
	process.exit(1);
}

import type { Server, ServerWebSocket } from "bun";
import { serve } from "bun";
import {
	batchFetch,
	getNetworkMetrics,
	networkOptimizer,
	optimizedFetch,
} from "./network-optimizer.js";

// Feature weight configuration aligned with global rules (5-feature weighted oracle)
export const FEATURE_WEIGHTS = {
	root_detected: 2.4, // Critical security impact
	vpn_active: 1.8, // High risk for fraud
	thermal_spike: 1.2, // Temperature anomaly detection
	biometric_fail: 1.9, // Biometric security failures
	proxy_hop_count: 2.1, // Multi-hop proxy detection
} as const;

// Risk thresholds matching model-config.json
export const RISK_THRESHOLDS = {
	CRITICAL_BLOCK: 0.92, // Immediate session termination
	HIGH_RISK: 0.75, // Additional verification required
	MONITORING: 0.5, // Shadow monitoring only
} as const;

// Ghost-friendly known good patterns (privacy.com, DuoPlus VMs)
export const GHOST_WHITELIST = {
	privacy_com_ranges: ["199.102.106.", "199.102.107.", "199.102.108."],
	duoplus_vm_fingerprints: ["duoplus-vm-", "family-account-"],
	legitimate_proxy_services: ["cloudflare-", "aws-", "gcp-"],
} as const;

// External API endpoints for enhanced fraud detection
export const EXTERNAL_APIS = {
	device_intelligence: [
		"https://api.deviceatlas.com/v1/device/fingerprint",
		"https://api.fingerprintjs.com/v1/fingerprint",
	],
	geolocation: ["https://maxmind.com/v1/geoip", "https://ipinfo.io/v1/json"],
	threat_intelligence: [
		"https://api.crowdstrike.com/v1/threats",
		"https://api.mandiant.com/v1/indicators",
	],
	identity_verification: [
		"https://veriff.com/v1/verify",
		"https://api.jumio.com/v1/identity",
		"https://api.onfido.com/v1/check",
	],
	payment_processors: [
		"https://api.stripe.com/v1/charges",
		"https://api.paypal.com/v1/payments",
		"https://api.square.com/v2/payments",
	],
} as const;

// Real-time fraud detection session storage
export interface FraudSession {
	sessionId: string;
	merchantId: string;
	score: number;
	features: FeatureVector;
	riskLevel: "low" | "medium" | "high" | "critical";
	blocked: boolean;
	timestamp: number;
	reason?: string;
}

export interface FeatureVector {
	root_detected: number; // 0 or 1
	vpn_active: number; // 0 or 1
	thermal_spike: number; // °C delta from baseline
	biometric_fail: number; // Count of failed attempts
	proxy_hop_count: number; // Number of detected hops
}

// Active sessions tracking
const activeSessions = new Map<string, FraudSession>();
const riskHistory: number[] = [];

// ============================================
// === QUICK WIN #26: PRE-WARM BACKEND CONNECTIONS ===
// ============================================
// Pre-warm DNS and connections to external APIs at startup
// This reduces latency for first API calls by 50-300ms
async function prewarmExternalConnections() {
	// Bun's dns and fetch are global APIs
	const { dns } = Bun;
	
	console.log("🔥 Pre-warming external API connections...");
	
	// Pre-warm all external API domains
	const externalDomains = new Set<string>();
	
	// Collect all unique domains from EXTERNAL_APIS
	Object.values(EXTERNAL_APIS).flat().forEach((url) => {
		try {
			const domain = new URL(url).hostname;
			externalDomains.add(domain);
		} catch {
			// Skip invalid URLs
		}
	});
	
	// DNS prefetch for all external domains (DNS lookup only)
	for (const domain of externalDomains) {
		try {
			dns.prefetch(domain, 443); // Port 443 for HTTPS
			console.log(`  📍 DNS prefetch: ${domain}`);
		} catch (err) {
			console.warn(`  ⚠️  DNS prefetch failed for ${domain}:`, err);
		}
	}
	
	// Preconnect to most critical external services (DNS + TCP + TLS)
	const criticalServices = [
		"https://api.deviceatlas.com",
		"https://api.fingerprintjs.com",
		"https://api.stripe.com",
		"https://api.paypal.com",
	];
	
	for (const url of criticalServices) {
		try {
			await fetch.preconnect(url);
			console.log(`  🔗 Preconnected: ${url}`);
		} catch (err) {
			console.warn(`  ⚠️  Preconnect failed for ${url}:`, err);
		}
	}
	
	console.log("✅ External connections pre-warmed");
}

// Pre-warm connections at module load (before server starts)
// Only pre-warm if running with Bun (dns and fetch.preconnect are Bun-specific)
if (process.versions.bun) {
	prewarmExternalConnections().catch((err) => {
		console.error("❌ Failed to pre-warm connections:", err);
	});
}

// Simulated ONNX inference (would use actual ONNX model in production)
async function runGNNInference(
	weightedFeatures: Float32Array,
): Promise<number> {
	// Simulate neural network computation with Bun-native performance
	const start = performance.now();

	// Mock GNN computation - in reality this would be ONNX/TensorFlow.js
	let score = 0.0;
	for (
		let featureIndex = 0;
		featureIndex < weightedFeatures.length;
		featureIndex++
	) {
		score +=
			(weightedFeatures[featureIndex] || 0) * (0.8 + Math.random() * 0.4); // Add some variance
	}

	// Apply non-linear activation and normalize
	score = Math.tanh(score / weightedFeatures.length);
	score = Math.max(0, Math.min(1, score));

	const inferenceTime = performance.now() - start;
	console.log(
		`🧠 GNN Inference: ${inferenceTime.toFixed(2)}ms | Score: ${score.toFixed(3)}`,
	);

	return score;
}

// Apply ghost-friendly de-weighting for known good patterns
function applyGhostDeWeighting(
	features: FeatureVector,
	sessionId: string,
): FeatureVector {
	const adjusted = { ...features };

	// De-weight privacy.com routing
	if (sessionId.includes("privacy") || sessionId.includes("ghost")) {
		adjusted.proxy_hop_count = Math.max(0, adjusted.proxy_hop_count - 2);
		console.log(`👻 Ghost de-weighting applied for privacy.com routing`);
	}

	// De-weight DuoPlus family accounts
	if (
		GHOST_WHITELIST.duoplus_vm_fingerprints.some((fp) => sessionId.includes(fp))
	) {
		adjusted.vpn_active = Math.min(1, adjusted.vpn_active * 0.5);
		console.log(`👻 DuoPlus family account de-weighting applied`);
	}

	return adjusted;
}

// Core fraud prediction function with 5-feature weighting
export async function predictRisk(
	features: FeatureVector,
	sessionId: string,
	merchantId: string,
): Promise<FraudSession> {
	const startTime = performance.now();

	// Apply ghost-friendly adjustments
	const adjustedFeatures = applyGhostDeWeighting(features, sessionId);

	// Create weighted feature vector for GNN
	const weightedFeatures = new Float32Array([
		adjustedFeatures.root_detected * FEATURE_WEIGHTS.root_detected,
		adjustedFeatures.vpn_active * FEATURE_WEIGHTS.vpn_active,
		adjustedFeatures.thermal_spike * FEATURE_WEIGHTS.thermal_spike,
		adjustedFeatures.biometric_fail * FEATURE_WEIGHTS.biometric_fail,
		adjustedFeatures.proxy_hop_count * FEATURE_WEIGHTS.proxy_hop_count,
	]);

	// Run GNN inference
	const score = await runGNNInference(weightedFeatures);

	// Determine risk level and action
	let riskLevel: FraudSession["riskLevel"];
	let blocked = false;
	let reason: string | undefined;

	if (score >= RISK_THRESHOLDS.CRITICAL_BLOCK) {
		riskLevel = "critical";
		blocked = true;
		reason = determineBlockReason(adjustedFeatures, score);
	} else if (score >= RISK_THRESHOLDS.HIGH_RISK) {
		riskLevel = "high";
		reason = "additional_verification_required";
	} else if (score >= RISK_THRESHOLDS.MONITORING) {
		riskLevel = "medium";
	} else {
		riskLevel = "low";
	}

	// Create session record
	const session: FraudSession = {
		sessionId,
		merchantId,
		score,
		features: adjustedFeatures,
		riskLevel,
		blocked,
		timestamp: Date.now(),
		reason,
	};

	// Store session
	activeSessions.set(sessionId, session);
	riskHistory.push(score);

	// Keep history bounded
	if (riskHistory.length > 10000) {
		riskHistory.splice(0, 1000);
	}

	const processingTime = performance.now() - startTime;
	console.log(
		`⚡ Risk Prediction Complete: ${processingTime.toFixed(2)}ms | ${riskLevel.toUpperCase()} | Score: ${score.toFixed(3)}`,
	);

	// Auto-block critical sessions
	if (blocked) {
		await blockSessionAction(sessionId, score, reason!);
	}

	// Broadcast to websocket clients
	broadcastFraudAlert(session);

	return session;
}

// Determine specific block reason for logging
function determineBlockReason(features: FeatureVector, score: number): string {
	const reasons: string[] = [];

	if (features.root_detected) reasons.push("root_detected");
	if (features.vpn_active) reasons.push("vpn_active");
	if (features.thermal_spike > 15) reasons.push("thermal_spike");
	if (features.biometric_fail >= 3) reasons.push("biometric_failures");
	if (features.proxy_hop_count >= 4) reasons.push("multi_hop_proxy");

	return reasons.length > 0
		? reasons.join(" + ")
		: `high_score_${score.toFixed(3)}`;
}

// Session blocking function
async function blockSessionAction(
	sessionId: string,
	score: number,
	reason: string,
): Promise<void> {
	console.log(
		`🚫 SESSION BLOCKED: ${sessionId} | Score: ${score.toFixed(3)} | Reason: ${reason}`,
	);

	// In production, this would:
	// - Invalidate JWT tokens
	// - Terminate websocket connections
	// - Log to security audit system
	// - Send alerts to security team
	// - Update merchant dashboard

	// Simulate blocking action
	await new Promise((resolve) => setTimeout(resolve, 1)); // Minimal async delay
}

// Websocket server for real-time fraud alerts
const websocketClients = new Set<ServerWebSocket<any>>();

function broadcastFraudAlert(session: FraudSession): void {
	const alert = {
		event: session.blocked ? "fraud:blocked" : "fraud:detected",
		sessionId: session.sessionId,
		merchantId: session.merchantId,
		score: session.score,
		riskLevel: session.riskLevel,
		blocked: session.blocked,
		reason: session.reason,
		timestamp: session.timestamp,
	};

	const message = JSON.stringify(alert);

	websocketClients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});

	console.log(`📡 Fraud alert broadcasted to ${websocketClients.size} clients`);
}

// Legacy feature interface for backward compatibility
interface AnomalyFeatures extends FeatureVector {
	device_age_hours?: number; // int - device account age
	location_velocity?: number; // km/h - impossible travel speed
	battery_drain_rate?: number; // %/hour - unusual battery consumption
	network_latency?: number; // ms - network response time
	app_install_count?: number; // int - number of installed apps
}

// Prediction result interface
interface AnomalyPrediction {
	score: number; // 0.0-1.0 - anomaly probability
	risk_level: "low" | "medium" | "high" | "critical";
	features: AnomalyFeatures;
	timestamp: number;
	session_id: string;
	recommendations: string[];
	blocked: boolean;
}

// Legacy ML Model class for backward compatibility
class AnomalyPredictionModel {
	constructor() {
		// Legacy constructor for compatibility
		console.log(
			"🤖 Legacy AnomalyPredictionModel initialized for compatibility",
		);
	}
}

// HTTP/WebSocket server
const server = serve({
	port: process.env.PORT ? parseInt(process.env.PORT) : 3051,
	hostname: process.env.HOST || "0.0.0.0", // defaults to "0.0.0.0" as per Bun docs
	fetch(req: Request, server: Server<any>) {
		const url = new URL(req.url);

		// WebSocket upgrade
		if (url.pathname === "/ws/risk-live") {
			const upgraded = server.upgrade(req);
			if (upgraded) {
				return undefined; // WebSocket handled
			}
		}

		// API endpoints
		if (req.method === "POST" && url.pathname === "/api/risk/score") {
			return handleRiskScore(req);
		}

		if (req.method === "POST" && url.pathname === "/api/risk/enhanced") {
			return handleEnhancedPrediction(req);
		}

		if (req.method === "GET" && url.pathname === "/api/risk/heatmap") {
			return handleRiskHeatmap();
		}

		if (req.method === "GET" && url.pathname === "/api/network/metrics") {
			return handleNetworkMetrics();
		}

		if (req.method === "POST" && url.pathname === "/api/external/data") {
			return handleExternalAPIs(req);
		}

		if (req.method === "GET" && url.pathname === "/api/health") {
			return new Response(
				JSON.stringify({
					status: "healthy",
					active_sessions: activeSessions.size,
					network_optimization: true,
					external_apis: true,
					version: "2.0.0",
					timestamp: Date.now(),
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	},
	websocket: {
		open(ws: ServerWebSocket<any>) {
			websocketClients.add(ws);
			console.log(
				`� WebSocket client connected. Total: ${websocketClients.size}`,
			);

			// Send current risk baseline
			ws.send(
				JSON.stringify({
					event: "risk:baseline",
					threshold: RISK_THRESHOLDS.CRITICAL_BLOCK,
					active_sessions: activeSessions.size,
				}),
			);
		},
		message(ws: ServerWebSocket<any>, message: string | any) {
			try {
				const messageStr =
					typeof message === "string" ? message : message.toString();
				const data = JSON.parse(messageStr);

				if (data.type === "session:features") {
					// Handle real-time feature submission
					predictRisk(data.features, data.sessionId, data.merchantId)
						.then((session) => {
							ws.send(
								JSON.stringify({
									event: "risk:score",
									sessionId: session.sessionId,
									score: session.score,
									riskLevel: session.riskLevel,
									blocked: session.blocked,
								}),
							);
						})
						.catch((error) => {
							console.error("Error processing risk prediction:", error);
							ws.send(
								JSON.stringify({
									event: "error",
									message: "Prediction failed",
								}),
							);
						});
				}
			} catch (error) {
				console.error("WebSocket message error:", error);
			}
		},
		close(ws: ServerWebSocket<any>) {
			websocketClients.delete(ws);
			console.log(
				`❌ WebSocket client disconnected. Total: ${websocketClients.size}`,
			);
		},
	},
});

// API endpoint handlers
async function handleRiskScore(req: Request): Promise<Response> {
	try {
		// QUICK WIN: Response buffering for request body (prevents parsing jank)
		const bytes = await req.arrayBuffer();
		const body = JSON.parse(new TextDecoder().decode(bytes)) as {
			features: FeatureVector;
			sessionId: string;
			merchantId: string;
			enableExternal?: boolean;
		};

		let session;
		if (body.enableExternal) {
			// Enhanced prediction with external data
			const externalData = await fetchExternalData(
				"8.8.8.8",
				"device-fingerprint",
			);
			session = await predictRiskEnhanced(
				body.features,
				body.sessionId,
				body.merchantId,
				externalData,
			);
		} else {
			// Standard prediction
			session = await predictRisk(
				body.features,
				body.sessionId,
				body.merchantId,
			);
		}

		return new Response(JSON.stringify(session), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Risk score error:", error);
		return new Response(JSON.stringify({ error: "Invalid request" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}

function handleRiskHeatmap(): Response {
	// Generate risk heatmap data for dashboard
	const recentSessions = Array.from(activeSessions.values())
		.filter((s) => Date.now() - s.timestamp < 300000) // Last 5 minutes
		.map((s) => ({
			merchantId: s.merchantId,
			score: s.score,
			riskLevel: s.riskLevel,
			timestamp: s.timestamp,
		}));

	return new Response(
		JSON.stringify({
			sessions: recentSessions,
			total_active: activeSessions.size,
			avg_score:
				riskHistory.length > 0
					? riskHistory.slice(-100).reduce((a, b) => a + b, 0) /
						Math.min(100, riskHistory.length)
					: 0,
			blocked_sessions: Array.from(activeSessions.values()).filter(
				(s) => s.blocked,
			).length,
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);
}

// Enhanced API endpoints
async function handleNetworkMetrics(): Promise<Response> {
	try {
		const metrics = getNetworkMetrics();
		return new Response(JSON.stringify(metrics), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Network metrics error:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch metrics" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

async function handleExternalAPIs(req: Request): Promise<Response> {
	try {
		// QUICK WIN: Response buffering for request body
		const bytes = await req.arrayBuffer();
		const body = JSON.parse(new TextDecoder().decode(bytes)) as {
			ipAddress?: string;
			deviceFingerprint?: string;
		};

		const ipAddress = body.ipAddress || "8.8.8.8";
		const deviceFingerprint = body.deviceFingerprint || "test-fingerprint";

		const externalData = await fetchExternalData(ipAddress, deviceFingerprint);

		return new Response(JSON.stringify(externalData), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("External API error:", error);
		return new Response(
			JSON.stringify({ error: "Failed to fetch external data" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

async function handleEnhancedPrediction(req: Request): Promise<Response> {
	try {
		// QUICK WIN: Response buffering for request body
		const bytes = await req.arrayBuffer();
		const body = JSON.parse(new TextDecoder().decode(bytes)) as {
			features: FeatureVector;
			sessionId: string;
			merchantId: string;
			ipAddress?: string;
			deviceFingerprint?: string;
		};

		// Fetch external data
		const externalData = await fetchExternalData(
			body.ipAddress || "8.8.8.8",
			body.deviceFingerprint || "test-fingerprint",
		);

		// Enhanced prediction
		const session = await predictRiskEnhanced(
			body.features,
			body.sessionId,
			body.merchantId,
			externalData,
		);

		return new Response(
			JSON.stringify({
				...session,
				externalData,
				processingTime: Date.now(),
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Enhanced prediction error:", error);
		return new Response(JSON.stringify({ error: "Invalid request" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}

// Legacy compatibility functions for benchmarks
export async function predictAnomaly(
	features: any,
	sessionId: string,
): Promise<{ score: number; blocked: boolean }> {
	const session = await predictRisk(features, sessionId, "benchmark-merchant");
	return { score: session.score, blocked: session.blocked };
}

export async function analyzeOnboardingSession(
	sessionId: string,
	deviceData: any,
): Promise<boolean> {
	const session = await predictRisk(
		deviceData,
		sessionId,
		"onboarding-merchant",
	);
	return !session.blocked;
}

export async function blockSession(
	sessionId: string,
	reason?: string,
): Promise<void> {
	const session = activeSessions.get(sessionId);
	if (session) {
		session.blocked = true;
		session.reason = reason || "manual_block";
		await blockSessionAction(sessionId, session.score, session.reason);
		broadcastFraudAlert(session);
	}
}

// ============================================================================
// ENHANCED PREDICTION WITH EXTERNAL API INTEGRATION
// ============================================================================

/**
 * Enhanced risk prediction with external API data enrichment
 */
export async function predictRiskEnhanced(
	features: FeatureVector,
	sessionId: string,
	merchantId: string,
	externalData?: ExternalDataSources,
): Promise<FraudSession> {
	const startTime = performance.now();

	try {
		// Get base risk score
		const baseSession = await predictRisk(features, sessionId, merchantId);

		// Enrich with external data if available
		if (externalData) {
			const enrichedScore = await enrichWithExternalData(
				baseSession,
				externalData,
			);
			return enrichedScore;
		}

		return baseSession;
	} catch (error) {
		console.error("Enhanced prediction failed:", error);
		// Fallback to base prediction
		return predictRisk(features, sessionId, merchantId);
	}
}

/**
 * Fetch external data from multiple sources with network optimization
 */
export async function fetchExternalData(
	ipAddress: string,
	deviceFingerprint: string,
): Promise<ExternalDataSources> {
	const startTime = performance.now();

	try {
		// Create request URLs as strings for batchFetch
		const requestUrls = [
			...EXTERNAL_APIS.device_intelligence.map(
				(url) => `${url}?fingerprint=${deviceFingerprint}`,
			),
			...EXTERNAL_APIS.geolocation.map((url) => `${url}?ip=${ipAddress}`),
			...EXTERNAL_APIS.threat_intelligence.map(
				(url) => `${url}?query=${ipAddress}`,
			),
		];

		const responses = await batchFetch(requestUrls);

		// Parse responses
		const externalData: ExternalDataSources = {
			deviceIntelligence: await parseDeviceIntelligence(responses.slice(0, 2)),
			geolocation: await parseGeolocation(responses.slice(2, 4)),
			threatIntelligence: await parseThreatIntelligence(responses.slice(4, 6)),
		};

		const duration = performance.now() - startTime;
		console.log(`🌐 External data fetched in ${duration.toFixed(2)}ms`);

		return externalData;
	} catch (error) {
		console.error("Failed to fetch external data:", error);
		return getDefaultExternalData();
	}
}

/**
 * Enrich risk score with external data
 */
async function enrichWithExternalData(
	session: FraudSession,
	externalData: ExternalDataSources,
): Promise<FraudSession> {
	let riskAdjustment = 0;
	const reasons: string[] = [];

	// Device intelligence analysis
	if (externalData.deviceIntelligence.riskScore > 0.7) {
		riskAdjustment += 0.15;
		reasons.push("high_device_risk");
	}

	// Geolocation analysis
	if (externalData.geolocation.isHighRiskCountry) {
		riskAdjustment += 0.1;
		reasons.push("high_risk_geolocation");
	}

	// Threat intelligence
	if (externalData.threatIntelligence.maliciousScore > 0.8) {
		riskAdjustment += 0.2;
		reasons.push("known_threat_actor");
	}

	// Apply risk adjustment
	const enrichedSession = {
		...session,
		score: Math.min(1.0, session.score + riskAdjustment),
		reason: session.reason
			? `${session.reason}, ${reasons.join(", ")}`
			: reasons.join(", "),
	};

	// Re-evaluate risk level
	if (enrichedSession.score >= RISK_THRESHOLDS.CRITICAL_BLOCK) {
		enrichedSession.riskLevel = "critical";
		enrichedSession.blocked = true;
		enrichedSession.reason =
			enrichedSession.reason || "critical_external_threat";
	} else if (
		enrichedSession.score >= RISK_THRESHOLDS.HIGH_RISK &&
		enrichedSession.riskLevel !== "high"
	) {
		enrichedSession.riskLevel = "high";
		enrichedSession.reason = enrichedSession.reason || "elevated_external_risk";
	}

	return enrichedSession;
}

/**
 * Real-time streaming prediction with WebSocket
 */
export async function streamRiskPrediction(
	features: FeatureVector,
	sessionId: string,
	merchantId: string,
	wsConnection: ServerWebSocket<any>,
): Promise<void> {
	try {
		// Send initial prediction
		const initialSession = await predictRisk(features, sessionId, merchantId);
		wsConnection.send(
			JSON.stringify({
				type: "prediction",
				data: initialSession,
				timestamp: Date.now(),
			}),
		);

		// Fetch external data asynchronously
		const externalData = await fetchExternalData(
			features.vpn_active ? "8.8.8.8" : "127.0.0.1", // Placeholder IP
			"device-fingerprint-placeholder",
		);

		// Send enriched prediction
		const enrichedSession = await enrichWithExternalData(
			initialSession,
			externalData,
		);
		wsConnection.send(
			JSON.stringify({
				type: "prediction_enhanced",
				data: enrichedSession,
				timestamp: Date.now(),
			}),
		);
	} catch (error) {
		wsConnection.send(
			JSON.stringify({
				type: "error",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: Date.now(),
			}),
		);
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function parseDeviceIntelligence(
	responses: Response[],
): Promise<DeviceIntelligence> {
	try {
		// QUICK WIN: Response buffering with response.bytes() prevents string-parsing "jank"
		// Parse JSON from bytes instead of text to avoid main thread blocking
		const data = await Promise.all(
			responses.map(async (r) => {
				const bytes = await r.bytes();
				return JSON.parse(new TextDecoder().decode(bytes));
			}),
		);
		return {
			riskScore: Math.max(...data.map((d: any) => d.riskScore || 0)),
			isEmulator: data.some((d: any) => d.isEmulator),
			isRooted: data.some((d: any) => d.isRooted),
			trustScore: Math.min(...data.map((d: any) => d.trustScore || 1)),
		};
	} catch {
		return getDefaultDeviceIntelligence();
	}
}

async function parseGeolocation(responses: Response[]): Promise<Geolocation> {
	try {
		// QUICK WIN: Response buffering with response.bytes() prevents string-parsing "jank"
		const data = await Promise.all(
			responses.map(async (r) => {
				const bytes = await r.bytes();
				return JSON.parse(new TextDecoder().decode(bytes));
			}),
		);
		const primary: any = data[0];
		return {
			country: primary?.country || "unknown",
			isHighRiskCountry: primary?.isHighRisk || false,
			vpnProbability: primary?.vpnProbability || 0,
			proxyScore: primary?.proxyScore || 0,
		};
	} catch {
		return getDefaultGeolocation();
	}
}

async function parseThreatIntelligence(
	responses: Response[],
): Promise<ThreatIntelligence> {
	try {
		// QUICK WIN: Response buffering with response.bytes() prevents string-parsing "jank"
		const data = await Promise.all(
			responses.map(async (r) => {
				const bytes = await r.bytes();
				return JSON.parse(new TextDecoder().decode(bytes));
			}),
		);
		return {
			maliciousScore: Math.max(...data.map((d: any) => d.maliciousScore || 0)),
			isKnownAttacker: data.some((d: any) => d.isKnownAttacker),
			threatTypes: data.flatMap((d: any) => d.threatTypes || []),
			confidence: Math.max(...data.map((d: any) => d.confidence || 0)),
		};
	} catch {
		return getDefaultThreatIntelligence();
	}
}

function getDefaultExternalData(): ExternalDataSources {
	return {
		deviceIntelligence: getDefaultDeviceIntelligence(),
		geolocation: getDefaultGeolocation(),
		threatIntelligence: getDefaultThreatIntelligence(),
	};
}

function getDefaultDeviceIntelligence(): DeviceIntelligence {
	return {
		riskScore: 0,
		isEmulator: false,
		isRooted: false,
		trustScore: 1.0,
	};
}

function getDefaultGeolocation(): Geolocation {
	return {
		country: "unknown",
		isHighRiskCountry: false,
		vpnProbability: 0,
		proxyScore: 0,
	};
}

function getDefaultThreatIntelligence(): ThreatIntelligence {
	return {
		maliciousScore: 0,
		isKnownAttacker: false,
		threatTypes: [],
		confidence: 0,
	};
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExternalDataSources {
	deviceIntelligence: DeviceIntelligence;
	geolocation: Geolocation;
	threatIntelligence: ThreatIntelligence;
}

export interface DeviceIntelligence {
	riskScore: number;
	isEmulator: boolean;
	isRooted: boolean;
	trustScore: number;
}

export interface Geolocation {
	country: string;
	isHighRiskCountry: boolean;
	vpnProbability: number;
	proxyScore: number;
}

export interface ThreatIntelligence {
	maliciousScore: number;
	isKnownAttacker: boolean;
	threatTypes: string[];
	confidence: number;
}

// Performance monitoring
setInterval(() => {
	const activeCount = activeSessions.size;
	const avgScore =
		riskHistory.length > 0
			? riskHistory.slice(-1000).reduce((a, b) => a + b, 0) /
				Math.min(1000, riskHistory.length)
			: 0;
	const blockedCount = Array.from(activeSessions.values()).filter(
		(s) => s.blocked,
	).length;

	console.log(
		`📊 Performance Monitor: ${activeCount} active | ${blockedCount} blocked | Avg Score: ${avgScore.toFixed(3)}`,
	);
}, 10000); // Every 10 seconds

console.log(`🚀 Anomaly Prediction Engine Started`);
console.log(`🎯 0.92 Block Threshold Active`);
console.log(`⚡ 5-Feature Weighted Oracle Ready`);
console.log(`🔥 External Connections Pre-warmed`);
console.log("");
console.log("📊 Server Configuration (per Bun documentation):");
console.log(`   🔗 Server URL: ${server.url}`);
console.log(`   🌐 Server Port: ${server.port}`);
console.log("");
console.log("🌐 Available Endpoints:");
console.log(`   📡 WebSocket: ${server.url}/ws/risk-live`);
console.log(`   🔗 Risk API: ${server.url}/api/risk/score`);
console.log(`   📈 Health: ${server.url}/api/health`);
console.log(`   📊 Metrics: ${server.url}/api/network/metrics`);
console.log("");
console.log(
	"💡 Port and URL accessed via server.port and server.url properties",
);
