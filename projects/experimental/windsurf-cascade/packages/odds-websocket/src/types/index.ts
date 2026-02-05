// WebSocket Server Type Definitions
// Comprehensive type definitions for the WebSocket testing infrastructure

// Re-export core types from odds-core
export type { OddsTick, ArbitrageOpportunity } from 'odds-core';

// WebSocket Message Types
export interface WebSocketMessage {
    type: string;
    timestamp: string;
    data: any;
}

export interface OddsUpdateMessage extends WebSocketMessage {
    type: 'odds-update';
    data: OddsTick;
}

export interface ArbitrageAlertMessage extends WebSocketMessage {
    type: 'arbitrage-alert';
    data: ArbitrageOpportunity & {
        detectedAt?: string;
        confidence?: number;
    };
}

export interface MarketStatusMessage extends WebSocketMessage {
    type: 'market-status';
    data: {
        status: 'active' | 'inactive' | 'maintenance';
        opportunities?: number;
        timestamp: string;
    };
}

export interface SystemErrorMessage extends WebSocketMessage {
    type: 'system-error';
    data: {
        error: string;
        timestamp: string;
        details?: any;
    };
}

export interface SystemStatusMessage extends WebSocketMessage {
    type: 'system-status';
    data: {
        status: string;
        apiStatus?: string;
        timestamp: string;
    };
}

export interface TransformedOddsMessage extends WebSocketMessage {
    type: 'transformed-odds';
    data: OddsTick & {
        enriched: boolean;
        processedAt: string;
        calculations: {
            impliedProbability: number;
            kellyFraction: number;
            expectedValue: number;
        };
    };
}

export interface TradingUpdateMessage extends WebSocketMessage {
    type: 'trading-update';
    data: {
        price: number;
        volume: number;
        timestamp: string;
    };
}

// Connection Data Types
export interface ConnectionData {
    id: string;
    connectedAt: number;
    subscription: Set<string>;
    backpressureCount: number;
    messageCount: number;
    socketInfo?: SocketInfo;
    userAgent?: string;
    lastPing?: number;
}

export interface SocketInfo {
    remoteAddress: string;
    localPort: number;
    protocol: string;
    connectedAt: number;
}

// Server Configuration Types
export interface WebSocketServerConfig {
    port: number;
    maxConnections?: number;
    enableCompression?: boolean;
    heartbeatInterval?: number;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    workerCount?: number;
    backpressureLimit?: number;
    idleTimeout?: number;
    maxPayloadLength?: number;
}

// Performance Metrics Types
export interface PerformanceMetrics {
    totalMessagesProcessed: number;
    averageProcessingTime: number;
    messagesPerSecond: number;
    peakMemoryUsage: number;
    uptime: number;
    connectionMetrics: ConnectionMetrics;
    performanceAlerts: PerformanceAlert[];
}

export interface ConnectionMetrics {
    currentConnections: number;
    totalConnections: number;
    peakConnections: number;
    averageConnectionDuration: number;
}

