/**
 * @fileoverview Bun Security Scanner for NEXUS Platform
 * @description Custom security scanner implementing Bun's Security Scanner API
 * @module security/bun-scanner
 *
 * This scanner integrates with NEXUS security infrastructure to scan packages
 * during bun install, bun add, and other package operations.
 *
 * Features:
 * - CVE detection from NVD and other sources (using Bun.semver.satisfies())
 * - Malicious package detection
 * - License compliance checking
 * - Package integrity verification (using Bun.hash)
 * - Local threat database support (using Bun.file)
 * - Integration with RuntimeSecurityMonitor
 * - Custom threat intelligence feeds
 *
 * Useful Bun APIs:
 * - Bun.semver.satisfies() - Essential for checking if package versions match vulnerability ranges
 * - Bun.CryptoHasher - Cryptographic hashing for package integrity checks (sha256, sha512, etc.)
 * - Bun.hash - Fast 32-bit integer hashing (useful for caching, quick checks)
 * - Bun.file - Efficient file I/O for reading local threat databases
 *
 * Validation:
 * When fetching threat feeds over the network, use schema validation (e.g., Zod)
 * to ensure data integrity. Invalid responses should fail immediately rather than
 * silently returning empty advisories.
 *
 * @see {@link https://bun.com/docs/install/security-scanner-api|Bun Security Scanner API}
 * @see {@link https://bun.com/docs/api/semver|Bun.semver API}
 * @see {@link https://bun.com/docs/api/hashing|Bun.hash API}
 * @see {@link https://bun.com/docs/api/file-io|Bun.file API}
 * @see {@link https://github.com/oven-sh/security-scanner-template|Security Scanner Template}
 */

import { scannerLogger } from "../utils/logger";
import { SCANNER_CONSTANTS } from "./constants";

/**
 * Security advisory categories (for internal use)
 */
export type AdvisoryCategory =
	| "malware"
	| "backdoor"
	| "token-stealer"
	| "protestware"
	| "adware"
	| "cve"
	| "deprecated"
	| "license-violation"
	| "suspicious-activity";

/**
 * Extended security advisory (extends Bun.Security.Advisory)
 */
export interface SecurityAdvisory extends Bun.Security.Advisory {
	/**
	 * Advisory category (for internal categorization)
	 */
	category?: AdvisoryCategory;
	/**
	 * Package version (for reference)
	 */
	version?: string;
	/**
	 * Optional CVE ID if applicable
	 */
	cve?: string;
	/**
	 * Optional CVSS score (0-10)
	 */
	cvss?: number;
}

/**
 * NEXUS Security Scanner Configuration
 */
export interface NexusScannerConfig {
	/**
	 * Enable CVE scanning
	 * @default true
	 */
	enableCVE?: boolean;
	/**
	 * Enable malicious package detection
	 * @default true
	 */
	enableMalwareDetection?: boolean;
	/**
	 * Enable license compliance checking
	 * @default false
	 */
	enableLicenseCheck?: boolean;
	/**
	 * Enable package integrity verification using Bun.CryptoHasher
	 * Verifies package tarball SHA-256 hashes against known good hashes
	 * @default false
	 */
	enableIntegrityCheck?: boolean;
	/**
	 * Path to local threat database file (using Bun.file)
	 * @default "data/threat-database.json"
	 */
	localThreatDatabase?: string;
	/**
	 * Custom threat intelligence API endpoint
	 */
	threatIntelApi?: string;
	/**
	 * API key for threat intelligence service
	 */
	threatIntelApiKey?: string;
	/**
	 * Minimum CVSS score to trigger fatal advisory
	 * @default 9.0
	 */
	fatalCVSSThreshold?: number;
	/**
	 * Minimum CVSS score to trigger warning advisory
	 * @default 7.0
	 */
	warnCVSSThreshold?: number;
}

/**
 * NEXUS Security Scanner
 *
 * Implements Bun's Security Scanner API to scan packages during installation.
 * Integrates with NEXUS security infrastructure for comprehensive threat detection.
 *
 * @example
 * ```typescript
 * import { nexusSecurityScanner } from "./security/bun-scanner";
 *
 * export default nexusSecurityScanner;
 * ```
 */
