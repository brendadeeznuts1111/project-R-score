/**
 * @fileoverview Worker Message Broker
 * @description Request-response pattern with timeout and batch operations
 * @module workers/message-broker
 */

export interface BrokerRequest<T> {
	type: string;
	requestId: string;
	data: T;
	timestamp: number;
}

export interface BrokerResponse<R> {
	requestId: string;
	result?: R;
	error?: string;
	type: 'response';
}

interface PendingRequest {
	resolve: Function;
	reject: Function;
	timeout: Timer;
}

/**
 * Worker Message Broker
 * 
 * Provides request-response pattern with automatic timeout handling,
 * batch operations, and streaming support.
 */
export class WorkerMessageBroker {
	private pendingRequests = new Map<string, PendingRequest>();
	private requestTimeout = 30000; // 30 seconds

	constructor(private worker: Worker) {
		this.setupMessageHandler();
	}

	private setupMessageHandler() {
		this.worker.onmessage = (event: MessageEvent<BrokerResponse<any>>) => {
			const { requestId, result, error, type } = event.data;

			if (type === 'response' && requestId) {
				const pending = this.pendingRequests.get(requestId);
				if (pending) {
					clearTimeout(pending.timeout);
					if (error) {
						pending.reject(new Error(error));
					} else {
						pending.resolve(result);
					}
					this.pendingRequests.delete(requestId);
				}
			}
		};
	}

	/**
	 * Send a request and wait for response
	 */
	async request<T = any, R = any>(type: string, data: T): Promise<R> {
		const requestId = crypto.randomUUID();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Request ${type} timed out after ${this.requestTimeout}ms`));
			}, this.requestTimeout);

			this.pendingRequests.set(requestId, { resolve, reject, timeout });

			this.worker.postMessage({
				type: 'request',
				requestId,
				data,
				timestamp: Date.now()
			} as BrokerRequest<T>);
		});
	}

	/**
	 * Execute multiple requests in parallel
	 */
	async batch<T extends Record<string, any>, R extends Record<string, any>>(
		requests: T
	): Promise<R> {
		const keys = Object.keys(requests);
		const promises = keys.map(key => 
			this.request(key, requests[key])
		);

		const results = await Promise.all(promises);
		return keys.reduce((acc, key, index) => {
			acc[key] = results[index];
			return acc;
		}, {} as R);
	}

	/**
	 * Stream responses for large datasets
	 */
	async *stream<T, R>(type: string, data: T, chunkSize: number = 100): AsyncGenerator<R[], void, unknown> {
		let offset = 0;
		let hasMore = true;

		while (hasMore) {
			const chunk = await this.request<{ offset: number; limit: number } & T, { data: R[]; hasMore: boolean }>(type, {
				...data,
				offset,
				limit: chunkSize
			} as any);

			if (chunk.data && chunk.data.length > 0) {
				yield chunk.data;
				offset += chunk.data.length;
				hasMore = chunk.hasMore;
			} else {
				hasMore = false;
			}
		}
	}

	/**
	 * Set custom timeout for requests
	 */
	setTimeout(ms: number) {
		this.requestTimeout = ms;
	}
}
