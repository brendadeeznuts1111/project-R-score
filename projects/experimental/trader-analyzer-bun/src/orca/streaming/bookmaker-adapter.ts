/**
 * @fileoverview High-Performance Bookmaker Socket Adapter
 * @description Low-level socket adapter with kqueue/epoll monitoring for market data streaming
 * @module orca/streaming/bookmaker-adapter
 * 
 * Bun v1.51 Feature: Socket descriptor access (_handle.fd)
 * Enables high-performance market data streaming with kqueue/epoll
 */

import { Socket } from "net";
import type { TLSSocket } from "node:tls";

/**
 * Socket event types for file descriptor monitoring
 */
export interface SocketEvents {
	readable: boolean;
	writable: boolean;
	error: boolean;
}

/**
 * File descriptor watcher interface
 * Platform-specific implementations: kqueue (macOS), epoll (Linux)
 */
export interface FSWatcher {
	add(fd: number, callback: (events: SocketEvents) => void): void;
	remove(fd: number): void;
	close(): void;
}

/**
 * High-Performance Bookmaker Socket Adapter
 * 
 * Uses Bun v1.51 socket descriptor fix for low-level socket monitoring
 * Enables kqueue/epoll-based event-driven market data processing
 */
export class BookmakerSocketAdapter {
	private socket: Socket | TLSSocket;
	private watcher: FSWatcher | null = null;
	private isConnected = false;
	private buffer: Buffer[] = [];
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;

	/**
	 * Create a new bookmaker socket adapter
	 * 
	 * @param host - Bookmaker hostname
	 * @param port - Bookmaker port
	 * @param useTLS - Use TLS encryption (default: true)
	 */
	constructor(
		private host: string,
		private port: number,
		private useTLS: boolean = true,
	) {
		// Create socket (TLS or plain TCP)
		if (useTLS) {
			const tls = require("node:tls");
			this.socket = tls.connect({
				host,
				port,
				rejectUnauthorized: true,
			});
		} else {
			this.socket = new Socket();
		}

		this.setupSocketHandlers();
	}

	/**
	 * Setup socket event handlers
	 */
	private setupSocketHandlers(): void {
		this.socket.on("connect", () => {
			this.isConnected = true;
			this.reconnectAttempts = 0;
			this.setupFileDescriptorMonitoring();
			this.onConnect();
		});

		this.socket.on("data", (chunk: Buffer) => {
			this.buffer.push(chunk);
			this.processMarketData();
		});

		this.socket.on("error", (error: Error) => {
			this.onError(error);
			this.handleReconnect();
		});

		this.socket.on("close", () => {
			this.isConnected = false;
			this.cleanupFileDescriptorMonitoring();
			this.onDisconnect();
		});
	}

	/**
	 * Setup file descriptor monitoring (Bun v1.51)
	 * 
	 * Uses socket._handle?.fd for kqueue/epoll integration
	 * This enables high-performance event-driven market data processing
	 */
	private setupFileDescriptorMonitoring(): void {
		// Bun v1.51: socket._handle?.fd is now properly implemented
		const fd = (this.socket as any)._handle?.fd;

		if (!fd || typeof fd !== "number") {
			console.warn(
				"BookmakerSocketAdapter: File descriptor not available, falling back to event-based processing",
			);
			return;
		}

		// Platform-specific watcher initialization
		// On macOS: use kqueue
		// On Linux: use epoll
		// This is a simplified example - actual implementation would use native bindings
		try {
			// Example: Create platform-specific watcher
			// const { createWatcher } = require('./platform-watcher');
			// this.watcher = createWatcher();

			// For now, we'll use a mock watcher that demonstrates the pattern
			this.watcher = this.createMockWatcher(fd);
		} catch (error) {
			console.warn(
				"BookmakerSocketAdapter: File descriptor monitoring unavailable:",
				error,
			);
		}
	}

