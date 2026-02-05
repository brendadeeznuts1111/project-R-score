#!/usr/bin/env bun
// WebSocket-Optimized Real-Time Widget
// Real-time data streaming with ARM64 optimizations

// Note: Using Bun's native WebSocket implementation
// For advanced features, install 'ws' package: bun add ws

interface RealTimeData {
	timestamp: number;
	value: number;
	metadata: Record<string, any>;
}

interface WebSocketConfig {
	url: string;
	reconnectInterval: number;
	maxReconnectAttempts: number;
	binaryMode: boolean;
	compressionEnabled: boolean;
}

// Bun's WebSocket interface compatibility
interface BunWebSocket {
	readyState: number;
	send(data: string | Buffer | ArrayBuffer): void;
	close(code?: number, reason?: string): void;
	addEventListener(event: string, listener: (event: any) => void): void;
	removeEventListener(event: string, listener: (event: any) => void): void;
}

// WebSocket constants for compatibility
const WebSocketConstants = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
} as const;

class WebSocketOptimizedWidget {
	private ws: BunWebSocket | null = null;
	private wsConfig: WebSocketConfig;
	private reconnectAttempts = 0;
	private isConnecting = false;
	private messageQueue: RealTimeData[] = [];
	private processingBuffer = new Float64Array(10000);
	private bufferIndex = 0;

	constructor(wsConfig?: Partial<WebSocketConfig>) {
		this.wsConfig = {
			url: "ws://localhost:8080/widget-data",
			reconnectInterval: 5000,
			maxReconnectAttempts: 10,
			binaryMode: true,
			compressionEnabled: true,
			...wsConfig,
		};

		console.log("🌐 WebSocket Optimized Widget Initialized");
		console.log(`📡 URL: ${this.wsConfig.url}`);
		console.log(
			`🔄 Binary Mode: ${this.wsConfig.binaryMode ? "Enabled" : "Disabled"}`,
		);
		console.log(
			`🗜️  Compression: ${this.wsConfig.compressionEnabled ? "Enabled" : "Disabled"}`,
		);
		console.log("");

		this.initializeWebSocket();
	}

	private async initializeWebSocket(): Promise<void> {
		if (this.isConnecting) return;

		this.isConnecting = true;
		console.log("🔌 Connecting to WebSocket server...");

		try {
			// Use Bun's native WebSocket
			this.ws = new WebSocket(this.wsConfig.url) as BunWebSocket;

			// Set up event listeners using Bun's API
			this.ws.addEventListener("open", () => {
				console.log("✅ WebSocket connection established");
				this.reconnectAttempts = 0;
				this.isConnecting = false;
				this.processMessageQueue();
			});

			this.ws.addEventListener("message", (event) => {
				this.handleRealTimeData(event.data);
			});

			this.ws.addEventListener("close", (event) => {
				console.log(`❌ WebSocket closed: ${event.code} - ${event.reason}`);
				this.isConnecting = false;
				this.scheduleReconnect();
			});

			this.ws.addEventListener("error", (event) => {
				console.error(`🚨 WebSocket error: ${event.error || event.message}`);
				this.isConnecting = false;
			});
		} catch (error) {
			console.error(`❌ Failed to initialize WebSocket: ${error}`);
			this.isConnecting = false;
			this.scheduleReconnect();
		}
	}

	private handleRealTimeData(data: string | Buffer | ArrayBuffer): void {
		const startTime = performance.now();

		try {
			let parsedData: RealTimeData;

			if (this.wsConfig.binaryMode && data instanceof ArrayBuffer) {
				// ARM64-optimized binary data processing
				parsedData = this.parseBinaryData(data);
			} else if (data instanceof Buffer) {
				// Handle Buffer data
				const bufferData = data.toString("utf-8");
				parsedData = JSON.parse(bufferData);
			} else {
				// Handle string data
				parsedData = JSON.parse(data as string);
			}

			// Add to processing buffer for ARM64-optimized batch processing
			this.addToProcessingBuffer(parsedData);

			// Process in batches for better performance
			if (this.bufferIndex >= 1000) {
				this.flushProcessingBuffer();
			}

			const processingTime = performance.now() - startTime;

			// Track performance metrics
			if (processingTime > 10) {
				console.log(
					`⚠️  Slow message processing: ${processingTime.toFixed(2)}ms`,
				);
			}
		} catch (error) {
			console.error(`❌ Failed to process real-time data: ${error}`);
		}
	}

	private parseBinaryData(data: ArrayBuffer): RealTimeData {
		const view = new DataView(data);
		const offset = 0;

		// ARM64-optimized binary parsing with direct memory access
		const timestamp = view.getBigUint64(offset, true);
		const value = view.getFloat64(offset + 8, true);
		const metadataLength = view.getUint32(offset + 16, true);

		let metadata: Record<string, any> = {};
		if (metadataLength > 0) {
			const metadataBytes = new Uint8Array(data, offset + 20, metadataLength);
			metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
		}

		return {
			timestamp: Number(timestamp),
			value,
			metadata,
		};
	}

	private addToProcessingBuffer(data: RealTimeData): void {
		// ARM64-optimized circular buffer
		this.processingBuffer[this.bufferIndex] = data.value;
		this.bufferIndex = (this.bufferIndex + 1) % this.processingBuffer.length;
	}

