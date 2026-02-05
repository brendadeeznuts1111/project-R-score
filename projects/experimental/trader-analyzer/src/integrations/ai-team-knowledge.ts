#!/usr/bin/env bun
/**
 * [AI.TEAM.KNOWLEDGE.RG:IMPLEMENTATION] AI Agent Integration with TEAM.md Knowledge Graph
 * @fileoverview Enable AI agents (Claude) to query TEAM.md for intelligent decision-making
 * @description Provides AI-friendly interfaces for querying team structure and routing decisions
 * @module integrations/ai-team-knowledge
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-AI-TEAM-KNOWLEDGE@2.0.0;instance-id=AI-TEAM-KNOWLEDGE-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"ai-team-knowledge";@root:"26.11.0.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-AI-INTEGRATION"];@version:"2.0.0"}}]]
 * [CLASS:AITeamKnowledge][#REF:v-2.0.0.BP.AI.TEAM.KNOWLEDGE.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link .github/TEAM.md} - Team structure source
 * @see {@link src/mcp/tools/team-info.ts} - Team info query tool
 * @see {@link docs/26.0.0.0.0.0.0-CROSS-SUBSYSTEM-INTEGRATION-ORCHESTRATION.md} - Integration documentation
 */

import { executeTeamInfoTool } from '../mcp/tools/team-info';

// [AI.TEAM.QUERY.RESULT.RG:INTERFACE] AI Query Result Interface
export interface AITeamQueryResult {
	answer: string;
	sources: Array<{
		section: string;
		marker: string;
		relevance: number;
	}>;
	contacts?: string[];
	confidence: number;
}

// [AI.TEAM.KEYWORDS.RG:IMPLEMENTATION] Extract keywords for RG marker mapping
/**
 * Extract keywords from natural language question to map to RG markers
 */
export function extractKeywords(question: string): string[] {
	const keywords: string[] = [];
	const lowerQuestion = question.toLowerCase();

	// Department keywords
	if (lowerQuestion.includes('api') || lowerQuestion.includes('routes') || lowerQuestion.includes('endpoint')) {
		keywords.push('department:api');
	}
	if (lowerQuestion.includes('arbitrage') || lowerQuestion.includes('trading') || lowerQuestion.includes('market')) {
		keywords.push('department:arbitrage');
	}
	if (lowerQuestion.includes('orca') || lowerQuestion.includes('sports') || lowerQuestion.includes('betting')) {
		keywords.push('department:orca');
	}
	if (lowerQuestion.includes('dashboard') || lowerQuestion.includes('ui') || lowerQuestion.includes('frontend')) {
		keywords.push('department:dashboard');
	}
	if (lowerQuestion.includes('registry') || lowerQuestion.includes('mcp') || lowerQuestion.includes('tool')) {
		keywords.push('department:registry');
	}
	if (lowerQuestion.includes('security') || lowerQuestion.includes('secure') || lowerQuestion.includes('vulnerability')) {
		keywords.push('department:security');
	}
	if (lowerQuestion.includes('performance') || lowerQuestion.includes('cache') || lowerQuestion.includes('optimization')) {
		keywords.push('department:performance');
	}
	if (lowerQuestion.includes('documentation') || lowerQuestion.includes('docs') || lowerQuestion.includes('dx')) {
		keywords.push('department:documentation');
	}

	// Role keywords
	if (lowerQuestion.includes('lead') || lowerQuestion.includes('manager') || lowerQuestion.includes('owner')) {
		keywords.push('role:lead');
	}
	if (lowerQuestion.includes('maintainer') || lowerQuestion.includes('reviewer') || lowerQuestion.includes('review')) {
		keywords.push('role:maintainer');
	}
	if (lowerQuestion.includes('contributor') || lowerQuestion.includes('member') || lowerQuestion.includes('team member')) {
		keywords.push('role:contributor');
	}

	// Operational keywords
	if (lowerQuestion.includes('communication') || lowerQuestion.includes('slack') || lowerQuestion.includes('channel')) {
		keywords.push('communication');
	}
	if (lowerQuestion.includes('escalation') || lowerQuestion.includes('incident') || lowerQuestion.includes('on-call')) {
		keywords.push('escalation');
	}
	if (lowerQuestion.includes('review') || lowerQuestion.includes('assignment') || lowerQuestion.includes('pr')) {
		keywords.push('review');
	}

	return keywords;
}

// [AI.TEAM.SECTIONS.RG:IMPLEMENTATION] Fetch relevant sections using ripgrep
/**
 * Fetch relevant sections from TEAM.md based on keywords
 */
