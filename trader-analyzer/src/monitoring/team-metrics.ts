#!/usr/bin/env bun
/**
 * [TEAM.METRICS.OBSERVABILITY.RG:IMPLEMENTATION] Human Capital Knowledge Graph Observability
 * @fileoverview Metrics and observability for Human Capital Orchestration subsystem
 * @description Collects real-time metrics from TEAM.md, CLI usage, and operational systems
 * @module monitoring/team-metrics
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TEAM-METRICS@2.0.0;instance-id=TEAM-METRICS-001;version=2.0.0}]
 * [PROPERTIES:{monitoring={value:"team-metrics";@root:"26.2.0.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-OBSERVABILITY"];@version:"2.0.0"}}]]
 * [CLASS:TeamMetrics][#REF:v-2.0.0.BP.TEAM.METRICS.1.0.A.1.1.MONITORING.1.1]]
 *
 * @see {@link .github/TEAM.md} - Team structure source
 * @see {@link src/mcp/tools/team-info.ts} - Team info query tool
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import { $ } from 'bun';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { executeTeamInfoTool } from '../mcp/tools/team-info';

// [TEAM.METRICS.INTERFACE.RG:SCHEMA] Team Metrics Interface
/**
 * Interface for team metrics data structure
 */
export interface TeamMetrics {
	knowledgeGraph: {
		totalMarkers: number;
		activeQueries: number;
		cacheHitRate: number;
		avgExtractionTime: number;
	};
	teamHealth: {
		departments: number;
		maintainers: number;
		onCallCoverage: number;
		documentationCompleteness: number;
	};
	operational: {
		codeownersSyncSuccess: number;
		incidentRoutingAccuracy: number;
		prReviewEfficiency: number;
	};
}

// [TEAM.METRICS.COLLECTOR.RG:IMPLEMENTATION] Metrics Collection Function
/**
 * Collects real-time metrics from TEAM.md and CLI usage
 */
