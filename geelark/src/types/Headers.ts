/**
 * Bun Headers Type Definitions
 *
 * This file provides proper TypeScript type definitions for Bun's Headers API
 * matching the official Bun specification at https://bun.sh/reference/bun/HeadersInit
 */

// HeadersInit type - accepts multiple initialization formats
export type HeadersInit = string[][] | Record<string, string | ReadonlyArray<string>> | globalThis.Headers;

// HeadersIterator type for iteration methods
export interface HeadersIterator<T> extends Iterator<T> {
  [Symbol.iterator](): Iterator<T>;
}

// Main Headers interface matching Bun's implementation
export interface BunHeaders {
  /**
   * Get the total number of headers
   */
  readonly count: number;

  /**
   * Symbol.iterator for default iteration (entries)
   */
  [Symbol.iterator](): HeadersIterator<[string, string]>;

  /**
   * Append a header value
   * @param name Header name
   * @param value Header value
   */
  append(name: string, value: string): void;

  /**
   * Delete a header
   * @param name Header name
   */
  delete(name: string): void;

  /**
   * Get iterator for key/value pairs
   */
  entries(): HeadersIterator<[string, string]>;

  /**
   * forEach callback for iteration
   * @param callbackfn Function to call for each header
   * @param thisArg Optional this context
   */
  forEach(callbackfn: (value: string, key: string, parent: BunHeaders) => void, thisArg?: any): void;

  /**
   * Get a header value
   * @param name Header name
   * @returns Header value or null if not found
   */
  get(name: string): null | string;

  /**
   * Get all headers matching the name
   * Only supports "Set-Cookie". All other headers return empty arrays.
   * @param name Header name (must be 'set-cookie' or 'Set-Cookie')
   * @returns Array of header values
   */
  getAll(name: 'set-cookie' | 'Set-Cookie'): string[];

  /**
   * Get all Set-Cookie headers
   * @returns Array of Set-Cookie header values
   */
  getSetCookie(): string[];

  /**
   * Check if header exists
   * @param name Header name
   * @returns True if header exists
   */
  has(name: string): boolean;

  /**
   * Get iterator for header keys
   */
  keys(): HeadersIterator<string>;

  /**
   * Set a header value (overwrites existing)
   * @param name Header name
   * @param value Header value
   */
  set(name: string, value: string): void;

  /**
   * Convert Headers to plain JavaScript object
   * About 10x faster than Object.fromEntries(headers.entries())
   * Called when JSON.stringify(headers) is used
   * Does not preserve insertion order. Well-known header names are lowercased.
   */
  toJSON(): Record<string, string> & { 'set-cookie': string[] };

  /**
   * Get iterator for header values
   */
  values(): HeadersIterator<string>;
}

// Constructor interface for creating new Headers instances
export interface HeadersConstructor {
  /**
   * Create new Headers instance
   * @param init Optional initialization data
   */
  new(init?: HeadersInit): BunHeaders;
}

// Type alias for convenience - use BunHeaders to avoid conflicts
export type Headers = BunHeaders;
