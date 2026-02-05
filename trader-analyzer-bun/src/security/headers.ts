/**
 * @fileoverview Security Headers Analyzer & Optimizer
 * @module security/headers
 *
 * Analyzes HTTP security headers and generates optimal configurations
 */

import type {
	CSPAnalysis,
	CSPIssue,
	HeaderAnalysis,
	HeadersConfig,
	HeadersReport,
	SecurityHeader,
	SeverityLevel,
} from "./types";

// Security header configurations and best practices
const HEADER_CONFIGS: Record<
	SecurityHeader,
	{
		importance: "critical" | "high" | "medium" | "low";
		description: string;
		bestPractice: string;
		weight: number;
	}
> = {
	"Strict-Transport-Security": {
		importance: "critical",
		description: "Enforces HTTPS connections",
		bestPractice: "max-age=31536000; includeSubDomains; preload",
		weight: 20,
	},
	"Content-Security-Policy": {
		importance: "critical",
		description: "Prevents XSS and data injection attacks",
		bestPractice:
			"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
		weight: 25,
	},
	"X-Content-Type-Options": {
		importance: "high",
		description: "Prevents MIME type sniffing",
		bestPractice: "nosniff",
		weight: 10,
	},
	"X-Frame-Options": {
		importance: "high",
		description: "Prevents clickjacking attacks",
		bestPractice: "DENY",
		weight: 10,
	},
	"X-XSS-Protection": {
		importance: "medium",
		description: "Legacy XSS protection (deprecated but still useful)",
		bestPractice: "1; mode=block",
		weight: 5,
	},
	"Referrer-Policy": {
		importance: "medium",
		description: "Controls referrer information sent with requests",
		bestPractice: "strict-origin-when-cross-origin",
		weight: 8,
	},
	"Permissions-Policy": {
		importance: "medium",
		description: "Controls browser feature permissions",
		bestPractice:
			"accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
		weight: 8,
	},
	"Cross-Origin-Opener-Policy": {
		importance: "medium",
		description: "Isolates browsing context",
		bestPractice: "same-origin",
		weight: 5,
	},
	"Cross-Origin-Embedder-Policy": {
		importance: "medium",
		description: "Prevents loading cross-origin resources without permission",
		bestPractice: "require-corp",
		weight: 4,
	},
	"Cross-Origin-Resource-Policy": {
		importance: "medium",
		description: "Controls cross-origin resource sharing",
		bestPractice: "same-origin",
		weight: 4,
	},
	"Cache-Control": {
		importance: "low",
		description: "Controls caching behavior",
		bestPractice: "no-store, max-age=0",
		weight: 3,
	},
	Pragma: {
		importance: "low",
		description: "Legacy cache control",
		bestPractice: "no-cache",
		weight: 1,
	},
	Expires: {
		importance: "low",
		description: "Legacy expiration control",
		bestPractice: "0",
		weight: 1,
	},
};

const ALL_HEADERS = Object.keys(HEADER_CONFIGS) as SecurityHeader[];

/**
 * Security Headers Analyzer
 */
export class HeadersAnalyzer {
	private config: HeadersConfig;

	constructor(config: HeadersConfig) {
		this.config = config;
	}

