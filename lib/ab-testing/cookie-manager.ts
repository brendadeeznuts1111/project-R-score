// lib/ab-testing/cookie-manager.ts — Backward-compatible wrapper around ABTestManager

import { ABTestManager } from './manager';

/**
 * Backward-compatible wrapper around ABTestManager.
 * Preserves the positional-args registerTest() signature used by existing consumers.
 */
export class ABTestingManager {
  private _inner: ABTestManager;

  constructor(cookieString?: string) {
    this._inner = new ABTestManager(cookieString ?? null);
  }

  registerTest(
    testId: string,
    variants: string[],
    options?: { weights?: number[]; cookieName?: string; expiryDays?: number }
  ): void {
    const weights: number[] = options?.weights ?? Array.from({ length: variants.length }, () => 100 / variants.length);
    this._inner.registerTest({
      id: testId,
      variants,
      weights,
      cookieName: options?.cookieName,
      maxAgeDays: options?.expiryDays,
    });
  }

  getVariant(testId: string): string {
    return this._inner.getVariant(testId);
  }

  getAllAssignments(): Record<string, string> {
    return this._inner.getAllAssignments();
  }

  forceAssignVariant(testId: string, variant: string): void {
    this._inner.forceAssign(testId, variant);
  }

  clearAssignment(testId: string): void {
    this._inner.clear(testId);
  }

  getResponseHeaders(): string[] {
    return this._inner.getSetCookieHeaders();
  }
}
