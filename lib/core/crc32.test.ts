// lib/core/crc32.test.ts — Tests for hardware-accelerated CRC32 utilities

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  crc32,
  crc32File,
  crc32Chunks,
  verify,
  verifyFile,
  checksumRecord,
  validatePacket,
  toHex,
  fromHex,
  benchmark,
  type CRC32Result,
} from './crc32';

describe('CRC32', () => {
  // Known CRC32 test vectors (Bun.hash.crc32 implementation)
  const testVectors: Array<{ input: string; expected: string }> = [
    { input: '', expected: '00000000' },
    { input: 'a', expected: 'E8B7BE43' },
    { input: 'abc', expected: '352441C2' },
    { input: 'hello world', expected: '0D4A1185' },
    { input: '123456789', expected: 'CBF43926' },
  ];

  describe('crc32()', () => {
    test('computes correct CRC32 for known test vectors', () => {
      for (const vector of testVectors) {
        const result = crc32(vector.input);
        expect(result.hex).toBe(vector.expected);
      }
    });

    test('returns consistent results for same input', () => {
      const input = 'test data';
      const result1 = crc32(input);
      const result2 = crc32(input);
      expect(result1.value).toBe(result2.value);
      expect(result1.hex).toBe(result2.hex);
    });

    test('computes CRC32 for Uint8Array', () => {
      const data = new Uint8Array([0x31, 0x32, 0x33]); // "123"
      const result = crc32(data);
      expect(result.hex).toBe('884863D2');
    });

    test('computes CRC32 for Buffer', () => {
      const data = Buffer.from('test');
      const result = crc32(data);
      expect(result.hex).toBe('D87F7E0C');
    });

    test('returns correct size in result', () => {
      const input = 'hello world';
      const result = crc32(input);
      expect(result.size).toBe(11); // "hello world".length
    });

    test('measures computation time', () => {
      const result = crc32('test');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('handles empty string', () => {
      const result = crc32('');
      expect(result.hex).toBe('00000000');
      expect(result.value).toBe(0);
    });

    test('handles large data', () => {
      const data = 'x'.repeat(10000);
      const result = crc32(data);
      expect(result.size).toBe(10000);
      expect(result.hex).toHaveLength(8);
    });
  });

  describe('crc32Chunks()', () => {
    test('handles empty array', () => {
      const result = crc32Chunks([]);
      expect(result.value).toBe(0);
      expect(result.hex).toBe('00000000');
    });

    test('handles single chunk', () => {
      const chunk = new TextEncoder().encode('hello');
      const result = crc32Chunks([chunk]);
      const expected = crc32('hello');
      expect(result.hex).toBe(expected.hex);
    });

    test('combines multiple chunks correctly', () => {
      const chunk1 = new TextEncoder().encode('hello');
      const chunk2 = new TextEncoder().encode(' world');
      const result = crc32Chunks([chunk1, chunk2]);
      const expected = crc32('hello world');
      expect(result.hex).toBe(expected.hex);
    });

    test('returns correct total size', () => {
      const chunks = [
        new Uint8Array(100),
        new Uint8Array(200),
        new Uint8Array(300),
      ];
      const result = crc32Chunks(chunks);
      expect(result.size).toBe(600);
    });
  });

  describe('verify()', () => {
    test('returns true for valid hex checksum', () => {
      const valid = verify('hello world', '0D4A1185');
      expect(valid).toBe(true);
    });

    test('returns true for valid lowercase hex', () => {
      const valid = verify('hello world', '0d4a1185');
      expect(valid).toBe(true);
    });

    test('returns true for valid numeric checksum', () => {
      const valid = verify('hello world', 222957957); // 0x0D4A1185
      expect(valid).toBe(true);
    });

    test('returns false for invalid checksum', () => {
      const valid = verify('hello world', '00000000');
      expect(valid).toBe(false);
    });

    test('returns false for corrupted data', () => {
      const valid = verify('hello world!', 'E2B54E9A');
      expect(valid).toBe(false);
    });
  });

  describe('checksumRecord()', () => {
    test('computes checksum for object', () => {
      const record = { id: 1, name: 'test', active: true };
      const result = checksumRecord(record);
      expect(result.hex).toHaveLength(8);
      expect(result.value).toBeGreaterThan(0);
    });

    test('returns consistent checksum for same object', () => {
      const record = { id: 1, name: 'test' };
      const result1 = checksumRecord(record);
      const result2 = checksumRecord(record);
      expect(result1.hex).toBe(result2.hex);
    });

    test('detects object changes', () => {
      const record1 = { id: 1, name: 'test' };
      const record2 = { id: 1, name: 'Test' }; // Capital T
      const result1 = checksumRecord(record1);
      const result2 = checksumRecord(record2);
      expect(result1.hex).not.toBe(result2.hex);
    });
  });

  describe('validatePacket()', () => {
    test('returns valid for correct checksum', () => {
      const packet = new TextEncoder().encode('data');
      const expectedCRC = crc32(packet).value;
      const result = validatePacket(packet, expectedCRC);
      expect(result.valid).toBe(true);
      expect(result.actual).toBe(expectedCRC);
    });

    test('returns invalid for wrong checksum', () => {
      const packet = new TextEncoder().encode('data');
      const result = validatePacket(packet, 12345);
      expect(result.valid).toBe(false);
      expect(result.actual).not.toBe(12345);
    });
  });

  describe('toHex()', () => {
    test('converts 0 to hex', () => {
      expect(toHex(0)).toBe('00000000');
    });

    test('converts positive number to hex', () => {
      expect(toHex(222957957)).toBe('0D4A1185'); // 'hello world' CRC
    });

    test('pads to 8 characters', () => {
      expect(toHex(1)).toBe('00000001');
      expect(toHex(255)).toBe('000000FF');
    });

    test('handles large numbers', () => {
      expect(toHex(0xFFFFFFFF)).toBe('FFFFFFFF');
    });
  });

  describe('fromHex()', () => {
    test('parses hex string', () => {
      expect(fromHex('0D4A1185')).toBe(222957957);
    });

    test('parses lowercase hex', () => {
      expect(fromHex('0d4a1185')).toBe(222957957);
    });

    test('parses zero', () => {
      expect(fromHex('00000000')).toBe(0);
    });

    test('round-trips with toHex', () => {
      const original = 123456789;
      const hex = toHex(original);
      const parsed = fromHex(hex);
      expect(parsed).toBe(original);
    });
  });

  describe('benchmark()', () => {
    test('returns benchmark results', () => {
      const result = benchmark(1024);
      expect(result.size).toBe('1024KB');
      expect(result.timeMs).toBeGreaterThan(0);
      expect(result.throughput).toContain('MB/s');
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    test('measures different sizes', () => {
      const result1 = benchmark(1);
      const result10 = benchmark(10);
      expect(result1.size).toBe('1KB');
      expect(result10.size).toBe('10KB');
    });
  });

  describe('Performance', () => {
    test('achieves high throughput on 1MB data', () => {
      const data = new Uint8Array(1024 * 1024); // 1MB
      const start = performance.now();
      Bun.hash.crc32(data);
      const timeMs = performance.now() - start;
      
      const throughputMB = 1 / (timeMs / 1000);
      
      // Should achieve at least 1 GB/s on modern hardware
      expect(throughputMB).toBeGreaterThan(1000);
    });

    test('scales with data size', () => {
      // Larger data sizes for more stable timing
      const sizes = [100000, 500000, 1000000]; // 100KB, 500KB, 1MB
      const times: number[] = [];
      
      for (const size of sizes) {
        const data = new Uint8Array(size);
        // Multiple iterations for stability
        const iterations = 10;
        
        // Warm up
        for (let i = 0; i < 5; i++) Bun.hash.crc32(data);
        
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          Bun.hash.crc32(data);
        }
        const avgTime = (performance.now() - start) / iterations;
        times.push(avgTime);
      }
      
      // Verify that larger data takes more time (monotonic increase)
      expect(times[1]).toBeGreaterThan(times[0]);
      expect(times[2]).toBeGreaterThan(times[1]);
      
      // Verify throughput stays relatively consistent.
      // Allow wider variance for shared/dev environments where CPU scheduling can jitter.
      const throughputs = sizes.map((size, i) => (size / 1024 / 1024) / (times[i] / 1000));
      const minThroughput = Math.min(...throughputs);
      const maxThroughput = Math.max(...throughputs);
      expect(maxThroughput / minThroughput).toBeLessThan(2.0);
    });
  });

  describe('File Operations', () => {
    const testFilePath = '/tmp/crc32-test-file.txt';
    
    beforeAll(async () => {
      // Create test file
      await Bun.write(testFilePath, 'hello world for file testing');
    });

    test('computes file checksum', async () => {
      const result = await crc32File(testFilePath);
      expect(result.filePath).toBe(testFilePath);
      expect(result.hex).toHaveLength(8);
      expect(result.size).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    test('file checksum matches data checksum', async () => {
      const fileResult = await crc32File(testFilePath);
      const content = await Bun.file(testFilePath).text();
      const dataResult = crc32(content);
      expect(fileResult.hex).toBe(dataResult.hex);
    });

    test('verifyFile returns true for valid checksum', async () => {
      const result = await crc32File(testFilePath);
      const valid = await verifyFile(testFilePath, result.hex);
      expect(valid).toBe(true);
    });

    test('verifyFile returns false for invalid checksum', async () => {
      const valid = await verifyFile(testFilePath, '00000000');
      expect(valid).toBe(false);
    });
  });
});

// Entry guard for quick test
if (import.meta.main) {
  console.log('🧪 CRC32 Quick Test\n');
  
  // Test known vector
  const result = crc32('hello world');
  console.log(`crc32('hello world') = 0x${result.hex}`);
  console.log(`Expected: 0x0D4A1185`);
  console.log(`Match: ${result.hex === '0D4A1185' ? '✅' : '❌'}`);
  
  // Quick benchmark
  console.log('\nQuick Benchmark:');
  const bench = benchmark(1024);
  console.log(`1MB: ${bench.throughput} (${bench.opsPerSecond} ops/sec)`);
  
  console.log('\n✅ Test complete!');
}
