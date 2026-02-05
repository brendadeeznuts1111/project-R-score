#!/usr/bin/env bun
/**
 * @fileoverview Team Organization Verification & Synchronization
 * @description Verifies and synchronizes team structure across all data sources
 * @module scripts/verify-team-organization
 *
 * [[TECH][MODULE][INTEGRATION][META:{blueprint=BP-TEAM-ORGANIZATION@1.3.3;instance-id=TEAM-ORG-VERIFICATION-001;version=1.3.3}]
 * [PROPERTIES:{integration={value:"team-structure-verification";@root:"14.0.0.0.0.0.0";@chain:["BP-MLGS-DEBUGGING","BP-BUN-API"];@version:"1.3.3"}}]
 * [CLASS:TeamOrganizationVerification][#REF:v-1.3.3.BP.TEAM.ORGANIZATION.1.0.A.1.1.DOC.1.1]]
 *
 * Usage:
 *   bun run scripts/verify-team-organization.ts
 *   bun run scripts/verify-team-organization.ts --sync
 *   bun run scripts/verify-team-organization.ts --team platform_tools
 *   bun run scripts/verify-team-organization.ts --report
 */

import { RSS_TEAM_CATEGORIES } from '../src/utils/rss-constants';

interface TeamMember {
	name: string;
	role: 'Team Lead' | 'Maintainer';
	team: 'sports' | 'markets' | 'platform';
	packages: string[];
	type: 'team-lead' | 'maintainer';
	telegram?: string;
	supergroup?: string;
	topic?: string;
	miniAppPort?: number;
}

interface PackageOwnership {
	name: string;
	team: string;
	lead: string;
	maintainer: string;
	scope: string;
}

interface TeamStructure {
	people: TeamMember[];
	packages: PackageOwnership[];
	teams: Array<{
		name: string;
		id: string;
		lead: string;
		members: number;
	}>;
}

/**
 * Source of truth: Team structure from dashboard
 */
