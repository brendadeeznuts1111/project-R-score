#!/usr/bin/env bun
/**
 * [TEAM.ESCALATION.RG:IMPLEMENTATION] Intelligent Incident Routing
 * @fileoverview AI-Assisted Incident Escalation & Routing System
 * @description Automatically routes NX-MCP-XXX errors to correct teams using TEAM.md knowledge graph
 * @module error-handling/incident-router
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-INCIDENT-ROUTER@2.0.0;instance-id=INCIDENT-ROUTER-001;version=2.0.0}]
 * [PROPERTIES:{error={value:"incident-router";@root:"24.2.2.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-ERROR-HANDLING"];@version:"2.0.0"}}]
 * [CLASS:IncidentRouter][#REF:v-2.0.0.BP.INCIDENT.ROUTER.1.0.A.1.1.ERROR.1.1]]
 *
 * @see {@link src/mcp/tools/team-info.ts} - Team Info query tool
 * @see {@link .github/TEAM.md} - Team structure knowledge graph
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import { executeTeamInfoTool } from '../mcp/tools/team-info';

// [ERROR.ROUTING.MAPPING.RG:CONFIG] Error Source to Team Mapping
/**
 * Maps error sources to team department queries
 */
const ERROR_SOURCE_MAP: Record<string, string> = {
	'mcp-tools': 'department:registry',
	'mcp-server': 'department:registry',
	'database-persistence': 'department:performance',
	'database': 'department:performance',
	'rss-cache': 'department:api',
	'rss': 'department:api',
	'telegram-notifications': 'department:security',
	'telegram': 'department:security',
	'json-validation': 'department:api',
	'validation': 'department:api',
	'error-handling': 'department:api',
	'arbitrage': 'department:arbitrage',
	'trading': 'department:arbitrage',
	'orca': 'department:orca',
	'sports': 'department:orca',
	'dashboard': 'department:dashboard',
	'ui': 'department:dashboard',
	'security': 'department:security',
	'performance': 'department:performance',
	'documentation': 'department:documentation',
};

// [TEAM.ESCALATION.ERROR.INTERFACE.RG:SCHEMA] MCP Error Interface
export interface McpError {
	code: string; // NX-MCP-XXX
	source: string; // e.g., 'mcp-tools', 'database-persistence'
	severity: 'critical' | 'high' | 'medium' | 'low';
	message?: string;
	timestamp?: string;
}

// [TEAM.ESCALATION.ROUTE.RESULT.RG:SCHEMA] Incident Route Result Interface
export interface IncidentRouteResult {
	team: string;
	teamQuery: string;
	onCall: string[];
	escalationPath: string[];
	contacts: string[];
	summary: string;
}

// [TEAM.ESCALATION.ROUTING.RG:IMPLEMENTATION] Route Incident to Correct Team
/**
 * Automatically route incidents to correct team based on error source
 */
export async function routeIncident(error: McpError): Promise<IncidentRouteResult> {
	console.log(`[TEAM.ESCALATION.RG:INCIDENT] ${error.code} from ${error.source} (${error.severity})`);

	// Determine responsible team from error source
	const teamQuery = ERROR_SOURCE_MAP[error.source.toLowerCase()] || 
	                  ERROR_SOURCE_MAP[error.source.toLowerCase().split('-')[0]] ||
	                  'escalation';

	// Query knowledge graph for team info
	const teamInfo = await executeTeamInfoTool({ query: teamQuery });

	// Extract contacts from team info
	const contacts = teamInfo.contacts || [];

	// For critical/high severity, also check maintainers
	let onCall: string[] = [];
	if (error.severity === 'critical' || error.severity === 'high') {
		const maintainersInfo = await executeTeamInfoTool({ query: 'role:maintainer' });
		const maintainerContacts = maintainersInfo.contacts || [];
		
		// Filter maintainers relevant to this team
		onCall = maintainerContacts.filter(contact => 
			teamInfo.section?.includes(contact.replace('@', '')) || false
		);
		
		// If no specific maintainers found, use all maintainers
		if (onCall.length === 0) {
			onCall = maintainerContacts;
		}
	} else {
		// For medium/low, use team contacts
		onCall = contacts;
	}

	// Extract escalation path from related markers
	const escalationPath = teamInfo.relatedMarkers || [];

	return {
		team: teamQuery.replace('department:', ''),
		teamQuery,
		onCall,
		escalationPath,
		contacts,
		summary: `Routed ${error.code} to ${teamQuery}. Contacts: ${onCall.join(', ')}`,
	};
}

// [TEAM.ESCALATION.EXAMPLE.RG:IMPLEMENTATION] Example Usage
/**
 * Example: Route NX-MCP-001 error
 */
export async function exampleRouteIncident() {
	const incident = await routeIncident({
		code: 'NX-MCP-001',
		source: 'mcp-tools',
		severity: 'critical',
		message: 'MCP server initialization failed',
		timestamp: new Date().toISOString(),
	});

	console.log('Incident Route Result:', JSON.stringify(incident, null, 2));
	// Returns: { team: 'registry', teamQuery: 'department:registry', onCall: ['@platform-team-lead'], ... }
}
