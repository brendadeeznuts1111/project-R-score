// lib/core/endpoint-status.ts — Endpoint status types with HSL color integration

import type { SeverityLevel, ContextType } from '../utils/enhanced-status-matrix';
import type { ColorStatus } from '../utils/color-system';

/**
 * Endpoint configuration
 */
export interface Endpoint {
  /** Unique name for the endpoint */
  name: string;
  /** URL to check */
  url: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** Category for grouping */
  category: string;
  /** Optional headers */
  headers?: Record<string, string>;
  /** Optional body for POST/PUT/PATCH */
  body?: string | object;
  /** Expected status codes (defaults to 200-299) */
  expectedStatusCodes?: number[];
}

/**
 * Result of an endpoint check
 */
export interface EndpointResult {
  /** The endpoint that was checked */
  endpoint: Endpoint;
  /** Status category */
  status: ColorStatus;
  /** Severity level */
  severity: SeverityLevel;
  /** Response time in milliseconds */
  responseTime: number;
  /** HTTP status code */
  statusCode: number;
  /** Human-readable message */
  message: string;
  /** Timestamp of the check */
  timestamp: number;
  /** Response headers (if available) */
  headers?: Record<string, string>;
  /** Response body (if available and JSON) */
  body?: unknown;
  /** Error details if status is error */
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

/**
 * Configuration for endpoint checking
 */
export interface EndpointCheckConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Whether to follow redirects */
  followRedirects: boolean;
  /** Whether to validate SSL certificates */
  validateSSL: boolean;
  /** User agent string */
  userAgent: string;
}

/**
 * Display configuration
 */
export interface DisplayConfig {
  /** Color context (light/dark) */
  context: ContextType;
  /** Whether to enable WCAG compliance checking */
  ensureWCAG: boolean;
  /** Background HSL for contrast checking */
  backgroundHsl?: { h: number; s: number; l: number };
  /** Output format */
  format: 'ansi' | 'json' | 'html' | 'markdown';
  /** Whether to show detailed info */
  verbose: boolean;
}

/**
 * Watch configuration
 */
export interface WatchConfig extends DisplayConfig {
  /** Check interval in milliseconds */
  interval: number;
  /** Maximum number of checks (0 = unlimited) */
  maxChecks: number;
  /** Whether to alert on status changes */
  alertOnChange: boolean;
  /** Callback for status changes */
  onStatusChange?: (result: EndpointResult, previousResult: EndpointResult | null) => void;
  /** Callback for each check cycle */
  onCycle?: (results: EndpointResult[]) => void;
}

/**
 * Aggregated status for multiple endpoints
 */
export interface AggregatedStatus {
  /** Total number of endpoints */
  total: number;
  /** Number of successful endpoints */
  success: number;
  /** Number of endpoints with warnings */
  warning: number;
  /** Number of endpoints with errors */
  error: number;
  /** Number of endpoints with info status */
  info: number;
  /** Number of critical issues */
  critical: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Timestamp of aggregation */
  timestamp: number;
  /** Overall status (worst of all) */
  overallStatus: ColorStatus;
  /** Overall severity (highest of all) */
  overallSeverity: SeverityLevel;
  /** Health percentage (0-100) */
  healthPercentage: number;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  /** Timestamp */
  timestamp: number;
  /** Status at that time */
  status: ColorStatus;
  /** Severity at that time */
  severity: SeverityLevel;
  /** Response time */
  responseTime: number;
  /** Status code */
  statusCode: number;
}

/**
 * Endpoint with history
 */
export interface EndpointWithHistory extends Endpoint {
  /** Check history */
  history: StatusHistoryEntry[];
  /** Uptime percentage (0-100) */
  uptime: number;
  /** Average response time */
  averageResponseTime: number;
  /** Last checked timestamp */
  lastChecked: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Number of consecutive successes */
  consecutiveSuccesses: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert when status changes to these statuses */
  onStatusChange: ColorStatus[];
  /** Alert when severity is at least this level */
  minSeverity: SeverityLevel;
  /** Alert when response time exceeds this (ms) */
  maxResponseTime: number;
  /** Alert when consecutive failures reach this count */
  consecutiveFailures: number;
  /** Alert webhook URL */
  webhookUrl?: string;
  /** Alert email addresses */
  emailAddresses?: string[];
  /** Custom alert handler */
  customHandler?: (alert: StatusAlert) => void;
}

/**
 * Status alert
 */
export interface StatusAlert {
  /** Alert type */
  type: 'status_change' | 'severity_threshold' | 'response_time' | 'consecutive_failures';
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Affected endpoint */
  endpoint: Endpoint;
  /** Current result */
  currentResult: EndpointResult;
  /** Previous result (if applicable) */
  previousResult?: EndpointResult;
  /** Timestamp */
  timestamp: number;
  /** Severity */
  severity: SeverityLevel;
}

/**
 * CLI options
 */
export interface CLIOptions {
  /** Command to run */
  command: 'check' | 'watch' | 'matrix' | 'json' | 'help';
  /** Target URL (for single check) */
  url?: string;
  /** Color context */
  context: ContextType;
  /** Watch interval */
  interval: number;
  /** Request timeout */
  timeout: number;
  /** Output as JSON */
  json: boolean;
  /** Show help */
  help: boolean;
  /** Show version */
  version: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Custom endpoints config file */
  config?: string;
}

// Re-export types from other modules
export type { SeverityLevel, ContextType, ColorStatus };
