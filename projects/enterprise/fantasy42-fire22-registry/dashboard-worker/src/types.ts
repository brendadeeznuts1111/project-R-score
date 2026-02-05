// 🏗️ TypeScript Type Definitions for Dashboard Worker
// Centralized type definitions for better maintainability

// --- Cache Types ---
export interface CacheEntry<T> {
  data: T;
  expires: number;
}

// --- Request Enhancement Types ---
export interface RequestWithServices extends Request {
  cache: Fire22Cache;
  fire22ApiService: Fire22ApiService;
  // If you implemented the global JSON body parsing middleware
  // bodyJson?: any;
}

// --- Service Types ---
export interface Fire22ApiService {
  // Add methods as needed
  baseURL: string;
  authToken: string;
  sessionCookie: string;
}

// --- Cache Class Type ---
export interface Fire22CacheInterface {
  get<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
  query<T>(sql: string, params?: any[], ttl?: number): Promise<T[]>;
  getStats(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: string;
  };
}

// --- API Response Types ---
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface HealthResponse extends ApiResponse {
  status: 'OK' | 'WARNING' | 'ERROR';
  health_score: number;
  total_agents?: number;
  agents_with_errors?: number;
}

export interface MatrixHealthResponse extends ApiResponse {
  status: 'OK' | 'WARNING' | 'ERROR';
  matrix_health_score: number;
  matrix_stats?: {
    total_agents: number;
    total_permissions: number;
    total_matrix_cells: number;
    valid_matrix_cells: number;
    data_completeness: number;
    permission_coverage: number;
    agent_data_quality: number;
  };
}

export interface SystemHealthResponse extends ApiResponse {
  status: 'OK' | 'WARNING' | 'ERROR';
  system_health_score: number;
  response_time: number;
  critical_issues: number;
  checks: Array<{
    name: string;
    status: 'OK' | 'WARNING' | 'ERROR';
    details?: string;
    error?: string;
  }>;
  summary: {
    healthy: number;
    total: number;
    status: 'OK' | 'WARNING' | 'ERROR';
    recommendations?: string[];
  };
}

// --- Cache Stats Types ---
export interface CacheStats {
  cacheSize: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: string;
}

export interface CacheStatsResponse extends ApiResponse {
  cacheStats: CacheStats;
  source: string;
  adminAccess?: boolean;
}

// --- Agent Types ---
export interface Agent {
  agent_id: string;
  master_agent_id?: string;
  permissions: Record<string, boolean>;
  commissionRates: {
    inet: number;
    casino: number;
    propBuilder: number;
  };
  status: {
    isActive: boolean;
    lastActivity?: string;
  };
}

export interface AgentConfig {
  agent_id: string;
  master_agent_id: string;
  allow_place_bet: string | number;
  allow_mod_info?: string | number;
  allow_change_accounts?: string | number;
  commission_percent: number;
  inet_head_count_rate: number;
  live_casino_rate: number;
  max_wager: string | number;
  min_wager?: number;
  sports_rate?: number;
}

// --- Validation Types ---
export interface ValidationSummary {
  valid_permissions: number;
  valid_commission_rates: number;
  has_required_fields: number;
  valid_max_wager_type: number;
}

export interface AgentValidationDetail {
  agent_id: string;
  status: 'OK' | 'ERROR';
  score: number;
  errors: string[];
}

// --- Environment Types ---
export interface Env {
  DB: any; // D1Database
  BOT_TOKEN: string;
  CASHIER_BOT_TOKEN: string;
  JWT_SECRET: string;
  ADMIN_PASSWORD: string;
  FIRE22_API_URL: string;
  FIRE22_TOKEN: string;
  FIRE22_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SENDGRID_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  CRON_SECRET: string;
}

// --- Export all types ---
export type {
  CacheEntry,
  RequestWithServices,
  Fire22ApiService,
  Fire22CacheInterface,
  ApiResponse,
  HealthResponse,
  MatrixHealthResponse,
  SystemHealthResponse,
  CacheStats,
  CacheStatsResponse,
  Agent,
  AgentConfig,
  ValidationSummary,
  AgentValidationDetail,
  Env,
};
