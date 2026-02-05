/**
 * @fileoverview Header Manager for Bookmaker API Requests
 * @description Exchange-specific header rules and validation
 * @module orca/aliases/bookmakers/headers
 */

/**
 * Header rule configuration for an exchange
 */
export interface HeaderRule {
	exchange: string;
	headers: Record<string, string>;
	validation: {
		requiredParams: string[];
		maxAge?: number;
	};
}

/**
 * Header Manager for bookmaker APIs
 * Manages exchange-specific headers and request validation
 */
export class HeaderManager {
	private rules: Map<string, HeaderRule> = new Map();
	private validationCache = new Map<
		string,
		{ timestamp: number; valid: boolean }
	>();

	constructor() {
		this.initializeDefaultRules();
	}

	private initializeDefaultRules(): void {
		// Define exchange-specific header rules
		const defaultRules: HeaderRule[] = [
			{
				exchange: "betfair",
				headers: {
					"X-Application": process.env.BETFAIR_APP_KEY || "",
					"X-Authentication": "Bearer {token}",
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				validation: {
					requiredParams: ["marketId", "eventId"],
					maxAge: 60,
				},
			},
			{
				exchange: "pinnacle",
				headers: {
					Authorization: "Basic {apiKey}",
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				validation: {
					requiredParams: ["sportId", "leagueId"],
					maxAge: 30,
				},
			},
			{
				exchange: "draftkings",
				headers: {
					Authorization: "Bearer {token}",
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				validation: {
					requiredParams: ["sport", "league"],
					maxAge: 60,
				},
			},
		];

		defaultRules.forEach((rule) => this.addRule(rule));
	}

	/**
	 * Add or update a header rule
	 */
	addRule(rule: HeaderRule): void {
		this.rules.set(rule.exchange, rule);
	}

	/**
	 * Get headers for an exchange with parameter substitution
	 */
	getHeaders(
		exchange: string,
		params: Record<string, any> = {},
	): Record<string, string> {
		const rule = this.rules.get(exchange);
		if (!rule) {
			throw new Error(`No header rule found for exchange: ${exchange}`);
		}

		const headers = { ...rule.headers };

		// Replace template variables
		Object.keys(headers).forEach((key) => {
			const value = headers[key];
			if (typeof value === "string") {
				headers[key] = value.replace(/\{(\w+)\}/g, (match, param) => {
					return params[param] || process.env[param] || match;
				});
			}
		});

		return headers;
	}

	/**
	 * Validate request parameters for an exchange
	 */
	validateRequest(exchange: string, params: Record<string, any>): boolean {
		const cacheKey = `${exchange}:${JSON.stringify(params)}`;

		// Check cache first
		const cached = this.validationCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < 60000) {
			// 1 minute cache
			return cached.valid;
		}

		const rule = this.rules.get(exchange);
		if (!rule) {
			this.validationCache.set(cacheKey, {
				timestamp: Date.now(),
				valid: false,
			});
			return false;
		}

		// Check required parameters
		const isValid = rule.validation.requiredParams.every(
			(param) => params[param] !== undefined && params[param] !== null,
		);

		this.validationCache.set(cacheKey, {
			timestamp: Date.now(),
			valid: isValid,
		});

		// Clean old cache entries
		this.cleanValidationCache();

		return isValid;
	}

	private cleanValidationCache(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		this.validationCache.forEach((entry, key) => {
			if (now - entry.timestamp > 5 * 60 * 1000) {
				// 5 minutes
				keysToDelete.push(key);
			}
		});

		keysToDelete.forEach((key) => this.validationCache.delete(key));
	}

	/**
	 * Get all registered rules
	 */
	getAllRules(): HeaderRule[] {
		return Array.from(this.rules.values());
	}
}

// Singleton instance
let globalHeaderManager: HeaderManager | null = null;

/**
 * Get or create global header manager instance
 */
export function getHeaderManager(): HeaderManager {
	if (!globalHeaderManager) {
		globalHeaderManager = new HeaderManager();
	}
	return globalHeaderManager;
}
