#!/usr/bin/env bun

/**
 * @fileoverview NEXUS Trading Dashboard - CLI Dashboard for Trading System Monitoring
 * @description Real-time trading dashboard with live updates for NEXUS Trading Intelligence Platform
 * @module cli/dashboard
 *
 * NEXUS Trading Dashboard provides:
 * - Real-time trade stream monitoring
 * - Cross-market arbitrage opportunity detection
 * - Live trading executor status
 * - System health and performance metrics
 * - Cache statistics and optimization
 */

import { createBunShellTools, createBunToolingTools, MCPServer } from "../mcp";
import {
	getBooksByWeight,
	getConnectedBooks,
	SHARP_BOOKS,
	type SharpBookConfig,
	sharpBookRegistry,
} from "../orca/sharp-books";
import {
	box,
	colors,
	formatBytes,
	formatCurrency,
	formatDuration,
	formatNumber,
	formatPercent,
	nativeLogs,
	nativeMetrics,
	nativeMiniapp,
	nativeRanking,
	nexusColors,
	printTable,
	runtime,
	type TableColumn,
	timing,
} from "../utils";

// Dashboard configuration
const API_BASE = process.env.API_URL || "http://localhost:3001";
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL || "5000", 10);

// Performance thresholds (validated patterns from PRODUCTION-PATTERNS.md)
const PERFORMANCE_THRESHOLDS = {
	apiFetch: 3_000_000_000, // 3s timeout
	scopePatternValidation: 500, // 500ns per validation
	renderOperation: 10_000_000, // 10ms per render
} as const;

// Types for API responses
interface HealthResponse {
	status: string;
	timestamp: string;
}

interface StreamMeta {
	id: string;
	name: string;
	source: string;
	symbol: string;
	count: number;
	from?: string;
	to?: string;
}

interface StreamsResponse {
	streams: StreamMeta[];
	total: number;
	dateRange: { from?: string; to?: string };
}

interface TradingStatsResponse {
	stats: {
		totalTrades: number;
		winningTrades: number;
		losingTrades: number;
		totalProfit: number;
		totalLoss: number;
		netPnl: number;
		winRate: number;
		avgWin: number;
		avgLoss: number;
		largestWin: number;
		largestLoss: number;
	} | null;
	error?: string;
}

interface SportsBettingStatsResponse {
	stats: {
		totalBets: number;
		wins: number;
		losses: number;
		push: number;
		totalWagered: number;
		totalWon: number;
		netProfit: number;
		roi: number;
		winRate: number;
	} | null;
	error?: string;
}

interface BotStatusResponse {
	running: boolean;
	status: string;
	users: number;
	liveOuts: number;
	lastActivity?: string;
	settings?: Record<string, unknown>;
}

interface ArbitrageOpportunity {
	id: string;
	category: string;
	buyVenue: string;
	sellVenue: string;
	buyPrice: number;
	sellPrice: number;
	spread: number;
	spreadPct: number;
	confidence: number;
	timestamp: string;
}

// Actual API response format
interface ArbitrageStatusResponse {
	running: boolean;
	scanCount?: number;
	opportunities?: number;
	arbitrageOpportunities?: number;
	lastScanTime?: number | null;
	message?: string;
	alerts?: {
		running: boolean;
		port: number;
		clients: number;
	};
}

// Dashboard display format
interface ArbitrageResponse {
	scanning: boolean;
	opportunities: ArbitrageOpportunity[];
	lastScan?: string;
}

// Actual API response format
interface ExecutorStatusResponse {
	initialized: boolean;
	dryRun?: boolean;
	stats?: {
		totalExecutions: number;
		successfulExecutions: number;
		failedExecutions: number;
		totalCapitalDeployed: number;
		totalExpectedProfit: number;
		avgExecutionTimeMs: number;
	};
	message?: string;
}

// Dashboard display format
interface ExecutorStatus {
	running: boolean;
	mode: string;
	positions: number;
	totalPnL: number;
	trades: number;
}

// Actual API response format
interface CacheStatsResponse {
	totalEntries: number;
	totalHits: number;
	avgHits: number;
	expiredEntries: number;
	sizeBytes: number;
	oldestEntry: number | null;
	newestEntry: number | null;
	compressedEntries: number;
	compressionRatio: number;
	sizeFormatted?: string;
	oldestAge?: number | null;
	newestAge?: number | null;
}

// Dashboard display format
interface CacheStats {
	hits: number;
	misses: number;
	size: number;
	hitRate: number;
}

// ============ Type Guards & Scope Patterns ============

/**
 * Type-safe property access patterns using scope validation
 * Pattern: [scope.patterns] typesafe properties
 */

// Type guard: HealthResponse validation (optimized for performance)
function isValidHealthResponse(value: unknown): value is HealthResponse {
	// Fast path: basic type check only for performance
	return value !== null && typeof value === "object";
}

// Type guard: StreamsResponse validation (optimized for performance)
function isValidStreamsResponse(value: unknown): value is StreamsResponse {
	// Fast path: basic structure check only for performance
	if (!value || typeof value !== "object") return false;
	const obj = value as Record<string, unknown>;
	return Array.isArray(obj.streams) && typeof obj.total === "number";
}

// Type guard: ArbitrageStatusResponse validation (optimized for performance)
function isValidArbitrageStatusResponse(
	value: unknown,
): value is ArbitrageStatusResponse {
	// Fast path: basic type check only for performance
	return value !== null && typeof value === "object";
}

// Type guard: ExecutorStatusResponse validation (optimized for performance)
function isValidExecutorStatusResponse(
	value: unknown,
): value is ExecutorStatusResponse {
	// Fast path: basic type check only for performance
	return value !== null && typeof value === "object";
}

// Type guard: CacheStatsResponse validation (optimized for performance)
function isValidCacheStatsResponse(
	value: unknown,
): value is CacheStatsResponse {
	// Fast path: basic type check only for performance
	return value !== null && typeof value === "object";
}

/**
 * Scope pattern: Safe property access with validation
 * Pattern: [scope.patterns] typesafe properties
 */
namespace ScopePatterns {
	/**
	 * Safe property access with type narrowing
	 * Returns validated value or null
	 */
	export function safe<T>(
		value: unknown,
		guard: (v: unknown) => v is T,
	): T | null {
		return guard(value) ? value : null;
	}

	/**
	 * Safe property access with default fallback
	 */
	export function safeWithDefault<T>(
		value: unknown,
		guard: (v: unknown) => v is T,
		defaultValue: T,
	): T {
		return guard(value) ? value : defaultValue;
	}

	/**
	 * Safe numeric access with bounds checking
	 */
	export function safeNumber(
		value: unknown,
		min = Number.NEGATIVE_INFINITY,
		max = Number.POSITIVE_INFINITY,
	): number | null {
		if (typeof value !== "number" || !Number.isFinite(value)) return null;
		if (value < min || value > max) return null;
		return value;
	}

	/**
	 * Safe string access with validation
	 */
	export function safeString(
		value: unknown,
		minLength = 0,
		maxLength = Number.MAX_SAFE_INTEGER,
	): string | null {
		if (typeof value !== "string") return null;
		if (value.length < minLength || value.length > maxLength) return null;
		return value;
	}

	/**
	 * Safe array access with element validation
	 */
	export function safeArray<T>(
		value: unknown,
		elementGuard: (v: unknown) => v is T,
	): T[] | null {
		if (!Array.isArray(value)) return null;
		if (!value.every(elementGuard)) return null;
		return value;
	}

	/**
	 * Safe object property access with nested validation
	 */
	export function safeProperty<T>(
		obj: unknown,
		key: string,
		guard: (v: unknown) => v is T,
	): T | null {
		if (!obj || typeof obj !== "object") return null;
		const record = obj as Record<string, unknown>;
		const value = record[key];
		return guard(value) ? value : null;
	}
}

// ANSI escape sequences for cursor control
const ESC = "\x1b";
const clearScreen = () => process.stdout.write(`${ESC}[2J${ESC}[H`);
const hideCursor = () => process.stdout.write(`${ESC}[?25l`);
const showCursor = () => process.stdout.write(`${ESC}[?25h`);
const moveTo = (row: number, col: number) =>
	process.stdout.write(`${ESC}[${row};${col}H`);

