/**
 * infrastructure/v1-3-3/object-spread-nullish-fix.ts
 * Component #94: Object-Spread-Nullish-Fix
 * Level 3: Build | CPU: O(n) | ES2020
 * Prevents invalid JS from {...k, a: k?.x ?? {}}
 */


// Helper to check if feature is enabled
function isFeatureEnabled(): boolean {
  return process.env.FEATURE_OBJECT_SPREAD_NULLISH === "1" || process.env.FEATURE_OBJECT_SPREAD_NULLISH === "1";
}

// Object Spread Nullish Fix for ES2020 compatibility
export class ObjectSpreadNullishFix {
  private static validationCount = 0;
  private static fixedCount = 0;

  // Safely spread objects with nullish coalescing
  static safeSpread<T extends Record<string, any>, U extends Record<string, any>>(
    target: T,
    source?: U | null,
    fallback: Partial<U> = {} as Partial<U>
  ): T & Record<string, any> {
    if (!isFeatureEnabled()) {
      // Fallback: basic spread with null check
      return { ...target, ...(source || {}) };
    }

    this.validationCount++;

    // Handle null/undefined source
    if (source === null || source === undefined) {
      return { ...target, ...fallback };
    }

    // Validate source is an object
    if (typeof source !== "object" || Array.isArray(source)) {
      console.warn(`⚠️  Invalid spread source, using fallback:`, source);
      this.fixedCount++;
      return { ...target, ...fallback };
    }

    // Check for circular references
    if (this.hasCircularReference(source)) {
      console.warn(`⚠️  Circular reference detected in spread source`);
      this.fixedCount++;
      return { ...target, ...fallback };
    }

    // Perform safe spread
    try {
      return { ...target, ...source };
    } catch (error) {
      console.error(`❌ Spread failed: ${error}, using fallback`);
      this.fixedCount++;
      return { ...target, ...fallback };
    }
  }

  // Safe optional chaining with spread
  static safeOptionalSpread<T extends Record<string, any>>(
    base: T | null | undefined,
    ...spreads: Array<Record<string, any> | null | undefined>
  ): Partial<T> {
    if (!isFeatureEnabled()) {
      // Fallback: basic optional spread
      const result: any = {};
      if (base) Object.assign(result, base);
      for (const spread of spreads) {
        if (spread) Object.assign(result, spread);
      }
      return result;
    }

    const result: any = {};

    // Handle base
    if (base && typeof base === "object" && !Array.isArray(base)) {
      Object.assign(result, base);
    }

    // Handle spreads
    for (const spread of spreads) {
      if (spread && typeof spread === "object" && !Array.isArray(spread)) {
        // Validate each spread
        if (this.hasCircularReference(spread)) {
          console.warn(`⚠️  Circular reference in optional spread, skipping`);
          this.fixedCount++;
          continue;
        }

        try {
          Object.assign(result, spread);
        } catch (error) {
          console.error(`❌ Optional spread failed: ${error}`);
          this.fixedCount++;
        }
      }
    }

    return result;
  }

  // Fix common spread anti-patterns
  static fixSpreadPattern(code: string): string {
    if (!isFeatureEnabled()) {
      return code;
    }

    let fixed = code;

    // Pattern 1: {...obj, key: obj?.prop ?? {}} - often invalid
    // Fix: {...obj, key: obj?.prop ?? {}}
    // But if obj is null/undefined, this becomes {...null, key: {}} which is invalid
    // Fix: obj ? {...obj, key: obj.prop ?? {}} : {key: {}}

    const pattern1 = /\{\s*\.\.\.(\w+)\s*,\s*(\w+)\s*:\s*\1\?\.(\w+)\s*\?\?\s*\{\}\s*\}/g;
    fixed = fixed.replace(pattern1, (match, obj, key, prop) => {
      this.fixedCount++;
      return `${obj} ? {...${obj}, ${key}: ${obj}.${prop} ?? {}} : {${key}: {}}`;
    });

    // Pattern 2: {...null} or {...undefined}
    const pattern2 = /\{\s*\.\.\.(null|undefined)\s*\}/g;
    fixed = fixed.replace(pattern2, (match) => {
      this.fixedCount++;
      return '{}';
    });

    // Pattern 3: {...(condition ? obj : null)}
    const pattern3 = /\{\s*\.\.\.\(\s*([^)]+)\s*\?\s*([^:]+)\s*:\s*(null|undefined)\s*\)\s*\}/g;
    fixed = fixed.replace(pattern3, (match, condition, obj, nullVal) => {
      this.fixedCount++;
      return `(${condition}) ? {...${obj}} : {}`;
    });

