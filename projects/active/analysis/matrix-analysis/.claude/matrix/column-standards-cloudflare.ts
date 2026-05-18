/**
 * Tier-1380 OMEGA: Cloudflare Column Standards (21-30)
 *
 * Cloudflare Zone telemetry block
 * Edge caching, WAF, Workers, R2, DNS, bot management
 *
 * @module column-standards-cloudflare
 * @tier 1380-OMEGA
 */

export const CLOUDFLARE_COLUMNS = {
	21: {
		name: "cf-zone-id",
		type: "string",
		owner: "platform",
		color: "🟣",
		description: "Cloudflare Zone UUID",
		format: "32-char hex",
		example: "7a470541a704caaf91e71efccc78fd36",
		required: true,
	},
	22: {
		name: "cf-cache-hit-ratio",
		type: "percent",
		owner: "platform",
		color: "🟣",
		description: "Cache hit rate (last 24h)",
		range: [0, 100],
		precision: 1,
		unit: "%",
		typical: 87.4,
		required: false,
	},
	23: {
		name: "cf-waf-blocked-requests",
		type: "integer",
		owner: "security",
		color: "🔴",
		description: "WAF blocks (last 24h)",
		unit: "requests",
		alert: "> 1000",
		warning: "> 500",
		profileLink: true,
		required: false,
	},
	24: {
		name: "cf-r2-objects-count",
		type: "integer",
		owner: "platform",
		color: "🟣",
		description: "Total objects in R2 bucket",
		unit: "objects",
		required: false,
	},
	25: {
		name: "cf-workers-invocations",
		type: "integer",
		owner: "platform",
		color: "🟣",
		description: "Workers invocations (last 24h)",
		unit: "invocations",
		format: "human-readable (1.2M)",
		required: false,
	},
	26: {
		name: "cf-edge-latency-p50",
		type: "ms",
		owner: "platform",
		color: "🟣",
		description: "P50 latency at edge",
		unit: "ms",
		warning: "> 50",
		critical: "> 100",
		profileLink: true,
		required: false,
	},
	27: {
		name: "cf-dns-query-volume",
		type: "integer",
		owner: "platform",
		color: "🟣",
		description: "DNS queries served (last 24h)",
		unit: "queries",
		format: "human-readable (3.8M)",
		required: false,
	},
	28: {
		name: "cf-bot-score-p10",
		type: "integer",
		owner: "security",
		color: "🔴",
		description: "10th percentile bot score",
		range: [0, 100],
		warning: "< 20",
		critical: "< 10",
		profileLink: true,
		required: false,
	},
	29: {
		name: "cf-security-level",
		type: "enum",
		owner: "security",
		color: "🔴",
		description: "Current security level",
		values: ["Essentially Off", "Low", "Medium", "High", "Under Attack"],
		default: "Medium",
		required: true,
	},
	30: {
		name: "cf-profile-link",
		type: "url",
		owner: "platform",
		color: "🟣",
		description: "Latest Cloudflare analytics profile",
		protocol: "https",
		pattern: "dash.cloudflare.com/{zone-id}/analytics/...",
		profileLink: true,
		required: false,
	},
} as const;

export type CloudflareColumnIndex = keyof typeof CLOUDFLARE_COLUMNS;
export type CloudflareColumnName =
	(typeof CLOUDFLARE_COLUMNS)[CloudflareColumnIndex]["name"];

// Ownership summary for Cloudflare zone
export const CLOUDFLARE_OWNERSHIP = {
	platform: [21, 22, 24, 25, 26, 27, 30], // 7 columns
	security: [23, 28, 29], // 3 columns
} as const;
