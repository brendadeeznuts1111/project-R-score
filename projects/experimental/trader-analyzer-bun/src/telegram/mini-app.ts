/**
 * @fileoverview 9.1.1.2.0.0: Trading UI Telegram Mini App bootstrapper
 * @description Entry point for Telegram's iframe context with HTMLRewriter integration
 * @module telegram/mini-app
 */

import { injectTelegramContext } from "./mini-app-context";
import { BookmakerRouter } from "./bookmaker-router";
import type { HyperBunUIContext } from "../services/ui-context-rewriter";
import { getAllMappings } from "./topic-mapping";

type MiniAppTab =
	| "dashboard"
	| "urgent"
	| "patterns"
	| "search"
	| "history"
	| "topgames"
	| "debug";

type SortKey =
	| "risk"
	| "agent"
	| "sport"
	| "time"
	| "vig"
	| "movement"
	| "clv";

type FilterKey =
	| "highjuice"
	| "goodmovement"
	| "buyingpoints"
	| "futuregames"
	| "clvpositive";

interface BetRow {
	id: string;
	customer: string;
	agent: string;
	player: string;
	sport: string;
	game: string;
	market: string;
	description: string;
	risk: number;
	vigPct: number;
	movementPts: number;
	clvPct: number;
	betTime: number | null;
}

interface SearchResponse {
	items: BetRow[];
	query: string;
	sort: SortKey;
	filters: FilterKey[];
}

interface TopGameRow {
	game: string;
	sport: string;
	totalRisk: number;
	totalBets: number;
	avgVigPct: number;
	avgMovementPts: number;
	avgClvPct: number;
	lastBetTime: number | null;
	customers: string[];
	bets: Array<{
		customer: string;
		agent: string;
		risk: number;
		betTime: number | null;
		movementPts: number;
		vigPct: number;
		clvPct: number;
		description: string;
	}>;
}

interface PatternsResponse {
	heatmaps: {
		agent: Array<Record<string, string | number>>;
		sport: Array<Record<string, string | number>>;
		time: Array<Record<string, string | number>>;
	};
	summaries: Record<string, string | number>;
}

interface MiniAppState {
	apiBaseUrl: string;
	sortBy: SortKey;
	searchTerm: string;
	filters: Set<FilterKey>;
	urgentRows: BetRow[];
	searchRows: BetRow[];
	historyRows: BetRow[];
	topGames: TopGameRow[];
	patterns: PatternsResponse | null;
	status: Record<string, unknown> | null;
}

const TAB_DEFINITIONS: Array<{
	id: MiniAppTab;
	label: string;
	description: string;
}> = [
	{ id: "dashboard", label: "Dashboard", description: "Fantasy402 overview" },
	{ id: "urgent", label: "Urgent", description: "High-risk bets" },
	{ id: "patterns", label: "Patterns", description: "Heatmaps + CLV" },
	{ id: "search", label: "Search", description: "Live bet search" },
	{ id: "history", label: "History", description: "Recent movement" },
	{ id: "topgames", label: "Top Games", description: "Game clustering" },
	{ id: "debug", label: "Debug", description: "Port + uptime" },
];

const FILTER_CHIPS: Array<{ key: FilterKey; label: string }> = [
	{ key: "highjuice", label: "High Juice" },
	{ key: "goodmovement", label: "Good Movement" },
	{ key: "buyingpoints", label: "Buying Points" },
	{ key: "futuregames", label: "Future Games" },
	{ key: "clvpositive", label: "CLV+" },
];

