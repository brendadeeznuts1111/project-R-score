/**
 * @dynamic-spy/kit v3.3 - Live Streaming Engine
 * 
 * Real-time sync from private registry with WebSocket support
 */

import { SportsCache } from "./cache-layer";
import { OddsRouter } from "./odds-router";
import { URLPatternSpyFactory } from "./urlpattern-spy";

export interface LiveUpdate {
	sport: string;
	league: string;
	market: string;
	odds: any;
	url: string;
	arbOpportunity?: {
		profit: number;
		value_usd: number;
	};
	timestamp: number;
}

export class LiveStreamingEngine {
	private ws: WebSocket | null = null;
	private cache: SportsCache;
	private router: OddsRouter;
	private isConnected: boolean = false;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 10;
	private stats = {
		liveUpdates: 0,
		marketsPerSec: 0,
		lastUpdate: Date.now()
	};

	constructor(
		private registry: string = "https://registry.yourarb.com",
		cache?: SportsCache,
		router?: OddsRouter
	) {
		this.cache = cache || new SportsCache();
		this.router = router || new OddsRouter();
	}

	/**
	 * Connect to WebSocket for live updates
	 */
	connect() {
		try {
			const wsUrl = this.registry.replace('https://', 'wss://').replace('http://', 'ws://');
			this.ws = new WebSocket(`${wsUrl}/stream/sports`);

			this.ws.onopen = () => {
				console.log('✅ WebSocket connected to private registry');
				this.isConnected = true;
				this.reconnectAttempts = 0;
			};

			this.ws.onmessage = this.handleLiveUpdate.bind(this);

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.isConnected = false;
			};

			this.ws.onclose = () => {
				console.log('WebSocket closed, attempting reconnect...');
				this.isConnected = false;
				this.reconnect();
			};
		} catch (error) {
			console.error('Failed to connect WebSocket:', error);
			this.reconnect();
		}
	}

	/**
	 * Handle live market updates
	 */
	async handleLiveUpdate(event: MessageEvent) {
		try {
			const update: LiveUpdate = JSON.parse(event.data);

			// 1. STREAM → CACHE → SPIES (atomic)
			await this.cache.cacheOdds(
				update.sport,
				update.league,
				update.market,
				update.odds
			);

			// 2. TRIGGER SPIES
			if (update.url) {
				this.router.testOddsFeed(update.url);
			}

			// 3. UPDATE STATS
			this.stats.liveUpdates++;
			const now = Date.now();
			const elapsed = (now - this.stats.lastUpdate) / 1000;
			if (elapsed >= 1) {
				this.stats.marketsPerSec = this.stats.liveUpdates / elapsed;
				this.stats.liveUpdates = 0;
				this.stats.lastUpdate = now;
			}

			// 4. LOG LIVE UPDATE
			if (update.arbOpportunity) {
				console.log(`🔥 LIVE: ${update.market} → ${(update.arbOpportunity.profit * 100).toFixed(2)}%`);
			}
		} catch (error) {
			console.error('Error handling live update:', error);
		}
	}

	/**
	 * Reconnect with exponential backoff
	 */
	private reconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('Max reconnection attempts reached');
			return;
		}

		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
		this.reconnectAttempts++;

		setTimeout(() => {
			console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
			this.connect();
		}, delay);
	}

	/**
	 * Disconnect WebSocket
	 */
	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
			this.isConnected = false;
		}
	}

	/**
	 * Get streaming statistics
	 */
	getStats() {
		return {
			connected: this.isConnected,
			liveUpdates: this.stats.liveUpdates,
			marketsPerSec: this.stats.marketsPerSec,
			reconnectAttempts: this.reconnectAttempts
		};
	}
}



