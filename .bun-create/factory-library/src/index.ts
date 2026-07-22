/**
 * {{name}} — {{description}}
 */

let callCount = 0;

/** Returns a friendly greeting and increments the internal call counter. */
export function hello(name?: string): string {
  callCount++;
  return `Hello, ${name ?? "world"}!`;
}

/** Returns the number of times `hello()` has been called. */
export function getCallCount(): number {
  return callCount;
}

/** Resets the call counter to zero (used in test fixtures). */
export function resetCallCount(): void {
  callCount = 0;
}
