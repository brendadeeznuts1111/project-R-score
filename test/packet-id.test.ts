import { describe, expect, test } from "bun:test";
import {
  decodePacketHeader,
  encodePacketHeader,
  PACKET_HEADER_SIZE,
  PACKET_VERSION,
  FLAG_CRC32,
  CRC_SIZE,
  stripPacketHeader,
  computeCRC,
  appendCRC,
  verifyAndStripCRC,
} from "../lib/udp/packet-id";

describe("packet-id header codec", () => {
  test("encodes and decodes v3 packet header", () => {
    const encoded = encodePacketHeader({
      scope: "global",
      flags: 0x3,
      sourceId: 42,
      sequenceId: 123456,
      timestampUs: 1700000000000000n,
    });

    expect(encoded.byteLength).toBe(PACKET_HEADER_SIZE);
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe(PACKET_VERSION);
    expect(decoded!.flags).toBe(0x3);
    expect(decoded!.scope).toBe("global");
    expect(decoded!.sourceId).toBe(42);
    expect(decoded!.sequenceId).toBe(123456);
    expect(decoded!.timestampUs).toBe(1700000000000000n);
  });

  test("returns null for invalid/short buffers", () => {
    expect(decodePacketHeader(Buffer.alloc(0))).toBeNull();
    expect(decodePacketHeader(Buffer.alloc(8))).toBeNull();
  });

  test("strips payload after header", () => {
    const header = encodePacketHeader({ scope: "site-local", sourceId: 1, sequenceId: 9 });
    const payload = Buffer.from("payload");
    const packet = Buffer.concat([header, payload]);
    expect(stripPacketHeader(packet).toString()).toBe("payload");
  });

  test("all 6 scopes roundtrip correctly", () => {
    const scopes = [
      "interface-local",
      "link-local",
      "site-local",
      "organization",
      "admin",
      "global",
    ] as const;
    for (const scope of scopes) {
      const encoded = encodePacketHeader({ scope, sourceId: 1, sequenceId: 1 });
      const decoded = decodePacketHeader(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.scope).toBe(scope);
    }
  });

  test("SSM variant: scope code 0x3e decodes as global", () => {
    const buf = encodePacketHeader({ scope: "global", sourceId: 0, sequenceId: 0 });
    // Overwrite scope byte with SSM variant 0x3e
    buf.writeUInt8(0x3e, 1);
    const decoded = decodePacketHeader(buf);
    expect(decoded).not.toBeNull();
    expect(decoded!.scope).toBe("global");
  });

  test("wrong version returns null", () => {
    const buf = encodePacketHeader({ scope: "global", sourceId: 0, sequenceId: 0 });
    // Replace version nibble with 2 (original is version 3)
    const vf = buf.readUInt8(0);
    const flags = vf & 0x0f;
    buf.writeUInt8((2 << 4) | flags, 0);
    expect(decodePacketHeader(buf)).toBeNull();
  });

  test("unknown scope code returns null", () => {
    const buf = encodePacketHeader({ scope: "global", sourceId: 0, sequenceId: 0 });
    // Write an unrecognised scope code
    buf.writeUInt8(0xff, 1);
    expect(decodePacketHeader(buf)).toBeNull();
  });

  test("defaults: encode with no options produces expected values", () => {
    const encoded = encodePacketHeader();
    expect(encoded.byteLength).toBe(PACKET_HEADER_SIZE);
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe(PACKET_VERSION);
    // default version is 3
    expect(decoded!.version).toBe(3);
    // default scope is site-local (code 0x05)
    expect(decoded!.scope).toBe("site-local");
    expect(encoded.readUInt8(1)).toBe(0x05);
    // default sourceId and sequenceId are 0
    expect(decoded!.sourceId).toBe(0);
    expect(decoded!.sequenceId).toBe(0);
    // timestampUs is a valid bigint > 0
    expect(typeof decoded!.timestampUs).toBe("bigint");
    expect(decoded!.timestampUs > 0n).toBe(true);
  });

  test("stripPacketHeader with exactly PACKET_HEADER_SIZE bytes returns empty buffer", () => {
    const buf = encodePacketHeader({ scope: "global", sourceId: 0, sequenceId: 0 });
    expect(buf.byteLength).toBe(PACKET_HEADER_SIZE);
    const stripped = stripPacketHeader(buf);
    expect(stripped.byteLength).toBe(0);
  });

  test("stripPacketHeader with less than PACKET_HEADER_SIZE returns empty buffer", () => {
    const buf = Buffer.alloc(PACKET_HEADER_SIZE - 1);
    const stripped = stripPacketHeader(buf);
    expect(stripped.byteLength).toBe(0);
  });
});

describe("packet-id CRC", () => {
  test("computeCRC returns a number", () => {
    const result = computeCRC(Buffer.from("hello"));
    expect(typeof result).toBe("number");
  });

  test("appendCRC adds exactly 4 bytes", () => {
    const data = Buffer.from("test-data");
    const withCRC = appendCRC(data);
    expect(withCRC.byteLength).toBe(data.byteLength + CRC_SIZE);
  });

  test("verifyAndStripCRC returns true for intact data", () => {
    const data = Buffer.from("integrity check");
    const withCRC = appendCRC(data);
    const { payload, crcValid } = verifyAndStripCRC(withCRC);
    expect(crcValid).toBe(true);
    expect(payload.toString()).toBe("integrity check");
  });

  test("verifyAndStripCRC returns false for corrupted data", () => {
    const data = Buffer.from("integrity check");
    const withCRC = appendCRC(data);
    // Flip a byte in the payload portion to corrupt it
    withCRC[0] = withCRC[0]! ^ 0xff;
    const { crcValid } = verifyAndStripCRC(withCRC);
    expect(crcValid).toBe(false);
  });

  test("verifyAndStripCRC with buffer smaller than 4 bytes returns crcValid false", () => {
    const tiny = Buffer.alloc(3);
    const { crcValid } = verifyAndStripCRC(tiny);
    expect(crcValid).toBe(false);
  });

  test("CRC is deterministic", () => {
    const data = Buffer.from("deterministic");
    const first = computeCRC(data);
    const second = computeCRC(data);
    expect(first).toBe(second);
  });
});

describe("packet-id normalizer edge cases", () => {
  test("negative sequenceId is clamped to 0", () => {
    const encoded = encodePacketHeader({ sequenceId: -100, sourceId: 1 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.sequenceId).toBe(0);
  });

  test("negative sourceId is clamped to 0", () => {
    const encoded = encodePacketHeader({ sourceId: -50, sequenceId: 1 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.sourceId).toBe(0);
  });

  test("negative flags are clamped to 0", () => {
    const encoded = encodePacketHeader({ flags: -1, sourceId: 0, sequenceId: 0 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.flags).toBe(0);
  });

  test("overflow flags (>0x0f) are clamped to 0x0f", () => {
    const encoded = encodePacketHeader({ flags: 0xff, sourceId: 0, sequenceId: 0 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.flags).toBe(0x0f);
  });

  test("overflow sourceId (>0xffff) is clamped to 0xffff", () => {
    const encoded = encodePacketHeader({ sourceId: 0x1ffff, sequenceId: 0 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.sourceId).toBe(0xffff);
  });

  test("NaN sequenceId is treated as 0", () => {
    const encoded = encodePacketHeader({ sequenceId: NaN, sourceId: 0 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.sequenceId).toBe(0);
  });

  test("Infinity flags is treated as 0", () => {
    const encoded = encodePacketHeader({ flags: Infinity, sourceId: 0, sequenceId: 0 });
    const decoded = decodePacketHeader(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.flags).toBe(0);
  });
});
