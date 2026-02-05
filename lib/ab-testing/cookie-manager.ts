import type { CookieInit } from 'bun';

export class ABTestingManager {
  private cookies: Bun.CookieMap;
  
  // A/B test configurations
  private tests = new Map<string, {
    variants: string[];
    weights?: number[];
    cookieName: string;
    expiryDays: number;
  }>();

  constructor(cookieString?: string) {
    this.cookies = new Bun.CookieMap(cookieString);
  }

  /**
   * Register a new A/B test
   */
  registerTest(
    testId: string,
    variants: string[],
    options?: {
      weights?: number[];
      cookieName?: string;
      expiryDays?: number;
    }
  ): void {
    this.tests.set(testId, {
      variants,
      weights: options?.weights || Array(variants.length).fill(1),
      cookieName: options?.cookieName || `ab_test_${testId}`,
      expiryDays: options?.expiryDays || 30
    });
  }

  /**
   * Get or assign a variant for the current user
   */
  getVariant(testId: string): string {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test "${testId}" not registered`);
    }

    // Check if user already has a variant assigned
    const existingVariant = this.cookies.get(test.cookieName);
    if (existingVariant && test.variants.includes(existingVariant)) {
      return existingVariant;
    }

    // Assign new variant based on weights
    const variant = this.assignVariant(test.variants, test.weights);
    
    // Set cookie with variant assignment
    this.setVariantCookie(test.cookieName, variant, test.expiryDays);
    
    return variant;
  }

  /**
   * Weighted random variant assignment
   */
  private assignVariant(variants: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return variants[i];
      }
    }
    
    return variants[0]; // Fallback
  }

  /**
   * Set A/B test cookie with proper attributes
   */
  private setVariantCookie(name: string, value: string, expiryDays: number): void {
    const cookieOptions: CookieInit = {
      name,
      value,
      path: '/',
      maxAge: expiryDays * 24 * 60 * 60, // Convert days to seconds
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      partitioned: false
    };
    
    this.cookies.set(cookieOptions);
  }

  /**
   * Get all active test assignments for the user
   */
  getAllAssignments(): Record<string, string> {
    const assignments: Record<string, string> = {};
    
    for (const [testId, test] of this.tests) {
      const variant = this.cookies.get(test.cookieName);
      if (variant) {
        assignments[testId] = variant;
      }
    }
    
    return assignments;
  }

  /**
   * Force assign a variant (for testing/admin purposes)
   */
  forceAssignVariant(testId: string, variant: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test "${testId}" not registered`);
    }
    
    if (!test.variants.includes(variant)) {
      throw new Error(`Invalid variant "${variant}" for test "${testId}"`);
    }
    
    this.setVariantCookie(test.cookieName, variant, test.expiryDays);
  }

  /**
   * Clear A/B test assignment
   */
  clearAssignment(testId: string): void {
    const test = this.tests.get(testId);
    if (test) {
      this.cookies.delete(test.cookieName);
    }
  }

  /**
   * Get cookie headers for response
   */
  getResponseHeaders(): string[] {
    return this.cookies.toSetCookieHeaders();
  }
}
