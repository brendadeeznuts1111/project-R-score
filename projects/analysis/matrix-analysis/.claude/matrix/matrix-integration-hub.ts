/**
 * Tier-1380 OMEGA: Matrix Integration Hub
 *
 * Integrates 90-column matrix with:
 * - Domain/subdomain configuration
 * - Bun API reference
 * - RSS feeds
 * - Dashboard
 *
 * @module matrix-integration-hub
 * @tier 1380-OMEGA-90COL-INTEGRATED
 */

import { FeedAggregator, type FeedItem } from "../core/api/feed-aggregator";
import { DashboardIntegrator } from "../core/shared/dashboard-integrator";
import { getTeamForColumn as gtc, TEAMS, type TeamId } from "../core/team/TeamManager";
import { BUN_API_CATALOG } from "./bun-api-reference";
import { ALL_COLUMNS } from "./MatrixTable90";

// ═════════════════════════════════════════════════════════════════════════════
// DOMAIN & SUBDOMAIN CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

export interface SubdomainConfig {
	subdomain: string;
	path: string;
	description: string;
	team: TeamId;
	tier: string;
	matrixColumns: number[];
	features: string[];
}

export const MATRIX_SUBDOMAINS: SubdomainConfig[] = [
	{
		subdomain: "matrix.factory-wager.com",
		path: "/",
		description: "90-Column Matrix Visualization",
		team: "infra",
		tier: "1380",
		matrixColumns: [
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
			59, 60, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
		],
		features: ["grid-view", "column-query", "team-filter", "zone-focus"],
	},
	{
		subdomain: "tension.factory-wager.com",
		path: "/anomaly",
		description: "Tension Field & Anomaly Detection",
		team: "tension",
		tier: "1380",
		matrixColumns: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
		features: ["anomaly-score", "volume-delta", "xgboost-pred", "overreact-q3"],
	},
	{
		subdomain: "validation.factory-wager.com",
		path: "/baseline",
		description: "Validation Density & Baseline Tracking",
		team: "validation",
		tier: "1380",
		matrixColumns: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75],
		features: [
			"baseline-delta",
			"drift-detection",
			"compliance-score",
			"regression-status",
		],
	},
	{
		subdomain: "api.factory-wager.com",
		path: "/matrix",
		description: "Matrix API & Bun Reference",
		team: "runtime",
		tier: "1380",
		matrixColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		features: ["bun-api-catalog", "matrix-query", "column-standards"],
	},
	{
		subdomain: "profiles.factory-wager.com",
		path: "/cpu",
		description: "CPU Profile Storage & Analysis",
		team: "infra",
		tier: "1320",
		matrixColumns: [76, 77, 78],
		features: ["cpu-prof-md", "heap-prof", "markdown-profiles"],
	},
	{
		subdomain: "dashboard.factory-wager.com",
		path: "/matrix",
		description: "Matrix Dashboard & Analytics",
		team: "platform",
		tier: "1320",
		matrixColumns: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
		features: ["real-time-metrics", "team-analytics", "zone-health"],
	},
];

// ═════════════════════════════════════════════════════════════════════════════
// RSS FEED GENERATION FOR MATRIX
// ═════════════════════════════════════════════════════════════════════════════

export interface MatrixFeedItem extends FeedItem {
	matrixColumn?: number;
	team?: TeamId;
	zone?: string;
	anomalyScore?: number;
	profileLink?: string;
}

export class MatrixRSSFeed {
	constructor() {
		this.aggregator = new FeedAggregator();
	}

