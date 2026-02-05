/**
 * CustomTypedArray - Generic Depth-Aware Binary Buffers for Sportsbook Infrastructure
 *
 * Abstract base class with concrete implementations for different element types:
 * - CustomUint8Array: Wire protocol bytes (1 byte per element)
 * - CustomUint16Array: Small integers, counts (2 bytes per element)
 * - CustomUint32Array: Market IDs, timestamps (4 bytes per element)
 * - CustomFloat32Array: Single-precision odds (4 bytes per element)
 * - CustomFloat64Array: Double-precision odds (8 bytes per element)
 *
 * Implements Bun.inspect.custom for intelligent console output based on
 * inspection depth, preventing information overload in nested structures.
 *
 * [SPORTSBOOK][UTIL][CUSTOM-TYPED-ARRAY][META:{depthAware: true, phase:2, risk:low}]
 *
 * @example
 * ```typescript
 * // Byte buffer for wire protocol
 * const wireBuffer = new CustomUint8Array(256, 'wire-header');
 *
 * // Float64 buffer for odds values
 * const oddsBuffer = new CustomFloat64Array(100, 'odds-feed');
 * oddsBuffer[0] = 2.5;  // Store odds as 64-bit float
 *
 * // Depth-aware inspection works on all types
 * console.log(oddsBuffer);  // CustomFloat64Array(100) [ 2.5, 0, 0, ... ]
 * ```
 *
 * @module types/custom-typed-array
 */

/**
 * Bun inspect options interface
 */
export interface BunInspectOptions {
  depth?: number;
  colors?: boolean;
  showHidden?: boolean;
  customInspect?: boolean;
}

/**
 * Type-safe TypedArray element types
 */
type TypedArrayElement = number;

/**
 * Supported TypedArray constructors for type inference
 */
type TypedArrayConstructor =
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

/**
 * Metadata returned by inspectInfo getter
 */
export interface TypedArrayInspectInfo {
  readonly length: number;
  readonly byteOffset: number;
  readonly byteLength: number;
  readonly bufferSize: number;
  readonly bytesPerElement: number;
  readonly context: string | undefined;
  readonly createdAt: number;
  readonly ageMs: number;
}

/**
 * Abstract base class for custom typed arrays with depth-aware inspection
 *
 * Provides:
 * - Depth-based display: abbreviated at shallow depths, full at deep
 * - Security: prevents accidental logging of sensitive binary data
 * - Performance: minimal overhead at shallow inspection depths
 * - Context tracking: optional debug context for tracing
 * - Large allocation warnings: integrated threat detection
 * - Resizable buffers: dynamic length adjustment
 */
export abstract class CustomTypedArrayBase<T extends TypedArrayElement> {
  /** Display name for inspection (overridden by subclasses) */
  static readonly CLASS_NAME = "CustomTypedArray";

  /** Maximum safe allocation size before warning (10MB) */
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  /** Internal buffer storage */
  protected _buffer: ArrayBuffer;

  /** Debug context for tracing (e.g., "odds-feed-buffer") */
  public readonly context?: string;

  /** Creation timestamp for age tracking */
  public readonly createdAt: number;

  /**
   * Bytes per element (1 for Uint8, 2 for Uint16, 4 for Uint32/Float32, 8 for Float64)
   */
  abstract get BYTES_PER_ELEMENT(): number;

  /**
   * Class name for inspection output
   */
  abstract get className(): string;

  /**
   * Get the current view as a typed array
   */
  protected abstract get _view(): ArrayLike<T> & { buffer: ArrayBuffer; byteOffset: number };

  /**
   * Create a new view for the given buffer
   */
  protected abstract createView(buffer: ArrayBuffer, byteOffset?: number, length?: number): ArrayLike<T> & { buffer: ArrayBuffer; byteOffset: number };

  /**
   * Format a single element for display
   */
  protected abstract formatElement(value: T): string;

