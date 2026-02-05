#!/usr/bin/env bun
/**
 * @fileoverview MCP Team Coordinator Tool
 * @description AI-assigned reviews and notifications based on team structure
 * @module mcp/tools/team-coordinator
 */

import { notifyTopic } from '@graph/telegram';
import { RSS_TEAM_CATEGORIES } from '../../utils/rss-constants';

export interface TeamCoordinatorTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: {
			prNumber: { type: 'number'; description: string };
			packageNames: { type: 'array'; items: { type: 'string' }; description: string };
			action: { type: 'string'; description: string };
		};
		required: ['action'];
	};
}

/**
 * Find team leads and maintainers for packages
 */
function findTeamForPackages(packageNames: string[]): Array<{
	teamId: string;
	teamName: string;
	teamLead: string;
	maintainers: string[];
	telegramTopic: number;
}> {
	const teams: Array<{
		teamId: string;
		teamName: string;
		teamLead: string;
		maintainers: string[];
		telegramTopic: number;
	}> = [];

	for (const [teamId, team] of Object.entries(RSS_TEAM_CATEGORIES)) {
		const relevantPackages = team.packages?.filter((pkg) =>
			packageNames.some((name) => name.includes(pkg)),
		);

		if (relevantPackages && relevantPackages.length > 0) {
			teams.push({
				teamId,
				teamName: team.name,
				teamLead: team.teamLead || '',
				maintainers: team.maintainers || [],
				telegramTopic: team.telegramTopic || 0,
			});
		}
	}

	return teams;
}

/**
 * Assign reviewers for a PR
 */
async function assignReviewers(
	prNumber: number,
	packageNames: string[],
): Promise<{
	assignedTeams: Array<{
		teamId: string;
		teamName: string;
		reviewers: string[];
		telegramTopic: number;
	}>;
	telegramNotifications: Array<{ topicId: number; message: string }>;
}> {
	const teams = findTeamForPackages(packageNames);

	const assignedTeams = teams.map((team) => ({
		teamId: team.teamId,
		teamName: team.teamName,
		reviewers: [team.teamLead, ...team.maintainers].filter(Boolean),
		telegramTopic: team.telegramTopic,
	}));

	// Generate Telegram notifications
	const telegramNotifications = assignedTeams.map((team) => {
		const reviewersList = team.reviewers.map((r) => `@${r}`).join(', ');
		const message = `🔍 **PR #${prNumber} Review Assignment**\n\n` +
			`📦 **Packages:** ${packageNames.join(', ')}\n` +
			`👥 **Team:** ${team.teamName}\n` +
			`✅ **Reviewers:** ${reviewersList}\n\n` +
			`[View PR](https://github.com/yourorg/yourrepo/pull/${prNumber})`;

		return {
			topicId: team.telegramTopic,
			message,
		};
	});

	return {
		assignedTeams,
		telegramNotifications,
	};
}

/**
 * Send review notifications
 */
async function sendReviewNotifications(
	notifications: Array<{ topicId: number; message: string }>,
): Promise<Array<{ topicId: number; success: boolean; error?: string }>> {
	const results = await Promise.all(
		notifications.map(async (notif) => {
			try {
				await notifyTopic(notif.topicId, notif.message, { silent: false });
				return { topicId: notif.topicId, success: true };
			} catch (error: any) {
				return {
					topicId: notif.topicId,
					success: false,
					error: error.message,
				};
			}
		}),
	);

	return results;
}

/**
 * Create Team Coordinator Tool
 */
export function createTeamCoordinatorTool(): TeamCoordinatorTool {
	return {
		name: 'team-coordinator-assign',
		description:
			'AI-assigned reviews and notifications. Analyzes PR changes and assigns reviewers based on team structure and package ownership.',
		inputSchema: {
			type: 'object',
			properties: {
				prNumber: {
					type: 'number',
					description: 'GitHub PR number',
				},
				packageNames: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of package names affected by PR (e.g., ["@graph/layer4"])',
				},
				action: {
					type: 'string',
					description: 'Action to perform: "assign_reviewers" or "notify_team"',
					enum: ['assign_reviewers', 'notify_team'],
				},
			},
			required: ['action'],
		},
	};
}

/**
 * Execute Team Coordinator Tool
 */
export async function executeTeamCoordinatorTool(args: {
	prNumber?: number;
	packageNames?: string[];
	action: 'assign_reviewers' | 'notify_team';
}): Promise<{
	assignedTeams?: Array<{
		teamId: string;
		teamName: string;
		reviewers: string[];
		telegramTopic: number;
	}>;
	notifications?: Array<{ topicId: number; success: boolean; error?: string }>;
	summary: string;
}> {
	const { prNumber, packageNames = [], action } = args;

	if (action === 'assign_reviewers') {
		if (!prNumber || packageNames.length === 0) {
			return {
				summary: 'Error: prNumber and packageNames required for assign_reviewers action',
			};
		}

		const assignment = await assignReviewers(prNumber, packageNames);
		const notifications = await sendReviewNotifications(assignment.telegramNotifications);

		return {
			assignedTeams: assignment.assignedTeams,
			notifications,
			summary: `Assigned ${assignment.assignedTeams.length} team(s) to review PR #${prNumber}`,
		};
	} else if (action === 'notify_team') {
		if (packageNames.length === 0) {
			return {
				summary: 'Error: packageNames required for notify_team action',
			};
		}

		const teams = findTeamForPackages(packageNames);
		const notifications = await Promise.all(
			teams.map(async (team) => {
				try {
					const message = `📢 **Team Update**\n\n` +
						`📦 **Packages:** ${packageNames.join(', ')}\n` +
						`👥 **Team:** ${team.teamName}`;

					await notifyTopic(team.telegramTopic, message, { silent: false });
					return { topicId: team.telegramTopic, success: true };
				} catch (error: any) {
					return {
						topicId: team.telegramTopic,
						success: false,
						error: error.message,
					};
				}
			}),
		);

		return {
			notifications,
			summary: `Notified ${teams.length} team(s) about package updates`,
		};
	}

	return {
		summary: `Unknown action: ${action}`,
	};
}
