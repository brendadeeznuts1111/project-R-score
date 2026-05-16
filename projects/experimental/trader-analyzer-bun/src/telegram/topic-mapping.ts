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
	general: 12,
	"urgent-alerts": 2,
	"troublesome-accounts": 4,
	"daily-pattern-reports": 6,
	"agent-heatmap": 8,
	"player-tracking": 10,

	// Also support numeric logical IDs
	1: 12, // General Updates
	2: 2, // Urgent Alerts
	3: 4, // Troublesome Accounts / CLV Beaters
	4: 6, // Daily Pattern Reports
	5: 8, // Agent Heatmap
	6: 10, // Player Tracking
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
		"General Updates": TOPIC_MAPPING.general,
		"Urgent Alerts": TOPIC_MAPPING["urgent-alerts"],
		"Troublesome Accounts / CLV Beaters":
			TOPIC_MAPPING["troublesome-accounts"],
		"Daily Pattern Reports": TOPIC_MAPPING["daily-pattern-reports"],
		"Agent Heatmap": TOPIC_MAPPING["agent-heatmap"],
		"Player Tracking": TOPIC_MAPPING["player-tracking"],
	};
}

/**
 * Topic names for reference
 */
export const TOPIC_NAMES = {
	2: "Urgent Alerts",
	4: "Troublesome Accounts / CLV Beaters",
	6: "Daily Pattern Reports",
	8: "Agent Heatmap",
	10: "Player Tracking",
	12: "General Updates",
} as const;
