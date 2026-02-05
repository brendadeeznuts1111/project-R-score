// src/disputes/index.ts - Dispute system exports
export * from './deep-links';
export * from './resolution-matrix';
export * from './dashboard';

// Re-export commonly used classes
export { DeepLinkGenerator, DisputeSystem, DisputeDashboard } from './resolution-matrix';
