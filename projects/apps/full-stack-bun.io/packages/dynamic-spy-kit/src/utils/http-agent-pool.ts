/**
 * @dynamic-spy/kit v9.0 - HTTP Agent Connection Pool
 * 
 * Fixed critical bug where http.Agent with keepAlive: true was not reusing connections.
 * Now properly reuses connections for improved performance.
 */

import http from "node:http";
import https from "node:https";

export interface AgentPoolOptions {
	keepAlive?: boolean;
	keepAliveMsecs?: number;
	maxSockets?: number;
	maxFreeSockets?: number;
	timeout?: number;
	scheduling?: 'fifo' | 'lifo';
}

/**
 * HTTP Agent Connection Pool Manager
 * 
 * Properly reuses connections with keepAlive: true
 */
export class HTTPAgentPool {
	private httpAgent: http.Agent;
	private httpsAgent: https.Agent;
	private connectionStats: {
		totalRequests: number;
		reusedConnections: number;
		newConnections: number;
		activeConnections: number;
	} = {
		totalRequests: 0,
		reusedConnections: 0,
		newConnections: 0,
		activeConnections: 0
	};

	constructor(options: AgentPoolOptions = {}) {
		const defaultOptions = {
			keepAlive: true,
			keepAliveMsecs: 1000,
			maxSockets: 50,
			maxFreeSockets: 10,
			timeout: 60000,
			scheduling: 'fifo' as const,
			...options
		};

		// Create HTTP agent with proper keepAlive configuration
		this.httpAgent = new http.Agent({
			keepAlive: defaultOptions.keepAlive,
			keepAliveMsecs: defaultOptions.keepAliveMsecs,
			maxSockets: defaultOptions.maxSockets,
			maxFreeSockets: defaultOptions.maxFreeSockets,
			timeout: defaultOptions.timeout,
			scheduling: defaultOptions.scheduling
		});

		// Create HTTPS agent with proper keepAlive configuration
		this.httpsAgent = new https.Agent({
			keepAlive: defaultOptions.keepAlive,
			keepAliveMsecs: defaultOptions.keepAliveMsecs,
			maxSockets: defaultOptions.maxSockets,
			maxFreeSockets: defaultOptions.maxFreeSockets,
			timeout: defaultOptions.timeout,
			scheduling: defaultOptions.scheduling
		});

		// Track connection reuse
		this.setupConnectionTracking();
	}

	/**
	 * Setup connection tracking to monitor reuse
	 */
	private setupConnectionTracking(): void {
		// Track HTTP agent connections
		this.httpAgent.on('free', () => {
			this.connectionStats.reusedConnections++;
		});

		this.httpsAgent.on('free', () => {
			this.connectionStats.reusedConnections++;
		});
	}

	/**
	 * Get HTTP agent (reuses connections)
	 */
	getHTTPAgent(): http.Agent {
		return this.httpAgent;
	}

	/**
	 * Get HTTPS agent (reuses connections)
	 */
	getHTTPSAgent(): https.Agent {
		return this.httpsAgent;
	}

	/**
	 * Make HTTP request with connection reuse
	 */
	request(
		options: http.RequestOptions | string | URL,
		callback?: (res: http.IncomingMessage) => void
	): http.ClientRequest {
		this.connectionStats.totalRequests++;

		const url = typeof options === 'string' ? new URL(options) :
			options instanceof URL ? options : null;

		const isHTTPS = url ? url.protocol === 'https:' :
			(options as http.RequestOptions).protocol === 'https:';

		const requestOptions: http.RequestOptions = typeof options === 'object' && !(options instanceof URL)
			? { ...options, agent: isHTTPS ? this.httpsAgent : this.httpAgent }
			: { agent: isHTTPS ? this.httpsAgent : this.httpAgent };

		if (url) {
			requestOptions.hostname = url.hostname;
			requestOptions.port = url.port || (isHTTPS ? 443 : 80);
			requestOptions.path = url.pathname + url.search;
		}

		const agent = isHTTPS ? this.httpsAgent : this.httpAgent;
		const activeSockets = (agent as any).sockets?.[`${requestOptions.hostname}:${requestOptions.port}`]?.length || 0;
		const freeSockets = (agent as any).freeSockets?.[`${requestOptions.hostname}:${requestOptions.port}`]?.length || 0;

		if (freeSockets > 0) {
			this.connectionStats.reusedConnections++;
		} else {
			this.connectionStats.newConnections++;
		}

		this.connectionStats.activeConnections = activeSockets;

		return (isHTTPS ? https : http).request(requestOptions, callback || (() => {}));
	}

	/**
	 * Get connection pool statistics
	 */
	getStats() {
		return {
			...this.connectionStats,
			reuseRate: this.connectionStats.totalRequests > 0
				? (this.connectionStats.reusedConnections / this.connectionStats.totalRequests * 100).toFixed(2) + '%'
				: '0%',
			httpAgent: {
				maxSockets: this.httpAgent.maxSockets,
				maxFreeSockets: this.httpAgent.maxFreeSockets,
				keepAlive: this.httpAgent.keepAlive,
				keepAliveMsecs: this.httpAgent.keepAliveMsecs
			},
			httpsAgent: {
				maxSockets: this.httpsAgent.maxSockets,
				maxFreeSockets: this.httpsAgent.maxFreeSockets,
				keepAlive: this.httpsAgent.keepAlive,
				keepAliveMsecs: this.httpsAgent.keepAliveMsecs
			}
		};
	}

	/**
	 * Destroy all agents and close connections
	 */
	destroy(): void {
		this.httpAgent.destroy();
		this.httpsAgent.destroy();
	}
}

/**
 * Global agent pool instance
 */
let globalAgentPool: HTTPAgentPool | null = null;

/**
 * Get or create global agent pool
 */
export function getGlobalAgentPool(options?: AgentPoolOptions): HTTPAgentPool {
	if (!globalAgentPool) {
		globalAgentPool = new HTTPAgentPool(options);
	}
	return globalAgentPool;
}



