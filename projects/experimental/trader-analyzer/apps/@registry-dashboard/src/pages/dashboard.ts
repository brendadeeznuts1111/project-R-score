#!/usr/bin/env bun

/**
 * Enhanced Team Dashboard with Market Filters
 * Provides filtering by team, market type, sub-market, and pattern
 */

import { getTopicInfo, TELEGRAM_SUPERGROUP_ID } from "@graph/telegram";
import { Elysia } from "elysia";
import { GEOGRAPHIC_FILTER_JS, renderGeographicFilter, renderMapVisualization } from "../components/geographic-filter";
import { renderMarketFilter } from "../components/market-filter";
import { renderTestStatusCard } from "../components/test-status";

// TELEGRAM_SUPERGROUP_ID imported from @graph/telegram

const app = new Elysia()
	.get("/dashboard", async () => {
		const layer4Topic = getTopicInfo("@graph/layer4" as any);
		const layer3Topic = getTopicInfo("@graph/layer3" as any);
		const layer2Topic = getTopicInfo("@graph/layer2" as any);
		const layer1Topic = getTopicInfo("@graph/layer1" as any);

		const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Graph Engine: Team Dashboard</title>
	<meta name="viewport" content="width=device-width, initial-scale=1"/>
	<style>
		body { 
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
			margin: 0; 
			padding: 20px; 
			background: #f5f5f5; 
		}
		.container { 
			max-width: 1400px; 
			margin: 0 auto; 
		}
		.header { 
			text-align: center; 
			margin-bottom: 30px; 
		}
		.header h1 { 
			color: #333; 
		}
		
		/* Filter tabs */
		.filter-tabs { 
			display: flex; 
			gap: 10px; 
			margin-bottom: 20px; 
			flex-wrap: wrap; 
		}
		.filter-tab {
			padding: 10px 20px;
			border: 2px solid #ddd;
			background: white;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			transition: all 0.3s;
		}
		.filter-tab.active {
			border-color: #667eea;
			background: #667eea;
			color: white;
		}
		
		/* Market filter bar */
		.market-filter-bar {
			background: white;
			padding: 20px;
			border-radius: 12px;
			margin: 20px 0;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		.filter-group {
			display: inline-block;
			margin: 0 15px 15px 0;
		}
		.filter-group label {
			display: block;
			margin-bottom: 5px;
			font-weight: 600;
			color: #555;
		}
		.filter-group select, .filter-group input {
			padding: 8px 12px;
			border: 1px solid #ddd;
			border-radius: 6px;
			font-size: 14px;
		}
		.clear-filters-btn, .apply-filters-btn {
			padding: 10px 20px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			margin: 5px;
		}
		.clear-filters-btn {
			background: #6c757d;
			color: white;
		}
		.apply-filters-btn {
			background: #28a745;
			color: white;
		}
		.filter-results {
			text-align: right;
			color: #666;
			margin-top: 10px;
		}
		
		/* Packages grid */
		.packages-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
			gap: 20px;
		}
		.package-card {
			background: white;
			padding: 20px;
			border-radius: 12px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			border-left: 4px solid #667eea;
			transition: transform 0.2s;
		}
		.package-card:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		}
		.package-card.hidden {
			display: none;
		}
		.package-card h3 {
			margin-top: 0;
			color: #333;
		}
		.package-meta {
			font-size: 14px;
			color: #666;
			margin: 10px 0;
		}
		.confidence-indicator {
			display: inline-block;
			padding: 2px 8px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: bold;
			margin-left: 5px;
		}
		.package-actions {
			margin-top: 15px;
		}
		.telegram-btn {
			background: #0088cc;
			color: white;
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			text-decoration: none;
			display: inline-block;
			font-size: 14px;
			margin: 2px;
		}
		.benchmark-btn {
			background: #28a745;
			color: white;
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			margin: 2px;
		}
		.rfc-btn {
			background: #ffc107;
			color: #000;
			padding: 8px 16px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			margin: 2px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>📊 Graph Engine Team Dashboard</h1>
			<p>Filter by team, market, sub-market, and anomaly patterns</p>
		</div>
		
		<!-- Team Filter Tabs -->
		<div class="filter-tabs">
			<button class="filter-tab active" data-team="sports-correlation" onclick="filterTeam('sports-correlation')">🏀 Sports Correlation</button>
			<button class="filter-tab" data-team="market-analytics" onclick="filterTeam('market-analytics')">📊 Market Analytics</button>
			<button class="filter-tab" data-team="platform-tools" onclick="filterTeam('platform-tools')">🔧 Platform & Tools</button>
			<button class="filter-tab" data-team="all" onclick="filterTeam('all')">All Teams</button>
		</div>
		
		<!-- Market Filters -->
		${renderMarketFilter()}
		
		<!-- Geographic Filters -->
		${renderGeographicFilter()}
		
		<!-- Map Visualization -->
		${renderMapVisualization()}
		
		<!-- Test Status Cards -->
		<div id="test-status-section" style="margin: 30px 0;">
			<h2 style="color: #333; margin-bottom: 20px;">🧪 Test Status</h2>
			${renderTestStatusCard('correlation-detection', 'Correlation Detection')}
			${renderTestStatusCard('layer4-anomaly-detection', 'Layer 4 Anomaly Detection')}
		</div>
		
		<!-- Packages Grid -->
		<div class="packages-grid" id="packages-grid">
			<!-- Sports Correlation -->
			<div class="package-card visible" data-package="@graph/layer4" data-market-types="moneyline,spread,over_under" data-patterns="volume_spike,correlation_chain" data-bookmakers="bet365,pinnacle" data-regions="UK,Curacao" data-min-latency="12" data-max-latency="85">
				<h3>📦 @graph/layer4</h3>
				<div class="package-meta">
					<strong>Cross-Sport Anomaly Detection</strong><br/>
					Supports: Moneyline, Spread, Over/Under<br/>
					Patterns: Volume Spike, Correlation Chain<br/>
					Bookmakers: Bet365 (UK), Pinnacle (Curacao)<br/>
					<span class="confidence-indicator" style="background: #28a745; color: white;">90%</span> confidence
				</div>
				<p><strong>Maintainer:</strong> Jordan Lee</p>
				<div class="package-actions">
					<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/${layer4Topic?.topicId || 1}" class="telegram-btn" target="_blank">💬 Telegram</a>
					<button class="benchmark-btn" onclick="runTeamBenchmark('@graph/layer4')">🏃 Benchmark</button>
					<button class="rfc-btn" onclick="createRFC('@graph/layer4')">📝 RFC</button>
				</div>
			</div>
			
			<div class="package-card visible" data-package="@graph/layer3" data-sub-markets="soccer:premier_league,basketball:nba" data-patterns="odds_flip,market_suspension" data-bookmakers="bet365,betfair-asia" data-regions="UK,Asia-Pacific" data-min-latency="12" data-max-latency="120">
				<h3>📦 @graph/layer3</h3>
				<div class="package-meta">
					<strong>Cross-Event Temporal Patterns</strong><br/>
					Sub-Markets: Premier League, NBA<br/>
					Patterns: Odds Flip, Market Suspension<br/>
					Bookmakers: Bet365 (UK), Betfair Asia<br/>
					<span class="confidence-indicator" style="background: #ffc107; color: #000;">85%</span> confidence
				</div>
				<p><strong>Maintainer:</strong> Priya Patel</p>
				<div class="package-actions">
					<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/${layer3Topic?.topicId || 2}" class="telegram-btn" target="_blank">💬 Telegram</a>
					<button class="benchmark-btn" onclick="runTeamBenchmark('@graph/layer3')">🏃 Benchmark</button>
					<button class="rfc-btn" onclick="createRFC('@graph/layer3')">📝 RFC</button>
				</div>
			</div>
			
			<!-- Market Analytics -->
			<div class="package-card visible" data-package="@graph/layer2" data-market-types="moneyline,props" data-patterns="volume_spike" data-bookmakers="fanatics,draftkings" data-regions="US-East,US-West" data-min-latency="5" data-max-latency="8">
				<h3>📦 @graph/layer2</h3>
				<div class="package-meta">
					<strong>Cross-Market Analysis</strong><br/>
					Market Types: Moneyline, Props<br/>
					Patterns: Volume Spike<br/>
					Bookmakers: Fanatics (US-East), DraftKings (US-West)<br/>
					<span class="confidence-indicator" style="background: #28a745; color: white;">88%</span> confidence
				</div>
				<p><strong>Maintainer:</strong> Tom Wilson</p>
				<div class="package-actions">
					<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/${layer2Topic?.topicId || 3}" class="telegram-btn" target="_blank">💬 Telegram</a>
					<button class="benchmark-btn" onclick="runTeamBenchmark('@graph/layer2')">🏃 Benchmark</button>
					<button class="rfc-btn" onclick="createRFC('@graph/layer2')">📝 RFC</button>
				</div>
			</div>
			
			<div class="package-card visible" data-package="@graph/layer1" data-market-types="moneyline,spread" data-patterns="temporal_pattern" data-bookmakers="fanatics" data-regions="US-East" data-min-latency="5" data-max-latency="5">
				<h3>📦 @graph/layer1</h3>
				<div class="package-meta">
					<strong>Direct Selection Correlations</strong><br/>
					Market Types: Moneyline, Spread<br/>
					Patterns: Temporal Pattern<br/>
					Bookmakers: Fanatics (US-East)<br/>
					<span class="confidence-indicator" style="background: #28a745; color: white;">87%</span> confidence
				</div>
				<p><strong>Maintainer:</strong> Lisa Zhang</p>
				<div class="package-actions">
					<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/${layer1Topic?.topicId || 4}" class="telegram-btn" target="_blank">💬 Telegram</a>
					<button class="benchmark-btn" onclick="runTeamBenchmark('@graph/layer1')">🏃 Benchmark</button>
					<button class="rfc-btn" onclick="createRFC('@graph/layer1')">📝 RFC</button>
				</div>
			</div>
			
			<!-- Platform Tools -->
			<div class="package-card visible" data-package="@bench/layer4" data-patterns="correlation_chain" data-bookmakers="bet365,pinnacle,fanatics" data-regions="UK,Curacao,US-East" data-min-latency="5" data-max-latency="85">
				<h3>📦 @bench/layer4</h3>
				<div class="package-meta">
					<strong>Sport Correlation Benchmarks</strong><br/>
					Patterns: Correlation Chain<br/>
					Benchmark Iterations: 50x<br/>
					Bookmakers: Bet365, Pinnacle, Fanatics<br/>
					<span class="confidence-indicator" style="background: #28a745; color: white;">95%</span> stability
				</div>
				<p><strong>Maintainer:</strong> Ryan Gupta</p>
				<div class="package-actions">
					<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/9" class="telegram-btn" target="_blank">💬 Telegram</a>
					<button class="benchmark-btn" onclick="runTeamBenchmark('@bench/layer4')">🏃 Benchmark</button>
					<button class="rfc-btn" onclick="createRFC('@bench/layer4')">📝 RFC</button>
				</div>
			</div>
		</div>
	</div>
	
	<script>
		// Team filtering
		function filterTeam(teamName) {
			// Update active tab
			document.querySelectorAll('.filter-tab').forEach(tab => {
				tab.classList.remove('active');
			});
			const activeTab = document.querySelector('[data-team="' + teamName + '"]');
			if (activeTab) {
				activeTab.classList.add('active');
			}
			
			// Filter packages by team
			const teamPackages = {
				'sports-correlation': ['@graph/layer4', '@graph/layer3'],
				'market-analytics': ['@graph/layer2', '@graph/layer1'],
				'platform-tools': ['@bench/layer4', '@graph/algorithms', '@graph/storage', '@graph/streaming', '@graph/utils'],
				'all': []
			};
			
			const packages = teamPackages[teamName] || [];
			document.querySelectorAll('.package-card').forEach(card => {
				if (teamName === 'all') {
					card.classList.add('visible');
					card.classList.remove('hidden');
				} else {
					const pkg = card.getAttribute('data-package');
					if (packages.includes(pkg)) {
						card.classList.add('visible');
						card.classList.remove('hidden');
					} else {
						card.classList.remove('visible');
						card.classList.add('hidden');
					}
				}
			});
			
			// Reapply all filters (team filter already applied, now apply market + geographic)
			if (typeof applyAllFilters === 'function') {
				applyAllFilters();
			} else {
				// Fallback: apply market filter if applyAllFilters not available
				if (typeof applyMarketFilter === 'function') {
					applyMarketFilter();
				}
			}
		}
		
		// Benchmark runner
		async function runTeamBenchmark(packageName) {
			try {
				const response = await fetch('/api/benchmark/run', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ package: packageName })
				});
				
				const result = await response.json();
				alert('✅ Benchmark started!\\n\\nJob ID: ' + result.jobId);
			} catch (err) {
				alert('❌ Benchmark failed: ' + err.message);
			}
		}
		
		// RFC creator
		function createRFC(packageName) {
			window.open('/rfcs/new?package=' + encodeURIComponent(packageName), '_blank');
		}
		
		// Market filter functions (from market-filter.ts)
		function applyMarketFilter() {
			const marketType = document.getElementById('market-type-filter')?.value || '';
			const subMarket = document.getElementById('submarket-filter')?.value || '';
			const pattern = document.getElementById('pattern-filter')?.value || '';
			const minConfidence = parseFloat(document.getElementById('confidence-filter')?.value || '0.5');
			
			const cards = document.querySelectorAll('.package-card');
			let visibleCount = 0;
			
			cards.forEach(card => {
				if (card.classList.contains('hidden')) return; // Skip if already hidden by team filter
				
				let visible = true;
				
				// Check market type
				if (marketType) {
					const supportedTypes = card.getAttribute('data-market-types')?.split(',') || [];
					if (!supportedTypes.includes(marketType)) {
						visible = false;
					}
				}
				
				// Check sub-market
				if (subMarket && visible) {
					const supportedSubMarkets = card.getAttribute('data-sub-markets')?.split(',') || [];
					if (!supportedSubMarkets.includes(subMarket)) {
						visible = false;
					}
				}
				
				// Check pattern
				if (pattern && visible) {
					const supportedPatterns = card.getAttribute('data-patterns')?.split(',') || [];
					if (!supportedPatterns.includes(pattern)) {
						visible = false;
					}
				}
				
				// Check confidence
				if (visible) {
					const confidenceText = card.querySelector('.confidence-indicator')?.textContent;
					if (confidenceText) {
						const confidence = parseFloat(confidenceText.replace('%', '')) / 100;
						if (confidence < minConfidence) {
							visible = false;
						}
					}
				}
				
				if (visible) {
					card.classList.add('visible');
					card.classList.remove('hidden');
					visibleCount++;
				} else {
					card.classList.remove('visible');
					card.classList.add('hidden');
				}
			});
			
			// Update results count
			const resultsElement = document.getElementById('filter-results-count');
			if (resultsElement) {
				resultsElement.textContent = visibleCount + ' packages visible';
			}
		}
		
		function updateConfidenceValue(value) {
			const element = document.getElementById('confidence-value');
			if (element) {
				element.textContent = value;
			}
		}
		
		function clearMarketFilters() {
			document.getElementById('market-type-filter').value = '';
			document.getElementById('submarket-filter').value = '';
			document.getElementById('pattern-filter').value = '';
			document.getElementById('confidence-filter').value = '0.5';
			updateConfidenceValue('0.5');
			
			document.querySelectorAll('.package-card').forEach(card => {
				if (!card.classList.contains('hidden')) {
					card.classList.add('visible');
				}
			});
			
			document.getElementById('filter-results-count').textContent = 'All packages visible';
		}
		
		// Team filter function
		function applyTeamFilter() {
			// Team filtering is handled by filterTeam() function
			// This is a wrapper to ensure it's called in the right sequence
			const activeTab = document.querySelector('.filter-tab.active');
			if (activeTab) {
				const teamName = activeTab.getAttribute('data-team') || 'all';
				filterTeam(teamName);
			}
		}
		
		// Combined filter function - applies all filters in sequence
		function applyAllFilters() {
			// 1. Apply team filter first (sets 'hidden' class)
			applyTeamFilter();
			
			// 2. Apply market filter (respects team filter via 'hidden' class)
			applyMarketFilter();
			
			// 3. Apply geographic filter (works on cards that passed team + market filters)
			if (typeof applyGeographicFilter === 'function') {
				applyGeographicFilter();
			}
			
			// Count visible cards (must be visible AND not hidden)
			const visibleCards = document.querySelectorAll('.package-card.visible:not(.hidden)');
			const resultsElement = document.getElementById('filter-results-count');
			if (resultsElement) {
				resultsElement.textContent = visibleCards.length + ' packages visible (team + market + geographic)';
			}
		}
		
		${GEOGRAPHIC_FILTER_JS}
		
		// Initialize map when page loads
		window.addEventListener('load', () => {
			setTimeout(() => {
				if (typeof L !== 'undefined') {
					initializeLeafletMap();
					updateMapVisualization('', '', []);
				}
			}, 500);
		});
		
		// Run tests function
		async function runTests(testPattern, configName) {
			const btn = event.target;
			const originalText = btn.textContent;
			btn.textContent = 'Running...';
			btn.disabled = true;
			
			try {
				const response = await fetch('/api/test/run', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						testPattern, 
						config: configName,
						testPath: \`packages/graphs/multilayer/test/\${testPattern}.test.ts\`
					})
				});
				
				const result = await response.json();
				
				if (result.success) {
					alert(\`✅ Test started!\\n\\nConfig: \${configName}\\nJob ID: \${result.jobId}\\nResults will be posted to Telegram topic.\`);
					// Refresh test status after 5 seconds
					setTimeout(() => location.reload(), 5000);
				} else {
					alert(\`❌ Test failed: \${result.message || 'Unknown error'}\`);
				}
			} catch (err) {
				alert(\`❌ Test error: \${err.message}\`);
			} finally {
				btn.textContent = originalText;
				btn.disabled = false;
			}
		}
		
		// Expose globally
		window.runTests = runTests;
	</script>
</body>
</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html" },
		});
	})
	.post("/api/benchmark/run", async ({ body }) => {
		const { package: packageName } = body as { package: string };

		// Trigger benchmark job
		const jobId = `bench-${Date.now()}`;

		return {
			success: true,
			jobId,
			message: `Benchmark queued for ${packageName}`,
		};
	})
	.post("/api/test/run", async ({ body }) => {
		const { testPattern, config, testPath } = body as { 
			testPattern: string; 
			config: string;
			testPath: string;
		};

		try {
			// Spawn test runner process
			const proc = Bun.spawn({
				cmd: ['bun', 'run', 'scripts/test-runner.ts', testPath, config, '--save', '--notify'],
				stdout: 'pipe',
				stderr: 'pipe',
			});

			const jobId = `test-${Date.now()}`;

			// Don't wait for completion, return immediately
			return {
				success: true,
				jobId,
				message: `Test queued: ${testPattern} (${config})`,
			};
		} catch (error) {
			return {
				success: false,
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});

export default app;