if (typeof document !== "undefined") {
	document.addEventListener("DOMContentLoaded", () => {
		try {
			const baseContext = (window as any)
				.HYPERBUN_UI_CONTEXT as HyperBunUIContext;

			if (!baseContext) {
				throw new Error("Base UIContext not found");
			}

			injectTelegramContext(baseContext);

			const router = new BookmakerRouter();
			renderFantasy402MiniApp(baseContext, router);

			console.log("9.1.1.2.0.2: Mini App initialized", {
				hasContext: !!(window as any).HYPERBUN_UI_CONTEXT,
				apiBaseUrl: baseContext.apiBaseUrl,
				telegramUserId: (window as any).HYPERBUN_UI_CONTEXT?.telegramUserId,
				userRole: (window as any).HYPERBUN_UI_CONTEXT?.userRole,
				bookmaker: router.getBookmakerName(),
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("9.1.1.2.0.3: Mini App initialization failed", errorMessage);
			if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
				(window as any).Telegram.WebApp.showAlert(`Init failed: ${errorMessage}`);
			}
		}
	});
}

function renderFantasy402MiniApp(
	baseContext: HyperBunUIContext,
	router: BookmakerRouter,
): void {
	const root = ensureRoot();
	const topicMappings = getAllMappings();
	const context = (window as any).HYPERBUN_UI_CONTEXT || {};
	const bookmaker = router.getBookmakerName() || "Fantasy402";
	const state: MiniAppState = {
		apiBaseUrl: baseContext.apiBaseUrl,
		sortBy: "risk",
		searchTerm: "",
		filters: new Set<FilterKey>(),
		urgentRows: [],
		searchRows: [],
		historyRows: [],
		topGames: [],
		patterns: null,
		status: null,
	};

	root.innerHTML = `
		<div class="f402-shell">
			<header class="f402-hero">
				<div>
					<p class="f402-kicker">Fantasy402 Alerts</p>
					<h1>Bet Intelligence Mini App</h1>
					<p class="f402-subtitle">Real risk, CLV, vig, movement, and topic-aware routing on one surface.</p>
				</div>
				<div class="f402-badge-group">
					<div class="f402-badge">${escapeHtml(bookmaker)}</div>
					<div class="f402-badge subdued">${escapeHtml(String(context.userRole || "guest"))}</div>
				</div>
			</header>

			<section class="f402-overview">
				<div class="f402-card">
					<span class="f402-label">Telegram User</span>
					<strong>${escapeHtml(String(context.telegramUserId || "unknown"))}</strong>
				</div>
				<div class="f402-card">
					<span class="f402-label">API Base</span>
					<strong>${escapeHtml(baseContext.apiBaseUrl)}</strong>
				</div>
				<div class="f402-card">
					<span class="f402-label">Topics</span>
					<strong>${Object.keys(topicMappings).length} mapped</strong>
				</div>
				<div class="f402-card">
					<span class="f402-label">Access</span>
					<strong>${context.userRole === "admin" ? "Admin" : "Viewer"}</strong>
				</div>
			</section>

			<section class="f402-chip-bar" data-filter-bar>
				${FILTER_CHIPS.map(
					(chip) => `
						<button type="button" class="f402-chip" data-filter="${chip.key}">${chip.label}</button>
					`,
				).join("")}
			</section>

			<nav class="f402-tabs" aria-label="Fantasy402 views">
				${TAB_DEFINITIONS.map(
					(tab, index) => `
						<button class="f402-tab${index === 0 ? " is-active" : ""}" data-tab="${tab.id}">
							<span>${tab.label}</span>
							<small>${tab.description}</small>
						</button>
					`,
				).join("")}
			</nav>

			<section class="f402-panels">
				${buildPanel(
					"dashboard",
					`
						<div class="f402-grid" data-topic-grid>
							${Object.entries(topicMappings)
								.map(
									([label, threadId]) => `
										<section class="f402-topic-card">
											<span class="f402-label">Topic</span>
											<h2>${escapeHtml(label)}</h2>
											<p>message_thread_id: <strong>${threadId}</strong></p>
										</section>
									`,
								)
								.join("")}
						</div>
						<section class="f402-grid compact" data-dashboard-metrics></section>
					`,
				)}
				${buildPanel(
					"urgent",
					buildDataTableSection(
						"urgent",
						"High-risk bets over $1,000, movement spikes, and CLV pressure.",
					),
				)}
				${buildPanel(
					"patterns",
					`
						<section class="f402-grid compact" data-pattern-summary></section>
						<div class="f402-grid compact">
							${buildHeatmapCard("Agent Heatmap", "agent")}
							${buildHeatmapCard("Sport Heatmap", "sport")}
							${buildHeatmapCard("Time Heatmap", "time")}
						</div>
					`,
				)}
				${buildPanel(
					"search",
					`
						<section class="f402-stack">
							<label class="f402-search">
								<span class="f402-label">Search</span>
								<input type="search" data-search-input placeholder="Search customer, agent, player, game" />
							</label>
							${buildDataTableSection(
								"search",
								"Live searchable bets with sorting and filter chips.",
							)}
						</section>
					`,
				)}
				${buildPanel(
					"history",
					buildDataTableSection(
						"history",
						"Recent game-centric movement and betting history.",
					),
				)}
				${buildPanel(
					"topgames",
					`
						<section class="f402-callout neutral">
							<h2>Top Games + Movement</h2>
							<p>Grouped by game with customer bets, line movement, CLV, and vig concentration.</p>
						</section>
						<div data-topgames></div>
					`,
				)}
				${buildPanel(
					"debug",
					`
						<section class="f402-callout neutral">
							<h2>Fantasy402 Debug</h2>
							<p>Port, uptime, DB count, connection state, and last juice parse.</p>
						</section>
						<section class="f402-topic-card f402-live-block">
							<pre data-debug-status>Loading debug status…</pre>
						</section>
					`,
				)}
			</section>
		</div>
	`;

	injectMiniAppStyles();
	wireTabNavigation(root);
	wireFilterChips(root, state);
	wireSearch(root, state);
	void hydrateMiniApp(root, state);
}

function buildPanel(id: MiniAppTab, content: string): string {
	return `<article class="f402-panel${id === "dashboard" ? " is-active" : ""}" data-panel="${id}">${content}</article>`;
}

function buildDataTableSection(id: string, description: string): string {
	return `
		<section class="f402-callout neutral">
			<h2>${id === "urgent" ? "Urgent Alerts" : capitalize(id)}</h2>
			<p>${escapeHtml(description)}</p>
		</section>
		<div class="f402-data-table" data-table-root="${id}"></div>
	`;
}

function buildHeatmapCard(label: string, key: string): string {
	return `
		<section class="f402-topic-card">
			<span class="f402-label">${escapeHtml(label)}</span>
			<div data-heatmap="${key}"></div>
		</section>
	`;
}

async function hydrateMiniApp(
	root: HTMLElement,
	state: MiniAppState,
): Promise<void> {
	const [urgent, patterns, search, history, topgames, status] =
		await Promise.allSettled([
			fetchJson<{ items: BetRow[]; summary: Record<string, number> }>(
				`${state.apiBaseUrl}/api/f402/urgent`,
			),
			fetchJson<PatternsResponse>(`${state.apiBaseUrl}/api/f402/patterns`),
			loadSearch(state),
			fetchJson<{ items: BetRow[] }>(
				`${state.apiBaseUrl}/api/f402/history?days=1`,
			),
			fetchJson<{ items: TopGameRow[] }>(
				`${state.apiBaseUrl}/api/f402/topgames`,
			),
			fetchJson<Record<string, unknown>>(`${state.apiBaseUrl}/api/f402/status`),
		]);

	state.urgentRows = urgent.status === "fulfilled" ? urgent.value.items : [];
	state.searchRows = search.status === "fulfilled" ? search.value.items : [];
	state.historyRows = history.status === "fulfilled" ? history.value.items : [];
	state.topGames = topgames.status === "fulfilled" ? topgames.value.items : [];
	state.patterns = patterns.status === "fulfilled" ? patterns.value : null;
	state.status = status.status === "fulfilled" ? status.value : null;

	renderAllDataViews(root, state);
}

function renderAllDataViews(root: HTMLElement, state: MiniAppState): void {
	renderDashboard(root, state.status);
	renderBetTable(root, "urgent", applyFiltersToRows(state.urgentRows, state.filters), state.sortBy);
	renderPatterns(root, state.patterns, state.sortBy);
	renderBetTable(root, "search", applyFiltersToRows(state.searchRows, state.filters), state.sortBy);
	renderBetTable(root, "history", applyFiltersToRows(state.historyRows, state.filters), state.sortBy);
	renderTopGames(root, applyFiltersToTopGames(state.topGames, state.filters), state.sortBy);
	updateText(
		root,
		"[data-debug-status]",
		state.status ? JSON.stringify(state.status, null, 2) : "Debug status unavailable",
	);
}

function renderDashboard(
	root: HTMLElement,
	data: Record<string, unknown> | null,
): void {
	const target = root.querySelector<HTMLElement>("[data-dashboard-metrics]");
	if (!target) {
		return;
	}

	const metrics = [
		["Port", String(data?.port || "n/a")],
		["Uptime", `${data?.uptimeSeconds || 0}s`],
		["DB Count", String(data?.dbCount || 0)],
		["Last Juice Parse", String(data?.lastJuiceParse || "n/a")],
	];

	target.innerHTML = metrics
		.map(
			([label, value]) => `
				<div class="f402-topic-card">
					<span class="f402-label">${escapeHtml(label)}</span>
					<h2>${escapeHtml(value)}</h2>
				</div>
			`,
		)
		.join("");
}

function renderPatterns(
	root: HTMLElement,
	data: PatternsResponse | null,
	sortBy: SortKey,
): void {
	if (!data) {
		updateText(root, "[data-pattern-summary]", "Pattern data unavailable");
		return;
	}

	const summary = root.querySelector<HTMLElement>("[data-pattern-summary]");
	if (summary) {
		summary.innerHTML = Object.entries(data.summaries)
			.map(
				([label, value]) => `
					<div class="f402-topic-card">
						<span class="f402-label">${escapeHtml(label)}</span>
						<h2>${escapeHtml(String(value))}</h2>
					</div>
				`,
			)
			.join("");
	}

	renderHeatmapTable(root, "agent", data.heatmaps.agent, sortBy);
	renderHeatmapTable(root, "sport", data.heatmaps.sport, sortBy);
	renderHeatmapTable(root, "time", data.heatmaps.time, sortBy);
}

function renderHeatmapTable(
	root: HTMLElement,
	key: string,
	rows: Array<Record<string, string | number>>,
	sortBy: SortKey,
): void {
	const target = root.querySelector<HTMLElement>(`[data-heatmap="${key}"]`);
	if (!target) {
		return;
	}

	const sortedRows = sortHeatmapRows(rows, sortBy);
	target.innerHTML = `
		<table class="f402-table compact">
			<thead>
				<tr>
					<th>Label</th>
					<th>Count</th>
					<th data-sort="risk">Risk</th>
					<th data-sort="vig">Vig%</th>
					<th data-sort="clv">CLV%</th>
				</tr>
			</thead>
			<tbody>
				${sortedRows
					.slice(0, 8)
					.map(
						(row) => `
							<tr>
								<td>${escapeHtml(String(row.label || ""))}</td>
								<td>${escapeHtml(String(row.count || 0))}</td>
								<td>${escapeHtml(String(row.risk || 0))}</td>
								<td>${escapeHtml(String(row.avgVigPct || 0))}</td>
								<td>${escapeHtml(String(row.avgClvPct || 0))}</td>
							</tr>
						`,
					)
					.join("")}
			</tbody>
		</table>
	`;
}

function renderBetTable(
	root: HTMLElement,
	tableId: string,
	rows: BetRow[],
	sortBy: SortKey,
): void {
	const target = root.querySelector<HTMLElement>(`[data-table-root="${tableId}"]`);
	if (!target) {
		return;
	}

	const sorted = sortRows(rows, sortBy);
	target.innerHTML = `
		<table class="f402-table">
			<thead>
				<tr>
					${buildSortableHeader("Customer", "agent")}
					${buildSortableHeader("Agent", "agent")}
					${buildSortableHeader("Sport", "sport")}
					<th>Game</th>
					${buildSortableHeader("Risk", "risk")}
					${buildSortableHeader("Time", "time")}
					${buildSortableHeader("Vig%", "vig")}
					${buildSortableHeader("Movement Pts", "movement")}
					${buildSortableHeader("CLV%", "clv")}
				</tr>
			</thead>
			<tbody>
				${sorted
					.slice(0, 100)
					.map(
						(row) => `
							<tr>
								<td>${escapeHtml(row.customer)}</td>
								<td>${escapeHtml(row.agent)}</td>
								<td>${escapeHtml(row.sport)}</td>
								<td>
									<strong>${escapeHtml(row.game)}</strong>
									<div class="f402-cell-sub">${escapeHtml(row.description)}</div>
								</td>
								<td>${formatNumber(row.risk)}</td>
								<td>${escapeHtml(formatTime(row.betTime))}</td>
								<td>${formatNumber(row.vigPct)}</td>
								<td>${formatNumber(row.movementPts)}</td>
								<td>${formatNumber(row.clvPct)}</td>
							</tr>
						`,
					)
					.join("")}
			</tbody>
		</table>
	`;
}

function renderTopGames(root: HTMLElement, rows: TopGameRow[]): void {
	const target = root.querySelector<HTMLElement>("[data-topgames]");
	if (!target) {
		return;
	}

	target.innerHTML = `
		<table class="f402-table">
			<thead>
				<tr>
					<th>Game</th>
					<th data-sort="sport">Sport</th>
					<th data-sort="risk">Risk</th>
					<th data-sort="vig">Vig%</th>
					<th data-sort="movement">Movement Pts</th>
					<th data-sort="clv">CLV%</th>
					<th data-sort="time">Last Bet</th>
				</tr>
			</thead>
			<tbody>
				${rows
					.slice(0, 20)
					.map(
						(game) => `
							<tr>
								<td>
									<strong>${escapeHtml(game.game)}</strong>
									<div class="f402-cell-sub">${escapeHtml(game.customers.slice(0, 4).join(", "))}</div>
								</td>
								<td>${escapeHtml(game.sport)}</td>
								<td>${formatNumber(game.totalRisk)}</td>
								<td>${formatNumber(game.avgVigPct)}</td>
								<td>${formatNumber(game.avgMovementPts)}</td>
								<td>${formatNumber(game.avgClvPct)}</td>
								<td>${escapeHtml(formatTime(game.lastBetTime))}</td>
							</tr>
						`,
					)
					.join("")}
			</tbody>
		</table>
	`;
}

function wireTabNavigation(root: HTMLElement): void {
	const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-tab]"));
	const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));

	for (const tab of tabs) {
		tab.addEventListener("click", () => {
			const active = tab.dataset.tab;
			for (const item of tabs) {
				item.classList.toggle("is-active", item === tab);
			}
			for (const panel of panels) {
				panel.classList.toggle("is-active", panel.dataset.panel === active);
			}
		});
	}
}

