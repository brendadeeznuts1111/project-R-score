// Enhanced WebSocket Server with Testing Support
// Extends the original server with testing-friendly methods

import { BunV13WebSocketServer } from './server-v13';
import type {
    WebSocketMessage,
    ConnectionData,
    PerformanceMetrics,
    ServerStats,
    WebSocketError
} from './types';

export class BunV13WebSocketServerEnhanced extends BunV13WebSocketServer {
    private processedMessages: WebSocketMessage[] = [];
    private performanceMetrics: PerformanceMetrics = {
        totalMessagesProcessed: 0,
        averageProcessingTime: 0,
        messagesPerSecond: 0,
        peakMemoryUsage: 0,
        uptime: 0,
        connectionMetrics: {
            currentConnections: 0,
            totalConnections: 0,
            peakConnections: 0,
            averageConnectionDuration: 0
        },
        performanceAlerts: []
    };
    private errors: WebSocketError[] = [];
    private testMode: boolean = false;

    constructor(options: any = {}) {
        // Override for testing
        const testOptions = {
            ...options,
            workerCount: options.workerCount || 0 // Disable workers for testing
        };
        super(testOptions);
        this.testMode = options.testMode || false;
    }

    // ===== TESTING-FRIENDLY METHODS =====

    /**
     * Process a message without going through WebSocket
     * Useful for unit testing message processing logic
     */
    processMessage(message: WebSocketMessage): void {
        const startTime = performance.now();

        try {
            // Validate message structure
            this.validateMessage(message);

            // Process based on message type
            switch (message.type) {
                case 'odds-update':
                    this.processOddsUpdate(message);
                    break;
                case 'arbitrage-alert':
                    this.processArbitrageAlert(message);
                    break;
                case 'market-status':
                    this.processMarketStatus(message);
                    break;
                default:
                    this.processGenericMessage(message);
            }

            this.processedMessages.push(message);
            this.updatePerformanceMetrics(startTime);

        } catch (error) {
            this.handleError(error as Error, 'message-processing');
        }
    }

    /**
     * Simulate a client connection for testing
     */
    handleConnection(client: any, clientInfo: Partial<ConnectionData> = {}): void {
        try {
            const connectionData: ConnectionData = {
                id: clientInfo.id || this.generateConnectionId(),
                connectedAt: Date.now(),
                subscription: new Set(),
                backpressureCount: 0,
                messageCount: 0,
                socketInfo: clientInfo.socketInfo,
                userAgent: clientInfo.userAgent,
                ...clientInfo
            };

            // Store client reference for testing
            (client as any).data = connectionData;
            this.connectionSockets.set(connectionData.id, client);

            this.updateConnectionMetrics('connect');

            if (this.testMode) {
                console.log(`📡 Test client connected: ${connectionData.id}`);
            }

        } catch (error) {
            this.handleError(error as Error, 'connection');
        }
    }

    /**
     * Simulate client disconnection for testing
     */
    handleDisconnection(client: any): void {
        try {
            const connectionData = client.data as ConnectionData;
            if (connectionData) {
                this.connectionSockets.delete(connectionData.id);
                this.updateConnectionMetrics('disconnect');

                if (this.testMode) {
                    console.log(`🔌 Test client disconnected: ${connectionData.id}`);
                }
            }
        } catch (error) {
            this.handleError(error as Error, 'disconnection');
        }
    }

