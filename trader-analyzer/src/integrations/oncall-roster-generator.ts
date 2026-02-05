#!/usr/bin/env bun
/**
 * [TEAM.ONCALL.ROSTER.RG:IMPLEMENTATION] Dynamic On-Call Roster Generation
 * @fileoverview Generate and sync on-call rosters from TEAM.md
 * @description Processes structured on-call schedule data in TEAM.md and syncs with PagerDuty/internal tools
 * @module integrations/oncall-roster-generator
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ONCALL-ROSTER-GENERATOR@2.0.0;instance-id=ONCALL-ROSTER-GENERATOR-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"oncall-roster-generator";@root:"24.2.3.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-INCIDENT-RESPONSE"];@version:"2.0.0"}}]]
 * [CLASS:OncallRosterGenerator][#REF:v-2.0.0.BP.ONCALL.ROSTER.GENERATOR.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link .github/TEAM.md} - On-call schedule source
 * @see {@link src/mcp/tools/team-info.ts} - Team info query tool
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import { executeTeamInfoTool } from '../mcp/tools/team-info';

// [TEAM.ONCALL.ROSTER.SCHEMA.RG:INTERFACE] On-Call Roster Schema
export interface OncallRosterEntry {
	week: string; // e.g., "2025-W01"
	primary: string; // @username
	secondary: string; // @username
	escalation: string; // @username
	department?: string;
}

export interface OncallRoster {
	entries: OncallRosterEntry[];
	currentWeek?: OncallRosterEntry;
	nextWeek?: OncallRosterEntry;
}

// [TEAM.ONCALL.ROSTER.EXTRACTION.RG:IMPLEMENTATION] Extract on-call roster from TEAM.md
/**
 * Extract on-call roster from TEAM.md using RG markers
 */
export async function extractOncallRoster(): Promise<OncallRoster> {
	try {
		const result = await executeTeamInfoTool({ query: 'role:oncall' });
		
		if (!result.section) {
			return { entries: [] };
		}

		// Parse markdown table from section
		const entries = parseOncallTable(result.section);
		
		// Get current week
		const currentWeek = getCurrentWeek();
		const currentEntry = entries.find(e => e.week === currentWeek);
		const nextWeek = getNextWeek(currentWeek);
		const nextEntry = entries.find(e => e.week === nextWeek);

		return {
			entries,
			currentWeek: currentEntry,
			nextWeek: nextEntry,
		};
	} catch (error) {
		console.error('[TEAM.ONCALL.ROSTER.RG:ERROR] Failed to extract roster:', error);
		return { entries: [] };
	}
}

// [TEAM.ONCALL.ROSTER.PARSING.RG:IMPLEMENTATION] Parse on-call table from markdown
/**
 * Parse markdown table into OncallRosterEntry array
 */
function parseOncallTable(sectionContent: string): OncallRosterEntry[] {
	const entries: OncallRosterEntry[] = [];

	// Find table in markdown
	const tableMatch = sectionContent.match(/\|.*Week.*\|.*Primary.*\|.*Secondary.*\|.*Escalation.*\|[\s\S]*?(\|.*\|[\s\S]*?)(?=\n##|\n\n|$)/);
	if (!tableMatch) {
		return entries;
	}

	const tableContent = tableMatch[1];
	const lines = tableContent.split('\n').filter(line => line.trim().startsWith('|'));

	// Skip header row (first line after match)
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line || line.startsWith('|---')) continue;

		const cells = line.split('|').map(c => c.trim()).filter(c => c);
		if (cells.length >= 4) {
			entries.push({
				week: cells[0],
				primary: cells[1],
				secondary: cells[2],
				escalation: cells[3],
				department: cells[4] || undefined,
			});
		}
	}

	return entries;
}

// [TEAM.ONCALL.ROSTER.SYNC.RG:IMPLEMENTATION] Sync roster with PagerDuty
/**
 * Sync on-call roster with PagerDuty (or internal tool)
 */
export async function syncRosterWithPagerDuty(roster: OncallRoster): Promise<{
	success: boolean;
	message: string;
}> {
	if (!roster.currentWeek) {
		return {
			success: false,
			message: 'No current week roster entry found',
		};
	}

	// Extract PagerDuty user IDs from @usernames
	const primaryUserId = await resolvePagerDutyUser(roster.currentWeek.primary);
	const secondaryUserId = await resolvePagerDutyUser(roster.currentWeek.secondary);
	const escalationUserId = await resolvePagerDutyUser(roster.currentWeek.escalation);

	if (!primaryUserId || !secondaryUserId) {
		return {
			success: false,
			message: 'Could not resolve PagerDuty users',
		};
	}

	// Update PagerDuty schedule
	// Note: This is a placeholder - actual implementation would use PagerDuty API
	console.log('[TEAM.ONCALL.ROSTER.RG:SYNC] Syncing roster with PagerDuty:', {
		week: roster.currentWeek.week,
		primary: primaryUserId,
		secondary: secondaryUserId,
		escalation: escalationUserId,
	});

	return {
		success: true,
		message: `Roster synced for week ${roster.currentWeek.week}`,
	};
}

// [TEAM.ONCALL.ROSTER.RESOLVE.RG:IMPLEMENTATION] Resolve GitHub username to PagerDuty user
/**
 * Resolve GitHub @username to PagerDuty user ID
 * In production, this would query PagerDuty API or internal mapping
 */
async function resolvePagerDutyUser(githubUsername: string): Promise<string | null> {
	// Remove @ if present
	const username = githubUsername.replace('@', '');

	// Placeholder: In production, query PagerDuty API or internal user mapping
	// For now, return a mock ID
	return `PD-${username.toUpperCase()}`;
}

// [TEAM.ONCALL.ROSTER.UTILS.RG:IMPLEMENTATION] Utility functions
/**
 * Get current ISO week string (e.g., "2025-W01")
 */
function getCurrentWeek(): string {
	const now = new Date();
	const year = now.getFullYear();
	const week = getISOWeek(now);
	return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get next week ISO string
 */
function getNextWeek(currentWeek: string): string {
	const [year, week] = currentWeek.split('-W').map(Number);
	const nextWeek = week + 1;
	if (nextWeek > 52) {
		return `${year + 1}-W01`;
	}
	return `${year}-W${nextWeek.toString().padStart(2, '0')}`;
}

/**
 * Calculate ISO week number
 */
function getISOWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// [TEAM.ONCALL.ROSTER.CURRENT.RG:IMPLEMENTATION] Get current on-call contacts
/**
 * Get current on-call contacts for a department
 */
export async function getCurrentOncall(department?: string): Promise<{
	primary: string;
	secondary: string;
	escalation: string;
}> {
	const roster = await extractOncallRoster();
	
	if (!roster.currentWeek) {
		throw new Error('No current on-call roster found');
	}

	return {
		primary: roster.currentWeek.primary,
		secondary: roster.currentWeek.secondary,
		escalation: roster.currentWeek.escalation,
	};
}
