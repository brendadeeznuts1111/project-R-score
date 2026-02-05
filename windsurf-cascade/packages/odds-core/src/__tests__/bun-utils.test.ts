// packages/odds-core/src/__tests__/bun-utils.test.ts
// Comprehensive tests for Bun utilities

import { test, expect, describe } from "bun:test";
import { BunUtils } from '../bun-utils.js';

describe('BunUtils', () => {
  describe('ID Generation', () => {
    test('should generate hex ID', () => {
      const id = BunUtils.generateId('hex');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[a-f0-9-]{36}$/); // UUID v7 format with dashes
    });

    test('should generate base64 ID', () => {
      const id = BunUtils.generateId('base64');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // Base64 pattern
    });

    test('should generate base64url ID', () => {
      const id = BunUtils.generateId('base64url');
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).not.toContain('+'); // Should not contain URL-unsafe characters
      expect(id).not.toContain('/');
    });

    test('should generate ID buffer', () => {
      const buffer = BunUtils.generateIdBuffer();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16); // UUID v7 is 16 bytes
    });

    test('should generate ID with custom timestamp', () => {
      const timestamp = Date.now();
      const id = BunUtils.generateId('hex', timestamp);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('Timing Utilities', () => {
    test('should get nanoseconds', () => {
      const ns = BunUtils.getNanoseconds();
      expect(typeof ns).toBe('number');
      expect(ns).toBeGreaterThan(0);
    });

    test('should have reasonable precision', () => {
      const start = BunUtils.getNanoseconds();
      // Small delay
      const end = BunUtils.getNanoseconds();
      expect(end).toBeGreaterThanOrEqual(start);
    });
  });

  describe('Environment Detection', () => {
    test('should detect if main script', () => {
      const isMain = BunUtils.isMainScript();
      expect(typeof isMain).toBe('boolean');
    });

    test('should get Bun info', () => {
      const info = BunUtils.getBunInfo();
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('revision');
      expect(info).toHaveProperty('main');
      expect(typeof info.version).toBe('string');
      expect(typeof info.revision).toBe('string');
      expect(typeof info.main).toBe('string');
    });
  });

  describe('Compression Utilities', () => {
    const testData = Buffer.from('Hello, Odds Protocol! This is test data for compression.');

    test('should compress and decompress with gzip', () => {
      const compressed = BunUtils.compressData(testData, 'gzip');
      expect(compressed).toBeInstanceOf(Uint8Array);
      // Small data might not compress well due to gzip overhead, so just test it works
      expect(compressed.length).toBeGreaterThan(0);

      const decompressed = BunUtils.decompressData(compressed, 'gzip');
      expect(Buffer.from(decompressed)).toEqual(testData);
    });

    test('should compress and decompress with deflate', () => {
      const compressed = BunUtils.compressData(testData, 'deflate');
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = BunUtils.decompressData(compressed, 'deflate');
      expect(Buffer.from(decompressed)).toEqual(testData);
    });

    test('should compress and decompress with zstd', () => {
      const compressed = BunUtils.compressData(testData, 'zstd');
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = BunUtils.decompressData(compressed, 'zstd');
      expect(Buffer.from(decompressed)).toEqual(testData);
    });

    test('should handle Uint8Array input', () => {
      const uint8Data = new Uint8Array(testData);
      const compressed = BunUtils.compressData(uint8Data, 'gzip');
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = BunUtils.decompressData(compressed, 'gzip');
      expect(Buffer.from(decompressed)).toEqual(testData);
    });

    test('should throw error for unsupported compression', () => {
      expect(() => {
        BunUtils.compressData(testData, 'unsupported' as any);
      }).toThrow('Unsupported compression: unsupported');
    });
  });

  describe('Stream Utilities', () => {
    test('should convert stream to JSON', async () => {
      const testData = { message: 'test data', number: 42 };
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(JSON.stringify(testData));
          controller.close();
        }
      });

      const result = await BunUtils.streamToJSON(stream);
      expect(result).toEqual(testData);
    });

    test('should convert stream to text', async () => {
      const testText = 'Hello, stream!';
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(testText);
          controller.close();
        }
      });

      const result = await BunUtils.streamToText(stream);
      expect(result).toBe(testText);
    });

    test('should convert stream to bytes', async () => {
      const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(testData);
          controller.close();
        }
      });

      const result = await BunUtils.streamToBytes(stream);
      expect(result).toEqual(testData);
    });
  });

  describe('Path Utilities', () => {
    test('should resolve module path', () => {
      const path = BunUtils.resolvePath('fs');
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    test('should find executable', () => {
      const nodePath = BunUtils.findExecutable('node');
      expect(typeof nodePath).toBe('string');
      expect(nodePath?.length).toBeGreaterThan(0);
    });

    test('should return null for non-existent executable', () => {
      const fakePath = BunUtils.findExecutable('definitely-not-a-real-executable-12345');
      expect(fakePath).toBeNull();
    });
  });

  describe('Memory Utilities', () => {
    test('should estimate memory usage', () => {
      const testData = { key: 'value', numbers: [1, 2, 3] };
      const estimate = BunUtils.estimateMemoryUsage(testData);
      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
    });

    test('should handle different data types', () => {
      const stringData = 'test string';
      const arrayData = [1, 2, 3, 4, 5];
      const objectData = { a: 1, b: 'test', c: [1, 2, 3] };

      expect(BunUtils.estimateMemoryUsage(stringData)).toBeGreaterThan(0);
      expect(BunUtils.estimateMemoryUsage(arrayData)).toBeGreaterThan(0);
      expect(BunUtils.estimateMemoryUsage(objectData)).toBeGreaterThan(0);
    });
  });

  describe('Sleep Utilities', () => {
    test('should sleep asynchronously', async () => {
      const start = Date.now();
      await BunUtils.sleep(10);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(10);
    });

    test('should sleep until date', async () => {
      const futureDate = new Date(Date.now() + 10);
      const start = Date.now();
      await BunUtils.sleepUntil(futureDate);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(10);
    });

    test('should sleep synchronously', () => {
      const start = Date.now();
      BunUtils.sleepSync(10);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Text Processing', () => {
    test('should strip ANSI codes', () => {
      const textWithAnsi = '\x1b[31mRed text\x1b[0m and \x1b[32mgreen text\x1b[0m';
      const stripped = BunUtils.stripANSI(textWithAnsi);
      expect(stripped).toBe('Red text and green text');
    });

    test('should handle text without ANSI codes', () => {
      const plainText = 'Plain text without colors';
      const stripped = BunUtils.stripANSI(plainText);
      expect(stripped).toBe(plainText);
    });

    test('should escape HTML', () => {
      const unsafe = '<script>alert("xss")</script>';
      const escaped = BunUtils.escapeHTML(unsafe);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should get string width', () => {
      const asciiText = 'Hello';
      const wideText = '你好'; // Chinese characters are wider
      expect(BunUtils.getStringWidth(asciiText)).toBe(5);
      expect(BunUtils.getStringWidth(wideText)).toBeGreaterThan(2);
    });
  });

  describe('Data Validation', () => {
    test('should check deep equality', () => {
      const obj1 = { a: 1, b: [2, 3], c: { d: 4 } };
      const obj2 = { a: 1, b: [2, 3], c: { d: 4 } };
      const obj3 = { a: 1, b: [2, 4], c: { d: 4 } };

      expect(BunUtils.deepEquals(obj1, obj2)).toBe(true);
      expect(BunUtils.deepEquals(obj1, obj3)).toBe(false);
    });

    test('should handle primitive equality', () => {
      expect(BunUtils.deepEquals(5, 5)).toBe(true);
      expect(BunUtils.deepEquals('test', 'test')).toBe(true);
      expect(BunUtils.deepEquals(true, true)).toBe(true);
      expect(BunUtils.deepEquals(5, 6)).toBe(false);
    });
  });

  describe('URL Utilities', () => {
    test('should convert file URL to path', () => {
      const path = BunUtils.fileURLToPath('file:///tmp/test.txt');
      expect(typeof path).toBe('string');
      expect(path).toContain('/tmp/test.txt');
    });

    test('should convert path to file URL', () => {
      const url = BunUtils.pathToFileURL('/tmp/test.txt');
      expect(typeof url).toBe('string');
      expect(url).toBe('file:///tmp/test.txt');
    });
  });

  describe('File Utilities', () => {
    test('should peek value', () => {
      const obj = { key: 'value' };
      const peeked = BunUtils.peek(obj);
      expect(peeked).toBe(obj);
    });
  });

  describe('Error Handling', () => {
    test('should handle compression errors gracefully', () => {
      const invalidData = new Uint8Array(0);
      
      // Should not throw for empty data
      expect(() => {
        BunUtils.compressData(invalidData, 'gzip');
      }).not.toThrow();
    });

    test('should handle decompression errors', () => {
      const invalidCompressed = new Uint8Array([1, 2, 3, 4, 5]);
      
      expect(() => {
        BunUtils.decompressData(invalidCompressed, 'gzip');
      }).toThrow();
    });
  });
});
