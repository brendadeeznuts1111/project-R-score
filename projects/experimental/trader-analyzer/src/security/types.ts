/**
 * @fileoverview Security Testing Types
 * @module security/types
 */

// ============ Pentest Types ============

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

export type VulnerabilityCategory =
	| "injection" // SQL, NoSQL, OS command, LDAP
	| "auth" // Broken authentication
	| "xss" // Cross-site scripting
	| "csrf" // Cross-site request forgery
	| "ssrf" // Server-side request forgery
	| "idor" // Insecure direct object reference
	| "misconfig" // Security misconfiguration
	| "sensitive_data" // Sensitive data exposure
	| "xxe" // XML external entities
	| "access_control" // Broken access control
	| "components" // Vulnerable components
	| "logging" // Insufficient logging
	| "headers" // Missing security headers
	| "cors" // CORS misconfiguration
	| "ssl" // SSL/TLS issues
	| "other";

export interface Vulnerability {
	id: string;
	category: VulnerabilityCategory;
	severity: SeverityLevel;
	title: string;
	description: string;
	url: string;
	method?: string;
	parameter?: string;
	payload?: string;
	evidence?: string;
	remediation: string;
	references: string[];
	cwe?: number;
	cvss?: number;
	timestamp: number;
}

export interface PentestConfig {
	target: string;
	scope?: string[];
	excludePatterns?: string[];
	authConfig?: AuthConfig;
	depth?: "quick" | "standard" | "deep" | "crawl-all";
	checks?: VulnerabilityCategory[] | "all";
	maxRequests?: number;
	rateLimit?: number; // requests per second
	timeout?: number;
	followRedirects?: boolean;
	userAgent?: string;
	headers?: Record<string, string>;
	cookies?: Record<string, string>;
}

export interface AuthConfig {
	type: "none" | "basic" | "bearer" | "cookie" | "oauth" | "custom";
	credentials?: {
		username?: string;
		password?: string;
		token?: string;
		apiKey?: string;
	};
	loginUrl?: string;
	loginMethod?: "POST" | "GET";
	loginBody?: Record<string, string>;
	tokenHeader?: string;
	tokenPrefix?: string;
	refreshUrl?: string;
}

export interface ApiPentestConfig extends PentestConfig {
	openApiSpec?: string; // path or URL to OpenAPI/Swagger spec
	fuzz?: boolean;
	smartScan?: boolean;
	testAllMethods?: boolean;
	parameterFuzzing?: boolean;
}

export interface PentestResult {
	target: string;
	startTime: number;
	endTime: number;
	duration: number;
	requestCount: number;
	vulnerabilities: Vulnerability[];
	summary: {
		critical: number;
		high: number;
		medium: number;
		low: number;
		info: number;
		total: number;
	};
	coverage: {
		urlsTested: number;
		parametersTested: number;
		endpointsTested: number;
	};
}

// ============ Security Headers Types ============

export type SecurityHeader =
	| "Content-Security-Policy"
	| "Strict-Transport-Security"
	| "X-Content-Type-Options"
	| "X-Frame-Options"
	| "X-XSS-Protection"
	| "Referrer-Policy"
	| "Permissions-Policy"
	| "Cross-Origin-Opener-Policy"
	| "Cross-Origin-Embedder-Policy"
	| "Cross-Origin-Resource-Policy"
	| "Cache-Control"
	| "Pragma"
	| "Expires";

export interface HeaderAnalysis {
	header: SecurityHeader;
	present: boolean;
	value?: string;
	grade: "A" | "B" | "C" | "D" | "F";
	recommendation?: string;
	suggestedValue?: string;
}

export interface HeadersReport {
	url: string;
	timestamp: number;
	overallGrade: "A+" | "A" | "B" | "C" | "D" | "F";
	score: number; // 0-100
	headers: HeaderAnalysis[];
	missing: SecurityHeader[];
	recommendations: string[];
	cspAnalysis?: CSPAnalysis;
}

export interface CSPAnalysis {
	valid: boolean;
	directives: Record<string, string[]>;
	issues: CSPIssue[];
	suggestions: string[];
	generatedPolicy?: string;
}

export interface CSPIssue {
	severity: SeverityLevel;
	directive: string;
	issue: string;
	recommendation: string;
}

export interface HeadersConfig {
	url: string;
	generateCsp?: boolean;
	reportOnly?: boolean;
	autoImplement?: boolean;
	outputFormat?: "json" | "text" | "html";
}

// ============ SRI Types ============

export type SRIAlgorithm = "sha256" | "sha384" | "sha512";

export interface SRIEntry {
	file: string;
	integrity: string;
	algorithm: SRIAlgorithm;
	size: number;
	lastModified: number;
}

export interface SRIConfig {
	files: string[];
	algorithm?: SRIAlgorithm;
	outputFile?: string;
	htmlFiles?: string[];
	autoUpdate?: boolean;
	crossorigin?: "anonymous" | "use-credentials";
}

export interface SRIReport {
	timestamp: number;
	algorithm: SRIAlgorithm;
	entries: SRIEntry[];
	htmlFilesUpdated?: string[];
	errors?: string[];
}

// ============ Scanner Callbacks ============

export interface ScannerCallbacks {
	onVulnerabilityFound?: (vuln: Vulnerability) => void;
	onProgress?: (progress: {
		current: number;
		total: number;
		url: string;
	}) => void;
	onError?: (error: Error, context: string) => void;
	onComplete?: (result: PentestResult) => void;
}
