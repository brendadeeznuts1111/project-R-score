import { describe, expect, test } from "bun:test";
import {
  decodePacketHeader,
  encodePacketHeader,
  PACKET_HEADER_SIZE,
  PACKET_VERSION,
  stripPacketHeader,
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
});