    /**
     * Handle incoming WebSocket message (enhanced for testing)
     */
    handleMessage(ws: any, message: string): void {
        const startTime = performance.now();

        try {
            const parsedMessage = JSON.parse(message);
            this.processMessage(parsedMessage);

            // Update connection message count
            if (ws.data) {
                ws.data.messageCount++;
            }

        } catch (error) {
            this.handleError(error as Error, 'message-parsing');
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message: WebSocketMessage): void {
        const startTime = performance.now();

        try {
            const messageStr = JSON.stringify(message);
            let sentCount = 0;

            this.connectionSockets.forEach((client, id) => {
                try {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(messageStr);
                        sentCount++;
                    }
                } catch (error) {
                    this.handleError(error as Error, 'broadcast');
                }
            });

            this.updatePerformanceMetrics(startTime);

            if (this.testMode) {
                console.log(`📡 Broadcasted to ${sentCount} clients: ${message.type}`);
            }

        } catch (error) {
            this.handleError(error as Error, 'broadcast');
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId: string, message: WebSocketMessage): void {
        try {
            const client = this.connectionSockets.get(clientId);
            if (client && client.readyState === 1) {
                const messageStr = JSON.stringify(message);
                client.send(messageStr);

                if (this.testMode) {
                    console.log(`📨 Sent to client ${clientId}: ${message.type}`);
                }
            } else {
                throw new Error(`Client ${clientId} not found or not connected`);
            }
        } catch (error) {
            this.handleError(error as Error, 'targeted-send');
        }
    }

    // ===== TESTING UTILITIES =====

    /**
     * Get current server port
     */
    getPort(): number {
        return this.server?.port || 0;
    }

    /**
     * Get number of connected clients
     */
    getClientCount(): number {
        return this.connectionSockets.size;
    }

    /**
     * Get maximum number of connections
     */
    getMaxConnections(): number {
        return 100; // Default value, should be configurable
    }

    /**
     * Check if server is running
     */
    isRunning(): boolean {
        return this.server !== undefined;
    }

    /**
     * Get list of connected clients
     */
    getConnectedClients(): ConnectionData[] {
        return Array.from(this.connectionSockets.values()).map(client => client.data || {});
    }

    /**
     * Get processed messages
     */
    getProcessedMessages(): WebSocketMessage[] {
        return [...this.processedMessages];
    }

    /**
     * Clear processed messages
     */
    clearProcessedMessages(): void {
        this.processedMessages = [];
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get connection metrics
     */
    getConnectionMetrics(): any {
        return this.performanceMetrics.connectionMetrics;
    }

    /**
     * Get performance alerts
     */
    getPerformanceAlerts(): any[] {
        return [...this.performanceMetrics.performanceAlerts];
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport(): any {
        return {
            totalMessagesProcessed: this.performanceMetrics.totalMessagesProcessed,
            averageProcessingTime: this.performanceMetrics.averageProcessingTime,
            messagesPerSecond: this.performanceMetrics.messagesPerSecond,
            peakMemoryUsage: this.performanceMetrics.peakMemoryUsage,
            connectionMetrics: this.performanceMetrics.connectionMetrics,
            performanceAlerts: this.performanceMetrics.performanceAlerts,
            uptime: Date.now() - (this.performanceMetrics.uptime || Date.now()),
            errors: this.errors.length
        };
    }

    /**
     * Start the server (enhanced for testing)
     */
    async start(): Promise<void> {
        if (!this.isRunning()) {
            this.performanceMetrics.uptime = Date.now();

            if (this.testMode) {
                console.log(`🚀 Starting test WebSocket server on port ${this.getPort()}`);
            }
        }
    }

    /**
     * Stop the server (enhanced for testing)
     */
    async stop(): Promise<void> {
        if (this.isRunning()) {
            // Close all connections
            this.connectionSockets.forEach((client) => {
                try {
                    client.close();
                } catch (error) {
                    // Ignore close errors
                }
            });

            this.connectionSockets.clear();

            // Close the server and set to undefined
            if (this.server) {
                this.server = undefined;
            }

            if (this.testMode) {
                console.log(`🛑 Test WebSocket server stopped`);
            }
        }
    }

    // ===== PRIVATE METHODS =====

    private validateMessage(message: any): void {
        if (!message || typeof message !== 'object') {
            throw new Error('Message must be an object');
        }

        if (!message.type || typeof message.type !== 'string') {
            throw new Error('Message must have a valid type');
        }

        if (!message.timestamp || typeof message.timestamp !== 'string') {
            throw new Error('Message must have a valid timestamp');
        }

        if (!message.data || typeof message.data !== 'object') {
            throw new Error('Message must have valid data');
        }
    }

    private processOddsUpdate(message: WebSocketMessage): void {
        // Process odds update logic
        if (this.testMode) {
            console.log(`📊 Processing odds update: ${message.data.id}`);
        }
    }

    private processArbitrageAlert(message: WebSocketMessage): void {
        // Process arbitrage alert logic
        if (this.testMode) {
            console.log(`⚡ Processing arbitrage alert: ${message.data.id}`);
        }
    }

    private processMarketStatus(message: WebSocketMessage): void {
        // Process market status logic
        if (this.testMode) {
            console.log(`📈 Processing market status: ${message.data.status}`);
        }
    }

    private processGenericMessage(message: WebSocketMessage): void {
        // Process generic message logic
        if (this.testMode) {
            console.log(`📨 Processing generic message: ${message.type}`);
        }
    }

    private updatePerformanceMetrics(startTime: number): void {
        const processingTime = performance.now() - startTime;
        const totalMessages = this.performanceMetrics.totalMessagesProcessed + 1;

        this.performanceMetrics.totalMessagesProcessed = totalMessages;
        this.performanceMetrics.averageProcessingTime =
            (this.performanceMetrics.averageProcessingTime * (totalMessages - 1) + processingTime) / totalMessages;

        // Calculate messages per second
        const uptime = Date.now() - this.performanceMetrics.uptime;
        this.performanceMetrics.messagesPerSecond = (totalMessages / uptime) * 1000;

        // Update memory usage
        const memoryUsage = process.memoryUsage();
        this.performanceMetrics.peakMemoryUsage = Math.max(
            this.performanceMetrics.peakMemoryUsage,
            memoryUsage.heapUsed
        );

        // Check for performance alerts
        if (processingTime > 100) {
            this.performanceMetrics.performanceAlerts.push({
                type: 'slow-message-processing',
                message: `Message processing took ${processingTime.toFixed(2)}ms`,
                timestamp: new Date().toISOString(),
                severity: processingTime > 500 ? 'high' : 'medium'
            });
        }
    }

    private updateConnectionMetrics(action: 'connect' | 'disconnect'): void {
        const metrics = this.performanceMetrics.connectionMetrics;
        const currentCount = this.connectionSockets.size;

        metrics.currentConnections = currentCount;
        metrics.totalConnections++;
        metrics.peakConnections = Math.max(metrics.peakConnections, currentCount);
    }

    private handleError(error: Error, context: string): void {
        const websocketError: WebSocketError = {
            type: context as any,
            message: error.message,
            timestamp: new Date().toISOString(),
            recoverable: true,
            details: error
        };

        this.errors.push(websocketError);

        if (this.testMode) {
            console.error(`❌ WebSocket error [${context}]:`, error.message);
        }
    }

    private generateConnectionId(): string {
        return `test-conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export the enhanced server for testing
export { BunV13WebSocketServerEnhanced as BunV13WebSocketServer };
