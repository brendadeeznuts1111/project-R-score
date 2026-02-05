/**
 * Binary data utilities leveraging Bun's native capabilities
 * 
 * Provides optimized binary operations using TypedArray, DataView, and Buffer
 */

import type { HashAlgorithm } from "./integrity.js";

/**
 * Binary data conversion utilities
 */
export class BinaryUtils {
  /**
   * Convert Buffer to Uint8Array efficiently
   */
  static bufferToUint8Array(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  /**
   * Convert Uint8Array to Buffer efficiently
   */
  static uint8ArrayToBuffer(uint8Array: Uint8Array): Buffer {
    return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
  }

  /**
   * Convert Buffer to ArrayBuffer (shares memory)
   */
  static bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  /**
   * Convert Buffer to DataView for precise binary operations
   */
  static bufferToDataView(buffer: Buffer): DataView {
    return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  /**
   * Compute hash of binary data (Buffer, Uint8Array, ArrayBuffer)
   */
  static hashBinary(
    data: Buffer | Uint8Array | ArrayBuffer,
    algorithm: HashAlgorithm = "blake3"
  ): string {
    // Convert to Uint8Array for consistent hashing
    const uint8 =
      data instanceof Uint8Array
        ? data
        : data instanceof Buffer
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : new Uint8Array(data);

    // Use Bun's native hashing
    if (algorithm === "blake3") {
      // For binary data, use CryptoHasher directly
      const hasher = new Bun.CryptoHasher("blake3");
      hasher.update(uint8);
      return hasher.digest("hex");
    }

    // For other algorithms, use CryptoHasher
    const hasher = new Bun.CryptoHasher(algorithm);
    hasher.update(uint8);
    return hasher.digest("hex");
  }

  /**
   * Compare two binary buffers efficiently
   */
  static compareBuffers(
    a: Buffer | Uint8Array,
    b: Buffer | Uint8Array
  ): boolean {
    if (a.length !== b.length) return false;

    const aView =
      a instanceof Buffer
        ? new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
        : a;
    const bView =
      b instanceof Buffer
        ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
        : b;

    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) return false;
    }

    return true;
  }

  /**
   * Concatenate multiple binary buffers efficiently
   */
  static concatBuffers(...buffers: (Buffer | Uint8Array)[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const buf of buffers) {
      const view =
        buf instanceof Buffer
          ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          : buf;
      result.set(view, offset);
      offset += view.length;
    }

    return result;
  }
}

/**
 * Binary stream utilities for efficient large data processing
 */
export class BinaryStreamUtils {
  /**
   * Convert Buffer to ReadableStream
   */
  static bufferToStream(
    buffer: Buffer | Uint8Array,
    chunkSize: number = 65536
  ): ReadableStream<Uint8Array> {
    const uint8 =
      buffer instanceof Buffer
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : buffer;

    return new ReadableStream({
      start(controller) {
        for (let i = 0; i < uint8.length; i += chunkSize) {
          controller.enqueue(uint8.slice(i, i + chunkSize));
        }
        controller.close();
      },
    });
  }

  /**
   * Read ReadableStream to Buffer/Uint8Array using Bun's optimized function
   */
  static async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    return await Bun.readableStreamToBytes(stream);
  }

  /**
   * Hash a stream without loading it all into memory
   */
  static async hashStream(
    stream: ReadableStream<Uint8Array>,
    algorithm: HashAlgorithm = "blake3"
  ): Promise<string> {
    const hasher = new Bun.CryptoHasher(algorithm);
    
    for await (const chunk of stream) {
      hasher.update(chunk);
    }

    return hasher.digest("hex");
  }
}

