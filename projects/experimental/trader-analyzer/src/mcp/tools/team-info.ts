#!/usr/bin/env bun
/**
 * [TEAM.INFO.MCP.RG:IMPLEMENTATION] MCP Team Info Tool
 * [TEAM.INFO.TOOL.RG:IMPLEMENTATION] MCP Team Info Tool
 * @fileoverview Human Capital Orchestration & Knowledge Graph - Team Information Query Tool
 * @description Query TEAM.md document using ripgrep to discover organizational structure, roles, and responsibilities
 * @module mcp/tools/team-info
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-TEAM-INFO@2.0.0;instance-id=MCP-TEAM-INFO-001;version=2.0.0}]
 * [PROPERTIES:{mcp={value:"team-info";@root:"24.0.0.0.0.0.0";@chain:["BP-MCP-TOOLS","BP-HUMAN-CAPITAL"];@version:"2.0.0"}}]
 * [CLASS:TeamInfoMCP][#REF:v-2.0.0.BP.MCP.TEAM.INFO.1.0.A.1.1.MCP.1.1]]
 *
 * @see {@link .github/TEAM.md} - Team structure documentation
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Complete subsystem documentation
 */

import { $ } from 'bun';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { MCPTool } from '../server';

// [TEAM.INFO.RG.PATTERN.RG:CONFIG] Official RG Marker Regex Pattern
/**
 * Strict RG marker validation pattern (no false positives)
 * Pattern: [DOMAIN.CATEGORY.SUBCATEGORY.RG:QUALIFIER]
 */
export const RG_PATTERN = '(?<!\\w)\\[([A-Z]+(\\.[A-Z]+)+)\\.RG(:[A-Z]+)?\\](?!\\w)';

// [TEAM.INFO.QUERY.RG:IMPLEMENTATION] Query TEAM.md using ripgrep
/**
 * Query TEAM.md for specific RG markers or keywords
 * Returns structured results with contacts and related markers
 */
