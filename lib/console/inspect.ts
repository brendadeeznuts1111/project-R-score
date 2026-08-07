// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/console#object-inspection-depth
/**
 * Bun.inspect wrappers with project depth + ANSI gate.
 */
import { inspect as bunInspect } from 'bun';
import { type InspectOptions, resolveInspectOptions } from './depth.ts';

/**
 * Bun.inspect with project depth + ANSI gate.
 * Prefer over raw `console.log(obj)` for harness output.
 */
export function inspect<T>(value: T, options: InspectOptions = {}): string {
  return bunInspect(value, resolveInspectOptions(options));
}

/** console.log replacement with project depth (via inspect string). */
export function logDepth<T>(value: T, options: InspectOptions = {}): void {
  console.info(inspect(value, options));
}

/** Single-line compact log (`compact: true`). */
export function logCompact<T>(value: T, options: InspectOptions = {}): void {
  console.info(inspect(value, { compact: true, ...options }));
}

/**
 * Alias of Bun.inspect.custom for `[inspectCustom]()` overrides.
 * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
 */
export const inspectCustom = bunInspect.custom;
