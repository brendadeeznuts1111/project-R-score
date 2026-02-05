/**
 * @fileoverview Type Definitions for Multi-Layer Graph Dashboard
 * @description Comprehensive TypeScript type definitions for dashboard/multi-layer-graph.html
 * @module dashboard/multi-layer-graph.types
 * 
 * Provides complete type safety and IntelliSense support for the multi-layer graph dashboard.
 * Includes all API interfaces, state types, and configuration types.
 */

/**
 * API Configuration
 */
export interface APIConfig {
	baseURL: string;
	port?: number;
	protocol?: 'http' | 'https';
}

/**
 * Layer Color Mapping
 */
export interface LayerColors {
	1: string; // Red - Layer 1: Direct
	2: string; // Teal - Layer 2: Cross-Market
	3: string; // Blue - Layer 3: Cross-Event
	4: string; // Green - Layer 4: Cross-Sport
}

/**
 * Graph Node Definition
 */
export interface GraphNode {
	id: string;
	label?: string;
	layer: 1 | 2 | 3 | 4;
	type?: string;
	size?: number;
	color?: {
		background: string;
		border: string;
		highlight?: {
			background: string;
			border: string;
		};
	};
	title?: string;
}

/**
 * Graph Edge Definition
 */
export interface GraphEdge {
	id?: string;
	source: string;
	target: string;
	layer: 1 | 2 | 3 | 4;
	type?: string;
	confidence?: number;
	latency?: number;
	width?: number;
	label?: string;
	color?: {
		color: string;
		highlight: string;
	};
	title?: string;
}

/**
 * Graph Visualization Data
 */
export interface GraphVisualizationData {
	nodes: GraphNode[];
	edges: GraphEdge[];
	statistics?: {
		totalAnomalies?: number;
		avgConfidence?: number;
		layerCounts?: Record<number, number>;
	};
	summary?: {
		avgConfidence?: number;
		totalNodes?: number;
		totalEdges?: number;
	};
}

/**
 * Layer Filter State
 */
export interface LayerFilterState {
	layer1: boolean;
	layer2: boolean;
	layer3: boolean;
	layer4: boolean;
}

/**
 * Statistics Display
 */
export interface GraphStatistics {
	totalNodes: number;
	totalEdges: number;
	totalAnomalies: number;
	avgConfidence: number;
	layerCounts: {
		1: number;
		2: number;
		3: number;
		4: number;
	};
}

/**
 * Connection Pool Statistics
 */
export interface ConnectionPoolStats {
	totalSockets: number;
	freeSockets: number;
	pendingRequests: number;
	rejectionRate: number;
}

/**
 * Bookmaker Connection Pool Stats
 */
export interface BookmakerPoolStats {
	[key: string]: ConnectionPoolStats;
}

/**
 * System Status
 */
export interface SystemStatus {
	router: {
		status: 'healthy' | 'degraded' | 'error';
		message?: string;
	};
	connectionPool: {
		status: 'healthy' | 'moderate' | 'high';
		utilization: number;
		message?: string;
	};
}

/**
 * MCP Health Response
 */
export interface MCPHealthResponse {
	status: 'healthy' | 'degraded' | 'unhealthy';
	checks?: {
		database?: boolean;
		correlation_engine?: boolean;
		circuit_breaker?: {
			healthy: boolean;
			state?: string;
		};
		uptime_ms?: number;
	};
	timestamp?: string;
}

/**
 * Network Options Configuration
 */
export interface NetworkOptions {
	nodes: {
		shape: string;
		size: number;
		font: {
			size: number;
			color: string;
		};
		borderWidth: number;
		shadow: boolean;
	};
	edges: {
		width: number;
		color: { inherit: string };
		smooth: {
			type: string;
			roundness: number;
		};
		arrows: {
			to: {
				enabled: boolean;
				scaleFactor: number;
			};
		};
		shadow: boolean;
	};
	physics: {
		enabled: boolean;
		stabilization: {
			iterations: number;
		};
		barnesHut: {
			gravitationalConstant: number;
			centralGravity: number;
			springLength: number;
			springConstant: number;
			damping: number;
		};
	};
	interaction: {
		hover: boolean;
		tooltipDelay: number;
		zoomView: boolean;
		dragView: boolean;
	};
}

