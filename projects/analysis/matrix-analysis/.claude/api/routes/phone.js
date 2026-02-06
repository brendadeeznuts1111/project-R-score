#!/usr/bin/env bun
// routes/phone.js — Phone Sanitizer API routes
// Extracted from api-server.js to reduce god-object complexity.
//
// Dependencies injected via createPhoneRouter({ phoneSanitizer, logger })
// Each handler returns Response or null (not-my-route).

/**
 * @param {{ phoneSanitizer: any, logger: any }} deps
 */
export function createPhoneRouter({ phoneSanitizer, logger }) {
	/**
	 * @param {Request} req
	 * @param {URL} url
	 * @param {Map<string, string>} cookies
	 * @param {Record<string, string>} corsHeaders
	 * @returns {Promise<Response> | Response | null}
	 */
	return async function handlePhone(req, url, cookies, corsHeaders) {
		switch (url.pathname) {
			case "/api/phone/sanitize": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const body = await req.json();
					const { phone, country, ipqsApiKey } = body;

					if (!phone) {
						return Response.json(
							{ error: "Phone number is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const result = await phoneSanitizer.sanitize(phone, {
						defaultCountry: country || "US",
						ipqsApiKey,
					});

					return Response.json(result, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone sanitize error:", error);
					return Response.json(
						{ error: "Failed to sanitize phone number", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/batch": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const body = await req.json();
					const { phones, country, ipqsApiKey } = body;

					if (!phones || !Array.isArray(phones)) {
						return Response.json(
							{ error: "Phones array is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const results = await phoneSanitizer.sanitize(phones, {
						defaultCountry: country || "US",
						ipqsApiKey,
					});

					return Response.json(results, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone batch error:", error);
					return Response.json(
						{ error: "Failed to process phone batch", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/email": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const body = await req.json();
					const { email } = body;

					if (!email) {
						return Response.json(
							{ error: "Email is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const result = await phoneSanitizer.sanitizeEmail(email);
					return Response.json(result, { headers: corsHeaders });
				} catch (error) {
					logger.error("Email sanitize error:", error);
					return Response.json(
						{ error: "Failed to sanitize email", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/stats": {
				try {
					const stats = phoneSanitizer.getCacheStats();
					return Response.json(
						{
							cache: stats,
							supportedCountries: phoneSanitizer.getSupportedCountries().length,
							timestamp: new Date().toISOString(),
						},
						{ headers: corsHeaders },
					);
				} catch (error) {
					logger.error("Phone stats error:", error);
					return Response.json(
						{ error: "Failed to get phone stats", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/analytics": {
				try {
					const analytics = phoneSanitizer.getAnalytics();
					return Response.json(analytics, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone analytics error:", error);
					return Response.json(
						{ error: "Failed to get phone analytics", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/analytics/top-countries": {
				try {
					const limit = parseInt(url.searchParams.get("limit") || "10", 10);
					const topCountries = phoneSanitizer.getTopCountries(limit);
					return Response.json(topCountries, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone top countries error:", error);
					return Response.json(
						{ error: "Failed to get top countries", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/analytics/trends": {
				try {
					const trends = phoneSanitizer.getSuccessRateTrend();
					return Response.json(trends, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone trends error:", error);
					return Response.json(
						{ error: "Failed to get phone trends", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/history": {
				try {
					const limit = parseInt(url.searchParams.get("limit") || "100", 10);
					const history = phoneSanitizer.getRecentHistory(limit);
					return Response.json(history, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone history error:", error);
					return Response.json(
						{ error: "Failed to get phone history", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/history/search": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const body = await req.json();
					const { query, limit = 50 } = body;

					if (!query) {
						return Response.json(
							{ error: "Query parameter is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const results = phoneSanitizer.searchHistory(query, limit);
					return Response.json(results, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone history search error:", error);
					return Response.json(
						{ error: "Failed to search phone history", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/rules": {
				if (req.method === "GET") {
					try {
						const rules = phoneSanitizer.getCustomRules();
						return Response.json(rules, { headers: corsHeaders });
					} catch (error) {
						logger.error("Get rules error:", error);
						return Response.json(
							{ error: "Failed to get custom rules", details: error.message },
							{ status: 500, headers: corsHeaders },
						);
					}
				} else if (req.method === "POST") {
					try {
						const rule = await req.json();
						phoneSanitizer.addCustomRule(rule);
						return Response.json({ success: true }, { headers: corsHeaders });
					} catch (error) {
						logger.error("Add rule error:", error);
						return Response.json(
							{ error: "Failed to add custom rule", details: error.message },
							{ status: 500, headers: corsHeaders },
						);
					}
				}
				return Response.json(
					{ error: "Method not allowed" },
					{ status: 405, headers: corsHeaders },
				);
			}

			case "/api/phone/rules/enable": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const { ruleId, enabled } = await req.json();
					const success = phoneSanitizer.setCustomRuleEnabled(ruleId, enabled);
					return Response.json({ success }, { headers: corsHeaders });
				} catch (error) {
					logger.error("Enable rule error:", error);
					return Response.json(
						{ error: "Failed to enable/disable rule", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/reputation": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const { phone } = await req.json();
					if (!phone) {
						return Response.json(
							{ error: "Phone number is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const reputation = await phoneSanitizer.getReputation(phone);
					return Response.json(reputation, { headers: corsHeaders });
				} catch (error) {
					logger.error("Phone reputation error:", error);
					return Response.json(
						{ error: "Failed to get phone reputation", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/sms/start": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const { phone } = await req.json();
					if (!phone) {
						return Response.json(
							{ error: "Phone number is required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const result = await phoneSanitizer.startSMSVerification(phone);
					return Response.json(result, { headers: corsHeaders });
				} catch (error) {
					logger.error("SMS start error:", error);
					return Response.json(
						{ error: "Failed to start SMS verification", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			case "/api/phone/sms/verify": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}

				try {
					const { sessionId, code } = await req.json();
					if (!sessionId || !code) {
						return Response.json(
							{ error: "Session ID and code are required" },
							{ status: 400, headers: corsHeaders },
						);
					}

					const result = await phoneSanitizer.verifySMSCode(sessionId, code);
					return Response.json(result, { headers: corsHeaders });
				} catch (error) {
					logger.error("SMS verify error:", error);
					return Response.json(
						{ error: "Failed to verify SMS code", details: error.message },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			default:
				return null;
		}
	};
}
