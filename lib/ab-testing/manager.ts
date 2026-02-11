// lib/ab-testing/manager.ts — A/B test manager with cookie-based variant assignment

import type { CookieInit } from 'bun';

export class ABTestManager {
  private _cookies: Bun.CookieMap;
  private _tests = new Map<
    string,
    {
      id: string;
      variants: string[];
      weights: number[]; // must sum to 100
      cookieName: string;
      maxAgeDays: number;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
      httpOnly: boolean;
    }
  >();

  constructor(cookieHeader: string | null = null) {
    this._cookies = new Bun.CookieMap(cookieHeader ?? '');
  }

  registerTest(config: {
    id: string;
    variants: string[];
    weights?: number[]; // defaults to equal distribution
    cookieName?: string;
    maxAgeDays?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    httpOnly?: boolean;
  }): void {
    const {
      id,
      variants,
      weights = Array.from({ length: variants.length }, () => 100 / variants.length),
      cookieName = `ab_${id.replace(/[^a-z0-9]/gi, '_')}`,
      maxAgeDays = 30,
      secure = Bun.env.NODE_ENV === 'production',
      sameSite = 'lax',
      httpOnly = true,
    } = config;

    // Validate weights sum to 100
    const sum = weights.reduce((acc: number, value: number) => acc + value, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(`Weights for test ${id} must sum to 100 (got ${sum})`);
    }

    this._tests.set(id, {
      id,
      variants,
      weights,
      cookieName,
      maxAgeDays,
      secure,
      sameSite,
      httpOnly,
    });
  }

  getVariant(testId: string): string {
    const test = this._tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not registered`);

    // Check existing assignment
    const existingVariant = this._cookies.get(test.cookieName);
    if (typeof existingVariant === 'string' && test.variants.includes(existingVariant)) {
      return existingVariant;
    }

    // Weighted random assignment
    const variant = this._weightedRandom(test.variants, test.weights);

    // Set persistent cookie
    const init: CookieInit = {
      name: test.cookieName,
      value: variant,
      path: '/',
      maxAge: test.maxAgeDays * 24 * 60 * 60,
      secure: test.secure,
      sameSite: test.sameSite,
      httpOnly: test.httpOnly,
      partitioned: false,
    };

    this._cookies.set(init);

    return variant;
  }

  private _weightedRandom(items: string[], weights: number[]): string {
    let sum = 0;
    const cumulative: number[] = [];

    for (const w of weights) {
      sum += w;
      cumulative.push(sum);
    }

    const r = Math.random() * sum;
    for (let i = 0; i < cumulative.length; i++) {
      if (r <= cumulative[i]) {
        const item = items[i];
        if (item !== undefined) return item;
      }
    }

    const fallback = items[0];
    if (fallback === undefined) {
      throw new Error('Cannot select weighted random item from empty collection');
    }
    return fallback;
  }

  getAllAssignments(): Record<string, string> {
    const assignments: Record<string, string> = {};
    for (const [id, test] of this._tests) {
      const value = this._cookies.get(test.cookieName);
      if (typeof value === 'string') assignments[id] = value;
    }
    return assignments;
  }

  forceAssign(testId: string, variant: string): void {
    const test = this._tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not registered`);
    if (!test.variants.includes(variant)) {
      throw new Error(`Invalid variant ${variant} for test ${testId}`);
    }

    const init: CookieInit = {
      name: test.cookieName,
      value: variant,
      path: '/',
      maxAge: test.maxAgeDays * 24 * 60 * 60,
      secure: test.secure,
      sameSite: test.sameSite,
      httpOnly: test.httpOnly,
    };

    this._cookies.set(init);
  }

  clear(testId?: string): void {
    if (testId) {
      const test = this._tests.get(testId);
      if (test) this._cookies.delete(test.cookieName);
    } else {
      // Clear all A/B cookies
      for (const test of this._tests.values()) {
        this._cookies.delete(test.cookieName);
      }
    }
  }

  getSetCookieHeaders(): string[] {
    return this._cookies.toSetCookieHeaders();
  }
}
