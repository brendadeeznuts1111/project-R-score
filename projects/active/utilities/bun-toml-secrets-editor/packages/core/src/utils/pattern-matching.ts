/**
 * Pattern matching utilities with case patterns
 */

export interface Case<T, R> {
  when: (value: T) => boolean;
  then: (value: T) => R;
}

export interface Matcher<T, R> {
  case: (predicate: ((value: T) => boolean) | T, then: (value: T) => R) => Matcher<T, R>;
  default: (then: (value: T) => R) => R;
  otherwise: (then: (value: T) => R) => R;
  match: () => R;
}

/**
 * Create a pattern matcher for value-based pattern matching
 */
export function match<T, R = any>(value: T): Matcher<T, R> {
  const cases: Case<T, R>[] = [];
  let defaultCase: ((value: T) => R) | null = null;

  const matcher: Matcher<T, R> = {
    case(predicate, then) {
      const when = typeof predicate === 'function' 
        ? predicate as (value: T) => boolean
        : (val: T) => val === predicate;
      
      cases.push({ when, then });
      return matcher;
    },

    default(then) {
      defaultCase = then;
      return matcher;
    },

    otherwise(then) {
      defaultCase = then;
      return matcher;
    },

    match() {
      for (const { when, then } of cases) {
        if (when(value)) {
          return then(value);
        }
      }
      
      if (defaultCase) {
        return defaultCase(value);
      }
      
      throw new Error(`No matching case found for value: ${JSON.stringify(value)}`);
    }
  };

  return matcher;
}

/**
 * Type-safe pattern matching for discriminated unions
 */
export function matchType<T extends { type: string }, R = any>(
  value: T
): { 
  case<K extends T['type']>(type: K, then: (value: Extract<T, { type: K }>) => R): Matcher<T, R>;
  default(then: (value: T) => R): R;
  otherwise(then: (value: T) => R): R;
  match(): R;
} {
  const cases: Case<T, R>[] = [];
  let defaultCase: ((value: T) => R) | null = null;

  const matcher = {
    case(type: string, then: (value: any) => R) {
      cases.push({
        when: (val: T) => val.type === type,
        then: then as (value: T) => R
      });
      return matcher;
    },

    default(then: (value: T) => R) {
      defaultCase = then;
      return then(value) as R;
    },

    otherwise(then: (value: T) => R) {
      defaultCase = then;
      return then(value) as R;
    },

    match() {
      for (const { when, then } of cases) {
        if (when(value)) {
          return then(value);
        }
      }
      
      if (defaultCase) {
        return defaultCase(value);
      }
      
      throw new Error(`No matching type case found for: ${value.type}`);
    }
  };

  return matcher as any;
}

/**
 * Case classes for object-oriented pattern matching
 */
export abstract class CaseClass<T = any> {
  constructor(public readonly value: T) {}
  
  abstract matches(value: any): boolean;
  abstract extract(value: any): T | null;
}

/**
 * String pattern case
 */
export class StringCase extends CaseClass<string> {
  constructor(private readonly pattern: string) {
    super(pattern);
  }

  matches(value: any): boolean {
    return typeof value === 'string' && value === this.value;
  }

  extract(value: any): string | null {
    return this.matches(value) ? value : null;
  }
}

/**
 * RegExp pattern case
 */
export class RegExpCase extends CaseClass<RegExpMatchArray> {
  constructor(private readonly regex: RegExp) {
    super(regex);
  }

  matches(value: any): boolean {
    return typeof value === 'string' && this.regex.test(value);
  }

  extract(value: any): RegExpMatchArray | null {
    return this.matches(value) ? value.match(this.regex) : null;
  }
}

/**
 * Type guard pattern case
 */
export class TypeCase<T> extends CaseClass<T> {
  constructor(private readonly typeGuard: (value: any) => value is T) {
    super(null as any);
  }

  matches(value: any): boolean {
    return this.typeGuard(value);
  }

  extract(value: any): T | null {
    return this.matches(value) ? value : null;
  }
}

/**
 * Object property pattern case
 */
export class PropertyCase<K extends string, V> extends CaseClass<V> {
  constructor(
    private readonly property: K,
    private readonly predicate: (value: V) => boolean = () => true
  ) {
    super(null as any);
  }

  matches(value: any): boolean {
    return value && 
           typeof value === 'object' && 
           this.property in value && 
           this.predicate(value[this.property]);
  }

  extract(value: any): V | null {
    return this.matches(value) ? value[this.property] : null;
  }
}

/**
 * Utility functions for creating common patterns
 */
export const Case = {
  /**
   * Create a string equality case
   */
  string: (value: string) => new StringCase(value),

  /**
   * Create a regex pattern case
   */
  regex: (pattern: RegExp) => new RegExpCase(pattern),

  /**
   * Create a type guard case
   */
  is: <T>(guard: (value: any) => value is T) => new TypeCase(guard),

  /**
   * Create a property existence case
   */
  has: <K extends string>(property: K) => new PropertyCase(property),

  /**
   * Create a property value case
   */
  where: <K extends string, V>(
    property: K, 
    predicate: (value: V) => boolean
  ) => new PropertyCase(property, predicate),

  /**
   * Create a range case for numbers
   */
  range: (min: number, max: number) => ({
    matches: (value: any) => typeof value === 'number' && value >= min && value <= max,
    extract: (value: any) => (typeof value === 'number' && value >= min && value <= max) ? value : null
  }),

  /**
   * Create an array length case
   */
  length: (length: number) => ({
    matches: (value: any) => Array.isArray(value) && value.length === length,
    extract: (value: any) => (Array.isArray(value) && value.length === length) ? value : null
  })
};

/**
 * Example usage and type definitions
 */

// Example discriminated union
export type ApiResponse = 
  | { type: 'success'; data: any }
  | { type: 'error'; message: string }
  | { type: 'loading' };

// Example with discriminated unions
export function handleApiResponse(response: ApiResponse): string {
  return matchType(response)
    .case('success', ({ data }) => `Success: ${JSON.stringify(data)}`)
    .case('error', ({ message }) => `Error: ${message}`)
    .case('loading', () => 'Loading...')
    .match();
}

// Example with complex patterns
export function parseInput(input: unknown): string {
  return match(input)
    .case((value: any) => value === 'hello', () => 'Greeting received!')
    .case((value: any) => typeof value === 'string' && /^\d+$/.test(value), () => 'Number detected')
    .case((value: any) => Array.isArray(value), (value: unknown) => {
      const arr = value as any[];
      return `📦 Array with ${arr.length} items`;
    })
    .case((value: any) => value && typeof value === 'object' && 'status' in value, (obj: any) => `Object with status: ${obj.status}`)
    .default(() => 'Unknown input')
    .match();
}
