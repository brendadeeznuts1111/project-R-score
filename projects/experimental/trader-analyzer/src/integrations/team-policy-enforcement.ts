#!/usr/bin/env bun
/**
 * [TEAM.POLICY.ENFORCEMENT.RG:IMPLEMENTATION] Team Policy Enforcement System
 * @fileoverview Extract and enforce policies defined in TEAM.md RG markers
 * @description Transforms TEAM.md from descriptive to prescriptive by enforcing policies programmatically
 * @module integrations/team-policy-enforcement
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TEAM-POLICY-ENFORCEMENT@2.0.0;instance-id=TEAM-POLICY-ENFORCEMENT-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"team-policy-enforcement";@root:"24.1.3.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-CI-CD"];@version:"2.0.0"}}]]
 * [CLASS:TeamPolicyEnforcement][#REF:v-2.0.0.BP.TEAM.POLICY.ENFORCEMENT.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link .github/TEAM.md} - Policy definitions source
 * @see {@link src/mcp/tools/team-info.ts} - Team info query tool
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { executeTeamInfoTool } from '../mcp/tools/team-info';

// [TEAM.POLICY.SCHEMA.RG:INTERFACE] Policy Schema Definition
/**
 * Defines a policy extracted from TEAM.md
 */
export interface Policy {
	/**
	 * RG marker ID (e.g., "TEAM.POLICY.PR_REVIEW_SLA.RG")
	 */
	id: string;

	/**
	 * Policy name
	 */
	name: string;

	/**
	 * Policy description
	 */
	description: string;

	/**
	 * Policy type
	 */
	type: 'SLA' | 'Roster' | 'Requirement' | 'Threshold';

	/**
	 * Policy value (e.g., '2h', 0.8, ['Admin'])
	 */
	value: string | number | string[];

	/**
	 * Policy scope
	 */
	scope: 'global' | 'department' | 'role';

	/**
	 * Enforcement mechanism
	 */
	enforcedBy: 'CI' | 'Runtime' | 'Manual';
}

// [TEAM.POLICY.EXTRACTION.RG:IMPLEMENTATION] Extract policies from TEAM.md
/**
 * Extract all policies from TEAM.md using RG markers
 */
export async function extractPolicies(): Promise<Policy[]> {
	const teamMDPath = join(process.cwd(), '.github', 'TEAM.md');
	const content = await readFile(teamMDPath, 'utf-8');

	const policies: Policy[] = [];

	// Find all policy markers
	const policyMarkerPattern = /\[TEAM\.POLICY\.([A-Z_]+)\.RG(:[A-Z]+)?\]/g;
	let match;

	while ((match = policyMarkerPattern.exec(content)) !== null) {
		const policyId = match[1];
		const markerStart = match.index;
		
		// Extract section content (until next ## or end)
		const sectionEnd = content.indexOf('\n##', markerStart);
		const sectionContent = sectionEnd > 0 
			? content.substring(markerStart, sectionEnd)
			: content.substring(markerStart);

		// Parse policy details
		const policy = parsePolicySection(policyId, sectionContent);
		if (policy) {
			policies.push(policy);
		}
	}

	return policies;
}

// [TEAM.POLICY.PARSING.RG:IMPLEMENTATION] Parse policy section content
/**
 * Parse a policy section from TEAM.md content
 */
function parsePolicySection(policyId: string, sectionContent: string): Policy | null {
	// Extract policy name
	const nameMatch = sectionContent.match(/\*\*Name\*\*:\s*(.+)/);
	const name = nameMatch ? nameMatch[1].trim() : policyId.replace(/_/g, ' ');

	// Extract description
	const descMatch = sectionContent.match(/\*\*Description\*\*:\s*(.+)/);
	const description = descMatch ? descMatch[1].trim() : '';

	// Extract type
	const typeMatch = sectionContent.match(/\*\*Type\*\*:\s*(SLA|Roster|Requirement|Threshold)/);
	const type = (typeMatch ? typeMatch[1] : 'Requirement') as Policy['type'];

	// Extract value
	const valueMatch = sectionContent.match(/\*\*Value\*\*:\s*(.+)/);
	let value: string | number | string[] = '';
	if (valueMatch) {
		const valueStr = valueMatch[1].trim();
		// Try to parse as number
		if (!isNaN(Number(valueStr))) {
			value = Number(valueStr);
		} else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
			// Array value
			value = valueStr.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
		} else {
			value = valueStr;
		}
	}

	// Extract scope
	const scopeMatch = sectionContent.match(/\*\*Scope\*\*:\s*(global|department|role)/);
	const scope = (scopeMatch ? scopeMatch[1] : 'global') as Policy['scope'];

	// Extract enforcement
	const enforcedMatch = sectionContent.match(/\*\*Enforced By\*\*:\s*(CI|Runtime|Manual)/);
	const enforcedBy = (enforcedMatch ? enforcedMatch[1] : 'Manual') as Policy['enforcedBy'];

	return {
		id: `TEAM.POLICY.${policyId}.RG`,
		name,
		description,
		type,
		value,
		scope,
		enforcedBy,
	};
}

// [TEAM.POLICY.ENFORCE.CI.RG:IMPLEMENTATION] Enforce policy in CI/CD
/**
 * Enforce a policy during CI/CD checks
 */
