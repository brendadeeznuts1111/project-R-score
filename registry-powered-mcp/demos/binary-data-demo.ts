#!/usr/bin/env bun

/**
 * Advanced Binary Data Processing Demo
 * Showcases Bun's comprehensive binary data handling capabilities
 */

class BinaryDataProcessor {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();

  // High-performance JSON serialization using ArrayBufferSink
  static createJSONResponse(data: any): Response {
    const builder = new StreamingResponseBuilder({ highWaterMark: 32768 });

    // Efficient JSON building with streaming
    builder.write('{"timestamp":"');
    builder.write(new Date().toISOString());
    builder.write('","data":');

    // Serialize data efficiently
    builder.write(JSON.stringify(data));
    builder.write('}');

    const buffer = builder.end();
    const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    return new Response(uint8Buffer as any, {
      headers: {
        "Content-Type": "application/json",
        "X-Binary-Optimized": builder.isUsingArrayBufferSink() ? "ArrayBufferSink" : "Fallback",
        "X-Data-Size": uint8Buffer.length.toString()
      },
    });
  }

  // Binary protocol encoding/decoding using DataView
  static encodeBinaryProtocol(data: {
    version: number;
    type: number;
    payload: Uint8Array;
    checksum?: number;
  }): ArrayBuffer {
    const payloadSize = data.payload.length;
    const totalSize = 4 + 4 + 4 + payloadSize + 4; // version + type + size + payload + checksum
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write protocol header
    view.setUint32(0, data.version, true); // little-endian
    view.setUint32(4, data.type, true);
    view.setUint32(8, payloadSize, true);

    // Write payload
    const payloadView = new Uint8Array(buffer, 12, payloadSize);
    payloadView.set(data.payload);

    // Calculate and write checksum
    const checksum = this.calculateChecksum(new Uint8Array(buffer, 0, 12 + payloadSize));
    view.setUint32(12 + payloadSize, checksum, true);

    return buffer;
  }

  static decodeBinaryProtocol(buffer: ArrayBuffer): {
    version: number;
    type: number;
    payload: Uint8Array;
    checksum: number;
    isValid: boolean;
  } {
    const view = new DataView(buffer);

    const version = view.getUint32(0, true);
    const type = view.getUint32(4, true);
    const payloadSize = view.getUint32(8, true);

    const payload = new Uint8Array(buffer, 12, payloadSize);
    const checksum = view.getUint32(12 + payloadSize, true);

    // Validate checksum
    const calculatedChecksum = this.calculateChecksum(new Uint8Array(buffer, 0, 12 + payloadSize));
    const isValid = checksum === calculatedChecksum;

    return { version, type, payload, checksum, isValid };
  }

  // Efficient base64/hex encoding using Uint8Array methods
  static encodeBase64(data: Uint8Array): string {
    return data.toBase64();
  }

  static decodeBase64(base64: string): Uint8Array {
    return Uint8Array.fromBase64(base64);
  }

  static encodeHex(data: Uint8Array): string {
    return data.toHex();
  }

  static decodeHex(hex: string): Uint8Array {
    return Uint8Array.fromHex(hex);
  }

  // High-performance stream processing using Bun's optimized functions
  static async processStream(stream: ReadableStream): Promise<{
    text?: string;
    bytes?: Uint8Array;
    buffer?: ArrayBuffer;
    json?: any;
  }> {
    const results: any = {};

    // Use Bun's optimized stream conversion functions
    try {
      results.text = await Bun.readableStreamToText(stream);
    } catch (error) {
      // Fallback for text conversion
      const buffer = await Bun.readableStreamToArrayBuffer(stream);
      results.text = this.textDecoder.decode(buffer);
    }

    try {
      results.bytes = await Bun.readableStreamToBytes(stream);
    } catch (error) {
      // Fallback for bytes conversion
      results.bytes = new Uint8Array(await Bun.readableStreamToArrayBuffer(stream));
    }

    try {
      results.buffer = await Bun.readableStreamToArrayBuffer(stream);
    } catch (error) {
      // Stream already consumed, recreate from bytes
      results.buffer = results.bytes?.buffer;
    }

    // Try to parse as JSON
    if (results.text) {
      try {
        results.json = JSON.parse(results.text);
      } catch (error) {
        // Not valid JSON, skip
      }
    }

    return results;
  }

