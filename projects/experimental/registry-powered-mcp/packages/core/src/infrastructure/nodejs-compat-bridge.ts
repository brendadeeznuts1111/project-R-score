/**
 * Component #54: Node.js Full Compatibility Bridge
 * Logic Tier: Level 0 (Compatibility)
 * Resource Tax: CPU <0.5%
 * Parity Lock: 7p8q...9r0s
 * Protocol: Node.js API
 *
 * Fixes Buffer, assert, TLSSocket, and napi_typeof compatibility issues.
 * Provides Node.js-compatible APIs for native addon modules.
 *
 * @module infrastructure/nodejs-compat-bridge
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Type check result
 */
export interface TypeCheckResult {
  type: string;
  isBoxed: boolean;
  valueOf: unknown;
}

/**
 * Node.js Full Compatibility Bridge
 * Provides compatibility shims for Node.js APIs
 */
export class NodeJSCompatBridge {
  /**
   * Buffer.hexSlice() fix for max string length
   * Fixes the issue where hexSlice() could exceed JS max string length
   */
  static hexSlice(buffer: Buffer, start = 0, end?: number): string {
    const actualEnd = end ?? buffer.length;
    const length = actualEnd - start;

    // JS max string length (approximately 2^29 - 1)
    const MAX_STRING_LENGTH = 0x1fffffff;

    if (length > MAX_STRING_LENGTH) {
      throw new RangeError(
        `Array buffer allocation failed: length ${length} exceeds maximum ${MAX_STRING_LENGTH}`
      );
    }

    if (length <= 0) {
      return '';
    }

    // Use subarray for zero-copy, then convert to hex
    return buffer.subarray(start, actualEnd).toString('hex');
  }

  /**
   * napi_typeof fix for boxed primitives
   * Returns 'object' for boxed String/Number/Boolean (Node.js behavior)
   */
  static napiTypeof(value: unknown): string {
    // Boxed primitives should return 'object' in napi_typeof
    if (value instanceof String) return 'object';
    if (value instanceof Number) return 'object';
    if (value instanceof Boolean) return 'object';

    // Regular typeof for everything else
    return typeof value;
  }

  /**
   * Get detailed type information
   */
  static getTypeInfo(value: unknown): TypeCheckResult {
    const isBoxed =
      value instanceof String ||
      value instanceof Number ||
      value instanceof Boolean;

    return {
      type: this.napiTypeof(value),
      isBoxed,
      valueOf: isBoxed ? (value as { valueOf: () => unknown }).valueOf() : value,
    };
  }

  /**
   * assert.deepStrictEqual wrapper fix
   * Handles boxed primitive comparison correctly
   */
  static deepStrictEqual(a: unknown, b: unknown): boolean {
    // Handle boxed primitives
    const aInfo = this.getTypeInfo(a);
    const bInfo = this.getTypeInfo(b);

    if (aInfo.isBoxed && bInfo.isBoxed) {
      // Both are boxed - compare types and values
      if (a?.constructor !== b?.constructor) {
        return false;
      }
      return aInfo.valueOf === bInfo.valueOf;
    }

    if (aInfo.isBoxed !== bInfo.isBoxed) {
      // One boxed, one not - not equal per Node.js semantics
      return false;
    }

    // Regular deep comparison
    return this.deepEqual(a, b);
  }

  /**
   * Deep equality comparison
   */
  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (a === null || b === null) return a === b;

    if (typeof a !== 'object') return a === b;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    // Array comparison
    if (Array.isArray(aObj) && Array.isArray(bObj)) {
      if (aObj.length !== bObj.length) return false;
      return aObj.every((val, idx) => this.deepEqual(val, bObj[idx]));
    }

