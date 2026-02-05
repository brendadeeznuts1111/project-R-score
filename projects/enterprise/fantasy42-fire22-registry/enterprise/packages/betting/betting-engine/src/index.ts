/**
 * 🔥 Fantasy42-Fire22 Betting Engine
 * Core sports betting logic and validation
 *
 * @version 1.0.0
 * @author Fire22 Enterprise
 * @license MIT
 */

export * from './types/index.js';
export * from './odds/index.js';
export * from './wagers/index.js';
export * from './validation/index.js';
export * from './sports/index.js';

// Core betting engine class
export { Fantasy42BettingEngine } from './engine.js';

// Default export for convenience
import { Fantasy42BettingEngine } from './engine.js';
export default Fantasy42BettingEngine;