// API client with better error handling and type-safe validation
// Pattern: High-precision timing + type-safe validation (PRODUCTION-PATTERNS.md)
async function fetchApi<T>(
	endpoint: string,
	guard?: (value: unknown) => value is T,
): Promise<T | null> {
	const fetchStart = Bun.nanoseconds();

	try {
		const controller = new AbortController();
		const timeoutMs = PERFORMANCE_THRESHOLDS.apiFetch / 1_000_000; // Convert ns to ms
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		const res = await fetch(`${API_BASE}${endpoint}`, {
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (!res.ok) return null;

		const data = await res.json();

		// ✅ Type-safe validation using scope patterns (153ns overhead validated)
		if (guard) {
			const validationStart = Bun.nanoseconds();
			const result = ScopePatterns.safe(data, guard);
			const validationDuration = Bun.nanoseconds() - validationStart;

			// Log slow validations (> 500ns threshold)
			if (validationDuration > PERFORMANCE_THRESHOLDS.scopePatternValidation) {
				console.error(
					`⚠️  Slow validation for ${endpoint}: ${validationDuration}ns (threshold: ${PERFORMANCE_THRESHOLDS.scopePatternValidation}ns)`,
				);
			}

			const fetchDuration = Bun.nanoseconds() - fetchStart;
			if (fetchDuration > PERFORMANCE_THRESHOLDS.apiFetch) {
				console.warn(
					`⚠️  Slow API fetch for ${endpoint}: ${fetchDuration / 1_000_000}ms`,
				);
			}

			return result;
		}

		// Fallback to unsafe cast if no guard provided
		return data as T;
	} catch (error) {
		// Silently fail - dashboard will show offline status
		return null;
	}
}

// Format timestamp for display
function formatTimestamp(iso?: string): string {
	if (!iso) return colors.gray("--");
	const date = new Date(iso);
	return colors.gray(date.toLocaleTimeString());
}

// Render header banner
function renderHeader(): string {
	const title = nexusColors.gradient(
		"NEXUS TRADING DASHBOARD",
		[0, 200, 255],
		[255, 100, 200],
	);
	const time = new Date().toLocaleString();
	const mem = runtime.memoryFormatted();

	return [
		"",
		colors.cyan(
			"╔══════════════════════════════════════════════════════════════════════════════╗",
		),
		colors.cyan("║") +
			"  " +
			title +
			`  ${nexusColors.crypto("NEXUS")}  ` +
			colors.cyan("║"),
		colors.cyan("║") +
			colors.gray(
				`  ${time}  │  Memory: ${mem.heapUsed}  │  Bun ${runtime.version}`,
			) +
			"       " +
			colors.cyan("║"),
		colors.cyan(
			"╚══════════════════════════════════════════════════════════════════════════════╝",
		),
		"",
	].join("\n");
}

// Render system health panel
function renderHealth(health: HealthResponse | null, uptime: number): string {
	const status =
		health?.status === "ok"
			? nexusColors.pass("ONLINE")
			: nexusColors.fail("OFFLINE");

	const healthIcon = health?.status === "ok" ? "●" : "○";
	const statusColor =
		health?.status === "ok" ? colors.brightGreen : colors.brightRed;

	const lines = [
		`${statusColor(healthIcon)} ${colors.green("Status")}   ${status}`,
		`${colors.green("Uptime")}   ${formatDuration(uptime)}`,
		`${colors.green("API")}      ${colors.gray(API_BASE)}`,
	];

	if (health?.timestamp) {
		const serverTime = new Date(health.timestamp).toLocaleTimeString();
		lines.push(`${colors.green("Server Time")} ${colors.gray(serverTime)}`);
	}

	if (!health) {
		lines.push("");
		lines.push(
			colors.yellow("⚠ API server not running. Start with: bun run dev"),
		);
	}

	return box(lines.join("\n"), "System Health");
}

// Render trade streams panel
function renderStreams(data: StreamsResponse | null): string {
	if (!data || data.streams.length === 0) {
		const help = colors.yellow(
			"Import: bun run fetch file bitmex_executions.csv",
		);
		return box(
			`${colors.gray("No trade streams loaded")}\n\n${help}`,
			"Trade Streams",
		);
	}

	const lines = data.streams.slice(0, 5).map((s) => {
		const badge =
			s.source === "api" ? nexusColors.crypto("API") : nexusColors.info("FILE");
		return `${badge} ${colors.cyan(s.symbol.padEnd(12))} ${formatNumber(s.count).padStart(8)} trades`;
	});

	lines.push("");
	lines.push(colors.gray(`Total: ${formatNumber(data.total)} trades`));

	if (data.dateRange.from && data.dateRange.to) {
		lines.push(
			colors.gray(
				`Range: ${new Date(data.dateRange.from).toLocaleDateString()} - ${new Date(data.dateRange.to).toLocaleDateString()}`,
			),
		);
	}

	return box(lines.join("\n"), "Trade Streams");
}

// Render arbitrage opportunities panel with type-safe property access
function renderArbitrage(data: ArbitrageStatusResponse | null): string {
	if (!data) {
		return box(colors.gray("Scanner not running"), "Arbitrage Scanner");
	}

	// ✅ Type-safe property access using scope patterns
	const message = ScopePatterns.safeString(data.message);
	if (message) {
		return box(colors.gray(message), "Arbitrage Scanner");
	}

	const statusBadge = data.running
		? nexusColors.pass("SCANNING")
		: nexusColors.warn("PAUSED");

	const lines = [`${colors.green("Status")}     ${statusBadge}`];

	// ✅ Safe numeric access with validation
	const lastScanTime = ScopePatterns.safeNumber(
		data.lastScanTime ?? undefined,
		0,
		Date.now(),
	);
	if (lastScanTime) {
		const lastScanDate = new Date(lastScanTime);
		lines.push(
			`${colors.green("Last Scan")}  ${formatTimestamp(lastScanDate.toISOString())}`,
		);
	} else {
		lines.push(`${colors.green("Last Scan")}  ${colors.gray("--")}`);
	}

	const scanCount = ScopePatterns.safeNumber(data.scanCount ?? undefined, 0);
	if (scanCount !== null) {
		lines.push(`${colors.green("Scans")}      ${formatNumber(scanCount)}`);
	}

	lines.push("");

	// ✅ Safe numeric access for opportunities
	const total =
		ScopePatterns.safeNumber(data.opportunities ?? undefined, 0) ?? 0;
	const arbitrage =
		ScopePatterns.safeNumber(data.arbitrageOpportunities ?? undefined, 0) ?? 0;

	if (total === 0 && arbitrage === 0) {
		lines.push(colors.gray("No opportunities found"));
	} else {
		if (total > 0) {
			lines.push(colors.yellow(`Total: ${formatNumber(total)} opportunities`));
		}
		if (arbitrage > 0) {
			lines.push(colors.brightGreen(`Arbitrage: ${formatNumber(arbitrage)}`));
		}
	}

	// ✅ Safe nested object access
	const alerts = data.alerts;
	if (alerts) {
		lines.push("");
		const alertRunning = typeof alerts.running === "boolean" && alerts.running;
		const alertClients = ScopePatterns.safeNumber(alerts.clients, 0) ?? 0;
		const alertStatus = alertRunning
			? nexusColors.pass("ACTIVE")
			: colors.gray("INACTIVE");
		lines.push(
			`${colors.green("Alerts")}     ${alertStatus} (${formatNumber(alertClients)} clients)`,
		);
	}

	return box(lines.join("\n"), "Arbitrage Scanner");
}

// Render executor status panel with type-safe property access
function renderExecutor(data: ExecutorStatusResponse | null): string {
	if (!data) {
		return box(colors.gray("Executor not available"), "Trade Executor");
	}

	if (!data.initialized) {
		const message =
			ScopePatterns.safeString(data.message) || "Executor not initialized";
		return box(colors.gray(message), "Trade Executor");
	}

	const modeBadge =
		typeof data.dryRun === "boolean" && data.dryRun
			? nexusColors.warn("PAPER")
			: nexusColors.fail("LIVE");

	const lines = [`${colors.green("Mode")}       ${modeBadge}`];

	// ✅ Type-safe nested object access
	if (data.stats) {
		const stats = data.stats;

		// ✅ Safe numeric access with validation
		const totalExecutions =
			ScopePatterns.safeNumber(stats.totalExecutions, 0) ?? 0;
		const successfulExecutions =
			ScopePatterns.safeNumber(stats.successfulExecutions, 0) ?? 0;
		const totalCapitalDeployed =
			ScopePatterns.safeNumber(stats.totalCapitalDeployed, 0) ?? 0;
		const totalExpectedProfit =
			ScopePatterns.safeNumber(stats.totalExpectedProfit) ?? 0;
		const avgExecutionTimeMs =
			ScopePatterns.safeNumber(stats.avgExecutionTimeMs, 0) ?? 0;

		const successRate =
			totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

		const pnlColor =
			totalExpectedProfit >= 0 ? colors.brightGreen : colors.brightRed;

		lines.push(
			`${colors.green("Executions")} ${formatNumber(totalExecutions)} (${nexusColors.pass(formatPercent(successRate))} success)`,
		);
		lines.push(
			`${colors.green("Capital")}    ${formatCurrency(totalCapitalDeployed)}`,
		);
		lines.push(
			`${colors.green("Expected P&L")} ${pnlColor(formatCurrency(totalExpectedProfit))}`,
		);
		lines.push(
			`${colors.green("Avg Time")}   ${formatDuration(avgExecutionTimeMs)}`,
		);
	}

	return box(lines.join("\n"), "Trade Executor");
}

// Render trading stats panel
function renderTradingStats(stats: TradingStatsResponse | null): string {
	if (!stats?.stats) {
		const message = stats?.error
			? colors.gray(stats.error)
			: colors.gray("No trading data available");
		const help = colors.yellow("Import data: bun run fetch");
		return box(`${message}\n\n${help}`, "Trading Stats");
	}

	const s = stats.stats;
	const lines: string[] = [];

	// Overall performance
	lines.push(`${colors.green("Total Trades")}  ${formatNumber(s.totalTrades)}`);
	lines.push(`${colors.green("Win Rate")}     ${formatPercent(s.winRate)}`);

	// Wins vs Losses
	const winColor = s.winningTrades > s.losingTrades ? colors.green : colors.red;
	const lossColor = s.losingTrades > s.winningTrades ? colors.red : colors.gray;

	lines.push(
		`${colors.green("Wins")}         ${winColor(formatNumber(s.winningTrades))}`,
	);
	lines.push(
		`${colors.green("Losses")}       ${lossColor(formatNumber(s.losingTrades))}`,
	);

	// P&L
	const pnlColor = s.netPnl >= 0 ? colors.green : colors.red;
	const pnlSign = s.netPnl >= 0 ? "+" : "";
	lines.push(
		`${colors.green("Net P&L")}      ${pnlColor(`${pnlSign}${formatCurrency(s.netPnl)}`)}`,
	);

	lines.push("");
	lines.push(`${colors.brightYellow("Breakdown:")}`);
	lines.push(
		`  ${colors.gray(`Total Profit: ${formatCurrency(s.totalProfit)}`)}`,
	);
	lines.push(
		`  ${colors.gray(`Total Loss: ${formatCurrency(Math.abs(s.totalLoss))}`)}`,
	);
	lines.push(`  ${colors.gray(`Avg Win: ${formatCurrency(s.avgWin)}`)}`);
	lines.push(
		`  ${colors.gray(`Avg Loss: ${formatCurrency(Math.abs(s.avgLoss))}`)}`,
	);

	return box(lines.join("\n"), "Trading Stats");
}

// Render sports betting stats panel
function renderSportsStats(stats: SportsBettingStatsResponse | null): string {
	if (!stats?.stats) {
		const help = colors.yellow("Start ORCA stream: POST /orca/stream/start");
		return box(
			`${colors.gray("No sports betting data available")}\n\n${help}`,
			"Sports Betting",
		);
	}

	const s = stats.stats;
	const lines: string[] = [];

	// Overall performance
	lines.push(`${colors.green("Total Bets")}   ${formatNumber(s.totalBets)}`);
	lines.push(`${colors.green("Win Rate")}     ${formatPercent(s.winRate)}`);

	// Wins vs Losses
	const winColor = s.wins > s.losses ? colors.green : colors.red;
	const lossColor = s.losses > s.wins ? colors.red : colors.gray;

	lines.push(
		`${colors.green("Wins")}         ${winColor(formatNumber(s.wins))}`,
	);
	lines.push(
		`${colors.green("Losses")}       ${lossColor(formatNumber(s.losses))}`,
	);
	if (s.push > 0) {
		lines.push(
			`${colors.green("Push")}         ${colors.yellow(formatNumber(s.push))}`,
		);
	}

	// ROI and P&L
	const roiColor = s.roi >= 0 ? colors.green : colors.red;
	const roiSign = s.roi >= 0 ? "+" : "";
	lines.push(
		`${colors.green("ROI")}          ${roiColor(`${roiSign}${formatPercent(s.roi)}`)}`,
	);

	const pnlColor = s.netProfit >= 0 ? colors.green : colors.red;
	const pnlSign = s.netProfit >= 0 ? "+" : "";
	lines.push(
		`${colors.green("Net Profit")}   ${pnlColor(`${pnlSign}${formatCurrency(s.netProfit)}`)}`,
	);

	lines.push("");
	lines.push(`${colors.brightYellow("Volume:")}`);
	lines.push(`  ${colors.gray(`Wagered: ${formatCurrency(s.totalWagered)}`)}`);
	lines.push(`  ${colors.gray(`Won: ${formatCurrency(s.totalWon)}`)}`);

	return box(lines.join("\n"), "Sports Betting");
}

// Render bot status panel
function renderBotStatus(bot: BotStatusResponse | null): string {
	if (!bot) {
		const help = colors.yellow("Start bot: POST /telegram/bot/start");
		return box(
			`${colors.gray("Bot status unavailable")}\n\n${help}`,
			"Telegram Bot",
		);
	}

	const statusBadge = bot.running
		? nexusColors.pass("RUNNING")
		: nexusColors.fail("STOPPED");

	const lines: string[] = [];
	lines.push(`${colors.green("Status")}      ${statusBadge}`);
	lines.push(`${colors.green("Users")}       ${formatNumber(bot.users)}`);
	lines.push(`${colors.green("Live Outs")}   ${formatNumber(bot.liveOuts)}`);

	if (bot.lastActivity) {
		const lastActivity = new Date(bot.lastActivity).toLocaleTimeString();
		lines.push(`${colors.green("Last Activity")} ${colors.gray(lastActivity)}`);
	}

	if (bot.settings) {
		lines.push("");
		lines.push(`${colors.brightYellow("Settings:")}`);
		for (const [key, value] of Object.entries(bot.settings).slice(0, 3)) {
			lines.push(`  ${colors.gray(`${key}: ${String(value)}`)}`);
		}
	}

	return box(lines.join("\n"), "Telegram Bot");
}

// Render cache stats panel with type-safe property access
function renderCache(data: CacheStatsResponse | null): string {
	if (!data) {
		return box(colors.gray("Cache stats unavailable"), "Cache");
	}

	// ✅ Type-safe numeric access with validation
	const totalEntries = ScopePatterns.safeNumber(data.totalEntries, 0) ?? 0;
	const totalHits = ScopePatterns.safeNumber(data.totalHits, 0) ?? 0;
	const sizeBytes = ScopePatterns.safeNumber(data.sizeBytes, 0) ?? 0;
	const compressedEntries =
		ScopePatterns.safeNumber(data.compressedEntries, 0) ?? 0;
	const compressionRatio =
		ScopePatterns.safeNumber(data.compressionRatio, 0, 1) ?? 1;

	const totalRequests =
		totalEntries > 0 ? totalHits + (totalEntries - totalHits) : 0;
	const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

	const hitRateColor =
		hitRate > 0.8
			? colors.brightGreen
			: hitRate > 0.5
				? colors.yellow
				: colors.red;

	// ✅ Safe string access with fallback
	const sizeFormatted = ScopePatterns.safeString(data.sizeFormatted);
	const sizeDisplay = sizeFormatted || formatBytes(sizeBytes);

	const lines = [
		`${colors.green("Entries")}   ${formatNumber(totalEntries)}`,
		`${colors.green("Hits")}      ${formatNumber(totalHits)}`,
		`${colors.green("Size")}      ${sizeDisplay}`,
		`${colors.green("Hit Rate")}  ${hitRateColor(formatPercent(hitRate))}`,
	];

	if (compressedEntries > 0) {
		const compressionSavings = 1 - compressionRatio;
		lines.push(
			`${colors.green("Compressed")} ${formatNumber(compressedEntries)} (${formatPercent(compressionSavings)} savings)`,
		);
	}

	return box(lines.join("\n"), "Cache");
}

// Render sharp books panel
function renderSharpBooks(): string {
	const connected = getConnectedBooks();
	const sorted = getBooksByWeight();

	if (connected.length === 0) {
		return box(colors.gray("No sharp books connected"), "Sharp Books");
	}

	const lines: string[] = [];

	// Show top 5 sharpest books
	for (const book of sorted.slice(0, 5)) {
		const tierColor =
			book.sharpTier === "S+"
				? colors.brightCyan
				: book.sharpTier === "S"
					? colors.brightGreen
					: book.sharpTier === "A+"
						? colors.green
						: book.sharpTier === "A"
							? colors.yellow
							: colors.gray;

		const statusBadge =
			book.status === "connected"
				? nexusColors.pass("●")
				: nexusColors.fail("○");

		const cryptoBadge = book.cryptoAccepted ? nexusColors.crypto("₿") : "";
		const limitsBadge = book.limitsWinners ? nexusColors.warn("⚠") : "";

		lines.push(
			`${statusBadge} ${tierColor(book.sharpTier.padEnd(3))} ${colors.cyan(book.name.padEnd(15))} ${colors.gray(`${book.latencyBenchmark}ms`)} ${cryptoBadge}${limitsBadge}`.trim(),
		);
	}

	if (sorted.length > 5) {
		lines.push("");
		lines.push(colors.gray(`+${sorted.length - 5} more books`));
	}

	lines.push("");
	lines.push(
		colors.gray(
			`Total: ${connected.length} connected, ${sorted.length} configured`,
		),
	);

	return box(lines.join("\n"), "Sharp Books");
}

// Render MCP tools panel with execution results
async function renderMCPTools(): Promise<string> {
	try {
		const server = new MCPServer();
		const bunTools = createBunToolingTools();
		server.registerTools(bunTools);
		const shellTools = createBunShellTools();
		server.registerTools(shellTools);

		const tools = server.listTools();

		// Group by category
		const bunTooling = tools.filter((t) => t.name.startsWith("tooling-"));
		const bunShell = tools.filter((t) => t.name.startsWith("shell-"));
		const other = tools.filter(
			(t) => !t.name.startsWith("tooling-") && !t.name.startsWith("shell-"),
		);

		const lines: string[] = [];

		// Execute diagnostics tool to show it working
		try {
			const diagnosticsTool = bunTooling.find(
				(t) => t.name === "tooling-diagnostics",
			);
			if (diagnosticsTool) {
				const result = await diagnosticsTool.execute({});
				if (result.content[0]?.text) {
					lines.push(colors.brightGreen("Example: tooling-diagnostics"));
					const diagnosticsLines = result.content[0].text.split("\n");
					for (const line of diagnosticsLines.slice(0, 4)) {
						lines.push(`  ${colors.gray(line)}`);
					}
					lines.push("");
				}
			}
		} catch {
			// Ignore execution errors
		}

		if (bunTooling.length > 0) {
			lines.push(
				`${colors.brightYellow("Bun Tooling:")} ${colors.cyan(bunTooling.length.toString())}`,
			);
			for (const tool of bunTooling.slice(0, 5)) {
				const desc = tool.description.slice(0, 50);
				lines.push(
					`  ${nexusColors.info("•")} ${colors.cyan(tool.name.padEnd(25))} ${colors.gray(desc)}`,
				);
			}
			if (bunTooling.length > 5) {
				lines.push(`  ${colors.gray(`+${bunTooling.length - 5} more`)}`);
			}
			lines.push("");
		}

		if (bunShell.length > 0) {
			lines.push(
				`${colors.brightYellow("Bun Shell:")} ${colors.cyan(bunShell.length.toString())}`,
			);
			for (const tool of bunShell.slice(0, 5)) {
				const desc = tool.description.slice(0, 50);
				lines.push(
					`  ${nexusColors.info("•")} ${colors.cyan(tool.name.padEnd(25))} ${colors.gray(desc)}`,
				);
			}
			if (bunShell.length > 5) {
				lines.push(`  ${colors.gray(`+${bunShell.length - 5} more`)}`);
			}
			lines.push("");
		}

		if (other.length > 0) {
			lines.push(
				`${colors.brightYellow("Other:")} ${colors.cyan(other.length.toString())}`,
			);
			for (const tool of other.slice(0, 3)) {
				const desc = tool.description.slice(0, 50);
				lines.push(
					`  ${nexusColors.info("•")} ${colors.cyan(tool.name.padEnd(25))} ${colors.gray(desc)}`,
				);
			}
		}

		lines.push("");
		lines.push(colors.gray(`Total: ${tools.length} tools available`));
		lines.push(colors.gray(`Use MCP server or bun run list-tools for details`));

		return box(lines.join("\n"), "MCP Tools");
	} catch (error) {
		return box(colors.gray("Unable to load MCP tools"), "MCP Tools");
	}
}

// Render keyboard shortcuts help with enhanced styling
function renderHelp(viewMode: string = "overview"): string {
	const shortcuts = [
		`${nexusColors.info("q")} quit`,
		`${nexusColors.info("r")} refresh`,
		`${nexusColors.info("a")} arbitrage`,
		`${nexusColors.info("s")} streams`,
		`${nexusColors.info("w")} trading`,
		`${nexusColors.info("o")} sports`,
		`${nexusColors.info("b")} bot`,
		`${nexusColors.info("t")} tools`,
		`${nexusColors.info("m")} metrics`,
		`${nexusColors.info("l")} logs`,
		`${nexusColors.info("k")} rankings`,
		`${nexusColors.info("e")} endpoints`,
		`${nexusColors.info("h")} help`,
	];

	const modeIndicator =
		viewMode !== "overview"
			? `  ${nexusColors.warn(`[${viewMode.toUpperCase()} MODE]`)}`
			: "";

	return [
		colors.gray("─".repeat(80)),
		`  ${shortcuts.join("  │  ")}${modeIndicator}`,
		colors.gray("─".repeat(80)),
	].join("\n");
}

// Render performance metrics panel
function renderPerformanceMetrics(state: DashboardState): string {
	const uptime = Date.now() - state.startTime;
	const refreshRate =
		state.refreshCount > 0
			? (state.refreshCount / (uptime / 1000)).toFixed(2)
			: "0.00";
	const errorRate =
		state.refreshCount > 0
			? ((state.errorCount / state.refreshCount) * 100).toFixed(2)
			: "0.00";

	const lines = [
		`${colors.green("Uptime")}        ${formatDuration(uptime)}`,
		`${colors.green("Refreshes")}     ${formatNumber(state.refreshCount)} (${refreshRate}/s)`,
		`${colors.green("Errors")}        ${state.errorCount > 0 ? nexusColors.fail(formatNumber(state.errorCount)) : nexusColors.pass("0")} (${errorRate}%)`,
		`${colors.green("Last Update")}   ${new Date(state.lastUpdate).toLocaleTimeString()}`,
	];

	return box(lines.join("\n"), "Performance");
}

// Render metrics panel
function renderMetrics(metrics: MetricsState | null): string {
	if (!metrics?.system) {
		return box(colors.gray("Metrics unavailable"), "System Metrics");
	}

	const sys = metrics.system;
	const lines: string[] = [];

	// CPU
	lines.push(
		`${colors.green("CPU")}        ${formatPercent(sys.cpu.percent / 100)}`,
	);
	lines.push(`  ${colors.gray(`User: ${sys.cpu.user.toFixed(2)}ms`)}`);
	lines.push(`  ${colors.gray(`System: ${sys.cpu.system.toFixed(2)}ms`)}`);

	// Memory
	const memUsedMB = sys.memory.heapUsed / 1024 / 1024;
	const memTotalMB = sys.memory.heapTotal / 1024 / 1024;
	lines.push(
		`${colors.green("Memory")}     ${formatBytes(sys.memory.heapUsed)} / ${formatBytes(sys.memory.heapTotal)}`,
	);
	lines.push(
		`  ${colors.gray(`${memUsedMB.toFixed(1)}MB / ${memTotalMB.toFixed(1)}MB`)}`,
	);

	// Disk
	if (metrics.diskUsage) {
		const diskUsedGB = metrics.diskUsage.used / 1024 / 1024 / 1024;
		const diskTotalGB = metrics.diskUsage.total / 1024 / 1024 / 1024;
		lines.push(
			`${colors.green("Disk")}        ${diskUsedGB.toFixed(2)}GB / ${diskTotalGB.toFixed(2)}GB`,
		);
		lines.push(
			`  ${colors.gray(`${metrics.diskUsage.percent.toFixed(1)}% used`)}`,
		);
	}

	// Git info
	if (metrics.gitInfo?.commit) {
		const shortCommit = metrics.gitInfo.commit.substring(0, 7);
		lines.push(
			`${colors.green("Git")}         ${colors.cyan(metrics.gitInfo.branch || "unknown")} @ ${colors.gray(shortCommit)}`,
		);
	}

	// Top processes
	if (metrics.topProcesses && metrics.topProcesses.length > 0) {
		lines.push("");
		lines.push(`${colors.brightYellow("Top Processes:")}`);
		for (const proc of metrics.topProcesses.slice(0, 3)) {
			const name = proc.command.split(" ")[0].split("/").pop() || proc.command;
			lines.push(
				`  ${colors.gray(`${proc.cpuPercent.toFixed(1)}%`)} ${colors.cyan(name.padEnd(20))} ${colors.gray(`${proc.memoryMB.toFixed(1)}MB`)}`,
			);
		}
	}

	return box(lines.join("\n"), "System Metrics");
}

// Render logs panel
function renderLogs(logs: LogsState | null): string {
	if (!logs?.logCounts) {
		return box(colors.gray("Logs unavailable"), "Logs");
	}

	const lines: string[] = [];

	// Log counts by level
	if (logs.logCounts) {
		lines.push(`${colors.brightYellow("Log Levels:")}`);
		for (const [level, count] of Object.entries(logs.logCounts)) {
			const color =
				level === "error"
					? colors.red
					: level === "warn"
						? colors.yellow
						: colors.gray;
			lines.push(`  ${color(level.padEnd(6))} ${formatNumber(count)}`);
		}
	}

	// Recent errors
	if (logs.recentErrors && logs.recentErrors.length > 0) {
		lines.push("");
		lines.push(`${colors.brightYellow("Recent Errors:")}`);
		for (const error of logs.recentErrors.slice(0, 3)) {
			const time = new Date(error.timestamp).toLocaleTimeString();
			const msg =
				error.message.length > 50
					? error.message.substring(0, 47) + "..."
					: error.message;
			lines.push(`  ${colors.gray(time)} ${colors.red(msg)}`);
		}
	} else {
		lines.push("");
		lines.push(colors.green("✓ No recent errors"));
	}

	return box(lines.join("\n"), "Logs");
}

// Render rankings panel
function renderRankings(rankings: RankingsState | null): string {
	if (!rankings?.toolRankings && !rankings?.fileRankings) {
		return box(colors.gray("Rankings unavailable"), "Rankings");
	}

	const lines: string[] = [];

	// Tool rankings
	if (rankings.toolRankings && rankings.toolRankings.length > 0) {
		lines.push(`${colors.brightYellow("Top Tools (by usage):")}`);
		for (const tool of rankings.toolRankings.slice(0, 5)) {
			const badge =
				tool.rank <= 3
					? nexusColors.pass(`#${tool.rank}`)
					: colors.gray(`#${tool.rank}`);
			lines.push(
				`  ${badge} ${colors.cyan(tool.name.padEnd(25))} ${colors.gray(`${tool.count} refs`)}`,
			);
		}
	}

	// File size rankings
	if (rankings.fileRankings && rankings.fileRankings.length > 0) {
		lines.push("");
		lines.push(`${colors.brightYellow("Largest Files:")}`);
		for (const file of rankings.fileRankings.slice(0, 5)) {
			const sizeKB = file.size / 1024;
			const name = file.path.split("/").pop() || file.path;
			lines.push(
				`  ${colors.gray(`#${file.rank}`)} ${colors.cyan(name.padEnd(25))} ${colors.gray(`${sizeKB.toFixed(1)}KB`)}`,
			);
		}
	}

	return box(lines.join("\n"), "Rankings");
}

// Render miniapp panel
function renderMiniapp(miniapp: MiniappState | null): string {
	if (!miniapp?.status) {
		return box(colors.gray("Miniapp status unavailable"), "Miniapp");
	}

	const status = miniapp.status;
	const lines: string[] = [];

	// Status badge
	const statusBadge =
		status.status === "online"
			? nexusColors.pass("ONLINE")
			: status.status === "degraded"
				? nexusColors.warn("DEGRADED")
				: nexusColors.fail("OFFLINE");

	lines.push(`${colors.green("Status")}      ${statusBadge}`);
	lines.push(`${colors.green("URL")}         ${colors.cyan(status.url)}`);
	lines.push(
		`${colors.green("Response")}   ${formatDuration(status.responseTime)}`,
	);

	if (status.statusCode > 0) {
		const codeColor = status.statusCode === 200 ? colors.green : colors.red;
		lines.push(
			`${colors.green("HTTP Code")}  ${codeColor(status.statusCode.toString())}`,
		);
	}

	// Health info
	if (miniapp.health) {
		lines.push("");
		lines.push(`${colors.brightYellow("Health:")}`);
		if (miniapp.health.version) {
			lines.push(`  ${colors.gray(`Version: ${miniapp.health.version}`)}`);
		}
		if (miniapp.health.uptime) {
			lines.push(
				`  ${colors.gray(`Uptime: ${formatDuration(miniapp.health.uptime * 1000)}`)}`,
			);
		}
	}

	// Deployment info
	if (miniapp.deployment) {
		lines.push("");
		lines.push(`${colors.brightYellow("Deployment:")}`);
		lines.push(`  ${colors.gray(`Env: ${miniapp.deployment.environment}`)}`);
		if (miniapp.deployment.commit) {
			const shortCommit = miniapp.deployment.commit.substring(0, 7);
			lines.push(`  ${colors.gray(`Commit: ${shortCommit}`)}`);
		}
		if (miniapp.deployment.deployedAt) {
			const deployed = new Date(miniapp.deployment.deployedAt).toLocaleString();
			lines.push(`  ${colors.gray(`Deployed: ${deployed}`)}`);
		}
	}

	// Config status
	if (miniapp.config) {
		const configStatus =
			miniapp.config.status === 200
				? nexusColors.pass("OK")
				: miniapp.config.status === 304
					? nexusColors.info("304 (cached)")
					: colors.red(`${miniapp.config.status}`);
		lines.push("");
		lines.push(`${colors.brightYellow("Config:")}`);
		lines.push(`  ${colors.gray(`Status: ${configStatus}`)}`);
		lines.push(
			`  ${colors.gray(`Response: ${formatDuration(miniapp.config.responseTime)}`)}`,
		);
		if (miniapp.config.etag) {
			const shortETag =
				miniapp.config.etag.replace(/^W\//, "").substring(0, 16) + "...";
			lines.push(`  ${colors.gray(`ETag: ${shortETag}`)}`);
		}
		if (miniapp.config.config && typeof miniapp.config.config === "object") {
			const configKeys = Object.keys(miniapp.config.config).slice(0, 3);
			if (configKeys.length > 0) {
				lines.push(
					`  ${colors.gray(`Keys: ${configKeys.join(", ")}${Object.keys(miniapp.config.config).length > 3 ? "..." : ""}`)}`,
				);
			}
		} else if (
			miniapp.config.config &&
			typeof miniapp.config.config === "string"
		) {
			const preview = miniapp.config.config.substring(0, 50);
			lines.push(
				`  ${colors.gray(`Preview: ${preview}${miniapp.config.config.length > 50 ? "..." : ""}`)}`,
			);
		}
	}

	// Error info
	if (status.error) {
		lines.push("");
		lines.push(`${colors.red("Error:")} ${colors.gray(status.error)}`);
	}

	return box(lines.join("\n"), "Miniapp");
}

// Render API endpoints panel
function renderCorrelation(correlation: CorrelationState | null): string {
	if (!correlation) {
		return box(
			`${colors.gray("Correlation engine offline")}\n\n${colors.yellow("Run: bun run correlation/health")}`,
			"Correlation Engine",
		);
	}

	const lines: string[] = [];
	const health = correlation.health;

	if (health) {
		const statusColor = health.status === "HEALTHY" ? colors.green : colors.red;
		lines.push(`${colors.green("Status")}       ${statusColor(health.status)}`);
		lines.push(`${colors.green("DB Latency")}   ${formatDuration(health.metrics?.dbLatency || 0)}`);
		lines.push(`${colors.green("Layer Failures")} ${health.metrics?.layerFailures || 0}`);
		lines.push(`${colors.green("Active Conns")} ${health.metrics?.activeConnections || 0}`);
	}

	lines.push("");
	lines.push(`${colors.green("Anomalies")}    ${correlation.anomalies.length}`);

	if (correlation.anomalies.length > 0) {
		const critical = correlation.anomalies.filter((a: any) => a.severity === "CRITICAL").length;
		const high = correlation.anomalies.filter((a: any) => a.severity === "HIGH").length;
		lines.push(`${colors.red("Critical")}     ${critical}`);
		lines.push(`${colors.yellow("High")}         ${high}`);
	}

	lines.push("");
	lines.push(`${colors.green("Cross-Market")} ${correlation.crossMarket.length} pairs`);

	if (correlation.crossMarket.length > 0) {
		const avgStrength = correlation.crossMarket.reduce((sum: number, c: any) => sum + c.correlationStrength, 0) / correlation.crossMarket.length;
		lines.push(`${colors.blue("Avg Strength")} ${avgStrength.toFixed(3)}`);
	}

	return box(lines.join("\n"), "Correlation Engine");
}

function renderEndpoints(discovery: ApiDiscoveryState | null): string {
	if (!discovery) {
		const help = colors.yellow("Run: bun run list-endpoints");
		return box(
			`${colors.gray("API discovery unavailable")}\n\n${help}`,
			"API Endpoints",
		);
	}

	const lines: string[] = [];
	lines.push(
		`${colors.green("API")}         ${colors.cyan(discovery.name)} v${discovery.version}`,
	);
	lines.push(`${colors.green("Runtime")}     ${discovery.runtime}`);
	lines.push(
		`${colors.green("Total")}       ${formatNumber(discovery.totalEndpoints)} endpoints`,
	);
	lines.push("");

	// Group by method
	const methods = [
		{ name: "GET", color: colors.blue, paths: discovery.byMethod.GET },
		{ name: "POST", color: colors.green, paths: discovery.byMethod.POST },
		{ name: "PUT", color: colors.yellow, paths: discovery.byMethod.PUT },
		{ name: "DELETE", color: colors.red, paths: discovery.byMethod.DELETE },
		{ name: "PATCH", color: colors.magenta, paths: discovery.byMethod.PATCH },
	] as const;

	for (const method of methods) {
		if (method.paths.length === 0) continue;
		lines.push(`${method.color(method.name)} (${method.paths.length})`);
		for (const path of method.paths.slice(0, 10)) {
			lines.push(`  ${colors.gray(path)}`);
		}
		if (method.paths.length > 10) {
			lines.push(
				`  ${colors.gray(`... and ${method.paths.length - 10} more`)}`,
			);
		}
		lines.push("");
	}

	lines.push(colors.gray(`Run 'bun run list-endpoints' for full list`));

	return box(lines.join("\n"), "API Endpoints");
}

// Render detailed help screen
function renderHelpScreen(): string {
	const helpLines = [
		nexusColors.gradient(
			"NEXUS Trading Dashboard - Help",
			[0, 200, 255],
			[255, 100, 200],
		),
		"",
		`${colors.yellow("Keyboard Shortcuts:")}`,
		`  ${nexusColors.info("q")}     Quit dashboard`,
		`  ${nexusColors.info("r")}     Force refresh (immediate update)`,
		`  ${nexusColors.info("a")}     Arbitrage view (scanner + executor)`,
		`  ${nexusColors.info("s")}     Streams view (trade data)`,
		`  ${nexusColors.info("w")}     Trading view (wins/losses/P&L)`,
		`  ${nexusColors.info("o")}     Sports betting view (ORCA stats)`,
		`  ${nexusColors.info("b")}     Bot view (Telegram bot status)`,
		`  ${nexusColors.info("t")}     Tools view (MCP tools)`,
		`  ${nexusColors.info("m")}     Metrics view (system metrics)`,
		`  ${nexusColors.info("l")}     Logs view (error logs)`,
		`  ${nexusColors.info("k")}     Rankings view (tool/file rankings)`,
		`  ${nexusColors.info("e")}     Endpoints view (API discovery)`,
		`  ${nexusColors.info("h")}     Show/hide this help`,
		`  ${nexusColors.info("ESC")}   Return to overview`,
		`  ${nexusColors.info("c")}     Cache view (returns to overview)`,
		`  ${nexusColors.info("e")}     Executor view (returns to arbitrage)`,
		"",
		`${colors.yellow("Dashboard Panels:")}`,
		`  ${nexusColors.pass("System Health")}     API status, uptime, endpoint`,
		`  ${nexusColors.pass("Trade Streams")}     Active data streams with counts`,
		`  ${nexusColors.pass("Arbitrage Scanner")} Cross-market opportunities`,
		`  ${nexusColors.pass("Trade Executor")}    Execution status and P&L`,
		`  ${nexusColors.pass("Cache Stats")}       Performance and hit rates`,
		`  ${nexusColors.pass("Performance")}       Metrics and refresh stats`,
		"",
		`${colors.yellow("Status Indicators:")}`,
		`  ${nexusColors.pass("ONLINE")}    System operational`,
		`  ${nexusColors.fail("OFFLINE")}   System unavailable`,
		`  ${nexusColors.pass("SCANNING")}  Active scanning`,
		`  ${nexusColors.warn("PAUSED")}    Scanner paused`,
		`  ${nexusColors.fail("LIVE")}      Live trading mode`,
		`  ${nexusColors.warn("PAPER")}     Paper trading mode`,
		"",
		`${colors.yellow("Available Filters (API):")}`,
		`  ${nexusColors.info("Category")}     crypto, politics, sports, economics`,
		`  ${nexusColors.info("Venue")}       polymarket, kalshi, deribit, betfair`,
		`  ${nexusColors.info("Sport")}       NFL, NBA, MLB, NHL, EPL, etc.`,
		`  ${nexusColors.info("Market Type")} moneyline, spread, total, prop`,
		`  ${nexusColors.info("Bookmaker")}   betfair, ps3838, draftkings, etc.`,
		`  ${nexusColors.info("Sharp Books")}  Circa (S+), Pinnacle (S), Crisp (A+), etc.`,
		`  ${nexusColors.info("Spread")}      minSpread query parameter`,
		`  ${nexusColors.info("Liquidity")}   minLiquidity config option`,
		`  ${nexusColors.info("Time Range")}  dateRange in streams`,
		`  ${nexusColors.info("Symbol")}       Trading pairs (BTC/USDT, etc.)`,
		"",
		`${colors.yellow("Sharp Books Registry:")}`,
		`  ${nexusColors.info("Tier")}        S+, S, A+, A, B+ classifications`,
		`  ${nexusColors.info("Latency")}     Benchmark latency per book`,
		`  ${nexusColors.info("Line Moves")}  Track which books move first`,
		`  ${nexusColors.info("Sharp Signals")} Composite signals from multiple books`,
		"",
		`${colors.gray("Note: Filters available via API, dashboard UI coming soon")}`,
		`${colors.gray("Press any key to return to dashboard...")}`,
	];

	return box(helpLines.join("\n"), "Help");
}

// Dashboard filter state
interface DashboardFilters {
	// Arbitrage filters
	category?: string;
	venue?: string[];
	minSpread?: number;
	maxSpread?: number;
	minLiquidity?: number;
	isArbitrage?: boolean;

	// Sports betting filters
	sport?: string[];
	marketType?: string[];
	bookmaker?: string[];
	league?: string[];
	status?: string[];

	// Trade stream filters
	symbol?: string[];
	exchange?: string[];
	timeRange?: { from: Date; to: Date };
}

// Metrics state
interface MetricsState {
	system: ReturnType<typeof nativeMetrics.collectSystemMetrics> | null;
	topProcesses: Awaited<
		ReturnType<typeof nativeMetrics.getTopProcesses>
	> | null;
	diskUsage: Awaited<ReturnType<typeof nativeMetrics.getDiskUsage>> | null;
	gitInfo: {
		commit: string | null;
		branch: string | null;
	} | null;
}

// Logs state
interface LogsState {
	recentErrors: Awaited<ReturnType<typeof nativeLogs.getRecentErrors>> | null;
	logCounts: Awaited<ReturnType<typeof nativeLogs.countLogsByLevel>> | null;
}

// Rankings state
interface RankingsState {
	toolRankings: Awaited<
		ReturnType<typeof nativeRanking.rankToolsByUsage>
	> | null;
	fileRankings: Awaited<
		ReturnType<typeof nativeRanking.rankFilesBySize>
	> | null;
}

// Miniapp state
interface MiniappState {
	status: Awaited<ReturnType<typeof nativeMiniapp.checkStatus>> | null;
	health: Awaited<ReturnType<typeof nativeMiniapp.getHealth>> | null;
	deployment: Awaited<
		ReturnType<typeof nativeMiniapp.getDeploymentInfo>
	> | null;
	config: Awaited<ReturnType<typeof nativeMiniapp.checkConfig>> | null;
}

// Trading state
interface TradingState {
	stats: TradingStatsResponse | null;
	sportsStats: SportsBettingStatsResponse | null;
	botStatus: BotStatusResponse | null;
}

interface ApiDiscoveryState {
	name: string;
	version: string;
	runtime: string;
	totalEndpoints: number;
	byMethod: {
		GET: string[];
		POST: string[];
		PUT: string[];
		DELETE: string[];
		PATCH: string[];
	};
	endpoints: string[];
	lastDiscovery: number;
}

interface CorrelationState {
	health: any;
	anomalies: any[];
	crossMarket: any[];
	lastUpdate: number;
}

// Main dashboard state
interface DashboardState {
	health: HealthResponse | null;
	streams: StreamsResponse | null;
	arbitrage: ArbitrageStatusResponse | null;
	executor: ExecutorStatusResponse | null;
	cache: CacheStatsResponse | null;
	metrics: MetricsState | null;
	logs: LogsState | null;
	rankings: RankingsState | null;
	miniapp: MiniappState | null;
	trading: TradingState | null;
	endpoints: ApiDiscoveryState | null;
	correlation: CorrelationState | null;
	startTime: number;
	lastUpdate: number;
	viewMode:
		| "overview"
		| "arbitrage"
		| "streams"
		| "trading"
		| "sports"
		| "bot"
		| "tools"
		| "metrics"
		| "logs"
		| "rankings"
		| "endpoints"
		| "help";
	refreshCount: number;
	errorCount: number;
	filters: DashboardFilters;
}

// Fetch metrics data
async function fetchMetricsData(): Promise<MetricsState> {
	try {
		const [system, topProcesses, diskUsage, commit, branch] = await Promise.all(
			[
				Promise.resolve(nativeMetrics.collectSystemMetrics()),
				nativeMetrics.getTopProcesses(5),
				nativeMetrics.getDiskUsage("."),
				nativeMetrics.getGitCommitHash(),
				nativeMetrics.getGitBranch(),
			],
		);

		return {
			system,
			topProcesses,
			diskUsage,
			gitInfo: { commit, branch },
		};
	} catch {
		return {
			system: null,
			topProcesses: null,
			diskUsage: null,
			gitInfo: null,
		};
	}
}

// Fetch logs data
async function fetchLogsData(): Promise<LogsState> {
	try {
		// Try to find log files (common locations)
		const logPaths = ["./logs/app.log", "./data/logs/app.log", "./app.log"];

		for (const logPath of logPaths) {
			try {
				const file = Bun.file(logPath);
				if (await file.exists()) {
					const [recentErrors, logCounts] = await Promise.all([
						nativeLogs.getRecentErrors(logPath, 5),
						nativeLogs.countLogsByLevel(logPath),
					]);

					return { recentErrors, logCounts };
				}
			} catch {}
		}

		return { recentErrors: null, logCounts: null };
	} catch {
		return { recentErrors: null, logCounts: null };
	}
}

// Fetch rankings data
async function fetchRankingsData(): Promise<RankingsState> {
	try {
		const toolNames = [
			"tooling-diagnostics",
			"shell-execute",
			"shell-pipe",
			"tooling-check-health",
			"shell-redirect-response",
		];

		const [toolRankings, fileRankings] = await Promise.all([
			nativeRanking.rankToolsByUsage(toolNames, "src"),
			nativeRanking.rankFilesBySize("src", "*.ts", 5),
		]);

		return { toolRankings, fileRankings };
	} catch {
		return { toolRankings: null, fileRankings: null };
	}
}

// Fetch miniapp data
async function fetchMiniappData(): Promise<MiniappState> {
	try {
		const [status, health, deployment, config] = await Promise.all([
			nativeMiniapp.checkStatus(),
			nativeMiniapp.getHealth(),
			nativeMiniapp.getDeploymentInfo(),
			nativeMiniapp.checkConfig(),
		]);

		return { status, health, deployment, config };
	} catch {
		return { status: null, health: null, deployment: null, config: null };
	}
}

// Fetch API discovery data
async function fetchApiDiscovery(): Promise<ApiDiscoveryState | null> {
	try {
		const discovery = await fetchApi<ApiDiscoveryState>(
			"/discovery",
			(v): v is ApiDiscoveryState => {
				return (
					v !== null &&
					typeof v === "object" &&
					"name" in v &&
					"totalEndpoints" in v
				);
			},
		);
		return discovery;
	} catch {
		return null;
	}
}

// Fetch correlation data
async function fetchCorrelationData(): Promise<CorrelationState | null> {
	try {
		const [health, anomalies] = await Promise.all([
			fetchApi("/correlation/health", (v) => v !== null && typeof v === "object"),
			fetchApi("/correlation/anomalies/NFL-20241206-1234", (v) => v !== null && typeof v === "object" && "anomalies" in v), // Example event ID
		]);

		const crossMarket = await fetchApi("/correlation/cross-market/analyze?markets=CRYPTO,SPORTS,PREDICTION&timeWindow=3600000", (v) => v !== null && typeof v === "object");

		return {
			health,
			anomalies: (anomalies as any)?.anomalies || [],
			crossMarket: (crossMarket as any)?.correlations || [],
			lastUpdate: Date.now(),
		};
	} catch {
		return null;
	}
}

// Fetch trading data
async function fetchTradingData(): Promise<TradingState> {
	try {
		// Fetch stats endpoint - returns { stats: {...} } or { error: "..." }
		const statsResponse = await fetchApi<{ stats?: any; error?: string }>(
			"/stats",
			(v): v is { stats?: any; error?: string } => {
				return v !== null && typeof v === "object";
			},
		);

		// Fetch ORCA stats - returns stats object directly
		const orcaResponse = await fetchApi<any>("/orca/stats", (v): v is any => {
			return v !== null && typeof v === "object";
		});

		// Fetch bot status - returns { status: "ok", data: {...} }
		const botResponse = await fetchApi<{ status: string; data?: any }>(
			"/telegram/bot/status",
			(v): v is { status: string; data?: any } => {
				return v !== null && typeof v === "object";
			},
		);

		// Transform stats response
		// Transform stats response - check if stats object has the fields we need
		const tradingStats: TradingStatsResponse | null =
			statsResponse && !statsResponse.error && statsResponse.stats
				? {
						stats: {
							totalTrades: statsResponse.stats.totalTrades || 0,
							winningTrades: statsResponse.stats.winningTrades || 0,
							losingTrades: statsResponse.stats.losingTrades || 0,
							totalProfit:
								statsResponse.stats.totalWins ||
								statsResponse.stats.totalProfit ||
								0,
							totalLoss: Math.abs(
								statsResponse.stats.totalLosses ||
									statsResponse.stats.totalLoss ||
									0,
							),
							netPnl:
								statsResponse.stats.totalPnl || statsResponse.stats.netPnl || 0,
							winRate: statsResponse.stats.winRate || 0,
							avgWin: statsResponse.stats.avgWin || 0,
							avgLoss: Math.abs(statsResponse.stats.avgLoss || 0),
							largestWin: statsResponse.stats.largestWin || 0,
							largestLoss: Math.abs(statsResponse.stats.largestLoss || 0),
						},
					}
				: statsResponse?.error
					? { stats: null, error: statsResponse.error }
					: null;

		// Transform ORCA stats to sports betting format
		const sportsStats: SportsBettingStatsResponse | null = orcaResponse
			? {
					stats: orcaResponse.totalBets
						? {
								totalBets: orcaResponse.totalBets || 0,
								wins: orcaResponse.wins || 0,
								losses: orcaResponse.losses || 0,
								push: orcaResponse.push || 0,
								totalWagered: orcaResponse.totalWagered || 0,
								totalWon: orcaResponse.totalWon || 0,
								netProfit: orcaResponse.netProfit || 0,
								roi: orcaResponse.roi || 0,
								winRate: orcaResponse.winRate || 0,
							}
						: null,
				}
			: null;

		// Transform bot status
		const botStatus: BotStatusResponse | null = botResponse?.data
			? {
					running: botResponse.data.running || false,
					status: botResponse.data.status || "unknown",
					users: botResponse.data.activeUsers || 0,
					liveOuts: 0, // Would need separate call to getLiveOuts
					lastActivity: botResponse.data.lastUpdate,
					settings: {
						strategy: botResponse.data.strategy,
						riskLevel: botResponse.data.riskLevel,
					},
				}
			: null;

		return {
			stats: tradingStats,
			sportsStats,
			botStatus,
		};
	} catch {
		return { stats: null, sportsStats: null, botStatus: null };
	}
}

// Fetch all data with type-safe validation and filters
async function fetchAllData(
	filters?: DashboardFilters,
): Promise<Partial<DashboardState>> {
	// Build query parameters for filtered endpoints
	const arbitrageParams = new URLSearchParams();
	if (filters?.category) arbitrageParams.set("category", filters.category);
	if (filters?.minSpread !== undefined)
		arbitrageParams.set("minSpread", filters.minSpread.toString());
	if (filters?.isArbitrage) arbitrageParams.set("arbitrageOnly", "true");

	const arbitrageEndpoint =
		filters && arbitrageParams.toString()
			? `/api/arbitrage/opportunities?${arbitrageParams}`
			: "/api/arbitrage/status";

	const [
		health,
		streams,
		arbitrage,
		executor,
		cache,
		metrics,
		logs,
		rankings,
		miniapp,
		trading,
		endpoints,
		correlation,
	] = await Promise.all([
		// ✅ Type-safe API calls using scope patterns
		fetchApi<HealthResponse>("/api/health", isValidHealthResponse),
		fetchApi<StreamsResponse>("/api/streams", isValidStreamsResponse),
		fetchApi<ArbitrageStatusResponse>(
			arbitrageEndpoint,
			isValidArbitrageStatusResponse,
		),
		fetchApi<ExecutorStatusResponse>(
			"/api/arbitrage/executor/status",
			isValidExecutorStatusResponse,
		),
		fetchApi<CacheStatsResponse>("/api/cache/stats", isValidCacheStatsResponse),
		fetchMetricsData(),
		fetchLogsData(),
		fetchRankingsData(),
		fetchMiniappData(),
		fetchTradingData(),
		fetchApiDiscovery(),
		fetchCorrelationData(),
	]);

	return {
		health,
		streams,
		arbitrage,
		executor,
		cache,
		metrics,
		logs,
		rankings,
		miniapp,
		trading,
		endpoints,
		correlation,
		lastUpdate: Date.now(),
	};
}

// Render full dashboard with performance monitoring
// Pattern: High-precision timing for render operations (PRODUCTION-PATTERNS.md)
async function render(state: DashboardState): Promise<void> {
	const renderStart = Bun.nanoseconds();

	clearScreen();

	const uptime = Date.now() - state.startTime;

	// Header
	console.log(renderHeader());

	// Handle different view modes
	if (state.viewMode === "help") {
		console.log(renderHelpScreen());
		console.log("");
		console.log(renderHelp(state.viewMode));
		return;
	}

	// Two-column layout
	const healthBox = renderHealth(state.health, uptime);
	const cacheBox = renderCache(state.cache);
	const streamsBox = renderStreams(state.streams);
	const arbitrageBox = renderArbitrage(state.arbitrage);
	const executorBox = renderExecutor(state.executor);
	const perfBox = renderPerformanceMetrics(state);
	const sharpBooksBox = renderSharpBooks();
	const mcpToolsBox = await renderMCPTools();
	const metricsBox = renderMetrics(state.metrics);
	const logsBox = renderLogs(state.logs);
	const rankingsBox = renderRankings(state.rankings);
	const miniappBox = renderMiniapp(state.miniapp);
	const tradingStatsBox = renderTradingStats(state.trading?.stats || null);
	const sportsStatsBox = renderSportsStats(state.trading?.sportsStats || null);
	const botStatusBox = renderBotStatus(state.trading?.botStatus || null);
	const correlationBox = renderCorrelation(state.correlation);
	const endpointsBox = renderEndpoints(state.endpoints);

	// Print in layout based on view mode
	if (state.viewMode === "overview") {
		console.log(healthBox);
		console.log("");
		console.log(streamsBox);
		console.log("");
		console.log(arbitrageBox);
		console.log("");
		console.log(executorBox);
		console.log("");
		console.log(tradingStatsBox);
		console.log("");
		console.log(sportsStatsBox);
		console.log("");
		console.log(botStatusBox);
		console.log("");
		console.log(correlationBox);
		console.log("");
		console.log(sharpBooksBox);
		console.log("");
		console.log(mcpToolsBox);
		console.log("");
		console.log(miniappBox);
		console.log("");
		console.log(metricsBox);
		console.log("");
		console.log(cacheBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "arbitrage") {
		console.log(arbitrageBox);
		console.log("");
		console.log(executorBox);
		console.log("");
		console.log(sharpBooksBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "streams") {
		console.log(streamsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(sharpBooksBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "tools") {
		console.log(mcpToolsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "metrics") {
		console.log(metricsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "logs") {
		console.log(logsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "rankings") {
		console.log(rankingsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "trading") {
		console.log(tradingStatsBox);
		console.log("");
		console.log(streamsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "sports") {
		console.log(sportsStatsBox);
		console.log("");
		console.log(sharpBooksBox);
		console.log("");
		console.log(arbitrageBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "bot") {
		console.log(botStatusBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "endpoints") {
		console.log(endpointsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	} else if (state.viewMode === "endpoints") {
		console.log(endpointsBox);
		console.log("");
		console.log(healthBox);
		console.log("");
		console.log(perfBox);
	}

	console.log("");
	console.log(renderHelp(state.viewMode));
	console.log("");
	console.log(
		colors.gray(
			`${nexusColors.crypto("NEXUS")} Last updated: ${new Date(state.lastUpdate).toLocaleTimeString()} │ Refresh: ${REFRESH_INTERVAL / 1000}s │ Uptime: ${formatDuration(uptime)}`,
		),
	);

	// ✅ Performance monitoring: Log slow renders (> 10ms threshold)
	const renderDuration = Bun.nanoseconds() - renderStart;
	if (renderDuration > PERFORMANCE_THRESHOLDS.renderOperation) {
		console.error(
			`⚠️  Slow render: ${renderDuration / 1_000_000}ms (threshold: ${PERFORMANCE_THRESHOLDS.renderOperation / 1_000_000}ms)`,
		);
	}
}

// Handle keyboard input with enhanced controls
function setupKeyboardHandler(
	onQuit: () => void,
	onRefresh: () => void,
	onViewChange: (view: DashboardState["viewMode"]) => Promise<void>,
): void {
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding("utf8");

		process.stdin.on("data", (key: string) => {
			switch (key) {
				case "q":
				case "\x03": // Ctrl+C
					onQuit();
					break;
				case "r":
					onRefresh();
					break;
				case "a":
					onViewChange("arbitrage");
					break;
				case "s":
					onViewChange("streams");
					break;
				case "w":
					onViewChange("trading");
					break;
				case "o":
					onViewChange("sports");
					break;
				case "b":
					onViewChange("bot");
					break;
				case "t":
					onViewChange("tools");
					break;
				case "m":
					onViewChange("metrics");
					break;
				case "l":
					onViewChange("logs");
					break;
				case "k":
					onViewChange("rankings");
					break;
				case "e":
					onViewChange("endpoints");
					break;
				case "c":
					onViewChange("overview"); // Cache is in overview
					break;
				case "e":
					onViewChange("arbitrage"); // Executor is with arbitrage
					break;
				case "h":
					onViewChange("help");
					break;
				case "\x1b": // ESC
					onViewChange("overview");
					break;
			}
		});
	}
}

// Main entry point
async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Handle --help
	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
${nexusColors.gradient("╔═══ NEXUS TRADING DASHBOARD ═══╗", [0, 200, 255], [255, 100, 200])}

${nexusColors.crypto("NEXUS")} ${colors.cyan("Trading Intelligence Platform")}
${colors.gray("Cross-market arbitrage detection across crypto, prediction markets, and sports betting")}

${colors.yellow("Usage:")}
  bun run dashboard [options]

${colors.yellow("Options:")}
  --help, -h          Show this help message
  --once              Run once and exit (no live updates)
  --interval <ms>     Set refresh interval (default: 5000)
  --api <url>         Set API URL (default: http://localhost:3000)

${colors.yellow("Keyboard Controls:")}
  q     Quit dashboard
  r     Force refresh (immediate update)
  a     Arbitrage view (scanner + executor)
  s     Streams view (trade data)
  w     Trading view (wins/losses/P&L)
  o     Sports betting view (ORCA stats)
  b     Bot view (Telegram bot status)
  t     Tools view (MCP tools)
  m     Metrics view (system metrics)
  l     Logs view (error logs)
  k     Rankings view (tool/file rankings)
  h     Show/hide help screen
  ESC   Return to overview

${colors.yellow("Environment:")}
  API_URL             API base URL
  REFRESH_INTERVAL    Refresh interval in ms

${colors.gray("─".repeat(60))}
${nexusColors.info("Features:")}
  • Real-time trade stream monitoring
  • Cross-market arbitrage opportunity detection
  • Live trading executor status
  • System health and performance metrics
  • Cache statistics and optimization

${colors.yellow("Data Sources:")}
  • Trade Streams: SQLite database (CSV/API imports)
  • Arbitrage: Polymarket, Kalshi, Deribit APIs
  • Executor: In-memory execution state
  • Sharp Books: Professional sportsbook registry (6 books)
  • Cache: Redis/in-memory cache statistics
  • Health: API server status

${colors.yellow("Sharp Books:")}
  • S+ Tier: Circa (9.8 weight, 180ms latency)
  • S Tier: Pinnacle (9.5 weight, 90ms latency)
  • A+ Tier: Crisp (8.5 weight, 120ms latency)
  • A Tier: BetCRIS, Bookmaker.eu (7.0-7.5 weight)
  • B+ Tier: Jazz Sports (6.0 weight)

${colors.gray("See .claude/DASHBOARD-DATA-SOURCES.md for details")}
${colors.gray("See .claude/SHARP-BOOKS-REGISTRY.md for sharp books")}
`);
		process.exit(0);
	}

	// Parse arguments
	const once = args.includes("--once");
	const intervalIndex = args.indexOf("--interval");
	const interval =
		intervalIndex !== -1
			? parseInt(args[intervalIndex + 1], 10)
			: REFRESH_INTERVAL;

	// Initialize state
	const state: DashboardState = {
		health: null,
		streams: null,
		arbitrage: null,
		executor: null,
		cache: null,
		metrics: null,
		logs: null,
		rankings: null,
		miniapp: null,
		trading: null,
		endpoints: null,
		correlation: null,
		startTime: Date.now(),
		lastUpdate: Date.now(),
		viewMode: "overview" as DashboardState["viewMode"],
		refreshCount: 0,
		errorCount: 0,
		filters: {},
	};

	// One-shot mode
	if (once) {
		const data = await fetchAllData();
		Object.assign(state, data);
		await render(state);
		process.exit(0);
	}

	// Interactive mode
	hideCursor();

	let running = true;

	const quit = () => {
		running = false;
		showCursor();
		clearScreen();
		console.log(
			nexusColors.gradient(
				"NEXUS Trading Dashboard closed.",
				[0, 200, 255],
				[255, 100, 200],
			),
		);
		console.log(
			colors.gray("Thank you for using NEXUS Trading Intelligence Platform."),
		);
		process.exit(0);
	};

	const refresh = async () => {
		try {
			const data = await fetchAllData(state.filters);
			Object.assign(state, data);
			state.refreshCount++;
			await render(state);
		} catch (error) {
			state.errorCount++;
			state.refreshCount++;
			await render(state);
		}
	};

	const changeView = async (view: DashboardState["viewMode"]) => {
		state.viewMode = view;
		await render(state);
	};

	// Setup keyboard handler
	setupKeyboardHandler(quit, refresh, changeView);

	// Initial render
	await refresh();

	// Auto-refresh loop
	const timer = setInterval(async () => {
		if (running) {
			await refresh();
		}
	}, interval);

	// Handle cleanup
	process.on("SIGINT", quit);
	process.on("SIGTERM", quit);
}

// Run
main().catch((error) => {
	showCursor();
	console.error(colors.red("Dashboard error:"), error);
	process.exit(1);
});
