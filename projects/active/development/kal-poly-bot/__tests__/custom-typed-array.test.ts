/**
 * [TEST][CUSTOM-TYPED-ARRAY][META:{phase:1, risk:low}]
 * Test suite for CustomTypedArray with depth-aware inspection
 * #REF:CustomTypedArray, #REF:Bun.inspect.custom]
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { 
  CustomTypedArray, 
  BinaryProtocolDebugger, 
  IntegratedBinaryLogger 
} from '../src/types/custom-typed-array';

describe('CustomTypedArray', () => {
  describe('constructor', () => {
    it('should create array with specified length', () => {
      const arr = new CustomTypedArray(100, 'test');
      expect(arr.length).toBe(100);
      expect(arr.context).toBe('test');
    });

    it('should track creation timestamp', () => {
      const before = Date.now();
      const arr = new CustomTypedArray(50);
      const after = Date.now();
      
      expect(arr.createdAt).toBeGreaterThanOrEqual(before);
      expect(arr.createdAt).toBeLessThanOrEqual(after);
    });

    it('should warn on large allocations', () => {
      const consoleWarnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleWarnSpy;
      
      const largeSize = 11 * 1024 * 1024; // 11MB
      new CustomTypedArray(largeSize, 'large-test');
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleWarnSpy.mock.calls[0];
      expect(callArgs[0]).toContain('Large CustomTypedArray allocation');
      
      console.warn = originalWarn;
    });
  });

  describe('fromUint8Array', () => {
    it('should convert Uint8Array to CustomTypedArray', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const custom = CustomTypedArray.fromUint8Array(original, 'conversion-test');
      
      expect(custom.length).toBe(5);
      expect(custom[0]).toBe(1);
      expect(custom[4]).toBe(5);
      expect(custom.context).toBe('conversion-test');
    });
  });

  describe('fromBuffer', () => {
    it('should create from ArrayBuffer with offset', () => {
      const buffer = new ArrayBuffer(10);
      const view = new Uint8Array(buffer);
      view.set([0, 0, 1, 2, 3, 4, 5, 0, 0, 0]);
      
      const custom = CustomTypedArray.fromBuffer(buffer, 2, 5, 'buffer-test');
      
      expect(custom.length).toBe(5);
      expect(custom[0]).toBe(1);
      expect(custom[4]).toBe(5);
    });
  });

  describe('toHex', () => {
    it('should convert to hex string', () => {
      const arr = new CustomTypedArray(3);
      arr.set([0xAB, 0xCD, 0xEF]);
      
      expect(arr.toHex()).toBe('abcdef');
      expect(arr.toHex(' ')).toBe('ab cd ef');
      expect(arr.toHex('-')).toBe('ab-cd-ef');
    });
  });

  describe('subarray', () => {
    it('should preserve CustomTypedArray type', () => {
      const arr = new CustomTypedArray(10, 'parent');
      arr.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      
      const sub = arr.subarray(2, 7);
      
      expect(sub).toBeInstanceOf(CustomTypedArray);
      expect(sub.length).toBe(5);
      expect(sub[0]).toBe(2);
      expect(sub[4]).toBe(6);
      expect(sub.context).toBe('parent[sub]');
    });
  });

  describe('inspectInfo', () => {
    it('should return metadata object', () => {
      const arr = new CustomTypedArray(50, 'metadata-test');
      const info = arr.inspectInfo;
      
      expect(info.length).toBe(50);
      expect(info.byteOffset).toBe(0);
      expect(info.bufferSize).toBe(50);
      expect(info.context).toBe('metadata-test');
      expect(info.ageMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('depth-aware inspection', () => {
    it('should handle depth 0 (shallow)', () => {
      const arr = new CustomTypedArray(100, 'test');
      const result = arr.inspect(0, {}, (v: any) => JSON.stringify(v));
      
      expect(result).toContain('CustomTypedArray(100)');
      expect(result).toContain('[ ... ]');
      expect(result).not.toContain('buffer:');
    });

    it('should handle depth 1 (preview)', () => {
      const arr = new CustomTypedArray(50, 'test');
      arr.fill(0xAB);
      const result = arr.inspect(1, {}, (v: any) => JSON.stringify(v));
      
      expect(result).toContain('CustomTypedArray(50)');
      expect(result).toContain('abababab');
      expect(result).not.toContain('00000000:');
    });

    it('should handle depth 2+ (full dump)', () => {
      const arr = new CustomTypedArray(32, 'test');
      arr.fill(0x41); // 'A'
      const result = arr.inspect(2, {}, (v: any) => JSON.stringify(v));
      
      expect(result).toContain('CustomTypedArray(32)');
      expect(result).toContain('buffer:');
      expect(result).toContain('00000000:');
      expect(result).toContain('AAAAAAAA');
    });

    it('should show context in subarrays', () => {
      const arr = new CustomTypedArray(20, 'parent');
      const sub = arr.subarray(5, 15);
      
      const result = sub.inspect(0, {}, (v: any) => JSON.stringify(v));
      expect(result).toContain('[parent[sub]]');
    });
  });
});

describe('BinaryProtocolDebugger', () => {
  describe('debugOddsFeedMessage', () => {
    it('should execute without errors', () => {
      expect(() => {
        BinaryProtocolDebugger.debugOddsFeedMessage();
      }).not.toThrow();
    });
  });

  describe('debugSecureDataViewParsing', () => {
    it('should execute without errors', () => {
      expect(() => {
        BinaryProtocolDebugger.debugSecureDataViewParsing();
      }).not.toThrow();
    });
  });

  describe('benchmarkInspection', () => {
    it('should execute without errors', () => {
      expect(() => {
        BinaryProtocolDebugger.benchmarkInspection();
      }).not.toThrow();
    });
  });
});

describe('IntegratedBinaryLogger', () => {
  let logger: IntegratedBinaryLogger;
  let consoleLogSpy: any;

  beforeEach(() => {
    logger = new IntegratedBinaryLogger();
    consoleLogSpy = mock(() => {});
    const originalLog = console.log;
    console.log = consoleLogSpy;
    // Store for cleanup
    (globalThis as any)._originalLog = originalLog;
  });

  afterEach(() => {
    if ((globalThis as any)._originalLog) {
      console.log = (globalThis as any)._originalLog;
    }
  });

  describe('logBinaryEvent', () => {
    it('should log binary event with preview', () => {
      const data = new Uint8Array([0x42, 0x55, 0x46, 0x55]);
      logger.logBinaryEvent('test-event', data, 'info', 1);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      // Check that it was called with %j format
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe('%j');
      // The second argument should be an object
      expect(typeof callArgs[1]).toBe('object');
      const logged = callArgs[1];
      expect(logged.type).toBe('binary-event');
      expect(logged.event).toBe('test-event');
      expect(logged.size).toBe(4);
      expect(logged.preview).toBeDefined();
    });

    it('should handle different severity levels', () => {
      const data = new Uint8Array([1, 2, 3]);
      
      logger.logBinaryEvent('info-event', data, 'info');
      logger.logBinaryEvent('warning-event', data, 'warning');
      logger.logBinaryEvent('error-event', data, 'error');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('logMarketUpdate', () => {
    it('should log market update', () => {
      const update = { marketId: 12345, status: 'active', providerCount: 3 };
      const frame = new Uint8Array([0x01, 0x02, 0x03]);
      
      logger.logMarketUpdate(update, frame);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe('%j');
      expect(typeof callArgs[1]).toBe('object');
      const logged = callArgs[1];
      expect(logged.type).toBe('market-update');
      expect(logged.marketId).toBe(12345);
      expect(logged.preview).toBeDefined();
    });
  });

  describe('logOrderMatch', () => {
    it('should log order match', () => {
      const engineEvent = { orderId: 'ORD-123', matchPrice: 100.5, quantity: 10 };
      const orderData = new Uint8Array([0xFF, 0xFE]);
      
      logger.logOrderMatch(engineEvent, orderData);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe('%j');
      expect(typeof callArgs[1]).toBe('object');
      const logged = callArgs[1];
      expect(logged.type).toBe('order-match');
      expect(logged.orderId).toBe('ORD-123');
      expect(logged.price).toBe(100.5);
      expect(logged.preview).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should work with complex nested structures', () => {
    const arr = new CustomTypedArray(64, 'complex');
    arr.set(Array.from({ length: 64 }, (_, i) => i % 256));
    
    const complex = {
      metadata: {
        timestamp: Date.now(),
        source: 'test-provider'
      },
      data: {
        primary: arr,
        secondary: arr.subarray(8, 24),
        nested: {
          deep: arr
        }
      }
    };
    
    // Should not throw when inspecting
    expect(() => {
      JSON.stringify(complex);
    }).not.toThrow();
  });

  it('should handle multiple subarrays from same parent', () => {
    const parent = new CustomTypedArray(100, 'parent');
    parent.fill(0xAA);
    
    const sub1 = parent.subarray(0, 25);
    const sub2 = parent.subarray(25, 50);
    const sub3 = parent.subarray(50, 75);
    
    expect(sub1.length).toBe(25);
    expect(sub2.length).toBe(25);
    expect(sub3.length).toBe(25);
    expect(sub1[0]).toBe(0xAA);
    expect(sub2[0]).toBe(0xAA);
    expect(sub3[0]).toBe(0xAA);
  });

  it('should maintain context through conversions', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const custom = CustomTypedArray.fromUint8Array(original, 'converted');
    const sub = custom.subarray(1, 4);
    
    expect(custom.context).toBe('converted');
    expect(sub.context).toBe('converted[sub]');
  });
});
