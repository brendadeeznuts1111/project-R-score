/**
 * T3-Lattice v3.4
 * Hidden Edge Detection System for Sports Markets
 * Enhanced with Bun Native APIs
 */

// Core exports
export * from './types';

// Engine exports
export { FractalEngine, computeBoxCountingFD, computeHurstExponent } from './engines/fractal-engine';

// Persona exports
export { HiddenLatticeFinder, type PersonaStats } from './persona/lattice-finder';

// Ingestion exports
export { MarketDataIngestor, DEC_29_GAMES, type IngestorConfig } from './ingestion/market-ingestor';

// Orchestrator exports
export { T3LatticeOrchestrator, runDec29Analysis } from './orchestrator';

// Server exports
export { createServer } from './server';

// Constants exports
export { QUANTUM_GLYPHS, findGlyphForFD, validateGlyph, getGlyphName } from './constants/glyph-patterns';

// Integration exports
export {
  PERSONA_INTEGRATION,
  COMPONENT_REGISTRY,
  getSLAReport,
  checkSLA,
  getComponent,
  type PersonaEdgeHunter,
  type PersonaBenchmarks,
  type SLAMatrix,
} from './integration/persona-integration';

// Systems exports
export {
  triggerBlackSwanAlert,
  getAlerts,
  getPendingReviews,
  acknowledgeAlert,
  clearAlerts,
  classifyFD,
  FD_THRESHOLDS,
} from './systems/black-swan-alert';

export {
  createQuantumAuditLog,
  verifyChainIntegrity,
  getAuditLog,
  getAuditStats,
  exportAuditLog,
  type QuantumAuditEntry,
} from './systems/quantum-audit';

// Version info
export const VERSION = '3.4.0';
export const CODENAME = 'Hidden Lattice Finder';