  constructor(byteLength: number, context?: string) {
    this._buffer = new ArrayBuffer(byteLength);
    this.context = context;
    this.createdAt = Date.now();

    // Warn on large allocations
    if (byteLength > CustomTypedArrayBase.MAX_SAFE_SIZE) {
      console.warn(
        `⚠️  Large ${this.className} allocation: ${byteLength} bytes` +
          (this.context ? ` (context: ${this.context})` : "")
      );
    }
  }

  /**
   * Number of elements in the array
   */
  get length(): number {
    return this._buffer.byteLength / this.BYTES_PER_ELEMENT;
  }

  /**
   * Resize the buffer to accommodate a new element count
   */
  set length(value: number) {
    const newByteLength = value * this.BYTES_PER_ELEMENT;
    this.resize(newByteLength);
  }

  /**
   * Total byte length of the buffer
   */
  get byteLength(): number {
    return this._buffer.byteLength;
  }

  /**
   * The underlying ArrayBuffer
   */
  get buffer(): ArrayBuffer {
    return this._buffer;
  }

  /**
   * Byte offset (always 0 for base arrays)
   */
  get byteOffset(): number {
    return 0;
  }

  /**
   * Resize the internal buffer
   *
   * @param newByteLength - New size in bytes
   */
  resize(newByteLength: number): void {
    const newBuffer = new ArrayBuffer(newByteLength);
    const oldView = new Uint8Array(this._buffer);
    const newView = new Uint8Array(newBuffer);

    // Copy existing data (up to the smaller of the two)
    newView.set(oldView.subarray(0, Math.min(oldView.length, newView.length)));

    this._buffer = newBuffer;
  }

  /**
   * Bun-specific inspection hook for depth-aware display
   */
  [Symbol.for("bun.inspect.custom")](
    depth: number,
    options: BunInspectOptions,
    inspect: (value: unknown, options?: BunInspectOptions) => string
  ): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;

    // Depth < 1: Abbreviated view for nested objects
    if (depth < 1) {
      return `${header} [ ... ]`;
    }

    // Depth 1: Element preview
    if (depth < 2) {
      const preview = this.getElementPreview(8);
      return `${header} [ ${preview} ]`;
    }

