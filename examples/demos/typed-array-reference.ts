/**
 * Typed Array Usage Example with Documentation References
 * 
 * This example demonstrates how to use the documentation reference system
 * for typed array methods and related features.
 */

import { docs } from '../lib/docs/reference.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// Get typed array documentation URLs
const TYPED_ARRAY_URLS = docs.getTypedArrayUrls();

/**
 * Example: Working with SharedArrayBuffer for R-Score optimization
 * 
 * For more information on typed array methods, see [Methods](${TYPED_ARRAY_URLS.METHODS}).
 * For performance considerations, see [Performance](${TYPED_ARRAY_URLS.PERFORMANCE}).
 * For zero-copy operations, see [Zero-Copy](${TYPED_ARRAY_URLS.ZERO_COPY}).
 */
class TypedArrayExample {
  private buffer: SharedArrayBuffer;
  private uint8View: Uint8Array;
  private dataView: DataView;
  
  constructor(size: number) {
    // Create SharedArrayBuffer - see [SharedArrayBuffer](${TYPED_ARRAY_URLS.SHARED_ARRAY_BUFFER})
    this.buffer = new SharedArrayBuffer(size);
    this.uint8View = new Uint8Array(this.buffer);
    this.dataView = new DataView(this.buffer);
  }
  
  /**
   * Write data using different typed array methods
   * 
   * Common methods documented at [Methods](${TYPED_ARRAY_URLS.METHODS}):
   * - set() - Copy values from another array
   * - subarray() - Create a view on a portion of the buffer
   * - slice() - Create a new array with a copy of values
   */
  writeData(source: Uint8Array, offset: number = 0): void {
    // Using set() method - see [Methods](${TYPED_ARRAY_URLS.METHODS})
    this.uint8View.set(source, offset);
  }
  
  /**
   * Read data using DataView for different numeric types
   * 
   * DataView methods for multi-byte values:
   * - getInt32(), getUint32(), getFloat32(), getFloat64()
   * - All accept byteOffset and littleEndian parameters
   */
  readInt32(offset: number): number {
    return this.dataView.getInt32(offset, true); // littleEndian
  }
  
  /**
   * Performance-optimized bulk operations
   * 
   * For optimization techniques, see [Performance](${TYPED_ARRAY_URLS.PERFORMANCE})
   * and [Zero-Copy](${TYPED_ARRAY_URLS.ZERO_COPY}).
   */
  bulkCopy(source: SharedArrayBuffer): void {
    const sourceView = new Uint8Array(source);
    
    // Zero-copy operation where possible
    if (source.byteLength <= this.buffer.byteLength) {
      this.uint8View.set(sourceView);
    }
  }
  
  /**
   * Create a subarray view without copying
   * 
   * Subarray creates a view on the existing buffer - no memory allocation
   * More details at [Methods](${TYPED_ARRAY_URLS.METHODS}#subarray).
   */
  createSubarray(start: number, end?: number): Uint8Array {
    return this.uint8View.subarray(start, end);
  }
  
  /**
   * Get buffer statistics for memory pool optimization
   */
  getStats() {
    return {
      bufferSize: this.buffer.byteLength,
      utilization: this.uint8View.length / this.buffer.byteLength,
      // For memory pool patterns, see [SharedArrayBuffer](${TYPED_ARRAY_URLS.SHARED_ARRAY_BUFFER})
    };
  }
}

// Usage example with documentation references
const example = new TypedArrayExample(1024);

// For more information on typed array methods, see [Methods](${TYPED_ARRAY_URLS.METHODS}).
const data = new Uint8Array([1, 2, 3, 4, 5]);
example.writeData(data);

// Performance optimization techniques are covered at [Performance](${TYPED_ARRAY_URLS.PERFORMANCE}).
example.bulkCopy(new SharedArrayBuffer(512));

// Zero-copy operations are documented at [Zero-Copy](${TYPED_ARRAY_URLS.ZERO_COPY}).
const subarray = example.createSubarray(0, 5);

console.log('Typed array example with documentation references complete!');
console.log('Buffer stats:', example.getStats());

/**
 * Additional Resources:
 * 
 * - Main typed array documentation: [Base](${TYPED_ARRAY_URLS.BASE})
 * - All methods reference: [Methods](${TYPED_ARRAY_URLS.METHODS})
 * - Performance optimization: [Performance](${TYPED_ARRAY_URLS.PERFORMANCE})
 * - Zero-copy operations: [Zero-Copy](${TYPED_ARRAY_URLS.ZERO_COPY})
 * - SharedArrayBuffer usage: [SharedArrayBuffer](${TYPED_ARRAY_URLS.SHARED_ARRAY_BUFFER})
 */