  // Memory-efficient file processing using Bun.file
  static async processFile(filePath: string): Promise<{
    size: number;
    type: string;
    text?: string;
    bytes?: Uint8Array;
    buffer?: ArrayBuffer;
    hash?: string;
  }> {
    const file = Bun.file(filePath);
    const results: any = {
      size: file.size,
      type: file.type || 'application/octet-stream'
    };

    // Calculate file hash using Bun's crypto
    try {
      const hash = new Bun.CryptoHasher('sha256');
      hash.update(await file.arrayBuffer());
      results.hash = hash.digest('hex');
    } catch (error) {
      console.warn('Hash calculation failed:', error);
    }

    // Read content based on size
    if (file.size < 1024 * 1024) { // < 1MB
      results.buffer = await file.arrayBuffer();
      results.bytes = new Uint8Array(results.buffer);
      results.text = await file.text();
    } else {
      // For large files, provide streaming access
      results.stream = file.stream();
    }

    return results;
  }

  // Private utility methods
  private static calculateChecksum(data: Uint8Array): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) & 0xFFFFFFFF;
    }
    return checksum;
  }
}

// Enhanced Response Builder with ArrayBufferSink optimization
class StreamingResponseBuilder {
  private sink: InstanceType<typeof Bun.ArrayBufferSink> | null = null;
  private chunks: Uint8Array[] = [];
  private useArrayBufferSink = false;

  constructor(options: { highWaterMark?: number; stream?: boolean } = {}) {
    const { highWaterMark = 65536, stream = false } = options;

    // Try to use ArrayBufferSink for optimal performance
    try {
      if (typeof Bun !== 'undefined' && Bun.ArrayBufferSink) {
        this.sink = new Bun.ArrayBufferSink();
        this.sink.start({ highWaterMark, stream, asUint8Array: true });
        this.useArrayBufferSink = true;
      }
    } catch (error) {
      this.useArrayBufferSink = false;
    }
  }

  write(chunk: string | ArrayBuffer | Uint8Array): void {
    if (this.useArrayBufferSink && this.sink) {
      this.sink.write(chunk);
    } else {
      // Fallback: encode and store chunks
      let data: Uint8Array;
      if (typeof chunk === 'string') {
        data = new TextEncoder().encode(chunk);
      } else if (chunk instanceof ArrayBuffer) {
        data = new Uint8Array(chunk);
      } else if (chunk instanceof Uint8Array) {
        data = chunk;
      } else {
        throw new Error('Unsupported chunk type');
      }
      this.chunks.push(data);
    }
  }

  flush(): number | Uint8Array | ArrayBuffer | null {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.flush();
    }
    return null; // No-op for fallback
  }

  end(): ArrayBuffer | Uint8Array {
    if (this.useArrayBufferSink && this.sink) {
      return this.sink.end();
    } else {
      // Fallback: concatenate all chunks
      const totalSize = this.chunks.reduce((size, chunk) => size + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of this.chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      this.chunks = []; // Clear for potential reuse
      return result;
    }
  }

  getSize(): number {
    if (this.useArrayBufferSink) {
      // ArrayBufferSink doesn't expose size directly
      return -1; // Unknown
    } else {
      return this.chunks.reduce((size, chunk) => size + chunk.length, 0);
    }
  }

  isUsingArrayBufferSink(): boolean {
    return this.useArrayBufferSink;
  }
}

