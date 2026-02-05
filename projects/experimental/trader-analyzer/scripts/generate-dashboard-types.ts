#!/usr/bin/env bun
/**
 * @fileoverview Dashboard Type Generator
 * @description Generates TypeScript type definitions for trader-analyzer dashboard
 * @module trader-analyzer/scripts/generate-dashboard-types
 * @version 0.2.0
 */

import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Generate comprehensive TypeScript types for dashboard integration
 */
async function generateDashboardTypes() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const TYPES_PATH = join(__dirname, '../dashboard/multi-layer-graph.types.ts');
  
  const types = `/**
 * @fileoverview Multi-Layer Graph Dashboard Types
 * @description Comprehensive TypeScript definitions for trader-analyzer dashboard integration
 * @module trader-analyzer/dashboard/multi-layer-graph.types
 * @version 0.2.0
 * @see ../scripts/generate-dashboard-types.ts
 */

import type { CorrelationLayer, GraphNode, GraphEdge } from '@industrial-bun-toolkit/core/types/graph';
import type { ConnectionPoolStats } from '@industrial-bun-toolkit/core/types/connection-pool';
import type { HealthCheckResponse } from '@industrial-bun-toolkit/core/types/health';

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
  /** API base URL */
  apiBase: string;
  
  /** Enable real-time streaming */
  enableStreaming: boolean;
  
  /** Default confidence threshold */
  defaultConfidence: number;
  
  /** Maximum graph nodes for performance */
  maxNodes: number;
  
  /** Layer visibility settings */
  layerVisibility: Record<number, boolean>;
  
  /** Color scheme */
  colors: {
    layers: Record<number, string>;
    confidence: {
      high: string;
      medium: string;
      low: string;
    };
  };
  
  /** Connection pool monitoring */
  connectionPool: {
    enabled: boolean;
    refreshInterval: number;
    maxBookmakers: number;
  };
}

/**
 * Graph Visualization Data
 */
export interface GraphVisualizationData {
  /** Graph nodes */
  nodes: GraphNode[];
  
  /** Graph edges (correlations) */
  edges: GraphEdge[];
  
  /** Graph statistics */
  statistics: GraphStatistics;
  
  /** Summary metadata */
  summary: GraphSummary;
  
  /** Anomalies detected */
  anomalies?: Anomaly[];
}

/**
 * Graph Node with Dashboard Extensions
 */
export interface DashboardGraphNode extends GraphNode {
  /** Visual size multiplier */
  size: number;
  
  /** Hover tooltip content */
  title: string;
  
  /** Node color based on layer */
  color: {
    background: string;
    border: string;
    highlight?: {
      background: string;
      border: string;
    };
  };
  
  /** Dashboard-specific metadata */
  dashboard: {
    /** Layer visibility state */
    visible: boolean;
    
    /** Selection state */
    selected: boolean;
    
    /** Animation properties */
    animation?: {
      scale: number;
      opacity: number;
    };
  };
}

/**
 * Graph Edge with Dashboard Extensions
 */
export interface DashboardGraphEdge extends GraphEdge {
  /** Visual width based on confidence */
  width: number;
  
  /** Edge label (confidence value) */
  label?: string;
  
  /** Edge color based on confidence */
  color: {
    color: string;
    highlight: string;
    hoverWidth?: number;
  };
  
  /** Arrow configuration */
  arrows?: {
    to: {
      enabled: boolean;
      scaleFactor: number;
    };
  };
  
  /** Smooth curve settings */
  smooth?: {
    type: 'continuous' | 'discrete' | 'diagonalCross';
    roundness: number;
  };
  
  /** Dashboard-specific metadata */
  dashboard: {
    /** Layer visibility state */
    visible: boolean;
    
    /** Hover state */
    hovered: boolean;
    
    /** Animation properties */
    animation?: {
      opacity: number;
      width: number;
    };
  };
}

/**
 * Graph Statistics
 */
export interface GraphStatistics {
  /** Total number of nodes */
  totalNodes: number;
  
  /** Total number of edges */
  totalEdges: number;
  
  /** Number of detected anomalies */
  totalAnomalies: number;
  
  /** Average confidence score */
  avgConfidence: number;
  
  /** Layer-specific statistics */
  layers: Record<number, LayerStatistics>;
  
  /** Performance metrics */
  performance: {
    /** Graph rendering time (ms) */
    renderTimeMs: number;
    
    /** Data processing time (ms) */
    processingTimeMs: number;
    
    /** Memory usage (bytes) */
    memoryBytes: number;
  };
}

/**
 * Layer Statistics
 */
export interface LayerStatistics {
  /** Layer number (1-4) */
  layer: number;
  
  /** Number of nodes in this layer */
  nodes: number;
  
  /** Number of edges in this layer */
  edges: number;
  
  /** Average confidence in this layer */
  avgConfidence: number;
  
  /** Anomaly count in this layer */
  anomalies: number;
  
  /** Color for this layer */
  color: string;
}

/**
 * Graph Summary Metadata
 */
export interface GraphSummary {
  /** Event ID this graph represents */
  eventId: string;
  
  /** Layers included in this graph */
  layers: number[];
  
  /** Generation timestamp */
  generatedAt: string;
  
  /** Processing duration */
  processingTimeMs: number;
  
  /** Data source */
  source: 'api' | 'mock' | 'cache';
  
  /** Confidence threshold applied */
  confidenceThreshold: number;
  
  /** Total processing time breakdown */
  timing: {
    dataFetchMs: number;
    correlationMs: number;
    visualizationMs: number;
  };
}

/**
 * Anomaly Detection Results
 */
export interface Anomaly {
  /** Anomaly ID */
  id: string;
  
  /** Type of anomaly */
  type: 'confidence' | 'latency' | 'volume' | 'pattern';
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Affected nodes */
  nodes: string[];
  
  /** Affected edges */
  edges: string[];
  
  /** Anomaly score (0-1) */
  score: number;
  
  /** Description */
  description: string;
  
  /** Recommended action */
  action: string;
  
  /** Detected at timestamp */
  detectedAt: string;
}

/**
 * API Response Types
 */

/**
 * Health Check Response
 */
export interface DashboardHealthResponse {
  /** System status */
  status: 'healthy' | 'degraded' | 'error';
  
  /** Timestamp */
  timestamp: string;
  
  /** Uptime in seconds */
  uptime: number;
  
  /** Correlation engine status */
  correlations: {
    activeEngines: number;
    processedEdges: number;
    anomalyCount: number;
    processingRate: number; // edges per second
  };
  
  /** Connection pool status */
  connectionPool: ConnectionPoolStats;
  
  /** Dashboard-specific metrics */
  dashboard: {
    activeSessions: number;
    graphRequests: number;
    exportCount: number;
    lastGraphGeneration: string;
  };
}

/**
 * Connection Pool Stats (Enhanced)
 */
export interface DashboardConnectionPoolStats extends ConnectionPoolStats {
  /** Dashboard-specific connection metrics */
  dashboard: {
    /** Active graph streaming sessions */
    streamingSessions: number;
    
    /** Recent graph generation requests */
    recentRequests: number;
    
    /** Cache hit rate for graph data */
    cacheHitRate: number;
    
    /** Average graph generation time */
    avgGenerationTimeMs: number;
  };
  
  /** Per-bookmaker dashboard usage */
  bookmakers: Record<string, {
    total: number;
    free: number;
    pending: number;
    rejectionRate: number;
    dashboardUsage: {
      graphRequests: number;
      avgLatencyMs: number;
      errorRate: number;
    };
  }>;
}

/**
 * Graph Generation Request
 */
export interface GraphGenerationRequest {
  /** Event identifier */
  eventId: string;
  
  /** Correlation layers to include */
  layers: 'all' | number[];
  
  /** Minimum confidence threshold */
  confidenceThreshold?: number;
  
  /** Include anomaly detection */
  includeAnomalies?: boolean;
  
  /** Maximum nodes to process */
  maxNodes?: number;
  
  /** Streaming mode */
  streaming?: boolean;
  
  /** Cache options */
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

/**
 * Graph Generation Response
 */
export interface GraphGenerationResponse {
  /** Success status */
  success: boolean;
  
  /** Generated visualization data */
  data: GraphVisualizationData;
  
  /** Processing metadata */
  metadata: {
    generatedAt: string;
    layersProcessed: number;
    nodes: number;
    edges: number;
    anomalies: number;
    processingTimeMs: number;
    confidenceThreshold: number;
    cacheHit?: boolean;
  };
  
  /** Error details (if failed) */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * GraphML Export Request
 */
export interface GraphMLExportRequest {
  /** Event identifier */
  eventId: string;
  
  /** Graph layout algorithm */
  layout?: 'force-directed' | 'hierarchical' | 'circular';
  
  /** Include metadata attributes */
  includeMetadata?: boolean;
  
  /** Filter by layers */
  layers?: number[];
  
  /** Export format */
  format: 'graphml' | 'gexf' | 'json';
}

/**
 * Dashboard State Management
 */
export interface DashboardState {
  /** Current graph data */
  currentGraph: GraphVisualizationData | null;
  
  /** Selected nodes */
  selectedNodes: string[];
  
  /** Selected edges */
  selectedEdges: string[];
  
  /** Layer visibility */
  layerVisibility: Record<number, boolean>;
  
  /** Confidence threshold */
  confidenceThreshold: number;
  
  /** Streaming status */
  isStreaming: boolean;
  
  /** Connection status */
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastError?: string;
    reconnectAttempts: number;
  };
  
  /** Performance metrics */
  performance: {
    renderTimeMs: number;
    lastUpdate: string;
    fps: number;
  };
}

/**
 * Node Info Panel Data
 */
export interface NodeInfoPanelData {
  /** Node ID */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Layer information */
  layer: number;
  
  /** Node type */
  type: string;
  
  /** Connection details */
  connections: {
    incoming: number;
    outgoing: number;
    total: number;
  };
  
  /** Metadata */
  metadata: Record<string, any>;
}

/**
 * Edge Info Panel Data
 */
export interface EdgeInfoPanelData {
  /** Edge ID */
  id: string;
  
  /** Source node */
  source: string;
  
  /** Target node */
  target: string;
  
  /** Layer information */
  layer: number;
  
  /** Edge type */
  type: string;
  
  /** Confidence score */
  confidence: number;
  
  /** Latency information */
  latency: number;
  
  /** Metadata */
  metadata: Record<string, any>;
}

/**
 * Layer Configuration
 */
export interface LayerConfig {
  /** Layer number (1-4) */
  number: number;
  
  /** Layer name */
  name: string;
  
  /** Layer description */
  description: string;
  
  /** Default color */
  color: string;
  
  /** Visibility state */
  visible: boolean;
  
  /** Opacity */
  opacity: number;
  
  /** Edge thickness multiplier */
  thickness: number;
  
  /** Node size multiplier */
  nodeSize: number;
  
  /** Enabled by default */
  defaultEnabled: boolean;
}

/**
 * Dashboard Event Types
 */
export type DashboardEvent = 
  | { type: 'graphLoaded'; data: GraphVisualizationData }
  | { type: 'nodeSelected'; nodeId: string }
  | { type: 'edgeSelected'; edgeId: string }
  | { type: 'layerToggled'; layer: number; visible: boolean }
  | { type: 'confidenceChanged'; threshold: number }
  | { type: 'streamingStarted' }
  | { type: 'streamingStopped' }
  | { type: 'connectionStatusChanged'; status: string }
  | { type: 'error'; error: string; details?: any };

/**
 * API Client Types
 */
export interface DashboardAPIClient {
  /** Health check */
  health(): Promise<DashboardHealthResponse>;
  
  /** Connection pool stats */
  connectionPool(): Promise<DashboardConnectionPoolStats>;
  
  /** Generate multi-layer graph */
  generateGraph(request: GraphGenerationRequest): Promise<GraphGenerationResponse>;
  
  /** Export visualization */
  exportVisualization(request: GraphMLExportRequest): Promise<Response>;
  
  /** Get CSRF token */
  getCSRFToken(): Promise<string>;
  
  /** Stream graph updates */
  streamGraph(eventId: string, options?: any): AsyncGenerator<GraphVisualizationData>;
}

/**
 * Visualization Options
 */
export interface VisualizationOptions {
  /** Animation enabled */
  animation: boolean;
  
  /** Physics simulation */
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
  
  /** Interaction settings */
  interaction: {
    hover: boolean;
    zoomView: boolean;
    dragView: boolean;
    selectConnectedEdges: boolean;
  };
  
  /** Node styling */
  nodes: {
    shape: 'dot' | 'square' | 'triangle' | 'box';
    size: number;
    font: {
      size: number;
      color: string;
    };
    borderWidth: number;
    shadow: boolean;
  };
  
  /** Edge styling */
  edges: {
    width: number;
    color: {
      inherit: boolean;
    };
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
}

/**
 * Export Formats
 */
export type ExportFormat = 'json' | 'graphml' | 'gexf' | 'csv' | 'png' | 'svg';

/**
 * Confidence Color Mapping
 */
export const CONFIDENCE_COLORS = {
  high: '#FF0000',    // Red: ≥ 0.8
  medium: '#FFA500',  // Orange: 0.6-0.8
  low: '#FFFF00',     // Yellow: < 0.6
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_COLORS;

/**
 * Layer Names
 */
export const LAYER_NAMES = {
  1: 'Direct Correlations',
  2: 'Cross-Market Correlations', 
  3: 'Cross-Event Correlations',
  4: 'Cross-Sport Correlations',
} as const;

export type LayerName = keyof typeof LAYER_NAMES;

/**
 * Node Types
 */
export const NODE_TYPES = [
  'market',
  'bookmaker', 
  'event',
  'anomaly',
  'prediction',
  'crypto',
  'sports',
] as const;

export type NodeType = typeof NODE_TYPES[number];

/**
 * Edge Types
 */
export const EDGE_TYPES = [
  'direct',
  'cross-market',
  'cross-event', 
  'cross-sport',
  'temporal',
  'causal',
  'arbitrage',
] as const;

export type EdgeType = typeof EDGE_TYPES[number];

/**
 * Anomaly Types
 */
export const ANOMALY_TYPES = [
  'confidence',
  'latency', 
  'volume',
  'pattern',
  'divergence',
  'spike',
  'dropout',
] as const;

export type AnomalyType = typeof ANOMALY_TYPES[number];

/**
 * Utility Functions
 */

/**
 * Get layer color
 */
export function getLayerColor(layer: number): string {
  const colors = {
    1: '#FF6B6B',  // Red
    2: '#4ECDC4',  // Teal  
    3: '#45B7D1',  // Blue
    4: '#96CEB4',  // Green
  };
  return colors[layer as keyof typeof colors] || '#CCCCCC';
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return CONFIDENCE_COLORS.high;
  if (confidence >= 0.6) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.low;
}

/**
 * Validate event ID format
 */
export function validateEventId(eventId: string): boolean {
  const patterns = [
    /^[a-z]+-[a-z-]+-[a-z-]+-\d{4}-\d{2}-\d{2}$/, // sports-event
    /^[a-z]+-[a-z]+-[a-z]+-\d{4}-\d{2}-\d{2}$/,  // prediction-market
    /^[a-z]+-[a-z]+-[a-z]+-\d{4}-\d{2}-\d{2}$/,  // crypto-pair
  ];
  return patterns.some(pattern => pattern.test(eventId));
}

/**
 * Format confidence percentage
 */
export function formatConfidence(confidence: number): string {
  return (confidence * 100).toFixed(1) + '%';
}

/**
 * Calculate graph density
 */
export function calculateGraphDensity(nodes: number, edges: number): number {
  if (nodes < 2) return 0;
  const maxEdges = nodes * (nodes - 1) / 2;
  return edges / maxEdges;
}

/**
 * Generate node title for tooltip
 */
export function generateNodeTitle(node: DashboardGraphNode): string {
  return \`
\${node.label}
Layer: \${node.layer} (\${LAYER_NAMES[node.layer as LayerName] || 'Unknown'})
Type: \${node.type}
Size: \${node.size}px
ID: \${node.id}
  \`.trim();
}

/**
 * Generate edge title for tooltip
 */
export function generateEdgeTitle(edge: DashboardGraphEdge): string {
  return \`
\${edge.source} → \${edge.target}
Layer: \${edge.layer} (\${LAYER_NAMES[edge.layer as LayerName] || 'Unknown'})
Type: \${edge.type}
Confidence: \${formatConfidence(edge.confidence)}
Latency: \${edge.latency || 'N/A'}ms
Width: \${edge.width}px
ID: \${edge.id}
  \`.trim();
}

/**
 * Validate graph data integrity
 */
export function validateGraphData(data: GraphVisualizationData): boolean {
  if (!data.nodes || !Array.isArray(data.nodes)) return false;
  if (!data.edges || !Array.isArray(data.edges)) return false;
  
  // Validate nodes
  for (const node of data.nodes) {
    if (!node.id || typeof node.id !== 'string') return false;
    if (typeof node.layer !== 'number' || node.layer < 1 || node.layer > 4) return false;
    if (!['market', 'bookmaker', 'event', 'anomaly'].includes(node.type)) {
      return false;
    }
  }
  
  // Validate edges
  for (const edge of data.edges) {
    if (!edge.source || !edge.target) return false;
    if (typeof edge.layer !== 'number' || edge.layer < 1 || edge.layer > 4) return false;
    if (typeof edge.confidence !== 'number' || edge.confidence < 0 || edge.confidence > 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Type guards
 */
export function isGraphVisualizationData(data: any): data is GraphVisualizationData {
  return data && 
    Array.isArray(data.nodes) && 
    Array.isArray(data.edges) &&
    typeof data.statistics === 'object' &&
    typeof data.summary === 'object';
}

export function isDashboardGraphNode(node: any): node is DashboardGraphNode {
  return node && 
    typeof node.id === 'string' &&
    typeof node.layer === 'number' &&
    typeof node.type === 'string' &&
    node.color && 
    typeof node.dashboard === 'object';
}

export function isDashboardGraphEdge(edge: any): edge is DashboardGraphEdge {
  return edge && 
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    typeof edge.layer === 'number' &&
    typeof edge.confidence === 'number' &&
    edge.color &&
    typeof edge.dashboard === 'object';
}

/**
 * Default configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  apiBase: 'http://localhost:3000',
  enableStreaming: false,
  defaultConfidence: 0.5,
  maxNodes: 1000,
  layerVisibility: { 1: true, 2: true, 3: true, 4: true },
  colors: {
    layers: {
      1: '#FF6B6B',
      2: '#4ECDC4', 
      3: '#45B7D1',
      4: '#96CEB4',
    },
    confidence: {
      high: '#FF0000',
      medium: '#FFA500',
      low: '#FFFF00',
    },
  },
  connectionPool: {
    enabled: true,
    refreshInterval: 5000,
    maxBookmakers: 10,
  },
};

/**
 * API client factory
 */
export function createDashboardAPIClient(baseUrl: string): DashboardAPIClient {
  return {
    async health() {
      const response = await fetch(\`\${baseUrl}/api/v17/mcp/health\`);
      if (!response.ok) throw new Error(\`Health check failed: \${response.status}\`);
      return response.json();
    },
    
    async connectionPool() {
      const response = await fetch(\`\${baseUrl}/api/v17/connection-pool/stats\`);
      if (!response.ok) throw new Error(\`Pool stats failed: \${response.status}\`);
      return response.json();
    },
    
    async generateGraph(request: GraphGenerationRequest) {
      const response = await fetch(\`\${baseUrl}/api/mcp/tools/research-build-multi-layer-graph\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || \`Graph generation failed: \${response.status}\`);
      }
      
      const result = await response.json();
      if (!isGraphVisualizationData(result.data)) {
        throw new Error('Invalid graph data structure');
      }
      
      return result;
    },
    
    async exportVisualization(request: GraphMLExportRequest) {
      const response = await fetch(\`\${baseUrl}/api/mcp/tools/research-generate-visualization\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) throw new Error(\`Export failed: \${response.status}\`);
      return response;
    },
    
    async getCSRFToken() {
      const response = await fetch(\`\${baseUrl}/api/\`);
      const csrfHeader = response.headers.get('X-CSRF-Token');
      if (!csrfHeader) throw new Error('No CSRF token received');
      return csrfHeader;
    },
    
    async *streamGraph(eventId: string, options = {}) {
      while (true) {
        try {
          const result = await this.generateGraph({ eventId, ...options });
          yield result.data;
          
          // Wait 5 seconds between updates
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error('Stream error:', error);
          yield null; // Yield null on error, consumer can handle
        }
      }
    },
  };
}

/**
 * Validation utilities
 */
export function validateDashboardConfig(config: any): config is DashboardConfig {
  return config &&
    typeof config.apiBase === 'string' &&
    typeof config.enableStreaming === 'boolean' &&
    typeof config.defaultConfidence === 'number' &&
    typeof config.maxNodes === 'number' &&
    typeof config.layerVisibility === 'object' &&
    typeof config.colors === 'object' &&
    typeof config.connectionPool === 'object';
}

/**
 * Export all types for dashboard integration
 */
export * from './multi-layer-graph.types';
  `;

  await writeFile(TYPES_PATH, types);
  console.log(`✅ Generated ${TYPES_PATH}`);
  console.log(`📊 Types: ${types.split('\n').length} lines`);
  
  // Validate generated types
  const errors = validateGeneratedTypes(types);
  if (errors.length > 0) {
    console.error('❌ Type validation errors:');
    errors.forEach(error => console.error(`  ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Type validation passed');
}

function validateGeneratedTypes(content: string): string[] {
  const errors: string[] = [];
  
  // Check for required interfaces
  const requiredInterfaces = [
    'DashboardConfig',
    'GraphVisualizationData', 
    'DashboardGraphNode',
    'DashboardGraphEdge',
    'GraphStatistics',
    'LayerStatistics',
    'GraphSummary',
    'Anomaly',
    'DashboardHealthResponse',
    'DashboardConnectionPoolStats',
    'GraphGenerationRequest',
    'GraphGenerationResponse',
    'GraphMLExportRequest',
    'DashboardState',
    'NodeInfoPanelData',
    'EdgeInfoPanelData',
    'LayerConfig',
  ];
  
  requiredInterfaces.forEach(iface => {
    if (!content.includes(`interface ${iface}`) && !content.includes(`type ${iface}`)) {
      errors.push(`Missing required type: ${iface}`);
    }
  });
  
  // Check for required utility functions
  const requiredFunctions = [
    'getLayerColor',
    'getConfidenceColor', 
    'validateEventId',
    'formatConfidence',
    'calculateGraphDensity',
    'generateNodeTitle',
    'generateEdgeTitle',
    'validateGraphData',
  ];
  
  requiredFunctions.forEach(fn => {
    if (!content.includes(`function ${fn}`)) {
      errors.push(`Missing required function: ${fn}`);
    }
  });
  
  // Check for type exports
  if (!content.includes('export * from')) {
    errors.push('Missing re-export statement');
  }
  
  // Check for version annotation
  if (!content.includes('@version 0.2.0')) {
    errors.push('Missing version annotation');
  }
  
  return errors;
}

// Generate types
generateDashboardTypes().catch(console.error);