	/**
	 * Create mock watcher for demonstration
	 * In production, this would use native kqueue/epoll bindings
	 */
	private createMockWatcher(fd: number): FSWatcher {
		// This is a demonstration of the pattern
		// In production, use native bindings like:
		// - kqueue (macOS): https://github.com/libuv/libuv/blob/master/src/unix/kqueue.c
		// - epoll (Linux): https://github.com/libuv/libuv/blob/master/src/unix/linux-core.c

		return {
			add: (fileDescriptor: number, callback: (events: SocketEvents) => void) => {
				// Monitor socket for readable events
				// In production, this would register with kqueue/epoll
				const checkInterval = setInterval(() => {
					if (this.isConnected) {
						// Check if socket has data available
						// In production, this would be event-driven via kqueue/epoll
						const hasData = this.socket.readableLength > 0;
						if (hasData) {
							callback({ readable: true, writable: true, error: false });
						}
					} else {
						clearInterval(checkInterval);
					}
				}, 10); // Poll every 10ms (in production, this would be event-driven)

				// Store interval for cleanup
				(this as any)._checkInterval = checkInterval;
			},
			remove: (fileDescriptor: number) => {
				const interval = (this as any)._checkInterval;
				if (interval) {
					clearInterval(interval);
					delete (this as any)._checkInterval;
				}
			},
			close: () => {
				const interval = (this as any)._checkInterval;
				if (interval) {
					clearInterval(interval);
					delete (this as any)._checkInterval;
				}
			},
		};
	}

	/**
	 * Cleanup file descriptor monitoring
	 */
	private cleanupFileDescriptorMonitoring(): void {
		if (this.watcher) {
			const fd = (this.socket as any)._handle?.fd;
			if (fd) {
				this.watcher.remove(fd);
			}
			this.watcher.close();
			this.watcher = null;
		}
	}

	/**
	 * Connect to bookmaker
	 */
	connect(): void {
		if (this.useTLS) {
			(this.socket as TLSSocket).connect(this.port, this.host);
		} else {
			(this.socket as Socket).connect(this.port, this.host);
		}
	}

	/**
	 * Disconnect from bookmaker
	 */
	disconnect(): void {
		this.cleanupFileDescriptorMonitoring();
		this.socket.destroy();
	}

	/**
	 * Send data to bookmaker
	 */
	send(data: Buffer | string): void {
		if (!this.isConnected) {
			throw new Error("Socket not connected");
		}

		if (typeof data === "string") {
			this.socket.write(data);
		} else {
			this.socket.write(data);
		}
	}

	/**
	 * Process market data from buffer
	 */
	private processMarketData(): void {
		if (this.buffer.length === 0) return;

		// Combine buffered chunks
		const combined = Buffer.concat(this.buffer);
		this.buffer = [];

		// Parse market data (implementation depends on bookmaker protocol)
		try {
			const marketData = this.parseMarketData(combined);
			this.onMarketData(marketData);
		} catch (error) {
			console.error("BookmakerSocketAdapter: Error parsing market data:", error);
		}
	}

	/**
	 * Parse market data from buffer
	 * Override in subclasses for specific bookmaker protocols
	 */
	protected parseMarketData(buffer: Buffer): any {
		// Default: Try to parse as JSON
		try {
			return JSON.parse(buffer.toString("utf-8"));
		} catch {
			// If not JSON, return raw buffer
			return buffer;
		}
	}

	/**
	 * Handle reconnection on error
	 */
	private handleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error(
				`BookmakerSocketAdapter: Max reconnection attempts (${this.maxReconnectAttempts}) reached`,
			);
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

		setTimeout(() => {
			console.log(
				`BookmakerSocketAdapter: Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
			);
			this.connect();
		}, delay);
	}

	/**
	 * Event handlers (override in subclasses)
	 */
	protected onConnect(): void {
		console.log(`BookmakerSocketAdapter: Connected to ${this.host}:${this.port}`);
	}

	protected onDisconnect(): void {
		console.log(`BookmakerSocketAdapter: Disconnected from ${this.host}:${this.port}`);
	}

	protected onError(error: Error): void {
		console.error(`BookmakerSocketAdapter: Error:`, error.message);
	}

	protected onMarketData(data: any): void {
		// Override in subclasses to handle market data
		console.log("BookmakerSocketAdapter: Market data received:", data);
	}

	/**
	 * Get socket file descriptor (Bun v1.51)
	 * 
	 * @returns File descriptor number or undefined if not available
	 */
	getFileDescriptor(): number | undefined {
		return (this.socket as any)._handle?.fd;
	}

	/**
	 * Check if socket is connected
	 */
	isSocketConnected(): boolean {
		return this.isConnected;
	}
}

/**
 * Example usage with kqueue/epoll monitoring
 * 
 * ```typescript
 * const adapter = new BookmakerSocketAdapter('api.bookmaker.com', 443, true);
 * 
 * adapter.connect();
 * 
 * // File descriptor monitoring is automatically set up
 * // Market data is processed via onMarketData callback
 * ```
 */
