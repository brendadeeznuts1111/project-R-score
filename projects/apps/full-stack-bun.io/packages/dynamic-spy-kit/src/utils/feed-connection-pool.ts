/**
 * @dynamic-spy/kit v9.0 - Feed Connection Pool
 * 
 * Connection pool with detailed metrics using Bun 1.3 enhanced socket information
 */

import { connect, Socket } from "bun";
import type { EnhancedFeedPattern } from "./feed-registry-loader";
import { rapidHashString } from "./rapid-hash";

export interface PooledSocket extends Socket {
	feedId: string;
	createdAt: number;
	localInfo: string;
	remoteInfo: string;
	lastUsed: number;
}

export class FeedConnectionPool {
	private pools: Map<string, PooledSocket[]> = new Map();

	constructor(
		private feedConfig: EnhancedFeedPattern[],
		private maxConnections: number = 5
	) {
		this.feedConfig = feedConfig;
		this.maxConnections = maxConnections;
	}

	async getConnection(feedId: string): Promise<PooledSocket> {
		const feed = this.feedConfig.find(f => f.id === feedId);
		if (!feed) {
			throw new Error(`Feed ${feedId} not found`);
		}

		// Use rapid hash for fast pool lookup
		const poolKey = rapidHashString(feedId);
		
		// Check or create pool
		if (!this.pools.has(feedId)) {
			this.pools.set(feedId, []);
		}

		const pool = this.pools.get(feedId)!;

		// Return existing connection if available
		if (pool.length > 0) {
			const socket = pool.pop()!;
			socket.lastUsed = Date.now();
			return socket;
		}

		// Create new connection if under limit
		if (pool.length < this.maxConnections) {
			const socket = await connect({
				hostname: feed.hostname || 'localhost',
				port: feed.port || 443,
				tls: feed.port === 443 || feed.hostname?.includes('https'),
				socket: {
					data: (sock, data) => {
						console.log(`📦 Received ${data.length} bytes from ${sock.remoteAddress}`);
					},
					open: () => {},
					error: () => {},
					close: () => {},
					drain: () => {},
				},
			}) as PooledSocket;

			// Add connection metadata
			socket.feedId = feedId;
			socket.createdAt = Date.now();
			socket.lastUsed = Date.now();
			socket.localInfo = `${socket.localAddress}:${socket.localPort}`;
			socket.remoteInfo = `${socket.remoteAddress}:${socket.remotePort}`;

			return socket;
		}

		throw new Error(`Connection pool exhausted for feed ${feedId}`);
	}

	releaseConnection(socket: PooledSocket): void {
		const pool = this.pools.get(socket.feedId);
		if (pool && pool.length < this.maxConnections) {
			socket.lastUsed = Date.now();
			pool.push(socket);
		} else {
			socket.end(); // Close if pool is full
		}
	}

	getPoolStats(feedId: string): {
		active: number;
		available: number;
		maxConnections: number;
		connections: Array<{
			localInfo: string;
			remoteInfo: string;
			age: number;
			idle: number;
		}>;
	} {
		const pool = this.pools.get(feedId) || [];
		const allConnections = Array.from(this.pools.values()).flat();

		return {
			active: allConnections.filter(s => s.feedId === feedId).length,
			available: pool.length,
			maxConnections: this.maxConnections,
			connections: pool.map(socket => ({
				localInfo: socket.localInfo,
				remoteInfo: socket.remoteInfo,
				age: Date.now() - socket.createdAt,
				idle: Date.now() - socket.lastUsed,
			})),
		};
	}

	closeAll(feedId?: string): void {
		if (feedId) {
			const pool = this.pools.get(feedId) || [];
			pool.forEach(socket => socket.end());
			this.pools.delete(feedId);
		} else {
			// Close all pools
			for (const pool of this.pools.values()) {
				pool.forEach(socket => socket.end());
			}
			this.pools.clear();
		}
	}
}

