/**
 * API Types and Interfaces
 *
 * Centralized types for API requests and responses.
 * Provides type safety for all API operations.
 */

/**
 * API Error interface
 */
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode?: number;
  };
}

/**
 * API Response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Upload API Types
 */
export interface UploadInitiateRequest {
  file: File | Blob;
  filename: string;
  contentType: string;
  contentDisposition?: "inline" | "attachment";
  metadata?: Record<string, string>;
}

export interface UploadInitiateResponse {
  success: true;
  uploadId: string;
  filename: string;
  url: string;
  size: number;
  duration: number;
  provider: "s3" | "r2" | "local";
}

export interface UploadStatusResponse extends UploadProgress {
  uploadId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
  status: "initiated" | "uploading" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  error?: string;
  url?: string;
}

export interface UploadProgress {
  uploadId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
  status: "initiated" | "uploading" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  error?: string;
  url?: string;
}

export interface UploadTelemetryResponse {
  total: number;
  success: number;
  failure: number;
  avgDuration: number;
  totalBytes: number;
}

/**
 * Monitoring API Types
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  timestamp: string;
}

export interface MetricsResponse {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  activeUploads: number;
  totalUploads: number;
  successRate: number;
  uptime: number;
}

export interface MonitoringSummary {
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  activeIPs: number;
}

export interface EnvironmentMetrics {
  environment: string;
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
  }>;
}

export interface TopIP {
  ip: string;
  requestCount: number;
  avgResponseTime: number;
  lastRequest: number;
}

export interface TopDevice {
  device: string;
  requestCount: number;
  avgResponseTime: number;
}

/**
 * Feature Flag API Types
 */
export interface MergedFlagsResponse {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    flags: string[];
  }>;
  flags: Record<string, FeatureMetadata>;
  architectFlags: string[];
}

export interface FeatureMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  critical?: boolean;
  badge?: {
    enabled: string;
    disabled: string;
  };
  impact?: FeatureImpact;
  default?: boolean;
}

export interface FeatureImpact {
  bundleSize: `${number}%` | "0%";
  performance: "neutral" | "+5%" | "+8%" | "optimized" | "varies";
  security: "neutral" | "enhanced" | "standard";
}

export interface BuildConfig {
  name: string;
  entryPoints: string[];
  flags?: string[];
  outdir: string;
  minify?: boolean;
  sourcemap?: boolean;
}

export interface BuildTriggerResponse {
  status: "success" | "failure";
  config: string;
  flags: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  duration?: number;
}

/**
 * Alert API Types
 */
export interface Alert {
  id: number;
  timestamp: number;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  description: string;
  ip: string;
  environment: string;
  details: AlertDetails;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface AlertDetails {
  endpoint?: string;
  method?: string;
  threshold?: number;
  windowSeconds?: number;
  errorRate?: number;
  errorCount?: number;
  totalRequests?: number;
  requestsPerMinute?: string;
  averageRequestsPerMinute?: string;
  spikeMultiplier?: string;
  requestCount?: number;
  userAgent?: string;
  zScore?: string;
  mean?: string;
  stdDev?: string;
  totalRequests?: number;
  average?: string;
  multiplier?: string;
  burstMultiplier?: string;
  baseline?: string;
  dropPercentage?: string;
  [key: string]: string | number | undefined;
}

/**
 * Telemetry API Types
 */
export interface TelemetryLogEntry {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error" | "critical";
  message: string;
  context?: string;
  args?: unknown[];
  result?: unknown;
  duration?: number;
}

export interface TelemetryAlert {
  id: number;
  timestamp: number;
  severity: "info" | "warning" | "error" | "critical";
  type: string;
  source: string;
  message: string;
  environment: string;
  resolved: boolean;
}

/**
 * WebSocket API Types
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp?: number;
}

export interface WebSocketSubscribeMessage {
  type: "subscribe" | "unsubscribe";
  channel: "dashboard" | "uploads" | "telemetry";
}

export interface WebSocketUploadProgressMessage {
  type: "upload-progress";
  data: UploadProgress;
}

export interface WebSocketUploadCompleteMessage {
  type: "upload-complete";
  data: {
    uploadId: string;
    filename: string;
    url: string;
    duration: number;
  };
}

export interface WebSocketUploadErrorMessage {
  type: "upload-error";
  data: {
    uploadId: string;
    filename: string;
    error: string;
  };
}

export interface WebSocketMetricsMessage {
  type: "metrics";
  data: {
    cpu: number;
    memory: number;
    uptime: number;
    timestamp: number;
  };
}

export interface WebSocketAlertMessage {
  type: "alert";
  data: {
    severity: "info" | "warning" | "error" | "critical";
    message: string;
    timestamp: number;
  };
}

/**
 * Pagination Types
 */
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Type Guards
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as APIError).error === "object"
  );
}

export function getErrorMessage(error: unknown): string {
  if (isAPIError(error)) return error.error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * Fetch wrapper with type safety
 *
 * @example
 * ```typescript
 * const data = await fetchAPI<UploadInitiateResponse>(
 *   "/api/upload/initiate",
 *   {
 *     method: "POST",
 *     body: formData
 *   }
 * );
 * ```
 */
export async function fetchAPI<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === "object" && "error" in errorData) {
        errorMessage = (errorData as APIError).error.message;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json() as T;
}

/**
 * Fetch wrapper with API response envelope
 *
 * @example
 * ```typescript
 * const response = await fetchAPIEnvelope<UploadInitiateResponse>(
 *   "/api/upload/initiate",
 *   { method: "POST", body: formData }
 * );
 * if (response.success && response.data) {
 *   console.log(response.data.uploadId);
 * }
 * ```
 */
export async function fetchAPIEnvelope<T>(
  url: string,
  init?: RequestInit
): Promise<APIResponse<T>> {
  const response = await fetch(url, init);

  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  const data = await response.json();

  // Check if response has success field
  if (data && typeof data === "object" && "success" in data) {
    return data as APIResponse<T>;
  }

  // Wrap response in success envelope
  return {
    success: true,
    data: data as T,
  };
}
