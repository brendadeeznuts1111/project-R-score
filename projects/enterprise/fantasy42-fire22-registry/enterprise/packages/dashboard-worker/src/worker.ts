/**
 * Worker Entry Point (New Modular Structure)
 *
 * This file now imports from the new modular structure.
 * The original 150KB file has been archived in archive/old-core/
 */

// Import from modular infrastructure
export * from '../infrastructure/database';
export * from '../infrastructure/cache';
export * from '../infrastructure/storage';
export * from '../infrastructure/messaging';

// Main worker handler
export { default as mainHandler } from '../core/api/handlers/worker-handler';
