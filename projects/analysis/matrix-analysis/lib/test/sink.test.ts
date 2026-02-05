import { describe, it, expect } from "bun:test";
import { createSink, buildBuffer, buildString } from "../src/core/sink.ts";

describe("sink", () => {
  describe("BN-110: ArrayBufferSink", () => {
    it("should create and use a sink", () => {
      const sink = createSink();
      sink.write("hello ");
      sink.write("world");
      const result = sink.end() as Uint8Array;
      expect(new TextDecoder().decode(result)).toBe("hello world");
    });

    it("should build buffer from chunks", () => {
      const buf = buildBuffer(["one", " ", "two"]);
      expect(buf).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(buf)).toBe("one two");
    });

    it("should build string from chunks", () => {
      expect(buildString(["a", "b", "c"])).toBe("abc");
    });

    it("should handle Uint8Array input", () => {
      const a = new TextEncoder().encode("hello ");
      const b = new TextEncoder().encode("world");
      const result = buildString([a, b]);
      expect(result).toBe("hello world");
    });

    it("should handle empty input", () => {
      expect(buildString([])).toBe("");
    });

    it("should preserve raw binary bytes", () => {
      const binary = new Uint8Array([0x00, 0xFF, 0x80, 0x7F]);
      const result = buildBuffer([binary]);
      expect(result.length).toBe(4);
      expect(result[0]).toBe(0x00);
      expect(result[1]).toBe(0xFF);
      expect(result[2]).toBe(0x80);
      expect(result[3]).toBe(0x7F);
    });

    it("should concatenate mixed chunk types with correct bytes", () => {
      const str = "AB";
      const bytes = new Uint8Array([0x43, 0x44]);
      const result = buildBuffer([str, bytes]);
      expect(result.length).toBe(4);
      expect(Array.from(result)).toEqual([0x41, 0x42, 0x43, 0x44]);
    });
  });
});
