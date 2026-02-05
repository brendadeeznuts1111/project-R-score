/**
 * @fileoverview Registry Dashboard: Package Detail Page
 * @description Team-aware package detail page with benchmarks and version history
 * @module apps/registry-dashboard/src/pages/package/[name]
 * 
 * @see {@link ../../../../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md|Team Organization Documentation}
 */

import { Database } from 'bun:sqlite';
import { Elysia } from 'elysia';
import type { BenchmarkData, Package, VersionHistory } from '../../types/registry';

const app = new Elysia();

// Team ownership mapping (from team organization docs)
const PACKAGE_TEAMS: Record<string, { 
	team: string; 
	lead: string; 
	maintainer: string;
	telegramHandle?: string;
	supergroup?: string;
	topic?: string;
}> = {
	'@graph/layer4': { 
		team: 'Sports Correlation', 
		lead: 'alex.chen@yourcompany.com', 
		maintainer: 'jordan.lee@yourcompany.com',
		telegramHandle: '@alexchen',
		supergroup: '#sports-correlation',
		topic: 'Topic 2: Live Alerts'
	},
	'@graph/layer3': { 
		team: 'Sports Correlation', 
		lead: 'alex.chen@yourcompany.com', 
		maintainer: 'priya.patel@yourcompany.com',
		telegramHandle: '@alexchen',
		supergroup: '#sports-correlation',
		topic: 'Topic 2: Live Alerts'
	},
	'@graph/layer2': { 
		team: 'Market Analytics', 
		lead: 'sarah.kumar@yourcompany.com', 
		maintainer: 'tom.wilson@yourcompany.com',
		telegramHandle: '@sarahkumar',
		supergroup: '#market-analytics',
		topic: 'Topic 3: Arbitrage'
	},
	'@graph/layer1': { 
		team: 'Market Analytics', 
		lead: 'sarah.kumar@yourcompany.com', 
		maintainer: 'lisa.zhang@yourcompany.com',
		telegramHandle: '@sarahkumar',
		supergroup: '#market-analytics',
		topic: 'Topic 3: Arbitrage'
	},
	'@graph/algorithms': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'david.kim@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@graph/storage': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'emma.brown@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 5: System Status'
	},
	'@graph/streaming': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'emma.brown@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 5: System Status'
	},
	'@graph/utils': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'mike.rodriguez@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 5: System Status'
	},
	'@bench/layer4': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@bench/layer3': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@bench/layer2': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@bench/layer1': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@bench/property': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 4: Analytics'
	},
	'@bench/stress': { 
		team: 'Platform & Tools', 
		lead: 'mike.rodriguez@yourcompany.com', 
		maintainer: 'ryan.gupta@yourcompany.com',
		telegramHandle: '@mikerodriguez',
		supergroup: '#platform-tools',
		topic: 'Topic 5: System Status'
	},
};

