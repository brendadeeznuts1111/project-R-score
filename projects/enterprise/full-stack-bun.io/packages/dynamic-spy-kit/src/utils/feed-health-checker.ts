/**
 * @dynamic-spy/kit v9.0 - Feed Health Checker
 * 
 * Load balancing/health check using Bun 1.3 enhanced socket information
 */

import { connect } from "bun";
import type { EnhancedFeedPattern } from "./feed-registry-loader";

export interface HealthCheckResult {
	feedId: string;
	status: 'healthy' | 'unhealthy';
	latency?: string;
	localEndpoint?: string;
	remoteEndpoint?: string;
	family?: 'IPv4' | 'IPv6';
	error?: string;
}

export class FeedHealthChecker {
	constructor(private feeds: EnhancedFeedPattern[]) {
		this.feeds = feeds;
	}

	async checkAll(timeout: number = 5000): Promise<HealthCheckResult[]> {
		const results: HealthCheckResult[] = [];

		for (const feed of this.feeds) {
			const start = performance.now();

			try {
				const socket = await Promise.race([
					connect({
						hostname: feed.hostname || 'localhost',
						port: feed.port || 443,
						tls: feed.port === 443 || feed.hostname?.includes('https'),
						socket: {
							data: () => {},
							open: () => {},
							error: () => {},
							close: () => {},
							drain: () => {},
						},
					}),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Connection timeout')), timeout)
					),
				]);

				const latency = performance.now() - start;

				results.push({
					feedId: feed.id,
					status: 'healthy',
					latency: `${latency.toFixed(2)}ms`,
					localEndpoint: `${socket.localAddress}:${socket.localPort}`,
					remoteEndpoint: `${socket.remoteAddress}:${socket.remotePort}`,
					family: socket.remoteFamily,
				});

				socket.end(); // Close connection after check
			} catch (error) {
				results.push({
					feedId: feed.id,
					status: 'unhealthy',
					error: (error as Error).message,
				});
			}
		}

		return results;
	}

	async checkOne(feedId: string, timeout: number = 5000): Promise<HealthCheckResult | null> {
		const feed = this.feeds.find(f => f.id === feedId);
		if (!feed) {
			return {
				feedId,
				status: 'unhealthy',
				error: `Feed ${feedId} not found`,
			};
		}

		const results = await this.checkAll(timeout);
		return results.find(r => r.feedId === feedId) || null;
	}

	getHealthyFeeds(results: HealthCheckResult[]): string[] {
		return results
			.filter(r => r.status === 'healthy')
			.map(r => r.feedId);
	}

	getUnhealthyFeeds(results: HealthCheckResult[]): string[] {
		return results
			.filter(r => r.status === 'unhealthy')
			.map(r => r.feedId);
	}
}



