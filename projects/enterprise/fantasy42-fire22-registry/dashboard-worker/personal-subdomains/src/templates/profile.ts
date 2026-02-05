/**
 * Profile Template Entry Point (New Modular Structure)
 *
 * This file now imports from the new modular structure.
 * The original large file has been archived in archive/old-templates/
 */

// Re-export from the new modular structure
export { generateProfilePage } from '../../../ui/templates/profile-main';

// Import shared utilities
export * from '../../../ui/templates/profile-shared';
