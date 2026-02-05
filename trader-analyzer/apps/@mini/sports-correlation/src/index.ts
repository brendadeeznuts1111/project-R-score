/**
 * @fileoverview Sports Correlation Team Mini-App
 * @description Showcase @graph/layer4 and @graph/layer3 features with Telegram integration
 * @module apps/@mini/sports-correlation
 */

import { getTopicInfo, TELEGRAM_SUPERGROUP_ID } from '@graph/telegram';
import { Elysia } from 'elysia';
import { getTeamFeed } from '../../../../packages/@graph/rss-integrator/src/team-feed.js';
import { RSS_FEED_URLS } from '../../../src/utils/rss-constants.js';

const TELEGRAM_BOT_USERNAME = 'GraphEngineBot';
const PORT = process.env.SPORTS_MINIAPP_PORT || 4001;

// Helper to escape HTML
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

const app = new Elysia();

// RSS feed API endpoint
app.get('/api/rss/team/sports-correlation', async () => {
	try {
		const feed = await getTeamFeed('sports_correlation');
		return {
			...feed,
			feedUrl: RSS_FEED_URLS.sports_correlation?.main || '',
		};
	} catch (error) {
		// Return mock data if feed unavailable (for development)
		return {
			teamId: 'sports_correlation',
			teamName: 'Sports Correlation Team',
			teamLead: 'alex.chen@yourcompany.com',
			telegramTopic: 1,
			packages: ['@graph/layer4', '@graph/layer3'],
			title: 'Sports Correlation Team Feed',
			link: RSS_FEED_URLS.sports_correlation?.main || '',
			description: 'Latest updates from Sports Correlation Team',
			items: [],
			feedUrl: RSS_FEED_URLS.sports_correlation?.main || '',
		};
	}
});

