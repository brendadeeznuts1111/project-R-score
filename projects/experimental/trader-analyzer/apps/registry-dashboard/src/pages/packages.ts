/**
 * @fileoverview Registry Dashboard: Packages Listing Page
 * @description Team-filterable package listing with Telegram integration
 * @module apps/registry-dashboard/src/pages/packages
 */

import { MARKET_FILTERS } from '@graph/types/market';
import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import { renderMarketFilter } from '../components/market-filter';

// Team data mapping with Telegram topics
const TEAM_DATA = {
	'sports-correlation': {
		name: 'Sports Correlation',
		emoji: '🏀',
		packages: ['@graph/layer4', '@graph/layer3'],
		teamLead: 'alex.chen@yourcompany.com',
		telegramTopicId: 1,
		color: '#667eea',
	},
	'market-analytics': {
		name: 'Market Analytics',
		emoji: '📊',
		packages: ['@graph/layer2', '@graph/layer1'],
		teamLead: 'sarah.kumar@yourcompany.com',
		telegramTopicId: 3,
		color: '#f093fb',
	},
	'platform-tools': {
		name: 'Platform & Tools',
		emoji: '🔧',
		packages: [
			'@graph/algorithms',
			'@graph/storage',
			'@graph/streaming',
			'@graph/utils',
			'@bench/*',
		],
		teamLead: 'mike.rodriguez@yourcompany.com',
		telegramTopicId: 5,
		color: '#4facfe',
	},
} as const;

const app = new Elysia();

// Helper to escape HTML
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

