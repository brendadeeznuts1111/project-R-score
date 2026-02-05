/**
 * Modular System Configuration
 * Centralized management for endpoints, dashboards, and colors
 *
 * This system provides:
 * - Unified endpoint management with protocol support
 * - Consistent color schemes across all dashboards
 * - Modular dashboard configuration with enhanced properties
 * - Easy theme switching and customization
 * - Centralized URL and routing management
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Protocol = 'http' | 'https' | 'ws' | 'wss' | 'tcp' | 'graphql' | 'grpc' | 'sse';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type DashboardCategory =
  | 'storage'
  | 'registry'
  | 'status'
  | 'api'
  | 'analytics'
  | 'phone'
  | 'main'
  | 'security'
  | 'monitoring';
export type Environment = 'development' | 'staging' | 'production' | 'enterprise';
export type RefreshInterval =
  | 'realtime'
  | '1s'
  | '5s'
  | '10s'
  | '30s'
  | '1m'
  | '5m'
  | '15m'
  | 'never';
export type DashboardNotificationChannel = 'email' | 'slack' | 'webhook' | 'sms' | 'push';
export type DashboardNotificationTrigger = 'error' | 'warning' | 'info' | 'success' | 'all';
export type DashboardPermissionRole = 'admin' | 'editor' | 'viewer' | 'guest';
export type DashboardWidgetType =
  | 'chart'
  | 'stat'
  | 'table'
  | 'list'
  | 'gauge'
  | 'map'
  | 'timeline'
  | 'log'
  | 'alert';
export type DashboardLayoutType = 'grid' | 'flex' | 'masonry' | 'freeform';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface HealthCheckConfig {
  enabled: boolean;
  endpoint: string;
  method: HttpMethod;
  timeoutMs: number;
  expectedStatus: number;
  intervalMs: number;
  unhealthyThreshold: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize: number;
  windowSizeMs: number;
}

export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'oauth2' | 'basic' | 'jwt' | 'mTLS';
  headerName?: string;
  headerPrefix?: string;
  credentials?: Record<string, string>;
  tokenEndpoint?: string;
  refreshTokenEnabled: boolean;
}

export interface EndpointMetrics {
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  uptimePercentage: number;
  requestCount: number;
  errorCount: number;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
}

export interface EndpointProtocol {
  type: Protocol;
  host: string;
  port: number;
  path: string;
  queryParams?: Record<string, string>;
  fragment?: string;
  secure: boolean;
  version: string;
}

export interface EndpointConfig {
  id: string;
  name: string;
  description: string;
  category: DashboardCategory;
  protocols: EndpointProtocol[];
  auth: AuthConfig;
  healthCheck: HealthCheckConfig;
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  timeout: number;
  cors: {
    enabled: boolean;
    origins: string[];
    methods: HttpMethod[];
    credentials: boolean;
  };
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
    strategy: 'lru' | 'fifo' | 'time-to-live';
  };
  metrics: EndpointMetrics;
  tags: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  refreshInterval: RefreshInterval;
  visible: boolean;
}

export interface DashboardLayout {
  type: DashboardLayoutType;
  columns: number;
  rowHeight: number;
  gap: number;
}

export interface DashboardPermission {
  role: DashboardPermissionRole;
  actions: ('read' | 'write' | 'delete' | 'execute')[];
  conditions?: Record<string, unknown>;
}

export interface DashboardExport {
  format: 'json' | 'csv' | 'pdf' | 'png' | 'yaml';
  includeData: boolean;
  includeConfig: boolean;
  dateRange?: { start: string; end: string };
}

export interface DashboardRefresh {
  mode: 'auto' | 'manual' | 'scheduled';
  interval: RefreshInterval;
  parallel: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface DashboardNotification {
  enabled: boolean;
  channels: DashboardNotificationChannel[];
  triggers: DashboardNotificationTrigger[];
  throttlingMinutes: number;
}

export interface DashboardConfig {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  version: string;
  environment: Environment;
  url: string;
  localUrl: string;
  colorScheme: string;
  category: DashboardCategory;
  icon: string;
  tags: string[];
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  permissions: DashboardPermission[];
  refresh: DashboardRefresh;
  notification: DashboardNotification;
  exportOptions: DashboardExport;
  features: string[];
  endpoints: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessed: string | null;
  author: string;
  license: string;
  isTemplate: boolean;
  isPublic: boolean;
  rating: number;
  usageCount: number;
}

export interface ColorScheme {
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  gradient: string;
  gradientSecondary: string;
  darkMode: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

export interface SystemStats {
  totalDashboards: number;
  totalEndpoints: number;
  totalColorSchemes: number;
  categories: Record<DashboardCategory, number>;
  environments: Record<Environment, number>;
  protocols: Record<Protocol, number>;
}

export const ColorSchemes: Record<string, ColorScheme> = {
  enterprise: {
    name: 'Enterprise Blue',
    description: 'Professional blue theme for enterprise dashboards',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  empire: {
    name: 'Empire Purple',
    description: 'Royal purple theme for premium enterprise applications',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  npm: {
    name: 'NPM Red',
    description: 'Package registry inspired red theme',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  r2: {
    name: 'R2 Orange',
    description: 'Cloudflare R2 inspired storage theme',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  phone: {
    name: 'Phone Intelligence',
    description: 'Blue theme optimized for phone/communication dashboards',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  security: {
    name: 'Security Green',
    description: 'Green theme for security and monitoring dashboards',
    primary: '#10b981',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },

  dark: {
    name: 'Dark Mode',
    description: 'System dark mode theme',
    primary: '#3b82f6',
    secondary: '#3b82f6',
    accent: '#3b82f6',
    success: '#3b82f6',
    warning: '#3b82f6',
    error: '#3b82f6',
    info: '#3b82f6',
    background: '#3b82f6',
    surface: '#3b82f6',
    text: '#3b82f6',
    textSecondary: '#3b82f6',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
    darkMode: {
      background: '#3b82f6',
      surface: '#3b82f6',
      text: '#3b82f6',
      textSecondary: '#3b82f6',
      border: '#3b82f6',
    },
  },
};

// ============================================================================
// ENDPOINT MODULAR CONFIGURATION
// ============================================================================

export const Endpoints: Record<string, EndpointConfig> = {
  'r2-storage': {
    id: 'r2-storage',
    name: 'R2 Storage',
    description: 'Cloudflare R2 storage for evidence files',
    category: 'storage',
    protocols: [
      {
        type: 'https',
        host: '7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
        port: 443,
        path: '/',
        secure: true,
        version: 'v1',
      },
      {
        type: 'sse',
        host: '7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com',
        port: 443,
        path: '/events',
        secure: true,
        version: 'v1',
      },
    ],
    auth: {
      type: 'apikey',
      headerName: 'Authorization',
      headerPrefix: 'Bearer',
      refreshTokenEnabled: false,
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalMs: 30000,
      unhealthyThreshold: 3,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    },
    rateLimit: {
      requestsPerMinute: 1000,
      burstSize: 100,
      windowSizeMs: 60000,
    },
    timeout: 30000,
    cors: {
      enabled: true,
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: false,
    },
    cache: {
      enabled: true,
      ttlSeconds: 3600,
      strategy: 'lru',
    },
    metrics: {
      latencyP50: 45,
      latencyP95: 120,
      latencyP99: 250,
      uptimePercentage: 99.95,
      requestCount: 15420,
      errorCount: 12,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['storage', 'cloudflare', 'r2', 'evidence'],
    dependencies: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  'npm-registry': {
    id: 'npm-registry',
    name: 'Duo NPM Registry',
    description: 'Private NPM registry for Duo packages',
    category: 'registry',
    protocols: [
      {
        type: 'https',
        host: 'duo-npm-registry.utahj4754.workers.dev',
        port: 443,
        path: '/',
        secure: true,
        version: 'v1',
      },
      {
        type: 'graphql',
        host: 'duo-npm-registry.utahj4754.workers.dev',
        port: 443,
        path: '/graphql',
        secure: true,
        version: 'v1',
      },
    ],
    auth: {
      type: 'bearer',
      headerName: 'Authorization',
      headerPrefix: 'Bearer',
      refreshTokenEnabled: true,
      tokenEndpoint: '/-/npm/token',
    },
    healthCheck: {
      enabled: true,
      endpoint: '/-/ping',
      method: 'GET',
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalMs: 60000,
      unhealthyThreshold: 2,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      retryableStatusCodes: [429, 500, 502, 503],
    },
    rateLimit: {
      requestsPerMinute: 500,
      burstSize: 50,
      windowSizeMs: 60000,
    },
    timeout: 15000,
    cors: {
      enabled: false,
      origins: [],
      methods: [],
      credentials: false,
    },
    cache: {
      enabled: true,
      ttlSeconds: 300,
      strategy: 'time-to-live',
    },
    metrics: {
      latencyP50: 80,
      latencyP95: 200,
      latencyP99: 400,
      uptimePercentage: 99.9,
      requestCount: 8750,
      errorCount: 5,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['registry', 'npm', 'packages', 'private'],
    dependencies: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  'empire-pro-status': {
    id: 'empire-pro-status',
    name: 'Empire Pro Status',
    description: 'Enterprise status monitoring service',
    category: 'status',
    protocols: [
      {
        type: 'https',
        host: 'empire-pro-status.utahj4754.workers.dev',
        port: 443,
        path: '/',
        secure: true,
        version: 'v2',
      },
      {
        type: 'ws',
        host: 'empire-pro-status.utahj4754.workers.dev',
        port: 443,
        path: '/ws',
        secure: true,
        version: 'v2',
      },
    ],
    auth: {
      type: 'none',
      refreshTokenEnabled: false,
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 3000,
      expectedStatus: 200,
      intervalMs: 10000,
      unhealthyThreshold: 3,
    },
    retry: {
      maxRetries: 1,
      initialDelayMs: 200,
      maxDelayMs: 1000,
      backoffMultiplier: 1.2,
      retryableStatusCodes: [500, 502, 503],
    },
    rateLimit: {
      requestsPerMinute: 2000,
      burstSize: 200,
      windowSizeMs: 60000,
    },
    timeout: 10000,
    cors: {
      enabled: true,
      origins: ['*'],
      methods: ['GET', 'HEAD'],
      credentials: false,
    },
    metrics: {
      latencyP50: 25,
      latencyP95: 65,
      latencyP99: 120,
      uptimePercentage: 99.99,
      requestCount: 45000,
      errorCount: 2,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['status', 'monitoring', 'health', 'enterprise'],
    dependencies: [],
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  'duo-api': {
    id: 'duo-api',
    name: 'Duo API Gateway',
    description: 'Main API gateway for Duo services',
    category: 'api',
    protocols: [
      {
        type: 'https',
        host: 'api.duo-automation.com',
        port: 443,
        path: '/v2',
        secure: true,
        version: 'v2',
      },
      {
        type: 'grpc',
        host: 'api.duo-automation.com',
        port: 50051,
        path: '',
        secure: true,
        version: 'v2',
      },
    ],
    auth: {
      type: 'jwt',
      headerName: 'Authorization',
      headerPrefix: 'Bearer',
      refreshTokenEnabled: true,
      tokenEndpoint: 'https://auth.duo-automation.com/token',
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalMs: 15000,
      unhealthyThreshold: 2,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 8000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    },
    rateLimit: {
      requestsPerMinute: 10000,
      burstSize: 500,
      windowSizeMs: 60000,
    },
    timeout: 30000,
    cors: {
      enabled: true,
      origins: ['https://duoplus.dev', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    },
    metrics: {
      latencyP50: 55,
      latencyP95: 150,
      latencyP99: 300,
      uptimePercentage: 99.95,
      requestCount: 125000,
      errorCount: 45,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['api', 'gateway', 'core', 'authentication'],
    dependencies: ['auth-service', 'user-service'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  'analytics-api': {
    id: 'analytics-api',
    name: 'Analytics API',
    description: 'Analytics and metrics collection',
    category: 'analytics',
    protocols: [
      {
        type: 'https',
        host: 'analytics.duo-automation.com',
        port: 443,
        path: '/v1',
        secure: true,
        version: 'v1',
      },
      {
        type: 'sse',
        host: 'analytics.duo-automation.com',
        port: 443,
        path: '/stream',
        secure: true,
        version: 'v1',
      },
    ],
    auth: {
      type: 'apikey',
      headerName: 'X-API-Key',
      refreshTokenEnabled: false,
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 5000,
      expectedStatus: 200,
      intervalMs: 30000,
      unhealthyThreshold: 2,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 300,
      maxDelayMs: 5000,
      backoffMultiplier: 1.5,
      retryableStatusCodes: [429, 500, 502, 503],
    },
    rateLimit: {
      requestsPerMinute: 5000,
      burstSize: 100,
      windowSizeMs: 60000,
    },
    timeout: 20000,
    cors: {
      enabled: true,
      origins: ['*'],
      methods: ['GET', 'POST'],
      credentials: false,
    },
    metrics: {
      latencyP50: 120,
      latencyP95: 350,
      latencyP99: 600,
      uptimePercentage: 99.9,
      requestCount: 78000,
      errorCount: 23,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['analytics', 'metrics', 'events', 'tracking'],
    dependencies: ['data-warehouse'],
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },

  'phone-intelligence': {
    id: 'phone-intelligence',
    name: 'Phone Intelligence API',
    description: 'Phone verification and intelligence',
    category: 'phone',
    protocols: [
      {
        type: 'https',
        host: 'phone-api.duo-automation.com',
        port: 443,
        path: '/v1',
        secure: true,
        version: 'v1',
      },
      {
        type: 'tcp',
        host: 'phone-api.duo-automation.com',
        port: 993,
        path: '',
        secure: true,
        version: 'v1',
      },
    ],
    auth: {
      type: 'oauth2',
      headerName: 'Authorization',
      headerPrefix: 'Bearer',
      refreshTokenEnabled: true,
      tokenEndpoint: 'https://auth.duo-automation.com/oauth/token',
    },
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 8000,
      expectedStatus: 200,
      intervalMs: 20000,
      unhealthyThreshold: 3,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 15000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    },
    rateLimit: {
      requestsPerMinute: 100,
      burstSize: 10,
      windowSizeMs: 60000,
    },
    timeout: 45000,
    cors: {
      enabled: true,
      origins: ['https://duoplus.dev'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    metrics: {
      latencyP50: 180,
      latencyP95: 450,
      latencyP99: 800,
      uptimePercentage: 99.85,
      requestCount: 12500,
      errorCount: 18,
      lastSuccessAt: Date.now(),
      lastErrorAt: null,
    },
    tags: ['phone', 'intelligence', 'verification', 'carrier', 'lookup'],
    dependencies: ['carrier-db', 'number-insight-service'],
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
};

// ============================================================================
// DASHBOARD MODULAR CONFIGURATION
// ============================================================================

// Flexible type that accepts all dashboard properties
export interface FlexibleDashboardConfig extends Record<string, unknown> {
  id: string;
  name: string;
  title?: string;
  displayName?: string;
  description: string;
  version: string;
  environment?: Environment;
  url: string;
  localUrl: string;
  colorScheme: string;
  category: DashboardCategory;
  icon: string;
  tags: string[];
  features?: string[];
  capabilities?: string[];
  endpoints?: string[];
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessed: string | null;
  author?: string;
  license?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  rating?: number;
  usageCount?: number;
}

export const Dashboards: Record<string, FlexibleDashboardConfig> = {
  enterprise_dashboard_hub: {
    // Core Identity
    id: 'enterprise_dashboard_hub',
    name: 'Enterprise Dashboard Hub',
    displayName: 'Enterprise Analytics & Command Center',
    title: 'Enterprise Dashboard Hub',
    subtitle: 'Central Analytics & Monitoring Suite',
    description:
      'Central command center for all analytics, monitoring, and configuration tools with unified navigation',
    version: '1.0.0',
    environment: 'enterprise',

    // URLs and Access
    url: 'http://127.0.0.1:8081/demos/@web/dashboard-index.html',
    localUrl: './demos/@web/dashboard-index.html',
    apiEndpoints: ['duo-api', 'analytics-api', 'empire-pro-status'],

    // Visual Configuration
    colorScheme: 'enterprise',
    theme: 'enterprise',
    category: 'main',
    icon: 'layout-dashboard',

    // Classification and Metadata
    tags: ['central', 'navigation', 'enterprise', 'command-center', 'analytics', 'monitoring'],
    moduleType: 'enterprise_analytics',
    features: [
      'Central Navigation',
      'Overview Statistics',
      'Quick Actions',
      'Integration Status',
      'Theme Toggle',
      'Multi-Tenant Support',
      'Real-time Updates',
      'Performance Monitoring',
    ],
    capabilities: [
      'Real-time Data Processing',
      'Advanced Analytics',
      'System Integration',
      'User Management',
      'Security Monitoring',
    ],

    // Layout and Widgets
    widgets: [
      {
        id: 'w1',
        type: 'statistic_widget',
        title: 'Total Endpoints',
        description: 'Number of active system endpoints',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { showTrend: true, format: 'number', precision: 0 },
        refreshInterval: '10s',
        visible: true,
        dataSource: 'empire-pro-status',
        filters: { status: 'active' },
      },
      {
        id: 'w2',
        type: 'chart_widget',
        title: 'Request Volume',
        description: 'Real-time request volume analytics',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: { type: 'line', responsive: true, animation: true, timeRange: '1h' },
        refreshInterval: '30s',
        visible: true,
        dataSource: 'analytics-api',
        filters: { metric: 'requests' },
      },
      {
        id: 'w3',
        type: 'table_widget',
        title: 'Active Services',
        description: 'Status of all active services',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { sortable: true, filterable: true, paginated: true, pageSize: 10 },
        refreshInterval: '5s',
        visible: true,
        dataSource: 'empire-pro-status',
        filters: { type: 'service' },
      },
      {
        id: 'w4',
        type: 'gauge_widget',
        title: 'System Health',
        description: 'Overall system health indicator',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: { min: 0, max: 100, thresholds: [25, 50, 75, 100], showLabels: true },
        refreshInterval: 'realtime',
        visible: true,
        dataSource: 'empire-pro-status',
      },
    ],
    layout: {
      type: 'grid',
      columns: 12,
      rowHeight: 80,
      gap: 16,
      breakpoints: { sm: 6, md: 8, lg: 12, xl: 12 },
      responsive: true,
    },

    // Access Control
    permissions: [
      {
        role: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all privileges',
        permissions: [
          'read',
          'write',
          'delete',
          'execute',
          'admin',
          'configure',
          'manage_users',
          'manage_system',
        ],
        priority: 1,
      },
      {
        role: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with management capabilities',
        permissions: ['read', 'write', 'delete', 'execute', 'admin', 'configure'],
        priority: 2,
      },
      {
        role: 'editor',
        displayName: 'Editor',
        description: 'Can edit and manage content',
        permissions: ['read', 'write', 'execute'],
        priority: 3,
      },
      {
        role: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access to dashboards',
        permissions: ['read'],
        priority: 4,
      },
    ],
    accessControl: 'rbac',

    // Data Management
    refresh: {
      mode: 'auto',
      interval: '10s',
      parallel: true,
      priority: 'normal',
      maxRetries: 3,
      timeout: 30000,
    },
    dataSources: ['empire-pro-status', 'duo-api', 'analytics-api'],
    cache: { enabled: true, ttl: 300, strategy: 'lru' },

    // Notifications
    notification: {
      enabled: true,
      channels: [
        { type: 'email', enabled: true, config: { recipients: ['admin@duoplus.com'] } },
        { type: 'slack', enabled: true, config: { webhook: 'https://hooks.slack.com/...' } },
        { type: 'webhook', enabled: true, config: { url: 'https://api.duoplus.com/webhooks' } },
      ],
      triggers: ['error', 'warning', 'critical'],
      throttlingMinutes: 5,
    },

    // Export and Integration
    exportOptions: {
      format: 'json',
      includeData: true,
      includeConfig: true,
      dateRange: { start: '2024-01-01', end: '2026-01-15' },
      filters: { status: 'active' },
      compression: true,
    },
    integrations: ['slack', 'email', 'webhook', 'monitoring'],
    dependencies: ['empire-pro-status', 'duo-api', 'analytics-api'],

    // Metadata and Analytics
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',

    // Template and Sharing
    isTemplate: false,
    isPublic: false,
    rating: 4.8,
    usageCount: 1250,

    // Performance and Monitoring
    performance: {
      loadTime: 1200,
      memoryUsage: 45,
      errorRate: 0.02,
    },

    // Security
    security: {
      encryption: true,
      authentication: true,
      authorization: true,
    },
  },

  'r2-storage': {
    id: 'r2-storage',
    name: 'R2 Storage Dashboard',
    title: 'R2 Storage Dashboard',
    subtitle: 'Cloudflare R2 Management',
    description:
      'Comprehensive R2 storage dashboard with file management, analytics, monitoring, and bucket configuration',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/r2-storage-dashboard.html',
    localUrl: './demos/@web/r2-storage-dashboard.html',
    colorScheme: 'r2',
    category: 'storage',
    icon: 'hard-drive',
    tags: ['storage', 'cloudflare', 'r2', 'files', 'buckets'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Total Storage',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Bandwidth Usage',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '30s',
        visible: true,
      },
      {
        id: 'w3',
        type: 'list',
        title: 'Recent Uploads',
        position: { x: 0, y: 2, w: 4, h: 4 },
        config: {},
        refreshInterval: '5s',
        visible: true,
      },
      {
        id: 'w4',
        type: 'table',
        title: 'Bucket List',
        position: { x: 4, y: 2, w: 8, h: 4 },
        config: {},
        refreshInterval: '10s',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '30s', parallel: false, priority: 'normal' },
    notification: {
      enabled: true,
      channels: ['email', 'webhook'],
      triggers: ['error', 'warning', 'success'],
      throttlingMinutes: 10,
    },
    exportOptions: {
      format: 'csv',
      includeData: true,
      includeConfig: false,
    },
    features: [
      'File Browser',
      'Upload System',
      'Analytics',
      'Bucket Management',
      'Access Control',
      'Lifecycle Policies',
    ],
    endpoints: ['r2-storage'],
    dependencies: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.6,
    usageCount: 890,
  },

  'npm-registry': {
    id: 'npm-registry',
    name: 'Duo NPM Registry Dashboard',
    title: 'Duo NPM Registry',
    subtitle: 'Package Management & Analytics',
    description:
      'Comprehensive NPM registry dashboard for package management, publishing, analytics, and access control',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/npm-registry-dashboard.html',
    localUrl: './demos/@web/npm-registry-dashboard.html',
    colorScheme: 'npm',
    category: 'registry',
    icon: 'package-2',
    tags: ['npm', 'registry', 'packages', 'publishing', 'dependencies'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Total Packages',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '5m',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Download Trends',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '1h',
        visible: true,
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Recent Packages',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
      {
        id: 'w4',
        type: 'stat',
        title: 'Publish Rate',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '1m', parallel: false, priority: 'low' },
    notification: {
      enabled: true,
      channels: ['email'],
      triggers: ['error', 'warning'],
      throttlingMinutes: 15,
    },
    exportOptions: {
      format: 'json',
      includeData: true,
      includeConfig: true,
    },
    features: [
      'Package Management',
      'Publishing Tools',
      'Analytics',
      'Search & Discovery',
      'Access Configuration',
      'Scoped Packages',
    ],
    endpoints: ['npm-registry'],
    dependencies: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.7,
    usageCount: 650,
  },

  'empire-pro-status': {
    id: 'empire-pro-status',
    name: 'Empire Pro Status Dashboard',
    title: 'Empire Pro Status',
    subtitle: 'Enterprise Monitoring',
    description:
      'Enterprise status dashboard with system monitoring, performance metrics, service health, and incident tracking',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/empire-pro-status-dashboard.html',
    localUrl: './demos/@web/empire-pro-status-dashboard.html',
    colorScheme: 'empire',
    category: 'status',
    icon: 'activity',
    tags: ['status', 'monitoring', 'health', 'enterprise', 'alerts'],
    widgets: [
      {
        id: 'w1',
        type: 'gauge',
        title: 'Overall Health',
        position: { x: 0, y: 0, w: 4, h: 3 },
        config: {},
        refreshInterval: 'realtime',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Response Time',
        position: { x: 4, y: 0, w: 8, h: 4 },
        config: {},
        refreshInterval: '5s',
        visible: true,
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Service Status',
        position: { x: 0, y: 3, w: 12, h: 3 },
        config: {},
        refreshInterval: '1s',
        visible: true,
      },
      {
        id: 'w4',
        type: 'timeline',
        title: 'Incident Timeline',
        position: { x: 0, y: 6, w: 12, h: 3 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
      { role: 'guest', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '1s', parallel: true, priority: 'high' },
    notification: {
      enabled: true,
      channels: ['email', 'slack', 'sms', 'push', 'webhook'],
      triggers: ['error', 'warning', 'all'],
      throttlingMinutes: 2,
    },
    exportOptions: {
      format: 'pdf',
      includeData: true,
      includeConfig: true,
    },
    features: [
      'System Monitoring',
      'Service Health',
      'Performance Metrics',
      'Incident Tracking',
      'Quick Actions',
      'Real-time Alerts',
      'SLA Tracking',
    ],
    endpoints: ['empire-pro-status', 'duo-api'],
    dependencies: [],
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: true,
    rating: 4.9,
    usageCount: 3200,
  },

  'phone-info': {
    id: 'phone-info',
    name: 'Phone Info Template',
    title: 'Phone Info Template',
    subtitle: 'Intelligence & Verification Dashboard',
    description:
      'Comprehensive phone information dashboard with intelligence, verification, carrier info, and risk assessment',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/src/dashboard/phone-info-template.html',
    localUrl: './src/dashboard/phone-info-template.html',
    colorScheme: 'phone',
    category: 'phone',
    icon: 'phone',
    tags: ['phone', 'intelligence', 'verification', 'carrier', 'risk'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Lookups Today',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
      {
        id: 'w2',
        type: 'map',
        title: 'Geographic Distribution',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '5m',
        visible: true,
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Recent Lookups',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: {},
        refreshInterval: '5s',
        visible: true,
      },
      {
        id: 'w4',
        type: 'gauge',
        title: 'Risk Score',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: 'realtime',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '10s', parallel: false, priority: 'normal' },
    notification: {
      enabled: true,
      channels: ['email', 'webhook'],
      triggers: ['error', 'warning'],
      throttlingMinutes: 5,
    },
    exportOptions: {
      format: 'csv',
      includeData: true,
      includeConfig: false,
    },
    features: [
      'Phone Lookup',
      'Risk Assessment',
      'Carrier Information',
      'Location Intelligence',
      'Export Reports',
      'Batch Processing',
    ],
    endpoints: ['phone-intelligence'],
    dependencies: [],
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: true,
    isPublic: false,
    rating: 4.5,
    usageCount: 420,
  },

  'urlpattern-routing': {
    id: 'urlpattern-routing',
    name: 'URLPattern Routing Dashboard',
    title: 'URLPattern Routing',
    subtitle: 'Advanced Routing & Analytics',
    description:
      'Advanced URLPattern routing dashboard with analytics, monitoring, route management, and SCOPE inspection',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/urlpattern-routing-dashboard.html',
    localUrl: './demos/@web/urlpattern-routing-dashboard.html',
    colorScheme: 'enterprise',
    category: 'analytics',
    icon: 'route',
    tags: ['routing', 'urlpattern', 'analytics', 'advanced'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Total Routes',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Request Distribution',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '30s',
        visible: true,
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Route Rules',
        position: { x: 0, y: 2, w: 8, h: 4 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
      {
        id: 'w4',
        type: 'log',
        title: 'Recent Matches',
        position: { x: 8, y: 2, w: 4, h: 4 },
        config: {},
        refreshInterval: '1s',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete', 'execute'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'manual', interval: 'never', parallel: false, priority: 'normal' },
    notification: {
      enabled: false,
      channels: [],
      triggers: [],
      throttlingMinutes: 0,
    },
    exportOptions: {
      format: 'json',
      includeData: true,
      includeConfig: true,
    },
    features: [
      'Route Management',
      'Analytics',
      'Performance Monitoring',
      'SCOPE Management',
      'Inspection Panel',
      'Pattern Testing',
    ],
    endpoints: ['duo-api', 'analytics-api'],
    dependencies: [],
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.4,
    usageCount: 380,
  },

  'external-services': {
    id: 'external-services',
    name: 'External Services Dashboard',
    title: 'External Services',
    subtitle: 'Service Integration & Monitoring',
    description:
      'External services monitoring dashboard with integration management, health checks, and performance analytics',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/external-services-dashboard.html',
    localUrl: './demos/@web/external-services-dashboard.html',
    colorScheme: 'enterprise',
    category: 'analytics',
    icon: 'cloud',
    tags: ['external', 'services', 'integration', 'monitoring'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Connected Services',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Service Latency',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '30s',
        visible: true,
      },
      {
        id: 'w3',
        type: 'table',
        title: 'Service Health',
        position: { x: 0, y: 2, w: 12, h: 4 },
        config: {},
        refreshInterval: '10s',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '30s', parallel: true, priority: 'normal' },
    notification: {
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
      triggers: ['error', 'warning'],
      throttlingMinutes: 5,
    },
    exportOptions: {
      format: 'csv',
      includeData: true,
      includeConfig: false,
    },
    features: [
      'Service Monitoring',
      'Health Checks',
      'Integration Management',
      'Performance Analytics',
      'Status Tracking',
      'Uptime Alerts',
    ],
    endpoints: ['empire-pro-status', 'duo-api'],
    dependencies: [],
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.3,
    usageCount: 520,
  },

  'dashboard-settings': {
    id: 'dashboard-settings',
    name: 'Dashboard Settings',
    title: 'Dashboard Settings',
    subtitle: 'Configuration & Integration',
    description:
      'Comprehensive settings dashboard for configuration, integration management, preferences, and system setup',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/dashboard-settings.html',
    localUrl: './demos/@web/dashboard-settings.html',
    colorScheme: 'enterprise',
    category: 'main',
    icon: 'settings',
    tags: ['settings', 'configuration', 'integration', 'preferences'],
    widgets: [
      {
        id: 'w1',
        type: 'list',
        title: 'Integrations',
        position: { x: 0, y: 0, w: 4, h: 6 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
      {
        id: 'w2',
        type: 'table',
        title: 'Configuration',
        position: { x: 4, y: 0, w: 8, h: 6 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
    ],
    refresh: { mode: 'manual', interval: 'never', parallel: false, priority: 'normal' },
    notification: {
      enabled: false,
      channels: [],
      triggers: [],
      throttlingMinutes: 0,
    },
    exportOptions: {
      format: 'yaml',
      includeData: false,
      includeConfig: true,
    },
    features: [
      'Duo Plus Integration',
      'Email Configuration',
      'Android VM Settings',
      'Proxy Configuration',
      'Preferences',
      'Security Settings',
    ],
    endpoints: ['duo-api'],
    dependencies: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.6,
    usageCount: 780,
  },

  'cloudflare-analytics': {
    id: 'cloudflare-analytics',
    name: 'Cloudflare Analytics Dashboard',
    title: 'Cloudflare Analytics',
    subtitle: 'CDN & Security Analytics',
    description:
      'Cloudflare analytics dashboard with visitor metrics, security insights, DNS management, and optimization',
    version: '1.0.0',
    environment: 'enterprise',
    url: 'http://127.0.0.1:8081/demos/@web/cloudflare-analytics-dashboard.html',
    localUrl: './demos/@web/cloudflare-analytics-dashboard.html',
    colorScheme: 'enterprise',
    category: 'analytics',
    icon: 'bar-chart-3',
    tags: ['cloudflare', 'analytics', 'cdn', 'security', 'dns'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Total Visitors',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '5m',
        visible: true,
      },
      {
        id: 'w2',
        type: 'chart',
        title: 'Traffic Overview',
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {},
        refreshInterval: '10m',
        visible: true,
      },
      {
        id: 'w3',
        type: 'stat',
        title: 'Threats Blocked',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '5m',
        visible: true,
      },
      {
        id: 'w4',
        type: 'table',
        title: 'Security Events',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: {},
        refreshInterval: '1m',
        visible: true,
      },
      {
        id: 'w5',
        type: 'table',
        title: 'DNS Records',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: {},
        refreshInterval: 'never',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '5m', parallel: false, priority: 'low' },
    notification: {
      enabled: true,
      channels: ['email', 'webhook'],
      triggers: ['error', 'warning', 'security'],
      throttlingMinutes: 10,
    },
    exportOptions: {
      format: 'csv',
      includeData: true,
      includeConfig: false,
    },
    features: [
      'Visitor Analytics',
      'Security Insights',
      'DNS Management',
      'Performance Metrics',
      'Optimization Actions',
      'Cache Analytics',
    ],
    endpoints: ['analytics-api'],
    dependencies: [],
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: false,
    rating: 4.7,
    usageCount: 920,
  },

  'dashboard-landing': {
    id: 'dashboard-landing',
    name: 'Main Analytics Dashboard',
    title: 'Analytics Dashboard',
    subtitle: 'Real-time Monitoring & Insights',
    description:
      'Main analytics dashboard with real-time monitoring, API documentation, performance metrics, SCOPE integration, and activity tracking',
    version: '1.0.0',
    environment: 'production',
    url: 'http://127.0.0.1:8082/dashboard-landing.html',
    localUrl: './dashboard-landing.html',
    colorScheme: 'enterprise',
    category: 'main',
    icon: 'line-chart',
    tags: ['analytics', 'monitoring', 'realtime', 'main'],
    widgets: [
      {
        id: 'w1',
        type: 'stat',
        title: 'Total Requests',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '10s',
        visible: true,
      },
      {
        id: 'w2',
        type: 'stat',
        title: 'Success Rate',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '10s',
        visible: true,
      },
      {
        id: 'w3',
        type: 'stat',
        title: 'Avg Response',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '5s',
        visible: true,
      },
      {
        id: 'w4',
        type: 'stat',
        title: 'Active Users',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {},
        refreshInterval: '30s',
        visible: true,
      },
      {
        id: 'w5',
        type: 'chart',
        title: 'Request Volume',
        position: { x: 0, y: 2, w: 8, h: 4 },
        config: {},
        refreshInterval: '30s',
        visible: true,
      },
      {
        id: 'w6',
        type: 'table',
        title: 'Recent Activity',
        position: { x: 8, y: 2, w: 4, h: 4 },
        config: {},
        refreshInterval: '5s',
        visible: true,
      },
    ],
    layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
    permissions: [
      { role: 'admin', actions: ['read', 'write', 'delete', 'execute'] },
      { role: 'editor', actions: ['read', 'write'] },
      { role: 'viewer', actions: ['read'] },
      { role: 'guest', actions: ['read'] },
    ],
    refresh: { mode: 'auto', interval: '5s', parallel: true, priority: 'high' },
    notification: {
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
      triggers: ['error', 'warning', 'all'],
      throttlingMinutes: 3,
    },
    exportOptions: {
      format: 'pdf',
      includeData: true,
      includeConfig: true,
      dateRange: { start: '2024-01-01', end: '2026-01-15' },
    },
    features: [
      'Real-time Monitoring',
      'API Documentation',
      'Performance Analytics',
      'SCOPE Integration',
      'Activity Tracking',
      'Custom Reports',
      'Alert Configuration',
    ],
    endpoints: ['empire-pro-status', 'duo-api', 'analytics-api'],
    dependencies: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    lastAccessed: null,
    author: 'DuoPlus Team',
    license: 'MIT',
    isTemplate: false,
    isPublic: true,
    rating: 4.9,
    usageCount: 4500,
  },
};

// ============================================================================
// MODULAR SYSTEM MANAGER
// ============================================================================

export class ModularSystemManager {
  private static instance: ModularSystemManager;
  private currentTheme: keyof typeof ColorSchemes = 'enterprise';

  private constructor() {}

  static getInstance(): ModularSystemManager {
    if (!ModularSystemManager.instance) {
      ModularSystemManager.instance = new ModularSystemManager();
    }
    return ModularSystemManager.instance;
  }

  // Color Management
  getColorScheme(scheme?: keyof typeof ColorSchemes): ColorScheme {
    return ColorSchemes[scheme || this.currentTheme];
  }

  setColorScheme(scheme: keyof typeof ColorSchemes): void {
    this.currentTheme = scheme;
  }

  getAllColorSchemes(): Record<string, ColorScheme> {
    return ColorSchemes;
  }

  // Endpoint Management
  getEndpoint(id: string): EndpointConfig | undefined {
    return Endpoints[id];
  }

  getEndpointsByCategory(category: DashboardCategory): EndpointConfig[] {
    return Object.values(Endpoints).filter((ep) => ep.category === category);
  }

  getDashboardsByCategory(category: DashboardCategory): FlexibleDashboardConfig[] {
    return Object.values(Dashboards).filter((dash) => dash.category === category);
  }

  getDashboard(id: string): FlexibleDashboardConfig | undefined {
    return Dashboards[id];
  }

  generateThemeCSS(scheme?: string): string {
    const colors = this.getColorScheme(scheme);

    return `
:root {
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-border: ${colors.border};
  --color-gradient: ${colors.gradient};
  --color-gradient-secondary: ${colors.gradientSecondary};
}

.gradient-text {
  background: ${colors.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: ${colors.gradient};
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, ${colors.textSecondary} 0%, ${colors.border} 100%);
  color: white;
}

.status-indicator {
  background-color: ${colors.success};
}

.status-warning {
  background-color: ${colors.warning};
}

.status-error {
  background-color: ${colors.error};
}
    `;
  }

  generateDashboardUrl(id: string, useLocal: boolean = false): string {
    const dashboard = this.getDashboard(id);
    if (!dashboard) return '';
    return useLocal ? dashboard.localUrl : dashboard.url;
  }

  getSystemStats(): SystemStats {
    const dashboards = Object.values(Dashboards);
    const endpoints = Object.values(Endpoints);

    const categories: Record<string, number> = {};
    const environments: Record<string, number> = {};
    const protocols: Record<string, number> = {};

    dashboards.forEach((d) => {
      categories[d.category] = (categories[d.category] || 0) + 1;
      environments[d.environment] = (environments[d.environment] || 0) + 1;
    });

    endpoints.forEach((e) => {
      e.protocols.forEach((p) => {
        protocols[p.type] = (protocols[p.type] || 0) + 1;
      });
    });

    return {
      totalDashboards: dashboards.length,
      totalEndpoints: endpoints.length,
      totalColorSchemes: Object.keys(ColorSchemes).length,
      categories: categories as Record<DashboardCategory, number>,
      environments: environments as Record<Environment, number>,
      protocols: protocols as Record<Protocol, number>,
    };
  }

  exportConfiguration(): {
    endpoints: Record<string, EndpointConfig>;
    dashboards: Record<string, FlexibleDashboardConfig>;
    colorSchemes: Record<string, ColorScheme>;
    currentTheme: string;
  } {
    return {
      endpoints: Endpoints,
      dashboards: Dashboards,
      colorSchemes: ColorSchemes,
      currentTheme: this.currentTheme,
    };
  }

  async healthCheckAll(): Promise<
    Record<string, { healthy: boolean; latency: number; error?: string }>
  > {
    const results: Record<string, { healthy: boolean; latency: number; error?: string }> = {};

    for (const [id, endpoint] of Object.entries(Endpoints)) {
      if (endpoint.healthCheck.enabled) {
        const start = Date.now();
        try {
          const primaryProtocol = endpoint.protocols.find(
            (p) => p.type === 'https' || p.type === 'http'
          );
          if (primaryProtocol) {
            const response = await fetch(
              `https://${primaryProtocol.host}${endpoint.healthCheck.endpoint}`,
              {
                method: endpoint.healthCheck.method,
                signal: AbortSignal.timeout(endpoint.healthCheck.timeoutMs),
              }
            );
            results[id] = {
              healthy: response.status === endpoint.healthCheck.expectedStatus,
              latency: Date.now() - start,
            };
          }
        } catch (error: any) {
          results[id] = {
            healthy: false,
            latency: Date.now() - start,
            error: error.message,
          };
        }
      }
    }

    return results;
  }

  async getDashboardMetrics(): Promise<
    Record<string, { requests: number; latency: number; errors: number }>
  > {
    const metrics: Record<string, { requests: number; latency: number; errors: number }> = {};

    for (const [id, endpoint] of Object.entries(Endpoints)) {
      metrics[id] = {
        requests: endpoint.metrics.requestCount,
        latency: endpoint.metrics.latencyP50,
        errors: endpoint.metrics.errorCount,
      };
    }

    return metrics;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const modularSystem = ModularSystemManager.getInstance();

// Quick access functions
export const getColorScheme = (scheme?: string) => modularSystem.getColorScheme(scheme);
export const getEndpoint = (id: string) => modularSystem.getEndpoint(id);
export const getDashboard = (id: string) => modularSystem.getDashboard(id);
export const generateThemeCSS = (scheme?: string) => modularSystem.generateThemeCSS(scheme);
export const getSystemStats = () => modularSystem.getSystemStats();

// Theme switching
export const switchTheme = (scheme: string) => {
  modularSystem.setColorScheme(scheme);
  // Apply theme to document
  if (typeof document !== 'undefined') {
    const style = document.getElementById('modular-theme') || document.createElement('style');
    style.id = 'modular-theme';
    style.textContent = generateThemeCSS(scheme);
    document.head.appendChild(style);
  }
};

// Export default
export default modularSystem;