	/**
	 * Generate RSS feed for matrix updates
	 */
	async generateMatrixFeed(
		options: { team?: TeamId; zone?: string; limit?: number } = {},
	): Promise<string> {
		const { team, zone, limit = 20 } = options;

		// Build items from matrix columns
		const items: MatrixFeedItem[] = [];

		// Add column updates
		for (const [_id, col] of Object.entries(ALL_COLUMNS)) {
			if (team && getTeamForColumn(col.index)?.id !== team) continue;
			if (zone && getZoneForColumn(col.index) !== zone) continue;

			items.push({
				id: `matrix-col-${col.index}`,
				source: "matrix",
				title: `[${col.index}] ${col.displayName}`,
				link: `https://matrix.factory-wager.com/column/${col.index}`,
				pubDate: new Date().toISOString(),
				description: col.description,
				tags: [col.category, getTeamForColumn(col.index)?.id || "unassigned"],
				matrixColumn: col.index,
				team: getTeamForColumn(col.index)?.id,
				zone: getZoneForColumn(col.index) || undefined,
			});
		}

		// Sort and limit
		items.sort((a, b) => (b.matrixColumn || 0) - (a.matrixColumn || 0));
		const limitedItems = items.slice(0, limit);

		// Generate RSS XML
		return this.generateRSSXML(limitedItems, {
			title: team
				? `Matrix Feed - ${TEAMS[team].name}`
				: zone
					? `Matrix Feed - ${zone} Zone`
					: "Tier-1380 OMEGA Matrix Feed",
			description: "90-Column Matrix telemetry and updates",
			link: "https://matrix.factory-wager.com",
		});
	}

	/**
	 * Generate RSS for anomaly alerts
	 */
	async generateAnomalyFeed(threshold = 0.85): Promise<string> {
		// Simulated anomaly data (in production, fetch from tension zone)
		const anomalies: MatrixFeedItem[] = [
			{
				id: `anomaly-${Date.now()}-1`,
				source: "tension",
				title: "⚠️ High Anomaly Score Detected",
				link: "https://tension.factory-wager.com/anomaly/31",
				pubDate: new Date().toISOString(),
				description: `Column 31 (crc32_throughput) anomaly score: 0.94 exceeds threshold ${threshold}`,
				tags: ["anomaly", "tension", "alert"],
				matrixColumn: 31,
				team: "tension",
				zone: "tension",
				anomalyScore: 0.94,
			},
		];

		return this.generateRSSXML(anomalies, {
			title: "Matrix Anomaly Alerts",
			description: `Tension field alerts (threshold: ${threshold})`,
			link: "https://tension.factory-wager.com",
		});
	}

	/**
	 * Generate RSS for profile uploads
	 */
	async generateProfileFeed(): Promise<string> {
		const _col76 = ALL_COLUMNS.col_76_profile_link;

		const profiles: MatrixFeedItem[] = [
			{
				id: `profile-${Date.now()}`,
				source: "profiles",
				title: "🔥 New CPU Profile Available",
				link: "https://profiles.factory-wager.com/cpu/1380/prod/1769676123456_cpu-md.md",
				pubDate: new Date().toISOString(),
				description: `Profile uploaded for Tier-1380 OMEGA validation`,
				tags: ["profile", "cpu", "infra"],
				matrixColumn: 76,
				team: "infra",
				zone: "extensibility",
				profileLink:
					"https://profiles.factory-wager.com/cpu/1380/prod/1769676123456_cpu-md.md",
			},
		];

		return this.generateRSSXML(profiles, {
			title: "Matrix Profile Feed",
			description: "CPU/Heap profile uploads",
			link: "https://profiles.factory-wager.com",
		});
	}

