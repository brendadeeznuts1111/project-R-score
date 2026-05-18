// src/core/index.ts - Core framework exports
export * from './dependency-injection';
export * from './performance-monitoring';
export * from './testing-utilities';

// Re-export commonly used utilities
export { createMockDeps, PROD_DEPS } from './dependency-injection';
export { diMonitor, DiPerformanceMonitor } from './performance-monitoring';
