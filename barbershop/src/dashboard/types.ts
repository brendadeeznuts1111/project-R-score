/**
 * Unified Dashboard Types
 * 
 * Shared type definitions for all dashboard components:
 * - Core dashboard types
 * - Real-time update types
 * - Theme integration types
 * - Metric and telemetry types
 */

import type { ThemeName } from '../../themes/config/index';

// ==================== Core Dashboard Types ====================

export type DashboardView = 'admin' | 'client' | 'barber' | 'analytics' | 'settings';

export type DashboardMode = 'live' | 'static' | 'demo' | 'readonly';

export interface DashboardConfig {
  view: DashboardView;
  mode: DashboardMode;
  theme: ThemeName;
  refreshInterval: number;
  liveUpdates: boolean;
  features: DashboardFeatures;
}

export interface DashboardFeatures {
  websocket: boolean;
  telemetry: boolean;
  realTimeMetrics: boolean;
  dataExport: boolean;
  notifications: boolean;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  view: 'admin',
  mode: 'live',
  theme: 'professional',
  refreshInterval: 5000,
  liveUpdates: true,
  features: {
    websocket: true,
    telemetry: true,
    realTimeMetrics: true,
    dataExport: true,
    notifications: true,
  },
};

// ==================== Metric Types ====================

export interface MetricValue {
  value: number;
  unit?: string;
  timestamp: number;
  trend?: 'up' | 'down' | 'stable';
  change?: number; // percentage change
}

export interface MetricSeries {
  name: string;
  data: Array<{ timestamp: number; value: number }>;
  labels?: string[];
}

export interface DashboardMetrics {
  // Financial metrics
  revenue: MetricValue;
  tips: MetricValue;
  commissions: MetricValue;
  netProfit: MetricValue;
  
  // Operational metrics
  activeTickets: MetricValue;
  pendingTickets: MetricValue;
  completedTickets: MetricValue;
  
  // Connection metrics
  activeConnections: MetricValue;
  websocketConnections: MetricValue;
  httpRequests: MetricValue;
  
  // Barber metrics
  activeBarbers: MetricValue;
  averageRating: MetricValue;
  totalCuts: MetricValue;
}

// ==================== Real-time Update Types ====================

export type UpdateType = 
  | 'financials' 
  | 'connections' 
  | 'barbers' 
  | 'telemetry' 
  | 'tickets'
  | 'orders'
  | 'system';

export interface RealTimeUpdate<T = unknown> {
  type: UpdateType;
  timestamp: number;
  data: T;
  source: string;
  sequence: number;
}

export interface UpdateSubscription {
  id: string;
  types: UpdateType[];
  filter?: (update: RealTimeUpdate) => boolean;
  callback: (update: RealTimeUpdate) => void;
}

// ==================== Widget Types ====================

export type WidgetType = 
  | 'stats'
  | 'chart'
  | 'table'
  | 'list'
  | 'timeline'
  | 'gauge'
  | 'map'
  | 'custom';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number;
  dataSource: DataSource;
  filters?: FilterConfig[];
  theme?: ThemeName;
}

export type DataSourceType = 'api' | 'websocket' | 'static' | 'computed';

export interface DataSource {
  type: DataSourceType;
  endpoint?: string;
  interval?: number;
  transform?: (data: unknown) => unknown;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

// ==================== Layout Types ====================

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  columns: number;
  breakpoints: LayoutBreakpoints;
}

export interface LayoutBreakpoints {
  sm: number;  // mobile
  md: number;  // tablet
  lg: number;  // desktop
  xl: number;  // large desktop
}

export const DEFAULT_BREAKPOINTS: LayoutBreakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// ==================== Connection Types ====================

export interface ConnectionInfo {
  id: string;
  type: 'websocket' | 'http' | 'sse';
  ip: string;
  userAgent?: string;
  entityType?: 'admin' | 'client' | 'barber' | 'anonymous';
  entityId?: string;
  connectedAt: string;
  lastActivity: string;
  metadata?: Record<string, unknown>;
}

// ==================== Barber Types ====================

export interface BarberInfo {
  id: string;
  name: string;
  code: string;
  skills: string[];
  status: 'active' | 'busy' | 'off_duty' | 'offline';
  commissionRate: number;
  metrics?: BarberMetrics;
  ip?: string;
  lastSeen?: string;
}

export interface BarberMetrics {
  totalCuts: number;
  rating: number;
  revenue: number;
  tips: number;
  customersServed: number;
}

// ==================== Ticket Types ====================

export interface TicketInfo {
  id: string;
  customerName: string;
  services: ServiceInfo[];
  totalAmount: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  paymentId?: string;
  tipAmount?: number;
}

export interface ServiceInfo {
  name: string;
  price: number;
  duration: number; // minutes
}

// ==================== Order Types ====================

export interface OrderInfo {
  id: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tip: number;
  tipMode: 'percent' | 'flat';
  total: number;
  tipByBarber: Record<string, number>;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  paymentId?: string;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  kind: 'service' | 'product';
  providerId?: string;
  providerName?: string;
  providerRole?: 'barber' | 'cashier' | 'store';
  tipEligible?: boolean;
}

// ==================== Telemetry Types ====================

export interface TelemetryEvent {
  id: string;
  eventType: string;
  data: Record<string, unknown>;
  ip: string;
  timestamp: string;
  source?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

// ==================== Theme Integration ====================

export interface ThemedComponentProps {
  theme?: ThemeName;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

// ==================== API Response Types ====================

export interface DashboardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: number;
    requestId: string;
    cacheHit?: boolean;
  };
}

export interface PaginatedResponse<T> extends DashboardApiResponse<T[]> {
  meta?: {
    timestamp: number;
    requestId: string;
    cacheHit?: boolean;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ==================== WebSocket Message Types ====================

export type WebSocketMessageType = 
  | 'subscribe' 
  | 'unsubscribe' 
  | 'update' 
  | 'ping' 
  | 'pong'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: unknown;
  timestamp?: number;
  sequence?: number;
}

// ==================== Cache Types ====================

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // milliseconds
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
}

// ==================== Export Types ====================

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  filters?: FilterConfig[];
  fields?: string[];
  includeMetadata?: boolean;
}

// ==================== Helper Functions ====================

export function createDashboardConfig(
  overrides: Partial<DashboardConfig> = {}
): DashboardConfig {
  return {
    ...DEFAULT_DASHBOARD_CONFIG,
    ...overrides,
    features: {
      ...DEFAULT_DASHBOARD_CONFIG.features,
      ...overrides.features,
    },
  };
}

export function createWidgetConfig(
  type: WidgetType,
  title: string,
  overrides: Partial<WidgetConfig> = {}
): WidgetConfig {
  return {
    id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    position: { x: 0, y: 0, w: 4, h: 4 },
    dataSource: { type: 'api' },
    ...overrides,
  };
}

export function isStale(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp > maxAge;
}

export function calculateTrend(current: number, previous: number): { trend: 'up' | 'down' | 'stable'; change: number } {
  if (previous === 0) {
    return { trend: current > 0 ? 'up' : 'stable', change: current > 0 ? 100 : 0 };
  }
  const change = ((current - previous) / previous) * 100;
  const trend = change > 1 ? 'up' : change < -1 ? 'down' : 'stable';
  return { trend, change: Math.round(change * 100) / 100 };
}