// Comprehensive binary data demonstration
async function demonstrateBinaryDataCapabilities() {
  console.log('\n🚀 Advanced Binary Data Processing with Bun');
  console.log('==========================================\n');

  // 1. ArrayBufferSink Performance Demo
  console.log('📊 ArrayBufferSink Streaming Performance:');
  console.log('------------------------------------------');

  const builder = new StreamingResponseBuilder({ highWaterMark: 65536 });
  const testData = 'Binary data processing is essential for high-performance applications. ' +
                   'Bun provides optimized APIs for handling streams, buffers, and protocols. ' +
                   'ArrayBufferSink enables efficient incremental data building with zero-copy operations.';

  const startTime = performance.now();

  // Write data in chunks
  for (let i = 0; i < 100; i++) {
    builder.write(testData);
    builder.write(` Chunk ${i} `);
  }

  const buffer = builder.end();
  const endTime = performance.now();

  console.log(`   Processed: ${(buffer instanceof Uint8Array ? buffer.length : buffer.byteLength) / 1024} KB`);
  console.log(`   Time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   Using ArrayBufferSink: ${builder.isUsingArrayBufferSink()}\n`);

  // 2. Base64/Hex Encoding Demo
  console.log('🔄 Base64/Hex Encoding Performance:');
  console.log('-----------------------------------');

  const testBytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]); // "Hello World!"
  console.log(`   Original: ${testBytes}`);
  console.log(`   Base64: ${BinaryDataProcessor.encodeBase64(testBytes)}`);
  console.log(`   Hex: ${BinaryDataProcessor.encodeHex(testBytes)}`);

  // Verify round-trip
  const decodedBase64 = BinaryDataProcessor.decodeBase64(BinaryDataProcessor.encodeBase64(testBytes));
  const decodedHex = BinaryDataProcessor.decodeHex(BinaryDataProcessor.encodeHex(testBytes));
  console.log(`   Round-trip Base64: ${decodedBase64.every((v, i) => v === testBytes[i])}`);
  console.log(`   Round-trip Hex: ${decodedHex.every((v, i) => v === testBytes[i])}\n`);

  // 3. Binary Protocol Demo
  console.log('📡 Binary Protocol Encoding/Decoding:');
  console.log('-------------------------------------');

  const protocolData = {
    version: 1,
    type: 42,
    payload: new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253])
  };

  console.log(`   Original data: v${protocolData.version}, type=${protocolData.type}, payload=${protocolData.payload.length} bytes`);

  // Encode
  const encoded = BinaryDataProcessor.encodeBinaryProtocol(protocolData);
  console.log(`   Encoded buffer: ${encoded.byteLength} bytes`);

  // Decode
  const decoded = BinaryDataProcessor.decodeBinaryProtocol(encoded);
  console.log(`   Decoded: v${decoded.version}, type=${decoded.type}, valid=${decoded.isValid}`);
  console.log(`   Payload matches: ${decoded.payload.every((v, i) => v === protocolData.payload[i])}\n`);

  // 4. JSON Response Optimization
  console.log('⚡ JSON Response Optimization:');
  console.log('-----------------------------');

  const jsonData = {
    message: 'Binary data processing with Bun is highly optimized',
    timestamp: new Date().toISOString(),
    metrics: {
      performance: 'excellent',
      memory: 'efficient',
      compatibility: 'universal'
    },
    features: ['ArrayBufferSink', 'TypedArray', 'DataView', 'Streams', 'Crypto']
  };

  const jsonResponse = BinaryDataProcessor.createJSONResponse(jsonData);
  const responseSize = jsonResponse.headers.get('X-Data-Size');
  const optimization = jsonResponse.headers.get('X-Binary-Optimized');

  console.log(`   Response size: ${responseSize} bytes`);
  console.log(`   Optimization: ${optimization}`);
  console.log(`   Content-Type: ${jsonResponse.headers.get('Content-Type')}\n`);

  // 5. File Processing Demo
  console.log('📁 File Processing with Bun.file:');
  console.log('---------------------------------');

  try {
    const fileInfo = await BinaryDataProcessor.processFile('package.json');
    console.log(`   File size: ${fileInfo.size} bytes`);
    console.log(`   MIME type: ${fileInfo.type}`);
    console.log(`   Has hash: ${!!fileInfo.hash}`);
    console.log(`   Content available: ${!!fileInfo.text}`);

    if (fileInfo.text && fileInfo.text.length > 100) {
      console.log(`   Sample content: ${fileInfo.text.substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`   File processing demo skipped (file not found)`);
  }

  console.log('\n✨ Binary Data Processing Demo Complete!');
  console.log('=========================================\n');

  console.log('Key Capabilities Demonstrated:');
  console.log('• ArrayBufferSink for high-performance streaming');
  console.log('• TypedArray operations with base64/hex encoding');
  console.log('• DataView for binary protocol handling');
  console.log('• Optimized JSON response building');
  console.log('• Memory-efficient file processing');
  console.log('• Zero-copy operations where possible');
  console.log('• Cross-platform compatibility with fallbacks');
}

if (import.meta.main) {
  demonstrateBinaryDataCapabilities().catch(console.error);
}