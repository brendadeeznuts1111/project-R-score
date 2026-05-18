// Enhanced type definitions for Fire22 Dashboard

// Error handling types
export interface EnhancedError extends Error {
  code: string;
  httpStatus: number;
  details: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

// Monitoring types
export interface PerformanceMetrics {
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  timestamp: string;
}

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'validation' | 'security';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
  timestamp: string;
  userId?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  lastUpdated: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked: string;
  metrics?: PerformanceMetrics;
}

// Configuration types
export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'verbose';
  metricsInterval: number;
  securityEventRetention: number;
  healthCheckInterval: number;
  retentionDays: number; // Added missing property
}

export interface SecurityConfig {
  enableSecurityMonitoring: boolean;
  securityEventRetention: number;
  suspiciousActivityThreshold: number;
  enableRateLimiting: boolean;
  alertChannels: string[]; // Added missing property
}

// Request tracking types
export interface RequestInfo {
  id: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  startTime: number;
  userId?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
  };
}
