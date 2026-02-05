/**
 * Skills Registry + Matrix Integration for Tier-1380
 *
 * Integrates the secure credential management from Skills Registry
 * with the Bun v1.3.7 feature matrix for enhanced monitoring.
 */

import { BUN_137_COMPLETE_MATRIX, MatrixDashboard, Tier1380Profiler } from "./lib";

// Skills Registry API endpoints
const SKILLS_API_BASE = "http://localhost:3000";
const SERVICE = "bun-matrix-integration";

// Matrix entry with security metadata
export interface MatrixSecurityEntry {
	category: string;
	term: string;
	securityLevel: "critical" | "high" | "medium" | "low";
	requiresAuth: boolean;
	auditRequired: boolean;
	complianceNotes?: string;
}

// Enhanced matrix with Skills Registry security data
export class SecureMatrixMonitor {
	private dashboard: MatrixDashboard;
	private profiler: Tier1380Profiler;
	private authToken: string | null = null;

	constructor() {
		this.dashboard = new MatrixDashboard();
		this.profiler = new Tier1380Profiler();
	}

	/**
	 * Authenticate with Skills Registry
	 */
	async authenticate(credentials: {
		username: string;
		password: string;
	}): Promise<boolean> {
		try {
			const response = await fetch(`${SKILLS_API_BASE}/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(credentials),
			});

			if (response.ok) {
				const data = await response.json();
				this.authToken = data.token;
				// Store token securely using Bun.secrets
				await Bun.secrets.set({
					service: SERVICE,
					name: "auth_token",
					value: this.authToken,
				});
				return true;
			}
		} catch (error) {
			console.error("Authentication failed:", error);
		}
		return false;
	}

	/**
	 * Get security classification for matrix entries
	 */
	async getSecurityClassifications(): Promise<MatrixSecurityEntry[]> {
		if (!this.authToken) {
			// Try to retrieve from secure storage
			const token = await Bun.secrets.get({
				service: SERVICE,
				name: "auth_token",
			});
			if (token) this.authToken = token;
		}

		const classifications: MatrixSecurityEntry[] = BUN_137_COMPLETE_MATRIX.map(
			(entry) => ({
				category: entry.Category,
				term: entry.Term,
				securityLevel: this.determineSecurityLevel(entry),
				requiresAuth: this.requiresAuthentication(entry),
				auditRequired: this.requiresAudit(entry),
				complianceNotes: this.getComplianceNotes(entry),
			}),
		);

		return classifications;
	}

	/**
	 * Monitor matrix features with security context
	 */
	async monitorMatrixWithSecurity(): Promise<string> {
		const classifications = await this.getSecurityClassifications();

		// Create security-enhanced matrix view
		const secureMatrix = classifications.map((entry) => {
			const levelIcon = this.getSecurityIcon(entry.securityLevel);
			const authIcon = entry.requiresAuth ? "🔐" : "🔓";
			const auditIcon = entry.auditRequired ? "📋" : "✅";

			return {
				Category: entry.category,
				Term: `${levelIcon} ${entry.term}`,
				PerfFeature: `${authIcon} ${auditIcon} ${entry.SecurityPlatform}`,
				SecurityPlatform: entry.complianceNotes || "Standard compliance",
			};
		});

		return this.dashboard.renderMatrix(secureMatrix as any);
	}

	/**
	 * Run security audit on matrix features
	 */
	async runSecurityAudit(): Promise<void> {
		console.log("🔍 Starting Tier-1380 Security Audit...");

		const classifications = await this.getSecurityClassifications();
		const criticalEntries = classifications.filter(
			(e) => e.securityLevel === "critical",
		);
		const authRequired = classifications.filter((e) => e.requiresAuth);
		const auditRequired = classifications.filter((e) => e.auditRequired);

		console.log(`\n📊 Audit Results:`);
		console.log(`  • Critical security features: ${criticalEntries.length}`);
		console.log(`  • Features requiring authentication: ${authRequired.length}`);
		console.log(`  • Features requiring audit: ${auditRequired.length}`);

		// Log to Skills Registry for tracking
		if (this.authToken) {
			await this.logAuditResults({
				timestamp: new Date().toISOString(),
				critical: criticalEntries.length,
				authRequired: authRequired.length,
				auditRequired: auditRequired.length,
			});
		}
	}

	/**
	 * Profile matrix performance with security metrics
	 */
	async profileWithSecurityMetrics(scriptPath: string): Promise<void> {
		// Run standard profiling
		await this.profiler.captureAndStream(scriptPath);

		// Add security metrics
		const securityMetrics = {
			authLatency: await this.measureAuthLatency(),
			keychainOps: await this.measureKeychainOps(),
			secureStorage: await this.measureSecureStorage(),
		};

		console.log("🔒 Security Metrics:", securityMetrics);
	}

	// Private helper methods
	private determineSecurityLevel(entry: any): "critical" | "high" | "medium" | "low" {
		if (entry.Category === "Security" || entry.Term.includes("credentials"))
			return "critical";
		if (entry.Category === "Network" || entry.Category === "Storage") return "high";
		if (entry.Category === "Profiling" || entry.Category === "FFI") return "medium";
		return "low";
	}

	private requiresAuthentication(entry: any): boolean {
		return ["S3", "fetch", "WebSocket", "inspector"].some((term) =>
			entry.Term.toLowerCase().includes(term.toLowerCase()),
		);
	}

	private requiresAudit(entry: any): boolean {
		return ["--cpu-prof", "--heap-prof", "bun:ffi", "S3"].some((term) =>
			entry.Term.toLowerCase().includes(term.toLowerCase()),
		);
	}

	private getComplianceNotes(entry: any): string | undefined {
		if (entry.Term.includes("GB9c")) return "Col 93 compliance verified";
		if (entry.Term.includes("ZTNA")) return "Zero Trust Network Architecture";
		if (entry.Term.includes("RFC 7230")) return "HTTP compliance verified";
		return undefined;
	}

	private getSecurityIcon(level: string): string {
		const icons = {
			critical: "🚨",
			high: "⚠️",
			medium: "🔶",
			low: "🟢",
		};
		return icons[level as keyof typeof icons] || "🟢";
	}

	private async logAuditResults(results: any): Promise<void> {
		try {
			await fetch(`${SKILLS_API_BASE}/api/audit/log`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.authToken}`,
				},
				body: JSON.stringify(results),
			});
		} catch (error) {
			console.error("Failed to log audit results:", error);
		}
	}

	private async measureAuthLatency(): Promise<number> {
		const start = performance.now();
		// Simulate auth check
		await Bun.secrets.get({ service: SERVICE, name: "auth_token" });
		return performance.now() - start;
	}

	private async measureKeychainOps(): Promise<number> {
		const start = performance.now();
		await Bun.secrets.set({
			service: SERVICE,
			name: "test_op",
			value: "test_value",
		});
		await Bun.secrets.get({ service: SERVICE, name: "test_op" });
		return performance.now() - start;
	}

	private async measureSecureStorage(): Promise<number> {
		const start = performance.now();
		const testData = new Array(1000).fill(0).map(() => Math.random().toString(36));
		await Bun.secrets.set({
			service: SERVICE,
			name: "bulk_test",
			value: testData.join(","),
		});
		return performance.now() - start;
	}
}

// Export singleton instance
export const secureMatrixMonitor = new SecureMatrixMonitor();

// CLI integration
if (import.meta.main) {
	console.log("🔐 Secure Matrix Monitor CLI");
	console.log("Commands: monitor, audit, profile");

	const command = process.argv[2];

	switch (command) {
		case "monitor":
			secureMatrixMonitor.monitorMatrixWithSecurity().then(console.log);
			break;
		case "audit":
			secureMatrixMonitor.runSecurityAudit();
			break;
		case "profile":
			secureMatrixMonitor.profileWithSecurityMetrics(process.argv[3] || "test.ts");
			break;
		default:
			console.log(
				"Usage: bun skills-matrix-integration.ts [monitor|audit|profile] [script]",
			);
	}
}
