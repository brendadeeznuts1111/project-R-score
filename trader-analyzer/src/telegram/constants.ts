/**
 * Telegram Module Constants
 * Standardized naming and configuration for Telegram integration
 */

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE NAMES
// ═══════════════════════════════════════════════════════════════

/**
 * Standard environment variable names for Telegram configuration
 */
export const TELEGRAM_ENV = {
	BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
	CHAT_ID: "TELEGRAM_CHAT_ID",
	SUPERGROUP_ID: "TELEGRAM_SUPERGROUP_ID", // Deprecated, use CHAT_ID
	LIVE_TOPIC_ID: "TELEGRAM_LIVE_TOPIC_ID",
	LOG_DIR: "TELEGRAM_LOG_DIR",
} as const;

// ═══════════════════════════════════════════════════════════════
// BUN.SECRETS KEYS
// ═══════════════════════════════════════════════════════════════

/**
 * Standard Bun.secrets keys for Telegram configuration
 */
export const TELEGRAM_SECRETS = {
	SERVICE: "nexus",
	BOT_TOKEN: "telegram.botToken",
	CHAT_ID: "telegram.chatId",
	LIVE_TOPIC_ID: "telegram.liveTopicId",
} as const;

// ═══════════════════════════════════════════════════════════════
// NAMING CONVENTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Standard naming conventions for Telegram-related code:
 *
 * Variables (camelCase):
 * - chatId: string | number
 * - threadId: number (optional)
 * - topicId: number (alias for threadId, deprecated)
 * - messageId: number
 *
 * API Parameters (snake_case):
 * - chat_id: string | number
 * - message_thread_id: number (optional)
 * - message_id: number
 *
 * Environment Variables (UPPER_SNAKE_CASE):
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 * - TELEGRAM_LIVE_TOPIC_ID
 *
 * Constants (UPPER_SNAKE_CASE):
 * - TELEGRAM_ENV.*
 * - TELEGRAM_SECRETS.*
 */

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

export const TELEGRAM_DEFAULTS = {
	LOG_DIR: "data/telegram-logs",
	API_BASE: "https://api.telegram.org/bot",
	DISCOVERY_MAX_THREAD_ID: 20,
	HISTORY_DEFAULT_LIMIT: 50,
} as const;

// ═══════════════════════════════════════════════════════════════
// COVERT STEAM ALERT CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Severity score thresholds for Covert Steam alert classification
 * Used to determine alert priority, routing, and message formatting
 *
 * Thresholds:
 * - CRITICAL: >= 9 (auto-pinned, highest priority)
 * - HIGH: >= 7 and < 9 (high priority routing)
 * - MEDIUM: >= 5 and < 7 (standard routing)
 * - LOW: < 5 (low priority routing)
 */
export const COVERT_STEAM_SEVERITY_THRESHOLDS = {
	CRITICAL: 9,
	HIGH: 7,
	MEDIUM: 5,
	LOW: 0,
} as const;

/**
 * Default Telegram topic ID for routing Covert Steam alerts
 * Maps to "Live Alerts" topic (topic ID 2 → thread ID 91)
 * Per section 9.1.1.2.2.0.0: Dynamic Topic Creation & Management
 */
export const COVERT_STEAM_DEFAULT_TOPIC_ID = 2;

/**
 * Severity level display labels for Covert Steam alerts
 * Used in Telegram message formatting to show alert priority
 */
export const COVERT_STEAM_SEVERITY_LABELS = {
	CRITICAL: "CRITICAL",
	HIGH: "HIGH",
	MEDIUM: "MEDIUM",
	LOW: "LOW",
} as const;

/**
 * Emoji mappings for Covert Steam alert severity levels
 * Per section 9.1.1.9.2.3.0: Emoji Usage Guidelines
 * Used in Telegram message headers to visually indicate alert priority
 */
export const COVERT_STEAM_SEVERITY_EMOJIS = {
	CRITICAL: "🚨", // Critical alerts (severity >= 9)
	HIGH: "⚠️", // High severity alerts (severity 7-8)
	MEDIUM: "📈", // Market move alerts (severity 5-6)
	LOW: "📊", // General alerts (severity < 5)
} as const;

/**
 * Message formatting constants for Covert Steam Telegram alerts
 * Used in formatCovertSteamAlert() function for consistent message structure
 */