function wireFilterChips(root: HTMLElement, state: MiniAppState): void {
	const chips = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-filter]"));

	for (const chip of chips) {
		chip.addEventListener("click", async () => {
			const filter = chip.dataset.filter as FilterKey;
			if (state.filters.has(filter)) {
				state.filters.delete(filter);
			} else {
				state.filters.add(filter);
			}

			chip.classList.toggle("is-active", state.filters.has(filter));
			state.searchRows = (await loadSearch(state)).items;
			renderAllDataViews(root, state);
		});
	}

	root.addEventListener("click", async (event) => {
		const header = (event.target as HTMLElement).closest<HTMLElement>("[data-sort]");
		if (!header) {
			return;
		}

		state.sortBy = header.dataset.sort as SortKey;
		state.searchRows = (await loadSearch(state)).items;
		state.topGames = sortTopGames(state.topGames, state.sortBy);
		renderAllDataViews(root, state);
	});
}

function wireSearch(root: HTMLElement, state: MiniAppState): void {
	const input = root.querySelector<HTMLInputElement>("[data-search-input]");
	if (!input) {
		return;
	}

	input.addEventListener("input", async () => {
		state.searchTerm = input.value;
		state.searchRows = (await loadSearch(state)).items;
		renderAllDataViews(root, state);
	});
}

