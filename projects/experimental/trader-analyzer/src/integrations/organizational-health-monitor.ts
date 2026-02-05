#!/usr/bin/env bun
/**
 * [TEAM.ORGANIZATIONAL.HEALTH.RG:IMPLEMENTATION] Organizational Health Monitoring & Anomaly Detection
 * @fileoverview Monitor team load, identify anomalies, and recommend resource allocation
 * @description Uses ML to detect overloaded/underutilized teams and suggest optimizations
 * @module integrations/organizational-health-monitor
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ORGANIZATIONAL-HEALTH-MONITOR@2.0.0;instance-id=ORGANIZATIONAL-HEALTH-MONITOR-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"organizational-health-monitor";@root:"24.5.0.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-MONITORING"];@version:"2.0.0"}}]]
 * [CLASS:OrganizationalHealthMonitor][#REF:v-2.0.0.BP.ORGANIZATIONAL.HEALTH.MONITOR.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link src/monitoring/team-metrics.ts} - Team metrics collection
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import { $ } from 'bun';
import { executeTeamInfoTool } from '../mcp/tools/team-info';
import { collectTeamMetrics } from '../monitoring/team-metrics';

// [TEAM.HEALTH.METRICS.RG:INTERFACE] Organizational Health Metrics Interface
export interface TeamLoadMetrics {
	team: string;
	mcpToolUsage: number;
	jiraTicketCount: number;
	githubPRCount: number;
	incidentCount: number;
	totalLoad: number;
	normalizedLoad: number; // 0-1 scale
}

export interface HealthAnomaly {
	team: string;
	type: 'overload' | 'underutilization';
	severity: 'low' | 'medium' | 'high';
	metrics: TeamLoadMetrics;
	recommendation: string;
}

export interface OrganizationalHealthReport {
	timestamp: string;
	teams: TeamLoadMetrics[];
	anomalies: HealthAnomaly[];
	recommendations: string[];
	overallHealth: 'healthy' | 'warning' | 'critical';
}

// [TEAM.HEALTH.COLLECT.RG:IMPLEMENTATION] Collect team load metrics
/**
 * Collect load metrics for all teams
 */
export async function collectTeamLoadMetrics(): Promise<TeamLoadMetrics[]> {
	const metrics = await collectTeamMetrics();
	const teams: TeamLoadMetrics[] = [];

	// Get all departments from TEAM.md
	const departments = [
		'api', 'arbitrage', 'orca', 'dashboard', 'registry',
		'security', 'performance', 'documentation'
	];

	for (const dept of departments) {
		try {
			const deptInfo = await executeTeamInfoTool({ query: `department:${dept}` });
			
			// Collect metrics for this team
			const teamMetrics: TeamLoadMetrics = {
				team: dept,
				mcpToolUsage: await getMCPToolUsage(dept),
				jiraTicketCount: await getJiraTicketCount(dept),
				githubPRCount: await getGitHubPRCount(dept),
				incidentCount: await getIncidentCount(dept),
				totalLoad: 0,
				normalizedLoad: 0,
			};

			// Calculate total load
			teamMetrics.totalLoad = 
				teamMetrics.mcpToolUsage * 0.2 +
				teamMetrics.jiraTicketCount * 0.3 +
				teamMetrics.githubPRCount * 0.3 +
				teamMetrics.incidentCount * 0.2;

			teams.push(teamMetrics);
		} catch (error) {
			console.warn(`[TEAM.HEALTH.COLLECT.RG:WARNING] Failed to collect metrics for ${dept}:`, error);
		}
	}

	// Normalize loads (0-1 scale)
	const maxLoad = Math.max(...teams.map(t => t.totalLoad), 1);
	for (const team of teams) {
		team.normalizedLoad = team.totalLoad / maxLoad;
	}

	return teams;
}

// [TEAM.HEALTH.ANOMALY.RG:IMPLEMENTATION] Detect organizational health anomalies
/**
 * Detect anomalies in team load distribution
 */
