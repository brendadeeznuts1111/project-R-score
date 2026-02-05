/**
 * Utility Functions for Inspection System
 * 
 * Provides path resolution and helper functions for the hierarchical
 * inspection system.
 */

/**
 * Generate scoped key for storage paths
 */
export function getScopedKey(property: string, scope: string = 'LOCAL-SANDBOX'): string {
  return `${scope}/${property}`;
}

/**
 * Resolve property path based on type and scope
 */
export function resolvePropertyPath(property: string, type: string, scope: string, domain: string): string {
  switch (type) {
    case 'STORAGE':
      return getScopedKey(property, scope);
    case 'SECRETS':
      return `${scope}/${property}`;
    case 'SERVICE':
      return `factory-wager-${scope}/${property}`;
    default:
      return `${scope}/${property}`;
  }
}

/**
 * Generate instance reference ID
 */
export function generateRefId(): number {
  return Math.floor(Math.random() * 1000000);
}

/**
 * Format inspection label with proper styling
 */
export function formatInspectLabel(type: string, value?: string): string {
  if (value) {
    return `[${type}:${value}]`;
  }
  return `[${type}]`;
}

/**
 * Get backend name for type
 */
export function getBackendForType(type: string): string {
  switch (type) {
    case 'STORAGE':
      return 'R2 / Local Mirror';
    case 'SECRETS':
      return 'Platform Credential Manager';
    case 'SERVICE':
      return 'Bun.spawn / IPC';
    default:
      return 'Unknown';
  }
}

/**
 * Get prefix for type and scope
 */
export function getPrefixForType(type: string, scope: string): string {
  switch (type) {
    case 'STORAGE':
      return `${scope.toLowerCase()}/`;
    case 'SECRETS':
      return `factory-wager-${scope.toLowerCase()}`;
    case 'SERVICE':
      return `factory-wager-${scope.toLowerCase()}`;
    default:
      return `${scope.toLowerCase()}/`;
  }
}