export class NexusSecurityScanner {
	private config: Required<NexusScannerConfig>;
	private cveCache = new Map<string, SecurityAdvisory[]>();
	private malwareCache = new Map<string, boolean>();
	private localThreatDatabase: Record<string, any> | null = null;

	constructor(config: NexusScannerConfig = {}) {
		this.config = {
			enableCVE: config.enableCVE ?? true,
			enableMalwareDetection: config.enableMalwareDetection ?? true,
			enableLicenseCheck: config.enableLicenseCheck ?? false,
			enableIntegrityCheck: config.enableIntegrityCheck ?? false,
			localThreatDatabase:
				config.localThreatDatabase || "data/threat-database.json",
			threatIntelApi:
				config.threatIntelApi || process.env.NEXUS_THREAT_INTEL_API || "",
			threatIntelApiKey: config.threatIntelApiKey || "",
			fatalCVSSThreshold: config.fatalCVSSThreshold ?? 9.0,
			warnCVSSThreshold: config.warnCVSSThreshold ?? 7.0,
		};

		// Load local threat database if configured
		if (this.config.localThreatDatabase) {
			this.loadLocalThreatDatabase();
		}
	}

	/**
	 * Scan packages for security issues
	 *
	 * This method is called by Bun during package installation operations.
	 * It returns an array of security advisories, or an empty array if packages are safe.
	 *
	 * @param packages - Array of packages to scan
	 * @returns Array of security advisories (empty if safe)
	 *
	 * @example
	 * ```typescript
	 * const advisories = await scanner.scan({
	 *   packages: [
	 *     { name: "example-package", version: "1.0.0" }
	 *   ]
	 * });
	 *
	 * if (advisories.length > 0) {
	 *   console.warn("Security issues detected:", advisories);
	 * }
	 * ```
	 */
	async scan({
		packages,
	}: {
		packages: Bun.Security.Package[];
	}): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		try {
			// Process each package
			for (const pkg of packages) {
				const { name, version } = pkg;

				// Check cache first
				const cacheKey = `${name}@${version}`;
				const cachedAdvisories = this.cveCache.get(cacheKey);
				if (cachedAdvisories) {
					advisories.push(...cachedAdvisories);
					continue;
				}

				const packageAdvisories: Bun.Security.Advisory[] = [];

				// 1. Check for known malicious packages
				if (this.config.enableMalwareDetection) {
					const malwareAdvisories = await this.checkMalware(name, version);
					packageAdvisories.push(...malwareAdvisories);
				}

				// 2. Check for CVEs
				if (this.config.enableCVE) {
					const cveAdvisories = await this.checkCVE(name, version);
					packageAdvisories.push(...cveAdvisories);
				}

				// 3. Check license compliance
				if (this.config.enableLicenseCheck) {
					const licenseAdvisories = await this.checkLicense(name, version);
					packageAdvisories.push(...licenseAdvisories);
				}

				// 4. Check local threat database (using Bun.file)
				if (this.config.localThreatDatabase && this.localThreatDatabase) {
					const localAdvisories = await this.checkLocalThreatDatabase(
						name,
						version,
					);
					packageAdvisories.push(...localAdvisories);
				}

				// 5. Check package integrity (using Bun.CryptoHasher)
				if (this.config.enableIntegrityCheck) {
					const integrityAdvisories = await this.checkIntegrity(name, version);
					packageAdvisories.push(...integrityAdvisories);
				}

				// 6. Check custom threat intelligence
				if (this.config.threatIntelApi) {
					const threatAdvisories = await this.checkThreatIntel(name, version);
					packageAdvisories.push(...threatAdvisories);
				}

				// Cache results
				if (packageAdvisories.length > 0) {
					this.cveCache.set(cacheKey, packageAdvisories);
				}

				advisories.push(...packageAdvisories);
			}

			return advisories;
		} catch (error) {
			// If scanning fails, fail safely by blocking installation
			// This is a defensive precaution per Bun's security scanner API
			scannerLogger.error("Error scanning packages", error);
			return packages.map(
				(pkg): Bun.Security.Advisory => ({
					level: "fatal",
					package: pkg.name,
					description: `Unable to verify security of ${pkg.name}@${pkg.version}. Installation blocked as a precaution.`,
					url: `https://www.npmjs.com/package/${pkg.name}`,
				}),
			);
		}
	}

	/**
	 * Check for known malicious packages
	 */
	private async checkMalware(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		// Check cache
		const cacheKey = `${name}@${version}`;
		if (this.malwareCache.has(cacheKey)) {
			const isMalicious = this.malwareCache.get(cacheKey);
			if (isMalicious) {
				return [
					{
						level: "fatal" as const,
						package: name,
						description: `${name}@${version} is flagged as malicious in threat intelligence databases.`,
						url: `https://www.npmjs.com/package/${name}`,
					},
				];
			}
			return [];
		}

		// Known malicious packages database (expandable)
		const knownMalicious: Record<string, string[]> = {
			"malicious-package": ["*"],
			"token-stealer": ["1.0.0", "1.0.1"],
			"backdoor-package": ["*"],
		};

		// Check against known malicious packages
		if (name in knownMalicious) {
			const maliciousVersions = knownMalicious[name];
			if (
				maliciousVersions.includes("*") ||
				maliciousVersions.includes(version) ||
				this.versionMatches(name, version, maliciousVersions)
			) {
				this.malwareCache.set(cacheKey, true);
				advisories.push({
					level: "fatal" as const,
					package: name,
					description: `${name}@${version} is flagged as malicious in NEXUS threat intelligence.`,
					url: `https://www.npmjs.com/package/${name}`,
				});
			}
		}

		// Check Socket.dev API if available
		if (this.config.threatIntelApi && this.config.threatIntelApiKey) {
			try {
				const response = await fetch(
					`${this.config.threatIntelApi}/packages/${name}/versions/${version}/security`,
					{
						headers: {
							Authorization: `Bearer ${this.config.threatIntelApiKey}`,
						},
						signal: AbortSignal.timeout(5000),
					},
				);

				if (response.ok) {
					const data = await response.json();
					// TODO: Add schema validation (e.g., Zod) to ensure data integrity
					// Invalid responses should fail immediately rather than silently returning empty advisories
					if (data.malicious || data.riskScore > 0.8) {
						this.malwareCache.set(cacheKey, true);
						advisories.push({
							level: "fatal",
							package: name,
							description:
								data.description ||
								`Security risk detected in ${name}@${version}`,
							url: data.url || `https://www.npmjs.com/package/${name}`,
						});
					}
				}
			} catch (error) {
				// Fail silently - don't block on external API failures
				scannerLogger.warn("Threat intel API error", error);
			}
		}

		if (advisories.length === 0) {
			this.malwareCache.set(cacheKey, false);
		}

		return advisories;
	}

	/**
	 * Check for CVEs using Bun.semver.satisfies()
	 *
	 * Uses Bun's built-in semver implementation to check if package versions
	 * match vulnerability ranges. No external dependencies needed.
	 *
	 * @example
	 * ```typescript
	 * // Check if version is in vulnerable range
	 * if (Bun.semver.satisfies("1.0.5", ">=1.0.0 <1.2.5")) {
	 *   // Version is vulnerable
	 * }
	 * ```
	 *
	 * @see {@link https://bun.com/docs/api/semver|Bun.semver API}
	 */
	private async checkCVE(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		// Known CVEs database (expandable - integrate with NVD API)
		const knownCVEs: Record<
			string,
			Array<{
				cve: string;
				affectedVersions: string;
				cvss: number;
				description: string;
			}>
		> = {
			"vulnerable-package": [
				{
					cve: "CVE-2024-0001",
					affectedVersions: ">=1.0.0 <1.2.5",
					cvss: 9.8,
					description: "Critical remote code execution vulnerability",
				},
			],
		};

		if (name in knownCVEs) {
			for (const cve of knownCVEs[name]) {
				// Use Bun.semver.satisfies() to check if version is affected
				// This is essential for checking vulnerability ranges - no external dependencies needed
				if (Bun.semver.satisfies(version, cve.affectedVersions)) {
					const level: "fatal" | "warn" =
						cve.cvss >= this.config.fatalCVSSThreshold ? "fatal" : "warn";

					advisories.push({
						level,
						package: name,
						description: `Version ${version} is affected by ${cve.cve} (CVSS: ${cve.cvss}). ${cve.description}`,
						url: `https://nvd.nist.gov/vuln/detail/${cve.cve}`,
					});
				}
			}
		}

		// TODO: Integrate with NVD API for real-time CVE data
		// Example: https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={package}

		return advisories;
	}

	/**
	 * Check license compliance
	 */
	private async checkLicense(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		// Blocked licenses (GPL, AGPL, etc.)
		const blockedLicenses = ["GPL-3.0", "AGPL-3.0", "LGPL-3.0"];

		// TODO: Fetch actual license from npm registry
		// For now, return empty array
		// Example: const license = await fetch(`https://registry.npmjs.org/${name}/${version}`).then(r => r.json()).then(pkg => pkg.license);

		return advisories;
	}

	/**
	 * Check custom threat intelligence feed
	 */
	private async checkThreatIntel(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		if (!this.config.threatIntelApi || !this.config.threatIntelApiKey) {
			return advisories;
		}

		try {
			const response = await fetch(
				`${this.config.threatIntelApi}/packages/${name}/versions/${version}`,
				{
					headers: {
						Authorization: `Bearer ${this.config.threatIntelApiKey}`,
					},
					signal: AbortSignal.timeout(5000),
				},
			);

			if (response.ok) {
				const data = await response.json();
				// TODO: Add schema validation (e.g., Zod) to ensure data integrity
				// Example: const validatedData = ThreatFeedSchema.parse(data);
				if (data.advisories && Array.isArray(data.advisories)) {
					for (const advisory of data.advisories) {
						advisories.push({
							level: (advisory.level || "warn") as "fatal" | "warn",
							package: name,
							description:
								advisory.description ||
								advisory.title ||
								`Security issue detected in ${name}@${version}`,
							url: advisory.url,
						});
					}
				}
			}
		} catch (error) {
			// Fail silently - don't block on external API failures
			console.warn(`[NEXUS Security Scanner] Threat intel API error:`, error);
		}

		return advisories;
	}

	/**
	 * Load local threat database using Bun.file
	 *
	 * Uses Bun's efficient file I/O API to read threat intelligence from a local file.
	 * This allows offline threat detection without external API calls.
	 *
	 * @see {@link https://bun.com/docs/api/file-io|Bun.file API}
	 */
	private async loadLocalThreatDatabase(): Promise<void> {
		try {
			const file = Bun.file(this.config.localThreatDatabase);
			if (await file.exists()) {
				const content = await file.json();
				this.localThreatDatabase = content;
			}
		} catch (error) {
			scannerLogger.warn("Failed to load local threat database", error);
		}
	}

	/**
	 * Check local threat database for package threats
	 */
	private async checkLocalThreatDatabase(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		if (!this.localThreatDatabase) {
			return advisories;
		}

		// Check if package is in local threat database
		const threats = this.localThreatDatabase[name];
		if (threats && Array.isArray(threats)) {
			for (const threat of threats) {
				// Use Bun.semver.satisfies() to check version ranges
				if (threat.range && Bun.semver.satisfies(version, threat.range)) {
					const level: "fatal" | "warn" = threat.categories?.some((c: string) =>
						["malware", "backdoor", "botnet"].includes(c),
					)
						? "fatal"
						: "warn";

					advisories.push({
						level,
						package: name,
						description:
							threat.description ||
							`Security threat detected in ${name}@${version}`,
						url: threat.url || `https://www.npmjs.com/package/${name}`,
					});
				}
			}
		}

		return advisories;
	}

	/**
	 * Check package integrity using Bun.CryptoHasher
	 *
	 * Uses Bun's fast cryptographic hashing API to verify package integrity.
	 * This can detect tampered packages or verify against known good hashes.
	 *
	 * Note: Bun.hash() returns a 32-bit integer hash (fast, non-cryptographic).
	 * For package integrity verification, use Bun.CryptoHasher for cryptographic hashes.
	 *
	 * @see {@link https://bun.com/docs/api/hashing#bun-hash|Bun.hash API}
	 * @see {@link https://bun.com/docs/api/hashing#bun-cryptohasher|Bun.CryptoHasher API}
	 */
	private async checkIntegrity(
		name: string,
		version: string,
	): Promise<Bun.Security.Advisory[]> {
		const advisories: Bun.Security.Advisory[] = [];

		// Known good hashes database (expandable)
		// Format: "package-name": { "version": "sha256:hex-hash" }
		const knownGoodHashes: Record<string, Record<string, string>> = {
			// Example: "package-name": { "1.0.0": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e" }
		};

		// Check if we have a known good hash for this package version
		const expectedHash = knownGoodHashes[name]?.[version];
		if (!expectedHash) {
			// No known good hash - skip integrity check
			return advisories;
		}

		try {
			// 1. Fetch package tarball from npm registry
			const tarballUrl = `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
			const response = await fetch(tarballUrl, {
				signal: AbortSignal.timeout(10000), // 10 second timeout
			});

			if (!response.ok) {
				// Failed to fetch tarball - skip integrity check
				return advisories;
			}

			// 2. Read tarball as ArrayBuffer
			const buffer = await response.arrayBuffer();

			// 3. Compute SHA-256 hash using Bun.CryptoHasher
			// Bun.hash() returns a 32-bit integer (fast, non-cryptographic)
			// Bun.CryptoHasher provides cryptographic hashes (sha256, sha512, etc.)
			const hasher = new Bun.CryptoHasher("sha256");
			hasher.update(buffer);
			const computedHash = hasher.digest("hex");

			// 4. Compare against known good hash
			// Remove "sha256:" prefix if present in expected hash
			const normalizedExpected = expectedHash.replace(/^sha256:/i, "");

			if (computedHash.toLowerCase() !== normalizedExpected.toLowerCase()) {
				advisories.push({
					level: "fatal",
					package: name,
					description: `Package integrity check failed for ${name}@${version}. Computed hash does not match expected hash. Package may be tampered.`,
					url: `https://www.npmjs.com/package/${name}`,
				});
			}
		} catch (error) {
			// Fail silently - don't block installation on integrity check failures
			// This is a best-effort check, not a hard requirement
			scannerLogger.warn(
				`Integrity check failed for ${name}@${version}`,
				error,
			);
		}

		return advisories;
	}

	/**
	 * Check if version matches any pattern in versions array
	 *
	 * Uses Bun.semver.satisfies() for version range matching.
	 * This is essential for checking vulnerability ranges - no external dependencies needed.
	 */
	private versionMatches(
		name: string,
		version: string,
		versions: string[],
	): boolean {
		for (const pattern of versions) {
			if (pattern === "*" || pattern === version) {
				return true;
			}
			// Use Bun.semver.satisfies() for version range matching
			try {
				if (Bun.semver.satisfies(version, pattern)) {
					return true;
				}
			} catch {
				// Invalid semver pattern, skip
			}
		}
		return false;
	}
}

