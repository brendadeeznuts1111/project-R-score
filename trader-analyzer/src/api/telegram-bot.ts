/**
 * Telegram Bot Control API
 * Real-time management for sharp trading signals bot
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TELEGRAM-BOT@0.1.0;instance-id=ORCA-TELEGRAM-001;version=0.1.0}][PROPERTIES:{api={value:"telegram-bot";@root:"ROOT-API";@chain:["BP-SHARP-BOOKS","BP-LIVE-OUTS"];@version:"0.1.0"}}][CLASS:TelegramBotAPI][#REF:v-0.1.0.BP.TELEGRAM.BOT.1.0.A.1.1.ORCA.1.1]]
 */

import type { Context } from "hono";
import { getConnectedBooks, sharpBookRegistry } from "../orca/sharp-books";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BotStatus {
	running: boolean;
	uptime: number;
	activeUsers: number;
	messagesProcessed: number;
	alertsSent: number;
	lastUpdate: string;
	strategy: string;
	riskLevel: string;
	autoCompound: boolean;
	trailingStop: boolean;
	telegramConnected: boolean;
	sessionTrades: number;
	sessionPnL: number;
	lastTrade: string;
}

export interface TelegramUser {
	id: number;
	username: string;
	firstName: string;
	role: "Admin" | "Moderator" | "User" | "VIP";
	isActive: boolean;
	lastActive: string;
	permissions: string[];
	subscriptions?: string[];
	messageCount?: number;
	joinDate?: string;
}

export interface LiveOut {
	id: string;
	type: string;
	name: string;
	marketId: string;
	confidence: number;
	ev: number;
	sport: string;
	expiresAt: number;
}

export interface EVHeatmapData {
	sports: string[];
	books: string[];
	evMatrix: number[][]; // [sport][book] = EV percentage
	lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * In-memory bot state (in production, use Redis or database)
 */
class TelegramBotState {
	private status: BotStatus = {
		running: false,
		uptime: 0,
		activeUsers: 0,
		messagesProcessed: 0,
		alertsSent: 0,
		lastUpdate: new Date().toISOString(),
		strategy: "Momentum Reversal",
		riskLevel: "Aggressive",
		autoCompound: true,
		trailingStop: true,
		telegramConnected: false,
		sessionTrades: 0,
		sessionPnL: 0,
		lastTrade: "Never",
	};

	private startTime: number = Date.now();
	private users: Map<number, TelegramUser> = new Map();
	private liveOuts: Map<string, LiveOut> = new Map();

	/**
	 * Get current bot status
	 */
	getStatus(): BotStatus {
		if (this.status.running) {
			this.status.uptime = Math.floor((Date.now() - this.startTime) / 1000);
		}
		this.status.lastUpdate = new Date().toISOString();
		this.status.activeUsers = Array.from(this.users.values()).filter(
			(u) => u.isActive,
		).length;
		return { ...this.status };
	}

	/**
	 * Update bot status
	 */
	updateStatus(updates: Partial<BotStatus>): BotStatus {
		this.status = { ...this.status, ...updates };
		if (updates.running === true && !this.status.running) {
			this.startTime = Date.now();
			this.status.uptime = 0;
		}
		return this.getStatus();
	}

	/**
	 * Start bot
	 */
	start(): BotStatus {
		return this.updateStatus({ running: true });
	}

	/**
	 * Stop bot
	 */
	stop(): BotStatus {
		return this.updateStatus({ running: false });
	}

	/**
	 * Restart bot
	 */
	restart(): BotStatus {
		this.startTime = Date.now();
		return this.updateStatus({
			running: true,
			uptime: 0,
			sessionTrades: 0,
			sessionPnL: 0,
			lastTrade: "Never",
		});
	}

	/**
	 * Increment message count
	 */
	incrementMessages(count: number = 1): void {
		this.status.messagesProcessed += count;
	}

	/**
	 * Increment alerts sent
	 */
	incrementAlerts(count: number = 1): void {
		this.status.alertsSent += count;
	}

	/**
	 * Record trade
	 */
	recordTrade(pnl: number): void {
		this.status.sessionTrades += 1;
		this.status.sessionPnL += pnl;
		this.status.lastTrade = "Just now";
	}

	/**
	 * Get all users
	 */
	getUsers(): TelegramUser[] {
		return Array.from(this.users.values());
	}

	/**
	 * Get user by ID
	 */
	getUser(id: number): TelegramUser | undefined {
		return this.users.get(id);
	}

	/**
	 * Add or update user
	 */
	setUser(user: TelegramUser): void {
		this.users.set(user.id, user);
	}

	/**
	 * Remove user
	 */
	removeUser(id: number): boolean {
		return this.users.delete(id);
	}

