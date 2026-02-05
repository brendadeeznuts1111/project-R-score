/**
 * Binary Protocol Test Suite
 * Tests for SecureDataView and binary message parsing
 */

import { describe, test, expect } from 'bun:test';
import {
  SecureDataView,
  BinaryProtocolError,
  PROTOCOL_MAGIC,
  BINARY_PERFORMANCE_TARGETS,
  createMessageWriter,
  parseMessage,
  type ProtocolHeader,
  type ThreatDetectionCallback,
} from '../../../packages/core/src/core/binary-protocol';

describe('SecureDataView', () => {
  describe('Construction', () => {
    test('should create from ArrayBuffer', () => {
      const buffer = new ArrayBuffer(32);
      const view = new SecureDataView(buffer);
      expect(view.length).toBe(32);
      expect(view.getPosition()).toBe(0);
    });

    test('should create from Uint8Array', () => {
      const uint8 = new Uint8Array(64);
      const view = new SecureDataView(uint8);
      expect(view.length).toBe(64);
    });

    test('should default to little-endian', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);
      view.writeUint32(0x12345678, false);
      view.seek(0);
      // Little-endian: least significant byte first
      expect(view.readUint32(false)).toBe(0x12345678);
    });

    test('should support big-endian option', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer, { littleEndian: false });
      view.writeUint32(0x12345678, false);
      view.seek(0);
      expect(view.readUint32(false)).toBe(0x12345678);
    });
  });

  describe('Integer Operations', () => {
    test('should read/write uint8', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);

      view.writeUint8(255);
      view.writeUint8(0);
      view.writeUint8(128);

      view.seek(0);
      expect(view.readUint8()).toBe(255);
      expect(view.readUint8()).toBe(0);
      expect(view.readUint8()).toBe(128);
    });

    test('should read/write int8', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);

      view.writeInt8(-128);
      view.writeInt8(127);
      view.writeInt8(0);

      view.seek(0);
      expect(view.readInt8()).toBe(-128);
      expect(view.readInt8()).toBe(127);
      expect(view.readInt8()).toBe(0);
    });

    test('should read/write uint16', () => {
      const buffer = new ArrayBuffer(8);
      const view = new SecureDataView(buffer);

      view.writeUint16(65535);
      view.writeUint16(0);
      view.writeUint16(32768);

      view.seek(0);
      expect(view.readUint16()).toBe(65535);
      expect(view.readUint16()).toBe(0);
      expect(view.readUint16()).toBe(32768);
    });

    test('should read/write uint32 with alignment', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeUint32(0xDEADBEEF);
      view.writeUint32(0x12345678);

      view.seek(0);
      expect(view.readUint32()).toBe(0xDEADBEEF);
      expect(view.readUint32()).toBe(0x12345678);
    });

    test('should read/write bigint64', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeBigUint64(BigInt('0xDEADBEEFCAFEBABE'));
      view.seek(0);
      expect(view.readBigUint64()).toBe(BigInt('0xDEADBEEFCAFEBABE'));
    });
  });

  describe('Float Operations', () => {
    test('should read/write float32', () => {
      const buffer = new ArrayBuffer(8);
      const view = new SecureDataView(buffer);

      view.writeFloat32(3.14159);
      view.seek(0);
      expect(view.readFloat32()).toBeCloseTo(3.14159, 4);
    });

    test('should read/write float64', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeFloat64(Math.PI);
      view.seek(0);
      expect(view.readFloat64()).toBeCloseTo(Math.PI, 10);
    });
  });

  describe('Bytes and Strings', () => {
    test('should read/write bytes with copy-on-read', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      const original = new Uint8Array([1, 2, 3, 4, 5]);
      view.writeBytes(original);

      view.seek(0);
      const read = view.readBytes(5);

      expect(read).toEqual(new Uint8Array([1, 2, 3, 4, 5]));

      // Verify copy-on-read: modifying read doesn't affect original
      read[0] = 99;
      view.seek(0);
      expect(view.readUint8()).toBe(1);
    });

    test('should read/write length-prefixed string', () => {
      const buffer = new ArrayBuffer(32);
      const view = new SecureDataView(buffer);

      view.writeString('Hello, World!');
      view.seek(0);

      const length = view.readUint16();
      const str = view.readString(length);

      expect(str).toBe('Hello, World!');
    });

    test('should handle UTF-8 strings', () => {
      const buffer = new ArrayBuffer(64);
      const view = new SecureDataView(buffer);

      const unicodeStr = 'Hello, 世界! 🌍';
      view.writeString(unicodeStr);
      view.seek(0);

      const length = view.readUint16();
      const str = view.readString(length);

      expect(str).toBe(unicodeStr);
    });

    test('should reject strings exceeding max length', () => {
      const buffer = new ArrayBuffer(8);
      const view = new SecureDataView(buffer);

      const longStr = 'x'.repeat(BINARY_PERFORMANCE_TARGETS.MAX_STRING_LENGTH + 1);

      expect(() => view.writeString(longStr)).toThrow(BinaryProtocolError);
    });
  });

  describe('Bounds Checking', () => {
    test('should throw on read past buffer end', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);

      expect(() => view.readBytes(8)).toThrow(BinaryProtocolError);
    });

    test('should throw on write past buffer end', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);

      expect(() => view.writeBytes(new Uint8Array(8))).toThrow(BinaryProtocolError);
    });

    test('should trigger threat callback on overflow attempt', () => {
      let threatDetected = false;
      let detectedType: string | null = null;

      const onThreat: ThreatDetectionCallback = (event) => {
        threatDetected = true;
        detectedType = event.type;
      };

      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer, { onThreatDetected: onThreat });

      try {
        view.readBytes(8);
      } catch {
        // Expected
      }

      expect(threatDetected).toBe(true);
      expect(detectedType).toBe('overflow_attempt');
    });
  });

  describe('Alignment Enforcement', () => {
    test('should enforce 4-byte alignment for uint32', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeUint8(1); // Position = 1 (unaligned)

      expect(() => view.readUint32(true)).toThrow(BinaryProtocolError);
    });

    test('should allow unaligned read when disabled', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      // Write uint32 at offset 0
      view.writeUint32(0x12345678, false);
      view.seek(1); // Unaligned position

      // Should not throw with alignment disabled
      expect(() => view.readUint32(false)).not.toThrow();
    });

    test('should trigger threat callback on alignment violation', () => {
      let detectedType: string | null = null;

      const onThreat: ThreatDetectionCallback = (event) => {
        detectedType = event.type;
      };

      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer, { onThreatDetected: onThreat });

      view.skip(1); // Unaligned

      try {
        view.readUint32(true);
      } catch {
        // Expected
      }

      expect(detectedType).toBe('alignment_violation');
    });
  });

  describe('Position Management', () => {
    test('should track position correctly', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      expect(view.getPosition()).toBe(0);

      view.writeUint32(1);
      expect(view.getPosition()).toBe(4);

      view.writeUint16(2);
      expect(view.getPosition()).toBe(6);
    });

    test('should seek to position', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.seek(8);
      expect(view.getPosition()).toBe(8);
    });

    test('should throw on invalid seek', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      expect(() => view.seek(-1)).toThrow(BinaryProtocolError);
      expect(() => view.seek(20)).toThrow(BinaryProtocolError);
    });

    test('should skip bytes', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.skip(4);
      expect(view.getPosition()).toBe(4);
    });

    test('should align position', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.skip(1);
      view.align(4);
      expect(view.getPosition()).toBe(4);

      view.skip(1);
      view.align(4);
      expect(view.getPosition()).toBe(8);
    });

    test('should report remaining bytes', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      expect(view.remaining()).toBe(16);

      view.skip(4);
      expect(view.remaining()).toBe(12);
    });

    test('should detect EOF', () => {
      const buffer = new ArrayBuffer(4);
      const view = new SecureDataView(buffer);

      expect(view.isEOF()).toBe(false);

      view.skip(4);
      expect(view.isEOF()).toBe(true);
    });

    test('should reset position', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.skip(8);
      view.reset();
      expect(view.getPosition()).toBe(0);
    });
  });

  describe('Protocol Magic Numbers', () => {
    test('should validate SBOD magic number', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeUint32(PROTOCOL_MAGIC.SBOD, false);
      view.seek(0);

      expect(view.validateMagic(PROTOCOL_MAGIC.SBOD)).toBe(true);
      expect(view.validateMagic(PROTOCOL_MAGIC.AUDT)).toBe(false);
    });

    test('should trigger threat callback on magic mismatch', () => {
      let detectedType: string | null = null;

      const onThreat: ThreatDetectionCallback = (event) => {
        detectedType = event.type;
      };

      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer, { onThreatDetected: onThreat });

      view.writeUint32(PROTOCOL_MAGIC.SBOD, false);
      view.seek(0);

      view.validateMagic(PROTOCOL_MAGIC.AUDT);

      expect(detectedType).toBe('magic_mismatch');
    });
  });

  describe('Protocol Header', () => {
    test('should read/write protocol header', () => {
      const buffer = new ArrayBuffer(32);
      const view = new SecureDataView(buffer);

      // Use timestamp in seconds (fits in uint32)
      const header: ProtocolHeader = {
        magic: PROTOCOL_MAGIC.EVNT,
        version: 1,
        timestamp: Math.floor(Date.now() / 1000),
        payloadLength: 100,
        checksum: 0xABCD1234,
      };

      view.writeHeader(header);
      view.seek(0);

      const readHeader = view.readHeader();

      expect(readHeader.magic).toBe(header.magic);
      expect(readHeader.version).toBe(header.version);
      expect(readHeader.timestamp).toBe(header.timestamp);
      expect(readHeader.payloadLength).toBe(header.payloadLength);
      expect(readHeader.checksum).toBe(header.checksum);
    });

    test('should enforce header alignment', () => {
      const buffer = new ArrayBuffer(32);
      const view = new SecureDataView(buffer);

      view.skip(1); // Unaligned

      expect(() => view.readHeader()).toThrow(BinaryProtocolError);
    });
  });

  describe('Checksum', () => {
    test('should calculate CRC32 checksum', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const checksum1 = view.calculateChecksum(data);
      const checksum2 = view.calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('number');
    });

    test('should verify checksum', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const checksum = view.calculateChecksum(data);

      expect(view.verifyChecksum(data, checksum)).toBe(true);
      expect(view.verifyChecksum(data, checksum + 1)).toBe(false);
    });
  });

  describe('Binary Message Parsing', () => {
    test('should parse complete binary message', () => {
      const buffer = new ArrayBuffer(128);
      const view = new SecureDataView(buffer);

      const payload = new Uint8Array([10, 20, 30, 40, 50]);
      const checksum = view.calculateChecksum(payload);

      const header: ProtocolHeader = {
        magic: PROTOCOL_MAGIC.MESG,
        version: 1,
        timestamp: Math.floor(Date.now() / 1000),
        payloadLength: payload.length,
        checksum,
      };

      view.writeHeader(header);
      view.writeBytes(payload);

      view.seek(0);
      const message = view.parseMessage();

      expect(message.header.magic).toBe(PROTOCOL_MAGIC.MESG);
      expect(message.payload).toEqual(payload);
      expect(message.verified).toBe(true);
    });

    test('should detect checksum failure', () => {
      let threatDetected = false;

      const onThreat: ThreatDetectionCallback = () => {
        threatDetected = true;
      };

      const buffer = new ArrayBuffer(128);
      const view = new SecureDataView(buffer, { onThreatDetected: onThreat });

      const payload = new Uint8Array([10, 20, 30, 40, 50]);

      const header: ProtocolHeader = {
        magic: PROTOCOL_MAGIC.MESG,
        version: 1,
        timestamp: Math.floor(Date.now() / 1000),
        payloadLength: payload.length,
        checksum: 0xBADBAD, // Wrong checksum
      };

      view.writeHeader(header);
      view.writeBytes(payload);

      view.seek(0);
      const message = view.parseMessage();

      expect(message.verified).toBe(false);
      expect(threatDetected).toBe(true);
    });
  });

  describe('Buffer Export', () => {
    test('should export to Uint8Array (copy)', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeUint32(0x12345678);

      const exported = view.toUint8Array();
      expect(exported.length).toBe(16);

      // Verify it's a copy
      exported[0] = 0xFF;
      view.seek(0);
      expect(view.readUint8()).not.toBe(0xFF);
    });

    test('should export to ArrayBuffer (copy)', () => {
      const buffer = new ArrayBuffer(16);
      const view = new SecureDataView(buffer);

      view.writeUint32(0xDEADBEEF);

      const exported = view.toArrayBuffer();
      expect(exported.byteLength).toBe(16);
    });

    test('should get used bytes only', () => {
      const buffer = new ArrayBuffer(64);
      const view = new SecureDataView(buffer);

      view.writeUint32(1);
      view.writeUint32(2);

      const used = view.getUsedBytes();
      expect(used.length).toBe(8);
    });
  });

  describe('Helper Functions', () => {
    test('should create message writer', () => {
      const writer = createMessageWriter(256);
      expect(writer.length).toBe(256);
      expect(writer.getPosition()).toBe(0);
    });

    test('should parse message from Uint8Array', () => {
      const buffer = new ArrayBuffer(64);
      const writer = new SecureDataView(buffer);

      const payload = new Uint8Array([1, 2, 3]);
      const checksum = writer.calculateChecksum(payload);

      writer.writeHeader({
        magic: PROTOCOL_MAGIC.BLOB,
        version: 1,
        timestamp: Math.floor(Date.now() / 1000),
        payloadLength: payload.length,
        checksum,
      });
      writer.writeBytes(payload);

      const data = writer.getUsedBytes();
      const message = parseMessage(data);

      expect(message.header.magic).toBe(PROTOCOL_MAGIC.BLOB);
      expect(message.payload).toEqual(payload);
      expect(message.verified).toBe(true);
    });
  });

  describe('Performance Targets', () => {
    test('should define correct performance targets', () => {
      expect(BINARY_PERFORMANCE_TARGETS.THROUGHPUT_MSG_PER_SEC).toBe(8500);
      expect(BINARY_PERFORMANCE_TARGETS.ALIGNMENT_BYTES).toBe(4);
      expect(BINARY_PERFORMANCE_TARGETS.MAX_MESSAGE_SIZE_BYTES).toBe(65536);
      expect(BINARY_PERFORMANCE_TARGETS.HEADER_SIZE_BYTES).toBe(20);
      expect(BINARY_PERFORMANCE_TARGETS.MAX_STRING_LENGTH).toBe(4096);
      expect(BINARY_PERFORMANCE_TARGETS.CHECKSUM_TIME_MS).toBe(0.1);
    });

    test('should process messages within performance target', () => {
      const iterations = 1000;
      const buffer = new ArrayBuffer(128);

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const view = new SecureDataView(buffer);
        const payload = new Uint8Array([1, 2, 3, 4]);
        const checksum = view.calculateChecksum(payload);

        view.writeHeader({
          magic: PROTOCOL_MAGIC.MESG,
          version: 1,
          timestamp: Math.floor(Date.now() / 1000),
          payloadLength: 4,
          checksum,
        });
        view.writeBytes(payload);

        view.seek(0);
        view.parseMessage();
      }

      const elapsed = performance.now() - start;
      const msgsPerSec = (iterations / elapsed) * 1000;

      // Should achieve at least 8500 msg/sec
      expect(msgsPerSec).toBeGreaterThan(BINARY_PERFORMANCE_TARGETS.THROUGHPUT_MSG_PER_SEC);
    });
  });
});

describe('Protocol Magic Constants', () => {
  test('should define all protocol magic numbers', () => {
    expect(PROTOCOL_MAGIC.SBOD).toBe(0x53424F44);
    expect(PROTOCOL_MAGIC.AUDT).toBe(0x41554454);
    expect(PROTOCOL_MAGIC.EVNT).toBe(0x45564E54);
    expect(PROTOCOL_MAGIC.BLOB).toBe(0x424C4F42);
    expect(PROTOCOL_MAGIC.MESG).toBe(0x4D455347);
  });
});