/**
 * Load API key from Bun.secrets (Bun 1.3+)
 *
 * Bun.secrets provides OS-native encrypted credential storage:
 * - macOS: Keychain
 * - Linux: libsecret
 * - Windows: Credential Manager
 *
 * Secrets are encrypted at rest and separate from environment variables.
 *
 * @see {@link https://bun.com/docs/runtime/bun-apis|Bun.secrets API}
 */
async function loadThreatIntelApiKey(): Promise<string> {
	// Try Bun.secrets first (Bun 1.3+)
	try {
		const { secrets } = await import("bun");
		const apiKey = await secrets.get({
			service: SCANNER_CONSTANTS.SERVICE_NAME,
			name: SCANNER_CONSTANTS.THREAT_INTEL_API_KEY_NAME,
		});
		if (apiKey) {
			return apiKey;
		}
	} catch (error) {
		// Bun.secrets not available or failed - fall back to environment variable
		scannerLogger.debug(
			"Bun.secrets not available, using environment variable",
			error,
		);
	}

	// Fall back to environment variable
	return process.env.NEXUS_THREAT_INTEL_API_KEY || "";
}

/**
 * Default NEXUS Security Scanner instance
 *
 * Enterprise Configuration:
 *
 * The scanner supports authentication through:
 * 1. Bun.secrets (Bun 1.3+) - Recommended for secure credential storage
 * 2. Environment variables - Fallback for CI/CD and older Bun versions
 *
 * Using Bun.secrets (Recommended):
 * ```typescript
 * import { secrets } from "bun";
 *
 * // Store API key securely
 * await secrets.set({
 *   service: "nexus-security-scanner",
 *   name: "threat-intel-api-key",
 *   value: "your-api-key"
 * });
 * ```
 *
 * Using Environment Variables:
 * ```bash
 * # Set in shell profile (~/.bashrc, ~/.zshrc) or CI/CD
 * export NEXUS_THREAT_INTEL_API="https://api.example.com/threat-intel"
 * export NEXUS_THREAT_INTEL_API_KEY="your-api-key"
 * ```
 *
 * Configuration Options:
 * - NEXUS_THREAT_INTEL_API: Threat intelligence API endpoint
 * - NEXUS_FATAL_CVSS_THRESHOLD: Minimum CVSS score for fatal advisories (default: 9.0)
 * - NEXUS_WARN_CVSS_THRESHOLD: Minimum CVSS score for warning advisories (default: 7.0)
 * - NEXUS_ENABLE_INTEGRITY_CHECK: Enable package integrity verification (default: false)
 * - NEXUS_LOCAL_THREAT_DATABASE: Path to local threat database file (default: data/threat-database.json)
 *
 * Configure scanner in bunfig.toml:
 * ```toml
 * [install.security]
 * scanner = "./src/security/bun-scanner.ts"
 * ```
 */
