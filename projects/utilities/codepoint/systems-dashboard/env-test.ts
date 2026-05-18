#!/usr/bin/env bun
// env-test.ts - Enhanced environment variable injection testing

console.info("🔧 Enhanced Environment Variable Injection Testing");
console.info("=".repeat(50));

// Basic environment variables
console.info("📋 Basic Environment Variables:");
console.info("PUBLIC_API_URL:", process.env.PUBLIC_API_URL);
console.info("SECRET_KEY:", process.env.SECRET_KEY);
console.info("NODE_ENV:", process.env.NODE_ENV);
console.info("");

// Advanced environment variable patterns
console.info("🔍 Advanced Environment Patterns:");

// Public API configuration
const apiConfig = {
  url: process.env.PUBLIC_API_URL || "http://localhost:3000",
  version: process.env.PUBLIC_API_VERSION || "v1",
  timeout: parseInt(process.env.PUBLIC_API_TIMEOUT || "5000"),
  retries: parseInt(process.env.PUBLIC_API_RETRIES || "3"),
};

console.info("🌐 API Configuration:", apiConfig);

// Database configuration (should remain as process.env)
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD, // This should NOT be inlined
  database: process.env.DB_NAME || "dashboard",
};

console.info("🗄️ Database Configuration:", {
  ...dbConfig,
  password: dbConfig.password ? "***REDACTED***" : undefined,
});

// Feature flags
const features = {
  enableHealthMonitoring: process.env.PUBLIC_ENABLE_HEALTH === "true",
  enablePerformanceMetrics: process.env.PUBLIC_ENABLE_METRICS === "true",
  enableAdvancedDebugging: process.env.PUBLIC_DEBUG_MODE === "true",
  maintenanceMode: process.env.PUBLIC_MAINTENANCE === "true",
};

console.info("🚀 Feature Flags:", features);

// Build and deployment info
const buildInfo = {
  version: process.env.PUBLIC_VERSION || "1.0.0",
  buildNumber: process.env.PUBLIC_BUILD_NUMBER || "dev",
  commitHash: process.env.PUBLIC_COMMIT_HASH || "unknown",
  buildDate: process.env.PUBLIC_BUILD_DATE || new Date().toISOString(),
  environment: process.env.NODE_ENV || "development",
};

console.info("📦 Build Information:", buildInfo);

// Security headers and CORS
const securityConfig = {
  allowedOrigins: (
    process.env.PUBLIC_CORS_ORIGINS || "http://localhost:3000"
  ).split(","),
  maxAge: parseInt(process.env.PUBLIC_CORS_MAX_AGE || "86400"),
  credentials: process.env.PUBLIC_CORS_CREDENTIALS === "true",
};

console.info("🔒 Security Configuration:", securityConfig);

// Performance thresholds
const performanceThresholds = {
  responseTime: parseInt(
    process.env.PUBLIC_PERFORMANCE_RESPONSE_TIME || "2000"
  ),
  memoryUsage: parseInt(process.env.PUBLIC_PERFORMANCE_MEMORY || "80"),
  cpuUsage: parseInt(process.env.PUBLIC_PERFORMANCE_CPU || "70"),
  errorRate: parseFloat(process.env.PUBLIC_PERFORMANCE_ERROR_RATE || "0.05"),
};

console.info("⚡ Performance Thresholds:", performanceThresholds);

// Logging configuration
const loggingConfig = {
  level: process.env.PUBLIC_LOG_LEVEL || "info",
  format: process.env.PUBLIC_LOG_FORMAT || "json",
  enableConsole: process.env.PUBLIC_LOG_CONSOLE !== "false",
  enableFile: process.env.PUBLIC_LOG_FILE === "true",
};

console.info("📝 Logging Configuration:", loggingConfig);

// Cache configuration
const cacheConfig = {
  ttl: parseInt(process.env.PUBLIC_CACHE_TTL || "3600"),
  maxSize: parseInt(process.env.PUBLIC_CACHE_MAX_SIZE || "100"),
  strategy: process.env.PUBLIC_CACHE_STRATEGY || "lru",
};

console.info("💾 Cache Configuration:", cacheConfig);

// Health check intervals
const healthConfig = {
  checkInterval: parseInt(process.env.PUBLIC_HEALTH_CHECK_INTERVAL || "30000"),
  timeout: parseInt(process.env.PUBLIC_HEALTH_TIMEOUT || "5000"),
  retries: parseInt(process.env.PUBLIC_HEALTH_RETRIES || "3"),
  alertThreshold: parseFloat(
    process.env.PUBLIC_HEALTH_ALERT_THRESHOLD || "0.8"
  ),
};

console.info("🏥 Health Check Configuration:", healthConfig);

console.info("");
console.info("✅ Enhanced Environment Variable Testing Complete!");
console.info("");
console.info("🔧 Build Commands:");
console.info("  bun build --env=inline env-test.ts --outdir dist-inline");
console.info('  bun build --env="PUBLIC_*" env-test.ts --outdir dist-public');
console.info("  bun build --env=disable env-test.ts --outdir dist-disabled");
console.info("");
console.info("🔑 Environment Variables to Test:");
console.info("  export PUBLIC_API_URL=https://api.example.com");
console.info("  export PUBLIC_API_VERSION=v2");
console.info("  export PUBLIC_ENABLE_HEALTH=true");
console.info("  export SECRET_KEY=super-secret");
console.info("  export DB_HOST=localhost");
console.info("  export NODE_ENV=production");
