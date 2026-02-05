/**
 * Sports Correlation Team Dashboard Page
 * Team-specific dashboard with packages, RSS feeds, test management, and mini-app integration
 */

import { getTopicInfo, TELEGRAM_SUPERGROUP_ID } from "@graph/telegram";
import { Database } from "bun:sqlite";
import { Elysia } from "elysia";
import { renderTestStatusCard } from "../../components/test-status";

const app = new Elysia();

// Helper to escape HTML
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

app.get("/team/sports-correlation", async () => {
	const db = new Database("registry.db");

	// Get team's packages
	const packages = db
		.prepare(
			`
		SELECT p.*, pt.team_lead, pt.maintainer 
		FROM packages p
		JOIN package_teams pt ON p.name = pt.package_name
		WHERE pt.team = 'sports-correlation'
		ORDER BY p.timestamp DESC
	`
		)
		.all() as Array<{
		name: string;
		version: string;
		timestamp: number;
		team_lead: string;
		maintainer: string;
	}>;

	// Get team topic info
	const layer4Topic = getTopicInfo("@graph/layer4" as any);
	const layer3Topic = getTopicInfo("@graph/layer3" as any);

	const packageCards = packages
		.map(
			(pkg) => `
		<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea;">
			<h3 style="margin: 0 0 10px 0;">${escapeHtml(pkg.name)}</h3>
			<p style="margin: 5px 0; color: #666;">Version: ${escapeHtml(pkg.version)} | Maintainer: ${escapeHtml(pkg.maintainer || "N/A")}</p>
			<a href="/package/${encodeURIComponent(pkg.name)}" style="color: #667eea; text-decoration: none;">View Details →</a>
		</div>
	`
		)
		.join("");

	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Sports Correlation Team Dashboard</title>
	<meta name="viewport" content="width=device-width, initial-scale=1"/>
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
		}
		.header { 
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 30px;
			border-radius: 12px;
			margin-bottom: 30px;
			text-align: center;
		}
		.header h1 { 
			margin: 0 0 10px 0;
			font-size: 2em;
		}
		.header p {
			margin: 5px 0;
			opacity: 0.9;
		}
		.section {
			background: white;
			padding: 25px;
			border-radius: 12px;
			margin-bottom: 25px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		}
		.section h2 {
			margin-top: 0;
			color: #333;
			border-bottom: 2px solid #667eea;
			padding-bottom: 10px;
		}
		.team-info {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 15px;
			margin: 20px 0;
		}
		.info-card {
			background: #f8f9fa;
			padding: 15px;
			border-radius: 8px;
			text-align: center;
		}
		.info-card strong {
			display: block;
			color: #667eea;
			margin-bottom: 5px;
		}
		.action-buttons {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
			margin-top: 20px;
		}
		.btn {
			padding: 12px 24px;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			font-size: 14px;
			text-decoration: none;
			display: inline-block;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		}
		.btn-telegram {
			background: #0088cc;
			color: white;
		}
		.btn-benchmark {
			background: #28a745;
			color: white;
		}
		.btn-rfc {
			background: #6c757d;
			color: white;
		}
		.rss-feed-panel {
			max-height: 400px;
			overflow-y: auto;
			margin-top: 15px;
		}
		.rss-item {
			padding: 15px;
			border-bottom: 1px solid #eee;
		}
		.rss-item:last-child {
			border-bottom: none;
		}
		.rss-item-title {
			font-weight: 600;
			margin-bottom: 5px;
			color: #333;
		}
		.rss-item-date {
			font-size: 12px;
			color: #999;
		}
		iframe {
			width: 100%;
			height: 600px;
			border: none;
			border-radius: 12px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>🏀 Sports Correlation Team</h1>
			<p>Team Lead: Alex Chen | Maintainers: Jordan Lee, Priya Patel</p>
		</div>
		
		<!-- Team Information -->
		<div class="section">
			<h2>📋 Team Overview</h2>
			<div class="team-info">
				<div class="info-card">
					<strong>Packages</strong>
					<span>${packages.length}</span>
				</div>
				<div class="info-card">
					<strong>Team Lead</strong>
					<span>Alex Chen</span>
				</div>
				<div class="info-card">
					<strong>Telegram Topic</strong>
					<span>#sports-correlation</span>
				</div>
			</div>
			<div class="action-buttons">
				<a href="https://t.me/c/${Math.abs(Number(TELEGRAM_SUPERGROUP_ID))}/${layer4Topic?.topicId || 1}" 
				   class="btn btn-telegram" 
				   target="_blank">
					💬 Open Telegram Topic
				</a>
				<button class="btn btn-benchmark" onclick="runTeamBenchmark('@graph/layer4')">
					🏃 Run Team Benchmark
				</button>
				<button class="btn btn-rfc" onclick="createRFC('@graph/layer4')">
					📝 Submit RFC
				</button>
			</div>
		</div>
		
		<!-- Packages -->
		<div class="section">
			<h2>📦 Our Packages</h2>
			${packageCards || "<p style='color: #999;'>No packages found</p>"}
		</div>
		
		<!-- RSS Feed -->
		<div class="section">
			<h2>📡 Team Updates (RSS Feed)</h2>
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
				<p style="margin: 0; color: #666;">Latest updates from team feeds</p>
				<button onclick="refreshRSSFeed()" 
				        style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
					🔄 Refresh
				</button>
			</div>
			<div id="rss-feed-container" class="rss-feed-panel">
				<div style="text-align: center; padding: 2rem; color: #999;">
					Loading RSS feed...
				</div>
			</div>
		</div>
		
		<!-- Test Status -->
		<div class="section">
			<h2>🧪 Test Status</h2>
			${renderTestStatusCard("correlation-detection", "Correlation Detection")}
			${renderTestStatusCard("layer4-anomaly-detection", "Layer 4 Anomaly Detection")}
		</div>
		
		<!-- Mini-App -->
		<div class="section">
			<h2>📊 Team Mini-App</h2>
			<iframe src="http://localhost:4001" title="Sports Correlation Mini-App"></iframe>
		</div>
	</div>
	
	<script>
		// RSS Feed Integration
		const RSS_FEED_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
			? 'http://localhost:3001/api/rss.xml'
			: \`\${window.location.protocol}//\${window.location.host}/api/rss.xml\`;

		async function fetchRSSFeed() {
			try {
				const response = await fetch(RSS_FEED_URL);
				if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
				const xml = await response.text();
				return parseRSSXML(xml);
			} catch (error) {
				console.error('RSS fetch error:', error);
				return null;
			}
		}

		function parseRSSXML(xml) {
			const parser = new DOMParser();
			const doc = parser.parseFromString(xml, 'text/xml');
			const items = Array.from(doc.querySelectorAll('item'));
			
			return items.map(item => ({
				title: item.querySelector('title')?.textContent || '',
				description: item.querySelector('description')?.textContent || '',
				pubDate: item.querySelector('pubDate')?.textContent || '',
				link: item.querySelector('link')?.textContent || ''
			}));
		}

		function filterTeamRSSItems(items) {
			const teamKeywords = ['sports', 'correlation', 'layer4', 'layer3', 'alex', 'jordan', 'priya'];
			return items.filter(item => {
				const content = (item.title + ' ' + item.description).toLowerCase();
				return teamKeywords.some(keyword => content.includes(keyword));
			}).slice(0, 10);
		}

		function formatRSSDate(dateString) {
			try {
				const date = new Date(dateString);
				return date.toLocaleString();
			} catch {
				return dateString;
			}
		}

		async function renderRSSFeed() {
			const container = document.getElementById('rss-feed-container');
			if (!container) return;

			container.innerHTML = '<div style="text-align: center; padding: 1rem; color: #999;">Loading...</div>';

			const feed = await fetchRSSFeed();
			if (!feed || feed.length === 0) {
				container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">No RSS feed available</div>';
				return;
			}

			const teamItems = filterTeamRSSItems(feed);
			if (teamItems.length === 0) {
				container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">No team updates found</div>';
				return;
			}

			container.innerHTML = teamItems.map(item => \`
				<div class="rss-item">
					<div class="rss-item-title">\${escapeHtml(item.title)}</div>
					<div style="color: #666; font-size: 14px; margin-top: 5px;">\${escapeHtml(item.description.substring(0, 150))}...</div>
					<div class="rss-item-date">\${formatRSSDate(item.pubDate)}</div>
					\${item.link ? \`<a href="\${item.link}" target="_blank" style="color: #667eea; font-size: 12px;">View →</a>\` : ''}
				</div>
			\`).join('');
		}

		function refreshRSSFeed() {
			renderRSSFeed();
		}

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		// Test runner function
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

		// Team benchmark function
		async function runTeamBenchmark(packageName) {
			if (!confirm(\`Run benchmark for \${packageName}? This will trigger a full benchmark test.\`)) {
				return;
			}
			
			try {
				const response = await fetch('/api/test/run', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						testPattern: packageName.replace('@graph/', ''),
						config: 'benchmark',
						testPath: \`packages/graphs/multilayer/test/\${packageName.replace('@graph/', '')}-anomaly-detection.test.ts\`
					})
				});
				
				const result = await response.json();
				if (result.success) {
					alert(\`✅ Benchmark started for \${packageName}!\\n\\nResults will be posted to Telegram topic.\`);
				} else {
					alert(\`❌ Benchmark failed: \${result.message || 'Unknown error'}\`);
				}
			} catch (err) {
				alert(\`❌ Benchmark error: \${err.message}\`);
			}
		}

		// RFC creation function
		function createRFC(packageName) {
			window.location.href = \`/rfc/create?package=\${encodeURIComponent(packageName)}\`;
		}

		// Expose functions globally
		window.runTests = runTests;
		window.runTeamBenchmark = runTeamBenchmark;
		window.createRFC = createRFC;

		// Load RSS feed on page load
		document.addEventListener('DOMContentLoaded', () => {
			renderRSSFeed();
		});
	</script>
</body>
</html>
		`;

	return new Response(html, {
		headers: { "Content-Type": "text/html" },
	});
});

export default app;