/**
 * API Request Options
 */
export interface APIRequestOptions extends RequestInit {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	headers?: HeadersInit;
	body?: BodyInit;
}

/**
 * MCP Tool Request
 */
export interface MCPToolRequest {
	eventId: string;
	layers?: 'all' | string;
	layout?: 'hierarchical' | 'force' | 'circular';
	format?: 'json' | 'graphml';
}

/**
 * MCP Tool Response
 */
export interface MCPToolResponse {
	binary?: string | ArrayBuffer;
	content?: Array<{
		type: string;
		text?: string;
		binary?: string | ArrayBuffer;
	}>;
	error?: {
		code: string;
		message: string;
	};
}

/**
 * Export Format
 */
export type ExportFormat = 'json' | 'graphml';

/**
 * Toast Notification
 */
export interface ToastNotification {
	message: string;
	type?: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

/**
 * Dashboard State
 */
export interface DashboardState {
	network: any; // vis.Network instance
	nodes: any; // vis.DataSet<GraphNode>
	edges: any; // vis.DataSet<GraphEdge>
	currentGraphData: GraphVisualizationData | null;
	streamingInterval: number | null;
	isStreaming: boolean;
	csrfToken: string | null;
	eventId: string;
	confidenceThreshold: number;
	enabledLayers: number[];
}

/**
 * Node Click Parameters (vis-network)
 */
export interface NodeClickParams {
	nodes: string[];
	edges: string[];
	event: MouseEvent;
	pointer: {
		DOM: { x: number; y: number };
		canvas: { x: number; y: number };
	};
}

/**
 * Edge Click Parameters (vis-network)
 */
export interface EdgeClickParams {
	nodes: string[];
	edges: string[];
	event: MouseEvent;
	pointer: {
		DOM: { x: number; y: number };
		canvas: { x: number; y: number };
	};
}

/**
 * Network Event Handlers
 */
export interface NetworkEventHandlers {
	onClick?: (params: NodeClickParams | EdgeClickParams) => void;
	onHoverNode?: (params: { node: string }) => void;
	onBlurNode?: () => void;
}

/**
 * Graph Export Options
 */
export interface GraphExportOptions {
	format: ExportFormat;
	eventId: string;
	includeMetadata?: boolean;
	timestamp?: boolean;
}

/**
 * Connection Pool Panel State
 */
export interface ConnectionPoolPanelState {
	visible: boolean;
	bookmakers: BookmakerPoolStats;
	lastUpdate: number;
	autoRefresh: boolean;
	refreshInterval?: number;
}

/**
 * System Status Panel State
 */
export interface SystemStatusPanelState {
	router: {
		status: 'healthy' | 'degraded' | 'error';
		lastCheck: number;
	};
	connectionPool: {
		status: 'healthy' | 'moderate' | 'high';
		utilization: number;
		lastUpdate: number;
	};
}

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
	apiBase: string;
	layerColors: LayerColors;
	defaultEventId?: string;
	defaultConfidenceThreshold?: number;
	defaultEnabledLayers?: number[];
	autoRefreshInterval?: number;
	connectionPoolRefreshInterval?: number;
}

/**
 * Error Response
 */
export interface ErrorResponse {
	error: string;
	message: string;
	code?: string;
	status?: number;
	details?: Record<string, any>;
}

/**
 * Success Response
 */
export interface SuccessResponse<T = any> {
	success: true;
	data: T;
	timestamp?: number;
}

/**
 * API Response Wrapper
 */
export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;