async function loadSearch(state: MiniAppState): Promise<SearchResponse> {
	const params = new URLSearchParams();
	if (state.searchTerm) {
		params.set("q", state.searchTerm);
	}
	params.set("sort", state.sortBy);
	if (state.filters.size > 0) {
		params.set("filter", Array.from(state.filters).join(","));
	}

	return fetchJson<SearchResponse>(
		`${state.apiBaseUrl}/api/f402/search?${params.toString()}`,
	);
}

function ensureRoot(): HTMLElement {
	const existing = document.getElementById("fantasy402-mini-app");
	if (existing) {
		return existing;
	}

	const root = document.createElement("main");
	root.id = "fantasy402-mini-app";
	document.body.innerHTML = "";
	document.body.appendChild(root);
	return root;
}

function injectMiniAppStyles(): void {
	if (document.getElementById("fantasy402-mini-app-styles")) {
		return;
	}

	const style = document.createElement("style");
	style.id = "fantasy402-mini-app-styles";
	style.textContent = `
		:root {
			--f402-bg: radial-gradient(circle at top, #1e293b 0%, #0f172a 45%, #020617 100%);
			--f402-panel: rgba(15, 23, 42, 0.82);
			--f402-panel-alt: rgba(30, 41, 59, 0.88);
			--f402-border: rgba(148, 163, 184, 0.18);
			--f402-text: #e5edf7;
			--f402-muted: #9fb0c7;
			--f402-accent: #f97316;
			--f402-accent-soft: rgba(249, 115, 22, 0.18);
			--f402-good: #22c55e;
			--f402-danger: #ef4444;
		}

		body {
			margin: 0;
			font-family: "SF Pro Display", "Segoe UI", sans-serif;
			background: var(--f402-bg);
			color: var(--f402-text);
		}

		#fantasy402-mini-app {
			padding: 20px 16px 32px;
		}

		.f402-shell {
			max-width: 1200px;
			margin: 0 auto;
		}

		.f402-hero,
		.f402-overview,
		.f402-tabs,
		.f402-panel,
		.f402-topic-card,
		.f402-callout,
		.f402-search input,
		.f402-chip,
		.f402-table {
			border: 1px solid var(--f402-border);
			box-shadow: 0 20px 60px rgba(15, 23, 42, 0.26);
		}

		.f402-hero {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			padding: 20px;
			border-radius: 24px;
			background: rgba(15, 23, 42, 0.72);
		}

		.f402-badge-group {
			display: flex;
			gap: 8px;
			align-items: flex-start;
		}

		.f402-kicker,
		.f402-label,
		.f402-tab small {
			color: var(--f402-muted);
			text-transform: uppercase;
			letter-spacing: 0.08em;
			font-size: 11px;
		}

		.f402-subtitle,
		.f402-cell-sub,
		.f402-topgame-meta {
			color: var(--f402-muted);
		}

		.f402-badge {
			padding: 10px 14px;
			border-radius: 999px;
			background: var(--f402-accent-soft);
			color: #ffd6bd;
			font-weight: 700;
		}

		.f402-badge.subdued {
			background: rgba(96, 165, 250, 0.18);
			color: #bfdbfe;
		}

		.f402-overview,
		.f402-grid {
			display: grid;
			gap: 12px;
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
			margin-top: 16px;
		}

		.f402-card,
		.f402-topic-card,
		.f402-callout,
		.f402-panel {
			background: var(--f402-panel);
			border-radius: 20px;
			padding: 16px;
		}

		.f402-chip-bar {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 16px;
		}

		.f402-chip {
			background: rgba(15, 23, 42, 0.72);
			color: var(--f402-text);
			border-radius: 999px;
			padding: 10px 12px;
		}

		.f402-chip.is-active {
			background: var(--f402-accent-soft);
			outline: 1px solid rgba(249, 115, 22, 0.35);
		}

		.f402-tabs {
			display: grid;
			grid-template-columns: repeat(7, minmax(0, 1fr));
			gap: 10px;
			margin-top: 16px;
			padding: 10px;
			border-radius: 20px;
			background: rgba(15, 23, 42, 0.6);
		}

		.f402-tab {
			background: transparent;
			color: var(--f402-text);
			border: 0;
			border-radius: 16px;
			padding: 12px;
			text-align: left;
		}

		.f402-tab.is-active {
			background: var(--f402-accent-soft);
			outline: 1px solid rgba(249, 115, 22, 0.35);
		}

		.f402-panels {
			margin-top: 16px;
		}

		.f402-panel {
			display: none;
			background: var(--f402-panel-alt);
		}

		.f402-panel.is-active {
			display: block;
		}

		.f402-stack {
			display: grid;
			gap: 12px;
		}

		.f402-search input {
			margin-top: 8px;
			width: 100%;
			box-sizing: border-box;
			border-radius: 14px;
			background: rgba(15, 23, 42, 0.9);
			color: var(--f402-text);
			padding: 14px 16px;
		}

		.f402-table {
			width: 100%;
			border-collapse: collapse;
			background: rgba(15, 23, 42, 0.92);
			border-radius: 16px;
			overflow: hidden;
			margin-top: 12px;
		}

		.f402-table th,
		.f402-table td {
			padding: 12px 10px;
			border-bottom: 1px solid rgba(148, 163, 184, 0.14);
			vertical-align: top;
			text-align: left;
		}

		.f402-table th[data-sort] {
			cursor: pointer;
			color: #fed7aa;
		}

		.f402-table.compact th,
		.f402-table.compact td {
			padding: 8px;
			font-size: 12px;
		}

		.f402-live-block pre {
			margin: 10px 0 0;
			padding: 12px;
			border-radius: 12px;
			background: rgba(15, 23, 42, 0.92);
			color: #cbd5e1;
			overflow: auto;
			font-size: 12px;
			line-height: 1.45;
		}

		.f402-topgame-head {
			display: flex;
			justify-content: space-between;
			gap: 12px;
			align-items: center;
		}

		.f402-topgame-stats {
			text-align: right;
		}

		.f402-history {
			margin: 12px 0 0;
			padding-left: 18px;
			color: var(--f402-muted);
		}

		@media (max-width: 900px) {
			.f402-tabs {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 720px) {
			.f402-hero {
				flex-direction: column;
			}
		}
	`;

	document.head.appendChild(style);
}

