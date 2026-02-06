// env.d.ts - Enhanced Security Configuration with Bun Registry
// FactoryWager Security v5.0 - Type-safe security features and environment variables

declare module "bun" {
  interface Env {
    // Core Environment
    NODE_ENV: "development" | "production" | "test";
    
    // R2 Configuration (Required)
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME?: string;
    
    // Security Configuration
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
    AUDIT_LOG_RETENTION_DAYS?: string;
    MAX_RETRY_ATTEMPTS?: string;
    CACHE_TTL?: string;
    
    // Feature Flags
    ENABLE_SECURITY_MONITORING?: string;
    ENABLE_ADVANCED_AUDITING?: string;
    ENABLE_REAL_TIME_ALERTS?: string;
    
    // Development Settings
    DEBUG_SECURITY?: string;
    MOCK_R2_ENDPOINT?: string;
  }
}

declare module "bun:bundle" {
  interface Registry {
    // Security Feature Flags
    security: 
      | "ENTERPRISE_SECURITY"     // Full audit trails, compliance, advanced encryption
      | "STANDARD_SECURITY"       // Basic audit logs, standard encryption
      | "DEVELOPMENT_MODE"        // Reduced security for development
      | "TESTING_MODE"           // Mock services for testing
      | "COMPLIANCE_MODE"        // Enhanced compliance reporting
      | "ZERO_TRUST"             // Zero-trust architecture
      | "MULTI_REGION"           // Multi-region secret replication
      | "ADVANCED_MONITORING"     // Real-time security monitoring
      | "AUTO_ROTATION"          // Automatic secret rotation
      | "EMERGENCY_LOCKDOWN";     // Emergency security lockdown
    
    // Cache Strategy Features
    cache:
      | "REDIS_CACHE"            // External Redis cache
      | "MEMORY_CACHE"           // In-memory cache only
      | "DISTRIBUTED_CACHE"      // Distributed cache cluster
      | "NO_CACHE"               // Disable caching
      | "PERSISTENT_CACHE";      // Persistent cache storage
    
    // Audit Features
    audit:
      | "FULL_AUDIT"             // Complete audit logging
      | "SECURITY_AUDIT"         // Security events only
      | "PERFORMANCE_AUDIT"      // Performance metrics
      | "COMPLIANCE_AUDIT"       // Compliance-focused audit
      | "MINIMAL_AUDIT";         // Minimal audit logging
    
    // Authentication Methods
    auth:
      | "AWS_SIGV4"              // AWS Signature V4
      | "BASIC_AUTH"             // Basic authentication (dev only)
      | "OAUTH2"                 // OAuth2 authentication
      | "MTLS"                   // Mutual TLS
      | "API_KEY"               // API key authentication
      | "JWT_TOKEN";            // JWT token authentication
    
    // Storage Backends
    storage:
      | "R2_STORAGE"            // Cloudflare R2
      | "S3_STORAGE"            // AWS S3
      | "LOCAL_STORAGE"         // Local filesystem
      | "HYBRID_STORAGE"        // Multiple storage backends
      | "BACKUP_STORAGE";       // Backup storage only
    
    // Monitoring Features
    monitoring:
      | "PROMETHEUS"            // Prometheus metrics
      | "GRAFANA"               // Grafana dashboards
      | "CLOUDWATCH"            // AWS CloudWatch
      | "SENTRY"                // Sentry error tracking
      | "CUSTOM_MONITORING";    // Custom monitoring solution
  }
}

// Type definitions for enhanced type safety
export type SecurityFeature = 
  | "ENTERPRISE_SECURITY"
  | "STANDARD_SECURITY"
  | "DEVELOPMENT_MODE"
  | "TESTING_MODE"
  | "COMPLIANCE_MODE"
  | "ZERO_TRUST"
  | "MULTI_REGION"
  | "ADVANCED_MONITORING"
  | "AUTO_ROTATION"
  | "EMERGENCY_LOCKDOWN";

