/**
 * [INSPECT][CORE][UTILITY]{BUN-API}
 * Bun.inspect() wrapper and utilities
 */

import type { InspectOptions, InspectResult } from "../types";

/**
 * Preset configurations for common inspection scenarios
 * [INSPECT][CORE][PRESETS]{BUN-NATIVE}
 */
const INSPECT_PRESETS = {
  log: {
    depth: 4,
    colors: Bun.isTTY,
    maxArrayLength: 20,
    maxStringLength: 500,
  },
  repl: {
    depth: 10,
    colors: Bun.isTTY,
    sorted: true,
  },
  compact: {
    depth: 2,
    colors: false,
    maxArrayLength: 5,
    maxStringLength: 100,
  },
} as const;

/**
 * Wrapper around Bun.inspect() with enhanced options and metrics
 * [INSPECT][CORE][METHOD][#REF:Bun.inspect]{BUN-NATIVE}
 */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  const mergedOptions = {
    depth: options.depth ?? 5,
    colors: options.colors ?? Bun.isTTY,
    sorted: options.sorted ?? false,
    maxArrayLength: options.maxArrayLength ?? 100,
    maxStringLength: options.maxStringLength ?? 10000,
  };

  // Use native Bun.inspect
  return Bun.inspect(value, {
    depth: mergedOptions.depth,
    colors: mergedOptions.colors,
    sorted: mergedOptions.sorted,
    maxArrayLength: mergedOptions.maxArrayLength,
    maxStringLength: mergedOptions.maxStringLength,
  });
}

/**
 * Inspect with full metrics and timing
 * [INSPECT][CORE][METHOD][#REF:InspectResult]{BUN-NATIVE}
 */
export function inspectWithMetrics(
  value: unknown,
  options: InspectOptions = {}
): InspectResult {
  const startTime = performance.now();
  const result = inspect(value, options);
  const duration = performance.now() - startTime;

  return {
    value: result,
    depth: options.depth ?? 5,
    colored: options.colors ?? Bun.isTTY,
    duration,
  };
}

/**
 * Create an inspect function with preset options
 * [INSPECT][CORE][FACTORY][#REF:createInspectPreset]{BUN-NATIVE}
 */
function createInspectPreset(
  presetOptions: InspectOptions
): (value: unknown) => string {
  return (value: unknown) => inspect(value, presetOptions);
}

/**
 * Inspect for logging with sensible defaults
 * [INSPECT][CORE][METHOD][#REF:inspectForLog]{BUN-NATIVE}
 */
export const inspectForLog = createInspectPreset(INSPECT_PRESETS.log);

/**
 * Inspect for REPL with full depth
 * [INSPECT][CORE][METHOD][#REF:inspectForRepl]{BUN-NATIVE}
 */
export const inspectForRepl = createInspectPreset(INSPECT_PRESETS.repl);

/**
 * Inspect for compact output
 * [INSPECT][CORE][METHOD][#REF:inspectCompact]{BUN-NATIVE}
 */
export const inspectCompact = createInspectPreset(INSPECT_PRESETS.compact);

/**
 * Check if value is inspectable
 * [INSPECT][CORE][METHOD][#REF:isInspectable]{BUN-NATIVE}
 */
export function isInspectable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value === "object" || typeof value === "function";
}

/**
 * Get inspection size estimate
 * [INSPECT][CORE][METHOD][#REF:getInspectionSize]{BUN-NATIVE}
 */
export function getInspectionSize(value: unknown): number {
  const inspected = inspect(value);
  return new TextEncoder().encode(inspected).length;
}

/**
 * Export preset factory for advanced use cases
 * [INSPECT][CORE][EXPORT][#REF:createInspectPreset]{BUN-NATIVE}
 */
export { createInspectPreset };
