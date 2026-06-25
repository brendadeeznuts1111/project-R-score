// src/organized-index.ts - Organized entry point for FactoryWager Enterprise Components

// Core Framework
export * from './core';

// Dispute System
export * from './disputes';

// Monitoring System
export * from './monitoring';

// Registry System
export * from './registry';

// Re-export commonly used utilities
export { createMockDeps, PROD_DEPS } from './core/dependency-injection';
export { diMonitor, DiPerformanceMonitor } from './core/performance-monitoring';
export { DeepLinkGenerator, DisputeSystem, DisputeDashboard } from './disputes';
export { createHealthCheck, devDashboard } from './monitoring';

// Legacy exports for backward compatibility
export { createHealthCheck as createLegacyHealthCheck } from './index';
export { devDashboard as legacyDevDashboard } from './index';