const SOURCE_OF_TRUTH: TeamStructure = {
	people: [
		{
			name: 'Alex Chen',
			role: 'Team Lead',
			team: 'sports',
			packages: ['@graph/layer4', '@graph/layer3'],
			type: 'team-lead',
			telegram: '@alexchen',
			supergroup: '#sports-correlation',
			topic: 'Topic 2: Live Alerts',
			miniAppPort: 4001,
		},
		{
			name: 'Jordan Lee',
			role: 'Maintainer',
			team: 'sports',
			packages: ['@graph/layer4'],
			type: 'maintainer',
			telegram: '@jordanlee',
		},
		{
			name: 'Priya Patel',
			role: 'Maintainer',
			team: 'sports',
			packages: ['@graph/layer3'],
			type: 'maintainer',
			telegram: '@priyapatel',
		},
		{
			name: 'Sarah Kumar',
			role: 'Team Lead',
			team: 'markets',
			packages: ['@graph/layer2', '@graph/layer1'],
			type: 'team-lead',
			telegram: '@sarahkumar',
			supergroup: '#market-analytics',
			topic: 'Topic 3: Arbitrage',
			miniAppPort: 4002,
		},
		{
			name: 'Tom Wilson',
			role: 'Maintainer',
			team: 'markets',
			packages: ['@graph/layer2'],
			type: 'maintainer',
			telegram: '@tomwilson',
		},
		{
			name: 'Lisa Zhang',
			role: 'Maintainer',
			team: 'markets',
			packages: ['@graph/layer1'],
			type: 'maintainer',
			telegram: '@lisazhang',
		},
		{
			name: 'Mike Rodriguez',
			role: 'Team Lead',
			team: 'platform',
			packages: ['@graph/algorithms', '@graph/storage', '@graph/utils', '@bench/*'],
			type: 'team-lead',
			telegram: '@mikerodriguez',
			supergroup: '#platform-tools',
			topic: 'Topic 4: Analytics',
			miniAppPort: 4003,
		},
		{
			name: 'David Kim',
			role: 'Maintainer',
			team: 'platform',
			packages: ['@graph/algorithms'],
			type: 'maintainer',
			telegram: '@davidkim',
		},
		{
			name: 'Emma Brown',
			role: 'Maintainer',
			team: 'platform',
			packages: ['@graph/storage', '@graph/streaming'],
			type: 'maintainer',
			telegram: '@emmabrown',
		},
		{
			name: 'Ryan Gupta',
			role: 'Maintainer',
			team: 'platform',
			packages: ['@bench/layer4', '@bench/layer3', '@bench/layer2', '@bench/layer1', '@bench/property', '@bench/stress'],
			type: 'maintainer',
			telegram: '@ryangupta',
		},
	],
	packages: [
		{ name: '@graph/layer4', team: 'sports', lead: 'Alex Chen', maintainer: 'Jordan Lee', scope: 'Cross-sport anomaly detection' },
		{ name: '@graph/layer3', team: 'sports', lead: 'Alex Chen', maintainer: 'Priya Patel', scope: 'Cross-event temporal patterns' },
		{ name: '@graph/layer2', team: 'markets', lead: 'Sarah Kumar', maintainer: 'Tom Wilson', scope: 'Cross-market correlation' },
		{ name: '@graph/layer1', team: 'markets', lead: 'Sarah Kumar', maintainer: 'Lisa Zhang', scope: 'Direct selection correlations' },
		{ name: '@graph/algorithms', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'David Kim', scope: 'Statistical models library' },
		{ name: '@graph/storage', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Emma Brown', scope: 'Graph state persistence' },
		{ name: '@graph/streaming', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Emma Brown', scope: 'WebSocket data ingestion' },
		{ name: '@graph/utils', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Mike Rodriguez', scope: 'Error wrapper & utilities' },
		{ name: '@bench/layer4', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Sport correlation benchmarks' },
		{ name: '@bench/layer3', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Event temporal benchmarks' },
		{ name: '@bench/layer2', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Market efficiency benchmarks' },
		{ name: '@bench/layer1', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Price correlation benchmarks' },
		{ name: '@bench/property', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Property iteration engine' },
		{ name: '@bench/stress', team: 'platform', lead: 'Mike Rodriguez', maintainer: 'Ryan Gupta', scope: 'Load & scale tests' },
	],
	teams: [
		{ name: 'Sports Correlation', id: 'sports', lead: 'Alex Chen', members: 3 },
		{ name: 'Market Analytics', id: 'markets', lead: 'Sarah Kumar', members: 3 },
		{ name: 'Platform & Tools', id: 'platform', lead: 'Mike Rodriguez', members: 4 },
	],
};

interface VerificationIssue {
	type: 'missing' | 'mismatch' | 'extra' | 'inconsistent';
	source: string;
	field: string;
	expected?: any;
	actual?: any;
	severity: 'error' | 'warning' | 'info';
}

interface VerificationResult {
	team?: string;
	issues: VerificationIssue[];
	summary: {
		total: number;
		errors: number;
		warnings: number;
		info: number;
	};
}

/**
 * Verify RSS team categories match source of truth
 */
function verifyRSSTeamCategories(): VerificationIssue[] {
	const issues: VerificationIssue[] = [];

	for (const [teamId, team] of Object.entries(RSS_TEAM_CATEGORIES)) {
		const sourceTeam = SOURCE_OF_TRUTH.teams.find(t => {
			const idMap: Record<string, string> = {
				sports_correlation: 'sports',
				market_analytics: 'markets',
				platform_tools: 'platform',
			};
			return t.id === idMap[teamId];
		});

		if (!sourceTeam) {
			issues.push({
				type: 'missing',
				source: 'RSS_TEAM_CATEGORIES',
				field: `team.${teamId}`,
				severity: 'error',
			});
			continue;
		}

		// Verify team lead email matches name
		const expectedLead = SOURCE_OF_TRUTH.people.find(p => p.name === sourceTeam.lead && p.type === 'team-lead');
		if (expectedLead) {
			const expectedEmail = team.team_lead.toLowerCase();
			const nameParts = expectedLead.name.toLowerCase().split(' ');
			const expectedEmailPattern = `${nameParts[0]}.${nameParts[1]}@yourcompany.com`;
			
			if (!expectedEmail.includes(nameParts[0]) || !expectedEmail.includes(nameParts[1])) {
				issues.push({
					type: 'mismatch',
					source: 'RSS_TEAM_CATEGORIES',
					field: `${teamId}.team_lead`,
					expected: expectedEmailPattern,
					actual: team.team_lead,
					severity: 'warning',
				});
			}
		}

		// Verify packages match
		const sourcePackages = SOURCE_OF_TRUTH.packages
			.filter(p => p.team === sourceTeam.id)
			.map(p => p.name);
		
		const rssPackages = team.packages || [];
		const missingPackages = sourcePackages.filter(p => !rssPackages.some(rp => p.includes(rp.replace('/*', ''))));
		const extraPackages = rssPackages.filter(rp => {
			const normalized = rp.replace('/*', '');
			return !sourcePackages.some(sp => sp.includes(normalized));
		});

		missingPackages.forEach(pkg => {
			issues.push({
				type: 'missing',
				source: 'RSS_TEAM_CATEGORIES',
				field: `${teamId}.packages`,
				expected: pkg,
				severity: 'warning',
			});
		});

		extraPackages.forEach(pkg => {
			issues.push({
				type: 'extra',
				source: 'RSS_TEAM_CATEGORIES',
				field: `${teamId}.packages`,
				actual: pkg,
				severity: 'info',
			});
		});
	}

	return issues;
}

/**
 * Verify registry team access matches source of truth
 */
async function verifyRegistryTeamAccess(): Promise<VerificationIssue[]> {
	const issues: VerificationIssue[] = [];

	try {
		const registryFile = Bun.file('src/api/registry-team-access.ts');
		if (!(await registryFile.exists())) {
			issues.push({
				type: 'missing',
				source: 'registry-team-access.ts',
				field: 'file',
				severity: 'error',
			});
			return issues;
		}

		const content = await registryFile.text();
		
		// Check for TEAM_PACKAGES consistency
		for (const team of SOURCE_OF_TRUTH.teams) {
			const teamIdMap: Record<string, string> = {
				sports: 'sports-correlation',
				markets: 'market-analytics',
				platform: 'platform-tools',
			};
			const registryTeamId = teamIdMap[team.id];
			
			if (registryTeamId) {
				const sourcePackages = SOURCE_OF_TRUTH.packages
					.filter(p => p.team === team.id)
					.map(p => p.name);
				
				// Check if packages are mentioned in registry file
				sourcePackages.forEach(pkg => {
					if (!content.includes(pkg)) {
						issues.push({
							type: 'missing',
							source: 'registry-team-access.ts',
							field: `TEAM_PACKAGES.${registryTeamId}`,
							expected: pkg,
							severity: 'warning',
						});
					}
				});
			}
		}

		// Check PACKAGE_MAINTAINERS consistency
		for (const pkg of SOURCE_OF_TRUTH.packages) {
			const maintainer = SOURCE_OF_TRUTH.people.find(p => 
				p.packages.includes(pkg.name) && p.type === 'maintainer'
			);
			
			if (maintainer) {
				const expectedEmail = maintainer.name.toLowerCase().split(' ').join('.') + '@yourcompany.com';
				if (!content.includes(expectedEmail) && !content.includes(maintainer.name.toLowerCase().replace(' ', '.'))) {
					issues.push({
						type: 'missing',
						source: 'registry-team-access.ts',
						field: `PACKAGE_MAINTAINERS.${pkg.name}`,
						expected: expectedEmail,
						severity: 'warning',
					});
				}
			}
		}
	} catch (error: any) {
		issues.push({
			type: 'error',
			source: 'registry-team-access.ts',
			field: 'verification',
			actual: error.message,
			severity: 'error',
		});
	}

	return issues;
}

/**
 * Verify dashboard HTML team data matches source of truth
 */
async function verifyDashboardHTML(): Promise<VerificationIssue[]> {
	const issues: VerificationIssue[] = [];

	try {
		const dashboardFile = Bun.file('dashboard/team-organization.html');
		if (!(await dashboardFile.exists())) {
			issues.push({
				type: 'missing',
				source: 'team-organization.html',
				field: 'file',
				severity: 'error',
			});
			return issues;
		}

		const content = await dashboardFile.text();

		// Verify all team members are present
		for (const person of SOURCE_OF_TRUTH.people) {
			if (!content.includes(person.name)) {
				issues.push({
					type: 'missing',
					source: 'team-organization.html',
					field: `people.${person.name}`,
					expected: person.name,
					severity: 'error',
				});
			}

			// Verify packages are mentioned
			person.packages.forEach(pkg => {
				if (!content.includes(pkg)) {
					issues.push({
						type: 'missing',
						source: 'team-organization.html',
						field: `people.${person.name}.packages`,
						expected: pkg,
						severity: 'warning',
					});
				}
			});
		}

		// Verify all packages are present
		for (const pkg of SOURCE_OF_TRUTH.packages) {
			if (!content.includes(pkg.name)) {
				issues.push({
					type: 'missing',
					source: 'team-organization.html',
					field: `packages.${pkg.name}`,
					expected: pkg.name,
					severity: 'error',
				});
			}
		}
	} catch (error: any) {
		issues.push({
			type: 'error',
			source: 'team-organization.html',
			field: 'verification',
			actual: error.message,
			severity: 'error',
		});
	}

	return issues;
}

/**
 * Run all verifications
 */
async function verifyAll(teamFilter?: string): Promise<VerificationResult[]> {
	const results: VerificationResult[] = [];

	// Verify RSS team categories
	const rssIssues = verifyRSSTeamCategories();
	if (!teamFilter || teamFilter === 'all') {
		results.push({
			issues: rssIssues,
			summary: {
				total: rssIssues.length,
				errors: rssIssues.filter(i => i.severity === 'error').length,
				warnings: rssIssues.filter(i => i.severity === 'warning').length,
				info: rssIssues.filter(i => i.severity === 'info').length,
			},
		});
	}

	// Verify registry team access
	const registryIssues = await verifyRegistryTeamAccess();
	if (!teamFilter || teamFilter === 'all') {
		results.push({
			team: 'registry',
			issues: registryIssues,
			summary: {
				total: registryIssues.length,
				errors: registryIssues.filter(i => i.severity === 'error').length,
				warnings: registryIssues.filter(i => i.severity === 'warning').length,
				info: registryIssues.filter(i => i.severity === 'info').length,
			},
		});
	}

	// Verify dashboard HTML
	const dashboardIssues = await verifyDashboardHTML();
	if (!teamFilter || teamFilter === 'all') {
		results.push({
			team: 'dashboard',
			issues: dashboardIssues,
			summary: {
				total: dashboardIssues.length,
				errors: dashboardIssues.filter(i => i.severity === 'error').length,
				warnings: dashboardIssues.filter(i => i.severity === 'warning').length,
				info: dashboardIssues.filter(i => i.severity === 'info').length,
			},
		});
	}

	return results;
}

/**
 * Generate verification report
 */
function generateReport(results: VerificationResult[]): string {
	let report = '# Team Organization Verification Report\n\n';
	report += `Generated: ${new Date().toISOString()}\n\n`;

	const totalIssues = results.reduce((sum, r) => sum + r.summary.total, 0);
	const totalErrors = results.reduce((sum, r) => sum + r.summary.errors, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.summary.warnings, 0);

	report += `## Summary\n\n`;
	report += `- **Total Issues:** ${totalIssues}\n`;
	report += `- **Errors:** ${totalErrors}\n`;
	report += `- **Warnings:** ${totalWarnings}\n`;
	report += `- **Info:** ${results.reduce((sum, r) => sum + r.summary.info, 0)}\n\n`;

	if (totalIssues === 0) {
		report += `✅ **All verifications passed!**\n\n`;
	} else {
		report += `## Issues by Source\n\n`;

		for (const result of results) {
			if (result.issues.length === 0) continue;

			const source = result.team || 'RSS_TEAM_CATEGORIES';
			report += `### ${source}\n\n`;

			const errors = result.issues.filter(i => i.severity === 'error');
			const warnings = result.issues.filter(i => i.severity === 'warning');
			const info = result.issues.filter(i => i.severity === 'info');

			if (errors.length > 0) {
				report += `#### 🔴 Errors (${errors.length})\n\n`;
				errors.forEach(issue => {
					report += `- **${issue.field}**: ${issue.type}`;
					if (issue.expected) report += ` (expected: ${issue.expected})`;
					if (issue.actual) report += ` (actual: ${issue.actual})`;
					report += `\n`;
				});
				report += `\n`;
			}

			if (warnings.length > 0) {
				report += `#### 🟡 Warnings (${warnings.length})\n\n`;
				warnings.forEach(issue => {
					report += `- **${issue.field}**: ${issue.type}`;
					if (issue.expected) report += ` (expected: ${issue.expected})`;
					if (issue.actual) report += ` (actual: ${issue.actual})`;
					report += `\n`;
				});
				report += `\n`;
			}

			if (info.length > 0) {
				report += `#### ℹ️ Info (${info.length})\n\n`;
				info.forEach(issue => {
					report += `- **${issue.field}**: ${issue.type}`;
					if (issue.actual) report += ` (${issue.actual})`;
					report += `\n`;
				});
				report += `\n`;
			}
		}
	}

	return report;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { sync?: boolean; team?: string; report?: boolean } {
	const args = process.argv.slice(2);
	const options: { sync?: boolean; team?: string; report?: boolean } = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if (arg === '--sync') {
			options.sync = true;
		} else if (arg === '--team' && nextArg) {
			options.team = nextArg;
			i++;
		} else if (arg === '--report') {
			options.report = true;
		}
	}

	return options;
}

// CLI entry point
if (import.meta.main) {
	const options = parseArgs();

	(async () => {
		try {
			const results = await verifyAll(options.team);

			if (options.report) {
				const report = generateReport(results);
				console.log(report);
				
				// Save report to file
				const reportFile = Bun.file('team-organization-verification-report.md');
				await Bun.write(reportFile, report);
				console.log(`\n📄 Report saved to: team-organization-verification-report.md`);
			} else {
				// Print summary
				const totalIssues = results.reduce((sum, r) => sum + r.summary.total, 0);
				const totalErrors = results.reduce((sum, r) => sum + r.summary.errors, 0);
				const totalWarnings = results.reduce((sum, r) => sum + r.summary.warnings, 0);

				console.log('\n📊 Team Organization Verification Results\n');
				console.log(`Total Issues: ${totalIssues}`);
				console.log(`  🔴 Errors: ${totalErrors}`);
				console.log(`  🟡 Warnings: ${totalWarnings}`);
				console.log(`  ℹ️  Info: ${results.reduce((sum, r) => sum + r.summary.info, 0)}\n`);

				if (totalIssues > 0) {
					console.log('Issues found:\n');
					for (const result of results) {
						if (result.issues.length > 0) {
							const source = result.team || 'RSS_TEAM_CATEGORIES';
							console.log(`${source}:`);
							result.issues.forEach(issue => {
								const emoji = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
								console.log(`  ${emoji} ${issue.field}: ${issue.type}`);
								if (issue.expected) console.log(`     Expected: ${issue.expected}`);
								if (issue.actual) console.log(`     Actual: ${issue.actual}`);
							});
							console.log('');
						}
					}
					console.log('Run with --report to generate detailed markdown report');
				} else {
					console.log('✅ All verifications passed!');
				}
			}

			if (options.sync) {
				console.log('\n🔄 Synchronization not yet implemented');
				console.log('Use --report to see what needs to be synchronized');
			}

			const totalErrors = results.reduce((sum, r) => sum + r.summary.errors, 0);
			process.exit(totalErrors > 0 ? 1 : 0);
		} catch (error: any) {
			console.error(`❌ Verification failed: ${error.message}`);
			if (error.stack) {
				console.error(error.stack);
			}
			process.exit(1);
		}
	})();
}