function buildSortableHeader(label: string, sort: SortKey): string {
	return `<th data-sort="${sort}">${escapeHtml(label)}</th>`;
}

function sortRows(rows: BetRow[], sortBy: SortKey): BetRow[] {
	const items = [...rows];
	items.sort((left, right) => {
		switch (sortBy) {
			case "agent":
				return left.agent.localeCompare(right.agent);
			case "sport":
				return left.sport.localeCompare(right.sport);
			case "time":
				return (right.betTime || 0) - (left.betTime || 0);
			case "vig":
				return right.vigPct - left.vigPct;
			case "movement":
				return right.movementPts - left.movementPts;
			case "clv":
				return right.clvPct - left.clvPct;
			case "risk":
			default:
				return right.risk - left.risk;
		}
	});
	return items;
}

function applyFiltersToRows(rows: BetRow[], filters: Set<FilterKey>): BetRow[] {
	if (filters.size === 0) {
		return rows;
	}

	const now = Date.now() / 1000;
	return rows.filter((row) =>
		Array.from(filters).every((filter) => {
			switch (filter) {
				case "highjuice":
					return row.vigPct >= 4.76;
				case "goodmovement":
					return row.movementPts > 0 || row.clvPct > 0;
				case "buyingpoints":
					return /buy(?:ing)?\s*points?/i.test(row.description) || row.vigPct > 4.76;
				case "futuregames":
					return (row.betTime || 0) >= now;
				case "clvpositive":
					return row.clvPct > 0;
				default:
					return true;
			}
		}),
	);
}

