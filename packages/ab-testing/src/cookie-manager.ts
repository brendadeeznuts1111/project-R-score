// lib/ab-testing/cookie-manager.ts — Backward-compatible wrapper around ABTestManager

import { ABTestManager } from './manager';

/**
 * Backward-compatible wrapper around ABTestManager.
 * Preserves the positional-args registerTest() signature used by existing consumers.
 */
export class ABTestingManager {
  private inner: ABTestManager;

  constructor(cookieString?: string) {
    this.inner = new ABTestManager(cookieString ?? null);
  }

  registerTest(
    testId: string,
    variants: string[],
    options?: { weights?: number[]; cookieName?: string; expiryDays?: number }
  ): void {
    const weights = options?.weights ?? Array(variants.length).fill(100 / variants.length);
    this.inner.registerTest({
      id: testId,
      variants,
      weights,
      cookieName: options?.cookieName,
      maxAgeDays: options?.expiryDays,
    });
  }

  getVariant(testId: string): string {
    return this.inner.getVariant(testId);
  }

  getAllAssignments(): Record<string, string> {
    return this.inner.getAllAssignments();
  }

  forceAssignVariant(testId: string, variant: string): void {
    this.inner.forceAssign(testId, variant);
  }

  clearAssignment(testId: string): void {
    this.inner.clear(testId);
  }

  getResponseHeaders(): string[] {
    return this.inner.getSetCookieHeaders();
  }
}