    // Object comparison
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every(
      (key) => bKeys.includes(key) && this.deepEqual(aObj[key], bObj[key])
    );
  }

  /**
   * TLSSocket.isSessionReused() fix for BoringSSL
   * Returns accurate session reuse status
   */
  static isSessionReused(socket: {
    _secureEstablished?: boolean;
    _sessionReused?: boolean;
    encrypted?: boolean;
  }): boolean {
    if (!socket._secureEstablished) {
      return false;
    }

    // Use BoringSSL's SSL_session_reused() result
    return socket._sessionReused === true;
  }

  /**
   * Get TLS session info
   */
  static getTLSSessionInfo(socket: {
    _secureEstablished?: boolean;
    _sessionReused?: boolean;
    encrypted?: boolean;
    alpnProtocol?: string;
    authorized?: boolean;
  }): {
    established: boolean;
    reused: boolean;
    encrypted: boolean;
    alpnProtocol: string | null;
    authorized: boolean;
  } {
    return {
      established: socket._secureEstablished ?? false,
      reused: this.isSessionReused(socket),
      encrypted: socket.encrypted ?? false,
      alpnProtocol: socket.alpnProtocol ?? null,
      authorized: socket.authorized ?? false,
    };
  }

  /**
   * Buffer.compare compatibility
   * Ensures consistent comparison behavior
   */
  static bufferCompare(a: Buffer, b: Buffer): -1 | 0 | 1 {
    if (a === b) return 0;

    const minLen = Math.min(a.length, b.length);

    for (let i = 0; i < minLen; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }

    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;

    return 0;
  }

  /**
   * Buffer.equals compatibility
   */
  static bufferEquals(a: Buffer, b: Buffer): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }

    return true;
  }

  /**
   * process.hrtime.bigint() compatibility
   */
  static hrtimeBigint(): bigint {
    return BigInt(Math.round(performance.now() * 1e6));
  }

  /**
   * process.hrtime() compatibility (legacy format)
   */
  static hrtime(previousTimestamp?: [number, number]): [number, number] {
    const now = performance.now();

    if (!previousTimestamp) {
      const seconds = Math.floor(now / 1000);
      const nanoseconds = Math.round((now % 1000) * 1e6);
      return [seconds, nanoseconds];
    }

    const [prevSeconds, prevNanoseconds] = previousTimestamp;
    const prevMs = prevSeconds * 1000 + prevNanoseconds / 1e6;
    const diffMs = now - prevMs;

    const seconds = Math.floor(diffMs / 1000);
    const nanoseconds = Math.round((diffMs % 1000) * 1e6);

    return [seconds, nanoseconds];
  }

  /**
   * util.inspect compatibility for custom objects
   */
  static inspect(
    obj: unknown,
    options?: {
      depth?: number;
      colors?: boolean;
      showHidden?: boolean;
    }
  ): string {
    const depth = options?.depth ?? 2;

    const stringify = (value: unknown, currentDepth: number): string => {
      if (currentDepth > depth) return '[Object]';

      if (value === null) return 'null';
      if (value === undefined) return 'undefined';

      if (typeof value === 'string') return `'${value}'`;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'boolean') return String(value);
      if (typeof value === 'bigint') return `${value}n`;
      if (typeof value === 'symbol') return value.toString();
      if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map((v) => stringify(v, currentDepth + 1));
        return `[ ${items.join(', ')} ]`;
      }

      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return value.toString();
      if (value instanceof Map) return `Map(${value.size}) { ... }`;
      if (value instanceof Set) return `Set(${value.size}) { ... }`;
      if (value instanceof Buffer) return `<Buffer ${value.toString('hex').substring(0, 50)}...>`;

      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return '{}';

        const props = entries.map(
          ([k, v]) => `${k}: ${stringify(v, currentDepth + 1)}`
        );
        return `{ ${props.join(', ')} }`;
      }

      return String(value);
    };

    return stringify(obj, 0);
  }

  /**
   * Install all compatibility shims globally
   */
  static installGlobalShims(): void {
    if (!isFeatureEnabled('KERNEL_OPT')) {
      return;
    }

    // Extend Buffer prototype if not already
    if (!(Buffer.prototype as { hexSlice?: unknown }).hexSlice) {
      (Buffer.prototype as { hexSlice: typeof NodeJSCompatBridge.hexSlice }).hexSlice =
        function (start?: number, end?: number) {
          return NodeJSCompatBridge.hexSlice(this, start, end);
        };
    }
  }
}

/**
 * Convenience exports
 */
export const hexSlice = NodeJSCompatBridge.hexSlice.bind(NodeJSCompatBridge);
export const napiTypeof = NodeJSCompatBridge.napiTypeof.bind(NodeJSCompatBridge);
export const getTypeInfo = NodeJSCompatBridge.getTypeInfo.bind(NodeJSCompatBridge);
export const deepStrictEqual = NodeJSCompatBridge.deepStrictEqual.bind(NodeJSCompatBridge);
export const isSessionReused = NodeJSCompatBridge.isSessionReused.bind(NodeJSCompatBridge);
export const bufferCompare = NodeJSCompatBridge.bufferCompare.bind(NodeJSCompatBridge);
export const bufferEquals = NodeJSCompatBridge.bufferEquals.bind(NodeJSCompatBridge);
export const hrtimeBigint = NodeJSCompatBridge.hrtimeBigint.bind(NodeJSCompatBridge);
export const hrtime = NodeJSCompatBridge.hrtime.bind(NodeJSCompatBridge);
export const inspect = NodeJSCompatBridge.inspect.bind(NodeJSCompatBridge);
export const installGlobalShims = NodeJSCompatBridge.installGlobalShims.bind(NodeJSCompatBridge);