export async function collectTeamMetrics(): Promise<TeamMetrics> {
	const metrics: TeamMetrics = {
		knowledgeGraph: {
			totalMarkers: 0,
			activeQueries: 0,
			cacheHitRate: 0,
			avgExtractionTime: 0,
		},
		teamHealth: {
			departments: 0,
			maintainers: 0,
			onCallCoverage: 0,
			documentationCompleteness: 0,
		},
		operational: {
			codeownersSyncSuccess: 0,
			incidentRoutingAccuracy: 0,
			prReviewEfficiency: 0,
		},
	};

	const teamMDPath = join(process.cwd(), '.github', 'TEAM.md');

	try {
		// Count RG markers
		try {
			const markerResult = await $`rg --pcre2 -o '\\[TEAM\\..*\\.RG(:[A-Z]+)?\\]' ${teamMDPath}`.quiet();
			const markerText = markerResult.stdout.toString();
			metrics.knowledgeGraph.totalMarkers = markerText.split('\n').filter(Boolean).length;
		} catch {
			// Fallback: count manually from file content
			const content = await readFile(teamMDPath, 'utf-8');
			const markerMatches = content.match(/\[TEAM\.[A-Z.]+\.RG(:[A-Z]+)?\]/g);
			metrics.knowledgeGraph.totalMarkers = markerMatches ? markerMatches.length : 0;
		}

		// Count departments
		try {
			const deptResult = await $`rg --pcre2 -c '\\[TEAM\\.DEPARTMENT\\.[A-Z\\.]+\\.RG' ${teamMDPath}`.quiet();
			const deptText = deptResult.stdout.toString().trim();
			metrics.teamHealth.departments = parseInt(deptText.split(':').pop() || '0', 10);
		} catch {
			// Fallback: count manually
			const content = await readFile(teamMDPath, 'utf-8');
			const deptMatches = content.match(/\[TEAM\.DEPARTMENT\.[A-Z\.]+\.RG/g);
			metrics.teamHealth.departments = deptMatches ? deptMatches.length : 0;
		}

		// Count maintainers (@mentions)
		try {
			const maintainerResult = await $`rg -o '@[a-zA-Z0-9_-]+' ${teamMDPath}`.quiet();
			const maintainerText = maintainerResult.stdout.toString();
			const maintainers = maintainerText.split('\n').filter(Boolean);
			metrics.teamHealth.maintainers = new Set(maintainers).size; // Unique maintainers
		} catch {
			// Fallback: count manually
			const content = await readFile(teamMDPath, 'utf-8');
			const maintainerMatches = content.match(/@[a-zA-Z0-9_-]+/g);
			metrics.teamHealth.maintainers = maintainerMatches ? new Set(maintainerMatches).size : 0;
		}

		// Calculate extraction performance
		const start = performance.now();
		try {
			await executeTeamInfoTool({ query: 'department:api' });
			metrics.knowledgeGraph.avgExtractionTime = performance.now() - start;
		} catch {
			metrics.knowledgeGraph.avgExtractionTime = 0;
		}

		// Check CODEOWNERS sync health
		const codeownersPath = join(process.cwd(), '.github', 'CODEOWNERS');
		const codeownersFile = Bun.file(codeownersPath);
		if (await codeownersFile.exists()) {
			try {
				const codeownersStat = await stat(codeownersPath);
				const teamMdStat = await stat(teamMDPath);

				if (codeownersStat.mtime >= teamMdStat.mtime) {
					metrics.operational.codeownersSyncSuccess = 100;
				} else {
					// Calculate how stale (days)
					const daysDiff = (teamMdStat.mtime.getTime() - codeownersStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
					metrics.operational.codeownersSyncSuccess = Math.max(0, 100 - daysDiff * 10); // -10% per day stale
				}
			} catch {
				metrics.operational.codeownersSyncSuccess = 0;
			}
		} else {
			metrics.operational.codeownersSyncSuccess = 0;
		}

		// Calculate documentation completeness (percentage of departments with RG markers)
		if (metrics.teamHealth.departments > 0 && metrics.knowledgeGraph.totalMarkers > 0) {
			// Rough estimate: if we have markers and departments, assume good coverage
			metrics.teamHealth.documentationCompleteness = Math.min(
				100,
				(metrics.knowledgeGraph.totalMarkers / (metrics.teamHealth.departments * 2)) * 100
			);
		}

		// Estimate on-call coverage (if maintainers section exists)
		if (metrics.teamHealth.maintainers > 0) {
			// Rough estimate: assume good coverage if we have maintainers
			metrics.teamHealth.onCallCoverage = Math.min(100, (metrics.teamHealth.maintainers / 10) * 100);
		}
	} catch (error) {
		console.error('[TEAM.METRICS.COLLECTOR.RG:ERROR] Error collecting metrics:', error);
	}

	return metrics;
}

// [TEAM.METRICS.PROMETHEUS.RG:EXPORTER] Prometheus Metrics Exporter
/**
 * Prometheus-compatible metrics exporter
 */
export function exportMetricsForPrometheus(metrics: TeamMetrics): string {
	return `
# HELP team_knowledge_graph_markers_total Total RG markers in TEAM.md
# TYPE team_knowledge_graph_markers_total gauge
team_knowledge_graph_markers_total ${metrics.knowledgeGraph.totalMarkers}

# HELP team_knowledge_graph_active_queries_total Active queries to team info
# TYPE team_knowledge_graph_active_queries_total gauge
team_knowledge_graph_active_queries_total ${metrics.knowledgeGraph.activeQueries}

# HELP team_knowledge_graph_cache_hit_rate Cache hit rate for team queries
# TYPE team_knowledge_graph_cache_hit_rate gauge
team_knowledge_graph_cache_hit_rate ${metrics.knowledgeGraph.cacheHitRate}

# HELP team_knowledge_graph_extraction_duration_ms Average extraction time in milliseconds
# TYPE team_knowledge_graph_extraction_duration_ms gauge
team_knowledge_graph_extraction_duration_ms ${metrics.knowledgeGraph.avgExtractionTime}

# HELP team_health_departments_total Number of departments
# TYPE team_health_departments_total gauge
team_health_departments_total ${metrics.teamHealth.departments}

# HELP team_health_maintainers_total Number of maintainers
# TYPE team_health_maintainers_total gauge
team_health_maintainers_total ${metrics.teamHealth.maintainers}

# HELP team_health_oncall_coverage_percent On-call coverage percentage
# TYPE team_health_oncall_coverage_percent gauge
team_health_oncall_coverage_percent ${metrics.teamHealth.onCallCoverage}

# HELP team_health_documentation_completeness_percent Documentation completeness percentage
# TYPE team_health_documentation_completeness_percent gauge
team_health_documentation_completeness_percent ${metrics.teamHealth.documentationCompleteness}

# HELP team_operational_codeowners_sync_success_percent CODEOWNERS sync health percentage
# TYPE team_operational_codeowners_sync_success_percent gauge
team_operational_codeowners_sync_success_percent ${metrics.operational.codeownersSyncSuccess}

# HELP team_operational_incident_routing_accuracy_percent Incident routing accuracy percentage
# TYPE team_operational_incident_routing_accuracy_percent gauge
team_operational_incident_routing_accuracy_percent ${metrics.operational.incidentRoutingAccuracy}

# HELP team_operational_pr_review_efficiency_percent PR review efficiency percentage
# TYPE team_operational_pr_review_efficiency_percent gauge
team_operational_pr_review_efficiency_percent ${metrics.operational.prReviewEfficiency}
  `.trim();
}

// [TEAM.METRICS.API.RG:IMPLEMENTATION] Metrics API Endpoint Handler
/**
 * HTTP handler for metrics endpoint
 */
export async function handleMetricsRequest(): Promise<Response> {
	try {
		const metrics = await collectTeamMetrics();
		const prometheusFormat = exportMetricsForPrometheus(metrics);
		return new Response(prometheusFormat, {
			headers: {
				'Content-Type': 'text/plain; version=0.0.4',
			},
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(`# ERROR: ${errorMessage}\n`, {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		});
	}
}

// [TEAM.METRICS.JSON.RG:IMPLEMENTATION] JSON Metrics Exporter
/**
 * Export metrics as JSON for API consumption
 */
export async function exportMetricsAsJSON(): Promise<{
	metrics: TeamMetrics;
	timestamp: string;
	version: string;
}> {
	const metrics = await collectTeamMetrics();
	return {
		metrics,
		timestamp: new Date().toISOString(),
		version: '2.0.0',
	};
}
