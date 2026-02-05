/**
 * @fileoverview Telegram Topic/Thread ID Management
 * @description Telegram supergroup topic management for @graph/* packages
 * @module @graph/telegram/topics
 * 
 * @see {@link ../../../../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md|Team Organization Documentation}
 */

export const TELEGRAM_SUPERGROUP_ID = -1001234567890; // Your supergroup ID

export const TELEGRAM_TOPICS = {
	// Sports Correlation Team (Alex Chen)
	'@graph/layer4': {
		topicId: 1,
		name: '🏀 @graph/layer4 Cross-Sport',
		team: 'sports-correlation',
		teamLead: 'alex.chen@yourcompany.com',
		maintainer: 'jordan.lee@yourcompany.com',
		telegramHandle: '@alexchen',
		supergroup: '#sports-correlation',
	},
	'@graph/layer3': {
		topicId: 2,
		name: '⚽ @graph/layer3 Cross-Event',
		team: 'sports-correlation',
		teamLead: 'alex.chen@yourcompany.com',
		maintainer: 'priya.patel@yourcompany.com',
		telegramHandle: '@alexchen',
		supergroup: '#sports-correlation',
	},

	// Market Analytics Team (Sarah Kumar)
	'@graph/layer2': {
		topicId: 3,
		name: '📊 @graph/layer2 Cross-Market',
		team: 'market-analytics',
		teamLead: 'sarah.kumar@yourcompany.com',
		maintainer: 'tom.wilson@yourcompany.com',
		telegramHandle: '@sarahkumar',
		supergroup: '#market-analytics',
	},
	'@graph/layer1': {
		topicId: 4,
		name: '💰 @graph/layer1 Direct Selections',
		team: 'market-analytics',
		teamLead: 'sarah.kumar@yourcompany.com',
		maintainer: 'lisa.zhang@yourcompany.com',
		telegramHandle: '@sarahkumar',
		supergroup: '#market-analytics',
	},

	// Platform & Tools Team (Mike Rodriguez)
	'@graph/algorithms': {
		topicId: 5,
		name: '🧮 @graph/algorithms Detection Core',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'david.kim@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
	},
	'@graph/storage': {
		topicId: 6,
		name: '🗄️ @graph/storage State Manager',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'emma.brown@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
	},
	'@graph/streaming': {
		topicId: 7,
		name: '📡 @graph/streaming Data Ingestion',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'emma.brown@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
	},
	'@graph/utils': {
		topicId: 8,
		name: '🔧 @graph/utils Error Wrapper',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'mike.rodriguez@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
	},

	// Benchmarking Team (Mike Rodriguez)
	'@bench/layer4': {
		topicId: 9,
		name: '🏃 @bench/layer4 Sport Benchmarks',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'ryan.gupta@yourcompany.com',
	},
	'@bench/property': {
		topicId: 10,
		name: '🔄 @bench/property Property Iteration',
		team: 'platform-tools',
		teamLead: 'mike.rodriguez@yourcompany.com',
		maintainer: 'ryan.gupta@yourcompany.com',
	},

	// RFC Discussion Topics
	'rfc-proposals': {
		topicId: 11,
		name: '📋 RFC Proposals',
		team: 'all-teams',
		description: 'RFC proposals for package changes',
	},
	'releases': {
		topicId: 12,
		name: '🚀 Releases',
		team: 'all-teams',
		description: 'Package release announcements',
	},
	'incidents': {
		topicId: 13,
		name: '🚨 Incidents',
		team: 'all-teams',
		description: 'Production incidents & hotfixes',
	},
} as const;

export type PackageName = keyof typeof TELEGRAM_TOPICS;
export type TopicInfo = typeof TELEGRAM_TOPICS[PackageName];

/**
 * Get Telegram topic ID for a package
 */
export function getTopicId(packageName: PackageName): number | undefined {
	return TELEGRAM_TOPICS[packageName]?.topicId;
}

/**
 * Get topic info for a package
 */
export function getTopicInfo(packageName: PackageName): TopicInfo | undefined {
	return TELEGRAM_TOPICS[packageName];
}

/**
 * Get all topics for a team
 */
export function getTeamTopics(team: string): Array<{ package: PackageName; topic: TopicInfo }> {
	return Object.entries(TELEGRAM_TOPICS)
		.filter(([_, info]) => info.team === team)
		.map(([pkg, info]) => ({ package: pkg as PackageName, topic: info }));
}
