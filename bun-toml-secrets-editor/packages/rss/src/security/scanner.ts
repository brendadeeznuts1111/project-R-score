/**
 * RSS Security Scanner
 * Addresses HIGH priority security issues: SSRF protection and secret leakage
 */

// Local interface to avoid import issues
interface RssFeedConfig {
	url: string;
	[key: string]: any;
}

export class SecurityError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "SecurityError";
	}
}

export class RssSecurityScanner {
	private allowedDomains: string[];
	private blockedPatterns: RegExp[];
	private maxResponseSize: number;

	constructor(
		config: {
			allowedDomains?: string[];
			blockedPatterns?: string[];
			maxResponseSize?: number;
		} = {},
	) {
		this.allowedDomains = config.allowedDomains || [];
		this.blockedPatterns = (config.blockedPatterns || []).map(
			(pattern) => new RegExp(pattern),
		);
		this.maxResponseSize = config.maxResponseSize || 10 * 1024 * 1024; // 10MB
	}

	/**
	 * Validates URL security - prevents SSRF attacks
	 */
	validateUrl(url: string): void {
		const urlObj = new URL(url);

		// Block internal IP ranges (SSRF protection)
		if (this.isInternalIp(urlObj.hostname)) {
			throw new SecurityError(
				`Internal IP blocked: ${urlObj.hostname}`,
				"INTERNAL_IP_BLOCKED",
			);
		}

		// Check blocked patterns
		for (const pattern of this.blockedPatterns) {
			if (pattern.test(url)) {
				throw new SecurityError(
					`URL blocked by security pattern: ${pattern.source}`,
					"PATTERN_BLOCKED",
				);
			}
		}

		// Check allowed domains if specified
		if (this.allowedDomains.length > 0) {
			const domain = urlObj.hostname;
			const isAllowed = this.allowedDomains.some((allowed) => {
				if (allowed.startsWith("*.")) {
					return domain.endsWith(allowed.slice(2));
				}
				return domain === allowed;
			});

			if (!isAllowed) {
				throw new SecurityError(
					`Domain not allowed: ${domain}`,
					"DOMAIN_NOT_ALLOWED",
				);
			}
		}

		// Block dangerous protocols
		if (!["http:", "https:"].includes(urlObj.protocol)) {
			throw new SecurityError(
				`Protocol not allowed: ${urlObj.protocol}`,
				"PROTOCOL_NOT_ALLOWED",
			);
		}
	}

	/**
	 * Validates response size
	 */
	validateResponseSize(size: number): void {
		if (size > this.maxResponseSize) {
			throw new SecurityError(
				`Response size ${size} bytes exceeds maximum ${this.maxResponseSize} bytes`,
				"RESPONSE_TOO_LARGE",
			);
		}
	}

	/**
	 * Sanitizes content to prevent secret leakage in logs
	 */
	sanitizeForLogging(content: string): string {
		// Remove potential secrets
		return content
			.replace(
				/("password"|"token"|"key"|"secret"|"auth")\s*:\s*"[^"]*"/gi,
				'$1: "***"',
			)
			.replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1***")
			.replace(/(api[_-]?key[_-]?)[A-Za-z0-9]{20,}/gi, "$1***");
	}

	/**
	 * Checks if IP address is internal/private
	 */
	private isInternalIp(hostname: string): boolean {
		// IPv4 internal ranges
		const ipv4Internal = [
			/^127\./, // 127.0.0.0/8 (localhost)
			/^10\./, // 10.0.0.0/8
			/^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
			/^192\.168\./, // 192.168.0.0/16
			/^169\.254\./, // 169.254.0.0/16 (link-local)
			/^0\./, // 0.0.0.0/8
		];

		// IPv6 internal ranges
		const ipv6Internal = [
			/^::1$/, // ::1 (localhost)
			/^fe80:/, // fe80::/10 (link-local)
			/^fc00:/, // fc00::/7 (unique local)
			/^::ffff:127\./, // IPv4-mapped localhost
			/^::ffff:10\./, // IPv4-mapped 10.0.0.0/8
			/^::ffff:172\.(1[6-9]|2\d|3[01])\./, // IPv4-mapped 172.16.0.0/12
			/^::ffff:192\.168\./, // IPv4-mapped 192.168.0.0/16
		];

		return (
			ipv4Internal.some((regex) => regex.test(hostname)) ||
			ipv6Internal.some((regex) => regex.test(hostname))
		);
	}

	/**
	 * Creates a secure fetch wrapper
	 */
	async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
		// Validate URL before fetching
		this.validateUrl(url);

		// Add security headers
		const secureOptions: RequestInit = {
			...options,
			headers: {
				"User-Agent": "bun-toml-platform/1.0 (Security-Enhanced)",
				Accept: "application/rss+xml, application/xml, text/xml",
				...options.headers,
			},
		};

		// Perform fetch with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		try {
			const response = await fetch(url, {
				...secureOptions,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Validate response
			if (!response.ok) {
				throw new SecurityError(
					`HTTP ${response.status}: ${response.statusText}`,
					"HTTP_ERROR",
				);
			}

			// Check content length
			const contentLength = response.headers.get("content-length");
			if (contentLength) {
				this.validateResponseSize(parseInt(contentLength));
			}

			return response;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof SecurityError) {
				throw error;
			}

			throw new SecurityError(
				`Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FETCH_FAILED",
			);
		}
	}
}

// Default security scanner instance
export const defaultSecurityScanner = new RssSecurityScanner({
	allowedDomains: [
		"*.bbci.co.uk",
		"news.ycombinator.com",
		"feeds.nvd.nist.gov",
		"rss.cnn.com",
		"feeds.reuters.com",
	],
	blockedPatterns: [
		"file://*",
		"localhost:*",
		"127.0.0.1:*",
		"192.168.*",
		"10.*",
		"172.16.*",
		"::1",
		"fe80::*",
	],
	maxResponseSize: 10 * 1024 * 1024, // 10MB
});

/**
 * Secure RSS fetcher wrapper
 */
export async function secureRssFetch(
	url: string,
	options?: RequestInit,
): Promise<string> {
	const response = await defaultSecurityScanner.secureFetch(url, options);
	const content = await response.text();

	// Validate content size
	defaultSecurityScanner.validateResponseSize(content.length);

	return content;
}