export async function enforcePolicyInCI(policyId: string, context: Record<string, any>): Promise<{
	passed: boolean;
	message: string;
	policy?: Policy;
}> {
	const policies = await extractPolicies();
	const policy = policies.find(p => p.id === policyId || p.id.includes(policyId));

	if (!policy) {
		return {
			passed: true,
			message: `Policy ${policyId} not found, skipping enforcement`,
		};
	}

	// Enforce based on policy type
	switch (policy.type) {
		case 'SLA':
			return enforceSLA(policy, context);
		case 'Requirement':
			return enforceRequirement(policy, context);
		case 'Threshold':
			return enforceThreshold(policy, context);
		case 'Roster':
			return enforceRoster(policy, context);
		default:
			return {
				passed: true,
				message: `Unknown policy type: ${policy.type}`,
			};
	}
}

// [TEAM.POLICY.ENFORCE.SLA.RG:IMPLEMENTATION] Enforce SLA policy
function enforceSLA(policy: Policy, context: Record<string, any>): {
	passed: boolean;
	message: string;
	policy: Policy;
} {
	// Example: PR_REVIEW_SLA = "2h"
	const slaValue = policy.value as string;
	const reviewTime = context.reviewTime; // Time since PR creation

	if (!reviewTime) {
		return {
			passed: true,
			message: 'No review time provided',
			policy,
		};
	}

	// Parse SLA (e.g., "2h" = 2 hours)
	const slaHours = parseSLA(slaValue);
	const reviewHours = parseTimeToHours(reviewTime);

	const passed = reviewHours <= slaHours;

	return {
		passed,
		message: passed
			? `SLA met: Review completed in ${reviewHours}h (SLA: ${slaHours}h)`
			: `SLA violated: Review took ${reviewHours}h (SLA: ${slaHours}h)`,
		policy,
	};
}

// [TEAM.POLICY.ENFORCE.THRESHOLD.RG:IMPLEMENTATION] Enforce threshold policy
function enforceThreshold(policy: Policy, context: Record<string, any>): {
	passed: boolean;
	message: string;
	policy: Policy;
} {
	const threshold = policy.value as number;
	const currentValue = context.value as number;

	if (currentValue === undefined) {
		return {
			passed: true,
			message: 'No value provided for threshold check',
			policy,
		};
	}

	const passed = currentValue >= threshold;

	return {
		passed,
		message: passed
			? `Threshold met: ${currentValue} >= ${threshold}`
			: `Threshold violated: ${currentValue} < ${threshold}`,
		policy,
	};
}

// [TEAM.POLICY.ENFORCE.REQUIREMENT.RG:IMPLEMENTATION] Enforce requirement policy
function enforceRequirement(policy: Policy, context: Record<string, any>): {
	passed: boolean;
	message: string;
	policy: Policy;
} {
	const requiredValues = policy.value as string[];
	const actualValues = context.values as string[] || [];

	const missing = requiredValues.filter(req => !actualValues.includes(req));
	const passed = missing.length === 0;

	return {
		passed,
		message: passed
			? `All requirements met: ${requiredValues.join(', ')}`
			: `Missing requirements: ${missing.join(', ')}`,
		policy,
	};
}

// [TEAM.POLICY.ENFORCE.ROSTER.RG:IMPLEMENTATION] Enforce roster policy
function enforceRoster(policy: Policy, context: Record<string, any>): {
	passed: boolean;
	message: string;
	policy: Policy;
} {
	const requiredRoles = policy.value as string[];
	const actualRoles = context.roles as string[] || [];

	const missing = requiredRoles.filter(role => !actualRoles.includes(role));
	const passed = missing.length === 0;

	return {
		passed,
		message: passed
			? `Roster complete: ${requiredRoles.join(', ')}`
			: `Missing roles: ${missing.join(', ')}`,
		policy,
	};
}

// [TEAM.POLICY.UTILS.RG:IMPLEMENTATION] Policy utility functions
function parseSLA(sla: string): number {
	// Parse "2h", "30m", "1d" format
	const match = sla.match(/(\d+)([hmd])/);
	if (!match) return 24; // Default 24 hours

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'h':
			return value;
		case 'm':
			return value / 60;
		case 'd':
			return value * 24;
		default:
			return value;
	}
}

function parseTimeToHours(timeStr: string): number {
	// Parse ISO duration or hours format
	if (timeStr.includes('h')) {
		return parseSLA(timeStr);
	}
	// Assume it's already in hours
	return parseFloat(timeStr) || 0;
}

// [TEAM.POLICY.QUERY.RG:IMPLEMENTATION] Query policy via team-info tool
/**
 * Query a specific policy using the team-info tool
 */
export async function queryPolicy(policyName: string): Promise<Policy | null> {
	try {
		const result = await executeTeamInfoTool({ query: `policy:${policyName}` });
		
		if (result.matches.length === 0) {
			return null;
		}

		// Extract policy from first match
		const policyMatch = result.matches[0];
		const policyId = policyMatch.marker || `TEAM.POLICY.${policyName.toUpperCase()}.RG`;
		
		return parsePolicySection(policyId.split('.').pop() || policyName, result.section || '');
	} catch (error) {
		console.error('[TEAM.POLICY.QUERY.RG:ERROR] Failed to query policy:', error);
		return null;
	}
}