export const COVERT_STEAM_ALERT_MESSAGE_CONSTANTS = {
	/**
	 * Text displayed for deep-link anchor in Telegram messages
	 * Per RFC 001 Section 5.2: Link Text Standards
	 */
	DEEP_LINK_ANCHOR_TEXT: "View Details on Dashboard",

	/**
	 * Suffix appended to severity level in alert header
	 * Example: "🚨 CRITICAL Covert Steam Alert!"
	 */
	ALERT_HEADER_SUFFIX: "Covert Steam Alert!",

	/**
	 * Maximum value for severity score scale (displayed as "X/10")
	 */
	SEVERITY_SCALE_MAXIMUM: 10,
} as const;

// ═══════════════════════════════════════════════════════════════
// GOLDEN SUPERGROUP CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Golden Supergroup Configuration Template
 *
 * This represents the ideal/standard configuration for a Telegram supergroup
 * used for trading signals, arbitrage alerts, and team communication.
 */
export interface GoldenSupergroupConfig {
	// Basic Info
	name: string;
	description: string;
	chatId: string;

	// Bot Configuration
	botToken: string;
	botPermissions: {
		canSendMessages: boolean;
		canPinMessages: boolean;
		canManageTopics: boolean;
		canDeleteMessages: boolean;
		canRestrictMembers: boolean;
	};

	// Topic Structure
	topics: Array<{
		threadId: number;
		name: string;
		description: string;
		iconColor?: number; // 0-5
		iconEmoji?: string;
		category: "live" | "alerts" | "analytics" | "general" | "archive";
		autoPin: boolean;
		rateLimit?: {
			messagesPerMinute: number;
		};
	}>;

	// Logging
	logging: {
		enabled: boolean;
		directory: string;
		retentionDays: number;
	};

	// WebSocket
	websocket: {
		enabled: boolean;
		port?: number;
		path: string;
	};

	// Rate Limiting
	rateLimits: {
		messagesPerSecond: number;
		messagesPerMinute: number;
		messagesPerHour: number;
	};
}

/**
 * Default Golden Supergroup Configuration
 */
export const GOLDEN_SUPERGROUP_CONFIG: GoldenSupergroupConfig = {
	name: "NEXUS Trading Intelligence",
	description: "Golden supergroup configuration for NEXUS trading platform",
	chatId: "", // Set via environment
	botToken: "", // Set via environment

	botPermissions: {
		canSendMessages: true,
		canPinMessages: true,
		canManageTopics: true,
		canDeleteMessages: true,
		canRestrictMembers: false,
	},

	topics: [
		{
			threadId: 1,
			name: "General",
			description: "General discussion and announcements",
			iconColor: 0,
			category: "general",
			autoPin: false,
		},
		{
			threadId: 2,
			name: "Live Alerts",
			description: "Real-time trading alerts and signals",
			iconColor: 1,
			category: "live",
			autoPin: true,
			rateLimit: {
				messagesPerMinute: 10,
			},
		},
		{
			threadId: 3,
			name: "Arbitrage Opportunities",
			description: "Cross-market arbitrage opportunities",
			iconColor: 2,
			category: "alerts",
			autoPin: true,
		},
		{
			threadId: 4,
			name: "Analytics & Stats",
			description: "Trading statistics and performance metrics",
			iconColor: 3,
			category: "analytics",
			autoPin: false,
		},
		{
			threadId: 5,
			name: "System Status",
			description: "Bot status, health checks, and system updates",
			iconColor: 4,
			category: "general",
			autoPin: true,
		},
		{
			threadId: 6,
			name: "Changelog",
			description: "Git commit changelog and release notes",
			iconColor: 5,
			category: "general",
			autoPin: false,
		},
		{
			threadId: 7,
			name: "CI/CD & RSS Feed",
			description:
				"CI/CD pipeline updates, deployments, and RSS feed notifications",
			iconColor: 1,
			category: "general",
			autoPin: true,
		},
	],

	logging: {
		enabled: true,
		directory: TELEGRAM_DEFAULTS.LOG_DIR,
		retentionDays: 30,
	},

	websocket: {
		enabled: true,
		path: "/ws",
	},

	rateLimits: {
		messagesPerSecond: 1,
		messagesPerMinute: 20,
		messagesPerHour: 1000,
	},
};
