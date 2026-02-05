/**
 * Global polyfills and extensions
 * Run this script via --preload to add global utilities
 */

// Extend String with useful methods
if (!String.prototype.capitalize) {
  String.prototype.capitalize = function (this: string): string {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
}

if (!String.prototype.slugify) {
  String.prototype.slugify = function (this: string): string {
    return this
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };
}

// Extend Array with useful methods
if (!Array.prototype.groupBy) {
  Array.prototype.groupBy = function<T, K extends string | number>(
    this: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    return this.reduce((result, item) => {
      const key = keyFn(item);
      (result[key] ??= []).push(item);
      return result;
    }, {} as Record<K, T[]>);
  };
}

if (!Array.prototype.unique) {
  Array.prototype.unique = function<T>(this: T[]): T[] {
    return [...new Set(this)];
  };
}

// Extend Date with formatting
if (!Date.prototype.format) {
  Date.prototype.format = function (this: Date, format = "ISO"): string {
    const pad = (n: number) => n.toString().padStart(2, "0");

    const replacements: Record<string, string> = {
      YYYY: this.getFullYear().toString(),
      MM: pad(this.getMonth() + 1),
      DD: pad(this.getDate()),
      HH: pad(this.getHours()),
      mm: pad(this.getMinutes()),
      ss: pad(this.getSeconds()),
    };

    if (format === "ISO") return this.toISOString();
    if (format === "locale") return this.toLocaleString();

    return Object.entries(replacements).reduce(
      (result, [key, value]) => result.replace(key, value),
      format
    );
  };
}

// Global utility for inspecting values
if (!globalThis.inspect) {
  globalThis.inspect = (value: unknown, depth = 2): string => {
    return String(Bun.inspect(value));
  };
}

// Global utility for timing
if (!globalThis.measure) {
  globalThis.measure = async <T>(
    name: string,
    fn: () => T | Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
    }
  };
}

// Type declarations for extensions
declare global {
  interface String {
    capitalize(): string;
    slugify(): string;
  }

  interface Array<T> {
    groupBy<K extends string | number>(keyFn: (item: T) => K): Record<K, T[]>;
    unique(): T[];
  }

  interface Date {
    format(format?: string): string;
  }

  var inspect: (value: unknown, depth?: number) => string;
  var measure: <T>(name: string, fn: () => T | Promise<T>) => Promise<T>;
}

export { };
