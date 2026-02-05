/**
 * Main Entry Point (New Modular Structure)
 *
 * This file now imports from the new modular core structure.
 * The original 509KB file has been archived in archive/old-core/
 */

// Re-export from modular core structure
export * from '../core/api';
export * from '../core/services';
export * from '../core/models';
export * from '../core/utils';

// Main application class
export {
  MainApplication,
  getApplication,
  cleanupApplication,
} from '../core/api/handlers/main-application';

// Legacy exports for backward compatibility
export { MainWorker } from '../core/api/handlers/main-handler';