	private flushProcessingBuffer(): void {
		if (this.bufferIndex === 0) return;

		// ARM64-optimized batch processing
		const chunkSize = 256; // Cache-friendly chunk size
		let sum = 0.0;
		let min = Infinity;
		let max = -Infinity;

		for (let i = 0; i < this.bufferIndex; i += chunkSize) {
			const end = Math.min(i + chunkSize, this.bufferIndex);

			// Process chunk with ARM64 optimizations
			for (let j = i; j < end; j++) {
				const value = this.processingBuffer[j];
				sum += value;
				if (value < min) min = value;
				if (value > max) max = value;
			}
		}

		const average = sum / this.bufferIndex;

		// Update widget status with processed metrics
		this.updateRealTimeMetrics({
			count: this.bufferIndex,
			average,
			min,
			max,
			timestamp: Date.now(),
		});

		// Reset buffer index
		this.bufferIndex = 0;
	}

	private updateRealTimeMetrics(metrics: any): void {
		// Update performance metrics with real-time data
		console.log(
			`📊 Real-time metrics: avg=${metrics.average.toFixed(2)}, min=${metrics.min.toFixed(2)}, max=${metrics.max.toFixed(2)}`,
		);

		// Update widget display if needed
		// This would integrate with the parent widget's display system
	}

	private processMessageQueue(): void {
		if (this.messageQueue.length === 0) return;

		console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

		while (this.messageQueue.length > 0) {
			const message = this.messageQueue.shift();
			if (message && this.ws?.readyState === WebSocketConstants.OPEN) {
				this.sendMessage(message);
			}
		}
	}

	private sendMessage(data: RealTimeData): void {
		if (!this.ws || this.ws.readyState !== WebSocketConstants.OPEN) {
			this.messageQueue.push(data);
			return;
		}

		try {
			let payload: string | Buffer;

			if (this.wsConfig.binaryMode) {
				payload = this.serializeToBinary(data);
			} else {
				payload = JSON.stringify(data);
			}

			this.ws.send(payload);
		} catch (error) {
			console.error(`❌ Failed to send message: ${error}`);
			this.messageQueue.push(data);
		}
	}

	private serializeToBinary(data: RealTimeData): Buffer {
		// ARM64-optimized binary serialization
		const metadataStr = JSON.stringify(data.metadata);
		const metadataBytes = new TextEncoder().encode(metadataStr);

		const buffer = Buffer.allocUnsafe(20 + metadataBytes.length);
		const view = new DataView(buffer.buffer);

		// Use direct memory writes for ARM64 optimization
		view.setBigUint64(0, BigInt(data.timestamp), true);
		view.setFloat64(8, data.value, true);
		view.setUint32(16, metadataBytes.length, true);

		buffer.set(metadataBytes, 20);

		return buffer;
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.wsConfig.maxReconnectAttempts) {
			console.error("🚨 Maximum reconnection attempts reached");
			return;
		}

		this.reconnectAttempts++;
		const delay =
			this.wsConfig.reconnectInterval * 2 ** (this.reconnectAttempts - 1);

		console.log(
			`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
		);

		setTimeout(() => {
			this.initializeWebSocket();
		}, delay);
	}

	// Public API for real-time features
	public sendRealTimeData(value: number, metadata?: Record<string, any>): void {
		const data: RealTimeData = {
			timestamp: Date.now(),
			value,
			metadata: metadata || {},
		};

		this.sendMessage(data);
	}

	public getConnectionStatus():
		| "connected"
		| "connecting"
		| "disconnected"
		| "error" {
		if (!this.ws) return "disconnected";

		switch (this.ws.readyState) {
			case WebSocketConstants.CONNECTING:
				return "connecting";
			case WebSocketConstants.OPEN:
				return "connected";
			case WebSocketConstants.CLOSING:
				return "disconnected";
			case WebSocketConstants.CLOSED:
				return "disconnected";
			default:
				return "error";
		}
	}

	public getPerformanceMetrics(): any {
		return {
			connectionStatus: this.getConnectionStatus(),
			reconnectAttempts: this.reconnectAttempts,
			queuedMessages: this.messageQueue.length,
			bufferUtilization:
				(this.bufferIndex / this.processingBuffer.length) * 100,
			binaryMode: this.wsConfig.binaryMode,
			compressionEnabled: this.wsConfig.compressionEnabled,
		};
	}

	public async disconnect(): Promise<void> {
		if (this.ws) {
			console.log("🔌 Disconnecting WebSocket...");

			return new Promise((resolve) => {
				if (this.ws?.readyState === WebSocketConstants.OPEN) {
					this.ws?.close(1000, "Normal closure");

					// Add a one-time listener for the close event
					const closeListener = () => {
						resolve();
					};

					this.ws?.addEventListener("close", closeListener);

					// Fallback timeout
					setTimeout(() => resolve(), 1000);
				} else {
					resolve();
				}
			});
		}
	}
}

// Export for use in other modules
export { WebSocketOptimizedWidget, type RealTimeData, type WebSocketConfig };

// CLI usage
if (import.meta.main) {
	const widget = new WebSocketOptimizedWidget({
		url: "ws://localhost:8080/widget-data",
		binaryMode: true,
		compressionEnabled: true,
	});

	// Send test data every 5 seconds
	setInterval(() => {
		widget.sendRealTimeData(Math.random() * 100, {
			source: "test-widget",
			type: "performance-metric",
		});
	}, 5000);

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n👋 Shutting down WebSocket widget...");
		await widget.disconnect();
		process.exit(0);
	});
}
