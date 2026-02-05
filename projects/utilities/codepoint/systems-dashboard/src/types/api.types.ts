// types/api.types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface HealthCheckResponse extends ApiResponse {
  data?: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    version: string;
    services: ServiceStatus[];
    system: SystemHealth;
    errors: ErrorReport[];
    enhancedMetrics?: EnhancedMetrics;
  };
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  lastCheck: string;
  uptime?: number;
  dependencyCheck?: string[];
}

export interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    connected: boolean;
    latency?: number;
  };
  historical?: HistoricalData;
  alerts?: SystemAlert[];
  recommendations?: string[];
}

export interface ErrorReport {
  id: string;
  message: string;
  level: "error" | "warning" | "info";
  timestamp: string;
  resolved: boolean;
  context?: Record<string, any>;
}

export interface EnhancedMetrics {
  cacheSize: number;
  rateLimitConnections: number;
  memoryLeakDetection: boolean;
  performanceScore: number;
  apiResponseTime?: number;
}

export interface HistoricalData {
  lastHour: Array<{ time: number; cpu: number; memory: number }>;
  lastDay: Array<{ time: number; cpu: number; memory: number }>;
  lastWeek: Array<{ time: number; cpu: number; memory: number }>;
}

export interface SystemAlert {
  type: "warning" | "info" | "error";
  message: string;
}

export interface BenchmarkResult {
  grade: "A+" | "A" | "B" | "C" | "F";
  overallScore: number;
  gradeDetails: {
    stringWidth: number;
    fileWrite: number;
    build: number;
    spawn: number;
    performanceGrade: string;
  };
  timestamp: string;
}