const scannerInstancePromise = (async () => {
	const apiKey = await loadThreatIntelApiKey();
	return new NexusSecurityScanner({
		enableCVE: true,
		enableMalwareDetection: true,
		enableLicenseCheck: false,
		enableIntegrityCheck: process.env.NEXUS_ENABLE_INTEGRITY_CHECK === "true",
		localThreatDatabase:
			process.env.NEXUS_LOCAL_THREAT_DATABASE ||
			SCANNER_CONSTANTS.DEFAULT_THREAT_DATABASE_PATH,
		threatIntelApi: process.env.NEXUS_THREAT_INTEL_API || "",
		threatIntelApiKey: apiKey,
		fatalCVSSThreshold: process.env.NEXUS_FATAL_CVSS_THRESHOLD
			? parseFloat(process.env.NEXUS_FATAL_CVSS_THRESHOLD)
			: SCANNER_CONSTANTS.DEFAULT_FATAL_CVSS_THRESHOLD,
		warnCVSSThreshold: process.env.NEXUS_WARN_CVSS_THRESHOLD
			? parseFloat(process.env.NEXUS_WARN_CVSS_THRESHOLD)
			: SCANNER_CONSTANTS.DEFAULT_WARN_CVSS_THRESHOLD,
	});
})();

/**
 * Bun Security Scanner implementation
 *
 * Bun will call the `scan` method during package installation operations.
 * This follows Bun's Security Scanner API specification.
 *
 * The `version` field should always be set to '1' - this is the version of
 * Bun's security scanner implementation, not your scanner's version.
 *
 * @see {@link https://github.com/oven-sh/security-scanner-template|Security Scanner Template}
 */
export const scanner: Bun.Security.Scanner = {
	version: "1", // This is the version of Bun security scanner implementation. Keep this as '1'
	async scan({ packages }) {
		const scannerInstance = await scannerInstancePromise;
		return scannerInstance.scan({ packages });
	},
};

/**
 * Default export for Bun Security Scanner API
 */
export default scanner;
