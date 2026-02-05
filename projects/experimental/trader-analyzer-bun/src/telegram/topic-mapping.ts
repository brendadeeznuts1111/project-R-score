/**
 * @fileoverview Topic ID Mapping
 * @description Maps logical topic IDs to actual Telegram thread IDs
 * @module telegram/topic-mapping
 */

/**
 * Topic ID Mapping
 * Maps logical topic names/IDs to actual Telegram thread IDs
 *
 * After running `golden-supergroup setup`, update this mapping with the actual thread IDs
 * returned by Telegram when topics are created.
 */
export const TOPIC_MAPPING = {
	// Logical ID -> Telegram Thread ID
	general: 89,
	"live-alerts": 91,
	arbitrage: 93,
	analytics: 95,
	"system-status": 97,
	changelog: 99,
	"ci-cd-rss": 101,

	// Also support numeric logical IDs
	1: 89, // General
	2: 91, // Live Alerts
	3: 93, // Arbitrage Opportunities
	4: 95, // Analytics & Stats
	5: 97, // System Status
	6: 99, // Changelog
	7: 101, // CI/CD & RSS Feed
} as const;

/**
 * Get Telegram thread ID from logical identifier
 */
export function getThreadId(identifier: string | number): number | undefined {
	if (typeof identifier === "number") {
		return TOPIC_MAPPING[identifier as keyof typeof TOPIC_MAPPING] as
			| number
			| undefined;
	}
	return TOPIC_MAPPING[
		identifier.toLowerCase() as keyof typeof TOPIC_MAPPING
	] as number | undefined;
}

/**
 * Get all topic mappings
 */
export function getAllMappings(): Record<string, number> {
	return {
		General: TOPIC_MAPPING.general,
		"Live Alerts": TOPIC_MAPPING["live-alerts"],
		"Arbitrage Opportunities": TOPIC_MAPPING.arbitrage,
		"Analytics & Stats": TOPIC_MAPPING.analytics,
		"System Status": TOPIC_MAPPING["system-status"],
		Changelog: TOPIC_MAPPING.changelog,
		"CI/CD & RSS Feed": TOPIC_MAPPING["ci-cd-rss"],
	};
}

/**
 * Topic names for reference
 */
export const TOPIC_NAMES = {
	89: "General",
	91: "Live Alerts",
	93: "Arbitrage Opportunities",
	95: "Analytics & Stats",
	97: "System Status",
	99: "Changelog",
	101: "CI/CD & RSS Feed",
} as const;