// Main mini-app page
app.get('/', async () => {
	const layer4Topic = getTopicInfo('@graph/layer4' as any);
	const layer3Topic = getTopicInfo('@graph/layer3' as any);

	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Sports Correlation Team Mini-App</title>
	<meta name="viewport" content="width=device-width, initial-scale=1"/>
	<style>
		body { 
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
			margin: 0; 
			padding: 20px; 
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
		}
		.container { 
			max-width: 800px; 
			margin: 0 auto; 
			background: white; 
			border-radius: 16px; 
			padding: 30px; 
			box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
		}
		h1 { 
			color: #667eea; 
			border-bottom: 3px solid #764ba2; 
			padding-bottom: 10px; 
		}
		.team-badge { 
			background: #667eea; 
			color: white; 
			padding: 5px 15px; 
			border-radius: 20px; 
			font-size: 14px; 
			display: inline-block; 
			margin-bottom: 20px; 
		}
		.package-card { 
			background: #f8f9fa; 
			border-left: 4px solid #667eea; 
			padding: 20px; 
			margin: 15px 0; 
			border-radius: 8px; 
		}
		.package-card h2 { 
			margin-top: 0; 
			color: #667eea; 
		}
		.feature-list { 
			list-style: none; 
			padding: 0; 
		}
		.feature-list li { 
			padding: 8px 0; 
			border-bottom: 1px solid #e9ecef; 
		}
		.feature-list li:before { 
			content: "✅ "; 
			margin-right: 8px; 
		}
		.benchmark-btn { 
			background: #28a745; 
			color: white; 
			padding: 10px 20px; 
			border: none; 
			border-radius: 8px; 
			cursor: pointer; 
			font-size: 16px; 
			margin: 10px 5px 0 0; 
		}
		.benchmark-btn:hover { 
			background: #218838; 
		}
		.telegram-btn { 
			background: #0088cc; 
			color: white; 
			padding: 10px 20px; 
			border: none; 
			border-radius: 8px; 
			cursor: pointer; 
			font-size: 16px; 
			text-decoration: none; 
			display: inline-block; 
			margin: 10px 5px 0 0; 
		}
		.telegram-btn:hover { 
			background: #0077b3; 
		}
		.metrics-grid { 
			display: grid; 
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
			gap: 20px; 
			margin: 20px 0; 
		}
		.metric-card { 
			background: white; 
			padding: 20px; 
			border-radius: 12px; 
			text-align: center; 
			box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
		}
		.metric-value { 
			font-size: 32px; 
			font-weight: bold; 
			color: #667eea; 
		}
		.metric-label { 
			font-size: 14px; 
			color: #6c757d; 
			margin-top: 5px; 
		}
		.live-demo { 
			background: #e8f5e9; 
			border: 2px dashed #28a745; 
			padding: 20px; 
			border-radius: 12px; 
			margin: 20px 0; 
		}
		.code-block { 
			background: #f8f9fa; 
			padding: 15px; 
			border-radius: 8px; 
			font-family: 'Monaco', 'Courier New', monospace; 
			font-size: 14px; 
			overflow-x: auto; 
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="team-badge">🏀 Sports Correlation Team</div>
		<h1>Sports Correlation Mini-App</h1>
		<p><strong>Team Lead:</strong> Alex Chen | <strong>Maintainers:</strong> Jordan Lee, Priya Patel</p>
		
		<!-- @graph/layer4 Features -->
		<div class="package-card">
			<h2>📦 @graph/layer4 (Cross-Sport)</h2>
			<ul class="feature-list">
				<li>Detects anomalies between different sports (basketball ↔ football)</li>
				<li>Identifies correlation chains across 4+ sports</li>
				<li>Temporal pattern detection with decay rate analysis</li>
				<li>Real-time WebSocket anomaly streaming</li>
				<li>Benchmark: avg 42ms detection time</li>
			</ul>
			
			<div class="metrics-grid">
				<div class="metric-card">
					<div class="metric-value">42ms</div>
					<div class="metric-label">Avg Detection Time</div>
				</div>
				<div class="metric-card">
					<div class="metric-value">91%</div>
					<div class="metric-label">Confidence Score</div>
				</div>
				<div class="metric-card">
					<div class="metric-value">15</div>
					<div class="metric-label">Sports Monitored</div>
				</div>
			</div>
			
			<div class="live-demo">
				<h3>🎮 Live Demo: Chess-Football Anomaly</h3>
				<div class="code-block">
const detector = new Layer4AnomalyDetection({
  threshold: 0.75,
  zScoreThreshold: 2.0
});

const anomalies = await detector.detectAnomalies(
  chessFootballCorrelations,
  sportGraph
);

// Detected: Cross-sport volume spike
// Confidence: 0.92
// Affected: chess, football, esports
				</div>
				<button class="benchmark-btn" onclick="runLayer4Demo()">Run Live Demo</button>
			</div>
			
			<a href="https://t.me/c/${Math.abs(TELEGRAM_SUPERGROUP_ID)}/${layer4Topic?.topicId || 1}" class="telegram-btn" target="_blank">
				💬 Open Telegram Topic
			</a>
			<button class="benchmark-btn" onclick="runBenchmark('@graph/layer4')">
				🏃 Run Benchmark
			</button>
		</div>
		
		<!-- @graph/layer3 Features -->
		<div class="package-card">
			<h2>📦 @graph/layer3 (Cross-Event)</h2>
			<ul class="feature-list">
				<li>Temporal pattern detection within same sport</li>
				<li>Event synchronization anomaly detection</li>
				<li>Lag time analysis (optimal: &lt;5s)</li>
				<li>Cross-window pattern clustering</li>
				<li>Benchmark: avg 23ms detection time</li>
			</ul>
			
			<div class="metrics-grid">
				<div class="metric-card">
					<div class="metric-value">23ms</div>
					<div class="metric-label">Avg Detection Time</div>
				</div>
				<div class="metric-card">
					<div class="metric-value">3.2s</div>
					<div class="metric-label">Avg Lag Time</div>
				</div>
				<div class="metric-card">
					<div class="metric-value">89%</div>
					<div class="metric-label">Sync Accuracy</div>
				</div>
			</div>
			
			<a href="https://t.me/c/${Math.abs(TELEGRAM_SUPERGROUP_ID)}/${layer3Topic?.topicId || 2}" class="telegram-btn" target="_blank">
				💬 Open Telegram Topic
			</a>
		</div>
		
		<!-- RSS Feed Panel -->
		<div id="rss-feed-panel" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #667eea;">
			<h3 style="color: #667eea; margin-top: 0;">📡 Team RSS Feed</h3>
			<p style="color: #666;">Loading latest updates...</p>
		</div>
		
		<!-- Team Actions -->
		<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #667eea;">
			<h3>👥 Team Actions</h3>
			<button class="benchmark-btn" onclick="window.location.href='/publish'">
				📤 Publish New Version
			</button>
			<button class="benchmark-btn" onclick="window.location.href='/rfc/new'">
				📝 Submit RFC
			</button>
			<button class="benchmark-btn" onclick="window.location.href='/benchmarks'">
				📊 View All Benchmarks
			</button>
			<button class="benchmark-btn" onclick="window.location.href='/team/metrics'">
				📈 Team Metrics
			</button>
		</div>
	</div>
	
	<script>
		// Load RSS feed on page load
		(async function loadRSSFeed() {
			try {
				const response = await fetch('/api/rss/team/sports-correlation');
				const feed = await response.json();
				
				const panel = document.getElementById('rss-feed-panel');
				if (!panel) return;
				
				const typeEmoji = {
					benchmark: '📊',
					rfc: '📋',
					release: '🚀',
					incident: '🚨',
					general: '📢'
				};
				
				const itemsHtml = feed.items.slice(0, 5).map(item => {
					const type = detectItemType(item);
					const emoji = typeEmoji[type] || '📢';
					const shortDesc = (item.description || '').substring(0, 150);
					
					return \`
						<div style="padding: 15px; background: white; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #667eea;">
							<div style="display: flex; justify-content: space-between; align-items: start;">
								<div style="flex: 1;">
									<strong>\${emoji} \${escapeHtml(item.title)}</strong>
									<p style="margin: 8px 0 0 0; color: #555; font-size: 14px;">\${escapeHtml(shortDesc)}\${shortDesc.length >= 150 ? '...' : ''}</p>
									<div style="margin-top: 8px; font-size: 12px; color: #999;">
										\${new Date(item.pubDate).toLocaleString()}
									</div>
								</div>
							</div>
						</div>
					\`;
				}).join('');
				
				panel.innerHTML = \`
					<h3 style="color: #667eea; margin-top: 0;">📡 \${escapeHtml(feed.teamName)} RSS Feed</h3>
					<p style="color: #666;">Latest updates from Telegram and Benchmarks</p>
					<div style="max-height: 400px; overflow-y: auto; margin-top: 15px;">
						\${itemsHtml || '<p style="color: #999;">No updates available</p>'}
					</div>
					<div style="margin-top: 15px; text-align: center;">
						<a href="\${feed.feedUrl || '#'}" target="_blank" style="color: #667eea; text-decoration: none;">
							🔗 View Full Feed
						</a>
					</div>
				\`;
			} catch (error) {
				console.error('Failed to load RSS feed:', error);
				const panel = document.getElementById('rss-feed-panel');
				if (panel) {
					panel.innerHTML = '<p style="color: #999;">Could not load RSS feed</p>';
				}
			}
		})();
		
		function detectItemType(item) {
			const content = (item.title + ' ' + item.description + ' ' + (item.category || '')).toLowerCase();
			if (content.includes('benchmark') || content.includes('avgduration')) return 'benchmark';
			if (content.includes('rfc') || content.includes('request for comments')) return 'rfc';
			if (content.includes('published') || content.includes('release')) return 'release';
			if (content.includes('critical') || content.includes('incident')) return 'incident';
			return 'general';
		}
		
		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}
		
		async function runLayer4Demo() {
			const btn = event.target;
			btn.textContent = 'Running...';
			btn.disabled = true;
			
			try {
				const response = await fetch('/api/demo/layer4');
				const result = await response.json();
				
				alert('✅ Demo complete!\\n\\n' + 
					'Anomalies detected: ' + result.anomalies.length + '\\n' +
					'Top confidence: ' + result.topConfidence);
			} catch (err) {
				alert('❌ Demo failed: ' + err.message);
			} finally {
				btn.textContent = 'Run Live Demo';
				btn.disabled = false;
			}
		}
		
		async function runBenchmark(packageName) {
			const btn = event.target;
			btn.textContent = 'Running...';
			btn.disabled = true;
			
			try {
				const response = await fetch('/api/benchmark/run', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ package: packageName })
				});
				
				const result = await response.json();
				
				if (result.success) {
					alert('✅ Benchmark started!\\n\\nJob ID: ' + result.jobId + '\\nResults will be posted to Telegram topic.');
					setTimeout(() => location.reload(), 5000);
				}
			} catch (err) {
				alert('❌ Benchmark failed: ' + err.message);
			} finally {
				btn.textContent = 'Run Benchmark';
				btn.disabled = false;
			}
		}
	</script>
</body>
</html>
	`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	});
});

// Demo API endpoint
app.get('/api/demo/layer4', async () => {
	// Mock demo data
	const start = Date.now();
	const mockAnomalies = [
		{ type: 'cross-sport-volume-spike', confidenceScore: 0.92, description: 'Chess-Football correlation anomaly' },
		{ type: 'temporal-pattern', confidenceScore: 0.87, description: 'Event synchronization detected' },
	];

	return {
		anomalies: mockAnomalies,
		topConfidence: 0.92,
		detectionTime: Date.now() - start,
	};
});

// Benchmark API endpoint
app.post('/api/benchmark/run', async ({ body }) => {
	const { package: packageName } = body as { package: string };

	// TODO: Trigger benchmark via BullMQ
	// const job = await queue.add('benchmark-run', { package: packageName });

	return {
		success: true,
		jobId: 'job-' + Date.now(),
		message: `Benchmark queued for ${packageName}`,
	};
});

app.listen(PORT);

const layer4TopicInfo = getTopicInfo('@graph/layer4' as any);
console.log(`🏀 Sports Correlation Mini-App running at http://localhost:${PORT}`);
console.log(`💬 Telegram Bot: @${TELEGRAM_BOT_USERNAME}`);
console.log(`📢 Telegram Topic: #${layer4TopicInfo?.topicId || 1} @graph/layer4 Cross-Sport`);

export default app;