	/**
	 * Get live outs
	 */
	getLiveOuts(): LiveOut[] {
		const now = Date.now();
		return Array.from(this.liveOuts.values()).filter(
			(out) => out.expiresAt > now,
		);
	}

	/**
	 * Add live out
	 */
	addLiveOut(out: LiveOut): void {
		this.liveOuts.set(out.id, out);
	}

	/**
	 * Remove live out
	 */
	removeLiveOut(id: string): boolean {
		return this.liveOuts.delete(id);
	}

	/**
	 * Generate EV heatmap data
	 * In production, this would calculate real EV from market data
	 */
	generateEVHeatmap(): EVHeatmapData {
		const sports = ["basketball", "football", "soccer", "mma", "baseball"];
		const books = getConnectedBooks().map((b) => b.name);

		// Generate mock EV matrix (5 sports x N books)
		// In production, calculate from actual market data
		const evMatrix: number[][] = [];

		for (let sportIdx = 0; sportIdx < sports.length; sportIdx++) {
			const row: number[] = [];
			for (let bookIdx = 0; bookIdx < books.length; bookIdx++) {
				// Mock EV calculation: -5 to +15 range
				// Higher EV for sharper books (weight-based)
				const book = getConnectedBooks()[bookIdx];
				const baseEV = (book.weight / 10) * 15; // Scale by book weight
				const variance = (Math.random() - 0.5) * 10; // Random variance
				const ev = Math.max(-5, Math.min(15, baseEV + variance));
				row.push(parseFloat(ev.toFixed(1)));
			}
			evMatrix.push(row);
		}

		return {
			sports,
			books,
			evMatrix,
			lastUpdated: new Date().toISOString(),
		};
	}
}

// Singleton instance
export const botState = new TelegramBotState();

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * Get bot status
 */
export function getBotStatus(c: Context) {
	return c.json({
		status: "ok",
		data: botState.getStatus(),
	});
}

/**
 * Start bot
 */
export function startBot(c: Context) {
	const status = botState.start();
	return c.json({
		status: "ok",
		message: "Bot started successfully",
		data: status,
	});
}

/**
 * Stop bot
 */
export function stopBot(c: Context) {
	const status = botState.stop();
	return c.json({
		status: "ok",
		message: "Bot stopped successfully",
		data: status,
	});
}

/**
 * Restart bot
 */
export function restartBot(c: Context) {
	const status = botState.restart();
	return c.json({
		status: "ok",
		message: "Bot restarted successfully",
		data: status,
	});
}

/**
 * Update bot settings
 */
export async function updateBotSettings(c: Context) {
	try {
		const body = await c.req.json<Partial<BotStatus>>();
		const status = botState.updateStatus(body);
		return c.json({
			status: "ok",
			message: "Settings updated successfully",
			data: status,
		});
	} catch (error) {
		return c.json(
			{
				status: "error",
				error: error instanceof Error ? error.message : "Invalid request",
			},
			400,
		);
	}
}

/**
 * Get users
 */
export function getUsers(c: Context) {
	const search = c.req.query("search");
	const filter = c.req.query("filter") as
		| "all"
		| "active"
		| "inactive"
		| "vip"
		| undefined;

	let users = botState.getUsers();

	// Apply search filter
	if (search) {
		const term = search.toLowerCase();
		users = users.filter(
			(u) =>
				u.username.toLowerCase().includes(term) ||
				u.firstName.toLowerCase().includes(term) ||
				u.id.toString().includes(term),
		);
	}

	// Apply status filter
	if (filter === "active") {
		users = users.filter((u) => u.isActive);
	} else if (filter === "inactive") {
		users = users.filter((u) => !u.isActive);
	} else if (filter === "vip") {
		users = users.filter((u) => u.role === "VIP" || u.role === "Admin");
	}

	return c.json({
		status: "ok",
		data: users,
		total: users.length,
	});
}

/**
 * Get user by ID
 */
export function getUser(c: Context) {
	const id = parseInt(c.req.param("id"), 10);
	const user = botState.getUser(id);

	if (!user) {
		return c.json({ status: "error", error: "User not found" }, 404);
	}

	return c.json({
		status: "ok",
		data: user,
	});
}

/**
 * Update user
 */
export async function updateUser(c: Context) {
	try {
		const id = parseInt(c.req.param("id"), 10);
		const body = await c.req.json<Partial<TelegramUser>>();
		const existing = botState.getUser(id);

		if (!existing) {
			return c.json({ status: "error", error: "User not found" }, 404);
		}

		const updated: TelegramUser = { ...existing, ...body };
		botState.setUser(updated);

		return c.json({
			status: "ok",
			message: "User updated successfully",
			data: updated,
		});
	} catch (error) {
		return c.json(
			{
				status: "error",
				error: error instanceof Error ? error.message : "Invalid request",
			},
			400,
		);
	}
}

/**
 * Broadcast message
 */
export async function broadcastMessage(c: Context) {
	try {
		const body = await c.req.json<{ message: string }>();

		if (!body.message || !body.message.trim()) {
			return c.json({ status: "error", error: "Message is required" }, 400);
		}

		const status = botState.getStatus();
		botState.incrementMessages(status.activeUsers);

		return c.json({
			status: "ok",
			message: "Broadcast sent successfully",
			data: {
				recipients: status.activeUsers,
				message: body.message,
				sentAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		return c.json(
			{
				status: "error",
				error: error instanceof Error ? error.message : "Invalid request",
			},
			400,
		);
	}
}

/**
 * Get live outs
 */
export function getLiveOuts(c: Context) {
	const outs = botState.getLiveOuts();
	return c.json({
		status: "ok",
		data: outs,
		count: outs.length,
	});
}

/**
 * Add live out
 */
export async function addLiveOut(c: Context) {
	try {
		const body = await c.req.json<LiveOut>();
		botState.addLiveOut(body);
		botState.incrementAlerts();

		return c.json({
			status: "ok",
			message: "Live out added successfully",
			data: body,
		});
	} catch (error) {
		return c.json(
			{
				status: "error",
				error: error instanceof Error ? error.message : "Invalid request",
			},
			400,
		);
	}
}

/**
 * Remove live out
 */
export function removeLiveOut(c: Context) {
	const id = c.req.param("id");
	const removed = botState.removeLiveOut(id);

	if (!removed) {
		return c.json({ status: "error", error: "Live out not found" }, 404);
	}

	return c.json({
		status: "ok",
		message: "Live out removed successfully",
	});
}

/**
 * Get sharp books status
 */
export function getSharpBooksStatus(c: Context) {
	const books = getConnectedBooks();
	const summary = sharpBookRegistry.getStatusSummary();

	return c.json({
		status: "ok",
		data: {
			books: books.map((book) => ({
				id: book.id,
				name: book.name,
				tier: book.sharpTier,
				latency: book.latencyBenchmark,
				status: book.status,
				weight: book.weight,
			})),
			summary,
			connected: books.length,
			total: Object.keys(summary).length,
		},
	});
}

/**
 * Get EV heatmap data
 */
export function getEVHeatmap(c: Context) {
	const heatmap = botState.generateEVHeatmap();
	return c.json({
		status: "ok",
		data: heatmap,
	});
}

/**
 * Initialize sample data (for development)
 */
export function initializeSampleData(): void {
	// Sample users
	const sampleUsers: TelegramUser[] = [
		{
			id: 123456789,
			username: "prosharps",
			firstName: "Alex",
			role: "Admin",
			isActive: true,
			lastActive: new Date().toISOString(),
			permissions: ["all"],
			subscriptions: ["live", "nba", "crypto"],
			messageCount: 342,
			joinDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 987654321,
			username: "viptrader7",
			firstName: "Sarah",
			role: "VIP",
			isActive: true,
			lastActive: new Date(Date.now() - 300000).toISOString(),
			permissions: [],
			subscriptions: ["sports", "nfl", "playerprops"],
			messageCount: 687,
			joinDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 555111222,
			username: "newguy2025",
			firstName: "Mike",
			role: "User",
			isActive: false,
			lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			permissions: [],
			subscriptions: ["crypto"],
			messageCount: 12,
			joinDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		},
		{
			id: 777888999,
			username: "ghostbet",
			firstName: "Jordan",
			role: "Moderator",
			isActive: true,
			lastActive: new Date().toISOString(),
			permissions: ["mute", "warn"],
			subscriptions: ["live", "soccer"],
			messageCount: 91,
			joinDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
		},
	];

	for (const user of sampleUsers) {
		botState.setUser(user);
	}

	// Sample live outs
	const sampleLiveOuts: LiveOut[] = [
		{
			id: "1",
			type: "halftime-ghost",
			name: "LAL vs GSW - Under 112.5 2H",
			marketId: "NBA29381",
			confidence: 0.94,
			ev: 8.7,
			sport: "basketball",
			expiresAt: Date.now() + 8 * 60000,
		},
		{
			id: "2",
			type: "player-prop-mirage",
			name: "LeBron James o28.5 PRA",
			marketId: "PP-LBJ-1283",
			confidence: 0.91,
			ev: 12.1,
			sport: "basketball",
			expiresAt: Date.now() + 12 * 60000,
		},
	];

	for (const out of sampleLiveOuts) {
		botState.addLiveOut(out);
	}

	// Initialize bot status
	botState.updateStatus({
		running: true,
		telegramConnected: true,
		messagesProcessed: 12984,
		alertsSent: 437,
		sessionTrades: 18,
		sessionPnL: 842.31,
	});
}

// Initialize sample data on module load (development only)
if (process.env.NODE_ENV !== "production") {
	initializeSampleData();
}