export type CacheFeature =
  | "REDIS_CACHE"
  | "MEMORY_CACHE"
  | "DISTRIBUTED_CACHE"
  | "NO_CACHE"
  | "PERSISTENT_CACHE";

export type AuditFeature =
  | "FULL_AUDIT"
  | "SECURITY_AUDIT"
  | "PERFORMANCE_AUDIT"
  | "COMPLIANCE_AUDIT"
  | "MINIMAL_AUDIT";

export type AuthFeature =
  | "AWS_SIGV4"
  | "BASIC_AUTH"
  | "OAUTH2"
  | "MTLS"
  | "API_KEY"
  | "JWT_TOKEN";

export type StorageFeature =
  | "R2_STORAGE"
  | "S3_STORAGE"
  | "LOCAL_STORAGE"
  | "HYBRID_STORAGE"
  | "BACKUP_STORAGE";

export type MonitoringFeature =
  | "PROMETHEUS"
  | "GRAFANA"
  | "CLOUDWATCH"
  | "SENTRY"
  | "CUSTOM_MONITORING";

// Feature validation arrays
export const VALID_SECURITY_FEATURES: readonly SecurityFeature[] = [
  "ENTERPRISE_SECURITY",
  "STANDARD_SECURITY",
  "DEVELOPMENT_MODE",
  "TESTING_MODE",
  "COMPLIANCE_MODE",
  "ZERO_TRUST",
  "MULTI_REGION",
  "ADVANCED_MONITORING",
  "AUTO_ROTATION",
  "EMERGENCY_LOCKDOWN"
] as const;

export const VALID_CACHE_FEATURES: readonly CacheFeature[] = [
  "REDIS_CACHE",
  "MEMORY_CACHE",
  "DISTRIBUTED_CACHE",
  "NO_CACHE",
  "PERSISTENT_CACHE"
] as const;

export const VALID_AUDIT_FEATURES: readonly AuditFeature[] = [
  "FULL_AUDIT",
  "SECURITY_AUDIT",
  "PERFORMANCE_AUDIT",
  "COMPLIANCE_AUDIT",
  "MINIMAL_AUDIT"
] as const;

export const VALID_AUTH_FEATURES: readonly AuthFeature[] = [
  "AWS_SIGV4",
  "BASIC_AUTH",
  "OAUTH2",
  "MTLS",
  "API_KEY",
  "JWT_TOKEN"
] as const;

export const VALID_STORAGE_FEATURES: readonly StorageFeature[] = [
  "R2_STORAGE",
  "S3_STORAGE",
  "LOCAL_STORAGE",
  "HYBRID_STORAGE",
  "BACKUP_STORAGE"
] as const;

export const VALID_MONITORING_FEATURES: readonly MonitoringFeature[] = [
  "PROMETHEUS",
  "GRAFANA",
  "CLOUDWATCH",
  "SENTRY",
  "CUSTOM_MONITORING"
] as const;

// Security configuration interface
export interface SecurityConfig {
  security: SecurityFeature;
  cache: CacheFeature;
  audit: AuditFeature;
  auth: AuthFeature;
  storage: StorageFeature;
  monitoring: MonitoringFeature;
}

// Default configurations for different environments
export const DEFAULT_SECURITY_CONFIG: Record<string, SecurityConfig> = {
  development: {
    security: "DEVELOPMENT_MODE",
    cache: "MEMORY_CACHE",
    audit: "MINIMAL_AUDIT",
    auth: "BASIC_AUTH",
    storage: "LOCAL_STORAGE",
    monitoring: "CUSTOM_MONITORING"
  },
  production: {
    security: "ENTERPRISE_SECURITY",
    cache: "REDIS_CACHE",
    audit: "FULL_AUDIT",
    auth: "AWS_SIGV4",
    storage: "R2_STORAGE",
    monitoring: "PROMETHEUS"
  },
  test: {
    security: "TESTING_MODE",
    cache: "NO_CACHE",
    audit: "SECURITY_AUDIT",
    auth: "API_KEY",
    storage: "LOCAL_STORAGE",
    monitoring: "CUSTOM_MONITORING"
  }
};