app.get('/packages', async () => {
	const db = new Database('registry.db');

	// Get all packages
	const packages = db
		.prepare(
			`
		SELECT p.*, pt.team, pt.team_lead, pt.maintainer 
		FROM packages p
		LEFT JOIN package_teams pt ON p.name = pt.package_name
		ORDER BY p.name ASC
	`
		)
		.all() as Array<{
		name: string;
		version: string;
		description?: string;
		timestamp: number;
		team?: string;
		team_lead?: string;
		maintainer?: string;
	}>;

	// Generate package cards with data-package attribute for filtering
	const packageCards = packages
		.map(
			(pkg) => `
		<div class="package-card" data-package="${escapeHtml(pkg.name)}" style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #007bff;">
			<h3 style="margin-top: 0; color: #007bff;">${escapeHtml(pkg.name)}</h3>
			<p><strong>Version:</strong> ${escapeHtml(pkg.version)}</p>
			${pkg.description ? `<p>${escapeHtml(pkg.description)}</p>` : ''}
			${pkg.team ? `<p><strong>Team:</strong> ${escapeHtml(pkg.team)}</p>` : ''}
			${pkg.maintainer ? `<p><strong>Maintainer:</strong> ${escapeHtml(pkg.maintainer)}</p>` : ''}
			<a href="/package/${encodeURIComponent(pkg.name)}" style="color: #007bff; text-decoration: none; font-weight: 500;">View Details →</a>
		</div>
	`
		)
		.join('');

	// Generate filter tabs
	const filterTabs = `
		<button class="filter-tab active" data-team="all" onclick="filterTeam('all')">All Teams</button>
		${Object.entries(TEAM_DATA)
			.map(
				([key, team]) => `
			<button class="filter-tab" data-team="${key}" onclick="filterTeam('${key}')">
				${team.emoji} ${team.name}
			</button>
		`
			)
			.join('')}
	`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Packages - Registry Dashboard</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			margin: 0;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			max-width: 1200px;
			margin: 0 auto;
			background: white;
			border-radius: 8px;
			padding: 30px;
		}
		h1 {
			color: #333;
			border-bottom: 2px solid #007bff;
			padding-bottom: 10px;
		}
		.filter-tabs {
			display: flex;
			gap: 0.5rem;
			margin: 20px 0;
			flex-wrap: wrap;
		}
		.filter-tab {
			padding: 0.5rem 1rem;
			background: #f8f9fa;
			border: 1px solid #dee2e6;
			border-radius: 6px;
			cursor: pointer;
			font-size: 0.9rem;
			transition: all 0.2s;
			color: #333;
			font-weight: 500;
		}
		.filter-tab:hover {
			background: #e9ecef;
			border-color: #007bff;
		}
		.filter-tab.active {
			background: #007bff;
			border-color: #007bff;
			color: white;
			font-weight: 600;
		}
		#team-info-panel {
			margin: 20px 0;
			padding: 20px;
			background: #f8f9fa;
			border-radius: 8px;
		}
		.package-card {
			transition: opacity 0.3s ease, transform 0.3s ease;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📦 Packages</h1>
		
		<div class="filter-tabs" role="tablist" aria-label="Filter teams">
			${filterTabs}
		</div>
		
		${renderMarketFilter()}
		
		<div id="team-info-panel"></div>
		
		<div id="packages-list">
			${packageCards || '<p>No packages found</p>'}
		</div>
	</div>
	
	<script>
		// Inline team filter script (since ES modules may not work in all contexts)
		(function() {
			const TEAM_DATA = ${JSON.stringify(TEAM_DATA)};
			const MARKET_FILTERS = ${JSON.stringify(MARKET_FILTERS)};
			const TELEGRAM_SUPERGROUP_ID = -1001234567890;
			
			function filterTeam(team) {
				if (team === 'all') {
					document.querySelectorAll('.package-card').forEach(card => {
						card.style.display = 'block';
					});
					document.querySelectorAll('.filter-tab').forEach(btn => {
						btn.classList.remove('active');
					});
					document.querySelector('[data-team="all"]')?.classList.add('active');
					document.getElementById('team-info-panel').innerHTML = '';
					return;
				}
				
				const teamInfo = TEAM_DATA[team];
				if (!teamInfo) return;
				
				document.querySelectorAll('.package-card').forEach(card => {
					const packageName = card.getAttribute('data-package');
					if (packageName && teamInfo.packages.some(p => {
						if (p.endsWith('/*')) {
							return packageName.startsWith(p.slice(0, -2));
						}
						return packageName.startsWith(p);
					})) {
						card.style.display = 'block';
					} else {
						card.style.display = 'none';
					}
				});
				
				document.querySelectorAll('.filter-tab').forEach(btn => {
					btn.classList.remove('active');
				});
				document.querySelector(\`[data-team="\${team}"]\`)?.classList.add('active');
				
				const panel = document.getElementById('team-info-panel');
				if (panel) {
					const telegramUrl = \`https://t.me/c/\${Math.abs(TELEGRAM_SUPERGROUP_ID)}/\${teamInfo.telegramTopicId}\`;
					panel.innerHTML = \`
						<div class="team-header" style="background: \${teamInfo.color}; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
							<h2>\${teamInfo.emoji} \${teamInfo.name}</h2>
							<p><strong>Team Lead:</strong> \${teamInfo.teamLead}</p>
							<p><strong>Packages:</strong> \${teamInfo.packages.length}</p>
						</div>
						<div class="team-actions" style="display: flex; flex-direction: column; gap: 10px;">
							<a href="\${telegramUrl}" target="_blank" class="telegram-btn" style="background: #0088cc; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; text-align: center; display: inline-block;">
								💬 Open Telegram Topic
							</a>
							<button class="benchmark-btn" onclick="runTeamBenchmark('\${teamInfo.packages[0]}')" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
								🏃 Run Team Benchmark
							</button>
							<button class="rfc-btn" onclick="createRFC('\${teamInfo.packages[0]}')" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
								📝 Submit Team RFC
							</button>
						</div>
					\`;
				}
			}
			
			async function runTeamBenchmark(packageName) {
				try {
					const response = await fetch('/api/benchmark/run', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ package: packageName })
					});
					const result = await response.json();
					if (result.success) {
						alert(\`✅ Benchmark started for \${packageName}!\\nJob ID: \${result.jobId}\`);
					} else {
						alert(\`❌ Benchmark failed: \${result.error || 'Unknown error'}\`);
					}
				} catch (error) {
					alert(\`❌ Benchmark failed: \${error.message}\`);
				}
			}
			
			function createRFC(packageName) {
				// Use relative URL for same-origin
				const url = \`/rfcs/new?package=\${encodeURIComponent(packageName)}\`;
				window.open(url, '_blank');
			}
			
			window.filterTeam = filterTeam;
			window.runTeamBenchmark = runTeamBenchmark;
			window.createRFC = createRFC;
			
			// Initialize market filter functions
			window.applyMarketFilter = function() {
				const marketType = document.getElementById('market-type-filter')?.value || '';
				const subMarket = document.getElementById('submarket-filter')?.value || '';
				const pattern = document.getElementById('pattern-filter')?.value || '';
				const minConfidence = parseFloat(document.getElementById('confidence-filter')?.value || '0.5');
				
				const cards = document.querySelectorAll('.package-card');
				let visibleCount = 0;
				
				cards.forEach(card => {
					const packageName = card.getAttribute('data-package');
					if (!packageName) return;
					
					const TEAM_DATA = ${JSON.stringify(TEAM_DATA)};
					const MARKET_FILTERS = ${JSON.stringify(MARKET_FILTERS)};
					
					let supportsMarket = true;
					let supportsSubMarket = true;
					let supportsPattern = true;
					
					if (marketType && MARKET_FILTERS.types[marketType]) {
						supportsMarket = MARKET_FILTERS.types[marketType].packages.includes(packageName);
					}
					
					if (subMarket) {
						const [sport, league] = subMarket.split(':');
						if (MARKET_FILTERS.subMarkets[sport] && MARKET_FILTERS.subMarkets[sport][league]) {
							supportsSubMarket = MARKET_FILTERS.subMarkets[sport][league].packages.includes(packageName);
						} else {
							supportsSubMarket = false;
						}
					}
					
					if (pattern && MARKET_FILTERS.patterns[pattern]) {
						supportsPattern = MARKET_FILTERS.patterns[pattern].packages.includes(packageName);
					}
					
					if (supportsMarket && supportsSubMarket && supportsPattern) {
						card.style.display = 'block';
						card.style.opacity = '1';
						visibleCount++;
					} else {
						card.style.display = 'none';
						card.style.opacity = '0';
					}
				});
				
				const resultsEl = document.getElementById('filter-results-count');
				if (resultsEl) {
					const totalCount = cards.length;
					resultsEl.textContent = \`\${visibleCount} of \${totalCount} packages visible\`;
				}
			};
			
			window.updateConfidenceValue = function(value) {
				const el = document.getElementById('confidence-value');
				if (el) el.textContent = value;
			};
			
			window.clearMarketFilters = function() {
				document.getElementById('market-type-filter').value = '';
				document.getElementById('submarket-filter').value = '';
				document.getElementById('pattern-filter').value = '';
				document.getElementById('confidence-filter').value = '0.5';
				window.updateConfidenceValue('0.5');
				
				document.querySelectorAll('.package-card').forEach(card => {
					card.style.display = 'block';
					card.style.opacity = '1';
				});
				
				const resultsEl = document.getElementById('filter-results-count');
				if (resultsEl) {
					const totalCount = document.querySelectorAll('.package-card').length;
					resultsEl.textContent = \`\${totalCount} packages visible\`;
				}
			};
			
			// Initialize to 'all'
			filterTeam('all');
			
			// Initialize filter results count
			const totalCount = document.querySelectorAll('.package-card').length;
			const resultsEl = document.getElementById('filter-results-count');
			if (resultsEl) {
				resultsEl.textContent = \`\${totalCount} packages visible\`;
			}
		})();
	</script>
</body>
</html>
	`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	});
});

export default app;
