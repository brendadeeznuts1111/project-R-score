#!/usr/bin/env bun
/**
 * [TEAM.ML.REVIEWER.CROSS.SUBSYSTEM.RG:IMPLEMENTATION] Cross-Subsystem Integration for PR Reviewer Assignments
 * @fileoverview Integration patterns connecting ML-Driven PR Reviewer Assignment to other Hyper-Bun subsystems
 * @description Transforms reviewer assignments into actionable notifications, UI visualizations, and audit trails
 * @module integrations/ml-pr-reviewer-integrations
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ML-PR-REVIEWER-INTEGRATIONS@2.0.0;instance-id=ML-PR-REVIEWER-INTEGRATIONS-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"ml-pr-reviewer-integrations";@root:"24.3.3.6.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-COMMUNICATION","BP-UI"];@version:"2.0.0"}}]]
 * [CLASS:MLPRReviewerIntegrations][#REF:v-2.0.0.BP.ML.PR.REVIEWER.INTEGRATIONS.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link src/integrations/ml-pr-reviewer-assignment.ts} - Core reviewer assignment logic
 * @see {@link docs/24.0.0.0.0.0.0-HUMAN-CAPITAL-ORCHESTRATION.md} - Subsystem documentation
 */

import type { PRReviewerAssignment, ReviewerSuggestion } from './ml-pr-reviewer-assignment';

// [TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG:IMPLEMENTATION] Telegram/Slack Notification Integration
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG:IMPLEMENTATION] Notify team channels of reviewer assignment
 * Integrates with Telegram/Slack to broadcast PR reviewer assignments
 */
export async function notifyReviewerAssignment(assignment: PRReviewerAssignment): Promise<void> {
	const topReviewer = assignment.suggestedReviewers[0];
	
	if (!topReviewer) {
		console.warn('[TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG:WARNING] No reviewers to notify');
		return;
	}

	try {
		// Dynamic import to avoid circular dependencies
		const { notifyTeamChannel } = await import('../telegram/client');
		
		await notifyTeamChannel({
			channel: 'pr-reviews',
			message: `PR-${assignment.prNumber} assigned to ${topReviewer.username} (confidence: ${topReviewer.confidence.toFixed(2)})`,
			metadata: {
				prNumber: assignment.prNumber,
				reviewer: topReviewer.username,
				reasons: topReviewer.reasons,
				expertise: topReviewer.expertise,
				availability: topReviewer.availability,
				currentLoad: topReviewer.currentLoad,
			},
		});

		console.log(`[TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG] Notified team channel for PR-${assignment.prNumber}`);
	} catch (error) {
		console.error('[TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG:ERROR] Failed to notify:', error);
	}
}

// [TEAM.ML.REVIEWER.INTEGRATION.RSS.RG:IMPLEMENTATION] RSS Feed Integration
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.COMMUNICATION.RG:IMPLEMENTATION] Publish reviewer assignment to RSS feed
 * Creates audit trail in RSS feed for PR reviewer assignments
 */
export async function publishReviewerAssignmentAudit(assignment: PRReviewerAssignment): Promise<void> {
	try {
		// Dynamic import to avoid circular dependencies
		const { publishAuditToRSS } = await import('../rss/publisher');
		
		const reviewerNames = assignment.suggestedReviewers
			.slice(0, 3)
			.map(r => r.username)
			.join(', ');

		await publishAuditToRSS({
			title: `PR-${assignment.prNumber} Reviewer Assignment`,
			description: `ML-driven reviewer assignment: ${reviewerNames}`,
			category: 'pr-orchestration',
			metadata: {
				prNumber: assignment.prNumber,
				prAuthor: assignment.prAuthor,
				reviewers: assignment.suggestedReviewers.map(r => ({
					username: r.username,
					confidence: r.confidence,
					reasons: r.reasons,
					expertise: r.expertise,
				})),
				departmentOwners: assignment.departmentOwners,
				affectedFiles: assignment.affectedFiles.slice(0, 5), // Limit for RSS
			},
		});

		console.log(`[TEAM.ML.REVIEWER.INTEGRATION.RSS.RG] Published RSS audit for PR-${assignment.prNumber}`);
	} catch (error) {
		console.error('[TEAM.ML.REVIEWER.INTEGRATION.RSS.RG:ERROR] Failed to publish RSS:', error);
	}
}

