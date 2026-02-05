/**
 * Type Definitions Index
 *
 * Centralized export of all shared types for the Geelark application.
 * Import types from here to ensure consistent typing across the codebase.
 */

// Database types
export * from "./database.js";

// API types
export * from "./api.js";

/**
 * Common types used across the application
 */

/**
 * Upload configuration
 */
export interface UploadConfig {
  provider: "s3" | "r2" | "local";
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  localDir?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  filename: string;
  contentType: string;
  contentDisposition?: "inline" | "attachment";
  metadata?: Record<string, string>;
}

/**
 * Upload result
 */
export interface UploadResult {
  uploadId: string;
  filename: string;
  url: string;
  size: number;
  duration: number;
  provider: "s3" | "r2" | "local";
}

/**
 * Environment type
 */
export type Environment = "development" | "production" | "test";

/**
 * Log level type
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

/**
 * Status type for uploads, jobs, etc.
 */
export type Status = "initiated" | "uploading" | "downloading" | "completed" | "failed" | "cancelled";

/**
 * Severity type for alerts
 */
export type Severity = "info" | "warning" | "error" | "critical";

/**
 * Provider type
 */
export type Provider = "s3" | "r2" | "local";

/**
 * Content disposition type
 */
export type ContentDisposition = "inline" | "attachment";

/**
 * HTTP methods
 */
export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/**
 * Content types
 */
export type ContentType =
  | "text/plain"
  | "text/html"
  | "text/css"
  | "text/javascript"
  | "application/json"
  | "application/xml"
  | "application/pdf"
  | "application/octet-stream"
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp";

/**
 * WebSocket channel types
 */
export type WebSocketChannel = "dashboard" | "uploads" | "telemetry" | "alerts";

/**
 * Feature flag names (from env.d.ts Registry)
 */
export type FeatureFlagName =
  // Environment flags
  | "ENV_DEVELOPMENT"
  | "ENV_PRODUCTION"
  | "ENV_TEST"
  // Upload flags
  | "FEAT_CLOUD_UPLOAD"
  | "FEAT_UPLOAD_PROGRESS"
  | "FEAT_MULTIPART_UPLOAD"
  | "FEAT_UPLOAD_ANALYTICS"
  | "FEAT_CUSTOM_METADATA"
  // Feature flags
  | "FEAT_PREMIUM"
  | "FEAT_AUTO_HEAL"
  | "FEAT_NOTIFICATIONS"
  | "FEAT_ENCRYPTION"
  | "FEAT_MOCK_API"
  | "FEAT_EXTENDED_LOGGING"
  | "FEAT_ADVANCED_MONITORING"
  | "FEAT_BATCH_PROCESSING"
  | "FEAT_VALIDATION_STRICT";

/**
 * Typed event handler
 */
export type EventHandler<T = void> = () => T | Promise<T>;
export type EventHandlerWithData<T, R = void> = (data: T) => R | Promise<R>;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T> {
  return { success: true, data: value };
}

/**
 * Create a failed result
 */
export function fail<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Assert that a result is successful
 */
export function assertOk<T>(result: Result<T>): T {
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

/**
 * Time-based types
 */
export type Timestamp = number;
export type Duration = number; // in milliseconds
export type Uptime = number; // in milliseconds

/**
 * File size types
 */
export type Bytes = number;
export type KiloBytes = number;
export type MegaBytes = number;
export type GigaBytes = number;

/**
 * Percentage (0-100)
 */
export type Percentage = number;

/**
 * UUID string
 */
export type UUID = string;

/**
 * Email string
 */
export type Email = string;

/**
 * URL string
 */
export type URLString = string;

/**
 * IP address
 */
export type IPAddress = string;

/**
 * Port number
 */
export type Port = number;

/**
 * Process ID
 */
export type PID = number;

/**
 * Memory size
 */
export type MemorySize = number;

/**
 * CPU usage percentage
 */
export type CPUUsage = number;

/**
 * Memory usage percentage
 */
export type MemoryUsage = number;

/**
 * Response time in milliseconds
 */
export type ResponseTime = number;

/**
 * Request count
 */
export type RequestCount = number;

/**
 * Type guard for checking if a value is defined (not null/undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if a string is not empty
 */
export function isNotEmpty(value: string): value is string {
  return value.length > 0;
}

/**
 * Type guard for checking if a value is an object (not null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard for checking if a value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Require function with type assertion
 * Throws if value is null/undefined
 */
export function require<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message || `Required value is ${value}`);
  }
  return value;
}

/**
 * Assert function for runtime type checking
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Enum-like objects for better type safety
 */
export const HTTPStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HTTPStatusCode = typeof HTTPStatus[keyof typeof HTTPStatus];

export const UploadStatus = {
  INITIATED: "initiated",
  UPLOADING: "uploading",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const AlertSeverity = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export const Environment = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;