async function queryTeamMD(query: string): Promise<{
	matches: Array<{ line: number; content: string; marker?: string }>;
	section?: string;
	summary: string;
	contacts?: string[];
	relatedMarkers?: string[];
}> {
	const teamMDPath = join(process.cwd(), '.github', 'TEAM.md');
	
	// Parse query type
	const queryLower = query.toLowerCase();
	let rgPattern = '';
	let sectionName = '';

	// [TEAM.INFO.QUERY.PARSING.RG:IMPLEMENTATION] Enhanced query pattern mapping
	const queryMap: Record<string, string> = {
		// Department queries
		'department:arbitrage': '[TEAM.DEPARTMENT.ARBITRAGE.TRADING.RG',
		'department:trading': '[TEAM.DEPARTMENT.ARBITRAGE.TRADING.RG',
		'department:api': '[TEAM.DEPARTMENT.API.ROUTES.RG',
		'department:routes': '[TEAM.DEPARTMENT.API.ROUTES.RG',
		'department:orca': '[TEAM.DEPARTMENT.ORCA.SPORTS.RG',
		'department:sports': '[TEAM.DEPARTMENT.ORCA.SPORTS.RG',
		'department:dashboard': '[TEAM.DEPARTMENT.DASHBOARD.UI.RG',
		'department:ui': '[TEAM.DEPARTMENT.DASHBOARD.UI.RG',
		'department:registry': '[TEAM.DEPARTMENT.REGISTRY.MCP.RG',
		'department:mcp': '[TEAM.DEPARTMENT.REGISTRY.MCP.RG',
		'department:security': '[TEAM.DEPARTMENT.SECURITY.RG',
		'department:performance': '[TEAM.DEPARTMENT.PERFORMANCE.CACHING.RG',
		'department:caching': '[TEAM.DEPARTMENT.PERFORMANCE.CACHING.RG',
		'department:documentation': '[TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
		'department:docs': '[TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
		'department:dx': '[TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
		// Role queries
		'role:lead': '[TEAM.ROLES.LEADS.RG',
		'role:leads': '[TEAM.ROLES.LEADS.RG',
		'role:contributor': '[TEAM.ROLES.CONTRIBUTORS.RG',
		'role:contributors': '[TEAM.ROLES.CONTRIBUTORS.RG',
		'maintainer': '[TEAM.ROLES.MAINTAINERS.RG',
		'maintainers': '[TEAM.ROLES.MAINTAINERS.RG',
		// Operational queries
		'communication': '[TEAM.COMMUNICATION.RG',
		'escalation': '[TEAM.REVIEW.ASSIGNMENT.RG',
		'oncall': '[TEAM.ROLES.MAINTAINERS.RG', // Fallback to maintainers
		'review': '[TEAM.REVIEW.ASSIGNMENT.RG',
		'assignment': '[TEAM.REVIEW.ASSIGNMENT.RG',
		'colors': '[TEAM.DEPARTMENT.COLORS.RG',
	};

	// Resolve query to RG marker pattern
	const markerPrefix = queryMap[queryLower] || queryMap[`department:${queryLower}`] || queryMap[`role:${queryLower}`];
	
	if (markerPrefix) {
		rgPattern = `${markerPrefix.replace('[', '\\[')}(:[A-Z]+)?\\]`;
		sectionName = queryLower.includes('department:') ? `Department: ${queryLower.replace('department:', '')}` :
		              queryLower.includes('role:') ? `Role: ${queryLower.replace('role:', '')}` :
		              queryLower;
	} else if (queryLower.startsWith('department:')) {
		const dept = queryLower.replace('department:', '').trim();
		const deptMap: Record<string, string> = {
			'api': 'TEAM.DEPARTMENT.API.ROUTES.RG',
			'routes': 'TEAM.DEPARTMENT.API.ROUTES.RG',
			'arbitrage': 'TEAM.DEPARTMENT.ARBITRAGE.TRADING.RG',
			'trading': 'TEAM.DEPARTMENT.ARBITRAGE.TRADING.RG',
			'orca': 'TEAM.DEPARTMENT.ORCA.SPORTS.RG',
			'sports': 'TEAM.DEPARTMENT.ORCA.SPORTS.RG',
			'dashboard': 'TEAM.DEPARTMENT.DASHBOARD.UI.RG',
			'ui': 'TEAM.DEPARTMENT.DASHBOARD.UI.RG',
			'registry': 'TEAM.DEPARTMENT.REGISTRY.MCP.RG',
			'mcp': 'TEAM.DEPARTMENT.REGISTRY.MCP.RG',
			'security': 'TEAM.DEPARTMENT.SECURITY.RG',
			'performance': 'TEAM.DEPARTMENT.PERFORMANCE.CACHING.RG',
			'caching': 'TEAM.DEPARTMENT.PERFORMANCE.CACHING.RG',
			'documentation': 'TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
			'docs': 'TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
			'dx': 'TEAM.DEPARTMENT.DOCUMENTATION.DX.RG',
		};
		const marker = deptMap[dept] || `TEAM.DEPARTMENT.${dept.toUpperCase().replace(/\s+/g, '.')}.RG`;
		rgPattern = `\\[${marker}(:[A-Z]+)?\\]`;
		sectionName = `Department: ${dept}`;
	} else if (queryLower.startsWith('role:')) {
		const role = queryLower.replace('role:', '').trim();
		const roleMap: Record<string, string> = {
			'lead': 'TEAM.ROLES.LEADS.RG',
			'leads': 'TEAM.ROLES.LEADS.RG',
			'contributor': 'TEAM.ROLES.CONTRIBUTORS.RG',
			'contributors': 'TEAM.ROLES.CONTRIBUTORS.RG',
			'maintainer': 'TEAM.ROLES.MAINTAINERS.RG',
			'maintainers': 'TEAM.ROLES.MAINTAINERS.RG',
		};
		const marker = roleMap[role] || `TEAM.ROLES.${role.toUpperCase()}.RG`;
		rgPattern = `\\[${marker}(:[A-Z]+)?\\]`;
		sectionName = `Role: ${role}`;
	} else if (queryLower.includes('communication')) {
		rgPattern = '\\[TEAM\\.COMMUNICATION\\.RG(:[A-Z]+)?\\]';
		sectionName = 'Communication';
	} else if (queryLower.includes('review') || queryLower.includes('assignment')) {
		rgPattern = '\\[TEAM\\.REVIEW\\.ASSIGNMENT\\.RG(:[A-Z]+)?\\]';
		sectionName = 'Review Assignment';
	} else if (queryLower.includes('color')) {
		rgPattern = '\\[TEAM\\.DEPARTMENT\\.COLORS\\.RG(:[A-Z]+)?\\]';
		sectionName = 'Department Colors';
	} else {
		// Generic search - find any TEAM marker containing the query
		rgPattern = `\\[TEAM\\..*${query.replace(/\s+/g, '.*')}.*\\.RG(:[A-Z]+)?\\]`;
		sectionName = `Search: ${query}`;
	}

	// [TEAM.INFO.RIPGREP.EXECUTE.RG:IMPLEMENTATION] Execute ripgrep query with context
	try {
		// Use -A 50 to get full section context
		const result = await $`rg -n -A 50 "${rgPattern}" ${teamMDPath}`.quiet();
		const output = result.stdout.toString();
		
		if (!output.trim()) {
			return {
				matches: [],
				summary: `No matches found for query: ${query}`,
			};
		}

		const lines = output.trim().split('\n');
		const matches: Array<{ line: number; content: string; marker?: string }> = [];
		let currentMatch: { line: number; content: string; marker?: string } | null = null;

		// [TEAM.INFO.PARSING.RG:IMPLEMENTATION] Parse ripgrep output with context
		for (const line of lines) {
			// Check if this is a new match line (contains line number)
			const matchLine = line.match(/^(\d+):(.+)$/);
			if (matchLine) {
				// Save previous match
				if (currentMatch) {
					matches.push(currentMatch);
				}
				
				const lineNum = parseInt(matchLine[1], 10);
				const content = matchLine[2];
				
				// Extract RG marker if present
				const markerMatch = content.match(/\[([A-Z]+\.[A-Z.]+\.RG(?::[A-Z]+)?)\]/);
				const marker = markerMatch ? markerMatch[1] : undefined;

				currentMatch = {
					line: lineNum,
					content: content.trim(),
					marker,
				};
			} else if (currentMatch && line.trim() && !line.startsWith('--')) {
				// Append context lines to current match
				currentMatch.content += '\n' + line.trim();
			}
		}

		// Add last match
		if (currentMatch) {
			matches.push(currentMatch);
		}

		// Get full section content and extract contacts/related markers
		let sectionContent = '';
		let contacts: string[] = [];
		let relatedMarkers: string[] = [];
		
		if (matches.length > 0) {
			const firstLine = matches[0].line;
			const fileContent = await readFile(teamMDPath, 'utf-8');
			const fileLines = fileContent.split('\n');
			
			// Extract section from first match to next ## or end of file
			let sectionStart = Math.max(0, firstLine - 1);
			let sectionEnd = fileLines.length;
			
			for (let i = firstLine; i < fileLines.length; i++) {
				if (fileLines[i].startsWith('##') && i > firstLine) {
					sectionEnd = i;
					break;
				}
			}
			
			sectionContent = fileLines.slice(sectionStart, sectionEnd).join('\n');
			
			// Extract contacts (@mentions)
			const contactMatches = sectionContent.match(/@[a-zA-Z0-9_-]+/g);
			if (contactMatches) {
				contacts = [...new Set(contactMatches)];
			}
			
			// Extract related RG markers
			const markerMatches = sectionContent.match(/\[([A-Z]+\.[A-Z.]+\.RG(?::[A-Z]+)?)\]/g);
			if (markerMatches) {
				relatedMarkers = [...new Set(markerMatches.map(m => m.replace(/[\[\]]/g, '')))];
			}
		}

		return {
			matches,
			section: sectionContent,
			contacts,
			relatedMarkers,
			summary: `Found ${matches.length} match(es) for "${query}"${contacts.length > 0 ? ` (${contacts.length} contacts)` : ''}`,
		};
	} catch (error: any) {
		// ripgrep returns non-zero exit code when no matches found
		if (error.exitCode === 1) {
			return {
				matches: [],
				summary: `No matches found for query: ${query}`,
			};
		}
		
		return {
			matches: [],
			summary: `Error querying TEAM.md: ${error.message}`,
		};
	}
}

// [TEAM.INFO.TOOL.CREATE.RG:IMPLEMENTATION] Create Team Info Tool
/**
 * Create Team Info MCP Tool
 */
export function createTeamInfoTool(): MCPTool {
	return {
		name: 'mlgs.team.info',
		description:
			'Query TEAM.md document to discover organizational structure, roles, responsibilities, and communication protocols. Uses ripgrep to search RG markers.',
		inputSchema: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description:
						'Query string. Supports: "department:<name>", "role:<name>", "communication", "review", "colors", or free-text search',
					examples: [
						'department:arbitrage',
						'department:api',
						'role:lead',
						'communication',
						'review assignment',
						'security',
					],
				},
			},
			required: ['query'],
		},
	};
}

// [TEAM.INFO.TOOL.EXECUTE.RG:IMPLEMENTATION] Execute Team Info Tool
/**
 * Execute Team Info Tool
 */
export async function executeTeamInfoTool(args: {
	query: string;
}): Promise<{
	matches: Array<{ line: number; content: string; marker?: string }>;
	section?: string;
	summary: string;
	query: string;
	contacts?: string[];
	relatedMarkers?: string[];
}> {
	const { query } = args;
	const result = await queryTeamMD(query);

	return {
		...result,
		query,
	};
}