// Package detail page route
app.get('/package/:name', async ({ params, query }) => {
	const db = new Database('registry.db');
	const packageName = decodeURIComponent(params.name);

	// Fetch package metadata
	const pkg = db.prepare(
		'SELECT * FROM packages WHERE name = ? ORDER BY version DESC LIMIT 1'
	).get(packageName) as Package | null;

	if (!pkg) {
		return new Response('Package not found', { status: 404 });
	}

	// Fetch benchmark data
	const benchmarks = db.prepare(
		'SELECT * FROM package_metadata WHERE package_name = ? ORDER BY timestamp DESC LIMIT 10'
	).all(packageName) as BenchmarkData[];

	// Fetch version history
	const versions = db.prepare(
		'SELECT version, timestamp, published_by, package_json FROM packages WHERE name = ? ORDER BY timestamp DESC'
	).all(packageName) as VersionHistory[];

	// Get team ownership
	const teamInfo = PACKAGE_TEAMS[packageName] || { 
		team: 'Unknown', 
		lead: 'N/A', 
		maintainer: 'N/A' 
	};

	// Get latest benchmark results
	const latestBenchmark = benchmarks[0];
	const benchmarkResults = latestBenchmark?.benchmark_data 
		? JSON.parse(latestBenchmark.benchmark_data) 
		: null;

	// Determine badge class
	const getBadgeClass = (version: string) => {
		if (version.includes('beta')) return 'badge beta';
		if (version.includes('alpha')) return 'badge alpha';
		return 'badge';
	};

	return (
		<html>
			<head>
				<title>{pkg.name} - Registry Dashboard</title>
				<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
				<style dangerouslySetInnerHTML={{
					__html: `
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
							box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
						}
						h1 { 
							color: #333; 
							border-bottom: 2px solid #007bff; 
							padding-bottom: 10px; 
						}
						.team-card { 
							background: #e3f2fd; 
							padding: 15px; 
							border-radius: 8px; 
							margin: 20px 0; 
						}
						.team-card h2 { 
							margin-top: 0; 
							color: #1976d2; 
						}
						.team-info { 
							display: grid; 
							grid-template-columns: repeat(3, 1fr); 
							gap: 20px; 
						}
						.info-item { 
							background: #f5f5f5; 
							padding: 10px; 
							border-radius: 4px; 
						}
						.info-item strong { 
							color: #555; 
						}
						.telegram-link {
							color: #0088cc;
							text-decoration: none;
						}
						.telegram-link:hover {
							text-decoration: underline;
						}
						.benchmark-section { 
							margin: 30px 0; 
						}
						.chart-container { 
							position: relative; 
							height: 300px; 
							margin: 20px 0; 
						}
						.version-table { 
							width: 100%; 
							border-collapse: collapse; 
							margin: 20px 0; 
						}
						.version-table th, .version-table td { 
							padding: 12px; 
							text-align: left; 
							border-bottom: 1px solid #ddd; 
						}
						.version-table th { 
							background: #f5f5f5; 
							font-weight: 600; 
						}
						.publish-btn { 
							background: #007bff; 
							color: white; 
							padding: 10px 20px; 
							border: none; 
							border-radius: 4px; 
							cursor: pointer; 
							margin-right: 10px;
						}
						.publish-btn:hover { 
							background: #0056b3; 
						}
						.badge { 
							background: #28a745; 
							color: white; 
							padding: 4px 8px; 
							border-radius: 12px; 
							font-size: 12px; 
						}
						.badge.beta { 
							background: #ffc107; 
							color: #000; 
						}
						.badge.alpha { 
							background: #dc3545; 
						}
					`
				}} />
			</head>
			<body>
				<div class="container">
					<h1>
						📦 {pkg.name} <span class={getBadgeClass(pkg.version)}>v{pkg.version}</span>
					</h1>

					{/* Team Ownership Card */}
					<div class="team-card">
						<h2>👥 Team Ownership</h2>
						<div class="team-info">
							<div class="info-item">
								<strong>🏢 Team</strong><br />
								{teamInfo.team}
							</div>
							<div class="info-item">
								<strong>👔 Team Lead</strong><br />
								{teamInfo.lead}
								{teamInfo.telegramHandle && (
									<>
										<br />
										<a href={`https://t.me/${teamInfo.telegramHandle.replace('@', '')}`} class="telegram-link">
											📱 {teamInfo.telegramHandle}
										</a>
									</>
								)}
							</div>
							<div class="info-item">
								<strong>🔧 Maintainer</strong><br />
								{teamInfo.maintainer}
							</div>
						</div>
						{teamInfo.supergroup && (
							<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc;">
								<strong>💬 Telegram:</strong> {teamInfo.supergroup}
								{teamInfo.topic && ` / ${teamInfo.topic}`}
							</div>
						)}
					</div>

					{/* Latest Benchmark Results */}
					<div class="benchmark-section">
						<h2>📊 Latest Benchmark Results</h2>
						{latestBenchmark ? (
							<div>
								<p>
									<strong>Run at:</strong> {new Date(latestBenchmark.timestamp).toLocaleString()}
								</p>
								<div class="chart-container">
									<canvas id="benchmarkChart"></canvas>
								</div>
								<pre>{JSON.stringify(benchmarkResults, null, 2)}</pre>
							</div>
						) : (
							<p>No benchmark data available</p>
						)}
					</div>

					{/* Version History */}
					<div>
						<h2>📜 Version History</h2>
						<table class="version-table">
							<thead>
								<tr>
									<th>Version</th>
									<th>Published</th>
									<th>By</th>
									<th>Benchmarks</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{versions.map(v => {
									const pkgJson = JSON.parse(v.package_json);
									const hasBenchmarks = pkgJson.benchmarks ? '✅' : '❌';
									return (
										<tr>
											<td>
												<span class={getBadgeClass(v.version)}>
													{v.version}
												</span>
											</td>
											<td>{new Date(v.timestamp).toLocaleDateString()}</td>
											<td>{v.published_by}</td>
											<td>{hasBenchmarks}</td>
											<td>
												<button 
													class="publish-btn" 
													onclick={`downloadPackage('${pkg.name}', '${v.version}')`}
												>
													📥 Download
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Actions */}
					<div style="margin-top: 30px;">
						<button class="publish-btn" onclick={`runBenchmark('${pkg.name}')`}>
							🏃 Run Benchmark
						</button>
						<button 
							class="publish-btn" 
							onclick={`publishPackage('${pkg.name}')`}
						>
							📤 Publish New Version
						</button>
					</div>
				</div>

				<script dangerouslySetInnerHTML={{
					__html: `
						// Benchmark results chart
						const ctx = document.getElementById('benchmarkChart');
						if (ctx) {
							const benchmarkData = ${JSON.stringify(benchmarkResults || [])};
							
							if (benchmarkData.length > 0 && Array.isArray(benchmarkData)) {
								new Chart(ctx.getContext('2d'), {
									type: 'line',
									data: {
										labels: benchmarkData[0]?.results?.map(r => r.value) || [],
										datasets: benchmarkData.map((prop, idx) => ({
											label: prop.property || 'Property ' + idx,
											data: prop.results?.map(r => r.duration) || [],
											borderColor: '#' + Math.floor(Math.random()*16777215).toString(16),
											tension: 0.1
										}))
									},
									options: {
										responsive: true,
										maintainAspectRatio: false,
										plugins: {
											title: {
												display: true,
												text: 'Property Iteration Performance'
											}
										},
										scales: {
											y: {
												title: { display: true, text: 'Duration (ms)' }
											},
											x: {
												title: { display: true, text: 'Property Value' }
											}
										}
									}
								});
							}
						}
						
						// Actions
						function runBenchmark(packageName) {
							fetch('/api/benchmarks/run', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ package: packageName })
							}).then(() => location.reload());
						}
						
						function publishPackage(packageName) {
							if (confirm('Publish new version of ' + packageName + '?')) {
								fetch('/api/publish', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ package: packageName })
								}).then(() => location.reload());
							}
						}
						
						function downloadPackage(name, version) {
							window.location.href = '/api/packages/' + encodeURIComponent(name) + '/' + version + '/tarball';
						}
					`
				}} />
			</body>
		</html>
	);
});

// API endpoints for the page
app.post('/api/benchmarks/run', async ({ body }) => {
	const { package: packageName } = body as { package: string };

	// TODO: Trigger benchmark via BullMQ job
	// const job = await queue.add('benchmark-run', { package: packageName });

	return { success: true, message: `Benchmark queued for ${packageName}` };
});

app.get('/api/packages/:name/:version/tarball', async ({ params }) => {
	const db = new Database('registry.db');
	const pkg = db.prepare(
		'SELECT tarball FROM packages WHERE name = ? AND version = ?'
	).get(params.name, params.version) as { tarball: ArrayBuffer } | null;

	if (!pkg) {
		return new Response('Package not found', { status: 404 });
	}

	return new Response(pkg.tarball, {
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Disposition': `attachment; filename="${params.name}-${params.version}.tgz"`
		}
	});
});

// Team assignment API
app.post('/api/team/assign', async ({ body }) => {
	const { package: packageName, team, lead, maintainer } = body as {
		package: string;
		team: string;
		lead: string;
		maintainer: string;
	};

	const db = new Database('registry.db');
	db.prepare(`
		INSERT INTO package_teams (package_name, team, team_lead, maintainer)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(package_name) DO UPDATE SET
			team = excluded.team,
			team_lead = excluded.team_lead,
			maintainer = excluded.maintainer
	`).run(packageName, team, lead, maintainer);

	return { success: true };
});

export default app;