export async function fetchRelevantSections(keywords: string[]): Promise<Array<{ section: string; marker: string; relevance: number }>> {
	const sections: Array<{ section: string; marker: string; relevance: number }> = [];

	for (const keyword of keywords) {
		try {
			const result = await executeTeamInfoTool({ query: keyword });
			if (result.section) {
				// Calculate relevance based on match count and contacts
				const relevance = result.matches.length * 10 + (result.contacts?.length || 0) * 5;
				
				sections.push({
					section: result.section,
					marker: result.relatedMarkers?.[0] || keyword,
					relevance,
				});
			}
		} catch (error) {
			// Skip failed queries
			console.warn(`[AI.TEAM.SECTIONS.RG:WARNING] Failed to fetch section for keyword "${keyword}":`, error);
		}
	}

	// Sort by relevance
	return sections.sort((a, b) => b.relevance - a.relevance);
}

// [AI.TEAM.QUERY.RG:IMPLEMENTATION] Query team knowledge via AI
/**
 * Query team knowledge using AI agent (Claude) with TEAM.md context
 * 
 * Note: Requires ANTHROPIC_API_KEY environment variable
 */
export async function queryTeamKnowledge(question: string): Promise<AITeamQueryResult> {
	// Extract keywords from question
	const keywords = extractKeywords(question);

	// Fetch relevant sections from TEAM.md
	const relevantSections = await fetchRelevantSections(keywords);

	if (relevantSections.length === 0) {
		return {
			answer: 'No relevant team information found for your question.',
			sources: [],
			confidence: 0,
		};
	}

	// Build context for AI
	const context = relevantSections.map(s => s.section).join('\n\n---\n\n');
	const contacts = new Set<string>();
	relevantSections.forEach(s => {
		const contactMatches = s.section.match(/@[a-zA-Z0-9_-]+/g);
		if (contactMatches) {
			contactMatches.forEach(c => contacts.add(c));
		}
	});

	// Check if Anthropic SDK is available
	let aiAnswer = '';
	let confidence = 0.5;

	try {
		// Dynamic import to avoid requiring @anthropic-ai/sdk as a hard dependency
		const { default: Anthropic } = await import('@anthropic-ai/sdk');
		const apiKey = process.env.ANTHROPIC_API_KEY;

		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY environment variable not set');
		}

		const anthropic = new Anthropic({ apiKey });

		// Query Claude with context
		const response = await anthropic.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 1024,
			messages: [{
				role: 'user',
				content: `Based on the following team structure information from TEAM.md:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer based on the team structure information provided.`
			}]
		});

		if (response.content[0].type === 'text') {
			aiAnswer = response.content[0].text;
			// Calculate confidence based on number of relevant sources
			confidence = Math.min(1.0, 0.5 + (relevantSections.length * 0.1));
		}
	} catch (error: any) {
		// Fallback: provide answer based on extracted sections
		if (error.message?.includes('ANTHROPIC_API_KEY')) {
			console.warn('[AI.TEAM.QUERY.RG:WARNING] Anthropic API key not configured, using fallback answer');
		} else {
			console.warn('[AI.TEAM.QUERY.RG:WARNING] AI query failed:', error.message);
		}

		// Generate fallback answer from sections
		aiAnswer = `Based on the team structure:\n\n${relevantSections.map((s, i) => `${i + 1}. ${s.section.substring(0, 200)}...`).join('\n\n')}`;
		confidence = 0.7; // Lower confidence for fallback
	}

	return {
		answer: aiAnswer,
		sources: relevantSections.map(s => ({
			section: s.section.substring(0, 500), // Truncate for response
			marker: s.marker,
			relevance: s.relevance,
		})),
		contacts: Array.from(contacts),
		confidence,
	};
}

// [AI.TEAM.INCIDENT.ROUTING.RG:IMPLEMENTATION] AI-assisted incident routing
/**
 * Use AI to determine incident routing based on error context
 */
export async function routeIncidentWithAI(errorContext: {
	code: string;
	message: string;
	source: string;
	stack?: string;
}): Promise<{
	department: string;
	contacts: string[];
	reasoning: string;
}> {
	const question = `An error occurred: ${errorContext.code} - ${errorContext.message} from ${errorContext.source}. Which department should handle this incident and who should be contacted?`;

	const result = await queryTeamKnowledge(question);

	// Extract department from answer
	const departmentMatch = result.answer.match(/department[:\s]+(\w+)/i);
	const department = departmentMatch ? departmentMatch[1] : 'escalation';

	return {
		department,
		contacts: result.contacts || [],
		reasoning: result.answer,
	};
}
