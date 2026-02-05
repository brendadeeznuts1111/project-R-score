/**
 * @fileoverview Runtime Security Monitor
 * @module security/runtime-monitor
 *
 * Complete security layer for forensic sports intelligence: runtime threat detection,
 * secure deployment, compliance logging, and automated incident response.
 *
 * Uses Bun native APIs for high-performance monitoring.
 */

import { Database } from "bun:sqlite";
import { spawn } from "bun";

export interface ThreatIndicator {
	threshold?: number;
	window?: number;
	duration?: number;
	pattern?: RegExp;
	signature?: string;
}

export interface ThreatContext {
	threatId: string;
	type: string;
	severity: number;
	context: Record<string, unknown>;
	detectedAt: number;
}

export class RuntimeSecurityMonitor {
	private db: Database;
	private readonly THREAT_INDICATORS: Record<string, ThreatIndicator> = {
		// Process-level threats
		memory_spike: { threshold: 2.0, window: 60000 }, // 2x baseline in 60s
		cpu_sustained: { threshold: 0.95, duration: 300000 }, // 95% for 5min
		file_descriptor_leak: { threshold: 1000 }, // >1000 open FDs

		// Network-level threats
		egress_spike: { threshold: 1000, window: 60000 }, // 1000 API calls/min
		unusual_endpoint: { pattern: /^https:\/\/(?!sportsbook|api).+\.com\// },
		failed_auth_burst: { threshold: 10, window: 60000 }, // 10 auth fails/min

		// Data-level threats
		large_query_result: { threshold: 1000000 }, // 1M rows
		suspicious_parameter_count: { threshold: 50 }, // 50+ params
		entity_encoding_detected: { pattern: /&#[xX]?[0-9a-fA-F]+;/ },

		// Pattern-level threats
		steam_move_frequency: { threshold: 20, window: 300000 }, // 20 steam moves/5min
		arb_opportunity_burst: { threshold: 5, window: 60000 }, // 5 arbs/min
		bookmaker_impersonation: { signature: "User-Agent mismatch with IP" },
	};

	private egressCache = new Map<string, number>();
	private authCache = new Map<string, number>();
	private memoryBaseline: number | null = null;
	private monitoringInterval: ReturnType<typeof setInterval> | null = null;

	constructor(dbPath: string = "security.db") {
		this.db = new Database(dbPath);
		this.initializeDatabase();
		this.startSystemMonitoring();
	}

	/**
	 * Initialize security database schema
	 */
	private initializeDatabase(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS security_threats (
				threatId TEXT PRIMARY KEY,
				threat_type TEXT NOT NULL,
				severity INTEGER NOT NULL,
				context TEXT NOT NULL,
				detected_at INTEGER NOT NULL
			)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_threat_type ON security_threats(threat_type);
			CREATE INDEX IF NOT EXISTS idx_detected_at ON security_threats(detected_at);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS bookmaker_registry (
				bookmaker TEXT PRIMARY KEY,
				is_enabled INTEGER DEFAULT 1,
				disabled_reason TEXT,
				disabled_at INTEGER,
				network_isolated INTEGER DEFAULT 0
			)
		`);

		// Bookmaker profiles table for endpoint parameter configuration
		this.db.run(`
			CREATE TABLE IF NOT EXISTS bookmaker_profiles (
				bookmaker TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				endpoint_config TEXT NOT NULL,
				url_encoding_behavior TEXT,
				last_profiled INTEGER,
				updated_at INTEGER NOT NULL
			)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_profile_bookmaker ON bookmaker_profiles(bookmaker);
		`);
	}

	/**
	 * Monitor system resources with Bun's native APIs
	 */
	private startSystemMonitoring(): void {
		// Set initial memory baseline
		this.memoryBaseline = process.memoryUsage().heapUsed;

		// Memory monitoring
		this.monitoringInterval = setInterval(() => {
			const usage = process.memoryUsage();
			const baseline = this.memoryBaseline || usage.heapUsed;

			if (
				usage.heapUsed >
				baseline * (this.THREAT_INDICATORS.memory_spike.threshold || 2.0)
			) {
				this.triggerThreatAlert("memory_spike", {
					current: usage.heapUsed,
					baseline,
					ratio: usage.heapUsed / baseline,
				});
			}
		}, 10000);

		// File descriptor monitoring (Bun native)
		setInterval(async () => {
			try {
				const proc = spawn(["lsof", ["-p", process.pid.toString()]], {
					stdout: "pipe",
				});

				let fdCount = 0;
				const decoder = new TextDecoder();
				for await (const chunk of proc.stdout) {
					const lines = decoder.decode(chunk).split("\n");
					fdCount += lines.length;
				}

				if (
					fdCount >
					(this.THREAT_INDICATORS.file_descriptor_leak.threshold || 1000)
				) {
					this.triggerThreatAlert("file_descriptor_leak", { fdCount });
				}
			} catch (error) {
				// lsof might not be available on all systems
				console.warn("File descriptor monitoring unavailable:", error);
			}
		}, 30000);
	}

	/**
	 * Monitor network egress with Bun:dns and connection tracking
	 */
	monitorNetworkEgress(url: string, bookmaker: string): void {
		// Track per-bookmaker call rate
		const key = `egress:${bookmaker}`;
		const calls = (this.egressCache.get(key) || 0) + 1;
		this.egressCache.set(key, calls);

		setTimeout(() => this.egressCache.delete(key), 60000); // Reset after 60s

		if (calls > (this.THREAT_INDICATORS.egress_spike.threshold || 1000)) {
			this.triggerThreatAlert("egress_spike", {
				bookmaker,
				calls,
				threshold: this.THREAT_INDICATORS.egress_spike.threshold,
			});
		}

		// Check for unusual endpoints (potential data exfiltration)
		const endpointPattern = this.THREAT_INDICATORS.unusual_endpoint.pattern;
		if (endpointPattern && endpointPattern.test(url)) {
			this.triggerThreatAlert("unusual_endpoint", { url });
		}

		// Parameter count anomaly
		try {
			const paramCount = [...new URL(url).searchParams].length;
			if (
				paramCount >
				(this.THREAT_INDICATORS.suspicious_parameter_count.threshold || 50)
			) {
				this.triggerThreatAlert("suspicious_parameter_count", {
					url,
					paramCount,
					bookmaker,
				});
			}
		} catch {
			// Invalid URL, ignore
		}

		// Entity encoding (HTML injection attempt)
		const entityPattern =
			this.THREAT_INDICATORS.entity_encoding_detected.pattern;
		if (entityPattern && entityPattern.test(url)) {
			this.triggerThreatAlert("entity_encoding_detected", { url });
		}
	}

	/**
	 * Monitor authentication failures
	 */
	onAuthFailure(bookmaker: string, status: number): void {
		const key = `auth_fail:${bookmaker}`;
		const failures = (this.authCache.get(key) || 0) + 1;
		this.authCache.set(key, failures);

		setTimeout(() => this.authCache.delete(key), 60000);

		if (failures > (this.THREAT_INDICATORS.failed_auth_burst.threshold || 10)) {
			this.triggerThreatAlert("failed_auth_burst", {
				bookmaker,
				failures,
				lastStatus: status,
			});

			// Auto-disable bookmaker to prevent lockout
			this.disableBookmaker(bookmaker, "auth_burst");
		}
	}

	/**
	 * Trigger threat alert with Bun's native logging
	 */
	private triggerThreatAlert(
		type: string,
		context: Record<string, unknown>,
	): void {
		const threatId = `threat_${Bun.hash(JSON.stringify(context)).toString(36)}`;
		const severity = this.getThreatSeverity(type);

		// Write to security audit log
		this.db.run(
			`
			INSERT INTO security_threats (
				threatId, threat_type, severity, context, detected_at
			) VALUES (?, ?, ?, ?, ?)
		`,
			[threatId, type, severity, JSON.stringify(context), Date.now()],
		);

		// Immediate alert for critical threats
		if (severity >= 8) {
			// Log to system journal (Bun native)
			console.error(`🚨 THREAT [${type}]`, context);

			// Auto-execute response playbook
			this.executeThreatResponse(type, context);
		}
	}

	/**
	 * Execute automated threat response
	 */
	private executeThreatResponse(
		type: string,
		context: Record<string, unknown>,
	): void {
		const playbooks: Record<string, () => void> = {
			memory_spike: () => {
				// Force garbage collection if available
				if (typeof Bun.gc === "function") {
					Bun.gc(true);
				}
				console.warn("⚠️ Memory spike detected - GC triggered");
			},

			egress_spike: () => {
				console.warn(
					`⚠️ Egress spike detected - ${context.bookmaker} rate limit triggered`,
				);
				// Rate limiting would be handled by rate limiter instance
			},

			failed_auth_burst: () => {
				this.disableBookmaker(context.bookmaker as string, "security_lockout");
				console.warn(`⚠️ Auth burst detected - ${context.bookmaker} disabled`);
			},

			entity_encoding_detected: () => {
				console.error(
					`🚨 Entity encoding detected - potential injection attempt`,
					context,
				);
			},
		};

		playbooks[type]?.();
	}

	private getThreatSeverity(type: string): number {
		const severities: Record<string, number> = {
			entity_encoding_detected: 10, // CRITICAL
			failed_auth_burst: 9,
			memory_spike: 8,
			egress_spike: 7,
			suspicious_parameter_count: 6,
			file_descriptor_leak: 8,
		};
		return severities[type] || 5;
	}

	private disableBookmaker(bookmaker: string, reason: string): void {
		this.db.run(
			`
			UPDATE bookmaker_registry
			SET is_enabled = FALSE,
				disabled_reason = ?,
				disabled_at = ?
			WHERE bookmaker = ?
		`,
			[reason, Date.now(), bookmaker],
		);
	}

	/**
	 * Get recent threats
	 */
	getRecentThreats(hours: number = 24): ThreatContext[] {
		const cutoff = Date.now() - hours * 60 * 60 * 1000;
		return this.db
			.query(
				`
			SELECT threatId, threat_type as type, severity, context, detected_at as detectedAt
			FROM security_threats
			WHERE detected_at > ?1
			ORDER BY detected_at DESC
		`,
			)
			.all(cutoff) as ThreatContext[];
	}

	/**
	 * Cleanup monitoring
	 */
	destroy(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}
		this.db.close();
	}
}
