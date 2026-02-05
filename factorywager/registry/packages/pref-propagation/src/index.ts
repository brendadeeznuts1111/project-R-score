#!/usr/bin/env bun
/**
 * 🔄 FactoryWager PREFERENCE PROPAGATION Package Entry Point
 */

export { PreferenceManager, preferenceManager } from './manager';
export type { PreferenceUpdate, PropagationResult } from './manager';
export { propagateProfile, propagateMultiLayer, batchPropagate, calculatePropagationConfidence, PREF_WEIGHTS } from './propagate';