    // Depth 2+: Full dump
    return this.getFullDump(header);
  }

  /**
   * Node.js compatible custom inspect (fallback)
   */
  [Symbol.for("nodejs.util.inspect.custom")](
    depth: number,
    options: object,
    inspect: (value: unknown, options?: object) => string
  ): string {
    return this[Symbol.for("bun.inspect.custom")](
      depth,
      options as BunInspectOptions,
      inspect as (value: unknown, options?: BunInspectOptions) => string
    );
  }

  /**
   * Get preview of first N elements
   */
  protected getElementPreview(maxElements: number): string {
    if (this.length === 0) return "(empty)";

    const view = this._view;
    const count = Math.min(this.length, maxElements);
    const elements: string[] = [];

    for (let i = 0; i < count; i++) {
      elements.push(this.formatElement(view[i] as T));
    }

    if (this.length > maxElements) {
      elements.push(`... +${this.length - maxElements} more`);
    }

    return elements.join(", ");
  }

  /**
   * Get full dump with hex representation
   */
  protected getFullDump(header: string): string {
    const view = this._view;
    const elementsPerLine = Math.min(8, this.length);
    const lines: string[] = [];

    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements: string[] = [];
      for (let j = i; j < Math.min(i + elementsPerLine, this.length); j++) {
        lineElements.push(this.formatElement(view[j] as T).padStart(12));
      }
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }

    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;

    return [
      `${header} {`,
      `  buffer: ArrayBuffer(${this._buffer.byteLength}),${contextInfo}`,
      `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`,
      `  age: ${ageMs}ms,`,
      `  elements:`,
      ...lines.map((l) => `    ${l}`),
      `}`,
    ].join("\n");
  }

  /**
   * Get metadata for debugging
   */
  get inspectInfo(): TypedArrayInspectInfo {
    return {
      length: this.length,
      byteOffset: this.byteOffset,
      byteLength: this.byteLength,
      bufferSize: this._buffer.byteLength,
      bytesPerElement: this.BYTES_PER_ELEMENT,
      context: this.context,
      createdAt: this.createdAt,
      ageMs: Date.now() - this.createdAt,
    };
  }

  /**
   * Convert to hex string (byte-level)
   */
  toHexString(): string {
    const bytes = new Uint8Array(this._buffer);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Calculate hash of buffer contents
   */
  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this._buffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// ============================================================================
// Concrete Implementations
// ============================================================================

/**
 * CustomUint8Array - Byte buffer with depth-aware inspection
 *
 * Used for wire protocol data, raw binary payloads
 */
export class CustomUint8Array extends Uint8Array {
  static readonly CLASS_NAME = "CustomUint8Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<number> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<number> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
      if (lengthOrArrayOrBuffer > CustomUint8Array.MAX_SAFE_SIZE) {
        console.warn(`⚠️  Large ${CustomUint8Array.CLASS_NAME} allocation: ${lengthOrArrayOrBuffer} bytes`);
      }
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<number>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomUint8Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) return `${header} [ ${this.getHexPreview(32)} ]`;
    return this.getFullHexDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getHexPreview(maxBytes: number): string {
    if (this.length === 0) return "(empty)";
    if (this.length <= maxBytes) return this.toHexString();
    const head = this.subarray(0, maxBytes);
    const tail = this.subarray(-4);
    return `${this.arrayToHex(head)}...${this.arrayToHex(tail)}`;
  }

  private getFullHexDump(header: string): string {
    const hexLines: string[] = [];
    const bytesPerLine = 16;
    for (let i = 0; i < this.length; i += bytesPerLine) {
      const line = this.subarray(i, Math.min(i + bytesPerLine, this.length));
      const hex = this.arrayToHex(line).padEnd(bytesPerLine * 2, " ");
      const ascii = Array.from(line, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
      hexLines.push(`${i.toString(16).padStart(8, "0")}: ${hex} ${ascii}`);
    }
    const bufferInfo = this.buffer.byteLength > this.length ? " (shared)" : "";
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength})${bufferInfo},${contextInfo}`, `  age: ${ageMs}ms,`, `  content:`, ...hexLines.map((l) => `    ${l}`), `}`].join("\n");
  }

  private arrayToHex(arr: Uint8Array): string {
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  toHexString(): string { return this.arrayToHex(this); }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  static fromUint8Array(arr: Uint8Array, context?: string): CustomUint8Array {
    const custom = new CustomUint8Array(arr.length, context);
    custom.set(arr);
    return custom;
  }

  static fromBuffer(buffer: ArrayBufferLike, byteOffset?: number, byteLength?: number, context?: string): CustomUint8Array {
    const uint8 = new Uint8Array(buffer, byteOffset, byteLength);
    return CustomUint8Array.fromUint8Array(uint8, context);
  }

  static fromHex(hex: string, context?: string): CustomUint8Array {
    const cleanHex = hex.replace(/\s+/g, "");
    const bytes = new CustomUint8Array(cleanHex.length / 2, context);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  override subarray(begin?: number, end?: number): CustomUint8Array {
    const sub = super.subarray(begin, end);
    return new CustomUint8Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomUint8Array {
    const sliced = super.slice(start, end);
    return CustomUint8Array.fromUint8Array(sliced, this.context);
  }

  toDataView(): DataView { return new DataView(this.buffer, this.byteOffset, this.length); }

  equals(other: Uint8Array): boolean {
    if (this.length !== other.length) return false;
    for (let i = 0; i < this.length; i++) if (this[i] !== other[i]) return false;
    return true;
  }

  xor(other: Uint8Array): this {
    const len = Math.min(this.length, other.length);
    for (let i = 0; i < len; i++) this[i] ^= other[i];
    return this;
  }

  randomize(): this { crypto.getRandomValues(this); return this; }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/**
 * CustomUint16Array - 16-bit unsigned integer buffer with depth-aware inspection
 *
 * Used for counts, small identifiers (2 bytes per element)
 */
export class CustomUint16Array extends Uint16Array {
  static readonly CLASS_NAME = "CustomUint16Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<number> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<number> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<number>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomUint16Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 8), (v) => v.toString()).join(", ") + (this.length > 8 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 8;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => v.toString().padStart(6));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomUint16Array {
    const sub = super.subarray(begin, end);
    return new CustomUint16Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomUint16Array {
    const sliced = super.slice(start, end);
    const custom = new CustomUint16Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

/**
 * CustomUint32Array - 32-bit unsigned integer buffer with depth-aware inspection
 *
 * Used for market IDs, timestamps, large counters (4 bytes per element)
 */
export class CustomUint32Array extends Uint32Array {
  static readonly CLASS_NAME = "CustomUint32Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<number> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<number> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<number>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomUint32Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 6), (v) => v.toString()).join(", ") + (this.length > 6 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 6;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => v.toString().padStart(10));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomUint32Array {
    const sub = super.subarray(begin, end);
    return new CustomUint32Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomUint32Array {
    const sliced = super.slice(start, end);
    const custom = new CustomUint32Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

/**
 * CustomFloat32Array - 32-bit float buffer with depth-aware inspection
 *
 * Used for single-precision odds, probabilities (4 bytes per element)
 */
export class CustomFloat32Array extends Float32Array {
  static readonly CLASS_NAME = "CustomFloat32Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<number> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<number> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<number>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomFloat32Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 6), (v) => v.toFixed(4)).join(", ") + (this.length > 6 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 6;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => v.toFixed(6).padStart(12));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomFloat32Array {
    const sub = super.subarray(begin, end);
    return new CustomFloat32Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomFloat32Array {
    const sliced = super.slice(start, end);
    const custom = new CustomFloat32Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

/**
 * CustomFloat64Array - 64-bit float buffer with depth-aware inspection
 *
 * Used for high-precision odds, money values, timestamps (8 bytes per element)
 */
export class CustomFloat64Array extends Float64Array {
  static readonly CLASS_NAME = "CustomFloat64Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<number> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<number> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<number>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomFloat64Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 5), (v) => v.toPrecision(8)).join(", ") + (this.length > 5 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 4;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => v.toPrecision(10).padStart(16));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomFloat64Array {
    const sub = super.subarray(begin, end);
    return new CustomFloat64Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomFloat64Array {
    const sliced = super.slice(start, end);
    const custom = new CustomFloat64Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

/**
 * CustomBigInt64Array - 64-bit signed integer buffer with depth-aware inspection
 *
 * Used for high-precision signed values, cryptographic operations (8 bytes per element)
 */
export class CustomBigInt64Array extends BigInt64Array {
  static readonly CLASS_NAME = "CustomBigInt64Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<bigint> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<bigint> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<bigint>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomBigInt64Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 4), (v) => v.toString() + "n").join(", ") + (this.length > 4 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 4;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => (v.toString() + "n").padStart(22));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomBigInt64Array {
    const sub = super.subarray(begin, end);
    return new CustomBigInt64Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomBigInt64Array {
    const sliced = super.slice(start, end);
    const custom = new CustomBigInt64Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

/**
 * CustomBigUint64Array - 64-bit unsigned integer buffer with depth-aware inspection
 *
 * Used for nanosecond timestamps, large counters, cryptographic hashes (8 bytes per element)
 */
export class CustomBigUint64Array extends BigUint64Array {
  static readonly CLASS_NAME = "CustomBigUint64Array";
  static readonly MAX_SAFE_SIZE = 10 * 1024 * 1024;

  public readonly context?: string;
  public readonly createdAt: number;

  constructor(length: number, context?: string);
  constructor(array: ArrayLike<bigint> | ArrayBufferLike, context?: string);
  constructor(buffer: ArrayBufferLike, byteOffset: number, length?: number, context?: string);
  constructor(
    lengthOrArrayOrBuffer: number | ArrayLike<bigint> | ArrayBufferLike,
    contextOrByteOffset?: string | number,
    lengthOrContext?: number | string,
    context?: string
  ) {
    if (typeof lengthOrArrayOrBuffer === "number") {
      super(lengthOrArrayOrBuffer);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    } else if (typeof contextOrByteOffset === "number" && lengthOrArrayOrBuffer instanceof ArrayBuffer) {
      super(lengthOrArrayOrBuffer, contextOrByteOffset, typeof lengthOrContext === "number" ? lengthOrContext : undefined);
      this.context = typeof lengthOrContext === "string" ? lengthOrContext : context;
    } else {
      super(lengthOrArrayOrBuffer as ArrayLike<bigint>);
      this.context = typeof contextOrByteOffset === "string" ? contextOrByteOffset : undefined;
    }
    this.createdAt = Date.now();
  }

  get className(): string { return CustomBigUint64Array.CLASS_NAME; }

  [Symbol.for("bun.inspect.custom")](depth: number, options: BunInspectOptions, inspect: (v: unknown) => string): string {
    const offsetSuffix = this.byteOffset > 0 ? `[@${this.byteOffset}]` : "";
    const header = `${this.className}(${this.length})${offsetSuffix}`;
    if (depth < 1) return `${header} [ ... ]`;
    if (depth < 2) {
      const preview = this.length === 0 ? "(empty)" : Array.from(this.subarray(0, 4), (v) => v.toString() + "n").join(", ") + (this.length > 4 ? ", ..." : "");
      return `${header} [ ${preview} ]`;
    }
    return this.getFullDump(header);
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth: number, options: object, inspect: (v: unknown) => string): string {
    return this[Symbol.for("bun.inspect.custom")](depth, options as BunInspectOptions, inspect);
  }

  private getFullDump(header: string): string {
    const elementsPerLine = 4;
    const lines: string[] = [];
    for (let i = 0; i < this.length; i += elementsPerLine) {
      const lineElements = Array.from(this.subarray(i, Math.min(i + elementsPerLine, this.length)), (v) => (v.toString() + "n").padStart(22));
      lines.push(`${i.toString().padStart(6)}: ${lineElements.join(" ")}`);
    }
    const contextInfo = this.context ? `\n  context: "${this.context}",` : "";
    const ageMs = Date.now() - this.createdAt;
    return [`${header} {`, `  buffer: ArrayBuffer(${this.buffer.byteLength}),${contextInfo}`, `  bytesPerElement: ${this.BYTES_PER_ELEMENT},`, `  age: ${ageMs}ms,`, `  elements:`, ...lines.map((l) => `    ${l}`), `}`].join("\n");
  }

  get inspectInfo(): TypedArrayInspectInfo {
    return { length: this.length, byteOffset: this.byteOffset, byteLength: this.byteLength, bufferSize: this.buffer.byteLength, bytesPerElement: this.BYTES_PER_ELEMENT, context: this.context, createdAt: this.createdAt, ageMs: Date.now() - this.createdAt };
  }

  toHexString(): string { return Array.from(new Uint8Array(this.buffer), (b) => b.toString(16).padStart(2, "0")).join(""); }

  async hash(algorithm: "SHA-256" | "SHA-512" = "SHA-256"): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.buffer);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  override subarray(begin?: number, end?: number): CustomBigUint64Array {
    const sub = super.subarray(begin, end);
    return new CustomBigUint64Array(sub.buffer, sub.byteOffset, sub.length, this.context);
  }

  override slice(start?: number, end?: number): CustomBigUint64Array {
    const sliced = super.slice(start, end);
    const custom = new CustomBigUint64Array(sliced.length, this.context);
    custom.set(sliced);
    return custom;
  }
}

// ============================================================================
// Backwards Compatibility
// ============================================================================

/**
 * CustomTypedArray - Alias for CustomUint8Array for backwards compatibility
 *
 * @deprecated Use CustomUint8Array, CustomFloat64Array, etc. for explicit typing
 */
export const CustomTypedArray = CustomUint8Array;
export type CustomTypedArray = CustomUint8Array;
