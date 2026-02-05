// src/index.ts - Main library exports
// Enhanced Bun 13-Byte Config System

// Core system
export * from "./immutable/config.zig";
export * from "./config/manager";
export * from "./bootstrap";

// Features and flags
export * from "./features/flags.zig";

// Terminal and PTY
export * from "./terminal/pty.zig";

// Logging and observability
export * from "./logging/logger";
export * from "./metrics/metrics";
export * from "./metrics/observability";

// Security and authentication
export * from "./auth/jwt";
export * from "./rate-limiting/rate-limiter";

// HTTP and networking
export * from "./http/compression";
export * from "./proxy/headers";
export * from "./proxy/validator";
export * from "./proxy/dns";
export * from "./proxy/middleware";

// Environment and configuration
export * from "./env/readonly";

// Error handling
export * from "./errors/error-classes";

// WebSocket subprotocol
export * from "./websocket/subprotocol";

// CLI tools (compiled)
export * from "../lib/cli/config";
export * from "../lib/cli/enhanced-cli";

// API definitions
export * from "./api/bun.d.ts";

// Registry components
export * from "../registry/api";
export * from "../registry/auth";

// Hash utilities
export * from "./hash";

// Bundle and build utilities
export * from "./bundle/feature_elimination";

// Legacy support
export * from "./cli/live";
export * from "./cli/upgrade";