// [TEAM.ML.REVIEWER.INTEGRATION.API.RG:IMPLEMENTATION] API Layer Integration Helper
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.API.RG:IMPLEMENTATION] Check if PR affects MarketDataRouter17 or API layer
 * Determines if reviewer assignment should prioritize API routing expertise
 */
export function affectsAPILayer(assignment: PRReviewerAssignment): boolean {
	return assignment.affectedFiles.some(file =>
		file.includes('MarketDataRouter17') ||
		file.includes('CorrelationEngine17') ||
		file.includes('TickDataCollector17') ||
		file.includes('src/routers/') ||
		file.includes('src/api/routes.ts')
	);
}

// [TEAM.ML.REVIEWER.INTEGRATION.ML.RG:IMPLEMENTATION] ML/Analytics Integration Helper
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.ML.RG:IMPLEMENTATION] Check if PR affects CMMS Analyzer or ML components
 * Determines if reviewer assignment should prioritize ML/data science expertise
 */
export function affectsMLComponents(assignment: PRReviewerAssignment): boolean {
	return assignment.affectedFiles.some(file =>
		file.includes('CmmsAnalyzer17') ||
		file.includes('CmmsState') ||
		file.includes('src/analysis/') ||
		file.includes('machine_learning') ||
		file.includes('risk_modeling')
	);
}

// [TEAM.ML.REVIEWER.INTEGRATION.RESILIENCE.RG:IMPLEMENTATION] Resilience Integration Helper
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.RESILIENCE.RG:IMPLEMENTATION] Check if PR affects CircuitBreaker or resilience components
 * Determines if reviewer assignment should prioritize system reliability expertise
 */
export function affectsResilienceComponents(assignment: PRReviewerAssignment): boolean {
	return assignment.affectedFiles.some(file =>
		file.includes('CircuitBreaker') ||
		file.includes('ProductionCircuitBreaker') ||
		file.includes('ProxyConfigService') ||
		file.includes('src/services/CircuitBreaker') ||
		file.includes('error_handling')
	);
}

// [TEAM.ML.REVIEWER.INTEGRATION.DX.RG:IMPLEMENTATION] Developer Tooling Integration Helper
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.DX.RG:IMPLEMENTATION] Check if PR affects developer tooling
 * Determines if reviewer assignment should prioritize DX/cli expertise
 */
export function affectsDeveloperTooling(assignment: PRReviewerAssignment): boolean {
	return assignment.affectedFiles.some(file =>
		file.includes('bun-console.ts') ||
		file.includes('mcp-scaffold.ts') ||
		file.includes('mcp-team-info') ||
		file.includes('scripts/') ||
		file.includes('cli/')
	);
}

// [TEAM.ML.REVIEWER.INTEGRATION.ORCHESTRATOR.RG:IMPLEMENTATION] Complete Integration Orchestrator
/**
 * [TEAM.ML.REVIEWER.INTEGRATION.ORCHESTRATOR.RG:IMPLEMENTATION] Orchestrate all cross-subsystem integrations
 * Executes all integration patterns for a reviewer assignment
 */
export async function orchestrateReviewerAssignmentIntegrations(
	assignment: PRReviewerAssignment,
	options: {
		notify?: boolean;
		publishRSS?: boolean;
		logIntegration?: boolean;
	} = {}
): Promise<void> {
	const {
		notify = true,
		publishRSS = true,
		logIntegration = true,
	} = options;

	if (logIntegration) {
		console.log(`[TEAM.ML.REVIEWER.INTEGRATION.ORCHESTRATOR.RG] Orchestrating integrations for PR-${assignment.prNumber}`);
		
		// Log subsystem impact analysis
		if (affectsAPILayer(assignment)) {
			console.log('  → Affects API Layer (MarketDataRouter17)');
		}
		if (affectsMLComponents(assignment)) {
			console.log('  → Affects ML Components (CmmsAnalyzer17)');
		}
		if (affectsResilienceComponents(assignment)) {
			console.log('  → Affects Resilience Components (CircuitBreaker)');
		}
		if (affectsDeveloperTooling(assignment)) {
			console.log('  → Affects Developer Tooling');
		}
	}

	// Execute integrations in parallel
	const integrations: Promise<void>[] = [];

	if (notify) {
		integrations.push(notifyReviewerAssignment(assignment));
	}

	if (publishRSS) {
		integrations.push(publishReviewerAssignmentAudit(assignment));
	}

	await Promise.allSettled(integrations);

	console.log(`[TEAM.ML.REVIEWER.INTEGRATION.ORCHESTRATOR.RG] Completed integrations for PR-${assignment.prNumber}`);
}