	/**
	 * Analyze security headers for a URL
	 */
	async analyze(): Promise<HeadersReport> {
		console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔐 Security Headers Analyzer                             ║
║  URL: ${this.config.url.slice(0, 48).padEnd(48)}║
╚═══════════════════════════════════════════════════════════╝
    `);

		const response = await fetch(this.config.url, {
			method: "GET",
			signal: AbortSignal.timeout(10000),
		});

		const headers: HeaderAnalysis[] = [];
		const missing: SecurityHeader[] = [];
		let totalScore = 0;
		let maxScore = 0;

		for (const header of ALL_HEADERS) {
			const config = HEADER_CONFIGS[header];
			maxScore += config.weight;

			const value = response.headers.get(header);
			const analysis = this.analyzeHeader(header, value);

			headers.push(analysis);

			if (!analysis.present) {
				missing.push(header);
			} else {
				// Calculate score based on grade
				const gradeMultiplier =
					analysis.grade === "A"
						? 1.0
						: analysis.grade === "B"
							? 0.8
							: analysis.grade === "C"
								? 0.6
								: analysis.grade === "D"
									? 0.4
									: 0.2;
				totalScore += config.weight * gradeMultiplier;
			}
		}

		const score = Math.round((totalScore / maxScore) * 100);
		const overallGrade = this.scoreToGrade(score);

		// Analyze CSP if present and requested
		let cspAnalysis: CSPAnalysis | undefined;
		const cspHeader = response.headers.get("Content-Security-Policy");
		if (cspHeader || this.config.generateCsp) {
			cspAnalysis = this.analyzeCSP(cspHeader);
		}

		const recommendations = this.generateRecommendations(headers, missing);

		const report: HeadersReport = {
			url: this.config.url,
			timestamp: Date.now(),
			overallGrade,
			score,
			headers,
			missing,
			recommendations,
			cspAnalysis,
		};

		this.printReport(report);

		return report;
	}

	/**
	 * Analyze individual header
	 */
	private analyzeHeader(
		header: SecurityHeader,
		value: string | null,
	): HeaderAnalysis {
		const config = HEADER_CONFIGS[header];

		if (!value) {
			return {
				header,
				present: false,
				grade: "F",
				recommendation: `Add the ${header} header`,
				suggestedValue: config.bestPractice,
			};
		}

		// Grade based on value quality
		const grade = this.gradeHeaderValue(header, value);

		const analysis: HeaderAnalysis = {
			header,
			present: true,
			value,
			grade,
		};

		if (grade !== "A") {
			analysis.recommendation = this.getHeaderRecommendation(
				header,
				value,
				grade,
			);
			analysis.suggestedValue = config.bestPractice;
		}

		return analysis;
	}

	/**
	 * Grade a header value
	 */
	private gradeHeaderValue(
		header: SecurityHeader,
		value: string,
	): "A" | "B" | "C" | "D" | "F" {
		const valueLower = value.toLowerCase();

		switch (header) {
			case "Strict-Transport-Security":
				if (
					valueLower.includes("preload") &&
					valueLower.includes("includesubdomains")
				)
					return "A";
				if (valueLower.includes("includesubdomains")) return "B";
				if (/max-age=\d{7,}/.test(value)) return "C"; // At least 1 year
				return "D";

			case "Content-Security-Policy":
				if (
					valueLower.includes("'unsafe-inline'") ||
					valueLower.includes("'unsafe-eval'")
				)
					return "C";
				if (valueLower.includes("default-src")) return "B";
				return "A";

			case "X-Content-Type-Options":
				return valueLower === "nosniff" ? "A" : "D";

			case "X-Frame-Options":
				if (valueLower === "deny") return "A";
				if (valueLower === "sameorigin") return "B";
				return "D";

			case "X-XSS-Protection":
				if (valueLower === "1; mode=block") return "A";
				if (valueLower === "1") return "B";
				if (valueLower === "0") return "C"; // Disabled is actually OK for modern browsers
				return "D";

			case "Referrer-Policy":
				if (
					valueLower === "no-referrer" ||
					valueLower === "strict-origin-when-cross-origin"
				)
					return "A";
				if (valueLower === "same-origin" || valueLower === "origin") return "B";
				if (valueLower === "no-referrer-when-downgrade") return "C";
				return "D";

			case "Permissions-Policy":
				// Check if restrictive
				if (value.includes("=()")) return "A";
				if (value.includes("=self")) return "B";
				return "C";

			case "Cross-Origin-Opener-Policy":
				if (valueLower === "same-origin") return "A";
				if (valueLower === "same-origin-allow-popups") return "B";
				return "C";

			case "Cross-Origin-Embedder-Policy":
				if (valueLower === "require-corp") return "A";
				if (valueLower === "credentialless") return "B";
				return "C";

			case "Cross-Origin-Resource-Policy":
				if (valueLower === "same-origin") return "A";
				if (valueLower === "same-site") return "B";
				return "C";

			case "Cache-Control":
				if (valueLower.includes("no-store")) return "A";
				if (valueLower.includes("no-cache")) return "B";
				return "C";

			default:
				return "B";
		}
	}

	/**
	 * Get recommendation for a header
	 */
	private getHeaderRecommendation(
		header: SecurityHeader,
		value: string,
		grade: string,
	): string {
		const config = HEADER_CONFIGS[header];

		switch (header) {
			case "Strict-Transport-Security":
				if (!value.includes("preload"))
					return "Add preload directive for HSTS preload list";
				if (!value.includes("includeSubDomains"))
					return "Add includeSubDomains to protect all subdomains";
				return "Increase max-age to at least 1 year (31536000)";

			case "Content-Security-Policy":
				if (value.includes("'unsafe-inline'"))
					return "Remove 'unsafe-inline' and use nonce or hash";
				if (value.includes("'unsafe-eval'"))
					return "Remove 'unsafe-eval' - refactor code to avoid eval()";
				return "Review and tighten CSP directives";

			case "X-Frame-Options":
				return "Use DENY to prevent all framing, or SAMEORIGIN if framing is needed";

			default:
				return `Consider using: ${config.bestPractice}`;
		}
	}

	/**
	 * Analyze Content-Security-Policy
	 */
	private analyzeCSP(cspHeader: string | null): CSPAnalysis {
		const issues: CSPIssue[] = [];
		const suggestions: string[] = [];
		const directives: Record<string, string[]> = {};

		if (!cspHeader) {
			return {
				valid: false,
				directives: {},
				issues: [
					{
						severity: "high",
						directive: "CSP",
						issue: "No Content-Security-Policy header present",
						recommendation:
							"Implement a CSP to prevent XSS and data injection attacks",
					},
				],
				suggestions: [
					"Start with a restrictive policy and gradually relax as needed",
				],
				generatedPolicy: this.generateCSP(),
			};
		}

		// Parse CSP
		const parts = cspHeader.split(";").map((p) => p.trim());
		for (const part of parts) {
			const [directive, ...values] = part.split(/\s+/);
			if (directive) {
				directives[directive] = values;
			}
		}

		// Check for dangerous directives
		if (cspHeader.includes("'unsafe-inline'")) {
			issues.push({
				severity: "high",
				directive: "script-src",
				issue:
					"'unsafe-inline' allows inline scripts, defeating XSS protection",
				recommendation: "Use nonces or hashes instead of 'unsafe-inline'",
			});
		}

		if (cspHeader.includes("'unsafe-eval'")) {
			issues.push({
				severity: "high",
				directive: "script-src",
				issue: "'unsafe-eval' allows eval(), a common XSS vector",
				recommendation: "Refactor code to avoid eval() and remove unsafe-eval",
			});
		}

		if (!directives["default-src"]) {
			issues.push({
				severity: "medium",
				directive: "default-src",
				issue: "Missing default-src fallback directive",
				recommendation: "Add default-src 'self' as a baseline",
			});
		}

		if (cspHeader.includes("*")) {
			issues.push({
				severity: "medium",
				directive: "various",
				issue: "Wildcard (*) allows loading from any source",
				recommendation: "Replace wildcards with specific domains",
			});
		}

		if (!directives["frame-ancestors"]) {
			issues.push({
				severity: "low",
				directive: "frame-ancestors",
				issue: "Missing frame-ancestors (clickjacking protection)",
				recommendation: "Add frame-ancestors 'none' or 'self'",
			});
		}

		// Generate suggestions
		if (issues.length > 0) {
			suggestions.push(
				"Consider using CSP reporting to identify violations without breaking functionality",
			);
			suggestions.push("Test CSP changes in report-only mode first");
		}

		return {
			valid: issues.filter((i) => i.severity === "high").length === 0,
			directives,
			issues,
			suggestions,
			generatedPolicy: this.config.generateCsp ? this.generateCSP() : undefined,
		};
	}

	/**
	 * Generate a secure CSP
	 */
	private generateCSP(): string {
		const directives = [
			"default-src 'self'",
			"script-src 'self'",
			"style-src 'self'",
			"img-src 'self' data: https:",
			"font-src 'self'",
			"connect-src 'self'",
			"media-src 'self'",
			"object-src 'none'",
			"frame-src 'none'",
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"upgrade-insecure-requests",
		];

		return directives.join("; ");
	}

	/**
	 * Generate overall recommendations
	 */
	private generateRecommendations(
		headers: HeaderAnalysis[],
		missing: SecurityHeader[],
	): string[] {
		const recommendations: string[] = [];

		// Priority 1: Critical missing headers
		const criticalMissing = missing.filter(
			(h) => HEADER_CONFIGS[h].importance === "critical",
		);
		if (criticalMissing.length > 0) {
			recommendations.push(
				`CRITICAL: Add missing headers: ${criticalMissing.join(", ")}`,
			);
		}

		// Priority 2: Poorly configured headers
		const poorHeaders = headers.filter(
			(h) => h.present && (h.grade === "D" || h.grade === "F"),
		);
		if (poorHeaders.length > 0) {
			recommendations.push(
				`Fix poorly configured: ${poorHeaders.map((h) => h.header).join(", ")}`,
			);
		}

		// Priority 3: High importance missing
		const highMissing = missing.filter(
			(h) => HEADER_CONFIGS[h].importance === "high",
		);
		if (highMissing.length > 0) {
			recommendations.push(`HIGH: Add headers: ${highMissing.join(", ")}`);
		}

		// General recommendations
		if (
			!headers.find(
				(h) => h.header === "Strict-Transport-Security" && h.present,
			)
		) {
			recommendations.push("Enable HTTPS and add HSTS header");
		}

		if (recommendations.length === 0) {
			recommendations.push("Security headers are well configured!");
		}

		return recommendations;
	}

	/**
	 * Convert score to letter grade
	 */
	private scoreToGrade(score: number): HeadersReport["overallGrade"] {
		if (score >= 95) return "A+";
		if (score >= 85) return "A";
		if (score >= 75) return "B";
		if (score >= 60) return "C";
		if (score >= 40) return "D";
		return "F";
	}

	/**
	 * Print report to console
	 */
	private printReport(report: HeadersReport): void {
		const gradeColor = report.overallGrade.startsWith("A")
			? "\x1b[32m"
			: report.overallGrade === "B"
				? "\x1b[33m"
				: "\x1b[31m";

		console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📊 Analysis Results                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Overall Grade: ${gradeColor}${report.overallGrade}\x1b[0m                                       ║
║  Score: ${report.score}/100                                          ║
╠═══════════════════════════════════════════════════════════╣`);

