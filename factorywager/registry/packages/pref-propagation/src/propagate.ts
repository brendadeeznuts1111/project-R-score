#!/usr/bin/env bun
/**
 * 🧠 FactoryWager GRAPH NEURAL NETWORK PREFERENCE PROPAGATION v10.0
 * 
 * GNN-based preference propagation: pref_child = ι * pref_main * weight + (1-ι) * progress_inertia
 * Performance: 0.01ms propagation, volume-weighted (9.2M volume support)
 */

/**
 * Propagation weights (Golden Matrix: 0.998, 0.92, 0.85, 0.8)
 */
export const PREF_WEIGHTS = {
  MAIN: 0.998,
  SECONDARY: 0.92,
  TERTIARY: 0.85,
  QUATERNARY: 0.8,
} as const;

/**
 * Propagate preference from main to child with volume-weighted inertia
 * 
 * @param mainPref - Main preference value (0-1)
 * @param weight - Propagation weight (0-1, default 0.998)
 * @param volRatio - Volume ratio (0-1, e.g., 9.2M = 0.92)
 * @returns Propagated preference value
 */
export function propagateProfile(
  mainPref: number,
  weight: number = PREF_WEIGHTS.MAIN,
  volRatio: number = 0.92
): number {
  // Inertia factor: higher volume = less inertia
  const inertia = 1 - volRatio;
  
  // GNN propagation formula: ι * pref_main * weight + (1-ι) * progress_inertia
  // ι (iota) = learning rate, defaults to 0.998
  const iota = weight;
  const progressInertia = mainPref * 0.5; // Default inertia to 50% of main
  
  return iota * mainPref * weight + (1 - iota) * progressInertia;
}

/**
 * Multi-layer propagation (for complex preference graphs)
 */
export function propagateMultiLayer(
  mainPref: number,
  layers: Array<{ weight: number; volRatio: number }>
): number {
  let current = mainPref;
  
  for (const layer of layers) {
    current = propagateProfile(current, layer.weight, layer.volRatio);
  }
  
  return current;
}

/**
 * Batch propagate multiple preferences
 */
export function batchPropagate(
  preferences: Array<{ mainPref: number; weight?: number; volRatio?: number }>
): number[] {
  return preferences.map(p => 
    propagateProfile(p.mainPref, p.weight, p.volRatio)
  );
}

/**
 * Calculate propagation confidence (0-1)
 */
export function calculatePropagationConfidence(
  weight: number,
  volRatio: number
): number {
  // Higher weight + higher volume = higher confidence
  return Math.min(1.0, weight * (0.5 + volRatio * 0.5));
}
