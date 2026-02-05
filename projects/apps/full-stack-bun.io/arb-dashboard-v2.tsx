#!/usr/bin/env bun
/**
 * [ARB-DASH-V2][VIEW-TRANSITIONS][CSS-LAYER][60FPS]
 * Arbitrage Control Center - Pro Animations + Monorepo
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Type definitions
interface ArbEdge {
	id: string;
	league: string;
	market: string;
	profit_pct: number;
	value_usd: number;
	execute?: boolean;
	bookie_a?: string;
	bookie_b?: string;
	odds_a?: number;
	odds_b?: number;
}

// Dashboard HTML with view transitions
const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HyperBun Arbitrage Dashboard v2</title>
	<link rel="stylesheet" href="/dashboard.css">
</head>
<body>
	<div class="arb-dashboard">
		<header class="dashboard-header">
			<h1>🚀 Arbitrage Control Center</h1>
			<div class="metrics-bar">
				<div class="metric">
					<span class="metric-label">Scans/min</span>
					<span class="metric-value" id="scans-per-min">0</span>
				</div>
				<div class="metric">
					<span class="metric-label">Live Clients</span>
					<span class="metric-value" id="live-clients">0</span>
				</div>
				<div class="metric">
					<span class="metric-label">Total Value</span>
					<span class="metric-value" id="total-value">$0</span>
				</div>
			</div>
		</header>
		
		<div class="arb-grid" id="arb-grid">
			<!-- Arb cards will be inserted here -->
		</div>
	</div>

	<script>
		const arbGrid = document.getElementById('arb-grid');
		let liveArbs = [];
		let ws = null;

		// WebSocket connection
		function connectWebSocket() {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws/arb\`);

			ws.onopen = () => {
				console.log('✅ WebSocket connected');
			};

			ws.onmessage = (e) => {
				try {
					const data = JSON.parse(e.data);
					
					if (data.arbs) {
						// SMOOTH VIEW TRANSITION (Bun 1.3.5 fixed)
						if (document.startViewTransition) {
							document.startViewTransition(() => {
								updateArbs(data.arbs);
							});
						} else {
							updateArbs(data.arbs);
						}
					}
					
					// Update metrics
					if (data.scans_per_min) {
						document.getElementById('scans-per-min').textContent = data.scans_per_min.toLocaleString();
					}
					if (data.live_clients) {
						document.getElementById('live-clients').textContent = data.live_clients.toLocaleString();
					}
					if (data.total_value_usd) {
						document.getElementById('total-value').textContent = \`$\${data.total_value_usd.toLocaleString()}\`;
					}
				} catch (err) {
					console.error('WebSocket message error:', err);
				}
			};

			ws.onerror = (err) => {
				console.error('WebSocket error:', err);
			};

			ws.onclose = () => {
				console.log('WebSocket closed, reconnecting...');
				setTimeout(connectWebSocket, 3000);
			};
		}

		function updateArbs(newArbs) {
			liveArbs = newArbs;
			
			// Clear existing cards
			arbGrid.innerHTML = '';
			
			// Create arb cards with view transitions
			newArbs.forEach((arb, index) => {
				const card = document.createElement('div');
				card.className = \`profit-card arb-edge arb-slide-in \${arb.execute ? 'pulse' : ''}\`;
				card.style.viewTransitionName = \`arb-card-\${arb.id}\`;
				card.innerHTML = \`
					<div class="edge-pct">\${arb.profit_pct.toFixed(2)}%</div>
					<div class="market">\${arb.league.toUpperCase()} \${arb.market}</div>
					<div class="value">$\${arb.value_usd.toLocaleString()}</div>
					\${arb.bookie_a && arb.bookie_b ? \`
						<div class="bookies">
							<span class="bookie">\${arb.bookie_a}</span>
							<span class="vs">vs</span>
							<span class="bookie">\${arb.bookie_b}</span>
						</div>
					\` : ''}
					\${arb.execute ? \`
						<button class="execute-btn" onclick="executeArb('\${arb.id}')">EXECUTE →</button>
					\` : ''}
				\`;
				arbGrid.appendChild(card);
			});
		}

		function executeArb(arbId) {
			fetch(\`/api/execute/\${arbId}\`, { method: 'POST' })
				.then(res => res.json())
				.then(data => {
					console.log('Arb executed:', data);
				})
				.catch(err => console.error('Execute error:', err));
		}

		// Connect on load
		connectWebSocket();
	</script>
</body>
</html>
`;

export default dashboardHTML;