		for (const header of report.headers) {
			const status = header.present
				? `${this.gradeEmoji(header.grade)} ${header.grade}`
				: "❌ Missing";
			console.log(`║  ${header.header.padEnd(35)} ${status.padEnd(15)}║`);
		}

		console.log(
			`╠═══════════════════════════════════════════════════════════╣`,
		);
		console.log(
			`║  📝 Recommendations                                       ║`,
		);
		for (const rec of report.recommendations) {
			console.log(`║  • ${rec.slice(0, 53).padEnd(53)}║`);
		}

		console.log(
			`╚═══════════════════════════════════════════════════════════╝`,
		);
	}

	/**
	 * Get emoji for grade
	 */
	private gradeEmoji(grade: string): string {
		switch (grade) {
			case "A":
				return "🟢";
			case "B":
				return "🟡";
			case "C":
				return "🟠";
			case "D":
				return "🔴";
			default:
				return "⚫";
		}
	}

	/**
	 * Get optimized headers as key-value pairs
	 */
	getOptimizedHeaders(): Record<string, string> {
		const headers: Record<string, string> = {};
		const config = HEADER_CONFIGS;

		for (const [header, cfg] of Object.entries(config)) {
			headers[header] = cfg.bestPractice;
		}

		return headers;
	}

	/**
	 * Generate implementation code
	 */
	generateImplementation(
		format: "nginx" | "apache" | "express" | "hono" = "hono",
	): string {
		const config = HEADER_CONFIGS;

		switch (format) {
			case "nginx":
				return `
# Security Headers - nginx
add_header Strict-Transport-Security "${config["Strict-Transport-Security"].bestPractice}" always;
add_header Content-Security-Policy "${config["Content-Security-Policy"].bestPractice}" always;
add_header X-Content-Type-Options "${config["X-Content-Type-Options"].bestPractice}" always;
add_header X-Frame-Options "${config["X-Frame-Options"].bestPractice}" always;
add_header X-XSS-Protection "${config["X-XSS-Protection"].bestPractice}" always;
add_header Referrer-Policy "${config["Referrer-Policy"].bestPractice}" always;
add_header Permissions-Policy "${config["Permissions-Policy"].bestPractice}" always;
        `.trim();

			case "apache":
				return `
# Security Headers - Apache
Header always set Strict-Transport-Security "${config["Strict-Transport-Security"].bestPractice}"
Header always set Content-Security-Policy "${config["Content-Security-Policy"].bestPractice}"
Header always set X-Content-Type-Options "${config["X-Content-Type-Options"].bestPractice}"
Header always set X-Frame-Options "${config["X-Frame-Options"].bestPractice}"
Header always set X-XSS-Protection "${config["X-XSS-Protection"].bestPractice}"
Header always set Referrer-Policy "${config["Referrer-Policy"].bestPractice}"
        `.trim();

			case "express":
				return `
// Security Headers - Express middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', '${config["Strict-Transport-Security"].bestPractice}');
  res.setHeader('Content-Security-Policy', "${config["Content-Security-Policy"].bestPractice}");
  res.setHeader('X-Content-Type-Options', '${config["X-Content-Type-Options"].bestPractice}');
  res.setHeader('X-Frame-Options', '${config["X-Frame-Options"].bestPractice}');
  res.setHeader('X-XSS-Protection', '${config["X-XSS-Protection"].bestPractice}');
  res.setHeader('Referrer-Policy', '${config["Referrer-Policy"].bestPractice}');
  next();
});
        `.trim();

			case "hono":
			default:
				return `
// Security Headers - Hono middleware
import { createMiddleware } from 'hono/factory';

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header('Strict-Transport-Security', '${config["Strict-Transport-Security"].bestPractice}');
  c.header('Content-Security-Policy', "${config["Content-Security-Policy"].bestPractice}");
  c.header('X-Content-Type-Options', '${config["X-Content-Type-Options"].bestPractice}');
  c.header('X-Frame-Options', '${config["X-Frame-Options"].bestPractice}');
  c.header('X-XSS-Protection', '${config["X-XSS-Protection"].bestPractice}');
  c.header('Referrer-Policy', '${config["Referrer-Policy"].bestPractice}');
  c.header('Permissions-Policy', '${config["Permissions-Policy"].bestPractice}');
});
        `.trim();
		}
	}
}

