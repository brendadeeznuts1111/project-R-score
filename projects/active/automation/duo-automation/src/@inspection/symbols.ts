/**
 * Shared Symbol for Bun Inspection System
 * 
 * Provides the custom inspection symbol used across all context classes
 * for deep, structured, and context-aware inspection.
 */

export const BUN_INSPECT_CUSTOM = Symbol.for("Bun.inspect.custom");

/**
 * Inspection Matrix Table
 * 
 * Shows the hierarchical structure and symbol implementation across all layers:
 * 
 * ┌─────────────────┬──────────────────┬─────────────────┬──────────────────┐
 * │ Layer           │ Class            │ Symbol          │ Label Format    │
 * ├─────────────────┼──────────────────┼─────────────────┼──────────────────┤
 * │ [DOMAIN]        │ DomainContext    │ ✅ BUN_INSPECT  │ "[DOMAIN]"       │
 * │ [SCOPE]         │ ScopeContext     │ ✅ BUN_INSPECT  │ "[SCOPE]"        │
 * │ [TYPE:STORAGE]  │ TypeContext      │ ✅ BUN_INSPECT  │ "[TYPE:STORAGE]" │
 * │ [TYPE:SECRETS]  │ TypeContext      │ ✅ BUN_INSPECT  │ "[TYPE:SECRETS]" │
 * │ [TYPE:SERVICE]  │ TypeContext      │ ✅ BUN_INSPECT  │ "[TYPE:SERVICE]" │
 * │ [META:{PROP}]   │ MetaProperty     │ ✅ BUN_INSPECT  │ "[META:{...}]"  │
 * │ [CLASS]         │ ClassRef         │ ✅ BUN_INSPECT  │ "[CLASS]"        │
 * │ [#REF:*]        │ ClassRef         │ ✅ BUN_INSPECT  │ "[#REF:1]"       │
 * └─────────────────┴──────────────────┴─────────────────┴──────────────────┘
 * 
 * Schema: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
 * 
 * Each layer implements the custom symbol to provide rich, structured output
 * with proper labeling and hierarchical nesting.
 */

/**
 * Additional inspection symbols for enhanced functionality
 */
export const INSPECT_DEPTH = Symbol.for("factory-wager.inspect.depth");
export const INSPECT_COLORS = Symbol.for("factory-wager.inspect.colors");
export const INSPECT_META = Symbol.for("factory-wager.inspect.meta");

/**
 * Type guard for inspectable objects
 */
export function isInspectable(obj: any): obj is { [BUN_INSPECT_CUSTOM]: Function } {
  return obj && typeof obj === 'object' && typeof obj[BUN_INSPECT_CUSTOM] === 'function';
}

/**
 * Helper to create inspectable objects with custom symbol
 */
export function makeInspectable<T extends Record<string, any>>(
  obj: T,
  inspector: () => any
): T & { [BUN_INSPECT_CUSTOM]: Function } {
  return Object.assign(obj, {
    [BUN_INSPECT_CUSTOM]: inspector
  });
}