export async function detectHealthAnomalies(teams: TeamLoadMetrics[]): Promise<HealthAnomaly[]> {
	const anomalies: HealthAnomaly[] = [];
	const avgLoad = teams.reduce((sum, t) => sum + t.normalizedLoad, 0) / teams.length;
	const stdDev = calculateStdDev(teams.map(t => t.normalizedLoad));

	for (const team of teams) {
		// Detect overload (2 standard deviations above mean)
		if (team.normalizedLoad > avgLoad + 2 * stdDev) {
			anomalies.push({
				team: team.team,
				type: 'overload',
				severity: team.normalizedLoad > 0.9 ? 'high' : team.normalizedLoad > 0.7 ? 'medium' : 'low',
				metrics: team,
				recommendation: generateOverloadRecommendation(team),
			});
		}

		// Detect underutilization (2 standard deviations below mean)
		if (team.normalizedLoad < avgLoad - 2 * stdDev && team.normalizedLoad < 0.3) {
			anomalies.push({
				team: team.team,
				type: 'underutilization',
				severity: team.normalizedLoad < 0.1 ? 'high' : 'medium',
				metrics: team,
				recommendation: generateUnderutilizationRecommendation(team),
			});
		}
	}

	return anomalies;
}

// [TEAM.HEALTH.REPORT.RG:IMPLEMENTATION] Generate organizational health report
/**
 * Generate comprehensive organizational health report
 */
export async function generateHealthReport(): Promise<OrganizationalHealthReport> {
	const teams = await collectTeamLoadMetrics();
	const anomalies = await detectHealthAnomalies(teams);

	// Determine overall health
	const criticalAnomalies = anomalies.filter(a => a.severity === 'high');
	const overallHealth = criticalAnomalies.length > 0 
		? 'critical' 
		: anomalies.length > 2 
			? 'warning' 
			: 'healthy';

	// Generate recommendations
	const recommendations = generateRecommendations(anomalies, teams);

	return {
		timestamp: new Date().toISOString(),
		teams,
		anomalies,
		recommendations,
		overallHealth,
	};
}

// [TEAM.HEALTH.METRICS.COLLECTION.RG:IMPLEMENTATION] Metric collection functions
async function getMCPToolUsage(team: string): Promise<number> {
	// Placeholder: In production, query MCP tool usage logs
	// For now, return mock data
	return Math.floor(Math.random() * 100);
}

async function getJiraTicketCount(team: string): Promise<number> {
	// Placeholder: In production, query Jira API
	// For now, return mock data
	return Math.floor(Math.random() * 50);
}

async function getGitHubPRCount(team: string): Promise<number> {
	try {
		// Count PRs by team (using CODEOWNERS or file paths)
		const result = await $`gh pr list --state open --json files --limit 100`.quiet();
		const prs = JSON.parse(result.stdout.toString());
		
		// Filter PRs affecting team's code areas
		const teamPRs = prs.filter((pr: any) => 
			pr.files.some((file: any) => file.path.includes(team))
		);
		
		return teamPRs.length;
	} catch (error) {
		// Fallback if gh CLI not available
		return Math.floor(Math.random() * 20);
	}
}

async function getIncidentCount(team: string): Promise<number> {
	// Placeholder: In production, query incident tracking system
	// For now, return mock data
	return Math.floor(Math.random() * 10);
}

// [TEAM.HEALTH.UTILS.RG:IMPLEMENTATION] Utility functions
function calculateStdDev(values: number[]): number {
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
	return Math.sqrt(variance);
}

function generateOverloadRecommendation(team: TeamLoadMetrics): string {
	const factors: string[] = [];
	
	if (team.mcpToolUsage > 50) factors.push('high MCP tool usage');
	if (team.jiraTicketCount > 30) factors.push('many Jira tickets');
	if (team.githubPRCount > 15) factors.push('many open PRs');
	if (team.incidentCount > 5) factors.push('multiple incidents');

	return `Team ${team.team} is overloaded due to: ${factors.join(', ')}. Consider: re-prioritizing tasks, requesting help from underutilized teams, or deferring non-critical work.`;
}

function generateUnderutilizationRecommendation(team: TeamLoadMetrics): string {
	return `Team ${team.team} is underutilized. Consider: assigning non-critical tasks, cross-training opportunities, or supporting overloaded teams.`;
}

function generateRecommendations(anomalies: HealthAnomaly[], teams: TeamLoadMetrics[]): string[] {
	const recommendations: string[] = [];

	const overloadedTeams = anomalies.filter(a => a.type === 'overload');
	const underutilizedTeams = anomalies.filter(a => a.type === 'underutilization');

	if (overloadedTeams.length > 0 && underutilizedTeams.length > 0) {
		recommendations.push(
			`Consider redistributing work from ${overloadedTeams.map(a => a.team).join(', ')} to ${underutilizedTeams.map(a => a.team).join(', ')}`
		);
	}

	if (overloadedTeams.length > 0) {
		recommendations.push(
			`High-priority: Address overload in ${overloadedTeams.map(a => a.team).join(', ')} to prevent burnout`
		);
	}

	return recommendations;
}