/**
 * Create a headers analyzer
 */
export function createHeadersAnalyzer(config: HeadersConfig): HeadersAnalyzer {
	return new HeadersAnalyzer(config);
}

/**
 * Quick header check
 */
export async function checkHeaders(url: string): Promise<HeadersReport> {
	const analyzer = new HeadersAnalyzer({ url });
	return analyzer.analyze();
}

/**
 * Analyze headers (alias)
 */
export async function analyzeHeaders(url: string): Promise<HeadersReport> {
	return checkHeaders(url);
}

/**
 * Get optimized headers for a URL
 */
export async function optimizeHeaders(
	url: string,
): Promise<Record<string, string>> {
	const analyzer = new HeadersAnalyzer({ url, generateCsp: true });
	await analyzer.analyze();
	return analyzer.getOptimizedHeaders();
}

/**
 * Generate implementation code for headers
 */
export function generateImplementation(
	headers: Record<string, string>,
	platform: "nginx" | "apache" | "express" | "hono",
): string {
	switch (platform) {
		case "nginx":
			return Object.entries(headers)
				.map(([k, v]) => `add_header ${k} "${v}";`)
				.join("\n");

		case "apache":
			return Object.entries(headers)
				.map(([k, v]) => `Header always set ${k} "${v}"`)
				.join("\n");

		case "express":
			return `app.use((req, res, next) => {
${Object.entries(headers)
	.map(([k, v]) => `  res.setHeader('${k}', '${v}');`)
	.join("\n")}
  next();
});`;

		case "hono":
			return `import { createMiddleware } from 'hono/factory';

export const securityHeaders = createMiddleware(async (c, next) => {
${Object.entries(headers)
	.map(([k, v]) => `  c.header('${k}', '${v}');`)
	.join("\n")}
  await next();
});`;

		default:
			return JSON.stringify(headers, null, 2);
	}
}
