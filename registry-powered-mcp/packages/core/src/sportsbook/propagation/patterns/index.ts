/**
 * Pattern Detectors Index
 * Exports all pattern detector implementations
 *
 * Pattern IDs: #70-89 (20 patterns across 5 categories)
 *
 * SYSCALL: PATTERN_DETECTORS_INDEX
 */

export { DerivativeDelaysDetector } from './derivative-delays';
export { CrossBookArbitrageDetector } from './cross-book-arbitrage';
export { TemporalInplayDetector } from './temporal-inplay';
export { PropComboDetector } from './prop-combo';
export { SteamBehavioralDetector } from './steam-behavioral';

import { DerivativeDelaysDetector } from './derivative-delays';
import { CrossBookArbitrageDetector } from './cross-book-arbitrage';
import { TemporalInplayDetector } from './temporal-inplay';
import { PropComboDetector } from './prop-combo';
import { SteamBehavioralDetector } from './steam-behavioral';
import type { PatternDetector } from '../half-life-tracker';

/**
 * Create all pattern detectors
 */
export function createAllDetectors(): PatternDetector[] {
  return [
    new DerivativeDelaysDetector(),
    new CrossBookArbitrageDetector(),
    new TemporalInplayDetector(),
    new PropComboDetector(),
    new SteamBehavioralDetector(),
  ];
}

/**
 * Register all detectors with a tracker
 */
export function registerAllDetectors(
  tracker: { registerDetector: (detector: PatternDetector) => void }
): void {
  for (const detector of createAllDetectors()) {
    tracker.registerDetector(detector);
  }
}
