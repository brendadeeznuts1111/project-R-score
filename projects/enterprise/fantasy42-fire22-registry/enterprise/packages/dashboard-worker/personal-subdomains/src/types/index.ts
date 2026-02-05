/**
 * Type definitions for Fire22 Personal Subdomains Worker
 */

export interface Env {
  PERSONAL_SITES: any; // KVNamespace equivalent
  EMPLOYEE_DATA: any; // KVNamespace equivalent
  ENVIRONMENT: string;
  FIRE22_BRAND: string;
  DEFAULT_TEMPLATE: string;
}

export interface EmployeeData {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone?: string;
  slack?: string;
  telegram?: string;
  bio: string;
  headshotUrl?: string;
  tier: EmployeeTier;
  template: string;
  features: string[];
  manager?: string;
  directReports?: string[];
  hireDate: string;
  lastUpdated: string;
}

export type EmployeeTier = 1 | 2 | 3 | 4 | 5;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  employee: string;
  subdomain: string;
  timestamp: string;
  tier: EmployeeTier;
  features: string[];
  version?: string;
  uptime?: number;
}

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate?: number;
  cacheControl: string;
}

export interface RouteHandler {
  (request: Request, env: Env, params?: RouteParams): Promise<Response>;
}

export interface RouteParams {
  subdomain: string;
  pathname: string;
  employee?: EmployeeData;
}

export interface TemplateConfig {
  name: string;
  styles: string;
  features: string[];
  components: string[];
}

export interface ComponentProps {
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  subdomain?: string;
  employeeId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}
