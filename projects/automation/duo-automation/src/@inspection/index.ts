/**
 * Index file for Inspection System
 * 
 * Main entry point that exports all inspection system components
 * and provides convenient access to the hierarchical inspection functionality.
 */

export { BUN_INSPECT_CUSTOM } from './symbols.js';
export { DomainContext } from './contexts/DomainContext.js';
export { ScopeContext } from './contexts/ScopeContext.js';
export { TypeContext } from './contexts/TypeContext.js';
export { MetaProperty } from './contexts/MetaProperty.js';
export { ClassRef } from './contexts/ClassRef.js';
export { InspectionCLI } from './cli.js';

// Re-export utilities and config
export * from './utils/paths.js';
export * from './config/scope.config.js';

// Default export for easy access
export { domainCtx } from './server.js';

/**
 * Create a new inspection context for a specific domain
 */
export function createInspectionContext(domain: string): DomainContext {
  return new DomainContext(domain);
}

/**
 * Get current inspection context
 */
export function getCurrentInspectionContext(): DomainContext {
  const { domainCtx } = require('./server.js');
  return domainCtx;
}

/**
 * Quick inspection utility
 */
export function inspectCurrent(options?: {
  depth?: number;
  colors?: boolean;
  maxArrayLength?: number;
}): string {
  const ctx = getCurrentInspectionContext();
  return Bun.inspect(ctx, {
    depth: options?.depth || 6,
    colors: options?.colors !== false,
    maxArrayLength: options?.maxArrayLength || 10,
  });
}

/**
 * Search inspection tree
 */
export function searchInspectionTree(query: string): Array<{
  path: string;
  match: string;
  type: string;
}> {
  const ctx = getCurrentInspectionContext();
  const results: Array<{ path: string; match: string; type: string }> = [];

  const searchInObject = (obj: any, path: string = '') => {
    if (obj && typeof obj === "object") {
      if (typeof obj[Symbol.for("Bun.inspect.custom")] === "function") {
        const custom = obj[Symbol.for("Bun.inspect.custom")]();
        searchInObject(custom, path);
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (key.toLowerCase().includes(query.toLowerCase()) || 
              (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase()))) {
            results.push({
              path: currentPath,
              match: key,
              type: typeof value
            });
          }
          
          searchInObject(value, currentPath);
        }
      }
    }
  };

  searchInObject(ctx);
  return results;
}