    return fixed;
  }

  // Validate spread operation before execution
  static validateSpread(...objects: any[]): {
    valid: boolean;
    issues: string[];
    safeObjects: any[];
  } {
    const issues: string[] = [];
    const safeObjects: any[] = [];

    if (!isFeatureEnabled()) {
      return { valid: true, issues: [], safeObjects: objects };
    }

    for (const obj of objects) {
      // Check for null/undefined
      if (obj === null || obj === undefined) {
        issues.push(`Null/undefined value in spread`);
        continue;
      }

      // Check for non-objects
      if (typeof obj !== "object") {
        issues.push(`Non-object value (${typeof obj}) in spread`);
        continue;
      }

      // Check for arrays (can be spread but may cause issues)
      if (Array.isArray(obj)) {
        issues.push(`Array in spread (may cause unexpected behavior)`);
        safeObjects.push(obj);
        continue;
      }

      // Check for circular references
      if (this.hasCircularReference(obj)) {
        issues.push(`Circular reference detected`);
        this.fixedCount++;
        continue;
      }

      // Check for getters that might throw
      try {
        const keys = Object.keys(obj);
        for (const key of keys) {
          // Try to access the property
          const descriptor = Object.getOwnPropertyDescriptor(obj, key);
          if (descriptor && descriptor.get) {
            // This is a getter, try to invoke it
            void obj[key];
          }
        }
        safeObjects.push(obj);
      } catch (error) {
        issues.push(`Property access error: ${error}`);
        this.fixedCount++;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      safeObjects,
    };
  }

  // Perform validated spread
  static validatedSpread<T extends Record<string, any>>(
    target: T,
    ...sources: Array<Record<string, any> | null | undefined>
  ): Partial<T> & Record<string, any> {
    if (!isFeatureEnabled()) {
      return { ...target, ...Object.assign({}, ...sources.filter(s => s)) };
    }

    const validation = this.validateSpread(target, ...sources);

    if (!validation.valid) {
      console.warn(`⚠️  Spread validation issues:`, validation.issues);
    }

    // Use only safe objects
    const result: any = {};
    for (const obj of validation.safeObjects) {
      try {
        Object.assign(result, obj);
      } catch (error) {
        console.error(`❌ Failed to assign object: ${error}`);
        this.fixedCount++;
      }
    }

    return result;
  }

  // Check for circular references
  private static hasCircularReference(obj: any, seen: Set<any> = new Set()): boolean {
    if (obj === null || typeof obj !== "object") {
      return false;
    }

    if (seen.has(obj)) {
      return true;
    }

    seen.add(obj);

    try {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (typeof value === "object" && value !== null) {
          if (this.hasCircularReference(value, new Set(seen))) {
            return true;
          }
        }
      }
    } catch {
      // If we can't iterate, assume it's safe
      return false;
    }

    return false;
  }

  // Get spread statistics
  static getStats(): {
    validationCount: number;
    fixedCount: number;
    featureEnabled: boolean;
  } {
    return {
      validationCount: this.validationCount,
      fixedCount: this.fixedCount,
      featureEnabled: isFeatureEnabled(),
    };
  }

  // Create a safe spread builder
  static createSafeSpreadBuilder<T extends Record<string, any>>() {
    return {
      base: null as T | null,
      spreads: [] as Array<Partial<T>>,

      setBase(base: T | null | undefined) {
        this.base = base || null;
        return this;
      },

      addSpread(spread: Partial<T> | null | undefined) {
        if (spread) {
          this.spreads.push(spread);
        }
        return this;
      },

      build(): Partial<T> {
        return ObjectSpreadNullishFix.safeOptionalSpread(this.base, ...this.spreads);
      },

      validate() {
        return ObjectSpreadNullishFix.validateSpread(this.base, ...this.spreads);
      }
    };
  }

  // Deep merge with spread safety
  static deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T> | null | undefined,
    options: {
      maxDepth?: number;
      arrayStrategy?: 'merge' | 'replace' | 'concat';
    } = {}
  ): T {
    if (!isFeatureEnabled()) {
      return { ...target, ...(source || {}) } as T;
    }

    const { maxDepth = 10, arrayStrategy = 'replace' } = options;

    if (source === null || source === undefined) {
      return target;
    }

    if (maxDepth <= 0) {
      console.warn(`⚠️  Max depth reached in deep merge`);
      return { ...target, ...source } as T;
    }

    const result: any = { ...target };

    for (const key of Object.keys(source)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      // Handle arrays
      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        switch (arrayStrategy) {
          case 'merge':
            result[key] = [...targetValue, ...sourceValue];
            break;
          case 'concat':
            result[key] = [targetValue, sourceValue];
            break;
          case 'replace':
          default:
            result[key] = sourceValue;
            break;
        }
        continue;
      }

      // Handle objects
      if (
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue) &&
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = this.deepMerge(targetValue, sourceValue, {
          maxDepth: maxDepth - 1,
          arrayStrategy,
        });
        continue;
      }

      // Handle primitives and other cases
      result[key] = sourceValue;
    }

    return result;
  }
}

// Zero-cost export
export const objectSpreadFix = isFeatureEnabled()
  ? ObjectSpreadNullishFix
  : {
      safeSpread: (target: any, source?: any, fallback: any = {}) => {
        return { ...target, ...(source || fallback) };
      },
      safeOptionalSpread: (base: any, ...spreads: any[]) => {
        const result: any = {};
        if (base) Object.assign(result, base);
        for (const spread of spreads) {
          if (spread) Object.assign(result, spread);
        }
        return result;
      },
      fixSpreadPattern: (code: string) => code,
      validateSpread: (...objects: any[]) => ({
        valid: true,
        issues: [],
        safeObjects: objects.filter(o => o !== null && o !== undefined),
      }),
      validatedSpread: (target: any, ...sources: any[]) => {
        return { ...target, ...Object.assign({}, ...sources.filter(s => s)) };
      },
      getStats: () => ({ validationCount: 0, fixedCount: 0, featureEnabled: false }),
      createSafeSpreadBuilder: () => ({
        base: null,
        spreads: [],
        setBase(b: any) { this.base = b; return this; },
        addSpread(s: any) { if (s) this.spreads.push(s); return this; },
        build() {
          const result: any = {};
          if (this.base) Object.assign(result, this.base);
          for (const s of this.spreads) Object.assign(result, s);
          return result;
        },
        validate() { return { valid: true, issues: [], safeObjects: [] }; }
      }),
      deepMerge: (target: any, source: any, options: any = {}) => {
        return { ...target, ...(source || {}) };
      },
    };
