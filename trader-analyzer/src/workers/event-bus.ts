/**
 * @fileoverview Worker Event Bus
 * @description Event-based communication system for workers
 * @module workers/event-bus
 */

export interface EventMessage {
	type: 'event';
	event: string;
	data?: any;
	requestId?: string;
}

export interface EventResponse {
	requestId?: string;
	data?: any;
}

/**
 * Worker Event Bus
 * 
 * Provides event-based communication pattern for workers with
 * pub/sub capabilities and request-response support.
 */
export class WorkerEventBus {
	private listeners = new Map<string, Set<Function>>();
	private worker: Worker;

	constructor(workerScript: string) {
		this.worker = new Worker(workerScript);
		this.setupMessageHandler();
	}

	private setupMessageHandler() {
		this.worker.onmessage = (event: MessageEvent<EventResponse & { event?: string }>) => {
			const { type, data, event: eventName } = event.data as any;
			
			if (type === 'event' && eventName) {
				this.emit(eventName, data);
			} else if (eventName && eventName.endsWith(':response')) {
				this.emit(eventName, data);
			}
		};
	}

	/**
	 * Emit an event to all listeners
	 */
	emit(event: string, data?: any) {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			for (const listener of eventListeners) {
				try {
					listener(data);
				} catch (error) {
					console.error(`Error in event listener for ${event}:`, error);
				}
			}
		}
	}

	/**
	 * Subscribe to an event
	 */
	on(event: string, listener: Function) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(listener);
	}

	/**
	 * Unsubscribe from an event
	 */
	off(event: string, listener: Function) {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(listener);
		}
	}

	/**
	 * Post an event to the worker
	 */
	post(event: string, data?: any) {
		this.worker.postMessage({ type: 'event', event, data } as EventMessage);
	}

	/**
	 * Request-response pattern using events
	 */
	request<T = any, R = any>(event: string, data?: T): Promise<R> {
		return new Promise((resolve) => {
			const requestId = crypto.randomUUID();
			
			const responseHandler = (response: any) => {
				if (response?.requestId === requestId) {
					this.off(`${event}:response`, responseHandler);
					resolve(response.data);
				}
			};

			this.on(`${event}:response`, responseHandler);
			this.post(event, { ...data, requestId });
		});
	}

	/**
	 * Terminate the worker
	 */
	terminate() {
		this.worker.terminate();
	}
}