	private generateRSSXML(
		items: MatrixFeedItem[],
		meta: { title: string; description: string; link: string },
	): string {
		const itemsXml = items
			.map(
				(item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.id}</guid>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      <description><![CDATA[${item.description}]]></description>
      ${item.matrixColumn ? `<category>col-${item.matrixColumn}</category>` : ""}
      ${item.team ? `<category>team-${item.team}</category>` : ""}
      ${item.zone ? `<category>zone-${item.zone}</category>` : ""}
      ${item.anomalyScore ? `<category>anomaly-${item.anomalyScore}</category>` : ""}
      ${item.profileLink ? `<category>profile-${item.profileLink}</category>` : ""}
    </item>`,
			)
			.join("\n");

		return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${meta.title}</title>
    <link>${meta.link}</link>
    <description>${meta.description}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Tier-1380 OMEGA Matrix RSS</generator>
    ${itemsXml}
  </channel>
</rss>`;
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

export class MatrixDashboard {
	private integrator: DashboardIntegrator;

	constructor() {
		this.integrator = new DashboardIntegrator();
	}

	/**
	 * Generate Matrix dashboard HTML
	 */
	generateDashboard(
		options: {
			view?: "grid" | "team" | "zone" | "api";
			team?: TeamId;
			zone?: string;
		} = {},
	): string {
		const { view = "grid", team, zone } = options;

		const content = `
    <div class="matrix-dashboard">
      <!-- Matrix Grid Section -->
      <div class="page-section">
        <h2 class="section-title">
          <i class="fas fa-th"></i>
          90-Column Matrix ${team ? `- ${TEAMS[team].emoji} ${TEAMS[team].name}` : zone ? `- ${zone} Zone` : "Overview"}
        </h2>
        <div id="matrix-grid" class="matrix-grid-container">
          ${this.generateGridHTML(team, zone)}
        </div>
      </div>

      <!-- Zone Legend -->
      <div class="page-section">
        <h2 class="section-title">
          <i class="fas fa-layer-group"></i>
          Zone Legend
        </h2>
        <div class="zone-legend">
          <div class="zone-item"><span class="zone-color runtime"></span> Core (1-10) - Runtime</div>
          <div class="zone-item"><span class="zone-color security"></span> Security (11-20) - Security</div>
          <div class="zone-item"><span class="zone-color platform"></span> Platform (21-30) - Platform</div>
          <div class="zone-item"><span class="zone-color tension"></span> Tension (31-45) - Anomaly Detection</div>
          <div class="zone-item"><span class="zone-color infra"></span> Infra (46-60) - Infrastructure</div>
          <div class="zone-item"><span class="zone-color validation"></span> Validation (61-75) - Baseline Tracking</div>
          <div class="zone-item"><span class="zone-color extensibility"></span> Extensibility (76-90) - Profiles</div>
        </div>
      </div>

      <!-- API Reference -->
      ${view === "api" ? this.generateAPIReferenceHTML() : ""}

      <!-- RSS Feeds -->
      <div class="page-section">
        <h2 class="section-title">
          <i class="fas fa-rss"></i>
          Matrix RSS Feeds
        </h2>
        <div class="feed-list">
          <a href="https://matrix.factory-wager.com/rss" class="feed-link">
            <i class="fas fa-rss-square"></i> All Columns
          </a>
          <a href="https://tension.factory-wager.com/rss" class="feed-link">
            <i class="fas fa-rss-square"></i> Tension Zone
          </a>
          <a href="https://validation.factory-wager.com/rss" class="feed-link">
            <i class="fas fa-rss-square"></i> Validation Zone
          </a>
          <a href="https://profiles.factory-wager.com/rss" class="feed-link">
            <i class="fas fa-rss-square"></i> Profile Uploads
          </a>
        </div>
      </div>
    </div>

    <style>
      .matrix-grid-container {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
        max-width: 800px;
      }
      .matrix-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s;
      }
      .matrix-cell:hover {
        transform: scale(1.1);
      }
      .runtime { background: #3b82f6; color: white; }
      .security { background: #ef4444; color: white; }
      .platform { background: #8b5cf6; color: white; }
      .tension { background: #f97316; color: white; }
      .infra { background: #10b981; color: white; }
      .validation { background: #eab308; color: black; }
      .extensibility { background: #9ca3af; color: black; }
      
      .zone-legend {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px;
      }
      .zone-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: #0f172a;
        border-radius: 4px;
      }
      .zone-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
      }
      
      .feed-list {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .feed-link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #0f172a;
        border-radius: 8px;
        color: #3b82f6;
        text-decoration: none;
        transition: background 0.2s;
      }
      .feed-link:hover {
        background: #1e293b;
      }
      .feed-link i {
        color: #f59e0b;
      }
    </style>
    `;

		return this.integrator.generateCompletePage("core", content);
	}

	private generateGridHTML(teamFilter?: TeamId, zoneFilter?: string): string {
		const cells: string[] = [];

		for (let i = 1; i <= 90; i++) {
			const colTeam = getTeamForColumn(i);
			const colZone = getZoneForColumn(i);

			if (teamFilter && colTeam?.id !== teamFilter) continue;
			if (zoneFilter && colZone !== zoneFilter) continue;

			const teamClass = colTeam?.id || "unassigned";
			cells.push(`<div class="matrix-cell ${teamClass}">${i}</div>`);
		}

		return cells.join("\n");
	}

	private generateAPIReferenceHTML(): string {
		const apis = BUN_API_CATALOG.slice(0, 10);

		return `
    <div class="page-section">
      <h2 class="section-title">
        <i class="fas fa-code"></i>
        Bun API Reference
      </h2>
      <div class="api-list">
        ${apis
					.map(
						(api) => `
          <div class="api-item">
            <code class="api-name">${api.api}</code>
            <span class="api-kind">${api.kind}</span>
            <p class="api-notes">${api.notes}</p>
          </div>
        `,
					)
					.join("")}
      </div>
      <a href="https://api.factory-wager.com/matrix" class="view-all">View All APIs →</a>
    </div>
    
    <style>
      .api-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .api-item {
        padding: 12px;
        background: #0f172a;
        border-radius: 8px;
      }
      .api-name {
        color: #3b82f6;
        font-weight: bold;
      }
      .api-kind {
        margin-left: 8px;
        padding: 2px 8px;
        background: #334155;
        border-radius: 4px;
        font-size: 12px;
      }
      .api-notes {
        margin-top: 8px;
        color: #94a3b8;
        font-size: 14px;
      }
      .view-all {
        display: inline-block;
        margin-top: 16px;
        color: #3b82f6;
        text-decoration: none;
      }
    </style>
    `;
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function getTeamForColumn(index: number) {
	return gtc(index);
}

function getZoneForColumn(index: number): string | null {
	if (index >= 1 && index <= 10) return "core";
	if (index >= 11 && index <= 20) return "security";
	if (index >= 21 && index <= 30) return "platform";
	if (index >= 31 && index <= 45) return "tension";
	if (index >= 46 && index <= 60) return "infra";
	if (index >= 61 && index <= 75) return "validation";
	if (index >= 76 && index <= 90) return "extensibility";
	return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
	const command = Bun.argv[2];
	const arg = Bun.argv[3];

	console.log("🔥 Tier-1380 OMEGA Matrix Integration Hub\n");

	switch (command) {
		case "subdomains": {
			console.log("Matrix Subdomains:\n");
			for (const sub of MATRIX_SUBDOMAINS) {
				console.log(`  ${sub.subdomain}`);
				console.log(`    Path: ${sub.path}`);
				console.log(`    Team: ${TEAMS[sub.team].emoji} ${TEAMS[sub.team].name}`);
				console.log(
					`    Columns: ${sub.matrixColumns[0]}-${sub.matrixColumns[sub.matrixColumns.length - 1]}`,
				);
				console.log(`    Features: ${sub.features.join(", ")}`);
				console.log();
			}
			break;
		}

		case "rss": {
			const rss = new MatrixRSSFeed();
			if (arg === "anomaly") {
				rss.generateAnomalyFeed().then((feed) => console.log(feed));
			} else if (arg === "profile") {
				rss.generateProfileFeed().then((feed) => console.log(feed));
			} else {
				rss
					.generateMatrixFeed({ team: arg as TeamId })
					.then((feed) => console.log(feed));
			}
			break;
		}

		case "dashboard": {
			const dashboard = new MatrixDashboard();
			const html = dashboard.generateDashboard({ view: "grid" });
			console.log(`Dashboard HTML generated (${html.length} bytes)`);
			console.log("\nPreview:");
			console.log(`${html.slice(0, 1000)}...`);
			break;
		}

		case "api": {
			console.log("Bun APIs used in Matrix:\n");
			for (const api of BUN_API_CATALOG.slice(0, 10)) {
				console.log(`  ${api.id}. ${api.api}`);
				console.log(`     Areas: ${api.matrixArea.join(", ")}`);
				console.log();
			}
			break;
		}

		default: {
			console.log("Commands:");
			console.log("  subdomains          List matrix subdomains");
			console.log("  rss [team|anomaly|profile]  Generate RSS feed");
			console.log("  dashboard           Generate dashboard HTML");
			console.log("  api                 List Bun APIs");
			console.log("\nIntegration complete: matrix ↔ subdomain ↔ rss ↔ dashboard");
		}
	}
}

export { MATRIX_SUBDOMAINS, MatrixRSSFeed, MatrixDashboard };
