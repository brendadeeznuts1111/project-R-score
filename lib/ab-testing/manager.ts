import type { CookieInit } from 'bun';

export class ABTestManager {
  private cookies: Bun.CookieMap;
  private tests = new Map<
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
    this.cookies = new Bun.CookieMap(cookieHeader ?? '');
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
  }) {
    const {
      id,
      variants,
      weights = Array(variants.length).fill(100 / variants.length),
      cookieName = `ab_${id.replace(/[^a-z0-9]/gi, '_')}`,
      maxAgeDays = 30,
      secure = Bun.env.NODE_ENV === 'production',
      sameSite = 'lax',
      httpOnly = true,
    } = config;

    // Validate weights sum to 100
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(`Weights for test ${id} must sum to 100 (got ${sum})`);
    }

    this.tests.set(id, {
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
    const test = this.tests.get(testId);
    if (!test) throw new Error(`Test ${testId} not registered`);

    // Check existing assignment
    let variant = this.cookies.get(test.cookieName);
    if (variant && test.variants.includes(variant)) {
      return variant;
    }

    // Weighted random assignment
    variant = this.weightedRandom(test.variants, test.weights);

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

    this.cookies.set(init);

    return variant;
  }

  private weightedRandom<T>(items: T[], weights: number[]): T {
    let sum = 0;
    const cumulative: number[] = [];

    for (const w of weights) {
      sum += w;
      cumulative.push(sum);
    }

    const r = Math.random() * sum;
    for (let i = 0; i < cumulative.length; i++) {
      if (r <= cumulative[i]) return items[i];
    }

    return items[0]; // fallback (should never happen)
  }

  getAllAssignments(): Record<string, string> {
    const assignments: Record<string, string> = {};
    for (const [id, test] of this.tests) {
      const v = this.cookies.get(test.cookieName);
      if (v) assignments[id] = v;
    }
    return assignments;
  }

  forceAssign(testId: string, variant: string): void {
    const test = this.tests.get(testId);
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

    this.cookies.set(init);
  }

  clear(testId?: string): void {
    if (testId) {
      const test = this.tests.get(testId);
      if (test) this.cookies.delete(test.cookieName);
    } else {
      // Clear all A/B cookies
      for (const test of this.tests.values()) {
        this.cookies.delete(test.cookieName);
      }
    }
  }

  getSetCookieHeaders(): string[] {
    return this.cookies.toSetCookieHeaders();
  }
}