export interface PerformanceAlert {
    type: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// Test Client Types
export interface MockWebSocketClient {
    id: string;
    sentMessages: string[];
    receivedMessages: any[];
    isOpen: boolean;
    send: (message: string) => void;
    simulateMessage: (message: any) => void;
    simulateOpen: () => void;
    simulateClose: (code?: number, reason?: string) => void;
    simulateError: (error: Error) => void;
    close: () => void;
    on: (event: string, handler: Function) => void;
}

export interface MockAPIClientConfig {
    baseUrl: string;
    timeout?: number;
    headers?: Record<string, string>;
    logging?: boolean;
    retry?: {
        maxAttempts: number;
        delay: number;
        backoff: 'linear' | 'exponential';
    };
}

// Test Scenario Types
export interface ArbitrageScenario {
    marketOdds: OddsTick[];
    opportunities: ArbitrageOpportunity[];
    expectedProfit: number;
}

export interface HighFrequencyScenario {
    messages: WebSocketMessage[];
    duration: number;
    messageRate: number;
}

export interface ConcurrentUserScenario {
    userIds: string[];
    connections: Array<{
        userId: string;
        messages: WebSocketMessage[];
    }>;
}

// Test Configuration Types
export interface WebSocketTestConfig {
    defaultServerConfig: WebSocketServerConfig;
    performance: {
        maxMessageProcessingTime: number;
        minBroadcastThroughput: number;
        maxConnectionSetupTime: number;
        maxMemoryIncreasePerClient: number;
        minConcurrentConnections: number;
    };
    timeouts: {
        connection: number;
        message: number;
        broadcast: number;
        performance: number;
        e2e: number;
    };
    dataSizes: {
        smallBatch: number;
        mediumBatch: number;
        largeBatch: number;
        extremeBatch: number;
    };
}

// Contract Testing Types
export interface WebSocketContractTest {
    name: string;
    description: string;
    input: any;
    expected: any;
    validation: (result: any) => boolean;
}

export interface APIContractTest {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    input?: any;
    expectedStatus: number;
    expectedBody?: any;
    validation?: (response: any) => boolean;
}

// Performance Testing Types
export interface PerformanceBenchmark {
    name: string;
    iterations: number;
    warmup: number;
    minOpsPerSec?: number;
    maxDuration?: number;
    memoryThreshold?: number;
}

export interface LoadTestConfig {
    concurrentUsers: number;
    duration: string;
    rampUp: string;
    targetRPS?: number;
    step?: {
        users: number;
        duration: string;
        interval: string;
    };
}

// Error Handling Types
export interface WebSocketError {
    type: 'connection' | 'message' | 'parsing' | 'validation' | 'server';
    message: string;
    code?: number;
    details?: any;
    timestamp: string;
    recoverable: boolean;
}

export interface ErrorRecoveryScenario {
    errorType: WebSocketError['type'];
    errorCondition: () => void;
    recoveryAction: () => void;
    validation: () => boolean;
}

// Utility Types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WebSocketEventHandler<T = any> = (data: T) => void;
export type WebSocketMessageHandler = (ws: any, message: string) => void;
export type WebSocketConnectionHandler = (ws: any) => void;

// Server State Types
export interface ServerState {
    isRunning: boolean;
    port: number;
    startTime: number;
    clientCount: number;
    totalMessagesProcessed: number;
    lastActivity: number;
}

export interface ServerStats {
    state: ServerState;
    performance: PerformanceMetrics;
    connections: ConnectionData[];
    errors: WebSocketError[];
}

// Testing Utilities Types
export interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    metadata?: Record<string, any>;
}

export interface TestSuite {
    name: string;
    tests: TestResult[];
    setup?: () => Promise<void> | void;
    teardown?: () => Promise<void> | void;
    timeout?: number;
}

// Export all types for external use
export type {
    // Message types
    WebSocketMessage,
    OddsUpdateMessage,
    ArbitrageAlertMessage,
    MarketStatusMessage,
    SystemErrorMessage,
    SystemStatusMessage,
    TransformedOddsMessage,
    TradingUpdateMessage,

    // Connection types
    ConnectionData,
    SocketInfo,

    // Configuration types
    WebSocketServerConfig,
    WebSocketTestConfig,

    // Performance types
    PerformanceMetrics,
    ConnectionMetrics,
    PerformanceAlert,
    PerformanceBenchmark,
    LoadTestConfig,

    // Testing types
    MockWebSocketClient,
    MockAPIClientConfig,
    ArbitrageScenario,
    HighFrequencyScenario,
    ConcurrentUserScenario,
    WebSocketContractTest,
    APIContractTest,

    // Error types
    WebSocketError,
    ErrorRecoveryScenario,

    // State types
    ServerState,
    ServerStats,
    TestResult,
    TestSuite,

    // Utility types
    DeepPartial,
    WebSocketEventHandler,
    WebSocketMessageHandler,
    WebSocketConnectionHandler
};