function applyFiltersToTopGames(
	rows: TopGameRow[],
	filters: Set<FilterKey>,
): TopGameRow[] {
	if (filters.size === 0) {
		return rows;
	}

	return rows.filter((row) =>
		Array.from(filters).every((filter) => {
			switch (filter) {
				case "highjuice":
					return row.avgVigPct >= 4.76;
				case "goodmovement":
					return row.avgMovementPts > 0 || row.avgClvPct > 0;
				case "buyingpoints":
					return row.avgVigPct > 4.76;
				case "futuregames":
					return (row.lastBetTime || 0) >= Date.now() / 1000;
				case "clvpositive":
					return row.avgClvPct > 0;
				default:
					return true;
			}
		}),
	);
}

function sortTopGames(rows: TopGameRow[], sortBy: SortKey): TopGameRow[] {
	const items = [...rows];
	items.sort((left, right) => {
		switch (sortBy) {
			case "sport":
				return left.sport.localeCompare(right.sport);
			case "time":
				return (right.lastBetTime || 0) - (left.lastBetTime || 0);
			case "vig":
				return right.avgVigPct - left.avgVigPct;
			case "movement":
				return right.avgMovementPts - left.avgMovementPts;
			case "clv":
				return right.avgClvPct - left.avgClvPct;
			case "risk":
			default:
				return right.totalRisk - left.totalRisk;
		}
	});
	return items;
}

function sortHeatmapRows(
	rows: Array<Record<string, string | number>>,
	sortBy: SortKey,
): Array<Record<string, string | number>> {
	const items = [...rows];
	items.sort((left, right) => {
		switch (sortBy) {
			case "vig":
				return Number(right.avgVigPct || 0) - Number(left.avgVigPct || 0);
			case "clv":
				return Number(right.avgClvPct || 0) - Number(left.avgClvPct || 0);
			case "risk":
			default:
				return Number(right.risk || 0) - Number(left.risk || 0);
		}
	});
	return items;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return response.json();
}

function updateText(root: HTMLElement, selector: string, value: string): void {
	const element = root.querySelector(selector);
	if (element) {
		element.textContent = value;
	}
}

function formatNumber(value: number): string {
	return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "0";
}

function formatTime(value: number | null): string {
	if (!value) {
		return "n/a";
	}
	return new Date(value * 1000).toLocaleString();
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
